import dotenv from "dotenv";
dotenv.config();

import { redis } from "@repo/redis";
import { PrismaClient } from "@prisma/client";

const client = redis.duplicate();
const prisma = new PrismaClient();

type UserBalances = Record<string, number>;

interface Order {
  id: string;
  userId: string;
  asset: string;
  side: "buy" | "sell";
  qty: number;
  leverage?: number;
  openingPrice: number;
  createdAt: number;
  status: string;
  takeProfit?: number;
  stopLoss?: number;
}

let open_orders: Order[] = [];
let balances: Record<string, UserBalances> = {};
let prices: Record<string, number> = { BTC: 2000 };
let bidPrices: Record<string, number> = { BTC: 1995 };
let askPrices: Record<string, number> = { BTC: 2005 };

let lastId = "$";

async function updateBalanceInDatabase(userId: string, symbol: string, newBalance: number) {
  try {
    await prisma.asset.upsert({
      where: {
        user_symbol_unique: {
          userId,
          symbol: symbol as any
        }
      },
      create: {
        userId,
        symbol: symbol as any,
        balance: Math.round(newBalance * 100),
        decimals: 2
      },
      update: {
        balance: Math.round(newBalance * 100)
      }
    });
    console.log(`Updated ${symbol} balance for user ${userId}: ${newBalance}`);
  } catch (error) {
    console.error(`Failed to update balance for user ${userId}:`, error);
  }
}

async function createSnapshot() {
  try {
    for (const order of open_orders) {
      const symbol = order.asset;
      const currentBidPrice = bidPrices[symbol] ?? bidPrices.BTC;
      const currentAskPrice = askPrices[symbol] ?? askPrices.BTC;

      let currentPnl = 0;
      if (currentBidPrice && currentAskPrice) {
        const currentPriceForOrder =
          order.side === "buy" ? currentBidPrice : currentAskPrice;
        currentPnl =
          order.side === "buy"
            ? (currentPriceForOrder - order.openingPrice) * order.qty
            : (order.openingPrice - currentPriceForOrder) * order.qty;
      }

      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          side: order.side == "buy" ? "long" : "short",
          pnl: Math.round(currentPnl * 10000),
          decimals: 4,
          openingPrice: Math.round(order.openingPrice * 10000),
          closingPrice: 0,
          status: "open",
          qty: Math.round(order.qty * 100),
          qtyDecimals: 2,
          leverage: order.leverage || 1,
          takeProfit: order.takeProfit
            ? Math.round(order.takeProfit * 10000)
            : null,
          stopLoss: order.stopLoss ? Math.round(order.stopLoss * 10000) : null,
          margin: Math.round(
            (order.openingPrice * order.qty * 100) / (order.leverage || 1)
          ),
        },
        create: {
          id: order.id,
          userId: order.userId,
          side: order.side === "buy" ? "long" : "short",
          pnl: Math.round(currentPnl * 10000),
          decimals: 4,
          openingPrice: Math.round(order.openingPrice * 10000),
          closingPrice: 0,
          status: "open",
          qty: Math.round(order.qty * 100),
          qtyDecimals: 2,
          leverage: order.leverage || 1,
          takeProfit: order.takeProfit
            ? Math.round(order.takeProfit * 10000)
            : null,
          stopLoss: order.stopLoss ? Math.round(order.stopLoss * 10000) : null,
          margin: Math.round(
            (order.openingPrice * order.qty * 100) / (order.leverage || 1)
          ),
          createdAt: new Date(order.createdAt),
        } as any,
      });
    }

    await checkLiquidations();

    for (const [userId, userBalances] of Object.entries(balances)) {
      for (const [symbol, balance] of Object.entries(userBalances)) {
        await updateBalanceInDatabase(userId, symbol, balance);
      }
    }

    console.log("snapshot sent");
  } catch (e) {
    console.log(e);
  }
}

