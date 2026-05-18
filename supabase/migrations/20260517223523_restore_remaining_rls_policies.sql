/*
  # Restore RLS policies for tables affected by bulk policy drop

  The previous migration dropped ALL policies across all public tables.
  This restores policies for: achievements, goal_updates, kpis, user_achievements
*/

-- achievements
CREATE POLICY "Authenticated users can read achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update achievements"
  ON achievements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- goal_updates
CREATE POLICY "Users can read own goal updates"
  ON goal_updates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read updates on their goals"
  ON goal_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_updates.goal_id AND goals.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own goal updates"
  ON goal_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal updates"
  ON goal_updates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- kpis
CREATE POLICY "Users can read own kpis"
  ON kpis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can read department kpis"
  ON kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = kpis.user_id
      AND profiles.department_id = (
        SELECT department_id FROM profiles WHERE id = auth.uid()
      )
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
    )
  );

CREATE POLICY "Admins can read all kpis"
  ON kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own kpis"
  ON kpis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kpis"
  ON kpis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kpis"
  ON kpis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- user_achievements
CREATE POLICY "Users can read own user achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all user achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own user achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
