// Google Ads skill · the settings sheet: what each setting should be for what the person
// wants, next to what Google does with it. Used by `gads plan`, by the check's wording and by
// the page on the site.
//
// "google" lines say only what Google's own help pages say (support.google.com/google-ads,
// read November 2026): 15909989 AI Max on by default; 1722047 search partners included by
// default; 1722043 location options; 2375423 budgets; 3438531 counting; 6268632 and 6268637
// bidding; 7684791 and 9921843 responsive search ads; 7478529 match types; 10279006 auto-apply.

import { RULES, moneyFn } from "./engine.mjs";

export const GOAL_LIST = [
  { id: "leads", label: "Leads", line: "Forms, quote requests, bookings." },
  { id: "sales", label: "Sales", line: "Orders on your website." },
  { id: "calls", label: "Calls", line: "The phone ringing while you're open." },
  { id: "visits", label: "Visits", line: "People walking into your place." },
];

const ROWS = {
  networks: {
    name: "Networks",
    short: "Google Search only",
    googleShort: "Search partners included by default",
    set: "Google Search only. Untick search partners and the Display Network.",
    google: "Search partners are included by default.",
    why: "Partners and banners spend the same budget on people who weren't searching on Google. Add them back later if the numbers earn it.",
    where: "Settings → Networks",
  },
  location: {
    name: "Location option",
    short: "Presence: people in your area",
    googleShort: "Recommends \"Presence or interest\"",
    set: "Presence: people in or regularly in your area.",
    google: "Recommends \"Presence or interest\", which adds people elsewhere searching about your area.",
    why: "\"Interest\" reaches someone far away who typed your city's name.",
    where: "Settings → Locations → Location options",
  },
  locationWide: {
    name: "Location option",
    short: "Presence or interest",
    googleShort: "Recommends \"Presence or interest\"",
    set: "Presence or interest: visitors search about your area before they arrive.",
    google: "Recommends \"Presence or interest\".",
    why: "For hotels, movers, real estate and events the buyer is often somewhere else when they search.",
    where: "Settings → Locations → Location options",
  },
  aimax: {
    name: "AI Max",
    short: "Off until 30+ conversions a month",
    googleShort: "On by default in new Search campaigns",
    set: `Off to start. Test it once the campaign brings ${RULES.bid_judge}+ conversions a month.`,
    google: "On by default in every new Search campaign.",
    why: "It matches searches beyond your keywords and can rewrite your ad text and pick other pages. With no history it has nothing to aim with.",
    where: "Settings → AI Max",
  },
  aimaxSales: {
    name: "AI Max",
    short: "Off until 30+ sales a month",
    googleShort: "On by default in new Search campaigns",
    set: `Off to start; text customization and final URL expansion off. Test it at ${RULES.bid_judge}+ sales a month.`,
    google: "On by default in every new Search campaign.",
    why: "It can send a click for one product to another page. Prove the keywords first.",
    where: "Settings → AI Max",
  },
  bidLeads: {
    name: "Bidding",
    short: "Maximize conversions, target later",
    googleShort: "Judges a target over 30+ conversions",
    set: `Maximize conversions, no target yet. Add your target cost after ${RULES.bid_judge} conversions in 30 days.`,
    google: `Judges Target CPA over 30 days with at least ${RULES.bid_judge} conversions.`,
    why: "A target set before there is data is a guess, and a low guess stops the ads showing.",
    where: "Settings → Bidding",
  },
  bidSales: {
    name: "Bidding",
    short: "Maximize conversion value, target later",
    googleShort: "Wants 15 conversions in 30 days for Target ROAS",
    set: `Maximize conversion value. Add a target return after ${RULES.bid_learn} sales in 30 days.`,
    google: `Asks for at least ${RULES.bid_learn} conversions in 30 days before Target ROAS.`,
    why: "Bidding for value needs the order amounts and enough orders to learn from.",
    where: "Settings → Bidding",
  },
  bidCalls: {
    name: "Bidding",
    short: "Maximize conversions on real calls",
    googleShort: "Judges a target over 30+ conversions",
    set: "Maximize conversions, counting calls that last long enough to be a real enquiry.",
    google: `Judges Target CPA over 30 days with at least ${RULES.bid_judge} conversions.`,
    why: "A 5-second call is a wrong number. Set the call length that counts (60 seconds is a common start).",
    where: "Settings → Bidding, and Goals → Conversions → the call action",
  },
  bidVisits: {
    name: "Bidding",
    short: "Maximize conversions on calls and directions",
    googleShort: "Judges a target over 30+ conversions",
    set: "Maximize conversions, counting calls and direction requests.",
    google: `Judges Target CPA over 30 days with at least ${RULES.bid_judge} conversions.`,
    why: "Direction requests and calls are the closest thing to a visit you can count from day one.",
    where: "Settings → Bidding",
  },
  countOne: {
    name: "Counting conversions",
    short: "One per click",
    googleShort: "Advises One for leads, Every for sales",
    set: "One per click.",
    google: "Advises \"One\" for leads and \"Every\" for sales.",
    why: "One person who sends the form three times is one lead.",
    where: "Goals → Conversions → Summary → the action → Count",
  },
  countEvery: {
    name: "Counting conversions",
    short: "Every, with the order value",
    googleShort: "Advises Every for sales, One for leads",
    set: "Every, with the order value.",
    google: "Advises \"Every\" for sales and \"One\" for leads.",
    why: "Two orders are two sales, and the amounts are what the bidding aims at.",
    where: "Goals → Conversions → Summary → the action → Count, Value",
  },
  budget: {
    name: "Budget",
    short: "Monthly budget ÷ 30.4 a day",
    googleShort: "Can spend 2× the daily budget in a day",
    set: "Your monthly budget ÷ 30.4 as the daily amount.",
    google: "May spend up to 2× the daily budget in a day, and at most 30.4× in a month.",
    why: "The daily number is an average, not a cap. The month is the cap.",
    where: "Settings → Budget",
  },
  autoapply: {
    name: "Auto-apply recommendations",
    short: "Off",
    googleShort: "Adds keywords and changes targets when on",
    set: "Off. Read each recommendation and decide.",
    google: "When on, it can add keywords, widen match types and change targets without asking.",
    why: "It changes what you pay for while you aren't looking.",
    where: "Recommendations → Automatically apply recommendations → Manage",
  },
  keywords: {
    name: "Keywords",
    short: "Phrase and exact to start",
    googleShort: "A keyword with no symbols is broad match",
    set: "Phrase and exact match to start, 5 to 20 per ad group, one theme each.",
    google: "A keyword typed with no symbols is broad match.",
    why: "Broad match is \"related to\" your keyword. Start with the searches you'd pay for, then widen.",
    where: "Campaigns → Audiences, keywords, and content → Search keywords",
  },
  ads: {
    name: "Ads",
    short: "10+ headlines, 4 descriptions, 14/20",
    googleShort: "Says Ad Strength isn't used in the auction",
    set: `1 or 2 responsive search ads per ad group, 10+ headlines, 4 descriptions, ${RULES.ad_pass}/20 or more from the critic.`,
    google: "Allows 3 per ad group and rates them with Ad Strength, which it says is not used in the auction.",
    why: "Google mixes the lines to find what works. Give it distinct ones, each saying something.",
    where: "Ads → + → Responsive search ad",
  },
  assets: {
    name: "Extras under the ad",
    short: "4+ sitelinks, callouts, snippets, images",
    googleShort: "Suggests 4 or more sitelinks",
    set: "At least 4 sitelinks, plus callouts, structured snippets and images.",
    google: "Suggests at least 4 sitelinks; more is better.",
    why: "They make the ad bigger for the same cost per click.",
    where: "Assets → +",
  },
  assetsCalls: {
    name: "Extras under the ad",
    short: "A call asset on your opening hours",
    googleShort: "Suggests 4 or more sitelinks",
    set: "A call asset on your opening hours, at least 4 sitelinks, callouts.",
    google: "Suggests at least 4 sitelinks; more is better.",
    why: "The call button is the whole point; outside opening hours it rings nobody.",
    where: "Assets → + → Call",
  },
  assetsVisits: {
    name: "Extras under the ad",
    short: "Your Business Profile linked",
    googleShort: "Suggests 4 or more sitelinks",
    set: "Your Business Profile linked so the address shows, at least 4 sitelinks, a call asset.",
    google: "Suggests at least 4 sitelinks; more is better.",
    why: "The address and distance under the ad are what bring someone through the door.",
    where: "Assets → + → Location",
  },
  scheduleCalls: {
    name: "Ad schedule",
    short: "Only the hours someone answers",
    googleShort: "Runs at all hours unless you set one",
    set: "Only the hours someone answers the phone.",
    google: "Shows ads at all hours unless you set a schedule.",
    why: "A call at 2 a.m. costs the same click and reaches voicemail.",
    where: "Ad schedule",
  },
  radius: {
    name: "Locations",
    short: "A radius people really travel",
    googleShort: "Targets by country, city or radius",
    set: "A radius around your address, as far as people really travel to you.",
    google: "Lets you target by country, city or a radius around a point.",
    why: "Outside that distance a click is a visit that won't happen.",
    where: "Settings → Locations → Advanced search → Radius",
  },
  pmax: {
    name: "Performance Max",
    short: "After Search works, brand excluded",
    googleShort: "URL expansion and AI text on by default",
    set: "Only after Search works, with your brand name excluded.",
    google: "Final URL expansion and text automation are on by default in Performance Max.",
    why: "Without the exclusion it can buy searches for your own name and count them as its wins.",
    where: "Settings → Brand exclusions",
  },
};

