import { latestBollinger, latestRsi } from "../indicators/index.js";
import { clamp } from "../utils/decimal.js";
import type { StrategyContext, StrategyConfig, TradingStrategy } from "./base.js";

export class MeanReversionStrategy implements TradingStrategy {
  readonly name = "mean_reversion";

  evaluate(ctx: StrategyContext, config: StrategyConfig) {
    const { closes, lastPrice } = ctx;

    if (closes.length < config.bollingerPeriod) {
      return { side: null, confidence: 0, reason: "insufficient data for Bollinger" };
    }

    const bands = latestBollinger(closes, config.bollingerPeriod, config.bollingerStdDev);
    const rsiVal = latestRsi(closes, config.rsiPeriod);

    if (!bands || rsiVal === null) {
      return { side: null, confidence: 0, reason: "indicators not ready" };
    }

    const belowLower = lastPrice <= bands.lower;
    const aboveUpper = lastPrice >= bands.upper;
    const oversold = rsiVal <= config.rsiOversold;
    const overbought = rsiVal >= config.rsiOverbought;

    if (belowLower && oversold) {
      const distance = (bands.lower - lastPrice) / bands.lower;
      const confidence = clamp(0.4 + distance * 20 + (config.rsiOversold - rsiVal) / 100, 0, 1);
      return {
        side: "Buy" as const,
        confidence,
        reason: `mean reversion long: price ${lastPrice.toFixed(2)} below BB lower ${bands.lower.toFixed(2)}, RSI ${rsiVal.toFixed(1)}`,
      };
    }

    if (aboveUpper && overbought) {
      const distance = (lastPrice - bands.upper) / bands.upper;
      const confidence = clamp(0.4 + distance * 20 + (rsiVal - config.rsiOverbought) / 100, 0, 1);
      return {
        side: "Sell" as const,
        confidence,
        reason: `mean reversion short: price ${lastPrice.toFixed(2)} above BB upper ${bands.upper.toFixed(2)}, RSI ${rsiVal.toFixed(1)}`,
      };
    }

    return {
      side: null,
      confidence: 0,
      reason: `no mean reversion signal (RSI ${rsiVal.toFixed(1)}, BB mid ${bands.middle.toFixed(2)})`,
    };
  }
}
