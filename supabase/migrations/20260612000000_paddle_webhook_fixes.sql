-- 1. Create the processed_webhooks table for idempotency
CREATE TABLE IF NOT EXISTS processed_webhooks (
    event_id TEXT PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add the paddle_last_event_time column for Occurred_At ordering
ALTER TABLE organizations
ADD COLUMN paddle_last_event_time TIMESTAMPTZ DEFAULT NULL;
