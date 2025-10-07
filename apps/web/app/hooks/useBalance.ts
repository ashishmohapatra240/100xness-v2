import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { balanceService } from '../services/balance.service';
import { DepositRequest } from '../types/balance.type';
import { toast } from 'react-hot-toast';

export const useGetBalances = () => {
    return useQuery({
        queryKey: ['balances'],
        queryFn: balanceService.getBalances,
        staleTime: 30000,
        refetchInterval: 60000,
    });
};

export const useGetBalanceByAsset = (symbol: string) => {
    return useQuery({
        queryKey: ['balance', symbol],
        queryFn: () => balanceService.getBalanceByAsset(symbol),
        enabled: !!symbol,
        staleTime: 30000,
        refetchInterval: 60000,
    });
};

export const useDeposit = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (depositData: DepositRequest) => balanceService.deposit(depositData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['balances'] });
            queryClient.invalidateQueries({ queryKey: ['balance', data.symbol] });
            
            const displayBalance = data.balance / Math.pow(10, data.decimals);
            toast.success(`Successfully deposited ${displayBalance.toFixed(data.decimals)} ${data.symbol}`);
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error || 'Failed to deposit';
            toast.error(errorMessage);
        },
    });
};
