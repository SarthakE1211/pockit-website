// ─── Site Meta ───────────────────────────────────────────────────────────────
// Title + description are the primary on-SERP signals. Lead with the
// highest-intent service ("Doorstep Laptop Repair") and the priority
// city ("Mumbai") because the audit (May 2026) flagged generic copy as
// the reason we weren't ranking for service-specific queries.
export const SITE_META = {
    title: "Doorstep Laptop Repair & IT Support in Mumbai | Pockit Engineers",
    description:
        "Book verified laptop, MacBook, WiFi, printer, smart TV & CCTV experts at your door in Mumbai in under 60 minutes. Pockit Engineers — Bharat's on-demand IT services app.",
};

// Centralised business / contact constants used by JSON-LD schema, the
// header WhatsApp CTA, and the footer. Keep one source of truth so
// schema, UI, and meta stay in sync.
//
//   `whatsappNumber` — accepts a human-readable form (with spaces); the
//   `whatsappHref()` helper below strips whitespace before dropping it
//   into the `wa.me/<digits>` deep link.
//   `telephone`     — human-readable form for schema's `telephone`.
export const BUSINESS = {
    legalName: "Pockit Technologies Private Limited",
    brandName: "Pockit Engineers",
    telephone: "+91 88822 80156",
    whatsappNumber: "91 80692 51494",
    whatsappPrefilled: "Hello Pockit!",
    email: "support@pockitengineers.com",
    primaryCity: "Mumbai",
    primaryRegion: "Maharashtra",
    primaryCountry: "IN",
    serviceCities: ["Mumbai", "Delhi NCR", "Pune", "Noida"],
    foundingYear: 2024,
} as const;

/**
 * Build a `wa.me` deep link from `BUSINESS.whatsappNumber`. Strips all
 * whitespace from the configured number (so a human-readable
 * "9199716 62153" works) and url-encodes the prefilled message. Use
 * this from every component that renders a WhatsApp CTA — never inline
 * a raw `wa.me/<digits>` URL, otherwise updating the number requires a
 * grep + edit across the codebase instead of a single change here.
 */
export function whatsappHref(prefilled?: string): string {
    const digits = BUSINESS.whatsappNumber.replace(/\s+/g, "");
    const text = encodeURIComponent(prefilled ?? BUSINESS.whatsappPrefilled);
    return `https://wa.me/${digits}?text=${text}`;
}

// ─── Header ──────────────────────────────────────────────────────────────────
/**
 * A single nav link. `href` can be a main-site anchor (`#foo`), a root-hash
 * link (`/#foo`), or a full route (`/blog`, `/about`, …). The Header/Footer
 * resolver in `@/lib/siteUrls` handles cross-origin swapping at render time
 * so the same declaration works from both the cPanel main-site build and the
 * Vercel blog build.
 */
export interface NavLink {
    readonly label: string;
    readonly href: string;
}

/**
 * Main-site nav order. Blog moved after Testimonials per user preference
 * (2026-04-16). FAQ stays last where users expect help links.
 * Originally added in CHANGELOG #013; reordered in #016.1.
 */
