-- Add email as a computed column that references auth.users
ALTER TABLE profiles ADD COLUMN email text GENERATED ALWAYS AS (
  (SELECT email FROM auth.users WHERE id = user_id)
) STORED;

-- Create an index on email for better query performance
CREATE INDEX profiles_email_idx ON profiles(email);
