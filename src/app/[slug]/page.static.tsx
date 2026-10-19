// ---------------------------------------------------------------------------
// /[slug] — root-level catch-all that renders Sanity-driven SEO landing pages.
//
// Examples (all live on the marketing-site root):
//   /laptop-repair-mumbai
//   /macbook-repair-mumbai
//   /laptop-repair-andheri
//   /laptop-not-turning-on-mumbai
//
// Routing precedence — Next.js gives literal segments priority over
// dynamic segments, so /about, /terms, /blog, /studio, etc. continue to
// resolve to their existing routes; only previously-unmapped slugs fall
// through to this catch-all.
//
// Static-export compatibility — this file is a regular `.tsx` (not
// `.server.tsx`), so it's included in `BUILD_TARGET=static` and emits
// HTML into `out/<slug>/index.html` at build time. The blog routes use
// `.server.tsx` and are excluded from the static cPanel build.
//
// Build-time data flow:
//   1. generateStaticParams pulls every published landingPage slug from
//      Sanity, filters out any that collide with reserved paths.
//   2. For each slug, generateMetadata fetches just the SEO fields and
//      emits <title>, description, canonical, OpenGraph, Twitter, robots.
//   3. The page component fetches the full document and renders the view.
//      JSON-LD (LocalBusiness + Service + BreadcrumbList + FAQPage) is
//      inlined as <script type="application/ld+json">. Slugs listed in
//      SERVICE_PAGE_SCHEMA (@/constants/schema) instead ship the SEO team's
//      hand-authored Service + FAQPage and suppress the generated pair —
//      see CHANGELOG #077.
//
// Introduced in CHANGELOG #022.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LandingPageView from "@/components/landing-pages/LandingPageView";
import JsonLd from "@/components/seo/JsonLd";
import { SERVICE_PAGE_SCHEMA, SITE_URL_BARE as SITE_URL } from "@/constants/schema";
import {
    getAllLandingPageSlugs,
    getLandingPageBySlug,
    urlForOG,
} from "@/lib/sanity";
import type { LandingPageDetail } from "@/lib/sanity/types";

/**
 * Slugs that already resolve to existing app routes or static files. Next's
 * routing precedence means these never *actually* hit /[slug] — but we still
 * filter them out of generateStaticParams so the static export doesn't try
 * to emit `out/about/index.html` from a Sanity doc with that slug. Schema
 * validation in `sanity/schemas/landingPage.ts` is the primary defence; this
 * is the build-time belt + braces.
 */
const RESERVED_SLUGS = new Set<string>([
    "about",
    "become-a-technician",
    "expert",
    "blog",
    "studio",
    "terms",
    "privacy-policy",
    "delete-account",
    "sitemap.xml",
    "robots.txt",
    "favicon.ico",
]);

// ---------------------------------------------------------------------------
// Static params — fetch every publishable slug at build.
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<
    { readonly slug: string }[]
> {
    const slugs = await getAllLandingPageSlugs();
    return slugs
        .map((s) => s.current)
        .filter((s) => !RESERVED_SLUGS.has(s))
        .map((slug) => ({ slug }));
}

// Fail closed: any slug not enumerated in generateStaticParams 404s instead
// of being rendered on demand. With output:"export" there's no runtime
// rendering anyway, but the explicit setting makes the intent clear and
// keeps the server (Vercel) build behaving the same way.
export const dynamicParams = false;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type PageParams = Promise<{ readonly slug: string }>;

