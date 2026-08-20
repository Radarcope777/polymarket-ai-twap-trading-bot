# Polymarket TWAP Trading Setup Guide

This guide walks you through setting up the **Polymarket TWAP Trading Bot – CLOB V2 AI Crypto Up/Down Prediction Market Bot with Backtest & Paper Trading Dashboard** for local development.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (optional, for PostgreSQL + Redis)
- Polymarket wallet with pUSD collateral (for live trading only)

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/polymarket-twap-trading-bot-clob-v2-ai-crypto-up-down-prediction-market-bot-backtest-paper-trading-dashboard.git
cd polymarket-twap-trading-bot-clob-v2-ai-crypto-up-down-prediction-market-bot-backtest-paper-trading-dashboard
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

Open http://localhost:5173 for the dashboard and http://localhost:3001/api/health for the API.

## Modes

| Mode | Command | Description |
|------|---------|-------------|
| Backtest | Dashboard → Backtest Lab | Replay TWAP windows with fee-aware simulation |
| Paper | Dashboard → Paper Trading | Live feeds, simulated fills |
| Live | `LIVE_TRADING=true` + arm | Real CLOB V2 orders (guarded) |

## Polymarket V2 Notes

- Collateral: **pUSD** (not legacy USDC.e)
- SDK: `@polymarket/client` (unified, not archived clob-client V1)
- EIP-712 domain version **2**
- TWAP settlement via Chainlink RTDS (30s for 5m, 60s for 15m/4h)

See [TWAP Settlement Explained](./twap-settlement.md) for oracle TWAP vs bot TWAP execution.
