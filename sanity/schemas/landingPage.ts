// ---------------------------------------------------------------------------
// Landing page — SEO-driven city / locality / problem-fix pages.
//
// Examples (all live at the marketing-site root):
//   pageType=service-city      → /laptop-repair-mumbai
//   pageType=service-locality  → /laptop-repair-andheri
//   pageType=problem-fix       → /laptop-not-turning-on-mumbai
//
// One Sanity document = one published HTML page on the cPanel static build.
// Editors author copy, FAQs, services, locality highlights, and SEO meta in
// Studio; the route at src/app/[slug]/page.tsx renders it.
//
// IMPORTANT — slug uniqueness is global. The route is mounted at root, so a
// slug here cannot collide with an existing app route (about, terms, blog,
// studio, …). The reserved list below is enforced by validation in Studio
// AND filtered out at build time in generateStaticParams as belt + braces.
//
// Introduced in CHANGELOG #022.
// ---------------------------------------------------------------------------

import { defineField, defineType } from "sanity";

/**
 * Slugs that already resolve to existing app routes (or static files in
 * `public/`). Keep in sync with the route filesystem and the `public/`
 * directory. Editors who try to use one will get a validation error in
 * Studio; the route's generateStaticParams skips them defensively too.
 */
const RESERVED_SLUGS: readonly string[] = [
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
    "logo.png",
    "images",
    "svg",
    "avatars",
];

