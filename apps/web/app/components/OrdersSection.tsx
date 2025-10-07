"use client";
import React, { useState, useMemo } from "react";
import { useGetOrders, useCloseOrder } from "../hooks/useOrders";
import { useWs } from "../hooks/useWs";

interface Order {
  id: string;
  symbol: string;
  orderType: "long" | "short";
  quantity: number | string;
  price: number | string;
  status: "open" | "closed";
  pnl?: number;
  createdAt: string;
  closedAt?: string;
  exitPrice?: number;
  leverage?: number;
  takeProfit?: number;
  stopLoss?: number;
  closeReason?: string;
}

interface TradeData {
  data: {
    s: string;
    p: string;
  };
  bid: number;
  ask: number;
}

const OrdersSection: React.FC = () => {
  const { data: ordersData, isLoading, error } = useGetOrders();
  const closeOrderMutation = useCloseOrder();
  const { messages, orderBook } = useWs();
  const [activeTab, setActiveTab] = useState<"open" | "all">("open");

  const currentPrices = useMemo(() => {
    const priceMap = new Map<
      string,
      { bid: number; ask: number; price: number }
    >();

    const tradeMap = new Map<string, number>();
    messages.forEach((message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.data && parsed.data.s && parsed.data.p) {
          const symbol = parsed.data.s.toLowerCase();
          const price = parseFloat(parsed.data.p);
          tradeMap.set(symbol, price);
        }
      } catch (error) {
        console.error("Error parsing websocket message:", error);
      }
    });

    if (orderBook && orderBook.symbol) {
      const symbol = orderBook.symbol.toLowerCase();
      const bid =
        orderBook.bids?.length > 0
          ? parseFloat(orderBook.bids[0]?.[0] || "0")
          : null;
      const ask =
        orderBook.asks?.length > 0
          ? parseFloat(orderBook.asks[0]?.[0] || "0")
          : null;
      const tradePrice = tradeMap.get(symbol);

      if (bid || ask || tradePrice) {
        priceMap.set(symbol, {
          bid: bid || tradePrice || 0,
          ask: ask || tradePrice || 0,
          price: tradePrice || bid || ask || 0,
        });
      }
    }

    tradeMap.forEach((price, symbol) => {
      if (!priceMap.has(symbol)) {
        priceMap.set(symbol, {
          bid: price,
          ask: price,
          price: price,
        });
      }
    });

    if (ordersData?.orders) {
      ordersData.orders.forEach((order: Order) => {
        const symbol = order.symbol.toLowerCase();
        const symbolWithUsdc = `${symbol}_usdc`;

        if (!priceMap.has(symbol) && !priceMap.has(symbolWithUsdc)) {
          const tradePrice =
            tradeMap.get(symbol) || tradeMap.get(symbolWithUsdc);
          if (tradePrice) {
            priceMap.set(symbol, {
              bid: tradePrice,
              ask: tradePrice,
              price: tradePrice,
            });
          }
        }
      });
    }

    return priceMap;
  }, [messages, orderBook, ordersData]);


  const calculatePnL = (order: Order) => {
    if (order.status === "closed") {
      return order.pnl || 0;
    }

    let currentPrice = currentPrices.get(order.symbol.toLowerCase());

    if (!currentPrice && !order.symbol.includes("_")) {
      currentPrice = currentPrices.get(`${order.symbol.toLowerCase()}_usdc`);
    }

    if (!currentPrice && order.symbol.includes("_")) {
      const baseSymbol = order.symbol.split("_")[0]?.toLowerCase();
      if (baseSymbol) {
        currentPrice = currentPrices.get(baseSymbol);
      }
    }

    if (!currentPrice || !order.price || !order.quantity) return 0;

    const entryPrice =
      typeof order.price === "number" ? order.price : parseFloat(order.price);

    // For PnL calculation, use the price at which the order would be closed:
    // Long orders would be closed at bid price (selling position)
    // Short orders would be closed at ask price (buying to cover)
    const marketPrice =
      order.orderType === "long" ? currentPrice.bid : currentPrice.ask;
    const quantity =
      typeof order.quantity === "number"
        ? order.quantity
        : parseFloat(order.quantity);

    if (isNaN(entryPrice) || isNaN(marketPrice) || isNaN(quantity)) return 0;

    if (order.orderType === "long") {
      return (marketPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - marketPrice) * quantity;
    }
  };

  const getCurrentPrice = (order: Order) => {
    if (order.status === "closed") {
      return order.exitPrice || 0;
    }

    let currentPrice = currentPrices.get(order.symbol.toLowerCase());

    if (!currentPrice && !order.symbol.includes("_")) {
      currentPrice = currentPrices.get(`${order.symbol.toLowerCase()}_usdc`);
    }

    if (!currentPrice && order.symbol.includes("_")) {
      const baseSymbol = order.symbol.split("_")[0]?.toLowerCase();
      if (baseSymbol) {
        currentPrice = currentPrices.get(baseSymbol);
      }
    }

    if (!currentPrice) return 0;

    return order.orderType === "long" ? currentPrice.bid : currentPrice.ask;
  };

  const handleCloseOrder = (orderId: string) => {
    closeOrderMutation.mutate({ id: orderId, closeReason: "Manual" });
  };

  const orders = ordersData?.orders || [];
  const filteredOrders =
    activeTab === "open"
      ? orders.filter((order: Order) => order.status === "open")
      : orders;

  if (isLoading) {
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="text-center">
          <p className="text-sm text-red-500">
            Error loading orders: {error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-black text-white rounded-4xl text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-4 py-2 text-sm font-medium rounded-4xl transition-colors ${
              activeTab === "open"
                ? "bg-black-100 text-black-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Open Orders (
            {orders.filter((o: Order) => o.status === "open").length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "all"
                ? "bg-black-100 text-black-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No {activeTab === "open" ? "open " : ""}orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-full">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notional
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PnL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leverage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Take Profit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order: Order) => {
                  const pnl = calculatePnL(order);
                  const currentPrice = getCurrentPrice(order);
                  const pnlValue =
                    typeof pnl === "number" ? pnl : parseFloat(pnl) || 0;
                  const isProfitable = pnlValue > 0;

                  return (
                    <tr
                      key={`${order.id}-${order.createdAt}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {order.symbol.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.orderType === "long"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {order.orderType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {(() => {
                          if (!order.quantity) return "---";
                          const qty =
                            typeof order.quantity === "number"
                              ? order.quantity
                              : parseFloat(order.quantity);
                          return isNaN(qty) ? "---" : qty;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {(() => {
                          if (!order.quantity || !order.price) return "---";
                          const qty =
                            typeof order.quantity === "number"
                              ? order.quantity
                              : parseFloat(order.quantity);
                          const price =
                            typeof order.price === "number"
                              ? order.price
                              : parseFloat(order.price);
                          if (isNaN(qty) || isNaN(price)) return "---";
                          const notional = qty * price;
                          return `$${notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        $
                        {(() => {
                          if (!order.price) return "---";
                          const price =
                            typeof order.price === "number"
                              ? order.price
                              : parseFloat(order.price);
                          return isNaN(price) ? "---" : price.toFixed(4);
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        $
                        {currentPrice && typeof currentPrice === "number"
                          ? currentPrice.toFixed(4)
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        <span
                          className={
                            isProfitable ? "text-green-600" : "text-red-600"
                          }
                        >
                          {isProfitable ? "+" : ""}$
                          {(() => {
                            if (!pnl && pnl !== 0) return "0.00";
                            const pnlValue =
                              typeof pnl === "number" ? pnl : parseFloat(pnl);
                            return isNaN(pnlValue)
                              ? "0.00"
                              : pnlValue.toFixed(2);
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {order.leverage ? `${order.leverage}x` : "1x"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {order.takeProfit && order.takeProfit > 0
                          ? `$${
                              typeof order.takeProfit === "number"
                                ? order.takeProfit.toFixed(4)
                                : parseFloat(order.takeProfit).toFixed(4)
                            }`
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {order.stopLoss && order.stopLoss > 0
                          ? `$${
                              typeof order.stopLoss === "number"
                                ? order.stopLoss.toFixed(4)
                                : parseFloat(order.stopLoss).toFixed(4)
                            }`
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === "open"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.closeReason ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.closeReason === "TakeProfit"
                                ? "bg-green-100 text-green-800"
                                : order.closeReason === "StopLoss"
                                  ? "bg-red-100 text-red-800"
                                  : order.closeReason === "Manual"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.closeReason === "Liquidation" ||
                                        order.closeReason === "margin"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {order.closeReason === "margin"
                              ? "Liquidation"
                              : order.closeReason}
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {order.status === "open" && (
                          <button
                            onClick={() => handleCloseOrder(order.id)}
                            disabled={closeOrderMutation.isPending}
                            className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {closeOrderMutation.isPending
                              ? "Closing..."
                              : "Close"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersSection;
