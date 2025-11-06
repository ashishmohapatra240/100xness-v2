import { Request, Response } from "express";
import { redis } from "@repo/redis";
import { prisma } from "@repo/prisma";
import { randomUUID } from "crypto";
import { RedisSubscriber } from "../redisSubscriber";
import { CloseOrderBodySchema, CreateOrderBodySchema } from "../schemas/trade.type";

async function getBalance(id: string) {
  const userAssets = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      assets: {
        select: {
          symbol: true,
          balance: true,
          decimals: true,
        },
      },
    },
  });

  return userAssets?.assets || [];
}

const addToStream = async (id: string, request: any) => {
  console.log(
    `[CONTROLLER] Adding order ${id} to engine-stream:`,
    JSON.stringify(request, null, 2)
  );
  await redis.xadd(
    "engine-stream",
    "*",
    "data",
    JSON.stringify({
      id,
      request,
    })
  );
  console.log(`[CONTROLLER] Successfully added order ${id} to engine-stream`);
};

const subscriber = new RedisSubscriber();

export async function sendRequestAndWait(id: string, request: any) {
  console.log(`[CONTROLLER] Starting sendRequestAndWait for order ${id}`);

  try {
    const results = await Promise.all([
      addToStream(id, request),
      subscriber.waitForMessage(id),
    ]);

    console.log(`[CONTROLLER] Both promises resolved for order ${id}`);
    return results;
  } catch (error) {
    console.error(
      `[CONTROLLER] Error in sendRequestAndWait for order ${id}:`,
      error
    );
    throw error;
  }
}

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("[CONTROLLER] Order creation failed: user not found");
      return res.json("user not found");
    }

    const result = CreateOrderBodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const {
      asset,
      side,
      status = "open",
      qty,
      leverage,
      takeProfit,
      stopLoss,
    } = result.data;

    const id = randomUUID();
    console.log(`[CONTROLLER] Creating order ${id} for user ${userId}:`, {
      asset,
      side,
      qty,
      leverage,
      takeProfit,
      stopLoss,
    });

    const userBalance = await getBalance(userId);
    console.log(`[CONTROLLER] User balance for ${userId}:`, userBalance);

    const payload = {
      kind: "create-order",
      payload: {
        asset,
        id,
        userId,
        side,
        status,
        qty: Number(qty),
        leverage: Number(leverage),
        takeProfit: takeProfit != null ? Number(takeProfit) : null,
        stopLoss: stopLoss != null ? Number(stopLoss) : null,
        balanceSnapshot: userBalance,
        enqueuedAt: Date.now(),
      },
    };

    console.log(`[CONTROLLER] Sending order ${id} to engine...`);
    await sendRequestAndWait(id, payload);

    console.log(
      `[CONTROLLER] Order ${id} processed successfully, returning response`
    );
    return res.json({ message: "Order created", orderId: id });
  } catch (e) {
    console.error("[CONTROLLER] Error in createOrder:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const closeOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "user not found" });
    }

    const { orderId } = req.params;
    const result = CloseOrderBodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const { pnl, closeReason = "Manual" } = result.data;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }


    if (!closeReason) {
      return res.status(400).json({
        error: `closeReason is required. Must be one of: TakeProfit, StopLoss, Manual, Liquidation`,
      });
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: "open",
      },
    });

    if (!existingOrder) {
      return res
        .status(404)
        .json({ error: "Order not found or already closed" });
    }

    console.log(`[CONTROLLER] Closing order ${orderId} for user ${userId}`);

    const payload = {
      kind: "close-order",
      payload: {
        orderId,
        userId,
        closeReason,
        pnl: pnl ? Number(pnl) : undefined,
        closedAt: Date.now(),
      },
    };

    console.log(`[CONTROLLER] Sending close order ${orderId} to engine...`);
    await sendRequestAndWait(orderId, payload);

    console.log(
      `[CONTROLLER] Order ${orderId} closed successfully, returning response`
    );
    res.json({ message: "Order closed successfully", orderId });
  } catch (e) {
    console.error("Error in closeOrder:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "user not found" });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const transformedOrders = orders.map((order: any) => ({
      id: order.id,
      symbol: "BTC",
      orderType: order.side === "long" ? "long" : "short",
      quantity: order.qty / 100,
      price: order.openingPrice / 10000,
      status: order.status,
      pnl: order.pnl / 10000,
      createdAt: order.createdAt.toISOString(),
      closedAt: order.closedAt?.toISOString(),
      exitPrice: order.closingPrice ? order.closingPrice / 10000 : undefined,
      leverage: order.leverage,
      takeProfit: order.takeProfit ? order.takeProfit / 10000 : undefined,
      stopLoss: order.stopLoss ? order.stopLoss / 10000 : undefined,
      closeReason: order.closeReason,
    }));

    res.json({ orders: transformedOrders });
  } catch (e) {
    console.error("Error in getOrders:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "user not found" });
    }

    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const transformedOrder = {
      id: order.id,
      symbol: "BTC",
      orderType: order.side === "long" ? "long" : "short",
      quantity: order.qty / 100,
      price: order.openingPrice / 10000,
      status: order.status,
      pnl: order.pnl / 10000,
      createdAt: order.createdAt.toISOString(),
      closedAt: order.closedAt?.toISOString(),
      exitPrice: order.closingPrice ? order.closingPrice / 10000 : undefined,
      leverage: order.leverage,
      takeProfit: order.takeProfit ? order.takeProfit / 10000 : undefined,
      stopLoss: order.stopLoss ? order.stopLoss / 10000 : undefined,
      closeReason: order.closeReason,
    };

    res.json({ order: transformedOrder });
  } catch (e) {
    console.error("Error in getOrderById:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
