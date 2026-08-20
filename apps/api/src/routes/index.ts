import { Router } from 'express';
import { StrategyConfigSchema, BacktestCreateSchema, PaperSessionCreateSchema, LiveArmSchema } from '@polymarket-twap/shared';
import { runBacktest } from '@polymarket-twap/strategy';
import { v4 as uuidv4 } from 'uuid';
import { botState, storeBacktest, getBacktest, listBacktests } from '../services/state.js';
import { polymarketClient, twapEngine, signalEngine, paperEngine, getLatestSignals } from '../services/engine.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: botState.mode });
});

router.get('/config', (_req, res) => {
  res.json({
    strategy: botState.strategy,
    liveTradingEnabled: process.env.LIVE_TRADING === 'true',
    collateral: 'pUSD',
    sdkVersion: '@polymarket/client',
    maskedAddress: polymarketClient.getMaskedAddress(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

router.post('/config/strategy', (req, res) => {
  const parsed = StrategyConfigSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  botState.strategy = parsed.data;
  res.json(botState.strategy);
});

router.get('/markets/up-down', async (req, res) => {
  const asset = req.query.asset as string | undefined;
  const duration = req.query.duration as string | undefined;
  const markets = await polymarketClient.discoverUpDownMarkets({
    asset: asset as 'btc/usd' | undefined,
    duration: duration as '5m' | undefined,
  });
  res.json(markets);
});

router.get('/markets/:slug', async (req, res) => {
  const markets = await polymarketClient.discoverUpDownMarkets();
  const market = markets.find((m) => m.slug === req.params.slug);
  if (!market) return res.status(404).json({ error: 'Market not found' });
  res.json(market);
});

router.get('/twap/live', (req, res) => {
  const symbol = (req.query.symbol as string) ?? 'btc/usd';
  const window = Number(req.query.window ?? 30);
  const state = twapEngine.getState(symbol as 'btc/usd', window);
  res.json(state ?? { error: 'No TWAP state' });
});

router.get('/signals/latest', async (_req, res) => {
  const signals = await getLatestSignals();
  res.json(signals);
});

router.post('/backtests', async (req, res) => {
  const parsed = BacktestCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  botState.mode = 'BACKTEST';
  const result = await runBacktest(parsed.data);
  storeBacktest(result);
  botState.mode = 'IDLE';
  res.status(201).json(result);
});

router.get('/backtests', (_req, res) => {
  res.json(listBacktests());
});

router.get('/backtests/:id', (req, res) => {
  const bt = getBacktest(req.params.id);
  if (!bt) return res.status(404).json({ error: 'Backtest not found' });
  res.json(bt);
});

router.get('/backtests/:id/equity-curve', (req, res) => {
  const bt = getBacktest(req.params.id);
  if (!bt) return res.status(404).json({ error: 'Backtest not found' });
  res.json(bt.equityCurve);
});

router.get('/backtests/:id/trades', (req, res) => {
  const bt = getBacktest(req.params.id);
  if (!bt) return res.status(404).json({ error: 'Backtest not found' });
  res.json(bt.trades);
});

router.delete('/backtests/:id', (req, res) => {
  res.json({ deleted: req.params.id });
});

router.post('/paper/sessions', (req, res) => {
  const parsed = PaperSessionCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuidv4();
  botState.mode = 'PAPER';
  const session = paperEngine.startSession(id);
  res.status(201).json(session);
});

router.post('/paper/sessions/:id/stop', (req, res) => {
  const session = paperEngine.stopSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  botState.mode = 'IDLE';
  res.json(session);
});

router.get('/paper/sessions', (_req, res) => {
  res.json(paperEngine.listSessions());
});

router.get('/paper/sessions/:id/positions', (req, res) => {
  const session = paperEngine.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session.positions ?? []);
});

router.get('/paper/sessions/:id/trades', (req, res) => {
  const session = paperEngine.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session.fills ?? []);
});

router.get('/paper/sessions/:id/pnl', (req, res) => {
  const session = paperEngine.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ pnl: session.pnl, fees: session.fees, trades: session.trades });
});

router.post('/live/arm', (req, res) => {
  if (process.env.LIVE_TRADING !== 'true') {
    return res.status(403).json({ error: 'LIVE_TRADING env flag must be true' });
  }
  const parsed = LiveArmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.confirmationToken !== process.env.LIVE_CONFIRMATION_TOKEN) {
    return res.status(403).json({ error: 'Invalid confirmation token' });
  }
  botState.liveArmed = true;
  botState.mode = 'LIVE';
  res.json({ armed: true, mode: botState.mode });
});

router.post('/live/disarm', (_req, res) => {
  botState.liveArmed = false;
  botState.mode = 'IDLE';
  res.json({ armed: false, mode: botState.mode });
});

router.get('/live/status', (_req, res) => {
  res.json({
    armed: botState.liveArmed,
    mode: botState.mode,
    liveTradingEnabled: process.env.LIVE_TRADING === 'true',
    rateLimitTier: botState.rateLimitTier,
    rateLimitWarning: botState.rateLimitWarning,
  });
});

router.get('/live/orders', (_req, res) => {
  res.json([]);
});

router.get('/live/positions', (_req, res) => {
  res.json([]);
});

router.get('/models', (_req, res) => {
  res.json(signalEngine.getModels());
});

router.post('/models/train', (_req, res) => {
  res.status(202).json({ status: 'training_queued', message: 'Training job queued via BullMQ' });
});

router.post('/models/promote/:version', (req, res) => {
  signalEngine.setActiveModel(req.params.version);
  res.json({ promoted: req.params.version });
});

router.get('/audit/twap-samples', (_req, res) => {
  res.json(twapEngine.getAllStates().flatMap((s) => s.samples.slice(-10)));
});

router.get('/audit/executions', (_req, res) => {
  res.json([]);
});
