-- Update existing profiles with emails from auth.users
UPDATE profiles 
SET email = auth.users.email 
FROM auth.users 
WHERE profiles.user_id = auth.users.id;
