import { Handler } from "aws-lambda"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention } from "./configs"
import { FlashArbitrageur, FlashArbitrageur__factory } from "../types"
import { TOKENS } from "@solaris/common/src/tokens"

interface ProfitResult {
    amountIn: bigint
    profit: bigint
    estimatedGas: bigint
}

class FlashArbitrageurOnOptimism extends BaseArbitrageur {
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
            errMessage.includes(this.ERROR_INSUFFICIENT_OUTPUT_AMOUNT) ||
            errMessage.includes(this.ERROR_LT_MINBASEAMOUNT) ||
            errMessage.includes(this.ERROR_LT_MINQUOTEAMOUNT) ||
            errMessage.includes(this.ERROR_LT_MINBASE2AMOUNT) ||
            errMessage.includes(this.ERROR_NOT_ORACLE_FEASIBLE) ||
            errMessage.includes(this.ERROR_INSUFFICIENT_AMOUNTOUT) ||
            errMessage.includes(this.ERROR_POOLAMOUNT_LT_BUFFER)
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
                    intention.borrowFromUniswapPool,
                    intention.tokenIn,
                    intention.tokenOut,
                    amountIn,
                    intention.minProfit,
                    intention.secondArbitrageFunc,
                    {
                        blockTag: "pending",
                    },
                ),
                this.arbitrageur.arbitrage.estimateGas(
                    intention.borrowFromUniswapPool,
                    intention.tokenIn,
                    intention.tokenOut,
                    amountIn,
                    intention.minProfit,
                    intention.secondArbitrageFunc,
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

    async arbitrage(intention: Intention, mostProfitableResult: ProfitResult) {
        // const gas = this.calculateGas(intention.tokenIn, mostProfitableResult.profit, mostProfitableResult.estimatedGas)
        const txOptions = {
            nonce: this.nonceManager.getNonce(this.owner),
            chainId: this.NETWORK_CHAIN_ID,
            gasLimit: (mostProfitableResult.estimatedGas * BigInt(120)) / BigInt(100), // x 1.2
            // type: gas.type,
            // maxFeePerGas: gas.maxFeePerGas,
            // maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        }

        const populateTx = await this.arbitrageur.arbitrage.populateTransaction(
            intention.borrowFromUniswapPool,
            intention.tokenIn,
            intention.tokenOut,
            mostProfitableResult.amountIn,
            intention.minProfit,
            intention.secondArbitrageFunc,
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
            `arbitrage tx sent, profit: ${mostProfitableResult.profit}, amountIn: ${mostProfitableResult.amountIn}, tokenIn: ${intention.tokenIn}`,
        )

        // no need to wait tx to be mined
        // const txReceipt = await tx.wait()
        // console.dir(txReceipt)

        process.exit(0)
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
