// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ERC20 } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Capped } from "openzeppelin-contracts-v5.4.0/contracts/token/ERC20/extensions/ERC20Capped.sol";
import { Ownable } from "openzeppelin-contracts-v5.4.0/contracts/access/Ownable.sol";

contract NET is ERC20Permit, ERC20Capped, Ownable {
    constructor(address owner)
        ERC20("The net is vast and infinite", "NET")
        ERC20Permit("The net is vast and infinite")
        ERC20Capped(1000000000 * 10 ** 18)
        Ownable(owner)
    { }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}
