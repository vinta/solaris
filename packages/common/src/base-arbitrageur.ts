import { HDNodeWallet, JsonRpcApiProviderOptions, JsonRpcProvider, Network, formatUnits, parseUnits } from "ethers"

import { NonceManager } from "@solaris/common/src/nonce-manager"
import { TOKENS, tokenToEthPriceMap } from "./constants"

export abstract class BaseArbitrageur {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    SEQUENCER_RPC_PROVIDER_URL = process.env.SEQUENCER_RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)

    GAS_LIMIT_PER_BLOCK = BigInt(8000000)

    nonceManager = new NonceManager()
    owner!: HDNodeWallet

    getNetwork() {
        return new Network(this.NETWORK_NAME, this.NETWORK_CHAIN_ID)
    }

    getProvider(rpcProviderUrl: string, network: Network, options: JsonRpcApiProviderOptions) {
        return new JsonRpcProvider(rpcProviderUrl, network, {
            staticNetwork: network,
            ...options,
        })
    }

    async getOwner(provider: JsonRpcProvider) {
        const hdNodeWallet = HDNodeWallet.fromPhrase(this.OWNER_SEED_PHRASE)
        const owner = hdNodeWallet.connect(provider)
        await this.nonceManager.register(owner)
        return owner
    }

    calculateGas(token: string, profit: bigint) {
        // transactionFee = gasUsage * gasPrice + l1Fee
        // gasPrice = baseFee + maxPriorityFeePerGas
        // let transactionFee = profit * 0.5
        // maxPriorityFeePerGas = ((profit * 0.5 - l1Fee) / gasUsage) - baseFee
        const gasUsage = BigInt(500000)
        const l1Fee = BigInt(0)
        const baseFee = BigInt(0)
        const minMaxPriorityFeePerGas = BigInt(1000000000) // 1 Gwei

        const bufferedProfit = (profit * BigInt(5)) / BigInt(10)
        const bufferedProfitInEth = this.convertAmountToEth(token, bufferedProfit)
        let maxPriorityFeePerGas = (bufferedProfitInEth - l1Fee) / gasUsage - baseFee
        if (maxPriorityFeePerGas < minMaxPriorityFeePerGas) {
            maxPriorityFeePerGas = minMaxPriorityFeePerGas
        }

        return {
            type: 2,
            maxFeePerGas: maxPriorityFeePerGas,
            maxPriorityFeePerGas,
        }
    }

    convertAmountToEth(token: string, amount: bigint) {
        let amountInEth
        if (token === TOKENS.WETH) {
            amountInEth = amount
        } else if (token === TOKENS.USDC || token === TOKENS.USDCe) {
            const amountX10 = Number(formatUnits(amount, 6))
            const amountInEthX10 = amountX10 / tokenToEthPriceMap[token]
            amountInEth = parseUnits(amountInEthX10.toFixed(18), 18)
        } else if (token === TOKENS.WBTC) {
            const amountX10 = Number(formatUnits(amount, 8))
            const amountInEthX10 = amountX10 / tokenToEthPriceMap[token]
            amountInEth = parseUnits(amountInEthX10.toFixed(18), 18)
        } else {
            const amountX10 = Number(formatUnits(amount, 18))
            const amountInEthX10 = amountX10 / tokenToEthPriceMap[token]
            amountInEth = parseUnits(amountInEthX10.toFixed(18), 18)
        }

        return amountInEth
    }

    async sendTx(wallet: HDNodeWallet, sendTxFn: () => Promise<void>) {
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
