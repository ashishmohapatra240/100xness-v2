FROM node:22.18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/redis/package.json ./packages/redis/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY apps/price-poller-service/package.json ./apps/price-poller-service/

RUN pnpm install --no-frozen-lockfile

COPY packages/redis/index.ts ./packages/redis/
COPY packages/redis/tsconfig.json ./packages/redis/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/
COPY apps/price-poller-service/src ./apps/price-poller-service/src
COPY apps/price-poller-service/tsconfig.json ./apps/price-poller-service/

WORKDIR /app/apps/price-poller-service
RUN npx tsc -b

EXPOSE 3003

CMD ["node", "dist/index.js"]
