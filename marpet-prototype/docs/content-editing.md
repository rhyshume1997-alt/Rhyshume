# Editing the site content

All words, photographs and lists that change over time live in `content/` as plain JSON files. The pages are generated from them, so nothing needs redesigning to add a project or a team member.

## The approach, and why

- **Now:** edit the JSON file, run the build, check the page. The build refuses to run if an entry is incomplete or points at a photograph that does not exist, and says which entry.
- **No database, no login, no monthly fee.** Nothing to patch or to be broken into.
- **If Marpet staff need to edit without help later:** add a Git-based editor (Decap CMS or similar) on top of the same files. It gives a form in the browser and saves to the same JSON. A hosted CMS is only worth it if someone will post weekly.

## Files

| File | Holds |
|---|---|
| `company.json` | Name, phone, email, address, customers, LinkedIn address, enquiry endpoint |
| `services.json` | One entry per service: name, summary, paragraphs, optional list, photographs |
| `projects.json` | One entry per project: title, service, photographs, and optional overview, scope, client, date |
| `team.json` | One entry per person: name, role, bio, photo |
| `linkedin.json` | Company page address and the posts to feature |
| `image-dims.json` | Width and height of each photograph (regenerated when photographs are added) |

`content/schema.mjs` describes every field.

## Common jobs

**Add a project.** Put the photographs in `site/assets/img/`, then add to `projects.json`:

```json
{
  "slug": "bottling-line-platform",
  "title": "Bottling line access platform",
  "service": "access-platforms",
  "hero": "platform-1.jpg",
  "images": ["platform-2.jpg", "platform-3.jpg"],
  "overview": "What the customer needed and what was built.",
  "scope": "Design, manufacture and installation. 304 stainless.",
  "date": "2026",
  "featured": true
}
```

`client` is optional and should only be added when the customer has agreed to be named. Without `overview` and `scope` the page shows a labelled placeholder.

**Add a team member.** Replace one of the empty entries in `team.json`:

```json
{ "name": "Full name", "role": "Job title", "bio": "Two or three sentences.", "photo": "team-name.jpg" }
```

Only add details the person has approved.

**Feature a LinkedIn post.** In `linkedin.json`, set `profileUrl` to the company page and fill a post:

```json
{ "url": "https://www.linkedin.com/posts/...", "date": "12 November 2026", "summary": "One line about the post.", "image": "post-1.jpg" }
```

The site links to the real post. It does not copy likes or follower counts.

**Connect the enquiry form.** Set `enquiryEndpoint` and `turnstileSiteKey` in `company.json` once the sending service exists. See `enquiry-backend.md`.

## After any change

```bash
npm run build
```

```bash
npm test
```
