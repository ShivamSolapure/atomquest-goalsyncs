export type Role = 'employee' | 'manager' | 'admin';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'returned';
export type GoalStatus = 'not-started' | 'on-track' | 'completed' | 'behind';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  department: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  head_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: GoalStatus;
  progress: number;
  weight: number;
  approval_status: ApprovalStatus;
  is_locked: boolean;
  planned_achievement: number;
  actual_achievement: number;
  manager_feedback: string;
  due_date: string | null;
  quarter: string;
  created_at: string;
  updated_at: string;
}

export interface KPI {
  id: string;
  user_id: string;
  name: string;
  category: string;
  current_value: string;
  target_value: string;
  unit: string;
  progress: number;
  trend: 'up' | 'down' | 'neutral';
  change: string;
  quarter: string;
  created_at: string;
  updated_at: string;
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  user_id: string;
  note: string;
  progress: number;
  created_at: string;
}

export interface QuarterlyUpdate {
  id: string;
  goal_id: string;
  user_id: string;
  quarter: string;
  progress: number;
  notes: string;
  key_results: Record<string, unknown> | null;
  blockers: string | null;
  created_at: string;
}

export interface ManagerComment {
  id: string;
  goal_id: string;
  author_id: string;
  target_user_id: string;
  comment: string;
  visibility: 'private' | 'shared';
  created_at: string;
  updated_at: string;
}

export interface SharedGoal {
  id: string;
  goal_id: string;
  owner_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  color: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
}
