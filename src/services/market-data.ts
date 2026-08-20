import type { GrvtClient } from "../api/grvt/client.js";
import type { Candle, InstrumentInfo, OrderBookSnapshot, TradeTick } from "../api/grvt/types.js";
import { OrderBookStore } from "../core/order-book.js";

export class MarketDataService {
  readonly book: OrderBookStore;
  private candles: Candle[] = [];
  private trades: TradeTick[] = [];
  private instrument: InstrumentInfo | null = null;

  constructor(
    private readonly client: GrvtClient,
    private readonly symbol: string,
    bookDepth = 50,
  ) {
    this.book = new OrderBookStore(bookDepth);
  }

  async bootstrap(): Promise<void> {
    const [instrument, orderBook, candleData, tradeData] = await Promise.all([
      this.client.getInstrument(this.symbol),
      this.client.getOrderBook(this.symbol),
      this.client.getCandles(this.symbol, 100),
      this.client.getRecentTrades(this.symbol, 50),
    ]);

    this.instrument = instrument;
    this.book.applySnapshot(orderBook);
    this.candles = candleData;
    this.trades = tradeData;
  }

  applyOrderBook(snapshot: OrderBookSnapshot): void {
    this.book.applySnapshot(snapshot);
  }

  addTrade(trade: TradeTick): void {
    this.trades.push(trade);
    if (this.trades.length > 500) {
      this.trades = this.trades.slice(-500);
    }
  }

  updateInstrument(data: { markPrice: number; lastPrice: number; fundingRate: number }): void {
    if (!this.instrument) return;
    this.instrument = {
      ...this.instrument,
      markPrice: data.markPrice,
      lastPrice: data.lastPrice,
      fundingRate: data.fundingRate,
    };
  }

  getCandles(): Candle[] {
    return [...this.candles];
  }

  getCloses(): number[] {
    return this.candles.map((c) => c.close);
  }

  getTrades(): TradeTick[] {
    return [...this.trades];
  }

  getInstrument(): InstrumentInfo | null {
    return this.instrument;
  }

  getLastPrice(): number {
    return this.instrument?.lastPrice ?? this.book.midPrice() ?? 0;
  }

  getMarkPrice(): number {
    return this.instrument?.markPrice ?? this.getLastPrice();
  }

  getFundingRate(): number {
    return this.instrument?.fundingRate ?? 0;
  }

  async refreshCandles(): Promise<void> {
    this.candles = await this.client.getCandles(this.symbol, 100);
  }
}
