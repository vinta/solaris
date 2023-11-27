import { parseUnits } from "ethers"

const ethMinProfitForStaticCall = parseUnits("0.002", 18) // 4 USD
const ethMinProfit = parseUnits("0.0005", 18) // 1 USD
const opMinProfitForStaticCall = parseUnits("0.002", 18) // 4 USD
const opMinProfit = parseUnits("0.0005", 18) // 1 USD
const usdMinProfitForStaticCall = parseUnits("4", 6)
const usdMinProfit = parseUnits("1", 6)

const arbitrages = [
    {
        tokenIn: "USDCe",
        tokenOut: "ETH",
        amountIn: this.randomInt(1, 10),
        minProfit: parseUnits("1", 6),
        minProfitForStaticCall: parseUnits("2", 18),
        secondArbitrageFunc: ["Uniswap", "Sushiswap"],
    },
]
