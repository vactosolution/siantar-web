ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS last_location_update timestamptz;
