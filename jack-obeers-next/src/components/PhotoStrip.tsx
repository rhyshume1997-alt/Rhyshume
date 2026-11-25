import { existsSync } from "node:fs";
import { join } from "node:path";
import { PHOTOS } from "@/lib/brand";

/** The shop photos, shown only when the files exist in public/media/photos. */
export function PhotoStrip() {
  const have = PHOTOS.filter((p) => existsSync(join(process.cwd(), "public", "media", "photos", p.file)));
  if (!have.length) return null;
  return (
    <ul className="photo-strip" aria-label="Photos of the shop">
      {have.map((p) => (
        <li key={p.file}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/media/photos/${p.file}`} alt={p.alt} loading="lazy" decoding="async" />
        </li>
      ))}
    </ul>
  );
}
