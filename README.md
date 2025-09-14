# 100xness

A real-time options trading platform like [Exness](https://www.exness.com/) built with Node.js, Express, PostgreSQL, and Next.js frontend.

## Monorepo Structure

This project uses [Turborepo](https://turbo.build/) for monorepo management and includes:

- **API Service** (`apps/api-service/`) - Express API server for authentication, trading, and balance management (Port 3001)
- **Engine Service** (`apps/engine-service/`) - Trading engine for order processing and price monitoring (Port 3002)
- **Price Poller Service** (`apps/price-poller-service/`) - WebSocket connection to Backpack Exchange for real-time prices (Port 3003)
- **Web** (`apps/web/`) - Next.js frontend application
- **Shared Packages** (`packages/`) - Shared utilities, UI components, types, and configurations

## Overview

### 1. **API Service** (`apps/api-service/`)

- HTTP API server for user authentication (JWT), order management, balance operations, and candle data
- Communicates with the Trading Engine via Redis streams
- Built with Express.js and TypeScript
- Runs on **Port 3001**

### 2. **Engine Service** (`apps/engine-service/`)

- Core trading engine that processes orders, manages positions, handles liquidations
- Monitors open positions for take-profit and stop-loss triggers
- Manages user balances in real-time and saves order data to the database
- Built with Node.js and Redis streams
- Runs on **Port 3002**

### 3. **Price Poller Service** (`apps/price-poller-service/`)

- Maintains WebSocket connection to Backpack Exchange for real-time BTC_USDC prices
- Sends price updates to the trading engine via Redis streams
- Built with Node.js and WebSocket
- Runs on **Port 3003**

## Architecture
<img width="1345" height="742" alt="image" src="https://github.com/user-attachments/assets/36d47a4d-3350-489f-9628-7a1f5a1b5878" />


## Database Structure

The system uses PostgreSQL with Prisma ORM.

### Users

```
id
email
password
name
```

### Assets

```
symbol
balance
decimals
userId
```

### Orders

```
id
userId
side
qty
openingPrice
closingPrice
status
leverage
takeProfit
stopLoss
pnl
closeReason
```

## Setup Project

### Prerequisites

- Node.js
- Docker
- PostgreSQL database (using docker)
- Redis server (using docker)
- pnpm package manager

### Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/trading_db"
   REDIS_URL="redis://localhost:6379"
   PORT=3001
   ```

3. **Start Docker:**

   ```bash
   docker compose up -d
   ```

4. **Set up the database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

### Running the Application

#### Using Turbo (Recommended)

**Start all services:**

```bash
pnpm run dev
```

**Start specific services:**

```bash
pnpm run build
pnpm run lint
pnpm run check-types
```

#### Manual Service Management

The backend consists of three separate microservices that need to be running:

1. **Start the API Service (Port 3001):**

   ```bash
   pnpm run dev:api
   ```

2. **Start the Engine Service (Port 3002):**

   ```bash
   pnpm run dev:engine
   ```

3. **Start the Price Poller Service (Port 3003):**
   ```bash
   pnpm run dev:price-poller
   ```

**Note**: All three services must be running for the platform to work properly.

#### Production Service

For production builds:

1. **Build and start API Service:**
   ```bash
   pnpm run start:api
   ```

2. **Build and start Engine Service:**
   ```bash
   pnpm run start:engine
   ```

3. **Build and start Price Poller Service:**
   ```bash
   pnpm run start:price-poller
   ```

## API Endpoints

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Trading

- `POST /trade/create`
- `POST /trade/close/:orderId`
- `GET /trade/orders`
- `GET /trade/orders/:orderId`

### Balance

- `GET /balance`

### Candles (Price Data)

- `GET /candles`

### Inter-Service Communication

The services communicate via Redis streams:

- `engine-stream`: Price updates and order requests flow from API Service and Price Poller to Engine Service
- `callback-queue`: Order confirmations and status updates flow from Engine Service back to API Service

**Service Ports:**
- API Service: 3001
- Engine Service: 3002 (internal processing, no HTTP endpoints)
- Price Poller Service: 3003 (internal processing, no HTTP endpoints)

## Turbo Development

This project uses Turborepo for efficient monorepo development:

### Turbo Commands

- `pnpm run dev` - Start all applications in development mode
- `pnpm run build` - Build all packages and applications
- `pnpm run lint` - Lint all packages
- `pnpm run check-types` - Type check all packages
- `pnpm run format` - Format code with Prettier
