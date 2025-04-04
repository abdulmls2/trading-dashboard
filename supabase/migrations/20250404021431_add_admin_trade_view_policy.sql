-- Add policy for admins to view all trades
CREATE POLICY "Admins can view all trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Also add similar policy for performance_metrics to allow admins to view all metrics
CREATE POLICY "Admins can view all metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
  );
