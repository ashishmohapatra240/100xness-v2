export interface Order {
  id: string;
  userId: string;
  asset: string;
  side: "buy" | "sell" | "long" | "short";
  qty: number;
  leverage?: number;
  openingPrice: number;
  closingPrice?: number;
  createdAt: number | Date;
  status: "open" | "closed";
  takeProfit?: number;
  stopLoss?: number;
  pnl?: number;
  closeReason?: "TakeProfit" | "StopLoss" | "Manual" | "Liquidation" | "margin";
}

export interface UserBalance {
  symbol: string;
  balance: number;
  decimals: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface PriceData {
  s: string; // symbol
  b: string; // bid price
  a: string; // ask price
}

export interface EngineMessage {
  kind: "price-update" | "create-order" | "close-order" | "balance-update";
  payload: any;
}

export interface CreateOrderPayload {
  id: string;
  userId: string;
  asset: string;
  side: "buy" | "sell";
  qty: number;
  leverage?: number;
  takeProfit?: number;
  stopLoss?: number;
  balanceSnapshot: UserBalance[];
  enqueuedAt: number;
}

export interface CloseOrderPayload {
  orderId: string;
  userId: string;
  closeReason?: "TakeProfit" | "StopLoss" | "Manual" | "Liquidation";
  pnl?: number;
  closedAt: number;
}
