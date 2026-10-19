import type { Metadata } from "next";
import BecomeTechnicianClient from "@/components/become-a-technician/BecomeTechnicianClient";

// Per-page metadata + JobPosting JSON-LD. The interactive UI lives in
// `BecomeTechnicianClient.tsx`. See CHANGELOG #031 (May 2026 SEO audit).
export const metadata: Metadata = {
    title: "Become a Pockit Technician — IT & Laptop Repair Jobs in Mumbai",
    description:
        "Join 10,000+ verified IT and laptop repair experts on Pockit Engineers. Steady doorstep service jobs in Mumbai, Pune, Delhi NCR & Noida — flexible schedule, on-time payouts, no chasing customers.",
    alternates: { canonical: "/become-a-technician" },
    openGraph: {
        type: "website",
        url: "/become-a-technician",
        title: "Become a Pockit Technician — IT & Laptop Repair Jobs",
        description:
            "Verified work, on-time payouts, flexible schedule. Join Bharat's trusted on-demand IT network.",
        siteName: "Pockit Engineers",
        locale: "en_IN",
    },
};

// JobPosting schema gives us a shot at appearing in Google's
// "for jobs" rich result. Posting date is the route's last refresh
// rather than a single ad — this is a permanent open call. Validity
// is +90 days; bump it when the page is materially changed.
const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "On-Demand IT Technician (Laptop / WiFi / Smart-TV / CCTV)",
    description:
        "Join Pockit Engineers as a background-verified on-demand IT technician. Doorstep repair jobs across Mumbai, Pune, Delhi NCR, and Noida. Set your schedule, earn on time, no chasing customers.",
    datePosted: "2026-05-14",
    validThrough: "2026-08-12",
    employmentType: ["FULL_TIME", "PART_TIME", "CONTRACTOR"],
    hiringOrganization: {
        "@type": "Organization",
        name: "Pockit Engineers",
        sameAs: "https://www.pockitengineers.com",
        logo: "https://www.pockitengineers.com/logo.png",
    },
    jobLocation: [
        {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: "Mumbai",
                addressRegion: "Maharashtra",
                addressCountry: "IN",
            },
        },
        {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: "Pune",
                addressRegion: "Maharashtra",
                addressCountry: "IN",
            },
        },
        {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: "Delhi",
                addressRegion: "Delhi",
                addressCountry: "IN",
            },
        },
    ],
    url: "https://www.pockitengineers.com/become-a-technician",
    directApply: true,
} as const;

export default function BecomeTechnicianPage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
            />
            <BecomeTechnicianClient />
        </>
    );
}
