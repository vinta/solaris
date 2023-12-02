import { Handler } from "aws-lambda"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention } from "./configs"
import { FlashArbitrageur, FlashArbitrageur__factory } from "../types"

class FlashArbitrageurOnOptimism extends BaseArbitrageur {
    arbitrageur!: FlashArbitrageur

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // VelodromeV2Router
    ERROR_INSUFFICIENT_OUTPUT_AMOUNT = "0x42301c23" // InsufficientOutputAmount()

    // WOOFiV2Router
    ERROR_LT_MINBASEAMOUNT = "baseAmount_LT_minBaseAmount"
    ERROR_LT_MINQUOTEAMOUNT = "quoteAmount_LT_minQuoteAmount"
    ERROR_NOT_ORACLE_FEASIBLE = "!ORACLE_FEASIBLE"

    // MummyRouter
    ERROR_INSUFFICIENT_AMOUNTOUT = "insufficient amountOut"
    ERROR_POOLAMOUNT_LT_BUFFER = "poolAmount < buffer"

    async start() {
        const startTimestamp = Date.now() / 1000

        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            // 6 intentions: 2582 requests/58 seconds
            // 4 intentions: 2713 requests/58 seconds
            // batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1
            // 2 intentions: 3663 requests/58 seconds
            batchMaxCount: 1,
        })

        this.owner = await this.getOwner(provider)
        this.arbitrageur = FlashArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            sequencerRpcProviderUrl: this.SEQUENCER_RPC_PROVIDER_URL,
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
                console.log(`arbitrage end: ${i}`)
                return
            }
        }
    }

    private async tryArbitrage(intention: Intention) {
        try {
            const profit = await this.arbitrageur.arbitrage.staticCall(
                intention.borrowFromUniswapPool,
                intention.tokenIn,
                intention.tokenOut,
                intention.amountIn,
                intention.minProfit,
                intention.secondArbitrageFunc,
            )
            await this.arbitrage(intention, profit)
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (
                errMessage.includes(this.ERROR_TOO_LITTLE_RECEIVED) ||
                errMessage.includes(this.ERROR_INSUFFICIENT_OUTPUT_AMOUNT) ||
                errMessage.includes(this.ERROR_LT_MINBASEAMOUNT) ||
                errMessage.includes(this.ERROR_LT_MINQUOTEAMOUNT) ||
                errMessage.includes(this.ERROR_NOT_ORACLE_FEASIBLE) ||
                errMessage.includes(this.ERROR_INSUFFICIENT_AMOUNTOUT) ||
                errMessage.includes(this.ERROR_POOLAMOUNT_LT_BUFFER)
            ) {
                // console.log("No Profit")
            } else {
                throw err
            }
        }
    }

    private async arbitrage(intention: Intention, profit: bigint) {
        const gas = this.calculateGas(intention.tokenIn, profit)
        const populateTx = await this.arbitrageur.arbitrage.populateTransaction(
            intention.borrowFromUniswapPool,
            intention.tokenIn,
            intention.tokenOut,
            intention.amountIn,
            intention.minProfit,
            intention.secondArbitrageFunc,
        )

        const tx = await this.sendTx(this.owner, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            return await this.owner.sendTransaction({
                to: populateTx.to,
                data: populateTx.data,
                nonce: this.nonceManager.getNonce(this.owner),
                gasLimit: this.GAS_LIMIT,
                chainId: this.NETWORK_CHAIN_ID,
                type: gas.type,
                maxFeePerGas: gas.maxFeePerGas,
                maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
            })
        })
        console.log(
            `arbitrage tx sent, profit: ${profit}, amountIn: ${intention.amountIn}, tokenIn: ${intention.tokenIn}`,
        )

        // no need to wait tx to be mined
        // await tx.wait()
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
