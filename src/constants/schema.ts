// ---------------------------------------------------------------------------
// Hand-authored SEO JSON-LD (CHANGELOG #077).
//
// This is the single source of truth for the structured data supplied by the
// SEO team. It is *content*, not derived data — deliberately kept verbatim so
// the emitted markup can be diffed against the SEO brief without reading
// through template logic.
//
// Where each block is emitted:
//   ORGANIZATION_SCHEMA  + WEBSITE_SCHEMA   → src/app/layout.tsx  <head>, every page
//   LOCAL_BUSINESS_SCHEMA + HOME_FAQ_SCHEMA → src/app/page.tsx,   home page only
//   SERVICE_PAGE_SCHEMA[slug]               → src/app/[slug]/page.static.tsx
//
// None of it renders visible UI — these objects exist purely as
// <script type="application/ld+json"> payloads for crawlers and LLMs.
//
// IMPORTANT: the FAQ text here is authored independently of the visible FAQ
// copy (`FAQ_ITEMS` in copy.ts for the home page, Sanity `faqs` for landing
// pages). Google's structured-data guidelines expect FAQPage markup to mirror
// content visible on the page; this was an explicit product decision to treat
// the schema as an SEO-only surface. If Google ever penalises it, reconciling
// these two sources is the fix.
// ---------------------------------------------------------------------------

export const SITE_URL = "https://www.pockitengineers.com/";
export const SITE_URL_BARE = "https://www.pockitengineers.com";

/** Loose shape for a JSON-LD node — the schema.org vocabulary is far too wide to model. */
export type JsonLdNode = Readonly<Record<string, unknown>>;

// ---------------------------------------------------------------------------
// Site-wide
// ---------------------------------------------------------------------------

export const ORGANIZATION_SCHEMA: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL_BARE}/#organization`,
    name: "Pockit Engineers",
    url: SITE_URL,
    // NOTE: the SEO brief specified blue_brand_logo.svg. Google's Organization
    // logo rich result does not accept SVG — it requires a raster format. The
    // .png sibling of the same asset is used instead.
    logo: `${SITE_URL_BARE}/images/blue_brand_logo.png`,
    sameAs: [
        "https://www.facebook.com/profile.php?id=61576204075910",
        "https://x.com/PockITEngineers",
        "https://www.instagram.com/_.pockit._",
        "https://www.linkedin.com/company/pockit-engineers/",
        "https://play.google.com/store/apps/details?id=com.pockitcust",
        "https://apps.apple.com/in/app/pockit/id6745779480",
    ],
};

export const WEBSITE_SCHEMA: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL_BARE}/#website`,
    name: "Pockit Engineers",
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL_BARE}/#organization` },
    potentialAction: {
        "@type": "SearchAction",
        // NOTE: the SEO brief specified a bare "{search_term_string}" here.
        // That is not a URL, so Google discards the SearchAction entirely. The
        // template is pointed at the blog search, which is the only search
        // surface the site has.
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL_BARE}/blog?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
    },
};

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export const LOCAL_BUSINESS_SCHEMA: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL_BARE}/#localbusiness`,
    name: "Pockit Engineers",
    image: `${SITE_URL_BARE}/images/blue_brand_logo.png`,
    url: SITE_URL,
    telephone: "918069251494",
    address: {
        "@type": "PostalAddress",
        streetAddress:
            "906, 93, East Building, 304, Mahakali Caves Rd, Shanti Nagar, Andheri East, Mumbai, Maharashtra 400093",
        addressLocality: "Mumbai",
        postalCode: "400093",
        addressCountry: "IN",
    },
    geo: {
        "@type": "GeoCoordinates",
        latitude: 19.1223588,
        longitude: 72.8641985,
    },
    openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        // ⚠️ Emitted exactly as supplied in the SEO brief. `closes` is earlier
        // than `opens`, which Google reads as 11:00 → 08:00 the following day.
        // If the real hours are 11 AM – 8 PM, change `closes` to "20:00".
        opens: "11:00",
        closes: "08:00",
    },
};

