// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { UniswapV3SwapRouterMixin } from "./mixins/UniswapV3SwapRouterMixin.sol";
import { VelodromeV2RouterMixin } from "./mixins/VelodromeV2RouterMixin.sol";
import { console } from "forge-std/console.sol";

interface IUniswapV3Pool {
    function flash(address recipient, uint256 amount0, uint256 amount1, bytes calldata data) external;
}

contract ArbitrageurFlash is BaseArbitrageur, UniswapV3SwapRouterMixin, VelodromeV2RouterMixin {
    struct FlashParams {
        address token0;
        address token1;
        uint24 fee1;
        uint256 amount0;
        uint256 amount1;
    }

    struct FlashCallbackData {
        address pool;
        uint256 amount0;
        uint256 amount1;
    }

    // external

    function arbitrageFlash(FlashParams memory params) external {
        // PoolAddress.PoolKey memory poolKey = PoolAddress.PoolKey({
        //     token0: params.token0,
        //     token1: params.token1,
        //     fee: params.fee1
        // });
        // IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));
        IUniswapV3Pool pool = IUniswapV3Pool(0x85149247691df622eaF1a8Bd0CaFd40BC45154a9);
        pool.flash(
            address(this),
            params.amount0,
            params.amount1,
            abi.encode(FlashCallbackData({ pool: address(pool), amount0: params.amount0, amount1: params.amount1 }))
        );
    }

    function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes calldata data) external {
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));
        // CallbackValidation.verifyCallback(factory, decoded.poolKey);
        require(msg.sender == decoded.pool, "ArbitrageurFlash: Invalid sender");

        address pool = msg.sender;
        console.log("pool");
        console.logAddress(pool);

        // address token0 = decoded.poolKey.token0;
        // address token1 = decoded.poolKey.token1;
        // uint256 amount0 =decoded.amount0;
        IERC20 token0 = IERC20(0x4200000000000000000000000000000000000006);
        console.log("token0 balance");
        console.log(token0.balanceOf(address(this)));
        console.log(fee0);

        uint256 amount0Owed = decoded.amount0 + fee0;
        console.log(amount0Owed);

        token0.transfer(pool, amount0Owed);

        // IERC20 token1 = IERC20(0x7F5c764cBc14f9669B88837ca1490cCa17c31607);
        // console.log("token1 balance");
        // console.log(token1.balanceOf(address(this)));
        // console.log(fee1);
    }
}
