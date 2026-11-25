# Spam protection

Every public form and every endpoint that writes data or could send an email is protected. The checks run on the
server, in this order, and any of them can stop a request before anything is sent or written.

1. **Rate limit** per visitor address and endpoint. A 429 with a short message and a `Retry-After` header.
2. **Honeypot and fill time.** A hidden field (`contact_pref_zq`) that people never see and autofill does not know, and
   a minimum fill time of 3 seconds. A request that trips either gets the normal success reply, so the bot does not
   retry. (The sign-in form gives the same "name or password is not right" reply a real wrong password gets.)
3. **Cloudflare Turnstile.** The token is checked on the server against
   `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`. A failure gets a plain
   message ("We couldn't check that you're a real person. Please try again.").
4. **Input limits** (`src/lib/sanitize.ts`): every field has a maximum length, is trimmed, and has control characters
   removed. Links are stripped from name fields, a message may hold at most two links, and anything going into an email
   goes through `escapeHtml()` and `headerSafe()` first.

The code is in `src/lib/antispam.ts` (rate limit, honeypot, `guardForm`), `src/lib/turnstile.ts` (Turnstile),
`src/lib/sanitize.ts` and the form part `src/components/SpamGuard.tsx`.

## Protected endpoints

| Endpoint | What it does | Rate limit per visitor | Turnstile | Honeypot and fill time |
|---|---|---|---|---|
| `POST /api/newsletter` | Newsletter sign-up (no mailing service connected yet, so nothing is stored or sent) | 5 per 10 minutes | yes | yes |
| Owner sign-in (`/owners`) | Sign in for Michael and Tanya | 5 per 10 minutes, and 6 per account name per 15 minutes | yes | yes |
| Add an event (`/owners`) | Creates an event (needs sign-in) | 10 per 10 minutes | yes | yes |
| Delete an event (`/owners`) | Removes an event (needs sign-in) | 20 per minute per owner | no (signed-in button) | no |
| Members preview sign-in (`/members`) | Preview only, switched on by `MEMBERS_DEMO` | 5 per 10 minutes | yes | yes |
| `POST /api/checkout` | Starts a Shopify checkout. The existing rules are unchanged: it stays off unless `CHECKOUT_ENABLED` is exactly `true`, and the 18+ declaration and the minimum order are checked as before | 8 per minute | no, so the payment flow is untouched | no |

The contact and event enquiry buttons are plain `mailto:` links. They have no endpoint, so there is nothing for a bot to
post to. If they ever become real forms, protect them with `guardForm()` and `sanitize.ts` like the newsletter.

Limits are counted in memory, so on Vercel each running server instance counts for itself. That stops a script hammering
one instance. For a single global limit, swap `rateLimit()` in `src/lib/antispam.ts` for a shared store, or add a Vercel
Firewall rate-limit rule.

## Environment variables

| Name | Where | What |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel, Preview and Production | The widget's public site key |
| `TURNSTILE_SECRET_KEY` | Vercel, Preview and Production | The widget's secret key. Server only. Never in code or chat |
| `TURNSTILE_VERIFY_URL` | tests only | Points tests at a local stand-in. Leave unset in Vercel |
| `TURNSTILE_ALLOW_TEST_KEYS` | your own computer only | Lets a production build on your computer use the test keys |

If a key is missing:

- **Preview, and running locally in development:** Cloudflare's published test keys are used
  (`1x00000000000000000000AA` and `1x0000000000000000000000000000000AA`), so the forms still work. They check nothing
  and are not secrets.
- **Production (`VERCEL_ENV=production`):** every submit is rejected with "This form isn't available right now", and a
  clear error is logged: `[turnstile] ... is missing in production, so every form submit is being rejected`.
  The forms fail closed on purpose.

## Steps for Rhys to do himself

Cloudflare (free):

1. Sign in at https://dash.cloudflare.com and open **Turnstile** in the sidebar. Choose **Add widget**.
2. Name it "Jack O'Beers". Under **Hostnames**, add the live domain (`jackobeers.com` and `www.jackobeers.com`), and the
   Vercel preview domain you test on (for example `jack-obeers-git-claude-jack-obeers-beers-rhsys-projects.vercel.app`).
   Add `localhost` too if you want real keys on your own computer.
3. Choose **Managed** mode and create the widget.
4. Copy the **Site key** and the **Secret key**. Keep the secret key private.

Vercel (project `jack-obeers`, Settings, Environment Variables):

5. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` with the site key, ticking **Production** and **Preview**.
6. Add `TURNSTILE_SECRET_KEY` with the secret key, ticking **Production** and **Preview**. Mark it Sensitive.
7. Redeploy Production and the preview (the site key is read when the site is built). If the key is added only for
   Preview, the live site stays closed.
8. Check: open a form on the live site and send it. In **Vercel, Logs**, there should be no `[turnstile]` errors.
   In Cloudflare, Turnstile, Analytics should show the challenges.
