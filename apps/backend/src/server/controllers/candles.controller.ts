import { Request, Response } from "express";

export const getCandles = async (req: Request, res: Response) => {
    try {
        const { ts: timeframe, startTime, endTime, asset } = req.query;
        
        if (!timeframe || !startTime || !asset) {
            return res.status(400).json({ 
                error: "Missing required parameters: timeframe, startTime, asset" 
            });
        }

        let symbol = (asset as string).toUpperCase();
        if (symbol === 'BTCUSDT' || symbol === 'BTCUSDC') {
            symbol = 'BTC_USDC';
        } else if (symbol === 'ETHUSDT' || symbol === 'ETHUSDC') {
            symbol = 'ETH_USDC';
        } else if (symbol === 'SOLUSDT' || symbol === 'SOLUSDC') {
            symbol = 'SOL_USDC';
        }

        // The Backpack API expects startTime and endTime in seconds, not milliseconds
        // Use current timestamp and calculate dynamic time range
        const nowInSeconds = Math.floor(Date.now() / 1000);
        
        // Calculate time range based on the timeframe to get appropriate amount of data
        let timeRangeInSeconds;
        switch (timeframe) {
            case '1m':
                timeRangeInSeconds = 24 * 60 * 60; // 1 day for 1-minute candles
                break;
            case '5m':
                timeRangeInSeconds = 3 * 24 * 60 * 60; // 3 days for 5-minute candles
                break;
            case '15m':
                timeRangeInSeconds = 7 * 24 * 60 * 60; // 7 days for 15-minute candles
                break;
            case '1h':
                timeRangeInSeconds = 30 * 24 * 60 * 60; // 30 days for 1-hour candles
                break;
            case '4h':
                timeRangeInSeconds = 60 * 24 * 60 * 60; // 60 days for 4-hour candles
                break;
            case '1d':
                timeRangeInSeconds = 365 * 24 * 60 * 60; // 1 year for daily candles
                break;
            default:
                timeRangeInSeconds = 7 * 24 * 60 * 60; // Default to 7 days
        }
        
        const actualStartTime = nowInSeconds - timeRangeInSeconds;
        const actualEndTime = nowInSeconds;

        const backpackUrl = `https://api.backpack.exchange/api/v1/klines?symbol=${symbol}&interval=${timeframe}&startTime=${actualStartTime}&endTime=${actualEndTime}`;
        
        const response = await fetch(backpackUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Backpack API error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Backpack API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Debug logging
        console.log('Backpack API URL:', backpackUrl);
        console.log('API Response sample:', data.slice(0, 2));
        console.log('Current time (seconds):', nowInSeconds);
        console.log('Start time (seconds):', actualStartTime);
        console.log('End time (seconds):', actualEndTime);
        
        const transformedData = data.map((candle: any) => ({
            bucket: candle.start,
            symbol: asset,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
            time: candle.start
        }));
        
        // Debug the transformed data
        console.log('Transformed data sample:', transformedData.slice(0, 2));
        console.log('Latest candle timestamp:', transformedData[transformedData.length - 1]?.time);

        res.json({ data: transformedData });
        
    } catch (error) {
        console.error('Error fetching candles:', error);
        res.status(500).json({ 
            error: "Failed to fetch candles from Backpack API",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
};


