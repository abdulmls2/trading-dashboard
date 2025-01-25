/*
  # Create performance metrics table and setup RLS policies

  1. New Tables
    - `performance_metrics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `total_trades` (integer)
      - `win_rate` (numeric)
      - `average_rrr` (numeric)
      - `total_profit_loss` (numeric)
      - `month` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on performance_metrics table
    - Add policies for:
      - Users can read their own metrics
      - Users can upsert their own metrics
*/

CREATE TABLE performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  total_trades integer NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  average_rrr numeric NOT NULL DEFAULT 0,
  total_profit_loss numeric NOT NULL DEFAULT 0,
  month date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own metrics"
  ON performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON performance_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX performance_metrics_user_id_idx ON performance_metrics(user_id);
CREATE INDEX performance_metrics_month_idx ON performance_metrics(month);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_metrics_updated_at
  BEFORE UPDATE
  ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();