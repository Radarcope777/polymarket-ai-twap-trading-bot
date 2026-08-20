import { describe, it, expect } from 'vitest';
import { takerFeeRate, edgeAfterFees, feeAwareEdge } from './fees.js';

describe('fee calculations', () => {
  it('computes taker fee at midpoint', () => {
    const fee = takerFeeRate(0.5);
    expect(fee).toBeCloseTo(0.0175, 4);
  });

  it('computes edge after fees for YES side', () => {
    const edge = edgeAfterFees(0.6, 0.52, 'YES', false);
    expect(edge).toBeGreaterThan(0);
  });

  it('selects best side with fee awareness', () => {
    const result = feeAwareEdge(0.35, 0.45);
    expect(result.side).toBe('NO');
    expect(result.edge).toBeGreaterThan(0);
  });
});
