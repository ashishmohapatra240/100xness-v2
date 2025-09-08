import axiosInstance from '../lib/axios';
import { Balance, BalanceResponse, DepositRequest, DepositResponse } from '../types/balance.type';

export const balanceService = {
    getBalances: async (): Promise<BalanceResponse> => {
        const response = await axiosInstance.get<BalanceResponse>('/balance');
        return response.data;
    },

    getBalanceByAsset: async (symbol: string): Promise<Balance> => {
        const response = await axiosInstance.get<Balance>(`/balance/${symbol}`);
        return response.data;
    },

    deposit: async (depositData: DepositRequest): Promise<DepositResponse> => {
        const response = await axiosInstance.post<DepositResponse>('/balance/deposit', depositData);
        return response.data;
    }
};
