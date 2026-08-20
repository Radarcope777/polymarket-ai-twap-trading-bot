import type { AppConfig } from "../config/index.js";
import { GrvtClient } from "../api/grvt/client.js";
import { GrvtWebSocket } from "../api/grvt/websocket.js";
import { FeatureEngine, SignalScorer } from "../ai/feature-engine.js";
import { ExecutionEngine } from "./execution.js";
import { MarketDataService } from "../services/market-data.js";
import { createLogger, type Logger } from "../services/logger.js";
import { RiskManager } from "../services/risk-manager.js";
import { createStrategy } from "../strategies/index.js";
import { positionSideFromSize, type TradingStrategy } from "../strategies/base.js";

export class TradingEngine {
  private readonly client: GrvtClient;
  private readonly ws: GrvtWebSocket;
  private readonly marketData: MarketDataService;
  private readonly risk: RiskManager;
  private readonly execution: ExecutionEngine;
  private readonly strategy;
  private readonly featureEngine = new FeatureEngine();
  private readonly signalScorer = new SignalScorer();
  private readonly logger: Logger;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private tickCount = 0;

  constructor(private readonly config: AppConfig) {
    this.logger = createLogger(config.logLevel);
    this.client = new GrvtClient({
      endpoints: config.grvt.endpoints,
      apiKey: config.grvt.apiKey,
      tradingAccountId: config.grvt.tradingAccountId,
      privateKey: config.grvt.privateKey,
    });
    this.ws = new GrvtWebSocket({
      wsUrl: config.grvt.endpoints.wsMarketUrl,
      instrument: config.trading.instrument,
    });
    this.marketData = new MarketDataService(this.client, config.trading.instrument);
    this.risk = new RiskManager({
      maxPositionSize: config.trading.maxPositionSize,
      maxDailyLossUsd: config.trading.maxDailyLossUsd,
      orderSize: config.trading.orderSize,
      stopLossBps: config.trading.stopLossBps,
      takeProfitBps: config.trading.takeProfitBps,
    });
    this.execution = new ExecutionEngine(
      this.client,
      config.trading.instrument,
      config.trading.dryRun,
      this.risk,
      this.logger,
    );
    this.strategy = createStrategy(config.trading.strategy);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.logger.info(
      {
        instrument: this.config.trading.instrument,
        strategy: this.config.trading.strategy,
        dryRun: this.config.trading.dryRun,
        env: this.config.grvt.env,
      },
      "Starting GRVT AI trading engine",
    );

    await this.marketData.bootstrap();

    if (!this.config.trading.dryRun) {
      const position = await this.client.getPosition(this.config.trading.instrument);
      if (position) {
        this.risk.setPosition(position.size, position.avgEntryPrice);
      }
    }

    this.ws.onOrderBook((book) => this.marketData.applyOrderBook(book));
    this.ws.onInstrument((data) => this.marketData.updateInstrument(data));
    this.ws.connect();

    this.tickTimer = setInterval(() => {
      void this.tick();
    }, this.config.trading.tickIntervalMs);

    await this.tick();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.ws.disconnect();
    this.logger.info("Trading engine stopped");
  }

  async tick(): Promise<void> {
    if (!this.running) return;

    try {
      if (this.tickCount % 10 === 0) {
        await this.marketData.refreshCandles();
      }
      this.tickCount++;

      const candles = this.marketData.getCandles();
      const closes = this.marketData.getCloses();
      const lastPrice = this.marketData.getLastPrice();
      const positionSize = this.risk.getPositionSize();

      const strategyConfig = {
        orderSize: this.config.trading.orderSize,
        rsiPeriod: this.config.trading.rsiPeriod,
        rsiOversold: this.config.trading.rsiOversold,
        rsiOverbought: this.config.trading.rsiOverbought,
        emaFast: this.config.trading.emaFast,
        emaSlow: this.config.trading.emaSlow,
        bollingerPeriod: this.config.trading.bollingerPeriod,
        bollingerStdDev: this.config.trading.bollingerStdDev,
        momentumWindow: this.config.trading.momentumWindow,
        fundingThresholdBps: this.config.trading.fundingThresholdBps,
      };

      const ctx = {
        candles,
        closes,
        lastPrice,
        markPrice: this.marketData.getMarkPrice(),
        fundingRate: this.marketData.getFundingRate(),
        book: this.marketData.book,
        positionSize,
        positionSide: positionSideFromSize(positionSize),
      };

      const signal = this.strategy.evaluate(ctx, strategyConfig);

      const features = this.featureEngine.extract(
        candles,
        this.marketData.book.getSnapshot(this.config.trading.instrument),
        this.marketData.getFundingRate(),
        strategyConfig,
      );
      const aiScore = this.signalScorer.score(features);

      this.logger.debug(
        {
          signal: signal.side,
          confidence: signal.confidence.toFixed(2),
          reason: signal.reason,
          aiBuy: aiScore.buyScore.toFixed(2),
          aiSell: aiScore.sellScore.toFixed(2),
          price: lastPrice,
        },
        "Tick evaluation",
      );

      const trigger = this.risk.checkPriceTriggers(lastPrice);
      if (trigger === "stop_loss" || trigger === "take_profit") {
        const closeSide = positionSize > 0 ? "Sell" : "Buy";
        await this.execution.closePosition(Math.abs(positionSize), closeSide);
        return;
      }

      if (signal.side && signal.confidence >= 0.25) {
        await this.execution.executeSignal(
          signal,
          lastPrice,
          this.config.trading.orderSize,
        );
      }
    } catch (error) {
      this.logger.error({ error }, "Tick error");
    }
  }

  async simulate(): Promise<{
    signal: ReturnType<TradingStrategy["evaluate"]>;
    features: ReturnType<FeatureEngine["extract"]>;
    aiScore: ReturnType<SignalScorer["score"]>;
    lastPrice: number;
  }> {
    await this.marketData.bootstrap();

    const candles = this.marketData.getCandles();
    const closes = this.marketData.getCloses();
    const lastPrice = this.marketData.getLastPrice();

    const strategyConfig = {
      orderSize: this.config.trading.orderSize,
      rsiPeriod: this.config.trading.rsiPeriod,
      rsiOversold: this.config.trading.rsiOversold,
      rsiOverbought: this.config.trading.rsiOverbought,
      emaFast: this.config.trading.emaFast,
      emaSlow: this.config.trading.emaSlow,
      bollingerPeriod: this.config.trading.bollingerPeriod,
      bollingerStdDev: this.config.trading.bollingerStdDev,
      momentumWindow: this.config.trading.momentumWindow,
      fundingThresholdBps: this.config.trading.fundingThresholdBps,
    };

    const ctx = {
      candles,
      closes,
      lastPrice,
      markPrice: this.marketData.getMarkPrice(),
      fundingRate: this.marketData.getFundingRate(),
      book: this.marketData.book,
      positionSize: 0,
      positionSide: positionSideFromSize(0),
    };

    const signal = this.strategy.evaluate(ctx, strategyConfig);
    const features = this.featureEngine.extract(
      candles,
      this.marketData.book.getSnapshot(this.config.trading.instrument),
      this.marketData.getFundingRate(),
      strategyConfig,
    );
    const aiScore = this.signalScorer.score(features);

    return { signal, features, aiScore, lastPrice };
  }

  getMarketData(): MarketDataService {
    return this.marketData;
  }

  getClient(): GrvtClient {
    return this.client;
  }
}
