// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./LendiProof.sol";

/**
 * @title IConditionResolver
 * @notice Interface for ReinieraOS escrow condition resolution
 * @dev Vendored locally (ReinieraOS repos are private)
 */
interface IConditionResolver {
    function isConditionMet(uint256 escrowId) external view returns (bool);
    function onConditionSet(uint256 escrowId, bytes calldata conditionData) external;
}

/**
 * @title IERC165
 * @notice Interface for ERC-165 standard interface detection
 */
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @title LendiProofGate
 * @notice Condition resolver implementing 3-step FHE decryption flow
 * @dev Called by ReinieraOS ConfidentialEscrow before releasing loan funds
 *
 * FHE Decryption Flow:
 * 1. requestVerification() — calls proveIncome(), stores ebool handle, allows public decryption
 * 2. Off-chain: client.decryptForTx(handle) → gets plaintext + signature
 * 3. publishVerification() — publishes verified result with signature
 * 4. isConditionMet() — reads published result (view ✓)
 */
contract LendiProofGate is IConditionResolver, IERC165 {
    // ============================================
    // STATE VARIABLES
    // ============================================

    LendiProof public immutable lendiProof;

    /// @notice Stores encrypted verification handles for each escrow
    /// @dev Maps escrowId → ebool (encrypted boolean result)
    mapping(uint256 => ebool) private escrowToQualifies;

    // ============================================
    // EVENTS
    // ============================================

    event VerificationRequested(uint256 indexed escrowId, address indexed worker, uint64 threshold);
    event VerificationPublished(uint256 indexed escrowId, bool result);
    event ConditionChecked(uint256 indexed escrowId, bool result);

    // ============================================
    // ERRORS
    // ============================================

    error EscrowNotLinked(uint256 escrowId);
    error InvalidConditionDataLength(uint256 provided, uint256 expected);
    error NoVerificationRequested(uint256 escrowId);
    error VerificationNotReady(uint256 escrowId);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @param _lendiProof Address of the LendiProof contract
     */
    constructor(address _lendiProof) {
        lendiProof = LendiProof(_lendiProof);
    }

    // ============================================
    // REINEIRA-OS INTEGRATION
    // ============================================

    /**
     * @notice Called by ReinieraOS when a condition is attached to an escrow
     * @dev Decodes worker address and income threshold, links them to the escrow
     * @param escrowId Unique identifier for the escrow (uint256)
     * @param conditionData Encoded data: 20 bytes (address worker) + 8 bytes (uint64 threshold)
     */
    function onConditionSet(uint256 escrowId, bytes calldata conditionData) external override {
        if (conditionData.length != 28) {
            revert InvalidConditionDataLength(conditionData.length, 28);
        }

        // Decode: first 20 bytes = worker address, next 8 bytes = threshold (uint64)
        address worker = address(bytes20(conditionData[0:20]));
        uint64 threshold = uint64(bytes8(conditionData[20:28]));

        // Link escrow to worker and threshold in LendiProof
        // This allows requestVerification() to look up worker + threshold by escrowId
        lendiProof.linkEscrow(escrowId, worker, threshold);
    }

    // ============================================
    // FHE VERIFICATION FLOW (3 STEPS)
    // ============================================

    /**
     * @notice Step 1: Request FHE income verification
     * @dev Calls proveIncome(), stores encrypted result, enables public decryption
     * @param escrowId The escrow to verify
     */
    function requestVerification(uint256 escrowId) external {
        // Get linked worker and threshold
        address worker = lendiProof.escrowToWorker(escrowId);
        uint64 threshold = lendiProof.escrowToThreshold(escrowId);

        if (worker == address(0)) {
            revert EscrowNotLinked(escrowId);
        }

        // Call proveIncome to get encrypted boolean result
        // This computes: monthlyIncome >= threshold homomorphically
        ebool qualifies = lendiProof.proveIncome(worker, threshold);

        // Store the encrypted handle for later retrieval
        escrowToQualifies[escrowId] = qualifies;

        // Allow this contract to access the handle in future calls
        FHE.allowThis(qualifies);

        // Mark for public decryption (enables off-chain decryptForTx)
        FHE.allowPublic(qualifies);

        emit VerificationRequested(escrowId, worker, threshold);
    }

    /**
     * @notice Step 3: Publish decrypted verification result
     * @dev Called after off-chain decryption with plaintext result + signature
     * @param escrowId The escrow identifier
     * @param result The decrypted boolean value (true = qualifies, false = does not qualify)
     * @param signature Cryptographic signature proving decryption validity
     */
    function publishVerification(
        uint256 escrowId,
        bool result,
        bytes calldata signature
    ) external {
        ebool qualifies = escrowToQualifies[escrowId];

        // Verify that requestVerification() was called first
        if (ebool.unwrap(qualifies) == bytes32(0)) {
            revert NoVerificationRequested(escrowId);
        }

        // Publish the decrypted result with signature verification
        // CoFHE network validates the signature to ensure result authenticity
        FHE.publishDecryptResult(qualifies, result, signature);

        emit VerificationPublished(escrowId, result);
    }

    /**
     * @notice Step 4: Check if escrow condition is met (view function)
     * @dev Called by ReinieraOS ConfidentialEscrow before releasing funds
     * @param escrowId The escrow identifier (uint256 to match ReinieraOS interface)
     * @return True if worker's income meets threshold, false otherwise
     */
    function isConditionMet(uint256 escrowId) external view override returns (bool) {
        // Validate escrow is linked
        address worker = lendiProof.escrowToWorker(escrowId);
        if (worker == address(0)) {
            revert EscrowNotLinked(escrowId);
        }

        // Get the encrypted handle
        ebool qualifies = escrowToQualifies[escrowId];
        bytes32 ctHash = ebool.unwrap(qualifies);

        if (ctHash == bytes32(0)) {
            revert NoVerificationRequested(escrowId);
        }

        // Read the published decryption result using ctHash
        (uint256 decryptedValue, bool isDecrypted) = FHE.getDecryptResultSafe(ctHash);

        // Revert if verification hasn't been published yet
        // (More secure than returning false — makes the state clear)
        if (!isDecrypted) {
            revert VerificationNotReady(escrowId);
        }

        // Convert decrypted value to boolean (1 = true, 0 = false)
        bool result = decryptedValue != 0;

        return result;
    }

    /**
     * @notice Get the encrypted handle for an escrow (for off-chain decryption)
     * @param escrowId The escrow identifier
     * @return The encrypted boolean handle
     */
    function getEncryptedHandle(uint256 escrowId) external view returns (ebool) {
        return escrowToQualifies[escrowId];
    }

    // ============================================
    // ERC-165 INTERFACE DETECTION
    // ============================================

    /**
     * @notice Check if contract supports a given interface
     * @dev ERC-165 standard interface detection
     * @param interfaceId 4-byte interface identifier
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IConditionResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == 0x01ffc9a7; // ERC-165 interface ID
    }
}
