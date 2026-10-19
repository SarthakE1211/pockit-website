// ---------------------------------------------------------------------------
// Seed script — bootstraps the remaining Mumbai service-city landing pages.
//
// Run once after the `landingPage` schema is registered in Studio:
//
//     npm run seed:services
//
// Unlike `seed-landing-pages.ts` which uses `createOrReplace`, this script
// uses `createIfNotExists`. That means re-running it never overwrites
// editor edits — once a doc exists, subsequent runs skip it. Safe to run
// after editors start polishing copy.
//
// Each seeded doc:
//   - has the correct slug, pageType, service, location
//   - has placeholder hero/intro/services/FAQ text that the editor will
//     rewrite per service
//   - has `seo.noIndex: true` so Google does not crawl the page until the
//     editor has polished the copy and consciously flipped the toggle
//   - has every `areasServed` entry with `name` only and NO `href`, so
//     chips render as non-clickable spans on the live page (component
//     handles this via the `a.href ? <Link> : <span>` ternary)
//
// Env vars required:
//   - NEXT_PUBLIC_SANITY_PROJECT_ID  (defaults to pg938kpo)
//   - NEXT_PUBLIC_SANITY_DATASET     (defaults to production)
//   - SANITY_API_WRITE_TOKEN         (Editor role at sanity.io/manage)
//
// Introduced in CHANGELOG #037.
// ---------------------------------------------------------------------------

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token =
    process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_API_READ_TOKEN;

