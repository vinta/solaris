// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { BaseTest } from "../BaseTest.sol";
import { Arbitrageur } from "../../contracts/arbitrage/Arbitrageur.sol";
import { IUniswapV3Router } from "../../contracts/arbitrage/interfaces/IUniswapV3Router.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/interfaces/IVelodromeV2Router.sol";

contract ArbitrageurBaseForkTest is BaseTest {
    Arbitrageur arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address nonOwner = makeAddr("nonOwner");
    address weth = 0x4200000000000000000000000000000000000006;
    address usdc = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));

        vm.prank(owner);
        arbitrageur = new Arbitrageur();
    }

    function test_owner_Success() public {
        assertEq(owner, arbitrageur.owner());
    }

    function test_withdrawAll_Success() public {
        assertEq(IERC20(weth).balanceOf(owner), 0);

        deal(weth, address(arbitrageur), 1 ether);

        vm.prank(owner);
        arbitrageur.withdrawAll(weth);

        assertEq(IERC20(weth).balanceOf(owner), 1 ether);
    }

    function test_withdrawAll_RevertIf_NotOwner() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        arbitrageur.withdrawAll(weth);
    }

    function testFork_arbitrageUniswapV3toVelodromeV2_Success() public {
        _uniswapV3ExactInputSingle(trader, usdc, weth, 100000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toVelodromeV2(weth, usdc, amountIn, 0, 500, false);

        assertEq(IERC20(weth).balanceOf(address(owner)) > amountIn, true);
    }

    function test_arbitrageUniswapV3toVelodromeV2_RevertIf_NotOwner() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        arbitrageur.arbitrageUniswapV3toVelodromeV2(weth, usdc, 1 ether, 0, 500, false);
    }

    function testFork_arbitrageUniswapV3toVelodromeV2_RevertIf_NoProfit() public {
        _dealAndApprove(weth, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(Arbitrageur.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toVelodromeV2(weth, usdc, 1 ether, 0, 500, false);
    }

    function testFork_arbitrageVelodromeV2toUniswapV3_Success() public {
        _velodromeV2SwapExactTokensForTokens(trader, usdc, weth, 100000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2toUniswapV3(weth, usdc, amountIn, 0, 500, false);

        assertEq(IERC20(weth).balanceOf(address(owner)) > amountIn, true);
    }

    function test_arbitrageVelodromeV2toUniswapV3_RevertIf_NotOwner() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(nonOwner);
        arbitrageur.arbitrageVelodromeV2toUniswapV3(weth, usdc, 1 ether, 0, 500, false);
    }

    function testFork_arbitrageVelodromeV2toUniswapV3_RevertIf_NoProfit() public {
        _dealAndApprove(weth, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(Arbitrageur.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2toUniswapV3(weth, usdc, 1 ether, 0, 500, false);
    }

    // internal

    function _dealAndApprove(address token, uint256 amount, address account, address spender) internal {
        deal(token, account, amount);
        vm.prank(account);
        IERC20(token).approve(spender, amount);
    }

    function _uniswapV3ExactInputSingle(address wallet, address tokenIn, address tokenOut, uint256 amountIn) internal {
        address UNISWAP_V3_SWAP_ROUTER_02 = arbitrageur.UNISWAP_V3_SWAP_ROUTER_02();
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(trader);
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER_02, amountIn);
        IUniswapV3Router(UNISWAP_V3_SWAP_ROUTER_02).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
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
