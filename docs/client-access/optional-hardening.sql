-- OPTIONAL defence in depth for client access. NOT part of supabase/migrations/20261120150000_client_access.sql and NOT applied.
-- Why: the existing owner policies test only the email in the token. A client token can never carry the owner's email (the server refuses to make a
-- client login for it, Supabase Auth keeps emails unique, and tokens cannot be forged without the project's JWT secret), so isolation does not depend
-- on this file. This adds a second lock: RESTRICTIVE policies that refuse any token whose app_metadata.role is 'client' on every owner table.
-- It CHANGES the policy set of existing tables, which the migration deliberately does not, so it needs its own approval and a branch rehearsal.
-- Rollback: drop policy "no client role" on each table listed here.
do $$ declare t text; begin
  foreach t in array array['client_workbooks','client_portals','client_answers','client_videos','client_quotes','quote_acceptances','leads','business_details'] loop
    execute format($f$create policy "no client role" on public.%I as restrictive for all to public
      using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'client')
      with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'client')$f$, t);
  end loop;
end $$;
-- storage.objects (bucket client-videos) needs the same, written separately because it is in the storage schema:
-- create policy "no client role" on storage.objects as restrictive for all to public
--   using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'client')
--   with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') <> 'client');
