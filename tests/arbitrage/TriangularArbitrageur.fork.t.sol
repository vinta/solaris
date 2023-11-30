// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { FlashTriangularArbitrageur } from "../../contracts/arbitrage/FlashTriangularArbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { ArbitrageFunc } from "../../contracts/arbitrage/enums/ArbitrageFunc.sol";
import { IUniswapV3SwapRouter } from "../../contracts/arbitrage/mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";
import { IMummyRouter } from "../../contracts/arbitrage/mixins/MummyRouterMixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract FlashTriangularArbitrageurForkTest is BaseTest {
    FlashTriangularArbitrageur arbitrageur;
    address owner = makeAddr("owner");

    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;

    uint256 minProfit = 0;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("optimism"), 112538453);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new FlashTriangularArbitrageur();

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 0);
        assertEq(IERC20(USDCe).balanceOf(address(arbitrageur)), 0);
        assertEq(IERC20(OP).balanceOf(address(arbitrageur)), 0);
    }

    // UniswapV3SwapRouter

    function testFork_arbitrage_UniswapV3SwapRouter() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 1 ether;
        bytes memory path = abi.encodePacked(WETH, uint24(500), USDCe, uint24(3000), OP, uint24(3000), WETH);

        vm.prank(owner);
        uint256 profit = arbitrageur.arbitrage(
            path,
            new address[](0),
            WETH,
            amountIn,
            minProfit,
            ArbitrageFunc.UniswapV3SwapRouter
        );

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 1107053663689232);
        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), profit);
    }

    // VelodromeV2Router

    function testFork_arbitrage_VelodromeV2Router() public {
        _velodromeV2SwapExactTokensForTokens(trader, OP, WETH, 100000000 ether);

        uint256 amountIn = 1 ether;
        address[] memory tokens = new address[](6);
        tokens[0] = WETH;
        tokens[1] = OP;
        tokens[2] = OP;
        tokens[3] = USDCe;
        tokens[4] = USDCe;
        tokens[5] = WETH;

        vm.prank(owner);
        uint256 profit = arbitrageur.arbitrage(
            bytes(""),
            tokens,
            WETH,
            amountIn,
            minProfit,
            ArbitrageFunc.VelodromeV2Router
        );

        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), 502060763698130116672);
        assertEq(IERC20(WETH).balanceOf(address(arbitrageur)), profit);
    }
}
