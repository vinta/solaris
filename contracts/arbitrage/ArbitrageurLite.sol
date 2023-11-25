// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3SwapRouterMixin } from "./mixins/UniswapV3SwapRouterMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";

contract ArbitrageurLite is BaseArbitrageur, UniswapV3SwapRouterMixin, VelodromeV2RouterMixin {
    // external

    function arbitrageUniswapV3toVelodromeV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnUniswapV3SwapRouter(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            uniswapV3Fee,
            address(this)
        );
        _swapOnVelodromeV2Router(
            tokenOut,
            tokenIn,
            amountOutFromFirst,
            amountIn + minProfit,
            velodromeV2Stable,
            msg.sender // transfer amountOut directly to msg.sender
        );
    }

    function arbitrageVelodromeV2toUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnVelodromeV2Router(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            velodromeV2Stable,
            address(this)
        );
        _swapOnUniswapV3SwapRouter(
            tokenOut,
            tokenIn,
            amountOutFromFirst,
            amountIn + minProfit,
            uniswapV3Fee,
            msg.sender // transfer amountOut directly to msg.sender
        );
    }
}
