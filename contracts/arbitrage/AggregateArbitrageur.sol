// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { ArbitrageFunc } from "./enums/ArbitrageFunc.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";
import { OneInchRouterV5Mixin } from "./mixins/OneInchRouterV5Mixin.sol";

import { console } from "forge-std/console.sol";

interface IUniswapV3Pool {
    function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external;

    function swap(
        address recipient,
        bool zeroForOne,
        int amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int amount0, int amount1);
}

contract AggregateArbitrageur is IErrors, BaseArbitrageur, UniswapV3FlashSwapMixin, OneInchRouterV5Mixin {
    struct FlashCallbackData {
        address caller;
        address pool;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minProfit;
        bytes oneInchData;
        ArbitrageFunc secondArbitrageFunc;
    }

    // external

    function arbitrageOneInchRouterV5(
        address borrowFromPool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bytes calldata oneInchData,
        ArbitrageFunc secondArbitrageFunc
    ) external {
        uint256 _amount0 = 0;
        uint256 _amount1 = 0;
        if (tokenIn < tokenOut) {
            _amount0 = amountIn;
        } else {
            _amount1 = amountIn;
        }

        IUniswapV3Pool(borrowFromPool).flash(
            address(this),
            _amount0,
            _amount1,
            abi.encode(
                FlashCallbackData({
                    caller: msg.sender,
                    pool: borrowFromPool,
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    minProfit: minProfit,
                    oneInchData: oneInchData,
                    secondArbitrageFunc: secondArbitrageFunc
                })
            )
        );
    }

    function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes calldata data) external {
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));
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

        uint256 borrowFee = (tokenIn < tokenOut) ? fee0 : fee1;

        console.log("amountIn");
        console.log(amountIn);

        console.log("borrowFee");
        console.log(borrowFee);

        console.log(IERC20(tokenIn).balanceOf(recipient));

        uint256 amountOutFromFirst = _swapOnOneInchRouterV5(tokenIn, tokenOut, amountIn, decoded.oneInchData);
        console.log("amountOutFromFirst");
        console.log(amountOutFromFirst);

        // uint256 amountOut;
        // if (secondArbitrageFunc == ArbitrageFunc.VelodromeV2Router) {
        //     amountOut = _swapOnVelodromeV2Router(
        //         tokenOut,
        //         tokenIn,
        //         amountOutFromFirst,
        //         amountIn + minProfit,
        //         false,
        //         recipient
        //     );
        // } else if (secondArbitrageFunc == ArbitrageFunc.WOOFiV2Router) {
        //     amountOut = _swapOnWOOFiV2Router(tokenOut, tokenIn, amountOutFromFirst, amountIn + minProfit, recipient);
        // } else if (secondArbitrageFunc == ArbitrageFunc.MummyRouter) {
        //     amountOut = _swapOnMummyRouter(tokenOut, tokenIn, amountOutFromFirst, amountIn + minProfit, recipient);
        // } else {
        //     revert InvalidBranch();
        // }

        // // pay back flash swap
        // IERC20(tokenIn).transfer(pool, amountIn);

        // IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
    }
}
