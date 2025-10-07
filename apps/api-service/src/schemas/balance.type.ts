import { z } from "zod";

export const SymbolSchema = z.enum(["USDC", "BTC"]);

export const GetBalanceByAssetParamsSchema = z.object({
  symbol: SymbolSchema,
});

export const DepositBalanceBodySchema = z.object({
  symbol: SymbolSchema,
  amount: z.coerce.number().positive(),
  decimals: z.coerce.number().int().min(0).max(2).default(2),
});