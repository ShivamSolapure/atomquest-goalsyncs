import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useKPIs } from '../lib/hooks';

const categories = ['All', 'Revenue', 'CX', 'Retention', 'HR', 'Operations', 'Engineering', 'Sales', 'General'];

export default function KPIsPage() {
  const { user } = useAuth();
  const { kpis, loading, setKPIs } = useKPIs();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showNewKPI, setShowNewKPI] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const filtered = categoryFilter === 'All' ? kpis : kpis.filter(k => k.category === categoryFilter);

  async function handleCreateKPI() {
    if (!user || !newName.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('kpis')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        category: newCategory,
        current_value: newCurrentValue || '0',
        target_value: newTargetValue || '0',
        unit: newUnit,
        progress: 0,
        trend: 'neutral',
        change: '0',
        quarter: 'Q2 2026',
      })
      .select()
      .maybeSingle();

    if (data) setKPIs(prev => [data, ...prev]);
    setNewName('');
    setNewCategory('General');
    setNewCurrentValue('');
    setNewTargetValue('');
    setNewUnit('');
    setShowNewKPI(false);
    setSubmitting(false);
  }

  async function handleUpdateProgress(kpiId: string, newProgress: number) {
    const trend = newProgress > 50 ? 'up' : newProgress < 30 ? 'down' : 'neutral';
    const { data } = await supabase
      .from('kpis')
      .update({ progress: newProgress, trend })
      .eq('id', kpiId)
      .select()
      .maybeSingle();
    if (data) setKPIs(prev => prev.map(k => k.id === kpiId ? data : k));
  }

  async function handleDeleteKPI(id: string) {
    await supabase.from('kpis').delete().eq('id', id);
    setKPIs(prev => prev.filter(k => k.id !== id));
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">KPI Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your key performance indicators in real time.</p>
        </div>
        <button
          onClick={() => setShowNewKPI(true)}
          className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add KPI
        </button>
      </div>

      {/* New KPI Modal */}
      {showNewKPI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[#0f1e3c] text-lg">Add New KPI</h2>
              <button onClick={() => setShowNewKPI(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">KPI Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Monthly Recurring Revenue" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white">
                    {['General', 'Revenue', 'CX', 'Retention', 'HR', 'Operations', 'Engineering', 'Sales'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Unit</label>
                  <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="e.g. /5, %, /mo" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Current Value</label>
                  <input value={newCurrentValue} onChange={e => setNewCurrentValue(e.target.value)} placeholder="e.g. $248,400" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Target</label>
                  <input value={newTargetValue} onChange={e => setNewTargetValue(e.target.value)} placeholder="e.g. $275,000" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                </div>
              </div>
              <button
                onClick={handleCreateKPI}
                disabled={submitting || !newName.trim()}
                className="w-full bg-[#0f1e3c] hover:bg-[#162a52] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Add KPI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              categoryFilter === c
                ? 'bg-[#0f1e3c] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {kpis.length === 0 ? 'No KPIs yet. Add your first KPI to start tracking.' : 'No KPIs in this category.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map(kpi => (
            <div key={kpi.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group relative">
              <button
                onClick={() => handleDeleteKPI(kpi.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
              >
                <X size={14} />
              </button>
              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">
                  {kpi.category}
                </span>
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  kpi.trend === 'up' ? 'text-green-600' :
                  kpi.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {kpi.trend === 'up' && <TrendingUp size={13} />}
                  {kpi.trend === 'down' && <TrendingDown size={13} />}
                  {kpi.trend === 'neutral' && <Minus size={13} />}
                  {kpi.change}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#0f1e3c] leading-none mt-2">
                {kpi.current_value}<span className="text-sm font-medium text-gray-400">{kpi.unit}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{kpi.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Target: {kpi.target_value}</p>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">{kpi.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={kpi.progress}
                  onChange={e => handleUpdateProgress(kpi.id, Number(e.target.value))}
                  className="w-full h-1.5 accent-teal-500 cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
