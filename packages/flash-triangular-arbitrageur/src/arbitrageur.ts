import { Handler } from "aws-lambda"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention } from "./configs"
import { FlashTriangularArbitrageur, FlashTriangularArbitrageur__factory } from "../types"

interface ProfitResult {
    amountIn: bigint
    profit: bigint
    estimatedGas: bigint
}

class FlashTriangularArbitrageurOnOptimism extends BaseArbitrageur {
    arbitrageur!: FlashTriangularArbitrageur

    INTENTION_SIZE = 4
    AMOUNT_CHUNK_SIZE = 5
    GAS_LIMIT = BigInt(800_000)

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // VelodromeV2Router
    ERROR_INSUFFICIENT_OUTPUT_AMOUNT = "0x42301c23" // InsufficientOutputAmount()

    async start() {
        const startTimestamp = Date.now() / 1000

        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1
            // batchMaxCount: this.AMOUNT_CHUNK_SIZE,
        })

        this.owner = await this.getOwner(provider)
        this.arbitrageur = FlashTriangularArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: this.owner.address,
        })

        let i = 0
        while (true) {
            i++

            const intentions = getRandomIntentions(6)
            await Promise.all(intentions.map((intention) => this.tryArbitrage(intention)))

            const nowTimestamp = Date.now() / 1000
            if (nowTimestamp - startTimestamp >= this.TIMEOUT_SECONDS) {
                console.log(`arbitrage end: ${i * this.INTENTION_SIZE}`)
                return
            }
        }
    }

    async tryArbitrage(intention: Intention) {
        const mostProfitableResult = await this.findMostProfitableResult(intention)
        if (!mostProfitableResult) {
            return
        }

        try {
            await this.arbitrage(intention, mostProfitableResult)
        } catch (err: any) {
            this.handleArbitrageError(err)
        }
    }

    handleArbitrageError(err: any) {
        const errMessage = err.message || err.reason || ""
        if (
            errMessage.includes(this.ERROR_TOO_LITTLE_RECEIVED) ||
            errMessage.includes(this.ERROR_INSUFFICIENT_OUTPUT_AMOUNT)
        ) {
            // console.log("No Profit")
        } else {
            throw err
        }
    }

    async findMostProfitableResult(intention: Intention) {
        // amountIn: 20000, chunkSize: 10
        // [20000, 19000, ..., 2000, 1000]
        const step = intention.amountIn / BigInt(this.AMOUNT_CHUNK_SIZE)
        const amountIns = Array(this.AMOUNT_CHUNK_SIZE)
            .fill(true)
            .map((_, i) => {
                return intention.amountIn - step * BigInt(i)
            })

        const results = await Promise.all(amountIns.map(async (amountIn) => this.getProfitResult(intention, amountIn)))

        const filteredResults = results.filter((result) => result) as ProfitResult[]
        if (filteredResults.length === 0) {
            return undefined
        }

        const mostProfitableResult = filteredResults.reduce((prev, cur) => (cur.profit > prev.profit ? cur : prev))

        return mostProfitableResult
    }

    async getProfitResult(intention: Intention, amountIn: bigint) {
        try {
            const [profit, estimatedGas] = await Promise.all([
                this.arbitrageur.arbitrage.staticCall(
                    intention.path,
                    intention.tokens,
                    amountIn,
                    intention.minProfit,
                    intention.arbitrageFunc,
                ),
                this.arbitrageur.arbitrage.estimateGas(
                    intention.path,
                    intention.tokens,
                    amountIn,
                    intention.minProfit,
                    intention.arbitrageFunc,
                ),
            ])
            return {
                amountIn,
                profit,
                estimatedGas,
            }
        } catch (err: any) {
            this.handleArbitrageError(err)
        }

        return undefined
    }

    private async arbitrage(intention: Intention, mostProfitableResult: ProfitResult) {
        const gas = this.calculateGas(intention.tokenIn, mostProfitableResult.profit, mostProfitableResult.estimatedGas)
        const txOptions = {
            nonce: this.nonceManager.getNonce(this.owner),
            chainId: this.NETWORK_CHAIN_ID,
            gasLimit: mostProfitableResult.estimatedGas,
            type: gas.type,
            maxFeePerGas: gas.maxFeePerGas,
            maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        }

        const populateTx = await this.arbitrageur.arbitrage.populateTransaction(
            intention.path,
            intention.tokens,
            intention.tokenIn,
            mostProfitableResult.amountIn,
            intention.minProfit,
            intention.arbitrageFunc,
            txOptions,
        )

        await this.sendTx(this.owner, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            return await this.owner.sendTransaction({
                to: populateTx.to,
                data: populateTx.data,
                ...txOptions,
            })
        })

        console.log(
            `arbitrage tx sent, profit: ${mostProfitableResult.profit}, amountIn: ${mostProfitableResult.amountIn}, tokenIn: ${intention.tokenIn}`,
        )

        // no need to wait tx to be mined
        // const txReceipt = await tx.wait()
        // console.dir(txReceipt)

        process.exit(0)
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashTriangularArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