if (!token) {
    console.error(
        "\n[seed-services] No Sanity token found.\n" +
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
// Portable-text + key helpers (same shape as seed-landing-pages.ts)
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

function cryptoRandomKey(): string {
    return Math.random().toString(36).slice(2, 12);
}

function pt(
    text: string,
    style: SeedPortableTextBlock["style"] = "normal",
): SeedPortableTextBlock {
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

// ---------------------------------------------------------------------------
// Shared building blocks (every service reuses these brand-level lists)
// ---------------------------------------------------------------------------

const MUMBAI_AREAS: readonly string[] = [
    "Andheri",
    "Powai",
    "Goregaon",
    "Bandra",
    "Thane",
    "Malad",
    "Borivali",
    "Kandivali",
    "Kurla",
    "Lower Parel",
    "Worli",
    "Dadar",
    "Vikhroli",
    "Chembur",
    "Navi Mumbai",
];

function buildAreasServed() {
    // Name only — no href. Component renders <span> when href is absent
    // (see src/components/landing-pages/LandingPageView.tsx ~line 520).
    return MUMBAI_AREAS.map((name) => ({
        _key: cryptoRandomKey(),
        _type: "areaServed" as const,
        name,
    }));
}

const SHARED_TRUST_BULLETS: readonly string[] = [
    "Background-verified technicians",
    "Original / OEM-grade parts",
    "30-day service warranty",
    "Up-front, transparent pricing",
    "Mumbai-wide coverage",
];

function buildProcess(serviceLabel: string) {
    return [
        {
            _key: cryptoRandomKey(),
            _type: "processStep" as const,
            title: "Tell us what's wrong",
            description: `Open the Pockit app, pick \`${serviceLabel}\`, and describe the issue in a few words. No long forms.`,
        },
        {
            _key: cryptoRandomKey(),
            _type: "processStep" as const,
            title: "Verified technician en route",
            description:
                "A certified expert accepts the booking — you can track them live, just like a cab.",
        },
        {
            _key: cryptoRandomKey(),
            _type: "processStep" as const,
            title: "Diagnosed & fixed at your door",
            description:
                "On-site diagnosis, transparent quote, work completed and tested before the technician leaves.",
        },
    ];
}

// ---------------------------------------------------------------------------
// Per-service config — every entry produces one landingPage doc.
//
// Editors will rewrite the placeholder hero/intro/services/FAQs in Studio.
// What we lock in here:
//   - slug, pageType, service, location  → must not change post-seed
//   - meta title / description shape     → editor will tune copy
//   - noIndex: true                      → editor flips to false when ready
//   - non-clickable area chips           → enforced by absent href
// ---------------------------------------------------------------------------

interface ServiceConfig {
    readonly slug: string;
    readonly service: string;            // e.g. "MacBook Repair"
    readonly title: string;              // editor-facing
    readonly heroHeading: string;        // page H1
    readonly heroEyebrow: string;
    readonly heroSubheading: string;
    readonly heroPrimaryCtaLabel: string;
    readonly introParagraphs: readonly string[];
    readonly services: readonly {
        title: string;
        description: string;
        priceFrom?: number;
    }[];
    readonly faqs: readonly { question: string; answer: string }[];
    readonly metaTitle: string;
    readonly metaDescription: string;
}

const SERVICES: readonly ServiceConfig[] = [
    {
        slug: "macbook-repair-mumbai",
        service: "MacBook Repair",
        title: "MacBook Repair in Mumbai",
        heroEyebrow: "Mumbai · On-demand MacBook service",
        heroHeading:
            "MacBook Repair in Mumbai — at your doorstep, in 60 minutes.",
        heroSubheading:
            "Specialist help for macOS performance issues, battery and screen replacement, logic-board diagnostics, and data recovery. Pockit technicians come to your home or office anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book a MacBook Repair",
        introParagraphs: [
            "MacBooks are precision machines, and getting them serviced should not mean a week-long wait at an authorised centre across town. Pockit Engineers brings MacBook-trained technicians to your door anywhere in Mumbai — usually within an hour of booking.",
            "Whether your MacBook is slowing down after a macOS update, the battery health is in the red, the screen has a crack or backlight bleed, the trackpad has stopped clicking, or the logic board is suspect, we diagnose on-site and quote before any work begins. M1, M2, M3, M4 — we handle every generation, including Intel-era machines.",
        ],
        services: [
            {
                title: "macOS update & performance issues",
                description:
                    "Slow boot, beach-balling, kernel panics after an update. Audit, repair permissions, and tune startup load.",
                priceFrom: 599,
            },
            {
                title: "Battery replacement",
                description:
                    "OEM-grade cell replacement with full diagnostics report. Cycle count and health verified post-swap.",
                priceFrom: 5499,
            },
            {
                title: "Screen / display replacement",
                description:
                    "Cracked Retina displays, backlight bleed, dead pixels. Matched panel for every model.",
                priceFrom: 8999,
            },
            {
                title: "Keyboard & trackpad repair",
                description:
                    "Sticky keys, dead trackpads, butterfly-keyboard issues. Topcase swap when needed.",
                priceFrom: 3499,
            },
            {
                title: "Time Machine & backup setup",
                description:
                    "Encrypted Time Machine to external SSD or NAS. Migration assistant runs supervised.",
                priceFrom: 999,
            },
            {
                title: "Storage optimisation",
                description:
                    "Free up space, archive old projects, reset photo libraries, and shrink Docker / virtual-machine images.",
                priceFrom: 599,
            },
            {
                title: "Logic-board diagnostics",
                description:
                    "Liquid damage, no-power, sleep-wake faults. Component-level inspection with quote before any work.",
                priceFrom: 1499,
            },
            {
                title: "Data recovery",
                description:
                    "Recover from failed APFS containers, accidental erase, and dead SSDs where the chip is still readable.",
                priceFrom: 1999,
            },
        ],
        faqs: [
            {
                question: "Do you service Apple Silicon (M1 / M2 / M3 / M4)?",
                answer:
                    "Yes, every generation including the M4 line and Intel-era MacBooks. Diagnostic tools and replacement parts are sourced through OEM-grade channels.",
            },
            {
                question: "Will repairs void my AppleCare?",
                answer:
                    "Anything that affects Apple's warranty terms is flagged before we start. Where AppleCare is still active and the issue is covered, we recommend you use it — we'll tell you up-front.",
            },
            {
                question: "Can you replace a cracked MacBook screen at home?",
                answer:
                    "Yes, for most models. The technician arrives with the matched display assembly and calibrated tools; expect 60–90 minutes for the swap and a full visual test before they leave.",
            },
            {
                question: "Is my data safe during repair?",
                answer:
                    "Standard procedure includes an encrypted Time Machine backup before any storage-related work. Technicians are background-verified and the device never leaves your sight.",
            },
            {
                question: "What's the warranty on a MacBook repair?",
                answer:
                    "30-day service warranty on every job. If the same issue returns within 30 days we come back at no charge.",
            },
        ],
        metaTitle: "MacBook Repair in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand MacBook repair across Mumbai. M1/M2/M3/M4 specialists, doorstep service in 60 minutes, 30-day warranty. From ₹599.",
    },

    {
        slug: "desktop-repair-mumbai",
        service: "Desktop Repair",
        title: "Desktop Repair in Mumbai",
        heroEyebrow: "Mumbai · On-demand desktop service",
        heroHeading:
            "Desktop Repair in Mumbai — at your doorstep, in 60 minutes.",
        heroSubheading:
            "Whether it's a home desktop or a small office machine, Pockit keeps your system running fast, quiet, and stable. Doorstep diagnosis and on-site repair anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book a Desktop Repair",
        introParagraphs: [
            "Lugging a tower across Mumbai for a repair is nobody's idea of a good time. Pockit Engineers bring the workshop to your home or office — we diagnose, source parts, and complete the repair on-site, usually inside an hour of booking.",
            "Boot failures, BSOD loops, noisy fans, failing PSUs, slow HDD-bound boots, motherboard short, or just a system you'd like upgraded with an SSD or RAM — our technicians arrive with the kit, the parts, and the patience to make it right the first time.",
        ],
        services: [
            {
                title: "Desktop not starting / frequent restart",
                description:
                    "PSU diagnostics, motherboard checks, BIOS reset, and component-level repair when needed.",
                priceFrom: 499,
            },
            {
                title: "Slow system / cleanup",
                description:
                    "Startup audit, malware removal, drive defragmentation, and an SSD upgrade quote when warranted.",
                priceFrom: 599,
            },
            {
                title: "Hardware diagnosis",
                description:
                    "Full bench-style diagnosis of CPU, RAM, GPU, storage, PSU, and motherboard. Written report.",
                priceFrom: 499,
            },
            {
                title: "Operating-system reinstall",
                description:
                    "Clean Windows / Linux install with drivers, productivity apps, and your data restored from backup.",
                priceFrom: 699,
            },
            {
                title: "SSD / RAM upgrade",
                description:
                    "Free performance audit. Part recommendation, sourcing, fitment, and OS migration if requested.",
                priceFrom: 499,
            },
            {
                title: "Fan & thermal service",
                description:
                    "Internal cleaning, fan replacement, thermal paste reapplication. Quiet, cool, stable.",
                priceFrom: 499,
            },
            {
                title: "Data recovery",
                description:
                    "Recover from failing HDDs, accidental deletion, and OS-level corruption.",
                priceFrom: 999,
            },
        ],
        faqs: [
            {
                question: "Do you repair custom-built / gaming desktops?",
                answer:
                    "Yes, including AMD and Intel builds with discrete GPUs from NVIDIA and AMD. We handle BIOS updates, driver conflicts, and thermal issues common to custom rigs.",
            },
            {
                question: "Can you upgrade my desktop with an SSD?",
                answer:
                    "Yes — free audit and recommendation. We migrate your existing OS and data to the new SSD so nothing is lost.",
            },
            {
                question: "What if a part needs to be ordered?",
                answer:
                    "We carry the most common parts on-site. If a specific part needs to be ordered, we quote up-front, source within 24–48 hours, and complete the repair on a return visit.",
            },
            {
                question: "Do you offer a warranty on repairs?",
                answer:
                    "Yes — 30-day service warranty on every repair. If the same issue returns within 30 days we come back at no charge.",
            },
            {
                question: "Is my data safe during repair?",
                answer:
                    "Standard procedure includes an encrypted backup before any storage-related work. Technicians are background-verified.",
            },
        ],
        metaTitle: "Desktop Repair in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand desktop repair across Mumbai. Verified technicians, doorstep service in 60 minutes, 30-day warranty. From ₹499.",
    },

    {
        slug: "printer-repair-mumbai",
        service: "Printer Repair",
        title: "Printer Repair & Setup in Mumbai",
        heroEyebrow: "Mumbai · On-demand printer service",
        heroHeading:
            "Printer Repair & Setup in Mumbai — at your doorstep, in 60 minutes.",
        heroSubheading:
            "From new-printer setup to paper-jams that just will not quit, Pockit keeps your printer printing. Home and small-office printers anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book a Printer Service",
        introParagraphs: [
            "Printer problems always pick the worst moment — homework due tomorrow, an invoice that has to go out today. Pockit Engineers arrives at your door anywhere in Mumbai, usually within an hour, with the tools and the patience to make your printer behave again.",
            "Whether it is a brand-new printer that needs USB or Wi-Fi setup, a stubborn paper jam, a print queue stuck on a phantom job, multi-device sharing on a home network, or a service centre quote you'd like a second opinion on, our technicians handle every common make — HP, Canon, Brother, Epson, Samsung, Xerox.",
        ],
        services: [
            {
                title: "New printer setup (USB / Wi-Fi)",
                description:
                    "Unbox, install drivers on every device in the house, test print and scan, and walk you through the controls.",
                priceFrom: 499,
            },
            {
                title: "Printer not printing / paper jam",
                description:
                    "Mechanical clearance, sensor reset, driver reinstall. Recurring jams investigated end-to-end.",
                priceFrom: 499,
            },
            {
                title: "Multi-device sharing setup",
                description:
                    "Share one printer across phones, laptops, and tablets on your home Wi-Fi. Includes basic security review.",
                priceFrom: 599,
            },
            {
                title: "Cartridge / toner / ink service",
                description:
                    "OEM and reliable third-party cartridge sourcing. Refill recommendations and warranty implications explained.",
                priceFrom: 299,
            },
            {
                title: "Scan-to-email / cloud setup",
                description:
                    "Configure scan-to-email, scan-to-cloud, and document-management workflows for small offices.",
                priceFrom: 799,
            },
            {
                title: "Network printer troubleshooting",
                description:
                    "Diagnose offline status, slow prints, and intermittent disconnects on home and office networks.",
                priceFrom: 599,
            },
        ],
        faqs: [
            {
                question: "What printer brands do you service?",
                answer:
                    "Every major brand sold in India — HP, Canon, Brother, Epson, Samsung, Xerox, and more. Brand-specific parts are sourced through OEM channels.",
            },
            {
                question: "Can you connect my printer to my phone?",
                answer:
                    "Yes — Android and iOS via the manufacturer's app, AirPrint, or Google Cloud Print equivalents. Multi-device setup is included in our setup service.",
            },
            {
                question: "My printer keeps showing offline. Can you fix it?",
                answer:
                    "Yes. Recurring offline status is usually a Wi-Fi power-save, driver, or IP-conflict issue. We diagnose the root cause and reconfigure so it stays online.",
            },
            {
                question: "Do you sell ink and toner?",
                answer:
                    "We carry common cartridges on visits and can source specific models within 24–48 hours. We always recommend OEM where the price difference is reasonable.",
            },
            {
                question: "Is there a warranty on the service?",
                answer:
                    "30-day service warranty. If the same issue returns within 30 days we come back at no charge.",
            },
        ],
        metaTitle:
            "Printer Repair & Setup in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand printer repair and setup across Mumbai. HP, Canon, Brother, Epson, all major brands. Doorstep service in 60 minutes. From ₹299.",
    },

    {
        slug: "wfh-setup-mumbai",
        service: "Work-From-Home Setup",
        title: "Work-From-Home Setup in Mumbai",
        heroEyebrow: "Mumbai · Comfortable, productive home offices",
        heroHeading:
            "Work-From-Home Setup in Mumbai — designed, built, and tested.",
        heroSubheading:
            "From the desk angle and lighting to internet coverage and basic security, Pockit designs a reliable and comfortable work-from-home setup tailored to your space.",
        heroPrimaryCtaLabel: "Book a WFH Setup",
        introParagraphs: [
            "Working from home should not mean a sore back, dropped video calls, and a desk that fights you all day. Pockit Engineers comes to your home anywhere in Mumbai to design and build a work-from-home setup that fits the space you actually have.",
            "We survey the room, check internet speed and Wi-Fi coverage, audit basic security, and recommend the desk, chair, monitor, lighting, and connectivity changes that will make the biggest difference. Then we install and test everything so you can sit down and get to work.",
        ],
        services: [
            {
                title: "Home workspace assessment",
                description:
                    "Ergonomics, lighting, noise, and storage review with a written recommendation tailored to your space.",
                priceFrom: 999,
            },
            {
                title: "Internet speed & Wi-Fi coverage check",
                description:
                    "Room-by-room signal map, dead-spot diagnosis, mesh / repeater recommendation if needed.",
                priceFrom: 799,
            },
            {
                title: "Basic security review",
                description:
                    "Router-firmware update, Wi-Fi password hygiene, guest-network setup, antivirus check, and password manager basics.",
                priceFrom: 999,
            },
            {
                title: "Monitor & accessory installation",
                description:
                    "Mount monitors, route cables cleanly, and configure resolution / scaling so external displays look sharp.",
                priceFrom: 1499,
            },
            {
                title: "Video-call optimisation",
                description:
                    "Camera angle, microphone placement, lighting test, and a calibration pass on Zoom / Meet / Teams.",
                priceFrom: 599,
            },
            {
                title: "Cable management",
                description:
                    "Neat, durable cable management for desks, monitor arms, docks, and chargers.",
                priceFrom: 999,
            },
        ],
        faqs: [
            {
                question: "Do you supply furniture or just install?",
                answer:
                    "We recommend furniture that fits your space and budget; you can buy it directly or have us source it. Installation and setup are included regardless.",
            },
            {
                question: "Can you improve Wi-Fi in a flat where one room has no signal?",
                answer:
                    "Yes. We diagnose dead spots and recommend a mesh network, extender placement, or a wired access point depending on what your home will allow.",
            },
            {
                question: "Will you set up my video-call hardware?",
                answer:
                    "Yes — camera, microphone, ring light or panel light, headset, and a calibration pass on the platforms you use most.",
            },
            {
                question: "How long does a typical setup take?",
                answer:
                    "Most full setups complete in a single 2–3 hour visit. Larger projects involving new furniture or mesh networking may need a second visit.",
            },
            {
                question: "Is there a warranty on the installation work?",
                answer:
                    "30-day service warranty on all installation and configuration. If something stops working as installed, we come back at no charge.",
            },
        ],
        metaTitle:
            "Work-From-Home Setup in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book a designed, installed, and tested work-from-home setup in Mumbai. Ergonomics, Wi-Fi, security, video calls. From ₹599.",
    },

    {
        slug: "smart-tv-setup-mumbai",
        service: "Smart TV Setup",
        title: "Smart TV Setup in Mumbai",
        heroEyebrow: "Mumbai · On-demand Smart TV service",
        heroHeading: "Smart TV Setup in Mumbai — at your doorstep, in 60 minutes.",
        heroSubheading:
            "From OTT app sign-in and Wi-Fi tuning to screen mirroring and casting, Pockit makes your Smart TV experience seamless. Anywhere in Mumbai, with one visit.",
        heroPrimaryCtaLabel: "Book a Smart TV Setup",
        introParagraphs: [
            "Smart TVs ship with a lot of promise and a confusing remote. Pockit Engineers comes to your home anywhere in Mumbai to make sure the TV actually does what the box promised — every OTT app signed in, every cast button working, every input labelled clearly.",
            "We handle initial unboxing, wall mounting, Wi-Fi configuration, OTT app sign-ins, screen mirroring from phones and laptops, soundbar pairing, and the speaker-and-input routing that makes movies sound the way they should. We support every major brand — Samsung, LG, Sony, Xiaomi, OnePlus, TCL, and more.",
        ],
        services: [
            {
                title: "OTT apps setup",
                description:
                    "Sign in to Netflix, Prime, Hotstar, YouTube, JioCinema, Apple TV+, and any region-specific apps. Parental controls explained.",
                priceFrom: 499,
            },
            {
                title: "Screen mirroring / casting issues",
                description:
                    "Fix iPhone, Android, MacBook, and Windows casting. Wi-Fi 5GHz tuning and TV-side casting flags walked through.",
                priceFrom: 599,
            },
            {
                title: "Wi-Fi connectivity & optimisation",
                description:
                    "Move TV onto the right Wi-Fi band, fix buffering, and recommend mesh / wired Ethernet if signal is weak.",
                priceFrom: 599,
            },
            {
                title: "Wall mounting & cable management",
                description:
                    "Stud-finding, secure wall mount, neat cable routing, and HDMI / power planning to keep the wall clean.",
                priceFrom: 1499,
            },
            {
                title: "Soundbar / home-theatre pairing",
                description:
                    "Configure soundbar, eARC, optical, and Bluetooth pairing. Audio sync, surround mode, and night-mode setup.",
                priceFrom: 799,
            },
            {
                title: "Set-top box & game console integration",
                description:
                    "Tata Play, Airtel XStream, Fire TV, Apple TV, PS5, Xbox. Input labelling and HDMI-CEC tuning.",
                priceFrom: 599,
            },
        ],
        faqs: [
            {
                question: "Do you wall-mount TVs?",
                answer:
                    "Yes. We carry the common bracket types and can source larger or full-motion mounts as needed. Includes neat cable management.",
            },
            {
                question: "Why does my TV keep buffering during a movie?",
                answer:
                    "Usually a Wi-Fi band, signal-strength, or DNS issue. We diagnose with a speed test from the TV, then either move it to the correct band, add a mesh node, or recommend wired Ethernet.",
            },
            {
                question: "Can you cast from my phone to the TV?",
                answer:
                    "Yes — AirPlay for iPhone / iPad, Google Cast / Miracast for Android, and we explain the TV-side flags that some brands hide deep in the menu.",
            },
            {
                question: "What brands do you service?",
                answer:
                    "Every major brand sold in India — Samsung, LG, Sony, Xiaomi (Mi/Redmi), OnePlus, TCL, Hisense, Vu, and more.",
            },
            {
                question: "Is there a warranty on the setup?",
                answer:
                    "30-day service warranty. If something stops working as configured we come back at no charge.",
            },
        ],
        metaTitle: "Smart TV Setup in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand Smart TV setup across Mumbai. OTT apps, casting, wall mount, Wi-Fi tuning. Doorstep service in 60 minutes. From ₹499.",
    },

    {
        slug: "smartphone-help-mumbai",
        service: "Smartphone Help",
        title: "Smartphone Help in Mumbai",
        heroEyebrow: "Mumbai · On-demand smartphone service",
        heroHeading:
            "Smartphone Help in Mumbai — at your doorstep, in 60 minutes.",
        heroSubheading:
            "From a brand-new phone you'd like fully set up, to a slow phone you'd like fixed, Pockit helps you get the most out of your smartphone. Anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book Smartphone Help",
        introParagraphs: [
            "Smartphones store our work, our memories, and our money — and most of us never get past the basics. Pockit Engineers comes to your home anywhere in Mumbai to help you set up a new phone properly, fix one that has slowed down, or get an app installed and configured the way you actually use it.",
            "We support iPhone and Android, handle data transfer between platforms, sort out backups, parental controls, dual-SIM setup, payment-app safety, and the dozens of small settings that make a phone feel like yours. Hardware repair on common brands is also available — battery, screen, charging port.",
        ],
        services: [
            {
                title: "New phone setup & data transfer",
                description:
                    "iPhone-to-iPhone, Android-to-Android, and cross-platform migration. Contacts, photos, messages, and apps.",
                priceFrom: 499,
            },
            {
                title: "Storage full / phone running slow",
                description:
                    "Photo and chat backup, cache cleanup, app audit, and a privacy-respecting cleanup of WhatsApp and Telegram media.",
                priceFrom: 499,
            },
            {
                title: "App installation & troubleshooting",
                description:
                    "Banking, UPI, government, productivity, and business apps. Configured and login-tested before we leave.",
                priceFrom: 399,
            },
            {
                title: "Battery / screen / charging-port repair",
                description:
                    "Common-brand repairs on-site or pickup-and-drop for tougher cases. OEM-grade parts.",
                priceFrom: 1499,
            },
            {
                title: "Parental controls & screen-time setup",
                description:
                    "Apple Screen Time and Google Family Link configured properly. App limits, downtime, and content filters.",
                priceFrom: 599,
            },
            {
                title: "Payment app safety review",
                description:
                    "UPI app hygiene, fraud-pattern walkthrough, lock-screen privacy, and SIM-swap awareness.",
                priceFrom: 599,
            },
        ],
        faqs: [
            {
                question: "Do you move data from Android to iPhone (or back)?",
                answer:
                    "Yes. We use the official Move to iOS / Smart Switch tools where possible and bridge gaps with cloud backups for contacts, photos, and chat history.",
            },
            {
                question: "Can you fix a cracked phone screen at home?",
                answer:
                    "For common brands and models, yes — we carry matched panels and do the swap on-site. For other models we offer same-day pickup and drop.",
            },
            {
                question: "Are you safe to set up my banking apps?",
                answer:
                    "We never ask for your password or OTP. You sign in yourself; we explain what to tap, then leave so you can complete any sensitive step privately.",
            },
            {
                question: "My phone is hot and battery drains fast. Can you fix it?",
                answer:
                    "Yes — usually a rogue background app, a battery-health issue, or a misbehaving update. We diagnose the cause and either fix the software side or quote a battery swap.",
            },
            {
                question: "Is there a warranty on the work?",
                answer:
                    "30-day service warranty on every repair and configuration job.",
            },
        ],
        metaTitle:
            "Smartphone Help in Mumbai — Doorstep in 60 mins · Pockit",
        metaDescription:
            "Book on-demand smartphone help across Mumbai. New-phone setup, data transfer, repairs, parental controls. Doorstep in 60 minutes. From ₹399.",
    },

    {
        slug: "kids-safe-mumbai",
        service: "Kids Safe (Kaspersky)",
        title: "Kids Safe (Kaspersky) in Mumbai",
        heroEyebrow: "Mumbai · Family device safety",
        heroHeading:
            "Kids Safe in Mumbai — set up by experts, in partnership with Kaspersky.",
        heroSubheading:
            "Parental controls, safe browsing, and screen-time limits across every device your family uses. Configured properly the first time, anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book Kids Safe Setup",
        introParagraphs: [
            "Keeping a family's devices safe means more than installing one app and hoping for the best. Pockit Engineers, in partnership with Kaspersky, comes to your home anywhere in Mumbai to configure parental controls, safe browsing, and screen-time limits across every phone, tablet, and laptop your family uses.",
            "We start with a short conversation about how your family already uses devices, then configure age-appropriate content filters, app limits, daily downtime windows, location safety, and the basic data-privacy settings that ship with platforms but are often left off by default. You stay in control; we just make the platform do what you want it to do.",
        ],
        services: [
            {
                title: "Parental controls on phones & tablets",
                description:
                    "Apple Screen Time and Google Family Link configured per child, per device. App approval and request flows shown.",
                priceFrom: 999,
            },
            {
                title: "Safe browsing & content filters",
                description:
                    "Kaspersky Safe Kids installed and tuned. Age-appropriate browsing categories, search-result filtering, and YouTube Kids settings.",
                priceFrom: 1499,
            },
            {
                title: "Screen-time limits & downtime",
                description:
                    "Daily limits per app category, evening downtime, and homework focus modes. Shared with both parents.",
                priceFrom: 799,
            },
            {
                title: "Location safety setup",
                description:
                    "Family location sharing with privacy boundaries explained. Geo-fence alerts where supported.",
                priceFrom: 599,
            },
            {
                title: "Device-wide privacy review",
                description:
                    "Camera, microphone, contacts, and location permission audit. Old apps cleaned out.",
                priceFrom: 599,
            },
            {
                title: "Ongoing family device check-in",
                description:
                    "Quarterly review and tuning of limits as your child grows. Optional add-on.",
                priceFrom: 999,
            },
        ],
        faqs: [
            {
                question: "Do I need a Kaspersky subscription?",
                answer:
                    "Yes for the Kaspersky Safe Kids component. We can source a multi-device licence as part of the setup and bill it transparently.",
            },
            {
                question: "Will my child know the controls are there?",
                answer:
                    "Yes — and that is intentional. The platforms are designed for kids to see the limits and the request flow, and we walk both parent and child through how it works.",
            },
            {
                question: "Can both parents manage from their own phone?",
                answer:
                    "Yes. Apple Screen Time and Family Link both support multiple parent accounts; we configure them so either parent can approve apps and adjust limits.",
            },
            {
                question: "Does this work on school-issued devices?",
                answer:
                    "Most of the time, yes — but school-managed devices may already have their own MDM. We check first and recommend what is appropriate alongside school policy.",
            },
            {
                question: "Is there a warranty on the setup?",
                answer:
                    "30-day service warranty on the configuration. If anything stops working as installed we come back at no charge.",
            },
        ],
        metaTitle:
            "Kids Safe in Mumbai — Parental Controls with Kaspersky · Pockit",
        metaDescription:
            "Set up parental controls, safe browsing, and screen-time limits across every family device in Mumbai. In partnership with Kaspersky. From ₹599.",
    },

    {
        slug: "cctv-installation-mumbai",
        service: "CCTV Installation",
        title: "CCTV Installation in Mumbai",
        heroEyebrow: "Mumbai · CCTV installation & support",
        heroHeading:
            "CCTV Installation in Mumbai — at your doorstep, with a working app on day one.",
        heroSubheading:
            "Keep an eye on your home, office, kids, and elders with reliable CCTV setup, recording, and remote viewing from your phone. Anywhere in Mumbai.",
        heroPrimaryCtaLabel: "Book CCTV Installation",
        introParagraphs: [
            "A CCTV system is only as useful as the day you actually need it — which means it has to be installed correctly, recording reliably, and viewable from your phone when you are away. Pockit Engineers comes to your home or office anywhere in Mumbai to plan, install, and configure a system that works on day one and keeps working.",
            "We walk the space with you, identify blind spots, recommend the right number and type of cameras (dome, bullet, PTZ), plan cable routing or Wi-Fi placement, install the recorder (NVR / DVR) with the right storage, and configure remote viewing on your phone — including alerts for motion in the zones that actually matter.",
        ],
        services: [
            {
                title: "New CCTV installation",
                description:
                    "Site survey, camera placement plan, cabling or Wi-Fi setup, NVR / DVR installation, and remote-viewing configuration.",
                priceFrom: 4999,
            },
            {
                title: "Camera not working / no feed",
                description:
                    "Diagnose offline cameras, power-over-Ethernet issues, channel mapping, and storage-full conditions.",
                priceFrom: 999,
            },
            {
                title: "Remote viewing setup",
                description:
                    "Configure phone app, alerts, and per-camera privacy zones. Multi-user access for family or staff.",
                priceFrom: 999,
            },
            {
                title: "Storage upgrade & recording tuning",
                description:
                    "HDD upgrade, retention-window tuning, motion-triggered vs continuous recording trade-offs explained.",
                priceFrom: 1999,
            },
            {
                title: "Annual maintenance check",
                description:
                    "Once-a-year inspection of every camera, recorder, and storage device. Lens cleaning included.",
                priceFrom: 1499,
            },
            {
                title: "Camera relocation / add-on",
                description:
                    "Move existing cameras to cover new areas, or add cameras to an existing recorder.",
                priceFrom: 1499,
            },
        ],
        faqs: [
            {
                question: "How many cameras do I need for my home or office?",
                answer:
                    "We walk the space with you and recommend the minimum number that covers entry points and high-value areas. Most 2-3 BHK homes are well-covered with 3-5 cameras; small offices vary based on layout.",
            },
            {
                question: "Can I watch the feed from my phone?",
                answer:
                    "Yes — that is standard. We configure the manufacturer's app on your phone (and a second parent / partner if needed) and run through alerts before we leave.",
            },
            {
                question: "Do I need Wi-Fi cameras or wired?",
                answer:
                    "Wired (PoE) cameras are more reliable for permanent installations. Wi-Fi cameras work for rental homes or temporary setups; we recommend based on your situation.",
            },
            {
                question: "How long is the recording stored?",
                answer:
                    "Depends on storage size, number of cameras, and recording mode. Typical home setups keep 15–30 days; we explain trade-offs and tune retention to your needs.",
            },
            {
                question: "Is there a warranty on the installation?",
                answer:
                    "30-day service warranty on the installation and configuration. Hardware carries the manufacturer's warranty separately, which we walk you through.",
            },
        ],
        metaTitle:
            "CCTV Installation in Mumbai — Reliable Setup with Remote Viewing · Pockit",
        metaDescription:
            "Plan, install, and configure CCTV for home or office in Mumbai. Remote viewing from your phone, reliable recording, 30-day warranty. From ₹999.",
    },

    {
        slug: "instant-it-help-mumbai",
        service: "Instant IT Help",
        title: "Instant IT Help in Mumbai",
        heroEyebrow: "Mumbai · Instant IT help in 10 minutes",
        heroHeading:
            "Instant IT Help in Mumbai — remote fix in 10–15 minutes.",
        heroSubheading:
            "For those urgent tech problems where you just need someone on the call right now. Mostly remote, occasional doorstep follow-up. Mumbai-wide.",
        heroPrimaryCtaLabel: "Get Instant Help",
        introParagraphs: [
            "Some IT problems do not need an hour-long visit — they need someone on a call right now who can look at your screen, take over for a few minutes, and just make it work. Instant IT Help is exactly that: a 10–15 minute remote session with a verified Pockit technician, available across Mumbai.",
            "Stuck app, email login that has stopped working, printer that has disappeared from the network, a file that will not open, a payment that bounced because a setting is off — we handle the common, urgent, fixable things over a screen-share. If it turns out the problem needs a physical visit, we say so and book one straight away.",
        ],
        services: [
            {
                title: "Quick remote fix (10-15 mins)",
                description:
                    "Screen-share, brief diagnosis, and a fix completed live. Most common small problems resolved in one session.",
                priceFrom: 299,
            },
            {
                title: "App or software help",
                description:
                    "Setup, login, and basic troubleshooting for the dozen apps everyone uses but nobody enjoys configuring.",
                priceFrom: 299,
            },
            {
                title: "Email / account issues",
                description:
                    "Gmail, Outlook, Yahoo, ISP mail. Login, sync, two-factor, signature, and forwarding setup.",
                priceFrom: 299,
            },
            {
                title: "Printer / Wi-Fi quick fix",
                description:
                    "Common offline-printer and Wi-Fi-dropout fixes that do not need a visit.",
                priceFrom: 399,
            },
            {
                title: "Payment / UPI / banking app help",
                description:
                    "Configuration walkthroughs over screen-share. We never ask for your password or OTP.",
                priceFrom: 299,
            },
        ],
        faqs: [
            {
                question: "How does the remote session work?",
                answer:
                    "We send you a short link, you give us view-or-control permission on your screen, we fix the problem live, and the session ends when you close the link. You can see everything we do.",
            },
            {
                question: "What if the problem cannot be fixed remotely?",
                answer:
                    "We say so immediately, and we book you a doorstep visit straight from the same booking. The remote-session fee is adjusted into the visit fee.",
            },
            {
                question: "Are you safe to handle my banking or email?",
                answer:
                    "We never ask for your password or OTP. You sign in yourself; we explain what to tap, then we hand control back so any sensitive step is done by you.",
            },
            {
                question: "How fast can you start a session?",
                answer:
                    "Most Instant Help sessions begin within 10 minutes of booking during normal hours.",
            },
            {
                question: "Is there a warranty on a quick remote fix?",
                answer:
                    "If the same issue returns within 7 days we revisit at no charge.",
            },
        ],
        metaTitle:
            "Instant IT Help in Mumbai — Remote Fix in 10 Minutes · Pockit",
        metaDescription:
            "Get instant, remote IT help across Mumbai. Quick fixes for apps, email, printers, Wi-Fi, payments. From ₹299. Verified technicians.",
    },
];

// ---------------------------------------------------------------------------
// Build a complete `landingPage` document from a ServiceConfig
// ---------------------------------------------------------------------------

function buildDoc(cfg: ServiceConfig) {
    return {
        // NOTE: avoid dots in custom `_id`. Sanity treats `foo.bar` IDs as
        // system-namespaced and excludes them from anonymous public reads
        // (the build-time `client` has no token, so it would never see
        // dotted-ID docs). Using the bare slug keeps the doc in the public
        // perspective and lets generateStaticParams pick it up.
        _id: cfg.slug,
        _type: "landingPage",
        title: cfg.title,
        slug: { _type: "slug" as const, current: cfg.slug },
        pageType: "service-city",
        service: cfg.service,
        location: "Mumbai",

        heroEyebrow: cfg.heroEyebrow,
        heroHeading: cfg.heroHeading,
        heroSubheading: cfg.heroSubheading,
        heroBullets: [
            "Doorstep service across all of Mumbai",
            "Verified, certified technicians only",
            "Diagnosis fee shown up-front in the app",
            "30-day warranty on every repair",
        ],
        heroPrimaryCta: { label: cfg.heroPrimaryCtaLabel, href: "/#download" },
        heroSecondaryCta: { label: "How it works", href: "/#how-it-works" },

        intro: cfg.introParagraphs.map((p) => pt(p)),

        services: cfg.services.map((s) => ({
            _key: cryptoRandomKey(),
            _type: "serviceItem" as const,
            title: s.title,
            description: s.description,
            ...(typeof s.priceFrom === "number" ? { priceFrom: s.priceFrom } : {}),
        })),

        trustBullets: [...SHARED_TRUST_BULLETS],

        process: buildProcess(cfg.service),

        areasServed: buildAreasServed(),

        priceRange: "₹₹",
        phone: "+91 97699 39163",
        responseTime: "60 minutes",

        faqs: cfg.faqs.map((f) => ({
            _key: cryptoRandomKey(),
            _type: "faqItem" as const,
            question: f.question,
            answer: f.answer,
        })),

        seo: {
            metaTitle: cfg.metaTitle,
            metaDescription: cfg.metaDescription,
            // Gate every seeded doc behind noIndex until the editor has
            // reviewed and polished the copy. Editors flip this to false
            // in Studio when the page is ready to be crawled.
            noIndex: true,
        },

        publishedAt: new Date().toISOString(),
    };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    console.log(
        `[seed-services] projectId=${projectId} dataset=${dataset} — seeding ${SERVICES.length} docs (createIfNotExists)`,
    );

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const cfg of SERVICES) {
        const doc = buildDoc(cfg);
        try {
            // createIfNotExists never overwrites — if the editor has already
            // started polishing copy in Studio, this script is a no-op for
            // that doc. Safe to re-run any time.
            const result = await client.createIfNotExists(doc);
            const slug = (result as { slug?: { current?: string } }).slug
                ?.current;
            // Sanity returns the doc whether it created or matched — there's
            // no `wasCreated` flag, so we compare _createdAt to "just now" to
            // decide whether to count this as new vs existing.
            const createdAt = (result as { _createdAt?: string })._createdAt;
            const isNew =
                createdAt && Date.now() - new Date(createdAt).getTime() < 30_000;
            if (isNew) {
                created++;
                console.log(`  ✓ created  ${doc._id} (slug=${slug})`);
            } else {
                skipped++;
                console.log(
                    `  ↷ skipped  ${doc._id} — already exists, editor changes preserved`,
                );
            }
        } catch (err) {
            failed++;
            const e = err as { statusCode?: number; message?: string };
            if (e.statusCode === 401 || e.statusCode === 403) {
                console.error(
                    `\n[seed-services] Permission denied. The Sanity token in your env doesn't have write access.\n` +
                        `  → Generate a token with the Editor role at https://www.sanity.io/manage/project/${projectId}/api#tokens\n` +
                        `  → Save it to .env.local as SANITY_API_WRITE_TOKEN=...\n` +
                        `  → Re-run \`npm run seed:services\`.\n`,
                );
                process.exit(2);
            }
            console.error(`  ✗ failed   ${doc._id}:`, err);
        }
    }

    console.log(
        `\n[seed-services] done. created=${created}, skipped=${skipped}, failed=${failed}.`,
    );
    if (failed > 0) process.exit(1);
}

main();
