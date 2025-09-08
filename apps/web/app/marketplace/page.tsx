"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries,
} from "lightweight-charts";
import { useGetCandles } from "../hooks/useCandles";
import { Candle } from "../types/candle.type";
import { useGetBalances } from "../hooks/useBalance";
import IntervalSelector from "../components/IntervalSelector";
import LeftSideBar from "../components/LeftSideBar";
import RightSideBar from "../components/RightSideBar";
import OrdersSection from "../components/OrdersSection";
import DepositModal from "../components/DepositModal";

const Marketplace = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [selectedInterval, setSelectedInterval] = useState("5m");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  
  const { data: balanceData, isLoading: balanceLoading } = useGetBalances();

  // Calculate total balance in USDC
  const totalBalance = balanceData?.balances?.reduce((total, balance) => {
    if (balance.symbol === 'USDC') {
      return total + balance.balance;
    }
    // For BTC, you might want to convert to USDC using current price
    // For now, we'll just show USDC balance
    return total;
  }, 0) || 0;

  const { data, isLoading, isError } = useGetCandles(
    selectedInterval,
    0,
    0,
    "BTC_USDC"
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const initChart = () => {
      if (!containerRef.current) return;

      // Clear any existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      // Get parent container dimensions
      const parentElement = containerRef.current.parentElement;
      const rect = parentElement?.getBoundingClientRect() || containerRef.current.getBoundingClientRect();
      
      const containerWidth = Math.max(rect.width - 20, 600); // Account for padding
      const containerHeight = Math.max(rect.height - 20, 400); // Account for padding

      console.log(`Chart dimensions: ${containerWidth}x${containerHeight}`);

      const chart = createChart(containerRef.current, {
        width: containerWidth,
        height: containerHeight,
        layout: { 
          background: { color: "#ffffff" }, 
          textColor: "#374151",
          fontSize: 12
        },
        crosshair: { mode: CrosshairMode.Normal },
        grid: {
          vertLines: { color: "#e5e7eb" },
          horzLines: { color: "#e5e7eb" },
        },
        timeScale: { borderColor: "#d1d5db" },
        rightPriceScale: { borderColor: "#d1d5db" },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      chartRef.current = chart;

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#00b050",
        downColor: "#ff4976",
        borderDownColor: "#ff4976",
        borderUpColor: "#00b050",
        wickDownColor: "#838ca1",
        wickUpColor: "#838ca1",
      });
      seriesRef.current = series;

      // Enhanced resize observer
      const ro = new ResizeObserver((entries) => {
        if (entries[0] && chartRef.current) {
          const { width, height } = entries[0].contentRect;
          if (width > 100 && height > 100) {
            console.log(`Resizing chart to: ${width}x${height}`);
            chart.applyOptions({ width: width - 10, height: height - 10 });
            chart.timeScale().fitContent();
          }
        }
      });
      
      if (containerRef.current.parentElement) {
        ro.observe(containerRef.current.parentElement);
      }
      resizeObserverRef.current = ro;
    };

    // Initialize with a delay to ensure DOM is ready
    const timer = setTimeout(initChart, 100);

    return () => {
      clearTimeout(timer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data || isLoading || isError) return;

    // Debug logging
    console.log('Frontend received data:', data.slice(0, 2));
    console.log('Current time:', new Date().toISOString());
    console.log('Current Unix timestamp:', Math.floor(Date.now() / 1000));

    const mapped: CandlestickData[] = data.map((row: Candle) => {
      // Handle timestamp - could be string or number from the API
      let timestamp: number;
      const timeValue = row.bucket ?? row.time ?? "";
      
      if (typeof timeValue === 'string') {
        // If it's a string, try to parse it as a date or number
        const parsedNumber = Number(timeValue);
        if (!isNaN(parsedNumber)) {
          // It's a numeric string (Unix timestamp)
          timestamp = parsedNumber;
          // If it's in milliseconds, convert to seconds
          if (timestamp > 1000000000000) {
            timestamp = Math.floor(timestamp / 1000);
          }
        } else {
          // It's a date string
          timestamp = Math.floor(new Date(timeValue).getTime() / 1000);
        }
      } else {
        // It's already a number
        timestamp = timeValue;
        // If it's in milliseconds, convert to seconds
        if (timestamp > 1000000000000) {
          timestamp = Math.floor(timestamp / 1000);
        }
      }

      return {
        time: timestamp as UTCTimestamp,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      };
    });

    mapped.sort((a, b) => (a.time as number) - (b.time as number));

    // Debug the final mapped data
    console.log('Final mapped data sample:', mapped.slice(0, 2));
    console.log('Latest mapped timestamp:', mapped[mapped.length - 1]?.time);
    console.log('Latest mapped date:', new Date((mapped[mapped.length - 1]?.time as number) * 1000).toISOString());

    seriesRef.current.setData(mapped);
    chartRef.current?.timeScale().fitContent();
  }, [data, isLoading, isError]);

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-2 md:px-6 lg:px-4 flex-shrink-0">
        <div className="mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <h1 className="text-xl font-semibold text-black font-ibm-plex-mono">
                100xness
              </h1>
            </div>

            <button
              className="md:hidden p-2 text-gray-600 hover:text-black"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <div className="hidden md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-6 lg:gap-8">
              <nav className="flex items-center gap-6 lg:gap-8">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-black transition-colors font-instrument-sans"
                >
                  Home
                </Link>
                <Link
                  href="/trade"
                  className="text-gray-600 hover:text-black transition-colors font-instrument-sans"
                >
                  Trade
                </Link>
                <Link
                  href="/marketplace"
                  className="text-black font-semibold font-instrument-sans"
                >
                  Marketplace
                </Link>
              </nav>

              <div className="flex items-center gap-4 lg:gap-6 pl-6 lg:pl-8 border-l border-gray-300">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Timeframe:</span>
                  <IntervalSelector
                    selectedInterval={selectedInterval}
                    onIntervalChange={setSelectedInterval}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Balance:</span>
                <span className="text-lg font-semibold text-black font-ibm-plex-mono">
                  {balanceLoading ? 'Loading...' : `$${totalBalance.toLocaleString()}`}
                </span>
              </div>
              <button 
                onClick={() => setIsDepositModalOpen(true)}
                className="bg-black text-white text-sm px-6 py-2 rounded-lg font-medium transition-colors hover:bg-gray-800 cursor-pointer"
              >
                Deposit
              </button>
            </div>
          </div>

          <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <nav className="flex flex-col gap-3 pb-4 border-b border-gray-200">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-black transition-colors font-instrument-sans"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/trade"
                  className="text-gray-600 hover:text-black transition-colors font-instrument-sans"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Trade
                </Link>
                <Link
                  href="/marketplace"
                  className="text-black font-semibold font-instrument-sans"
                >
                  Marketplace
                </Link>
                {/* <Link 
                                    href="/login" 
                                    className="text-gray-600 hover:text-black transition-colors font-instrument-sans"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Login
                                </Link> */}
              </nav>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Balance:</span>
                  <span className="text-lg font-semibold text-white font-ibm-plex-mono">
                    {balanceLoading ? 'Loading...' : `$${totalBalance.toLocaleString()}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-600">Timeframe:</span>
                  <IntervalSelector
                    selectedInterval={selectedInterval}
                    onIntervalChange={setSelectedInterval}
                    className="w-full"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => setIsDepositModalOpen(true)}
                    className="w-full text-white text-sm px-4 py-3 rounded-lg font-medium transition-colors hover:bg-gray-800"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        <LeftSideBar />

        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex-1 relative bg-white" style={{ height: 'calc(100% - 200px)', minHeight: '400px' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="text-center">
                  <div className="text-black text-lg mb-2">
                    Loading chart data...
                  </div>
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
            {isError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="text-center p-4">
                  <div className="text-red-600 text-lg mb-2">
                    Error loading chart data
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-white border-2 border-black text-black px-4 py-2 rounded-lg text-sm transition-colors hover:bg-black hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            <div
              ref={containerRef}
              className="w-full h-full"
              style={{ 
                border: '2px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          <div className="h-48 flex-shrink-0 border-t border-gray-200 bg-white">
            <OrdersSection />
          </div>
        </div>

        <div className="hidden lg:block">
          <RightSideBar selectedSymbol={"BTC_USDC"} />
        </div>
      </div>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
      />
    </div>
  );
};

export default Marketplace;
