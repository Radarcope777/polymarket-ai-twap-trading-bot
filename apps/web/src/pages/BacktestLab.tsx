import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useApi, formatUsd, formatPct } from '../hooks';

interface BacktestResult {
  id: string;
  metrics: { totalTrades: number; winRate: number; sharpe: number; totalPnl: number; maxDrawdown: number; avgEdge: number; totalFees: number };
  equityCurve: Array<{ timestamp: number; equity: number }>;
}

export default function BacktestLab() {
  const { data: backtests, loading } = useApi<BacktestResult[]>('/backtests');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const latest = result ?? backtests?.[0];
  const equityData = latest?.equityCurve?.map((p, i) => ({ i, equity: p.equity })) ?? [];

  const runBacktest = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T00:00:00Z',
          assets: ['btc/usd', 'eth/usd', 'sol/usd'],
          durations: ['5m', '15m', '4h'],
          modelVersion: 'baseline-v1',
        }),
      });
      setResult(await res.json());
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Backtest Lab</h2>
        <p className="text-gray-400 text-sm mt-1">Walk-forward validation · TWAP resolution · Fee-aware simulation</p>
      </header>

      <div className="card">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div><label className="text-xs text-gray-400">Start Date</label><input type="date" defaultValue="2026-01-01" className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-400">End Date</label><input type="date" defaultValue="2026-01-31" className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-400">Assets</label><select multiple className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm h-10"><option>BTC</option><option>ETH</option><option>SOL</option></select></div>
          <div><label className="text-xs text-gray-400">Model</label><select className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm"><option>baseline-v1</option><option>tcn-v1</option></select></div>
        </div>
        <button onClick={runBacktest} disabled={running} className="bg-accent hover:bg-accent-dim text-black font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          {running ? 'Running Backtest...' : 'Run Backtest'}
        </button>
        {running && <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-accent animate-pulse w-2/3" /></div>}
      </div>

      {latest && (
        <>
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: 'Total PnL', value: formatUsd(latest.metrics.totalPnl), color: 'text-emerald-400' },
              { label: 'Win Rate', value: formatPct(latest.metrics.winRate), color: 'text-emerald-400' },
              { label: 'Sharpe', value: latest.metrics.sharpe.toFixed(2), color: 'text-accent' },
              { label: 'Max DD', value: formatPct(latest.metrics.maxDrawdown), color: 'text-red-400' },
              { label: 'Avg Edge', value: formatPct(latest.metrics.avgEdge), color: 'text-accent' },
              { label: 'Total Fees', value: formatUsd(latest.metrics.totalFees), color: 'text-gray-300' },
            ].map((m) => (
              <div key={m.label} className="card"><div className="text-xs text-gray-400">{m.label}</div><div className={`stat-value text-lg ${m.color}`}>{m.value}</div></div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-4">Equity Curve</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={equityData}>
                  <XAxis dataKey="i" stroke="#4b5563" fontSize={11} />
                  <YAxis stroke="#4b5563" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ background: '#151d28', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="equity" stroke="#00d4aa" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-4">Drawdown</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={equityData.map((d, i) => ({ i, dd: -Math.max(0, (Math.max(...equityData.slice(0, i + 1).map((e) => e.equity)) - d.equity) / Math.max(...equityData.slice(0, i + 1).map((e) => e.equity)) * 100) }))}>
                  <XAxis dataKey="i" stroke="#4b5563" fontSize={11} />
                  <YAxis stroke="#4b5563" fontSize={11} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={{ background: '#151d28', border: '1px solid #374151' }} />
                  <Area type="monotone" dataKey="dd" stroke="#ff4757" fill="#ff475720" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!latest && !loading && <div className="card text-center text-gray-400 py-12">Run a backtest to see results</div>}
    </div>
  );
}
