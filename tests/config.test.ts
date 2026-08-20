import { describe, expect, it } from "vitest";
import { normalizeInstrument, loadConfig } from "../src/config/index.js";

describe("config", () => {
  it("normalizes instrument names", () => {
    expect(normalizeInstrument("btc-usdt-perp")).toBe("BTC_USDT_Perp");
    expect(normalizeInstrument("BTC_USDT_Perp")).toBe("BTC_USDT_Perp");
    expect(normalizeInstrument("eth usdt perpetual")).toBe("ETH_USDT_Perp");
  });

  it("loads dry-run config with defaults", () => {
    process.env.DRY_RUN = "true";
    process.env.GRVT_API_KEY = "test";
    process.env.GRVT_TRADING_ACCOUNT_ID = "123";

    const config = loadConfig({ dryRun: true });
    expect(config.trading.instrument).toBe("BTC_USDT_Perp");
    expect(config.trading.dryRun).toBe(true);
    expect(config.trading.emaFast).toBeLessThan(config.trading.emaSlow);
  });

  it("rejects invalid ema configuration", () => {
    process.env.DRY_RUN = "true";
    process.env.GRVT_API_KEY = "test";
    process.env.GRVT_TRADING_ACCOUNT_ID = "123";
    process.env.EMA_FAST = "30";
    process.env.EMA_SLOW = "10";

    expect(() => loadConfig({ dryRun: true })).toThrow(/emaFast must be less than emaSlow/);
  });
});
