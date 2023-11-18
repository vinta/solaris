// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { IErrors } from "../interfaces/IErrors.sol";

abstract contract BaseArbitrageur is Ownable, IErrors {
    using SafeERC20 for IERC20;

    // external

    function withdrawAll(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }

    // internal

    function _requireProfit(uint256 amountIn, uint256 amountOut, uint256 minProfit) internal pure {
        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }
    }
}
