import Image from "next/image";
import { Mount } from "@/components/Photo";
import { INTERIOR_COUNTER_BULBS, SHOPFRONT_STREET } from "@/lib/photos";

/** Photos of the shop, under About us. Alt text comes from the media repo. */
export function PhotoStrip() {
  const list = [{ ...SHOPFRONT_STREET, caption: "The shop on Station Road" }, { ...INTERIOR_COUNTER_BULBS, caption: "The counter, under the lights" }];
  return (
    <ul className="photo-strip" aria-label="Photos of the shop">
      {list.map((p, i) => (
        <li key={p.file}>
          <Mount variant={i === 0 ? "b" : "a"} caption={p.caption}><Image src={p.file} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 40rem) 100vw, 50vw" /></Mount>
        </li>
      ))}
    </ul>
  );
}
