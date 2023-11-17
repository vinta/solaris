// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.19;

// import { Ownable } from "openzeppelin-contracts/contracts/access/Ownable.sol";
// import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
// import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

// import { IUniswapV3Router } from "./interfaces/IUniswapV3Router.sol";
// import { IVelodromeV2Router } from "./interfaces/IVelodromeV2Router.sol";

// contract ArbitrageurAggregator is Ownable {
//     using SafeERC20 for IERC20;

//     // https://docs.uniswap.org/contracts/v3/reference/deployments
//     address public constant UNISWAP_V3_SWAP_ROUTER_02 = address(0x2626664c2603336E57B271c5C0b26F421741e481);
//     // https://aerodrome.finance/security#contracts
//     address public constant VELODROME_V2_ROUTER = address(0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
//     address public constant VELODROME_V2_POOL_FACTORY = address(0x420DD381b31aEf6683db6B902084cB0FFECe40Da);

//     error NoProfit();

//     function arbitrage1inchToUniswapV3(
//         address tokenIn,
//         address tokenOut,
//         uint256 amountIn,
//         uint256 minProfit,
//         uint24 uniswapV3Fee,
//         bytes _1inchData
//     ) external {
//         IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

//         // TODO: maybe we should excude uniswap v3 from 1inch api query
//         // since we do uniswap v3 in the second step
//         uint256 amountOutFromFirst = _swapOn1inch(tokenIn, tokenOut, amountIn, _1inchData);
//         uint256 amountOut = _swapOnUniswapV3(tokenOut, tokenIn, amountOutFromFirst, uniswapV3Fee);

//         if (amountOut <= amountIn + minProfit) {
//             revert NoProfit();
//         }

//         IERC20(tokenIn).safeTransfer(msg.sender, amountOut);
//     }
// }
