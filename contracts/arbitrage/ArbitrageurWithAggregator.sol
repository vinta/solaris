// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3Mixin } from "./mixins/UniswapV3Mixin.sol";

contract ArbitrageurWithAggregator is BaseArbitrageur, UniswapV3Mixin {
    using SafeERC20 for IERC20;

    // external

    function arbitrage1inchToUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bytes calldata _1inchData
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // TODO: maybe we should excude uniswap v3 from 1inch api query
        // since we do uniswap v3 in the second step
        uint256 amountOutFromFirst = _swapOn1inch(tokenIn, tokenOut, amountIn, _1inchData);
        uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);

        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    function _swapOn1inch(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata _1inchData
    ) internal returns (uint256) {}
}
