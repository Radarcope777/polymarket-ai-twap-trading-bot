import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useApi, useSocket, formatPrice } from '../hooks';

const mockChart = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  spot: 98500 + Math.sin(i / 3) * 80 + i * 2,
  twap: 98480 + Math.sin(i / 4) * 60 + i * 1.8,
  projected: 98520 + Math.sin(i / 5) * 40 + i * 2.2,
}));

export default function TwapMonitor() {
  const [symbol] = useState('btc/usd');
  const { data: twap } = useApi<{ runningAverage: number; projectedFinal: number; isStale: boolean; lastSampleAt: number; samples: Array<{ price: number; timestamp: number }> }>(`/twap/live?symbol=${symbol}&window=30`, 2000);
  useSocket('twap:update');

  const progress = 72;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">TWAP Monitor</h2>
        <p className="text-gray-400 text-sm mt-1">Chainlink TWAP · 30s window · BTC/USD 5m contract</p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <div className="card"><div className="text-sm text-gray-400">Running TWAP</div><div className="stat-value text-accent">${formatPrice(twap?.runningAverage ?? 98542.18)}</div></div>
        <div className="card"><div className="text-sm text-gray-400">Projected Final</div><div className="stat-value text-emerald-400">${formatPrice(twap?.projectedFinal ?? 98568.42)}</div></div>
        <div className="card"><div className="text-sm text-gray-400">Strike Price</div><div className="stat-value">$98,542.18</div></div>
        <div className="card"><div className="text-sm text-gray-400">Feed Status</div><div className={`stat-value ${twap?.isStale ? 'text-red-400' : 'text-emerald-400'}`}>{twap?.isStale ? 'STALE' : 'LIVE'}</div></div>
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold">Spot vs TWAP vs Projected</h3>
          <span className="badge-blue">30s window</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={mockChart}>
            <XAxis dataKey="t" stroke="#4b5563" fontSize={12} />
            <YAxis domain={['auto', 'auto']} stroke="#4b5563" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ background: '#151d28', border: '1px solid #374151' }} />
            <ReferenceLine y={98542.18} stroke="#ffa502" strokeDasharray="4 4" label="Strike" />
            <Line type="monotone" dataKey="spot" stroke="#6b7280" dot={false} strokeWidth={1.5} name="Spot" />
            <Line type="monotone" dataKey="twap" stroke="#00d4aa" dot={false} strokeWidth={2} name="Running TWAP" />
            <Line type="monotone" dataKey="projected" stroke="#00a888" dot={false} strokeWidth={2} strokeDasharray="6 3" name="Projected Final" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Resolution window progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Raw TWAP Samples</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-800"><th className="text-left py-2">Timestamp</th><th className="text-right py-2">Price</th><th className="text-right py-2">Age</th></tr></thead>
            <tbody>
              {(twap?.samples ?? mockChart.slice(-8).map((_, i) => ({ price: 98542 + i * 3, timestamp: Date.now() - (8 - i) * 1000 }))).slice(-8).map((s, i) => (
                <tr key={i} className="border-b border-gray-800/50"><td className="py-2 font-mono text-xs">{new Date(s.timestamp).toISOString().slice(11, 23)}</td><td className="py-2 text-right font-mono">${formatPrice(s.price)}</td><td className="py-2 text-right text-gray-500">{Math.round((Date.now() - s.timestamp) / 1000)}s</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
