import { promises as fs } from "fs"
import path from "path"
import { createPublicClient, http } from "viem"

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const RPC_URL = process.env.RPC_URL
const IPFS_GATEWAY = "https://ipfs.io/ipfs/"
const IMAGES_DIR = "./images"
const MAX_CONCURRENT = 100

const client = createPublicClient({
    transport: http(RPC_URL),
})

const ERC721_ABI = [
    {
        inputs: [],
        name: "totalSupply",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ type: "string" }],
        stateMutability: "view",
        type: "function",
    },
]

function convertIpfsUrl(url) {
    if (url.startsWith("ipfs://")) {
        return url.replace("ipfs://", IPFS_GATEWAY)
    }
    return url
}

async function fetchMetadata(uri) {
    const url = convertIpfsUrl(uri)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.status}`)
    return await response.json()
}

async function downloadImage(url, filepath) {
    const imageUrl = convertIpfsUrl(url)
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(filepath, buffer)
    return response.headers.get("content-type")
}

async function isAlreadyDownloaded(tokenId) {
    const extensions = ["png", "jpg"]
    for (const ext of extensions) {
        try {
            await fs.access(path.join(IMAGES_DIR, `${tokenId}.${ext}`))
            return true
        } catch {
            continue
        }
    }
    return false
}

async function downloadToken(tokenId) {
    try {
        // Skip if already downloaded (check before any network calls)
        if (await isAlreadyDownloaded(tokenId)) {
            console.log(`[${tokenId}] Already downloaded, skipping`)
            return
        }

        console.log(`[${tokenId}] Fetching tokenURI...`)

        const tokenURI = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ERC721_ABI,
            functionName: "tokenURI",
            args: [BigInt(tokenId)],
        })

        console.log(`[${tokenId}] Fetching metadata from: ${tokenURI}`)
        const metadata = await fetchMetadata(tokenURI)

        if (!metadata.image) {
            console.log(`[${tokenId}] No image in metadata`)
            return
        }

        const imageUrl = metadata.image
        const urlParts = imageUrl.split("/").pop().split("?")[0]
        const hasExtension = urlParts.includes(".") && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(urlParts)
        const ext = hasExtension ? urlParts.split(".").pop() : "png"

        const imagePath = path.join(IMAGES_DIR, `${tokenId}.${ext}`)
        const metadataPath = path.join(IMAGES_DIR, `${tokenId}.json`)

        console.log(`[${tokenId}] Downloading image: ${imageUrl}`)
        await downloadImage(imageUrl, imagePath)
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))

        console.log(`[${tokenId}]  Downloaded successfully`)
    } catch (error) {
        console.error(`[${tokenId}]  Error: ${error.message}`)
    }
}

async function downloadBatch(tokenIds) {
    const results = []
    for (let i = 0; i < tokenIds.length; i += MAX_CONCURRENT) {
        const batch = tokenIds.slice(i, i + MAX_CONCURRENT)
        const promises = batch.map((tokenId) => downloadToken(tokenId))
        results.push(...(await Promise.allSettled(promises)))
    }
    return results
}

async function main() {
    await fs.mkdir(IMAGES_DIR, { recursive: true })

    console.log("Fetching total supply...")
    const totalSupply = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: "totalSupply",
    })

    const total = Number(totalSupply)
    console.log(`Total supply: ${total}`)

    const tokenIds = Array.from({ length: total }, (_, i) => i + 1)
    await downloadBatch(tokenIds)

    console.log("\nDownload complete!")
}

main().catch(console.error)
