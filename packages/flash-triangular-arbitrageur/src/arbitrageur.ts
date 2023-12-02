import { Handler } from "aws-lambda"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention } from "./configs"
import { FlashTriangularArbitrageur, FlashTriangularArbitrageur__factory } from "../types"

class FlashTriangularArbitrageurOnOptimism extends BaseArbitrageur {
    arbitrageur!: FlashTriangularArbitrageur

    GAS_LIMIT = BigInt(800_000)

    // UniswapV3Router
    ERROR_TOO_LITTLE_RECEIVED = "Too little received"

    // VelodromeV2Router
    ERROR_INSUFFICIENT_OUTPUT_AMOUNT = "0x42301c23" // InsufficientOutputAmount()

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
        this.arbitrageur = FlashTriangularArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

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
                intention.path,
                intention.tokens,
                intention.tokenIn,
                intention.amountIn,
                intention.minProfit,
                intention.arbitrageFunc,
            )
            await this.arbitrage(intention, profit)
        } catch (err: any) {
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
    }

    private async arbitrage(intention: Intention, profit: bigint) {
        const gas = this.calculateGas(intention.tokenIn, profit, BigInt(800_000))
        const populateTx = await this.arbitrageur.arbitrage.populateTransaction(
            intention.path,
            intention.tokens,
            intention.tokenIn,
            intention.amountIn,
            intention.minProfit,
            intention.arbitrageFunc,
        )

        await this.sendTx(this.owner, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            return await this.owner.sendTransaction({
                to: populateTx.to,
                data: populateTx.data,
                nonce: this.nonceManager.getNonce(this.owner),
                // gasLimit: this.GAS_LIMIT,
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
        const txReceipt = await tx.wait()
        console.dir(txReceipt)
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashTriangularArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
