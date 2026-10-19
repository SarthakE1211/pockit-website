// ---------------------------------------------------------------------------
// Seed script — populates Sanity with the initial set of SEO landing pages.
//
// Run once after the `landingPage` schema is registered in Studio:
//
//     npm run seed:landing
//
// The script uses `createOrReplace` so it is idempotent — re-running it
// updates existing documents in place rather than creating duplicates.
// Editors can freely modify pages in Studio between runs; running this
// script again will OVERWRITE editor changes for the seeded slugs, so use
// it as a one-time bootstrap, not a recurring sync.
//
// Env vars required:
//   - NEXT_PUBLIC_SANITY_PROJECT_ID  (defaults to pg938kpo)
//   - NEXT_PUBLIC_SANITY_DATASET     (defaults to production)
//   - SANITY_API_WRITE_TOKEN         (preferred — needs Editor or higher
//                                     role at sanity.io/manage)
//   - SANITY_API_READ_TOKEN          (fallback — only works if the token
//                                     happens to have write permission;
//                                     viewer-only tokens will fail)
//
// Introduced in CHANGELOG #022.
// ---------------------------------------------------------------------------

// Run via `npm run seed:landing` — that wires `tsx --env-file=.env.local`
// so process.env is populated from the local file at exec time.

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token =
    process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_API_READ_TOKEN;

if (!token) {
    console.error(
        "\n[seed-landing] No Sanity token found.\n" +
            "  Set SANITY_API_WRITE_TOKEN in .env.local (Editor role at sanity.io/manage).\n",
    );
    process.exit(1);
}

const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-04-15",
    useCdn: false,
    token,
});

// ---------------------------------------------------------------------------
// Documents to upsert
// ---------------------------------------------------------------------------

interface SeedPortableTextBlock {
    readonly _key: string;
    readonly _type: "block";
    readonly style?: "normal" | "h2" | "h3";
    readonly markDefs?: readonly unknown[];
    readonly children: readonly {
        readonly _key: string;
        readonly _type: "span";
        readonly text: string;
        readonly marks?: readonly string[];
    }[];
}

function pt(text: string, style: SeedPortableTextBlock["style"] = "normal"): SeedPortableTextBlock {
    return {
        _key: cryptoRandomKey(),
        _type: "block",
        style,
        markDefs: [],
        children: [
            { _key: cryptoRandomKey(), _type: "span", text, marks: [] },
        ],
    };
}

function cryptoRandomKey(): string {
    return Math.random().toString(36).slice(2, 12);
}

