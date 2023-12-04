import { Handler } from "aws-lambda"
import { random } from "lodash"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { sleep, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"
import { TOKENS } from "@solaris/common/src/tokens"

import { getRandomIntentions, Intention } from "./configs"
import { FlashArbitrageur, FlashArbitrageur__factory, IERC20__factory } from "../types"
import { formatUnits, MaxUint256, parseUnits } from "ethers"
import { IUniswapV3SwapRouter__factory } from "../types/factories/UniswapV3SwapRouterMixin.sol"
import { format, parse } from "path"

interface ProfitResult {
    amountIn: bigint
    profit: bigint
    estimatedGas: bigint
}

class FlashArbitrageurOnOptimism extends BaseArbitrageur {
    ONEINCH_API_ENDPOINT = process.env.ONEINCH_API_ENDPOINT!
    ONEINCH_API_KEYS = process.env.ONEINCH_API_KEYS!.split(",")

    arbitrageur!: FlashArbitrageur

    INTENTION_SIZE = 4
    AMOUNT_CHUNK_SIZE = 5

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // VelodromeV2Router
    ERROR_INSUFFICIENT_OUTPUT_AMOUNT = "0x42301c23" // InsufficientOutputAmount()

    // WOOFiV2Router
    ERROR_LT_MINBASEAMOUNT = "baseAmount_LT_minBaseAmount"
    ERROR_LT_MINQUOTEAMOUNT = "quoteAmount_LT_minQuoteAmount"
    ERROR_LT_MINBASE2AMOUNT = "base2Amount_LT_minBase2Amount"
    ERROR_NOT_ORACLE_FEASIBLE = "!ORACLE_FEASIBLE"

    // MummyRouter
    ERROR_INSUFFICIENT_AMOUNTOUT = "insufficient amountOut"
    ERROR_POOLAMOUNT_LT_BUFFER = "poolAmount < buffer"

    async start() {
        const startTimestamp = Date.now() / 1000

        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1
            // batchMaxCount: this.AMOUNT_CHUNK_SIZE,
        })

        this.owner = await this.getOwner(provider)
        this.arbitrageur = FlashArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: this.owner.address,
        })

        const WETH = IERC20__factory.connect(TOKENS.WETH, this.owner)
        const USDCe = IERC20__factory.connect(TOKENS.USDCe, this.owner)

        const wethBalance = await WETH.balanceOf(this.owner.address)
        const usdceBalance = await USDCe.balanceOf(this.owner.address)
        const wethAmount = parseUnits("1", 18)
        const profitInEth = parseUnits("0.005", 18) // 10 USDC

        console.log(`wethBalance: ${wethBalance}`)
        console.log(`usdceBalance: ${usdceBalance}`)

        const router = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
        const uniswapV3SwapRouter = IUniswapV3SwapRouter__factory.connect(router, this.owner)

        // const approveTx = await this.sendTx(this.owner, async () => {
        //     // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
        //     return await WETH.approve(router, MaxUint256, {
        //         nonce: this.nonceManager.getNonce(this.owner),
        //         chainId: this.NETWORK_CHAIN_ID,
        //     })
        // })
        // await approveTx.wait()

        let startPrice: bigint
        let startUsdceAmount: number | undefined = undefined
        let sellSpread = 0.001 // 0.1%
        let buySpread = -0.001 // 0.1%
        let i = 0
        while (true) {
            i++

            await sleep(1000)

            if (wethBalance >= wethAmount) {
                console.log("Checking swap WETH to USDCe")
                const res = await this.fetchOneInchSwapData(TOKENS.WETH, TOKENS.USDCe, wethAmount)
                const newAmount = Number(formatUnits(res.toAmount, 6))
                console.log(`newAmount: ${newAmount}`)

                // console.dir(res)
                if (!startUsdceAmount) {
                    startUsdceAmount = newAmount
                    continue
                }

                // const priceChangeRate = ((new price - old price) / old price) * 100
                const priceChangeRate = (newAmount - startUsdceAmount) / startUsdceAmount
                console.log(`priceChangeRate: ${priceChangeRate}`)
                if (priceChangeRate >= sellSpread) {
                    console.log("sell")
                }

                // const tx = await this.sendTx(this.owner, async () => {
                //     // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
                //     return await uniswapV3SwapRouter.exactInputSingle(
                //         {
                //             tokenIn: TOKENS.WETH,
                //             tokenOut: TOKENS.USDCe,
                //             fee: 500,
                //             recipient: this.owner.address,
                //             deadline: MaxUint256,
                //             amountIn: wethAmount,
                //             amountOutMinimum: 0,
                //             sqrtPriceLimitX96: 0,
                //         },
                //         {
                //             nonce: this.nonceManager.getNonce(this.owner),
                //             chainId: this.NETWORK_CHAIN_ID,
                //         },
                //     )
                // })
                // await tx.wait()

                // const usdceBalanceAfter = await USDCe.balanceOf(this.owner.address)
                // console.log(`usdceBalanceAfter: ${usdceBalanceAfter}`)
            } else {
                console.log("Checking swap USDCe to WETH")

                // const usdceBalance = await USDCe.balanceOf(this.owner.address)
                // const res = await this.fetchOneInchSwapData(TOKENS.USDCe, TOKENS.WETH, usdceBalance)
                // const toAmount = parseUnits(formatUnits(res.toAmount, 18), 18)
                // console.log(`toAmount: ${toAmount}`)
                // if (toAmount > wethAmount + profitInEth) {
                // }
            }

            // const nowTimestamp = Date.now() / 1000
            // if (nowTimestamp - startTimestamp >= this.TIMEOUT_SECONDS) {
            //     console.log(`arbitrage end: ${i * this.INTENTION_SIZE}`)
            //     return
            // }
        }
    }

    async fetchOneInchSwapData(tokenIn: string, tokenOut: string, amountIn: bigint) {
        const params = {
            src: tokenIn,
            dst: tokenOut,
            amount: amountIn.toString(),
            // from: this.owner.address,
            from: "0x88F59F8826af5e695B13cA934d6c7999875A9EeA",
            slippage: "0.05",
            disableEstimate: "true",
        }
        const urlParams = new URLSearchParams(params)
        const url = `${this.ONEINCH_API_ENDPOINT}/swap?${urlParams}`

        const oneInchApiKey = this.ONEINCH_API_KEYS[random(0, this.ONEINCH_API_KEYS.length - 1)]

        const res = await fetch(url, {
            method: "get",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${oneInchApiKey}`,
            },
        })

        if (res.status === 429) {
            throw new Error("TooManyRequests")
        }

        if (!res.ok) {
            const err = new Error("Error")
            err.message = await res.text()
            throw err
        }

        const response = await res.json()

        if (!response.tx?.data) {
            const err = new Error("NoData")
            err.message = await res.text()
            throw err
        }

        return response
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
