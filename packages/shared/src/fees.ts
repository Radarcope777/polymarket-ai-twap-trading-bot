/**
 * Polymarket CLOB V2 fee model: ~0.07 × p × (1-p) taker fee
 * Fees are operator-set at match time, not embedded in signed orders.
 */
export function takerFeeRate(price: number, baseRate = 0.07): number {
  const p = Math.max(0.01, Math.min(0.99, price));
  return baseRate * p * (1 - p);
}

export function makerRebateRate(price: number, tier = 0.01): number {
  const p = Math.max(0.01, Math.min(0.99, price));
  return tier * p * (1 - p);
}

export function edgeAfterFees(
  fairProb: number,
  marketPrice: number,
  side: 'YES' | 'NO',
  isMaker = true
): number {
  const fee = isMaker ? -makerRebateRate(marketPrice) : takerFeeRate(marketPrice);
  const impliedEdge = side === 'YES' ? fairProb - marketPrice : (1 - fairProb) - (1 - marketPrice);
  return impliedEdge - Math.abs(fee);
}

export function feeAwareEdge(
  fairProbUp: number,
  yesPrice: number,
  preferMaker = true
): { side: 'YES' | 'NO'; edge: number } {
  const yesEdge = edgeAfterFees(fairProbUp, yesPrice, 'YES', preferMaker);
  const noEdge = edgeAfterFees(fairProbUp, yesPrice, 'NO', preferMaker);
  return yesEdge >= noEdge
    ? { side: 'YES', edge: yesEdge }
    : { side: 'NO', edge: noEdge };
}