const laptopRepairMumbai = {
    _id: "landingPage.laptop-repair-mumbai",
    _type: "landingPage",
    title: "Laptop Repair in Mumbai",
    slug: { _type: "slug", current: "laptop-repair-mumbai" },
    pageType: "service-city",
    service: "Laptop Repair",
    location: "Mumbai",

    heroEyebrow: "Mumbai · On-demand laptop service",
    heroHeading: "Laptop Repair in Mumbai — at your doorstep, in 60 minutes.",
    heroSubheading:
        "Background-verified Pockit technicians fix laptop issues at your home or office across Mumbai. Up-front pricing, original parts, 30-day service warranty. Book on the app and a certified expert is on the way.",
    heroBullets: [
        "Doorstep service across all of Mumbai",
        "Verified, certified technicians only",
        "Diagnosis fee shown up-front in the app",
        "30-day warranty on every repair",
    ],
    heroPrimaryCta: { label: "Book a Laptop Repair", href: "/#download" },
    heroSecondaryCta: { label: "How it works", href: "/#how-it-works" },

    intro: [
        pt(
            "When your laptop breaks down in Mumbai, you don't have time to lug it to a service centre across town and wait days for a quote. Pockit Engineers brings the service centre to your door — anywhere from Andheri to Thane — usually within an hour of booking.",
        ),
        pt(
            "Whether it's a laptop that won't turn on, a cracked screen, an overheating chassis, a slow-as-molasses HDD, or a Wi-Fi card that's lost its mind, our technicians arrive with the tools and the parts to diagnose and fix it on the spot. You see the problem identified in front of you, you see the price before any work begins, and you only pay once the laptop is working.",
        ),
    ],

    services: [
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Laptop not turning on / no power",
            description:
                "Dead motherboard, charger fault, RAM seating, CMOS reset, or stuck-key short — diagnosed and resolved on-site.",
            priceFrom: 499,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Laptop screen replacement",
            description:
                "Cracked LCDs, dead pixels, backlight failures. Original-quality replacement panels for every major brand.",
            priceFrom: 2499,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Slow laptop / performance tune-up",
            description:
                "Junk cleanup, virus & malware removal, startup audit, thermal paste reapplication, SSD upgrade if needed.",
            priceFrom: 599,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Keyboard / trackpad / hinge repair",
            description:
                "Sticky keys, dead trackpads, broken hinges, loose flex cables — replaced or re-seated cleanly.",
            priceFrom: 799,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Battery replacement",
            description:
                "Original or OEM-grade battery cells with health-test report. Same-day swap.",
            priceFrom: 1999,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Data recovery & backup",
            description:
                "Recover from failing drives, accidental deletion, OS crashes. Encrypted backup to external media.",
            priceFrom: 999,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "OS reinstall (Windows / macOS / Linux)",
            description:
                "Clean install with driver pack, productivity apps, antivirus, and your data restored from backup.",
            priceFrom: 699,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "Overheating fix / fan & paste service",
            description:
                "Internal cleaning, thermal paste reapplication, fan replacement when needed.",
            priceFrom: 599,
        },
        {
            _key: cryptoRandomKey(),
            _type: "serviceItem",
            title: "SSD / RAM upgrade",
            description:
                "Free performance audit + part recommendation. Migration of your existing OS and data.",
            priceFrom: 499,
        },
    ],

    trustBullets: [
        "Background-verified technicians",
        "Original / OEM-grade parts",
        "30-day service warranty",
        "Up-front, transparent pricing",
        "Mumbai-wide coverage",
    ],

    process: [
        {
            _key: cryptoRandomKey(),
            _type: "processStep",
            title: "Tell us what's wrong",
            description:
                "Open the Pockit app, pick `Laptop`, and describe the issue in a few words. No long forms.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "processStep",
            title: "Verified technician en route",
            description:
                "A certified expert accepts the booking — you can track them live, just like a cab.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "processStep",
            title: "Diagnosed & fixed at your door",
            description:
                "On-site diagnosis, transparent quote, repair completed and tested before the technician leaves.",
        },
    ],

    areasServed: [
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Andheri", href: "/laptop-repair-andheri" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Powai", href: "/laptop-repair-powai" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Goregaon", href: "/laptop-repair-goregaon" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Bandra", href: "/laptop-repair-bandra" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Thane", href: "/laptop-repair-thane" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Malad", href: "/laptop-repair-malad" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Borivali", href: "/laptop-repair-borivali" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Kandivali", href: "/laptop-repair-kandivali" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Kurla", href: "/laptop-repair-kurla" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Lower Parel", href: "/laptop-repair-lower-parel" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Worli" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Dadar" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Vikhroli" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Chembur" },
        { _key: cryptoRandomKey(), _type: "areaServed", name: "Navi Mumbai" },
    ],

    priceRange: "₹₹",
    phone: "+91 97699 39163",
    responseTime: "60 minutes",

    faqs: [
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "How fast can a Pockit technician reach me in Mumbai?",
            answer:
                "Typical doorstep arrival is within 60 minutes of booking, anywhere from Andheri to Thane. The app shows you live ETA before you confirm.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "Do you charge a visit fee even if I don't get the repair done?",
            answer:
                "There's a small diagnosis fee shown up-front in the app. If you choose to go ahead with the repair, that diagnosis fee is adjusted into the final bill — so you only pay for the work.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "What brands do you service?",
            answer:
                "Every major brand sold in India — HP, Dell, Lenovo, ASUS, Acer, MSI, MacBook (Apple), Microsoft Surface, Samsung, LG, and more. Brand-specific parts are sourced through OEM channels where original is available.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "Do you offer a warranty on repairs?",
            answer:
                "Yes — 30-day service warranty on every repair. If the same issue returns within 30 days, we come back at no charge.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "Is my data safe during repair?",
            answer:
                "Always. Our technicians are background-verified and the standard procedure for any work involving the storage drive includes a free encrypted backup before any reinstall or replacement.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "Can you replace a cracked laptop screen at home?",
            answer:
                "Yes. Screen replacements are done on-site for most models — the technician arrives with the matched panel and the right tools. Allow about 60–90 minutes for the swap.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "faqItem",
            question: "What payment methods do you accept?",
            answer:
                "UPI, all major cards, net banking, and cash. Payment is collected only after the repair is verified working.",
        },
    ],

    seo: {
        metaTitle: "Laptop Repair in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand laptop repair across Mumbai. Verified technicians, doorstep service in 60 minutes, 30-day warranty. From ₹499. Andheri, Powai, Bandra, Thane, all of Mumbai.",
        noIndex: false,
    },

    publishedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    console.log(
        `[seed-landing] Upserting to projectId=${projectId} dataset=${dataset}`,
    );

    try {
        const result = await client.createOrReplace(laptopRepairMumbai);
        console.log(
            `[seed-landing] ✓ Upserted ${result._id} (slug=${(result as { slug?: { current?: string } }).slug?.current})`,
        );
    } catch (err) {
        const e = err as { statusCode?: number; message?: string };
        if (e.statusCode === 401 || e.statusCode === 403) {
            console.error(
                "\n[seed-landing] Permission denied. The Sanity token in your env doesn't have write access.\n" +
                    "  → Generate a token with the Editor role at https://www.sanity.io/manage/project/" +
                    projectId +
                    "/api#tokens\n" +
                    "  → Save it to .env.local as SANITY_API_WRITE_TOKEN=...\n" +
                    "  → Re-run `npm run seed:landing`.\n",
            );
            process.exit(2);
        }
        console.error("[seed-landing] Failed:", err);
        process.exit(1);
    }
}

main();
