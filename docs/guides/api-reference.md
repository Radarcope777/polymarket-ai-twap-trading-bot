# API Reference

Base URL: `http://localhost:3001/api`

## Health & Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health and bot mode |
| GET | `/config` | Strategy config and environment |
| POST | `/config/strategy` | Update strategy thresholds |

## Markets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/markets/up-down` | List active Up/Down markets |
| GET | `/markets/:slug` | Market details |

## TWAP & Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/twap/live?symbol=btc/usd&window=30` | Live TWAP state |
| GET | `/signals/latest` | Latest AI signals |

## Backtest

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backtests` | Create backtest run |
| GET | `/backtests` | List runs |
| GET | `/backtests/:id` | Run details |
| GET | `/backtests/:id/equity-curve` | Equity curve data |
| GET | `/backtests/:id/trades` | Trade list |

## Paper Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/paper/sessions` | Start session |
| POST | `/paper/sessions/:id/stop` | Stop session |
| GET | `/paper/sessions/:id/pnl` | Session PnL |

## Live Trading (Guarded)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/live/arm` | Arm live trading |
| POST | `/live/disarm` | Disarm |
| GET | `/live/status` | Live status |

## WebSocket

Connect to `/ws/dashboard` (Socket.io) for real-time:
- `twap:update` — TWAP state changes
- `bot:state` — Bot mode and status
