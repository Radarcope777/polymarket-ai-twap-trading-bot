import { round } from "../utils/decimal.js";

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i]!;
  }
  let prev = sum / period;
  result.push(round(prev));

  for (let i = period; i < values.length; i++) {
    prev = (values[i]! - prev) * multiplier + prev;
    result.push(round(prev));
  }

  return result;
}

export function latestEma(values: number[], period: number): number | null {
  const series = ema(values, period);
  return series.length > 0 ? series[series.length - 1]! : null;
}
