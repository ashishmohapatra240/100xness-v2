-- CreateEnum
CREATE TYPE "public"."Symbol" AS ENUM ('USDC', 'BTC');

-- CreateEnum
CREATE TYPE "public"."Side" AS ENUM ('long', 'short');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "public"."CloseReason" AS ENUM ('TakeProfit', 'StopLoss', 'Manual', 'Liquidation');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimal" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" UUID NOT NULL,
    "symbol" "public"."Symbol" NOT NULL,
    "balance" INTEGER NOT NULL,
    "decimals" INTEGER NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "side" "public"."Side" NOT NULL,
    "pnl" INTEGER NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 4,
    "openingPrice" INTEGER NOT NULL,
    "closingPrice" INTEGER NOT NULL,
    "status" "public"."OrderStatus" NOT NULL,
    "qty" INTEGER NOT NULL,
    "qtyDecimals" INTEGER NOT NULL DEFAULT 2,
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "takeProfit" INTEGER,
    "stopLoss" INTEGER,
    "margin" INTEGER NOT NULL,
    "closeReason" "public"."CloseReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_userId_symbol_key" ON "public"."Asset"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
