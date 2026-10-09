// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MeshTabAgoraLedger
 * @dev Handles settlements using official Agora AUSD on Monad Testnet.
 */
contract MeshTabAgoraLedger {
    // Official Agora AUSD on Monad Testnet
    address public constant AGORA_AUSD = 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC;
    IERC20 public immutable ausdToken;

    // Emitted when a user pays a specific netted debt
    event DebtSettled(string groupId, address indexed debtor, address indexed creditor, uint256 amount);

    constructor() {
        ausdToken = IERC20(AGORA_AUSD);
    }

    /**
     * @dev Processes a single debt payment initiated by the debtor themselves.
     * @param groupId A unique identifier for the expense group (e.g., "lisbon-24")
     * @param creditor The address receiving the AUSD
     * @param amount The netted amount of AUSD to pay (6 decimals)
     */
    function payNettedDebt(string calldata groupId, address creditor, uint256 amount) external {
        require(ausdToken.balanceOf(msg.sender) >= amount, "MeshTab: Insufficient AUSD balance");
        require(
            ausdToken.transferFrom(msg.sender, creditor, amount),
            "MeshTab: AUSD transfer failed"
        );
        emit DebtSettled(groupId, msg.sender, creditor, amount);
    }
}
