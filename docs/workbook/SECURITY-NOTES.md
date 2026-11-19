# Client Workbook: how it is protected (inspected 19 Nov 2026)

What the existing workbook actually does. Nothing here was changed, bypassed or removed.

- **Hosted copy** (`/w-82503121e7fdf54e/`, over https): shows a sign-in screen. Sign-in is an emailed magic link handled by the Supabase auth service. Clients saved online live in a Supabase table with row level security, so that part is **genuine server-side authentication**. The sign-in screen also has **"Work offline on this device"**, which needs no sign-in, so the *application itself* is not access controlled: anyone who finds the URL can open the tool, but sees no client data unless signed in.
- **Opened from a file** (the offline pack): no sign-in at all, local only.
- **Local data** (browser storage, backup files, the new meeting module's saved clients) is **not encrypted and has no password**. Anyone with access to the computer, browser profile or files can read it.
- **Presentation mode** only hides things on screen.
- The hosted route is hidden and marked noindex, which is obscurity, not security. The file in the repository contains default price book content. No client records or secrets (apart from the public Supabase publishable key, which is designed to be public) are in it.
- Recommendation: use the offline pack for meetings, keep the laptop locked, keep backups private. If you want the hosted copy to be genuinely private, put the whole route behind the platform's access control or stop deploying it.

The new meeting module changes none of this. It adds no network calls, stores no passwords, and the upgraded workbook is not part of the public website release.

## Hosted copy (added with the hosted release)

- The hosted workbook at its private address now has no "Work offline on this device" button and ignores the `?offline` address switch. The sign in page is the only way in. The offline pack opened from a file is unchanged and has no sign in.
- Saved client data is protected on the server: every table has a row-level security policy that allows only the owner's email. Checked against the live policies. At the time of checking the project had one user.
- Limit that remains: the page itself is a static file. Anyone who knows the hidden address can load the page and the default price book text inside it before signing in. The hidden address and noindex only hide it. Client records are not in the file. Closing this fully needs the file itself served only after a server side check.
- Meeting demo links on the hosted copy open the public `/website-concepts/` routes.
