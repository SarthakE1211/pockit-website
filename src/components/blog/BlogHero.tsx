// ---------------------------------------------------------------------------
// BlogHero — reusable hero block used on /blog, /blog/category/[slug], and
// /blog/author/[slug]. Inherits the same eyebrow → headline → subcopy stack
// the marketing site uses on /about so visual continuity holds across the
// subdomain boundary (see Phase 5 / #013 plan in BLOG_TASKS.md).
//
// Introduced in CHANGELOG #008.
// ---------------------------------------------------------------------------

"use client";

import { motion } from "framer-motion";

interface BlogHeroProps {
    readonly eyebrow: string;
    readonly title: string;
    readonly subtitle?: string;
}

// Hero is always above the fold, so `whileInView` + an intersection margin
// is unreliable — the element is already inside the viewport at mount and
// the observer's threshold can fail to fire. Use plain `initial` +
// `animate` with a staggered delay chain so the eyebrow, title, and
// subtitle fade in on first paint every time.

export default function BlogHero({
    eyebrow,
    title,
    subtitle,
}: BlogHeroProps) {
    return (
        <section className="pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16 lg:pb-20 bg-theme-bg border-b border-theme-border/40 relative overflow-hidden">
            {/* Same soft accent-glow treatment the landing hero uses, so the
                blog feels like the same product. */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at 50% 0%, rgb(var(--accent-primary) / 0.06) 0%, transparent 50%)",
                }}
            />

            <div className="relative mx-auto w-[92%] max-w-5xl text-center">
                <motion.p
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="inline-flex rounded-full border border-theme-accent/25 bg-theme-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-theme-accent"
                >
                    {eyebrow}
                </motion.p>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 150,
                        damping: 20,
                        delay: 0.1,
                    }}
                    className="mt-6 text-4xl font-black leading-tight tracking-tight text-theme-text sm:text-5xl lg:text-6xl"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                    {title}
                </motion.h1>

                {subtitle ? (
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
                        className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-theme-text/75 sm:text-lg"
                    >
                        {subtitle}
                    </motion.p>
                ) : null}
            </div>
        </section>
    );
}
