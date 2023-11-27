import { Arbitrageur__factory } from "../typechain-types"

async function main() {
    console.log(
        "arbitrageUniswapV3toVelodromeV2",
        Arbitrageur__factory.createInterface().getFunction("arbitrageUniswapV3toVelodromeV2").selector,
    )

    console.log(
        "arbitrageVelodromeV2toUniswapV3",
        Arbitrageur__factory.createInterface().getFunction("arbitrageVelodromeV2toUniswapV3").selector,
    )

    console.log(
        "arbitrageOneInchToUniswapV3",
        Arbitrageur__factory.createInterface().getFunction("arbitrageOneInchToUniswapV3").selector,
    )

    console.log("arbitrageUniswapV3", Arbitrageur__factory.createInterface().getFunction("arbitrageUniswapV3").selector)

    console.log(
        "arbitrageVelodromeV2",
        Arbitrageur__factory.createInterface().getFunction("arbitrageVelodromeV2").selector,
    )
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})

// npx hardhat run scripts/list-function-signatures.ts
// arbitrageUniswapV3toVelodromeV2 0x7cedde61
// arbitrageVelodromeV2toUniswapV3 0x14b44482
// arbitrageOneInchToUniswapV3 0x552852b9
// arbitrageUniswapV3 0x8123a68d
// arbitrageVelodromeV2 0x937b4966
