/*
  # Create cell_customizations table and setup RLS policies

  1. New Tables
    - `cell_customizations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `trade_id` (uuid, references trades)
      - `column_key` (text)
      - `background_color` (text)
      - `text_color` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on cell_customizations table
    - Add policies for:
      - Users can read their own customizations
      - Users can insert their own customizations
      - Users can update their own customizations
      - Users can delete their own customizations
      - Admin users can view all customizations
*/

CREATE TABLE cell_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  trade_id uuid REFERENCES trades NOT NULL,
  column_key text NOT NULL,
  background_color text,
  text_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trade_id, column_key)
);

-- Enable RLS
ALTER TABLE cell_customizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own cell customizations"
  ON cell_customizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin users can view all customizations"
  ON cell_customizations
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Users can insert own cell customizations"
  ON cell_customizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cell customizations"
  ON cell_customizations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cell customizations"
  ON cell_customizations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX cell_customizations_user_id_idx ON cell_customizations(user_id);
CREATE INDEX cell_customizations_trade_id_idx ON cell_customizations(trade_id);
CREATE INDEX cell_customizations_user_trade_idx ON cell_customizations(user_id, trade_id);

-- Create the updated_at function and trigger directly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_cell_customizations_updated_at
  BEFORE UPDATE
  ON cell_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 