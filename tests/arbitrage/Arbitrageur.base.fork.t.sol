// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { Arbitrageur } from "../../contracts/arbitrage/Arbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3SwapRouter02 } from "../../contracts/arbitrage/mixins/UniswapV3Mixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2Mixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract ArbitrageurBaseForkTest is BaseTest {
    Arbitrageur arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address WETH = 0x4200000000000000000000000000000000000006;
    address USDbC = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
    address AERO = 0x940181a94A35A4569E4529A3CDfB74e38FD98631;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new Arbitrageur();
    }

    function testFork_arbitrageUniswapV3toPancakeSwapV3_Success() public {
        _uniswapV3ExactInputSingle(trader, USDbC, WETH, 100000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));

        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toPancakeSwapV3(WETH, USDbC, amountIn, 0, 500, 500);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageUniswapV3toPancakeSwapV3_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toPancakeSwapV3(WETH, USDbC, 1 ether, 0, 500, 500);
    }

    // function testFork_arbitrageUniswapV3toVelodromeV2_Success() public {
    //     _uniswapV3ExactInputSingle(trader, USDbC, WETH, 100000e6);

    //     uint256 amountIn = 1 ether;
    //     _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));

    //     vm.prank(owner);
    //     arbitrageur.arbitrageUniswapV3toVelodromeV2(WETH, USDbC, amountIn, 0, 500, false);

    //     assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    // }

    // function testFork_arbitrageUniswapV3toVelodromeV2_RevertIf_NoProfit() public {
    //     _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

    //     vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
    //     vm.prank(owner);
    //     arbitrageur.arbitrageUniswapV3toVelodromeV2(WETH, USDbC, 1 ether, 0, 500, false);
    // }

    // function testFork_arbitrageVelodromeV2toUniswapV3_Success() public {
    //     _velodromeV2SwapExactTokensForTokens(trader, USDbC, WETH, 100000e6);

    //     uint256 amountIn = 1 ether;
    //     _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));

    //     vm.prank(owner);
    //     arbitrageur.arbitrageVelodromeV2toUniswapV3(WETH, USDbC, amountIn, 0, 500, false);

    //     assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    // }

    // function testFork_arbitrageVelodromeV2toUniswapV3_RevertIf_NoProfit() public {
    //     _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

    //     vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
    //     vm.prank(owner);
    //     arbitrageur.arbitrageVelodromeV2toUniswapV3(WETH, USDbC, 1 ether, 0, 500, false);
    // }

    // function testFork_triangularArbitrageUniswapV3_RevertIf_NoProfit() public {
    //     _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

    //     bytes memory path = abi.encodePacked(WETH, uint24(500), USDbC, uint24(500), USDC, uint24(500), WETH);

    //     vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
    //     vm.prank(owner);
    //     arbitrageur.triangularArbitrageUniswapV3(path, WETH, 1 ether, 0);
    // }

    function testFork_triangularArbitrageVelodromeV2_Success() public {
        _velodromeV2SwapExactTokensForTokens(trader, AERO, WETH, 100000000 ether);

        // WETH -> AERO -> USDbC -> WETH
        address[] memory tokens = new address[](6);
        tokens[0] = WETH;
        tokens[1] = AERO;
        tokens[2] = AERO;
        tokens[3] = USDbC;
        tokens[4] = USDbC;
        tokens[5] = WETH;

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));

        vm.prank(owner);
        arbitrageur.triangularArbitrageVelodromeV2(tokens, 1 ether, 0);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_triangularArbitrageVelodromeV2_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        address[] memory tokens = new address[](6);
        tokens[0] = WETH;
        tokens[1] = AERO;
        tokens[2] = AERO;
        tokens[3] = USDbC;
        tokens[4] = USDbC;
        tokens[5] = WETH;

        vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.triangularArbitrageVelodromeV2(tokens, 1 ether, 0);
    }

    // internal

    function _uniswapV3ExactInputSingle(address wallet, address tokenIn, address tokenOut, uint256 amountIn) internal {
        address UNISWAP_V3_SWAP_ROUTER_02 = arbitrageur.UNISWAP_V3_SWAP_ROUTER_02();
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(trader);
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER_02, amountIn);
        IUniswapV3SwapRouter02(UNISWAP_V3_SWAP_ROUTER_02).exactInputSingle(
            IUniswapV3SwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 500,
                recipient: address(this),
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
