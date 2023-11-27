import { ContractTransactionResponse, HDNodeWallet, JsonRpcProvider, Network, formatUnits, parseUnits } from "ethers"
import { Handler } from "aws-lambda"

import { NonceManager } from "@solaris/common/src/nonce-manager"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { getRandomIntentions } from "./configs"
import { FlashArbitrageur__factory } from "../types"

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
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

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        const owner = await this.getOwner()
        const arbitrageur = FlashArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, owner)

        console.log("start", {
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: owner.address,
        })

        let i = 0
        while (true) {
            i++

            const intentions = getRandomIntentions(5)
            console.dir(intentions, { depth: 3 })

            const arbitragePromises = intentions.flatMap((intention) => {
                return intention.secondArbitrageFuncs.map(async (secondArbitrageFunc) => {
                    return this.arbitrageTx(owner, async () => {
                        console.log("intention", intention.pair, "secondArbitrageFunc", secondArbitrageFunc)
                        await arbitrageur.arbitrage.staticCall(
                            intention.borrowFromUniswapPool,
                            intention.tokenIn,
                            intention.tokenOut,
                            intention.amountIn,
                            intention.minProfitForStaticCall,
                            secondArbitrageFunc,
                            {
                                nonce: this.nonceManager.getNonce(owner),
                                gasLimit: this.GAS_LIMIT_PER_BLOCK,
                            },
                        )
                        return arbitrageur.arbitrage(
                            intention.borrowFromUniswapPool,
                            intention.tokenIn,
                            intention.tokenOut,
                            intention.amountIn,
                            intention.minProfit,
                            secondArbitrageFunc,
                            {
                                nonce: this.nonceManager.getNonce(owner),
                                gasLimit: this.GAS_LIMIT_PER_BLOCK,
                            },
                        )
                    })
                })
            })
            console.log(arbitragePromises.length)
            await Promise.all(arbitragePromises)

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
        })

        const hdNodeWallet = HDNodeWallet.fromPhrase(this.OWNER_SEED_PHRASE)
        const owner = hdNodeWallet.connect(provider)
        await this.nonceManager.register(owner)

        return owner
    }

    private async arbitrageTx(owner: HDNodeWallet, sendTxFn: () => Promise<ContractTransactionResponse>) {
        try {
            const tx = await this.sendTx(owner, sendTxFn)
            console.log(`arbitrageTx sent: ${tx.hash}`)
            await tx.wait()
            // console.log(`arbitrageTx mined: ${tx.hash}`)
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

        return true
    }

    private async sendTx(wallet: HDNodeWallet, sendTxFn: () => Promise<ContractTransactionResponse>) {
        const release = await this.nonceManager.lock(wallet)
        try {
            const tx = await sendTxFn()
            this.nonceManager.increaseNonce(wallet)
            return tx
        } catch (err: any) {
            if (err.code === "NONCE_EXPIRED" || err.message.includes("invalid transaction nonce")) {
                await this.nonceManager.resetNonce(wallet)
                throw new Error("ResetNonce")
            }
            throw err
        } finally {
            release()
        }
    }
}

const handler: Handler = async (event, context) => {
    const service = new ArbitrageurOptimism()
    await service.arbitrage()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
