export interface RpcProvider {
    name: string
    url: string
}

export const RPC_PROVIDERS: Record<string, RpcProvider[]> = {
    base: [
        {
            name: "Official",
            url: "https://mainnet.base.org",
        },
        {
            name: "QuickNode",
            url: process.env.QUICKNODE_BASE_RPC_ENDPOINT!,
        },
        {
            name: "Alchemy",
            url: process.env.ALCHEMY_BASE_RPC_ENDPOINT!,
        },
        {
            name: "Infura",
            url: process.env.INFURA_BASE_RPC_ENDPOINT!,
        },
    ],
    optimism: [
        {
            name: "Official",
            url: "https://mainnet.optimism.io",
        },
        {
            name: "QuickNode",
            url: process.env.QUICKNODE_OPTIMISM_RPC_ENDPOINT!,
        },
        {
            name: "Alchemy",
            url: process.env.ALCHEMY_OPTIMISM_RPC_ENDPOINT!,
        },
        {
            name: "Infura",
            url: process.env.INFURA_OPTIMISM_RPC_ENDPOINT!,
        },
    ],
}
