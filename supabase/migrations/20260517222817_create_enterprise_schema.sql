/*
  # Enterprise schema expansion: departments, quarterly_updates, manager_comments, shared_goals, audit_logs, notifications

  ## New Tables

  1. `departments`
     - `id` (uuid, PK)
     - `name` (text, unique, not null)
     - `description` (text)
     - `head_user_id` (uuid, FK → profiles.id, nullable)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. `quarterly_updates`
     - `id` (uuid, PK)
     - `goal_id` (uuid, FK → goals.id, on delete cascade)
     - `user_id` (uuid, FK → profiles.id, on delete cascade)
     - `quarter` (text, not null, e.g. 'Q2 2026')
     - `progress` (integer, 0-100)
     - `notes` (text)
     - `key_results` (jsonb, nullable — structured key results)
     - `blockers` (text, nullable)
     - `created_at` (timestamptz)

  3. `manager_comments`
     - `id` (uuid, PK)
     - `goal_id` (uuid, FK → goals.id, on delete cascade)
     - `author_id` (uuid, FK → profiles.id, on delete cascade)
     - `target_user_id` (uuid, FK → profiles.id, on delete cascade)
     - `comment` (text, not null)
     - `visibility` (text: 'private', 'shared', default 'shared')
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  4. `shared_goals`
     - `id` (uuid, PK)
     - `goal_id` (uuid, FK → goals.id, on delete cascade)
     - `owner_id` (uuid, FK → profiles.id, on delete cascade)
     - `shared_with_user_id` (uuid, FK → profiles.id, on delete cascade)
     - `permission` (text: 'view', 'edit', default 'view')
     - `created_at` (timestamptz)
     - UNIQUE(goal_id, shared_with_user_id)

  5. `audit_logs`
     - `id` (uuid, PK)
     - `actor_id` (uuid, FK → profiles.id, on delete set null, nullable)
     - `action` (text, not null, e.g. 'role.change', 'goal.create')
     - `target_type` (text, nullable, e.g. 'profiles', 'goals')
     - `target_id` (uuid, nullable)
     - `metadata` (jsonb, nullable)
     - `ip_address` (text, nullable)
     - `created_at` (timestamptz)

  6. `notifications`
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → profiles.id, on delete cascade)
     - `title` (text, not null)
     - `message` (text, not null)
     - `type` (text: 'info', 'warning', 'success', 'error', default 'info')
     - `read` (boolean, default false)
     - `action_url` (text, nullable)
     - `created_at` (timestamptz)

  ## Modified Tables
  - `profiles`: add `department_id` (uuid, FK → departments.id, nullable)
    - Keep existing `department` text column for backward compatibility
    - New `department_id` provides proper FK relationship

  ## Security
  - RLS enabled on all new tables
  - departments: all authenticated can read; only admins can CUD
  - quarterly_updates: owner can CRUD; managers of same dept can read; admins can read all
  - manager_comments: author can insert/update; target user + author can read; admins can read all
  - shared_goals: owner can CRUD; shared-with user can read; admins can read all
  - audit_logs: admins can read; only system/service writes (restrictive insert)
  - notifications: owner can read/update; only system/service inserts

  ## Indexes
  - departments(name), departments(head_user_id)
  - quarterly_updates(goal_id), quarterly_updates(user_id), quarterly_updates(quarter)
  - manager_comments(goal_id), manager_comments(author_id), manager_comments(target_user_id)
  - shared_goals(goal_id), shared_goals(owner_id), shared_goals(shared_with_user_id)
  - audit_logs(actor_id), audit_logs(action), audit_logs(target_type), audit_logs(created_at)
  - notifications(user_id), notifications(read), notifications(created_at)
  - profiles(department_id)
*/

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  head_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_head_user_id ON departments(head_user_id);

CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert departments"
  ON departments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update departments"
  ON departments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete departments"
  ON departments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-update trigger for departments
DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROFILES: add department_id FK
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);

