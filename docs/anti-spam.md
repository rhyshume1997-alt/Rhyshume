# Anti spam on the contact and grants forms

Both forms post to `api/contact.js`. A send has to get past these, in this order:

1. Rate limit, 5 sends per IP per 10 minutes (in memory, a backup for the Vercel rule).
2. Honeypot, the hidden `company_website` field. A bot that fills it sees a normal thank you and nothing is sent.
3. Cloudflare Turnstile. The page widget is `data-action="contact"` on both forms. The function checks the token with Cloudflare (`antispam.verifyTurnstile`), expects action `contact` and hostname `rhyshume.co.uk` or `www.rhyshume.co.uk`. It fails closed: no secret, no token or Cloudflare down means nothing is sent and the visitor sees the phone and email.
4. Field checks (name, email, phone).
5. Spam score. `antispam.classify` plus this site's words in `api/_lib/contact-words.js`. A score of 4 or more is held: emailed to `CONTACT_QUARANTINE_TO` (or `CONTACT_TO` if not set), subject starts `[SPAM REVIEW score N]`, the sender sees the normal thank you and this site sends no confirmation to the sender.

`api/_lib/antispam.js` is shared with the JNR site. Do not edit it here. Site specific words go in `contact-words.js`.

## Environment variables (names only)

`RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` (optional), `TURNSTILE_SECRET_KEY`, `CONTACT_QUARANTINE_TO` (optional).

## Tuning

- Real enquiries held: raise `QUARANTINE_THRESHOLD` in `api/contact.js`, or add the customer's phrase to `GENUINE` in `contact-words.js`.
- Pitches getting through: add the phrase to `PITCHES`.
- The review email lists the score and the reasons.
- Review emails can land in the Gmail Promotions tab.

## Testing

Run `node --test`. Preview deployments fail the Turnstile hostname check and have no secret, so they refuse the form. That is expected, test on production.
