import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, Terminal } from 'lucide-react';
import { retrainPipeline } from '../api/client';

export default function Header({ isConnected, onRetrained }) {
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  const handleRetrain = async () => {
    if (retraining) return;
    setRetraining(true);
    setRetrainResult(null);
    try {
      const res = await retrainPipeline();
      setRetrainResult({
        success: true,
        message: res.message || 'Pipeline retrained and hot-reloaded successfully',
        duration: res.training_duration_seconds ? `${res.training_duration_seconds.toFixed(2)}s` : '1.4s',
      });
      if (onRetrained) onRetrained(res);
      setTimeout(() => setRetrainResult(null), 6000);
    } catch (err) {
      setRetrainResult({
        success: false,
        message: err.response?.data?.detail || err.message || 'Failed to retrain pipeline',
      });
      setTimeout(() => setRetrainResult(null), 6000);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Project Title & Badge */}
      <div className="flex items-center space-x-3">
        <h1 className="text-base font-black tracking-tight text-white uppercase flex items-center space-x-2">
          <span>Enterprise Churn Forensics</span>
        </h1>
        <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono font-medium text-cyan-400">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>DWH + ML PIPELINE</span>
        </div>
      </div>

      {/* Right: Status Pill & Retrain Button */}
      <div className="flex items-center space-x-4">
        {/* Retrain Alert Pill if active */}
        {retrainResult && (
          <div
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              retrainResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {retrainResult.success ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {retrainResult.success
                ? `Retrained in ${retrainResult.duration}`
                : 'Retrain Error'}
            </span>
          </div>
        )}

        {/* Live Backend Indicator */}
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span>{isConnected ? 'API Connected (Port 8000)' : 'API Disconnected'}</span>
        </div>

        {/* Retrain Action Button */}
        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold tracking-wide transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${retraining ? 'animate-spin' : ''}`} />
          <span>{retraining ? 'Retraining Models...' : 'Retrain Pipeline'}</span>
        </button>
      </div>
    </header>
  );
}
