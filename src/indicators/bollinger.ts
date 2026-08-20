import { round } from "../utils/decimal.js";

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export function bollinger(
  closes: number[],
  period = 20,
  stdDev = 2,
): BollingerBands[] {
  if (closes.length < period) return [];

  const result: BollingerBands[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);

    result.push({
      upper: round(mean + stdDev * std),
      middle: round(mean),
      lower: round(mean - stdDev * std),
    });
  }

  return result;
}

export function latestBollinger(
  closes: number[],
  period = 20,
  stdDev = 2,
): BollingerBands | null {
  const series = bollinger(closes, period, stdDev);
  return series.length > 0 ? series[series.length - 1]! : null;
}
