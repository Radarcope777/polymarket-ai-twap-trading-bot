import type {
  AuthSession,
} from "./auth.js";
import {
  buildAuthHeaders,
  isSessionValid,
  loginWithApiKey,
} from "./auth.js";
import type {
  Candle,
  GrvtApiError,
  GrvtEndpoints,
  GrvtOrder,
  InstrumentInfo,
  OrderBookSnapshot,
  OrderSide,
  PlaceOrderParams,
  Position,
  TradeTick,
} from "./types.js";
import { withRetry } from "../../utils/retry.js";
import {
  nanosecondsToMs,
  parseFundingRate,
  parseGrvtPrice,
  parseGrvtSize,
} from "../../utils/price.js";
import { generateClOrdId } from "../../utils/uuid.js";

export interface GrvtClientConfig {
  endpoints: GrvtEndpoints;
  apiKey?: string;
  tradingAccountId?: string;
  privateKey?: string;
}

interface GrvtBookLevelRow {
  price: string;
  size: string;
  num_orders?: number;
}

interface GrvtBookResponse {
  event_time?: string;
  instrument: string;
  bids: GrvtBookLevelRow[];
  asks: GrvtBookLevelRow[];
}

interface GrvtTickerResponse {
  instrument: string;
  mark_price?: string;
  last_price?: string;
  funding_rate?: number | string;
  open_interest?: string;
  best_bid_price?: string;
  best_bid_size?: string;
  best_ask_price?: string;
  best_ask_size?: string;
}

interface GrvtInstrumentResponse {
  instrument: string;
  tick_size?: string;
  min_size?: string;
  max_position_size?: string;
  is_active?: boolean;
  mark_price?: string;
  last_price?: string;
}

interface GrvtKlineRow {
  open_time: string;
  close_time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume_b: string;
}

interface GrvtTradeRow {
  price: string;
  size: string;
  is_taker_buyer?: boolean;
  event_time?: string;
}

export class GrvtClient {
  private session: AuthSession | null = null;

  constructor(private readonly config: GrvtClientConfig) {}

  async ping(): Promise<boolean> {
    const instruments = await this.getAllInstruments();
    return instruments.length > 0;
  }

  async getAllInstruments(): Promise<string[]> {
    const data = await this.marketPost<{ result: Array<{ instrument: string; is_active?: boolean }> }>(
      "all_instruments",
      { is_active: true },
    );

    return (data.result ?? [])
      .filter((row) => row.is_active !== false)
      .map((row) => row.instrument);
  }

  async getInstrument(symbol: string): Promise<InstrumentInfo> {
    const [instrumentData, tickerData] = await Promise.all([
      this.marketPost<{ result: GrvtInstrumentResponse }>("instrument", { instrument: symbol }),
      this.getTicker(symbol),
    ]);

    const row = instrumentData.result;
    if (!row) {
      throw new Error(`Instrument not found: ${symbol}`);
    }

    return {
      symbol: row.instrument,
      tickSize: parseGrvtPrice(row.tick_size ?? "0.01"),
      lotSize: parseGrvtSize(row.min_size ?? "0.001"),
      maxOrderSize: parseGrvtSize(row.max_position_size ?? "1000"),
      minOrderSize: parseGrvtSize(row.min_size ?? "0.001"),
      markPrice: tickerData.markPrice,
      lastPrice: tickerData.lastPrice,
      fundingRate: tickerData.fundingRate,
      openInterest: tickerData.openInterest,
      isActive: row.is_active ?? true,
    };
  }

  async getTicker(symbol: string): Promise<InstrumentInfo> {
    const data = await this.marketPost<{ result: GrvtTickerResponse }>("ticker", {
      instrument: symbol,
    });

    const row = data.result;
    if (!row) {
      throw new Error(`Ticker not found: ${symbol}`);
    }

    return {
      symbol: row.instrument,
      tickSize: 0.01,
      lotSize: 0.001,
      maxOrderSize: 1000,
      minOrderSize: 0.001,
      markPrice: parseGrvtPrice(row.mark_price),
      lastPrice: parseGrvtPrice(row.last_price),
      fundingRate: parseFundingRate(row.funding_rate),
      openInterest: parseGrvtSize(row.open_interest),
      isActive: true,
    };
  }

