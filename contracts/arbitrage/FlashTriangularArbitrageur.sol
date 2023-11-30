// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import { IErrors } from "./interfaces/IErrors.sol";
import { ArbitrageFunc } from "./enums/ArbitrageFunc.sol";
import { BaseArbitrageur } from "./base/BaseArbitrageur.sol";
import { BeethovenFlashLoanMixin } from "./mixins/BeethovenFlashLoanMixin.sol";
import { IUniswapV3SwapRouter } from "./mixins/UniswapV3SwapRouterMixin.sol";
import { IVelodromeV2Router } from "./mixins/VelodromeV2RouterMixin.sol";
import { IMummyRouter } from "./mixins/MummyRouterMixin.sol";

contract FlashTriangularArbitrageur is IErrors, BaseArbitrageur, BeethovenFlashLoanMixin {
    address constant UNISWAP_V3_SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant VELODROME_V2_ROUTER = 0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858;
    address constant VELODROME_V2_POOL_FACTORY = 0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a;
    address constant MUMMY_ROUTER = 0x68d1CA32Aee9a73534429D8376743Bf222ff1870;

    struct BeethovenFlashloanCallbackData {
        bytes path;
        address[] tokens;
        uint256 minProfit;
        ArbitrageFunc arbitrageFunc;
    }

    // external

    function arbitrage(
        bytes memory path, // UniswapV3
        address[] memory tokens, // VelodromeV2
        address tokenIn,
        uint256 amountIn,
        uint256 minProfit,
        ArbitrageFunc arbitrageFunc
    ) external returns (uint256) {
        uint256 tokenInBalanceBefore = IERC20(tokenIn).balanceOf(address(this));

        _flashloanFromBeethoven(
            tokenIn,
            amountIn,
            abi.encode(
                BeethovenFlashloanCallbackData({
                    path: path,
                    tokens: tokens,
                    minProfit: minProfit,
                    arbitrageFunc: arbitrageFunc
                })
            )
        );

        return IERC20(tokenIn).balanceOf(address(this)) - tokenInBalanceBefore;
    }

    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        if (msg.sender != BEETHOVEN_VAULT) {
            revert InvalidCaller();
        }

        BeethovenFlashloanCallbackData memory decoded = abi.decode(userData, (BeethovenFlashloanCallbackData));

        address tokenIn = tokens[0];
        uint256 amountIn = amounts[0];
        uint256 fee = feeAmounts[0];
        ArbitrageFunc arbitrageFunc = decoded.arbitrageFunc;

        if (arbitrageFunc == ArbitrageFunc.UniswapV3SwapRouter) {
            _arbitrageUniswapV3(decoded.path, tokenIn, amountIn, decoded.minProfit);
        } else if (arbitrageFunc == ArbitrageFunc.VelodromeV2Router) {
            _arbitrageVelodromeV2(decoded.tokens, amountIn, decoded.minProfit);
        } else {
            revert InvalidBranch();
        }

        IERC20(tokenIn).transfer(BEETHOVEN_VAULT, amountIn + fee);
    }

    // internal

    function _arbitrageUniswapV3(bytes memory path, address tokenIn, uint256 amountIn, uint256 minProfit) internal {
        IERC20(tokenIn).approve(UNISWAP_V3_SWAP_ROUTER, amountIn);

        IUniswapV3SwapRouter(UNISWAP_V3_SWAP_ROUTER).exactInput(
            IUniswapV3SwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountIn + minProfit
            })
        );
    }

    function _arbitrageVelodromeV2(address[] memory tokens, uint256 amountIn, uint256 minProfit) internal {
        IERC20(tokens[0]).approve(VELODROME_V2_ROUTER, amountIn);

        uint256 length = tokens.length / 2;
        IVelodromeV2Router.Route[] memory routes = new IVelodromeV2Router.Route[](length);
        for (uint i = 0; i < length; i++) {
            routes[i] = IVelodromeV2Router.Route({
                from: tokens[i * 2],
                to: tokens[i * 2 + 1],
                stable: false,
                factory: VELODROME_V2_POOL_FACTORY
            });
        }
        IVelodromeV2Router(VELODROME_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            amountIn + minProfit,
            routes,
            address(this),
            block.timestamp
        );
    }
}
