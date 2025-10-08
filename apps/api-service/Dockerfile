FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY packages/redis/package.json ./packages/redis/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/types/package.json ./packages/types/
COPY packages/prisma/package.json ./packages/prisma/
COPY apps/api-service/package.json ./apps/api-service/

RUN pnpm install --no-frozen-lockfile

COPY packages/redis/ ./packages/redis/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY packages/types/ ./packages/types/
COPY apps/api-service/src ./apps/api-service/src
COPY apps/api-service/tsconfig.json ./apps/api-service/

COPY packages/prisma/prisma ./packages/prisma/prisma
COPY packages/prisma/index.ts ./packages/prisma/
COPY packages/prisma/tsconfig.json ./packages/prisma/

WORKDIR /app/packages/prisma
RUN npx prisma generate
RUN npx tsc -b

WORKDIR /app/apps/api-service
RUN npx tsc -b

EXPOSE 3001

CMD ["node", "dist/index.js"]
