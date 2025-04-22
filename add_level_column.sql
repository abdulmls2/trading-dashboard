-- SQL to add the level column to the profiles table
ALTER TABLE public.profiles ADD COLUMN level INTEGER;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.profiles.level IS 'User level (1, 2, or 3) indicating expertise or access level';

-- Create an index on the level column for faster queries
CREATE INDEX IF NOT EXISTS profiles_level_idx ON public.profiles USING btree (level);

-- Update existing rows to have NULL level by default
-- This step is optional as columns are NULL by default
-- UPDATE public.profiles SET level = NULL WHERE level IS NULL;

-- You can add a check constraint to ensure level is only 1, 2, or 3
ALTER TABLE public.profiles ADD CONSTRAINT profiles_level_check CHECK (level IS NULL OR level IN (1, 2, 3)); 