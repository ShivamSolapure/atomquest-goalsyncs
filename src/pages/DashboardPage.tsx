import { Target, TrendingUp, Users, CheckCircle, ArrowUpRight, ArrowDownRight, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGoals, useKPIs } from '../lib/hooks';

const colorMap: Record<string, { icon: string }> = {
  teal: { icon: 'bg-teal-100 text-teal-600' },
  blue: { icon: 'bg-blue-100 text-blue-600' },
  amber: { icon: 'bg-amber-100 text-amber-600' },
  green: { icon: 'bg-green-100 text-green-600' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'not-started': { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  'on-track': { label: 'On Track', color: 'bg-teal-100 text-teal-700' },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-700' },
  'behind': { label: 'Behind', color: 'bg-red-100 text-red-700' },
};

const approvalColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-blue-100 text-blue-700',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { goals, loading: goalsLoading } = useGoals();
  const { kpis, loading: kpisLoading } = useKPIs();
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const onTrack = goals.filter(g => g.status === 'on-track').length;
  const completed = goals.filter(g => g.status === 'completed').length;
  const total = goals.length;
  const avgKPI = kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + k.progress, 0) / kpis.length) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalWeight = goals.reduce((s, g) => s + g.weight, 0);
  const pendingApproval = goals.filter(g => g.approval_status === 'pending').length;
  const drafts = goals.filter(g => g.approval_status === 'draft' || g.approval_status === 'returned').length;
  const approved = goals.filter(g => g.approval_status === 'approved').length;

  const kpiCards = [
    {
      label: 'Goals On Track',
      value: String(onTrack),
      total: String(total),
      change: total > 0 ? `${onTrack} of ${total} active` : 'No goals yet',
      trend: onTrack > 0 ? 'up' : 'neutral',
      icon: <Target size={18} />,
      color: 'teal',
    },
    {
      label: 'Avg. KPI Score',
      value: `${avgKPI}%`,
      total: null,
      change: kpis.length > 0 ? `Across ${kpis.length} KPIs` : 'No KPIs yet',
      trend: avgKPI >= 80 ? 'up' : 'down',
      icon: <TrendingUp size={18} />,
      color: 'blue',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      total: null,
      change: `${completed} completed`,
      trend: completionRate >= 70 ? 'up' : 'down',
      icon: <Users size={18} />,
      color: 'amber',
    },
    {
      label: 'Goals Completed',
      value: String(completed),
      total: null,
      change: 'This quarter',
      trend: 'neutral',
      icon: <CheckCircle size={18} />,
      color: 'green',
    },
  ];

  const recentGoals = goals.slice(0, 5);

  const alerts: { msg: string; type: 'warning' | 'info' | 'error' }[] = [];
  if (totalWeight !== 100 && total > 0) alerts.push({ msg: `Total weight is ${totalWeight}%. Must equal 100% before submitting.`, type: 'error' });
  if (drafts > 0) alerts.push({ msg: `${drafts} goal${drafts > 1 ? 's' : ''} still in draft — submit for approval`, type: 'warning' });
  if (pendingApproval > 0) alerts.push({ msg: `${pendingApproval} goal${pendingApproval > 1 ? 's' : ''} pending manager approval`, type: 'info' });
  const behind = goals.filter(g => g.status === 'behind').length;
  if (behind > 0) alerts.push({ msg: `${behind} goal${behind > 1 ? 's are' : ' is'} behind schedule`, type: 'warning' });
  if (alerts.length === 0) alerts.push({ msg: 'All goals are on track', type: 'info' });

  const isLoading = goalsLoading || kpisLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">
            {greeting}, {profile?.full_name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s your performance summary for Q2 2026.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Clock size={12} /> Q2 2026 &middot; Apr – Jun
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(card => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
                  {card.icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {card.trend === 'up' && <ArrowUpRight size={13} />}
                  {card.trend === 'down' && <ArrowDownRight size={13} />}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#0f1e3c] leading-none">
                {card.value}
                {card.total && <span className="text-base font-medium text-gray-400">/{card.total}</span>}
              </p>
              <p className="text-sm font-medium text-gray-600 mt-1">{card.label}</p>
              <p className="text-xs text-gray-400 mt-2">{card.change}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Goal progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#0f1e3c] text-base">Active Goals</h2>
            <span className="text-xs text-gray-400">{approved} approved &middot; {totalWeight}% weight</span>
          </div>
          {recentGoals.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No goals yet. Create your first goal to get started.</div>
          ) : (
            <div className="space-y-4">
              {recentGoals.map(goal => {
                const s = statusConfig[goal.status] || statusConfig['not-started'];
                const ac = approvalColors[goal.approval_status] || approvalColors.draft;
                return (
                  <div key={goal.id} className="group">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{goal.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ac}`}>
                          {goal.approval_status}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            goal.status === 'completed' ? 'bg-green-500' :
                            goal.status === 'behind' ? 'bg-red-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${goal.actual_achievement}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{goal.actual_achievement}%</span>
                      <span className="text-[10px] text-gray-400 font-medium">{goal.weight}%w</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick summary */}
        <div className="space-y-4">
          {/* Alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-[#0f1e3c] text-base mb-4">Alerts</h2>
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-sm ${
                  a.type === 'warning' ? 'bg-amber-50 text-amber-800' :
                  a.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-xs leading-relaxed">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weight summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-[#0f1e3c] text-base mb-4">Weight Distribution</h2>
            {goals.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No goals yet</p>
            ) : (
              <div className="space-y-2">
                {goals.map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{g.title}</p>
                    </div>
                    <span className={`text-xs font-bold ${g.weight < MIN_WEIGHT ? 'text-red-500' : 'text-gray-700'}`}>
                      {g.weight}%
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total</span>
                  <span className={`text-xs font-bold ${totalWeight !== 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalWeight}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MIN_WEIGHT = 10;
