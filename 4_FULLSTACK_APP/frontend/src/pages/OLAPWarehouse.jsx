import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingDown,
  DollarSign,
  CreditCard,
  Search,
  ArrowUpDown,
  Filter,
  Layers,
  Info,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { getWarehouseKPIs, getContractAnalysis, getPaymentAnalysis } from '../api/client';

export default function OLAPWarehouse() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [contractData, setContractData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState('total_subscribers');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    async function loadWarehouseData() {
      setLoading(true);
      setError(null);
      try {
        const [kpisRes, contractRes, paymentRes] = await Promise.all([
          getWarehouseKPIs(),
          getContractAnalysis(),
          getPaymentAnalysis(),
        ]);
        setKpis(kpisRes);
        setContractData(contractRes);
        setPaymentData(paymentRes);
      } catch (err) {
        console.error('Failed to load OLAP data', err);
        setError('Failed to fetch analytical aggregates from warehouse API.');
      } finally {
        setLoading(false);
      }
    }
    loadWarehouseData();
  }, []);

  // Format grouped bar chart data: Contract × Internet Service
  const groupedContractData = useMemo(() => {
    if (!contractData || contractData.length === 0) return [];
    const contracts = ['Month-to-month', 'One year', 'Two year'];
    return contracts.map((cName) => {
      const dsl = contractData.find((d) => d.contract_tier === cName && d.internet_service_type === 'DSL');
      const fiber = contractData.find((d) => d.contract_tier === cName && d.internet_service_type === 'Fiber optic');
      const noNet = contractData.find((d) => d.contract_tier === cName && d.internet_service_type === 'No');
      return {
        contract: cName,
        'DSL': dsl ? dsl.churn_rate_pct : 0,
        'Fiber Optic': fiber ? fiber.churn_rate_pct : 0,
        'No Internet': noNet ? noNet.churn_rate_pct : 0,
        dslSubs: dsl ? dsl.total_subscribers : 0,
        fiberSubs: fiber ? fiber.total_subscribers : 0,
        noNetSubs: noNet ? noNet.total_subscribers : 0,
      };
    });
  }, [contractData]);

  // Filter and sort pivot table
  const filteredPivotRows = useMemo(() => {
    let rows = [...contractData];
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.contract_tier.toLowerCase().includes(q) ||
          r.internet_service_type.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [contractData, tableSearch, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Custom Dark Tooltip for Recharts
  const CustomGroupedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur-md">
          <div className="text-xs font-bold text-white mb-2">{label} Contract</div>
          <div className="space-y-1 font-mono text-xs">
            {payload.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between space-x-4">
                <span className="flex items-center space-x-1.5" style={{ color: item.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}:</span>
                </span>
                <span className="font-bold text-zinc-100">{item.value.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPaymentTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-lg shadow-2xl backdrop-blur-md font-mono text-xs space-y-1">
          <div className="text-xs font-bold font-sans text-white mb-1.5">{data.payment_method}</div>
          <div className="flex justify-between space-x-4 text-zinc-300">
            <span>Churn Rate:</span>
            <span className="font-bold text-rose-400">{data.churn_rate_pct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between space-x-4 text-zinc-400">
            <span>Total Accounts:</span>
            <span className="text-zinc-200">{data.total_subscribers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between space-x-4 text-zinc-400">
            <span>Avg Spend:</span>
            <span className="text-cyan-400">${data.avg_monthly_charges.toFixed(2)}/mo</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Dimensional Analytics Engine • Star Schema Mart
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
          <span>OLAP Warehouse & Revenue Forensics</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl mt-1">
          Multidimensional slicing across 7,043 enterprise accounts, modeling retention variance across contract commitments, delivery infrastructure, and payment mechanics.
        </p>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Accounts
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-zinc-100">
            {kpis ? kpis.total_subscribers.toLocaleString() : '7,043'}
          </div>
          <div className="text-xs text-zinc-400 flex items-center space-x-1.5 pt-1">
            <span className="text-emerald-400 font-mono font-medium">
              {kpis ? kpis.retained_count.toLocaleString() : '5,174'}
            </span>
            <span>Retained</span>
            <span className="text-zinc-600">•</span>
            <span className="text-rose-400 font-mono font-medium">
              {kpis ? kpis.churn_count.toLocaleString() : '1,869'}
            </span>
            <span>Churned</span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Overall Churn Rate
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400">
            {kpis ? `${kpis.overall_churn_rate.toFixed(1)}%` : '26.5%'}
          </div>
          <div className="text-xs text-zinc-400 flex items-center space-x-1 pt-1">
            <span className="text-rose-400 font-mono">+1.8%</span>
            <span>vs telecom industry baseline (24.7%)</span>
          </div>
        </div>

        {/* Annual ARR */}
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Annual ARR
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {kpis ? `$${(kpis.total_arr / 1000000).toFixed(2)}M` : '$5.47M'}
          </div>
          <div className="text-xs text-zinc-400 flex items-center space-x-1 pt-1">
            <span>MRR:</span>
            <span className="font-mono text-zinc-300">
              ${kpis ? (kpis.total_monthly_revenue / 1000).toFixed(1) : '456.1'}k/mo
            </span>
          </div>
        </div>

        {/* Avg Monthly Charges */}
        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Avg Monthly Charges
            </span>
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-zinc-100">
            {kpis ? `$${kpis.average_monthly_charges.toFixed(2)}` : '$64.76'}
          </div>
          <div className="text-xs text-zinc-400 flex items-center space-x-1 pt-1">
            <span>Avg Tenure:</span>
            <span className="font-mono text-zinc-300">
              {kpis ? kpis.average_tenure_months.toFixed(1) : '32.4'} mos
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Grouped Bar Chart (Contract × Internet Service) */}
        <div className="lg:col-span-7 bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Multidimensional Rollup
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Fact_Subscriptions
              </span>
            </div>
            <h2 className="text-base font-bold text-white">
              Churn Rate across Contract Tier × Internet Infrastructure
            </h2>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Month-to-month contracts on Fiber Optic reach a critical 54.6% churn rate, while Two-year contracts drop below 7%.
            </p>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedContractData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="contract"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={{ stroke: '#3f3f46' }}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  unit="%"
                  axisLine={{ stroke: '#3f3f46' }}
                  domain={[0, 60]}
                />
                <Tooltip content={<CustomGroupedTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(value) => <span className="text-zinc-300 font-medium">{value}</span>}
                />
                <Bar dataKey="Fiber Optic" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="DSL" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="No Internet" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Churn Rate by Payment Method */}
        <div className="lg:col-span-5 bg-zinc-900/80 backdrop-blur border border-zinc-800/90 hover:border-zinc-700 transition-all rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Payment Channel Forensics
              </span>
              <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                Dim_Account
              </span>
            </div>
            <h2 className="text-base font-bold text-white">
              Churn Variance by Payment Method
            </h2>
            <p className="text-xs text-zinc-400 mt-1 mb-4">
              Electronic checks suffer 3× higher churn (45.3%) compared to automated credit card renewals (15.2%).
            </p>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={paymentData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  unit="%"
                  domain={[0, 50]}
                />
                <YAxis
                  type="category"
                  dataKey="payment_method"
                  stroke="#71717a"
                  tick={{ fill: '#d4d4d8', fontSize: 11 }}
                  width={110}
                  tickFormatter={(val) => {
                    if (val.includes('Electronic')) return 'Electronic Check';
                    if (val.includes('Mailed')) return 'Mailed Check';
                    if (val.includes('Bank')) return 'Bank Transfer';
                    if (val.includes('Credit')) return 'Credit Card';
                    return val;
                  }}
                />
                <Tooltip content={<CustomPaymentTooltip />} />
                <Bar dataKey="churn_rate_pct" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {paymentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.churn_rate_pct > 40
                          ? '#f43f5e'
                          : entry.churn_rate_pct > 18
                          ? '#f59e0b'
                          : '#10b981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive OLAP Pivot Table */}
      <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/90 rounded-xl overflow-hidden shadow-sm">
        {/* Table Header Bar */}
        <div className="p-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Star Schema Dimension Slice
            </div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Interactive OLAP Cube Pivot Table</span>
              <span className="text-xs font-mono font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                {filteredPivotRows.length} Cells
              </span>
            </h3>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter contract or service..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-300">
                <th
                  onClick={() => handleSort('contract_tier')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Contract Commitment</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('internet_service_type')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Internet Tech</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_subscribers')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Subscribers</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('churn_rate_pct')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Churn Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_tenure_months')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Avg Tenure</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_monthly_charges')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Avg Monthly</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_monthly_mrr')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Monthly MRR</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_cumulative_revenue')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Cumulative Yield</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredPivotRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-zinc-500 font-sans">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                filteredPivotRows.map((row, idx) => {
                  const isHighChurn = row.churn_rate_pct > 35;
                  const isLowChurn = row.churn_rate_pct < 10;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        idx % 2 === 1 ? 'bg-zinc-900/50' : 'bg-transparent'
                      }`}
                    >
                      <td className="py-3 px-4 font-sans font-medium text-zinc-200">
                        {row.contract_tier}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${
                            row.internet_service_type === 'Fiber optic'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              : row.internet_service_type === 'DSL'
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {row.internet_service_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        {row.total_subscribers.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block font-bold px-2 py-0.5 rounded text-xs ${
                            isHighChurn
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isLowChurn
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {row.churn_rate_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {row.avg_tenure_months.toFixed(1)} mo
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        ${row.avg_monthly_charges.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        ${(row.total_monthly_mrr / 1000).toFixed(1)}k
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-100 font-bold">
                        ${(row.total_cumulative_revenue / 1000000).toFixed(2)}M
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
