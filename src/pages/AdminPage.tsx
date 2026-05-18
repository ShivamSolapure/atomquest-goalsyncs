import { useState } from 'react';
import { Shield, Users, Settings, AlertTriangle, Activity, Plus } from 'lucide-react';
import { useAllProfiles, useAuditLogs } from '../lib/hooks';
import { supabase } from '../lib/supabase';

const actionLabels: Record<string, { label: string; color: string }> = {
  'role.change': { label: 'Role Change', color: 'bg-amber-100 text-amber-700' },
  'goal.status_change': { label: 'Status', color: 'bg-teal-100 text-teal-700' },
  'goal.create': { label: 'Created', color: 'bg-blue-100 text-blue-700' },
  'goal.delete': { label: 'Deleted', color: 'bg-red-100 text-red-700' },
};

export default function AdminPage() {
  const { profiles, loading } = useAllProfiles();
  const { logs, loading: logsLoading } = useAuditLogs(20);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingRole(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUpdatingRole(null);
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
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
          <Shield size={16} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">Admin Panel</h1>
          <p className="text-gray-500 text-sm">System-wide configuration and access management.</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <p className="font-medium">Admin actions are logged and audited. Proceed with caution.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: String(profiles.length), icon: <Users size={16} />, color: 'text-[#0f1e3c] bg-gray-100' },
          { label: 'Admins', value: String(profiles.filter(p => p.role === 'admin').length), icon: <Shield size={16} />, color: 'text-red-600 bg-red-50' },
          { label: 'Managers', value: String(profiles.filter(p => p.role === 'manager').length), icon: <Users size={16} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Employees', value: String(profiles.filter(p => p.role === 'employee').length), icon: <Users size={16} />, color: 'text-teal-600 bg-teal-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-[#0f1e3c]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User management */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <h2 className="font-semibold text-[#0f1e3c] text-sm">Role Management</h2>
            </div>
            <button className="text-xs text-teal-600 font-medium hover:underline flex items-center gap-1">
              <Plus size={11} /> Invite User
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {profiles.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#0f1e3c] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {u.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || u.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-gray-400 truncate">{u.department || 'No department'}</p>
                </div>
                <select
                  value={u.role}
                  disabled={updatingRole === u.id}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500/30 bg-white cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gray-400" />
              <h2 className="font-semibold text-[#0f1e3c] text-sm">Audit Log</h2>
            </div>
            <span className="text-xs text-gray-400">{logs.length} entries</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {logsLoading || logs.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                {logsLoading ? 'Loading...' : 'No audit entries yet'}
              </div>
            ) : (
              logs.map(log => {
                const actor = log.actor_id ? profiles.find(p => p.id === log.actor_id) : null;
                const config = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                const meta = log.metadata as Record<string, string> | null;
                return (
                  <div key={log.id} className="px-6 py-3 flex items-start gap-3">
                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">
                        {actor?.full_name || actor?.email || 'System'}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {log.action}
                        {meta ? ` — ${JSON.stringify(meta)}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* System settings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Settings size={16} className="text-gray-400" />
          <h2 className="font-semibold text-[#0f1e3c] text-sm">System Settings</h2>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-6">
          {[
            { label: 'Allow self-registration', sub: 'Users can sign up without an invite', enabled: false },
            { label: 'Enforce 2FA for managers', sub: 'All manager accounts require 2FA', enabled: true },
            { label: 'Public goal visibility', sub: 'Employees can see all team goals', enabled: true },
            { label: 'Email digest reports', sub: 'Weekly auto-reports to all users', enabled: false },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              <button className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${s.enabled ? 'bg-teal-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${s.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
