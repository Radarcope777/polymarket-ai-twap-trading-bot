import { z } from 'zod';

export const CryptoSymbolSchema = z.enum(['btc/usd', 'eth/usd', 'sol/usd']);
export const MarketDurationSchema = z.enum(['5m', '15m', '4h']);

export const StrategyConfigSchema = z.object({
  minEdgeAfterFees: z.number().min(0).max(1).default(0.02),
  maxSlippageBps: z.number().min(0).max(500).default(50),
  sliceCount: z.number().int().min(1).max(20).default(5),
  makerPreference: z.number().min(0).max(1).default(0.7),
  maxDailyLossUsd: z.number().positive().default(500),
  maxPositionUsd: z.number().positive().default(2000),
  enabledDurations: z.array(MarketDurationSchema).default(['5m', '15m', '4h']),
  enabledAssets: z.array(CryptoSymbolSchema).default(['btc/usd', 'eth/usd', 'sol/usd']),
});

export const BacktestCreateSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  assets: z.array(CryptoSymbolSchema).min(1),
  durations: z.array(MarketDurationSchema).min(1),
  minEdge: z.number().min(0).max(1).default(0.02),
  sliceCount: z.number().int().min(1).max(20).default(5),
  modelVersion: z.string().default('baseline-v1'),
  feeRate: z.number().min(0).max(0.1).default(0.07),
  slippageBps: z.number().min(0).max(500).default(30),
  takerDelayMs: z.number().min(0).max(500).default(50),
});

export const PaperSessionCreateSchema = z.object({
  name: z.string().optional(),
  assets: z.array(CryptoSymbolSchema).optional(),
});

export const LiveArmSchema = z.object({
  confirmationToken: z.string().min(8),
});

export type StrategyConfigInput = z.infer<typeof StrategyConfigSchema>;
export type BacktestCreateInput = z.infer<typeof BacktestCreateSchema>;
