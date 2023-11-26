// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";
import { console } from "forge-std/console.sol";

contract ArbitrageurFlash is IErrors, BaseArbitrageur, UniswapV3FlashSwapMixin, VelodromeV2RouterMixin {
    // uint8
    enum ArbitrageFunc {
        VelodromeV2Router // 0
    }

    struct SwapCallbackData {
        address caller;
        address pool;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minProfit;
        ArbitrageFunc secondArbitrageFunc;
    }

    // external

    function arbitrageUniswapV3FlashSwap(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        ArbitrageFunc secondArbitrageFunc
    ) external {
        bytes memory swapCallbackData = abi.encode(
            SwapCallbackData({
                caller: msg.sender,
                pool: pool,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                minProfit: minProfit,
                secondArbitrageFunc: secondArbitrageFunc
            })
        );
        _swapOnUniswapV3FlashSwap(pool, tokenIn, tokenOut, amountIn, swapCallbackData);
    }

    function uniswapV3SwapCallback(int amount0, int amount1, bytes calldata data) external {
        SwapCallbackData memory decoded = abi.decode(data, (SwapCallbackData));
        if (msg.sender != decoded.pool) {
            revert InvalidCaller();
        }

        // negative means it's amountOut
        uint256 amountOutFromFirst = (decoded.tokenIn < decoded.tokenOut) ? uint(-amount1) : uint(-amount0);

        uint256 amountOut;
        if (decoded.secondArbitrageFunc == ArbitrageFunc.VelodromeV2Router) {
            amountOut = _swapOnVelodromeV2Router(
                decoded.tokenOut,
                decoded.tokenIn,
                amountOutFromFirst,
                decoded.amountIn + decoded.minProfit,
                false,
                address(this) // transfer amountOut directly to msg.sender
            );
        } else {
            revert InvalidBranch();
        }

        // pay back flash swap
        IERC20(decoded.tokenIn).transfer(decoded.pool, decoded.amountIn);

        uint256 profit = amountOut - decoded.amountIn;
        IERC20(decoded.tokenIn).transfer(decoded.caller, profit);
    }
}
