import { latestEma } from "../indicators/index.js";
import { clamp } from "../utils/decimal.js";
import type { StrategyContext, StrategyConfig, TradingStrategy } from "./base.js";

export class TrendFollowingStrategy implements TradingStrategy {
  readonly name = "trend_following";

  evaluate(ctx: StrategyContext, config: StrategyConfig) {
    const { closes, lastPrice, book } = ctx;

    if (closes.length < config.emaSlow) {
      return { side: null, confidence: 0, reason: "insufficient data for EMA" };
    }

    const emaFast = latestEma(closes, config.emaFast);
    const emaSlow = latestEma(closes, config.emaSlow);

    if (emaFast === null || emaSlow === null) {
      return { side: null, confidence: 0, reason: "EMA not ready" };
    }

    const spread = (emaFast - emaSlow) / emaSlow;
    const obi = book.orderBookImbalance(5);

    if (spread > 0.002 && lastPrice > emaFast && obi > 0) {
      const confidence = clamp(0.35 + spread * 50 + obi * 0.2, 0, 1);
      return {
        side: "Buy" as const,
        confidence,
        reason: `trend long: EMA spread ${(spread * 100).toFixed(3)}%, OBI ${obi.toFixed(3)}`,
      };
    }

    if (spread < -0.002 && lastPrice < emaFast && obi < 0) {
      const confidence = clamp(0.35 + Math.abs(spread) * 50 + Math.abs(obi) * 0.2, 0, 1);
      return {
        side: "Sell" as const,
        confidence,
        reason: `trend short: EMA spread ${(spread * 100).toFixed(3)}%, OBI ${obi.toFixed(3)}`,
      };
    }

    return {
      side: null,
      confidence: 0,
      reason: `no trend signal (EMA spread ${(spread * 100).toFixed(3)}%)`,
    };
  }
}