async function processOrderLiquidation(
  order: Order,
  currentPriceForOrder: number,
  context: string = "price-update"
) {
  const pnl =
    order.side === "buy"
      ? (currentPriceForOrder - order.openingPrice) * order.qty
      : (order.openingPrice - currentPriceForOrder) * order.qty;

  let reason: "TakeProfit" | "StopLoss" | "margin" | undefined;

  if (!reason && order.takeProfit != null) {
    if (
      order.side === "buy"
        ? currentPriceForOrder >= order.takeProfit
        : currentPriceForOrder <= order.takeProfit
    )
      reason = "TakeProfit";
  }

  if (!reason && order.stopLoss != null) {
    if (
      order.side === "buy"
        ? currentPriceForOrder <= order.stopLoss
        : currentPriceForOrder >= order.stopLoss
    ) {
      reason = "StopLoss";
    }
  }

  if (!reason && order.leverage) {
    const initialMargin = (order.openingPrice * order.qty) / order.leverage;
    const remainingMargin = initialMargin + pnl;
    const liquidationThreshold =
      order.leverage === 1 ? initialMargin * 0.05 : initialMargin * 0.05;

    if (remainingMargin <= liquidationThreshold) {
      reason = "margin";
      console.log(
        `${context} liquidation: order ${order.id} liquidated (remaining: ${remainingMargin}, threshold: ${liquidationThreshold})`
      );
    }
  }

  if (reason) {
    if (!balances[order.userId]) balances[order.userId] = {};

    if (reason === "margin") {
      const initialMargin =
        (order.openingPrice * order.qty) / (order.leverage || 1);
      const remainingMargin = Math.max(0, initialMargin + pnl);
      balances[order.userId]!.USDC =
        (balances[order.userId]!.USDC || 0) + remainingMargin;
      
      const userBalance = balances[order.userId];
      if (userBalance?.USDC !== undefined) {
        await updateBalanceInDatabase(order.userId, "USDC", userBalance.USDC);
      }
      
      console.log(
        `Liquidated order ${order.id}: remaining margin = ${remainingMargin}`
      );
    } else {
      const initialMargin =
        (order.openingPrice * order.qty) / (order.leverage || 1);
      balances[order.userId]!.USDC =
        (balances[order.userId]!.USDC || 0) + initialMargin + pnl;
      
      const userBalance = balances[order.userId];
      if (userBalance?.USDC !== undefined) {
        await updateBalanceInDatabase(order.userId, "USDC", userBalance.USDC);
      }
      
      console.log(
        `Closed order ${order.id} (${reason}): returned ${initialMargin + pnl}`
      );
    }

    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "closed",
          pnl: Math.round(pnl * 10000),
          closingPrice: Math.round(currentPriceForOrder * 10000),
          closedAt: new Date(),
          closeReason: reason as any,
        },
      });
    } catch (e) {
      console.log(`error on ${context} closing:`, e);
    }

    await client
      .xadd(
        "callback-queue",
        "*",
        "id",
        order.id,
        "status",
        "closed",
        "reason",
        reason,
        "pnl",
        pnl.toString()
      )
      .catch((err) =>
        console.error(`Failed to send ${context} liquidation callback:`, err)
      );

    return { liquidated: true, pnl, reason };
  }

  return { liquidated: false, pnl };
}

async function checkLiquidations() {
  for (let i = open_orders.length - 1; i >= 0; i--) {
    const order = open_orders[i];
    if (!order) continue;

    const symbol = order.asset;
    const currentBidPrice = bidPrices[symbol] ?? bidPrices.BTC;
    const currentAskPrice = askPrices[symbol] ?? askPrices.BTC;

    if (!currentBidPrice || !currentAskPrice) continue;

    const currentPriceForOrder =
      order.side === "buy" ? currentBidPrice : currentAskPrice;

    const result = await processOrderLiquidation(
      order,
      currentPriceForOrder,
      "periodic-check"
    );

    if (result.liquidated) {
      open_orders.splice(i, 1);
    }
  }
}

async function loadSnapshot() {
  try {
    const dbOrders = await prisma.order.findMany({
      where: { status: "open" },
    });


    open_orders = dbOrders.map((order) => ({
      id: order.id,
      userId: order.userId,
      asset: "BTC",
      side: order.side === "long" ? "buy" : "sell",
      qty: order.qty / 100,
      leverage: order.leverage,
      openingPrice: order.openingPrice / 10000,
      createdAt: order.createdAt.getTime(),
      status: "open",
      takeProfit: order.takeProfit ? order.takeProfit / 10000 : undefined,
      stopLoss: order.stopLoss ? order.stopLoss / 10000 : undefined,
    }));

    console.log(`loaded ${open_orders.length} open orders from the database`);
    console.log(
      "Order IDs loaded:",
      open_orders.map((o) => `${o.id.slice(0, 8)}...`)
    );

    balances = {};
  } catch (e) {
    console.log(e);
  }
}

