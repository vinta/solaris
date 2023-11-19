import {
    Network,
    JsonRpcProvider,
    HDNodeWallet,
    parseEther,
    MaxUint256,
    solidityPacked,
    ContractTransactionResponse,
} from "ethers"
import { Handler } from "aws-lambda"

import { Arbitrageur__factory, IERC20__factory } from "../types"
import { NonceManager } from "./nonce-manager"
import { wrapSentryHandlerIfNeeded } from "./utils"

interface Fetch1inchSwapDataParams extends Record<string, string> {
    src: string
    dst: string
    amount: string
    from: string
    slippage: string
    disableEstimate: string
}

class ArbitrageurOptimism {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    ONEINCH_API_KEY = process.env.ONEINCH_API_KEY!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)

    ERROR_NO_PROFIT = "0xe39aafee" // NoProfit()
    ERROR_SWAP_FAIL = "0xb70946b8" // SwapFail()

    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        console.log("config", {
            RPC_PROVIDER_URL: this.RPC_PROVIDER_URL,
            ARBITRAGEUR_ADDRESS: this.ARBITRAGEUR_ADDRESS,
            TIMEOUT_SECONDS: this.TIMEOUT_SECONDS,
        })

        const owner = await this.getOwner()

        const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"
        const USDCe_ADDRESS = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
        const OP_ADDRESS = "0x4200000000000000000000000000000000000042"

        const arbitrageur = Arbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, owner)
        const tokenIn = IERC20__factory.connect(WETH_ADDRESS, owner)
        const tokenOut = IERC20__factory.connect(USDCe_ADDRESS, owner)
        const amountIn = await tokenIn.balanceOf(owner.address)
        const path = solidityPacked(
            ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
            [WETH_ADDRESS, 500, USDCe_ADDRESS, 3000, OP_ADDRESS, 3000, WETH_ADDRESS],
        )
        const minProfit = parseEther("0.001") // ~= 2 USD

        await this.approve(owner, WETH_ADDRESS, this.ARBITRAGEUR_ADDRESS, amountIn)

        console.log("arbitrage parameters", {
            tokenIn: tokenIn.target,
            tokenOut: tokenOut.target,
            amountIn,
            path,
            minProfit,
        })

        let i = 1
        while (true) {
            console.log(`arbitrage start: ${i++}`)

            await Promise.all([
                this.arbitrageTx(owner, async () =>
                    arbitrageur.arbitrageUniswapV3toVelodromeV2(
                        tokenIn.target,
                        tokenOut.target,
                        amountIn,
                        minProfit,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                        },
                    ),
                ),
                this.arbitrageTx(owner, async () =>
                    arbitrageur.arbitrageVelodromeV2toUniswapV3(
                        tokenIn.target,
                        tokenOut.target,
                        amountIn,
                        minProfit,
                        500,
                        false,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                        },
                    ),
                ),
                this.arbitrageTx(owner, async () => {
                    return arbitrageur.triangularArbitrageUniswapV3(path, tokenIn.target, amountIn, minProfit, {
                        nonce: this.nonceManager.getNonce(owner),
                    })
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

        console.log("getOwner", {
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
            if (errMessage.includes(this.ERROR_NO_PROFIT)) {
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
