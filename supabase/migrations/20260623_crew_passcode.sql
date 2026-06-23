-- Add crew_passcode column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_passcode text UNIQUE;

-- Create an index to make looking up passcodes fast
CREATE INDEX IF NOT EXISTS profiles_crew_passcode_idx ON public.profiles(crew_passcode);
