-- RLS Policies for Trading Dashboard

-- Make sure RLS is enabled for each table in the Supabase UI first!

-- ----------------------------------------
-- Table: trading_accounts
-- ----------------------------------------

-- Allow users to select their own accounts
CREATE POLICY "Allow SELECT for own accounts" 
ON public.trading_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own accounts
CREATE POLICY "Allow INSERT for own accounts" 
ON public.trading_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own accounts
CREATE POLICY "Allow UPDATE for own accounts" 
ON public.trading_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own accounts
CREATE POLICY "Allow DELETE for own accounts" 
ON public.trading_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- ----------------------------------------
-- Table: trades
-- ----------------------------------------

-- Allow users to select their own trades
CREATE POLICY "Allow SELECT for own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own trades
CREATE POLICY "Allow INSERT for own trades" 
ON public.trades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own trades
CREATE POLICY "Allow UPDATE for own trades" 
ON public.trades 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own trades
CREATE POLICY "Allow DELETE for own trades" 
ON public.trades 
FOR DELETE 
USING (auth.uid() = user_id);

-- ----------------------------------------
-- Table: performance_metrics
-- ----------------------------------------

-- Allow users to select their own metrics
CREATE POLICY "Allow SELECT for own metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own metrics (or update via upsert)
CREATE POLICY "Allow INSERT for own metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own metrics (used by upsert)
CREATE POLICY "Allow UPDATE for own metrics" 
ON public.performance_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Note: Deletion of metrics might not be typical, omitting DELETE policy for now.

-- ----------------------------------------
-- Table: cell_customizations
-- ----------------------------------------

-- Allow users to select their own customizations
CREATE POLICY "Allow SELECT for own cell customizations" 
ON public.cell_customizations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own customizations
CREATE POLICY "Allow INSERT for own cell customizations" 
ON public.cell_customizations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own customizations
CREATE POLICY "Allow UPDATE for own cell customizations" 
ON public.cell_customizations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own customizations
CREATE POLICY "Allow DELETE for own cell customizations" 
ON public.cell_customizations 
FOR DELETE 
USING (auth.uid() = user_id);

-- ----------------------------------------
-- Table: user_trading_rules
-- ----------------------------------------

-- Allow users to select their own rules
CREATE POLICY "Allow SELECT for own trading rules" 
ON public.user_trading_rules 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own rules
CREATE POLICY "Allow INSERT for own trading rules" 
ON public.user_trading_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rules
CREATE POLICY "Allow UPDATE for own trading rules" 
ON public.user_trading_rules 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own rules
CREATE POLICY "Allow DELETE for own trading rules" 
ON public.user_trading_rules 
FOR DELETE 
USING (auth.uid() = user_id);

-- ----------------------------------------
-- Table: trade_violations
-- ----------------------------------------

-- Allow users to select their own violations
CREATE POLICY "Allow SELECT for own violations" 
ON public.trade_violations 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow insert of violations if the user_id matches the inserter
-- (Violations are typically created by backend functions triggered by trade creation/update)
CREATE POLICY "Allow INSERT for own violations" 
ON public.trade_violations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update the 'acknowledged' status of their own violations
CREATE POLICY "Allow UPDATE for own violation acknowledgment" 
ON public.trade_violations 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 
-- Optionally restrict columns: USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND only 'acknowledged' column is being updated) - More complex SQL needed

-- Allow users to delete their own violations (Consider if this should be admin-only)
CREATE POLICY "Allow DELETE for own violations" 
ON public.trade_violations 
FOR DELETE 
USING (auth.uid() = user_id);

-- ----------------------------------------
-- Table: profiles
-- ----------------------------------------

-- Allow users to select their own profile
CREATE POLICY "Allow SELECT for own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow UPDATE for own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Note: INSERT/DELETE on profiles is usually handled differently (e.g., triggers, admin actions), 
-- so policies are omitted here. 