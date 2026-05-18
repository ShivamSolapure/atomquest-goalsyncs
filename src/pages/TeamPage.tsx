import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Mail, CheckCircle2, XCircle, RotateCcw, MessageSquare, Lock, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTeamMembers, useDepartmentGoals } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import type { Goal } from '../lib/database.types';

const roleConfig: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
};

const avatarColors = [
  'bg-teal-600', 'bg-blue-600', 'bg-[#0f1e3c]', 'bg-emerald-600',
  'bg-cyan-600', 'bg-sky-600',
];

const approvalLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  returned: { label: 'Returned', color: 'bg-blue-100 text-blue-700' },
};

const statusLabels: Record<string, string> = {
  'not-started': 'Not Started',
  'on-track': 'On Track',
  'completed': 'Completed',
  'behind': 'Behind',
};

export default function TeamPage() {
  const { profile } = useAuth();
  const { members, loading: membersLoading } = useTeamMembers();
  const { goals: deptGoals, loading: goalsLoading, setGoals: setDeptGoals } = useDepartmentGoals();
  const [search, setSearch] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [feedbackGoal, setFeedbackGoal] = useState<Goal | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackAction, setFeedbackAction] = useState<'approve' | 'reject' | 'return' | 'comment'>('approve');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'members' | 'goals'>('goals');

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const pendingGoals = deptGoals.filter(g => g.approval_status === 'pending');
  const approvedGoals = deptGoals.filter(g => g.approval_status === 'approved');
  const returnedGoals = deptGoals.filter(g => g.approval_status === 'returned');

  async function handleRoleChange(userId: string, newRole: string) {
    if (!profile || profile.role !== 'admin') return;
    setUpdatingRole(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUpdatingRole(null);
  }

  async function handleGoalAction() {
    if (!feedbackGoal || !profile) return;
    setSubmitting(true);

    const updates: Partial<Goal> = { manager_feedback: feedbackText };

    if (feedbackAction === 'approve') {
      updates.approval_status = 'approved';
    } else if (feedbackAction === 'reject') {
      updates.approval_status = 'rejected';
    } else if (feedbackAction === 'return') {
      updates.approval_status = 'returned';
    }

    const { data } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', feedbackGoal.id)
      .select()
      .maybeSingle();

    if (data) setDeptGoals(prev => prev.map(g => g.id === feedbackGoal.id ? data : g));

    // Also insert a manager comment
    if (feedbackText) {
      await supabase.from('manager_comments').insert({
        goal_id: feedbackGoal.id,
        author_id: profile.id,
        target_user_id: feedbackGoal.user_id,
        comment: feedbackText,
        visibility: 'shared',
      });
    }

    setFeedbackGoal(null);
    setFeedbackText('');
    setSubmitting(false);
  }

  function openFeedback(goal: Goal, action: 'approve' | 'reject' | 'return' | 'comment') {
    setFeedbackGoal(goal);
    setFeedbackAction(action);
    setFeedbackText('');
  }

  const isLoading = membersLoading || goalsLoading;

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
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">Team</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your team&apos;s goals and performance.</p>
        </div>
        {profile?.role === 'admin' && (
          <button className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={16} /> Invite Member
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 max-w-xs">
        {(['goals', 'members'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
              tab === t ? 'bg-white text-[#0f1e3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'goals' ? `Goals (${pendingGoals.length})` : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* Feedback Modal */}
      {feedbackGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-semibold text-[#0f1e3c] text-lg mb-1 capitalize">
              {feedbackAction === 'approve' ? 'Approve Goal' : feedbackAction === 'reject' ? 'Reject Goal' : feedbackAction === 'return' ? 'Return for Rework' : 'Add Comment'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{feedbackGoal.title}</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {feedbackAction === 'return' ? 'Rework Instructions' : feedbackAction === 'reject' ? 'Rejection Reason' : 'Feedback'}
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                rows={3}
                placeholder="Add your feedback..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleGoalAction}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                  feedbackAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  feedbackAction === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  feedbackAction === 'return' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  'bg-[#0f1e3c] hover:bg-[#162a52] text-white'
                }`}
              >
                {submitting ? '...' : feedbackAction === 'approve' ? 'Approve' : feedbackAction === 'reject' ? 'Reject' : feedbackAction === 'return' ? 'Return' : 'Comment'}
              </button>
              <button onClick={() => setFeedbackGoal(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'goals' ? (
        <>
          {/* Pending goals */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-[#0f1e3c] text-sm">Pending Approval ({pendingGoals.length})</h2>
            </div>
            {pendingGoals.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No goals pending approval</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendingGoals.map(goal => {
                  const a = approvalLabels[goal.approval_status] || approvalLabels.draft;
                  const owner = (goal as Goal & { profiles?: { full_name: string; email: string } }).profiles;
                  return (
                    <div key={goal.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Target size={14} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0f1e3c]">{goal.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{owner?.full_name || owner?.email || 'Unknown'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.color}`}>{a.label}</span>
                              <span className="text-[10px] text-gray-400">{goal.weight}% weight</span>
                              <span className="text-[10px] text-gray-400">{statusLabels[goal.status] || goal.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => openFeedback(goal, 'approve')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Approve">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => openFeedback(goal, 'reject')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Reject">
                            <XCircle size={16} />
                          </button>
                          <button onClick={() => openFeedback(goal, 'return')} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Return for rework">
                            <RotateCcw size={16} />
                          </button>
                          <button onClick={() => openFeedback(goal, 'comment')} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors" title="Comment">
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </div>
                      {goal.manager_feedback && (
                        <div className="mt-2 ml-11 p-2 bg-blue-50 rounded-lg text-xs text-blue-800">
                          Previous feedback: {goal.manager_feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approved goals */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-[#0f1e3c] text-sm flex items-center gap-2">
                <Lock size={14} className="text-green-500" /> Approved Goals ({approvedGoals.length})
              </h2>
            </div>
            {approvedGoals.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No approved goals yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {approvedGoals.map(goal => {
                  const owner = (goal as Goal & { profiles?: { full_name: string; email: string } }).profiles;
                  return (
                    <div key={goal.id} className="px-6 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={13} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{goal.title}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name || owner?.email} &middot; {goal.weight}% &middot; Actual: {goal.actual_achievement}%</p>
                      </div>
                      <button onClick={() => openFeedback(goal, 'comment')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Comment">
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Returned goals */}
          {returnedGoals.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-[#0f1e3c] text-sm">Returned for Rework ({returnedGoals.length})</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {returnedGoals.map(goal => {
                  const owner = (goal as Goal & { profiles?: { full_name: string; email: string } }).profiles;
                  return (
                    <div key={goal.id} className="px-6 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <RotateCcw size={13} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{goal.title}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name || owner?.email} &middot; {goal.manager_feedback && `Feedback: ${goal.manager_feedback.slice(0, 60)}...`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Members tab */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team members..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No team members found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((member, idx) => (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full ${avatarColors[idx % avatarColors.length]} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>
                        {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || member.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0f1e3c] text-sm">{member.full_name || member.email}</p>
                        <p className="text-xs text-gray-500">{member.department || 'No department'}</p>
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    {profile?.role === 'admin' ? (
                      <select value={member.role} disabled={updatingRole === member.id} onChange={e => handleRoleChange(member.id, e.target.value)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize border border-gray-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30">
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${roleConfig[member.role]}`}>{member.role}</span>
                    )}
                    <a href={`mailto:${member.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors ml-auto">
                      <Mail size={11} /> <span className="truncate max-w-[120px]">{member.email}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
