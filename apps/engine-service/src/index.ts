import dotenv from "dotenv";
dotenv.config();

import { redis } from "@repo/redis";
import { prisma } from "@repo/prisma";

const client = redis.duplicate();

type UserBalances = Record<string, number>;

interface Order {
  id: string;
  userId: string;
  asset: string;
  side: "long" | "short";
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
let prices: Record<string, number> = {};
let bidPrices: Record<string, number> = {};
let askPrices: Record<string, number> = {};

let lastId = "$";

const CALLBACK_QUEUE = "callback-queue";
const ENGINE_STREAM = "engine-stream";

function safeNum(n: any, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

function getFieldValue(fields: string[], key: string) {
  for (let i = 0; i < fields.length; i += 2) {
    if (fields[i] === key) return fields[i + 1];
  }
  return undefined;
}

async function updateBalanceInDatabase(userId: string, symbol: string, newBalanceFloat: number) {
  try {
    await prisma.asset.upsert({
      where: { user_symbol_unique: { userId, symbol: symbol as any } },
      create: {
        userId,
        symbol: symbol as any,
        balance: Math.round(newBalanceFloat * 100), // store cents
        decimals: 2
      },
      update: { balance: Math.round(newBalanceFloat * 100) }
    });
    console.log(`Updated ${symbol} balance for ${userId}: ${newBalanceFloat}`);
  } catch (error) {
    console.error(`Failed to update balance for ${userId}:`, error);
  }
}

function getMemBalance(userId: string, symbol: string, snapshot?: Array<{symbol:string; balance:number; decimals:number}>) {
  if (!balances[userId]) balances[userId] = {};
  if (balances[userId][symbol] == null) {
    const snap = snapshot?.find(a => a.symbol === symbol);
    const decimals = snap?.decimals ?? 2;
    const val = snap ? snap.balance / 10 ** decimals : 0;
    balances[userId][symbol] = val;
  }
  return balances[userId][symbol]!;
}

function setMemBalance(userId: string, symbol: string, newVal: number) {
  if (!balances[userId]) balances[userId] = {};
  balances[userId][symbol] = newVal;
  return newVal;
}

async function createSnapshot() {
  try {
    for (const order of open_orders) {
      const symbol = order.asset;
      const currentBidPrice = bidPrices[symbol];
      const currentAskPrice = askPrices[symbol];
      
      if (!currentBidPrice || !currentAskPrice) continue;

      let currentPnl = 0;
      if (currentBidPrice && currentAskPrice) {
        const currentPriceForOrder = order.side === "long" ? currentBidPrice : currentAskPrice;
        currentPnl =
          order.side === "long"
            ? (currentPriceForOrder - order.openingPrice) * order.qty
            : (order.openingPrice - currentPriceForOrder) * order.qty;
      }

      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          side: order.side,
          pnl: Math.round(currentPnl * 10000),
          decimals: 4,
          openingPrice: Math.round(order.openingPrice * 10000),
          closingPrice: 0,
          status: "open",
          qty: Math.round(order.qty * 100),
          qtyDecimals: 2,
          leverage: order.leverage || 1,
          takeProfit: order.takeProfit ? Math.round(order.takeProfit * 10000) : null,
          stopLoss: order.stopLoss ? Math.round(order.stopLoss * 10000) : null,
          margin: Math.round((order.openingPrice * order.qty * 100) / (order.leverage || 1)),
        },
        create: {
          id: order.id,
          userId: order.userId,
          side: order.side,
          pnl: Math.round(currentPnl * 10000),
          decimals: 4,
          openingPrice: Math.round(order.openingPrice * 10000),
          closingPrice: 0,
          status: "open",
          qty: Math.round(order.qty * 100),
          qtyDecimals: 2,
          leverage: order.leverage || 1,
          takeProfit: order.takeProfit ? Math.round(order.takeProfit * 10000) : null,
          stopLoss: order.stopLoss ? Math.round(order.stopLoss * 10000) : null,
          margin: Math.round((order.openingPrice * order.qty * 100) / (order.leverage || 1)),
          createdAt: new Date(order.createdAt),
        } as any,
      });
    }

