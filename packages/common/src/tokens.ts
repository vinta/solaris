import { parseUnits } from "ethers"

export const TOKENS = {
    USDC: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    USDCe: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    USDT: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    DAI: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    WETH: "0x4200000000000000000000000000000000000006",
    OP: "0x4200000000000000000000000000000000000042",
    PERP: "0x9e1028f5f1d5ede59748ffcee5532509976840e0",
    SNX: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4",
    wstETH: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    WLD: "0xdc6ff44d5d932cbd77b52e5612ba0529dc6226f1",
    WBTC: "0x68f180fcce6836688e9084f035309e29bf0a2095",
    LYRA: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
}

// NOTE: must also update BaseArbitrageur.convertAmountToEth()
export const minProfitMap = {
    // 1 USDC = ??? TOKEN
    [TOKENS.USDC]: parseUnits("1", 6), // 1 USD
    [TOKENS.USDCe]: parseUnits("1", 6), // 1 USD
    [TOKENS.USDT]: parseUnits("1", 6), // 1 USD
    [TOKENS.DAI]: parseUnits("1", 18), // 1 USD
    [TOKENS.WETH]: parseUnits("0.0005", 18), // 1 USD
    [TOKENS.OP]: parseUnits("1", 18), // 1 US
    [TOKENS.PERP]: parseUnits("1.474802", 18), // 1 USD
    [TOKENS.SNX]: parseUnits("3", 18), // 1 USD
    [TOKENS.wstETH]: parseUnits("0.0004", 18), // 1 USD
    [TOKENS.WLD]: parseUnits("0.4", 18), // 1 USD
    [TOKENS.WBTC]: parseUnits("0.000026", 8), // 1 USD
    [TOKENS.LYRA]: parseUnits("6.875141", 18), // 1 USD
}

export const toEthPriceMap = {
    // 1 ETH = ??? TOKEN
    [TOKENS.USDC]: 2033.847474,
    [TOKENS.USDCe]: 2033.847474,
    [TOKENS.USDT]: 2033.847474,
    [TOKENS.DAI]: 2033.847474,
    [TOKENS.WETH]: 1,
    [TOKENS.OP]: 1258.072023,
    [TOKENS.PERP]: 3164.221199,
    [TOKENS.SNX]: 579.534782,
    [TOKENS.wstETH]: 0.871631,
    [TOKENS.WLD]: 849.735719,
    [TOKENS.WBTC]: 0.054425,
    [TOKENS.LYRA]: 14719.22586,
}
