FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/

RUN mkdir -p packages/redis packages/typescript-config packages/types packages/ui packages/eslint-config

COPY packages/redis/ ./packages/redis/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/types/ ./packages/types/

RUN pnpm install --frozen-lockfile

COPY apps/price-poller-service/src ./apps/price-poller-service/src
COPY apps/price-poller-service/tsconfig.json ./apps/price-poller-service/

WORKDIR /app/apps/price-poller-service
RUN npx tsc -b

EXPOSE 3003

CMD ["pnpm", "start"]
