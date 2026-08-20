import { PolymarketClientWrapper, RtdsTwapStream } from '@polymarket-twap/polymarket-client';
import { TwapStateEngine } from '@polymarket-twap/twap-engine';
import { SignalEngine, TwapExecutionEngine } from '@polymarket-twap/strategy';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty' } });

async function main() {
  const client = new PolymarketClientWrapper({
    privateKey: process.env.POLYMARKET_PRIVATE_KEY,
    liveTrading: process.env.LIVE_TRADING === 'true',
  });

  const twapEngine = new TwapStateEngine();
  const signalEngine = new SignalEngine(Number(process.env.MIN_EDGE_AFTER_FEES ?? 0.02));
  const executionEngine = new TwapExecutionEngine();
  const rtds = new RtdsTwapStream();

  logger.info({ hasSdk: client.hasSdk, live: client.isLiveEnabled }, 'Bot runner started');

  rtds.on('sample', (sample) => {
    twapEngine.addSample(sample);
  });
  rtds.connect();

  setInterval(async () => {
    const stale = twapEngine.checkStaleness();
    if (stale.length > 0) {
      logger.warn({ stale }, 'Stale oracle feed — pausing signals');
      return;
    }

    const markets = await client.discoverUpDownMarkets();
    for (const market of markets.slice(0, 3)) {
      const twapState = twapEngine.getState(market.asset, market.twapWindowSeconds);
      if (!twapState || twapState.isStale) continue;

      const signal = signalEngine.generateSignal(market, twapState, {
        midpoint: 0.5,
        spread: 0.04,
        imbalance: 0.1,
        yesPrice: 0.52,
      });

      if (!signal.abstain) {
        const slices = executionEngine.sliceOrder(500, 5, 30000, 0.5, signal.edgeAfterFees);
        logger.info({ market: market.slug, side: signal.recommendedSide, edge: signal.edgeAfterFees, slices: slices.length }, 'Signal generated');
      }
    }
  }, 5000);
}

main().catch((err) => {
  logger.error(err, 'Bot crashed');
  process.exit(1);
});
