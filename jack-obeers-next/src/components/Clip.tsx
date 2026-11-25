/**
 * A video with sound, shown with controls and never autoplaying. With no file yet it shows the poster picture.
 * Add a short plain-text description in `label` so people who cannot watch still know what it is.
 */
export function Clip({ src, poster, label, className }: { src: string | null; poster: string; label: string; className?: string }) {
  if (!src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={poster} alt={label} loading="lazy" decoding="async" />;
  }
  return (
    <video className={className} controls preload="none" playsInline poster={poster} aria-label={label}>
      <source src={src} type="video/mp4" />
    </video>
  );
}
