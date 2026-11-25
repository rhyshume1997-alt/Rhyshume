/**
 * The frame for every photo and video on the site. It copies the trim of the shop outside (see globals.css, ".frame"):
 * black satin paint, about as thick as the window frames, a thin cream line inside it like the awning, and a soft shadow.
 * Put the picture or video inside as the only child. Pure CSS, so the same frame is used on every page.
 */
export function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`frame ${className}`.trim()}>{children}</div>;
}
