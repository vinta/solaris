import { Keypair } from "@solana/web3.js"
import * as bip39 from "bip39"
import { derivePath } from "ed25519-hd-key"

function swapElements(array, index1, index2) {
    let result = [...array];
    [result[index1], result[index2]] = [result[index2], result[index1]];
    return result;
}

function* generateSwaps(arr, swapsPerRound) {
    const n = arr.length;

    function isSwapValid(usedSwaps, i, j) {
        return usedSwaps.every(swap => i !== swap[0] && i !== swap[1] && j !== swap[0] && j !== swap[1]);
    }

    function* recursiveSwap(currentArray, depth, usedSwaps) {
        if (depth === swapsPerRound) {
            yield currentArray;
            return;
        }

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (isSwapValid(usedSwaps, i, j)) {
                    let swappedArray = swapElements(currentArray, i, j);
                    yield* recursiveSwap(swappedArray, depth + 1, [...usedSwaps, [i, j]]);
                }
            }
        }
    }

    yield* recursiveSwap(arr, 0, []);
}

const args = process.argv.slice(2);
const swapsPerRound = parseInt(args[0])
console.log(`swapsPerRound: ${swapsPerRound}`)

const publicKey = "xxx"
const mnemonic = "abc def"
const arr = mnemonic.split(" ")

for (let swappedArr of generateSwaps(arr, swapsPerRound)) {
    // console.table(swappedArr)
    const currentMnemonicString = swappedArr.join(" ")
    console.log(swapsPerRound, currentMnemonicString)
    const seed = bip39.mnemonicToSeedSync(currentMnemonicString, "")

    // const keypair = Keypair.fromSeed(seed.slice(0, 32))
    const path = "m/44'/501'/0'/0'"
    const keypair = Keypair.fromSeed(derivePath(path, seed.toString("hex")).key)

    const currentPublicKey = keypair.publicKey.toString()
    console.log(currentPublicKey)

    if (currentPublicKey.toLowerCase() === publicKey.toLowerCase()) {
        console.log("FOUND!")
        break
    }
}
