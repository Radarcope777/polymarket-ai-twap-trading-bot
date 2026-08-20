import { describe, expect, it } from "vitest";
import { RiskManager } from "../src/services/risk-manager.js";

describe("RiskManager", () => {
  it("blocks orders exceeding max position", () => {
    const risk = new RiskManager({
      orderSize: 0.001,
      maxPositionSize: 0.005,
    });

    risk.setPosition(0.004, 100);
    const result = risk.canOpenPosition("Buy", 0.002);
    expect(result.allowed).toBe(false);
  });

  it("triggers stop loss", () => {
    const risk = new RiskManager({
      orderSize: 0.001,
      stopLossBps: 50,
    });

    risk.setPosition(0.001, 100);
    expect(risk.checkPriceTriggers(99.4)).toBe("stop_loss");
  });

  it("triggers take profit", () => {
    const risk = new RiskManager({
      orderSize: 0.001,
      takeProfitBps: 100,
    });

    risk.setPosition(0.001, 100);
    expect(risk.checkPriceTriggers(101.5)).toBe("take_profit");
  });
});
