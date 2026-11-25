/** The bottle-from-the-tap block on the beer range. The first line is Michael's wording. The second is his to fill in. */
export function KegBlurb({ label = "Fresh from the tap" }: { label?: string }) {
  return (
    <aside className="keg" aria-label={label}>
      <p>Pick from the taps and we bottle it fresh for you. It&rsquo;s filled straight from the keg with no foam, and a sealed bottle keeps for up to two weeks. There are 23 taps on the wall.</p>
      <p><span className="tbc">[Michael to add: what&rsquo;s on this week]</span></p>
    </aside>
  );
}
