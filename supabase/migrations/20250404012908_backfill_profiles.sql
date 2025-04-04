-- Backfill profiles for existing users
INSERT INTO profiles (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT (user_id) DO NOTHING;
