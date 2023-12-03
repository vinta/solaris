import { Handler } from "aws-lambda"
import { random } from "lodash"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { getRandomNumber, sleep, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention, oneInchProtocols } from "./configs"
import { FlashAggregateArbitrageur, FlashAggregateArbitrageur__factory } from "../types"

class FlashAggregateArbitrageurOnOptimism extends BaseArbitrageur {
    ONEINCH_API_ENDPOINT = process.env.ONEINCH_API_ENDPOINT!
    ONEINCH_API_KEYS = process.env.ONEINCH_API_KEYS!.split(",")

    arbitrageur!: FlashAggregateArbitrageur

    INTENTION_SIZE = 4

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // OneInchRouterV5
    ERROR_ONEINCH_SWAP_FAIL = "OneInchSwapFail"

    async start() {
        const startTimestamp = Date.now() / 1000

        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            // 4 intentions: 54 requests/58 seconds
            batchMaxCount: 2,
        })

        this.owner = await this.getOwner(provider)
        this.arbitrageur = FlashAggregateArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: this.owner.address,
            oneInchApiEndpoint: this.ONEINCH_API_ENDPOINT,
        })

        let i = 0
        while (true) {
            i++

            const intentions = getRandomIntentions(this.INTENTION_SIZE)
            await Promise.all(intentions.map((intention) => this.tryArbitrage(intention)))

            const nowTimestamp = Date.now() / 1000
            if (nowTimestamp - startTimestamp >= this.TIMEOUT_SECONDS) {
                console.log(`arbitrage end: ${i * this.INTENTION_SIZE}`)
                return
            }
        }
    }

    async tryArbitrage(intention: Intention) {
        let oneInchData: string
        try {
            oneInchData = await this.fetchOneInchSwapData(intention)
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (errMessage.includes("TooManyRequests")) {
                // console.log("Too Many Requests")
                await sleep(1000 * getRandomNumber(0.5, 1))
                return
            } else {
                console.log("Failed to fetch 1inch API")
                return
            }
        }

        try {
            const [profit, estimatedGas] = await Promise.all([
                this.arbitrageur.arbitrageOneInch.staticCall(
                    intention.tokenIn,
                    intention.tokenOut,
                    intention.amountIn,
                    intention.minProfit,
                    oneInchData,
                    intention.uniswapV3Fee,
                ),
                this.arbitrageur.arbitrageOneInch.estimateGas(
                    intention.tokenIn,
                    intention.tokenOut,
                    intention.amountIn,
                    intention.minProfit,
                    oneInchData,
                    intention.uniswapV3Fee,
                ),
            ])
            await this.arbitrage(intention, oneInchData, profit, estimatedGas)
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (
                errMessage.includes(this.ERROR_TOO_LITTLE_RECEIVED) ||
                errMessage.includes(this.ERROR_ONEINCH_SWAP_FAIL)
            ) {
                // console.log("No Profit")
            } else {
                throw err
            }
        }
    }

    async arbitrage(intention: Intention, oneInchData: string, profit: bigint, estimatedGas: bigint) {
        const gas = this.calculateGas(intention.tokenIn, profit, estimatedGas)
        const txOptions = {
            nonce: this.nonceManager.getNonce(this.owner),
            chainId: this.NETWORK_CHAIN_ID,
            gasLimit: (estimatedGas * BigInt(120)) / BigInt(100), // x 1.2
            type: gas.type,
            maxFeePerGas: gas.maxFeePerGas,
            maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        }

        const populateTx = await this.arbitrageur.arbitrageOneInch.populateTransaction(
            intention.tokenIn,
            intention.tokenOut,
            intention.amountIn,
            intention.minProfit,
            oneInchData,
            intention.uniswapV3Fee,
            txOptions,
        )

        const tx = await this.sendTx(this.owner, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            return await this.owner.sendTransaction({
                to: populateTx.to,
                data: populateTx.data,
                ...txOptions,
            })
        })

        console.log(
            `arbitrage tx sent, profit: ${profit}, amountIn: ${intention.amountIn}, tokenIn: ${intention.tokenIn}`,
        )

        // no need to wait tx to be mined
        // const txReceipt = await tx.wait()
        // console.dir(txReceipt)

        process.exit(0)
    }

    async fetchOneInchSwapData(intention: Intention) {
        const params = {
            src: intention.tokenIn,
            dst: intention.tokenOut,
            amount: intention.amountIn.toString(),
            from: this.ARBITRAGEUR_ADDRESS,
            slippage: "50",
            protocols: oneInchProtocols.join(","),
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

        return response.tx.data as string
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashAggregateArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
