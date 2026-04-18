// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {FHE, euint64, InEuint64, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @notice Source of income verification
 * @dev Phase 4: MANUAL only, Phase 6+: PRIVARA/BANK_LINK/PAYROLL
 */
enum IncomeSource {
    MANUAL,      // 0 - Manually recorded by worker
    PRIVARA,     // 1 - Verified via Privara protocol (Phase 6)
    BANK_LINK,   // 2 - Bank integration (future)
    PAYROLL      // 3 - Payroll provider (future)
}

/**
 * @title LendiProof
 * @notice Core FHE contract for encrypted income verification
 * @dev Stores encrypted income per worker and provides boolean proof to lenders without revealing amounts
 */
contract LendiProof {
    // ============================================
    // STATE VARIABLES
    // ============================================

    // Encrypted — nobody can read these values
    mapping(address => euint64) private monthlyIncome;
    mapping(address => euint64) private txCount;

    // Plaintext — public registries
    mapping(address => bool) public registeredWorkers;
    mapping(address => bool) public registeredLenders;
    mapping(uint256 => address) public escrowToWorker;
    mapping(uint256 => uint64) public escrowToThreshold;
    mapping(address => uint256) public lastResetTimestamp;

    address public owner;
    IERC20 public feeToken;
    uint256 public constant RESET_PERIOD = 30 days;
    uint256 public constant LENDER_REGISTRATION_FEE = 1e6; // 1 USDC (6 decimals)

    // ============================================
    // EVENTS
    // ============================================

    event WorkerRegistered(address indexed worker);
    event LenderRegistered(address indexed lender, uint256 feePaid);
    event IncomeRecorded(address indexed worker, uint256 timestamp, IncomeSource indexed source);
    event ProofRequested(address indexed lender, address indexed worker);
    event EscrowLinked(uint256 indexed escrowId, address indexed worker);
    event MonthlyReset(address indexed worker, uint256 timestamp);
    event FeeWithdrawn(address indexed owner, uint256 amount);

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyWorker() {
        require(registeredWorkers[msg.sender], "Not worker");
        _;
    }

    modifier onlyLender() {
        require(registeredLenders[msg.sender], "Not lender");
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Initialize contract with fee token (USDC)
     * @param _feeToken Address of USDC token contract
     */
    constructor(address _feeToken) {
        owner = msg.sender;
        feeToken = IERC20(_feeToken);
    }

    // ============================================
    // REGISTRATION FUNCTIONS
    // ============================================

    /**
     * @notice Register as a worker to start recording income
     */
    function registerWorker() external {
        registeredWorkers[msg.sender] = true;
        lastResetTimestamp[msg.sender] = block.timestamp; // Initialize to prevent immediate reset
        emit WorkerRegistered(msg.sender);
    }

    /**
     * @notice Register as a lender by paying 1 USDC fee
     * @dev Anyone can register as lender by paying the fee (no owner approval needed)
     */
    function registerLender() external {
        require(!registeredLenders[msg.sender], "Already registered");

        // Transfer 1 USDC fee from caller to contract
        require(
            feeToken.transferFrom(msg.sender, address(this), LENDER_REGISTRATION_FEE),
            "Fee transfer failed"
        );

        registeredLenders[msg.sender] = true;
        emit LenderRegistered(msg.sender, LENDER_REGISTRATION_FEE);
    }

    /**
     * @notice Owner can register lenders for free (for initial setup/partnerships)
     * @param lender Address of the lender to register
     */
    function registerLenderByOwner(address lender) external onlyOwner {
        require(!registeredLenders[lender], "Already registered");
        registeredLenders[lender] = true;
        emit LenderRegistered(lender, 0);
    }

    // ============================================
    // INCOME RECORDING
    // ============================================

    /**
     * @notice Record encrypted income for the worker
     * @dev CRITICAL: Must call FHE.allowThis() after mutation to enable future transactions
     * @param encAmount Encrypted amount in USDC units (6 decimals)
     * @param source Source of income verification (MANUAL for Phase 4, PRIVARA/etc for Phase 6+)
     */
    function recordIncome(InEuint64 calldata encAmount, IncomeSource source) external onlyWorker {
        // 1. Convert input to euint64
        euint64 amount = FHE.asEuint64(encAmount);

        // 2. Add to existing income (homomorphic addition)
        monthlyIncome[msg.sender] = FHE.add(monthlyIncome[msg.sender], amount);

        // 3. MANDATORY: Grant contract access for future transactions
        FHE.allowThis(monthlyIncome[msg.sender]);

        // 4. Grant worker access to their own income
        FHE.allow(monthlyIncome[msg.sender], msg.sender);

        // 5. Increment transaction count
        euint64 one = FHE.asEuint64(1);
        txCount[msg.sender] = FHE.add(txCount[msg.sender], one);
        FHE.allowThis(txCount[msg.sender]);
        FHE.allow(txCount[msg.sender], msg.sender);

        // 6. Emit event with source (no amount!)
        emit IncomeRecorded(msg.sender, block.timestamp, source);
    }

    // ============================================
    // INCOME VERIFICATION
    // ============================================

    /**
     * @notice Prove whether worker's income meets threshold (returns encrypted boolean only)
     * @dev Neither income nor threshold is decrypted during this operation
     * @param worker Address of the worker to verify
     * @param threshold Minimum income required (in USDC units, 6 decimals)
     * @return qualifies Encrypted boolean - true if income >= threshold
     */
    function proveIncome(address worker, uint64 threshold) external onlyLender returns (ebool) {
        require(registeredWorkers[worker], "Worker not registered");

        // 1. Trivially encrypt the threshold constant
        euint64 required = FHE.asEuint64(threshold);

        // 2. Compare encrypted income to encrypted threshold (homomorphic comparison)
        ebool qualifies = FHE.gte(monthlyIncome[worker], required);

        // 3. Grant lender access to decrypt the boolean result
        FHE.allow(qualifies, msg.sender);

        // 4. Grant worker access to see their own result
        FHE.allow(qualifies, worker);

        // 5. Emit event (no amounts!)
        emit ProofRequested(msg.sender, worker);

        // 6. Return encrypted boolean
        return qualifies;
    }

    // ============================================
    // ESCROW LINKING
    // ============================================

    /**
     * @notice Link an escrow to a worker with income threshold
     * @param escrowId Unique identifier for the escrow (uint256 to match ReinieraOS)
     * @param worker Worker address to link
     * @param threshold Minimum income threshold for escrow release
     */
    function linkEscrow(uint256 escrowId, address worker, uint64 threshold) external onlyLender {
        escrowToWorker[escrowId] = worker;
        escrowToThreshold[escrowId] = threshold;
        emit EscrowLinked(escrowId, worker);
    }

    // ============================================
    // GETTER FUNCTIONS (FOR FRONTEND UI)
    // ============================================

    /**
     * @notice Get worker's sealed monthly income for UI display
     * @dev Returns euint64 ciphertext handle that worker can decrypt with CoFHE SDK
     * @dev Frontend uses: cofheClient.decryptForView(ctHash, FheTypes.Uint64)
     * @return Sealed monthly income value (encrypted ciphertext handle)
     */
    function getMyMonthlyIncome() external view onlyWorker returns (euint64) {
        return monthlyIncome[msg.sender];
    }

    /**
     * @notice Get sealed monthly income for any worker
     * @dev Restricted to worker themselves or registered lenders
     * @param worker Worker address to query
     * @return Sealed monthly income value (encrypted ciphertext handle)
     */
    function getSealedMonthlyIncome(address worker) external view returns (euint64) {
        require(
            msg.sender == worker || registeredLenders[msg.sender],
            "Only worker or lenders can view"
        );
        require(registeredWorkers[worker], "Worker not registered");
        return monthlyIncome[worker];
    }

    /**
     * @notice Get worker's transaction count (for UI display)
     * @dev Returns encrypted count of income recording transactions
     * @return Sealed transaction count (encrypted ciphertext handle)
     */
    function getMyTxCount() external view onlyWorker returns (euint64) {
        return txCount[msg.sender];
    }

    // ============================================
    // MONTHLY RESET
    // ============================================

    /**
     * @notice Reset monthly income to zero (can be called once per RESET_PERIOD)
     */
    function resetMonthlyIncome() external onlyWorker {
        require(
            block.timestamp >= lastResetTimestamp[msg.sender] + RESET_PERIOD,
            "Reset period not elapsed"
        );

        // Reset income to zero
        monthlyIncome[msg.sender] = FHE.asEuint64(0);

        // Grant necessary permissions
        FHE.allowThis(monthlyIncome[msg.sender]);
        FHE.allow(monthlyIncome[msg.sender], msg.sender);

        // Update last reset timestamp
        lastResetTimestamp[msg.sender] = block.timestamp;

        emit MonthlyReset(msg.sender, block.timestamp);
    }

    // ============================================
    // FEE MANAGEMENT
    // ============================================

    /**
     * @notice Withdraw accumulated fees (owner only)
     * @param amount Amount of USDC to withdraw
     */
    function withdrawFees(uint256 amount) external onlyOwner {
        require(
            feeToken.transfer(owner, amount),
            "Fee withdrawal failed"
        );
        emit FeeWithdrawn(owner, amount);
    }

    /**
     * @notice Get contract's USDC balance (accumulated fees)
     */
    function getFeeBalance() external view returns (uint256) {
        // Note: This requires the token contract to implement balanceOf
        // For simplicity, we're not importing full ERC20 interface
        // In production, use OpenZeppelin's IERC20
        return 0; // Placeholder - implement if needed
    }
}