export const HOME_FAQ_SCHEMA: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL_BARE}/#faq`,
    mainEntity: [
        {
            "@type": "Question",
            name: "Is there a warranty on repairs?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, we provide a 30-day service warranty on all completed repair jobs.",
            },
        },
        {
            "@type": "Question",
            name: "How do I track my technician?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Once a technician accepts your booking, you can track their real-time location directly in the Pockit app. You'll also receive SMS and in-app notifications as the technician gets closer to your location.",
            },
        },
        {
            "@type": "Question",
            name: "Which IT services does Pockit offer?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Pockit provides doorstep IT support for homes and businesses. Our services include Laptop Repair and Service, MacBook Repair and Service, Desktop Repair and Upgrades, Printer Installation and Repair, Wi-Fi and Work-From-Home Setup, CCTV Installation and Support, Smart TV Software Support, Smartphone Software Support, and Kids Safe (Kaspersky Safe Kids setup). If you're unsure which service you need, ask our AI Assistant, Chip AI, for guidance.",
            },
        },
        {
            "@type": "Question",
            name: "How do I contact Pockit support?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "You can contact Pockit support through the Help section in the Pockit app. Our support team is available seven days a week.",
            },
        },
        {
            "@type": "Question",
            name: "How do I become a Pockit technician?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "If you're a certified IT professional, visit the 'Join as a Technician' section on the Pockit website or app. You'll complete a verification process and skill assessment before joining our expert network.",
            },
        },
        {
            "@type": "Question",
            name: "How fast can a technician reach my location?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Once you book a service through the Pockit app, a background-verified technician is dispatched immediately. You can track their live location and estimated arrival time in the app.",
            },
        },
        {
            "@type": "Question",
            name: "Which cities is Pockit available in?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Pockit Engineers currently provides services in Mumbai, Delhi NCR, Pune, and Noida. We are continuously expanding to more cities.",
            },
        },
        {
            "@type": "Question",
            name: "Are the technicians background-verified?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Every Pockit technician completes a comprehensive five-step background verification process, including police verification, Aadhaar validation, reference checks, skill certification, and regular performance reviews.",
            },
        },
        {
            "@type": "Question",
            name: "Do I pay before or after the service?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "You can choose to pay either before or after your service. Pockit supports online payments as well as Cash on Delivery (COD), giving you the flexibility to pay at your convenience.",
            },
        },
        {
            "@type": "Question",
            name: "Can I cancel or reschedule a booking?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can cancel or reschedule your booking free of charge before a technician is dispatched. If the technician is already on the way, a small convenience fee may apply.",
            },
        },
        {
            "@type": "Question",
            name: "When am I eligible for a refund?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "If your refund request is approved according to our refund policy, the refund will be issued as Pockit Credits. These credits will be added to your Pockit Wallet and can be used for future service bookings.",
            },
        },
        {
            "@type": "Question",
            name: "What payment methods are accepted?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "We accept UPI payments (Google Pay, PhonePe, Paytm), debit cards, credit cards, net banking, and Cash on Delivery (COD).",
            },
        },
    ],
};

// ---------------------------------------------------------------------------
// Service landing pages
//
// Keyed by the Sanity landingPage slug. A slug present here has its Service +
// FAQPage nodes taken verbatim from the SEO brief; the generated equivalents
// in src/app/[slug]/page.static.tsx are suppressed so the page never carries
// two Service or two FAQPage nodes. Slugs absent here keep the fully
// Sanity-derived graph.
//
// To bring another landing page (e.g. /cctv-installation-mumbai) under the
// brief, add an entry — no other file needs to change.
// ---------------------------------------------------------------------------

/** Shared provider block — identical across every service page in the brief. */
const SERVICE_PROVIDER: JsonLdNode = {
    "@type": "ComputerRepair",
    name: "Pockit Engineers",
    url: SITE_URL_BARE,
    telephone: "+91-9240251266",
};

/** Shared offer block — indicative pricing only, no fixed price in the brief. */
const SERVICE_OFFER: JsonLdNode = {
    "@type": "Offer",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
};

function serviceNode(args: {
    slug: string;
    name: string;
    description: string;
    serviceType: string;
}): JsonLdNode {
    const url = `${SITE_URL_BARE}/${args.slug}`;
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${url}#service`,
        name: args.name,
        description: args.description,
        serviceType: args.serviceType,
        url,
        areaServed: { "@type": "City", name: "Mumbai" },
        provider: SERVICE_PROVIDER,
        offers: SERVICE_OFFER,
    };
}

function faqNode(slug: string, qa: readonly (readonly [string, string])[]): JsonLdNode {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${SITE_URL_BARE}/${slug}#faq`,
        mainEntity: qa.map(([question, answer]) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
        })),
    };
}