    await checkLiquidations();

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
  if (!currentPriceForOrder || !Number.isFinite(currentPriceForOrder) || currentPriceForOrder <= 0) {
    console.log(`${context}: Invalid price for order ${order.id}, skipping liquidation check`);
    return { liquidated: false, pnl: 0 };
  }

  const pnl =
    order.side === "long"
      ? (currentPriceForOrder - order.openingPrice) * order.qty
      : (order.openingPrice - currentPriceForOrder) * order.qty;

  if (!Number.isFinite(pnl)) return { liquidated: false, pnl: 0 };

  let reason: "TakeProfit" | "StopLoss" | "margin" | undefined;

  // TP
  if (!reason && order.takeProfit && order.takeProfit > 0) {
    const hit = order.side === "long"
      ? currentPriceForOrder >= order.takeProfit
      : currentPriceForOrder <= order.takeProfit;
    if (hit) {
      reason = "TakeProfit";
      console.log(`${context}: Take profit hit for order ${order.id} (${order.side}): price ${currentPriceForOrder} vs TP ${order.takeProfit}`);
    }
  }

  // SL
  if (!reason && order.stopLoss && order.stopLoss > 0) {
    const hit = order.side === "long"
      ? currentPriceForOrder <= order.stopLoss
      : currentPriceForOrder >= order.stopLoss;
    if (hit) {
      reason = "StopLoss";
      console.log(`${context}: Stop loss hit for order ${order.id} (${order.side}): price ${currentPriceForOrder} vs SL ${order.stopLoss}`);
    }
  }

  if (!reason && order.leverage) {
    const initialMargin = (order.openingPrice * order.qty) / order.leverage;
    const remainingMargin = initialMargin + pnl;
    const liquidationThreshold = initialMargin * 0.05;

    if (remainingMargin <= liquidationThreshold) {
      reason = "margin";
      console.log(`${context} liquidation: order ${order.id} liquidated (remaining: ${remainingMargin}, threshold: ${liquidationThreshold})`);
    }
  }

  if (!reason) return { liquidated: false, pnl };

  if (!balances[order.userId]) balances[order.userId] = {};

