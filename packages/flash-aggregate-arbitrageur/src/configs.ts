import { parseUnits } from "ethers"
import { sampleSize } from "lodash"

import { TOKENS } from "@solaris/common/src/constants"
import { randomNumber } from "@solaris/common/src/utils"

const multiplier = BigInt(10)

export const minProfitMap = {
    [TOKENS.USDC]: parseUnits("1", 6) * multiplier, // 1 USD
    [TOKENS.USDCe]: parseUnits("1", 6) * multiplier, // 1 USD
    [TOKENS.WETH]: parseUnits("0.0005", 18) * multiplier, // 1 USD
    [TOKENS.OP]: parseUnits("1", 18) * multiplier, // 1 US
    [TOKENS.PERP]: parseUnits("1", 18) * multiplier, // 1 USD
    [TOKENS.SNX]: parseUnits("3", 18) * multiplier, // 1 USD
    [TOKENS.wstETH]: parseUnits("0.0005", 18) * multiplier, // 1 USD
    [TOKENS.WLD]: parseUnits("0.4", 18) * multiplier, // 1 USD
    [TOKENS.WBTC]: parseUnits("0.000026", 8) * multiplier, // 1 USD
}

function getRandomAmount(min: number, max: number, decimals = 18, precision = 1) {
    const amount = parseUnits(randomNumber(min, max, precision).toString(), decimals)
    return amount
}

export interface Intention {
    tokenIn: string
    tokenOut: string
    amountIn: bigint
    minProfit: bigint
    uniswapV3Fee: number
}

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        // FIXME: OneInchSwapFail()
        // {
        //     tokenIn: TOKENS.WETH,
        //     tokenOut: TOKENS.USDC,
        //     amountIn: getRandomAmount(1, 10, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     uniswapV3Fee: 500,
        // },
        // {
        //     tokenIn: TOKENS.USDC,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(2000, 20000, 6),
        //     minProfit: minProfitMap[TOKENS.USDC],
        //     uniswapV3Fee: 500,
        // },

        {
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.USDCe,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            uniswapV3Fee: 500,
        },
        {
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(2000, 20000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            uniswapV3Fee: 500,
        },
        {
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.OP,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            uniswapV3Fee: 3000,
        },
        {
            tokenIn: TOKENS.OP,
            tokenOut: TOKENS.WETH,
            amountIn: getRandomAmount(1000, 2000, 18),
            minProfit: minProfitMap[TOKENS.OP],
            uniswapV3Fee: 3000,
        },
        {
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.PERP,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            uniswapV3Fee: 3000,
        },
        {
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.SNX,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            uniswapV3Fee: 3000,
        },
        {
            tokenIn: TOKENS.USDCe,
            tokenOut: TOKENS.WLD,
            amountIn: getRandomAmount(2000, 20000, 6),
            minProfit: minProfitMap[TOKENS.USDCe],
            uniswapV3Fee: 10000,
        },
        {
            tokenIn: TOKENS.WETH,
            tokenOut: TOKENS.WBTC,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            uniswapV3Fee: 500,
        },

        // FIXME: OneInchSwapFail()
        // {
        //     tokenIn: TOKENS.wstETH,
        //     tokenOut: TOKENS.WETH,
        //     amountIn: getRandomAmount(1, 10, 18),
        //     minProfit: minProfitMap[TOKENS.WETH],
        //     uniswapV3Fee: 100,
        // },
    ]

    return sampleSize(intentions, size)
}

export const oneInchProtocols = [
    // "OPTIMISM_UNISWAP_V3",
    // "OPTIMISM_SYNTHETIX",
    // "OPTIMISM_SYNTHETIX_WRAPPER",
    "OPTIMISM_ONE_INCH_LIMIT_ORDER",
    "OPTIMISM_ONE_INCH_LIMIT_ORDER_V2",
    "OPTIMISM_ONE_INCH_LIMIT_ORDER_V3",
    // "OPTIMISM_CURVE",
    "OPTIMISM_BALANCER_V2",
    "OPTIMISM_VELODROME",
    // "OPTIMISM_KYBERSWAP_ELASTIC",
    // "OPTIMISM_CLIPPER_COVES",
    // "OPTIMISM_KYBER_DMM_STATIC",
    // "OPTIMISM_AAVE_V3",
    // "OPTIMISM_ELK",
    "OPTIMISM_WOOFI_V2",
    // "OPTIMISM_TRIDENT",
    "OPTIMISM_MUMMY_FINANCE",
    // "OPTIMISM_NOMISWAPEPCS",
    "OPTIMISM_VELODROME_V2",
    // "OPTIMISM_WOMBATSWAP",
]
