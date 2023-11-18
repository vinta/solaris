// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { OneInchV5Mixin } from "./mixins/OneInchV5Mixin.sol";
import { PancakeSwapV3Mixin } from "./mixins/PancakeSwapV3Mixin.sol";
import { UniswapV3Mixin } from "./mixins/UniswapV3Mixin.sol";

contract ArbitrageurWithAggregator is BaseArbitrageur, OneInchV5Mixin, PancakeSwapV3Mixin, UniswapV3Mixin {
    using SafeERC20 for IERC20;

    // external

    function arbitrageOneInchToUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bytes calldata oneInchData
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnOneInchV5(tokenIn, tokenOut, amountIn, oneInchData);
        uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

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

        uint256 amountOutFromFirst = _swapOnPancakeSwapV3(tokenOut, tokenIn, amountIn, pancakeSwapV3Fee);
        uint256 amountOut = _swapOnUniswapV3(tokenIn, tokenOut, amountOutFromFirst, uniswapV3Fee);
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }
}
