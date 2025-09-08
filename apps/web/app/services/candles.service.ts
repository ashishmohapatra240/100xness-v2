import publicAxios from "../lib/axios";

export const candlesService = {
    getCandles: async (timeframe: string, startTime: number, endTime: number, asset: string) => {
        try {
            const response = await publicAxios.get(`/candles?ts=${timeframe}&startTime=${startTime}&endTime=${endTime}&asset=${asset}`)
            return response.data.data;
        } catch (error) {
            console.error('Error fetching candles:', error);
            throw error;
        }
    },
}
