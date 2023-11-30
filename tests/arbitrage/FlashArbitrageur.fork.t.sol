// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { FlashArbitrageur } from "../../contracts/arbitrage/FlashArbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { ArbitrageFunc } from "../../contracts/arbitrage/enums/ArbitrageFunc.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract FlashArbitrageurForkTest is BaseTest {
    FlashArbitrageur arbitrageur;
    address owner = makeAddr("owner");

    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;
    address UNISWAP_V3_POOL = 0x85149247691df622eaF1a8Bd0CaFd40BC45154a9; // WETH/USDCe 500

    uint256 minProfit = 0;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("optimism"), 112538453);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new FlashArbitrageur(owner);

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 0);
        assertEq(IERC20(USDCe).balanceOf(address(arbitrageur)), 0);
        assertEq(IERC20(OP).balanceOf(address(arbitrageur)), 0);
    }

    // VelodromeV2Router

    function testFork_arbitrage_VelodromeV2Router() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        uint256 profit = arbitrageur.arbitrage(
            UNISWAP_V3_POOL,
            WETH,
            USDCe,
            amountIn,
            minProfit,
            ArbitrageFunc.VelodromeV2Router
        );

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 7096710211096831);
        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), profit);
    }

    function testFork_arbitrage_VelodromeV2Router_2() public {
        _velodromeV2SwapExactTokensForTokens(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 4000e6;
        vm.prank(owner);
        uint256 profit = arbitrageur.arbitrage(
            UNISWAP_V3_POOL,
            USDCe,
            WETH,
            amountIn,
            minProfit,
            ArbitrageFunc.VelodromeV2Router
        );

        assertEq(IERC20(USDCe).balanceOf(address(arbitrageur)), 753548825);
        assertEq(IERC20(USDCe).balanceOf(address(arbitrageur)), profit);
    }

    function testFork_arbitrage_VelodromeV2Router_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(IVelodromeV2Router.InsufficientOutputAmount.selector));
        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrage(UNISWAP_V3_POOL, WETH, USDCe, amountIn, minProfit, ArbitrageFunc.VelodromeV2Router);
    }

    // WOOFiV2Router

    function testFork_arbitrage_WOOFiV2Router() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrage(UNISWAP_V3_POOL, WETH, USDCe, amountIn, minProfit, ArbitrageFunc.WOOFiV2Router);

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 17026219616002745);
    }

    // MummyRouter

    function testFork_arbitrage_MummyRouter() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrage(UNISWAP_V3_POOL, WETH, USDCe, amountIn, minProfit, ArbitrageFunc.MummyRouter);

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 12111809400000000);
    }
}
