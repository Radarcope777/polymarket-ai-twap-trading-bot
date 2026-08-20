import { useApi } from '../hooks';

export default function SettingsPage() {
  const { data: config } = useApi<{
    strategy: Record<string, unknown>;
    maskedAddress: string;
    environment: string;
    collateral: string;
  }>('/config');

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Strategy thresholds · Risk limits · Wallet config</p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h3 className="font-semibold">Strategy Thresholds</h3>
          {[
            { label: 'Min Edge After Fees', key: 'minEdgeAfterFees', val: config?.strategy?.minEdgeAfterFees ?? 0.02 },
            { label: 'Max Slippage (bps)', key: 'maxSlippageBps', val: config?.strategy?.maxSlippageBps ?? 50 },
            { label: 'TWAP Slice Count', key: 'sliceCount', val: config?.strategy?.sliceCount ?? 5 },
            { label: 'Maker Preference', key: 'makerPreference', val: config?.strategy?.makerPreference ?? 0.7 },
          ].map((s) => (
            <div key={s.key}>
              <label className="text-xs text-gray-400">{s.label}</label>
              <input type="number" defaultValue={String(s.val)} step="0.01" className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold">Risk Limits</h3>
          {[
            { label: 'Max Daily Loss (USD)', val: config?.strategy?.maxDailyLossUsd ?? 500 },
            { label: 'Max Position (USD)', val: config?.strategy?.maxPositionUsd ?? 2000 },
          ].map((s) => (
            <div key={s.label}>
              <label className="text-xs text-gray-400">{s.label}</label>
              <input type="number" defaultValue={String(s.val)} className="w-full mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400">Wallet Address (masked)</label>
            <div className="mt-1 bg-surface border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-400">{config?.maskedAddress ?? 'Not configured'}</div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Environment</label>
            <div className="mt-1"><span className="badge-blue">{config?.environment ?? 'development'}</span> <span className="badge-green ml-2">{config?.collateral ?? 'pUSD'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
