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

let lastId = "$";

async function createSnapshot() {
  try {
    for (const order of open_orders) {
      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          side: order.side == "buy" ? "long" : "short",
          pnl: 0,
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
          margin: Math.round(order.openingPrice * order.qty * 100),
        },
        create: {
          id: order.id,
          userId: order.userId,
          side: order.side === "buy" ? "long" : "short",
          pnl: 0,
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
          margin: Math.round(order.openingPrice * order.qty * 100),
          createdAt: new Date(order.createdAt),
        } as any,
      });
    }
    console.log("snapshot sent");
  } catch (e) {
    console.log(e);
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

    balances = {};
  } catch (e) {
    console.log(e);
  }
}

setInterval(createSnapshot, 10000);

async function engine() {
  console.log("Brumm brum, starting engine");

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
                console.log(
                  `Price updated: ${symbol} = ${prices[symbol]} (bid: ${bidPrice}, ask: ${askPrice})`
                );

                //liquidation
                for (let i = open_orders.length - 1; i >= 0; i--) {
                  const order = open_orders[i];
                  if (order?.asset !== symbol) continue;

                  const pnl =
                    order!.side === "buy"
                      ? (currentPrice - order!.openingPrice) * order!.qty
                      : (order!.openingPrice - currentPrice) * order!.qty;

                  let reason:
                    | "TakeProfit"
                    | "StopLoss"
                    | "Liquidation"
                    | undefined;

                  //takeprofit
                  if (!reason && order?.takeProfit != null) {
                    if (
                      order.side === "buy"
                        ? currentPrice >= order.takeProfit
                        : currentPrice <= order.takeProfit
                    )
                      reason = "TakeProfit";
                  }

                  //stoploss
                  if (!reason && order?.stopLoss != null) {
                    if (
                      order?.side === "buy"
                        ? currentPrice <= order?.stopLoss
                        : currentPrice >= order?.stopLoss
                    ) {
                      reason = "StopLoss";
                    }
                  }

                  // margin
                  if (!reason && order?.leverage && order?.leverage > 1) {
                    const margin =
                      (order?.openingPrice * order?.qty) / order?.leverage;
                    if (-pnl >= margin) {
                      reason = "Liquidation";
                    }
                  }

                  if (reason) {
                    if (!balances[order!.userId]) balances[order!.userId] = {};
                    balances[order!.userId]!.USDC =
                      (balances[order!.userId]!.USDC || 0) + pnl;
                  }

                  try {
                    await prisma.order.update({
                      where: { id: order!.id },
                      data: {
                        status: "closed",
                        pnl: Math.round(pnl * 10000),
                        closingPrice: Math.round(currentPrice * 10000),
                        closedAt: new Date(),
                        closeReason: reason as any,
                      },
                    });
                  } catch (e) {
                    console.log("error on closing", e);
                  }

                  open_orders.splice(i, 1);

                  await client.xadd(
                    "callback-queue",
                    "*",
                    "id",
                    order!.id,
                    "status",
                    "closed",
                    "reason",
                    reason as any,
                    "pnl",
                    pnl.toString()
                  );
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
              client.xadd(
                "callback-queue",
                "*",
                "id",
                orderId || "unknown",
                "status",
                "invalid_order"
              );
              break;
            }

            const currentPrice = prices[asset] ?? prices.BTC;

            if (!currentPrice) {
              console.log("no price available", {
                orderId,
                asset,
              });
              console.log(
                `[ENGINE] Sending no_price callback for order ${orderId}`
              );
              client.xadd(
                "callback-queue",
                "*",
                "id",
                orderId,
                "status",
                "no_price"
              );
              break;
            }

            const usdcBalance =
              balanceSnapshot?.find((asset: any) => asset.symbol === "USDC")
                ?.balance || 0;

            const requiredAmount = currentPrice * qty;

            if (usdcBalance >= requiredAmount) {
              if (!balances[userId]) {
                balances[userId] = {};
              }

              balances[userId]!.USDC =
                (balances[userId]!.USDC || 0) - requiredAmount;

              const order = {
                ...payload,
                openingPrice: currentPrice,
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
              client.xadd(
                "callback-queue",
                "*",
                "id",
                orderId,
                "status",
                "created"
              );
            } else {
              console.log("Insufficient balance", {
                orderId,
                userId,
                requiredAmount,
                usdcBalance,
              });
              console.log(
                `[ENGINE] Sending insufficient_balance callback for order ${orderId}`
              );
              client.xadd(
                "callback-queue",
                "*",
                "id",
                orderId,
                "status",
                "insufficient_balance"
              );
            }
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
