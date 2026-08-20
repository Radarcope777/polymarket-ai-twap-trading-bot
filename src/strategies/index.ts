import type { StrategyName } from "../config/index.js";
import { mergeSignals } from "./base.js";
import { FundingArbitrageStrategy } from "./funding-arbitrage.js";
import { MeanReversionStrategy } from "./mean-reversion.js";
import { MomentumStrategy } from "./momentum.js";
import { TrendFollowingStrategy } from "./trend-following.js";
import type { StrategyContext, StrategyConfig, TradingStrategy } from "./base.js";

class AiCompositeStrategy implements TradingStrategy {
  readonly name = "ai_composite";

  private readonly strategies: TradingStrategy[] = [
    new MeanReversionStrategy(),
    new TrendFollowingStrategy(),
    new MomentumStrategy(),
    new FundingArbitrageStrategy(),
  ];

  private readonly weights = [0.25, 0.3, 0.25, 0.2];

  evaluate(ctx: StrategyContext, config: StrategyConfig) {
    const signals = this.strategies.map((s) => s.evaluate(ctx, config));
    return mergeSignals(signals, this.weights);
  }
}

const strategyMap: Record<StrategyName, () => TradingStrategy> = {
  mean_reversion: () => new MeanReversionStrategy(),
  trend_following: () => new TrendFollowingStrategy(),
  momentum: () => new MomentumStrategy(),
  funding_arbitrage: () => new FundingArbitrageStrategy(),
  ai_composite: () => new AiCompositeStrategy(),
};

export function createStrategy(name: StrategyName): TradingStrategy {
  const factory = strategyMap[name];
  if (!factory) {
    throw new Error(`Unknown strategy: ${name}`);
  }
  return factory();
}

export {
  MeanReversionStrategy,
  TrendFollowingStrategy,
  MomentumStrategy,
  FundingArbitrageStrategy,
  AiCompositeStrategy,
};
