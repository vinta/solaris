import { solidityPacked } from "ethers"
import { sampleSize } from "lodash"

import { ArbitrageFunc } from "@solaris/common/src/constants"
import { getRandomAmount } from "@solaris/common/src/utils"
import { TOKENS, minProfitMap } from "@solaris/common/src/tokens"

export interface Intention {
    path: string
    tokens: string[]
    tokenIn: string
    amountIn: bigint
    minProfit: bigint
    arbitrageFunc: ArbitrageFunc
}

const uniswapV3Pairs = [
    // USDCe
    {
        token0: TOKENS.USDCe,
        token1: TOKENS.USDC,
        fee: 100,
    },
    {
        token0: TOKENS.USDCe,
        token1: TOKENS.USDC,
        fee: 500,
    },
    {
        token0: TOKENS.USDCe,
        token1: TOKENS.USDT,
        fee: 100,
    },
    {
        token0: TOKENS.USDCe,
        token1: TOKENS.DAI,
        fee: 100,
    },
    {
        token0: TOKENS.USDCe,
        token1: TOKENS.sUSD,
        fee: 100,
    },
    // USDC
    {
        token0: TOKENS.USDC,
        token1: TOKENS.USDT,
        fee: 100,
    },
    // USDT
    {
        token0: TOKENS.USDT,
        token1: TOKENS.DAI,
        fee: 100,
    },
    // USDT
    {
        token0: TOKENS.DAI,
        token1: TOKENS.sUSD,
        fee: 100,
    },
]

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        // UniswapV3
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.USDCe, 100, TOKENS.USDC, 100, TOKENS.USDT, 100, TOKENS.USDCe],
            ),
            tokens: [],
            tokenIn: TOKENS.USDCe,
            amountIn: getRandomAmount(20000, 100000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.USDCe, 100, TOKENS.USDT, 100, TOKENS.USDC, 100, TOKENS.USDCe],
            ),
            tokens: [],
            tokenIn: TOKENS.USDCe,
            amountIn: getRandomAmount(20000, 100000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.USDC, 100, TOKENS.USDCe, 100, TOKENS.USDT, 100, TOKENS.USDC],
            ),
            tokens: [],
            tokenIn: TOKENS.USDC,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.USDC],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.USDC, 100, TOKENS.USDT, 100, TOKENS.USDCe, 100, TOKENS.USDC],
            ),
            tokens: [],
            tokenIn: TOKENS.USDC,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.USDC],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.USDT, 100, TOKENS.USDCe, 100, TOKENS.USDC, 100, TOKENS.USDT],
            ),
            tokens: [],
            tokenIn: TOKENS.USDT,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.DAI],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
    ]

    return sampleSize(intentions, size)
}
