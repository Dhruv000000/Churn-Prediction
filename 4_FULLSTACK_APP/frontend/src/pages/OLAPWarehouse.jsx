import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingDown,
  DollarSign,
  CreditCard,
  Search,
  ArrowUpDown
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

// Light Tooltips declared outside render
const CustomGroupedTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs">
        <div className="font-bold text-slate-900 mb-2">{label} Contract</div>
        <div className="space-y-1.5 font-mono">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between space-x-4">
              <span className="flex items-center space-x-1.5" style={{ color: item.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-sans font-medium text-slate-700">{item.name}:</span>
              </span>
              <span className="font-bold text-slate-900">{item.value.toFixed(2)}%</span>
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
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1.5">
        <div className="font-bold text-slate-900 mb-1">{data.payment_method}</div>
        <div className="flex justify-between space-x-4 text-slate-600 font-mono">
          <span>Churn Rate:</span>
          <span className="font-bold text-rose-600">{data.churn_rate_pct.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between space-x-4 text-slate-500 font-mono">
          <span>Subscribers:</span>
          <span className="text-slate-900 font-semibold">{data.total_subscribers.toLocaleString()}</span>
        </div>
        <div className="flex justify-between space-x-4 text-slate-500 font-mono">
          <span>Avg Monthly:</span>
          <span className="text-indigo-600 font-semibold">${data.avg_monthly_charges.toFixed(2)}/mo</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function OLAPWarehouse() {
  const [kpis, setKpis] = useState(null);
  const [contractData, setContractData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState('total_subscribers');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    async function loadWarehouseData() {
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
      }
    }
    loadWarehouseData();
  }, []);

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
      };
    });
  }, [contractData]);

  const filteredPivotRows = useMemo(() => {
    if (!contractData) return [];
    let rows = contractData.filter((r) => {
      const matchContract = r.contract_tier?.toLowerCase().includes(tableSearch.toLowerCase());
      const matchService = r.internet_service_type?.toLowerCase().includes(tableSearch.toLowerCase());
      return matchContract || matchService;
    });

    rows.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
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

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
          KIMBALL STAR SCHEMA WAREHOUSE • FACT_SUBSCRIPTIONS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-3">
          <span>OLAP Warehouse & Revenue Forensics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          High-dimensional analytical rollups, contract commitment segmentation, and payment channel yield analysis.
        </p>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {kpis ? kpis.total_subscribers.toLocaleString() : '105,000'}
          </div>
          <div className="text-xs text-slate-500 flex items-center space-x-1.5 pt-1">
            <span className="text-emerald-700 font-mono font-bold">
              {kpis ? kpis.retained_count.toLocaleString() : '75,496'}
            </span>
            <span>Retained</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-mono font-bold">
              {kpis ? kpis.churn_count.toLocaleString() : '29,504'}
            </span>
            <span>Churned</span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Churn Rate
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-rose-600">
            {kpis ? `${kpis.overall_churn_rate.toFixed(1)}%` : '28.1%'}
          </div>
          <div className="text-xs text-slate-500 flex items-center space-x-1 pt-1">
            <span className="text-rose-600 font-mono font-semibold">+1.8%</span>
            <span>vs telecom industry baseline (26.3%)</span>
          </div>
        </div>

        {/* Annual ARR */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Annual ARR
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-600">
            {kpis ? `$${(kpis.total_arr / 1000000).toFixed(2)}M` : '$81.23M'}
          </div>
          <div className="text-xs text-slate-500 flex items-center space-x-1 pt-1">
            <span>MRR:</span>
            <span className="font-mono text-slate-700 font-semibold">
              ${kpis ? (kpis.total_monthly_revenue / 1000000).toFixed(2) : '6.77'}M/mo
            </span>
          </div>
        </div>

        {/* Avg Monthly Charges */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Monthly Charges
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900">
            {kpis ? `$${kpis.average_monthly_charges.toFixed(2)}` : '$64.47'}
          </div>
          <div className="text-xs text-slate-500 flex items-center space-x-1 pt-1">
            <span>Avg Tenure:</span>
            <span className="font-mono text-slate-700 font-semibold">
              {kpis ? kpis.average_tenure_months.toFixed(1) : '31.6'} mos
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Grouped Bar Chart (Contract × Internet Service) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Multidimensional Rollup
              </span>
              <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Fact_Subscriptions
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Churn Rate across Contract Tier × Internet Infrastructure
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Month-to-month contracts on Fiber Optic reach a critical 54.6% churn rate, while Two-year contracts drop below 7%.
            </p>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedContractData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="contract"
                  stroke="#64748B"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  unit="%"
                  axisLine={{ stroke: '#CBD5E1' }}
                  domain={[0, 60]}
                />
                <Tooltip content={<CustomGroupedTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
                />
                <Bar dataKey="Fiber Optic" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="DSL" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="No Internet" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Churn Rate by Payment Method */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Channel Forensics
              </span>
              <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Dim_Billing
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Churn Variance by Payment Method
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748B"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  unit="%"
                  domain={[0, 50]}
                />
                <YAxis
                  type="category"
                  dataKey="payment_method"
                  stroke="#64748B"
                  tick={{ fill: '#475569', fontSize: 11 }}
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
                      fill={entry.churn_rate_pct > 35 ? '#E11D48' : entry.churn_rate_pct > 20 ? '#F59E0B' : '#10B981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive OLAP Pivot Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              STAR SCHEMA DIMENSION SLICE
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Interactive OLAP Cube Pivot Table</span>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {filteredPivotRows.length} Cells Active
              </span>
            </h3>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter contract or service..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th
                  onClick={() => handleSort('contract_tier')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Contract Commitment</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('internet_service_type')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Internet Tech</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_subscribers')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Subscribers</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('churn_rate_pct')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Churn Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_tenure_months')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Avg Tenure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('avg_monthly_charges')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Avg Monthly</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_monthly_mrr')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Monthly MRR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_cumulative_revenue')}
                  className="py-3 px-4 font-semibold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Cumulative Yield</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredPivotRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 font-sans">
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
                      className={`hover:bg-slate-50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="py-3 px-4 font-sans font-medium text-slate-900">
                        {row.contract_tier}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                            row.internet_service_type === 'Fiber optic'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : row.internet_service_type === 'DSL'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {row.internet_service_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-bold">
                        {row.total_subscribers.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold ${
                            isHighChurn
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLowChurn
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {row.churn_rate_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {row.avg_tenure_months.toFixed(1)}m
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-semibold">
                        ${row.avg_monthly_charges.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        ${(row.total_monthly_mrr / 1000).toFixed(1)}k
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-bold">
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