const BY_GOAL = {
  leads: ["networks", "location", "aimax", "bidLeads", "countOne", "budget", "autoapply", "keywords", "ads", "assets"],
  sales: ["networks", "location", "aimaxSales", "bidSales", "countEvery", "budget", "autoapply", "keywords", "ads", "pmax"],
  calls: ["networks", "location", "scheduleCalls", "aimax", "bidCalls", "countOne", "budget", "autoapply", "keywords", "assetsCalls"],
  visits: ["networks", "radius", "location", "aimax", "bidVisits", "countOne", "budget", "autoapply", "ads", "assetsVisits"],
};

/** The rows for a goal. `reach: "interested"` swaps the location row. */
export function sheet(goal = "leads", { reach = "there" } = {}) {
  const keys = BY_GOAL[goal] || BY_GOAL.leads;
  return keys.map((k) => ROWS[k === "location" && reach === "interested" ? "locationWide" : k]);
}

/** The sheet as text, with the brief's own numbers. `budget`: this campaign's own monthly amount. */
export function renderSheet(briefIn, currency = "USD", { budget = null } = {}) {
  const brief = { where: [], languages: [], hours: null, ...briefIn };
  const money = moneyFn(currency);
  const rows = sheet(brief.goal, brief);
  const L = [];
  L.push(`Settings sheet · ${brief.business || "your business"} · goal: ${brief.goal}${brief.where.length ? ` · ${brief.where.join(", ")}` : ""}`);
  L.push("Set these while you create the campaign, in this order. Nothing here is live until you publish.");
  L.push("");
  const month = budget || brief.monthly_budget;
  const out = [];
  for (const r of rows) {
    let set = r.set;
    if (r.name === "Budget" && month) set = `${money(month / RULES.month_days, true)} a day (${money(month)} ÷ 30.4). One day can reach ${money((month / RULES.month_days) * RULES.day_burst, true)}.${budget ? "" : " That is your whole month: if other campaigns keep running, give this one its share (gads plan --budget <its monthly amount>)."}`;
    if (r.name === "Bidding" && brief.target_cost && brief.goal !== "sales") set += ` Your target: ${money(brief.target_cost, true)}.`;
    if (r.name === "Bidding" && brief.target_roas && brief.goal === "sales") set += ` Your target: ${brief.target_roas}×.`;
    if (r.name === "Ad schedule" && brief.hours) set = `${brief.hours[0]}:00 to ${brief.hours[1]}:00, on the days someone answers.`;
    out.push({ ...r, set });
    // The places and the languages come right after the location option.
    if (r.name === "Location option") {
      if (!rows.some((x) => x.name === "Locations")) out.push({ name: "Locations", set: brief.where.length ? `${brief.where.join(", ")}. Nothing wider.` : "The places your customers are in. Nothing wider.", google: "With no location set, a campaign can show in every country.", why: "A country chosen where a city was meant is the commonest expensive slip.", where: "Settings → Locations" });
      out.push({ name: "Languages", set: brief.languages.length ? brief.languages.join(", ") : "The languages your customers search in.", google: "Matches the language of the search and of the person's settings.", why: "An ad in one language shown to people searching in another rarely gets the click.", where: "Settings → Languages" });
    }
  }
  if (brief.hours && !out.some((r) => r.name === "Ad schedule")) out.push({ name: "Ad schedule", set: `If the phone matters: ${brief.hours[0]}:00 to ${brief.hours[1]}:00, on the days someone answers.`, google: "Shows ads at all hours unless you set a schedule.", why: "A call nobody answers costs the same click.", where: "Ad schedule" });
  out.forEach((r, i) => {
    L.push(`${String(i + 1).padStart(2)}. ${r.name}: ${r.set}`);
    L.push(`    Google: ${r.google}`);
    L.push(`    Why: ${r.why}`);
    L.push(`    Where: ${r.where}`);
  });
  return L.join("\n");
}
