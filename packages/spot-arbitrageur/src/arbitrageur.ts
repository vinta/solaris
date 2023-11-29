import { TransactionResponse, HDNodeWallet, JsonRpcProvider, Network } from "ethers"
import { Handler } from "aws-lambda"

import { NonceManager } from "@solaris/common/src/nonce-manager"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions, Intention } from "./configs"
import { FlashArbitrageur, FlashArbitrageur__factory } from "../types"

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    SEQUENCER_RPC_PROVIDER_URL = process.env.SEQUENCER_RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)

    GAS_LIMIT_PER_BLOCK = BigInt(8000000)

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

    nonceManager = new NonceManager()
    owner!: HDNodeWallet
    ownerWithSequencerProvider!: HDNodeWallet
    arbitrageur!: FlashArbitrageur

    async start() {
        const startTimestamp = Date.now() / 1000

        this.owner = await this.getOwner()
        this.ownerWithSequencerProvider = this.owner.connect(this.getSequencerProvider())
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

    private async getOwner() {
        const network = new Network(this.NETWORK_NAME, this.NETWORK_CHAIN_ID)
        const provider = new JsonRpcProvider(this.RPC_PROVIDER_URL, network, {
            staticNetwork: network,

            // // 6 intentions: 2582 requests/58 seconds
            // batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1

            // 2 intentions: 3299 requests/58 seconds
            batchMaxCount: 1,
        })

        const hdNodeWallet = HDNodeWallet.fromPhrase(this.OWNER_SEED_PHRASE)
        const owner = hdNodeWallet.connect(provider)
        await this.nonceManager.register(owner)

        return owner
    }

    private getSequencerProvider() {
        const network = new Network(this.NETWORK_NAME, this.NETWORK_CHAIN_ID)
        const provider = new JsonRpcProvider(this.SEQUENCER_RPC_PROVIDER_URL, network, {
            staticNetwork: network,
        })
        return provider
    }

    private async tryArbitrage(intention: Intention) {
        try {
            const populateTx = await this.arbitrageur.arbitrage.populateTransaction(
                intention.borrowFromUniswapPool,
                intention.tokenIn,
                intention.tokenOut,
                intention.amountIn,
                intention.minProfit,
                intention.secondArbitrageFunc,
            )
            await this.owner.call(populateTx) // static call
            await this.arbitrage(populateTx.to, populateTx.data) // send
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

    private async arbitrage(to: string, data: string) {
        await this.sendTx(this.ownerWithSequencerProvider, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            await this.ownerWithSequencerProvider.sendTransaction({
                to: to,
                data: data,
                nonce: this.nonceManager.getNonce(this.ownerWithSequencerProvider),
                gasLimit: this.GAS_LIMIT_PER_BLOCK,
                chainId: this.NETWORK_CHAIN_ID,
                type: 2,
                // gasPrice = maxFeePerGas + maxPriorityFeePerGas
                maxFeePerGas: 10000000000, // Max: 10 Gwei
                maxPriorityFeePerGas: 1000000, // Max Priority: 0.001 Gwei
            })
        })
        console.log("arbitrage tx sent")
    }

    private async sendTx(wallet: HDNodeWallet, sendTxFn: () => Promise<void>) {
        const release = await this.nonceManager.lock(wallet)
        try {
            await sendTxFn()
            this.nonceManager.increaseNonce(wallet)
            return true
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (err.code === "NONCE_EXPIRED" || errMessage.includes("invalid transaction nonce")) {
                await this.nonceManager.resetNonce(wallet)
                throw new Error("ResetNonce")
            } else if (errMessage.includes("rpc method is not whitelisted") && errMessage.includes("eth_blockNumber")) {
                // NOTE: tx was sent successfully, but this program fails due to "rpc method is not whitelisted"
                this.nonceManager.increaseNonce(wallet)
                console.log("tx sent to sequencer")
                return true
            }
            throw err
        } finally {
            release()
        }
    }
}

const handler: Handler = async (event, context) => {
    const service = new ArbitrageurOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
