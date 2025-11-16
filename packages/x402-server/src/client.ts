import * as dotenv from 'dotenv'
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import { Address, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

dotenv.config()

const BASE_RPC_ENDPOINT_HTTP = process.env.BASE_RPC_ENDPOINT_HTTP
if (!BASE_RPC_ENDPOINT_HTTP) {
  throw new Error('BASE_RPC_ENDPOINT_HTTP env not found')
}

const PAYER_WALLET_PK = process.env.PAYER_WALLET_PK as Hex
if (!PAYER_WALLET_PK) {
  throw new Error('PAYER_WALLET_PK env not found')
}

const BASE_URL = process.env.BASE_URL
if (!BASE_URL) {
  throw new Error('BASE_URL env not found')
}

class X402Client {
  private fetchWithPayment: typeof fetch

  constructor(privateKey: Address) {
    const account = privateKeyToAccount(privateKey)
    this.fetchWithPayment = wrapFetchWithPayment(fetch, account, 1000000n)

    console.log(`BASE_URL: ${BASE_URL}`)
    console.log(`PAYER_WALLET: ${account.address}`)
  }

  async testMint() {
    console.log('\n=== Testing /mint endpoint ===')

    try {
      const response = await this.fetchWithPayment(`${BASE_URL}/mint`, {
        method: 'GET',
      })

      const body = await response.json()
      console.log('Response body:', JSON.stringify(body, null, 2))

      const paymentResponseHeader = response.headers.get('x-payment-response')
      if (paymentResponseHeader) {
        const paymentResponse = decodeXPaymentResponse(paymentResponseHeader)
        console.log('Payment response:', JSON.stringify(paymentResponse, null, 2))
      }
    } catch (error) {
      console.error('✗ /mint test failed:', error)
      if (error instanceof Error && 'response' in error) {
        const responseError = error as { response?: { data?: { error: string } } }
        console.error('Error details:', responseError.response?.data?.error)
      }
    }
  }
}

async function main() {
  try {
    const client = new X402Client(PAYER_WALLET_PK)
    await client.testMint()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

void main()
