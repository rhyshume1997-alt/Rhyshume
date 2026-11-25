# Hook it all up: 10 steps

Never ask for a password. Never change anything live until the grant is approved, the contract is signed and he has said yes in writing.

## Before launch

- [ ] 1. In your Shopify Dev Dashboard: **Stores, Request store access.** Enter his store address and his 4-digit collaborator code (he finds it in Shopify under Settings, Users and permissions, Collaborators). Ask only for apps and products. He presses approve.
- [ ] 2. In his Shopify, add the **Headless** channel, make a storefront and copy the **public Storefront token**. (No Headless channel? Make a custom app with product and basket permissions instead.)
- [ ] 3. In Vercel: **new project** from the site's GitHub repo.
- [ ] 4. In the project, **Settings, Environment Variables**: add `SHOPIFY_STORE_DOMAIN` (his `.myshopify.com` address) and `SHOPIFY_STOREFRONT_TOKEN` (the token). Redeploy. Delete the token from anywhere else.
- [ ] 5. Test on the Vercel preview link: real products show, add one to the basket, press Checkout and land on a **Shopify** page. Stop there. Do not pay.

## Launch day (only with his written yes)

- [ ] 6. Sit with him at GoDaddy (**DNS, Manage DNS**). Screenshot all the current records first.
- [ ] 7. In Vercel: **Settings, Domains, Add** his domain and the `www` one. Vercel shows two records. Use the values on screen. Usually an **A** record (name `@`, value `76.76.21.21`) and a **CNAME** record (name `www`, value `cname.vercel-dns.com`).
- [ ] 8. In GoDaddy, change the existing `@` A record and the `www` CNAME to those. Remove any "parked" record or domain forwarding that clashes. **Do not touch MX (email) records.**
- [ ] 9. Wait (minutes to a day) until Vercel shows a green tick and the padlock appears. Open the site on your phone.
- [ ] 10. Send a test email to and from his address, put one item in the basket and stop at Shopify's checkout. Write down who holds which login.

If something breaks: wait an hour, then check the records match what Vercel shows. If email stops, put the MX record back from your screenshot.
