import { Handler } from "aws-lambda"
import { random } from "lodash"
import Big from "big.js"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { sleep, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"
import { TOKENS } from "@solaris/common/src/tokens"

import { FlashArbitrageur, FlashArbitrageur__factory, IERC20__factory } from "../types"
import { formatUnits, MaxUint256, parseUnits } from "ethers"

class FlashArbitrageurOnOptimism extends BaseArbitrageur {
    ONEINCH_API_ENDPOINT = process.env.ONEINCH_API_ENDPOINT!
    ONEINCH_API_KEYS = process.env.ONEINCH_API_KEYS!.split(",")
    ONEINCH_AGGREGATION_ROUTER_V5 = "0x1111111254EEB25477B68fb85Ed929f73A960582"

    arbitrageur!: FlashArbitrageur

    async start() {
        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1
        })

        this.owner = await this.getOwner(provider)
        this.arbitrageur = FlashArbitrageur__factory.connect(this.ARBITRAGEUR_ADDRESS, this.owner)

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            arbitrageur: this.ARBITRAGEUR_ADDRESS,
            owner: this.owner.address,
        })

        const WETH = IERC20__factory.connect(TOKENS.WETH, this.owner)
        const USDCe = IERC20__factory.connect(TOKENS.USDCe, this.owner)

        {
            const allowance = await WETH.allowance(this.owner.address, this.ONEINCH_AGGREGATION_ROUTER_V5)
            if (allowance === BigInt(0)) {
                console.log("approve WETH")
                const approveTx = await this.sendTx(this.owner, async () => {
                    return await WETH.approve(this.ONEINCH_AGGREGATION_ROUTER_V5, MaxUint256, {
                        nonce: this.nonceManager.getNonce(this.owner),
                        chainId: this.NETWORK_CHAIN_ID,
                    })
                })
                await approveTx.wait()
            }
        }

        {
            const allowance = await USDCe.allowance(this.owner.address, this.ONEINCH_AGGREGATION_ROUTER_V5)
            if (allowance === BigInt(0)) {
                console.log("approve USDCe")
                const approveTx = await this.sendTx(this.owner, async () => {
                    return await USDCe.approve(this.ONEINCH_AGGREGATION_ROUTER_V5, MaxUint256, {
                        nonce: this.nonceManager.getNonce(this.owner),
                        chainId: this.NETWORK_CHAIN_ID,
                    })
                })
                await approveTx.wait()
            }
        }

        const wethAmount = parseUnits("0.1", 18)
        const wethProfit = parseUnits("0.005", 18) // 10 USD

        let [wethBalance, usdceBalance] = await Promise.all([
            WETH.balanceOf(this.owner.address),
            USDCe.balanceOf(this.owner.address),
        ])

        let startPrice: Big | undefined = undefined
        let sellSpreadPercent = Big(5) // 5%
        let buySpreadPercent = -Big(1) // 1%

        while (true) {
            await sleep(1000)

            if (wethBalance >= wethAmount) {
                console.log("Checking swap WETH to USDCe")

                let res
                try {
                    res = await this.fetchOneInchSwapData(TOKENS.WETH, TOKENS.USDCe, wethAmount)
                } catch (err: any) {
                    console.log("fetchOneInchSwapData error", err.message)
                    continue
                }
                const price = this.toPrice(wethAmount, res.toAmount)

                if (!startPrice) {
                    startPrice = price
                    console.log(`startPrice: ${startPrice.toFixed()}`)
                    continue
                }

                const priceChangePercent = price.sub(startPrice).div(startPrice).mul(100)
                console.log(`price: ${price.toFixed()}, priceChangePercent: ${priceChangePercent.toFixed(3)}%`)
                if (priceChangePercent.gte(sellSpreadPercent)) {
                    console.log(`sell at ${price.toFixed()}`)
                    const success = await this.trySwap(TOKENS.WETH, TOKENS.USDCe, wethAmount, res.tx.data)
                    if (success) {
                        startPrice = undefined
                        wethBalance = await WETH.balanceOf(this.owner.address)
                        usdceBalance = await USDCe.balanceOf(this.owner.address)
                    }
                }
            } else {
                console.log("Checking swap USDCe to WETH")

                const res = await this.fetchOneInchSwapData(TOKENS.USDCe, TOKENS.WETH, usdceBalance)
                const price = this.toPrice(res.toAmount, usdceBalance)

                if (!startPrice) {
                    startPrice = price
                    console.log(`startPrice: ${startPrice.toFixed()}`)
                    continue
                }

                const priceChangePercent = price.sub(startPrice).div(startPrice).mul(100)
                console.log(`price: ${price.toFixed()}, priceChangePercent: ${priceChangePercent.toFixed(3)}%`)

                const receivedWethAmount = BigInt(res.toAmount)
                console.log(`receivedWethAmount: ${formatUnits(receivedWethAmount)}`)

                if (receivedWethAmount >= wethAmount + wethProfit && priceChangePercent.lte(buySpreadPercent)) {
                    console.log(`buy at ${price.toFixed()}`)
                    const success = await this.trySwap(TOKENS.USDCe, TOKENS.WETH, usdceBalance, res.tx.data)
                    if (success) {
                        startPrice = undefined
                        wethBalance = await WETH.balanceOf(this.owner.address)
                        usdceBalance = await USDCe.balanceOf(this.owner.address)
                    }
                }
            }
        }
    }

    toPrice(wethAmount: bigint, usdcAmount: bigint) {
        const _wethAmount = Big(formatUnits(wethAmount, 18))
        const _usdcAmount = Big(formatUnits(usdcAmount, 6))
        return _usdcAmount.div(_wethAmount)
    }

    async fetchOneInchSwapData(tokenIn: string, tokenOut: string, amountIn: bigint) {
        const params = {
            src: tokenIn,
            dst: tokenOut,
            amount: amountIn.toString(),
            from: this.owner.address,
            // from: "0x88F59F8826af5e695B13cA934d6c7999875A9EeA",
            slippage: "1",
            disableEstimate: "true",
        }
        const urlParams = new URLSearchParams(params)
        const url = `${this.ONEINCH_API_ENDPOINT}/swap?${urlParams}`

        const oneInchApiKey = this.ONEINCH_API_KEYS[random(0, this.ONEINCH_API_KEYS.length - 1)]

        const res = await fetch(url, {
            method: "get",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${oneInchApiKey}`,
            },
        })

        if (res.status === 429) {
            throw new Error("TooManyRequests")
        }

        if (!res.ok) {
            const err = new Error("Error")
            err.message = await res.text()
            throw err
        }

        const response = await res.json()

        if (!response.tx?.data) {
            const err = new Error("NoData")
            err.message = await res.text()
            throw err
        }

        return response
    }

    async trySwap(tokenIn: string, tokenOut: string, amountIn: bigint, data: string) {
        try {
            await this.swapOnOneInch(tokenIn, tokenOut, amountIn, data)
            return true
        } catch (err: any) {
            console.log("swap error", err.message)
            return false
        }
    }

    async swapOnOneInch(tokenIn: string, tokenOut: string, amountIn: bigint, data: string) {
        const txOptions = {
            nonce: this.nonceManager.getNonce(this.owner),
            chainId: this.NETWORK_CHAIN_ID,
            // gasLimit: (mostProfitableResult.estimatedGas * BigInt(120)) / BigInt(100), // x 1.2
            // type: gas.type,
            // maxFeePerGas: gas.maxFeePerGas,
            // maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        }

        const tx = await this.sendTx(this.owner, async () => {
            // NOTE: fill all required fields to avoid calling signer.populateTransaction(tx)
            return await this.owner.sendTransaction({
                to: this.ONEINCH_AGGREGATION_ROUTER_V5,
                data: data,
                ...txOptions,
            })
        })
        console.log("swap tx sent", tx.hash)
        await tx.wait()
        console.log("swap tx mined", tx.hash)
    }
}

const handler: Handler = async (event, context) => {
    const service = new FlashArbitrageurOnOptimism()
    await service.start()
}

export const optimism = wrapSentryHandlerIfNeeded(handler)
