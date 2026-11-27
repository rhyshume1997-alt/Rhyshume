# Editing the website: a short guide for Michael and staff

Most day-to-day changes are made in **Shopify**. The website reads Shopify, so a change there appears on the site without any developer. New pages, layout and wording that is not a product (such as the opening hours, FAQ answers and delivery wording) are website changes and go through Rhys.

How quickly a change shows: the site refreshes its copy of Shopify about every 5 minutes. If a change has not appeared after 10 minutes, tell Rhys.

This guide was written from the code, and the website side of each step was tested against a test shop. The Shopify screens themselves could not be opened, so names of buttons in Shopify may differ slightly. Walk through it once with Rhys before relying on it.

## In Shopify

**Change a product description.** Products, open the product, edit the Description box. Write plain text. The site shows the whole description (put allergen information in it only once it has been checked against the label or supplier sheet). Your description is used instead of the standard wording the site has for some beers. If the box is empty, the site falls back to that standard wording for those beers, so leave the box empty if you want that.

**Change a price.** Products, open the product, change the Price of the variant, Save. The site always shows Shopify's price. Nothing on the website is typed in by hand.

**Change stock.** Products, Inventory, set the quantity. A product that is out of stock (and not set to keep selling) shows **Sold out** and cannot be added to the basket. The "Only N left" note shows only when the shop's website connection has permission to read stock numbers. That permission is not confirmed yet. Ask Rhys.

**Mark something unavailable.** Either set the stock to 0 (the site shows Sold out) or set the product to Draft or Archived (it disappears from the site).

**Add a photograph.** Products, open the product, Media, add the picture. The first image is the one the site uses. Use a clear photo, square or close to it.

**Add a new product.** Products, Add product. Fill in the name, description, price, photo and stock. Two things decide where it appears:
- **Product type** (spell it like these): `Beer`, `Hard Cider`, `Wine`, a deli word such as `Deli`, `Hamper` for gift hampers, `Event Tickets` for events. A type the site does not recognise is not shown.
- **Tags**: a beer style tag (Lager, Pale Ale, IPA, Sour, Stout, Porter, Ale, Cider) puts it under that filter.
- The product must be available to the sales channel the website uses. If a new product does not appear, check this first.

**Add or change an event.** Create a product with the product type `Event Tickets`, add the tags `date:2026-12-12` (year, month, day) and, if wanted, `time:19:00`. The title, description, photo and ticket price come from the product. It shows on the Events page and the shelf. Remove it by setting it to Draft or Archived. Past events drop off by date. Event checkout through Shopify is not switched on yet.

## On the website (through Rhys)

- Opening hours, address, phone, FAQ answers, delivery wording, prices on the Draught Club page, homepage text and photos.
- The built-in beer flavour notes and pairings (a fixed list in the code). A Shopify description replaces the note for that beer.
- The Christmas look, sponsorship, membership and keezer pages do not exist yet.

## Not available yet

- **"What's happening this week":** there is no weekly notice area. For now, put one-off dates in as events (above). A weekly notice needs a small addition that Rhys will propose.
- **Owners page for events:** the page exists, but no sign-in is set up and it does not save to Shopify yet. Do not rely on it.
- **Allergen information:** the site does not show allergens yet. Nothing has been published. Do not put unchecked allergen information in a description. The allergen declarations from supplier documents need checking first.
- **500 ml and 1 litre sizes:** the site is ready to use Shopify's size options on a product when they exist, but sizes have not been created or priced, and there is no size picker on the product yet.

## What is switched off

Online checkout is off. Customers can fill a basket but cannot pay online until Rhys switches it on after the delivery, licensing and age-check arrangements are confirmed.
