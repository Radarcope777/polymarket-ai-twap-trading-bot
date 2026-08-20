import { PolymarketClientWrapper } from '@polymarket-twap/polymarket-client';
import { RtdsTwapStream } from '@polymarket-twap/polymarket-client';
import { TwapStateEngine } from '@polymarket-twap/twap-engine';
import { SignalEngine, PaperTradingEngine } from '@polymarket-twap/strategy';
import type { Server as SocketServer } from 'socket.io';
import type { TwapSample } from '@polymarket-twap/shared';
import { logger } from './state.js';

export const polymarketClient = new PolymarketClientWrapper({
  apiKey: process.env.POLYMARKET_API_KEY,
  apiSecret: process.env.POLYMARKET_API_SECRET,
  apiPassphrase: process.env.POLYMARKET_API_PASSPHRASE,
  privateKey: process.env.POLYMARKET_PRIVATE_KEY,
  builderCode: process.env.POLYMARKET_BUILDER_CODE,
  liveTrading: process.env.LIVE_TRADING === 'true',
});

export const twapEngine = new TwapStateEngine({
  stalenessMs: Number(process.env.TWAP_STALENESS_MS ?? 2000),
});

export const signalEngine = new SignalEngine(Number(process.env.MIN_EDGE_AFTER_FEES ?? 0.02));
export const paperEngine = new PaperTradingEngine();

const rtdsStream = new RtdsTwapStream({
  stalenessMs: Number(process.env.TWAP_STALENESS_MS ?? 2000),
  reconnectMaxMs: Number(process.env.TWAP_RECONNECT_MAX_MS ?? 30000),
});

let ioRef: SocketServer | null = null;

export function setSocketIO(io: SocketServer): void {
  ioRef = io;
}

export function startTwapStream(): void {
  rtdsStream.on('sample', (sample: TwapSample) => {
    const state = twapEngine.addSample(sample);
    ioRef?.emit('twap:update', state);
  });

  rtdsStream.on('disconnected', () => {
    logger.warn('RTDS disconnected, reconnecting with backoff');
    void rtdsStream.reconnectWithBackoff();
  });

  rtdsStream.connect();
  logger.info('RTDS TWAP stream started');
}

export function getLatestSignals() {
  return polymarketClient.discoverUpDownMarkets().then((markets) =>
    markets.slice(0, 3).map((market) => {
      const twapState = twapEngine.getState(market.asset, market.twapWindowSeconds);
      if (!twapState) return null;
      return signalEngine.generateSignal(market, twapState, {
        midpoint: 0.5,
        spread: 0.04,
        imbalance: 0.1,
        yesPrice: 0.52,
      });
    }).filter(Boolean)
  );
}
