// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { ArbitrageurWithAggregator } from "../../contracts/arbitrage/ArbitrageurWithAggregator.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3Router } from "../../contracts/arbitrage/interfaces/IUniswapV3Router.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/interfaces/IVelodromeV2Router.sol";

import { BaseTest } from "../BaseTest.sol";

contract ArbitrageurWithAggregatorBaseForkTest is BaseTest {
    ArbitrageurWithAggregator arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address nonOwner = makeAddr("nonOwner");
    address weth = 0x4200000000000000000000000000000000000006;
    address usdc = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"), 6727864);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new ArbitrageurWithAggregator();
    }

    // function testFork_arbitrage1inchToUniswapV3_Success() public {
    //     _uniswapV3ExactInputSingle(trader, usdc, weth, 100000e6);

    //     uint256 amountIn = 1 ether;
    //     _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

    //     vm.prank(owner);
    //     arbitrageur.arbitrage1inchToUniswapV3(weth, usdc, amountIn, 0, 500, false);

    //     assertEq(IERC20(weth).balanceOf(address(owner)) > amountIn, true);
    // }

    function testFork_arbitrage1inchToUniswapV3_RevertIf_NoProfit() public {
        console.logAddress(owner);

        _dealAndApprove(weth, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
        vm.prank(owner);
        arbitrageur.arbitrage1inchToUniswapV3(
            weth,
            usdc,
            1 ether,
            0,
            500,
            // "from" should be the arbitrageur contract
            hex"12aa3caf000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd090000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd0900000000000000000000000088f59f8826af5e695b13ca934d6c7999875a9eea0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000073b577800000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e000000000000000000000000000000000000000000000000000000000130512001538aa697ce8cc8252c70c41452dae86ce22a3e420000000000000000000000000000000000000600a4a5dcbcdf0000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca00000000000000000000000006e6736ca9e922766279a22b75a600fe8b8473b60000000000000000000000001111111254eeb25477b68fb85ed929f73a960582ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008b1ccac8"
        );
    }

    // internal

    function _dealAndApprove(address token, uint256 amount, address account, address spender) internal {
        deal(token, account, amount);
        vm.prank(account);
        IERC20(token).approve(spender, amount);
    }
}
