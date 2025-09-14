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

COPY apps/engine-service/src ./apps/engine-service/src
COPY apps/engine-service/tsconfig.json ./apps/engine-service/

COPY apps/backend/prisma ./apps/engine-service/prisma

WORKDIR /app/apps/engine-service
RUN npx prisma generate
RUN pnpm build

EXPOSE 3002

CMD ["pnpm", "start"]
