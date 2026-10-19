import type { Metadata } from "next";
import AppShell from "@/components/landing/AppShell";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_META } from "@/constants/copy";
import { HOME_FAQ_SCHEMA, LOCAL_BUSINESS_SCHEMA } from "@/constants/schema";

// Per-page metadata override on top of the defaults declared in
// src/app/layout.tsx. Adds canonical + OpenGraph/Twitter cards so the
// home page wins richer SERP and social cards than the bare defaults.
export const metadata: Metadata = {
    title: SITE_META.title,
    description: SITE_META.description,
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        url: "/",
        title: SITE_META.title,
        description: SITE_META.description,
        siteName: "Pockit Engineers",
        locale: "en_IN",
        images: [
            {
                url: "/images/OG%20Logo.svg",
                width: 1200,
                height: 630,
                alt: "Pockit Engineers — Doorstep IT Support in Mumbai",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_META.title,
        description: SITE_META.description,
    },
};

export default function Home() {
    return (
        <>
            {/* Home-page-only JSON-LD (CHANGELOG #077). LocalBusiness carries the
                registered address/geo so we qualify for the local pack; FAQPage
                is authored in @/constants/schema and renders no visible UI —
                the on-page FAQ accordion is a separate surface driven by
                FAQ_ITEMS in copy.ts. */}
            <JsonLd schema={[LOCAL_BUSINESS_SCHEMA, HOME_FAQ_SCHEMA]} />
            <AppShell />
        </>
    );
}
