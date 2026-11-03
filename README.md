# Rhys Hume

Static site for Rhys Hume, Glasgow, hosted on Vercel at https://www.rhyshume.co.uk. HTML and CSS, no framework. One small script, `nav.js`, opens and closes the menu on phones; without it the nav stays visible.

Pages: `index.html`, `websites.html`, `automation.html`, `tolra.html`, `csv.html`, `about.html`, `contact.html`, `privacy.html`, `404.html`, `work/jnr-engineering.html`, `council-digital-grants/index.html`, `insights/index.html` and one article. Shared styles are in `styles.css`. `vercel.json` turns on clean URLs, so `/websites` serves `websites.html`.

Fonts are self-hosted in `fonts/` (Newsreader, IBM Plex Sans, IBM Plex Mono, latin subsets from Google Fonts, SIL Open Font License), so pages make no requests to Google Fonts.

SEO files: `sitemap.xml`, `robots.txt`, `llms.txt`.

## Contact forms

The contact form and the council digital grants form post to `api/contact.js`, a Vercel function that emails the enquiry through Resend and sends the visitor back to the page with `?sent=1#sent` (only once Resend has accepted the email) or `?error=1#not-sent`. Set these in Vercel (Project Settings, Environment Variables) before deploying:

- `RESEND_API_KEY` (required): API key from resend.com
- `CONTACT_TO` (required): where enquiries go, `rhyshume1997@gmail.com`
- `CONTACT_FROM` (optional): the sender, on the domain verified in Resend. Defaults to `Rhys Hume <hello@rhyshume.co.uk>`.

## Notes

Images are listed in `images/README.md`. Slots still waiting on content are marked with `RHYS TO SUPPLY` or `RHYS TO CONFIRM` comments in the HTML.
