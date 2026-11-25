import { BasketBehaviour } from "@/components/BasketBehaviour";
import { forBasket, getCatalogue } from "@/lib/catalogue";

export const metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default async function NotFound() {
  const catalogue = await getCatalogue();
  return (
    <>
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <h1 className="h2">That page is not here.</h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)", padding: "3rem 0" }}>
          <div className="wrap">
            <p className="lede">Try the <a href="/beers">beer range</a>, <a href="/faq">questions and answers</a>, or go back to the <a href="/">home page</a>.</p>
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
