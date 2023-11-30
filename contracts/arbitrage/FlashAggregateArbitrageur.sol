// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { BeethovenFlashLoanMixin } from "./mixins/BeethovenFlashLoanMixin.sol";
import { OneInchRouterV5Mixin } from "./mixins/OneInchRouterV5Mixin.sol";
import { UniswapV3SwapRouterMixin } from "./mixins/UniswapV3SwapRouterMixin.sol";
import { UniswapV3FlashSwapMixin } from "./mixins/UniswapV3FlashSwapMixin.sol";

contract FlashAggregateArbitrageur is
    IErrors,
    BaseArbitrageur,
    BeethovenFlashLoanMixin,
    OneInchRouterV5Mixin,
    UniswapV3FlashSwapMixin,
    UniswapV3SwapRouterMixin
{
    struct BeethovenFlashloanCallbackData {
        address tokenOut;
        uint256 minProfit;
        bytes oneInchData;
        uint24 uniswapV3Fee;
    }

    struct UniswapV3SwapCallbackData {
        address caller;
        address pool;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minProfit;
        bytes oneInchData;
    }

    // external

    function arbitrageOneInch(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bytes calldata oneInchData,
        uint24 uniswapV3Fee
    ) external returns (uint256) {
        uint256 tokenInBalanceBefore = IERC20(tokenIn).balanceOf(address(this));

        _flashloanFromBeethoven(
            tokenIn,
            amountIn,
            abi.encode(
                BeethovenFlashloanCallbackData({
                    tokenOut: tokenOut,
                    minProfit: minProfit,
                    oneInchData: oneInchData,
                    uniswapV3Fee: uniswapV3Fee
                })
            )
        );

        return IERC20(tokenIn).balanceOf(address(this)) - tokenInBalanceBefore;
    }

    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        if (msg.sender != BEETHOVEN_VAULT) {
            revert InvalidCaller();
        }

        BeethovenFlashloanCallbackData memory decoded = abi.decode(userData, (BeethovenFlashloanCallbackData));

        address tokenIn = tokens[0];
        address tokenOut = decoded.tokenOut;
        uint256 amountIn = amounts[0];
        uint256 fee = feeAmounts[0];

        uint256 amountOutFromFirst = _swapOnOneInchRouterV5(tokenIn, tokenOut, amountIn, decoded.oneInchData);
        _swapOnUniswapV3SwapRouter(
            tokenOut,
            tokenIn,
            amountOutFromFirst,
            amountIn + fee + decoded.minProfit,
            decoded.uniswapV3Fee,
            address(this)
        );

        IERC20(tokenIn).transfer(BEETHOVEN_VAULT, amountIn + fee);

        // keep profit in the contract
        // IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
    }

    function arbitrageUniswapV3(
        address borrowFromPool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bytes calldata oneInchData
    ) external returns (uint256) {
        uint256 tokenInBalanceBefore = IERC20(tokenIn).balanceOf(address(this));

        _swapOnUniswapV3FlashSwap(
            borrowFromPool,
            tokenIn,
            tokenOut,
            amountIn,
            abi.encode(
                UniswapV3SwapCallbackData({
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

        return IERC20(tokenIn).balanceOf(address(this)) - tokenInBalanceBefore;
    }

    function uniswapV3SwapCallback(int amount0, int amount1, bytes calldata data) external {
        UniswapV3SwapCallbackData memory decoded = abi.decode(data, (UniswapV3SwapCallbackData));
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

            // keep profit in the contract
            // IERC20(tokenIn).transfer(decoded.caller, amountOut - amountIn);
        } else {
            revert NoProfit();
        }
    }
}
