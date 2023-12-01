import { sampleSize } from "lodash"

import { TOKENS, minProfitMap, ArbitrageFunc } from "@solaris/common/src/constants"
import { getRandomAmount } from "@solaris/common/src/utils"

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
        // WETH -> USDCe
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
        // USDCe -> WETH
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
        // WETH -> OP
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.OP,
        //     amountIn: getRandomAmount(1, 5, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.OP,
        //     amountIn: getRandomAmount(1, 5, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        // },
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.OP,
        //     amountIn: getRandomAmount(1, 5, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        // },
        // OP -> WETH
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.OP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 5000, 18),
        //     minProfit: minProfitMap[TOKENS.OP],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.OP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 5000, 18),
        //     minProfit: minProfitMap[TOKENS.OP],
        //     secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        // },
        // {
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.OP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 5000, 18),
        //     minProfit: minProfitMap[TOKENS.OP],
        //     secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        // },
        // WETH -> PERP
        // {
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.PERP,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
        // PERP -> WETH
        // {
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.PERP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfit: minProfitMap[TOKENS.PERP],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
        // WETH -> SNX
        // {
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.SNX,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
        // SNX -> WETH
        // {
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.SNX,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfit: minProfitMap[TOKENS.SNX],
        //     secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        // },
    ]

    return sampleSize(intentions, size)
}
