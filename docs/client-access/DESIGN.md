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

## Part B: client login with a temporary password (separate commits, not live today)
Summarised here, specified fully in the Part B commits.
- Migration `supabase/migrations/<ts>_client_access.sql` (+ rollback outside migrations/), additive only: `client_accounts`, an admin log, a
  rate counter table, and SECURITY DEFINER `client_*` functions that mirror `portal_open/save/quote/quote_accept` but derive the workbook
  from the signed-in client. Existing tables and policies are not touched; the existing owner-only policies keep denying clients by default.
- Server routes verify the owner JWT as in Part A and use `SUPABASE_SERVICE_ROLE_KEY` (not set yet, so they fail closed).
- Forced password change is enforced in the database (`must_change_password` in the JWT and in `client_accounts`) and by a server route.
