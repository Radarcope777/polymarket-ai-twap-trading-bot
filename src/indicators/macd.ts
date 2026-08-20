import { round } from "../utils/decimal.js";
import { ema } from "./ema.js";

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult[] {
  if (closes.length < slowPeriod + signalPeriod) return [];

  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const offset = slowPeriod - fastPeriod;

  const macdLine: number[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    const fast = fastEma[i + offset] ?? fastEma[fastEma.length - 1]!;
    const slow = slowEma[i]!;
    macdLine.push(round(fast - slow));
  }

  const signalLine = ema(macdLine, signalPeriod);
  const signalOffset = macdLine.length - signalLine.length;

  return signalLine.map((signal, i) => {
    const macdVal = macdLine[i + signalOffset]!;
    return {
      macd: macdVal,
      signal,
      histogram: round(macdVal - signal),
    };
  });
}

export function latestMacd(closes: number[]): MacdResult | null {
  const series = macd(closes);
  return series.length > 0 ? series[series.length - 1]! : null;
}
