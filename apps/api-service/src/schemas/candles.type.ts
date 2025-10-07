import { z } from "zod";

export const GetCandlesQuerySchema = z.object({
    ts: z.string(),
    startTime: z.coerce.number(),
    endTime: z.coerce.number(),
    asset: z.string(),
});

export type GetCandlesQuery = z.infer<typeof GetCandlesQuerySchema>;