export const SERVICE_PAGE_SCHEMA: Readonly<Record<string, readonly JsonLdNode[]>> = {
    "instant-it-help-mumbai": [
        serviceNode({
            slug: "instant-it-help-mumbai",
            name: "Instant IT Help in Mumbai",
            description:
                "Same-day remote and doorstep IT support in Mumbai for software issues, email problems, Wi-Fi troubleshooting, printer setup, application support, and general IT assistance.",
            serviceType: "IT Support",
        }),
        faqNode("instant-it-help-mumbai", [
            [
                "How does the remote session work?",
                "After you book an Instant IT Help session, we send you a secure link. You grant view or remote-control permission on your device, our technician diagnoses and fixes the issue live, and the session ends as soon as you close the link. You can monitor everything the technician does throughout the session.",
            ],
            [
                "What if the problem cannot be fixed remotely?",
                "If the issue cannot be resolved remotely, we'll let you know immediately and arrange a doorstep technician visit through the same booking. The remote session fee will be adjusted against the doorstep service fee.",
            ],
            [
                "Is it safe to let Pockit Engineers handle my banking or email?",
                "Yes. We never ask for your passwords, OTPs, or other confidential information. You enter your credentials yourself while we guide you through the process, ensuring that all sensitive actions remain under your control.",
            ],
            [
                "How fast can you start a remote support session?",
                "Most Instant IT Help remote support sessions begin within 10 minutes of booking during our normal operating hours.",
            ],
            [
                "Is there a warranty on a remote IT support session?",
                "Yes. If the same issue returns within 7 days after a remote fix, we'll revisit the issue at no additional charge.",
            ],
        ]),
    ],

    "laptop-repair-mumbai": [
        serviceNode({
            slug: "laptop-repair-mumbai",
            name: "Laptop Repair in Mumbai",
            description:
                "Professional laptop repair in Mumbai with same-day doorstep service for Dell, HP, Lenovo, Asus, Acer, MSI, Samsung, and other laptop brands.",
            serviceType: "Laptop Repair",
        }),
        faqNode("laptop-repair-mumbai", [
            [
                "How fast can a Pockit technician reach me in Mumbai?",
                "Typical doorstep arrival is within 60 minutes of booking across Mumbai, including areas such as Andheri and Thane. The Pockit app displays the technician's live ETA before you confirm your booking.",
            ],
            [
                "Do you charge a visit fee even if I don't get the repair done?",
                "Yes. A small diagnosis fee is displayed upfront in the Pockit app. If you proceed with the repair, the diagnosis fee is adjusted against the final repair bill, so you only pay for the completed service.",
            ],
            [
                "What laptop brands do you service?",
                "We repair all major laptop brands available in India, including HP, Dell, Lenovo, ASUS, Acer, MSI, Apple MacBook, Microsoft Surface, Samsung, LG, and more. Where available, we source genuine OEM replacement parts.",
            ],
            [
                "Do you offer a warranty on laptop repairs?",
                "Yes. Every laptop repair includes a 30-day service warranty. If the same issue reoccurs within 30 days, we'll inspect and resolve it at no additional service charge.",
            ],
            [
                "Is my data safe during laptop repair?",
                "Yes. Your data security is our priority. All Pockit technicians are background-verified, and for repairs involving the storage drive, we perform a complimentary encrypted backup before any operating system reinstallation or hardware replacement whenever possible.",
            ],
            [
                "Can you replace a cracked laptop screen at my home?",
                "Yes. We provide doorstep laptop screen replacement for most laptop models. Our technician arrives with the compatible replacement screen and professional tools. Most screen replacements are completed within 60 to 90 minutes.",
            ],
            [
                "What payment methods do you accept?",
                "We accept UPI, major debit and credit cards, net banking, and cash payments. Payment is collected only after the repair has been completed and verified to be working properly.",
            ],
        ]),
    ],

    "macbook-repair-mumbai": [
        serviceNode({
            slug: "macbook-repair-mumbai",
            name: "MacBook Repair in Mumbai",
            description:
                "Expert MacBook repair in Mumbai including screen replacement, battery replacement, keyboard repair, motherboard repair, SSD upgrades, macOS troubleshooting, and data recovery.",
            serviceType: "MacBook Repair",
        }),
        faqNode("macbook-repair-mumbai", [
            [
                "Do you service Apple Silicon (M1 / M2 / M3 / M4) MacBooks?",
                "Yes. We repair all generations of Apple Silicon MacBooks, including M1, M2, M3, and M4 models, as well as Intel-based MacBooks. We use professional diagnostic tools and source OEM-grade replacement parts whenever available.",
            ],
            [
                "Will repairs void my AppleCare?",
                "Before starting any repair, we inform you if the work could affect your AppleCare coverage. If your MacBook is still covered under AppleCare and the issue qualifies for warranty service, we'll recommend using Apple's warranty first.",
            ],
            [
                "Can you replace a cracked MacBook screen at my home?",
                "Yes. We offer doorstep MacBook screen replacement for most models. Our technician arrives with the compatible display assembly and professional tools. Most screen replacements are completed within 60 to 90 minutes, followed by a complete visual and functional test.",
            ],
            [
                "Is my data safe during MacBook repair?",
                "Yes. Your data security is our priority. Before performing any storage-related repair, we follow a standard procedure that includes creating an encrypted Time Machine backup whenever possible. All technicians are background-verified, and your MacBook remains with you throughout the repair.",
            ],
            [
                "What's the warranty on a MacBook repair?",
                "Every MacBook repair includes a 30-day service warranty. If the same issue reoccurs within 30 days, we'll revisit and resolve the problem at no additional service charge.",
            ],
        ]),
    ],

    "desktop-repair-mumbai": [
        serviceNode({
            slug: "desktop-repair-mumbai",
            name: "Desktop Repair in Mumbai",
            description:
                "Same-day desktop and computer repair in Mumbai including hardware upgrades, motherboard repair, Windows installation, SSD upgrades, RAM upgrades, and data recovery.",
            serviceType: "Desktop Repair",
        }),
        faqNode("desktop-repair-mumbai", [
            [
                "Do you repair custom-built and gaming desktops?",
                "Yes. We repair custom-built and gaming desktops, including AMD and Intel systems with NVIDIA and AMD graphics cards. Our technicians handle BIOS updates, driver conflicts, hardware upgrades, overheating issues, and thermal optimization.",
            ],
            [
                "Can you upgrade my desktop with an SSD?",
                "Yes. We provide a free compatibility audit and SSD recommendation. We also migrate your existing operating system, applications, and data to the new SSD, ensuring you don't lose your files.",
            ],
            [
                "What if a desktop part needs to be ordered?",
                "We carry many commonly used replacement parts. If a specific component needs to be ordered, we'll provide an upfront quotation, source the part within 24 to 48 hours whenever possible, and complete the repair during a follow-up visit.",
            ],
            [
                "Do you offer a warranty on desktop repairs?",
                "Yes. Every desktop repair includes a 30-day service warranty. If the same issue returns within 30 days, we'll inspect and resolve it at no additional service charge.",
            ],
            [
                "Is my data safe during desktop repair?",
                "Yes. Your data security is important to us. Before performing any storage-related repair, we follow a standard procedure that includes creating an encrypted backup whenever possible. All Pockit technicians are background-verified.",
            ],
        ]),
    ],

    "printer-repair-mumbai": [
        serviceNode({
            slug: "printer-repair-mumbai",
            name: "Printer Repair in Mumbai",
            description:
                "Professional printer repair in Mumbai for HP, Canon, Epson, Brother, Samsung, Xerox, and other printer brands. We provide installation, maintenance, troubleshooting, and doorstep printer repair services.",
            serviceType: "Printer Repair",
        }),
        faqNode("printer-repair-mumbai", [
            [
                "What printer brands do you service?",
                "We repair and service all major printer brands available in India, including HP, Canon, Brother, Epson, Samsung, Xerox, and more. Wherever possible, we source genuine OEM replacement parts for reliable repairs.",
            ],
            [
                "Can you connect my printer to my phone?",
                "Yes. We can connect your printer to Android and iOS devices using the manufacturer's mobile app, Apple AirPrint, or other compatible wireless printing solutions. Multi-device setup is included in our printer setup service.",
            ],
            [
                "My printer keeps showing offline. Can you fix it?",
                "Yes. A printer showing offline is commonly caused by Wi-Fi power-saving settings, driver issues, or IP address conflicts. Our technicians diagnose the root cause and reconfigure your printer to ensure a stable connection.",
            ],
            [
                "Do you sell ink and toner cartridges?",
                "Yes. We carry commonly used ink and toner cartridges during service visits and can source specific cartridge models within 24 to 48 hours. We recommend genuine OEM cartridges whenever the price difference is reasonable.",
            ],
            [
                "Is there a warranty on the printer repair service?",
                "Yes. Every printer repair includes a 30-day service warranty. If the same issue reoccurs within 30 days, we'll revisit and resolve it at no additional service charge.",
            ],
        ]),
    ],
};
