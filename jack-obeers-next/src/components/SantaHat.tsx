/**
 * A small Santa hat drawn in SVG, laid over the existing Jack O’Beers logos in the Christmas season only.
 * The logo files are never edited: the hat is a separate element, hidden by CSS unless <html data-xmas="on">.
 * It is decoration, so it is hidden from assistive technology. Where it sits is set per logo in globals.css (.xhat-*).
 */
export function SantaHat({ where }: { where: "brand" | "lying" | "sign" | "about" }) {
  return (
    <svg className={`xhat xhat-${where}`} viewBox="0 0 120 92" aria-hidden="true" focusable="false">
      <path d="M12 76C14 40 40 10 78 12c20 2 28 24 32 48L12 76z" fill="#c4262e" />
      <path d="M12 76C16 56 28 34 52 22c-14 14-22 34-24 52L12 76z" fill="#9c1a22" opacity=".55" />
      <rect x="4" y="64" width="112" height="22" rx="11" fill="#fbf7ec" />
      <path d="M10 80c30 4 70 4 100 0" stroke="#e5dcc4" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="108" cy="52" r="11" fill="#fbf7ec" />
      <circle cx="105" cy="49" r="4" fill="#fff" opacity=".7" />
    </svg>
  );
}
