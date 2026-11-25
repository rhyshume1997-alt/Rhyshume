import Image from "next/image";
import { INTERIOR_COUNTER_BULBS, SHOPFRONT_STREET } from "@/lib/photos";

/** Photos of the shop, under About us. Alt text comes from the media repo. */
export function PhotoStrip() {
  const list = [SHOPFRONT_STREET, INTERIOR_COUNTER_BULBS];
  return (
    <ul className="photo-strip" aria-label="Photos of the shop">
      {list.map((p) => (
        <li key={p.file}>
          <Image src={p.file} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 40rem) 100vw, 50vw" />
        </li>
      ))}
    </ul>
  );
}
