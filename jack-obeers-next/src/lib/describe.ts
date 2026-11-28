/**
 * Shopify sends a product description as plain text with its headings run into the words around them
 * ("DescriptionAldaris Kirsu is...", "Food PairingsThis lager..."). This splits that text back into short, labelled parts so it
 * reads like the page it was written as. Nothing is removed except the word "Description" at the very start, and the words are never
 * changed, so allergen wording stays exactly as Michael wrote it. A description with none of these headings stays one paragraph.
 */
export type DescBlock = { kind: "text" | "heading" | "field"; label?: string; text: string };

const HEADINGS = ["Tasting Notes", "Allergens & Dietary Information", "Allergens and Dietary Information", "Food Pairings", "Manufacturer Information"];
const FIELDS = ["Appearance", "Aroma", "Palate", "Finish", "Taste", "Contains", "Ingredients", "Dietary", "Suitability", "Brewery", "Parent Company", "Flavour", "Quick Specs", "Style", "ABV", "Format", "Vibe", "Key Details", "Tasting Profile", "Product Details", "Flavor Profile", "Food Pairing", "Experience", "Cheeses", "Desserts", "Producer", "Region", "Grapes", "Grape"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TOKEN = new RegExp(`(${HEADINGS.map(esc).join("|")}|(?:${FIELDS.map(esc).join("|")}):)`, "g");

export function describeBlocks(raw: string | null | undefined): DescBlock[] {
  const t = (raw || "").replace(/\s+/g, " ").trim().replace(/^Description(?=[\p{Lu}:\s]|$):?\s*/u, "");
  if (!t) return [];
  // "Title (5.0% ABV) DescriptionThe King of..." : a glued "Description" later in the text is dropped and the text before it stays its own paragraph.
  const segs = t.split(/\s*\bDescription(?=[\p{Lu}])/u).map((x) => x.trim()).filter(Boolean);
  return segs.flatMap(splitSegment);
}

function splitSegment(t: string): DescBlock[] {
  const parts = t.split(TOKEN);
  const out: DescBlock[] = [];
  const intro = (parts[0] || "").trim();
  if (intro) out.push({ kind: "text", text: intro });
  for (let i = 1; i < parts.length; i += 2) {
    const token = parts[i];
    const body = (parts[i + 1] || "").replace(/^\s*:\s*/, "").trim();
    if (token.endsWith(":") && !body) out.push({ kind: "heading", text: token.slice(0, -1) });
    else if (token.endsWith(":")) out.push({ kind: "field", label: token.slice(0, -1), text: body });
    else {
      out.push({ kind: "heading", text: token });
      if (body) out.push({ kind: "text", text: body });
    }
  }
  return out;
}
