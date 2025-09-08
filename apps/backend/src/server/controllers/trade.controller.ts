import { Request, Response } from "express";
import { prisma } from "../config";
import { redis } from "@repo/redis";
import { randomUUID } from "crypto";

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

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json("user not found");
    }

    const {
      asset,
      side,
      status = "open",
      qty,
      leverage,
      takeProfit,
      stopLoss,
    } = req.body;

    const id = randomUUID();
    const userBalance = await getBalance(userId);

    const payload = {
      kind: "create-order",
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
    };

    const streamId = await redis.xadd(
      "engine-stream",
      "*",
      "data",
      JSON.stringify({
        kind: "create-order",
        payload,
      })
    );

    return res.json({ message: "Enqueued", streamId, orderId: id });
  } catch (e) {
    console.log(e);
  }
};

export const closeOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json("user not found");
    }

    const { orderId } = req.params;
    const { pnl, closeReason } = req.body;

    const order = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: "closed",
        pnl,
        closeReason,
      },
    });
    res.json(`${order} closed successfully`);
  } catch (e) {
    console.log(e);
  }
};