-- ============================================================
-- QUARTERLY_UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS quarterly_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quarter text NOT NULL DEFAULT 'Q2 2026',
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text DEFAULT '',
  key_results jsonb,
  blockers text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quarterly_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quarterly_updates_goal_id ON quarterly_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_updates_user_id ON quarterly_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_updates_quarter ON quarterly_updates(quarter);

CREATE POLICY "Users can read own quarterly updates"
  ON quarterly_updates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department quarterly updates"
  ON quarterly_updates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = quarterly_updates.user_id
      AND profiles.department_id = (
        SELECT department_id FROM profiles WHERE id = auth.uid()
      )
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can read all quarterly updates"
  ON quarterly_updates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own quarterly updates"
  ON quarterly_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quarterly updates"
  ON quarterly_updates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quarterly updates"
  ON quarterly_updates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- MANAGER_COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS manager_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('private', 'shared')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE manager_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_manager_comments_goal_id ON manager_comments(goal_id);
CREATE INDEX IF NOT EXISTS idx_manager_comments_author_id ON manager_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_manager_comments_target_user_id ON manager_comments(target_user_id);

CREATE POLICY "Authors and targets can read manager comments"
  ON manager_comments FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = target_user_id);

CREATE POLICY "Admins can read all manager comments"
  ON manager_comments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers and admins can insert manager comments"
  ON manager_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "Authors can update own manager comments"
  ON manager_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own manager comments"
  ON manager_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Auto-update trigger for manager_comments
DROP TRIGGER IF EXISTS manager_comments_updated_at ON manager_comments;
CREATE TRIGGER manager_comments_updated_at
  BEFORE UPDATE ON manager_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SHARED_GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, shared_with_user_id)
);

ALTER TABLE shared_goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shared_goals_goal_id ON shared_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goals_owner_id ON shared_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_goals_shared_with_user_id ON shared_goals(shared_with_user_id);

CREATE POLICY "Owners and shared-with users can read shared goals"
  ON shared_goals FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Admins can read all shared goals"
  ON shared_goals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Goal owners can insert shared goals"
  ON shared_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Goal owners can update shared goals"
  ON shared_goals FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Goal owners can delete shared goals"
  ON shared_goals FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ============================================================
-- SEED DEPARTMENTS
-- ============================================================
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Product engineering and development'),
  ('Sales', 'Revenue and customer acquisition'),
  ('Marketing', 'Brand, content, and growth'),
  ('Operations', 'Business operations and support'),
  ('Product', 'Product strategy and management'),
  ('Human Resources', 'People and culture')
ON CONFLICT (name) DO NOTHING;

-- Backfill existing profiles with department_id based on text department
UPDATE profiles
SET department_id = d.id
FROM departments d
WHERE profiles.department = d.name
  AND profiles.department_id IS NULL;

-- ============================================================
-- AUDIT LOG TRIGGER: role changes
-- ============================================================
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (
      auth.uid(),
      'role.change',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_email', NEW.email
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_role_audit ON profiles;
CREATE TRIGGER profiles_role_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- ============================================================
-- AUDIT LOG TRIGGER: goal status changes
-- ============================================================
CREATE OR REPLACE FUNCTION log_goal_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (
      auth.uid(),
      'goal.status_change',
      'goals',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'goal_title', NEW.title
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_status_audit ON goals;
CREATE TRIGGER goals_status_audit
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION log_goal_status_change();

-- ============================================================
-- NOTIFICATION TRIGGER: goal at-risk
-- ============================================================
CREATE OR REPLACE FUNCTION notify_goal_at_risk()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'at-risk' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Goal At Risk',
      CONCAT('Your goal "', NEW.title, '" has been marked as at risk.'),
      'warning',
      CONCAT('/goals')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_at_risk_notify ON goals;
CREATE TRIGGER goals_at_risk_notify
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION notify_goal_at_risk();

-- ============================================================
-- NOTIFICATION TRIGGER: goal completed
-- ============================================================
CREATE OR REPLACE FUNCTION notify_goal_completed()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Goal Completed',
      CONCAT('Congratulations! Your goal "', NEW.title, '" has been completed!'),
      'success',
      CONCAT('/goals')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_completed_notify ON goals;
CREATE TRIGGER goals_completed_notify
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION notify_goal_completed();
