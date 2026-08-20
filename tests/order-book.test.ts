import { describe, expect, it } from "vitest";
import { OrderBookStore } from "../src/core/order-book.js";

describe("OrderBookStore", () => {
  it("computes mid price and spread", () => {
    const book = new OrderBookStore(10);
    book.applySnapshot({
      symbol: "BTC_USDT_Perp",
      bids: [{ price: 100, size: 1 }, { price: 99, size: 2 }],
      asks: [{ price: 101, size: 1 }, { price: 102, size: 2 }],
      timestamp: Date.now(),
    });

    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBe(101);
    expect(book.midPrice()).toBe(100.5);
    expect(book.spread()).toBe(1);
    expect(book.spreadBps()).toBeCloseTo(99.5, 0);
  });

  it("computes order book imbalance", () => {
    const book = new OrderBookStore(10);
    book.applySnapshot({
      symbol: "BTC_USDT_Perp",
      bids: [{ price: 100, size: 10 }],
      asks: [{ price: 101, size: 2 }],
      timestamp: Date.now(),
    });

    expect(book.orderBookImbalance(1)).toBeGreaterThan(0);
  });

  it("reports readiness", () => {
    const book = new OrderBookStore(10);
    expect(book.isReady()).toBe(false);

    book.applySnapshot({
      symbol: "BTC_USDT_Perp",
      bids: [{ price: 100, size: 1 }],
      asks: [{ price: 101, size: 1 }],
      timestamp: Date.now(),
    });

    expect(book.isReady()).toBe(true);
  });
});
