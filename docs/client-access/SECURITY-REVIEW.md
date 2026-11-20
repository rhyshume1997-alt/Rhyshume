# Security review: Option B (client login with a temporary password)

Written as a hostile reviewer, after building it. "Ran" means a test in this repo did it and the result is recorded; "by reading" means I traced the code
but did not run an attack; "not verified" means it depends on real Supabase behaviour I could not test. Option A (email the link) has its own review.

Evidence: `node --test` 319 tests; `tools/client-access-db/run.mjs` 76 checks on a PGlite copy of the live schema (`docs/client-access/evidence/db-test-output.txt`);
mocked Playwright: client page 48, workbook panel 34, plus the Option A panel 32 and the existing meeting suites on the rebuilt workbook (meeting 69, grant 100, hosted check 0 fails).
Everything external (Supabase Auth, Cloudflare, Resend) is a stub or mock. Nothing was applied to the live project; live metadata was read with SELECT only.

## Attacks tried

| # | Attack | Result |
|---|---|---|
| 1 | Client with a pending password change reads, inserts, updates, deletes or truncates on every table (11 tables, 55 attempts), and calls every client function and every owner function | all denied; `client_whoami` returns only a state word (ran, database) |
| 2 | Token says change done but the account row says pending (stale or forged token); flag missing from token; flag as the string "false" | denied (ran) |
| 3 | Expired temporary password: sign in works at Supabase, then everything | database denies, page shows "expired", change route answers 403 `expired` (ran, DB, unit, browser) |
| 4 | After the change: client A reads or writes anything of client B, asks for B's quote, accepts B's quote, reads `client_workbooks` (price book, internal notes), `client_portals`, `client_answers`, `leads`, `business_details`, videos, the new tables, owner functions, internal helpers | all denied; A sees only A's name, answers and quote; save keeps only the four answer groups; B untouched (ran) |
| 5 | Forged claims: role only in `user_metadata`; `app_metadata.role` admin or owner; postgres role claim service_role; changed email; unknown or garbage subject; no `iat`; temp date in the past or garbage; no claims; claims not an object | all denied (ran) |
| 6 | `anon` role with a client's claims, anon on every table and function | denied (ran) |
| 7 | Disabled client with a live token; reset (epoch bump) with an old token | denied at once (ran) |
| 8 | A client token that carried the owner's email would satisfy the owner policy (existing policies check email only) | TRUE for the existing policies (ran, shown on purpose). Why it cannot happen: the server refuses the owner address for a client login, and the table constraint refuses it too (ran); Auth keeps emails unique; a token cannot be forged without the project JWT secret. Defence in depth: `optional-hardening.sql` adds restrictive policies; with it that token reads nothing and the owner still works (ran) |
| 9 | Email lookalikes for the owner: plus addressing, dots, case, padding, unicode, suffixes | refused by the exact, lower-cased, constant-time compare in the owner check (ran, unit) |
| 10 | Owner path used by a client token or another user | 401 or 403, no Admin API call made (ran) |
| 11 | Account email not lower case or padded; owner email as account email; two logins for one client; pending change without expiry | rejected by constraints (ran) |
| 12 | Tamper with the audit log (update, delete, truncate, even as service role); unknown action; oversized detail | refused (ran) |
| 13 | Browser roles calling the rate counter or `client_ctx` | permission denied (ran) |
| 14 | Existing tables, policies, grants, triggers, indexes, constraints and functions changed by the migration | byte-identical before, after, after rollback and after re-apply (ran) |
| 15 | Forced change bypass: call the data function directly with the pending token; change the address hash; no Turnstile; bad Turnstile; no or junk token; owner token; other client's token; disabled; email changed; not pending; weak, common, short, email-built, same as temporary, non-string passwords; expired temp | all refused; users and accounts unchanged (ran, unit, and browser with a mock of the database gate) |
| 16 | Direct Auth call `PUT /auth/v1/user` by the client to set their own password without my route | cannot clear the flag (it is in `app_metadata` and the account row, neither editable by the client), so data stays denied; the route still rejects any password that already works, so the final password always passes the rules (by reading) |
| 17 | Client changes their login email | token email no longer matches the account, so they lock themselves out; cannot reach another account (ran, DB) |
| 18 | Temporary password leaking: into logs, the audit log, the account row, the status response, a second response, local or session storage, the console, workbook data, or the info email | appears only in the create or reset response (and in the separate password email if Rhys opts in); the info email carries neither the password nor the private link (ran, unit and browser) |
| 19 | Create or reset when the counter or the account table cannot be read | refuses (ran) |
| 20 | Email enumeration | create answers the same `cannot_create` for an existing address, the owner address and any Auth failure; sign in page says the same sentence for wrong password and unknown email (ran, browser) |
| 21 | No service role key / no owner address / no Turnstile secret | every route answers 503 `not_set_up` and makes no outbound call (ran) |
| 22 | Rate limits: create (10 an hour, 5 a day per client), other owner changes, change attempts per address and per client; counter outage | 429, and refusal on outage (ran, against a fake counter; the real SQL counter ran in the DB test) |
| 23 | Cross site: CORS headers, GET, non JSON, oversized body | none, 405, 415, capped at 4 KB (ran) |
| 24 | Clickjacking and caching of the client page | `X-Frame-Options: DENY`, `no-store`, noindex via header and meta (vercel.json block; the headers themselves are not exercised locally, by reading) |
| 25 | Public client page: sign in does not reveal a role; an owner or non-client sign in on `/client/` | generic message, loads nothing (ran, browser) |

