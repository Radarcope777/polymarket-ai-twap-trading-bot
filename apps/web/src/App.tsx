import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Brain, FlaskConical, FileText, Zap, Settings } from 'lucide-react';
import Overview from './pages/Overview';
import TwapMonitor from './pages/TwapMonitor';
import AiSignals from './pages/AiSignals';
import BacktestLab from './pages/BacktestLab';
import PaperTrading from './pages/PaperTrading';
import LiveTrading from './pages/LiveTrading';
import SettingsPage from './pages/Settings';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/twap', icon: TrendingUp, label: 'TWAP Monitor' },
  { to: '/signals', icon: Brain, label: 'AI Signals' },
  { to: '/backtest', icon: FlaskConical, label: 'Backtest Lab' },
  { to: '/paper', icon: FileText, label: 'Paper Trading' },
  { to: '/live', icon: Zap, label: 'Live Trading' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-surface-light border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-sm font-bold text-accent leading-tight">
            Polymarket TWAP Bot
          </h1>
          <p className="text-xs text-gray-500 mt-1">CLOB V2 · AI · Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="badge-green">CLOB V2 · pUSD</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/twap" element={<TwapMonitor />} />
          <Route path="/signals" element={<AiSignals />} />
          <Route path="/backtest" element={<BacktestLab />} />
          <Route path="/paper" element={<PaperTrading />} />
          <Route path="/live" element={<LiveTrading />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
