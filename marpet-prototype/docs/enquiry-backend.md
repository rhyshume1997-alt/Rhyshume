# Enquiry form backend

`api/enquiry.js` is the server side of the enquiry form on `contact.html`. It is a Vercel-style Node serverless function (`export default async function handler(req, res)`), Node 18+, no npm dependencies. It is modelled on the proven `api/contact.js` in the parent repo but shares no code with it, so the Marpet site can be hosted on its own.

**Status: development only. Nothing is connected yet (see "Not connected yet").**

## What it does

1. Accepts `POST /api/enquiry` only.
2. Reads the form fields (urlencoded or JSON, 20 KB at most).
3. Honeypot: if the hidden `website` field is filled in, answers as if it worked and sends nothing.
4. Checks its configuration. If any required variable is missing it stops with `not_configured`. It never skips the Turnstile check.
5. Time trap on `ts`.
6. Validates the fields.
7. Verifies the Turnstile token with Cloudflare.
8. Sends one email through Resend, with the visitor's address as `reply_to`.
9. Reports success only after Resend has accepted the email.

It sends no confirmation email to the visitor. Logs carry codes only: no names, email addresses, message text or secret values.

## Environment variables

Names only. Values go in the host's settings, never in the repo. See `.env.example`.

| Name | Required | Purpose |
| --- | --- | --- |
| `MARPET_RESEND_API_KEY` | yes | Resend API key |
| `MARPET_ENQUIRY_TO` | yes | Where enquiries go. Comma separate for more than one |
| `MARPET_ENQUIRY_FROM` | yes | Sender, on a domain verified in Resend |
| `MARPET_TURNSTILE_SECRET_KEY` | yes | Cloudflare Turnstile secret key |
| `MARPET_TURNSTILE_HOSTNAMES` | no | Comma separated hostnames a token must come from. Set it once the live hostname is known |

## How the front end must post

`POST /api/enquiry` with `Content-Type: application/x-www-form-urlencoded` (a plain `<form method="post" action="/api/enquiry">`) or `application/json`. `multipart/form-data` is refused (415), so the form must not have `enctype="multipart/form-data"` and must not include a file input. Drawings go by email.

| Field | Rules |
| --- | --- |
| `name` | required, 2 to 100 characters |
| `company` | optional, 120 at most |
| `email` | required, valid address, 254 at most |
| `tel` | optional, 40 at most, digits, spaces and `+ ( ) -` only |
| `service` | optional. If given, exactly one of: Conveyor systems, Production lines, Industrial pipework, Access platforms, Catering fabrication, Dentistry equipment, General fabrication, Something else |
| `message` | required, 10 to 5000 characters |
| `website` | honeypot. A text input hidden from people (off screen, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`). Must be sent empty |
| `ts` | hidden input set by script to `Date.now()` when the form is rendered (milliseconds) |
| `cf-turnstile-response` | added by the Cloudflare Turnstile widget |

Notes on `ts`:

- Under 3 seconds or over 24 hours old: refused as spam. A page left open for more than a day must be reloaded, or the script should refresh `ts`.
- Missing: still delivered if Turnstile passes, but the email subject is marked `[SPAM REVIEW]`. So if the front end forgets `ts`, every enquiry arrives marked.
- It is the visitor's clock compared with the server's. A clock up to 10 minutes ahead is tolerated (delivered, marked `[SPAM REVIEW]`). A visitor whose clock is a few seconds ahead and who submits straight away, or whose clock is more than a day behind, can be treated wrongly. Turnstile is the real protection; `ts` is a cheap extra.

More than 3 links in `message` also marks the subject `[SPAM REVIEW]`. Marked enquiries are still delivered to `MARPET_ENQUIRY_TO`.

## Responses

If the request has `Accept: application/json` the answer is JSON. Otherwise it is a `303` redirect to `/contact.html?sent=1#enquiry-status` or `/contact.html?error=<code>#enquiry-status`. The page should show a message in the element with id `enquiry-status` based on the query string.

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | `{"ok":true}` | Resend accepted the email (also returned to a bot that filled the honeypot) |
| 400 | `{"ok":false,"code":"validation","errors":{"<field>":"<message>"}}` | One or more fields need fixing. Messages are fixed text, never the visitor's input |
| 400 | `{"ok":false,"code":"bad_request"}` | Body could not be read |
| 403 | `{"ok":false,"code":"spam"}` | Time trap |
| 403 | `{"ok":false,"code":"turnstile_failed"}` | Token missing, rejected, or from the wrong hostname. Reset the widget and let the visitor try again |
| 405 | `{"ok":false,"code":"method_not_allowed"}` | Not a POST. Always JSON, with `Allow: POST` |
| 413 | `{"ok":false,"code":"too_large"}` | Body over 20 KB |
| 415 | `{"ok":false,"code":"unsupported_media_type"}` | Not urlencoded or JSON |
| 502 | `{"ok":false,"code":"turnstile_unavailable"}` | Cloudflare could not be reached. Nothing sent |
| 502 | `{"ok":false,"code":"send_failed"}` | Resend refused or could not be reached |
| 503 | `{"ok":false,"code":"not_configured"}` | A required environment variable is missing. Nothing verified or sent |

For any failure the page should offer the phone number and email address as the fallback.

## Not connected yet

- **Resend**: no sending domain is verified for Marpet and there is no API key. `MARPET_ENQUIRY_FROM` must be on a verified domain or Resend refuses the send.
- **Turnstile**: no widget exists. A site key (public, goes in the page) and a secret key (goes in `MARPET_TURNSTILE_SECRET_KEY`) are both needed. The widget script is not in `contact.html` yet.
- **Hosting**: not chosen. The function uses the Vercel Node signature. On another host it needs a small adapter, and `/api/enquiry` must be routed to it. The local `serve.mjs` does not run it.
- **Front end**: the form in `contact.html` is still the prototype form. It needs `method`, `action`, the `website` and `ts` fields, the Turnstile widget, the `#enquiry-status` element, and the file input removed.
- **Rate limiting**: none in the function. Use the host's firewall or rate limiting once hosting is chosen.
- Never tested against the real Cloudflare or Resend services. Only against mocks.

## Tests

From the repo root:

```
node --test marpet-prototype/test/enquiry.test.mjs
```

`fetch` is mocked, so no network is used and no keys are needed.

Type check (from `marpet-prototype/`):

```
npx -y -p typescript@5 tsc --allowJs --checkJs --noEmit --strict false --target es2022 --module nodenext --moduleResolution nodenext api/enquiry.js
```
