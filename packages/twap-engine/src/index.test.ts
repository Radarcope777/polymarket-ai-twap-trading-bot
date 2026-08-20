import { describe, it, expect, beforeEach } from 'vitest';
import { TwapStateEngine, twapWindowForDuration } from './index.js';

describe('TwapStateEngine', () => {
  let engine: TwapStateEngine;

  beforeEach(() => {
    engine = new TwapStateEngine({ stalenessMs: 2000 });
  });

  it('computes running average from samples', () => {
    const base = Date.now();
    for (let i = 0; i < 5; i++) {
      engine.addSample({
        symbol: 'btc/usd',
        price: 100000 + i * 10,
        timestamp: base + i * 1000,
        windowSeconds: 30,
      });
    }
    const state = engine.getState('btc/usd', 30)!;
    expect(state.runningAverage).toBeCloseTo(100020, 0);
    expect(state.samples.length).toBe(5);
  });

  it('projects final TWAP with trend', () => {
    const base = Date.now();
    for (let i = 0; i < 20; i++) {
      engine.addSample({
        symbol: 'eth/usd',
        price: 3500 + i * 2,
        timestamp: base + i * 500,
        windowSeconds: 60,
      });
    }
    const state = engine.getState('eth/usd', 60)!;
    expect(state.projectedFinal).toBeGreaterThan(state.runningAverage);
    expect(state.confidence).toBeGreaterThan(0.5);
  });

  it('detects stale feeds', () => {
    engine.addSample({
      symbol: 'btc/usd',
      price: 100000,
      timestamp: Date.now() - 5000,
      windowSeconds: 30,
    });
    engine.checkStaleness();
    const state = engine.getState('btc/usd', 30)!;
    expect(state.isStale).toBe(true);
  });

  it('maps duration to TWAP window', () => {
    expect(twapWindowForDuration('5m')).toBe(30);
    expect(twapWindowForDuration('15m')).toBe(60);
    expect(twapWindowForDuration('4h')).toBe(60);
  });

  it('computes directional edge from projected TWAP vs strike', () => {
    const { probUp, probDown } = engine.directionalEdge(101000, 100000);
    expect(probUp).toBeGreaterThan(0.5);
    expect(probUp + probDown).toBeCloseTo(1);
  });
});
