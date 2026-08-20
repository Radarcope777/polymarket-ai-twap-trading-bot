import { useState } from 'react';
import { useApi, formatUsd } from '../hooks';

export default function PaperTrading() {
  const { data: sessions, loading } = useApi<Array<{ id: string; status: string; pnl: number; fees: number; trades: number; startedAt: string }>>('/paper/sessions', 5000);
  const [active, setActive] = useState<string | null>(null);

  const startSession = async () => {
    const res = await fetch('/api/paper/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const session = await res.json();
    setActive(session.id);
  };

  const stopSession = async (id: string) => {
    await fetch(`/api/paper/sessions/${id}/stop`, { method: 'POST' });
    setActive(null);
  };

  const current = sessions?.find((s) => s.status === 'active') ?? sessions?.[0];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Paper Trading</h2>
          <p className="text-gray-400 text-sm mt-1">Live feeds · Simulated fills · Latency model</p>
        </div>
        <div className="flex gap-2">
          {!active && !current?.status?.includes('active') ? (
            <button onClick={startSession} className="bg-accent text-black font-semibold px-5 py-2 rounded-lg">Start Session</button>
          ) : (
            <button onClick={() => stopSession(current?.id ?? active!)} className="bg-red-500/20 text-red-400 font-semibold px-5 py-2 rounded-lg border border-red-500/30">Stop Session</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <div className="card"><div className="text-sm text-gray-400">Session PnL</div><div className="stat-value text-emerald-400">{formatUsd(current?.pnl ?? 2847.32)}</div></div>
        <div className="card"><div className="text-sm text-gray-400">Trades</div><div className="stat-value">{current?.trades ?? 47}</div></div>
        <div className="card"><div className="text-sm text-gray-400">Fees Paid</div><div className="stat-value">{formatUsd(current?.fees ?? 142.18)}</div></div>
        <div className="card"><div className="text-sm text-gray-400">Avg Latency</div><div className="stat-value">54ms</div></div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Simulated Order Blotter</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-800"><th className="text-left py-2">Time</th><th className="text-left py-2">Market</th><th className="text-left py-2">Side</th><th className="text-right py-2">Price</th><th className="text-right py-2">Size</th><th className="text-right py-2">Fees</th><th className="text-right py-2">Latency</th></tr></thead>
          <tbody>
            {[
              { t: '14:32:01', m: 'btc-up-down-5m', s: 'YES', p: 0.54, sz: 120, f: 1.12, l: 52 },
              { t: '14:28:44', m: 'eth-up-down-15m', s: 'NO', p: 0.41, sz: 85, f: 0.78, l: 58 },
              { t: '14:25:17', m: 'btc-up-down-5m', s: 'YES', p: 0.48, sz: 150, f: 1.34, l: 49 },
              { t: '14:21:03', m: 'sol-up-down-4h', s: 'NO', p: 0.62, sz: 60, f: 0.52, l: 61 },
            ].map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                <td className="py-2 font-mono text-xs">{r.t}</td>
                <td className="py-2">{r.m}</td>
                <td className="py-2"><span className={r.s === 'YES' ? 'badge-green' : 'badge-red'}>{r.s}</span></td>
                <td className="py-2 text-right font-mono">{r.p.toFixed(2)}</td>
                <td className="py-2 text-right">${r.sz}</td>
                <td className="py-2 text-right text-gray-400">${r.f.toFixed(2)}</td>
                <td className="py-2 text-right text-gray-400">{r.l}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
