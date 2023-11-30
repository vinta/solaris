import { HDNodeWallet, JsonRpcApiProviderOptions, JsonRpcProvider, Network } from "ethers"

import { NonceManager } from "@solaris/common/src/nonce-manager"

export class BaseArbitrageur {
    NETWORK_NAME = process.env.NETWORK_NAME!
    NETWORK_CHAIN_ID = parseInt(process.env.NETWORK_CHAIN_ID!)
    RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    SEQUENCER_RPC_PROVIDER_URL = process.env.SEQUENCER_RPC_PROVIDER_URL!
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
    ERROR_LT_MINQUOTEAMOUNT = "quoteAmount_LT_minQuoteAmount"
    ERROR_NOT_ORACLE_FEASIBLE = "!ORACLE_FEASIBLE"

    // MummyRouter
    ERROR_INSUFFICIENT_AMOUNTOUT = "insufficient amountOut"
    ERROR_POOLAMOUNT_LT_BUFFER = "poolAmount < buffer"

    nonceManager = new NonceManager()
    owner!: HDNodeWallet
    ownerWithSequencerProvider!: HDNodeWallet

    protected getNetwork() {
        return new Network(this.NETWORK_NAME, this.NETWORK_CHAIN_ID)
    }

    protected getProvider(rpcProviderUrl: string, network: Network, options: JsonRpcApiProviderOptions) {
        return new JsonRpcProvider(rpcProviderUrl, network, {
            staticNetwork: network,
            ...options,
        })
    }

    protected async getOwner(provider: JsonRpcProvider) {
        const hdNodeWallet = HDNodeWallet.fromPhrase(this.OWNER_SEED_PHRASE)
        const owner = hdNodeWallet.connect(provider)
        await this.nonceManager.register(owner)
        return owner
    }

    protected calculateGas(token: string, profit: bigint) {
        // gasPrice = baseFee + maxPriorityFeePerGas
        // transactionFee = gasUsage * gasPrice
        return {
            type: 2,
            // maxFeePerGas: 2000000000, // Max: 2 Gwei
            // maxPriorityFeePerGas: 1500000000, // Max Priority: 1.5 Gwei
            maxFeePerGas: 10000000000, // Max: 10 Gwei
            maxPriorityFeePerGas: 7000000000, // Max Priority: 7 Gwei
        }
    }

    protected async sendTx(wallet: HDNodeWallet, sendTxFn: () => Promise<void>) {
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
