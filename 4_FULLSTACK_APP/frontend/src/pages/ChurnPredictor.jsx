import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  TrendingDown,
  User,
  CreditCard,
  Wifi,
  LifeBuoy,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { predictCustomer } from '../api/client';

const PRESET_SCENARIOS = [
  {
    label: 'High-Risk Flight Risk',
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
    data: {
      tenure_months: 2,
      monthly_charges: 89.5,
      contract: 'Month-to-month',
      internet_service: 'Fiber optic',
      payment_method: 'Electronic check',
      tech_support: 'No',
      online_security: 'No',
      senior_citizen: 0,
      paperless_billing: 'Yes',
      partner: 'No',
      dependents: 'No',
    },
  },
  {
    label: 'VIP Champion',
    color: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
    data: {
      tenure_months: 64,
      monthly_charges: 104.2,
      contract: 'Two year',
      internet_service: 'Fiber optic',
      payment_method: 'Credit card (automatic)',
      tech_support: 'Yes',
      online_security: 'Yes',
      senior_citizen: 0,
      paperless_billing: 'Yes',
      partner: 'Yes',
      dependents: 'Yes',
    },
  },
  {
    label: 'Budget Loyalist',
    color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    data: {
      tenure_months: 52,
      monthly_charges: 34.0,
      contract: 'One year',
      internet_service: 'DSL',
      payment_method: 'Bank transfer (automatic)',
      tech_support: 'Yes',
      online_security: 'Yes',
      senior_citizen: 0,
      paperless_billing: 'No',
      partner: 'Yes',
      dependents: 'No',
    },
  },
  {
    label: 'Casual Starter',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    data: {
      tenure_months: 8,
      monthly_charges: 29.5,
      contract: 'Month-to-month',
      internet_service: 'DSL',
      payment_method: 'Mailed check',
      tech_support: 'No',
      online_security: 'No',
      senior_citizen: 0,
      paperless_billing: 'No',
      partner: 'No',
      dependents: 'No',
    },
  },
];

