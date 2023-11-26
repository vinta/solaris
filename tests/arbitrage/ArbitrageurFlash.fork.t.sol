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

        // address[] memory spenders = new address[](2);
        // spenders[0] = arbitrageur.UNISWAP_V3_SWAP_ROUTER();
        // spenders[1] = arbitrageur.VELODROME_V2_ROUTER();

        // vm.startPrank(owner);
        // arbitrageur.approveAll(WETH, spenders, type(uint256).max);
        // arbitrageur.approveAll(USDCe, spenders, type(uint256).max);
        // arbitrageur.approveAll(OP, spenders, type(uint256).max);
        // vm.stopPrank();
    }

    // arbitrageUniswapV3FlashSwap

    function testFork_arbitrageUniswapV3FlashSwap_Success() public {
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

    function testFork_arbitrageUniswapV3FlashSwap_Success_2() public {
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

    // function testFork_arbitrageUniswapV3toVelodromeV2_Success() public {
    //     // _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

    //     // uint256 amountIn = 1 ether;
    //     // _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
    //     // assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

    //     deal(WETH, address(arbitrageur), 1 ether);

    //     ArbitrageurFlash.FlashParams memory params = ArbitrageurFlash.FlashParams({
    //         token0: WETH,
    //         token1: USDCe,
    //         fee1: 500,
    //         amount0: 10 ether,
    //         amount1: 0
    //     });

    //     vm.prank(owner);
    //     arbitrageur.arbitrageFlash(params);

    //     // assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    // }
}
