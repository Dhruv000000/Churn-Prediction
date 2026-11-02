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
    color: 'border-pink-500/40 text-pink-400 bg-pink-500/10',
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
    color: 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10',
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
    color: 'border-pink-500/40 text-pink-400 bg-pink-500/10',
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
    color: 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10',
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

  // Determine risk theme colors & tiers
  const rawTier = prediction?.churn_risk_tier?.toLowerCase() || '';
  const isCriticalRisk = rawTier === 'critical' || probabilityPct >= 85;
  const isHighRisk = isCriticalRisk || rawTier === 'high' || probabilityPct >= 60;
  const isModerateRisk = !isHighRisk && (rawTier === 'moderate' || (probabilityPct >= 30 && probabilityPct < 60));

  const riskColor = isHighRisk ? 'var(--color-pink)' : isModerateRisk ? 'var(--color-text-secondary)' : 'var(--color-charcoal)';
  const riskTierLabel = isCriticalRisk
    ? 'CRITICAL RISK'
    : isHighRisk
    ? 'HIGH RISK'
    : isModerateRisk
    ? 'MODERATE RISK'
    : 'LOW RISK';

  const riskPillClass = isHighRisk
    ? 'bg-pink-500/15 text-pink-400 border-pink-500/40'
    : isModerateRisk
    ? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40'
    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/40';

  const tenureStage =
    form.tenure_months <= 12
      ? 'New account'
      : form.tenure_months <= 48
      ? 'Mid-cycle'
      : 'Veteran';

  const profileSummaryGroups = [
    {
      title: 'Subscription',
      rows: [
        ['Account tenure', `${form.tenure_months} months · ${tenureStage}`],
        ['Contract', form.contract],
        ['Internet service', form.internet_service],
      ],
    },
    {
      title: 'Billing & Support',
      rows: [
        ['Monthly charges', `$${form.monthly_charges.toFixed(2)}/mo`],
        ['Payment method', form.payment_method],
        ['Tech support', form.tech_support],
        ['Online security', form.online_security],
      ],
    },
    {
      title: 'Household & Preferences',
      rows: [
        ['Senior citizen', form.senior_citizen === 1 ? 'Yes' : 'No'],
        ['Paperless billing', form.paperless_billing],
        ['Dependents', form.dependents],
      ],
    },
  ];

  // SVG circular gauge math
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probabilityPct / 100) * circumference;

  return (
    <div className="w-full min-w-0 space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Supervised Machine Learning • {prediction?.model_used || form.model_name} Classifier
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Real-Time Churn Predictor & Retention Simulator</span>
          </h1>
        </div>

        {/* Algorithm Selection Pills */}
        <div className="flex items-center space-x-1.5 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800/80">
          <Cpu className="w-3.5 h-3.5 text-pink-400 ml-1.5 mr-0.5" />
          <span className="text-[11px] font-semibold text-zinc-400 mr-1 hidden sm:inline">Engine:</span>
          {ALGORITHM_OPTIONS.map((algo) => {
            const isSelected = form.model_name === algo;
            return (
              <button
                key={algo}
                onClick={() => updateField('model_name', algo)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'border-pink-500/50 bg-pink-500/20 text-pink-300 shadow-sm'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {algo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <Zap className="w-4 h-4 text-pink-400" />
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
      <div className="grid w-full min-w-0 grid-cols-1 xl:grid-cols-12 items-start gap-5">
        {/* Left Column: Dark Simulator Inputs */}
        <div className="min-w-0 xl:col-span-7 bg-zinc-900/80 backdrop-blur border border-zinc-800/90 rounded-xl p-5 md:p-6 shadow-sm space-y-5">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-pink-400" />
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
                <span className="font-mono text-sm font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
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
                <span className="font-mono text-sm font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded border border-zinc-500/20">
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500 transition-colors"
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
                  className="rounded bg-zinc-800 border-zinc-700 text-pink-500 focus:ring-0 w-4 h-4"
                />
                <span>Senior Citizen</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.paperless_billing === 'Yes'}
                  onChange={(e) => updateField('paperless_billing', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-zinc-800 border-zinc-700 text-pink-500 focus:ring-0 w-4 h-4"
                />
                <span>Paperless Billing</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dependents === 'Yes'}
                  onChange={(e) => updateField('dependents', e.target.checked ? 'Yes' : 'No')}
                  className="rounded bg-zinc-800 border-zinc-700 text-pink-500 focus:ring-0 w-4 h-4"
                />
                <span>Has Dependents</span>
              </label>
            </div>
          </div>

          <section className="border-t border-zinc-800/80 pt-5" aria-labelledby="customer-profile-summary">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id="customer-profile-summary" className="text-sm font-bold text-zinc-200">
                Customer Profile Summary
              </h3>
              <span className="text-[11px] text-zinc-500">Current input selections</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-5">
              {profileSummaryGroups.map((group) => (
                <section key={group.title} className="min-w-0" aria-label={group.title}>
                  <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {group.title}
                  </h4>
                  <dl>
                    {group.rows.map(([label, value], index) => (
                      <div
                        key={label}
                        className={`flex min-w-0 items-start justify-between gap-2 py-1.5 ${index < group.rows.length - 1 ? 'border-b border-zinc-800/60' : ''}`}
                      >
                        <dt className="min-w-0 text-[11px] leading-relaxed text-zinc-400">{label}</dt>
                        <dd className="min-w-0 break-words text-right text-[11px] font-medium leading-relaxed text-zinc-200">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Result Scorecard */}
        <div className="min-w-0 xl:col-span-5 space-y-4">
          {/* Main Risk Score Card */}
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 rounded-xl p-5 md:p-6 shadow-sm space-y-4">
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
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg viewBox="0 0 208 208" className="w-full h-full -rotate-90" shapeRendering="geometricPrecision">
                  {/* Track */}
                  <circle
                    cx="104"
                    cy="104"
                    r={radius}
                    stroke="var(--border-subtle)"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {/* Progress */}
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
                    className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                  />
                </svg>

                {/* Central Readout */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold font-mono text-zinc-100 tracking-tight">
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
                          ? 'var(--graph-neutral)'
                          : prediction?.cluster_persona === 'Flight Risk Early Adopters'
                          ? 'var(--color-pink)'
                          : prediction?.cluster_persona === 'Budget Loyalists'
                          ? 'var(--graph-neutral)'
                          : 'var(--color-charcoal)',
                    }}
                  />
                  <span>{prediction?.cluster_persona || 'Segmenting...'}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Retention Discount Engine Section */}
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Dynamic Retention Discount</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border border-pink-500/40 bg-pink-500/10 text-pink-400">
                  {prediction?.discount_percentage !== undefined
                    ? `${prediction.discount_percentage.toFixed(0)}% DISCOUNT`
                    : '0% DISCOUNT'}
                </span>
              </div>

              {/* Bill Comparison Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-center">
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 font-sans block uppercase font-semibold">Standard Bill</span>
                  <span className="text-sm font-bold text-zinc-300">
                    ${form.monthly_charges.toFixed(2)}/mo
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/30">
                  <span className="text-[10px] text-pink-400/90 font-sans block uppercase font-semibold">Discounted Bill</span>
                  <span className="text-sm font-bold text-pink-300">
                    ${prediction?.discounted_monthly_charges !== undefined
                      ? prediction.discounted_monthly_charges.toFixed(2)
                      : form.monthly_charges.toFixed(2)}/mo
                  </span>
                </div>
              </div>

              {prediction?.monthly_savings > 0 && (
                <div className="flex items-center justify-between text-xs px-1 text-zinc-400 font-sans">
                  <span>Targeted Monthly Savings:</span>
                  <span className="font-mono font-bold text-pink-400">
                    Save ${prediction.monthly_savings.toFixed(2)}/mo
                  </span>
                </div>
              )}

              <p className="text-[11px] text-zinc-400 leading-snug pt-0.5 font-sans">
                {prediction?.retention_tier_rationale ||
                  'Evaluating calibrated retention discount tier...'}
              </p>
            </div>

            {/* Key Contributing Risk Factors */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Key Contributing Risk Drivers
              </div>

              {prediction?.risk_factors && prediction.risk_factors.length > 0 ? (
                <div className="space-y-1.5">
                  {prediction.risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-start space-x-2.5 text-xs"
                    >
                      {isHighRisk ? (
                        <AlertTriangle className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
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
            <div className="pt-1">
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-pink-400" />
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
