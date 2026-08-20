import { describe, expect, it } from "vitest";
import { FeatureEngine, SignalScorer } from "../src/ai/feature-engine.js";
import type { Candle, OrderBookSnapshot } from "../src/api/grvt/types.js";

describe("FeatureEngine", () => {
  const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
    timestamp: Date.now() - (50 - i) * 60_000,
    open: 100 + Math.sin(i / 5),
    high: 102 + Math.sin(i / 5),
    low: 98 + Math.sin(i / 5),
    close: 100 + Math.sin(i / 5),
    volume: 1,
  }));

  const book: OrderBookSnapshot = {
    symbol: "BTC_USDT_Perp",
    bids: [{ price: 99.5, size: 10 }],
    asks: [{ price: 100.5, size: 5 }],
    timestamp: Date.now(),
  };

  const config = {
    rsiPeriod: 14,
    emaFast: 9,
    emaSlow: 21,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    momentumWindow: 20,
  };

  it("extracts market features", () => {
    const engine = new FeatureEngine();
    const features = engine.extract(candles, book, 0.0001, config);

    expect(features.rsi).not.toBeNull();
    expect(features.orderBookImbalance).toBeGreaterThan(0);
    expect(features.fundingBps).toBeCloseTo(1, 0);
  });

  it("scores buy and sell signals", () => {
    const scorer = new SignalScorer();
    const score = scorer.score({
      rsi: 25,
      emaSpread: 0.002,
      macdHistogram: 1,
      bollingerPosition: 0.1,
      momentumPct: 0.5,
      orderBookImbalance: 0.3,
      spreadBps: 10,
      fundingBps: -10,
      volatility: 0.5,
    });

    expect(score.buyScore).toBeGreaterThan(score.sellScore);
    expect(score.summary.length).toBeGreaterThan(0);
  });
});
