import { SHOP } from "@/lib/brand";
import { ADDRESS_LINE, EMAIL, NAME, PHONE, abs } from "@/lib/site";

export const dynamic = "force-static";

/** A short plain summary for AI answer engines. Same name, address and phone as the footer and the page schema. */
export function GET() {
  const text = `# ${NAME}

> Independent craft beer, cider and wine shop and deli in Milngavie, near the start of the West Highland Way. Fresh draught beer to take away in 500ml or 1 litre bottles.

## The shop

- Address: ${ADDRESS_LINE}
- Phone: ${PHONE}
- Email: ${EMAIL}
- Opening hours: ${SHOP.hours}
- 23 taps on the wall. Beer, cider and wine can be transferred into a 500ml or 1 litre bottle to take home. A sealed bottle keeps for up to two weeks.
- Deli: pork pies, salami beer sticks, cheeses, oatcakes, chutneys and chilli jams. A sit-in menu with soups, dumplings and pies.
- Online checkout is not open yet.

## Pages

- [Home](${abs("/")}): the shop, opening hours and the shelves
- [Beer](${abs("/beers")}): the beer range with prices and ABV
- [Cider](${abs("/ciders")}): the cider range
- [Wine](${abs("/wines")}): the wine range, including Georgian wines
- [Walkers on the West Highland Way](${abs("/west-highland-way")}): near the start of the trail
- [Questions and answers](${abs("/faq")}): short answers about the shop
- [Events](${abs("/events")}): what is on and how to get a ticket
- [The Draught Club](${abs("/draught-club")}): monthly memberships
- [About us](${abs("/about")}): Michael and Tanya, who run the shop
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
