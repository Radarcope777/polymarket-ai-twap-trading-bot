import { bpsToRatio } from "../utils/decimal.js";

export interface RiskLimits {
  maxPositionSize?: number;
  maxDailyLossUsd?: number;
  orderSize: number;
  stopLossBps?: number;
  takeProfitBps?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

export type PriceTriggerAction = "stop_loss" | "take_profit" | null;

export class RiskManager {
  private positionSize = 0;
  private entryPrice = 0;
  private dailyPnl = 0;

  constructor(private readonly limits: RiskLimits) {}

  reset(): void {
    this.positionSize = 0;
    this.entryPrice = 0;
    this.dailyPnl = 0;
  }

  setPosition(size: number, entryPrice: number): void {
    this.positionSize = size;
    this.entryPrice = entryPrice;
  }

  getPositionSize(): number {
    return this.positionSize;
  }

  recordPnl(pnl: number): void {
    this.dailyPnl += pnl;
  }

  canOpenPosition(side: "Buy" | "Sell", size: number): RiskCheckResult {
    if (this.limits.maxDailyLossUsd !== undefined && this.dailyPnl <= -this.limits.maxDailyLossUsd) {
      return {
        allowed: false,
        reason: `Daily loss limit reached (${this.limits.maxDailyLossUsd} USD)`,
      };
    }

    const projectedSize =
      side === "Buy"
        ? this.positionSize + size
        : this.positionSize - size;

    if (this.limits.maxPositionSize !== undefined) {
      if (Math.abs(projectedSize) > this.limits.maxPositionSize) {
        return {
          allowed: false,
          reason: `Would exceed max position (${this.limits.maxPositionSize})`,
        };
      }
    }

    if (size > this.limits.orderSize * 5) {
      return {
        allowed: false,
        reason: `Order size ${size} exceeds safe limit`,
      };
    }

    return { allowed: true };
  }

  canClosePosition(size: number): RiskCheckResult {
    if (this.positionSize === 0) {
      return { allowed: false, reason: "No open position to close" };
    }

    if (Math.abs(size) > Math.abs(this.positionSize) * 2) {
      return { allowed: false, reason: "Close size exceeds position" };
    }

    return { allowed: true };
  }

  checkPriceTriggers(lastPrice: number): PriceTriggerAction {
    if (this.positionSize === 0 || this.entryPrice === 0) {
      return null;
    }

    const isLong = this.positionSize > 0;
    const pnlRatio = isLong
      ? (lastPrice - this.entryPrice) / this.entryPrice
      : (this.entryPrice - lastPrice) / this.entryPrice;

    if (
      this.limits.stopLossBps !== undefined &&
      pnlRatio <= -bpsToRatio(this.limits.stopLossBps)
    ) {
      return "stop_loss";
    }

    if (
      this.limits.takeProfitBps !== undefined &&
      pnlRatio >= bpsToRatio(this.limits.takeProfitBps)
    ) {
      return "take_profit";
    }

    return null;
  }

  positionUtilization(): number {
    if (!this.limits.maxPositionSize || this.limits.maxPositionSize <= 0) {
      return 0;
    }
    return Math.abs(this.positionSize) / this.limits.maxPositionSize;
  }
}
