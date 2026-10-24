import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OLAPWarehouse from './pages/OLAPWarehouse';
import ClusteringStudio from './pages/ClusteringStudio';
import ChurnPredictor from './pages/ChurnPredictor';
import PipelineDiagnostics from './pages/PipelineDiagnostics';
import Landing from './pages/Landing';
import { checkHealth } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('olap');
  const [isConnected, setIsConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDashboard, setShowDashboard] = useState(true);

  useEffect(() => {
    if (!showDashboard) return undefined;

    let isMounted = true;
    const verifyBackend = async () => {
      try {
        const res = await checkHealth();
        if (isMounted) {
          setIsConnected(res?.status === 'healthy');
        }
      } catch (err) {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showDashboard]);

  const handleRetrained = () => {
    // Increment refresh key to trigger data refetches across views
    setRefreshKey((prev) => prev + 1);
  };

  if (!showDashboard) {
    return <Landing onLaunch={() => setShowDashboard(true)} />;
  }

  return (
    <div className="dashboard-shell antialiased">
      {/* 1. Sleek 240px Left Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Application Area */}
      <div className="dashboard-main">
        {/* Top Header */}
        <Header isConnected={isConnected} onRetrained={handleRetrained} />

        {/* View Page Canvas */}
        <main className="dashboard-canvas p-6 md:p-8 w-full min-w-0">
          {activeTab === 'olap' && <OLAPWarehouse key={`olap-${refreshKey}`} />}
          {activeTab === 'clustering' && <ClusteringStudio key={`clustering-${refreshKey}`} />}
          {activeTab === 'predictor' && <ChurnPredictor key={`predictor-${refreshKey}`} />}
          {activeTab === 'diagnostics' && <PipelineDiagnostics key={`diagnostics-${refreshKey}`} />}
        </main>
      </div>
    </div>
  );
}
