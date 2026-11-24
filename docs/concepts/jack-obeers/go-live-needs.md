# What I need from him to go live

**Do this first (2 min):** open this on your phone. Ask for the 6 things in "Ask first" before anything else.

**Golden rule:** never ask for a password. Ask to be added as a **helper** (called a "collaborator" or "staff account"), or sit next to him while he does it.

---

## The words, explained simply

| Word | What it means |
|---|---|
| **Domain** | The shop's street name on the internet: jackobeers.com |
| **DNS** | The internet's phone book. It says "this street name lives at this building" |
| **DNS record** | One line in that phone book |
| **Registrar** | The company he bought the street name from (GoDaddy, 123-reg and so on) |
| **Hosting** | The building the website lives in. Ours is Vercel |
| **Shopify** | The till, the stock list and the payment machine, online |
| **Checkout** | The page where the customer pays. Shopify runs it |
| **Token** | A small key. It opens only the part of the shop the website needs |
| **MX, SPF, DKIM** | Lines in the phone book that make his emails arrive and not go to spam |
| **Off-sales licence** | The paper that lets a shop sell alcohol to take away |

---

## Ask first (15 min)

1. [ ] Who holds the domain (which company), and who has the login?
2. [ ] What is the Shopify store address, and is it live?
3. [ ] Can he add you as a Shopify helper (collaborator)?
4. [ ] Can he show you his premises licence and the operating plan?
5. [ ] Which logo file is the original (vector), and what are the brand colours?
6. [ ] Who is the one person who says "yes, go live"?

---

## 1. Domain and DNS (10 min)

*Why: the website needs the street name pointed at it. Without it, nobody finds the site.*

- [ ] **Where the domain is bought** (registrar) and **who has the login**. He can add you as a helper, or change the settings while you watch.
- [ ] **A photo or screenshot of his DNS page today.** This is the "before" picture. Never change it without one.
- [ ] **Who looks after his email** (his emails look like Microsoft Outlook). The email lines in the phone book (MX, SPF, DKIM) must not be broken.
- [ ] **Which address is the website** (jackobeers.com or www.jackobeers.com) and which is the shop checkout (for example shop.jackobeers.com). Not decided yet.
- [ ] **Permission to change the DNS** on a day we both choose. Vercel and Shopify each give the exact lines to add; we copy them in.

*What I do after: connect the domain, get the padlock (HTTPS), make www and non-www go to the same place, turn search engines on, and make his emails safe.*

---

## 2. Shopify (15 min)

*Why: Shopify holds the products, stock, orders and payments. The website just shows them and sends people to Shopify to pay.*

- [ ] **Store address** (looks like `something.myshopify.com`) and the **plan** he is on
- [ ] **Add you as a collaborator** (Settings, Users). Ask him to approve the request. You will need rights for: products, apps and sales channels, orders, shipping, and settings.
- [ ] **Make a custom app for the website** (Settings, Apps, Develop apps). This gives a **Storefront token**. He can do it with you next to him. The steps are in the README.
- [ ] **Products ready?** Export the product list (Products, Export). Check names, prices, photos, sizes, stock, and which collection each product is in. We need collections called `beers`, `ciders`, `wines`, `kegs`, `hampers`.
- [ ] **Test mode:** agree a day to place a test order before going live

---

## 3. Money, tax and shipping (10 min)

*Why: if the money side is not set up, nobody can buy.*

- [ ] **Payments:** is Shopify Payments on? Is Apple Pay, Google Pay or PayPal on? Is his bank account added and verified?
- [ ] **VAT:** his VAT number, and whether prices include VAT
- [ ] **Shipping:** which courier, which countries, the price and the time for each. UK only, or international too?
- [ ] **Click and collect:** is local pickup set up for 13 Station Road? Which days and times, and how much notice?
- [ ] **The till:** does the DNA till talk to Shopify, or does he update stock by hand?

---

## 4. Licence and age checks (10 min)

*Why: alcohol has rules. These can stop a launch. Do not guess. Ask him and his adviser.*

- [ ] **Premises licence and operating plan** (a copy or a photo). He told us it includes off-sales.
- [ ] **Does it allow delivery, and sales over the internet?** Ask the licensing board (East Dunbartonshire Council) if he is not sure.
- [ ] **Age check at checkout:** just a tick box, or something stronger? And who checks ID when the parcel arrives, or when someone collects?
- [ ] **Does the licence say anything about the website** (what must be shown)? Ask his adviser.
- [ ] **Who looks over the age policy and the delivery rules** before launch?

---

## 5. Legal pages and business details (10 min)

*Why: a shop website must say who the shop is, and how it looks after people's information.*

- [ ] **Full legal name**, address, email and **company number** (if it is a limited company)
- [ ] **VAT number**
- [ ] **Is he registered with the ICO** (the data protection office)?
- [ ] **Who writes or checks:** privacy notice, terms of sale, returns and refunds. We have only drafts with notes.
- [ ] **Cookies:** do we use any tracking (analytics)? If not, we can keep it simple.

---

## 6. Words, pictures and details (the rest of the visit)

*Why: the site is built. It needs his real things.*

- [ ] **Logo file** (vector) and **colours** (hex codes)
- [ ] **Photos and video:** see the photo plan (`what-to-shoot`)
- [ ] **Every product:** name, short description, size, price, **ABV, allergens (from the label)**, "goes well with"
- [ ] **Opening hours** with Tuesday, bank holidays and Christmas
- [ ] **About text** and what he does **not** do
- [ ] **Hampers:** what goes in, price, gift message, send to someone else?
- [ ] **Events:** what he does, how many people, prices
- [ ] **Keezer and keg rental:** what it is, price, deposit, dates, delivery, rules
- [ ] **Links:** Instagram, YouTube, Google Business Profile (and ask to be added as a manager there)
- [ ] **Newsletter:** which tool he uses, and what he will send

---

## 7. Decisions he must make

1. [ ] **Which concept he likes** (the feedback file from the board)
2. [ ] **Date he wants to go live.** He told us the site should be done by 31 January 2027.
3. [ ] **Who looks after the site after launch** (updates, hosting)
4. [ ] **Who pays for hosting** and where the bill goes
5. [ ] **What happens if something breaks** (who we ring)

---

## What will hold it back (in order)

1. **Shopify access and products** (nothing can be bought without them)
2. **Licence and age check answers** (can stop the launch)
3. **Domain and DNS access** (nobody can find the site without it)
4. **Legal pages checked**
5. **Real photos and product details**

---

## What I do on my side (not from him)

- [ ] Connect the Storefront token in `config.js` and test a real order in test mode
- [ ] Point the domain at Vercel and add the email lines safely
- [ ] Turn off the "private" setting and add the sitemap
- [ ] Replace temporary AI pictures and "to be confirmed" tags with his real ones
- [ ] Final check: phone, speed, accessibility, test order, test collection slot

---

**Next:** put this on your phone and start with "Ask first".
