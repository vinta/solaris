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
    {
        token0: TOKENS.WETH,
        token1: TOKENS.USDCe,
        fee: 500,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.USDCe,
        fee: 3000,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.USDC,
        fee: 500,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.DAI,
        fee: 500,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.USDT,
        fee: 500,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.OP,
        fee: 3000,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.SNX,
        fee: 3000,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.WBTC,
        fee: 500,
    },
    {
        token0: TOKENS.WETH,
        token1: TOKENS.wstETH,
        fee: 100,
    },
]

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        // UniswapV3
        // {
        //     path: solidityPacked(
        //         ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
        //         [TOKENS.WETH, 500, TOKENS.USDCe, 3000, TOKENS.OP, 3000, TOKENS.WETH],
        //     ),
        //     tokens: [],
        //     tokenIn: TOKENS.WETH,
        //     amountIn: getRandomAmount(5, 15, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        // },
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.WETH, 500, TOKENS.USDC, 100, TOKENS.USDT, 500, TOKENS.WETH],
            ),
            tokens: [],
            tokenIn: TOKENS.WETH,
            amountIn: getRandomAmount(5, 15, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            arbitrageFunc: ArbitrageFunc.UniswapV3SwapRouter,
        },
    ]

    return sampleSize(intentions, size)
}
