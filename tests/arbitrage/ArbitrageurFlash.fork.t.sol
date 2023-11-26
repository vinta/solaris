// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

import { ArbitrageurFlash } from "../../contracts/arbitrage/ArbitrageurFlash.sol";
import { IErrors } from "../../contracts/arbitrage/interfaces/IErrors.sol";
import { IUniswapV3SwapRouter } from "../../contracts/arbitrage/mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "../../contracts/arbitrage/mixins/VelodromeV2RouterMixin.sol";

import { BaseTest } from "../BaseTest.sol";

contract ArbitrageurFlashForkTest is BaseTest {
    ArbitrageurFlash arbitrageur;
    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address WETH = 0x4200000000000000000000000000000000000006;
    address USDCe = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    address OP = 0x4200000000000000000000000000000000000042;

    address uniswapV3Pool = 0x85149247691df622eaF1a8Bd0CaFd40BC45154a9;

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

    // arbitrageUniswapV3FlashSwapToVelodromeV2

    function testFork_arbitrageUniswapV3FlashSwapToVelodromeV2_Success() public {
        _uniswapV3ExactInputSingle(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 2 ether;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwapToVelodromeV2(uniswapV3Pool, WETH, USDCe, amountIn, 0, false);

        assertEq(IERC20(WETH).balanceOf(address(owner)), 7096710211096831);
    }

    function testFork_arbitrageUniswapV3FlashSwapToVelodromeV2_Success_2() public {
        _velodromeV2SwapExactTokensForTokens(trader, USDCe, WETH, 200000e6);

        uint256 amountIn = 4000e6;
        vm.prank(owner);
        arbitrageur.arbitrageUniswapV3FlashSwapToVelodromeV2(uniswapV3Pool, USDCe, WETH, amountIn, 0, false);

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
