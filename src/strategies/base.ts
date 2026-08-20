import type { Candle, PositionSide, StrategySignal } from "../api/grvt/types.js";
import type { OrderBookStore } from "../core/order-book.js";

export interface StrategyContext {
  candles: Candle[];
  closes: number[];
  lastPrice: number;
  markPrice: number;
  fundingRate: number;
  book: OrderBookStore;
  positionSize: number;
  positionSide: PositionSide;
}

export interface StrategyConfig {
  orderSize: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  emaFast: number;
  emaSlow: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
  momentumWindow: number;
  fundingThresholdBps: number;
}

export interface TradingStrategy {
  readonly name: string;
  evaluate(ctx: StrategyContext, config: StrategyConfig): StrategySignal;
}

export function mergeSignals(
  signals: StrategySignal[],
  weights: number[],
): StrategySignal {
  if (signals.length === 0) {
    return { side: null, confidence: 0, reason: "no signals" };
  }

  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i]!;
    const weight = weights[i] ?? 1;
    reasons.push(`${signal.reason} (${(signal.confidence * 100).toFixed(0)}%)`);

    if (signal.side === "Buy") {
      buyScore += signal.confidence * weight;
    } else if (signal.side === "Sell") {
      sellScore += signal.confidence * weight;
    }
  }

  const net = buyScore - sellScore;
  const confidence = Math.min(1, Math.abs(net));

  if (confidence < 0.15) {
    return {
      side: null,
      confidence,
      reason: reasons.join("; "),
    };
  }

  return {
    side: net > 0 ? "Buy" : "Sell",
    confidence,
    reason: reasons.join("; "),
  };
}

export function positionSideFromSize(size: number): PositionSide {
  if (size > 0) return "long";
  if (size < 0) return "short";
  return "flat";
}
