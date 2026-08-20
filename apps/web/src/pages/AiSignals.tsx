import { useApi, formatPct } from '../hooks';

interface Signal {
  marketSlug: string;
  fairProbUp: number;
  edgeAfterFees: number;
  recommendedSide: string;
  confidence: number;
  abstain: boolean;
  modelVersion: string;
  features: Record<string, number>;
}

export default function AiSignals() {
  const { data: signals } = useApi<Signal[]>('/signals/latest', 3000);
  const { data: models } = useApi<Array<{ version: string; name: string }>>('/models');

  const signal = signals?.[0] ?? {
    marketSlug: 'btc-up-down-5m',
    fairProbUp: 0.64,
    edgeAfterFees: 0.038,
    recommendedSide: 'YES',
    confidence: 0.78,
    abstain: false,
    modelVersion: 'baseline-v1',
    features: { twapVsStrike: 0.0026, bookImbalance: 0.12, twapConfidence: 0.85, spread: 0.04, timeToExpiry: 0.35 },
  };

  const featureEntries = Object.entries(signal.features);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">AI Signals</h2>
        <p className="text-gray-400 text-sm mt-1">Pluggable models · Fee-adjusted edge · Abstain logic</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-1">
          <h3 className="text-sm text-gray-400 mb-2">Fair Prob Up</h3>
          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1f2937" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00d4aa" strokeWidth="3" strokeDasharray={`${signal.fairProbUp * 100}, 100`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{formatPct(signal.fairProbUp)}</div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Edge After Fees</h3>
          <div className="stat-value text-emerald-400">+{formatPct(signal.edgeAfterFees)}</div>
          <div className="mt-2"><span className="badge-green">{signal.recommendedSide}</span></div>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Confidence</h3>
          <div className="stat-value">{formatPct(signal.confidence)}</div>
          <div className="mt-2">{signal.abstain ? <span className="badge-amber">ABSTAIN</span> : <span className="badge-green">TRADE</span>}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Feature Breakdown</h3>
          <select className="bg-surface border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
            {(models ?? [{ version: 'baseline-v1', name: 'Gradient Boosting' }]).map((m) => (
              <option key={m.version} value={m.version}>{m.name} ({m.version})</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {featureEntries.map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{key}</span>
                <span className="font-mono">{typeof val === 'number' ? val.toFixed(4) : val}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, Math.abs(val as number) * 200)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
