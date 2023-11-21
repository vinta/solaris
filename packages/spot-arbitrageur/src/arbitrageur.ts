import { ContractTransactionResponse, HDNodeWallet, JsonRpcProvider, MaxUint256, Network, parseEther } from "ethers"
import { Handler } from "aws-lambda"

import { Arbitrageur__factory, IERC20__factory } from "../types"
import { NonceManager } from "./nonce-manager"
import { TOKENS } from "./constants"
import { wrapSentryHandlerIfNeeded } from "./utils"

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)
    GAS_LIMIT_PER_BLOCK = BigInt(15_000_000)

    ERROR_NO_PROFIT = "0xe39aafee" // NoProfit()

    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        const owner = await this.getOwner()
        const arbitrageur = Arbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, owner)

        const amountIn = parseEther("1")
        const minProfitForStaticCall = parseEther("0.005") // 10 USD
        const minProfit = parseEther("0.001") // 2 USD

        // await this.approve(owner, TOKENS.WETH, this.ARBITRAGEUR_ADDRESS, amountIn)

        console.log("arbitrageParameters", {
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            amountIn,
            minProfit,
        })

        let i = 1
        while (true) {
            console.log(`arbitrage start: ${i++}`)

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

        console.log("owner", {
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            networkName: network.name,
            networkChainId: network.chainId,
            owner: owner.address,
        })

        await this.nonceManager.register(owner)

        return owner
    }

    private async approve(signer: HDNodeWallet, tokenAddress: string, spenderAddress: string, amount: bigint) {
        const token = IERC20__factory.connect(tokenAddress, signer)
        const allowance = await token.allowance(signer.address, spenderAddress)

        if (allowance < amount) {
            const tx = await this.sendTx(signer, async () =>
                token.approve(spenderAddress, MaxUint256, {
                    nonce: this.nonceManager.getNonce(signer),
                }),
            )
            console.log(`approveTx: ${tx.hash}`)
            await tx.wait()
        }
    }

    private async arbitrageTx(owner: HDNodeWallet, sendTxFn: () => Promise<ContractTransactionResponse>) {
        try {
            const tx = await this.sendTx(owner, sendTxFn)
            console.log(`arbitrageTx sent: ${tx.hash}`)
            await tx.wait()
            console.log(`arbitrageTx mined: ${tx.hash}`)
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (errMessage.includes("NoProfit") || errMessage.includes(this.ERROR_NO_PROFIT)) {
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
