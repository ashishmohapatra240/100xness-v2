FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/redis/package.json ./packages/redis/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY packages/prisma/package.json ./packages/prisma/
COPY apps/engine-service/package.json ./apps/engine-service/

RUN pnpm install --frozen-lockfile

COPY packages/redis/ ./packages/redis/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/types/ ./packages/types/
COPY apps/engine-service/src ./apps/engine-service/src
COPY apps/engine-service/tsconfig.json ./apps/engine-service/

COPY packages/prisma/prisma ./packages/prisma/prisma
COPY packages/prisma/index.ts ./packages/prisma/
COPY packages/prisma/tsconfig.json ./packages/prisma/

WORKDIR /app/packages/prisma
RUN npx prisma generate
RUN npx tsc -b

WORKDIR /app/apps/engine-service
RUN npx tsc -b

EXPOSE 3002

CMD ["node", "dist/index.js"]