## Found and fixed during this review
- Existing live tables grant `TRUNCATE` (and REFERENCES, TRIGGER) to `anon` (client_answers, client_portals, client_videos, client_workbooks, leads) and to `authenticated` on all eight. RLS does not stop TRUNCATE. The REST API has no truncate call, so this is reachable only over a direct database connection with the anon or authenticated role, which Supabase does not expose publicly. Pre-existing, **not changed by this work**; recommended separate migration: `revoke truncate, references, trigger on ... from anon, authenticated`. New tables get no such grants (tested).
- The audit trigger function was executable by PUBLIC in the first draft: revoked.
- Password rule missed keyboard runs such as `qwertyuiop12`: added substring checks, mirrored in the page.
- Meta CSP `frame-ancestors` is ignored by browsers: removed, the header does that job.
- Temporary password has a small, deliberate skew toward digits because an "at least one digit" rule is applied by redrawing; entropy stays about 88 bits.

## Residual risks
1. **The temporary password travels by a channel Rhys chooses.** Phone or text can be intercepted, a text can be seen on a lock screen; email is worse and is gated behind an explicit warning and a log entry. Valid for 7 days.
2. **A leaked temporary password inside its window** lets someone sign in first, set the password, and lock the client out (they would tell Rhys; Reset fixes it and the audit log shows the change). If the real client changes first, the attacker's session must die: the route calls global sign out, but **I could not verify that real Supabase revokes the other refresh token**. Mitigation that does not depend on it: a refreshed token carries the current claims, and the database also checks the row, but after a legitimate change the row says "done", so a surviving attacker refresh token would then work. Treat this as the main thing to prove on a Supabase branch.
3. **Account takeover if the client's mailbox is compromised** (password reset emails go there; Supabase's own "forgot password" is not used by this page but the account is a normal Auth user). Consider disabling Auth password recovery for this project.
4. **Weak client passwords:** 12 characters, a common list of about 150, email-name and pattern checks. No breach-list check unless Supabase "leaked password protection" (a paid-plan setting) is on.
5. **Brute force on sign in** is limited only by Supabase Auth's own rate limits (per IP and per user, set in the dashboard); there is no app-level lockout on sign in. Turnstile protects the change route, not the sign in. Enabling Supabase Auth CAPTCHA would add it.
6. **Per-instance in-memory limits** exist only in Option A. Option B limits are in the database.
7. A 1 hour access token already issued before a disable or reset is denied at once by the database, but Storage and any future table with only the old owner-style policies would not see this logic; today clients hold no storage policy.
8. The service role key becomes a high value secret on Vercel. It is used only in headers by two routes; nothing logs it. Anyone with Vercel env access has it.
9. Videos are not available to logged-in clients (known gap, not a leak).

## Verdict: SAFE WITH CONDITIONS (design and code); NOT TO GO LIVE until every condition is met
Nothing here is live. Do not deploy the migration, the routes or the page until:
1. **Migration approval, then rehearsal on a Supabase branch** (not done here, I was told not to create branches): apply, run the same checks, rollback, re-apply.
2. **Add `SUPABASE_SERVICE_ROLE_KEY`** (Sensitive) in Vercel, plus `CLIENT_OWNER_EMAIL`. `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_FROM` already exist.
3. **Confirm in the Supabase dashboard:** sign ups disabled; "Secure email change" on; leaked password protection on if the plan allows; minimum password length 12 or more; consider disabling password recovery; JWT expiry left at 1 hour or lower; Auth rate limits reviewed; Auth CAPTCHA considered.
4. **Prove on the branch with real Supabase:** (a) the Admin API accepts the `app_metadata` shape and `null` clears `temp_expires_at`; (b) the real token carries `app_metadata` and `iat` as the gate expects; (c) a second session started with the temporary password cannot refresh after the legitimate change; (d) `ban_duration` blocks sign in; (e) deleting the Auth user cascades the account row.
5. **Decide on `optional-hardening.sql`** (second lock; changes existing policy sets).
6. **Privacy decisions** in `PRIVACY-TODO.md`.
7. Read the Option A review too; Option B reuses its owner check.