setInterval(createSnapshot, 10000);

async function engine() {
  console.log("Brumm brum, starting Trading Engine on port 3002");

  await loadSnapshot();

  while (true) {
    try {
      const response = await client.xread(
        "BLOCK",
        0,
        "STREAMS",
        "engine-stream",
        lastId
      );
      if (!response || !response?.length) continue;

      const first = response[0];
      if (!first) continue;
      const [stream, messages] = first;

      for (const [id, fields] of messages) {
        lastId = id;
        const raw = fields[1];
        if (!raw) continue;

        let msg: any;
        try {
          msg = JSON.parse(raw);
          console.log(`[ENGINE] Received message from stream:`, msg);
        } catch {
          console.log(`[ENGINE] Failed to parse message:`, raw);
          continue;
        }

        const { kind, payload } = msg.request || msg;

        switch (kind) {
          case "price-update": {
            const data = payload?.data || payload;
            if (data && data.s) {
              const symbol = data.s.replace("_USDC", "");
              const bidPrice = data.b ? parseFloat(data.b) : null;
              const askPrice = data.a ? parseFloat(data.a) : null;

              if (bidPrice && askPrice) {
                const currentPrice = (bidPrice + askPrice) / 2;
                prices[symbol] = currentPrice;
                bidPrices[symbol] = bidPrice;
                askPrices[symbol] = askPrice;
                console.log(
                  `Price updated: ${symbol} = ${prices[symbol]} (bid: ${bidPrice}, ask: ${askPrice})`
                );

                //liquidation
                for (let i = open_orders.length - 1; i >= 0; i--) {
                  const order = open_orders[i];
                  if (order?.asset !== symbol) continue;

                  const currentPriceForOrder =
                    order!.side === "buy" ? bidPrice : askPrice;

                  const result = await processOrderLiquidation(order!, currentPriceForOrder, "price-update");

                  if (result.liquidated) {
                    open_orders.splice(i, 1);
                  }
                }
              }
            }
            break;
          }
          case "create-order": {
            console.log(`[ENGINE] Processing create-order request:`, payload);
            const {
              id: orderId,
              userId,
              asset,
              side,
              qty,
              leverage,
              balanceSnapshot,
            } = payload ?? {};

            if (!userId || !asset || qty == null || !side || !orderId) {
              console.log("missing required fields", {
                orderId,
                userId,
                asset,
                qty,
                side,
              });
              console.log(
                `[ENGINE] Sending invalid_order callback for order ${orderId || "unknown"}`
              );
              await client
                .xadd(
                  "callback-queue",
                  "*",
                  "id",
                  orderId || "unknown",
                  "status",
                  "invalid_order"
                )
                .catch((err) =>
                  console.error("Failed to send invalid_order callback:", err)
                );
              break;
            }

            const currentPrice = prices[asset] ?? prices.BTC;
            const bidPrice = bidPrices[asset] ?? bidPrices.BTC;
            const askPrice = askPrices[asset] ?? askPrices.BTC;

            if (!currentPrice || !bidPrice || !askPrice) {
              console.log("no price available", {
                orderId,
                asset,
              });
              console.log(
                `[ENGINE] Sending no_price callback for order ${orderId}`
              );
              await client
                .xadd(
                  "callback-queue",
                  "*",
                  "id",
                  orderId,
                  "status",
                  "no_price"
                )
                .catch((err) =>
                  console.error("Failed to send no_price callback:", err)
                );
              break;
            }

            const openingPrice = side === "buy" ? askPrice : bidPrice;

            const usdcBalance =
              balanceSnapshot?.find((asset: any) => asset.symbol === "USDC")
                ?.balance || 0;

            const requiredMargin = (openingPrice * qty) / (leverage || 1);

            if (usdcBalance >= requiredMargin) {
              if (!balances[userId]) {
                balances[userId] = {};
              }

              balances[userId]!.USDC =
                (balances[userId]!.USDC || 0) - requiredMargin;

              await updateBalanceInDatabase(userId, "USDC", balances[userId]!.USDC);

              console.log(
                `Order ${orderId}: Deducted margin ${requiredMargin} (${leverage || 1}x leverage on ${openingPrice * qty} notional at ${side === "buy" ? "ask" : "bid"} price ${openingPrice})`
              );

              const order = {
                ...payload,
                openingPrice: openingPrice,
                createdAt: Date.now(),
                status: "open",
              };

              open_orders.push(order);
              console.log(
                `Order created: ${orderId} for user ${userId}`,
                order
              );

              console.log(
                `[ENGINE] Sending success callback for order ${orderId}`
              );
              await client
                .xadd("callback-queue", "*", "id", orderId, "status", "created")
                .catch((err) =>
                  console.error("Failed to send created callback:", err)
                );
            } else {
              console.log("Insufficient balance", {
                orderId,
                userId,
                requiredMargin,
                usdcBalance,
              });
              console.log(
                `[ENGINE] Sending insufficient_balance callback for order ${orderId}`
              );
              await client
                .xadd(
                  "callback-queue",
                  "*",
                  "id",
                  orderId,
                  "status",
                  "insufficient_balance"
                )
                .catch((err) =>
                  console.error(
                    "Failed to send insufficient_balance callback:",
                    err
                  )
                );
            }
            break;
          }
          case "close-order": {
            console.log(`[ENGINE] Processing close-order request:`, payload);
            const { orderId, userId, closeReason, pnl, closedAt } =
              payload ?? {};

            if (!orderId || !userId) {
              console.log("missing required fields for close order", {
                orderId,
                userId,
              });
              await client
                .xadd(
                  "callback-queue",
                  "*",
                  "id",
                  orderId || "unknown",
                  "status",
                  "invalid_close_request"
                )
                .catch((err) =>
                  console.error(
                    "Failed to send invalid_close_request callback:",
                    err
                  )
                );
              break;
            }

            const orderIndex = open_orders.findIndex(
              (order) => order.id === orderId && order.userId === userId
            );

            if (orderIndex === -1) {
              console.log("Order not found in open orders", {
                orderId,
                userId,
              });
              await client
                .xadd(
                  "callback-queue",
                  "*",
                  "id",
                  orderId,
                  "status",
                  "order_not_found"
                )
                .catch((err) =>
                  console.error("Failed to send order_not_found callback:", err)
                );
              break;
            }

            const order = open_orders[orderIndex]!;
            const symbol = order.asset;

            let finalPnl = pnl;
            let closingPrice = 0;

            if (finalPnl === undefined) {
              const currentBidPrice = bidPrices[symbol] ?? bidPrices.BTC;
              const currentAskPrice = askPrices[symbol] ?? askPrices.BTC;

              if (currentBidPrice && currentAskPrice) {
                const currentPriceForOrder =
                  order.side === "buy" ? currentBidPrice : currentAskPrice;
                closingPrice = currentPriceForOrder;

                finalPnl =
                  order.side === "buy"
                    ? (currentPriceForOrder - order.openingPrice) * order.qty
                    : (order.openingPrice - currentPriceForOrder) * order.qty;
              } else {
                finalPnl = 0;
              }
            }

            if (!balances[userId]) balances[userId] = {};

            const initialMargin =
              (order.openingPrice * order.qty) / (order.leverage || 1);
            balances[userId]!.USDC =
              (balances[userId]!.USDC || 0) + initialMargin + finalPnl;

            const userBalance = balances[userId];
            if (userBalance?.USDC !== undefined) {
              await updateBalanceInDatabase(userId, "USDC", userBalance.USDC);
            }

            console.log(
              `Manual close order ${orderId} (${closeReason}): returned ${initialMargin + finalPnl}`
            );

            try {
              await prisma.order.update({
                where: { id: orderId },
                data: {
                  status: "closed",
                  pnl: Math.round(finalPnl * 10000),
                  closingPrice: closingPrice
                    ? Math.round(closingPrice * 10000)
                    : Math.round(order.openingPrice * 10000),
                  closedAt: new Date(closedAt),
                  closeReason: closeReason as any,
                },
              });
            } catch (e) {
              console.log("error on manual closing", e);
            }

            open_orders.splice(orderIndex, 1);

            await client
              .xadd(
                "callback-queue",
                "*",
                "id",
                orderId,
                "status",
                "closed",
                "reason",
                closeReason,
                "pnl",
                finalPnl.toString()
              )
              .catch((err) =>
                console.error("Failed to send close success callback:", err)
              );

            break;
          }
          default:
        }
      }
    } catch (e) {
      console.error("error:", e);
    }
  }
}

engine();
