-- Create an RPC function to execute the webhook processing as an atomic transaction.
-- This ensures that if the update to the organizations table fails, the insertion
-- into processed_webhooks is completely rolled back, forcing a retry.

CREATE OR REPLACE FUNCTION public.process_creem_webhook_event(
  p_event_id text,
  p_org_id uuid,
  p_subscription_status text,
  p_subscription_tier text,
  p_creem_subscription_id text,
  p_event_created_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  -- 1. Idempotency Check: Attempt to insert into processed_webhooks
  BEGIN
    INSERT INTO public.processed_webhooks (event_id, processed_at)
    VALUES (p_event_id, now());
  EXCEPTION WHEN unique_violation THEN
    -- If already processed, return success immediately without error or updating
    RETURN jsonb_build_object('success', true, 'message', 'Event already processed');
  END;

  -- 2. Update the organizations table
  UPDATE public.organizations
  SET 
    subscription_status = p_subscription_status,
    subscription_tier = p_subscription_tier,
    creem_subscription_id = p_creem_subscription_id,
    creem_last_event_time = p_event_created_at
  WHERE id = p_org_id;

  -- 3. Verify that the organization was actually updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization with ID % not found', p_org_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
