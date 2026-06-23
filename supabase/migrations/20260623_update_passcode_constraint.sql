-- Drop the old constraint enforcing 6-digit numeric codes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS enforce_six_digit_numeric_code;

-- Add a new check constraint enforcing the alphanumeric readable rules (6-10 characters)
ALTER TABLE public.profiles ADD CONSTRAINT enforce_crew_passcode_rules
  CHECK (crew_passcode IS NULL OR crew_passcode ~ '^[ACDEFGHJKLMNPQRTUVWXY34679]{6,10}$');
