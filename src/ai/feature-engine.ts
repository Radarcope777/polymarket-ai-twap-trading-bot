import type { Candle, OrderBookSnapshot } from "../api/grvt/types.js";
import { latestBollinger, latestEma, latestMacd, latestRsi } from "../indicators/index.js";
import { clamp, ratioToBps } from "../utils/decimal.js";

export interface MarketFeatures {
  rsi: number | null;
  emaSpread: number | null;
  macdHistogram: number | null;
  bollingerPosition: number | null;
  momentumPct: number | null;
  orderBookImbalance: number;
  spreadBps: number | null;
  fundingBps: number;
  volatility: number | null;
}

export interface FeatureEngineConfig {
  rsiPeriod: number;
  emaFast: number;
  emaSlow: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
  momentumWindow: number;
}

export class FeatureEngine {
  extract(
    candles: Candle[],
    book: OrderBookSnapshot | null,
    fundingRate: number,
    config: FeatureEngineConfig,
  ): MarketFeatures {
    const closes = candles.map((c) => c.close);
    const rsiVal = latestRsi(closes, config.rsiPeriod);
    const emaFast = latestEma(closes, config.emaFast);
    const emaSlow = latestEma(closes, config.emaSlow);
    const macdData = latestMacd(closes);
    const bands = latestBollinger(closes, config.bollingerPeriod, config.bollingerStdDev);

    let momentumPct: number | null = null;
    if (closes.length >= config.momentumWindow) {
      const start = closes[closes.length - config.momentumWindow]!;
      const end = closes[closes.length - 1]!;
      momentumPct = start === 0 ? 0 : ((end - start) / start) * 100;
    }

    let bollingerPosition: number | null = null;
    if (bands && closes.length > 0) {
      const last = closes[closes.length - 1]!;
      const range = bands.upper - bands.lower;
      bollingerPosition = range === 0 ? 0.5 : clamp((last - bands.lower) / range, 0, 1);
    }

    let orderBookImbalance = 0;
    let spreadBps: number | null = null;

    if (book && book.bids.length > 0 && book.asks.length > 0) {
      const bidVol = book.bids.slice(0, 5).reduce((s, l) => s + l.size, 0);
      const askVol = book.asks.slice(0, 5).reduce((s, l) => s + l.size, 0);
      const total = bidVol + askVol;
      orderBookImbalance = total === 0 ? 0 : (bidVol - askVol) / total;

      const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;
      spreadBps = mid === 0 ? null : ((book.asks[0]!.price - book.bids[0]!.price) / mid) * 10_000;
    }

    let volatility: number | null = null;
    if (closes.length >= 20) {
      const returns: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        const prev = closes[i - 1]!;
        if (prev !== 0) {
          returns.push((closes[i]! - prev) / prev);
        }
      }
      if (returns.length > 0) {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
        volatility = Math.sqrt(variance) * 100;
      }
    }

    return {
      rsi: rsiVal,
      emaSpread: emaFast !== null && emaSlow !== null && emaSlow !== 0
        ? (emaFast - emaSlow) / emaSlow
        : null,
      macdHistogram: macdData?.histogram ?? null,
      bollingerPosition,
      momentumPct,
      orderBookImbalance,
      spreadBps,
      fundingBps: ratioToBps(fundingRate),
      volatility,
    };
  }
}

export class SignalScorer {
  score(features: MarketFeatures): { buyScore: number; sellScore: number; summary: string } {
    let buyScore = 0;
    let sellScore = 0;
    const parts: string[] = [];

    if (features.rsi !== null) {
      if (features.rsi < 35) {
        buyScore += 0.25;
        parts.push(`RSI oversold (${features.rsi.toFixed(1)})`);
      } else if (features.rsi > 65) {
        sellScore += 0.25;
        parts.push(`RSI overbought (${features.rsi.toFixed(1)})`);
      }
    }

    if (features.emaSpread !== null) {
      if (features.emaSpread > 0.001) {
        buyScore += 0.2;
        parts.push("EMA bullish");
      } else if (features.emaSpread < -0.001) {
        sellScore += 0.2;
        parts.push("EMA bearish");
      }
    }

    if (features.macdHistogram !== null) {
      if (features.macdHistogram > 0) buyScore += 0.15;
      else if (features.macdHistogram < 0) sellScore += 0.15;
    }

    if (features.bollingerPosition !== null) {
      if (features.bollingerPosition < 0.2) buyScore += 0.15;
      else if (features.bollingerPosition > 0.8) sellScore += 0.15;
    }

    if (features.momentumPct !== null) {
      if (features.momentumPct > 0.2) buyScore += 0.15;
      else if (features.momentumPct < -0.2) sellScore += 0.15;
    }

    if (features.orderBookImbalance > 0.15) buyScore += 0.1;
    else if (features.orderBookImbalance < -0.15) sellScore += 0.1;

    if (features.fundingBps > 5) sellScore += 0.1;
    else if (features.fundingBps < -5) buyScore += 0.1;

    return {
      buyScore: clamp(buyScore, 0, 1),
      sellScore: clamp(sellScore, 0, 1),
      summary: parts.length > 0 ? parts.join(", ") : "neutral market",
    };
  }
}
