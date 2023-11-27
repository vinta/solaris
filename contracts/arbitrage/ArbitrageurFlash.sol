// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";
import { WOOFiV2RouterMixin } from "./mixins/WOOFiV2RouterMixin.sol";
import { MummyRouterMixin } from "./mixins/MummyRouterMixin.sol";

contract ArbitrageurFlash is
    IErrors,
    BaseArbitrageur,
    UniswapV3FlashSwapMixin,
    VelodromeV2RouterMixin,
    WOOFiV2RouterMixin,
    MummyRouterMixin
{
    // uint8
    enum ArbitrageFunc {
        VelodromeV2Router, // 0
        WOOFiV2Router, // 1
        MummyRouter // 2
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
        _swapOnUniswapV3FlashSwap(
            pool,
            tokenIn,
            tokenOut,
            amountIn,
            abi.encode(
                SwapCallbackData({
                    caller: msg.sender,
                    pool: pool,
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    minProfit: minProfit,
                    secondArbitrageFunc: secondArbitrageFunc
                })
            )
        );
    }

    function uniswapV3SwapCallback(int amount0, int amount1, bytes calldata data) external {
        SwapCallbackData memory decoded = abi.decode(data, (SwapCallbackData));
        address pool = decoded.pool;
        if (msg.sender != pool) {
            revert InvalidCaller();
        }

        address tokenIn = decoded.tokenIn;
        address tokenOut = decoded.tokenOut;
        uint256 amountIn = decoded.amountIn;
        uint256 minProfit = decoded.minProfit;
        ArbitrageFunc secondArbitrageFunc = decoded.secondArbitrageFunc;

        // negative means it's amountOut
        uint256 amountOutFromFirst = (tokenIn < tokenOut) ? uint(-amount1) : uint(-amount0);

        uint256 amountOut;
        if (secondArbitrageFunc == ArbitrageFunc.VelodromeV2Router) {
            amountOut = _swapOnVelodromeV2Router(
                tokenOut,
                tokenIn,
                amountOutFromFirst,
                amountIn + minProfit,
                false,
                address(this)
            );
        } else if (secondArbitrageFunc == ArbitrageFunc.WOOFiV2Router) {
            amountOut = _swapOnWOOFiV2Router(
                tokenOut,
                tokenIn,
                amountOutFromFirst,
                amountIn + minProfit,
                address(this)
            );
        } else if (secondArbitrageFunc == ArbitrageFunc.MummyRouter) {
            amountOut = _swapOnMummyRouter(tokenOut, tokenIn, amountOutFromFirst, amountIn + minProfit, address(this));
        } else {
            revert InvalidBranch();
        }

        // pay back flash swap
        IERC20(tokenIn).transfer(pool, amountIn);

        IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
    }
}
