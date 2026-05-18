/*
  # Create goals, kpis, goal_updates, achievements, and user_achievements tables

  1. New Tables
    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `category` (text)
      - `priority` (text: 'low', 'medium', 'high')
      - `status` (text: 'on-track', 'at-risk', 'completed', 'behind')
      - `progress` (integer, 0-100)
      - `due_date` (date)
      - `quarter` (text, e.g. 'Q2 2026')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `kpis`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `category` (text)
      - `current_value` (text)
      - `target_value` (text)
      - `unit` (text)
      - `progress` (integer, 0-100)
      - `trend` (text: 'up', 'down', 'neutral')
      - `change` (text)
      - `quarter` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `goal_updates`
      - `id` (uuid, primary key)
      - `goal_id` (uuid, references goals)
      - `user_id` (uuid, references profiles)
      - `note` (text)
      - `progress` (integer)
      - `created_at` (timestamptz)

    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `icon_key` (text)
      - `color` (text)
      - `created_at` (timestamptz)

    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `achievement_id` (uuid, references achievements)
      - `earned_at` (timestamptz)
      - UNIQUE(user_id, achievement_id)

  2. Security
    - Enable RLS on all tables
    - Users can CRUD their own goals, kpis, goal_updates, user_achievements
    - Managers can read goals/kpis of users in their department
    - Admins can read/write all data
    - Achievements are readable by all authenticated users
    - Only admins can insert/update achievements

  3. Indexes
    - goals(user_id), goals(status), goals(quarter)
    - kpis(user_id), kpis(category)
    - goal_updates(goal_id)
    - user_achievements(user_id)
*/

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'completed', 'behind')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date date,
  quarter text NOT NULL DEFAULT 'Q2 2026',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_quarter ON goals(quarter);

CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department goals"
  ON goals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = goals.user_id
      AND profiles.department = (
        SELECT department FROM profiles WHERE id = auth.uid()
      )
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can read all goals"
  ON goals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- KPIs
CREATE TABLE IF NOT EXISTS kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  current_value text NOT NULL DEFAULT '',
  target_value text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  trend text NOT NULL DEFAULT 'neutral' CHECK (trend IN ('up', 'down', 'neutral')),
  change text NOT NULL DEFAULT '0',
  quarter text NOT NULL DEFAULT 'Q2 2026',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kpis_user_id ON kpis(user_id);
CREATE INDEX IF NOT EXISTS idx_kpis_category ON kpis(category);

CREATE POLICY "Users can read own kpis"
  ON kpis FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department kpis"
  ON kpis FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = kpis.user_id
      AND profiles.department = (
        SELECT department FROM profiles WHERE id = auth.uid()
      )
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can read all kpis"
  ON kpis FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own kpis"
  ON kpis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kpis"
  ON kpis FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kpis"
  ON kpis FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Goal updates
CREATE TABLE IF NOT EXISTS goal_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_goal_updates_goal_id ON goal_updates(goal_id);

CREATE POLICY "Users can read own goal updates"
  ON goal_updates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read updates on their goals"
  ON goal_updates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_updates.goal_id AND goals.user_id = auth.uid())
  );

CREATE POLICY "Users can insert updates on their goals"
  ON goal_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal updates"
  ON goal_updates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon_key text NOT NULL DEFAULT 'award',
  color text NOT NULL DEFAULT 'teal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read achievements"
  ON achievements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert achievements"
  ON achievements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update achievements"
  ON achievements FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all user achievements"
  ON user_achievements FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS kpis_updated_at ON kpis;
CREATE TRIGGER kpis_updated_at
  BEFORE UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed achievements
INSERT INTO achievements (name, description, icon_key, color) VALUES
  ('Goal Crusher', 'Completed 10 goals in a quarter', 'trophy', 'amber'),
  ('KPI Superstar', 'Maintained 90%+ KPI score for 3 months', 'star', 'teal'),
  ('First Goal', 'Set your first organizational goal', 'target', 'blue'),
  ('Fast Mover', 'Completed a goal 30 days early', 'zap', 'green'),
  ('Trend Setter', 'KPI improved 3 quarters in a row', 'trending-up', 'gray'),
  ('Peer Champion', 'Recognized by 5 teammates', 'award', 'gray')
ON CONFLICT (name) DO NOTHING;
