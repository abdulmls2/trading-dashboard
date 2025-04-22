-- SQL commands to run in the Supabase SQL Editor to update the performance_metrics table

-- Since the account_id column already exists, we only need to:
-- 1. Drop the existing unique constraint
ALTER TABLE performance_metrics 
DROP CONSTRAINT IF EXISTS performance_metrics_user_id_month_key;

-- 2. Create a new unique constraint that includes account_id
ALTER TABLE performance_metrics 
ADD CONSTRAINT performance_metrics_user_id_month_account_id_key 
UNIQUE (user_id, month, account_id);

-- 3. Update existing records to link to default accounts if needed
WITH default_accounts AS (
  SELECT user_id, id AS account_id
  FROM trading_accounts
  WHERE is_default = true
)
UPDATE performance_metrics pm
SET account_id = da.account_id
FROM default_accounts da
WHERE pm.user_id = da.user_id
AND pm.account_id IS NULL; 