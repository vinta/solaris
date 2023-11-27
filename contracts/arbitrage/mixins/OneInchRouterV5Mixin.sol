// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

abstract contract OneInchRouterV5Mixin {
    // https://optimistic.etherscan.io/address/0x1111111254eeb25477b68fb85ed929f73a960582#code
    // https://github.com/1inch/limit-order-protocol-utils/blob/master/src/limit-order-protocol.const.ts
    address constant ONEINCH_AGGREGATION_ROUTER_V5 = 0x1111111254EEB25477B68fb85Ed929f73A960582;

    error OneInchSwapFail();

    // internal

    function _swapOnOneInchRouterV5(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory oneInchData
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(ONEINCH_AGGREGATION_ROUTER_V5, amountIn);

        uint256 tokenOutBalanceBefore = IERC20(tokenOut).balanceOf(address(this));

        (bool success, ) = ONEINCH_AGGREGATION_ROUTER_V5.call{ value: 0 }(oneInchData);
        if (!success) {
            revert OneInchSwapFail(); // ex: due to slippage
        }

        return IERC20(tokenOut).balanceOf(address(this)) - tokenOutBalanceBefore;
    }
}
