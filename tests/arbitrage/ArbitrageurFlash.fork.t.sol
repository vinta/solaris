// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { ArbitrageurFlash } from "../../contracts/arbitrage/ArbitrageurFlash.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";

import { BaseTest } from "../BaseTest.sol";

contract ArbitrageurFlashForkTest is BaseTest {
    ArbitrageurFlash arbitrageur;
    address owner = makeAddr("owner");

    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;

    // WETH/USDCe 500
    address UNISWAP_V3_POOL = 0x85149247691df622eaF1a8Bd0CaFd40BC45154a9;

    uint256 minProfit = 0;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("optimism"), 112538453);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new ArbitrageurFlash();
    }

    // VelodromeV2Router

    function testFork_VelodromeV2Router() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwap(
            UNISWAP_V3_POOL,
            WETH,
            USDCe,
            amountIn,
            minProfit,
            ArbitrageurFlash.ArbitrageFunc.VelodromeV2Router
        );

        assertEq(IERC20(WETH).balanceOf(address(owner)), 7096710211096831);
    }

    function testFork_VelodromeV2Router_2() public {
        _velodromeV2SwapExactTokensForTokens(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 4000e6;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwap(
            UNISWAP_V3_POOL,
            USDCe,
            WETH,
            amountIn,
            minProfit,
            ArbitrageurFlash.ArbitrageFunc.VelodromeV2Router
        );

        assertEq(IERC20(USDCe).balanceOf(address(owner)), 753548825);
    }

    // WOOFiV2Router

    function testFork_WOOFiV2Router() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwap(
            UNISWAP_V3_POOL,
            WETH,
            USDCe,
            amountIn,
            minProfit,
            ArbitrageurFlash.ArbitrageFunc.WOOFiV2Router
        );

        assertEq(IERC20(WETH).balanceOf(address(owner)), 17026219616002745);
    }

    // MummyRouter

    function testFork_MummyRouter() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwap(
            UNISWAP_V3_POOL,
            WETH,
            USDCe,
            amountIn,
            minProfit,
            ArbitrageurFlash.ArbitrageFunc.MummyRouter
        );

        assertEq(IERC20(WETH).balanceOf(address(owner)), 12111809400000000);
    }
}
