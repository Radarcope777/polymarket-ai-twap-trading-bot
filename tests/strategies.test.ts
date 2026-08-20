import { describe, expect, it } from "vitest";
import { OrderBookStore } from "../src/core/order-book.js";
import { MeanReversionStrategy } from "../src/strategies/mean-reversion.js";
import { FundingArbitrageStrategy } from "../src/strategies/funding-arbitrage.js";
import { mergeSignals } from "../src/strategies/base.js";
import type { Candle } from "../src/api/grvt/types.js";

function buildCandles(count: number, base = 100): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() - (count - i) * 60_000,
    open: base + i * 0.1,
    high: base + i * 0.1 + 1,
    low: base + i * 0.1 - 1,
    close: base + i * 0.1,
    volume: 10,
  }));
}

describe("strategies", () => {
  const book = new OrderBookStore(10);
  book.applySnapshot({
    symbol: "BTC_USDT_Perp",
    bids: [{ price: 99, size: 5 }],
    asks: [{ price: 101, size: 5 }],
    timestamp: Date.now(),
  });

  const config = {
    orderSize: 0.001,
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    emaFast: 9,
    emaSlow: 21,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    momentumWindow: 20,
    fundingThresholdBps: 5,
  };

  it("returns neutral when data is insufficient", () => {
    const strategy = new MeanReversionStrategy();
    const candles = buildCandles(5);
    const closes = candles.map((c) => c.close);

    const signal = strategy.evaluate(
      {
        candles,
        closes,
        lastPrice: closes[closes.length - 1]!,
        markPrice: 100,
        fundingRate: 0,
        book,
        positionSize: 0,
        positionSide: "flat",
      },
      config,
    );

    expect(signal.side).toBeNull();
  });

  it("detects positive funding arbitrage short", () => {
    const strategy = new FundingArbitrageStrategy();
    const candles = buildCandles(30);

    const signal = strategy.evaluate(
      {
        candles,
        closes: candles.map((c) => c.close),
        lastPrice: 100,
        markPrice: 100,
        fundingRate: 0.001,
        book,
        positionSize: 0,
        positionSide: "flat",
      },
      config,
    );

    expect(signal.side).toBe("Sell");
    expect(signal.confidence).toBeGreaterThan(0);
  });

  it("merges signals with weights", () => {
    const merged = mergeSignals(
      [
        { side: "Buy", confidence: 0.8, reason: "a" },
        { side: "Sell", confidence: 0.2, reason: "b" },
      ],
      [1, 1],
    );

    expect(merged.side).toBe("Buy");
    expect(merged.confidence).toBeGreaterThan(0);
  });
});
