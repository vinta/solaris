import {
    ContractTransactionResponse,
    HDNodeWallet,
    JsonRpcProvider,
    MaxUint256,
    Network,
    parseEther,
    solidityPacked,
} from "ethers"
import { Handler } from "aws-lambda"

import { Arbitrageur, Arbitrageur__factory, IERC20__factory } from "../types"
import { NonceManager } from "./nonce-manager"
import { wrapSentryHandlerIfNeeded } from "./utils"
import { TOKENS } from "./constants"

// interface Fetch1inchSwapDataParams extends Record<string, string> {
//     src: string
//     dst: string
//     amount: string
//     from: string
//     slippage: string
//     disableEstimate: string
// }

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    ONEINCH_API_KEY = process.env.ONEINCH_API_KEY!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)
    GAS_LIMIT_PER_BLOCK = BigInt(15_000_000)

    ERROR_NO_PROFIT = "0xe39aafee" // NoProfit()
    ERROR_SWAP_FAIL = "0xb70946b8" // SwapFail()

    owner!: HDNodeWallet
    arbitrageur!: Arbitrageur
    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        // console.log("config", {
        //     ARBITRAGEUR_ADDRESS: this.ARBITRAGEUR_ADDRESS,
        //     TIMEOUT_SECONDS: this.TIMEOUT_SECONDS,
        // })

        this.owner = await this.getOwner()
        this.arbitrageur = Arbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)
        const owner = this.owner
        const arbitrageur = this.arbitrageur

        // const tokenIn = IERC20__factory.connect(TOKENS.WETH, owner)
        // const amountIn = await tokenIn.balanceOf(owner.address)
        const amountIn = parseEther("1")
        const minProfit = parseEther("0.002") // 4 USD

        await this.approve(this.owner, TOKENS.WETH, this.ARBITRAGEUR_ADDRESS, amountIn)

        console.log("arbitrageParameters", {
            // tokenIn: tokenIn.target,
            // tokenOut: tokenOut.target,
            amountIn,
            // path1,
            // path2,
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
                        minProfit,
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
                        minProfit,
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
                        minProfit,
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
                        minProfit,
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

                // this.arbitrageTx(owner, async () => {
                //     await arbitrageur.triangularArbitrageUniswapV3.staticCall(
                //         path1,
                //         tokenIn.target,
                //         amountIn,
                //         minProfit,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                //     return arbitrageur.triangularArbitrageUniswapV3(path1, tokenIn.target, amountIn, minProfit, {
                //         nonce: this.nonceManager.getNonce(owner),
                //         gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //     })
                // }),
                // this.arbitrageTx(owner, async () => {
                //     await arbitrageur.triangularArbitrageUniswapV3.staticCall(
                //         path2,
                //         tokenIn.target,
                //         amountIn,
                //         minProfit,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                //     return arbitrageur.triangularArbitrageUniswapV3(path2, tokenIn.target, amountIn, minProfit, {
                //         nonce: this.nonceManager.getNonce(owner),
                //         gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //     })
                // }),
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

        // console.log("owner", {
        //     rpcProviderUrl: this.RPC_PROVIDER_URL,
        //     networkName: network.name,
        //     networkChainId: network.chainId,
        //     owner: owner.address,
        // })

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
            if (errMessage.includes(this.ERROR_NO_PROFIT) || errMessage.includes("NoProfit")) {
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

    // private async generateArbitrageTxFromConfigs(amountIn: bigint) {
    //     // const path1 = solidityPacked(
    //     //     ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    //     //     [TOKENS.WETH, 500, TOKENS.USDCe, 3000, TOKENS.OP, 3000, TOKENS.WETH],
    //     // )
    //     // const path2 = solidityPacked(
    //     //     ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    //     //     [TOKENS.WETH, 3000, TOKENS.OP, 3000, TOKENS.USDCe, 500, TOKENS.WETH],
    //     // )

    //     const configs = [
    //         {
    //             tokenIn: TOKENS.WETH,
    //             tokenOut: TOKENS.USDCe,
    //             uniswapV3Fee: 500,
    //             velodromeV2Stable: false,
    //             minProfit: parseEther("0.001"), // 2 USD
    //         },
    //         {
    //             tokenIn: TOKENS.WETH,
    //             tokenOut: TOKENS.OP,
    //             uniswapV3Fee: 3000,
    //             velodromeV2Stable: false,
    //             minProfit: parseEther("0.001"), // 2 USD
    //         },
    //     ]

    //     const arbitrageTxs = []
    //     for (const config of configs) {
    //         arbitrageTxs.push(
    //             this.arbitrageTx(this.owner, async () => {
    //                 await this.arbitrageur.arbitrageUniswapV3toVelodromeV2.staticCall(
    //                     config.tokenIn,
    //                     config.tokenOut,
    //                     amountIn,
    //                     config.minProfit,
    //                     config.uniswapV3Fee,
    //                     config.velodromeV2Stable,
    //                     {
    //                         nonce: this.nonceManager.getNonce(this.owner),
    //                         gasLimit: this.GAS_LIMIT_PER_BLOCK,
    //                     },
    //                 )
    //                 return this.arbitrageur.arbitrageUniswapV3toVelodromeV2(
    //                     config.tokenIn,
    //                     config.tokenOut,
    //                     amountIn,
    //                     config.minProfit,
    //                     config.uniswapV3Fee,
    //                     config.velodromeV2Stable,
    //                     {
    //                         nonce: this.nonceManager.getNonce(this.owner),
    //                         gasLimit: this.GAS_LIMIT_PER_BLOCK,
    //                     },
    //                 )
    //             }),
    //         )

    //         arbitrageTxs.push(
    //             this.arbitrageTx(this.owner, async () => {
    //                 await this.arbitrageur.arbitrageVelodromeV2toUniswapV3.staticCall(
    //                     config.tokenIn,
    //                     config.tokenOut,
    //                     amountIn,
    //                     config.minProfit,
    //                     config.uniswapV3Fee,
    //                     config.velodromeV2Stable,
    //                     {
    //                         nonce: this.nonceManager.getNonce(this.owner),
    //                         gasLimit: this.GAS_LIMIT_PER_BLOCK,
    //                     },
    //                 )
    //                 return this.arbitrageur.arbitrageVelodromeV2toUniswapV3(
    //                     config.tokenIn,
    //                     config.tokenOut,
    //                     amountIn,
    //                     config.minProfit,
    //                     config.uniswapV3Fee,
    //                     config.velodromeV2Stable,
    //                     {
    //                         nonce: this.nonceManager.getNonce(this.owner),
    //                         gasLimit: this.GAS_LIMIT_PER_BLOCK,
    //                     },
    //                 )
    //             }),
    //         )
    //     }

    //     return arbitrageTxs
    // }

    // private async fetch1inchSwapData(params: Fetch1inchSwapDataParams) {
    //     const urlParams = new URLSearchParams(params)
    //     const url = `https://api.1inch.dev/swap/v5.2/8453/swap?${urlParams}`

    //     const res = await fetch(url, {
    //         method: "get",
    //         headers: {
    //             Accept: "application/json",
    //             Authorization: `Bearer ${this.ONEINCH_API_KEY}`,
    //         },
    //     })

    //     if (res.status === 429) {
    //         throw new Error("Too Many Requests")
    //     }

    //     if (!res.ok) {
    //         const err = new Error("Fetch1inchSwapDataError")
    //         err.message = await res.text()
    //         throw err
    //     }

    //     const response = await res.json()
    //     if (!response.tx?.data) {
    //         const err = new Error("Fetch1inchSwapAPIDataNoData")
    //         err.message = await res.text()
    //         throw err
    //     }

    //     return response.tx.data
    // }
}

const handler: Handler = async (event, context) => {
    const arbitrageurOptimism = new ArbitrageurOptimism()
    await arbitrageurOptimism.arbitrage()

    return {
        success: true,
    }
}

export const handlerOptimism = wrapSentryHandlerIfNeeded(handler)
