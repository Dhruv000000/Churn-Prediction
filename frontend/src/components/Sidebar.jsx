import React from 'react';
import { Database, Network, AlertCircle, Activity, Layers, ShoppingBag } from 'lucide-react';

const navItems = [
  { id: 'olap', label: 'OLAP Warehouse', description: 'Star Schema & Rollups', icon: Database },
  { id: 'clustering', label: 'Clustering Studio', description: 'K-Means++ & Personas', icon: Network },
  { id: 'predictor', label: 'Churn Predictor', description: 'Real-Time ML Forensics', icon: AlertCircle },
  { id: 'apriori', label: 'Market Basket Mining', description: 'Apriori & Assoc Rules', icon: ShoppingBag },
  { id: 'diagnostics', label: 'Pipeline & Diagnostics', description: 'ETL Health & Metrics', icon: Activity },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="app-sidebar select-none">
      <div className="sidebar-primary">
        <div className="sidebar-brand">
          <div className="brand-mark"><Layers size={23} strokeWidth={1.8} /></div>
          <div><div className="brand-name">Gone-ology</div><div className="brand-caption">CUSTOMER ANALYTICS</div></div>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, description, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(id)}
                className={`sidebar-link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="sidebar-link-copy">
                  <span>{label}</span>
                  <small>{description}</small>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="sidebar-foot">
        <span className="sidebar-foot-label">ANALYTICS ENGINE</span>
        <div className="sidebar-foot-row">
          <span className="status-dot status-dot-ok" />
          Star Schema <span className="sidebar-foot-meta">Apriori + K=4</span>
        </div>
      </div>
    </aside>
  );
}
