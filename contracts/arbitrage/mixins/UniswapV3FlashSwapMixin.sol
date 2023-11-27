// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

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

abstract contract UniswapV3FlashSwapMixin {
    uint160 constant MIN_SQRT_RATIO = 4295128739;
    uint160 constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    // internal

    function _swapOnUniswapV3FlashSwap(
        address uniswapV3Pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory swapCallbackData
    ) internal {
        bool zeroForOne = tokenIn < tokenOut;

        // amountOut from flash swap will be the same as using swapRouter.exactInputSingle()
        IUniswapV3Pool(uniswapV3Pool).swap(
            address(this),
            zeroForOne,
            int(amountIn),
            zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1,
            swapCallbackData
        );
    }
}
