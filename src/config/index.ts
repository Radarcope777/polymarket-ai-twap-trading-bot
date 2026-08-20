import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { GRVT_ENDPOINTS, type GrvtEnvironment } from "../api/grvt/types.js";

loadEnv();

const StrategySchema = z.enum([
  "mean_reversion",
  "trend_following",
  "momentum",
  "funding_arbitrage",
  "ai_composite",
]);

const EnvironmentSchema = z.enum(["prod", "testnet", "staging", "dev"]);

export const ConfigSchema = z.object({
  grvt: z.object({
    apiKey: z.string().min(1),
    tradingAccountId: z.string().min(1),
    privateKey: z.string().optional(),
    env: EnvironmentSchema,
    endpoints: z.object({
      marketDataUrl: z.string().url(),
      tradesUrl: z.string().url(),
      authUrl: z.string().url(),
      wsMarketUrl: z.string().url(),
    }),
  }),
  trading: z.object({
    instrument: z.string().min(1),
    strategy: StrategySchema,
    orderSize: z.number().positive(),
    leverage: z.number().int().min(1).max(100),
    tickIntervalMs: z.number().int().min(500).max(60_000),
    rsiPeriod: z.number().int().min(5).max(50),
    rsiOversold: z.number().min(10).max(40),
    rsiOverbought: z.number().min(60).max(90),
    emaFast: z.number().int().min(3).max(50),
    emaSlow: z.number().int().min(10).max(200),
    bollingerPeriod: z.number().int().min(10).max(100),
    bollingerStdDev: z.number().min(1).max(4),
    momentumWindow: z.number().int().min(5).max(200),
    fundingThresholdBps: z.number().min(1).max(100),
    maxPositionSize: z.number().positive().optional(),
    maxDailyLossUsd: z.number().positive().optional(),
    stopLossBps: z.number().min(5).max(500).optional(),
    takeProfitBps: z.number().min(5).max(2000).optional(),
    dryRun: z.boolean().default(false),
  }),
  logLevel: z.string().default("info"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type StrategyName = z.infer<typeof StrategySchema>;

/** Normalize BTC-USDT-PERP, btc_usdt_perp → BTC_USDT_Perp */
export function normalizeInstrument(raw: string): string {
  const cleaned = raw.replace(/[- ]/g, "_").replace(/__/g, "_");
  const parts = cleaned.split("_").filter(Boolean);

  if (parts.length >= 3) {
    const last = parts[parts.length - 1]!.toLowerCase();
    if (last === "perp" || last === "perpetual") {
      parts[parts.length - 1] = "Perp";
      return parts
        .slice(0, -1)
        .map((p) => p.toUpperCase())
        .concat("Perp")
        .join("_");
    }
  }

  return cleaned
    .split("_")
    .map((part, index, arr) => {
      if (index === arr.length - 1 && part.toLowerCase() === "perp") {
        return "Perp";
      }
      return part.toUpperCase();
    })
    .join("_");
}

function resolveEnvironment(): GrvtEnvironment {
  const env = (process.env.GRVT_ENV ?? "prod").toLowerCase();
  if (env === "production") return "prod";
  if (env === "mainnet") return "prod";
  return EnvironmentSchema.parse(env);
}

export function loadConfig(overrides?: Partial<{ dryRun: boolean }>): AppConfig {
  const dryRun = overrides?.dryRun ?? process.env.DRY_RUN === "true";
  const grvtEnv = resolveEnvironment();
  const defaults = GRVT_ENDPOINTS[grvtEnv];

  const raw = {
    grvt: {
      apiKey: process.env.GRVT_API_KEY ?? (dryRun ? "dry-run" : ""),
      tradingAccountId: process.env.GRVT_TRADING_ACCOUNT_ID ?? (dryRun ? "dry-run" : ""),
      privateKey: process.env.GRVT_PRIVATE_KEY,
      env: grvtEnv,
      endpoints: {
        marketDataUrl: process.env.GRVT_MARKET_DATA_URL ?? defaults.marketDataUrl,
        tradesUrl: process.env.GRVT_TRADES_URL ?? defaults.tradesUrl,
        authUrl: process.env.GRVT_AUTH_URL ?? defaults.authUrl,
        wsMarketUrl: process.env.GRVT_WS_URL ?? defaults.wsMarketUrl,
      },
    },
    trading: {
      instrument: normalizeInstrument(process.env.GRVT_INSTRUMENT ?? "BTC_USDT_Perp"),
      strategy: (process.env.TRADING_STRATEGY ?? "ai_composite") as StrategyName,
      orderSize: Number(process.env.ORDER_SIZE ?? 0.001),
      leverage: Number(process.env.LEVERAGE ?? 5),
      tickIntervalMs: Number(process.env.TICK_INTERVAL_MS ?? 2000),
      rsiPeriod: Number(process.env.RSI_PERIOD ?? 14),
      rsiOversold: Number(process.env.RSI_OVERSOLD ?? 30),
      rsiOverbought: Number(process.env.RSI_OVERBOUGHT ?? 70),
      emaFast: Number(process.env.EMA_FAST ?? 9),
      emaSlow: Number(process.env.EMA_SLOW ?? 21),
      bollingerPeriod: Number(process.env.BOLLINGER_PERIOD ?? 20),
      bollingerStdDev: Number(process.env.BOLLINGER_STD_DEV ?? 2),
      momentumWindow: Number(process.env.MOMENTUM_WINDOW ?? 20),
      fundingThresholdBps: Number(process.env.FUNDING_THRESHOLD_BPS ?? 5),
      maxPositionSize: process.env.MAX_POSITION_SIZE
        ? Number(process.env.MAX_POSITION_SIZE)
        : undefined,
      maxDailyLossUsd: process.env.MAX_DAILY_LOSS_USD
        ? Number(process.env.MAX_DAILY_LOSS_USD)
        : undefined,
      stopLossBps: process.env.STOP_LOSS_BPS
        ? Number(process.env.STOP_LOSS_BPS)
        : undefined,
      takeProfitBps: process.env.TAKE_PROFIT_BPS
        ? Number(process.env.TAKE_PROFIT_BPS)
        : undefined,
      dryRun,
    },
    logLevel: process.env.LOG_LEVEL ?? "info",
  };

  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }

  if (parsed.data.trading.emaFast >= parsed.data.trading.emaSlow) {
    throw new Error("Invalid configuration:\n  - trading.emaFast must be less than emaSlow");
  }

  return parsed.data;
}

export function loadPublicConfig(): AppConfig {
  process.env.GRVT_API_KEY = process.env.GRVT_API_KEY || "public";
  process.env.GRVT_TRADING_ACCOUNT_ID = process.env.GRVT_TRADING_ACCOUNT_ID || "public";
  return loadConfig({ dryRun: true });
}
