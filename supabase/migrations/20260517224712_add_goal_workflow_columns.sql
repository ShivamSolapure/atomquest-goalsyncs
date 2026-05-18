/*
  # Add goal workflow columns: weight, approval_status, is_locked, planned_achievement, actual_achievement

  ## Changes to `goals` table
  - `weight` (integer, default 0, check 0-100): Percentage weightage for the goal
  - `approval_status` (text, default 'draft', check: draft/pending/approved/rejected/returned):
    - draft: employee is still editing
    - pending: submitted for manager approval
    - approved: manager approved (goal is locked)
    - rejected: manager rejected
    - returned: manager returned for rework
  - `is_locked` (boolean, default false): When approved, goal becomes locked
  - `planned_achievement` (integer, default 0, check 0-100): Planned achievement percentage
  - `actual_achievement` (integer, default 0, check 0-100): Actual achievement percentage
  - `manager_feedback` (text, default ''): Latest manager feedback on this goal

  ## New RLS policies for goals
  - Managers can update approval_status and is_locked for goals in their department
  - Employees can only update goals that are not locked

  ## New index
  - goals(approval_status)
*/

-- Add columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'weight') THEN
    ALTER TABLE goals ADD COLUMN weight integer NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'approval_status') THEN
    ALTER TABLE goals ADD COLUMN approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected', 'returned'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'is_locked') THEN
    ALTER TABLE goals ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'planned_achievement') THEN
    ALTER TABLE goals ADD COLUMN planned_achievement integer NOT NULL DEFAULT 0 CHECK (planned_achievement >= 0 AND planned_achievement <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'actual_achievement') THEN
    ALTER TABLE goals ADD COLUMN actual_achievement integer NOT NULL DEFAULT 0 CHECK (actual_achievement >= 0 AND actual_achievement <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'manager_feedback') THEN
    ALTER TABLE goals ADD COLUMN manager_feedback text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Update status check constraint to include new statuses
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE goals ADD CONSTRAINT goals_status_check CHECK (status IN ('not-started', 'on-track', 'completed', 'behind'));

-- Update existing rows from old statuses to new ones
UPDATE goals SET status = 'not-started' WHERE status = 'at-risk';

-- Index for approval_status queries
CREATE INDEX IF NOT EXISTS idx_goals_approval_status ON goals(approval_status);

-- Drop old goal update policies and recreate with locked-goal protection
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own unlocked goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND (NOT is_locked OR approval_status = 'returned'))
  WITH CHECK (auth.uid() = user_id);

-- Managers can update approval fields for department goals
CREATE POLICY "Managers can update approval for department goals"
  ON goals FOR UPDATE
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = goals.user_id
      AND profiles.department_id = (
        SELECT department_id FROM profiles WHERE id = auth.uid()
      )
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
    )
  );

-- Trigger: auto-lock goal when approved
CREATE OR REPLACE FUNCTION lock_approved_goal()
RETURNS trigger AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    NEW.is_locked := true;
  END IF;
  IF NEW.approval_status = 'returned' THEN
    NEW.is_locked := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_lock_on_approve ON goals;
CREATE TRIGGER goals_lock_on_approve
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION lock_approved_goal();

-- Trigger: audit approval status changes
CREATE OR REPLACE FUNCTION log_approval_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (
      auth.uid(),
      'goal.approval_change',
      'goals',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.approval_status,
        'new_status', NEW.approval_status,
        'goal_title', NEW.title
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_approval_audit ON goals;
CREATE TRIGGER goals_approval_audit
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION log_approval_change();

-- Trigger: notify on approval/rejection
CREATE OR REPLACE FUNCTION notify_goal_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Goal Approved',
      CONCAT('Your goal "', NEW.title, '" has been approved by your manager.'),
      'success',
      '/goals'
    );
  ELSIF NEW.approval_status = 'rejected' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Goal Rejected',
      CONCAT('Your goal "', NEW.title, '" has been rejected. Please review and resubmit.'),
      'error',
      '/goals'
    );
  ELSIF NEW.approval_status = 'returned' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Goal Returned for Rework',
      CONCAT('Your goal "', NEW.title, '" has been returned for rework. Please update and resubmit.'),
      'warning',
      '/goals'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS goals_approval_notify ON goals;
CREATE TRIGGER goals_approval_notify
  AFTER UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION notify_goal_approval();
