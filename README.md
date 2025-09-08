# 100xness

A real-time options trading platform like [Exness](https://www.exness.com/) built with Node.js, Express, PostgreSQL, and Next.js frontend.

## Monorepo Structure

This project uses [Turborepo](https://turbo.build/) for monorepo management and includes:

- **Backend** (`apps/backend/`) - Node.js/Express API server with trading engine
- **Web** (`apps/web/`) - Next.js frontend application
- **Shared Packages** (`packages/`) - Shared utilities, UI components, and configurations

## Overview

### 1. **Web Server** (`src/server/`)

- Used for user registration and login with JWT, Order creation and management and Balance checking
- Built with express and typescript

### 2. **Trading Engine** (`src/engine/`)

- Processes trading orders and manages real-time trading logic, Monitors open positions for take-profit and stop-loss, Handles automatic order closures, Manages user balances in real-time, Saves order data to the database
- Built with Node with Redis streams

### 3. **Price Poller** (`src/price-poller/`)

- Fetches real-time BTC_USDC prices by a WebSocket connection to Backpack Exchange and sends price data to the trading engine

## Architecture

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

The backend has three separate services that need to be running:

1. **Start the Web Server:**

   ```bash
   pnpm run dev:server
   ```

2. **Start the Trading Engine:**

   ```bash
   pnpm run dev:engine
   ```

3. **Start the Price Poller:**
   ```bash
   pnpm run dev:price-poller
   ```

**Note**: All three services must be running for the platform to work properly.

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

### Redis Streams

- `engine-stream`: Orders and price updates flow through this
- `callback-queue`: Responses and confirmations flow through this

## Turbo Development

This project uses Turborepo for efficient monorepo development:

### Turbo Commands

- `pnpm run dev` - Start all applications in development mode
- `pnpm run build` - Build all packages and applications
- `pnpm run lint` - Lint all packages
- `pnpm run check-types` - Type check all packages
- `pnpm run format` - Format code with Prettier