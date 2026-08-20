export function round(value: number, decimals = 8): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function multiply(a: number, b: number): number {
  return round(a * b);
}

export function divide(a: number, b: number): number {
  if (b === 0) return 0;
  return round(a / b);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function bpsToRatio(bps: number): number {
  return bps / 10_000;
}

export function ratioToBps(ratio: number): number {
  return ratio * 10_000;
}

export function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}
