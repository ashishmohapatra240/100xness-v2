"use client";
import Link from "next/link";
import Header from "../components/Header";

const Docs = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center my-20">
            <h1 className="text-4xl md:text-6xl font-medium text-black leading-tight mb-6 font-dm-sans tracking-tight">
              100xness{" "}
              <span className="italic font-instrument-serif tracking-normal">
                Documentation
              </span>
            </h1>
            <p className="text-sm md:text-md text-black mb-8 max-w-2xl mx-auto leading-relaxed font-ibm-plex-mono">
              Explore the technical architecture and implementation details of a
              high-performance trading engine.
            </p>
          </div>

          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tight">
                System Architecture
              </h2>
            </div>
            <div className="p-8">
              <div className="text-center mb-8">
                <img
                  src="/images/architecture.png"
                  alt="100xness System Architecture"
                  className="w-full max-w-4xl mx-auto border border-gray-200"
                />
              </div>
              <p className="text-gray-700 text-sm leading-relaxed max-w-4xl mx-auto">
                The system follows a microservices architecture with three core
                components communicating through Redis streams. Real-time price
                data flows from external exchanges through WebSocket
                connections, gets processed by the trading engine, and triggers
                automatic liquidations based on leverage and risk parameters.
              </p>
            </div>
          </div>

          {/* Core Components */}
          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tight">
                Core Components & Implementation
              </h2>
            </div>
            <div className="p-8 space-y-12">
              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Trading Engine
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      Order Processing Logic
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>
                        The trading engine processes orders through Redis
                        streams with real-time price validation:
                      </p>
                      <div className="bg-gray-50 p-4 font-ibm-plex-mono text-xs">
                        <div>
                          • Validates user balance against required margin
                        </div>
                        <div>
                          • Calculates opening price based on bid/ask spread
                        </div>
                        <div>• Deducts margin: (price × qty) / leverage</div>
                        <div>
                          • Stores order in memory for real-time monitoring
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      Liquidation Mechanism
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>
                        Automatic liquidation system runs on every price update:
                      </p>
                      <div className="bg-gray-50 p-4 font-ibm-plex-mono text-xs">
                        <div>• Take Profit: buy orders when price ≥ target</div>
                        <div>• Stop Loss: sell orders when price ≤ target</div>
                        <div>
                          • Margin Call: when remaining margin ≤ 5% of initial
                        </div>
                        <div>
                          • PnL calculation: (closing - opening) × qty × side
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-lg font-medium mb-4 font-dm-sans">
                    Redis Stream Communication
                  </h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 p-4">
                      <h5 className="font-medium mb-2">
                        engine-stream (Input)
                      </h5>
                      <div className="text-xs font-ibm-plex-mono text-gray-600 space-y-1">
                        <div>price-update: Real-time price data</div>
                        <div>create-order: New order requests</div>
                        <div>close-order: Manual order closures</div>
                      </div>
                    </div>
                    <div className="border border-gray-200 p-4">
                      <h5 className="font-medium mb-2">
                        callback-queue (Output)
                      </h5>
                      <div className="text-xs font-ibm-plex-mono text-gray-600 space-y-1">
                        <div>created: Order successfully created</div>
                        <div>closed: Order liquidated/closed</div>
                        <div>insufficient_balance: Margin not met</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Price Poller & WebSocket Integration
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      WebSocket Connection
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>
                        Connects to Backpack Exchange for real-time BTC_USDC
                        price feeds:
                      </p>
                      <div className="bg-black text-white p-4 font-ibm-plex-mono text-xs">
                        {`const subscribeMessage = {
  method: "SUBSCRIBE",
  params: ["bookTicker.BTC_USDC"],
  id: 1
};`}
                      </div>
                      <p>
                        Streams bid/ask prices directly to the trading engine
                        via Redis.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      Price Processing
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>
                        Every price update triggers immediate liquidation
                        checks:
                      </p>
                      <div className="bg-gray-50 p-4 font-ibm-plex-mono text-xs">
                        <div>• Bid price: Used for sell order executions</div>
                        <div>• Ask price: Used for buy order executions</div>
                        <div>• Mid price: (bid + ask) / 2 for display</div>
                        <div>• Spread: Difference between bid and ask</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Web Server Details */}
              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Web Server & API Layer
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      Authentication & Middleware
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>
                        JWT-based authentication with middleware protection:
                      </p>
                      <div className="bg-gray-50 p-4 font-ibm-plex-mono text-xs">
                        <div>• Token generation on login</div>
                        <div>
                          • Middleware validates JWT on protected routes
                        </div>
                        <div>
                          • User context injection for order association
                        </div>
                        <div>• Session management for persistent auth</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium mb-4 font-dm-sans">
                      Order Lifecycle Management
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <p>Complete order management with async communication:</p>
                      <div className="bg-gray-50 p-4 font-ibm-plex-mono text-xs">
                        <div>• Creates order in pending state</div>
                        <div>• Sends to engine via Redis stream</div>
                        <div>• Waits for callback confirmation</div>
                        <div>• Updates database with final status</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tight">
                API Reference
              </h2>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-6 font-dm-sans">
                    Authentication
                  </h3>
                  <div className="space-y-3 font-ibm-plex-mono text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        POST
                      </span>
                      <span className="text-gray-700">/auth/register</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        POST
                      </span>
                      <span className="text-gray-700">/auth/login</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        POST
                      </span>
                      <span className="text-gray-700">/auth/logout</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        GET
                      </span>
                      <span className="text-gray-700">/auth/me</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-6 font-dm-sans">
                    Trading
                  </h3>
                  <div className="space-y-3 font-ibm-plex-mono text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        POST
                      </span>
                      <span className="text-gray-700">/trade/create</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        POST
                      </span>
                      <span className="text-gray-700">
                        /trade/close/:orderId
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        GET
                      </span>
                      <span className="text-gray-700">/trade/orders</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        GET
                      </span>
                      <span className="text-gray-700">
                        /trade/orders/:orderId
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-6 font-dm-sans">
                    Balance
                  </h3>
                  <div className="space-y-3 font-ibm-plex-mono text-sm">
                    <div className="flex justify-between items-center py-2">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        GET
                      </span>
                      <span className="text-gray-700">/balance</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-6 font-dm-sans">
                    Candles
                  </h3>
                  <div className="space-y-3 font-ibm-plex-mono text-sm">
                    <div className="flex justify-between items-center py-2">
                      <span className="bg-gray-900 text-white px-3 py-1 text-xs">
                        GET
                      </span>
                      <span className="text-gray-700">/candles</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Database Schema */}
          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tight">
                Database Schema
              </h2>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 font-dm-sans">
                    Users
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700 font-ibm-plex-mono">
                    <div>id</div>
                    <div>email</div>
                    <div>password</div>
                    <div>name</div>
                  </div>
                </div>
                <div className="border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 font-dm-sans">
                    Assets
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700 font-ibm-plex-mono">
                    <div>symbol</div>
                    <div>balance</div>
                    <div>decimals</div>
                    <div>userId</div>
                  </div>
                </div>
                <div className="border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 font-dm-sans">
                    Orders
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700 font-ibm-plex-mono">
                    <div>id, userId, side, qty</div>
                    <div>openingPrice, closingPrice</div>
                    <div>status, leverage</div>
                    <div>takeProfit, stopLoss</div>
                    <div>pnl, closeReason</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Deep Dive */}
          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tight">
                Technical Deep Dive
              </h2>
            </div>
            <div className="p-8 space-y-12">
              {/* Real-time Data Flow */}
              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Real-time Data Flow
                </h3>
                <div className="space-y-6">
                  <div className="border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Price Update Sequence
                    </h4>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Backpack Exchange
                          </div>
                        </div>
                        <div className="text-gray-600">
                          WebSocket price feed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Price Poller
                          </div>
                        </div>
                        <div className="text-gray-600">
                          Parse & validate data
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Redis Stream
                          </div>
                        </div>
                        <div className="text-gray-600">Queue price updates</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Trading Engine
                          </div>
                        </div>
                        <div className="text-gray-600">
                          Process liquidations
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Order Creation Sequence
                    </h4>
                    <div className="grid md:grid-cols-5 gap-3 text-sm">
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Web UI
                          </div>
                        </div>
                        <div className="text-gray-600">User places order</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            API Server
                          </div>
                        </div>
                        <div className="text-gray-600">Validate & auth</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Redis Stream
                          </div>
                        </div>
                        <div className="text-gray-600">Queue order request</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Trading Engine
                          </div>
                        </div>
                        <div className="text-gray-600">Process & execute</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-gray-100 p-3 rounded mb-2">
                          <div className="font-ibm-plex-mono text-xs">
                            Callback
                          </div>
                        </div>
                        <div className="text-gray-600">Confirm to API</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Risk Management & Liquidation Engine
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Margin Calculation
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <div className="bg-black text-white p-4 font-ibm-plex-mono text-xs">
                        {`// Required margin calculation
const requiredMargin = (openingPrice * qty) / leverage;

// Remaining margin after PnL
const currentPnl = side === 'buy' 
  ? (currentPrice - openingPrice) * qty
  : (openingPrice - currentPrice) * qty;

const remainingMargin = initialMargin + currentPnl;`}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Liquidation Triggers
                    </h4>
                    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                      <div className="bg-gray-50 p-4 space-y-2">
                        <div className="font-medium">
                          Automatic Liquidation When:
                        </div>
                        <div className="font-ibm-plex-mono text-xs space-y-1">
                          <div>• Remaining margin ≤ 5% of initial margin</div>
                          <div>• Take profit price is reached</div>
                          <div>• Stop loss price is triggered</div>
                          <div>• Manual closure by user</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Optimizations */}
              <div>
                <h3 className="text-xl font-semibold text-black mb-6 font-dm-sans">
                  Performance & Scalability
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      In-Memory Processing
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <div>
                        • Open orders stored in memory for instant access
                      </div>
                      <div>• Price updates trigger immediate calculations</div>
                      <div>• Periodic database snapshots every 10 seconds</div>
                      <div>• Recovery from database on restart</div>
                    </div>
                  </div>
                  <div className="border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Async Communication
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <div>• Redis streams for decoupled services</div>
                      <div>• Non-blocking order processing</div>
                      <div>• Promise-based callback system</div>
                      <div>• Timeout handling for failed operations</div>
                    </div>
                  </div>
                  <div className="border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold mb-4 font-dm-sans">
                      Error Handling
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <div>• Graceful WebSocket reconnection</div>
                      <div>• Database transaction rollbacks</div>
                      <div>• Redis connection recovery</div>
                      <div>• Comprehensive logging system</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 mb-16">
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="text-2xl font-semibold text-black font-dm-sans tracking-tighter">
                Docker Setup
              </h2>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4 font-dm-sans">
                    Infrastructure Services
                  </h3>
                  <div className="bg-black text-white p-4 font-ibm-plex-mono text-sm">
                    {`# docker-compose.yml
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"

  postgres:
    image: postgres:latest
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=db
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data`}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4 font-dm-sans">
                    Service Roles
                  </h3>
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <div className="font-medium mb-1">Redis</div>
                      <div>• Manages Redis streams for async communication</div>
                      <div>• Handles engine-stream and callback-queue</div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">PostgreSQL</div>
                      <div>
                        • Persistent storage for users, orders, and balances
                      </div>
                      <div>• Accessed via Prisma ORM from the web server</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded mt-4">
                      <div className="font-medium text-sm">Quick Start:</div>
                      <div className="font-ibm-plex-mono text-xs mt-1">
                        docker compose up -d
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="border border-gray-200 p-12">
              <h2 className="text-3xl font-medium text-black mb-6 font-dm-sans">
                Ready to get{" "}
                <span className="italic font-instrument-serif tracking-normal">
                  started
                </span>
                ?
              </h2>
              <p className="text-sm md:text-md text-black mb-8 max-w-2xl mx-auto leading-relaxed font-ibm-plex-mono">
                Set up your development environment and start building with
                100xness. Join the world of limitless trading opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                <Link
                  href="/marketplace"
                  className="border-2 bg-black border-black text-white px-8 py-3 hover:bg-gray-800 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto text-center rounded-4xl"
                >
                  Try the Platform
                </Link>
                <a
                  href="https://github.com/ashishmohapatra240/100xness-v2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-black text-black bg-white px-8 py-3 hover:bg-gray-50 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto text-center rounded-4xl"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
