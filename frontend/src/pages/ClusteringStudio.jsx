import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Cpu,
  Layers,
  Sparkles,
  Target,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceDot,
  Cell
} from 'recharts';
import { getClusters, getElbowCurve } from '../api/client';

const PERSONA_CONFIG = {
  0: {
    name: 'Budget Loyalists',
    color: '#06b6d4', // Cyan
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    description: 'Low Monthly Spend / High Tenure',
  },
  1: {
    name: 'VIP Champions',
    color: '#8b5cf6', // Violet
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    description: 'High Monthly Spend / High Tenure',
  },
  2: {
    name: 'Flight Risk Early Adopters',
    color: '#f43f5e', // Rose
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    description: 'High Monthly Spend / Low Tenure (High Churn)',
  },
  3: {
    name: 'Casual Starters',
    color: '#10b981', // Emerald
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    description: 'Low Monthly Spend / Low Tenure (Testing Phase)',
  },
};

export default function ClusteringStudio() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [elbowData, setElbowData] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState('all');
  const [sampleSize, setSampleSize] = useState(800);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [clustersRes, elbowRes] = await Promise.all([
          getClusters(sampleSize),
          getElbowCurve(),
        ]);
        setClusterData(clustersRes);
        setElbowData(elbowRes);
      } catch (err) {
        console.error('Failed to load clustering data', err);
        setError('Failed to fetch clustering results from the mining engine.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sampleSize]);

  // Split scatter sample by persona
  const scatterByPersona = useMemo(() => {
    if (!clusterData?.scatter_sample) {
      return { 0: [], 1: [], 2: [], 3: [] };
    }
    const grouped = { 0: [], 1: [], 2: [], 3: [] };
    clusterData.scatter_sample.forEach((pt) => {
      if (grouped[pt.cluster_id]) {
        grouped[pt.cluster_id].push(pt);
      }
    });
    return grouped;
  }, [clusterData]);

  // Formatted centroids for plotting
  const centroidPoints = useMemo(() => {
    if (!clusterData?.personas) return [];
    return clusterData.personas.map((p) => ({
      tenure_months: Math.round(p.centroid_tenure_months * 10) / 10,
      monthly_charges: Math.round(p.centroid_monthly_charges * 10) / 10,
      persona_name: p.persona_name,
      cluster_id: p.cluster_id,
      isCentroid: true,
    }));
  }, [clusterData]);

  // Custom Scatter Tooltip
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const persona = PERSONA_CONFIG[data.cluster_id] || { name: 'Unknown', color: '#fff' };
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur font-mono text-xs space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: persona.color }} />
            <span className="font-bold font-sans text-white text-xs">
              {data.isCentroid ? `Centroid: ${data.persona_name}` : persona.name}
            </span>
          </div>
          <div className="text-zinc-400 flex justify-between space-x-4">
            <span>Tenure:</span>
            <span className="text-zinc-200 font-bold">{data.tenure_months} months</span>
          </div>
          <div className="text-zinc-400 flex justify-between space-x-4">
            <span>Monthly Spend:</span>
            <span className="text-zinc-200 font-bold">${data.monthly_charges.toFixed(2)}</span>
          </div>
          {!data.isCentroid && (
            <div className="text-zinc-400 flex justify-between space-x-4">
              <span>Status:</span>
              <span className={data.churn_flag === 1 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {data.churn_flag === 1 ? 'Churned' : 'Retained'}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Elbow Tooltip
  const CustomElbowTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur font-mono text-xs space-y-1">
          <div className="text-white font-bold font-sans">Clusters (K = {data.k})</div>
          <div className="text-zinc-300 flex justify-between space-x-4">
            <span>WCSS Inertia:</span>
            <span className="text-cyan-400 font-bold">{data.wcss.toLocaleString()}</span>
          </div>
          {data.k === 4 && (
            <div className="text-[11px] font-sans text-emerald-400 font-semibold pt-1 border-t border-zinc-800">
              Optimal Elbow Criterion
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Data Mining Engine • Scratch NumPy K-Means++
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Unsupervised Clustering & Retention Personas</span>
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl mt-1">
            Mathematical segmentation using custom K-Means++ clustering over Tenure Months and Monthly Spend. Converged in 10 iterations to discover 4 archetypal retention personas.
          </p>
        </div>

        {/* Sample Filter */}
        <div className="flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-zinc-400">Sample Scatter:</span>
          <select
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value={400}>400 Points</option>
            <option value={800}>800 Points</option>
            <option value={1500}>1,500 Points</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Scatter Plot (Left) + Elbow & Personas (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: 2D Scatter Plot */}
        <div className="xl:col-span-8 bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Feature Vector Space (K=4)
                </span>
                <h2 className="text-base font-bold text-white">
                  2D Behavioral Cluster Space (Tenure × Monthly Charges)
                </h2>
              </div>

              {/* Persona Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedPersona('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    selectedPersona === 'all'
                      ? 'bg-zinc-200 text-black font-semibold'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All (4)
                </button>
                {Object.entries(PERSONA_CONFIG).map(([id, conf]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedPersona(selectedPersona === id ? 'all' : id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center space-x-1.5 border ${
                      selectedPersona === id
                        ? `${conf.bg} ${conf.text} ${conf.border} font-bold`
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} />
                    <span>{conf.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              X-Axis represents customer tenure in months (0–72). Y-Axis represents monthly billing ($18–$120). Distinct colored points represent sampled accounts; highlighted cross markers denote mathematical centroids.
            </p>
          </div>

          {/* Scatter Chart */}
          <div className="h-[430px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  dataKey="tenure_months"
                  name="Tenure"
                  unit=" mo"
                  domain={[0, 75]}
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  label={{
                    value: 'Account Tenure (Months)',
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#71717a',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="monthly_charges"
                  name="Monthly Charges"
                  unit="$"
                  domain={[15, 125]}
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  label={{
                    value: 'Monthly Charges ($)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#71717a',
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomScatterTooltip />} />

                {/* VIP Champions (Violet) */}
                {(selectedPersona === 'all' || selectedPersona === '1') && (
                  <Scatter
                    name="VIP Champions"
                    data={scatterByPersona[1]}
                    fill="#8b5cf6"
                    opacity={0.7}
                  />
                )}

                {/* Flight Risk Early Adopters (Rose) */}
                {(selectedPersona === 'all' || selectedPersona === '2') && (
                  <Scatter
                    name="Flight Risk Early Adopters"
                    data={scatterByPersona[2]}
                    fill="#f43f5e"
                    opacity={0.75}
                  />
                )}

                {/* Budget Loyalists (Cyan) */}
                {(selectedPersona === 'all' || selectedPersona === '0') && (
                  <Scatter
                    name="Budget Loyalists"
                    data={scatterByPersona[0]}
                    fill="#06b6d4"
                    opacity={0.7}
                  />
                )}

                {/* Casual Starters (Emerald) */}
                {(selectedPersona === 'all' || selectedPersona === '3') && (
                  <Scatter
                    name="Casual Starters"
                    data={scatterByPersona[3]}
                    fill="#10b981"
                    opacity={0.7}
                  />
                )}

                {/* Centroids */}
                <Scatter
                  name="Centroids"
                  data={centroidPoints}
                  fill="#ffffff"
                  shape="cross"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Summary Footer */}
          <div className="pt-4 mt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-zinc-300">VIP Champions</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-zinc-300">Flight Risk</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-zinc-300">Budget Loyalists</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">Casual Starters</span>
              </span>
            </div>
            <div className="font-mono text-[11px] text-zinc-500">
              Final WCSS: {clusterData?.final_wcss ? clusterData.final_wcss.toFixed(1) : '2,845.4'}
            </div>
          </div>
        </div>

        {/* Right Column: Elbow Curve & Persona Cards */}
        <div className="xl:col-span-4 space-y-6">
          {/* WCSS Elbow Curve Card */}
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Mathematical Validation
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                K = 4 Selected
              </span>
            </div>

            <h3 className="text-sm font-bold text-white">
              Within-Cluster Sum of Squares (Elbow Curve)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Evaluating inertia reduction across K ∈ [2, 6]. The inflection point ('elbow') cleanly manifests at K=4, minimizing within-cluster variance.
            </p>

            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={elbowData?.elbow_points || []}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="k"
                    stroke="#71717a"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    domain={[2, 6]}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: '#a1a1aa', fontSize: 10 }}
                    domain={[1500, 8500]}
                    tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<CustomElbowTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="wcss"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 6, fill: '#22d3ee' }}
                  />
                  <ReferenceDot
                    x={4}
                    y={elbowData?.elbow_points?.find((p) => p.k === 4)?.wcss || 2845.37}
                    r={7}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Persona Breakdown Cards */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Cluster Persona Archetypes ({clusterData?.personas?.length || 4})
            </div>

            {clusterData?.personas?.map((p) => {
              const conf = PERSONA_CONFIG[p.cluster_id] || {
                color: '#fff',
                border: 'border-zinc-800',
                bg: 'bg-zinc-900',
                text: 'text-white',
              };
              return (
                <div
                  key={p.cluster_id}
                  className={`p-4 rounded-xl border bg-zinc-900/70 hover:bg-zinc-900 transition-all ${conf.border}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: conf.color }} />
                      <span className={`text-xs font-bold ${conf.text}`}>
                        {p.persona_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-300 font-semibold">
                      {p.cluster_size.toLocaleString()} accounts ({p.cluster_pct.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 mb-2">
                    {p.archetype} • <span className="font-medium text-zinc-300">{p.risk_profile}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-950/60 p-2 rounded border border-zinc-800/80 mb-2.5">
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Centroid Tenure</span>
                      <span className="text-zinc-200 font-bold">{p.centroid_tenure_months.toFixed(1)} mos</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Centroid Monthly</span>
                      <span className="text-zinc-200 font-bold">${p.centroid_monthly_charges.toFixed(2)}/mo</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-900 leading-snug">
                    <span className="text-zinc-300 font-semibold block mb-0.5">Strategy:</span>
                    {p.recommended_action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
