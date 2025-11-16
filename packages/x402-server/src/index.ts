import * as dotenv from 'dotenv'
import type { Address } from 'viem'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { type HttpBindings } from '@hono/node-server'
import { facilitator } from '@coinbase/x402'
import { paymentMiddleware } from 'x402-hono'
import { type RoutesConfig } from 'x402/types'
import { exact } from 'x402/schemes'

export const routesConfig: RoutesConfig = {
  'GET /debug': {
    price: '$0.0001', // the minimal price
    network: 'base',
    config: {
      discoverable: true,
      description: 'Return debug information for the payment.',
    },
  },
  'GET /mint': {
    price: '$1',
    network: 'base',
    config: {
      discoverable: true,
      description: 'Mint $NET token.',
    },
  },
}

dotenv.config()

const PORT = 3000
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS as Address

type Bindings = HttpBindings & Env
const app = new Hono<{ Bindings: Bindings }>()

app.use(logger())

app.use('*', paymentMiddleware(PAY_TO_ADDRESS, routesConfig, facilitator))

app.get('/', (c) => {
  return c.json({ message: 'OK' })
})

app.get('/hello', (c) => {
  return c.json({ message: 'Hello World' })
})

app.get('/debug', (c) => {
  const headers = Object.fromEntries(c.req.raw.headers.entries())

  const xPaymentHeader = c.req.header('X-PAYMENT')!
  const payment = exact.evm.decodePayment(xPaymentHeader)

  return c.json({
    headers,
    payment,
  })
})

app.get('/mint', (c) => {
  const paymentHeader = c.req.header('X-PAYMENT')
  let senderAddress: Address | undefined = undefined

  if (paymentHeader) {
    const payment = exact.evm.decodePayment(paymentHeader)
    console.log(JSON.stringify(payment, null, 2))
    if ('authorization' in payment.payload) {
      senderAddress = payment.payload.authorization.from as Address
    }
  }

  if (!senderAddress) {
    throw new Error('No sender address found in payment payload')
  }

  const amount = 100

  return c.json({
    message: `Minted ${amount} $NET`,
    amount,
    receiver: senderAddress,
  })
})

app.onError((err, c) => {
  return c.json(
    {
      message: err.message,
    },
    500,
  )
})

console.log(`server listening on http://localhost:${PORT}`)

export default app
