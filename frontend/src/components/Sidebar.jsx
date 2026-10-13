import React from 'react';
import {
  Database,
  Network,
  AlertCircle,
  Activity,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight
} from 'lucide-react';

const navItems = [
  {
    id: 'olap',
    label: 'OLAP Warehouse',
    description: 'Star Schema & Rollups',
    icon: Database,
    color: 'text-cyan-400',
    activeBg: 'bg-cyan-500/10 border-cyan-500/30 text-white',
  },
  {
    id: 'clustering',
    label: 'Clustering Studio',
    description: 'K-Means++ & Personas',
    icon: Network,
    color: 'text-violet-400',
    activeBg: 'bg-violet-500/10 border-violet-500/30 text-white',
  },
  {
    id: 'predictor',
    label: 'Churn Predictor',
    description: 'Real-Time ML Forensics',
    icon: AlertCircle,
    color: 'text-rose-400',
    activeBg: 'bg-rose-500/10 border-rose-500/30 text-white',
  },
  {
    id: 'diagnostics',
    label: 'Pipeline & Diagnostics',
    description: 'ETL Health & Gini Rank',
    icon: Activity,
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500/10 border-emerald-500/30 text-white',
  },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between h-screen sticky top-0 select-none">
      {/* Top Branding */}
      <div>
        <div className="h-16 px-5 border-b border-zinc-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-inner">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center space-x-1.5">
              <span>CHURN</span>
              <span className="text-cyan-400">DWH</span>
            </div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
              Enterprise Suite
            </div>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-5 pt-6 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Analytical Modules
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                  isActive
                    ? `${item.activeBg} font-semibold shadow-sm`
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-1.5 rounded-md ${
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-900/50 text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? item.color : ''}`} />
                  </div>
                  <div>
                    <div className={`text-xs ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 leading-tight">
                      {item.description}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 opacity-80" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40">
        <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <Server className="w-3 h-3 text-cyan-400" />
              <span>DWH Engine</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
              Star Schema
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Integrity</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              0 Orphans
            </span>
          </div>

          <div className="pt-1 border-t border-zinc-800 text-[9px] text-zinc-500 font-mono text-center">
            7,043 Accounts • K=4 Personas
          </div>
        </div>
      </div>
    </aside>
  );
}
