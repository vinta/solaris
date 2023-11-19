// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

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

abstract contract VelodromeV2Mixin {
    // https://velodrome.finance/security#contracts
    // https://github.com/velodrome-finance/contracts/blob/main/contracts/Router.sol
    address public constant VELODROME_V2_ROUTER = address(0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858);
    address public constant VELODROME_V2_POOL_FACTORY = address(0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a);

    // internal

    function _swapOnVelodromeV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bool stable
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](1);
        routes[0] = IVelodromeV2Router.Route({
            from: tokenIn,
            to: tokenOut,
            stable: stable,
            factory: VELODROME_V2_POOL_FACTORY
        });
        uint256[] memory amounts = IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            address(this),
            block.timestamp
        );

        return amounts[amounts.length - 1];
    }
}
