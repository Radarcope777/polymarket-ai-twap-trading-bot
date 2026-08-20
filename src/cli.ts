#!/usr/bin/env node
import { loadConfig, loadPublicConfig } from "./config/index.js";
import { TradingEngine } from "./core/engine.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

async function cmdPing(): Promise<void> {
  const config = loadPublicConfig();
  const engine = new TradingEngine(config);

  try {
    const ok = await engine.getClient().ping();
    console.log(ok ? "✓ GRVT API reachable" : "✗ GRVT API unreachable");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`✗ GRVT API error: ${msg}`);
    process.exit(1);
  }
}

async function cmdStatus(): Promise<void> {
  const config = loadPublicConfig();
  const engine = new TradingEngine(config);

  await engine.getMarketData().bootstrap();
  const instrument = engine.getMarketData().getInstrument();
  const book = engine.getMarketData().book;
  const lastPrice = engine.getMarketData().getLastPrice();

  console.log("\n── GRVT Market Status ──");
  console.log(`Instrument:   ${config.trading.instrument}`);
  console.log(`Environment:  ${config.grvt.env}`);
  console.log(`Last Price:   ${lastPrice.toFixed(2)}`);
  console.log(`Mark Price:   ${engine.getMarketData().getMarkPrice().toFixed(2)}`);
  console.log(`Funding Rate: ${(engine.getMarketData().getFundingRate() * 100).toFixed(4)}%`);
  console.log(`Best Bid:     ${book.bestBid()?.toFixed(2) ?? "N/A"}`);
  console.log(`Best Ask:     ${book.bestAsk()?.toFixed(2) ?? "N/A"}`);
  console.log(`Spread (bps): ${book.spreadBps()?.toFixed(2) ?? "N/A"}`);
  console.log(`OBI:          ${book.orderBookImbalance(5).toFixed(3)}`);
  if (instrument) {
    console.log(`Open Interest:${instrument.openInterest.toLocaleString()}`);
    console.log(`Active:       ${instrument.isActive}`);
  }
  console.log("");
}

async function cmdSimulate(): Promise<void> {
  const config = loadPublicConfig();
  const engine = new TradingEngine(config);

  console.log("\n── Strategy Simulation ──");
  console.log(`Strategy:   ${config.trading.strategy}`);
  console.log(`Instrument: ${config.trading.instrument}\n`);

  const result = await engine.simulate();

  console.log(`Last Price:  ${result.lastPrice.toFixed(2)}`);
  console.log(`Signal:      ${result.signal.side ?? "NEUTRAL"}`);
  console.log(`Confidence:  ${(result.signal.confidence * 100).toFixed(1)}%`);
  console.log(`Reason:      ${result.signal.reason}`);
  console.log("\n── AI Feature Scores ──");
  console.log(`Buy Score:   ${(result.aiScore.buyScore * 100).toFixed(1)}%`);
  console.log(`Sell Score:  ${(result.aiScore.sellScore * 100).toFixed(1)}%`);
  console.log(`Summary:     ${result.aiScore.summary}`);
  console.log("\n── Market Features ──");
  console.log(`RSI:         ${result.features.rsi?.toFixed(1) ?? "N/A"}`);
  console.log(`EMA Spread:  ${result.features.emaSpread?.toFixed(4) ?? "N/A"}`);
  console.log(`MACD Hist:   ${result.features.macdHistogram?.toFixed(2) ?? "N/A"}`);
  console.log(`Momentum:    ${result.features.momentumPct?.toFixed(2) ?? "N/A"}%`);
  console.log(`Funding:     ${result.features.fundingBps.toFixed(2)} bps`);
  console.log(`Volatility:  ${result.features.volatility?.toFixed(3) ?? "N/A"}%`);
  console.log("");
}

async function cmdStart(dryRun: boolean): Promise<void> {
  const config = loadConfig({ dryRun });

  if (!dryRun) {
    if (!config.grvt.apiKey || config.grvt.apiKey === "dry-run") {
      console.error("Error: GRVT_API_KEY required for live trading.");
      process.exit(1);
    }
    if (!config.grvt.tradingAccountId || config.grvt.tradingAccountId === "dry-run") {
      console.error("Error: GRVT_TRADING_ACCOUNT_ID required for live trading.");
      process.exit(1);
    }
    if (!config.grvt.privateKey) {
      console.error("Error: GRVT_PRIVATE_KEY required for live order signing.");
      process.exit(1);
    }
  }

  const engine = new TradingEngine(config);

  const shutdown = async () => {
    console.log("\nShutting down...");
    await engine.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  console.log(`\nStarting GRVT AI Agent (${dryRun ? "DRY RUN" : "LIVE"})`);
  console.log(`Strategy: ${config.trading.strategy} | Instrument: ${config.trading.instrument}\n`);

  await engine.start();
}

function cmdHelp(): void {
  console.log(`
GRVT AI Agent — CLI

Usage:
  npm run cli -- <command> [options]

Commands:
  ping       Test GRVT API connectivity
  status     Show live market data for configured instrument
  simulate   Run strategy + AI scoring without trading
  start      Start the trading agent
  help       Show this help message

Options:
  --dry-run  Simulate orders without sending to exchange (for start command)

Examples:
  npm run cli -- ping
  npm run cli -- status
  npm run cli -- simulate
  npm run cli -- start --dry-run
  npm run dry-run
`);
}

async function main(): Promise<void> {
  const dryRun = args.includes("--dry-run");

  switch (command) {
    case "ping":
      await cmdPing();
      break;
    case "status":
      await cmdStatus();
      break;
    case "simulate":
      await cmdSimulate();
      break;
    case "start":
      await cmdStart(dryRun);
      break;
    case "help":
    default:
      cmdHelp();
      break;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
