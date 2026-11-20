# Client access: design

Two ways to give a client access to their private page. This file is written in two parts. **Part A (email the link) is built, tested and
independent.** Part B (client login with a temporary password) is designed below and built in separate commits on the same branch. Part A
does not use any Part B file, table, migration or secret.

## Part A: email the link

**What Rhys does.** Client screen: type the client's email. Client link screen: Create link (the link appears once), then "Send link by
email", then "Yes, send it". He can press "Send it again" while the link is still showing. After leaving the page the link is gone (it was
never stored), so to email it again he makes a new link, which switches the old one off.

**Moving parts**
- `tools/workbook-client-link/link-email.js` + `build.py`: a source module spliced into the workbook as whole new lines (it adds one line to
  the Client link view and one block of script; no existing line changes). Same style as `tools/workbook-meeting`.
- `api/client-link-email.js` (thin wrapper) and `api/_lib/client-link-mail.js` (logic): `POST /api/client-link-email`, owner only.
- No database, no migration, no service role key, no new accounts, no new tables, no `vercel.json` change.
  `.vercelignore` gains `tools/workbook-client-link` (dev files stay out of the deployment).

**Request.** `{action:'status'}` returns whether mail is configured. `{action:'send', to, link, business}` sends one email.
Authorization: `Bearer <owner access token>`.

**Owner check.** The token is verified by calling Supabase `/auth/v1/user` (publishable key as apikey). The returned email, trimmed and
lower-cased, must equal the owner address by a constant-time compare; the user must be confirmed and not anonymous; `app_metadata.role ===
'client'` is refused outright. 401 for no/invalid session, 403 for anyone else.

**Fail closed.** Nothing is sent when: the owner address is not configured (503), the token is not the owner's, Resend is not configured
(honest 503 `mail_not_configured`, and `status` tells the workbook so it shows "Email sending is not switched on yet" and hides the button),
the recipient is not exactly one valid address, the link is not this site's client page, or a rate limit is hit.

**Link shape.** Must match `https://(www.)rhyshume.co.uk/c-09b37e50c043baaa/#t=<48 lower-case hex>` exactly, so the route cannot be used to mail
arbitrary links or text even with a stolen owner token. (The workbook builds the link from `location.origin`, so emailing works from the live
site only, which is the intended place.)

**Rate limits.** In memory, per server instance: 30 seconds between sends to one address, 5 per address per hour, 20 per hour overall.
Honest limit: Vercel can run several instances and restarts them, so this slows a loop and double clicks, it is not a hard cap. Stronger
limits need a database counter (Part B adds that) or Vercel firewall rules. Owner-only, so abuse needs the owner's session.

**Email.** From `CONTACT_FROM` (default `Rhys Hume <hello@rhyshume.co.uk>`), reply-to the first `CONTACT_TO` address, plain text plus simple
HTML, one link, no images, no tracking, no marketing. Says who it is from, what the page is for, that the link is private, what is stored,
and that it is not marketing. No password is ever in it.

**Logging.** One line on success (provider message id) and the missing variable names on a config failure. Never the address, the token,
the link or any key.

**Environment variables (Vercel)**
| Name | Needed | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes (already used by the contact form) | without it the button is replaced by an honest message |
| `CONTACT_FROM` | optional (already used) | sender on the verified domain |
| `CLIENT_OWNER_EMAIL` | yes, unless `CONTACT_TO` is a single address | Rhys's own sign-in email, `rhyshume1997@gmail.com`; if unset and `CONTACT_TO` is one address, that is used; otherwise the route fails closed |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | optional | default to the public values already in the workbook page |

## Part B: client login with a temporary password (built, tested on mocks and an isolated database, not live)

Rhys was told temporary passwords are not best practice and chose them anyway, so this delivers that, as safely as it responsibly can be.
The simple "email the link" option (Part A) stays the recommended one.

**Moving parts**
| Piece | File |
|---|---|
| Migration (not applied) and rollback | `supabase/migrations/20261120150000_client_access.sql`, `supabase/rollback/20261120150000_client_access_rollback.sql` |
| Owner route: create, reset, disable, delete, status, email instructions | `api/client-access.js` + `api/_lib/client-access.js` |
| Forced password change route (public, Turnstile) | `api/client-change-password.js` + `api/_lib/client-access.js` |
| Temporary password generator, password rules | `api/_lib/client-password.js` |
| Client login page `/client/` (generated, see below) | `client/index.html`, built by `tools/client-access-page/build.py` |
| Workbook "Client access" panel | `tools/workbook-client-access/access.js` + `build.py` |
| Isolated database test | `tools/client-access-db/` (needs `@electric-sql/pglite`, run with `PGLITE=<path> node tools/client-access-db/run.mjs`) |
| Optional second lock on the existing tables (own approval) | `docs/client-access/optional-hardening.sql` |

