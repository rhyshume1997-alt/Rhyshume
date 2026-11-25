import { Behaviour } from "@/components/Behaviour";
import { forBasket, getCatalogue, pairingMap } from "@/lib/catalogue";

/** The basket and page behaviour, with every basket product and the deli pairings. Put one on each page. */
export async function BasketBehaviour({ solid }: { solid: boolean }) {
  const catalogue = await getCatalogue();
  return <Behaviour products={forBasket(catalogue.all)} pairings={pairingMap(catalogue.all)} solid={solid} />;
}
