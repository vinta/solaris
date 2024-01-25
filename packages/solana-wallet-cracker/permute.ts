import { Keypair } from "@solana/web3.js"
import * as bip39 from "bip39"
import { derivePath } from "ed25519-hd-key"

function* permute(arr: string[], startIndex = 0): IterableIterator<string[]> {
    if (startIndex === arr.length - 1) {
        yield arr.slice()
        return
    }

    for (let i = startIndex; i < arr.length; i++) {
        ;[arr[startIndex], arr[i]] = [arr[i], arr[startIndex]]
        yield* permute(arr, startIndex + 1)
        ;[arr[startIndex], arr[i]] = [arr[i], arr[startIndex]]
    }
}

const publicKey = "xxx"
const mnemonic = "abc def"
const mnemonicArr = mnemonic.split(" ")

for (const currentMnemonicArr of permute(mnemonicArr)) {
    const currentMnemonicString = currentMnemonicArr.join(" ")
    console.log(currentMnemonicString)
    const seed = bip39.mnemonicToSeedSync(currentMnemonicString, "")

    // const keypair = Keypair.fromSeed(seed.slice(0, 32))

    const path = "m/44'/501'/0'/0'"
    const keypair = Keypair.fromSeed(derivePath(path, seed.toString("hex")).key)

    console.log(keypair.publicKey.toString())

    if (keypair.publicKey.toString().toLowerCase() === publicKey.toLowerCase()) {
        break
    }
}
