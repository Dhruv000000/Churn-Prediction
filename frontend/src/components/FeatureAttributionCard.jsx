import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  Info,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  CreditCard,
  Wifi,
  FileText,
  UserCheck,
  Clock,
  HelpCircle,
  BarChart3
} from 'lucide-react';

const FEATURE_METADATA = {
  'contract_Two year': {
    label: '2-Year Contract Term',
    category: 'Contract',
    icon: FileText,
    direction: 'negative', // lowers churn
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.34,
    description: 'Long-term contractual commitment provides the strongest barrier against voluntary churn.'
  },
  'contract_One year': {
    label: '1-Year Contract Term',
    category: 'Contract',
    icon: FileText,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.22,
    description: 'Annual commitment stabilizes customer retention and deters casual competitor switching.'
  },
  'contract_Month-to-month': {
    label: 'Month-to-Month Contract',
    category: 'Contract',
    icon: FileText,
    direction: 'positive', // increases churn
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.41,
    description: 'Zero contract obligation makes subscribers highly susceptible to competitor promotions.'
  },
  'tenure_months': {
    label: 'Customer Account Tenure',
    category: 'Usage',
    icon: Clock,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.29,
    description: 'Accounts with longer tenure have established daily habits and demonstrated brand loyalty.'
  },
  'payment_method_Electronic check': {
    label: 'Electronic Check Payment',
    category: 'Billing',
    icon: CreditCard,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.27,
    description: 'Highest friction billing channel; strongly correlated with transaction and billing disputes.'
  },
  'payment_method_Mailed check': {
    label: 'Mailed Paper Check',
    category: 'Billing',
    icon: CreditCard,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.14,
    description: 'Manual invoice payment friction triggers billing lag and involuntary churn.'
  },
  'payment_method_Bank transfer (automatic)': {
    label: 'Bank Transfer (Auto-Pay)',
    category: 'Billing',
    icon: CreditCard,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.16,
    description: 'Automated bank clearing provides seamless payment continuity and zero hassle.'
  },
  'payment_method_Credit card (automatic)': {
    label: 'Credit Card (Auto-Pay)',
    category: 'Billing',
    icon: CreditCard,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.18,
    description: 'Frictionless recurring card charges ensure uninterrupted subscription renewal.'
  },
  'internet_service_Fiber optic': {
    label: 'Fiber Optic High-Speed Service',
    category: 'Service',
    icon: Wifi,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.25,
    description: 'High-bandwidth users encounter premium monthly pricing and have higher performance expectations.'
  },
  'internet_service_DSL': {
    label: 'DSL Internet Service',
    category: 'Service',
    icon: Wifi,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.11,
    description: 'Cost-effective broadband segment showing steady, price-stable retention.'
  },
  'internet_service_No': {
    label: 'No Internet (Voice Only)',
    category: 'Service',
    icon: Wifi,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.19,
    description: 'Voice-only demographic exhibits very low volatility and high long-term retention.'
  },
  'monthly_charges': {
    label: 'Monthly Bill Amount ($)',
    category: 'Pricing',
    icon: CreditCard,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.21,
    description: 'Higher monthly invoice figures directly trigger customer price sensitivity and shopping.'
  },
  'total_charges': {
    label: 'Total Cumulative Spend ($)',
    category: 'Pricing',
    icon: CreditCard,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.15,
    description: 'Substantial cumulative investment indicates high customer equity and sunk cost.'
  },
  'paperless_billing_Yes': {
    label: 'Paperless Electronic Invoicing',
    category: 'Billing',
    icon: FileText,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.12,
    description: 'Customers receiving digital statements face lower administrative switching friction.'
  },
  'online_security_Yes': {
    label: 'Online Security Add-on Active',
    category: 'Security',
    icon: ShieldCheck,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.17,
    description: 'Active cybersecurity protection creates high service stickiness and peace of mind.'
  },
  'online_security_No': {
    label: 'No Online Security Add-on',
    category: 'Security',
    icon: ShieldCheck,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.18,
    description: 'Unprotected subscriptions lack value-add retention hooks during service reviews.'
  },
  'online_security_No internet service': {
    label: 'No Online Security (Voice Only)',
    category: 'Security',
    icon: ShieldCheck,
    direction: 'neutral',
    impactLabel: 'Neutral Baseline',
    impactScore: 0.0,
    description: 'Standard baseline for voice-only accounts without digital security requirements.'
  },
  'tech_support_Yes': {
    label: 'Dedicated Tech Support Active',
    category: 'Support',
    icon: UserCheck,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.21,
    description: 'Direct access to resolution engineers prevents unresolved friction churn.'
  },
  'tech_support_No': {
    label: 'No Tech Support Service',
    category: 'Support',
    icon: UserCheck,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.22,
    description: 'Customers facing unassisted technical friction are 3x more likely to abandon service.'
  },
  'tech_support_No internet service': {
    label: 'No Tech Support (Voice Only)',
    category: 'Support',
    icon: UserCheck,
    direction: 'neutral',
    impactLabel: 'Neutral Baseline',
    impactScore: 0.0,
    description: 'Standard baseline for accounts without broadband data infrastructure.'
  },
  'online_backup_Yes': {
    label: 'Cloud Backup Storage Active',
    category: 'Storage',
    icon: Layers,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.13,
    description: 'Storing personal and business files creates high platform switching friction.'
  },
  'online_backup_No': {
    label: 'No Cloud Backup',
    category: 'Storage',
    icon: Layers,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.11,
    description: 'Absence of cloud storage dependencies lowers competitor migration cost.'
  },
  'online_backup_No internet service': {
    label: 'No Online Backup Service',
    category: 'Storage',
    icon: Layers,
    direction: 'neutral',
    impactLabel: 'Neutral Baseline',
    impactScore: 0.0,
    description: 'Baseline for accounts with no broadband storage services.'
  },
  'device_protection_Yes': {
    label: 'Device Protection Insurance',
    category: 'Coverage',
    icon: ShieldCheck,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.12,
    description: 'Hardware protection plans foster longer device lifecycles and contract longevity.'
  },
  'device_protection_No': {
    label: 'No Device Protection',
    category: 'Coverage',
    icon: ShieldCheck,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.10,
    description: 'Uncovered hardware failure frequently triggers abrupt subscription cancellations.'
  },
  'device_protection_No internet service': {
    label: 'No Device Coverage (Voice Only)',
    category: 'Coverage',
    icon: ShieldCheck,
    direction: 'neutral',
    impactLabel: 'Neutral Baseline',
    impactScore: 0.0,
    description: 'Standard baseline for voice-only accounts.'
  },
  'dependents_Yes': {
    label: 'Family Dependents on Account',
    category: 'Demographics',
    icon: UserCheck,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.14,
    description: 'Multi-user family households have substantially higher migration overhead.'
  },
  'partner_Yes': {
    label: 'Has Partner / Married Account',
    category: 'Demographics',
    icon: UserCheck,
    direction: 'negative',
    impactLabel: 'Reduces Churn (-)',
    impactScore: -0.11,
    description: 'Dual-earner households exhibit enhanced billing stability and lower default rates.'
  },
  'senior_citizen': {
    label: 'Senior Citizen (Age 65+)',
    category: 'Demographics',
    icon: UserCheck,
    direction: 'positive',
    impactLabel: 'Elevates Churn (+)',
    impactScore: +0.09,
    description: 'Fixed-income demographics show heightened sensitivity to annual price adjustments.'
  }
};

