"use client";

// ---------------------------------------------------------------------------
// LandingPageView — the rendered UI for any Sanity `landingPage` document.
//
// Mounted by the route at src/app/[slug]/page.tsx. Every section is driven
// by data from Sanity; nothing is hardcoded so the same component renders
// every Mumbai SEO page (city, locality, problem-fix variants).
//
// Design language inherits the existing site theme — `theme-bg`,
// `theme-accent`, Plus Jakarta Sans, Framer Motion entrance patterns. No
// new design language is introduced.
//
// Introduced in CHANGELOG #022.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    ChevronDown,
    Clock,
    MapPin,
    Phone,
    ShieldCheck,
    Sparkles,
    Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/landing/Header";
import ReadMoreContent, {
    SEO_HEADING_FONT,
    SEO_PROSE,
} from "@/components/seo/ReadMoreContent";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { resolveNavHref } from "@/lib/siteUrls";
import { whatsappHref } from "@/constants/copy";
import { trackWhatsAppClick } from "@/lib/metaPixel";
import type {
    LandingPageDetail,
    LandingPageFaqItem,
} from "@/lib/sanity/types";

// PortableText is loaded dynamically — only this page type uses it on the
// cPanel build, no point shipping it on every other route.
import { PortableText, type PortableTextComponents } from "@portabletext/react";

const VIEWPORT = { once: true, margin: "-10% 0px" } as const;

interface LandingPageViewProps {
    readonly page: LandingPageDetail;
}

