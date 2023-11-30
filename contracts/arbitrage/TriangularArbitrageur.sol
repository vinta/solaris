// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { IUniswapV3SwapRouter } from "./mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "./mixins/VelodromeV2RouterMixin.sol";
import { IMummyRouter } from "./mixins/MummyRouterMixin.sol";

contract TriangularArbitrageur is BaseArbitrageur {
    address constant UNISWAP_V3_SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant VELODROME_V2_ROUTER = 0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858;
    address constant VELODROME_V2_POOL_FACTORY = 0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a;
    address constant MUMMY_ROUTER = 0x68d1CA32Aee9a73534429D8376743Bf222ff1870;

    // external

    function arbitrageUniswapV3(
        bytes memory path,
        address tokenIn,
        uint256 amountIn,
        uint256 minProfit
    ) external returns (uint256) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER, amountIn);

        return
            IUniswapV3SwapRouter(UNISWAP_V3_SWAP_ROUTER).exactInput(
                IUniswapV3SwapRouter.ExactInputParams({
                    path: path,
                    recipient: msg.sender, // transfer amountOut directly to msg.sender
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: amountIn + minProfit
                })
            );
    }

    function arbitrageVelodromeV2(
        address[] memory tokens,
        uint256 amountIn,
        uint256 minProfit
    ) external returns (uint256) {
        address tokenIn = tokens[0];
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

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
            amountIn + minProfit,
            routes,
            msg.sender, // transfer amountOut directly to msg.sender
            block.timestamp
        );

        return amounts[amounts.length - 1];
    }

    function arbitrageMummy(address[] memory path, uint256 amountIn, uint256 minProfit) external returns (uint256) {
        address tokenIn = path[0];
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

        uint256 tokenInBalanceBefore = IERC20(tokenIn).balanceOf(msg.sender);

        IMummyRouter(MUMMY_ROUTER).swap(path, amountIn, amountIn + minProfit, msg.sender);

        return IERC20(tokenIn).balanceOf(msg.sender) - tokenInBalanceBefore;
    }
}
