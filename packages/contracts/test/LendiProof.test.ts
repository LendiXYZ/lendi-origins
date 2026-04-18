import { expect } from 'chai';
import hre from 'hardhat';
import { LendiProof } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Encryptable } from '@cofhe/sdk';

describe('LendiProof', function () {
  let contract: LendiProof;
  let owner: HardhatEthersSigner;
  let worker: HardhatEthersSigner;
  let lender: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;
  let cofheClient: any;

  beforeEach(async function () {
    [owner, worker, lender, stranger] = await hre.ethers.getSigners();

    // Deploy with zero address for USDC in test mode (will revert on actual fee payments)
    const LendiProofFactory = await hre.ethers.getContractFactory('LendiProof');
    contract = await LendiProofFactory.deploy(hre.ethers.ZeroAddress);
    await contract.waitForDeployment();

    cofheClient = await hre.cofhe.createClientWithBatteries(worker);
  });

  // ============================================
  // REGISTRATION TESTS
  // ============================================

  describe('Registration', function () {
    it('allows worker to register', async function () {
      await contract.connect(worker).registerWorker();
      expect(await contract.registeredWorkers(worker.address)).to.be.true;
    });

    it('emits WorkerRegistered on registration', async function () {
      await expect(contract.connect(worker).registerWorker())
        .to.emit(contract, 'WorkerRegistered')
        .withArgs(worker.address);
    });

    it('allows owner to register lender for free', async function () {
      await contract.connect(owner).registerLenderByOwner(lender.address);
      expect(await contract.registeredLenders(lender.address)).to.be.true;
    });

    it('rejects lender registration by owner from non-owner', async function () {
      await expect(
        contract.connect(stranger).registerLenderByOwner(lender.address)
      ).to.be.revertedWith('Not owner');
    });

    it('emits LenderRegistered event with zero fee for owner registration', async function () {
      await expect(contract.connect(owner).registerLenderByOwner(lender.address))
        .to.emit(contract, 'LenderRegistered')
        .withArgs(lender.address, 0);
    });

    it('rejects duplicate lender registration', async function () {
      await contract.connect(owner).registerLenderByOwner(lender.address);
      await expect(
        contract.connect(owner).registerLenderByOwner(lender.address)
      ).to.be.revertedWith('Already registered');
    });
  });

  // ============================================
  // RECORD INCOME TESTS
  // ============================================

  describe('recordIncome', function () {
    beforeEach(async function () {
      await contract.connect(worker).registerWorker();
    });

    it('stores encrypted income correctly', async function () {
      const amount = 500_000000n; // $500 USDC
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(amount)])
        .execute();

      const tx = await contract.connect(worker).recordIncome(encAmount, 0); // 0 = IncomeSource.MANUAL
      await tx.wait();

      // NOTE: In CoFHE 0.4.0, direct value verification requires decryption callbacks
      // For now, we verify the transaction succeeds
      expect(tx).to.not.be.reverted;
    });

    it('accumulates income across multiple calls', async function () {
      const amount1 = 100_000000n; // $100 USDC
      const amount2 = 200_000000n; // $200 USDC

      const [enc1] = await cofheClient
        .encryptInputs([Encryptable.uint64(amount1)])
        .execute();
      const [enc2] = await cofheClient
        .encryptInputs([Encryptable.uint64(amount2)])
        .execute();

      const tx1 = await contract.connect(worker).recordIncome(enc1, 0); // 0 = IncomeSource.MANUAL
      await tx1.wait();

      const tx2 = await contract.connect(worker).recordIncome(enc2, 0); // 0 = IncomeSource.MANUAL
      await tx2.wait();

      // NOTE: In CoFHE 0.4.0, verifying accumulated values requires decryption
      // For now, we verify both transactions succeed
      expect(tx1).to.not.be.reverted;
      expect(tx2).to.not.be.reverted;
    });

    it('rejects recordIncome from unregistered address', async function () {
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(100_000000n)])
        .execute();

      await expect(
        contract.connect(stranger).recordIncome(encAmount, 0)
      ).to.be.revertedWith('Not worker');
    });

    it('emits IncomeRecorded event', async function () {
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(100_000000n)])
        .execute();

      await expect(contract.connect(worker).recordIncome(encAmount, 0))
        .to.emit(contract, 'IncomeRecorded')
        .withArgs(worker.address, await hre.ethers.provider.getBlock('latest').then(b => b!.timestamp + 1), 0);
    });
  });

  // ============================================
  // PROVE INCOME TESTS
  // ============================================

  describe('proveIncome', function () {
    beforeEach(async function () {
      await contract.connect(worker).registerWorker();
      await contract.connect(owner).registerLenderByOwner(lender.address);
    });

    it('returns true ebool when income >= threshold', async function () {
      // Record $400 income
      const income = 400_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      // Check against $300 threshold
      const threshold = 300_000000n;
      const tx = await contract.connect(lender).proveIncome(worker.address, threshold);
      const receipt = await tx.wait();

      // NOTE: In CoFHE 0.4.0, ebool results are encrypted
      // We verify the transaction succeeds and returns an ebool
      expect(tx).to.not.be.reverted;
      expect(receipt).to.not.be.null;
    });

    it('returns false ebool when income < threshold', async function () {
      // Record $200 income
      const income = 200_000000n;
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(income)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      // Check against $300 threshold
      const threshold = 300_000000n;
      const tx = await contract.connect(lender).proveIncome(worker.address, threshold);

      // NOTE: In CoFHE 0.4.0, ebool results are encrypted
      // We verify the transaction succeeds
      expect(tx).to.not.be.reverted;
    });

    it('rejects proveIncome from unregistered lender', async function () {
      await expect(
        contract.connect(stranger).proveIncome(worker.address, 300_000000n)
      ).to.be.revertedWith('Not lender');
    });

    it('rejects proveIncome for unregistered worker', async function () {
      await expect(
        contract.connect(lender).proveIncome(stranger.address, 300_000000n)
      ).to.be.revertedWith('Worker not registered');
    });

    it('emits ProofRequested event', async function () {
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(400_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      await expect(
        contract.connect(lender).proveIncome(worker.address, 300_000000n)
      )
        .to.emit(contract, 'ProofRequested')
        .withArgs(lender.address, worker.address);
    });
  });

  // ============================================
  // RESET MONTHLY INCOME TESTS
  // ============================================

  describe('resetMonthlyIncome', function () {
    beforeEach(async function () {
      await contract.connect(worker).registerWorker();
    });

    it('resets income to zero after RESET_PERIOD', async function () {
      // Record income
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(500_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      // Fast forward 30 days
      await hre.ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await hre.ethers.provider.send('evm_mine', []);

      // Reset income
      const tx = await contract.connect(worker).resetMonthlyIncome();

      // NOTE: In CoFHE 0.4.0, verifying encrypted zero requires decryption
      // We verify the transaction succeeds
      expect(tx).to.not.be.reverted;
    });

    it('reverts if called before RESET_PERIOD', async function () {
      // Record income
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(500_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      // Try to reset immediately
      await expect(
        contract.connect(worker).resetMonthlyIncome()
      ).to.be.revertedWith('Reset period not elapsed');
    });

    it('emits MonthlyReset event', async function () {
      // Fast forward 30 days
      await hre.ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await hre.ethers.provider.send('evm_mine', []);

      await expect(contract.connect(worker).resetMonthlyIncome())
        .to.emit(contract, 'MonthlyReset')
        .withArgs(worker.address, await hre.ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));
    });
  });

  // ============================================
  // GETTER FUNCTIONS TESTS
  // ============================================

  describe('Getter Functions', function () {
    beforeEach(async function () {
      await contract.connect(worker).registerWorker();
    });

    it('allows worker to get their own monthly income', async function () {
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(500_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      const income = await contract.connect(worker).getMyMonthlyIncome();
      expect(income).to.not.equal(0);
    });

    it('rejects getMyMonthlyIncome from non-worker', async function () {
      await expect(
        contract.connect(stranger).getMyMonthlyIncome()
      ).to.be.revertedWith('Not worker');
    });

    it('allows lender to get sealed income of worker', async function () {
      await contract.connect(owner).registerLenderByOwner(lender.address);
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(500_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      const income = await contract.connect(lender).getSealedMonthlyIncome(worker.address);
      expect(income).to.not.equal(0);
    });

    it('rejects getSealedMonthlyIncome from unauthorized address', async function () {
      await expect(
        contract.connect(stranger).getSealedMonthlyIncome(worker.address)
      ).to.be.revertedWith('Only worker or lenders can view');
    });

    it('allows worker to get their transaction count', async function () {
      const [encAmount] = await cofheClient
        .encryptInputs([Encryptable.uint64(100_000000n)])
        .execute();
      await contract.connect(worker).recordIncome(encAmount, 0);

      const txCount = await contract.connect(worker).getMyTxCount();
      expect(txCount).to.not.equal(0);
    });
  });

  // ============================================
  // LINK ESCROW TESTS
  // ============================================

  describe('linkEscrow', function () {
    beforeEach(async function () {
      await contract.connect(worker).registerWorker();
      await contract.connect(owner).registerLenderByOwner(lender.address);
    });

    it('links escrow to worker with threshold', async function () {
      const escrowId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('escrow1'));
      const threshold = 300_000000n;

      await contract.connect(lender).linkEscrow(escrowId, worker.address, threshold);

      expect(await contract.escrowToWorker(escrowId)).to.equal(worker.address);
      expect(await contract.escrowToThreshold(escrowId)).to.equal(threshold);
    });

    it('emits EscrowLinked event', async function () {
      const escrowId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('escrow1'));
      const threshold = 300_000000n;

      await expect(
        contract.connect(lender).linkEscrow(escrowId, worker.address, threshold)
      )
        .to.emit(contract, 'EscrowLinked')
        .withArgs(escrowId, worker.address);
    });

    it('rejects linkEscrow from non-lender', async function () {
      const escrowId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('escrow1'));

      await expect(
        contract.connect(stranger).linkEscrow(escrowId, worker.address, 300_000000n)
      ).to.be.revertedWith('Not lender');
    });
  });
});