  async getOrderBook(symbol: string, depth = 50): Promise<OrderBookSnapshot> {
    const data = await this.marketPost<{ result: GrvtBookResponse }>("book", {
      instrument: symbol,
      depth,
    });

    const row = data.result;
    if (!row) {
      throw new Error(`Order book not found: ${symbol}`);
    }

    const bids = row.bids
      .map((level) => ({
        price: parseGrvtPrice(level.price),
        size: parseGrvtSize(level.size),
      }))
      .sort((a, b) => b.price - a.price);

    const asks = row.asks
      .map((level) => ({
        price: parseGrvtPrice(level.price),
        size: parseGrvtSize(level.size),
      }))
      .sort((a, b) => a.price - b.price);

    return {
      symbol,
      bids,
      asks,
      timestamp: nanosecondsToMs(row.event_time),
    };
  }

  async getCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const data = await this.marketPost<{ result: GrvtKlineRow[] }>("kline", {
      instrument: symbol,
      interval: "CI_1_M",
      type: "TRADE",
      limit,
    });

    return (data.result ?? [])
      .map((row) => ({
        timestamp: nanosecondsToMs(row.open_time),
        open: parseGrvtPrice(row.open),
        high: parseGrvtPrice(row.high),
        low: parseGrvtPrice(row.low),
        close: parseGrvtPrice(row.close),
        volume: parseGrvtSize(row.volume_b),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getRecentTrades(symbol: string, limit = 50): Promise<TradeTick[]> {
    const data = await this.marketPost<{ result: GrvtTradeRow[] }>("trade_history", {
      instrument: symbol,
      limit,
    });

    return (data.result ?? []).map((row) => ({
      symbol,
      price: parseGrvtPrice(row.price),
      size: parseGrvtSize(row.size),
      side: row.is_taker_buyer ? "Buy" : "Sell",
      timestamp: nanosecondsToMs(row.event_time),
    }));
  }

  async getPosition(_symbol: string): Promise<Position | null> {
    await this.ensureSession();
    return null;
  }

  async placeOrder(params: PlaceOrderParams): Promise<GrvtOrder> {
    await this.ensureSession();

    if (!this.config.privateKey) {
      throw new Error("GRVT_PRIVATE_KEY required for live order placement");
    }

    const clientOrderId = params.clientOrderId ?? generateClOrdId();
    const isMarket = params.price === undefined;

    const body = {
      order: {
        sub_account_id: this.config.tradingAccountId,
        instrument: params.symbol,
        is_buy: params.side === "Buy",
        size: String(params.size),
        limit_price: isMarket ? undefined : String(params.price),
        is_market: isMarket,
        time_in_force: isMarket ? "IOC" : "GTT",
        post_only: false,
        reduce_only: params.reduceOnly ?? false,
        client_order_id: clientOrderId,
      },
    };

    const data = await this.tradePost<{ result: { order_id: string; state?: { status?: string } } }>(
      "create_order",
      body,
    );

    const result = data.result;
    if (!result?.order_id) {
      throw new Error("Order placement returned empty response");
    }

    return {
      orderId: result.order_id,
      clientOrderId,
      symbol: params.symbol,
      side: params.side,
      size: params.size,
      price: params.price ?? null,
      status: result.state?.status ?? "submitted",
    };
  }

  async cancelAllOrders(symbol: string): Promise<void> {
    await this.ensureSession();
    await this.tradePost("cancel_all_orders", {
      sub_account_id: this.config.tradingAccountId,
      instrument: symbol,
    });
  }

  private async ensureSession(): Promise<AuthSession> {
    if (isSessionValid(this.session)) {
      return this.session!;
    }

    if (!this.config.apiKey) {
      throw new Error("GRVT_API_KEY required for authenticated requests");
    }

    this.session = await loginWithApiKey(
      this.config.endpoints.authUrl,
      this.config.apiKey,
    );

    return this.session;
  }

  private async marketPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.config.endpoints.marketDataUrl}/full/v1/${endpoint}`;

    return withRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return this.handleResponse<T>(response);
    });
  }

  private async tradePost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const session = await this.ensureSession();
    const url = `${this.config.endpoints.tradesUrl}/full/v1/${endpoint}`;

    if (!this.config.tradingAccountId) {
      throw new Error("GRVT_TRADING_ACCOUNT_ID required for trading requests");
    }

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...buildAuthHeaders(session, session.accountId, this.config.tradingAccountId),
    };

    return withRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      return this.handleResponse<T>(response);
    });
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Invalid JSON response (${response.status}): ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
      const err = data as GrvtApiError;
      const message = err?.message ?? text.slice(0, 200);
      throw new Error(`GRVT API error ${response.status}: ${message}`);
    }

    return data as T;
  }
}

export function mapOrderSide(side: OrderSide): "Buy" | "Sell" {
  return side;
}
