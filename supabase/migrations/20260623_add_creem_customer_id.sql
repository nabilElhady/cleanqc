-- Add creem_customer_id column to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS creem_customer_id text;

CREATE INDEX IF NOT EXISTS idx_organizations_creem_customer_id
  ON public.organizations(creem_customer_id);

-- Drop old versions of the webhook RPC
DROP FUNCTION IF EXISTS public.process_creem_webhook_event(text, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.process_creem_webhook_event(text, uuid, text, text, text, timestamp with time zone);

-- Recreate the RPC to also accept and store creem_customer_id
CREATE OR REPLACE FUNCTION public.process_creem_webhook_event(
  p_event_id text,
  p_org_id uuid,
  p_subscription_status text,
  p_subscription_tier text,
  p_creem_subscription_id text,
  p_event_created_at text,
  p_creem_customer_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parsed_date timestamp with time zone;
BEGIN
  -- Parse the date safely
  BEGIN
    v_parsed_date := p_event_created_at::timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    v_parsed_date := now();
  END;

  -- 1. Idempotency Check
  BEGIN
    INSERT INTO public.processed_webhooks (event_id, processed_at)
    VALUES (p_event_id, now());
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'message', 'Event already processed');
  END;

  -- 2. Update the organizations table (store customer_id if provided)
  UPDATE public.organizations
  SET
    subscription_status    = p_subscription_status,
    subscription_tier      = p_subscription_tier,
    creem_subscription_id  = p_creem_subscription_id,
    creem_customer_id      = COALESCE(p_creem_customer_id, creem_customer_id),
    creem_last_event_time  = v_parsed_date
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization with ID % not found', p_org_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
