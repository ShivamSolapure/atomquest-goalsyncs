import { Download, Calendar, BarChart2, TrendingUp, FileText } from 'lucide-react';
import { useGoals, useKPIs } from '../lib/hooks';

export default function ReportsPage() {
  const { goals, loading: goalsLoading } = useGoals();
  const { kpis, loading: kpisLoading } = useKPIs();

  const isLoading = goalsLoading || kpisLoading;

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const avgKPI = kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + k.progress, 0) / kpis.length) : 0;
  const avgPlanned = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.planned_achievement, 0) / goals.length) : 0;
  const avgActual = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.actual_achievement, 0) / goals.length) : 0;

  const categoryBreakdown = Array.from(new Set(goals.map(g => g.category))).map(cat => {
    const catGoals = goals.filter(g => g.category === cat);
    const catCompleted = catGoals.filter(g => g.status === 'completed').length;
    const catAvgPlanned = Math.round(catGoals.reduce((s, g) => s + g.planned_achievement, 0) / catGoals.length);
    const catAvgActual = Math.round(catGoals.reduce((s, g) => s + g.actual_achievement, 0) / catGoals.length);
    return { category: cat, total: catGoals.length, completed: catCompleted, avgPlanned: catAvgPlanned, avgActual: catAvgActual };
  });

  const statusBreakdown = [
    { status: 'Not Started', count: goals.filter(g => g.status === 'not-started').length, color: 'bg-gray-400' },
    { status: 'On Track', count: goals.filter(g => g.status === 'on-track').length, color: 'bg-teal-500' },
    { status: 'Completed', count: goals.filter(g => g.status === 'completed').length, color: 'bg-green-500' },
    { status: 'Behind', count: goals.filter(g => g.status === 'behind').length, color: 'bg-red-500' },
  ];

  const kpiCategoryBreakdown = Array.from(new Set(kpis.map(k => k.category))).map(cat => {
    const catKpis = kpis.filter(k => k.category === cat);
    const avg = Math.round(catKpis.reduce((s, k) => s + k.progress, 0) / catKpis.length);
    return { category: cat, avg, count: catKpis.length };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Visualize trends and export performance data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <Calendar size={14} /> Q2 2026
          </button>
          <button className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Goals Set', value: String(totalGoals), sub: 'This quarter', icon: <BarChart2 size={16} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: String(completedGoals), sub: `${totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}% rate`, icon: <TrendingUp size={16} />, color: 'text-teal-600 bg-teal-50' },
          { label: 'Avg KPI Score', value: `${avgKPI}%`, sub: `Across ${kpis.length} KPIs`, icon: <TrendingUp size={16} />, color: 'text-green-600 bg-green-50' },
          { label: 'Categories', value: String(categoryBreakdown.length), sub: 'Goal categories', icon: <FileText size={16} />, color: 'text-gray-600 bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-[#0f1e3c]">{s.value}</p>
            <p className="text-sm font-medium text-gray-600">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Goal status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-[#0f1e3c] text-base mb-5">Goal Status Breakdown</h2>
          {statusBreakdown.map(s => (
            <div key={s.status} className="mb-4">
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>{s.status}</span>
                <span>{s.count} goal{s.count !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${totalGoals > 0 ? (s.count / totalGoals) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
          {totalGoals === 0 && <p className="text-sm text-gray-400 text-center py-6">No goals data yet</p>}
        </div>

        {/* Planned vs Actual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-[#0f1e3c] text-base mb-5">Planned vs Actual Achievement</h2>
          {goals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No goals data yet</p>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-6 p-3 bg-gray-50 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-blue-600">{avgPlanned}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Planned</p>
                </div>
                <div className="text-gray-300">vs</div>
                <div className="text-center flex-1">
                  <p className={`text-2xl font-bold ${avgActual >= avgPlanned ? 'text-green-600' : 'text-amber-600'}`}>{avgActual}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Actual</p>
                </div>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {goals.map(g => (
                  <div key={g.id}>
                    <p className="text-xs font-medium text-gray-700 mb-1 truncate">{g.title}</p>
                    <div className="flex gap-1 h-2">
                      <div className="bg-blue-200 rounded-l-full" style={{ width: `${g.planned_achievement}%` }} title={`Planned: ${g.planned_achievement}%`} />
                      <div className={`rounded-r-full ${g.actual_achievement >= g.planned_achievement ? 'bg-green-400' : 'bg-amber-400'}`} style={{ width: `${g.actual_achievement}%` }} title={`Actual: ${g.actual_achievement}%`} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>Planned: {g.planned_achievement}%</span>
                      <span>Actual: {g.actual_achievement}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Goals by category with planned vs actual */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-[#0f1e3c] text-base">Goals by Category</h2>
        </div>
        {categoryBreakdown.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No goals data yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categoryBreakdown.map(c => (
              <div key={c.category} className="px-6 py-3.5 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#0f1e3c]/5 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                  {c.category.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0f1e3c]">{c.category}</p>
                  <p className="text-xs text-gray-400">{c.completed} of {c.total} completed</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600">{c.avgPlanned}%</p>
                    <p className="text-[10px] text-gray-400">Planned</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${c.avgActual >= c.avgPlanned ? 'text-green-600' : 'text-amber-600'}`}>{c.avgActual}%</p>
                    <p className="text-[10px] text-gray-400">Actual</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI by category */}
      {kpis.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-[#0f1e3c] text-base mb-5">KPI Score by Category</h2>
          <div className="space-y-4">
            {kpiCategoryBreakdown.map(k => (
              <div key={k.category}>
                <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                  <span>{k.category}</span>
                  <span className={k.avg >= 80 ? 'text-teal-600' : 'text-amber-600'}>{k.avg}% ({k.count} KPI{k.count !== 1 ? 's' : ''})</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${k.avg >= 80 ? 'bg-teal-500' : 'bg-amber-500'} transition-all`} style={{ width: `${k.avg}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
