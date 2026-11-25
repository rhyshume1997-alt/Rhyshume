import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";

export const metadata = { title: 'Product | Jack O’Beers & Deli' };

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
<main id="main"><section className="page-top"><div className="wrap"><p className="mono">Label</p><p className="h2" style={{ fontFamily: 'var(--serif)' } as React.CSSProperties}>On the shelf</p></div></section><section className="cream" style={{ background: 'var(--cream)' } as React.CSSProperties}><div className="wrap"><div className="pdp" id="pdp"></div></div></section></main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
