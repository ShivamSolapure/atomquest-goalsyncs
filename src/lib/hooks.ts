import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Goal, KPI, Profile, Achievement, UserAchievement, Notification, AuditLog, Department, ManagerComment, QuarterlyUpdate } from './database.types';

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setGoals([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setGoals(data ?? []);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel('goals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${user.id}` },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { goals, loading, setGoals };
}

export function useDepartmentGoals() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<(Goal & { profiles: Pick<Profile, 'full_name' | 'email' | 'role'> })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      setGoals([]); setLoading(false); return;
    }

    const fetch = async () => {
      let query = supabase
        .from('goals')
        .select('*, profiles!goals_user_id_fkey(full_name, email, role)')
        .order('created_at', { ascending: false });

      if (profile.role === 'manager' && profile.department_id) {
        query = query.in('approval_status', ['pending', 'approved', 'returned']);
      }

      const { data } = await query;
      setGoals((data as (Goal & { profiles: Pick<Profile, 'full_name' | 'email' | 'role'> })[]) ?? []);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel('dept-goals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return { goals, loading, setGoals };
}

export function useKPIs() {
  const { user } = useAuth();
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setKPIs([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('kpis')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setKPIs(data ?? []);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel('kpis-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis', filter: `user_id=eq.${user.id}` },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { kpis, loading, setKPIs };
}

export function useTeamMembers() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { setMembers([]); setLoading(false); return; }

    const fetch = async () => {
      if (profile.role === 'admin') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', profile.id)
          .order('full_name');
        setMembers(data ?? []);
      } else if (profile.role === 'manager' && profile.department_id) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('department_id', profile.department_id)
          .neq('id', profile.id)
          .order('full_name');
        setMembers(data ?? []);
      }
      setLoading(false);
    };

    fetch();
  }, [profile]);

  return { members, loading };
}

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setAchievements([]); setUserAchievements([]); setLoading(false); return; }

    const fetch = async () => {
      const [achRes, uaRes] = await Promise.all([
        supabase.from('achievements').select('*').order('name'),
        supabase.from('user_achievements').select('*').eq('user_id', user.id),
      ]);
      setAchievements(achRes.data ?? []);
      setUserAchievements(uaRes.data ?? []);
      setLoading(false);
    };

    fetch();
  }, [user]);

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  return { achievements, userAchievements, earnedIds, loading };
}

export function useAllProfiles() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { setProfiles([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      setProfiles(data ?? []);
      setLoading(false);
    };

    fetch();
  }, [profile]);

  return { profiles, loading };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); setLoading(false); return; }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setUnreadCount((data ?? []).filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();

    if (!user) return;
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetch]);

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    fetch();
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    fetch();
  }

  return { notifications, unreadCount, loading, markAsRead, markAllRead };
}

export function useAuditLogs(limit = 50) {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { setLogs([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      setLogs(data ?? []);
      setLoading(false);
    };

    fetch();
  }, [profile, limit]);

  return { logs, loading };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      setDepartments(data ?? []);
      setLoading(false);
    };

    fetch();
  }, []);

  return { departments, loading };
}

export function useManagerComments(goalId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ManagerComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId || !user) { setComments([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('manager_comments')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });
      setComments(data ?? []);
      setLoading(false);
    };

    fetch();
  }, [goalId, user]);

  return { comments, loading };
}

export function useQuarterlyUpdates(goalId: string | null) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<QuarterlyUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId || !user) { setUpdates([]); setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('quarterly_updates')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      setUpdates(data ?? []);
      setLoading(false);
    };

    fetch();
  }, [goalId, user]);

  return { updates, loading };
}
