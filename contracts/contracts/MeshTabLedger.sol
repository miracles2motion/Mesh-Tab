// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MeshTabLedger
 * @dev Handles individual, user-initiated settlements based on off-chain Tangle Netting calculations.
 */
contract MeshTabLedger {
    IERC20 public ausdToken;

    // Emitted when a user pays a specific netted debt, allowing Envio to instantly index the change
    event DebtSettled(string groupId, address indexed debtor, address indexed creditor, uint256 amount);

    constructor(address _ausdToken) {
        ausdToken = IERC20(_ausdToken);
    }

    /**
     * @dev Processes a single debt payment initiated by the debtor themselves.
     * @param groupId A unique identifier for the expense group (e.g., "Lisbon 24")
     * @param creditor The address receiving the AUSD
     * @param amount The netted amount of AUSD to pay
     */
    function payNettedDebt(string calldata groupId, address creditor, uint256 amount) external {
        // Ensure the person calling this function has enough AUSD
        require(ausdToken.balanceOf(msg.sender) >= amount, "MeshTab: Insufficient AUSD balance");
        
        // Move the AUSD from the debtor (msg.sender) directly to the creditor.
        // The debtor's embedded wallet batches an `approve` alongside this call to make it seamless.
        require(
            ausdToken.transferFrom(msg.sender, creditor, amount),
            "MeshTab: AUSD transfer failed"
        );
        
        // Broadcast the successful payment to the network (and our Envio indexer)
        emit DebtSettled(groupId, msg.sender, creditor, amount);
    }
}
