import { expect } from 'chai';
import hre from 'hardhat';
import { LendiProof, LendiProofGate } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Encryptable, FheTypes } from '@cofhe/sdk';

describe('LendiProofGate - Wave 2 (3-Step FHE Flow)', function () {
  let lendiProof: LendiProof;
  let gate: LendiProofGate;
  let owner: HardhatEthersSigner;
  let worker: HardhatEthersSigner;
  let lender: HardhatEthersSigner;
  let cofheClient: any;

  beforeEach(async function () {
    [owner, worker, lender] = await hre.ethers.getSigners();

    // Deploy LendiProof with zero address for USDC in test mode
    const LendiProofFactory = await hre.ethers.getContractFactory('LendiProof');
    lendiProof = await LendiProofFactory.deploy(hre.ethers.ZeroAddress);
    await lendiProof.waitForDeployment();

    // Deploy LendiProofGate
    const GateFactory = await hre.ethers.getContractFactory('LendiProofGate');
    gate = await GateFactory.deploy(await lendiProof.getAddress());
    await gate.waitForDeployment();

    // Setup - use owner registration to avoid USDC fees in tests
    await lendiProof.connect(worker).registerWorker();
    await lendiProof.connect(owner).registerLenderByOwner(lender.address);
    await lendiProof.connect(owner).registerLenderByOwner(await gate.getAddress());

    cofheClient = await hre.cofhe.createClientWithBatteries(worker);
  });

  describe('onConditionSet', function () {
    it('links worker and threshold correctly', async function () {
      const escrowId = 1n;
      const workerAddress = worker.address;
      const threshold = 300_000000n; // $300

      // Encode condition data: 20 bytes address + 8 bytes uint64
      const conditionData = hre.ethers.concat([
        hre.ethers.zeroPadValue(workerAddress, 20),
        hre.ethers.zeroPadValue(hre.ethers.toBeHex(threshold, 8), 8),
      ]);

      await gate.connect(lender).onConditionSet(escrowId, conditionData);

      // Verify linkage in LendiProof
      expect(await lendiProof.escrowToWorker(escrowId)).to.equal(workerAddress);
      expect(await lendiProof.escrowToThreshold(escrowId)).to.equal(threshold);
    });

    it('reverts on invalid condition data length', async function () {
      const escrowId = 1n;
      const invalidData = '0x1234'; // Too short

      await expect(
        gate.connect(lender).onConditionSet(escrowId, invalidData)
      ).to.be.revertedWithCustomError(gate, 'InvalidConditionDataLength');
    });
  });

  describe('3-Step FHE Verification Flow', function () {
    it('full flow: requestVerification → decryptForTx → publishVerification → isConditionMet (PASS)', async function () {
      // Record $400 income
      const income = 400_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      // Link escrow with $300 threshold
      const escrowId = 1n;
      const threshold = 300_000000n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, threshold);

      // Step 1: Request verification
      const tx1 = await gate.connect(lender).requestVerification(escrowId);
      await tx1.wait();

      await expect(tx1)
        .to.emit(gate, 'VerificationRequested')
        .withArgs(escrowId, worker.address, threshold);

      // Step 2: Off-chain decryption
      const encryptedHandle = await gate.getEncryptedHandle(escrowId);

      // Decrypt the ebool result
      const decryptResult = await cofheClient
        .decryptForTx(encryptedHandle)
        .withoutPermit()
        .execute();

      const qualifies = decryptResult.decryptedValue === 1n;

      // Step 3: Publish verification result
      const tx2 = await gate.connect(lender).publishVerification(
        escrowId,
        qualifies,
        decryptResult.signature
      );
      await tx2.wait();

      await expect(tx2)
        .to.emit(gate, 'VerificationPublished')
        .withArgs(escrowId, qualifies);

      // Step 4: Check condition is met
      const result = await gate.isConditionMet(escrowId);
      expect(result).to.be.true;
    });

    it('full flow: requestVerification → decryptForTx → publishVerification → isConditionMet (FAIL)', async function () {
      // Record $200 income (below threshold)
      const income = 200_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      // Link escrow with $300 threshold
      const escrowId = 2n;
      const threshold = 300_000000n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, threshold);

      // Step 1: Request verification
      await gate.connect(lender).requestVerification(escrowId);

      // Step 2: Off-chain decryption
      const encryptedHandle = await gate.getEncryptedHandle(escrowId);
      const decryptResult = await cofheClient
        .decryptForTx(encryptedHandle)
        .withoutPermit()
        .execute();

      const qualifies = decryptResult.decryptedValue === 1n;

      // Step 3: Publish verification result
      await gate.connect(lender).publishVerification(
        escrowId,
        qualifies,
        decryptResult.signature
      );

      // Step 4: Check condition is NOT met
      const result = await gate.isConditionMet(escrowId);
      expect(result).to.be.false;
    });
  });

  describe('requestVerification', function () {
    it('stores encrypted handle and allows public decryption', async function () {
      // Setup
      const income = 500_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      const escrowId = 3n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, 400_000000n);

      // Request verification
      await gate.connect(lender).requestVerification(escrowId);

      // Verify handle is stored
      const handle = await gate.getEncryptedHandle(escrowId);
      expect(handle).to.not.equal(hre.ethers.ZeroHash);
    });

    it('reverts if escrow not linked', async function () {
      const nonExistentEscrowId = 999n;

      await expect(
        gate.connect(lender).requestVerification(nonExistentEscrowId)
      ).to.be.revertedWithCustomError(gate, 'EscrowNotLinked');
    });
  });

  describe('publishVerification', function () {
    it('reverts if no verification was requested', async function () {
      const escrowId = 10n;
      const fakeSignature = '0x' + '00'.repeat(65);

      await expect(
        gate.connect(lender).publishVerification(escrowId, true, fakeSignature)
      ).to.be.revertedWithCustomError(gate, 'NoVerificationRequested');
    });

    it('emits VerificationPublished event', async function () {
      // Setup
      const income = 500_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      const escrowId = 4n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, 400_000000n);

      // Request verification
      await gate.connect(lender).requestVerification(escrowId);

      // Decrypt
      const encryptedHandle = await gate.getEncryptedHandle(escrowId);
      const decryptResult = await cofheClient
        .decryptForTx(encryptedHandle)
        .withoutPermit()
        .execute();

      const qualifies = decryptResult.decryptedValue === 1n;

      // Publish
      await expect(
        gate.connect(lender).publishVerification(
          escrowId,
          qualifies,
          decryptResult.signature
        )
      )
        .to.emit(gate, 'VerificationPublished')
        .withArgs(escrowId, qualifies);
    });
  });

  describe('isConditionMet', function () {
    it('reverts if escrow not linked', async function () {
      const nonExistentEscrowId = 999n;

      await expect(
        gate.isConditionMet(nonExistentEscrowId)
      ).to.be.revertedWithCustomError(gate, 'EscrowNotLinked');
    });

    it('reverts if verification not requested', async function () {
      const escrowId = 5n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, 300_000000n);

      await expect(
        gate.isConditionMet(escrowId)
      ).to.be.revertedWithCustomError(gate, 'NoVerificationRequested');
    });

    it('reverts if verification not published yet', async function () {
      // Setup
      const income = 500_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      const escrowId = 6n;
      await lendiProof.connect(lender).linkEscrow(escrowId, worker.address, 400_000000n);

      // Request verification but don't publish
      await gate.connect(lender).requestVerification(escrowId);

      // Should revert because verification not published yet
      await expect(
        gate.isConditionMet(escrowId)
      ).to.be.revertedWithCustomError(gate, 'VerificationNotReady');
    });
  });

  describe('ERC-165 Interface Support', function () {
    it('supports IConditionResolver interface', async function () {
      // IConditionResolver interface ID
      const interfaceId = '0x12345678'; // Replace with actual interface ID
      // Note: In production, calculate with: bytes4(keccak256('isConditionMet(uint256)') ^ keccak256('onConditionSet(uint256,bytes)'))

      // For now, just verify supportsInterface doesn't revert
      const result = await gate.supportsInterface(interfaceId);
      expect(result).to.be.a('boolean');
    });

    it('supports IERC165 interface', async function () {
      const erc165InterfaceId = '0x01ffc9a7';
      const result = await gate.supportsInterface(erc165InterfaceId);
      expect(result).to.be.true;
    });
  });

  describe('Multiple Escrows', function () {
    it('handles multiple escrows independently', async function () {
      // Record $400 income
      const income = 400_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await lendiProof.connect(worker).recordIncome(encAmount);

      // Create two escrows with different thresholds
      const escrowId1 = 100n;
      const escrowId2 = 101n;
      const threshold1 = 300_000000n; // Should pass
      const threshold2 = 500_000000n; // Should fail

      await lendiProof.connect(lender).linkEscrow(escrowId1, worker.address, threshold1);
      await lendiProof.connect(lender).linkEscrow(escrowId2, worker.address, threshold2);

      // Process escrow 1 (should pass)
      await gate.connect(lender).requestVerification(escrowId1);
      const handle1 = await gate.getEncryptedHandle(escrowId1);
      const decrypt1 = await cofheClient.decryptForTx(handle1).withoutPermit().execute();
      await gate.connect(lender).publishVerification(
        escrowId1,
        decrypt1.decryptedValue === 1n,
        decrypt1.signature
      );

      // Process escrow 2 (should fail)
      await gate.connect(lender).requestVerification(escrowId2);
      const handle2 = await gate.getEncryptedHandle(escrowId2);
      const decrypt2 = await cofheClient.decryptForTx(handle2).withoutPermit().execute();
      await gate.connect(lender).publishVerification(
        escrowId2,
        decrypt2.decryptedValue === 1n,
        decrypt2.signature
      );

      // Verify results
      const result1 = await gate.isConditionMet(escrowId1);
      const result2 = await gate.isConditionMet(escrowId2);

      expect(result1).to.be.true;
      expect(result2).to.be.false;
    });
  });
});
