// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { Arbitrageur } from "../../contracts/arbitrage/Arbitrageur.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3SwapRouter } from "../../contracts/arbitrage/mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract ArbitrageurForkTest is BaseTest {
    Arbitrageur arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;

    // public

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("optimism"), 112538453);
        console.log(block.number);

        vm.prank(owner);
        arbitrageur = new Arbitrageur();
    }

    // arbitrageUniswapV3toVelodromeV2

    function testFork_arbitrageUniswapV3toVelodromeV2_Success() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
        assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toVelodromeV2(WETH, USDCe, amountIn, 0, 500, false);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageUniswapV3toVelodromeV2_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(abi.encodeWithSelector(IVelodromeV2Router.InsufficientOutputAmount.selector));
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3toVelodromeV2(WETH, USDCe, 1 ether, 0, 500, false);
    }

    // arbitrageVelodromeV2toUniswapV3

    function testFork_arbitrageVelodromeV2toUniswapV3_Success() public {
        _velodromeV2SwapExactTokensForTokens(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
        assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2toUniswapV3(WETH, USDCe, amountIn, 0, 500, false);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_arbitrageVelodromeV2toUniswapV3_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        vm.expectRevert(bytes("Too little received"));
        vm.prank(owner);
        arbitrageur.arbitrageVelodromeV2toUniswapV3(WETH, USDCe, 1 ether, 0, 500, false);
    }

    //     function testFork_arbitrageOneInchToUniswapV3_Success() public {
    //         _uniswapV3ExactInputSingle(trader, weth, usdc, 100 ether);

    //         uint256 amountIn = 1 ether;
    //         _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

    //         vm.prank(owner);
    //         arbitrageur.arbitrageOneInchToUniswapV3(
    //             weth,
    //             usdc,
    //             1 ether,
    //             0,
    //             500,
    //             // "from": the arbitrageur contract
    //             // "slippage": 5
    //             // "protocols": BASE_MAVERICK
    //             hex"12aa3caf000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd090000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd0900000000000000000000000088f59f8826af5e695b13ca934d6c7999875a9eea0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000006e1f00380000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e000000000000000000000000000000000000000000000000000000000130512001538aa697ce8cc8252c70c41452dae86ce22a3e420000000000000000000000000000000000000600a4a5dcbcdf0000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca00000000000000000000000006e6736ca9e922766279a22b75a600fe8b8473b60000000000000000000000001111111254eeb25477b68fb85ed929f73a960582ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008b1ccac8"
    //         );

    //         assertEq(IERC20(weth).balanceOf(address(owner)) > amountIn, true);
    //     }

    //     function testFork_arbitrageOneInchToUniswapV3_RevertIf_NoProfit() public {
    //         console.logAddress(owner);

    //         _dealAndApprove(weth, 1 ether, owner, address(arbitrageur));

    //         vm.expectRevert(abi.encodeWithSelector(IErrors.NoProfit.selector));
    //         vm.prank(owner);
    //         arbitrageur.arbitrageOneInchToUniswapV3(
    //             weth,
    //             usdc,
    //             1 ether,
    //             0,
    //             500,
    //             // "from" should be the arbitrageur contract
    //             hex"12aa3caf000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd090000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd0900000000000000000000000088f59f8826af5e695b13ca934d6c7999875a9eea0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000073c7e157000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a500000000000000000000000000000000000000000000000000000000028700a0c9e75c480000000000001f0a06030000000000000000000000000000000000000002590001f60000c600006302a00000000000000000000000000000000000000000000000000000000006e08503ee63c1e581ef3c164b0fee8eb073513e88ecea280a58cc994542000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a96058202a0000000000000000000000000000000000000000000000000000000000dc0f9a8ee63c1e581e58b73ff901325b8b2056b29712c50237242f52042000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a960582510001538aa697ce8cc8252c70c41452dae86ce22a3e420000000000000000000000000000000000000600a4a5dcbcdf0000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca00000000000000000000000006e6736ca9e922766279a22b75a600fe8b8473b60000000000000000000000001111111254eeb25477b68fb85ed929f73a960582ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000471146b4ee63c1e5814c36388be6f416a29c8d8eee81c771ce6be14b1842000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000000008b1ccac8"
    //         );
    //     }

    //     function testFork_arbitrageOneInchToUniswapV3_RevertIf_SwapFail() public {
    //         uint256 amountIn = 1 ether;
    //         _dealAndApprove(weth, amountIn, owner, address(arbitrageur));

    //         vm.expectRevert(abi.encodeWithSelector(OneInchRouterV5Mixin.SwapFail.selector));
    //         vm.prank(owner);
    //         arbitrageur.arbitrageOneInchToUniswapV3(
    //             weth,
    //             usdc,
    //             1 ether,
    //             0,
    //             500,
    //             // "from": the arbitrageur contract
    //             // "slippage": 0
    //             // "protocols": all
    //             hex"12aa3caf000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd090000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca000000000000000000000000e37e799d5077682fa0a244d46e5649f71457bd0900000000000000000000000088f59f8826af5e695b13ca934d6c7999875a9eea0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000073fdb65d000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a500000000000000000000000000000000000000000000000000000000028700a0c9e75c48000000000000270802010000000000000000000000000000000000000002590001f60000c600006302a000000000000000000000000000000000000000000000000000000000024c3738ee63c1e581f6c0a374a483101e04ef5f7ac9bd15d9142bac9542000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a96058202a0000000000000000000000000000000000000000000000000000000000497b324ee63c1e581e58b73ff901325b8b2056b29712c50237242f52042000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a960582510001538aa697ce8cc8252c70c41452dae86ce22a3e420000000000000000000000000000000000000600a4a5dcbcdf0000000000000000000000004200000000000000000000000000000000000006000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca00000000000000000000000006e6736ca9e922766279a22b75a600fe8b8473b60000000000000000000000001111111254eeb25477b68fb85ed929f73a960582ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000000000005991bfb9ee63c1e5814c36388be6f416a29c8d8eee81c771ce6be14b1842000000000000000000000000000000000000061111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000000000000000000000008b1ccac8"
    //         );
    //     }

    // triangularArbitrageUniswapV3

    function testFork_triangularArbitrageUniswapV3_Success() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 1 ether;
        _dealAndApprove(WETH, amountIn, owner, address(arbitrageur));
        assertEq(IERC20(WETH).balanceOf(address(owner)), amountIn);

        bytes memory path = abi.encodePacked(WETH, uint24(500), USDCe, uint24(3000), OP, uint24(3000), WETH);

        vm.prank(owner);
        arbitrageur.triangularArbitrageUniswapV3(path, WETH, 1 ether, 0);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_triangularArbitrageUniswapV3_RevertIf_NoProfit() public {
        _dealAndApprove(WETH, 1 ether, owner, address(arbitrageur));

        bytes memory path = abi.encodePacked(WETH, uint24(500), USDCe, uint24(3000), OP, uint24(3000), WETH);

        vm.expectRevert(bytes("Too little received"));
        vm.prank(owner);
        arbitrageur.triangularArbitrageUniswapV3(path, WETH, 1 ether, 0);
    }

    // triangularArbitrageVelodromeV2

    function testFork_triangularArbitrageVelodromeV2_Success() public {
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
        arbitrageur.triangularArbitrageVelodromeV2(tokens, 1 ether, 0);

        assertEq(IERC20(WETH).balanceOf(address(owner)) > amountIn, true);
    }

    function testFork_triangularArbitrageVelodromeV2_RevertIf_NoProfit() public {
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
        arbitrageur.triangularArbitrageVelodromeV2(tokens, 1 ether, 0);
    }

    // internal

    function _uniswapV3ExactInputSingle(address wallet, address tokenIn, address tokenOut, uint256 amountIn) internal {
        address UNISWAP_V3_SWAP_ROUTER = arbitrageur.UNISWAP_V3_SWAP_ROUTER();
        deal(tokenIn, wallet, amountIn);

        vm.startPrank(trader);
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
