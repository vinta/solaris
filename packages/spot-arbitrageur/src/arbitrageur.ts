import { ContractTransactionResponse, HDNodeWallet, JsonRpcProvider, Network, formatUnits, parseUnits } from "ethers"
import { Handler } from "aws-lambda"

import { TOKENS } from "@solaris/common/src/constants"
import { NonceManager } from "@solaris/common/src/nonce-manager"
import { randomInt, randomNumber, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"

import { ArbitrageurFlash__factory } from "../types"

enum ArbitrageFunc {
    VelodromeV2Router, // 0
    WOOFiV2Router, // 1
    MummyRouter, // 2
}

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
    ERROR_NOT_ORACLE_FEASIBLE = "!ORACLE_FEASIBLE"

    // MummyRouter
    ERROR_INSUFFICIENT_AMOUNTOUT = "insufficient amountOut"
    ERROR_POOLAMOUNT_LT_BUFFER = "poolAmount < buffer"

    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        const owner = await this.getOwner()
        const arbitrageur = ArbitrageurFlash__factory.connect(this.ARBITRAGEUR_ADDRESS, owner)

        const uniswapV3PoolAddress = "0x85149247691df622eaF1a8Bd0CaFd40BC45154a9" // WETH/USDCe 500

        const ethMinProfitForStaticCall = parseUnits("0.002", 18) // 4 USD
        const ethMinProfit = parseUnits("0.0005", 18) // 1 USD
        const usdMinProfitForStaticCall = parseUnits("4", 6)
        const usdMinProfit = parseUnits("1", 6)

        console.log("start", {
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: owner.address,
        })

        let i = 0
        while (true) {
            i++

            const ethAmountIn = parseUnits(randomNumber(0.1, 2, 1).toString(), 18)
            const usdAmountIn = parseUnits(randomInt(200, 4000).toString(), 6)
            // console.log(`randomEthAmount: ${formatUnits(ethAmountIn, 18)}`)
            // console.log(`randomUsdAmount: ${formatUnits(usdAmountIn, 6)}`)

            await Promise.all([
                // WETH -> USDCe, second: VelodromeV2Router
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfitForStaticCall,
                        ArbitrageFunc.VelodromeV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3FlashSwap(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfit,
                        ArbitrageFunc.VelodromeV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
                // WETH -> USDCe, second: WOOFiV2Router
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfitForStaticCall,
                        ArbitrageFunc.WOOFiV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3FlashSwap(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfit,
                        ArbitrageFunc.WOOFiV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
                // WETH -> USDCe, second: MummyRouter
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfitForStaticCall,
                        ArbitrageFunc.MummyRouter,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3FlashSwap(
                        uniswapV3PoolAddress,
                        TOKENS.WETH,
                        TOKENS.USDCe,
                        ethAmountIn,
                        ethMinProfit,
                        ArbitrageFunc.MummyRouter,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),

                // USDCe -> WETH, second: VelodromeV2Router
                this.arbitrageTx(owner, async () => {
                    await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                        uniswapV3PoolAddress,
                        TOKENS.USDCe,
                        TOKENS.WETH,
                        usdAmountIn,
                        usdMinProfitForStaticCall,
                        ArbitrageFunc.VelodromeV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                    return arbitrageur.arbitrageUniswapV3FlashSwap(
                        uniswapV3PoolAddress,
                        TOKENS.USDCe,
                        TOKENS.WETH,
                        usdAmountIn,
                        usdMinProfit,
                        ArbitrageFunc.VelodromeV2Router,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                            gasLimit: this.GAS_LIMIT_PER_BLOCK,
                        },
                    )
                }),
                // USDCe -> WETH, second: WOOFiV2Router
                // TODO: WooPPV2: !ORACLE_FEASIBLE
                // this.arbitrageTx(owner, async () => {
                //     await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                //         uniswapV3PoolAddress,
                //         TOKENS.USDCe,
                //         TOKENS.WETH,
                //         usdAmountIn,
                //         usdMinProfitForStaticCall,
                //         ArbitrageFunc.WOOFiV2Router,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                //     return arbitrageur.arbitrageUniswapV3FlashSwap(
                //         uniswapV3PoolAddress,
                //         TOKENS.USDCe,
                //         TOKENS.WETH,
                //         usdAmountIn,
                //         usdMinProfit,
                //         ArbitrageFunc.WOOFiV2Router,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                // }),
                // USDCe -> WETH, second: MummyRouter
                // TODO: Vault: poolAmount < buffer
                // this.arbitrageTx(owner, async () => {
                //     await arbitrageur.arbitrageUniswapV3FlashSwap.staticCall(
                //         uniswapV3PoolAddress,
                //         TOKENS.USDCe,
                //         TOKENS.WETH,
                //         usdAmountIn,
                //         usdMinProfitForStaticCall,
                //         ArbitrageFunc.MummyRouter,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                //     return arbitrageur.arbitrageUniswapV3FlashSwap(
                //         uniswapV3PoolAddress,
                //         TOKENS.USDCe,
                //         TOKENS.WETH,
                //         usdAmountIn,
                //         usdMinProfit,
                //         ArbitrageFunc.MummyRouter,
                //         {
                //             nonce: this.nonceManager.getNonce(owner),
                //             gasLimit: this.GAS_LIMIT_PER_BLOCK,
                //         },
                //     )
                // }),
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
            console.log(`arbitrageTx sent: ${tx.hash}`)
            await tx.wait()
            // console.log(`arbitrageTx mined: ${tx.hash}`)
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (
                errMessage.includes(this.ERROR_TOO_LITTLE_RECEIVED) ||
                errMessage.includes(this.ERROR_INSUFFICIENT_OUTPUT_AMOUNT) ||
                errMessage.includes(this.ERROR_LT_MINBASEAMOUNT) ||
                errMessage.includes(this.ERROR_INSUFFICIENT_AMOUNTOUT)
                // errMessage.includes(this.ERROR_POOLAMOUNT_LT_BUFFER)
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
    const service = new ArbitrageurOptimism()
    await service.arbitrage()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
