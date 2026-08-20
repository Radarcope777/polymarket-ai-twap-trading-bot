import type { CryptoSymbol, TwapSample } from '@polymarket-twap/shared';
import { EventEmitter } from 'node:events';

export interface RtdsConfig {
  symbols: CryptoSymbol[];
  windowSeconds: number[];
  stalenessMs: number;
  reconnectMaxMs: number;
}

const BASE_PRICES: Record<CryptoSymbol, number> = {
  'btc/usd': 98542.18,
  'eth/usd': 3247.55,
  'sol/usd': 178.42,
};

export class RtdsTwapStream extends EventEmitter {
  private config: RtdsConfig;
  private interval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private connected = false;

  constructor(config: Partial<RtdsConfig> = {}) {
    super();
    this.config = {
      symbols: ['btc/usd', 'eth/usd', 'sol/usd'],
      windowSeconds: [30, 60],
      stalenessMs: 2000,
      reconnectMaxMs: 30000,
      ...config,
    };
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    this.reconnectAttempt = 0;
    this.emit('connected');

    this.interval = setInterval(() => {
      for (const symbol of this.config.symbols) {
        for (const windowSeconds of this.config.windowSeconds) {
          const sample = this.generateSample(symbol, windowSeconds);
          this.emit('sample', sample);
        }
      }
    }, 1000);
  }

  disconnect(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.connected = false;
    this.emit('disconnected');
  }

  private generateSample(symbol: CryptoSymbol, windowSeconds: number): TwapSample {
    const base = BASE_PRICES[symbol];
    const noise = (Math.random() - 0.5) * base * 0.0002;
    const trend = Math.sin(Date.now() / 30000) * base * 0.0001;
    return {
      symbol,
      price: base + noise + trend,
      timestamp: Date.now(),
      windowSeconds,
    };
  }

  async reconnectWithBackoff(): Promise<void> {
    this.disconnect();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, this.config.reconnectMaxMs);
    this.reconnectAttempt++;
    await new Promise((r) => setTimeout(r, delay));
    this.connect();
  }
}
