import type { PaperSession, SignalOutput } from '@polymarket-twap/shared';
import { takerFeeRate } from '@polymarket-twap/shared';

export interface SimulatedFill {
  id: string;
  sessionId: string;
  marketSlug: string;
  side: 'YES' | 'NO';
  price: number;
  size: number;
  fees: number;
  latencyMs: number;
  timestamp: number;
}

export interface PaperPosition {
  marketSlug: string;
  side: 'YES' | 'NO';
  size: number;
  avgPrice: number;
  unrealizedPnl: number;
}

export class PaperTradingEngine {
  private sessions = new Map<string, PaperSession & { fills: SimulatedFill[]; positions: PaperPosition[] }>();

  startSession(id: string): PaperSession {
    const session = {
      id,
      status: 'active' as const,
      startedAt: new Date().toISOString(),
      pnl: 0,
      fees: 0,
      trades: 0,
      fills: [],
      positions: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  stopSession(id: string): PaperSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    session.status = 'stopped';
    session.stoppedAt = new Date().toISOString();
    return session;
  }

  simulateFill(
    sessionId: string,
    signal: SignalOutput,
    bookPrice: number,
    size: number,
    latencyMs = 55
  ): SimulatedFill | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return null;
    if (signal.abstain) return null;

    const slippage = (Math.random() - 0.5) * 0.002;
    const fillPrice = bookPrice + slippage;
    const fees = takerFeeRate(fillPrice) * size;

    const fill: SimulatedFill = {
      id: `fill-${Date.now()}`,
      sessionId,
      marketSlug: signal.marketSlug,
      side: signal.recommendedSide,
      price: fillPrice,
      size,
      fees,
      latencyMs,
      timestamp: Date.now(),
    };

    session.fills.push(fill);
    session.trades++;
    session.fees += fees;
    session.pnl += (signal.edgeAfterFees * size) - fees;

    return fill;
  }

  getSession(id: string) {
    return this.sessions.get(id);
  }

  listSessions(): PaperSession[] {
    return Array.from(this.sessions.values());
  }
}
