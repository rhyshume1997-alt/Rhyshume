# Shopify set-up prompt (for a browser agent such as Claude in Chrome)

Open his Shopify admin in Chrome, signed in as you or as the collaborator. Paste the box into the browser agent. It clicks through the admin for you, but it stops at every step that touches a secret, an app install or a setting. Secrets (tokens) are never part of it: you copy those yourself, straight into Vercel.

## 1. Paste this into the browser agent

```
You are helping me set up my Shopify store for a new website. I am already signed in. Work in this browser tab only.

Hard rules:
- Never ask me for, read out, copy, type or reveal a password, API token, secret key or payment detail. If a page shows one, stop and tell me, and do not copy it.
- Create things as DRAFT or unpublished only. Nothing may go live.
- Do not edit or delete any existing product, price, collection, theme, page, payment setting, shipping setting, tax setting, user, or app.
- Do not install, uninstall or change any app or sales channel. If one is missing, tell me instead.
- Do not add any beer, cider or wine products.
- Before each numbered step, tell me what you are about to do. After each step, tell me what you did. If anything looks different from what I described, stop and ask.

Step 1, events:
- Products, Collections: create a collection called "Events" that automatically includes products whose Product type is "Event". Save.
- Products, Add product: create ONE example. Title "Sample event: tasting night", Product type "Event", tags "date:2026-12-12" and "time:19:00", price 0.00, track quantity with 20 in stock at my main location, description "A made-up example. Delete before launch." Status: DRAFT. Save.

Step 2, memberships:
- If the Shopify Subscriptions app is already installed, create two DRAFT subscription products billed every month: "Draught Club: The Regular" at 24.99 and "Draught Club: The Legend" at 39.99. If the app is not installed, do not install it, just tell me.
- Customers: do not change any customer. Just tell me whether I can create customer tags (I will use "draught-regular" and "draught-legend").

Step 3, look only. Change nothing and report back:
- Settings, Customer accounts: are new customer accounts (sign in with an email code) turned on?
- Settings, Apps and sales channels: is the Headless sales channel installed? List all sales channels.
- Settings, Locations: list my stock locations.

Finish with a list of exactly what you created and anything you could not do. Then stop.
```

## 2. Do these by hand (the agent must not touch them, and secrets must not go in chat)

1. **Public Storefront token.** Add the **Headless** channel, create a storefront, copy the **Public access token**. In Vercel add `SHOPIFY_STORE_DOMAIN` (the `.myshopify.com` address) and `SHOPIFY_STOREFRONT_TOKEN`.
2. **Admin token, for the owners page only.** In Dev Dashboard or **Settings, Apps and sales channels, Develop apps**: make an app called `Jack O'Beers owners page`. Give it only these Admin API permissions: `read_products`, `write_products`, `write_publications` (add `read_inventory` and `write_inventory` if ticket numbers will be set from the owners page). Install it and copy the **Admin API access token**. Shopify shows it once. Put it straight into Vercel as `SHOPIFY_ADMIN_TOKEN`, marked Sensitive. Never paste it into a message or into the agent.
3. **Headless channel id.** In the Shopify GraphiQL app run `{ publications(first: 10) { nodes { id name } } }`, copy the id of the Headless channel into `SHOPIFY_PUBLICATION_ID`.
4. **Switch it on last.** Add `SESSION_SECRET` (32+ random characters) and `OWNER_USERS` (made with `node scripts/hash-password.mjs <name>`). Try on a development store first, then set `EVENTS_BACKEND=shopify`. Leave `OWNER_DEMO` and `MEMBERS_DEMO` unset.

## 3. Check afterwards

- The sample event is a draft, type "Event", with tags `date:` and `time:`.
- The membership products are drafts and nothing else changed.
- Nothing was published, no payment, shipping or tax settings moved, no app changed.
- Tell me what the agent reported and I will check the website reads the events.

I have not run this in a browser agent, so menu names may differ from what you see. A browser agent can misclick, so watch it, and stop it if it goes anywhere other than the step it announced.
