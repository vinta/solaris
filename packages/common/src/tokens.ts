import { parseUnits } from "ethers"

export const TOKENS = {
    USDC: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    USDCe: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    WETH: "0x4200000000000000000000000000000000000006",
    OP: "0x4200000000000000000000000000000000000042",
    PERP: "0x9e1028f5f1d5ede59748ffcee5532509976840e0",
    SNX: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4",
    wstETH: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    WLD: "0xdc6ff44d5d932cbd77b52e5612ba0529dc6226f1",
    WBTC: "0x68f180fcce6836688e9084f035309e29bf0a2095",
}

const multiplier = BigInt(1)

// NOTE: must also update BaseArbitrageur.convertAmountToEth()
export const minProfitMap = {
    [TOKENS.USDC]: parseUnits("1", 6) * multiplier, // 1 USD
    [TOKENS.USDCe]: parseUnits("1", 6) * multiplier, // 1 USD
    [TOKENS.WETH]: parseUnits("0.0005", 18) * multiplier, // 1 USD
    [TOKENS.OP]: parseUnits("1", 18) * multiplier, // 1 US
    [TOKENS.PERP]: parseUnits("1", 18) * multiplier, // 1 USD
    [TOKENS.SNX]: parseUnits("3", 18) * multiplier, // 1 USD
    [TOKENS.wstETH]: parseUnits("0.0004", 18) * multiplier, // 1 USD
    [TOKENS.WLD]: parseUnits("0.4", 18) * multiplier, // 1 USD
    [TOKENS.WBTC]: parseUnits("0.000026", 8) * multiplier, // 1 USD
}

export const tokenToEthPriceMap = {
    // 1 ETH = ??? TOKEN
    [TOKENS.USDC]: 2162.564556,
    [TOKENS.USDCe]: 2162.564556,
    [TOKENS.WETH]: 1,
    [TOKENS.OP]: 1240.795357,
    [TOKENS.PERP]: 3074.280225,
    [TOKENS.SNX]: 579.534782,
    [TOKENS.wstETH]: 0.871631,
    [TOKENS.WLD]: 849.735719,
    [TOKENS.WBTC]: 0.054798,
}
