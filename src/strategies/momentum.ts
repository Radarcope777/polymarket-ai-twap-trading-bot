import { latestMacd } from "../indicators/index.js";
import { clamp } from "../utils/decimal.js";
import type { StrategyContext, StrategyConfig, TradingStrategy } from "./base.js";

export class MomentumStrategy implements TradingStrategy {
  readonly name = "momentum";

  evaluate(ctx: StrategyContext, config: StrategyConfig) {
    const { closes } = ctx;

    if (closes.length < config.momentumWindow + 5) {
      return { side: null, confidence: 0, reason: "insufficient data for momentum" };
    }

    const start = closes[closes.length - config.momentumWindow]!;
    const end = closes[closes.length - 1]!;
    const momentumPct = start === 0 ? 0 : ((end - start) / start) * 100;
    const macdData = latestMacd(closes);

    if (momentumPct > 0.3 && macdData && macdData.histogram > 0) {
      const confidence = clamp(0.3 + momentumPct / 10 + macdData.histogram / 100, 0, 1);
      return {
        side: "Buy" as const,
        confidence,
        reason: `momentum long: ${momentumPct.toFixed(2)}% over ${config.momentumWindow} bars`,
      };
    }

    if (momentumPct < -0.3 && macdData && macdData.histogram < 0) {
      const confidence = clamp(0.3 + Math.abs(momentumPct) / 10 + Math.abs(macdData.histogram) / 100, 0, 1);
      return {
        side: "Sell" as const,
        confidence,
        reason: `momentum short: ${momentumPct.toFixed(2)}% over ${config.momentumWindow} bars`,
      };
    }

    return {
      side: null,
      confidence: 0,
      reason: `no momentum signal (${momentumPct.toFixed(2)}%)`,
    };
  }
}
