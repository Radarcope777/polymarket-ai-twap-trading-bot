export const POLYMARKET_ENDPOINTS = {
  CLOB_HOST: 'https://clob.polymarket.com',
  GAMMA_API: 'https://gamma-api.polymarket.com',
  DATA_API: 'https://data-api.polymarket.com',
  RELAYER_V2: 'https://relayer-v2.polymarket.com',
  WS_MARKET: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  WS_USER: 'wss://ws-subscriptions-clob.polymarket.com/ws/user',
} as const;

export const COLLATERAL = 'pUSD' as const;

export const TWAP_WINDOWS = {
  FIVE_MIN: 30,
  FIFTEEN_MIN: 60,
  FOUR_HOUR: 60,
} as const;

export const CRYPTO_SYMBOLS = ['btc/usd', 'eth/usd', 'sol/usd'] as const;

export const MARKET_DURATIONS = ['5m', '15m', '4h'] as const;

export type CryptoSymbol = (typeof CRYPTO_SYMBOLS)[number];
export type MarketDuration = (typeof MARKET_DURATIONS)[number];
export type BotMode = 'IDLE' | 'BACKTEST' | 'PAPER' | 'LIVE' | 'PAUSED' | 'ERROR';
export type OrderSide = 'YES' | 'NO';
export type SignalSide = 'UP' | 'DOWN' | 'ABSTAIN';

export interface TwapSample {
  symbol: CryptoSymbol;
  price: number;
  timestamp: number;
  windowSeconds: number;
}

export interface TwapState {
  symbol: CryptoSymbol;
  windowSeconds: number;
  samples: TwapSample[];
  runningAverage: number;
  projectedFinal: number;
  confidence: number;
  windowStart: number;
  windowEnd: number;
  isStale: boolean;
  lastSampleAt: number;
}

export interface MarketInfo {
  slug: string;
  conditionId: string;
  yesTokenId: string;
  noTokenId: string;
  asset: CryptoSymbol;
  duration: MarketDuration;
  strikePrice: number;
  endTime: number;
  twapWindowSeconds: number;
  volume24h: number;
  active: boolean;
}

export interface SignalOutput {
  marketSlug: string;
  fairProbUp: number;
  edgeAfterFees: number;
  recommendedSide: OrderSide;
  confidence: number;
  abstain: boolean;
  modelVersion: string;
  features: Record<string, number>;
  timestamp: number;
}

export interface BacktestParams {
  startDate: string;
  endDate: string;
  assets: CryptoSymbol[];
  durations: MarketDuration[];
  minEdge: number;
  sliceCount: number;
  modelVersion: string;
  feeRate: number;
  slippageBps: number;
  takerDelayMs: number;
}

export interface BacktestResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  params: BacktestParams;
  metrics: {
    totalTrades: number;
    winRate: number;
    sharpe: number;
    totalPnl: number;
    maxDrawdown: number;
    avgEdge: number;
    totalFees: number;
  };
  equityCurve: Array<{ timestamp: number; equity: number }>;
  trades: BacktestTrade[];
  createdAt: string;
}

export interface BacktestTrade {
  id: string;
  marketSlug: string;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  fees: number;
  projectedTwap: number;
  outcome: 'WIN' | 'LOSS';
  timestamp: number;
}

export interface PaperSession {
  id: string;
  status: 'active' | 'stopped';
  startedAt: string;
  stoppedAt?: string;
  pnl: number;
  fees: number;
  trades: number;
}

export interface StrategyConfig {
  minEdgeAfterFees: number;
  maxSlippageBps: number;
  sliceCount: number;
  makerPreference: number;
  maxDailyLossUsd: number;
  maxPositionUsd: number;
  enabledDurations: MarketDuration[];
  enabledAssets: CryptoSymbol[];
}

export * from './schemas.js';
export * from './fees.js';
