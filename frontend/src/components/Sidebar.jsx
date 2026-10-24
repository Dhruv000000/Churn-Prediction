import React from 'react';
import { Database, Network, AlertCircle, Activity, Layers } from 'lucide-react';

const navItems = [
  { id: 'olap', label: 'OLAP Warehouse', description: 'Star Schema & Rollups', icon: Database },
  { id: 'clustering', label: 'Clustering Studio', description: 'K-Means++ & Personas', icon: Network },
  { id: 'predictor', label: 'Churn Predictor', description: 'Real-Time ML Forensics', icon: AlertCircle },
  { id: 'diagnostics', label: 'Pipeline & Diagnostics', description: 'ETL Health & Gini Rank', icon: Activity },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="app-sidebar bg-white border-r border-slate-200 select-none flex flex-col justify-between">
      <div className="sidebar-primary">
        {/* Brand Header */}
        <div className="sidebar-brand h-16 flex items-center gap-3 px-5 border-b border-slate-200 bg-white">
          <div className="brand-mark w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-sm">
            <Layers size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="brand-name text-slate-900 font-bold text-base tracking-tight leading-none">
              Gone-ology <span className="text-indigo-600 text-xs font-semibold">DWH</span>
            </div>
            <div className="brand-caption text-slate-400 font-mono text-[9px] font-semibold tracking-wider uppercase mt-1">
              CHURN FORENSICS
            </div>
          </div>
        </div>

        {/* Section Label */}
        <div className="sidebar-section-label px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          ANALYTICAL WORKSPACE
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav px-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ id, label, description, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={isActive ? 'text-indigo-600' : 'text-slate-400'}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs leading-tight font-medium truncate">{label}</span>
                  <span className={`text-[10px] leading-tight truncate ${isActive ? 'text-indigo-600/80' : 'text-slate-400'}`}>
                    {description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="m-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
          WAREHOUSE ENGINE
        </span>
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Star Schema Live</span>
          <span className="ml-auto font-mono text-[10px] text-slate-400 font-normal">K=4 Personas</span>
        </div>
      </div>
    </aside>
  );
}
