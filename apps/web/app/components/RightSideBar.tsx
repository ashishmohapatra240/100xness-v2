"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useWs } from "../hooks/useWs";
import { useCreateOrder } from "../hooks/useOrders";

const getSliderStyle = (selectedIndex: number) => {
    const percentage = (selectedIndex / 4) * 100;
    return {
        background: `linear-gradient(to right, #000000 0%, #000000 ${percentage}%, #e5e5e5 ${percentage}%, #e5e5e5 100%)`,
        outline: 'none',
        WebkitAppearance: 'none' as const,
        MozAppearance: 'none' as const,
        height: '8px',
        borderRadius: '4px',
    };
};

interface TradeData {
    data: {
        e: string;
        E: number;
        a: number;
        s: string;
        p: string;
        q: string;
        f: number;
        l: number;
        T: number;
        m: boolean;
    };
    bid: number;
    ask: number;
    timestamp: string;
}

interface OrderData {
    quantity: number;
    orderType: "long" | "short";
    symbol: string;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
}

interface RightSideBarProps {
    selectedSymbol: string;
}

const RightSideBar: React.FC<RightSideBarProps> = ({ selectedSymbol }) => {
    const { messages, orderBook } = useWs();
    const createOrderMutation = useCreateOrder();

    const [volume, setVolume] = useState("1.00");
    const [takeProfit, setTakeProfit] = useState("");
    const [stopLoss, setStopLoss] = useState("");
    const [orderType, setOrderType] = useState<"long" | "short">("long");
    const [leverage, setLeverage] = useState(1);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);

    const currentSymbolData = useMemo(() => {
        // Get the latest trade data for price information
        let latestTrade = null;
        for (const message of messages) {
            try {
                const parsed = JSON.parse(message);
                if (parsed.data && parsed.data.s && parsed.data.s.toLowerCase() === selectedSymbol.toLowerCase()) {
                    latestTrade = parsed;
                    break;
                }
            } catch (error) {
                console.error('Error parsing websocket message:', error);
            }
        }

        // Get bid/ask from orderBook
        let bid = null;
        let ask = null;
        if (orderBook && orderBook.symbol && orderBook.symbol.toLowerCase() === selectedSymbol.toLowerCase()) {
            if (orderBook.bids?.length > 0) {
                bid = parseFloat(orderBook.bids[0]?.[0] || '0');
            }
            if (orderBook.asks?.length > 0) {
                ask = parseFloat(orderBook.asks[0]?.[0] || '0');
            }
        }

        return latestTrade ? {
            ...latestTrade,
            bid,
            ask
        } : null;
    }, [messages, selectedSymbol, orderBook]);

    // Update current price only when we get a new valid bid price
    useEffect(() => {
        if (currentSymbolData?.bid && currentSymbolData.bid > 0) {
            setCurrentPrice(currentSymbolData.bid);
        }
    }, [currentSymbolData?.bid]);


    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "" || (/^\d{0,2}(\.\d{0,2})?$/.test(value) && parseFloat(value) <= 100)) {
            setVolume(value);
        }
    };

    const handleCreateOrder = (side: "long" | "short") => {
        if (!currentPrice || !volume || parseFloat(volume) <= 0) {
            return;
        }

        const quantity = parseFloat(volume);

        const orderData: OrderData = {
            quantity,
            orderType: side,
            symbol: selectedSymbol.toLowerCase(),
            leverage
        };

        if (takeProfit) {
            orderData.takeProfit = parseFloat(takeProfit);
        }
        if (stopLoss) {
            orderData.stopLoss = parseFloat(stopLoss);
        }

        createOrderMutation.mutate(orderData);
    };

    return (
        <div className="w-72 bg-white border-l border-gray-300 h-full flex flex-col">
            <div className="p-4 border-b border-gray-300 bg-white flex-shrink-0">
                <h2 className="text-lg font-semibold text-black font-ibm-plex-mono">
                    Trade {selectedSymbol.toUpperCase()}
                </h2>
            </div>

            <div className="p-4 border-b border-gray-300 flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">Bid</div>
                        <div className="text-lg font-mono font-semibold text-green-600">
                            ${currentSymbolData?.bid ? currentSymbolData.bid.toFixed(4) : "---"}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">Ask</div>
                        <div className="text-lg font-mono font-semibold text-red-600">
                            ${currentSymbolData?.ask ? currentSymbolData.ask.toFixed(4) : "---"}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Volume/Quantity
                        </label>
                        <input
                            type="text"
                            value={volume}
                            onChange={handleVolumeChange}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                            min="0.01"
                            max="100.00"
                            step="0.01"
                        />
                        <div className="text-xs text-gray-600 mt-1">Range: 0.01 - 100.00</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Current Price
                        </label>
                        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono text-gray-700">
                            ${currentPrice ? currentPrice.toFixed(4) : "Loading..."}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                            Stable price for order placement. Updates when new bid price is received.
                        </div>
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Leverage: {leverage}x
                        </label>
                        <div className="space-y-3">
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={[1, 5, 10, 50, 100].indexOf(leverage)}
                                onChange={(e) => {
                                    const leverageOptions = [1, 5, 10, 50, 100];
                                    const index = parseInt(e.target.value);
                                    if (!isNaN(index) && index >= 0 && index < leverageOptions.length) {
                                        const newLeverage = leverageOptions[index];
                                        if (newLeverage !== undefined) {
                                            setLeverage(newLeverage);
                                        }
                                    }
                                }}
                                className="w-full appearance-none cursor-pointer slider"
                                style={getSliderStyle([1, 5, 10, 50, 100].indexOf(leverage))}
                            />
                            <div className="flex justify-between text-xs text-gray-600">
                                <span className={leverage === 1 ? "font-semibold text-gray-900" : ""}>1x</span>
                                <span className={leverage === 5 ? "font-semibold text-gray-900" : ""}>5x</span>
                                <span className={leverage === 10 ? "font-semibold text-gray-900" : ""}>10x</span>
                                <span className={leverage === 50 ? "font-semibold text-gray-900" : ""}>50x</span>
                                <span className={leverage === 100 ? "font-semibold text-gray-900" : ""}>100x</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Take Profit (Optional)
                        </label>
                        <input
                            type="number"
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                            placeholder="Enter price"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                            step="0.0001"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Stop Loss (Optional)
                        </label>
                        <input
                            type="number"
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                            placeholder="Enter price"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                            step="0.0001"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button
                            onClick={() => handleCreateOrder("long")}
                            disabled={createOrderMutation.isPending || !currentPrice || !volume || parseFloat(volume) <= 0}
                            className="bg-black text-white py-3 px-4 rounded-lg font-medium transition-colors hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {createOrderMutation.isPending ? "..." : "Buy"}
                        </button>
                        <button
                            onClick={() => handleCreateOrder("short")}
                            disabled={createOrderMutation.isPending || !currentPrice || !volume || parseFloat(volume) <= 0}
                            className="bg-white text-gray-900 border-2 border-gray-900 py-3 px-4 rounded-lg font-medium transition-colors hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {createOrderMutation.isPending ? "..." : "Sell"}
                        </button>
                    </div>

                    {currentPrice && volume && parseFloat(volume) > 0 && (
                        <div className="mt-4 p-3 bg-gray-100 border border-gray-900 rounded-lg">
                            <div className="text-sm text-black mb-2 font-medium">Order Summary:</div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Volume:</span>
                                    <span className="font-mono text-gray-900">{volume}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Leverage:</span>
                                    <span className="font-mono font-semibold text-gray-900">{leverage}x</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Order Price:</span>
                                    <span className="font-mono text-gray-900">
                                        ${currentPrice.toFixed(4)}
                                    </span>
                                </div>
                                <hr className="my-2 border-gray-300" />
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-700">Notional:</span>
                                    <span className="font-mono text-gray-900">
                                        ${(parseFloat(volume) * currentPrice).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-700">Required Margin:</span>
                                    <span className="font-mono text-gray-900">
                                        ${((parseFloat(volume) * currentPrice) / leverage).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RightSideBar;