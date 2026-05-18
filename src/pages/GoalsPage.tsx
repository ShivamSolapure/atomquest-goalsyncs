import { useState } from 'react';
import { Plus, Search, Target, Clock, X, Loader2, Send, Lock, Edit2, AlertCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../lib/hooks';
import type { Goal, ApprovalStatus } from '../lib/database.types';

const MAX_GOALS = 8;
const MIN_WEIGHT = 10;

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  'not-started': { label: 'Not Started', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  'on-track': { label: 'On Track', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  'behind': { label: 'Behind', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const approvalConfig: Record<ApprovalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: <Edit2 size={12} /> },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: <Send size={12} /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
  returned: { label: 'Returned', color: 'bg-blue-100 text-blue-700', icon: <RotateCcw size={12} /> },
};

const priorityConfig: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-gray-500 bg-gray-100',
};

type StatusFilter = 'All' | 'Not Started' | 'On Track' | 'Completed' | 'Behind';

export default function GoalsPage() {
  const { user } = useAuth();
  const { goals, loading, setGoals } = useGoals();
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newWeight, setNewWeight] = useState(MIN_WEIGHT);
  const [newDueDate, setNewDueDate] = useState('');
  const [newPlanned, setNewPlanned] = useState(0);

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
  const weightError = totalWeight !== 100 && goals.length > 0;
  const canAddMore = goals.length < MAX_GOALS;

  const filtered = goals.filter(g => {
    if (filter !== 'All') {
      const statusMap: Record<string, string> = { 'Not Started': 'not-started', 'On Track': 'on-track', 'Completed': 'completed', 'Behind': 'behind' };
      if (g.status !== statusMap[filter]) return false;
    }
    if (search && !g.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function resetForm() {
    setNewTitle('');
    setNewCategory('General');
    setNewPriority('medium');
    setNewWeight(MIN_WEIGHT);
    setNewDueDate('');
    setNewPlanned(0);
    setEditingGoal(null);
    setShowNewGoal(false);
    setValidationError('');
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setNewTitle(goal.title);
    setNewCategory(goal.category);
    setNewPriority(goal.priority);
    setNewWeight(goal.weight);
    setNewDueDate(goal.due_date || '');
    setNewPlanned(goal.planned_achievement);
    setShowNewGoal(true);
  }

  async function handleSaveGoal() {
    if (!user || !newTitle.trim()) return;
    setValidationError('');

    // Validate weight
    const otherGoalsWeight = editingGoal
      ? goals.filter(g => g.id !== editingGoal.id).reduce((s, g) => s + g.weight, 0)
      : totalWeight;
    const newTotal = otherGoalsWeight + newWeight;

    if (newWeight < MIN_WEIGHT) {
      setValidationError(`Minimum weight per goal is ${MIN_WEIGHT}%`);
      return;
    }
    if (newTotal > 100) {
      setValidationError(`Total weight would be ${newTotal}%. Must equal 100%.`);
      return;
    }
    if (!editingGoal && goals.length >= MAX_GOALS) {
      setValidationError(`Maximum ${MAX_GOALS} goals allowed.`);
      return;
    }

    setSubmitting(true);

    if (editingGoal) {
      const { data } = await supabase
        .from('goals')
        .update({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          weight: newWeight,
          due_date: newDueDate || null,
          planned_achievement: newPlanned,
          approval_status: 'draft',
          is_locked: false,
        })
        .eq('id', editingGoal.id)
        .select()
        .maybeSingle();
      if (data) setGoals(prev => prev.map(g => g.id === editingGoal.id ? data : g));
    } else {
      const { data } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          status: 'not-started',
          progress: 0,
          weight: newWeight,
          approval_status: 'draft',
          is_locked: false,
          due_date: newDueDate || null,
          quarter: 'Q2 2026',
          planned_achievement: newPlanned,
          actual_achievement: 0,
          manager_feedback: '',
        })
        .select()
        .maybeSingle();
      if (data) setGoals(prev => [data, ...prev]);
    }

    resetForm();
    setSubmitting(false);
  }

  async function handleSubmitForApproval() {
    if (weightError) return;
    const draftGoals = goals.filter(g => g.approval_status === 'draft' || g.approval_status === 'returned');
    setSubmitting(true);
    for (const goal of draftGoals) {
      const { data } = await supabase
        .from('goals')
        .update({ approval_status: 'pending' })
        .eq('id', goal.id)
        .select()
        .maybeSingle();
      if (data) setGoals(prev => prev.map(g => g.id === goal.id ? data : g));
    }
    setSubmitting(false);
  }

  async function handleDeleteGoal(id: string) {
    const goal = goals.find(g => g.id === id);
    if (goal?.is_locked) return;
    await supabase.from('goals').delete().eq('id', id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  async function handleUpdateStatus(goal: Goal, newStatus: string) {
    if (goal.is_locked) return;
    const { data } = await supabase
      .from('goals')
      .update({ status: newStatus })
      .eq('id', goal.id)
      .select()
      .maybeSingle();
    if (data) setGoals(prev => prev.map(g => g.id === goal.id ? data : g));
  }

  async function handleUpdateActual(goal: Goal, actual: number) {
    const { data } = await supabase
      .from('goals')
      .update({ actual_achievement: actual })
      .eq('id', goal.id)
      .select()
      .maybeSingle();
    if (data) setGoals(prev => prev.map(g => g.id === goal.id ? data : g));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const draftCount = goals.filter(g => g.approval_status === 'draft' || g.approval_status === 'returned').length;
  const pendingCount = goals.filter(g => g.approval_status === 'pending').length;
  const approvedCount = goals.filter(g => g.approval_status === 'approved').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">My Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your objectives for Q2 2026.</p>
        </div>
        <div className="flex items-center gap-2">
          {draftCount > 0 && !weightError && (
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit All ({draftCount})
            </button>
          )}
          <button
            onClick={() => { resetForm(); setShowNewGoal(true); }}
            disabled={!canAddMore}
            className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} /> New Goal
          </button>
        </div>
      </div>

      {/* Weight validation banner */}
      {goals.length > 0 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
          weightError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {weightError ? (
            <><AlertCircle size={16} className="flex-shrink-0" /><span className="font-medium">Total weight is {totalWeight}%. Must equal 100% before submitting.</span></>
          ) : (
            <><CheckCircle2 size={16} className="flex-shrink-0" /><span className="font-medium">Total weight: {totalWeight}% — Valid!</span></>
          )}
        </div>
      )}

      {/* New/Edit Goal Modal */}
      {showNewGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[#0f1e3c] text-lg">{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Goal Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Increase customer retention to 92%" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white">
                    {['General', 'Revenue', 'Product', 'Operations', 'Customer Success', 'Strategy', 'HR'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Weight (%)</label>
                  <input type="number" min={MIN_WEIGHT} max={100} value={newWeight} onChange={e => setNewWeight(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                  <p className="text-[10px] text-gray-400 mt-1">Min {MIN_WEIGHT}%. Total must = 100%</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Due Date</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Planned Achievement (%)</label>
                <input type="number" min={0} max={100} value={newPlanned} onChange={e => setNewPlanned(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              {validationError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-xl">
                  <AlertCircle size={13} /> {validationError}
                </div>
              )}
              <button
                onClick={handleSaveGoal}
                disabled={submitting || !newTitle.trim()}
                className="w-full bg-[#0f1e3c] hover:bg-[#162a52] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search goals..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
        </div>
        {(['All', 'Not Started', 'On Track', 'Completed', 'Behind'] as StatusFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-[#0f1e3c] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: String(goals.length), color: 'border-l-[#0f1e3c]' },
          { label: 'Drafts', value: String(draftCount), color: 'border-l-gray-400' },
          { label: 'Pending', value: String(pendingCount), color: 'border-l-amber-500' },
          { label: 'Approved', value: String(approvedCount), color: 'border-l-green-500' },
          { label: 'Weight', value: `${totalWeight}%`, color: weightError ? 'border-l-red-500' : 'border-l-teal-500' },
        ].map(s => (
          <div key={s.label} className={`bg-white border border-gray-100 border-l-4 ${s.color} rounded-xl px-4 py-3`}>
            <p className="text-xl font-bold text-[#0f1e3c]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Goals list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {goals.length === 0 ? 'No goals yet. Create your first goal to get started.' : 'No goals match your filter.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(goal => {
              const s = statusConfig[goal.status] || statusConfig['not-started'];
              const a = approvalConfig[goal.approval_status];
              return (
                <div key={goal.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#0f1e3c]/5 flex items-center justify-center mt-0.5">
                      <Target size={16} className="text-[#0f1e3c]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0f1e3c] text-sm truncate">{goal.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-400">{goal.category}</span>
                            <span className="text-gray-200">·</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${priorityConfig[goal.priority]}`}>{goal.priority}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-[11px] font-semibold text-[#0f1e3c] bg-[#0f1e3c]/5 px-2 py-0.5 rounded-full">{goal.weight}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Approval status */}
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.color}`}>
                            {a.icon} {a.label}
                          </span>
                          {/* Goal status */}
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                          {/* Actions */}
                          {!goal.is_locked && goal.approval_status !== 'pending' && (
                            <button onClick={() => openEdit(goal)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-teal-600 transition-all">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {goal.is_locked && (
                            <Lock size={14} className="text-green-500" />
                          )}
                          {!goal.is_locked && goal.approval_status !== 'approved' && (
                            <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-all">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Manager feedback */}
                      {goal.manager_feedback && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-800 font-medium">
                          Manager: {goal.manager_feedback}
                        </div>
                      )}

                      {/* Progress and achievement */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {/* Status selector */}
                        <select
                          value={goal.status}
                          disabled={goal.is_locked}
                          onChange={e => handleUpdateStatus(goal, e.target.value)}
                          className={`text-xs font-medium border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${goal.is_locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="not-started">Not Started</option>
                          <option value="on-track">On Track</option>
                          <option value="completed">Completed</option>
                          <option value="behind">Behind</option>
                        </select>

                        {/* Planned vs Actual */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Planned:</span>
                          <span className="font-semibold text-gray-700">{goal.planned_achievement}%</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500">Actual:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={goal.actual_achievement}
                            disabled={goal.is_locked}
                            onChange={e => handleUpdateActual(goal, Number(e.target.value))}
                            className={`w-14 px-1.5 py-0.5 text-xs font-semibold border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${goal.is_locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="text-gray-400">%</span>
                        </div>

                        {goal.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                            <Clock size={11} /> {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
