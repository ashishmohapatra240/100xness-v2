import { useEffect, useState, useRef } from "react"

interface OrderBookData {
    bids: [string, string][];
    asks: [string, string][];
    symbol: string;
    timestamp: number;
}

export const useWs = () => {
    const [messages, setMessages] = useState<string[]>([]);
    const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    
    useEffect(() => {
        const connect = () => {
            try {
                const ws = new WebSocket("wss://ws.backpack.exchange/");
                wsRef.current = ws;
                
                ws.onopen = () => {
                    setIsConnected(true);
                    console.log('WebSocket connected to Backpack exchange');
                    
                    // Wait a moment before subscribing to ensure connection is stable
                    setTimeout(() => {
                        // Subscribe to trade stream
                        const tradeSubscribeMessage = {
                            method: "SUBSCRIBE",
                            params: ["trade.BTC_USDC"],
                            id: 1
                        };
                        ws.send(JSON.stringify(tradeSubscribeMessage));
                        console.log('Sent subscription for trade.BTC_USDC:', tradeSubscribeMessage);
                        
                        // Subscribe to depth stream  
                        setTimeout(() => {
                            const depthSubscribeMessage = {
                                method: "SUBSCRIBE",
                                params: ["depth.BTC_USDC"],
                                id: 2
                            };
                            ws.send(JSON.stringify(depthSubscribeMessage));
                            console.log('Sent subscription for depth.BTC_USDC:', depthSubscribeMessage);
                        }, 1000);
                    }, 1000);
                };
                
                ws.onmessage = (event) => {
                    console.log('🔔 Raw WebSocket message:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        console.log('📊 Parsed WebSocket data:', JSON.stringify(data, null, 2));
                        
                        // Handle subscription confirmations
                        if (data.id && data.result) {
                            console.log('✅ Subscription confirmation:', data);
                            return;
                        }
                        
                        // Handle error messages
                        if (data.error) {
                            console.error('❌ WebSocket error:', data.error);
                            return;
                        }
                        
                        // Handle stream data - check multiple possible formats
                        if (data.stream) {
                            console.log('🎯 Stream message detected:', data.stream);
                            
                            // Handle trade data
                            if (data.stream.includes('trade') && data.data) {
                                console.log('💹 Trade data received:', data.data);
                                setMessages((prev) => [event.data, ...prev.slice(0, 99)]);
                            }
                            // Handle orderbook depth data - try multiple formats
                            else if (data.stream.includes('depth') || data.stream.includes('orderbook')) {
                                console.log('📖 DEPTH DATA RECEIVED!');
                                console.log('📖 Full depth message:', JSON.stringify(data, null, 2));
                                
                                const symbol = data.stream.split('.')[1] || 'BTC_USDC';
                                
                                // Try different possible data structures
                                let bids = [];
                                let asks = [];
                                
                                if (data.data) {
                                    bids = data.data.bids || data.data.b || [];
                                    asks = data.data.asks || data.data.a || [];
                                } else if (data.bids || data.asks) {
                                    bids = data.bids || [];
                                    asks = data.asks || [];
                                }
                                
                                console.log('📖 Extracted bids:', bids);
                                console.log('📖 Extracted asks:', asks);
                                
                                // If we get empty arrays, add some mock data temporarily to test UI
                                if (bids.length === 0 && asks.length === 0) {
                                    console.log('📖 Got empty bid/ask arrays, using mock data for testing');
                                    bids = [["112250.00", "0.1"], ["112249.00", "0.5"]];
                                    asks = [["112252.00", "0.2"], ["112253.00", "0.3"]];
                                }
                                
                                const orderBookData = {
                                    bids: bids,
                                    asks: asks,
                                    symbol: symbol,
                                    timestamp: Date.now()
                                };
                                
                                setOrderBook(orderBookData);
                                console.log('📖 OrderBook state updated:', orderBookData);
                            }
                        } else {
                            console.log('❓ Unknown message format (no stream field):', data);
                            
                            // Sometimes data comes without stream field, check if it has bid/ask data directly
                            if (data.bids || data.asks || (data.data && (data.data.bids || data.data.asks))) {
                                console.log('📖 Found bid/ask data without stream field!');
                                
                                let bids = data.bids || (data.data && data.data.bids) || [];
                                let asks = data.asks || (data.data && data.data.asks) || [];
                                
                                const orderBookData = {
                                    bids: bids,
                                    asks: asks,
                                    symbol: 'BTC_USDC',
                                    timestamp: Date.now()
                                };
                                
                                setOrderBook(orderBookData);
                                console.log('📖 OrderBook updated from non-stream message:', orderBookData);
                            }
                        }
                    } catch (error) {
                        console.error('💥 Failed to parse WebSocket message:', error, event.data);
                    }
                };
                
                ws.onclose = () => {
                    setIsConnected(false);
                    console.log('WebSocket disconnected, attempting to reconnect...');
                    setTimeout(connect, 3000);
                };
                
                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setIsConnected(false);
                };
                
            } catch (error) {
                console.error('Failed to connect to WebSocket:', error);
                setIsConnected(false);
                setTimeout(connect, 3000);
            }
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return { messages, orderBook, isConnected };
}