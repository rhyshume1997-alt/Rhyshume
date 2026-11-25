# How to hook it all up

Simple steps, in order. Tick each one as you go. Write what you find in the notes. Do not skip ahead.

**Three rules before you start**

- Do not change DNS (the domain settings), Shopify payment settings or anything live until the grant is approved, the contract is signed and the client has said yes in writing.
- Never ask him for a password, card details or a private key. Use invites. Paste secrets straight into Vercel yourself, never into a message.
- Alcohol checkout and alcohol delivery stay switched off until the licence checks are done.

## 0. The words in plain English

- **Domain:** the web address, like `jackobeers.co.uk`. He owns it.
- **Registrar:** the company he bought the domain from (GoDaddy, 123-reg, Namecheap and so on). The domain's settings live there.
- **DNS:** the address book. It says "this domain goes to that computer".
- **Vercel:** where the new website will live.
- **Shopify:** his shop. It keeps the products, stock, basket, orders and checkout.
- **Storefront token:** a long code that lets the website read his products and make a basket. It is not a password, but treat it as private.
- **Environment variable:** a safe box in Vercel where you keep the token. The website reads it from there. It never goes in the code.

## 1. Find out where things are today (5 minutes, nothing is changed)

- [ ] Where is the domain registered? Write the company name in the note.
- [ ] Is the domain already pointing at his Shopify shop? (If it opens his Shopify shop today, tell me before you touch anything. Moving it would take his current shop offline.)
- [ ] Does he have email on the domain (like sales@jackobeers.com)? Who runs it?
- [ ] What is his Shopify address? It looks like `something.myshopify.com`. Write it in the note.
- [ ] Which Shopify plan is he on?

## 2. Get access to his Shopify (he stays in control)

You never need his password. There are two safe ways. Use A first.

**A. Collaborator access (best).** You ask, he approves.

- [ ] Ask him for his **collaborator request code** (4 digits). He finds it in his Shopify admin under **Settings, Users and permissions, Collaborators**.
- [ ] In your Shopify Partner or Dev Dashboard account: **Stores, Request store access**. Enter his shop address and the code.
- [ ] Ask for only what you need: view products and collections, create and manage apps or sales channels. Do not ask for payments, billing or ownership.
- [ ] He gets a request in his admin and presses approve. The shop then shows up in your account.
- [ ] If it fails: check no staff member on his store uses your business email. If one does, he removes that user first.

**B. Staff account.** He invites you under **Settings, Users and permissions, Add staff**, with only the permissions you need. Same rule: no payments, billing or ownership.

- [ ] Access works? Write the date in the note.

## 3. Get the Storefront token (the key the website uses)

This is what lets the website read his products and make a basket. The shop keeps everything. The website is only the front.

Shopify moves its menus around, so if a name below is not where I say, type it into the search box at the top of his Shopify admin.

**Easiest route: the Headless channel.**

- [ ] In his Shopify admin, open the **Shopify App Store** and add the **Headless** sales channel.
- [ ] Create a storefront in it.
- [ ] It shows a **Public access token** (Storefront API). Copy it.
- [ ] Check the permissions it has. Tick only: view products and collections, view stock levels, create and update the basket (cart and checkout). Leave out customer data unless customer accounts are approved.

**Other route: a custom app** (if the Headless channel is not available).

- [ ] In the Dev Dashboard, or his admin under **Settings, Apps and sales channels, Develop apps**, make an app called `Jack O'Beers website`.
- [ ] Under the Storefront API settings, choose the permissions listed above, then install it.
- [ ] Copy the **Storefront API access token**.

Notes:

- The Storefront token is meant to be public-safe. It can only read the shop and make a basket. It cannot see orders or take money.
- Do NOT use the **Admin** token for the website. You do not need it.
- Never paste the token into a chat, email or the code.

- [ ] Token copied and kept somewhere safe for the next 10 minutes.

## 4. Put the token into Vercel (the safe box)

- [ ] Go to Vercel and make a **new project** for this site (not the old `rhyshume` one). Connect the GitHub repo that holds the site.
- [ ] In the project: **Settings, Environment Variables**.
- [ ] Add `SHOPIFY_STORE_DOMAIN` = his `something.myshopify.com` address.
- [ ] Add `SHOPIFY_STOREFRONT_TOKEN` = the token. Tick **Sensitive** if it is offered. Apply it to Preview and Production.
- [ ] Save. Then **Redeploy** so the site picks them up.
- [ ] Delete the token from anywhere else you copied it.

