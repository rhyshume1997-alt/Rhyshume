/**
 * A video with sound, shown with controls and never autoplaying. With no file yet it shows the poster picture.
 * Add a short plain-text description in `label` so people who cannot watch still know what it is.
 * width and height are the poster's size, so the page does not shift while it loads.
 */
export function Clip({ src, poster, label, className, width, height }: { src: string | null; poster: string; label: string; className?: string; width: number; height: number }) {
  if (!src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={poster} alt={label} width={width} height={height} loading="lazy" decoding="async" />;
  }
  return (
    <video className={className} controls preload="none" playsInline poster={poster} aria-label={label} width={width} height={height}>
      <source src={src} type="video/mp4" />
    </video>
  );
}