export const NAV_LINKS: readonly NavLink[] = [
    // "Services" targets the ServiceGrid section (`id="services"`), not the
    // app-download band (`id="download"`) — see CHANGELOG #014.
    { label: "Services", href: "#services" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Promise", href: "#promise" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Blog", href: "/blog" },
    { label: "FAQ", href: "#faq" },
];

export const HEADER = {
    loginLabel: "Get the app",
    /** In-app: use `/#download` so hash works from any route */
    loginHref: "/#download",
    bookLabel: "Book a Service",
    bookHref: "#download",
    themeToggleLabel: "Toggle Theme",
    themeDarkLabel: "Dark",
    themeLightLabel: "Light",
    googlePlayLabel: "Google Play",
    googlePlaySuperLabel: "Get it on",
    appStoreLabel: "App Store",
    appStoreSuperLabel: "Download on the",
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
// Visible H1 ("Bharat's Only IT Services App") preserved as the brand
// line. The keyword payload moved to the description below it
// (May 2026 SEO audit, CHANGELOG #036): on-SERP snippets and crawlers
// see "doorstep IT support in Mumbai", "laptop repair", "MacBook",
// "WiFi", "smart TV", "printer", "CCTV" without us touching the
// branded headline.
export const HERO = {
    badge: "Instant IT Help in 10 mins",
    headlineLine1: "Bharat's Only",
    headlineLine2: "IT Services App",
    description:
        "Doorstep IT support in Mumbai — book a verified laptop, MacBook, WiFi, smart-TV, printer or CCTV expert at your home in 10 minutes.",
    googlePlaySuperLabel: "Get it on",
    googlePlayLabel: "Google Play",
    appStoreSuperLabel: "Download on the",
    appStoreLabel: "App Store",
    whatsappSuperLabel: "Chat with us on",
    whatsappLabel: "WhatsApp",
    nowLiveIn: "Now live in —",
    cities: ["Delhi NCR", "Mumbai", "Noida", "Pune"],
    floatingCard1Title: "Laptop Repair",
    floatingCard1Price: "₹299+",
    floatingCard2Title: "Expert Booked!",
    floatingCard2Subtitle: "Arrives in ~10 mins",
    floatingCard3Title: "Smart TV Setup",
    floatingCard3Price: "₹349+",
};

// ─── How It Works ─────────────────────────────────────────────────────────────
export const HOW_IT_WORKS = {
    sectionPill: "How It Works",
    heading: "Fix Your Tech in",
    headingHighlight: "Minutes",
    subheading: "Three simple steps. Zero confusion.",
};

export const STEPS = [
    {
        num: "01",
        pill: "STEP 01",
        title: "Select a Service",
        desc: "Browse 10+ IT categories from the app. Choose exactly what you need — no hidden packages, no surprise fees.",
        accent: "from-orange-500 to-amber-500",
    },
    {
        num: "02",
        pill: "STEP 02",
        title: "Expert Dispatched",
        desc: "A background-verified technician accepts your booking and is en-route — tracked live on your map in real time.",
        accent: "from-blue-500 to-cyan-500",
    },
    {
        num: "03",
        pill: "STEP 03",
        title: "Device Fixed",
        desc: "Your issue is resolved by a verified expert. Test everything and get back to work stress-free.",
        accent: "from-emerald-500 to-teal-500",
    },
];

// Phone screen strings used inside HowItWorks sub-components
export const PHONE_BROWSE = {
    greeting: "Good morning 👋",
    prompt: "What needs fixing?",
    searchPlaceholder: "Search services...",
    popularLabel: "Popular",
    bookButton: "BOOK",
    services: [
        { name: "Laptop Repair", price: "₹299", color: "bg-orange-500/15 text-orange-400" },
        { name: "WiFi Setup", price: "₹199", color: "bg-blue-500/15 text-blue-400" },
        { name: "Smart TV", price: "₹349", color: "bg-indigo-500/15 text-indigo-400" },
        { name: "CCTV Install", price: "₹499", color: "bg-emerald-500/15 text-emerald-400" },
    ],
};

export const PHONE_TRACKING = {
    heading: "Expert on the way",
    eta: "Arriving in ~12 mins",
    expertInitials: "RK",
    expertName: "Rajesh Kumar",
    expertRating: "⭐ 4.9",
    expertBadge: "VERIFIED",
};

export const PHONE_PAYMENT = {
    heading: "Service Complete ✓",
    subheading: "Laptop Repair — 45 mins",
    allDone: "All Done!",
    ratePrompt: "Rate your experience",
    lineItem1Label: "Screen Repair",
    lineItem1Price: "₹2,499",
    lineItem2Label: "Diagnostics",
    lineItem2Price: "FREE",
    totalLabel: "Total",
    totalPrice: "₹2,499",
    payButton: "PAY NOW",
};

// ─── KPI Stats ────────────────────────────────────────────────────────────────
export const KPI_STATS = {
    sectionPill: "Why Trust Us",
    heading: "Reliable Tech Help,",
    headingHighlight: "Every Time",
    subheading: "Thousands of homes already trust Pockit with their tech.",
    stats: [
        { target: 10113, suffix: "", label: "Customers Served" },
        { target: 10, suffix: " mins", label: "Avg Response Time" },
        { target: 562, suffix: "", label: "Verified Technicians" },
    ],
};

// ─── Pockit Promise ───────────────────────────────────────────────────────────
export const PROMISE = {
    sectionPill: "The Pockit Promise",
    heading: "Trust &",
    headingHighlight: "Transparency First.",
    subheading:
        "We don't send just anyone. Only verified, background-checked professionals you can trust.",
};

export const POCKIT_PROMISES = [
    {
        title: "Background Checked",
        desc: "Every expert undergoes police verification, ID validation, and reference checks before joining Pockit. Your safety is our highest priority — no shortcuts, no exceptions.",
        stat: "100%",
        statLabel: "Verified Experts",
        features: ["Police Verification", "ID Validation", "Reference Checks"],
    },
    {
        title: "Verified Identity",
        desc: "Real-time photo ID matching and live location tracking on every service call for complete transparency. Know exactly who's coming and when they'll arrive.",
        stat: "Live",
        statLabel: "Real-time Tracking",
        features: ["Photo ID Match", "Live GPS Tracking", "Service Timeline"],
    },
    {
        title: "Certified Experts",
        desc: "All technicians hold industry certifications and complete quarterly skill assessments to stay current. Only the top-rated professionals make the cut.",
        stat: "A+",
        statLabel: "Industry Certified",
        features: ["Industry Certs", "Quarterly Reviews", "Top-Rated Only"],
    },
] as const;

// ─── Testimonials (Bento Grid) ───────────────────────────────────────────────
export const TESTIMONIALS_SECTION = {
    sectionPill: "Testimonials",
    heading: "What Our Customers",
    headingHighlight: "Say",
    subheading: "Don't just take our word for it. Here's what thousands of happy customers have to say about their Pockit experience.",
};

// ─── Social Proof (legacy ticker — kept for reference) ────────────────────────
export const SOCIAL_PROOF = {
    sectionPill: "Reviews",
    heading: "Loved by thousands across",
    headingHighlight: "India",
    subheading: "4.9 / 5 average across 10,000+ verified reviews",
};

export const REVIEWS = [
    { name: "Tanaya Sahasrabhojane", text: "Highly recommended for quick, reliable, and hassle-free tech support at home! Fantastic app for at-home laptop and IT service! The interface is super easy to navigate, and booking takes just minutes.", rating: 5, city: "Pune", source: "Verified", avatar: "/images/tanya.webp", image: "/images/tanya.webp" },
    { name: "Yashodhan Pawar", text: "Pockit is a very reliable and well-designed app. It runs smoothly, feels easy to use and makes handling service requests much simpler.", rating: 5, city: "Pune", source: "Verified", avatar: "/images/Yashodhan.webp", image: "/images/Yashodhan.webp" },
    { name: "Aarya Kenjale", text: "Pockit's made things a lot simpler for me. They handle all my software and hardware issues, and when I accidentally wiped my macOS, their service executive came home and fixed it almost immediately. Everything was back up and running without any downtime. Highly recommend!!", rating: 5, city: "Pune", source: "Verified", avatar: "/images/Aarya.webp", image: "/images/Aarya.webp" },
    { name: "Kartik Ambokar", text: "Impressed with the professionalism. The engineer explained the problem clearly, suggested the best option, and got my laptop running like new.", rating: 5, city: "Mumbai", source: "Verified", avatar: "/images/Kartik.webp", image: "/images/Kartik.webp" },
    { name: "Tanmay Kesarkar", text: "Service ka experience kaafi smooth tha. Booking easy thi, technician time par aaya aur bina kisi hassle ke issue fix kar diya.", rating: 5, city: "Mumbai", source: "Verified", avatar: "/images/Tanmay.JPG.webp", image: "/images/Tanmay.JPG.webp" },
    { name: "Amit Phadke", text: "The App is fast and reliable laptop repairs at home! The app is easy to use, the technician arrived on time, and fixed my issue in a single visit at a very reasonable price.", rating: 5, city: "Powai, Mumbai", source: "Verified", avatar: "/images/Amit.webp", image: "/images/Amit.webp" },
];

// ─── Download Band ────────────────────────────────────────────────────────────
export const DOWNLOAD_BAND = {
    sectionPill: "Download Now",
    headingLine1: "IT Support.",
    headingHighlight: "In Your Pocket.",
    description:
        "Download the Pockit Engineers app and get a background-verified IT expert at your door in under 60 minutes. Available on Android & iOS.",
    googlePlaySuperLabel: "GET IT ON",
    googlePlayLabel: "Google Play",
    appStoreSuperLabel: "Available on the",
    appStoreLabel: "App Store",
    qrScanLabel: "Scan to Download",
    qrAlt: "Download Pockit App QR Code",
};

// ─── Floating Download CTA ────────────────────────────────────────────────────
export const FLOATING_DOWNLOAD = {
    googlePlaySuperLabel: "GET IT ON",
    googlePlayLabel: "Google Play",
    appStoreSuperLabel: "Download on the",
    appStoreLabel: "App Store",
};

// ─── Footer ───────────────────────────────────────────────────────────────────
export const FOOTER = {
    logoAlt: "Pockit Engineers Logo",
    description:
        "Bharat's only dedicated IT on-demand service app. Background-verified experts at your door in under 10 minutes.",
    copyright: `© ${new Date().getFullYear()} Pockit Engineers. All rights reserved.`,
    disclaimer:"Pockit Engineers is an independent service provider and is not affiliated with or authorized by Apple, Lenovo, Dell, HP, Microsoft, or any other brand unless explicitly stated. All trademarks and brand names are the property of their respective owners.",
    bookCTA: "Book a Service",
    bookHref: "/#download",
    whatsappHref: "https://wa.me/918069251494",
};

export const FOOTER_LINKS = [
    {
        title: "Services",
        links: [
            // Each service should ideally link to its own /<service>-mumbai
            // landing page. Today only Laptop Repair has one
            // (`/laptop-repair-mumbai`, CHANGELOG #022). Others fall back
            // to the homepage download anchor — swap the href as soon as
            // the matching Sanity landingPage doc exists.
            { label: "Laptop Repair", href: "/laptop-repair-mumbai" },
            { label: "WiFi Setup", href: "/#download" },
            { label: "Smart TV Setup", href: "/#download" },
            { label: "CCTV Installation", href: "/#download" },
            { label: "Data Recovery", href: "/#download" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About Us", href: "/about" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Blog", href: "/blog" },
            { label: "Join as a Technician", href: "/become-a-technician" },
        ],
    },
    {
        title: "Support",
        links: [
            { label: "Download app", href: "/#download" },
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Delete Account", href: "/delete-account" },
            { label: "Terms & Conditions", href: "/terms" },
        ],
    },
];

// ─── Expert Page (Join as a Technician) ────────────────────────────────────────
export const EXPERT_HERO = {
    headlineLine1: "Your skills.",
    headlineLine2: "Real demand.",
    headlineLine3: "Your terms.",
    description: "Join 10,000+ skilled engineers across Delhi, Mumbai, Bangalore.",
    formInstruction: "Share your WhatsApp number and we'll reach out via our WhatsApp Business Account.",
    inputPlaceholder: "Your phone number",
    ctaLabel: "Join Us",
    ctaHref: "https://wa.me/918069251494",
};

export const EXPERT_BELOW = {
    heading: "Built for experts who know their worth",
    subheading: "We bring the customers. You bring the craft. Get verified, set your schedule, and grow your practice with India's trusted network of on-demand IT professionals.",
};

/** Join as a Technician — hero copy */
export const EXPERT_PAGE_UC = {
    hero: {
        headline: "Become a Pockit Expert",
        tagline: "Kaam rukna nahi chahiye. Earning rukni nahi chahiye.",
        body: "Pockit helps you get regular work, clear payments, and a system you can rely on. No chasing customers, no uncertainty — just steady jobs based on your skills.",
        cta: "Contact Us Now",
        // The CTA is a click-to-dial: on mobile it opens the dialer, on
        // desktop it hands off to the OS/telephony app. E.164 form (leading
        // "+", country code, no spaces) so `tel:` works across devices.
        // Changed from a WhatsApp deep link on 2026-08-13 (CHANGELOG #079).
        ctaDialNumber: "+919240251266",
    },
} as const;

/**
 * Technician application form — copy + the fixed skill checklist.
 *
 * `skills` is the single source of truth for both the form checkboxes and
 * the server-side allow-list in `src/app/api/technician/route.server.ts`
 * (which imports these ids to reject anything a tampered client might POST).
 * Change a skill here and both ends stay in sync — never hardcode the list
 * in the component or the route.
 */
export const EXPERT_FORM = {
    heading: "Apply in 30 seconds",
    subheading: "Tell us who you are and what you fix. We'll reach out on WhatsApp.",
    skillsLabel: "What do you service? (tick all that apply)",
    submitLabel: "Apply Now",
    submittingLabel: "Sending…",
    successTitle: "Application received",
    successBody: "Thanks! Our team will reach out to you shortly.",
    errorBody: "Something went wrong. Please try again, or reach us on WhatsApp.",
    skills: [
        { id: "laptop_desktop", label: "Laptop/Desktop" },
        { id: "macbook", label: "MacBook" },
        { id: "printer", label: "Printer" },
        { id: "cctv", label: "CCTV" },
        { id: "smart_tv", label: "Smart TV" },
        { id: "smart_phone", label: "Smart Phone" },
    ],
} as const;

export type ExpertSkillId = (typeof EXPERT_FORM.skills)[number]["id"];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export const FAQ_SECTION = {
    sectionPill: "FAQ",
    heading: "Got",
    headingHighlight: "Questions?",
    subheading: "Everything you need to know about Pockit Engineers.",
};

export const FAQ_ITEMS = [

    {
        q: "Is there a warranty on repairs?",
        a: "Yes, we provide a 30-day service warranty on all completed jobs.",
    },
    {
        q: "How do I track my technician?",
        a: "Once a technician accepts your booking, you can track their real-time location directly in the Pockit app. You'll also receive SMS and in-app notifications as they get closer to your location.",
    },
    {
        q: "Which IT services does Pockit offer?",
        a: "Pockit provides doorstep IT support for both your home and work devices. Our services include Laptop Services (servicing, health checks, SSD & RAM upgrades, battery/screen/keyboard/motherboard repairs, OS installation, virus removal and more), MacBook Services (health checks, deep cleaning, battery and screen replacement, storage/component upgrades, macOS optimization), Desktop Services (servicing, custom PC builds, hardware upgrades, gaming optimization, OS installation), Printer Services (installation, servicing, paper jam and cartridge fixes, connectivity), Wi-Fi & Work-From-Home Setup, CCTV Services, Smart TV Support (software only), Smartphone Support (software only), and Kids Safe (Kaspersky Safe Kids setup). Not sure which service you need? Ask our AI Assistant, Chip AI — describe your issue and it will point you to the right service.",
    },
    {
        q: "How do I contact Pockit support?",
        a: "You can reach us through the Help section in the Pockit app. Our support team is available 7 days a week.",
    },
    {
        q: "How do I become a Pockit technician?",
        a: "If you're a certified IT professional looking to join our expert network, visit the 'Join as a Technician' section on our website or app. You'll go through our verification process and skill assessment before being onboarded.",
    },
    {
        q: "How soon will a Pockit technician arrive?",
        a: "Once you book a service, your request is dispatched to a verified Pockit technician within 10 minutes. In most serviceable areas, your technician will arrive within 60 minutes, subject to location, traffic, and availability.",
    },
    {
        q: "Which cities is Pockit available in?",
        a: "Pockit Engineers is currently live in Delhi NCR, Mumbai, Pune, and Noida. We're rapidly expanding — stay tuned for your city!",
    },
    {
        q: "Are the technicians background-verified?",
        a: "Yes, every Pockit expert undergoes a strict 5-step background verification including police verification, Aadhaar validation, reference checks, skill certification, and quarterly performance reviews. Your safety is our highest priority.",
    },
    {
        q: "Do I pay before or after the service?",
        a: "You can choose whichever payment option is more convenient for you. We offer both Online Payment and Cash on Delivery (COD) through the Pockit app. Whether you prefer to pay in advance or after your service is completed, the choice is entirely yours..",
    },
    {
        q: "Can I cancel or reschedule a booking?",
        a: "Yes. You can cancel or reschedule a booking anytime before the technician is dispatched, directly from the app — free of charge. Once the expert is en-route, cancellation may be subject to a small convenience fee.",
    },
    {
        q: "When am I eligible for a refund?",
        a: "If your refund request is approved as per our refund policy, the refund will be issued as Pockit Credits. These credits will be added to your Pockit Wallet and can be used to pay for future services booked through the app.",
    },
    {
        q: "What payment methods are accepted?",
        a: "We accept all major payment methods including UPI (GPay, PhonePe, Paytm), debit/credit cards, and net banking.",
    },
];
