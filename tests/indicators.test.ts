import { describe, expect, it } from "vitest";
import { latestRsi, latestEma, latestBollinger, latestMacd } from "../src/indicators/index.js";

describe("indicators", () => {
  const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 5);

  it("computes RSI", () => {
    const rsi = latestRsi(closes, 14);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThan(0);
    expect(rsi!).toBeLessThanOrEqual(100);
  });

  it("computes EMA", () => {
    const fast = latestEma(closes, 9);
    const slow = latestEma(closes, 21);
    expect(fast).not.toBeNull();
    expect(slow).not.toBeNull();
  });

  it("computes Bollinger Bands", () => {
    const bands = latestBollinger(closes, 20, 2);
    expect(bands).not.toBeNull();
    expect(bands!.upper).toBeGreaterThan(bands!.middle);
    expect(bands!.middle).toBeGreaterThan(bands!.lower);
  });

  it("computes MACD", () => {
    const macd = latestMacd(closes);
    expect(macd).not.toBeNull();
    expect(typeof macd!.histogram).toBe("number");
  });
});
