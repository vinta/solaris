import { sampleSize } from "lodash"

import { ArbitrageFunc } from "@solaris/common/src/constants"
import { getRandomAmount } from "@solaris/common/src/utils"
import { TOKENS, minProfitMap } from "@solaris/common/src/tokens"

export interface Intention {
    borrowFromUniswapPool: string
    tokenIn: string
    tokenOut: string
    amountIn: bigint
    minProfit: bigint
    secondArbitrageFunc: ArbitrageFunc
}

export function getRandomIntentions(size: number) {
    const group1: Intention[] = [
        // WETH -> USDCe
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },
        // WETH -> OP
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.OP,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.OP,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.OP,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },
        // WETH -> WBTC
        {
            borrowFromUniswapPool: "0x85c31ffa3706d1cce9d525a00f1c7d4a2911754c", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.WBTC,
            amountIn: getRandomAmount(10, 25, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
    ]

    const group2: Intention[] = [
        // USDCe -> WETH
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(20000, 50000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },
        // OP -> WETH
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.OP,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(10000, 20000, 18),
            minProfit: minProfitMap[TOKENS.OP],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.OP,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(10000, 20000, 18),
            minProfit: minProfitMap[TOKENS.OP],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
            tokenIn: TOKENS.OP,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(10000, 20000, 18),
            minProfit: minProfitMap[TOKENS.OP],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },
        // WBTC -> WETH
        {
            borrowFromUniswapPool: "0x85c31ffa3706d1cce9d525a00f1c7d4a2911754c", // 500
            tokenIn: TOKENS.WBTC,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(1, 2, 8),
            minProfit: minProfitMap[TOKENS.WBTC],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
    ]

    return [...sampleSize(group1, size / 2), ...sampleSize(group2, size / 2)]
}
