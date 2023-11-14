import { Handler } from "aws-lambda"
import { Network, JsonRpcProvider, HDNodeWallet, parseEther, MaxUint256 } from "ethers"

import { Arbitrageur__factory, IERC20__factory } from "./types"

export const base: Handler = async (event, context) => {
    const RPC_PROVIDER_URL = process.env.RPC_PROVIDER_URL!
    const OWNER_SEED_PHRASE = process.env.OWNER_SEED_PHRASE!
    const ARBITRAGEUR_ADDRESS = process.env.ARBITRAGEUR_ADDRESS!

    const ERROR_NO_PROFIT = "0xe39aafee" // NoProfit()

    console.log("config", {
        RPC_PROVIDER_URL,
        ARBITRAGEUR_ADDRESS,
    })

    const network =
        RPC_PROVIDER_URL === "http://127.0.0.1:8545" ? new Network("hardhat", 31337) : new Network("base", 8453)
    const provider = new JsonRpcProvider(RPC_PROVIDER_URL, network, {
        staticNetwork: network,
    })

    const hdNodeWallet = HDNodeWallet.fromPhrase(OWNER_SEED_PHRASE)
    const owner = hdNodeWallet.connect(provider)

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
    const minProfit = parseEther("0.001") // ~= 2 USD

    const allowance = await tokenIn.allowance(owner.address, ARBITRAGEUR_ADDRESS)
    if (allowance < amountIn) {
        const tx = await tokenIn.approve(ARBITRAGEUR_ADDRESS, MaxUint256)
        console.log(`approve tx: ${tx.hash}`)
        await tx.wait()
    }

    console.log("arbitrage parameters", {
        tokenIn: tokenIn.target,
        tokenOut: tokenOut.target,
        amountIn,
        minProfit,
    })

    for (let i = 0; i < 100; i++) {
        console.log(`arbitrage start: ${i}`)
        try {
            const tx = await arbitrageur.arbitrageVelodromeV2toUniswapV3(
                tokenIn.target,
                tokenOut.target,
                amountIn,
                minProfit,
                500,
                false,
            )
            console.log(`arbitrage tx: ${tx.hash}`)
            await tx.wait()
        } catch (err: any) {
            const errMessage = err.message || err.reason || ""
            if (errMessage.includes(ERROR_NO_PROFIT)) {
                // console.log("NoProfit")
            } else {
                throw err
            }
        }
    }

    return {
        finished: true,
    }
}
