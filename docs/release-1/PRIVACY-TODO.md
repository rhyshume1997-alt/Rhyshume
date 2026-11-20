# Privacy page: items for Rhys to confirm (Release 1)

The Release 1 privacy page is main's text (sections 1.0 to 10.0 as on production), with only the header, footer and closing band updated to match the other pages. Nothing about the Business Review tool is on it, because the tool does not exist in this release. Nothing was added that is not already on production.

Wording I was not sure about, left off the page for you to decide:

1. The "Request a business review" route uses the existing small business form (/local-business), which sends the same fields as the contact form (name, business name, email, optional phone, service, message) through the same /api/contact function, Resend and Cloudflare Turnstile. Section 2.0 names "the contact form" but not the small business form by name. If you want it named, add one bullet; the processing is the same.
2. The automation demonstrations (/automation-demos) run in the browser with made up data. They send nothing, set no cookies and use no browser storage (checked in a browser: zero network requests after load). No privacy text is needed for them, so none was added.
3. The booking link opens a Google Calendar appointment page (already covered in section 4.0).
4. The footer and several pages show the contact email rhys@rhyshume.co.uk. The privacy page ICO sentence is exactly as on main ("I'm not currently registered with the ICO.").
5. Last updated date: left as on main (10 Nov 2026) because the text did not change. Change it if you edit the page.
6. The personal Gmail address (rhyshume1997@gmail.com) still appears where it already did (the fallback line in form-check.js, the api/ functions and some tests). It was not changed. Flagged for you.
