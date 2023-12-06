import { backOff } from "exponential-backoff"
import { Handler } from "aws-lambda"
import { random } from "lodash"
import Big from "big.js"

import { BaseArbitrageur } from "@solaris/common/src/base-arbitrageur"
import { S3 } from "@solaris/common/src/s3"
import { sleep, wrapSentryHandlerIfNeeded } from "@solaris/common/src/utils"
import { TOKENS } from "@solaris/common/src/tokens"

import { IERC20__factory } from "../types"
import { formatUnits, MaxUint256, parseUnits } from "ethers"

interface Price {
    timestamp: number
    price: string
}

interface OneInchSwapResponse {
    toAmount: string
    tx: {
        from: string
        to: string
        data: string
    }
}

class FlashArbitrageurOnOptimism extends BaseArbitrageur {
    ONEINCH_API_ENDPOINT = process.env.ONEINCH_API_ENDPOINT!
    ONEINCH_API_KEYS = process.env.ONEINCH_API_KEYS!.split(",")
    ONEINCH_AGGREGATION_ROUTER_V5 = "0x1111111254EEB25477B68fb85Ed929f73A960582"

    async start() {
        const network = this.getNetwork()
        const provider = this.getProvider(this.RPC_PROVIDER_URL, network, {
            batchStallTime: 5, // QuickNode has average 3ms latency on eu-central-1
        })

        this.owner = await this.getOwner(provider)

        const WETH = IERC20__factory.connect(TOKENS.WETH, this.owner)
        const USDCe = IERC20__factory.connect(TOKENS.USDCe, this.owner)

        const wethAmount = parseUnits("0.8", 18)
        const wethProfit = parseUnits("0.035", 18) // 80 USD

        const [wethBalance, usdceBalance] = await Promise.all([
            WETH.balanceOf(this.owner.address),
            USDCe.balanceOf(this.owner.address),
        ])

        const sellSpreadPercent = Big(5) // 5%
        const buySpreadPercent = -Big(1) // 1%

        console.log("start", {
            awsRegion: process.env.AWS_REGION,
            rpcProviderUrl: this.RPC_PROVIDER_URL,
            owner: this.owner.address,
            wethAmount,
            wethProfit,
            sellSpreadPercent: sellSpreadPercent.toFixed(),
            buySpreadPercent: buySpreadPercent.toFixed(),
        })

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

        if (wethBalance >= wethAmount) {
            console.log("Checking swap WETH to USDCe")

            const s3Path = "WETH-USDCe-prices.json"
            const oldPrices = await this.getPricesFromS3(s3Path)

            const res = await backOff(() => this.fetchOneInchSwapData(TOKENS.WETH, TOKENS.USDCe, wethAmount))
            const price = this.toPrice(wethAmount, BigInt(res.toAmount))

            const prices = this.updateRollingPrices(oldPrices, price)
            const startPrice = Big(prices[prices.length - 1].price)

            const receivedUsdceAmount = BigInt(res.toAmount)
            console.log(
                `quote: swap ${formatUnits(wethAmount, 18)} WETH to ${formatUnits(receivedUsdceAmount, 6)} USDCe`,
            )

            const priceChangePercent = price.sub(startPrice).div(startPrice).mul(100)
            console.log(`price: ${price.toFixed()}, priceChangePercent: ${priceChangePercent.toFixed(3)}%`)

            if (priceChangePercent.gte(sellSpreadPercent)) {
                console.log(`sell at ${price.toFixed()}`)
                try {
                    await this.trySwap(TOKENS.WETH, TOKENS.USDCe, wethAmount, res.tx.data)
                } catch (err: any) {
                    console.error("trySwap error", err.message)
                }
            }

            await this.updatePricesToS3(s3Path, prices)
        } else {
            console.log("Checking swap USDCe to WETH")

            const s3Path = "USDCe-WETH-prices.json"
            const oldPrices = await this.getPricesFromS3(s3Path)

            const res = await backOff(() => this.fetchOneInchSwapData(TOKENS.USDCe, TOKENS.WETH, usdceBalance))
            const price = this.toPrice(BigInt(res.toAmount), usdceBalance)

            const prices = this.updateRollingPrices(oldPrices, price)
            const startPrice = Big(prices[prices.length - 1].price)

            const receivedWethAmount = BigInt(res.toAmount)
            console.log(
                `quote: swap ${formatUnits(usdceBalance, 6)} USDCe to ${formatUnits(receivedWethAmount, 18)} WETH`,
            )

            const priceChangePercent = price.sub(startPrice).div(startPrice).mul(100)
            console.log(`price: ${price.toFixed()}, priceChangePercent: ${priceChangePercent.toFixed(3)}%`)

            if (receivedWethAmount >= wethAmount + wethProfit && priceChangePercent.lte(buySpreadPercent)) {
                console.log(`buy at ${price.toFixed()}`)
                try {
                    await this.trySwap(TOKENS.USDCe, TOKENS.WETH, usdceBalance, res.tx.data)
                } catch (err: any) {
                    console.error("trySwap error", err.message)
                }
            }

            await this.updatePricesToS3(s3Path, prices)
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
            // from: this.owner.address,
            from: "0xDBc2D0DD30313470e8134d0d1D33793700756c76",
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

        // if (res.status === 429) {
        //     throw new Error("TooManyRequests")
        // }

        // if (!res.ok) {
        //     const err = new Error("Error")
        //     err.message = await res.text()
        //     throw err
        // }

        const response = await res.json()

        // if (!response.tx?.data) {
        //     const err = new Error("NoData")
        //     err.message = await res.text()
        //     throw err
        // }

        return response as OneInchSwapResponse
    }

    async getPricesFromS3(path: string): Promise<Price[]> {
        const s3 = new S3(process.env.AWS_REGION!)
        const s3Bucket = "solaris-trading-bot"

        try {
            const pricesJson = await s3.download(s3Bucket, path)
            return JSON.parse(pricesJson)
        } catch (err: any) {
            if (err.message.includes("The specified key does not exist.")) {
                return []
            }
            throw err
        }
    }

    updateRollingPrices(prices: Price[], price: Big) {
        const newPrices = [
            {
                timestamp: Math.floor(Date.now() / 1000),
                price: price.toFixed(),
            },
            ...prices,
        ].slice(0, 60)
        console.dir(newPrices)

        return newPrices
    }

    async updatePricesToS3(path: string, prices: any) {
        const s3 = new S3(process.env.AWS_REGION!)
        const s3Bucket = "solaris-trading-bot"

        await s3.uploadJson(s3Bucket, path, prices)
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
