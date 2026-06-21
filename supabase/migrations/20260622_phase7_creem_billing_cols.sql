-- PHASE 7: Prepare Organizations Table for Creem

ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS creem_subscription_id text,
  ADD COLUMN IF NOT EXISTS creem_status text,
  ADD COLUMN IF NOT EXISTS creem_last_event_time timestamp with time zone;

-- Optional but recommended: index the subscription_id for faster webhook processing
CREATE INDEX IF NOT EXISTS idx_organizations_creem_subscription_id ON public.organizations(creem_subscription_id);
