export interface Candle {
    bucket: string | number;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time?: string | number;
}