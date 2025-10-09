import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../services/order.service";
import toast from "react-hot-toast";

type OrderType = 'long' | 'short';

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ quantity, orderType, symbol, takeProfit, stopLoss, leverage }: { 
            quantity: number, 
            orderType: OrderType, 
            symbol: string,
            takeProfit?: number,
            stopLoss?: number,
            leverage?: number
        }) => orderService.createOrder(quantity, orderType, symbol, takeProfit, stopLoss, leverage),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: ['orders'] });
            toast.success('Order created successfully');
        },
        onError: (error: any) => {
            console.error('Create order error:', error);
            toast.error(error?.response?.data?.error || 'Create order failed');
        }
    })
}

export const useGetOrders = () => {
    return useQuery({
        queryKey: ['orders'],
        queryFn: () => orderService.getOrders()
    })
}


export const useGetOrderById = (id: string) => {
    return useQuery({
        queryKey: ['order', id],
        queryFn: () => orderService.getOrderById(id)
    })
}

export const useCloseOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, pnl, closeReason }: { id: string, pnl?: number, closeReason?: string }) => 
            orderService.closeOrder(id, pnl, closeReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.refetchQueries({ queryKey: ['orders'] });
            toast.success('Order closed successfully');
        },
        onError: (error: any) => {
            console.error('Close order error:', error);
            toast.error(error?.response?.data?.error || 'Close order failed');
        }
    })
}