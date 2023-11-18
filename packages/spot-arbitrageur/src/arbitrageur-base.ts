import { Network, JsonRpcProvider, HDNodeWallet, parseEther, MaxUint256, ContractTransactionResponse } from "ethers"
import { Handler } from "aws-lambda"

import { ArbitrageurWithAggregator__factory as Arbitrageur__factory, IERC20__factory } from "../types"
import { NonceManager } from "./nonce-manager"
import { wrapSentryHandlerIfNeeded, sleep, randomNumberBetween } from "./utils"
import { PROTOCOLS } from "./constants"

interface Fetch1inchSwapDataParams extends Record<string, string> {
    src: string
    dst: string
    amount: string
    from: string
    slippage: string
    disableEstimate: string
}

class ArbitrageurBase {
    ONEINCH_API_KEY = process.env.ONEINCH_API_KEY!

    nonceManager = new NonceManager()

    async arbitrage() {
        const startTimestamp = Date.now() / 1000

        const RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
        const OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
        const ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
        const TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)

        const ERROR_NO_PROFIT = "0xe39aafee" // NoProfit()
        const ERROR_SWAP_FAIL = "0xb70946b8" // SwapFail()

        console.log("config", {
            RPC_PROVIDER_URL,
            ARBITRAGEUR_ADDRESS,
            TIMEOUT_SECONDS,
        })

        const network =
            RPC_PROVIDER_URL === "http://127.0.0.1:8545" ? new Network("hardhat", 31337) : new Network("base", 8453)
        const provider = new JsonRpcProvider(RPC_PROVIDER_URL, network, {
            staticNetwork: network,
        })

        const hdNodeWallet = HDNodeWallet.fromPhrase(OWNER_SEED_PHRASE)
        const owner = hdNodeWallet.connect(provider)
        await this.nonceManager.register(owner)

        console.log("start", {
            networkName: network.name,
            networkChainId: network.chainId,
            owner: owner.address,
        })

        const wethAddr = "0x4200000000000000000000000000000000000006"
        const usdcAddr = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"

        const arbitrageur = Arbitrageur__factory.connect(ARBITRAGEUR_ADDRESS, owner)
        const tokenIn = IERC20__factory.connect(wethAddr, owner)
        const tokenOut = IERC20__factory.connect(usdcAddr, owner)
        const amountIn = await tokenIn.balanceOf(owner.address)
        const minProfit = parseEther("0.002") // ~= 4 USD
        // const minProfit = parseEther("0.001") // ~= 2 USD
        // const minProfit = parseEther("0.0005") // ~= 1 USD

        const allowance = await tokenIn.allowance(owner.address, ARBITRAGEUR_ADDRESS)
        if (allowance < amountIn) {
            const tx = await this.sendTx(owner, async () =>
                tokenIn.approve(ARBITRAGEUR_ADDRESS, MaxUint256, {
                    nonce: this.nonceManager.getNonce(owner),
                }),
            )
            console.log(`approve tx: ${tx.hash}`)
            await tx.wait()
        }

        // console.log("arbitrage parameters", {
        //     tokenIn: tokenIn.target,
        //     tokenOut: tokenOut.target,
        //     amountIn,
        //     minProfit,
        // })

        let i = 1
        while (true) {
            let oneInchData = ""
            try {
                oneInchData = await this.fetch1inchSwapData({
                    src: tokenIn.target as string,
                    dst: tokenOut.target as string,
                    amount: amountIn.toString(),
                    from: ARBITRAGEUR_ADDRESS,
                    slippage: "1", // 0 ~ 50
                    disableEstimate: "true",
                    protocols: PROTOCOLS.join(","),
                })
            } catch (err: any) {
                if (err.message.includes("Too Many Requests")) {
                    console.log("Too Many Requests")
                    await sleep(1000 * randomNumberBetween(0.2, 1))
                    continue
                }
            }

            console.log(`arbitrage start: ${i++}`)

            try {
                const tx = await this.sendTx(owner, async () =>
                    arbitrageur.arbitrage1inchToUniswapV3(
                        tokenIn.target,
                        tokenOut.target,
                        amountIn,
                        minProfit,
                        500,
                        oneInchData,
                        {
                            nonce: this.nonceManager.getNonce(owner),
                        },
                    ),
                )
                console.log(`arbitrage1inchToUniswapV3 tx: ${tx.hash}`)
                await tx.wait()
            } catch (err: any) {
                const errMessage = err.message || err.reason || ""
                if (errMessage.includes(ERROR_NO_PROFIT)) {
                    // console.log("No Profit")
                } else if (errMessage.includes(ERROR_SWAP_FAIL)) {
                    // console.log("Swap Fail")
                } else {
                    throw err
                }
            }

            const nowTimestamp = Date.now() / 1000
            if (nowTimestamp - startTimestamp >= TIMEOUT_SECONDS) {
                break
            }
        }
    }

    async fetch1inchSwapData(params: Fetch1inchSwapDataParams) {
        const urlParams = new URLSearchParams(params)
        const url = `https://api.1inch.dev/swap/v5.2/8453/swap?${urlParams}`

        const res = await fetch(url, {
            method: "get",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${this.ONEINCH_API_KEY}`,
            },
        })

        if (res.status === 429) {
            throw new Error("Too Many Requests")
        }

        if (!res.ok) {
            const err = new Error("Fetch1inchSwapDataError")
            err.message = await res.text()
            throw err
        }

        const response = await res.json()
        if (!response.tx?.data) {
            const err = new Error("Fetch1inchSwapAPIDataNoData")
            err.message = await res.text()
            throw err
        }

        return response.tx.data
    }

    async sendTx(wallet: HDNodeWallet, sendTxFn: () => Promise<ContractTransactionResponse>) {
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
    const arbitrageurBase = new ArbitrageurBase()
    await arbitrageurBase.arbitrage()

    return {
        success: true,
    }
}

export const handlerBase = wrapSentryHandlerIfNeeded(handler)
