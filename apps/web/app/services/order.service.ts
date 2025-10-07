import axiosInstance from "../lib/axios";

type OrderType = 'long' | 'short';

export const orderService = {
    createOrder: async (quantity: number, orderType: OrderType, symbol: string, takeProfit?: number, stopLoss?: number, leverage: number = 1) => {
        const side = orderType;
        
        const asset = symbol.split('_')[0] || symbol;
        
        const payload: {
            asset: string;
            side: string;
            status: string;
            qty: number;
            leverage: number;
            takeProfit?: number;
            stopLoss?: number;
        } = { 
            asset, 
            side, 
            status: 'open',
            qty: quantity,
            leverage: leverage
        };
        
        if (takeProfit !== undefined) payload.takeProfit = takeProfit;
        if (stopLoss !== undefined) payload.stopLoss = stopLoss;
        
        const response = await axiosInstance.post('/trade/open', payload);
        return response.data;
    },
    getOrders: async () => {
        const response = await axiosInstance.get('/trade/orders')
        return response.data;
    },
    getOrderById: async (id: string) => {
        const response = await axiosInstance.get(`/trade/orders/${id}`)
        return response.data;
    },
    closeOrder: async (id: string, pnl?: number, closeReason?: string) => {
        const payload: {
            pnl?: number;
            closeReason?: string;
        } = {};
        
        if (pnl !== undefined) payload.pnl = pnl;
        if (closeReason) payload.closeReason = closeReason;
        
        const response = await axiosInstance.post(`/trade/close/${id}`, payload);
        return response.data;
    },
}
