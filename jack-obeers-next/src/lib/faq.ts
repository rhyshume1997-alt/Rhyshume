import { ADDRESS_LINE, PHONE } from "@/lib/site";

/**
 * Plain answers for people and for AI answer engines. Short, one fact each, in Michael's plain tone.
 * `confirm` is shown on the page as "[Michael to confirm]" and is not part of the structured data.
 */
export type Faq = { q: string; a: string; confirm?: boolean };

export const FAQ: Faq[] = [
  { q: "Where is Jack O’Beers and Deli?", a: `We are at ${ADDRESS_LINE}, near the start of the West Highland Way.` },
  { q: "How far are you from the start of the West Highland Way?", a: "About 200 metres, according to the West Highland Way listing.", confirm: true },
  {
    q: "What is takeaway draught beer?",
    a: "We have 23 taps on the wall. Pick a beer or cider from the taps and we fill a 500ml or 1 litre bottle for you straight from the keg, with no foam. Wine can be transferred into a 500ml or 1 litre bottle too.",
  },
  { q: "How long does takeaway draught beer keep?", a: "A sealed bottle keeps for up to two weeks." },
  { q: "What are your opening hours?", a: "We are open Wednesday to Monday, 11am to 7pm, and closed on Tuesday.", confirm: true },
  { q: "Do you sell cans and bottles?", a: "Yes. Our fridges are full of craft beer, cider and wine, including cans. You can also take home a fresh bottle filled from the taps." },
  { q: "Do you sell wine and cider?", a: "Yes, both, and frizzante. Our wines include Georgian wines such as Tsinandali and Saperavi. Cider is on the taps and in the fridge." },
  {
    q: "What deli food do you sell?",
    a: "Pork pies, salami beer sticks, cheeses, oatcakes, chutneys and chilli jams. You can also sit in to try our soups, dumplings and pies, with charcuterie.",
  },
  {
    q: "Can I order online?",
    a: `Not yet. Online checkout is being set up, and you can add things to your basket now. Until then, come into the shop or call ${PHONE}.`,
    confirm: true,
  },
];
