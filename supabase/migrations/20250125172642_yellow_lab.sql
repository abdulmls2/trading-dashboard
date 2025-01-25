/*
  # Create trades table and setup RLS policies

  1. New Tables
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `date` (date)
      - `time` (time)
      - `pair` (text)
      - `action` (text)
      - `entry_time` (time)
      - `exit_time` (time)
      - `lots` (numeric)
      - `pip_stop_loss` (integer)
      - `pip_take_profit` (integer)
      - `profit_loss` (numeric)
      - `pivots` (text)
      - `banking_level` (text)
      - `risk_ratio` (numeric)
      - `comments` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on trades table
    - Add policies for:
      - Users can read their own trades
      - Users can insert their own trades
      - Users can update their own trades
      - Users can delete their own trades
*/

CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  pair text NOT NULL,
  action text NOT NULL CHECK (action IN ('Buy', 'Sell')),
  entry_time time NOT NULL,
  exit_time time NOT NULL,
  lots numeric NOT NULL CHECK (lots > 0),
  pip_stop_loss integer NOT NULL,
  pip_take_profit integer NOT NULL,
  profit_loss numeric NOT NULL,
  pivots text,
  banking_level text,
  risk_ratio numeric NOT NULL,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX trades_user_id_idx ON trades(user_id);
CREATE INDEX trades_date_idx ON trades(date);