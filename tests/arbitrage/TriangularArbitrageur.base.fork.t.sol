// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { TriangularArbitrageur } from "../../contracts/arbitrage/TriangularArbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3SwapRouter02 } from "../../contracts/arbitrage/mixins/UniswapV3Mixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2Mixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract TriangularArbitrageurBaseForkTest is BaseTest {
    TriangularArbitrageur arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address weth = 0x4200000000000000000000000000000000000006;
    address usdbc = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
    address aero = 0x940181a94A35A4569E4529A3CDfB74e38FD98631;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new TriangularArbitrageur();
    }

    function testFork_arbitrageUniswapV3toPancakeSwapV3_Success() public {
        _velodromeV2SwapExactTokensForTokens(trader, aero, weth, 100000000 ether);

        address[] memory tokens = new address[](6);
        tokens[0] = weth;
        tokens[1] = aero;
        tokens[2] = aero;
        tokens[3] = usdbc;
        tokens[4] = usdbc;
        tokens[5] = weth;

        uint256 amountIn = 1 ether;
        _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2(tokens, 1 ether, 0);

        assertEq(IERC20(weth).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageVelodromeV2RevertIf_NoProfit() public {
        _dealAndApprove(weth, 1 ether, owner, address(arbitrageur));

        address[] memory tokens = new address[](6);
        tokens[0] = weth;
        tokens[1] = aero;
        tokens[2] = aero;
        tokens[3] = usdbc;
        tokens[4] = usdbc;
        tokens[5] = weth;

        vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2(tokens, 1 ether, 0);
    }

    // internal

    function _velodromeV2SwapExactTokensForTokens(
        address wallet,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal {
        address VELODROME_V2_ROUTER = arbitrageur.VELODROME_V2_ROUTER();
        address VELODROME_V2_POOL_FACTORY = arbitrageur.VELODROME_V2_POOL_FACTORY();
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(trader);
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
