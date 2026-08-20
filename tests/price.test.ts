import { describe, expect, it } from "vitest";
import {
  parseGrvtPrice,
  parseGrvtSize,
  parseFundingRate,
  nanosecondsToMs,
} from "../src/utils/price.js";

describe("price utilities", () => {
  it("parses GRVT price strings", () => {
    expect(parseGrvtPrice("65038.01")).toBe(65038.01);
    expect(parseGrvtPrice("0")).toBe(0);
    expect(parseGrvtPrice(null)).toBe(0);
  });

  it("parses GRVT size strings", () => {
    expect(parseGrvtSize("0.001")).toBe(0.001);
  });

  it("parses funding rate as ratio, percentage, or centibeeps", () => {
    expect(parseFundingRate(0.0003)).toBe(0.0003);
    expect(parseFundingRate("0.01")).toBeCloseTo(0.0001, 6);
    expect(parseFundingRate(300)).toBeCloseTo(0.0003, 6);
  });

  it("converts nanoseconds to milliseconds", () => {
    expect(nanosecondsToMs("1697788800000000000")).toBe(1697788800000);
  });
});
