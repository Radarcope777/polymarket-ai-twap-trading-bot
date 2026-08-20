import pino from 'pino';
import type { BotMode, StrategyConfig } from '@polymarket-twap/shared';

export const logger = pino({
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export interface BotState {
  mode: BotMode;
  liveArmed: boolean;
  rateLimitWarning: boolean;
  rateLimitTier: string;
  lastError?: string;
  strategy: StrategyConfig;
}

export const botState: BotState = {
  mode: 'IDLE',
  liveArmed: false,
  rateLimitWarning: false,
  rateLimitTier: 'Tier 2 — 120 req/s',
  strategy: {
    minEdgeAfterFees: Number(process.env.MIN_EDGE_AFTER_FEES ?? 0.02),
    maxSlippageBps: 50,
    sliceCount: 5,
    makerPreference: 0.7,
    maxDailyLossUsd: Number(process.env.MAX_DAILY_LOSS_USD ?? 500),
    maxPositionUsd: Number(process.env.MAX_POSITION_USD ?? 2000),
    enabledDurations: ['5m', '15m', '4h'],
    enabledAssets: ['btc/usd', 'eth/usd', 'sol/usd'],
  },
};

const backtests = new Map<string, import('@polymarket-twap/shared').BacktestResult>();

export function storeBacktest(result: import('@polymarket-twap/shared').BacktestResult): void {
  backtests.set(result.id, result);
}

export function getBacktest(id: string) {
  return backtests.get(id);
}

export function listBacktests() {
  return Array.from(backtests.values());
}
