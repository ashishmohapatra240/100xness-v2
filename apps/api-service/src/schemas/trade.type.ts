import { z } from "zod";

export const CreateOrderBodySchema = z.object({
    status: z.enum(["open", "closed"]),
    asset: z.string(),
    side: z.enum(["long", "short"]),
    qty: z.coerce.number(),
    leverage: z.coerce.number(),
    takeProfit: z.coerce.number().optional(),
    stopLoss: z.coerce.number().optional(),
});

export type CreateOrderBody = z.infer<typeof CreateOrderBodySchema>;

export const CloseOrderBodySchema = z.object({
    pnl: z.coerce.number().optional(),
    closeReason: z.enum(["TakeProfit", "StopLoss", "Manual", "Liquidation"]).optional(),
});

export type CloseOrderBody = z.infer<typeof CloseOrderBodySchema>;
