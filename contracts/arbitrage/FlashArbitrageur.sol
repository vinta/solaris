// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { ArbitrageFunc } from "./enums/ArbitrageFunc.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";
import { WOOFiV2RouterMixin } from "./mixins/WOOFiV2RouterMixin.sol";
import { MummyRouterMixin } from "./mixins/MummyRouterMixin.sol";

contract FlashArbitrageur is
    IErrors,
    BaseArbitrageur,
    UniswapV3FlashSwapMixin,
    VelodromeV2RouterMixin,
    WOOFiV2RouterMixin,
    MummyRouterMixin
{
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

    function arbitrage(
        address borrowFromPool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        ArbitrageFunc secondArbitrageFunc
    ) external {
        _swapOnUniswapV3FlashSwap(
            borrowFromPool,
            tokenIn,
            tokenOut,
            amountIn,
            abi.encode(
                SwapCallbackData({
                    caller: msg.sender,
                    pool: borrowFromPool,
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

        address recipient = address(this);
        address tokenIn = decoded.tokenIn;
        address tokenOut = decoded.tokenOut;
        uint256 amountIn = decoded.amountIn;
        uint256 minProfit = decoded.minProfit;
        ArbitrageFunc secondArbitrageFunc = decoded.secondArbitrageFunc;

        uint256 amountOutFromFirst = (tokenIn < tokenOut) ? uint(-amount1) : uint(-amount0);

        uint256 amountOut;
        if (secondArbitrageFunc == ArbitrageFunc.VelodromeV2Router) {
            amountOut = _swapOnVelodromeV2Router(
                tokenOut,
                tokenIn,
                amountOutFromFirst,
                amountIn + minProfit,
                false,
                recipient
            );
        } else if (secondArbitrageFunc == ArbitrageFunc.WOOFiV2Router) {
            amountOut = _swapOnWOOFiV2Router(tokenOut, tokenIn, amountOutFromFirst, amountIn + minProfit, recipient);
        } else if (secondArbitrageFunc == ArbitrageFunc.MummyRouter) {
            amountOut = _swapOnMummyRouter(tokenOut, tokenIn, amountOutFromFirst, amountIn + minProfit, recipient);
        } else {
            revert InvalidBranch();
        }

        IERC20(tokenIn).transfer(pool, amountIn);

        IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
    }
}
