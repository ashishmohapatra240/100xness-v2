FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/redis/package.json ./packages/redis/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY apps/price-poller-service/package.json ./apps/price-poller-service/

RUN pnpm install --frozen-lockfile

COPY packages/redis/ ./packages/redis/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/types/ ./packages/types/
COPY apps/price-poller-service/src ./apps/price-poller-service/src
COPY apps/price-poller-service/tsconfig.json ./apps/price-poller-service/

WORKDIR /app/apps/price-poller-service
RUN npx tsc -b

EXPOSE 3003

CMD ["node", "dist/index.js"]
