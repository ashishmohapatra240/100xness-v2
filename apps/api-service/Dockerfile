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

COPY apps/api-service/src ./apps/api-service/src
COPY apps/api-service/tsconfig.json ./apps/api-service/

COPY packages/prisma/prisma ./packages/prisma/prisma

WORKDIR /app/packages/prisma
RUN npx prisma generate

WORKDIR /app/apps/api-service
RUN npx tsc -b

EXPOSE 3001

CMD ["pnpm", "start"]
