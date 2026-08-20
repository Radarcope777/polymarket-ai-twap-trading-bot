import type { GrvtClient } from "../api/grvt/client.js";
import type { OrderSide, StrategySignal } from "../api/grvt/types.js";
import type { Logger } from "../services/logger.js";
import type { RiskManager } from "../services/risk-manager.js";
import { generateClOrdId } from "../utils/uuid.js";

export interface ExecutionResult {
  executed: boolean;
  orderId?: string;
  reason: string;
}

export class ExecutionEngine {
  private dryRunOrders: Array<{
    id: string;
    side: OrderSide;
    size: number;
    price: number;
    timestamp: number;
  }> = [];

  constructor(
    private readonly client: GrvtClient,
    private readonly symbol: string,
    private readonly dryRun: boolean,
    private readonly risk: RiskManager,
    private readonly logger: Logger,
  ) {}

  async executeSignal(
    signal: StrategySignal,
    lastPrice: number,
    defaultSize: number,
  ): Promise<ExecutionResult> {
    if (!signal.side || signal.confidence < 0.2) {
      return { executed: false, reason: "Signal too weak or neutral" };
    }

    const size = signal.suggestedQty ?? defaultSize;
    const riskCheck = this.risk.canOpenPosition(signal.side, size);

    if (!riskCheck.allowed) {
      this.logger.warn({ reason: riskCheck.reason }, "Risk check blocked order");
      return { executed: false, reason: riskCheck.reason ?? "Risk check failed" };
    }

    if (this.dryRun) {
      const id = generateClOrdId("dry");
      this.dryRunOrders.push({
        id,
        side: signal.side,
        size,
        price: lastPrice,
        timestamp: Date.now(),
      });
      this.risk.setPosition(
        signal.side === "Buy"
          ? this.risk.getPositionSize() + size
          : this.risk.getPositionSize() - size,
        lastPrice,
      );
      this.logger.info(
        { side: signal.side, size, price: lastPrice, reason: signal.reason },
        "[DRY RUN] Order simulated",
      );
      return { executed: true, orderId: id, reason: signal.reason };
    }

    try {
      const order = await this.client.placeOrder({
        symbol: this.symbol,
        side: signal.side,
        size,
      });

      this.logger.info(
        { orderId: order.orderId, side: signal.side, size, reason: signal.reason },
        "Order placed",
      );

      return { executed: true, orderId: order.orderId, reason: signal.reason };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: message }, "Order execution failed");
      return { executed: false, reason: message };
    }
  }

  async closePosition(size: number, side: OrderSide): Promise<ExecutionResult> {
    const riskCheck = this.risk.canClosePosition(size);
    if (!riskCheck.allowed) {
      return { executed: false, reason: riskCheck.reason ?? "Cannot close" };
    }

    if (this.dryRun) {
      this.risk.setPosition(0, 0);
      this.logger.info({ side, size }, "[DRY RUN] Position close simulated");
      return { executed: true, reason: "Dry run close" };
    }

    try {
      const order = await this.client.placeOrder({
        symbol: this.symbol,
        side,
        size: Math.abs(size),
        reduceOnly: true,
      });

      this.risk.setPosition(0, 0);
      return { executed: true, orderId: order.orderId, reason: "Position closed" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { executed: false, reason: message };
    }
  }

  getDryRunOrders() {
    return [...this.dryRunOrders];
  }
}
