// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { VelodromeV2Mixin, IVelodromeV2Router } from "./mixins/VelodromeV2Mixin.sol";

contract TriangularArbitrageur is BaseArbitrageur, VelodromeV2Mixin {
    using SafeERC20 for IERC20;

    // external

    function arbitrageVelodromeV2(address[] memory tokens, uint256 amountIn, uint256 minProfit) external {
        address tokenIn = 0x4200000000000000000000000000000000000006;

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

        // WETH -> AERO -> USDbC -> WETH
        uint256 length = tokens.length / 2;
        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](length);
        for (uint i = 0; i < length; i++) {
            routes[i] = IVelodromeV2Router.Route({
                from: tokens[i * 2],
                to: tokens[i * 2 + 1],
                stable: false,
                factory: VELODROME_V2_POOL_FACTORY
            });
        }

        uint256[] memory amounts = IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            address(this),
            block.timestamp
        );

        uint256 amountOut = amounts[amounts.length - 1];
        _requireProfit(amountIn, amountOut, minProfit);

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }
}
