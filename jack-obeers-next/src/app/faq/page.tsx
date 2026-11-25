import { BasketBehaviour } from "@/components/BasketBehaviour";
import { JsonLd } from "@/components/JsonLd";
import { FAQ } from "@/lib/faq";
import { getCatalogue } from "@/lib/catalogue";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Questions and answers",
  description: "Where Jack O’Beers and Deli is in Milngavie, how far from the West Highland Way start, opening hours, takeaway draught beer, wine, cider and deli food.",
  path: "/faq",
});

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <JsonLd data={[faqSchema(FAQ), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Questions and answers", path: "/faq" }])]} />
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono">Good to know</p>
            <h1 className="h2">Questions and <em>answers.</em></h1>
          </div>
        </section>
        <section className="cream faq" style={{ background: "var(--cream)" }}>
          <div className="wrap">
            {FAQ.map((f) => (
              <article key={f.q} className="faq-item">
                <h2 className="h3">{f.q}</h2>
                <p>{f.a}</p>
              </article>
            ))}
            <p className="faq-more">More: <a href="/west-highland-way">for walkers on the West Highland Way</a>, <a href="/beers">the beer range</a>, <a href="/events">events</a>.</p>
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