**Note on today's prototype:** the Next.js prototype still runs on sample products. It does not read these two variables yet. Adding the Shopify code is the next build step, after approval.

## 5. Check Shopify is talking to the site (safely)

- [ ] Open the Vercel preview link. Do real products show instead of the sample ones? (Only works once the Shopify code is added.)
- [ ] Does a product show the right price and "in stock"?
- [ ] Put one item in the basket. Press Checkout. You should land on a **Shopify** page, not a page on our site. Stop there. Do not pay.
- [ ] Check alcohol checkout and delivery are switched off.
- [ ] Do not change any Shopify payment settings. Ask me first.

## 6. Ask about stock (the DNA till)

- [ ] Does the DNA till stock already match Shopify? Ask him. Write his answer.
- [ ] If it does not, **do nothing yet.** Write down how it works and tell me.

## 7. Connect the domain to Vercel (only after he says yes in writing)

This is the step that makes `jackobeers.co.uk` show the new website. Changing it takes the old thing off. Do it when he and you are both ready, not on a Friday afternoon.

- [ ] He has said yes to going live, in writing.
- [ ] You have a note of every current DNS record (screenshot them). In particular any record that says **MX** (that is his email).
- [ ] In Vercel: your project, **Settings, Domains, Add**. Type his domain, for example `jackobeers.co.uk`. Add `www.jackobeers.co.uk` too and make one send people to the other.
- [ ] Vercel shows the records it wants. **Use the values Vercel shows on your screen.** They are usually:
  - **A record**, name `@`, value `76.76.21.21`
  - **CNAME record**, name `www`, value `cname.vercel-dns.com`
- [ ] Log in to his registrar (he does it, or sits with you, or invites you). Find **DNS** or **Manage DNS**.
- [ ] Change the existing `@` A record to the Vercel one. Change `www` to the Vercel CNAME. If there is an old record for the same name, edit or remove that one (two A records for `@` will clash).
- [ ] **Do not touch MX or TXT records** (they keep his email working), unless Vercel itself asks you to add one TXT record to prove the domain is yours.
- [ ] Wait. It can take a few minutes up to a day. Vercel's Domains page shows a green tick when it is ready.
- [ ] Vercel sets up the padlock (HTTPS) for you automatically. Open the domain and check the padlock shows.
- [ ] Test email: send a test email to and from his address.

**Do not move the nameservers** to Vercel unless you have copied every record across first. Moving nameservers replaces his whole address book. Changing just the two records above is the safe way.

**If the domain was pointing at his Shopify shop:** changing these two records takes the old shop site off that address. Check section 1 first. The usual safe plan is to keep the shop on its own address (like `shop.jackobeers.co.uk`) or on Shopify's checkout address, so checkout keeps working.

## 8. After it is live

- [ ] Open the site on a phone and on a laptop.
- [ ] Put one item in the basket and go to Checkout. Stop at the Shopify page.
- [ ] Check the site is no longer hidden from search engines (it is hidden while it is a preview). Ask me to turn that on, do not guess.
- [ ] Write down who holds which login: domain, Vercel, Shopify, email.
- [ ] Tell me what happened and I will update the plan.

## 9. If something goes wrong

- **Site not showing after the domain change:** wait an hour, then check the records match what Vercel shows. A leftover old record is the usual cause.
- **Shopify access request fails:** a staff user with your email, or a wrong code. Ask him to check.
- **Basket works but products are the sample ones:** the two variables are missing or wrong, or the site was not redeployed.
- **Email stopped:** an MX record was changed by mistake. Put it back from your screenshot.
- **Anything about payments or licensing:** stop and ask me.

## Where this comes from

I checked these pages today. I have not been into your or his accounts, so menu names can differ from what you see.

- [Vercel: set up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel: manage DNS records](https://vercel.com/docs/domains/managing-dns-records)
- [Vercel: troubleshooting domains](https://vercel.com/docs/domains/troubleshooting)
- [Shopify: collaborator access](https://help.shopify.com/en/manual/your-account/staff-accounts/collaborator-accounts)
- [Shopify: Storefront access token](https://shopify.dev/docs/api/admin-graphql/latest/objects/StorefrontAccessToken)
- [Shopify: access scopes](https://shopify.dev/docs/api/usage/access-scopes)

I could not confirm Shopify's exact current click path for creating the token. If a menu does not match, use the search box in his admin and tell me what you see.
