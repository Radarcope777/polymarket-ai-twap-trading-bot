import { ratioToBps } from "../utils/decimal.js";
import { clamp } from "../utils/decimal.js";
import type { StrategyContext, StrategyConfig, TradingStrategy } from "./base.js";

export class FundingArbitrageStrategy implements TradingStrategy {
  readonly name = "funding_arbitrage";

  evaluate(ctx: StrategyContext, config: StrategyConfig) {
    const fundingBps = ratioToBps(ctx.fundingRate);
    const threshold = config.fundingThresholdBps;

    if (Math.abs(fundingBps) < threshold) {
      return {
        side: null,
        confidence: 0,
        reason: `funding ${fundingBps.toFixed(2)} bps below threshold ${threshold}`,
      };
    }

    if (fundingBps > threshold) {
      const confidence = clamp(0.3 + (fundingBps - threshold) / 50, 0, 1);
      return {
        side: "Sell" as const,
        confidence,
        reason: `funding arb short: positive funding ${fundingBps.toFixed(2)} bps (collect from longs)`,
      };
    }

    const confidence = clamp(0.3 + (Math.abs(fundingBps) - threshold) / 50, 0, 1);
    return {
      side: "Buy" as const,
      confidence,
      reason: `funding arb long: negative funding ${fundingBps.toFixed(2)} bps (collect from shorts)`,
    };
  }
}
