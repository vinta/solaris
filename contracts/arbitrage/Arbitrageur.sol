// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import { IUniswapV3Router } from "./interfaces/IUniswapV3Router.sol";
import { IVelodromeV2Router } from "./interfaces/IVelodromeV2Router.sol";

contract Arbitrageur is Ownable {
    using SafeERC20 for IERC20;

    // https://docs.uniswap.org/contracts/v3/reference/deployments
    address public constant UNISWAP_V3_SWAP_ROUTER_02 = address(0x2626664c2603336E57B271c5C0b26F421741e481);
    // https://aerodrome.finance/security#contracts
    address public constant VELODROME_V2_ROUTER = address(0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
    address public constant VELODROME_V2_POOL_FACTORY = address(0x420DD381b31aEf6683db6B902084cB0FFECe40Da);

    error NoProfit();

    // external

    constructor() {}

    function withdrawAll(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }

    function arbitrageUniswapV3toVelodromeV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external onlyOwner {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromUniswapV3 = _swapOnUniswapV3(tokenIn, tokenOut, amountIn, uniswapV3Fee);
        uint256 amountOut = _swapOnVelodromeV2(tokenOut, tokenIn, amountOutFromUniswapV3, velodromeV2Stable);

        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    function arbitrageVelodromeV2toUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        uint24 uniswapV3Fee,
        bool velodromeV2Stable
    ) external onlyOwner {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountOutFromVelodromeV2 = _swapOnVelodromeV2(tokenIn, tokenOut, amountIn, velodromeV2Stable);
        uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromVelodromeV2, uniswapV3Fee);

        if (amountOut <= amountIn + minProfit) {
            revert NoProfit();
        }

        IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
    }

    // internal

    function _swapOnUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER_02, amountIn);

        return
            IUniswapV3Router(UNISWAP_V3_SWAP_ROUTER_02).exactInputSingle(
                IUniswapV3Router.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: fee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
    }

    function _swapOnVelodromeV2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bool stable
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(VELODROME_V2_ROUTER, amountIn);

        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](1);
        routes[0] = IVelodromeV2Router.Route({
            from: tokenIn,
            to: tokenOut,
            stable: stable,
            factory: VELODROME_V2_POOL_FACTORY
        });
        uint256[] memory amounts = IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            address(this),
            block.timestamp
        );

        return amounts[0];
    }
}
