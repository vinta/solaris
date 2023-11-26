// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";
import { console } from "forge-std/console.sol";

contract ArbitrageurFlash is BaseArbitrageur, UniswapV3FlashSwapMixin, VelodromeV2RouterMixin {
    struct SwapCallbackData {
        address caller;
        address pool;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minProfit;
        bool velodromeV2Stable;
    }

    // external

    function arbitrageUniswapV3FlashSwapToVelodromeV2(
        address uniswapV3Pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bool velodromeV2Stable
    ) external {
        bytes memory swapCallbackData = abi.encode(
            SwapCallbackData({
                caller: msg.sender,
                pool: uniswapV3Pool,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                minProfit: minProfit,
                velodromeV2Stable: velodromeV2Stable
            })
        );
        _swapOnUniswapV3FlashSwap(uniswapV3Pool, tokenIn, tokenOut, amountIn, swapCallbackData);
    }

    // callback

    function uniswapV3SwapCallback(int amount0, int amount1, bytes calldata data) external {
        SwapCallbackData memory decodedData = abi.decode(data, (SwapCallbackData));
        require(msg.sender == decodedData.pool, "not authorized");

        // negative means it's amountOut
        uint256 amountOutFromFirst = (decodedData.tokenIn < decodedData.tokenOut) ? uint(-amount1) : uint(-amount0);

        uint256 amountOut = _swapOnVelodromeV2Router(
            decodedData.tokenOut,
            decodedData.tokenIn,
            amountOutFromFirst,
            decodedData.amountIn + decodedData.minProfit,
            decodedData.velodromeV2Stable,
            address(this) // transfer amountOut directly to msg.sender
        );

        // pay back flash swap
        IERC20(decodedData.tokenIn).transfer(decodedData.pool, decodedData.amountIn);

        uint256 profit = amountOut - decodedData.amountIn;
        IERC20(decodedData.tokenIn).transfer(decodedData.caller, profit);
    }
}
