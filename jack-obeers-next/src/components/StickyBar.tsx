import { DIRECTIONS_URL, PHONE, PHONE_HREF } from "@/lib/site";

/**
 * Phone only (hidden from 641px up): three things a person on the move wants. It sits at the bottom edge, so it never
 * covers the basket button (top right) or the basket panel (which opens above everything).
 */
export function StickyBar() {
  return (
    <nav className="sticky-bar" aria-label="Quick actions">
      <a href={PHONE_HREF}>Call<span className="vh"> {PHONE}</span></a>
      <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">Directions<span className="vh"> (opens Google Maps)</span></a>
      <a href="/beers" className="sb-main">Shop beers</a>
    </nav>
  );
}
