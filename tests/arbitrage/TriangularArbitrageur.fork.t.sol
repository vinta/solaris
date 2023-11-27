// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { TriangularArbitrageur } from "../../contracts/arbitrage/TriangularArbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3SwapRouter } from "../../contracts/arbitrage/mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract TriangularArbitrageurForkTest is BaseTest {
    TriangularArbitrageur arbitrageur;
    address owner = makeAddr("owner");

    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("optimism"), 112538453);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new TriangularArbitrageur();
    }

    // arbitrageUniswapV3

    function testFork_arbitrageUniswapV3() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
        assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

        bytes memory path = abi.encodePacked(WETH, uint24(500), USDCe, uint24(3000), OP, uint24(3000), WETH);

        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3(path, WETH, 1 ether, 0);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageUniswapV3_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        bytes memory path = abi.encodePacked(WETH, uint24(500), USDCe, uint24(3000), OP, uint24(3000), WETH);

        vm.expectRevert(bytes("Too little received"));
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3(path, WETH, 1 ether, 0);
    }

    // arbitrageVelodromeV2

    function testFork_arbitrageVelodromeV2() public {
        _velodromeV2SwapExactTokensForTokens(trader, OP, WETH, 100000000 ether);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
        assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

        // WETH -> USDCe -> OP -> WETH
        address[] memory tokens = new address[](6);
        tokens[0] = WETH;
        tokens[1] = OP;
        tokens[2] = OP;
        tokens[3] = USDCe;
        tokens[4] = USDCe;
        tokens[5] = WETH;

        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2(tokens, 1 ether, 0);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageVelodromeV2_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        address[] memory tokens = new address[](6);
        tokens[0] = WETH;
        tokens[1] = OP;
        tokens[2] = OP;
        tokens[3] = USDCe;
        tokens[4] = USDCe;
        tokens[5] = WETH;

        vm.expectRevert(abi.encodeWithSelector(IVelodromeV2Router.InsufficientOutputAmount.selector));
        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2(tokens, 1 ether, 0);
    }
}
