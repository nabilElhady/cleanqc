-- PHASE 8: Immutable Database Audit Logging

-- 1. Create the admin_audit_log table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  actor_id uuid, -- Automatically captures auth.uid()
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Create an index for faster filtering in the dashboard
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.admin_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.admin_audit_log(actor_id);

-- Enforce strict immutability at the Row Level Security (RLS) layer
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Ensure that NO ONE (not even authenticated users or managers) can tamper with the logs from the frontend API.
-- (The Supabase dashboard bypasses RLS, so you can still view logs there).
DROP POLICY IF EXISTS "Deny all edits to audit log" ON public.admin_audit_log;
CREATE POLICY "Deny all edits to audit log" ON public.admin_audit_log
FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);

-- 2. Create the Trigger Function
-- SECURITY DEFINER ensures the function can write to admin_audit_log even if RLS blocks the user.
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_actor_id uuid;
  target_record_id text;
BEGIN
  -- Extract the user ID from the Supabase JWT session
  extracted_actor_id := auth.uid();
  
  -- Record based on the operation type
  IF (TG_OP = 'DELETE') THEN
    target_record_id := OLD.id::text;
    INSERT INTO public.admin_audit_log (table_name, record_id, action, old_data, new_data, actor_id)
    VALUES (TG_TABLE_NAME::text, target_record_id, TG_OP, row_to_json(OLD)::jsonb, null, extracted_actor_id);
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    target_record_id := NEW.id::text;
    -- Optimization: Only log updates if the data actually changed
    IF row_to_json(OLD)::jsonb != row_to_json(NEW)::jsonb THEN
      INSERT INTO public.admin_audit_log (table_name, record_id, action, old_data, new_data, actor_id)
      VALUES (TG_TABLE_NAME::text, target_record_id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, extracted_actor_id);
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    target_record_id := NEW.id::text;
    INSERT INTO public.admin_audit_log (table_name, record_id, action, old_data, new_data, actor_id)
    VALUES (TG_TABLE_NAME::text, target_record_id, TG_OP, null, row_to_json(NEW)::jsonb, extracted_actor_id);
    RETURN NEW;

  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the Trigger to High-Value Transaction Tables

-- A. Track all Jobs (Creation, Dispatch, Completion)
DROP TRIGGER IF EXISTS audit_jobs_trigger ON public.jobs;
CREATE TRIGGER audit_jobs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- B. Track all Checklist Templates (Blueprint modifications)
DROP TRIGGER IF EXISTS audit_templates_trigger ON public.checklist_templates;
CREATE TRIGGER audit_templates_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- C. Track all Profiles (Role escalations, user suspensions)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