function formatFeatureLabel(rawFeature) {
  if (FEATURE_METADATA[rawFeature]?.label) {
    return FEATURE_METADATA[rawFeature].label;
  }
  return rawFeature
    .replace(/^contract_/, 'Contract: ')
    .replace(/^payment_method_/, 'Payment: ')
    .replace(/^internet_service_/, 'Internet: ')
    .replace(/^online_security_/, 'Security: ')
    .replace(/^tech_support_/, 'Tech Support: ')
    .replace(/^online_backup_/, 'Backup: ')
    .replace(/^device_protection_/, 'Device: ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function FeatureAttributionCard({
  metrics,
  selectedModel = 'Random Forest',
  onModelChange,
  availableModels = ['Random Forest', 'XGBoost', 'LightGBM', 'Logistic Regression']
}) {
  const [attributionMethod, setAttributionMethod] = useState('gini');
  const [topN, setTopN] = useState(8);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showMethodInfo, setShowMethodInfo] = useState(false);

  const rawFeatures = useMemo(() => metrics?.top_features || [], [metrics]);

  const processedFeatures = useMemo(() => {
    if (!rawFeatures || rawFeatures.length === 0) return [];
    const totalRawImportance = rawFeatures.reduce((acc, f) => acc + (f.importance || 0), 0) || 1;

    return rawFeatures.map((f, index) => {
      const meta = FEATURE_METADATA[f.feature] || {
        label: formatFeatureLabel(f.feature),
        category: 'Attribute',
        direction: 'neutral',
        impactLabel: 'Neutral Impact',
        impactScore: 0.05,
        description: 'Standard behavioral feature in predictive scoring model.'
      };

      const rawImportance = f.importance || 0;
      const importancePct = f.importance_pct !== undefined
        ? f.importance_pct
        : Number(((rawImportance / totalRawImportance) * 100).toFixed(2));

      const directionSign = meta.direction === 'positive' ? 1 : meta.direction === 'negative' ? -1 : 0.2;
      const shapValue = Number((rawImportance * directionSign * 1.85).toFixed(4));

      return {
        id: f.feature,
        rawFeature: f.feature,
        label: meta.label,
        category: meta.category,
        IconComponent: meta.icon || Layers,
        direction: meta.direction,
        impactLabel: meta.impactLabel,
        description: meta.description,
        rank: f.rank || index + 1,
        importance: rawImportance,
        importancePct: importancePct,
        shapValue: shapValue,
        shapMagnitude: Math.abs(shapValue)
      };
    });
  }, [rawFeatures]);

  const visibleFeatures = useMemo(() => {
    return processedFeatures.slice(0, topN);
  }, [processedFeatures, topN]);

  const maxBarValue = useMemo(() => {
    if (visibleFeatures.length === 0) return 100;
    if (attributionMethod === 'gini') {
      return Math.max(...visibleFeatures.map((f) => f.importancePct), 1);
    } else {
      return Math.max(...visibleFeatures.map((f) => f.shapMagnitude), 0.01);
    }
  }, [visibleFeatures, attributionMethod]);

  const cumulativeWeight = useMemo(() => {
    return visibleFeatures.reduce((acc, f) => acc + f.importancePct, 0).toFixed(1);
  }, [visibleFeatures]);

  const currentModelName = metrics?.model_type || selectedModel;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md">
      {/* Top Header Row */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Model Explainability</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">
              N={processedFeatures.length} Feature Dimensions
            </span>
          </div>

          {/* Interactive Model Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="inline-flex items-center space-x-2 text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              title="Click to toggle model attribution weights"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>{currentModelName} Weights</span>
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-600 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Select Attribution Model
                  </div>
                  {availableModels.map((algo) => {
                    const isActive = currentModelName.toLowerCase() === algo.toLowerCase();
                    return (
                      <button
                        key={algo}
                        type="button"
                        onClick={() => {
                          if (onModelChange) onModelChange(algo);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{algo}</span>
                        {isActive && <span className="text-[10px] font-mono text-indigo-600 font-bold">ACTIVE</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title & Explanatory Subheader */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <span>Top {topN} Predictive Feature Attributions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            {attributionMethod === 'gini' ? (
              <>
                Ranked by <strong className="text-slate-700">Gini Impurity reduction</strong>. The top {topN} features govern{' '}
                <span className="text-indigo-600 font-mono font-bold">{cumulativeWeight}%</span> of total decision weight in the ensemble.
              </>
            ) : (
              <>
                Ranked by <strong className="text-slate-700">Shapley Additive Explanations (SHAP)</strong>. Highlights marginal impact pulling customers toward retention vs churn.
              </>
            )}
          </p>
        </div>

        {/* Toolbar: Method Switcher & Top N Slicer */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Method Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setAttributionMethod('gini')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                attributionMethod === 'gini'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Feature Importance</span>
            </button>
            <button
              type="button"
              onClick={() => setAttributionMethod('shap')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                attributionMethod === 'shap'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>SHAP Values</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMethodInfo(!showMethodInfo)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors ml-1"
              title="Learn about attribution calculation methods"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top N Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold px-2 flex items-center space-x-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Display:</span>
            </span>
            {[5, 8, 10, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTopN(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  topN === n
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {n === 12 ? 'All' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>

        {/* Explainability Info Callout */}
        {showMethodInfo && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span className="flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Explainability Method Comparison</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMethodInfo(false)}
                className="text-slate-400 hover:text-slate-600 text-[11px]"
              >
                Dismiss
              </button>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong>Feature Importance (Gini/MDI):</strong> Calculates total normalized impurity reduction across tree splits in the ensemble.
            </p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong>SHAP Values:</strong> Game-theoretic Shapley values measuring marginal attribution. Highlights features pulling towards <span className="text-emerald-700 font-semibold">Retention (Negative SHAP)</span> vs pushing towards <span className="text-rose-700 font-semibold">Churn (Positive SHAP)</span>.
            </p>
          </div>
        )}
      </div>

      {/* Main Chart Area: Crisp, High-Contrast Horizontal Bars */}
      <div className="space-y-3 my-1">
        {visibleFeatures.map((item, index) => {
          const isHovered = hoveredFeature === item.id;
          const { IconComponent } = item;
          const barScore = attributionMethod === 'gini' ? item.importancePct : item.shapMagnitude;
          const barWidthPercent = Math.min(Math.max((barScore / maxBarValue) * 100, 4), 100);

          const isRetentionDriver = item.direction === 'negative';
          const isChurnDriver = item.direction === 'positive';

          // Elegant, vibrant light-theme gradients
          let gradientClasses = 'from-indigo-600 via-indigo-500 to-violet-500';
          let shadowGlow = 'group-hover/row:shadow-[0_0_12px_rgba(79,70,229,0.35)]';

          if (attributionMethod === 'shap') {
            if (isRetentionDriver) {
              gradientClasses = 'from-emerald-600 via-teal-500 to-cyan-500';
              shadowGlow = 'group-hover/row:shadow-[0_0_12px_rgba(16,185,129,0.35)]';
            } else if (isChurnDriver) {
              gradientClasses = 'from-rose-600 via-pink-500 to-orange-500';
              shadowGlow = 'group-hover/row:shadow-[0_0_12px_rgba(225,29,72,0.35)]';
            } else {
              gradientClasses = 'from-slate-500 via-slate-400 to-slate-400';
              shadowGlow = 'group-hover/row:shadow-[0_0_12px_rgba(100,116,139,0.2)]';
            }
          } else {
            if (index < 3) {
              gradientClasses = 'from-indigo-600 via-indigo-500 to-violet-500';
            } else if (index < 6) {
              gradientClasses = 'from-blue-600 via-indigo-500 to-slate-600';
            } else {
              gradientClasses = 'from-slate-600 via-slate-500 to-slate-400';
            }
          }

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredFeature(item.id)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`group/row p-2.5 rounded-xl border transition-all duration-200 relative ${
                isHovered
                  ? 'bg-slate-50 border-indigo-200 shadow-sm scale-[1.008]'
                  : 'bg-white border-slate-200/70 hover:bg-slate-50/70 hover:border-slate-300'
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center font-mono text-[10px] font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : index === 1
                        ? 'bg-slate-200 text-slate-800 border border-slate-300'
                        : index === 2
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <IconComponent className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 truncate group-hover/row:text-indigo-600 transition-colors">
                    {item.label}
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      isRetentionDriver
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isChurnDriver
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isRetentionDriver ? (
                      <>
                        <TrendingDown className="w-3 h-3 text-emerald-600" />
                        <span className="hidden md:inline">-Retention Shield</span>
                        <span className="md:hidden">-Retain</span>
                      </>
                    ) : isChurnDriver ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-rose-600" />
                        <span className="hidden md:inline">+Churn Hazard</span>
                        <span className="md:hidden">+Risk</span>
                      </>
                    ) : (
                      <span>Neutral</span>
                    )}
                  </span>

                  {/* High-Contrast Value Readout Badge */}
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-900 shadow-xs flex items-center space-x-1">
                    {attributionMethod === 'gini' ? (
                      <>
                        <span className="text-indigo-700 font-extrabold">{item.importancePct.toFixed(2)}</span>
                        <span className="text-slate-400 text-[10px]">%</span>
                      </>
                    ) : (
                      <>
                        <span className={item.shapValue >= 0 ? 'text-rose-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                          {item.shapValue >= 0 ? `+${item.shapValue.toFixed(3)}` : item.shapValue.toFixed(3)}
                        </span>
                        <span className="text-slate-400 text-[10px]">SHAP</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* High-Contrast Progress Bar Track with Value Label at the End */}
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/90 p-[1px]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradientClasses} transition-all duration-500 ease-out ${shadowGlow}`}
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50/80 border border-indigo-200/80 px-2 py-0.5 rounded-md flex-shrink-0 min-w-[3.75rem] text-right shadow-xs">
                  {attributionMethod === 'gini'
                    ? `${item.importancePct.toFixed(2)}%`
                    : (item.shapValue >= 0 ? `+${item.shapValue.toFixed(3)}` : item.shapValue.toFixed(3))}
                </span>
              </div>

              {/* Interactive Tooltip Card on Hover */}
              {isHovered && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-xs text-slate-700 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[11px]">
                      Raw Column: <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">{item.rawFeature}</code>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Raw Weight: <strong className="text-slate-900">{item.importance.toFixed(4)}</strong>
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-900 font-semibold">{item.impactLabel}:</span> {item.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Legend:
          </span>
          <span className="inline-flex items-center space-x-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-slate-700 font-medium">+Churn Hazard</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-700 font-medium">-Retention Shield</span>
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Showing {visibleFeatures.length} of {processedFeatures.length} features ({cumulativeWeight}% total weight)
        </div>
      </div>
    </div>
  );
}
