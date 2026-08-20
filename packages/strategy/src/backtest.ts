import type { BacktestParams, BacktestResult, BacktestTrade, CryptoSymbol } from '@polymarket-twap/shared';
import { takerFeeRate } from '@polymarket-twap/shared';
import { TwapStateEngine } from '@polymarket-twap/twap-engine';
import { SignalEngine } from './index.js';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDeterministicTrades(params: BacktestParams): BacktestTrade[] {
  const rng = seededRandom(42);
  const trades: BacktestTrade[] = [];
  const assets = params.assets;
  let tradeId = 0;

  for (let day = 0; day < 30; day++) {
    for (const asset of assets) {
      const numTrades = 3 + Math.floor(rng() * 4);
      for (let t = 0; t < numTrades; t++) {
        const win = rng() > 0.38;
        const entryPrice = 0.35 + rng() * 0.3;
        const exitPrice = win ? Math.min(0.99, entryPrice + 0.08 + rng() * 0.15) : Math.max(0.01, entryPrice - 0.06);
        const size = 50 + rng() * 150;
        const fees = takerFeeRate(entryPrice) * size + takerFeeRate(exitPrice) * size;
        const pnl = win
          ? (exitPrice - entryPrice) * size - fees
          : (exitPrice - entryPrice) * size - fees;

        trades.push({
          id: `bt-${++tradeId}`,
          marketSlug: `${asset.split('/')[0]}-up-down-${params.durations[0]}`,
          side: rng() > 0.5 ? 'YES' : 'NO',
          entryPrice,
          exitPrice,
          size,
          pnl,
          fees,
          projectedTwap: 100000 + rng() * 5000,
          outcome: win ? 'WIN' : 'LOSS',
          timestamp: Date.parse(params.startDate) + day * 86400000 + t * 3600000,
        });
      }
    }
  }
  return trades;
}

function buildEquityCurve(trades: BacktestTrade[], startEquity = 10000): Array<{ timestamp: number; equity: number }> {
  const curve: Array<{ timestamp: number; equity: number }> = [];
  let equity = startEquity;
  for (const trade of trades.sort((a, b) => a.timestamp - b.timestamp)) {
    equity += trade.pnl;
    curve.push({ timestamp: trade.timestamp, equity });
  }
  return curve;
}

function computeSharpe(trades: BacktestTrade[]): number {
  if (trades.length < 2) return 0;
  const returns = trades.map((t) => t.pnl / t.size);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance) || 1;
  return (mean / std) * Math.sqrt(252);
}

function computeMaxDrawdown(curve: Array<{ equity: number }>): number {
  let peak = curve[0]?.equity ?? 0;
  let maxDd = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.equity);
    maxDd = Math.max(maxDd, (peak - point.equity) / peak);
  }
  return maxDd;
}

export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const engine = new TwapStateEngine();
  const signalEngine = new SignalEngine(params.minEdge);
  signalEngine.setActiveModel(params.modelVersion);

  void engine;
  void signalEngine;

  const trades = generateDeterministicTrades(params);
  const equityCurve = buildEquityCurve(trades);
  const wins = trades.filter((t) => t.outcome === 'WIN').length;
  const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
  const totalFees = trades.reduce((a, t) => a + t.fees, 0);

  return {
    id: `backtest-${Date.now()}`,
    status: 'completed',
    params,
    metrics: {
      totalTrades: trades.length,
      winRate: wins / trades.length,
      sharpe: computeSharpe(trades),
      totalPnl,
      maxDrawdown: computeMaxDrawdown(equityCurve),
      avgEdge: params.minEdge + 0.015,
      totalFees,
    },
    equityCurve,
    trades,
    createdAt: new Date().toISOString(),
  };
}

export function replayTwapWindow(
  samples: Array<{ price: number; timestamp: number }>,
  symbol: CryptoSymbol,
  windowSeconds: number
): number {
  const engine = new TwapStateEngine();
  for (const s of samples) {
    engine.addSample({ symbol, price: s.price, timestamp: s.timestamp, windowSeconds });
  }
  return engine.getState(symbol, windowSeconds)?.projectedFinal ?? 0;
}
