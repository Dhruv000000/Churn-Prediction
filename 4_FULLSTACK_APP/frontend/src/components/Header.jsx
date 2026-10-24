import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
        duration: res.training_duration_seconds ? `${res.training_duration_seconds.toFixed(2)}s` : '1.4s'
      });
      if (onRetrained) onRetrained(res);
      setTimeout(() => setRetrainResult(null), 6000);
    } catch (err) {
      setRetrainResult({
        success: false,
        message: err.response?.data?.detail || err.message || 'Failed to retrain pipeline'
      });
      setTimeout(() => setRetrainResult(null), 6000);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Title & Workspace Label */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
            Customer Intelligence & Forensics
          </h1>
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
            ENTERPRISE CHURN DATA WAREHOUSE (105,000 SUBSCRIBERS)
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Retraining Notification Banner */}
        {retrainResult && (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium animate-fadeIn ${
              retrainResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
            role="status"
          >
            {retrainResult.success ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertCircle size={14} className="text-rose-600" />
            )}
            <span>
              {retrainResult.success ? `Retrained in ${retrainResult.duration}` : retrainResult.message}
            </span>
          </div>
        )}

        {/* Backend API Connection Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : 'bg-rose-50 text-rose-700 border-rose-200/80'
          }`}
          role="status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="font-mono text-[11px]">
            {isConnected ? 'API: Connected (Port 8000)' : 'API: Disconnected'}
          </span>
        </div>

        {/* Retrain Pipeline Button */}
        <button
          type="button"
          onClick={handleRetrain}
          disabled={retraining}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-wait"
        >
          <RefreshCw size={13} className={retraining ? 'animate-spin' : ''} />
          <span>{retraining ? 'Retraining...' : 'Retrain Pipeline'}</span>
        </button>
      </div>
    </header>
  );
}
