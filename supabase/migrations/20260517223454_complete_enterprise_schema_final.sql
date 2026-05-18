/*
  # Complete Enterprise Schema — Final Version

  Drops all existing policies and recreates the full schema cleanly.
  Adds missing indexes, policies, and triggers for all 8 tables.

  ## Tables
  1. profiles — User profiles with role-based access
  2. departments — Organizational departments
  3. goals — User goals with status tracking
  4. quarterly_updates — Structured quarterly check-ins
  5. manager_comments — Manager feedback on goals
  6. shared_goals — Goal sharing with permissions
  7. audit_logs — Immutable audit trail
  8. notifications — User notifications

  ## Changes from prior migrations
  - Drops and recreates all RLS policies for consistency
  - Adds missing indexes on profiles(role), profiles(email), goals(category), goals(due_date)
  - Adds partial index on notifications(user_id, read) WHERE read = false
  - Adds department_id FK to profiles
  - Seeds 6 departments
  - Adds 4 automation triggers (role audit, status audit, at-risk notify, completed notify)
*/

-- ============================================================
-- DROP EXISTING POLICIES (safe — errors ignored if not found)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADD department_id TO profiles IF MISSING
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

-- ============================================================
-- ADD MISSING INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_due_date ON goals(due_date);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_head_user_id ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_updates_goal_id ON quarterly_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_updates_user_id ON quarterly_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_updates_quarter ON quarterly_updates(quarter);
CREATE INDEX IF NOT EXISTS idx_manager_comments_goal_id ON manager_comments(goal_id);
CREATE INDEX IF NOT EXISTS idx_manager_comments_author_id ON manager_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_manager_comments_target_user_id ON manager_comments(target_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_goals_goal_id ON shared_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_shared_goals_owner_id ON shared_goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_goals_shared_with_user_id ON shared_goals(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================================
-- 1. PROFILES — RLS Policies
-- ============================================================
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Managers can read department profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'admin')
      AND p.department_id = profiles.department_id
    )
  );

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. DEPARTMENTS — RLS Policies
-- ============================================================
CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. GOALS — RLS Policies
-- ============================================================
CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = goals.user_id
      AND profiles.department_id = (
        SELECT department_id FROM profiles WHERE id = auth.uid()
      )
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can read all goals"
  ON goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. QUARTERLY_UPDATES — RLS Policies
-- ============================================================
CREATE POLICY "Users can read own quarterly updates"
  ON quarterly_updates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department quarterly updates"
  ON quarterly_updates FOR SELECT
  TO authenticated
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
  ON quarterly_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own quarterly updates"
  ON quarterly_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quarterly updates"
  ON quarterly_updates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quarterly updates"
  ON quarterly_updates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. MANAGER_COMMENTS — RLS Policies
-- ============================================================
CREATE POLICY "Authors and targets can read manager comments"
  ON manager_comments FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = target_user_id);

CREATE POLICY "Admins can read all manager comments"
  ON manager_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers and admins can insert manager comments"
  ON manager_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "Authors can update own manager comments"
  ON manager_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own manager comments"
  ON manager_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ============================================================
-- 6. SHARED_GOALS — RLS Policies
-- ============================================================
CREATE POLICY "Owners and shared-with users can read shared goals"
  ON shared_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Admins can read all shared goals"
  ON shared_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Goal owners can insert shared goals"
  ON shared_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Goal owners can update shared goals"
  ON shared_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Goal owners can delete shared goals"
  ON shared_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================
-- 7. AUDIT_LOGS — RLS Policies
-- ============================================================
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers and admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ============================================================
-- 8. NOTIFICATIONS — RLS Policies
-- ============================================================
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ============================================================
-- SEED: Departments
-- ============================================================
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Product engineering and development'),
  ('Sales', 'Revenue and customer acquisition'),
  ('Marketing', 'Brand, content, and growth'),
  ('Operations', 'Business operations and support'),
  ('Product', 'Product strategy and management'),
  ('Human Resources', 'People and culture')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TRIGGERS: updated_at auto-timestamp
-- ============================================================
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS departments_updated_at ON departments;
CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS manager_comments_updated_at ON manager_comments;
CREATE TRIGGER manager_comments_updated_at
  BEFORE UPDATE ON manager_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Audit role changes
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
-- TRIGGER: Audit goal status changes
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
-- TRIGGER: Notify on goal at-risk
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
      '/goals'
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
-- TRIGGER: Notify on goal completed
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
      '/goals'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_completed_notify ON goals;
CREATE TRIGGER goals_completed_notify
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION notify_goal_completed();
