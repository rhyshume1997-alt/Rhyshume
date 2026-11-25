# Hook it all up: 12 steps

The short version. Tick as you go. The long version is under "Full version" on the hub if you get stuck.

**Never ask for a password. Never change anything live until the grant is approved, the contract is signed and he has said yes in writing.**

## Before launch (you and Shopify)

- [ ] 1. Ask him three things: Is the domain at GoDaddy, and does it show his Shopify shop today? Is the DNA till stock synced with Shopify? Does he have email on the domain?
- [ ] 2. Ask him for his Shopify **collaborator code** (4 digits). He finds it in Shopify under Settings, Users and permissions, Collaborators. Also get his store address (`something.myshopify.com`).
- [ ] 3. In your Shopify Partner / Dev Dashboard: **Stores, Request store access.** Enter the address and code. Ask only for apps and products, never payments or ownership. He presses approve.
- [ ] 4. In his Shopify, add the **Headless** channel, make a storefront, copy the **public Storefront token**. (If there is no Headless channel, make a custom app with product and basket permissions instead.)
- [ ] 5. In Vercel: **new project** from the site's GitHub repo.
- [ ] 6. In the project, **Settings, Environment Variables**: add `SHOPIFY_STORE_DOMAIN` (his `.myshopify.com` address) and `SHOPIFY_STOREFRONT_TOKEN` (the token). Redeploy. Delete the token from anywhere else.
- [ ] 7. Test on the Vercel preview link: real products show, add one to the basket, press Checkout and land on a **Shopify** page. Stop there. Do not pay. Alcohol checkout stays off.

## Launch day (only with his written yes)

- [ ] 8. Sit with him at GoDaddy. **Screenshot all the current DNS records first** (DNS, Manage DNS).
- [ ] 9. In Vercel: **Settings, Domains, Add** his domain, plus the `www` one. Vercel shows two records. Use the values on screen. Usually an **A** record (name `@`, value `76.76.21.21`) and a **CNAME** record (name `www`, value `cname.vercel-dns.com`).
- [ ] 10. In GoDaddy, change the existing `@` A record and the `www` CNAME to those. Remove any "parked" record or domain forwarding that clashes. **Do not touch MX (email) records.**
- [ ] 11. Wait (minutes to a day). Vercel shows a green tick and the padlock appears. Open the site on your phone.
- [ ] 12. Test: send a test email to and from his address. Add one item to the basket and go to Checkout, stop at Shopify. Write down who holds which login (domain, Vercel, Shopify).

**If something breaks:** wait an hour, then check the records match what Vercel shows. If email stops, put the MX record back from your screenshot. Anything about payments or licences: stop and ask.
