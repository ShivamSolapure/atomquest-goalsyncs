import { useState } from 'react';
import { User, Bell, Shield, Building2, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? 'U';

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, department })
      .eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleUpdatePassword() {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences and workspace settings.</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <h2 className="font-semibold text-[#0f1e3c] text-sm">Profile Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
            <div className="w-16 h-16 rounded-full bg-[#0f1e3c] text-white text-xl font-bold flex items-center justify-center">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-[#0f1e3c]">{profile?.full_name || 'User'}</p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 capitalize ${
                profile?.role === 'admin' ? 'bg-red-100 text-red-700' :
                profile?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                'bg-teal-100 text-teal-700'
              }`}>
                {profile?.role}
              </span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Department</label>
              <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input defaultValue={profile?.email || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <span className="text-teal-300">Saved!</span> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Bell size={16} className="text-gray-400" />
          <h2 className="font-semibold text-[#0f1e3c] text-sm">Notification Preferences</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Goal deadline reminders', sub: '7 days and 1 day before due date', enabled: true },
            { label: 'KPI score updates', sub: 'When your KPIs are updated by a manager', enabled: true },
            { label: 'Weekly performance digest', sub: 'Every Monday morning summary', enabled: false },
            { label: 'Team announcements', sub: 'Important team and org updates', enabled: true },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-800">{n.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.sub}</p>
              </div>
              <button className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${n.enabled ? 'bg-teal-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${n.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <h2 className="font-semibold text-[#0f1e3c] text-sm">Security</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">New Password</label>
            <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }} placeholder="Enter new password" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }} placeholder="Confirm new password" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
          {passwordError && <p className="text-xs text-red-600 font-medium">{passwordError}</p>}
          {passwordSaved && <p className="text-xs text-teal-600 font-medium">Password updated successfully!</p>}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleUpdatePassword}
              disabled={passwordSaving}
              className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#162a52] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : <><Shield size={14} /> Update Password</>}
            </button>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          <Building2 size={16} className="text-gray-400" />
          <h2 className="font-semibold text-[#0f1e3c] text-sm">Workspace</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">Workspace Name</p>
              <p className="text-xs text-gray-400 mt-0.5">AtomQuest Corp</p>
            </div>
            <button className="text-xs text-teal-600 font-medium hover:underline">Edit</button>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">Fiscal Year Start</p>
              <p className="text-xs text-gray-400 mt-0.5">January 1st</p>
            </div>
            <button className="text-xs text-teal-600 font-medium hover:underline">Change</button>
          </div>
        </div>
      </div>
    </div>
  );
}