export async function generateMetadata({
    params,
}: {
    params: PageParams;
}): Promise<Metadata> {
    const { slug } = await params;
    if (RESERVED_SLUGS.has(slug)) return {};

    const page = await getLandingPageBySlug(slug);
    if (!page) return { title: "Page not found · Pockit Engineers" };

    const title = page.seo?.metaTitle ?? `${page.title} · Pockit Engineers`;
    const description =
        page.seo?.metaDescription ??
        page.heroSubheading ??
        `${page.service} in ${page.location} — book a verified Pockit Engineers technician for doorstep service in minutes.`;

    const ogImageUrl = page.seo?.ogImage?.asset
        ? urlForOG(page.seo.ogImage)
        : `${SITE_URL}/logo.png`;

    const canonical = `${SITE_URL}/${page.slug.current}`;
    const noIndex = page.seo?.noIndex === true;

    return {
        title,
        description,
        alternates: { canonical },
        robots: noIndex
            ? { index: false, follow: false }
            : { index: true, follow: true },
        openGraph: {
            title,
            description,
            url: canonical,
            type: "website",
            siteName: "Pockit Engineers",
            images: [{ url: ogImageUrl, width: 1200, height: 630 }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImageUrl],
        },
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LandingPageRoute({
    params,
}: {
    params: PageParams;
}) {
    const { slug } = await params;
    if (RESERVED_SLUGS.has(slug)) notFound();

    const page = await getLandingPageBySlug(slug);
    if (!page) notFound();

    // Pages named in the SEO brief ship hand-authored Service + FAQPage nodes
    // (CHANGELOG #077). Where those exist we suppress the Sanity-derived
    // equivalents so the page never carries two Service or two FAQPage nodes.
    const authored = SERVICE_PAGE_SCHEMA[slug];
    const jsonLd = buildJsonLd(page, { hasAuthoredService: Boolean(authored) });

    return (
        <>
            <JsonLd schema={jsonLd} />
            {authored ? <JsonLd schema={authored} /> : null}
            <LandingPageView page={page} />
        </>
    );
}

// ---------------------------------------------------------------------------
// JSON-LD builder
//
// We emit a single @graph containing every relevant entity:
//   - LocalBusiness  — drives Google Business panels, areaServed, priceRange
//   - Service        — formal description of the service offering
//   - BreadcrumbList — Home → Service → City → Page
//   - FAQPage        — only when the doc has FAQ items
// ---------------------------------------------------------------------------

interface JsonLdNode {
    readonly "@type": string;
    readonly [key: string]: unknown;
}

function buildJsonLd(
    page: LandingPageDetail,
    opts: { hasAuthoredService: boolean } = { hasAuthoredService: false },
): {
    "@context": string;
    "@graph": JsonLdNode[];
} {
    const canonical = `${SITE_URL}/${page.slug.current}`;
    const businessName = `Pockit Engineers — ${page.service} in ${page.location}`;

    const localBusiness: JsonLdNode = {
        "@type": "LocalBusiness",
        "@id": `${canonical}#business`,
        name: businessName,
        url: canonical,
        description:
            page.seo?.metaDescription ??
            page.heroSubheading ??
            `${page.service} at your doorstep across ${page.location}.`,
        image: `${SITE_URL}/logo.png`,
        telephone: page.phone ?? "+91-9240251266",
        priceRange: page.priceRange ?? "₹₹",
        areaServed: buildAreaServed(page),
        ...(page.responseTime
            ? { hoursAvailable: { "@type": "OpeningHoursSpecification", description: `Doorstep arrival in ${page.responseTime}` } }
            : {}),
    };

    const service: JsonLdNode = {
        "@type": "Service",
        "@id": `${canonical}#service`,
        name: `${page.service} in ${page.location}`,
        serviceType: page.service,
        provider: { "@id": `${canonical}#business` },
        areaServed: buildAreaServed(page),
        url: canonical,
        ...(page.services && page.services.length > 0
            ? {
                  hasOfferCatalog: {
                      "@type": "OfferCatalog",
                      name: `${page.service} services`,
                      itemListElement: page.services.map((s, i) => ({
                          "@type": "Offer",
                          position: i + 1,
                          name: s.title,
                          ...(s.description ? { description: s.description } : {}),
                          ...(typeof s.priceFrom === "number"
                              ? {
                                    priceSpecification: {
                                        "@type": "PriceSpecification",
                                        price: s.priceFrom,
                                        priceCurrency: "INR",
                                        valueAddedTaxIncluded: false,
                                    },
                                }
                              : {}),
                      })),
                  },
              }
            : {}),
    };

    const breadcrumb: JsonLdNode = {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: page.service,
                item: SITE_URL + "/#services",
            },
            {
                "@type": "ListItem",
                position: 3,
                name: page.title,
                item: canonical,
            },
        ],
    };

    const graph: JsonLdNode[] = opts.hasAuthoredService
        ? [localBusiness, breadcrumb]
        : [localBusiness, service, breadcrumb];

    if (!opts.hasAuthoredService && page.faqs && page.faqs.length > 0) {
        graph.push({
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            mainEntity: page.faqs.map((q) => ({
                "@type": "Question",
                name: q.question,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: q.answer,
                },
            })),
        });
    }

    return { "@context": "https://schema.org", "@graph": graph };
}

function buildAreaServed(page: LandingPageDetail): unknown {
    const places: unknown[] = [{ "@type": "City", name: page.location }];
    if (page.areasServed) {
        for (const a of page.areasServed) {
            places.push({
                "@type": "Place",
                name: a.name,
                containedInPlace: { "@type": "City", name: page.location },
            });
        }
    }
    return places.length === 1 ? places[0] : places;
}
