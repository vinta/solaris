// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IUniswapV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3SwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

abstract contract UniswapV3Mixin {
    // https://docs.uniswap.org/contracts/v3/reference/deployments
    // https://github.com/Uniswap/v3-periphery/blob/v1.0.0/contracts/SwapRouter.sol
    address public constant UNISWAP_V3_SWAP_ROUTER = address(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    // https://github.com/Uniswap/swap-router-contracts/blob/main/contracts/SwapRouter02.sol
    address public constant UNISWAP_V3_SWAP_ROUTER_02 = address(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

    // internal

    function _swapOnUniswapV3SwapRouter(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER, amountIn);

        return
            IUniswapV3SwapRouter(UNISWAP_V3_SWAP_ROUTER).exactInputSingle(
                IUniswapV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
    }

    function _swapOnUniswapV3SwapRouter02(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER_02, amountIn);

        return
            IUniswapV3SwapRouter02(UNISWAP_V3_SWAP_ROUTER_02).exactInputSingle(
                IUniswapV3SwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
    }
}
