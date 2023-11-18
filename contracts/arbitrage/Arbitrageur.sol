// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { PancakeSwapV3Mixin } from "./mixins/PancakeSwapV3Mixin.sol";
import { UniswapV3Mixin, IUniswapV3SwapRouter02 } from "./mixins/UniswapV3Mixin.sol";
import { VelodromeV2Mixin, IVelodromeV2Router } from "./mixins/VelodromeV2Mixin.sol";

contract Arbitrageur is BaseArbitrageur, PancakeSwapV3Mixin, UniswapV3Mixin, VelodromeV2Mixin {
    using SafeERC20 for IERC20;

    // external

    function arbitrageUniswapV3toPancakeSwapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        uint24 pancakeSwapV3Fee
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnUniswapV3(tokenIn, tokenOut, amountIn, uniswapV3Fee);
        uint256 amountOut = _swapOnPancakeSwapV3(tokenOut, tokenIn, amountOutFromFirst, pancakeSwapV3Fee);
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    function arbitragePancakeSwapV3toUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        uint24 pancakeSwapV3Fee
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnPancakeSwapV3(tokenIn, tokenOut, amountIn, pancakeSwapV3Fee);
        uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    // function arbitrageUniswapV3toVelodromeV2(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 amountIn,
    //     uint256 minProfit,
    //     uint24 uniswapV3Fee,
    //     bool velodromeV2Stable
    // ) external {
    //     IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

    //     uint256 amountOutFromFirst = _swapOnUniswapV3(tokenIn, tokenOut, amountIn, uniswapV3Fee);
    //     uint256 amountOut = _swapOnVelodromeV2(tokenOut, tokenIn, amountOutFromFirst, velodromeV2Stable);
    //     _requireProfit(amountIn, amountOut, minProfit);

    //     IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    // }

    // function arbitrageVelodromeV2toUniswapV3(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 amountIn,
    //     uint256 minProfit,
    //     uint24 uniswapV3Fee,
    //     bool velodromeV2Stable
    // ) external {
    //     IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

    //     uint256 amountOutFromFirst = _swapOnVelodromeV2(tokenIn, tokenOut, amountIn, velodromeV2Stable);
    //     uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);
    //     _requireProfit(amountIn, amountOut, minProfit);

    //     IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    // }

    function triangularArbitrageUniswapV3(
        bytes memory path,
        address tokenIn,
        uint256 amountIn,
        uint256 minProfit
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER_02, amountIn);

        IUniswapV3SwapRouter02.ExactInputParams memory params = IUniswapV3SwapRouter02.ExactInputParams({
            path: path,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: 0
            // amountOutMinimum: amountIn + minProfit
        });
        uint256 amountOut = IUniswapV3SwapRouter02(UNISWAP_V3_SWAP_ROUTER_02).exactInput(params);
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    function triangularArbitrageVelodromeV2(address[] memory tokens, uint256 amountIn, uint256 minProfit) external {
        address tokenIn = tokens[0];
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

        uint256 length = tokens.length / 2;
        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](length);
        for (uint i = 0; i < length; i++) {
            routes[i] = IVelodromeV2Router.Route({
                from: tokens[i * 2],
                to: tokens[i * 2 + 1],
                stable: false,
                factory: VELODROME_V2_POOL_FACTORY
            });
        }

        uint256[] memory amounts = IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            address(this),
            block.timestamp
        );
        uint256 amountOut = amounts[amounts.length - 1];

        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }
}
