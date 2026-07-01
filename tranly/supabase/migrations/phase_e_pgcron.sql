-- Phase E: schedule nightly cleanup of old conversation messages.
-- Apply manually (requires the pg_cron extension enabled on the project).
--
--   create extension if not exists pg_cron;

-- ลบ conversation_messages เก่ากว่า 3 วัน ทุกคืนเที่ยงคืน
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 0 * * *',
  $$
    DELETE FROM conversation_messages
    WHERE created_at < NOW() - INTERVAL '3 days';
  $$
);
