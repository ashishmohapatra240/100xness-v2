import { Request, Response } from "express"
import { redis } from "@repo/redis"
import { prisma } from "@repo/prisma"
import { DepositBalanceBodySchema, GetBalanceByAssetParamsSchema } from "../schemas/balance.type";

export const getBalance = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.json("user not found");
    }

    const balances = await prisma.asset.findMany({
        where: {
            userId: userId
        },
        select: {
            symbol: true,
            balance: true,
            decimals: true
        }
    });

    res.json({ userId, balances });
}

export const getBalanceByAsset = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.json("user not found");
    }

    const result = GetBalanceByAssetParamsSchema.safeParse(req.params);
    if (!result.success) {
        return res.status(400).json({ error: result.error.message });
    }

    const { symbol } = result.data;

    if (!symbol) return res.json("asset required");
    const record = await prisma.asset.findUnique({
        where: {
            user_symbol_unique: {
                userId, 
                symbol: symbol as any
            }
        },
        select: {
            symbol: true,
            balance: true,
            decimals: true
        }
    });

    if (!record) return res.json("asset not found");

    res.json(record);
}

export const depositBalance = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.json("user not found");
    }

    const result = DepositBalanceBodySchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.message });
    }

    const { symbol, amount, decimals } = result.data;

    const validSymbols = ['USDC', 'BTC'];
    if (!validSymbols.includes(symbol)) {
        return res.status(400).json({ 
            error: "Invalid symbol", 
            validSymbols: validSymbols 
        });
    }

    const updated = await prisma.asset.upsert({
        where: {
            user_symbol_unique: {
                userId, symbol
            }
        },
        create: {
            userId,
            symbol,
            balance: amount,
            decimals: decimals ?? 2
        },
        update: {
            balance: { increment: amount },
        },
        select: {
            symbol: true,
            balance: true,
            decimals: true
        }
    });

    await redis.xadd(
        "engine-stream",
        "*",
        "data",
        JSON.stringify({
            kind: "balance-update",
            payload: {
                userId,
                symbol,
                newBalance: updated.balance,
                decimals: updated.decimals
            }
        })
    );

    res.json(updated);
}
