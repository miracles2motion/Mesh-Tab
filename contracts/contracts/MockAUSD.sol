// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockAUSD is ERC20 {
    mapping(address => bool) public hasReceivedBonus;
    
    // 5,000 AUSD (6 decimals)
    uint256 public constant WELCOME_BONUS = 5000 * 10**6;

    constructor() ERC20("Agora USD", "AUSD") {}

    function claimWelcomeBonus() public {
        require(!hasReceivedBonus[msg.sender], "MockAUSD: Welcome bonus already claimed!");
        hasReceivedBonus[msg.sender] = true;
        _mint(msg.sender, WELCOME_BONUS);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
