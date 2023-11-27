// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { OneInchRouterV5Mixin } from "./mixins/OneInchRouterV5Mixin.sol";

contract AggregateArbitrageur is IErrors, BaseArbitrageur, UniswapV3FlashSwapMixin, OneInchRouterV5Mixin {
    struct SwapCallbackData {
        address caller;
        address pool;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minProfit;
        bytes oneInchData;
    }

    // external

    function arbitrageUniswapV3FlashSwap(
        address borrowFromPool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bytes calldata oneInchData
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
                    oneInchData: oneInchData
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

        uint256 amountOutFromFirst = (tokenIn < tokenOut) ? uint(-amount1) : uint(-amount0);
        uint256 amountOut = _swapOnOneInchRouterV5(tokenOut, tokenIn, amountOutFromFirst, decoded.oneInchData);

        if (amountOut >= amountIn + minProfit) {
            IERC20(tokenIn).transfer(pool, amountIn);

            IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
        } else {
            revert NoProfit();
        }
    }
}