**Database design (additive only).** Existing tables, policies, grants, triggers and functions are not touched (a snapshot test proves byte equality before,
after, after rollback and after re-apply). New: `client_accounts` (auth user to workbook and portal, status, must_change_password, temp_expires_at,
session_epoch), `client_access_log` (append only: update, delete and truncate raise), `client_access_rate` (counter). All three have RLS on and forced, **no
policy for any browser role**, and no grants except what the server's service role needs. Clients reach data only through SECURITY DEFINER functions with an empty
search_path, granted to `authenticated` only: `client_whoami` (state only), `client_open`, `client_save`, `client_quote`, `client_quote_accept`. They copy the
logic of `portal_open`, `portal_save`, `portal_quote` and `portal_quote_accept`, but take the workbook from the signed in client, never from an argument.
The brief asked for RLS policies on the portal and answer rows; because it also required existing policies to stay untouched, the same isolation is done
with these functions, and the existing owner-only policies keep denying clients by default (tested for every operation on every table).

**The gate (`client_ctx`).** Every client function first requires ALL of: token `role` is `authenticated`; `app_metadata.role = 'client'`;
`app_metadata.must_change_password` is exactly `false` (missing counts as true); the token's `temp_expires_at`, if present, is in the future; an account row
exists with status active and `must_change_password` false and an unexpired temp window; the token email (lower-cased, trimmed) equals the account email
(a client who changes their login email locks themselves out); the token's `iat` is not before `session_epoch` (reset, change and disable bump it). Any failure
raises one generic `not allowed`. `user_metadata` is never read. The state lives in two places (the token for speed, the account row for authority), and either one saying
"change pending" or "disabled" denies, so a stale or forged token cannot outvote the database.

**Forced change, server side.** Page: after sign in the page reads the token claims only to decide what to SHOW. Nothing is trusted from it. The change goes to
`/api/client-change-password`, which: fails closed without the service key or the Turnstile secret; rate limits (database counters, fail closed); verifies Turnstile; verifies
the client's token against `/auth/v1/user`; requires role client and a matching active account whose change is pending and whose temp window has not passed;
applies the password rules (12+ characters, not common, not built from the email, no runs or repeats); rejects a password that already works as the
current one (so the temporary password cannot be reused); sets the new password and clears the flag in the auth user through the Admin API; clears it in the account row and bumps
`session_epoch`; signs out all other sessions (global logout); logs it. If the Admin step works and the row step fails, the row still says pending, so the database
keeps denying and Rhys resets the login.

**Owner route.** Owner token verified as in Part A (exact owner email, role client refused). Fails closed with `not_set_up` until `SUPABASE_SERVICE_ROLE_KEY` exists.
Create: validates the workbook id and email (lower-cased; the owner's own address can never be used), rate limits, creates the Auth user with `email_confirm: true`
and `app_metadata {role, must_change_password, workbook_id, temp_expires_at}` (7 days), inserts the account row (and deletes the Auth user if that fails), logs, optionally sends the
instructions email, and returns the temporary password once in that response. The temporary password is 16 characters from an alphabet without look-alikes, drawn with
`crypto.randomInt`. It is never stored, logged or returned again. Emailing it is a separate message, needs an explicit risk acknowledgement, and the choice is logged
(without the password). The instructions email never contains the password and never contains the private link. Reset, Disable (also bans the Auth user), Delete, Status
(last sign in from the Admin API), and "Email sign in instructions" are the other actions. Every action writes `client_access_log` (actor, action, workbook id, no secrets).

**Client page.** `/client/` is generated from the existing token page so the questions, sections, evidence list, starting prices, quote and typed-name acceptance
cannot drift. The generator swaps the transport (token calls become signed in `client_*` calls), removes view-as-client mode and the token-only video call, adds a sign out button, and puts the
login and forced change in front. The session lives in memory only. No cookies, no storage. CSP adds only same-origin and Cloudflare Turnstile. `vercel.json` gets one header block
for `/client` (noindex, no referrer, no store, frame DENY); that is the only `vercel.json` change. There is no link to it from the public site and it is not in robots.txt
(a robots.txt line would advertise it and stop crawlers seeing the noindex header).

**Environment variables.** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (optional, public defaults), **`SUPABASE_SERVICE_ROLE_KEY` (new, sensitive, not yet set)**, `CLIENT_OWNER_EMAIL`,
`RESEND_API_KEY`, `CONTACT_FROM`, `TURNSTILE_SECRET_KEY` (existing), `CLIENT_LOGIN_URL` (optional, https only, must end `/client/`).

**Rate limits.** Owner create: 10 an hour, 5 a day per client; other owner changes 60 an hour; password change: 20 an hour per address and 8 an hour per client; all in the database, so they
hold across instances, and a failing counter refuses. Sign in itself goes straight to Supabase Auth, so its brute force protection is Supabase's own per-IP and per-user limits
(see SECURITY-REVIEW.md); there is no app-level lockout on sign in.

**Known gaps.** Videos on the token page are served by a token-only edge function and an owner-only storage policy, so logged-in clients do not see them yet (a follow-up needs a
storage or function change, outside "additive only"). The public footer's "Client login" link goes to the owner's workbook sign in, not to `/client/`; that is a public page and was left alone.
