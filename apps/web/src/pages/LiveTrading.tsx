import { useState } from 'react';
import { AlertTriangle, Shield, Lock } from 'lucide-react';
import { useApi } from '../hooks';

export default function LiveTrading() {
  const { data: status } = useApi<{ armed: boolean; liveTradingEnabled: boolean; rateLimitTier: string }>('/live/status', 3000);
  const [token, setToken] = useState('');
  const [confirm, setConfirm] = useState('');

  const arm = async () => {
    if (confirm !== 'ARM LIVE TRADING') return;
    await fetch('/api/live/arm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationToken: token }),
    });
  };

  const disarm = async () => {
    await fetch('/api/live/disarm', { method: 'POST' });
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Live Trading</h2>
        <p className="text-gray-400 text-sm mt-1">CLOB V2 execution · Guarded by env flag + confirmation</p>
      </header>

      {!status?.liveTradingEnabled && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <AlertTriangle className="text-amber-400" size={20} />
          <div>
            <div className="font-medium text-amber-400">Live trading disabled</div>
            <div className="text-sm text-gray-400">Set LIVE_TRADING=true in environment to enable</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2"><Shield size={16} /> Status</div>
          <div className={`stat-value ${status?.armed ? 'text-red-400' : 'text-emerald-400'}`}>{status?.armed ? 'ARMED' : 'DISARMED'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-2">Rate Limit Tier</div>
          <div className="stat-value text-sm">{status?.rateLimitTier ?? 'Tier 2'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-2">Settlement Queue</div>
          <div className="stat-value">0 pending</div>
        </div>
      </div>

      <div className="card max-w-lg">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Lock size={16} /> Arm Controls</h3>
        <div className="space-y-3">
          <input type="password" placeholder="Confirmation token" value={token} onChange={(e) => setToken(e.target.value)} className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          <input type="text" placeholder='Type "ARM LIVE TRADING" to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={arm} disabled={confirm !== 'ARM LIVE TRADING'} className="bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-2 rounded-lg font-semibold disabled:opacity-30">Arm Live</button>
            <button onClick={disarm} className="bg-gray-800 text-gray-300 px-5 py-2 rounded-lg">Disarm</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Open Orders</h3>
        <div className="text-center text-gray-500 py-8">No open orders — bot disarmed</div>
      </div>
    </div>
  );
}
