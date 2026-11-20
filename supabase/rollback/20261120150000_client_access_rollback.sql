-- Rollback for 20261120150000_client_access.sql. Removes only what that migration created. Existing tables and policies are untouched.
-- WARNING: dropping client_accounts removes the mapping, so every client login stops working at once. The Auth users themselves
-- (auth.users) are not deleted here: delete them in the Supabase dashboard (Authentication, Users) or with the Admin API.
drop function if exists public.client_quote_accept(uuid, text, text);
drop function if exists public.client_quote(uuid);
drop function if exists public.client_save(jsonb, boolean);
drop function if exists public.client_open();
drop function if exists public.client_whoami();
drop function if exists public.client_ctx();
drop function if exists public.client_rate_hit(text, int, int);
drop table if exists public.client_access_rate;
drop table if exists public.client_access_log;
drop function if exists public.client_access_log_lock();
drop table if exists public.client_accounts;
