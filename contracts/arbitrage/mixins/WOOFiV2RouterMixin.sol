// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IWOOFiV2Router {
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        address payable to,
        address rebateTo
    ) external payable returns (uint256 realToAmount);
}

abstract contract WOOFiV2RouterMixin {
    // https://learn.woo.org/v/woofi-dev-docs/guides/integrate-woofi-as-liquidity-source#integrating-woorouterv2.sol
    // https://github.com/woonetwork/WooPoolV2/blob/main/contracts/WooRouterV2.sol
    address public constant WOOFI_V2_ROUTER = 0xEAf1Ac8E89EA0aE13E0f03634A4FF23502527024;

    // internal

    function _swapOnWOOFiV2Router(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address payable recipient
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(WOOFI_V2_ROUTER, amountIn);

        return
            IWOOFiV2Router(WOOFI_V2_ROUTER).swap(tokenIn, tokenOut, amountIn, amountOutMinimum, recipient, recipient);
    }
}
