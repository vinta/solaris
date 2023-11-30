// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

abstract contract BaseArbitrageur is Owned {
    constructor(address ownerArg) Owned(ownerArg) {}

    // external

    function withdrawAll(address token) external onlyOwner {
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }
}
