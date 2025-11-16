# x402 Server

Minimal API server secured with the x402 payments protocol.

The package ships two runtimes:

- `index.ts` – a Hono server for local testing or containerized deployments
- `worker.ts` – a Cloudflare Worker entry point that runs at the edge

Both runtimes expose the same payment-protected endpoints.

## Prerequisites

- Node.js >= 22.0.0
- npm (comes with Node.js)
- A Coinbase Developer Platform account (optional, for facilitator mode)
- An Alchemy API key for Base network RPC access

## Environment Setup

1. **Copy the environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables in `.env`**:
   - `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`: Get from https://portal.cdp.coinbase.com/
   - `PAYER_WALLET_PK`: Private key for client testing (use a test wallet only)
   - `BASE_RPC_ENDPOINT_HTTP`: Your Alchemy RPC endpoint for Base network
   - `BASE_URL`: Server URL (use `http://localhost:8787` for local dev)

3. **Set the payment receiving address**:
   - For local development, set `PAY_TO_ADDRESS` env var in `.env`
   - For Cloudflare Workers deployment:
     ```bash
     wrangler secret put PAY_TO_ADDRESS
     ```

## Cloudflare Worker Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure `wrangler.toml`**:
   - Uncomment and set `PAY_TO_ADDRESS` in the `[vars]` section, or use `wrangler secret put`
   - Optional: Configure custom domain in `[[routes]]` section

3. **Local edge preview**:
   ```bash
   npm run server
   ```

4. **Deploy to Cloudflare Workers**:
   ```bash
   npm run deploy
   ```
   The `compatibility_flags = ["nodejs_compat"]` setting allows the `x402` SDK to use Node globals such as `Buffer`.

5. **Optional: Bind a custom domain**:
   - Add your domain to Cloudflare with a proxied DNS record
   - Uncomment the `[[routes]]` section in `wrangler.toml` and set your domain pattern
   - On first deploy, Wrangler will prompt you to verify ownership
   - Verify routes with: `npx wrangler routes`

## Local Development

Run the server locally:
```bash
npm run server
```

Test the client:
```bash
npm run client
```

## Modifying the API

- Add or edit protected endpoints in `src/index.ts` by updating the `routesConfig` object
- The `paymentMiddleware` automatically enforces payments for configured routes
- All routes use the x402 payment protocol for authorization
