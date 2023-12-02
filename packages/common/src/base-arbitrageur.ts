import {
    HDNodeWallet,
    JsonRpcApiProviderOptions,
    JsonRpcProvider,
    Network,
    TransactionResponse,
    formatUnits,
    parseUnits,
} from "ethers"

import { NonceManager } from "@solaris/common/src/nonce-manager"

import { TOKENS, tokenToEthPriceMap } from "./tokens"

export abstract class BaseArbitrageur {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    SEQUENCER_RPC_PROVIDER_URL = process.env.SEQUENCER_RPC_PROVIDER_URL!
    OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!
    TIMEOUT_SECONDS = parseFloat(process.env.TIMEOUT_SECONDS!)

    GAS_LIMIT = BigInt(800_000)

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
        const gasUsage = BigInt(500_000)
        const l1Fee = BigInt(0)
        const baseFee = BigInt(0)
        const minMaxPriorityFeePerGas = BigInt(1000000000) // 1 Gwei

        const bufferedProfit = (profit * BigInt(6)) / BigInt(10)
        const bufferedProfitInEth = this.convertAmountToEth(token, bufferedProfit)

        const maxPriorityFeePerGas = (bufferedProfitInEth - l1Fee) / gasUsage - baseFee
        if (maxPriorityFeePerGas < minMaxPriorityFeePerGas) {
            return {}
        }

        return {
            type: 2,
            maxFeePerGas: maxPriorityFeePerGas,
            maxPriorityFeePerGas,
        }
    }

    convertAmountToEth(token: string, amount: bigint) {
        if (token === TOKENS.WETH) {
            return amount
        }

        let amountX10: number
        if (token === TOKENS.USDC || token === TOKENS.USDCe) {
            amountX10 = Number(formatUnits(amount, 6))
        } else if (token === TOKENS.WBTC) {
            amountX10 = Number(formatUnits(amount, 8))
        } else {
            amountX10 = Number(formatUnits(amount, 18))
        }

        const amountInEthX10 = amountX10 / tokenToEthPriceMap[token]

        return parseUnits(amountInEthX10.toFixed(18), 18)
    }

    async sendTx(wallet: HDNodeWallet, sendTxFunc: () => Promise<TransactionResponse>) {
        const release = await this.nonceManager.lock(wallet)
        try {
            const tx = await sendTxFunc()
            this.nonceManager.increaseNonce(wallet)
            return tx
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (err.code === "NONCE_EXPIRED" || errMessage.includes("invalid transaction nonce")) {
                await this.nonceManager.resetNonce(wallet)
                throw new Error("ResetNonce")
            }
            throw err
        } finally {
            release()
        }
    }
}
