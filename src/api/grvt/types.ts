export type OrderSide = "Buy" | "Sell";
export type PositionSide = "long" | "short" | "flat";

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeTick {
  symbol: string;
  price: number;
  size: number;
  side: OrderSide;
  timestamp: number;
}

export interface InstrumentInfo {
  symbol: string;
  tickSize: number;
  lotSize: number;
  maxOrderSize: number;
  minOrderSize: number;
  markPrice: number;
  lastPrice: number;
  fundingRate: number;
  openInterest: number;
  isActive: boolean;
}

export interface Position {
  symbol: string;
  size: number;
  avgEntryPrice: number;
  unrealisedPnl: number;
  leverage: number;
}

export interface StrategySignal {
  side: OrderSide | null;
  confidence: number;
  reason: string;
  suggestedQty?: number;
}

export interface GrvtOrder {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  size: number;
  price: number | null;
  status: string;
}

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  size: number;
  price?: number;
  reduceOnly?: boolean;
  clientOrderId?: string;
}

export interface GrvtApiError {
  code: number;
  message: string;
  status: number;
}

export type GrvtEnvironment = "prod" | "testnet" | "staging" | "dev";

export interface GrvtEndpoints {
  marketDataUrl: string;
  tradesUrl: string;
  authUrl: string;
  wsMarketUrl: string;
}

export const GRVT_ENDPOINTS: Record<GrvtEnvironment, GrvtEndpoints> = {
  prod: {
    marketDataUrl: "https://market-data.grvt.io",
    tradesUrl: "https://trades.grvt.io",
    authUrl: "https://edge.grvt.io",
    wsMarketUrl: "wss://market-data.grvt.io/ws",
  },
  testnet: {
    marketDataUrl: "https://market-data.testnet.grvt.io",
    tradesUrl: "https://trades.testnet.grvt.io",
    authUrl: "https://edge.testnet.grvt.io",
    wsMarketUrl: "wss://market-data.testnet.grvt.io/ws",
  },
  staging: {
    marketDataUrl: "https://market-data.staging.gravitymarkets.io",
    tradesUrl: "https://trades.staging.gravitymarkets.io",
    authUrl: "https://edge.staging.gravitymarkets.io",
    wsMarketUrl: "wss://market-data.staging.gravitymarkets.io/ws",
  },
  dev: {
    marketDataUrl: "https://market-data.dev.gravitymarkets.io",
    tradesUrl: "https://trades.dev.gravitymarkets.io",
    authUrl: "https://edge.dev.gravitymarkets.io",
    wsMarketUrl: "wss://market-data.dev.gravitymarkets.io/ws",
  },
};
