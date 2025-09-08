export interface Balance {
    symbol: string;
    balance: number;
    decimals: number;
}

export interface BalanceResponse {
    userId: string;
    balances: Balance[];
}

export interface DepositRequest {
    symbol: string;
    amount: number;
    decimals?: number;
}

export interface DepositResponse {
    symbol: string;
    balance: number;
    decimals: number;
}
