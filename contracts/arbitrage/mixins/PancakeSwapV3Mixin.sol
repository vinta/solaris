// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IPancakeSwapV3SwapRouter {
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
}

abstract contract PancakeSwapV3Mixin {
    // https://github.com/pancakeswap/pancake-v3-contracts/blob/main/deployments/eth.json
    // https://github.com/pancakeswap/pancake-v3-contracts/blob/main/projects/v3-periphery/contracts/interfaces/ISwapRouter.sol
    address public constant PANCAKESWAP_V3_SWAP_ROUTER = address(0x1b81D678ffb9C0263b24A97847620C99d213eB14);

    // internal

    function _swapOnPancakeSwapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(PANCAKESWAP_V3_SWAP_ROUTER, amountIn);

        return
            IPancakeSwapV3SwapRouter(PANCAKESWAP_V3_SWAP_ROUTER).exactInputSingle(
                IPancakeSwapV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: address(this),
                    deadline: block.timestamp + 1,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
    }
}
