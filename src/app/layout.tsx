import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SITE_META } from "@/constants/copy";
import {
  ORGANIZATION_SCHEMA,
  SITE_URL,
  WEBSITE_SCHEMA,
} from "@/constants/schema";
import JsonLd from "@/components/seo/JsonLd";
import ChatbotMount from "@/components/chatbot/ChatbotMount";
import MetaPixelRouteTracker from "@/components/analytics/MetaPixelRouteTracker";
import { META_PIXEL_ID } from "@/lib/metaPixel";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Google Tag Manager container. Public (non-secret) ID; rendered on every
// page across both build targets (cPanel main site + Vercel blog) so the
// whole property reports into one GTM container. GTM then governs GA4 and
// any future tags without further code changes.
const GTM_ID = "GTM-WBQ96CNK";

// Meta (Facebook) Pixel — standalone from GA/GTM. Configurable per
// environment via env var, with a production default so it works out of
// the box. Set the env var to an empty string to disable the pixel on a
// given build (e.g. staging). The id lives in src/lib/metaPixel.ts so the
// base snippet here and Advanced Matching there can never drift apart
// (#086). See CHANGELOG #052.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_META.title,
  description: SITE_META.description,
  keywords: [
    "laptop repair Mumbai",
    "doorstep IT support Mumbai",
    "MacBook repair Mumbai",
    "WiFi installation Mumbai",
    "printer repair Mumbai",
    "CCTV installation Mumbai",
    "smart TV setup Mumbai",
    "on-demand IT services",
    "Pockit Engineers",
    "verified technicians",
    "computer repair near me",
    "Bharat",
  ],
  authors: [{ name: "Pockit Engineers", url: SITE_URL }],
  publisher: "Pockit Engineers",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Pockit Engineers",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager — placed as high in <head> as possible so the
            container loads early. Injected via the standard GTM IIFE; GTM
            itself loads asynchronously so it never blocks the theme script
            below. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* Blocking theme script: runs before paint to prevent theme colour flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pockit-theme');if(t)document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','light-corporate');}catch(e){}`,
          }}
        />
        {/* Site-wide JSON-LD (CHANGELOG #077). Only the two entities the SEO
            brief marks "common on all pages" live here — Organization and
            WebSite. LocalBusiness + FAQPage are home-page-only and are emitted
            by src/app/page.tsx; per-service schema comes from
            src/app/[slug]/page.static.tsx. Definitions: @/constants/schema. */}
        <JsonLd schema={[ORGANIZATION_SCHEMA, WEBSITE_SCHEMA]} />
        {GA_MEASUREMENT_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});`,
              }}
            />
          </>
        ) : null}
        {/* Meta (Facebook) Pixel — base install. This snippet only loads
            fbevents.js and fbq('init')s the pixel — it deliberately does NOT
            fire its own PageView. Every PageView (initial load + client-side
            route changes) is fired by <MetaPixelRouteTracker /> in the body so
            it carries a shared event_id for browser↔server (CAPI) dedup
            (CHANGELOG #073). The three conversion events (WhatsApp / Play Store
            / App Store) are fired explicitly from their buttons via
            src/lib/metaPixel.ts. See CHANGELOG #052, #072, #073. */}
        {META_PIXEL_ID ? (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');`,
              }}
            />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) — must be the first child of <body>
            so it works for users with JavaScript disabled. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
        {/* Global chatbot mount — visible on every page (home, landing
            pages, blog, about, etc.). Lazy-loaded behind first user
            engagement so Firebase stays off the critical path. */}
        <ChatbotMount />
        {/* Fires the Meta Pixel PageView on the initial load AND on every
            client-side navigation — the single source of all PageViews now
            that the base snippet no longer fires one (each carries a shared
            event_id for CAPI dedup). See CHANGELOG #073. */}
        {META_PIXEL_ID ? <MetaPixelRouteTracker /> : null}
      </body>
    </html>
  );
}
