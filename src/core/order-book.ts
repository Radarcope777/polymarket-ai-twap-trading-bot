import type { OrderBookLevel, OrderBookSnapshot } from "../api/grvt/types.js";
import { divide, multiply } from "../utils/decimal.js";

export class OrderBookStore {
  private bids: OrderBookLevel[] = [];
  private asks: OrderBookLevel[] = [];
  private lastUpdate = 0;

  constructor(private readonly maxDepth: number) {}

  applySnapshot(snapshot: OrderBookSnapshot): void {
    this.bids = snapshot.bids.slice(0, this.maxDepth);
    this.asks = snapshot.asks.slice(0, this.maxDepth);
    this.lastUpdate = snapshot.timestamp;
  }

  bestBid(): number | null {
    return this.bids[0]?.price ?? null;
  }

  bestAsk(): number | null {
    return this.asks[0]?.price ?? null;
  }

  midPrice(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (bid === null || ask === null) return null;
    return (bid + ask) / 2;
  }

  spread(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (bid === null || ask === null) return null;
    return ask - bid;
  }

  spreadBps(): number | null {
    const mid = this.midPrice();
    const spread = this.spread();
    if (mid === null || spread === null || mid === 0) return null;
    return (spread / mid) * 10_000;
  }

  bidVolume(depth = 5): number {
    return this.bids.slice(0, depth).reduce((sum, l) => sum + l.size, 0);
  }

  askVolume(depth = 5): number {
    return this.asks.slice(0, depth).reduce((sum, l) => sum + l.size, 0);
  }

  orderBookImbalance(depth = 5): number {
    const bidVol = this.bidVolume(depth);
    const askVol = this.askVolume(depth);
    const total = bidVol + askVol;
    if (total === 0) return 0;
    return (bidVol - askVol) / total;
  }

  microPrice(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    const bidSize = this.bids[0]?.size ?? 0;
    const askSize = this.asks[0]?.size ?? 0;

    if (bid === null || ask === null) return null;
    const total = bidSize + askSize;
    if (total === 0) return this.midPrice();

    return divide(
      multiply(bid, askSize) + multiply(ask, bidSize),
      total,
    );
  }

  getSnapshot(symbol: string): OrderBookSnapshot {
    return {
      symbol,
      bids: [...this.bids],
      asks: [...this.asks],
      timestamp: this.lastUpdate,
    };
  }

  isReady(): boolean {
    return this.bids.length > 0 && this.asks.length > 0;
  }
}
