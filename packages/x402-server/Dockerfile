FROM node:22-slim AS builder

WORKDIR /app

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/x402-server ./packages/x402-server

WORKDIR /app/packages/x402-server

RUN npm install

RUN npx tsc --project tsconfig.json

RUN npm prune --omit=dev

FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/packages/x402-server/dist ./dist
COPY --from=builder /app/packages/x402-server/node_modules ./node_modules
COPY --from=builder /app/packages/x402-server/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/index.js"]
