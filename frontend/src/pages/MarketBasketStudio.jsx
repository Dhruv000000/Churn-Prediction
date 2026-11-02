import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Download,
  Play,
  Filter,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  RefreshCw,
  Clock,
  Sliders,
  Award,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  getAprioriSummary,
  runApriori,
  getChurnRules,
  getServiceRecommendations,
  getExportItemsetsUrl,
  getExportRulesUrl,
} from '../api/client';

const ALL_AVAILABLE_SERVICES = [
  'Phone Service',
  'Multiple Lines',
  'Fiber Optic Internet',
  'DSL Internet',
  'Online Security',
  'Online Backup',
  'Device Protection',
  'Tech Support',
  'Streaming TV',
  'Streaming Movies',
];

export default function MarketBasketStudio() {
  const [summary, setSummary] = useState(null);
  const [churnPatterns, setChurnPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState('rules'); // 'rules', 'itemsets', 'charts', 'churn', 'recommend'

  // Apriori Interactive Controls
  const [minSupport, setMinSupport] = useState(0.12);
  const [minConfidence, setMinConfidence] = useState(0.38);
  const [maxLen, setMaxLen] = useState(4);

  // Filter & Search states
  const [ruleSearch, setRuleSearch] = useState('');
  const [minLiftFilter, setMinLiftFilter] = useState(1.0);
  const [itemsetSizeFilter, setItemsetSizeFilter] = useState('all');
  const [itemsetSearch, setItemsetSearch] = useState('');
  const [churnOutcomeFilter, setChurnOutcomeFilter] = useState('all'); // 'all', 'Churned', 'Retained'

  // Recommendation Engine State
  const [selectedCustomerServices, setSelectedCustomerServices] = useState([
    'Phone Service',
    'Fiber Optic Internet',
    'Streaming TV',
  ]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Load initial Apriori data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, churnRes] = await Promise.all([
        getAprioriSummary(),
        getChurnRules(),
      ]);
      setSummary(sumRes);
      setChurnPatterns(churnRes);
      setMinSupport(sumRes.min_support);
      setMinConfidence(sumRes.min_confidence);
      setMaxLen(sumRes.max_len);
    } catch (err) {
      console.error('Failed to load Apriori analytics:', err);
      setError('Failed to load Apriori Market Basket artifacts. Please run the backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle on-demand Apriori execution
  const handleRunApriori = async () => {
    setRunning(true);
    setError(null);
    try {
      const updated = await runApriori({
        min_support: minSupport,
        min_confidence: minConfidence,
        max_len: maxLen,
      });
      setSummary(updated);
      const churnRes = await getChurnRules();
      setChurnPatterns(churnRes);
    } catch (err) {
      console.error('Apriori execution failed:', err);
      setError('On-demand Apriori run failed. Ensure thresholds are valid (support > 0.01).');
    } finally {
      setRunning(false);
    }
  };

  // Trigger Recommendations update
  const fetchRecommendations = useCallback(async () => {
    if (!selectedCustomerServices.length) {
      setRecommendations([]);
      return;
    }
    setLoadingRecs(true);
    try {
      const res = await getServiceRecommendations(selectedCustomerServices, 0.35, 1.05);
      setRecommendations(res.recommendations || []);
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, [selectedCustomerServices]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const toggleCustomerService = (svc) => {
    setSelectedCustomerServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  // Filtered Association Rules
  const filteredRules = useMemo(() => {
    if (!summary?.top_rules) return [];
    return summary.top_rules.filter((rule) => {
      const matchesSearch =
        rule.rule_text.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        rule.antecedent.some((a) => a.toLowerCase().includes(ruleSearch.toLowerCase())) ||
        rule.consequent.some((c) => c.toLowerCase().includes(ruleSearch.toLowerCase()));
      const matchesLift = rule.lift >= minLiftFilter;
      return matchesSearch && matchesLift;
    });
  }, [summary, ruleSearch, minLiftFilter]);

  // Filtered Frequent Itemsets
  const filteredItemsets = useMemo(() => {
    if (!summary?.top_itemsets) return [];
    return summary.top_itemsets.filter((it) => {
      const matchesSize =
        itemsetSizeFilter === 'all' || it.size === parseInt(itemsetSizeFilter, 10);
      const matchesSearch = it.itemset.some((name) =>
        name.toLowerCase().includes(itemsetSearch.toLowerCase())
      );
      return matchesSize && matchesSearch;
    });
  }, [summary, itemsetSizeFilter, itemsetSearch]);

  // Top Rules by Lift for Chart
  const top10RulesChartData = useMemo(() => {
    if (!summary?.top_rules) return [];
    return summary.top_rules.slice(0, 10).map((r) => ({
      name: `${r.antecedent.join('+')} → ${r.consequent.join('+')}`,
      lift: r.lift,
      confidence: Math.round(r.confidence * 100),
      support: Math.round(r.support * 100),
    })).reverse();
  }, [summary]);

  // Top Itemsets for Chart
  const top10ItemsetsChartData = useMemo(() => {
    if (!summary?.top_itemsets) return [];
    return summary.top_itemsets.slice(0, 10).map((it) => ({
      name: it.itemset.join(' + '),
      support: Math.round(it.support * 1000) / 10,
      count: it.count,
    })).reverse();
  }, [summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-zinc-400 font-mono text-sm tracking-wide">
          Executing From-Scratch Apriori Mining Engine across 105,000 Star Schema Transactions...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 rounded-lg text-pink-400">
              <ShoppingBag size={22} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Market Basket & Pattern Mining
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Apriori Algorithm (From Scratch)
            </span>
          </div>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Frequent itemset mining, downward closure pruning, association rule induction, and retrospective
            churn bundle forensics across 105,000 analytical telecom transactions.
          </p>
        </div>

        {/* Quick CSV Export Buttons */}
        <div className="flex items-center gap-3">
          <a
            href={getExportItemsetsUrl()}
            download="frequent_itemsets.csv"
            className="flex items-center space-x-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-mono transition"
          >
            <Download size={14} />
            <span>Export Itemsets</span>
          </a>
          <a
            href={getExportRulesUrl()}
            download="association_rules.csv"
            className="flex items-center space-x-2 px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-lg text-xs font-mono transition"
          >
            <Download size={14} />
            <span>Export Rules</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Summary KPI Metric Cards (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Total Transactions</span>
          <div className="text-xl font-bold text-white font-sans mt-2">
            {summary?.total_transactions?.toLocaleString() || '105,000'}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Enterprise scale</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Frequent Itemsets</span>
          <div className="text-xl font-bold text-pink-400 font-sans mt-2">
            {summary?.total_frequent_itemsets || 0}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">L₁ through L₄</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Association Rules</span>
          <div className="text-xl font-bold text-indigo-400 font-sans mt-2">
            {summary?.total_rules || 0}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Lift &gt; 1.0 (Positive)</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Min Support (s)</span>
          <div className="text-xl font-bold text-emerald-400 font-sans mt-2">
            {Math.round((summary?.min_support || 0.12) * 100)}%
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Frequency floor</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Min Confidence (c)</span>
          <div className="text-xl font-bold text-amber-400 font-sans mt-2">
            {Math.round((summary?.min_confidence || 0.38) * 100)}%
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">Conditional probability</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Execution Latency</span>
          <div className="text-xl font-bold text-cyan-400 font-sans mt-2 flex items-center space-x-1">
            <Clock size={16} />
            <span>{summary?.execution_time_seconds || 0.008}s</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1">NumPy bitmask engine</span>
        </div>
      </div>

      {/* 3. Interactive Apriori Control Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-2 text-zinc-300 text-sm font-semibold">
            <Sliders size={18} className="text-pink-400" />
            <span>Apriori Tuning Controls</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 max-w-3xl">
            {/* Min Support Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Min Support:</span>
                <span className="text-pink-400 font-bold">{Math.round(minSupport * 100)}% ({minSupport.toFixed(2)})</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.40"
                step="0.01"
                value={minSupport}
                onChange={(e) => setMinSupport(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Min Confidence Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Min Confidence:</span>
                <span className="text-pink-400 font-bold">{Math.round(minConfidence * 100)}% ({minConfidence.toFixed(2)})</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.02"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Max Length Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Max Itemset Size (k):</span>
                <span className="text-pink-400 font-bold">{maxLen} items</span>
              </div>
              <select
                value={maxLen}
                onChange={(e) => setMaxLen(parseInt(e.target.value, 10))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-pink-500"
              >
                <option value={2}>k = 2 (Pairwise)</option>
                <option value={3}>k = 3 (Triplets)</option>
                <option value={4}>k = 4 (Quadruplets)</option>
                <option value={5}>k = 5 (Deep bundles)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunApriori}
            disabled={running}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-pink-600/20 disabled:opacity-50"
          >
            {running ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{running ? 'Mining...' : 'Run Apriori'}</span>
          </button>
        </div>
      </div>

      {/* 4. Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3 overflow-x-auto">
        {[
          { id: 'rules', label: 'Association Rules', count: filteredRules.length, icon: TrendingUp },
          { id: 'itemsets', label: 'Frequent Itemsets', count: filteredItemsets.length, icon: Layers },
          { id: 'charts', label: 'Visual Analytics', icon: Sparkles },
          { id: 'churn', label: 'Churn Association Forensics', count: churnPatterns?.total_churn_rules, icon: AlertTriangle },
          { id: 'recommend', label: 'Bundle Recommender', icon: Zap },
        ].map(({ id, label, count, icon: TabIcon }) => {
          const isActive = activeSubTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSubTab(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <TabIcon size={15} className={isActive ? 'text-pink-400' : 'text-zinc-500'} />
              <span>{label}</span>
              {count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isActive ? 'bg-pink-500/20 text-pink-300' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 5. TAB 1: ASSOCIATION RULES */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search rule (e.g. Fiber, Streaming)..."
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                <Filter size={14} />
                <span>Min Lift:</span>
                <select
                  value={minLiftFilter}
                  onChange={(e) => setMinLiftFilter(parseFloat(e.target.value))}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 font-mono"
                >
                  <option value={1.0}>All Positive (Lift &gt; 1.0)</option>
                  <option value={1.15}>Lift &ge; 1.15</option>
                  <option value={1.25}>Lift &ge; 1.25 (Strong)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Antecedent (If X)</th>
                    <th className="py-3 px-2 text-center">⇒</th>
                    <th className="py-3 px-4">Consequent (Then Y)</th>
                    <th className="py-3 px-4 text-right">Support</th>
                    <th className="py-3 px-4 text-right">Confidence</th>
                    <th className="py-3 px-4 text-right">Lift</th>
                    <th className="py-3 px-4 text-center">Strength</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        No association rules match current filter thresholds.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {r.antecedent.map((ant, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/60 text-[11px]"
                              >
                                {ant}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-pink-400 font-bold">→</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {r.consequent.map((con, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-pink-950/40 text-pink-300 border border-pink-500/30 text-[11px] font-semibold"
                              >
                                {con}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {(r.support * 100).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                          {(r.confidence * 100).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-pink-400 font-bold">
                          {r.lift.toFixed(3)}x
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              r.lift >= 1.25
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {r.strength}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredRules.length > 50 && (
              <div className="p-3 bg-zinc-950 text-center text-zinc-500 text-xs font-mono border-t border-zinc-800">
                Displaying top 50 of {filteredRules.length} rules. Use CSV export for complete matrix.
              </div>
            )}
          </div>

          {/* Academic Formula Explainer Card */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 text-xs text-zinc-400 space-y-3 font-mono">
            <div className="flex items-center space-x-2 text-zinc-200 font-sans font-bold text-sm">
              <Info size={16} className="text-pink-400" />
              <span>DWM Metric Definitions & Formulae</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-white font-bold block mb-1">Support(X → Y)</span>
                <code>P(X ∪ Y) = Count(X ∪ Y) / N</code>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Proportion of transactions containing both service X and Y.
                </p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-white font-bold block mb-1">Confidence(X → Y)</span>
                <code>P(Y | X) = Support(X ∪ Y) / Support(X)</code>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Conditional probability that a customer subscribing to X also subscribes to Y.
                </p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-white font-bold block mb-1">Lift(X → Y)</span>
                <code>Confidence(X → Y) / Support(Y)</code>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Ratio of observed co-occurrence vs. expected independence. Lift &gt; 1 indicates positive affinity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: FREQUENT ITEMSETS */}
      {activeSubTab === 'itemsets' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search items (e.g. Backup)..."
                value={itemsetSearch}
                onChange={(e) => setItemsetSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <Filter size={14} />
              <span>Itemset Size (k):</span>
              {['all', '1', '2', '3', '4'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setItemsetSizeFilter(sz)}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    itemsetSizeFilter === sz
                      ? 'bg-pink-600 text-white font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {sz === 'all' ? 'All Sizes' : `k = ${sz}`}
                </button>
              ))}
            </div>
          </div>

          {/* Itemsets Table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Frequent Itemset</th>
                    <th className="py-3 px-4 text-center">Size (k)</th>
                    <th className="py-3 px-4 text-right">Support (%)</th>
                    <th className="py-3 px-4 text-right">Transaction Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredItemsets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500">
                        No frequent itemsets found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItemsets.map((it, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {it.itemset.map((item, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/60 text-xs font-semibold"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                            k = {it.size}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-pink-400">
                          {it.support_pct.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-400">
                          {it.count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Downward Closure Principle Explainer */}
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-200 font-bold font-sans">The Apriori Property (Downward Closure):</span>
              <p className="mt-1">
                "All non-empty subsets of a frequent itemset must also be frequent." If an itemset is infrequent, all of its supersets are pruned immediately without counting their transactions, drastically shrinking candidate space.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: VISUAL ANALYTICS */}
      {activeSubTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Top Rules by Lift */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white font-sans">Top Association Rules by Lift</h3>
                <p className="text-xs text-zinc-400">Strength of bundle affinity over random chance</p>
              </div>
              <span className="text-xs font-mono text-pink-400 font-bold">Top 10</span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10RulesChartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" domain={[1.0, 'auto']} stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={180} stroke="#a1a1aa" tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-xs shadow-xl space-y-1">
                            <div className="text-white font-bold">{d.name}</div>
                            <div className="text-pink-400">Lift: {d.lift}x</div>
                            <div className="text-emerald-400">Confidence: {d.confidence}%</div>
                            <div className="text-zinc-400">Support: {d.support}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="lift" fill="#ec4899" radius={[0, 6, 6, 0]}>
                    {top10RulesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.lift >= 1.25 ? '#ec4899' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Frequent Itemsets by Support */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white font-sans">Most Prevalent Service Bundles</h3>
                <p className="text-xs text-zinc-400">Market penetration support percentage across warehouse</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">Top 10</span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10ItemsetsChartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={180} stroke="#a1a1aa" tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-xs shadow-xl space-y-1">
                            <div className="text-white font-bold">{d.name}</div>
                            <div className="text-emerald-400">Support: {d.support}%</div>
                            <div className="text-zinc-400">Subscribers: {d.count.toLocaleString()}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="support" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: CHURN ASSOCIATION FORENSICS */}
      {activeSubTab === 'churn' && (
        <div className="space-y-6">
          {/* Academic Distinction Callout */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 font-mono flex items-start space-x-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 font-sans">Academic Distinction: Retrospective Pattern Mining vs. Predictive Classification</span>
              <p className="mt-1 text-zinc-300 leading-relaxed">
                Association rules with churn outcomes represent descriptive retrospective combinations found in historical warehouse data. 
                They highlight high-risk cohorts (e.g. Month-to-month + Fiber Optic + Electronic Check). 
                <strong> Important:</strong> Association does not imply causation, and these rules are not used as predictive features in the machine learning model.
              </p>
            </div>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-zinc-400">Outcome Filter:</span>
            {[
              { id: 'all', label: 'All Patterns' },
              { id: 'Churned', label: 'Churn Drivers (Risk)' },
              { id: 'Retained', label: 'Retention Anchors (Loyalty)' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChurnOutcomeFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                  churnOutcomeFilter === id
                    ? id === 'Churned'
                      ? 'bg-red-600 text-white font-bold'
                      : id === 'Retained'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-zinc-800 text-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn Drivers */}
            {(churnOutcomeFilter === 'all' || churnOutcomeFilter === 'Churned') && (
              <div className="bg-zinc-900/60 border border-red-500/20 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                    <AlertTriangle size={18} />
                    <span>Top Churn Risk Bundles (Antecedent ⇒ Churned)</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {churnPatterns?.churn_rules?.length || 0} patterns
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {churnPatterns?.churn_rules?.slice(0, 15).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl hover:border-red-500/40 transition space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.antecedent.map((item, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono"
                          >
                            {item}
                          </span>
                        ))}
                        <ArrowRight size={14} className="text-red-400 mx-1" />
                        <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/40 text-[11px] font-bold font-mono">
                          CHURNED
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono pt-1 text-zinc-400 border-t border-zinc-900">
                        <span>Confidence: <strong className="text-red-400">{(rule.confidence * 100).toFixed(1)}%</strong></span>
                        <span>Lift: <strong className="text-red-400">{rule.lift.toFixed(2)}x</strong></span>
                        <span>Support: {(rule.support * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retention Anchors */}
            {(churnOutcomeFilter === 'all' || churnOutcomeFilter === 'Retained') && (
              <div className="bg-zinc-900/60 border border-emerald-500/20 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <ShieldCheck size={18} />
                    <span>Top Retention Anchors (Antecedent ⇒ Retained)</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {churnPatterns?.retention_rules?.length || 0} patterns
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {churnPatterns?.retention_rules?.slice(0, 15).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl hover:border-emerald-500/40 transition space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.antecedent.map((item, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono"
                          >
                            {item}
                          </span>
                        ))}
                        <ArrowRight size={14} className="text-emerald-400 mx-1" />
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold font-mono">
                          RETAINED
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono pt-1 text-zinc-400 border-t border-zinc-900">
                        <span>Confidence: <strong className="text-emerald-400">{(rule.confidence * 100).toFixed(1)}%</strong></span>
                        <span>Lift: <strong className="text-emerald-400">{rule.lift.toFixed(2)}x</strong></span>
                        <span>Support: {(rule.support * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. TAB 5: COMPLEMENTARY SERVICE RECOMMENDER */}
      {activeSubTab === 'recommend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Basket Selector */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-sans">Active Customer Bundle</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Toggle the customer's current subscriptions to generate complementary add-ons.
              </p>
            </div>

            <div className="space-y-2">
              {ALL_AVAILABLE_SERVICES.map((svc) => {
                const isSelected = selectedCustomerServices.includes(svc);
                return (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => toggleCustomerService(svc)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono transition border ${
                      isSelected
                        ? 'bg-pink-950/40 border-pink-500/50 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{svc}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-pink-500 text-white' : 'border border-zinc-700'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
              Selected: {selectedCustomerServices.length} active service(s)
            </div>
          </div>

          {/* Recommendations Output */}
          <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Rule-Induced Service Recommendations</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Services with high affinity not currently held by the subscriber
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-pink-400">
                {recommendations.length} suggestion(s)
              </span>
            </div>

            {loadingRecs ? (
              <div className="py-12 flex justify-center items-center text-zinc-500 font-mono text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Evaluating association rule matrix...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs font-mono space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p>No new service recommendations found with lift &gt; 1.05 and confidence &gt; 35%.</p>
                <p className="text-zinc-600">Try modifying the active customer subscriptions on the left.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 hover:border-pink-500/30 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Award size={16} className="text-pink-400" />
                        <span className="text-sm font-bold text-white font-sans">
                          {rec.recommended_service}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          rec.strategy === 'Retention Shield'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        }`}
                      >
                        {rec.strategy}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                      {rec.rationale}
                    </p>

                    <div className="flex items-center space-x-6 text-[11px] font-mono text-zinc-500 pt-1 border-t border-zinc-900">
                      <span>Trigger: <strong>{rec.triggering_antecedent.join(' + ')}</strong></span>
                      <span>Confidence: <strong className="text-emerald-400">{(rec.confidence * 100).toFixed(1)}%</strong></span>
                      <span>Lift: <strong className="text-pink-400">{rec.lift.toFixed(2)}x</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

