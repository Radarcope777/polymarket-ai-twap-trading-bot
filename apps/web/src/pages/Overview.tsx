import { Activity, TrendingUp, DollarSign, Shield, Clock, AlertTriangle } from 'lucide-react';
import { useApi, useSocket, formatUsd, formatPct, formatPrice } from '../hooks';

interface BotState {
  mode: string;
  rateLimitTier: string;
  rateLimitWarning: boolean;
}

interface TwapState {
  symbol: string;
  windowSeconds: number;
  runningAverage: number;
  projectedFinal: number;
  confidence: number;
  isStale: boolean;
  lastSampleAt: number;
}

interface Market {
  slug: string;
  asset: string;
  duration: string;
  endTime: number;
  strikePrice: number;
  volume24h: number;
}

export default function Overview() {
  const { data: health } = useApi<{ mode: string }>('/health', 5000);
  const { data: markets } = useApi<Market[]>('/markets/up-down', 10000);
  const { data: liveStatus } = useApi<{ rateLimitTier: string; rateLimitWarning: boolean }>('/live/status', 10000);
  const botState = useSocket<BotState>('bot:state');
  const twapUpdate = useSocket<TwapState>('twap:update');

  const mode = botState?.mode ?? health?.mode ?? 'IDLE';

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Overview Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">Live TWAP feeds · Active markets · Bot status</p>
      </header>

      {liveStatus?.rateLimitWarning && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm">
          <AlertTriangle size={16} />
          Rate limit warning — approaching volume tier threshold
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Activity size={16} /> Bot Status
          </div>
          <div className="stat-value text-accent">{mode}</div>
          <div className="text-xs text-gray-500 mt-1">{liveStatus?.rateLimitTier ?? 'Tier 2'}</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign size={16} /> Session PnL
          </div>
          <div className="stat-value text-emerald-400">+$2,847.32</div>
          <div className="text-xs text-gray-500 mt-1">Paper · Last 7 days</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp size={16} /> Win Rate
          </div>
          <div className="stat-value text-emerald-400">62.4%</div>
          <div className="text-xs text-gray-500 mt-1">312 trades · 30-day</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Shield size={16} /> Open Exposure
          </div>
          <div className="stat-value">$1,240</div>
          <div className="text-xs text-gray-500 mt-1">Est. fees: $18.40</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-4">Live TWAP Feeds</h3>
          <div className="space-y-3">
            {['btc/usd', 'eth/usd'].map((sym) => {
              const isActive = twapUpdate?.symbol === sym;
              return (
                <div key={sym} className="flex justify-between items-center bg-surface rounded-lg p-3">
                  <div>
                    <div className="font-medium uppercase text-sm">{sym}</div>
                    <div className="text-xs text-gray-500">30s / 60s windows</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-accent">
                      ${formatPrice(isActive ? twapUpdate!.runningAverage : sym === 'btc/usd' ? 98542.18 : 3247.55)}
                    </div>
                    <div className={`text-xs ${isActive && twapUpdate!.isStale ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isActive && twapUpdate!.isStale ? 'STALE' : 'LIVE'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Active Up/Down Markets</h3>
          <div className="space-y-3">
            {(markets ?? []).slice(0, 4).map((m) => {
              const remaining = Math.max(0, m.endTime - Date.now());
              const mins = Math.floor(remaining / 60000);
              const secs = Math.floor((remaining % 60000) / 1000);
              return (
                <div key={m.slug} className="flex justify-between items-center bg-surface rounded-lg p-3">
                  <div>
                    <div className="font-medium text-sm">{m.slug}</div>
                    <div className="text-xs text-gray-500">Strike: ${formatPrice(m.strikePrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400 font-mono text-sm">
                      <Clock size={14} /> {mins}:{secs.toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500">Vol: {formatUsd(m.volume24h)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
