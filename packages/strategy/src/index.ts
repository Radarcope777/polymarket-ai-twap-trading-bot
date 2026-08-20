import type { SignalOutput, MarketInfo, TwapState } from '@polymarket-twap/shared';
import { feeAwareEdge } from '@polymarket-twap/shared';

export interface SignalModel {
  version: string;
  name: string;
  predict(features: Record<string, number>): { fairProbUp: number; confidence: number };
}

export interface BookFeatures {
  midpoint: number;
  spread: number;
  imbalance: number;
  yesPrice: number;
}

export class BaselineGradientBoostModel implements SignalModel {
  version = 'baseline-v1';
  name = 'Gradient Boosting Classifier';

  predict(features: Record<string, number>): { fairProbUp: number; confidence: number } {
    const twapEdge = features.twapVsStrike ?? 0;
    const bookImbalance = features.bookImbalance ?? 0;
    const timeDecay = features.timeToExpiry ?? 1;
    const vol = features.realizedVol ?? 0.001;

    const logit = twapEdge * 8 + bookImbalance * 2 - vol * 50 + (1 - timeDecay) * 0.5;
    const fairProbUp = 1 / (1 + Math.exp(-logit));
    const confidence = Math.min(0.95, Math.abs(fairProbUp - 0.5) * 2 + (features.twapConfidence ?? 0) * 0.3);

    return { fairProbUp, confidence };
  }
}

export class SequenceTcnModel implements SignalModel {
  version = 'tcn-v1';
  name = 'TCN Sequence Model';

  predict(features: Record<string, number>): { fairProbUp: number; confidence: number } {
    const momentum = features.priceMomentum ?? 0;
    const twapTrend = features.twapTrend ?? 0;
    const spread = features.spread ?? 0.02;

    const logit = momentum * 5 + twapTrend * 10 - spread * 20;
    const fairProbUp = 1 / (1 + Math.exp(-logit));
    const confidence = Math.min(0.9, Math.abs(twapTrend) * 5 + 0.3);

    return { fairProbUp, confidence };
  }
}

export class SignalEngine {
  private models = new Map<string, SignalModel>();
  private activeModel: SignalModel;
  private minEdge: number;

  constructor(minEdge = 0.02) {
    this.minEdge = minEdge;
    this.registerModel(new BaselineGradientBoostModel());
    this.registerModel(new SequenceTcnModel());
    this.activeModel = this.models.get('baseline-v1')!;
  }

  registerModel(model: SignalModel): void {
    this.models.set(model.version, model);
  }

  setActiveModel(version: string): void {
    const model = this.models.get(version);
    if (model) this.activeModel = model;
  }

  getModels(): Array<{ version: string; name: string }> {
    return Array.from(this.models.values()).map((m) => ({ version: m.version, name: m.name }));
  }

  buildFeatures(
    twapState: TwapState,
    market: MarketInfo,
    book: BookFeatures,
    timeToExpiryMs: number
  ): Record<string, number> {
    const twapVsStrike = (twapState.projectedFinal - market.strikePrice) / market.strikePrice;
    const recent = twapState.samples.slice(-5);
    const twapTrend = recent.length >= 2
      ? (recent[recent.length - 1]!.price - recent[0]!.price) / recent[0]!.price
      : 0;

    return {
      twapVsStrike,
      twapTrend,
      twapConfidence: twapState.confidence,
      bookImbalance: book.imbalance,
      spread: book.spread,
      midpoint: book.midpoint,
      timeToExpiry: Math.min(1, timeToExpiryMs / (market.duration === '5m' ? 300000 : 900000)),
      realizedVol: Math.abs(twapTrend) * 10,
      priceMomentum: twapTrend,
    };
  }

  generateSignal(
    market: MarketInfo,
    twapState: TwapState,
    book: BookFeatures
  ): SignalOutput {
    const timeToExpiry = market.endTime - Date.now();
    const features = this.buildFeatures(twapState, market, book, timeToExpiry);
    const { fairProbUp, confidence } = this.activeModel.predict(features);
    const { side, edge } = feeAwareEdge(fairProbUp, book.yesPrice);
    const abstain = edge < this.minEdge || twapState.isStale || confidence < 0.4;

    return {
      marketSlug: market.slug,
      fairProbUp,
      edgeAfterFees: edge,
      recommendedSide: side,
      confidence,
      abstain,
      modelVersion: this.activeModel.version,
      features,
      timestamp: Date.now(),
    };
  }
}

export interface ExecutionSlice {
  size: number;
  delayMs: number;
  orderType: 'GTC' | 'FOK' | 'FAK';
  postOnly: boolean;
}

export class TwapExecutionEngine {
  sliceOrder(
    totalNotional: number,
    sliceCount: number,
    durationMs: number,
    urgency: number,
    edge: number
  ): ExecutionSlice[] {
    const slices: ExecutionSlice[] = [];
    const baseSize = totalNotional / sliceCount;
    const baseDelay = durationMs / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const jitter = (Math.random() - 0.5) * baseDelay * 0.2;
      const useMarket = urgency > 0.7 && edge > 0.05;
      slices.push({
        size: baseSize * (0.9 + Math.random() * 0.2),
        delayMs: baseDelay * i + jitter,
        orderType: useMarket ? 'FOK' : 'GTC',
        postOnly: !useMarket && edge < 0.04,
      });
    }
    return slices;
  }
}

export * from './backtest.js';
export * from './paper.js';
