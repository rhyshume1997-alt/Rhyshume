import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartFallback } from "@/components/CartFallback";
import { StickyBar } from "@/components/StickyBar";
import { PageTransition } from "@/components/PageTransition";
import { getCatalogue } from "@/lib/catalogue";
import { JsonLd } from "@/components/JsonLd";
import { storeSchema, websiteSchema } from "@/lib/schema";
import { NAME, SITE_URL, isIndexable } from "@/lib/site";
import { LookEffects } from "@/components/LookPicker";
import { CommentsPanel } from "@/components/CommentsPanel";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Craft beer shop in Milngavie | Jack O’Beers and Deli", template: "%s | Jack O’Beers and Deli" },
  description:
    "Independent craft beer, cider and wine shop in Milngavie. Fresh draught beer to take away, plus a deli with pies and cheese. Open Wednesday to Monday, 11am to 7pm.",
  // Only the live site is searchable. Previews and local runs are kept out. See SEO.md.
  robots: isIndexable() ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } } : { index: false, follow: false, noarchive: true },
  icons: { icon: "/media/jack-mascot.svg" },
  openGraph: { type: "website", locale: "en_GB", siteName: NAME, images: [{ url: "/media/photos/shopfront-street-1200.webp", width: 1200, height: 675, alt: "Jack O'Beers & Deli from the street, with outdoor seating" }] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d0f0a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/source-sans-3-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('jo_tr')==='1')document.documentElement.dataset.tr='1'}catch(e){}addEventListener('load',function(){document.documentElement.classList.add('loaded')})" }} />
        {!isIndexable() && <script dangerouslySetInnerHTML={{ __html: "try{var m=location.search.match(/[?&]look=(behind|original|classic|backbar|cinematic)/),l=m?m[1]:(sessionStorage.getItem('jo_look')||'behind');if(m)sessionStorage.setItem('jo_look',l);document.documentElement.dataset.look=l;var t=location.search.match(/[?&]type=([a-d])/),y=t?t[1]:sessionStorage.getItem('jo_type');if(t)sessionStorage.setItem('jo_type',y);if(y)document.documentElement.dataset.type=y}catch(e){document.documentElement.dataset.look='behind'}" }} />}
      </head>
      <body>
        <JsonLd data={[storeSchema(), websiteSchema()]} />
        <a className="skip" href="#main">Skip to the content</a>
        <SiteHeader hampers={(await getCatalogue()).all.some((p) => p.category === "hampers")} />
        {children}
        <SiteFooter />
        <CartFallback />
        <StickyBar />
        <PageTransition />
        {!isIndexable() && <><LookEffects /><CommentsPanel /></>}
      </body>
    </html>
  );
}
