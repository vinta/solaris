// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract NET is ERC20Capped, Ownable {
    constructor() ERC20("The net is vast and infinite", "NET") ERC20Capped(1_000_000_000 * 10 ** 18) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
