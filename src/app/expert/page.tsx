import type { Metadata } from "next";
import ExpertRedirectClient from "@/components/expert/ExpertRedirectClient";

// `/expert` is a permanently moved legacy URL. Apache/cPanel sends a
// proper 301 via `public/.htaccess`, but on any host without rewrite
// support the client component below fires a JS redirect. Adding a
// canonical here tells crawlers "the new home is /become-a-technician"
// even before they follow the redirect — which prevents this URL from
// competing with the real page in search.
export const metadata: Metadata = {
    title: "Become a Pockit Technician — IT & Laptop Repair Jobs in Mumbai",
    description:
        "Join 10,000+ verified IT and laptop repair experts on Pockit Engineers — doorstep service jobs in Mumbai, Pune, Delhi NCR & Noida.",
    alternates: { canonical: "/become-a-technician" },
    robots: { index: false, follow: true },
};

export default function ExpertRedirectPage() {
    return <ExpertRedirectClient />;
}