export const landingPage = defineType({
    name: "landingPage",
    title: "Landing page (SEO)",
    type: "document",
    groups: [
        { name: "content", title: "Content", default: true },
        { name: "sections", title: "Body sections" },
        { name: "local", title: "Local SEO" },
        { name: "faq", title: "FAQ" },
        { name: "links", title: "Internal links" },
        { name: "seo", title: "SEO" },
    ],
    fields: [
        // ── Identity ──────────────────────────────────────────────────────
        defineField({
            name: "title",
            title: "Title",
            description:
                "Editor-facing title. Used as the H1 unless heroHeading overrides it.",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.required().min(4).max(120),
        }),
        defineField({
            name: "slug",
            title: "URL slug",
            description:
                "The path under the marketing site root (e.g. `laptop-repair-mumbai`). " +
                "Keywords matter — pick the exact query you want to rank for.",
            type: "slug",
            group: "content",
            options: {
                source: "title",
                maxLength: 80,
                slugify: (input) =>
                    input
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")
                        .slice(0, 80),
            },
            validation: (Rule) =>
                Rule.required().custom((slug) => {
                    const value = (slug as { current?: string } | undefined)
                        ?.current;
                    if (!value) return "Slug is required";
                    if (RESERVED_SLUGS.includes(value)) {
                        return `"${value}" is a reserved path. Pick a different slug.`;
                    }
                    if (value.startsWith("blog/") || value.startsWith("studio/")) {
                        return "Slug cannot start with blog/ or studio/.";
                    }
                    return true;
                }),
        }),
        defineField({
            name: "pageType",
            title: "Page type",
            description:
                "Drives the JSON-LD schema variant and which page sections render. " +
                "Service-city = a service in Mumbai. Service-locality = same service in a specific area. " +
                "Problem-fix = a symptom-led troubleshooting page.",
            type: "string",
            group: "content",
            options: {
                list: [
                    { title: "Service in city (e.g. Laptop Repair Mumbai)", value: "service-city" },
                    { title: "Service in locality (e.g. Laptop Repair Andheri)", value: "service-locality" },
                    { title: "Problem fix (e.g. Laptop not turning on – Mumbai)", value: "problem-fix" },
                ],
                layout: "radio",
            },
            initialValue: "service-city",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "service",
            title: "Service",
            description:
                "Short label for the service (e.g. `Laptop Repair`, `WiFi Setup`). " +
                "Used in JSON-LD `Service.serviceType` and breadcrumb.",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.required().max(60),
        }),
        defineField({
            name: "location",
            title: "Location",
            description:
                "Display name of the city or area (e.g. `Mumbai`, `Andheri`, `Powai`). " +
                "Used in JSON-LD `LocalBusiness.areaServed` and breadcrumb.",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.required().max(60),
        }),
        defineField({
            name: "problem",
            title: "Problem (only for problem-fix pages)",
            description:
                "The symptom this page solves (e.g. `Laptop not turning on`, `Printer offline`). " +
                "Leave blank for service-city / service-locality pages.",
            type: "string",
            group: "content",
            hidden: ({ document }) => document?.pageType !== "problem-fix",
            validation: (Rule) => Rule.max(120),
        }),

        // ── Hero ──────────────────────────────────────────────────────────
        defineField({
            name: "heroEyebrow",
            title: "Hero eyebrow",
            description:
                "Small text above the H1 (e.g. `Mumbai Laptop Service`). Optional.",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.max(60),
        }),
        defineField({
            name: "heroHeading",
            title: "Hero heading",
            description:
                "The page H1. If blank, falls back to `title`. Make it match the search intent.",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.max(120),
        }),
        defineField({
            name: "heroSubheading",
            title: "Hero subheading",
            description: "1–2 sentence value prop under the H1.",
            type: "text",
            rows: 3,
            group: "content",
            validation: (Rule) => Rule.max(280),
        }),
        defineField({
            name: "heroBullets",
            title: "Hero bullets",
            description: "Up to 4 short trust-building bullets shown next to the hero CTA.",
            type: "array",
            group: "content",
            of: [{ type: "string" }],
            validation: (Rule) => Rule.max(4),
        }),
        defineField({
            name: "heroPrimaryCta",
            title: "Hero primary CTA",
            type: "object",
            group: "content",
            fields: [
                {
                    name: "label",
                    title: "Label",
                    type: "string",
                    initialValue: "Book a Service",
                },
                {
                    name: "href",
                    title: "Href",
                    description:
                        "Use `#download` to scroll to the app-download band on home, or a full route.",
                    type: "string",
                    initialValue: "#download",
                },
            ],
        }),
        defineField({
            name: "heroSecondaryCta",
            title: "Hero secondary CTA",
            type: "object",
            group: "content",
            fields: [
                { name: "label", title: "Label", type: "string" },
                { name: "href", title: "Href", type: "string" },
            ],
        }),

        // ── Body sections ─────────────────────────────────────────────────
        defineField({
            name: "intro",
            title: "Intro paragraph",
            description:
                "1–2 paragraphs of intro copy below the hero. Plain text or Portable Text.",
            type: "array",
            group: "sections",
            of: [
                {
                    type: "block",
                    styles: [
                        { title: "Normal", value: "normal" },
                        { title: "H2", value: "h2" },
                        { title: "H3", value: "h3" },
                    ],
                    marks: {
                        decorators: [
                            { title: "Strong", value: "strong" },
                            { title: "Emphasis", value: "em" },
                        ],
                    },
                },
            ],
        }),
        defineField({
            name: "services",
            title: "Services / what we fix",
            description:
                "List of services covered on this page. Each becomes a card.",
            type: "array",
            group: "sections",
            of: [
                {
                    type: "object",
                    name: "serviceItem",
                    fields: [
                        {
                            name: "title",
                            title: "Title",
                            type: "string",
                            validation: (Rule) => Rule.required(),
                        },
                        {
                            name: "description",
                            title: "Description",
                            type: "text",
                            rows: 3,
                        },
                        {
                            name: "priceFrom",
                            title: "Price from (₹)",
                            type: "number",
                        },
                    ],
                    preview: {
                        select: { title: "title", subtitle: "priceFrom" },
                        prepare({ title, subtitle }) {
                            return {
                                title,
                                subtitle: subtitle
                                    ? `From ₹${subtitle}`
                                    : undefined,
                            };
                        },
                    },
                },
            ],
        }),
        defineField({
            name: "trustBullets",
            title: "Trust bullets",
            description:
                "Short reasons to choose Pockit (e.g. `Background-verified technicians`, " +
                "`60-min doorstep arrival`, `30-day warranty`). 3–6 bullets is the sweet spot.",
            type: "array",
            group: "sections",
            of: [{ type: "string" }],
        }),
        defineField({
            name: "process",
            title: "How it works (steps)",
            description: "Optional step-by-step. 3 steps reads best.",
            type: "array",
            group: "sections",
            of: [
                {
                    type: "object",
                    name: "processStep",
                    fields: [
                        { name: "title", title: "Title", type: "string" },
                        { name: "description", title: "Description", type: "text", rows: 2 },
                    ],
                },
            ],
        }),

        defineField({
            name: "seoContent",
            title: "Long-form SEO content (collapsed behind “Read More”)",
            description:
                "Keyword-rich supporting copy rendered below the FAQ accordion. It is always " +
                "present in the page HTML — crawlers and answer engines read all of it — but " +
                "visually clamped until the visitor taps “Read More”. Lead with one H2 for the " +
                "block title, then an H3 per sub-section. Bullet lists render as ticked items.",
            type: "array",
            group: "sections",
            of: [
                {
                    type: "block",
                    styles: [
                        { title: "Normal", value: "normal" },
                        { title: "H2", value: "h2" },
                        { title: "H3", value: "h3" },
                    ],
                    lists: [{ title: "Bullet", value: "bullet" }],
                    marks: {
                        decorators: [
                            { title: "Strong", value: "strong" },
                            { title: "Emphasis", value: "em" },
                        ],
                    },
                },
            ],
        }),

        // ── Local SEO ─────────────────────────────────────────────────────
        defineField({
            name: "areasServed",
            title: "Areas served",
            description:
                "Sub-localities or neighborhoods covered. Renders as a chip grid for internal linking " +
                "and feeds JSON-LD `areaServed`.",
            type: "array",
            group: "local",
            of: [
                {
                    type: "object",
                    name: "areaServed",
                    fields: [
                        {
                            name: "name",
                            title: "Name",
                            type: "string",
                            validation: (Rule) => Rule.required(),
                        },
                        {
                            name: "href",
                            title: "Internal link (optional)",
                            description:
                                "If we have a dedicated page for this area, link it here (e.g. `/laptop-repair-andheri`).",
                            type: "string",
                        },
                    ],
                    preview: { select: { title: "name", subtitle: "href" } },
                },
            ],
        }),
        defineField({
            name: "priceRange",
            title: "Price range (LocalBusiness)",
            description:
                "Price range token used in JSON-LD `LocalBusiness.priceRange`. " +
                "Conventional values are `$`, `$$`, `$$$`. Optional.",
            type: "string",
            group: "local",
        }),
        defineField({
            name: "phone",
            title: "Phone (LocalBusiness)",
            description:
                "Phone number for `LocalBusiness.telephone`. Defaults to the company HQ if blank.",
            type: "string",
            group: "local",
        }),
        defineField({
            name: "responseTime",
            title: "Typical response time",
            description:
                "Free-text (e.g. `60 minutes`, `Same day`). Surfaced in the hero and JSON-LD.",
            type: "string",
            group: "local",
            initialValue: "60 minutes",
        }),

        // ── FAQ (drives FAQPage JSON-LD AND a visible accordion) ──────────
        defineField({
            name: "faqs",
            title: "FAQs",
            description:
                "Question/answer pairs. Renders as an accordion AND as `FAQPage` JSON-LD for rich results.",
            type: "array",
            group: "faq",
            of: [
                {
                    type: "object",
                    name: "faqItem",
                    fields: [
                        {
                            name: "question",
                            title: "Question",
                            type: "string",
                            validation: (Rule) => Rule.required(),
                        },
                        {
                            name: "answer",
                            title: "Answer",
                            type: "text",
                            rows: 4,
                            validation: (Rule) => Rule.required(),
                        },
                    ],
                    preview: { select: { title: "question" } },
                },
            ],
        }),

        // ── Internal-link module ──────────────────────────────────────────
        defineField({
            name: "relatedPages",
            title: "Related landing pages",
            description:
                "Cross-link to sibling landing pages (same service, different city / area / problem). " +
                "Strong internal linking is the SEO point of this whole programme.",
            type: "array",
            group: "links",
            of: [{ type: "reference", to: [{ type: "landingPage" }] }],
        }),

        // ── SEO ──────────────────────────────────────────────────────────
        defineField({
            name: "seo",
            title: "SEO",
            type: "object",
            group: "seo",
            fields: [
                {
                    name: "metaTitle",
                    title: "Meta title",
                    description: "≤ 70 chars. If blank, falls back to `<title> · Pockit Engineers`.",
                    type: "string",
                    validation: (Rule) => Rule.max(70),
                },
                {
                    name: "metaDescription",
                    title: "Meta description",
                    description: "≤ 160 chars. Sentence case, action verb up front.",
                    type: "text",
                    rows: 2,
                    validation: (Rule) => Rule.max(160),
                },
                {
                    name: "ogImage",
                    title: "Open Graph image",
                    description:
                        "1200×630 social share image. Falls back to a brand default if blank.",
                    type: "image",
                },
                {
                    name: "noIndex",
                    title: "Hide from search engines",
                    description:
                        "Tick to add `noindex,nofollow` and exclude from sitemap. Useful for drafts " +
                        "you've published in Studio but don't want crawled yet.",
                    type: "boolean",
                    initialValue: false,
                },
            ],
        }),

        // ── Publishing ────────────────────────────────────────────────────
        defineField({
            name: "publishedAt",
            title: "Published at",
            type: "datetime",
            group: "content",
            validation: (Rule) => Rule.required(),
            initialValue: () => new Date().toISOString(),
        }),
    ],

    preview: {
        select: {
            title: "title",
            slug: "slug.current",
            pageType: "pageType",
            location: "location",
        },
        prepare({ title, slug, pageType, location }) {
            const typeLabel =
                pageType === "service-locality"
                    ? "Locality"
                    : pageType === "problem-fix"
                      ? "Problem fix"
                      : "City";
            return {
                title,
                subtitle: `/${slug ?? "—"}  ·  ${typeLabel}  ·  ${location ?? ""}`,
            };
        },
    },

    orderings: [
        {
            title: "Most recently published",
            name: "publishedDesc",
            by: [{ field: "publishedAt", direction: "desc" }],
        },
        {
            title: "Slug A–Z",
            name: "slugAsc",
            by: [{ field: "slug.current", direction: "asc" }],
        },
    ],
});
