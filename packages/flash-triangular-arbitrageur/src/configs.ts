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

export function getRandomIntentions(size: number) {
    const intentions: Intention[] = [
        // UniswapV3
        {
            path: solidityPacked(
                ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
                [TOKENS.WETH, 500, TOKENS.USDCe, 3000, TOKENS.OP, 3000, TOKENS.WETH],
            ),
            tokens: [],
            tokenIn: TOKENS.WETH,
            amountIn: getRandomAmount(1, 10, 18),
            minProfit: minProfitMap[TOKENS.WETH],
            arbitrageFunc: ArbitrageFunc.VelodromeV2Router,
        },
    ]

    return sampleSize(intentions, size)
}
