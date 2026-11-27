import { describeBlocks } from "@/lib/describe";

/** A product description split into short parts: a heading, then one line per label (Aroma, Ingredients and so on). */
export function Description({ text }: { text: string | null | undefined }) {
  const blocks = describeBlocks(text);
  return (
    <div className="desc">
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <h4 key={i} className="pg-dh">{b.text}</h4>
        ) : b.kind === "field" ? (
          <p key={i}><b>{b.label}:</b> {b.text}</p>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
