import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTransition } from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://jackobeers.com"),
  title: "Jack O’Beers & Deli | Craft beer, cider, wine, deli and gifts, Milngavie",
  description:
    "An independent British drinks shop and deli at 13 Station Road, Milngavie. Craft beer, cider, wine, deli and gifts. Open Wednesday to Monday, 11am to 7pm.",
  // Kept out of search engines until Michael approves launch. Change to index: true then.
  robots: { index: false, follow: false, noarchive: true },
  icons: { icon: "/media/jack-mascot.svg" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Jack O’Beers & Deli",
    title: "Jack O’Beers & Deli, Milngavie",
    description: "Craft beer, cider, wine, deli and gifts. 13 Station Road, Milngavie.",
    images: [{ url: "/media/jack-logo.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d0f0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('jo_tr')==='1')document.documentElement.dataset.tr='1'}catch(e){}" }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to the content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <PageTransition />
      </body>
    </html>
  );
}
