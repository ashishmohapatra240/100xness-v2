import { Request, Response } from "express";
import { prisma } from "../config";
import { redis } from "@repo/redis";

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
      side,
      status = open,
      qty,
      leverage,
      takeProfit,
      stopLoss,
    } = req.body;

    const id = Math.random().toString();
    const userBalance = getBalance(userId);


    const data = {
      side,
      status,
      qty,
      leverage,
      takeProfit,
      stopLoss,
      id,
      userBalance
    };


    const order = await redis.xadd("order", "*", "data", JSON.stringify(data));

    res.json(`${order} added to stream successfully`);
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
    res.json(`${order} added to stream successfully`);
  } catch (e) {
    console.log(e);
  }
};
