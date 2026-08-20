import { describe, it, expect } from 'vitest';
import { runBacktest, replayTwapWindow } from './backtest.js';

describe('backtest engine', () => {
  it('runs deterministic backtest replay', async () => {
    const result = await runBacktest({
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-31T00:00:00Z',
      assets: ['btc/usd', 'eth/usd'],
      durations: ['5m', '15m'],
      minEdge: 0.02,
      sliceCount: 5,
      modelVersion: 'baseline-v1',
      feeRate: 0.07,
      slippageBps: 30,
      takerDelayMs: 50,
    });

    expect(result.status).toBe('completed');
    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.metrics.winRate).toBeGreaterThan(0.5);
    expect(result.equityCurve.length).toBe(result.trades.length);
  });

  it('replays TWAP window deterministically', () => {
    const samples = Array.from({ length: 30 }, (_, i) => ({
      price: 100000 + i * 10,
      timestamp: Date.now() - (30 - i) * 1000,
    }));
    const projected = replayTwapWindow(samples, 'btc/usd', 30);
    expect(projected).toBeGreaterThan(100000);
  });
});
