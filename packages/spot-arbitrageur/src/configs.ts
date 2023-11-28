import { formatUnits, parseUnits } from "ethers"
import { sampleSize } from "lodash"

import { TOKENS } from "@solaris/common/src/constants"
import { randomNumber } from "@solaris/common/src/utils"

import { ArbitrageFunc } from "./constants"

const minProfitMap = {
    [TOKENS.USDCe]: parseUnits("1", 6), // 1 USD
    [TOKENS.WETH]: parseUnits("0.0005", 18), // 1 USD
    [TOKENS.OP]: parseUnits("1", 18), // 1 US
    [TOKENS.PERP]: parseUnits("1", 18), // 1 USD
    [TOKENS.SNX]: parseUnits("3", 18), // 1 USD
}

const multiplier = BigInt(2)

function getRandomAmount(min: number, max: number, decimals = 18, precision = 1) {
    const amount = parseUnits(randomNumber(min, max, precision).toString(), decimals)
    // console.log(`getRandomAmount: ${formatUnits(amount, decimals)}`)
    return amount
}

export interface Intention {
    borrowFromUniswapPool: string
    tokenIn: string
    tokenOut: string
    amountIn: bigint
    minProfitForStaticCall: bigint
    minProfit: bigint
    secondArbitrageFunc: ArbitrageFunc
}

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 3, 18),
            minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 3, 18),
            minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 3, 18),
            minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
            minProfit: minProfitMap[TOKENS.WETH],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },

        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 4000, 6),
            minProfitForStaticCall: minProfitMap[TOKENS.USDCe] * multiplier,
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 4000, 6),
            minProfitForStaticCall: minProfitMap[TOKENS.USDCe] * multiplier,
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.WOOFiV2Router,
        },
        {
            borrowFromUniswapPool: "0x85149247691df622eaf1a8bd0cafd40bc45154a9", // 500
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 4000, 6),
            minProfitForStaticCall: minProfitMap[TOKENS.USDCe] * multiplier,
            minProfit: minProfitMap[TOKENS.USDCe],
            secondArbitrageFunc: ArbitrageFunc.MummyRouter,
        },
        // {
        //     pair: "WETH/OP",
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.OP,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router, ArbitrageFunc.MummyRouter], 2),
        // },
        // {
        //     pair: "WETH/OP",
        //     borrowFromUniswapPool: "0x68f5c0a2de713a54991e01858fd27a3832401849", // 3000
        //     tokenIn: TOKENS.OP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.OP] * multiplier,
        //     minProfit: minProfitMap[TOKENS.OP],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router, ArbitrageFunc.MummyRouter], 2),
        // },
        // {
        //     pair: "WETH/PERP",
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.PERP,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/PERP",
        //     borrowFromUniswapPool: "0x535541f1aa08416e69dc4d610131099fa2ae7222", // 3000
        //     tokenIn: TOKENS.PERP,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.PERP] * multiplier,
        //     minProfit: minProfitMap[TOKENS.PERP],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/SNX",
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.SNX,
        //     amountIn: getRandomAmount(0.5, 2, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.WETH] * multiplier,
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
        // {
        //     pair: "WETH/SNX",
        //     borrowFromUniswapPool: "0x0392b358ce4547601befa962680bede836606ae2", // 3000
        //     tokenIn: TOKENS.SNX,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1000, 2000, 18),
        //     minProfitForStaticCall: minProfitMap[TOKENS.SNX] * multiplier,
        //     minProfit: minProfitMap[TOKENS.SNX],
        //     secondArbitrageFuncs: sampleSize([ArbitrageFunc.VelodromeV2Router], 1),
        // },
    ]

    // return sampleSize(intentions, size)
    return intentions
}
