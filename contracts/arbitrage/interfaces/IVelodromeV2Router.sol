// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

interface IVelodromeV2Router {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
