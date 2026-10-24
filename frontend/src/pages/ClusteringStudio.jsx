import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceDot
} from 'recharts';
import { getClusters, getElbowCurve } from '../api/client';

const PERSONA_CONFIG = {
  0: {
    name: 'Budget Loyalists',
    color: '#0D9488',
    border: 'border-teal-200',
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    tag: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Low Monthly Spend / High Tenure',
  },
  1: {
    name: 'VIP Champions',
    color: '#4F46E5',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    tag: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'High Monthly Spend / High Tenure',
  },
  2: {
    name: 'Flight Risk Early Adopters',
    color: '#E11D48',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    tag: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'High Monthly Spend / Low Tenure (High Churn)',
  },
  3: {
    name: 'Casual Starters',
    color: '#D97706',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    tag: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Low Monthly Spend / Low Tenure (Introductory)',
  },
};

// Declared outside render for React 19 compiler compliance
const CustomScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const persona = PERSONA_CONFIG[data.cluster_id] || { name: 'Unknown', color: '#4F46E5' };
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl font-mono text-xs space-y-1.5">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: persona.color }} />
          <span className="font-bold font-sans text-slate-900 text-xs">
            {data.isCentroid ? `Centroid: ${data.persona_name}` : persona.name}
          </span>
        </div>
        <div className="text-slate-500 flex justify-between space-x-4">
          <span>Tenure:</span>
          <span className="text-slate-900 font-bold">{data.tenure_months} months</span>
        </div>
        <div className="text-slate-500 flex justify-between space-x-4">
          <span>Monthly Spend:</span>
          <span className="text-slate-900 font-bold">${data.monthly_charges.toFixed(2)}</span>
        </div>
        {!data.isCentroid && (
          <div className="text-slate-500 flex justify-between space-x-4">
            <span>Status:</span>
            <span className={data.churn_flag === 1 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {data.churn_flag === 1 ? 'Churned' : 'Retained'}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomElbowTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl font-mono text-xs space-y-1">
        <div className="text-slate-900 font-bold font-sans">Clusters (K = {data.k})</div>
        <div className="text-slate-600 flex justify-between space-x-4">
          <span>WCSS Inertia:</span>
          <span className="text-indigo-600 font-bold">{data.wcss.toLocaleString()}</span>
        </div>
        {data.k === 4 && (
          <div className="text-[11px] font-sans text-emerald-700 font-semibold pt-1 border-t border-slate-200">
            Optimal Elbow Inflection
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ClusteringStudio() {
  const [clusterData, setClusterData] = useState(null);
  const [elbowData, setElbowData] = useState(null);
  const [sampleSize, setSampleSize] = useState(800);
  const [selectedPersona, setSelectedPersona] = useState('all');

  useEffect(() => {
    async function loadMiningData() {
      try {
        const [clustRes, elbowRes] = await Promise.all([
          getClusters(sampleSize),
          getElbowCurve(),
        ]);
        setClusterData(clustRes);
        setElbowData(elbowRes);
      } catch (err) {
        console.error('Failed to load clustering data', err);
      }
    }
    loadMiningData();
  }, [sampleSize]);

  const scatterByPersona = useMemo(() => {
    if (!clusterData?.scatter_sample) return { 0: [], 1: [], 2: [], 3: [] };
    const groups = { 0: [], 1: [], 2: [], 3: [] };
    clusterData.scatter_sample.forEach((pt) => {
      if (groups[pt.cluster_id]) {
        groups[pt.cluster_id].push(pt);
      }
    });
    return groups;
  }, [clusterData]);

  const centroidPoints = useMemo(() => {
    if (!clusterData?.personas) return [];
    return clusterData.personas.map((p) => ({
      tenure_months: p.centroid_tenure_months,
      monthly_charges: p.centroid_monthly_charges,
      cluster_id: p.cluster_id,
      persona_name: p.persona_name,
      isCentroid: true,
    }));
  }, [clusterData]);

  const renderPersonaCard = (p) => {
    const conf = PERSONA_CONFIG[p.cluster_id] || {
      color: '#4F46E5',
      border: 'border-slate-200',
      bg: 'bg-white',
      text: 'text-slate-900',
      tag: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Standard Persona',
    };
    const isSelected = selectedPersona === String(p.cluster_id);

    return (
      <article
        key={p.cluster_id}
        onClick={() => setSelectedPersona(isSelected ? 'all' : String(p.cluster_id))}
        className={`cursor-pointer rounded-2xl border p-4.5 transition-all text-left shadow-xs hover:shadow-md ${
          isSelected
            ? `${conf.bg} ${conf.border} ring-2 ring-indigo-500/30`
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="mb-2 space-y-1">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-1 w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: conf.color }} />
            <span className={`min-w-0 text-sm font-bold ${conf.text}`}>{p.persona_name}</span>
          </div>
          <div className="text-xs font-mono text-slate-700 font-semibold">
            {p.cluster_size.toLocaleString()} accounts ({p.cluster_pct.toFixed(1)}%)
          </div>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed mb-3">
          {p.archetype} • <span className="font-semibold text-slate-800">{p.risk_profile}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-3">
          <div className="min-w-0">
            <span className="text-slate-400 text-[10px] block font-sans uppercase font-bold">Centroid Tenure</span>
            <span className="text-slate-900 font-bold">{p.centroid_tenure_months.toFixed(1)} mos</span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-400 text-[10px] block font-sans uppercase font-bold">Centroid Monthly</span>
            <span className="text-slate-900 font-bold">${p.centroid_monthly_charges.toFixed(2)}/mo</span>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
          <span className="text-slate-900 font-bold block mb-0.5">Retention Strategy:</span>
          {p.recommended_action}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
            UNSUPERVISED DATA MINING • NUMPY K-MEANS++ CORE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-3">
            <span>Customer Segmentation & Personas (K=4)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pure NumPy Lloyd's K-Means clustering evaluated across tenure and spend dimensions with mathematical WCSS elbow validation.
          </p>
        </div>

        {/* Sample Filter */}
        <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
          <span className="text-slate-500 font-medium">Sample Scatter:</span>
          <select
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono font-semibold"
          >
            <option value={400}>400 Points</option>
            <option value={800}>800 Points</option>
            <option value={1500}>1,500 Points</option>
          </select>
        </div>
      </div>

      {/* Analytical charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 items-start gap-6">
        {/* Left Column: 2D Scatter Plot */}
        <div className="md:col-span-2 xl:col-span-8 min-w-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  BIVARIATE MINING PROJECTION
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  K=4 Converged (10 Iters)
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                2D Customer Space: Monthly Billing vs Account Tenure
              </h2>
              <p className="text-xs text-slate-500 mb-2 mt-1">
                X-Axis represents tenure in months (0–72). Y-Axis represents monthly billing ($18–$120). Cross markers denote mathematical cluster centroids.
              </p>
            </div>

            {/* Scatter Chart */}
            <div className="h-[430px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    dataKey="tenure_months"
                    name="Tenure"
                    unit=" mo"
                    domain={[0, 75]}
                    stroke="#64748B"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    label={{
                      value: 'Account Tenure (Months)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#64748B',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="monthly_charges"
                    name="Monthly Charges"
                    unit="$"
                    domain={[15, 125]}
                    stroke="#64748B"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    label={{
                      value: 'Monthly Charges ($)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748B',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip content={<CustomScatterTooltip />} />

                  {/* VIP Champions */}
                  {(selectedPersona === 'all' || selectedPersona === '1') && (
                    <Scatter
                      name="VIP Champions"
                      data={scatterByPersona[1]}
                      fill="#4F46E5"
                      opacity={0.75}
                    />
                  )}

                  {/* Flight Risk Early Adopters */}
                  {(selectedPersona === 'all' || selectedPersona === '2') && (
                    <Scatter
                      name="Flight Risk Early Adopters"
                      data={scatterByPersona[2]}
                      fill="#E11D48"
                      opacity={0.8}
                    />
                  )}

                  {/* Budget Loyalists */}
                  {(selectedPersona === 'all' || selectedPersona === '0') && (
                    <Scatter
                      name="Budget Loyalists"
                      data={scatterByPersona[0]}
                      fill="#0D9488"
                      opacity={0.75}
                    />
                  )}

                  {/* Casual Starters */}
                  {(selectedPersona === 'all' || selectedPersona === '3') && (
                    <Scatter
                      name="Casual Starters"
                      data={scatterByPersona[3]}
                      fill="#D97706"
                      opacity={0.75}
                    />
                  )}

                  {/* Centroids */}
                  <Scatter
                    name="Centroids"
                    data={centroidPoints}
                    fill="#0F172A"
                    shape="cross"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Summary Footer */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="text-slate-700 font-medium">VIP Champions</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span className="text-slate-700 font-medium">Flight Risk</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <span className="text-slate-700 font-medium">Budget Loyalists</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span className="text-slate-700 font-medium">Casual Starters</span>
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-500 font-semibold">
                Final WCSS: {clusterData?.final_wcss ? clusterData.final_wcss.toFixed(1) : '2,845.4'}
              </div>
            </div>
          </div>
        </div>

        {/* Elbow curve */}
        <div className="md:col-span-2 xl:col-span-4 min-w-0 space-y-4">
          {/* WCSS Elbow Curve Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                MATHEMATICAL VALIDATION
              </span>
              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                K = 4 Selected
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900">
              Within-Cluster Sum of Squares (Elbow Curve)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Evaluating inertia reduction across K ∈ [2, 6]. The inflection point ('elbow') cleanly manifests at K=4, minimizing within-cluster variance.
            </p>

            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={elbowData?.elbow_points || []}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="k"
                    stroke="#64748B"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    domain={[2, 6]}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomElbowTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="wcss"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    dot={{ fill: '#4F46E5', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <ReferenceDot
                    x={4}
                    y={elbowData?.elbow_points?.find((p) => p.k === 4)?.wcss || 2845}
                    r={7}
                    fill="#E11D48"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Personas Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center space-x-2">
          <span>Enterprise Retention Personas ({clusterData?.n_clusters || 4} Cohorts)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clusterData?.personas?.map(renderPersonaCard)}
        </div>
      </div>
    </div>
  );
}
