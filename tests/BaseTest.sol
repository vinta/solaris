// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IUniswapV3SwapRouter } from "../contracts/arbitrage/mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";

import "forge-std/Test.sol";

contract BaseTest is Test {
    address ONEINCH_AGGREGATION_ROUTER_V5 = 0x1111111254EEB25477B68fb85Ed929f73A960582;
    address UNISWAP_V3_SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address UNISWAP_V3_SWAP_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address VELODROME_V2_ROUTER = 0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858;
    address VELODROME_V2_POOL_FACTORY = 0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a;
    address WOOFI_V2_ROUTER = 0xEAf1Ac8E89EA0aE13E0f03634A4FF23502527024;

    address trader = makeAddr("trader");

    // public

    function test_excludeFromCoverage() public virtual {}

    // internal

    function _dealAndApprove(address token, uint256 amount, address account, address spender) internal {
        deal(token, account, amount);
        vm.prank(account);
        IERC20(token).approve(spender, amount);
    }

    function _uniswapV3ExactInputSingle(address wallet, address tokenIn, address tokenOut, uint256 amountIn) internal {
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(wallet);
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER, amountIn);
        IUniswapV3SwapRouter(UNISWAP_V3_SWAP_ROUTER).exactInputSingle(
            IUniswapV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 500,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        vm.stopPrank();
    }

    function _velodromeV2SwapExactTokensForTokens(
        address wallet,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal {
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(wallet);
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);
        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](1);
        routes[0] = IVelodromeV2Router.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false,
            factory: VELODROME_V2_POOL_FACTORY
        });
        IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(amountIn, 0, routes, wallet, block.timestamp);
        vm.stopPrank();
    }
}
