// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { UniswapV3Mixin } from "./mixins/UniswapV3Mixin.sol";
import { VelodromeV2Mixin } from "./mixins/VelodromeV2Mixin.sol";

contract Arbitrageur is Ownable, VelodromeV2Mixin, UniswapV3Mixin {
    using SafeERC20 for IERC20;

    error NoProfit();

    // external

    function withdrawAll(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }

    function arbitrageVelodromeV2toUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnVelodromeV2(tokenIn, tokenOut, amountIn, velodromeV2Stable);
        uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);

        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    function arbitrageUniswapV3toVelodromeV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromFirst = _swapOnUniswapV3(tokenIn, tokenOut, amountIn, uniswapV3Fee);
        uint256 amountOut = _swapOnVelodromeV2(tokenOut, tokenIn, amountOutFromFirst, velodromeV2Stable);

        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }
}
