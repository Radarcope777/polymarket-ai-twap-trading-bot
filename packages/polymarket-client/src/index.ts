import type { CryptoSymbol, MarketDuration, MarketInfo } from '@polymarket-twap/shared';
import { POLYMARKET_ENDPOINTS, TWAP_WINDOWS } from '@polymarket-twap/shared';

export interface PolymarketClientConfig {
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
  privateKey?: string;
  builderCode?: string;
  liveTrading?: boolean;
}

export interface RateLimitInfo {
  tier: string;
  warning: boolean;
  retryAfter?: number;
}

const DEMO_MARKETS: MarketInfo[] = [
  {
    slug: 'btc-up-down-5m',
    conditionId: '0xbtc5m',
    yesTokenId: 'btc-yes-5m',
    noTokenId: 'btc-no-5m',
    asset: 'btc/usd',
    duration: '5m',
    strikePrice: 98542.18,
    endTime: Date.now() + 180000,
    twapWindowSeconds: TWAP_WINDOWS.FIVE_MIN,
    volume24h: 2840000,
    active: true,
  },
  {
    slug: 'eth-up-down-15m',
    conditionId: '0xeth15m',
    yesTokenId: 'eth-yes-15m',
    noTokenId: 'eth-no-15m',
    asset: 'eth/usd',
    duration: '15m',
    strikePrice: 3247.55,
    endTime: Date.now() + 720000,
    twapWindowSeconds: TWAP_WINDOWS.FIFTEEN_MIN,
    volume24h: 1560000,
    active: true,
  },
  {
    slug: 'sol-up-down-4h',
    conditionId: '0xsol4h',
    yesTokenId: 'sol-yes-4h',
    noTokenId: 'sol-no-4h',
    asset: 'sol/usd',
    duration: '4h',
    strikePrice: 178.42,
    endTime: Date.now() + 5400000,
    twapWindowSeconds: TWAP_WINDOWS.FOUR_HOUR,
    volume24h: 890000,
    active: true,
  },
  {
    slug: 'btc-up-down-15m',
    conditionId: '0xbtc15m',
    yesTokenId: 'btc-yes-15m',
    noTokenId: 'btc-no-15m',
    asset: 'btc/usd',
    duration: '15m',
    strikePrice: 98542.18,
    endTime: Date.now() + 600000,
    twapWindowSeconds: TWAP_WINDOWS.FIFTEEN_MIN,
    volume24h: 1920000,
    active: true,
  },
];

export class PolymarketClientWrapper {
  private config: PolymarketClientConfig;
  private sdkAvailable = false;

  constructor(config: PolymarketClientConfig = {}) {
    this.config = config;
    this.initSdk();
  }

  private async initSdk(): Promise<void> {
    try {
      await import('@polymarket/client' as string);
      this.sdkAvailable = true;
    } catch {
      this.sdkAvailable = false;
    }
  }

  get isLiveEnabled(): boolean {
    return this.config.liveTrading === true && !!this.config.privateKey;
  }

  get hasSdk(): boolean {
    return this.sdkAvailable;
  }

  async discoverUpDownMarkets(filters?: {
    asset?: CryptoSymbol;
    duration?: MarketDuration;
  }): Promise<MarketInfo[]> {
    if (this.sdkAvailable && this.config.apiKey) {
      try {
        const mod = await import('@polymarket/client' as string) as { createPublicClient: () => {
          listMarkets: (opts: { closed: boolean; pageSize: number }) => {
            firstPage: () => Promise<{ items: Record<string, unknown>[] }>;
          };
        }};
        const client = mod.createPublicClient();
        const pages = client.listMarkets({ closed: false, pageSize: 50 });
        const firstPage = await pages.firstPage();
        const markets = firstPage.items
          .filter((m) => String(m.question ?? '').toLowerCase().includes('up or down'))
          .map((m) => this.mapGammaMarket(m));
        if (markets.length > 0) return this.filterMarkets(markets, filters);
      } catch {
        // Fall through to demo data
      }
    }
    return this.filterMarkets(DEMO_MARKETS.map((m) => ({ ...m, endTime: Date.now() + m.endTime - Date.now() })), filters);
  }

  private filterMarkets(markets: MarketInfo[], filters?: { asset?: CryptoSymbol; duration?: MarketDuration }): MarketInfo[] {
    return markets.filter((m) => {
      if (filters?.asset && m.asset !== filters.asset) return false;
      if (filters?.duration && m.duration !== filters.duration) return false;
      return m.active;
    });
  }

  private mapGammaMarket(raw: Record<string, unknown>): MarketInfo {
    const slug = String(raw.slug ?? raw.condition_id ?? 'unknown');
    const asset = slug.includes('eth') ? 'eth/usd' : slug.includes('sol') ? 'sol/usd' : 'btc/usd';
    const duration: MarketDuration = slug.includes('5m') ? '5m' : slug.includes('4h') ? '4h' : '15m';
    const tokens = Array.isArray(raw.tokens) ? raw.tokens as string[] : [];
    return {
      slug,
      conditionId: String(raw.condition_id ?? raw.conditionId ?? ''),
      yesTokenId: String(tokens[0] ?? ''),
      noTokenId: String(tokens[1] ?? ''),
      asset,
      duration,
      strikePrice: Number(raw.strike ?? 0),
      endTime: Date.parse(String(raw.end_date ?? raw.endDate ?? Date.now())),
      twapWindowSeconds: duration === '5m' ? 30 : 60,
      volume24h: Number(raw.volume ?? 0),
      active: !raw.closed,
    };
  }

  async getOrderBook(tokenId: string): Promise<{ bids: Array<{ price: number; size: number }>; asks: Array<{ price: number; size: number }> }> {
    try {
      const res = await fetch(`${POLYMARKET_ENDPOINTS.CLOB_HOST}/book?token_id=${tokenId}`);
      if (res.ok) return res.json() as Promise<{ bids: Array<{ price: number; size: number }>; asks: Array<{ price: number; size: number }> }>;
    } catch {
      // demo fallback
    }
    return {
      bids: [{ price: 0.48, size: 500 }, { price: 0.47, size: 1200 }],
      asks: [{ price: 0.52, size: 450 }, { price: 0.53, size: 800 }],
    };
  }

  parseRateLimitHeaders(headers: Headers): RateLimitInfo {
    return {
      tier: headers.get('Poly-RateLimit-Tier') ?? 'standard',
      warning: headers.get('Poly-RateLimit-Warning') === 'true',
      retryAfter: headers.get('Retry-After') ? Number(headers.get('Retry-After')) : undefined,
    };
  }

  getMaskedAddress(): string {
    if (!this.config.privateKey) return 'Not configured';
    return `0x${this.config.privateKey.slice(2, 6)}...${this.config.privateKey.slice(-4)}`;
  }
}

export { POLYMARKET_ENDPOINTS };
export { RtdsTwapStream } from './rtds.js';
