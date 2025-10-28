import { Handler } from "aws-lambda"
import { JsonRpcProvider } from "ethers"
import { shuffle } from "lodash"

import { RpcProvider, RPC_PROVIDERS } from "./constants"

interface BenchmarkResult {
    rpcProviderName: string
    rpcProviderUrl: string
    medianLatencyMs: number
}

class RpcBenchmark {
    async benchmark(rpcProviders: RpcProvider[]) {
        const rounds = 20
        const sampleTx = {
            from: "0xDBc2D0DD30313470e8134d0d1D33793700756c76",
            to: "0xD41e532DF38D1538656aeF70235E0d5125e6de9d",
            data: "0x70dcb9f900000000000000000000000085149247691df622eaf1a8bd0cafd40bc45154a900000000000000000000000042000000000000000000000000000000000000060000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c3160700000000000000000000000000000000000000000000000018fae27693b400000000000000000000000000000000000000000000000000000001c6bf526340000000000000000000000000000000000000000000000000000000000000000001",
        }

        const results: BenchmarkResult[] = []

        await Promise.all(
            shuffle(rpcProviders).map(async (rpcProvider) => {
                const provider = new JsonRpcProvider(rpcProvider.url, undefined, {
                    batchMaxCount: 1,
                    cacheTimeout: -1,
                })

                const latencies = []
                for (let i = 0; i < rounds; i++) {
                    const startTimestamp = Date.now() / 1000

                    try {
                        await provider.call(sampleTx) // static call
                    } catch (err: any) {
                        const errMessage = err.message || err.reason || ""
                        if (errMessage.includes("execution reverted")) {
                            // do nothing
                        }
                    }

                    const latency = Date.now() / 1000 - startTimestamp
                    latencies.push(latency)
                }
                const sortedLatencies = latencies.sort()

                results.push({
                    rpcProviderName: rpcProvider.name,
                    rpcProviderUrl: rpcProvider.url,
                    medianLatencyMs: sortedLatencies[(latencies.length / 2) | 0],
                })
            }),
        )

        results.sort(function (a, b) {
            return a.medianLatencyMs - b.medianLatencyMs
        })
        console.log(`results: ${process.env.AWS_REGION}`)
        console.dir(results)
    }
}

export const base: Handler = async (event, context) => {
    const service = new RpcBenchmark()
    await service.benchmark(RPC_PROVIDERS["base"])
}

export const optimism: Handler = async (event, context) => {
    const service = new RpcBenchmark()
    await service.benchmark(RPC_PROVIDERS["optimism"])
}