  if (reason === "margin") {
    const initialMargin = (order.openingPrice * order.qty) / (order.leverage || 1);
    const remainingMargin = Math.max(0, initialMargin + pnl);
    const newBal = setMemBalance(order.userId, "USDC", (balances[order.userId]?.USDC || 0) + remainingMargin);
    await updateBalanceInDatabase(order.userId, "USDC", newBal);
    console.log(`Liquidated order ${order.id}: remaining margin = ${remainingMargin}`);
  } else {
    const initialMargin = (order.openingPrice * order.qty) / (order.leverage || 1);
    const credit = initialMargin + pnl;
    const newBal = setMemBalance(order.userId, "USDC", (balances[order.userId]?.USDC || 0) + credit);
    await updateBalanceInDatabase(order.userId, "USDC", newBal);
    console.log(`Closed order ${order.id} (${reason}): returned ${credit}`);
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

  await client.xadd(
    CALLBACK_QUEUE,
    "*",
    "id", order.id,
    "status", "closed",
    "reason", reason,
    "pnl", pnl.toString()
  ).catch(err => console.error(`Failed to send ${context} liquidation callback:`, err));

  return { liquidated: true, pnl, reason };
}

async function checkLiquidations() {
  for (let i = open_orders.length - 1; i >= 0; i--) {
    const order = open_orders[i];
    if (!order) continue;

    const symbol = order.asset;
    const currentBidPrice = bidPrices[symbol];
    const currentAskPrice = askPrices[symbol];
    // Skip if we don't have valid price data for this asset
    if (!currentBidPrice || !currentAskPrice) continue;

    const currentPriceForOrder = order.side === "long" ? currentBidPrice : currentAskPrice;

    const result = await processOrderLiquidation(order, currentPriceForOrder, "periodic-check");
    if (result.liquidated) open_orders.splice(i, 1);
  }
}

async function loadSnapshot() {
  try {
    const dbOrders = await prisma.order.findMany({ where: { status: "open" } });

    open_orders = dbOrders.map((order) => ({
      id: order.id,
      userId: order.userId,
      asset: "BTC",
      side: order.side as "long" | "short",
      qty: order.qty / 100,
      leverage: order.leverage,
      openingPrice: order.openingPrice / 10000,
      createdAt: order.createdAt.getTime(),
      status: "open",
      takeProfit: (order.takeProfit && order.takeProfit > 0) ? order.takeProfit / 10000 : undefined,
      stopLoss: (order.stopLoss && order.stopLoss > 0) ? order.stopLoss / 10000 : undefined,
    }));

    console.log(`loaded ${open_orders.length} open orders from the database`);
    console.log("Order IDs loaded:", open_orders.map((o) => `${o.id.slice(0, 8)}...`));

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
      const response = await client.xread("BLOCK", 0, "STREAMS", ENGINE_STREAM, lastId);
      if (!response || !response.length) continue;

      const [, messages] = response[0]!;
      if (!messages || !messages.length) continue;

      for (const [id, fields] of messages) {
        lastId = id;
        const raw = getFieldValue(fields as string[], "data");
        if (!raw) continue;

        let msg: any;
        try {
          msg = JSON.parse(raw);
          // console.log(`[ENGINE] Received:`, msg);
        } catch {
          console.log(`[ENGINE] Failed to parse:`, raw);
          continue;
        }

        const { kind, payload } = msg.request || msg;

        switch (kind) {
          case "price-update": {
            const data = payload?.data || payload;
            if (data && data.s) {
              const s = typeof data.s === "string" ? data.s : "";
              const rawSymbol = s.endsWith("_USDC") ? s.replace("_USDC", "") : s;
              const symbol = rawSymbol.toUpperCase();
              const bidPrice = safeNum(data.b, 0);
              const askPrice = safeNum(data.a, 0);

              if (bidPrice > 0 && askPrice > 0) {
                const currentPrice = (bidPrice + askPrice) / 2;
                prices[symbol] = currentPrice;
                bidPrices[symbol] = bidPrice;
                askPrices[symbol] = askPrice;
                console.log(`[ENGINE] Price updated: ${symbol} = ${currentPrice.toFixed(2)} (bid ${bidPrice.toFixed(2)}, ask ${askPrice.toFixed(2)})`);

                for (let i = open_orders.length - 1; i >= 0; i--) {
                  const order = open_orders[i];
                  if (!order || order.asset !== symbol) continue;

                  const curr = order.side === "long" ? bidPrice : askPrice;
                  const result = await processOrderLiquidation(order, curr, "price-update");
                  if (result.liquidated) open_orders.splice(i, 1);
                }
              }
            }
            break;
          }

          case "create-order": {
            console.log(`[ENGINE] Processing create-order:`, payload);
            const {
              id: orderId,
              userId,
              asset: rawAsset,
              side: rawSide,
              qty,
              leverage,
              balanceSnapshot,
              takeProfit,
              stopLoss,
            } = payload ?? {};

            const asset = rawAsset ? rawAsset.toUpperCase() : "";
            const side = rawSide as "long" | "short";

            const q = safeNum(qty, NaN);
            const lev = safeNum(leverage, 1);
            if (!userId || !asset || !side || !orderId || !Number.isFinite(q) || q <= 0) {
              console.log("missing/invalid fields", { orderId, userId, asset, q, side });
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId || "unknown", "status", "invalid_order")
                .catch(err => console.error("Failed to send invalid_order:", err));
              break;
            }

            if (open_orders.some(o => o.id === orderId)) {
              console.log(`[ENGINE] Duplicate create-order ${orderId} ignored`);
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId, "status", "created")
                .catch(err => console.error("Failed to send created callback:", err));
              break;
            }

            const bidPrice = bidPrices[asset];
            const askPrice = askPrices[asset];
            if (!bidPrice || !askPrice) {
              console.log("no price available", { orderId, asset, availablePrices: Object.keys(bidPrices) });
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId, "status", "no_price")
                .catch(err => console.error("Failed to send no_price:", err));
              break;
            }

            const openingPrice = side === "long" ? askPrice : bidPrice;
            const requiredMargin = (openingPrice * q) / (lev || 1);

            const usdc = getMemBalance(userId, "USDC", balanceSnapshot);
            if (usdc >= requiredMargin) {
              const newBal = setMemBalance(userId, "USDC", usdc - requiredMargin);
              await updateBalanceInDatabase(userId, "USDC", newBal);

              const order: Order = {
                id: orderId,
                userId,
                asset,
                side,
                qty: q,
                leverage: lev || 1,
                openingPrice,
                createdAt: Date.now(),
                status: "open",
                takeProfit: (takeProfit != null && Number.isFinite(Number(takeProfit)) && Number(takeProfit) > 0) ? Number(takeProfit) : undefined,
                stopLoss: (stopLoss != null && Number.isFinite(Number(stopLoss)) && Number(stopLoss) > 0) ? Number(stopLoss) : undefined,
              };

              open_orders.push(order);
              console.log(`Order created: ${orderId} for user ${userId}`, {
                side: order.side,
                qty: order.qty,
                openingPrice: order.openingPrice,
                leverage: order.leverage,
                takeProfit: order.takeProfit ? order.takeProfit : "not set",
                stopLoss: order.stopLoss ? order.stopLoss : "not set",
                createdAt: new Date(order.createdAt).toISOString()
              });

              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId, "status", "created")
                .catch(err => console.error("Failed to send created callback:", err));
            } else {
              console.log("Insufficient balance", { orderId, userId, requiredMargin, usdc });
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId, "status", "insufficient_balance")
                .catch(err => console.error("Failed to send insufficient_balance:", err));
            }
            break;
          }

          case "close-order": {
            console.log(`[ENGINE] Processing close-order:`, payload);
            const { orderId, userId, closeReason, pnl } = payload ?? {};
            if (!orderId || !userId) {
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId || "unknown", "status", "invalid_close_request")
                .catch(err => console.error("Failed to send invalid_close_request:", err));
              break;
            }

            const idx = open_orders.findIndex(o => o.id === orderId && o.userId === userId);
            if (idx === -1) {
              await client.xadd(CALLBACK_QUEUE, "*", "id", orderId, "status", "order_not_found")
                .catch(err => console.error("Failed to send order_not_found:", err));
              break;
            }

            const order = open_orders[idx]!;
            const symbol = order.asset;

            let finalPnl: number | undefined = Number.isFinite(Number(pnl)) ? Number(pnl) : undefined;
            let closingPrice = 0;

            if (finalPnl === undefined) {
              const currentBidPrice = bidPrices[symbol];
              const currentAskPrice = askPrices[symbol];

              if (currentBidPrice && currentAskPrice) {
                const currentPriceForOrder = order.side === "long" ? currentBidPrice : currentAskPrice;
                closingPrice = currentPriceForOrder;
                finalPnl = order.side === "long"
                  ? (currentPriceForOrder - order.openingPrice) * order.qty
                  : (order.openingPrice - currentPriceForOrder) * order.qty;
              } else {
                closingPrice = order.openingPrice;
                finalPnl = 0;
                console.log(`No price available for ${symbol} when closing order ${order.id}, using opening price`);
              }
            }

            if (!balances[userId]) balances[userId] = {};
            const initialMargin = (order.openingPrice * order.qty) / (order.leverage || 1);
            const newBal = setMemBalance(userId, "USDC", (balances[userId].USDC || 0) + initialMargin + (finalPnl || 0));
            await updateBalanceInDatabase(userId, "USDC", newBal);

            try {
              await prisma.order.update({
                where: { id: orderId },
                data: {
                  status: "closed",
                  pnl: Math.round((finalPnl || 0) * 10000),
                  closingPrice: Math.round((closingPrice || order.openingPrice) * 10000),
                  closedAt: new Date(),
                  closeReason: (closeReason || "Manual") as any,
                },
              });
            } catch (e) {
              console.log("error on manual closing", e);
            }

            open_orders.splice(idx, 1);

            await client.xadd(
              CALLBACK_QUEUE,
              "*",
              "id", orderId,
              "status", "closed",
              "reason", (closeReason || "Manual"),
              "pnl", String(finalPnl || 0)
            ).catch(err => console.error("Failed to send close success callback:", err));

            break;
          }

          default:
            break;
        }
      }
    } catch (e) {
      console.error("engine-loop error:", e);
    }
  }
}

engine();
