import { Mutex } from "async-mutex"
import { HDNodeWallet } from "ethers"

interface NonceMutex {
    nextNonce: number
    mutex: Mutex
}

export class NonceManager {
    private readonly walletNonceMutexMap: Record<string, NonceMutex> = {}

    // FIXME: if the same wallet call register() twice within a short period of time,
    // it will get the same nonce. Especially when triggerring from events
    async register(wallet: HDNodeWallet) {
        const walletAddress = wallet.address
        if (!this.walletNonceMutexMap[walletAddress]) {
            this.walletNonceMutexMap[walletAddress] = {
                nextNonce: await wallet.getNonce(),
                mutex: new Mutex(),
            }
        }
    }

    getNonce(wallet: HDNodeWallet) {
        return this.walletNonceMutexMap[wallet.address].nextNonce
    }

    increaseNonce(wallet: HDNodeWallet) {
        this.walletNonceMutexMap[wallet.address].nextNonce++
    }

    async resetNonce(wallet: HDNodeWallet) {
        this.walletNonceMutexMap[wallet.address].nextNonce = await wallet.getNonce()
    }

    async lock(wallet: HDNodeWallet) {
        return this.walletNonceMutexMap[wallet.address].mutex.acquire()
    }
}
