"use client";
import React from "react";
import { useWs } from "../hooks/useWs";

interface BackpackTradeData {
    data: {
        E: number;          // Event time
        T: number;          // Trade time
        a: string;          // Ask order id
        b: string;          // Bid order id
        e: string;          // Event type ("trade")
        m: boolean;         // Is buyer market maker
        p: string;          // Price
        q: string;          // Quantity
        s: string;          // Symbol
        t: number;          // Trade id
    };
    stream: string;         // Stream name
}

interface TickerItemProps {
    symbol: string;
    price: string;
    quantity: string;
    bid: number | null;
    ask: number | null;
    isUp: boolean;
    lastTradeTime: number;
}

const TickerItem: React.FC<TickerItemProps> = ({ symbol, price, quantity, bid, ask, isUp, lastTradeTime }) => {
    const formatTime = (timestamp: number) => {
        return new Date(timestamp / 1000).toLocaleTimeString();
    };

    return (
        <div className="p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-900 text-sm">
                    {symbol.replace('_', '/')}
                </span>
 
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">Bid</span>
                    <span className="font-mono text-green-600">
                        ${bid != null ? bid.toLocaleString() : '---'}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">Ask</span>
                    <span className="font-mono text-red-600">
                        ${ask != null ? ask.toLocaleString() : '---'}
                    </span>
                </div>
            </div>

        </div>
    );
};

const LeftSideBar: React.FC = () => {
    const { messages, orderBook, isConnected } = useWs();
    
    React.useEffect(() => {
        console.log('LeftSideBar orderBook state:', orderBook);
    }, [orderBook]);

    const symbolData = React.useMemo(() => {
        const dataMap = new Map<string, BackpackTradeData>();

        messages.forEach((message) => {
            try {
                const parsed: BackpackTradeData = JSON.parse(message);
                if (parsed.data && parsed.data.s) {
                    dataMap.set(parsed.data.s, parsed);
                }
            } catch (error) {
                console.error('Error parsing websocket message:', error);
            }
        });

        return Array.from(dataMap.values()).sort((a, b) =>
            a.data.s.localeCompare(b.data.s)
        );
    }, [messages]);

    const [priceChanges, setPriceChanges] = React.useState<Map<string, boolean>>(new Map());
    const [previousPrices, setPreviousPrices] = React.useState<Map<string, number>>(new Map());

    React.useEffect(() => {
        const newChanges = new Map<string, boolean>();
        const newPrices = new Map<string, number>();

        symbolData.forEach((data) => {
            const currentPrice = parseFloat(data.data.p);
            const symbol = data.data.s;
            const previousPrice = previousPrices.get(symbol);

            if (previousPrice !== undefined) {
                const isUp = currentPrice > previousPrice;
                newChanges.set(symbol, isUp);
            } else {
                newChanges.set(symbol, true);
            }
            
            newPrices.set(symbol, currentPrice);
        });

        setPriceChanges(newChanges);
        setPreviousPrices(newPrices);
    }, [symbolData, previousPrices]);

    return (
        <div className="hidden lg:flex w-72 bg-white border-r border-gray-200 h-full flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 font-ibm-plex-mono">
                    Live Ticker
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    {symbolData.length} symbols • Live Bid/Ask
                </p>
                {orderBook && (
                    <p className="text-xs text-blue-600 mt-1">
                        Orderbook: {orderBook.bids.length} bids • {orderBook.asks.length} asks
                    </p>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {symbolData.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-black-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">Waiting for live data...</p>
                    </div>
                ) : (
                    symbolData.map((data) => {
                        const getBestBid = () => {
                            if (orderBook && orderBook.symbol === data.data.s && orderBook.bids?.length > 0) {
                                const bid = parseFloat(orderBook.bids[0]?.[0] || '0');
                                console.log('Getting best bid:', bid, 'from orderbook:', orderBook.bids[0]);
                                return bid;
                            }
                            console.log('No bid data available, orderBook:', orderBook);
                            return null;
                        };
                        
                        const getBestAsk = () => {
                            if (orderBook && orderBook.symbol === data.data.s && orderBook.asks?.length > 0) {
                                const ask = parseFloat(orderBook.asks[0]?.[0] || '0');
                                console.log('Getting best ask:', ask, 'from orderbook:', orderBook.asks[0]);
                                return ask;
                            }
                            console.log('No ask data available, orderBook:', orderBook);
                            return null;
                        };

                        return (
                            <TickerItem
                                key={data.data.s}
                                symbol={data.data.s}
                                price={data.data.p}
                                quantity={data.data.q}
                                bid={getBestBid()}
                                ask={getBestAsk()}
                                isUp={priceChanges.get(data.data.s) || false}
                                lastTradeTime={data.data.T}
                            />
                        );
                    })
                )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Real-time data</span>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeftSideBar;