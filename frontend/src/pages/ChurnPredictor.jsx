import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Zap,
  User,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  Cpu,
} from 'lucide-react';
import { predictCustomer } from '../api/client';

const ALGORITHM_OPTIONS = [
  'Random Forest',
  'XGBoost',
  'LightGBM',
  'Logistic Regression'
];

const PRESET_SCENARIOS = [
  {
    label: 'High-Risk Flight Risk',
    color: 'border-rose-200 text-rose-700 bg-rose-50',
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
    color: 'border-indigo-200 text-indigo-700 bg-indigo-50',
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
    color: 'border-teal-200 text-teal-700 bg-teal-50',
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
    color: 'border-amber-200 text-amber-700 bg-amber-50',
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
    model_name: 'Random Forest',
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

  const [prediction, setPrediction] = useState(null);

  const runPrediction = useCallback(async (formData) => {
    try {
      const res = await predictCustomer(formData);
      setPrediction(res);
    } catch (err) {
      console.error('Failed to predict churn', err);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      runPrediction(form);
    }, 250);
    return () => clearTimeout(handler);
  }, [form, runPrediction]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      ...preset.data,
      model_name: prev.model_name,
    }));
  };

  const probabilityPct = prediction
    ? (prediction.churn_probability * 100).toFixed(1)
    : '76.4';
  const probNum = parseFloat(probabilityPct);
  const isHighRisk = probNum >= 50;

  let riskColor = '#4F46E5';
  let riskTierLabel = 'LOW RISK';
  let riskPillClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (probNum >= 70) {
    riskColor = '#E11D48';
    riskTierLabel = 'CRITICAL FLIGHT RISK';
    riskPillClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (probNum >= 45) {
    riskColor = '#D97706';
    riskTierLabel = 'MODERATE AT-RISK';
    riskPillClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    riskColor = '#059669';
    riskTierLabel = 'LOW RISK (STABLE)';
    riskPillClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probNum / 100) * circumference;

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
            SUPERVISED MACHINE LEARNING • {prediction?.model_used || form.model_name}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-3">
            <span>Real-Time Churn Predictor & Retention Simulator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate subscriber account attributes to compute instant churn probability and dynamic retention incentives.
          </p>
        </div>

        {/* Algorithm Selection Pills */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <Cpu className="w-3.5 h-3.5 text-indigo-600 ml-1.5 mr-0.5" />
          <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Engine:</span>
          {ALGORITHM_OPTIONS.map((algo) => {
            const isSelected = form.model_name === algo;
            return (
              <button
                key={algo}
                onClick={() => updateField('model_name', algo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {algo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-800">Quick Test Archetypes:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${p.color} hover:shadow-xs hover:brightness-95`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Simulator Form (Left) & Result Scorecard (Right) */}
      <div className="grid w-full min-w-0 grid-cols-1 xl:grid-cols-12 items-start gap-6">
        {/* Left Column: Simulator Inputs */}
        <div className="min-w-0 xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Customer Feature Attributes</span>
            </h2>
            <button
              onClick={() =>
                setForm({
                  model_name: form.model_name,
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
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center space-x-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* Slider 1: Tenure */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account Tenure:</span>
                </span>
                <span className="font-mono font-bold text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  {form.tenure_months} months
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="72"
                step="1"
                value={form.tenure_months}
                onChange={(e) => updateField('tenure_months', Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 mos (New Signup)</span>
                <span>36 mos (Median)</span>
                <span>72 mos (Long-Term)</span>
              </div>
            </div>

            {/* Slider 2: Monthly Spend */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Monthly Invoicing Spend:</span>
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                  ${Number(form.monthly_charges).toFixed(2)}/mo
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="120"
                step="0.5"
                value={form.monthly_charges}
                onChange={(e) => updateField('monthly_charges', Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>$18.00 (Base Voice)</span>
                <span>$65.00 (Standard)</span>
                <span>$120.00 (Max Premium)</span>
              </div>
            </div>

            {/* Form Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Contract Term */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contract Commitment
                </label>
                <select
                  value={form.contract}
                  onChange={(e) => updateField('contract', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Month-to-month">Month-to-Month (High Risk)</option>
                  <option value="One year">One Year Contract</option>
                  <option value="Two year">Two Year Contract (Lock-in)</option>
                </select>
              </div>

              {/* Internet Infrastructure */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Internet Technology
                </label>
                <select
                  value={form.internet_service}
                  onChange={(e) => updateField('internet_service', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Fiber optic">Fiber Optic (Ultra Fast)</option>
                  <option value="DSL">DSL Broadband</option>
                  <option value="No">No Internet (Voice Only)</option>
                </select>
              </div>

              {/* Payment Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) => updateField('payment_method', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Electronic check">Electronic Check (High Churn)</option>
                  <option value="Mailed check">Mailed Paper Check</option>
                  <option value="Bank transfer (automatic)">Bank Transfer (Auto-Debit)</option>
                  <option value="Credit card (automatic)">Credit Card (Auto-Debit)</option>
                </select>
              </div>

              {/* Dedicated Tech Support */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tech Support Service
                </label>
                <select
                  value={form.tech_support}
                  onChange={(e) => updateField('tech_support', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="No">No Support (Unassisted)</option>
                  <option value="Yes">Yes (Dedicated Priority Support)</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              {/* Online Security */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Online Security
                </label>
                <select
                  value={form.online_security}
                  onChange={(e) => updateField('online_security', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="No">No Security Protection</option>
                  <option value="Yes">Yes (Active Antivirus/DDoS)</option>
                  <option value="No internet service">No internet service</option>
                </select>
              </div>

              {/* Partner */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Family / Partner
                </label>
                <select
                  value={form.partner}
                  onChange={(e) => updateField('partner', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="No">Single Account (No)</option>
                  <option value="Yes">Partner Account (Yes)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Grid */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.senior_citizen === 1}
                  onChange={(e) => updateField('senior_citizen', e.target.checked ? 1 : 0)}
                  className="rounded bg-slate-50 border-slate-300 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span>Senior Citizen (65+)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.paperless_billing === 'Yes'}
                  onChange={(e) => updateField('paperless_billing', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-slate-50 border-slate-300 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span>Paperless Billing</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dependents === 'Yes'}
                  onChange={(e) => updateField('dependents', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-slate-50 border-slate-300 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span>Has Dependents</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Result Scorecard */}
        <div className="min-w-0 xl:col-span-5 space-y-4">
          {/* Main Risk Score Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                INFERENCE VERDICT
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${riskPillClass}`}>
                {riskTierLabel}
              </span>
            </div>

            {/* Circular Risk Meter */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg viewBox="0 0 208 208" className="w-full h-full -rotate-90" shapeRendering="geometricPrecision">
                  <circle
                    cx="104"
                    cy="104"
                    r={radius}
                    stroke="#E2E8F0"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r={radius}
                    stroke={riskColor}
                    strokeWidth="11"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>

                {/* Central Readout */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {probabilityPct}%
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                    Churn Probability
                  </span>
                </div>
              </div>

              {/* Persona Quadrant Tag */}
              <div className="mt-3 text-center">
                <span className="text-xs text-slate-500 font-medium">Assigned Behavioral Cluster:</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center justify-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: riskColor }}
                  />
                  <span>{prediction?.cluster_persona || 'Segmenting...'}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Retention Discount Engine */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dynamic Retention Discount</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border border-indigo-300 bg-white text-indigo-700 shadow-2xs">
                  {prediction?.discount_percentage !== undefined
                    ? `${prediction.discount_percentage.toFixed(0)}% DISCOUNT`
                    : '0% DISCOUNT'}
                </span>
              </div>

              {/* Bill Comparison Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-center">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-sans block uppercase font-bold">Standard Bill</span>
                  <span className="text-sm font-bold text-slate-800">
                    ${form.monthly_charges.toFixed(2)}/mo
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-100/80 border border-indigo-300 shadow-2xs">
                  <span className="text-[10px] text-indigo-800 font-sans block uppercase font-bold">Discounted Bill</span>
                  <span className="text-sm font-bold text-indigo-950">
                    ${prediction?.discounted_monthly_charges !== undefined
                      ? prediction.discounted_monthly_charges.toFixed(2)
                      : form.monthly_charges.toFixed(2)}/mo
                  </span>
                </div>
              </div>

              {prediction?.monthly_savings > 0 && (
                <div className="flex items-center justify-between text-xs px-1 text-slate-700 font-sans font-medium">
                  <span>Targeted Monthly Savings:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    Save ${prediction.monthly_savings.toFixed(2)}/mo
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-600 leading-snug pt-0.5 font-sans">
                {prediction?.retention_tier_rationale ||
                  'Evaluating calibrated retention discount tier...'}
              </p>
            </div>

            {/* Key Contributing Risk Factors */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Key Contributing Risk Drivers
              </div>

              {prediction?.risk_factors && prediction.risk_factors.length > 0 ? (
                <div className="space-y-1.5">
                  {prediction.risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 text-xs"
                    >
                      {isHighRisk ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-slate-700 leading-snug">{factor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Calculating drivers...
                </div>
              )}
            </div>

            {/* Prescriptive Retention Action Banner */}
            <div className="pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Prescriptive Retention Intervention</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
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
