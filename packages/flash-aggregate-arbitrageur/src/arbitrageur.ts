import { Handler } from "aws-lambda"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { getRandomNumber, sleep, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention, oneInchProtocols } from "./configs"
import { FlashAggregateArbitrageur, FlashAggregateArbitrageur__factory } from "../types"

class FlashAggregateArbitrageurOnOptimism extends BaseArbitrageur {
    ONEINCH_API_ENDPOINT = process.env.ONEINCH_API_ENDPOINT!
    ONEINCH_API_KEY = process.env.ONEINCH_API_KEY!

    arbitrageur!: FlashAggregateArbitrageur

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // OneInchRouterV5
    ERROR_ONEINCH_SWAP_FAIL = "OneInchSwapFail"

    async start() {
        const startTimestamp = Date.now() / 1000

        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {})
        const sequencerProvider = this.getProvider(this.SEQUENCER_RPC_PROVIDER_URL, network, {})

        this.owner = await this.getOwner(provider)
        this.ownerWithSequencerProvider = this.owner.connect(sequencerProvider)
        this.arbitrageur = FlashAggregateArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            sequencerRpcProviderUrl: this.SEQUENCER_RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: this.owner.address,
            oneInchApiEndpoint: this.ONEINCH_API_ENDPOINT,
        })

        let i = 0
        while (true) {
            i++

            const intentions = getRandomIntentions(6)
            await Promise.all(intentions.map((intention) => this.tryArbitrage(intention)))

            const nowTimestamp = Date.now() / 1000
            if (nowTimestamp - startTimestamp >= this.TIMEOUT_SECONDS) {
                console.log(`arbitrage end: ${i}`)
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
                await sleep(1000 * getRandomNumber(0.2, 1))
                return
            } else {
                console.log("Failed to fetch 1inch API")
                return
            }
        }

        try {
            const profit = await this.arbitrageur.arbitrageOneInch.staticCall(
                intention.tokenIn,
                intention.tokenOut,
                intention.amountIn,
                intention.minProfit,
                oneInchData,
                intention.uniswapV3Fee,
            )
            await this.arbitrage(intention, profit, oneInchData)
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

    async arbitrage(intention: Intention, profit: bigint, oneInchData: string) {
        const gas = this.calculateGas(intention.tokenIn, profit)
        const populateTx = await this.arbitrageur.arbitrageOneInch.populateTransaction(
            intention.tokenIn,
            intention.tokenOut,
            intention.amountIn,
            intention.minProfit,
            oneInchData,
            intention.uniswapV3Fee,
        )

        await this.sendTx(this.ownerWithSequencerProvider, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            await this.ownerWithSequencerProvider.sendTransaction({
                to: populateTx.to,
                data: populateTx.data,
                nonce: this.nonceManager.getNonce(this.ownerWithSequencerProvider),
                gasLimit: this.GAS_LIMIT_PER_BLOCK,
                chainId: this.NETWORK_CHAIN_ID,
                type: gas.type,
                maxFeePerGas: gas.maxFeePerGas,
                maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
            })
        })
        console.log(`arbitrage tx sent, profit: ${profit} in ${intention.tokenIn}`)
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

        const res = await fetch(url, {
            method: "get",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${this.ONEINCH_API_KEY}`,
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
