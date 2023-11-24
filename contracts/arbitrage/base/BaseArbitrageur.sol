// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

abstract contract BaseArbitrageur is Ownable {
    // external

    function approveAll(address token, address[] memory spenders, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < spenders.length; i++) {
            IERC20(token).approve(spenders[i], amount);
        }
    }

    function withdrawAll(address token) external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }
}
