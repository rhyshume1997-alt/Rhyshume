import { Frame } from "@/components/Frame";
import { isIndexable } from "@/lib/site";

/**
 * Rev 7 photo system: three treatments only, used for different jobs.
 *   Cinematic  (hero, major atmosphere): the picture runs wide with no frame and the type sits around it. See .taps-cine and the opening.
 *   Mount      (deli, interiors, supporting): a picture mounted on cream with a fine printed line and a caption, in three variations (a, b, c).
 *   Polaroid   (Michael and Tanya, personal story): a small print with a thicker bottom margin and a hand-written style note.
 * The wrappers only change how the picture looks in the Behind the Counter look. In the other looks the Frame inside shows as it did before.
 */

/** A real beer mat: card with a printed ring and the supplied round Jack badge. Used twice on the page, tucked behind a picture. Preview only. */
export function BeerMat({ className = "" }: { className?: string }) {
  if (isIndexable()) return null;
  return (
    <span className={`beermat ${className}`.trim()} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/jack-mascot.svg" alt="" width={214} height={208} loading="lazy" decoding="async" />
    </span>
  );
}

export function Polaroid({ children, caption, mat = false, className = "" }: { children: React.ReactNode; caption: string; mat?: boolean; className?: string }) {
  return (
    <figure className={`polaroid ${className}`.trim()}>
      {mat && <BeerMat />}
      <div className="pol-pic"><Frame>{children}</Frame></div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** variant a: mounted picture, caption below. b: a printed plate, caption inside the margin. c: caption set beside the picture. */
export function Mount({ children, caption, variant = "a", mat = false, className = "" }: { children: React.ReactNode; caption: string; variant?: "a" | "b" | "c"; mat?: boolean; className?: string }) {
  return (
    <figure className={`mount mount-${variant} ${className}`.trim()}>
      {mat && <BeerMat />}
      <div className="mount-pic"><Frame>{children}</Frame></div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
