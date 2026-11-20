# Refero Styles research guide

Refero Styles (https://styles.refero.design/) is a major shared research source for every website project. This guide records what it is, what was actually studied, the patterns found, and how to use it **as structured inspiration without copying**. Everything marked "measured" was extracted from the records by script on 2026-11-20 and uses heuristics where stated.

## 1. What it is (verified: read, and viewed for one record)

- A library of AI-readable design systems from real product websites. The home page says it offers "2,000+ AI-readable design systems from leading product websites", each with colours, typography, spacing, components and a DESIGN.md "you can use in Cursor, Claude Code, Codex, v0, or Lovable". It is labelled Beta, with new styles added weekly.
- **Status of the records (Refero's own wording in every record):** "Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components." Refero also states they are **not official brand guides**. Treat each record as a third-party, generated interpretation of a site, never as the brand's own system.
- **Reuse terms: unknown.** No terms or licence page was found on the pages fetched. Its font-pairings page says to "check licensing before reusing a font". Treat all records as study material.
- Refero also advertises an MCP connector (refero.design/mcp). It was **not inspected**: that host was not reachable or approved. Do not enable paid or account-linked features without the owner's approval.

## 2. What was studied

| Material | Status |
| --- | --- |
| **54 style records** (the full DESIGN.md of each, listed in the appendix) | Verified: read, by script. These are the records linked from the home page and from Refero's DESIGN.md, design-prompts and design-resources collection pages, a sample of a library of 2,000+. |
| Collection pages: DESIGN.md examples, design prompts, design resources | Verified: read |
| Website font pairings from real designs (/design-styles/website-font-pairings) | Verified: read (first part) |
| AI Generated UI Quality Checklist (/ai-agents/agentic-ui-quality-checklist) | Verified: read |
| Brand Matching Prompts, DESIGN.md Specification | Verified: read (intro only) |
| Editorial examples, What Is DESIGN.md, DESIGN.md template, DESIGN.md vs Design Tokens | Fetched, **not read** |
| Rendered appearance | One record (Intercom) was viewed; third-party images did not load |

## 3. How a record is structured (the useful part)

Every one of the 54 records contains: Tokens: Colors, Tokens: Typography, Tokens: Spacing & Shapes, Components, Do's and Don'ts, Imagery, Agent Prompt Guide, Quick Start (CSS custom properties and Tailwind v4) and Similar Brands (54 of 54). Layout appears in 53, Surfaces in 50, Elevation in 49. Colours are given with a name, value, token and a **role sentence**; type is given per face with a role, weights, sizes, line height and letter spacing, plus a named type scale. This is the structure our project `DESIGN.md` borrows (roles over values).

## 4. Patterns across the 54 records (measured; counts of explicit fields unless marked heuristic)

| Topic | Finding |
| --- | --- |
| Theme | 41 light, 9 dark, 4 mixed |
| Spacing base unit | 4px in 37, 8px in 7, 6px in 1, not stated in 9 |
| Density | comfortable 39, compact 14, spacious 1 |
| Corner radius values used (records using each) | pill/9999px 24, 4px 17, 8px 15, 12px 13, 0px 13, 10px 11, 16px 11 |
| Colour discipline (heuristic: saturated mid-tone colours listed) | 17 records list none, 16 list one, 7 two, 14 three or more: 33 of 54 use at most one chromatic accent |
| Typefaces per record | one in 15, two in 20, three or more in 19 |
| Pairing shape (heuristic, from the substitute lists) | sans only 21; sans + serif 14; mono + sans 8; mono + sans + serif 6; serif only 5. A serif somewhere in the system: 25 of 54 |
| Most common component | top navigation bar (16 records, plus 6 as "navigation bar"), then announcement bar and ghost text button |
| Mood words in the one-line descriptions | white 16, gallery 15, warm 12, editorial 12, paper 9, cream 7, parchment 5 |

### Two warnings the numbers raise

1. **Refero's substitute fonts homogenise.** Inter appears in the substitute list of 36 of 54 records. If a design takes the "free substitute" every time, every site ends up in Inter. Choose type for the client, then check licences; never accept a substitute just because it is listed.
2. **The current trend is warm paper and white gallery.** The most common mood words are white, gallery, warm, editorial, paper and cream. A client site built only from the most-represented moods will look like everyone else's. Use Refero to understand structure and role, then deliberately move away from the dominant look. Record what you did differently.

## 5. Research playbook by area

For each area: where to look, what to take (a role or a principle), what not to take.

| Area | Where in Refero | Take | Do not take |
| --- | --- | --- | --- |
| **Typography and font pairings** | The Tokens: Typography section of a record (family, role, weights, sizes, letter spacing, named type scale); the font-pairings collection | How type is divided between headline, reading and technical detail (for example the collection's "serif for the message, sans for the work" examples: Midday, OLIPOP, Fable, Altitude; or a display sans with a quieter reading face: Caldera, Slush, Family, Jitter). Size ratios and tracking at display sizes. Whether weight carries hierarchy | The font names themselves where commercial (for example Söhne, Aeonik, Canela, Tiempos, PP Neue) without a licence check; the substitute list as a decision |
| **Colour palettes and contrast** | Tokens: Colors with its **role sentences**; Surfaces; Do's and Don'ts | Roles (canvas, raised surface, hairline, text, secondary text, single accent) and how few chromatic colours carry a system. Recompute contrast yourself from the hex values | A palette copied wholesale. Contrast figures from anywhere but your own computation |
| **Spacing and layout composition** | Tokens: Spacing & Shapes (base unit, scale, radius, density); Layout | Base unit, density, how often radius or hairlines are used, section rhythm | Pixel values as a template. They describe someone else's content |
| **Component structure and visual hierarchy** | Components; Surfaces; Elevation; the AI quality checklist's layers | Which components a system needs and how each is weighted; checking hierarchy first (primary message, state, action), then consistency, then real states and viewports | Component markup. Refero says its HTML examples are reconstructions |
| **Interaction patterns and consistency** | Components (states), Do's and Don'ts, Agent Prompt Guide | The set of states each component defines (hover, selected, disabled, long content) and that the same thing looks the same everywhere | Any motion details. Refero captures static design systems; use the motion references for behaviour |
| **Brand identity and creative direction** | The record's one-line description and prose; Similar Brands; Imagery; the brand-matching prompts page | What the identity is *about* (a single idea such as "midnight precision instrument" or "warm cream editorial") and the neighbours it is compared with, as a way to find directions that are genuinely different | Another brand's identity. Use Similar Brands to map the space and then choose a position nobody on the list occupies |

## 6. How to use it in the design process

1. **Before researching, inspect the client's own identity and website** (if any). Refero is for widening the options, not replacing the client.
2. **Search by role, not by look.** Pick three to six records that differ in mood, theme and density (for example one warm editorial, one technical or blueprint, one dark product, one outsider) so the research spans the space.
3. **Read each record's Components and Do's and Don'ts, not only its colours.** Extract roles into a short table.
4. **Compare, do not merge.** Say what each record does well for this client's job, and what would be wrong for them.
5. **Write the provenance.** Refero's own prompt template asks an agent to "explain which visual decisions came from the reference and which you changed". Do the same in the project's `DESIGN.md`: for each decision, state *taken from*, *changed* or *not used*, and the record URL.
6. **Check licences** before using any font, code or asset. Prefer fonts with a clear open licence or ones the client already licenses.
7. **Distinctiveness check:** compare against sibling projects and against the dominant Refero look (section 4). If the result could be mistaken for either, push the direction further.

## 7. The index of 54 studied records

Theme and base unit are from the record; "n/s" means not stated. The description is Refero's own one-line summary, not ours.

| Record | Theme | Base | Refero's one-line description | URL |
| --- | --- | --- | --- | --- |
| Aboard | light | n/s | pastel paper notebook on a white desk | https://styles.refero.design/style/fabacd2a-acb6-46c4-939c-4a464df15440 |
| Ada | light | 4px | Daylight gallery with pastel punctuation — a quiet off-white room where four jewel-tone colors are allowe… | https://styles.refero.design/style/f23e132d-3bfb-498d-a2e4-6d069b4dbc59 |
| Adam Lippes | light | n/s | Monochrome editorial atelier on cream paper — a Vogue spread where the layout grid, not the color palette… | https://styles.refero.design/style/cdc4a162-cefa-49a1-81e7-4857e421ae24 |
| Airbnb | light | 4px | Quiet white gallery wall with one coral-red bookmark | https://styles.refero.design/style/c2325884-4391-4688-85cd-e143f5107517 |
| Apple | dark | n/s | Midnight hardware gallery. Treat each section as a dark, museum-like plinth for one precisely lit product… | https://styles.refero.design/style/40be36d7-7fe6-4451-9f2d-7ceccfd43be8 |
| Apple | light | 4px | foldable device in a white gallery. Center product renders as the visual event, with typography and blue … | https://styles.refero.design/style/a73148b9-449b-42cd-9f38-86ef694f500e |
| Bang & Olufsen | light | 4px | Scandinavian gallery on porcelain. When a B&O page goes dark, the product is lit like a sculpture in a mi… | https://styles.refero.design/style/27a4a4fa-4b1a-4e7e-b2c3-3e5bf57f00e5 |
| bella Kitchen Appliances | light | 4px | Sunlit kitchen counter at golden hour — warm cream surfaces with a single pop of coral. | https://styles.refero.design/style/e327d332-270d-4779-a55c-cd82b8624d2a |
| Brex | light | 8px | White concrete, single ember — a clinical financial instrument where one orange spark does all the talkin… | https://styles.refero.design/style/b58d92f6-68a8-4358-8fc9-6ea58e6d483b |
| Canva | light | 4px | candy-colored creative studio — a white canvas floating inside a gradient sky | https://styles.refero.design/style/62f89392-609d-45b7-b9df-7a5acd529864 |
| Craft Docs | light | 4px | Digital Scrapbook Collage. The design feels like a thoughtful, tactile scrapbook where structured digital… | https://styles.refero.design/style/9f228e72-997a-4410-9190-68359028e3d0 |
| Cursor | light | 4px | Warm parchment atelier lit by embers | https://styles.refero.design/style/4e3b4717-84c8-4599-baaf-a343c3d619b6 |
| ElevenLabs | light | 4px | Warm cream editorial with whispered headlines. A Bauhaus studio notebook — eggshell paper, black ink, a s… | https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26 |
| Evervault | dark | 4px | Encrypted vault behind ultraviolet light — a dark crypt where one violet beam reveals everything. | https://styles.refero.design/style/03dcd158-bc4d-447b-aaf2-8e522671a109 |
| FARFETCH España | light | 8px | White-cube fashion gallery. Imagine a high-end retail space where the walls, floors, and fixtures have be… | https://styles.refero.design/style/600002c5-c5f5-4df0-adf6-6324ee6255c0 |
| Figma | light | 4px | white gallery wall with a single indigo spotlight. | https://styles.refero.design/style/5fd3b3b4-02ab-456a-87aa-e4395636b671 |
| Flim | light | 4px | Scattered polaroids on a sketchpad grid | https://styles.refero.design/style/94ed6ce8-c2e5-45bf-83bd-e5d1daf63efc |
| Freitag | light | 4px | Swiss industrial catalog — a printed manifest of truck tarpaulins laid flat on poured concrete, where the… | https://styles.refero.design/style/d75a643b-a518-4550-b430-679cd989a447 |
| Home | light | n/s | Warm editorial atelier. Cream paper, charcoal ink, and one ember-orange period of emphasis — a job platfo… | https://styles.refero.design/style/2230ba53-445e-411d-b483-16410a072639 |
| Hyer Aviation | mixed | 4px | Cockpit twilight over parchment. A pale dawn-sky meets a slab-serif logo the size of a fuselage, with one… | https://styles.refero.design/style/f61cf515-ccd5-4494-bdd1-be9fe4d7258c |
| Intercom | light | 4px | Warm cream editorial spread | https://styles.refero.design/style/12255b63-e506-4bc1-a4cd-d05487de32f3 |
| Linear | dark | 4px | midnight precision instrument | https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1 |
| Liquid Death | mixed | 4px | Heavy Metal Vending Machine | https://styles.refero.design/style/b6f2b036-e48e-452f-b003-941c491015c0 |
| Miranda | light | 4px | Old-world broadsheet on warm cream — newspaper editorial for the digital age. | https://styles.refero.design/style/3f6e3076-e77f-487e-b212-3b5946a34e87 |
| Mobbin | light | 8px | Grayscale specimen board — a printer's proof sheet where typographic weight IS color. | https://styles.refero.design/style/ef44a995-6745-4dc7-86ab-f7227f108f81 |
| Nathan Riley | light | n/s | Gallery wall in a black void. A monochrome portfolio where the grid of atmospheric renders is the only co… | https://styles.refero.design/style/1c516bc6-278b-4cf6-bfe8-c5a39118e730 |
| Nike.com | mixed | 4px | monochrome gallery of athletic performance — white walls, product as art, chrome dissolved into the backg… | https://styles.refero.design/style/d7ace114-0548-41f5-a2ff-2afbf32be94d |
| Norgram | light | 4px | white-walled art gallery | https://styles.refero.design/style/17e5ff99-38c1-4ad6-8910-648f5798b3a5 |
| OFFFICE : | dark | 8px | noir gallery swallowed by monolithic type | https://styles.refero.design/style/190d4a0b-0353-4fc8-be09-affa6e977146 |
| OpenAI | light | 4px | Research lab notebook at noon. | https://styles.refero.design/style/dc541737-8bf2-4b31-b729-0352f696e82f |
| ORYZO AI | dark | n/s | Darkroom product editorial. A lone object floating in warm darkness, cream typography the only decoration. | https://styles.refero.design/style/1f204e95-454a-437e-845b-c1b169d35607 |
| Peak Design | light | 4px | Gallery wall, half lit | https://styles.refero.design/style/6f3fb64d-d4c9-4ec1-86a1-7983e5180985 |
| Perk | light | 4px | electric lime on warm parchment paper | https://styles.refero.design/style/75c06591-34d2-493a-bd49-70551b5e4a53 |
| Perplexity AI | light | 4px | scholar's parchment behind clean glass | https://styles.refero.design/style/81afaa5c-73ac-4ef4-9a99-296da325ea6c |
| Pravah | light | 8px | engineering dossier on warm parchment | https://styles.refero.design/style/30a8b128-a5bb-4d86-85eb-743b78091596 |
| Prisma | light | 4px | engineer's blueprint on frosted glass | https://styles.refero.design/style/8e9e585f-5ad4-4273-8418-e1f82cdb51cf |
| Ramp | light | 4px | Editorial finance desk, black-and-white pages with a single neon highlighter. A near-monochrome publicati… | https://styles.refero.design/style/b38702a0-75ab-474c-9106-00b624535825 |
| Raycast | dark | 8px | Midnight command center, coral neon | https://styles.refero.design/style/3b6a17f0-3bdf-418c-a95e-0b89e5a8b2f8 |
| Rox | light | 4px | Editorial broadsheet meets product UI — black serif masthead on warm newsprint, hairline rules, one blue … | https://styles.refero.design/style/66eb1c37-a8e5-4e6c-b17f-a75385b462e7 |
| Samara | light | n/s | Sunlit architectural model. The design combines the precision of a blueprint with the warmth and airiness… | https://styles.refero.design/style/934a61aa-50ff-4e90-852b-4ad0b8262d54 |
| Sauce Labs | dark | 8px | Neon-lit command center on obsidian glass — a dark engineering console where a single green pulse marks e… | https://styles.refero.design/style/d271a6c4-942f-4abf-a3de-66795f15f031 |
| Seline Analytics | light | 4px | Quiet analyst's desk on warm paper | https://styles.refero.design/style/7967c6d9-e50c-42b5-b4d1-74003ba41781 |
| Sociotype | light | 4px | Type specimen museum on white paper | https://styles.refero.design/style/973332dc-4e10-4e90-85d8-3bce9c3cd3ed |
| SST | light | 4px | Code terminal in a gallery. The config file is the artwork; everything else is a clean white frame. | https://styles.refero.design/style/19f92be1-65ac-4432-a82b-0aa1e685d97d |
| Structured | mixed | 4px | Renaissance gallery on putty paper | https://styles.refero.design/style/6c0b77d3-71f9-469d-98aa-4ce1d6d76ac8 |
| Superhuman | light | 4px | golden hour editorial dashboard | https://styles.refero.design/style/418b374a-be64-44f0-b17e-1d45308c7e62 |
| TWOMUCH.STUDIO | light | 4px | floating museum of curiosities | https://styles.refero.design/style/12b3e1b6-31b9-4843-9b3b-8f39c9dd1474 |
| Ui | light | 4px | clinical blueprint on frosted paper | https://styles.refero.design/style/0fd67ec5-7e9c-4ca9-b368-5d9c7388477a |
| v0 by Vercel | light | n/s | A Machinist's Blueprint. Precision and function are paramount, with every element serving a clear purpose… | https://styles.refero.design/style/50aa2b8e-4760-4379-a3c1-59b65d8576a7 |
| Warp | dark | n/s | obsidian command center — a developer's IDE cockpit where the only glow is a single violet phosphor on ma… | https://styles.refero.design/style/d4c51049-58eb-404a-9fcb-f195928b1c99 |
| Wise | light | 4px | deep moss with lime voltage. Lime sparks on a near-black forest floor, with massive blocky display type a… | https://styles.refero.design/style/367c0c6e-73a7-441c-a8ff-91d139ac60dc |
| WRITER | light | 4px | editorial AI atelier — a white marble newsroom where pill-shaped controls and a single violet accent turn… | https://styles.refero.design/style/ddd9ffaa-d831-4cb4-a5bf-a1efce421dca |
| Your workplace has the answer. Just ask Dala for it. | dark | 6px | constellation floating on black velvet | https://styles.refero.design/style/e5f5f8cf-e68d-4ed1-bbf5-6b67569af648 |
| Zara | light | 4px | Gallery wall for fashion — pure white space, hairline frames, editorial imagery as the only color. | https://styles.refero.design/style/97823ba1-ee1e-489d-aefd-8d72a578669a |
