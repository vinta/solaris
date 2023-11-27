// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

// uint8
enum ArbitrageFunc {
    UniswapV3SwapRouter, // 0
    VelodromeV2Router, // 1
    WOOFiV2Router, // 2
    MummyRouter // 3
}
