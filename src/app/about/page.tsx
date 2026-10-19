import type { Metadata } from "next";
import AboutClient from "@/components/about/AboutClient";

// Per-page metadata + AboutPage JSON-LD. The interactive UI lives in
// `AboutClient.tsx` so this file can stay a server component and own
// the SEO surface (May 2026 audit, CHANGELOG #031).
export const metadata: Metadata = {
    title: "About Pockit Engineers — Doorstep IT Support in Mumbai",
    description:
        "Bharat's only on-demand IT services app — background-verified laptop, MacBook, WiFi, smart-TV, printer & CCTV experts at your door in Mumbai in under 60 minutes. Live tracking, transparent pricing.",
    alternates: { canonical: "/about" },
    openGraph: {
        type: "website",
        url: "/about",
        title: "About Pockit Engineers — Doorstep IT Support in Mumbai",
        description:
            "Verified IT experts at your door in Mumbai in 10 minutes. Live tracking, transparent pricing, 30-day warranty.",
        siteName: "Pockit Engineers",
        locale: "en_IN",
    },
};

const aboutPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Pockit Engineers",
    url: "https://www.pockitengineers.com/about",
    description:
        "Pockit Engineers — Bharat's on-demand IT services app providing background-verified laptop, MacBook, WiFi, smart-TV, printer and CCTV technicians at your door in Mumbai in under 60 minutes.",
    isPartOf: {
        "@type": "WebSite",
        name: "Pockit Engineers",
        url: "https://www.pockitengineers.com",
    },
} as const;

export default function AboutPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
            />
            <AboutClient />
        </>
    );
}
