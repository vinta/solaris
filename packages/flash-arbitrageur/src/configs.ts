import { sampleSize } from "lodash"

import { TOKENS, minProfitMap, ArbitrageFunc } from "@solaris/common/src/constants"
import { getRandomAmount } from "@solaris/common/src/utils"

export const toEthPriceMap = {
    [TOKENS.USDCe]: BigInt(100),
    [TOKENS.OP]: BigInt(100),
    [TOKENS.PERP]: BigInt(100),
    [TOKENS.SNX]: BigInt(100),
}

export interface Intention {
    borrowFromUniswapPool: string
    tokenIn: string
    tokenOut: string
    amountIn: bigint
    minProfit: bigint
    secondArbitrageFunc: ArbitrageFunc
}

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },

        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 20000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 20000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 20000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },

        // {
        //     pair: "WETH/OP",
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.OP,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router, ArbitrageFunc.MummyRouter], 2),
        // },
        // {
        //     pair: "WETH/OP",
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.OP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfit: minProfitMap[TOKENS.OP],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router, ArbitrageFunc.MummyRouter], 2),
        // },
        // {
        //     pair: "WETH/PERP",
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.PERP,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/PERP",
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.PERP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfit: minProfitMap[TOKENS.PERP],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/SNX",
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.SNX,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/SNX",
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.SNX,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfit: minProfitMap[TOKENS.SNX],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
    ]

    // return sampleSize(intentions, size)
    return intentions
}
