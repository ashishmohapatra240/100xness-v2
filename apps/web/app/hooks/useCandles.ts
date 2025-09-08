import { useQuery } from "@tanstack/react-query";
import { candlesService } from "../services/candles.service";
import { useState } from "react";
import { Candle } from "../types/candle.type";

export const useGetCandles = (timeframe: string, startTime: number, endTime: number, asset: string) => {

    const [priceData, setPriceData] = useState<Candle[]>([]);
    return useQuery({
        queryKey: ['candles', timeframe, startTime, endTime, asset],
        queryFn: () => candlesService.getCandles(timeframe, startTime, endTime, asset)
            .then(data => {
                setPriceData(data);
                return data;
            })
    });
};