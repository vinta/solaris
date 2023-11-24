import { ContractTransactionResponse, HDNodeWallet, JsonRpcProvider, Network, parseEther } from "ethers"
import { Handler } from "aws-lambda"

import { TOKENS } from "@solaris/common/src/constants"
import { NonceManager } from "@solaris/common/src/nonce-manager"
import { wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { ArbitrageurLite__factory } from "../types"

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)
    GAS_LIMIT_PER_BLOCK = BigInt(15_000_000)

    ERROR_TOO_LITTLE_RECEIVED = "Too little received"
    ERROR_INSUFFICIENT_OUTPUT_AMOUNT = "0x42301c23" // InsufficientOutputAmount()

    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        const owner = await this.getOwner()
        const arbitrageur = ArbitrageurLite__factory.connect(this.ARBITRAGEUR_ADDRESS, owner)

        const amountIn = parseEther("1")
        const minProfitForStaticCall = parseEther("0.004") // 8 USD
        const minProfit = parseEther("0.0005") // 1 USD

        console.log("start", {
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: owner.address,
            amountIn,
            minProfit,
        })

        let i = 0
        while (true) {
            i++

            await Promise.all([
                // WETH/USDCe
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3toVelodromeV2.staticCall(
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        amountIn,
                        minProfitForStaticCall,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3toVelodromeV2(
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        amountIn,
                        minProfit,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageVelodromeV2toUniswapV3.staticCall(
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        amountIn,
                        minProfitForStaticCall,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageVelodromeV2toUniswapV3(
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        amountIn,
                        minProfit,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),

                // WETH/OP
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3toVelodromeV2.staticCall(
                        TOKENS.WETH,
                        TOKENS.OP,
                        amountIn,
                        minProfitForStaticCall,
                        3000,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3toVelodromeV2(
                        TOKENS.WETH,
                        TOKENS.OP,
                        amountIn,
                        minProfit,
                        3000,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageVelodromeV2toUniswapV3.staticCall(
                        TOKENS.WETH,
                        TOKENS.OP,
                        amountIn,
                        minProfitForStaticCall,
                        3000,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageVelodromeV2toUniswapV3(
                        TOKENS.WETH,
                        TOKENS.OP,
                        amountIn,
                        minProfit,
                        3000,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
            ])

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
            // console.log(`arbitrageTx sent: ${tx.hash}`)
            await tx.wait()
            // console.log(`arbitrageTx mined: ${tx.hash}`)
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
    const arbitrageurOptimism = new ArbitrageurOptimism()
    await arbitrageurOptimism.arbitrage()

    return {
        success: true,
    }
}

export const handlerOptimism = wrapSentryHandlerIfNeeded(handler)
