import type { CryptoSymbol, TwapSample, TwapState } from '@polymarket-twap/shared';

export interface TwapEngineConfig {
  stalenessMs: number;
  maxSamples: number;
}

const DEFAULT_CONFIG: TwapEngineConfig = {
  stalenessMs: 2000,
  maxSamples: 120,
};

export class TwapStateEngine {
  private states = new Map<string, TwapState>();
  private config: TwapEngineConfig;

  constructor(config: Partial<TwapEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private key(symbol: CryptoSymbol, windowSeconds: number): string {
    return `${symbol}:${windowSeconds}`;
  }

  initWindow(
    symbol: CryptoSymbol,
    windowSeconds: number,
    windowStart: number,
    windowEnd: number
  ): TwapState {
    const state: TwapState = {
      symbol,
      windowSeconds,
      samples: [],
      runningAverage: 0,
      projectedFinal: 0,
      confidence: 0,
      windowStart,
      windowEnd,
      isStale: true,
      lastSampleAt: 0,
    };
    this.states.set(this.key(symbol, windowSeconds), state);
    return state;
  }

  addSample(sample: TwapSample): TwapState {
    const key = this.key(sample.symbol, sample.windowSeconds);
    let state = this.states.get(key);
    if (!state) {
      const now = sample.timestamp;
      state = this.initWindow(sample.symbol, sample.windowSeconds, now - sample.windowSeconds * 1000, now);
    }

    state.samples.push(sample);
    if (state.samples.length > this.config.maxSamples) {
      state.samples = state.samples.slice(-this.config.maxSamples);
    }

    state.lastSampleAt = sample.timestamp;
    state.isStale = false;
    state.runningAverage = this.computeRunningAverage(state.samples);
    state.projectedFinal = this.projectFinalTwap(state);
    state.confidence = this.computeConfidence(state);

    this.states.set(key, state);
    return { ...state, samples: [...state.samples] };
  }

  getState(symbol: CryptoSymbol, windowSeconds: number): TwapState | undefined {
    const state = this.states.get(this.key(symbol, windowSeconds));
    if (!state) return undefined;

    const now = Date.now();
    const stale = now - state.lastSampleAt > this.config.stalenessMs;
    return { ...state, isStale: stale || state.isStale, samples: [...state.samples] };
  }

  getAllStates(): TwapState[] {
    return Array.from(this.states.values()).map((s) => this.getState(s.symbol, s.windowSeconds)!);
  }

  checkStaleness(now = Date.now()): CryptoSymbol[] {
    const stale: CryptoSymbol[] = [];
    for (const state of this.states.values()) {
      if (now - state.lastSampleAt > this.config.stalenessMs) {
        state.isStale = true;
        stale.push(state.symbol);
      }
    }
    return stale;
  }

  computeRunningAverage(samples: TwapSample[]): number {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, s) => acc + s.price, 0);
    return sum / samples.length;
  }

  /**
   * Project final TWAP within resolution window using linear extrapolation
   * of the running average trend.
   */
  projectFinalTwap(state: TwapState): number {
    if (state.samples.length === 0) return 0;
    if (state.samples.length < 3) return state.runningAverage;

    const recent = state.samples.slice(-10);
    const avg = this.computeRunningAverage(recent);
    const older = state.samples.slice(-20, -10);
    const olderAvg = older.length > 0 ? this.computeRunningAverage(older) : avg;

    const trend = avg - olderAvg;
    const now = state.lastSampleAt || Date.now();
    const timeRemaining = Math.max(0, state.windowEnd - now);
    const windowMs = state.windowSeconds * 1000;
    const trendFactor = Math.min(1, timeRemaining / windowMs);

    return avg + trend * trendFactor * 0.5;
  }

  computeConfidence(state: TwapState): number {
    const sampleCount = state.samples.length;
    const minSamples = Math.max(3, state.windowSeconds / 2);
    const sampleScore = Math.min(1, sampleCount / minSamples);

    const now = Date.now();
    const freshness = state.lastSampleAt > 0
      ? Math.max(0, 1 - (now - state.lastSampleAt) / this.config.stalenessMs)
      : 0;

    return sampleScore * 0.6 + freshness * 0.4;
  }

  directionalEdge(
    projectedTwap: number,
    strikePrice: number,
    volatility = 0.001
  ): { probUp: number; probDown: number } {
    const diff = (projectedTwap - strikePrice) / strikePrice;
    const z = diff / volatility;
    const probUp = 1 / (1 + Math.exp(-z * 5));
    return { probUp, probDown: 1 - probUp };
  }
}

export function twapWindowForDuration(duration: '5m' | '15m' | '4h'): number {
  return duration === '5m' ? 30 : 60;
}
