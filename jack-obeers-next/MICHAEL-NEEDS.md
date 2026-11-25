# What Michael needs to send

Everything below is hidden or written without a note on the site right now. Nothing on the pages says "to be confirmed".
When Michael sends the item, it goes in the place named.

## Home page

- **Deli items:** the price of each item (pork pie, salami beer sticks, cheese, oatcakes, chutney, chilli jam), a photo of each,
  and allergen details. Until the items are in Shopify the deli list shows names only (popcorn at 3.50 pounds is confirmed).
  Put each one in Shopify as a product with product type "Deli" and the list, prices, photos and Add to basket appear by themselves.
- **Gift hampers:** the whole section is hidden. It appears when a Shopify product has product type "Hamper". Needs: what is in each
  hamper, a photo, the price, and whether gift messages, wrapping and sending to another address are offered.
- **"What's on this week" on the taps:** the line is hidden. Needs: what is on the taps this week, if he wants it shown.
- **Click and collect:** which days and time slots, and how long before an order is ready.
- **Keg and keezer hire:** the whole item is hidden. Needs: whether it is offered, what is hired, the price, the deposit and how people choose dates.
- **Delivery:** which couriers, how the age check works on delivery, the rules for delivering alcohol, and whether he will send abroad.
  Also check 50 pounds free delivery and 4.99 under it against the Shopify shipping setup.
- **Opening hours:** confirm Wednesday to Monday 11am to 7pm and Tuesday closed, and whether bank holidays differ.
- **Hero card:** confirm "2 minutes from Milngavie station" and "200 m from the West Highland Way start".
- **Google reviews:** the shop's Google Place ID, so "Leave a review" opens the review box directly. Until then the button
  opens the Google listing. Set `placeId` in `src/lib/site.ts`. I could not find it from the short Google link.
- **Footer:** the pages for the age policy, privacy and terms (links are hidden until the pages exist), and a YouTube channel if there is one.

## About us

- **Supplier names:** check the spelling of Jarvis Pickle, Hammond and Belhaven.
- **Photo of Tanya on her own:** the only photo of her is the one with Michael (`michael-and-tanya`). Send one of her alone if wanted.
- **"They truly are amazing"** is Michael's own wording from his welcome. Remove it if he would rather not have it.

## Events

- **Events:** the page says "Events coming soon" with the newsletter until real events are in Shopify. Each event needs a date, a time,
  a price and a short description (product type "Event Tickets", tags `date:YYYY-MM-DD` and `time:HH:MM`).

## The Draught Club

- **How people join and pay:** the cards show "Ask about joining", which calls the shop. Needs: how joining and monthly payment will work.
- **Prices:** the page uses 24.99 a month (The Regular) and 39.99 a month (The Legend), from the leaflet Rhys gave earlier.
  The draft products in Shopify must be set to the same prices. The 11.99 draft is not used anywhere on the site.

## Members area

- **Sign-in:** how members sign in (the sign-in button is hidden), and what each members-only section should say (the sections show only their titles).

## FAQ and walkers page

- **Answers to confirm:** the opening hours, "about 200 metres" from the West Highland Way start (from the West Highland Way listing),
  and "Online ordering: not yet". Change the answer in `src/lib/faq.ts` when ordering opens.
- **Wine stock:** the FAQ names Georgian wines (Tsinandali, Saperavi). Check they are in stock.

## Shopify settings (for Rhys)

- **Read inventory:** tick this permission on the Storefront API token or "Only N left" never shows.
- **Best sellers and New in** show only when Shopify has the sales and created dates. They hide themselves otherwise.
