import WebSocket from "ws";
import type { OrderBookSnapshot } from "./types.js";
import { parseGrvtPrice, parseGrvtSize } from "../../utils/price.js";

export interface GrvtWebSocketConfig {
  wsUrl: string;
  instrument: string;
}

interface BookLevelRow {
  price: string;
  size: string;
}

interface BookMessage {
  stream?: string;
  feed?: {
    instrument?: string;
    bids?: BookLevelRow[];
    asks?: BookLevelRow[];
    event_time?: string;
  };
  result?: {
    instrument?: string;
    bids?: BookLevelRow[];
    asks?: BookLevelRow[];
    event_time?: string;
  };
}

export class GrvtWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onBookCallback: ((book: OrderBookSnapshot) => void) | null = null;
  private onInstrumentCallback: ((data: {
    markPrice: number;
    lastPrice: number;
    fundingRate: number;
  }) => void) | null = null;

  constructor(private readonly config: GrvtWebSocketConfig) {}

  onOrderBook(callback: (book: OrderBookSnapshot) => void): void {
    this.onBookCallback = callback;
  }

  onInstrument(callback: (data: {
    markPrice: number;
    lastPrice: number;
    fundingRate: number;
  }) => void): void {
    this.onInstrumentCallback = callback;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.config.wsUrl);

    this.ws.on("open", () => {
      this.subscribe();
    });

    this.ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as BookMessage;
        this.handleMessage(message);
      } catch {
        // Ignore malformed frames
      }
    });

    this.ws.on("close", () => {
      this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      this.ws?.close();
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const bookSub = {
      jsonrpc: "2.0",
      method: "subscribe",
      params: {
        stream: "v1.book.d",
        selectors: [`${this.config.instrument}@50`],
      },
      id: 1,
    };

    const tickerSub = {
      jsonrpc: "2.0",
      method: "subscribe",
      params: {
        stream: "v1.ticker.s",
        selectors: [this.config.instrument],
      },
      id: 2,
    };

    this.ws.send(JSON.stringify(bookSub));
    this.ws.send(JSON.stringify(tickerSub));
  }

  private handleMessage(message: BookMessage): void {
    const payload = message.feed ?? message.result;
    if (!payload) return;

    if (payload.bids && payload.asks && this.onBookCallback) {
      const bids = payload.bids
        .map((level) => ({
          price: parseGrvtPrice(level.price),
          size: parseGrvtSize(level.size),
        }))
        .sort((a, b) => b.price - a.price);

      const asks = payload.asks
        .map((level) => ({
          price: parseGrvtPrice(level.price),
          size: parseGrvtSize(level.size),
        }))
        .sort((a, b) => a.price - b.price);

      this.onBookCallback({
        symbol: payload.instrument ?? this.config.instrument,
        bids,
        asks,
        timestamp: Date.now(),
      });
    }

    const ticker = payload as {
      mark_price?: string;
      last_price?: string;
      funding_rate?: number | string;
    };

    if (this.onInstrumentCallback && (ticker.mark_price || ticker.last_price)) {
      this.onInstrumentCallback({
        markPrice: parseGrvtPrice(ticker.mark_price),
        lastPrice: parseGrvtPrice(ticker.last_price),
        fundingRate: typeof ticker.funding_rate === "number"
          ? ticker.funding_rate
          : parseGrvtPrice(ticker.funding_rate),
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}