export default function LandingPageView({ page }: LandingPageViewProps) {
    const heroHeading = page.heroHeading ?? page.title;
    const heroEyebrow = page.heroEyebrow ?? defaultEyebrow(page);
    const primaryCta = page.heroPrimaryCta ?? {
        label: "Book a Service",
        href: "/#download",
    };
    const secondaryCta = page.heroSecondaryCta;

    // Track a single page-view event with the structured dimensions used
    // for GA4 dashboards. Sent once on mount via a no-op effect surrogate.
    useMountAnalytics(page);

    return (
        <>
            <ThemeSync />
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden bg-theme-bg">
                <Header />

                <Hero
                    eyebrow={heroEyebrow}
                    heading={heroHeading}
                    subheading={page.heroSubheading}
                    bullets={page.heroBullets}
                    primaryCta={primaryCta}
                    secondaryCta={secondaryCta}
                    location={page.location}
                    responseTime={page.responseTime}
                    phone={page.phone}
                    pageSlug={page.slug.current}
                />

                <TrustStrip bullets={page.trustBullets} />

                {page.intro && page.intro.length > 0 ? (
                    <IntroSection blocks={page.intro} />
                ) : null}

                {page.services && page.services.length > 0 ? (
                    <ServicesSection items={page.services} />
                ) : null}

                {page.process && page.process.length > 0 ? (
                    <ProcessSection steps={page.process} />
                ) : null}

                {page.areasServed && page.areasServed.length > 0 ? (
                    <AreasServedSection
                        location={page.location}
                        areas={page.areasServed}
                    />
                ) : null}

                {page.faqs && page.faqs.length > 0 ? (
                    <FaqSection items={page.faqs} pageSlug={page.slug.current} />
                ) : null}

                {page.seoContent && page.seoContent.length > 0 ? (
                    <SeoContentSection
                        blocks={page.seoContent}
                        pageSlug={page.slug.current}
                    />
                ) : null}

                <CtaBanner
                    location={page.location}
                    service={page.service}
                    primaryCta={primaryCta}
                    pageSlug={page.slug.current}
                />

                {page.relatedPages && page.relatedPages.length > 0 ? (
                    <RelatedPagesSection pages={page.relatedPages} />
                ) : null}

                <Footer />
            </main>
        </>
    );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Hero({
    eyebrow,
    heading,
    subheading,
    bullets,
    primaryCta,
    secondaryCta,
    location,
    responseTime,
    phone,
    pageSlug,
}: {
    eyebrow?: string;
    heading: string;
    subheading?: string;
    bullets?: readonly string[];
    primaryCta: { label?: string; href?: string };
    secondaryCta?: { label?: string; href?: string };
    location: string;
    responseTime?: string;
    phone?: string;
    pageSlug: string;
}) {
    const primaryHref = useResolvedHref(primaryCta.href ?? "/#download");
    const secondaryHref = useResolvedHref(secondaryCta?.href);

    return (
        <section
            className="relative overflow-hidden pt-32 pb-20 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28"
            style={{
                background:
                    "linear-gradient(135deg, rgb(var(--bg-primary)) 0%, rgb(var(--bg-secondary)) 50%, rgb(var(--bg-primary)) 100%)",
            }}
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className="hidden sm:block absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-theme-accent/5 rounded-full blur-[140px]" />
                <div className="hidden sm:block absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-theme-accent-end/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative mx-auto w-[92%] max-w-[80rem] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
                <div>
                    {eyebrow ? (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 rounded-full border border-theme-accent/25 bg-theme-accent/10 px-3 py-1.5 mb-6"
                        >
                            <MapPin className="w-3.5 h-3.5 text-theme-accent" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-theme-accent">
                                {eyebrow}
                            </span>
                        </motion.div>
                    ) : null}

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={VIEWPORT}
                        transition={{ duration: 0.6, delay: 0.05 }}
                        className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight leading-[1.08] text-theme-text"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {heading}
                    </motion.h1>

                    {subheading ? (
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="mt-6 text-lg sm:text-xl text-theme-text/75 leading-relaxed max-w-2xl"
                        >
                            {subheading}
                        </motion.p>
                    ) : null}

                    {bullets && bullets.length > 0 ? (
                        <motion.ul
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl"
                        >
                            {bullets.map((b) => (
                                <li
                                    key={b}
                                    className="flex items-start gap-2.5 text-[15px] text-theme-text/85"
                                >
                                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-theme-accent" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </motion.ul>
                    ) : null}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={VIEWPORT}
                        transition={{ duration: 0.5, delay: 0.35 }}
                        className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
                    >
                        <Link
                            href={primaryHref}
                            onClick={() =>
                                trackEvent(AnalyticsEvents.LandingCtaClick, {
                                    page_slug: pageSlug,
                                    cta: "hero-primary",
                                })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-theme-accent to-theme-accent-end px-7 py-4 text-[15px] font-bold text-white shadow-[0_20px_40px_-12px_rgb(var(--accent-primary)/0.55)] hover:scale-[1.02] active:scale-[0.99] transition-transform"
                        >
                            {primaryCta.label ?? "Book a Service"}
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        {secondaryHref && secondaryCta?.label ? (
                            <Link
                                href={secondaryHref}
                                onClick={() =>
                                    trackEvent(AnalyticsEvents.LandingCtaClick, {
                                        page_slug: pageSlug,
                                        cta: "hero-secondary",
                                    })
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-text/15 bg-theme-glass/5 px-7 py-4 text-[15px] font-semibold text-theme-text hover:bg-theme-glass/10 transition-colors"
                            >
                                {secondaryCta.label}
                            </Link>
                        ) : null}

                        {phone ? (
                            <a
                                href={`tel:${phone.replace(/\s+/g, "")}`}
                                onClick={() =>
                                    trackEvent(AnalyticsEvents.LandingCtaClick, {
                                        page_slug: pageSlug,
                                        cta: "hero-phone",
                                    })
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-text/15 bg-theme-glass/5 px-5 py-4 text-[14px] font-semibold text-theme-text hover:bg-theme-glass/10 transition-colors"
                            >
                                <Phone className="w-4 h-4 text-theme-accent" />
                                {phone}
                            </a>
                        ) : null}

                        {/* WhatsApp CTA — every landing page gets a direct
                            channel to WhatsApp Business in the hero row. The
                            home Hero (Hero.tsx) places this as a big store-style
                            button next to App Store; landing pages use the same
                            compact-pill shape as the other hero CTAs so the
                            three buttons (Book / Secondary / Phone / WhatsApp)
                            balance visually. Icon kept WhatsApp brand green
                            (#25D366) for instant recognition. Tracked via
                            BOTH `WhatsAppFloatClick` (so it rolls up alongside
                            the home Hero WhatsApp clicks in GA) and
                            `LandingCtaClick` (so per-page funnels work). */}
                        <a
                            href={whatsappHref()}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Chat with Pockit Engineers on WhatsApp"
                            onClick={() => {
                                trackEvent(AnalyticsEvents.WhatsAppFloatClick, {
                                    location: "landing-hero",
                                    page_slug: pageSlug,
                                });
                                trackEvent(AnalyticsEvents.LandingCtaClick, {
                                    page_slug: pageSlug,
                                    cta: "hero-whatsapp",
                                });
                                trackWhatsAppClick("landing-hero");
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-text/15 bg-theme-glass/5 px-5 py-4 text-[14px] font-semibold text-theme-text hover:bg-theme-glass/10 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#25D366" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                            </svg>
                            WhatsApp
                        </a>
                    </motion.div>

                    {responseTime ? (
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-theme-text/65"
                        >
                            <Clock className="w-4 h-4 text-theme-accent" />
                            <span>
                                Typical arrival in {responseTime} across {location}
                            </span>
                        </motion.p>
                    ) : null}
                </div>

                <HeroBadges location={location} responseTime={responseTime} />
            </div>
        </section>
    );
}

function HeroBadges({
    location,
    responseTime,
}: {
    location: string;
    responseTime?: string;
}) {
    const badges = [
        {
            icon: ShieldCheck,
            title: "Background-verified experts",
            sub: "Police-verified, certified technicians only.",
        },
        {
            icon: Clock,
            title: responseTime
                ? `Doorstep in ${responseTime}`
                : "Same-day arrival",
            sub: `Across ${location} — no chasing back-and-forth.`,
        },
        {
            icon: BadgeCheck,
            title: "Up-front, transparent pricing",
            sub: "See diagnosis fee + parts cost before any work begins.",
        },
        {
            icon: Sparkles,
            title: "30-day service warranty",
            sub: "If the same issue returns, we come back free.",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
            {badges.map((b) => (
                <div
                    key={b.title}
                    className="rounded-2xl border border-theme-text/10 bg-theme-glass/5 backdrop-blur-md p-5 hover:bg-theme-glass/10 transition-colors"
                >
                    <div className="w-11 h-11 rounded-xl bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center mb-3">
                        <b.icon className="w-5 h-5 text-theme-accent" />
                    </div>
                    <p className="text-[15px] font-bold text-theme-text leading-tight">
                        {b.title}
                    </p>
                    <p className="mt-1.5 text-[13px] text-theme-text/65 leading-relaxed">
                        {b.sub}
                    </p>
                </div>
            ))}
        </motion.div>
    );
}

function TrustStrip({ bullets }: { bullets?: readonly string[] }) {
    if (!bullets || bullets.length === 0) return null;
    return (
        <section className="border-y border-theme-text/10 bg-theme-bg2/40 py-6">
            <div className="mx-auto w-[92%] max-w-[80rem] flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {bullets.map((b) => (
                    <div
                        key={b}
                        className="inline-flex items-center gap-2 text-[13px] font-semibold text-theme-text/75"
                    >
                        <CheckCircle2 className="w-4 h-4 text-theme-accent" />
                        <span>{b}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function IntroSection({
    blocks,
}: {
    blocks: LandingPageDetail["intro"];
}) {
    if (!blocks) return null;
    return (
        <section className="py-16 sm:py-20">
            <div className="mx-auto w-[92%] max-w-[760px]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT}
                    transition={{ duration: 0.5 }}
                    className="prose prose-lg max-w-none text-theme-text/85 prose-headings:text-theme-text prose-headings:font-bold prose-headings:tracking-tight prose-strong:text-theme-text"
                >
                    {/*
                        PortableText with default serializers is fine for v1 —
                        intro copy is mostly paragraphs + the occasional H2/H3.
                        Custom block types (callouts, etc.) can be added when
                        editors actually need them.
                    */}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <PortableText value={blocks as any} />
                </motion.div>
            </div>
        </section>
    );
}

function ServicesSection({
    items,
}: {
    items: NonNullable<LandingPageDetail["services"]>;
}) {
    return (
        <section className="py-16 sm:py-20 bg-theme-bg2/30">
            <div className="mx-auto w-[92%] max-w-[80rem]">
                <SectionHeading
                    eyebrow="What we fix"
                    title="Common issues we handle on the spot"
                    sub="Up-front diagnosis. Original parts when replacement is needed. No surprise bills."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                    {items.map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.45, delay: i * 0.05 }}
                            className="group rounded-2xl border border-theme-text/10 bg-theme-glass/5 p-6 hover:bg-theme-glass/10 hover:border-theme-accent/30 transition-all"
                        >
                            <div className="w-10 h-10 rounded-xl bg-theme-accent/15 border border-theme-accent/25 flex items-center justify-center mb-4">
                                <Wrench className="w-5 h-5 text-theme-accent" />
                            </div>
                            <h3 className="text-[17px] font-bold text-theme-text leading-tight">
                                {item.title}
                            </h3>
                            {item.description ? (
                                <p className="mt-2 text-[14px] text-theme-text/70 leading-relaxed">
                                    {item.description}
                                </p>
                            ) : null}
                            {typeof item.priceFrom === "number" ? (
                                <p className="mt-4 text-[13px] font-semibold text-theme-accent">
                                    From ₹{item.priceFrom.toLocaleString("en-IN")}
                                </p>
                            ) : null}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ProcessSection({
    steps,
}: {
    steps: NonNullable<LandingPageDetail["process"]>;
}) {
    return (
        <section className="py-16 sm:py-20">
            <div className="mx-auto w-[92%] max-w-[80rem]">
                <SectionHeading
                    eyebrow="How it works"
                    title="Booked in minutes. Fixed at your door."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    {steps.map((s, i) => (
                        <motion.div
                            key={s.title ?? i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={VIEWPORT}
                            transition={{ duration: 0.45, delay: i * 0.08 }}
                            className="relative rounded-2xl border border-theme-text/10 bg-theme-glass/5 p-7"
                        >
                            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-theme-accent">
                                Step {String(i + 1).padStart(2, "0")}
                            </span>
                            {s.title ? (
                                <h3 className="mt-3 text-[20px] font-bold text-theme-text leading-tight">
                                    {s.title}
                                </h3>
                            ) : null}
                            {s.description ? (
                                <p className="mt-2 text-[14px] text-theme-text/70 leading-relaxed">
                                    {s.description}
                                </p>
                            ) : null}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function AreasServedSection({
    location,
    areas,
}: {
    location: string;
    areas: NonNullable<LandingPageDetail["areasServed"]>;
}) {
    return (
        <section className="py-16 sm:py-20 bg-theme-bg2/30">
            <div className="mx-auto w-[92%] max-w-[80rem]">
                <SectionHeading
                    eyebrow="Coverage"
                    title={`Serving every neighborhood in ${location}`}
                    sub="Tap any area for a dedicated service page, or book directly above."
                />
                <div className="flex flex-wrap gap-2.5 mt-10 justify-center">
                    {areas.map((a) =>
                        a.href ? (
                            // Resolve through `resolveNavHref` so chips work on
                            // either build target. On the Vercel (blog) build
                            // the chip becomes an absolute main-site URL so a
                            // reader hops from `pockitblog.*` back to
                            // `pockitengineers.com/<slug>`. On the cPanel
                            // build the helper passes the path through
                            // unchanged. Avoids the bug where chips followed
                            // current origin and 404'd on the blog subdomain.
                            <Link
                                key={a.name}
                                href={resolveNavHref(a.href, false)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-theme-text/15 bg-theme-glass/5 px-4 py-2 text-[13px] font-semibold text-theme-text hover:border-theme-accent/40 hover:bg-theme-accent/10 hover:text-theme-accent transition-colors"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                {a.name}
                            </Link>
                        ) : (
                            <span
                                key={a.name}
                                className="inline-flex items-center gap-1.5 rounded-full border border-theme-text/10 bg-theme-glass/5 px-4 py-2 text-[13px] font-semibold text-theme-text/80"
                            >
                                <MapPin className="w-3.5 h-3.5 text-theme-accent" />
                                {a.name}
                            </span>
                        ),
                    )}
                </div>
            </div>
        </section>
    );
}

function FaqSection({
    items,
    pageSlug,
}: {
    items: readonly LandingPageFaqItem[];
    pageSlug: string;
}) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    return (
        <section className="py-16 sm:py-20">
            <div className="mx-auto w-[92%] max-w-[820px]">
                <SectionHeading
                    eyebrow="FAQ"
                    title="Common questions, straight answers"
                />
                <div className="mt-10 space-y-3">
                    {items.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div
                                key={item.question}
                                className="rounded-2xl border border-theme-text/10 bg-theme-glass/5 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenIndex(isOpen ? null : i);
                                        if (!isOpen) {
                                            trackEvent(AnalyticsEvents.LandingFaqExpanded, {
                                                page_slug: pageSlug,
                                                question: item.question,
                                            });
                                        }
                                    }}
                                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                                >
                                    <span className="text-[15px] sm:text-[16px] font-bold text-theme-text leading-snug">
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 shrink-0 transition-transform duration-300 text-theme-accent ${
                                            isOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen ? (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-5 text-[14px] sm:text-[15px] text-theme-text/75 leading-relaxed whitespace-pre-line">
                                                {item.answer}
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// SeoContentSection — long-form supporting copy, collapsed behind "Read More".
//
// Authored in Sanity (`landingPage.seoContent`) so every page in the Mumbai
// programme can carry keyword-dense supporting copy without a code change.
//
// The collapse shell and typography scale live in ReadMoreContent: the copy
// is hidden outright until the reader taps the accent pill that sits above it.
// See CHANGELOG #087, #089, #090, #092.
// ---------------------------------------------------------------------------

function SeoContentSection({
    blocks,
    pageSlug,
}: {
    blocks: NonNullable<LandingPageDetail["seoContent"]>;
    pageSlug: string;
}) {
    // `-mt-8` pulls the block up into the FAQ section's own bottom padding so
    // the pill reads as a continuation of the accordion, not a new section.
    return (
        <section className="-mt-8 pb-16 sm:pb-20">
            <div className="mx-auto w-[92%] max-w-[820px]">
                <ReadMoreContent
                    onExpand={() =>
                        trackEvent(AnalyticsEvents.ContentExpanded, {
                            page_slug: pageSlug,
                        })
                    }
                >
                    <PortableText
                        value={blocks as any}
                        components={seoContentComponents}
                    />
                </ReadMoreContent>
            </div>
        </section>
    );
}

/**
 * Portable Text serializers for `seoContent`. They apply the same SEO_PROSE
 * class strings the home-page block uses, so both surfaces render identically.
 */
const seoContentComponents: PortableTextComponents = {
    block: {
        h2: ({ children }) => (
            <h2 className={SEO_PROSE.h2} style={SEO_HEADING_FONT}>
                {children}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 className={SEO_PROSE.h3} style={SEO_HEADING_FONT}>
                {children}
            </h3>
        ),
        normal: ({ children }) => <p className={SEO_PROSE.p}>{children}</p>,
    },
    list: {
        bullet: ({ children }) => <ul className={SEO_PROSE.ul}>{children}</ul>,
    },
    listItem: {
        bullet: ({ children }) => (
            <li className={SEO_PROSE.li}>
                <CheckCircle2 className="absolute left-0 top-[0.42em] w-4 h-4 shrink-0 text-theme-accent" />
                {children}
            </li>
        ),
    },
    marks: {
        strong: ({ children }) => (
            <strong className={SEO_PROSE.strong}>{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
    },
};

function CtaBanner({
    location,
    service,
    primaryCta,
    pageSlug,
}: {
    location: string;
    service: string;
    primaryCta: { label?: string; href?: string };
    pageSlug: string;
}) {
    const href = useResolvedHref(primaryCta.href ?? "/#download");
    return (
        <section className="py-20">
            <div className="mx-auto w-[92%] max-w-[80rem]">
                <div
                    className="rounded-3xl border border-theme-accent/25 p-10 sm:p-14 lg:p-16 text-center relative overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(135deg, rgb(var(--accent-primary) / 0.15), rgb(var(--accent-primary-end) / 0.05))",
                    }}
                >
                    <h2
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-theme-text"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        Ready to fix it today?
                    </h2>
                    <p className="mt-4 max-w-2xl mx-auto text-[16px] sm:text-[18px] text-theme-text/75">
                        Book {service.toLowerCase()} in {location} on the Pockit
                        app — a verified expert is at your door in minutes, not
                        days.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                        <Link
                            href={href}
                            onClick={() =>
                                trackEvent(AnalyticsEvents.LandingCtaClick, {
                                    page_slug: pageSlug,
                                    cta: "footer-banner",
                                })
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-theme-accent to-theme-accent-end px-8 py-4 text-[15px] font-bold text-white shadow-[0_20px_40px_-12px_rgb(var(--accent-primary)/0.55)] hover:scale-[1.02] active:scale-[0.99] transition-transform"
                        >
                            {primaryCta.label ?? "Book a Service"}
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        {/* WhatsApp companion CTA in the bottom banner so the
                            page has a WhatsApp affordance both above the fold
                            (hero) and at the end-of-page conversion moment. */}
                        <a
                            href={whatsappHref()}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Chat with Pockit Engineers on WhatsApp"
                            onClick={() => {
                                trackEvent(AnalyticsEvents.WhatsAppFloatClick, {
                                    location: "landing-footer-banner",
                                    page_slug: pageSlug,
                                });
                                trackEvent(AnalyticsEvents.LandingCtaClick, {
                                    page_slug: pageSlug,
                                    cta: "footer-banner-whatsapp",
                                });
                                trackWhatsAppClick("landing-footer-banner");
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-text/15 bg-theme-glass/5 px-7 py-4 text-[15px] font-semibold text-theme-text hover:bg-theme-glass/10 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#25D366" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                            </svg>
                            Chat on WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

function RelatedPagesSection({
    pages,
}: {
    pages: NonNullable<LandingPageDetail["relatedPages"]>;
}) {
    return (
        <section className="py-16 sm:py-20 bg-theme-bg2/30">
            <div className="mx-auto w-[92%] max-w-[80rem]">
                <SectionHeading eyebrow="Also helpful" title="Related services" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                    {pages.map((p) => (
                        <Link
                            key={p._id}
                            href={`/${p.slug.current}`}
                            className="group block rounded-2xl border border-theme-text/10 bg-theme-glass/5 p-5 hover:border-theme-accent/35 hover:bg-theme-glass/10 transition-colors"
                        >
                            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-theme-accent">
                                {p.location}
                            </p>
                            <h3 className="mt-2 text-[16px] font-bold text-theme-text leading-tight group-hover:text-theme-accent transition-colors">
                                {p.title}
                            </h3>
                            {p.heroSubheading ? (
                                <p className="mt-2 text-[13px] text-theme-text/65 leading-relaxed line-clamp-2">
                                    {p.heroSubheading}
                                </p>
                            ) : null}
                            <p className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-theme-accent">
                                Read more <ArrowRight className="w-3.5 h-3.5" />
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeading({
    eyebrow,
    title,
    sub,
}: {
    eyebrow?: string;
    title: string;
    sub?: string;
}) {
    return (
        <div className="text-center max-w-3xl mx-auto">
            {eyebrow ? (
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-theme-accent">
                    {eyebrow}
                </p>
            ) : null}
            <h2
                className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-theme-text"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                {title}
            </h2>
            {sub ? (
                <p className="mt-4 text-[16px] sm:text-[17px] text-theme-text/65 leading-relaxed">
                    {sub}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Resolve a Sanity-authored href against the cross-origin nav rules so a CTA
 * pointing at `#download` or `/about` works correctly on whichever build
 * target rendered this page. Overloaded so the return type matches the
 * argument type — required hrefs stay `string`, optional ones stay
 * `string | undefined` and the caller decides whether to render at all.
 */
function useResolvedHref(href: string): string;
function useResolvedHref(href: string | undefined): string | undefined;
function useResolvedHref(href: string | undefined): string | undefined {
    return useMemo(() => {
        if (!href) return undefined;
        return resolveNavHref(href, /*isHome=*/ false);
    }, [href]);
}

function defaultEyebrow(page: LandingPageDetail): string {
    if (page.pageType === "service-locality") {
        return `${page.service} · ${page.location}`;
    }
    if (page.pageType === "problem-fix") {
        return `${page.location} · Same-day fix`;
    }
    return `${page.location} · On-demand IT`;
}

/** Fire the page-view analytics event exactly once on mount. */
function useMountAnalytics(page: LandingPageDetail): void {
    useEffect(() => {
        trackEvent(AnalyticsEvents.LandingPageView, {
            page_slug: page.slug.current,
            page_type: page.pageType,
            location: page.location,
            service: page.service,
        });
        // page is stable for the lifetime of the route — fire once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