export default function ChurnPredictor() {
  const [form, setForm] = useState({
    tenure_months: 6,
    monthly_charges: 78.5,
    contract: 'Month-to-month',
    internet_service: 'Fiber optic',
    payment_method: 'Electronic check',
    tech_support: 'No',
    online_security: 'No',
    senior_citizen: 0,
    paperless_billing: 'Yes',
    partner: 'No',
    dependents: 'No',
    phone_service: 'Yes',
    multiple_lines: 'No',
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const runPrediction = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictCustomer(formData);
      setPrediction(res);
    } catch (err) {
      console.error('Inference error', err);
      setError('Prediction API offline or rejected payload.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run on initial load and debounced whenever form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runPrediction(form);
    }, 250);
    return () => clearTimeout(timer);
  }, [form, runPrediction]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({ ...prev, ...preset.data }));
  };

  const probabilityPct = prediction ? Math.round(prediction.churn_probability * 100) : 0;

  // Determine risk theme colors
  const isHighRisk = probabilityPct >= 50;
  const isModerateRisk = probabilityPct >= 25 && probabilityPct < 50;
  const riskColor = isHighRisk ? '#f43f5e' : isModerateRisk ? '#f59e0b' : '#10b981';
  const riskTierLabel = isHighRisk ? 'CRITICAL RISK' : isModerateRisk ? 'MODERATE RISK' : 'LOW RISK';
  const riskPillClass = isHighRisk
    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
    : isModerateRisk
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';

  // SVG circular gauge math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probabilityPct / 100) * circumference;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Supervised Machine Learning • Balanced Random Forest Classifier
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
          <span>Real-Time Churn Predictor & Retention Simulator</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl mt-1">
          Simulate parameter adjustments to observe immediate shifts in churn likelihood, behavioural persona assignment, and prescriptive retention prescriptions.
        </p>
      </div>

      {/* Preset Scenarios */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-300">Quick Test Archetypes:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${p.color} hover:brightness-125`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Simulator Form (Left) & Result Scorecard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dark Simulator Inputs */}
        <div className="lg:col-span-7 bg-zinc-900/80 backdrop-blur border border-zinc-800/90 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Customer Feature Attributes</span>
            </h2>
            <button
              onClick={() =>
                setForm({
                  tenure_months: 12,
                  monthly_charges: 65,
                  contract: 'Month-to-month',
                  internet_service: 'Fiber optic',
                  payment_method: 'Electronic check',
                  tech_support: 'No',
                  online_security: 'No',
                  senior_citizen: 0,
                  paperless_billing: 'Yes',
                  partner: 'No',
                  dependents: 'No',
                  phone_service: 'Yes',
                  multiple_lines: 'No',
                })
              }
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* Slider 1: Tenure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Account Tenure</span>
                </label>
                <span className="font-mono text-sm font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {form.tenure_months} Months
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="72"
                step="1"
                value={form.tenure_months}
                onChange={(e) => updateField('tenure_months', Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0 mos (New account)</span>
                <span>36 mos (Mid-cycle)</span>
                <span>72 mos (Veteran)</span>
              </div>
            </div>

            {/* Slider 2: Monthly Charges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Monthly Charges ($)</span>
                </label>
                <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ${form.monthly_charges.toFixed(2)}/mo
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="120"
                step="0.5"
                value={form.monthly_charges}
                onChange={(e) => updateField('monthly_charges', Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>$18.00 (Base voice)</span>
                <span>$65.00 (Standard)</span>
                <span>$120.00 (Full bundle)</span>
              </div>
            </div>

            {/* Dropdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Contract */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Contract Commitment
                </label>
                <select
                  value={form.contract}
                  onChange={(e) => updateField('contract', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Month-to-month">Month-to-month (High Risk)</option>
                  <option value="One year">One year</option>
                  <option value="Two year">Two year (Protected)</option>
                </select>
              </div>

              {/* Internet Service */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Internet Service
                </label>
                <select
                  value={form.internet_service}
                  onChange={(e) => updateField('internet_service', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Fiber optic">Fiber optic (Gigabit)</option>
                  <option value="DSL">DSL Broadband</option>
                  <option value="No">No Internet Service</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) => updateField('payment_method', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="Electronic check">Electronic check</option>
                  <option value="Mailed check">Mailed check</option>
                  <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                  <option value="Credit card (automatic)">Credit card (automatic)</option>
                </select>
              </div>

              {/* Tech Support */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tech Support Addon
                </label>
                <select
                  value={form.tech_support}
                  onChange={(e) => updateField('tech_support', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="No">No Tech Support</option>
                  <option value="Yes">Yes (Dedicated Priority)</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              {/* Online Security */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Online Security
                </label>
                <select
                  value={form.online_security}
                  onChange={(e) => updateField('online_security', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="No">No Security Protection</option>
                  <option value="Yes">Yes (Active Antivirus/DDoS)</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              {/* Partner */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Family / Partner
                </label>
                <select
                  value={form.partner}
                  onChange={(e) => updateField('partner', e.target.value)}
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="No">Single Account (No)</option>
                  <option value="Yes">Partner Account (Yes)</option>
                </select>
              </div>
            </div>

            {/* Checkbox / Toggle Grid */}
            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.senior_citizen === 1}
                  onChange={(e) => updateField('senior_citizen', e.target.checked ? 1 : 0)}
                  className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <span>Senior Citizen</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.paperless_billing === 'Yes'}
                  onChange={(e) => updateField('paperless_billing', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <span>Paperless Billing</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dependents === 'Yes'}
                  onChange={(e) => updateField('dependents', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4"
                />
                <span>Has Dependents</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Result Scorecard */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Risk Score Card */}
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Inference Verdict
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${riskPillClass}`}>
                {riskTierLabel}
              </span>
            </div>

            {/* Circular Risk Meter */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="#27272a"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={riskColor}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>

                {/* Central Readout */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold font-mono text-zinc-100 tracking-tight">
                    {probabilityPct}%
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mt-0.5">
                    Churn Probability
                  </span>
                </div>
              </div>

              {/* Persona Quadrant Tag */}
              <div className="mt-3 text-center">
                <span className="text-xs text-zinc-400">Assigned Behavioral Cluster:</span>
                <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        prediction?.cluster_persona === 'VIP Champions'
                          ? '#8b5cf6'
                          : prediction?.cluster_persona === 'Flight Risk Early Adopters'
                          ? '#f43f5e'
                          : prediction?.cluster_persona === 'Budget Loyalists'
                          ? '#06b6d4'
                          : '#10b981',
                    }}
                  />
                  <span>{prediction?.cluster_persona || 'Segmenting...'}</span>
                </div>
              </div>
            </div>

            {/* Key Contributing Risk Factors */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Key Contributing Risk Drivers
              </div>

              {prediction?.risk_factors && prediction.risk_factors.length > 0 ? (
                <div className="space-y-2">
                  {prediction.risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-start space-x-2.5 text-xs"
                    >
                      {isHighRisk ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-zinc-300 leading-snug">{factor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-zinc-500 bg-zinc-950 rounded">
                  Calculating drivers...
                </div>
              )}
            </div>

            {/* Prescriptive Retention Action Banner */}
            <div className="pt-2">
              <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Prescriptive Retention Intervention</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                  {prediction?.recommended_retention_action ||
                    'Evaluating optimal retention offer playbook...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
