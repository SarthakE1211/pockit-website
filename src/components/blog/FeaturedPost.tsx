// ---------------------------------------------------------------------------
// FeaturedPost — the hero card at the top of /blog. Uses the same post data
// as PostCard but lays it out side-by-side: large cover on one side,
// heading + excerpt + author row on the other. Only rendered when a post
// is marked `featured: true` in Studio (most recent wins).
//
// Analytics:
//   - `blog_card_clicked` with `surface: "featured"` on anchor click (#008).
//   - `card_impression` fires once when the hero first enters the viewport,
//     piggybacking on Framer Motion's `onViewportEnter` (same observer that
//     drives `whileInView`). Ref guard keeps it to one fire per mount.
//     Added in #012.
//
// Introduced in CHANGELOG #008. Impression tracking added in #012.
// ---------------------------------------------------------------------------

"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { urlFor } from "@/lib/sanity/image";
import type { PostCardData } from "@/lib/sanity/types";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { trackCardImpression } from "@/services/blogAnalytics";

interface FeaturedPostProps {
    readonly post: PostCardData;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function FeaturedPost({ post }: FeaturedPostProps) {
    // Image transform notes
    //   • No fixed height + `fit("max")` instead of `fit("crop")` so Sanity
    //     does NOT pre-crop the editor's upload. A square / branded /
    //     portrait cover image used to lose its edges here because the old
    //     1400×900 crop snipped them before they ever reached the browser.
    //   • `auto("format")` lets Sanity serve WebP / AVIF to capable clients.
    //   • Rendering uses `object-contain` (see below) so the full image
    //     always shows; any letterbox area falls back to `bg-theme-bg2` and
    //     blends with the card.
    const coverSrc = post.coverImage?.asset
        ? urlFor(post.coverImage).width(1400).fit("max").auto("format").url()
        : null;
    const primaryCategory = post.categories[0];

    // One-shot impression guard — see PostCard for rationale.
    const hasFiredImpression = useRef(false);

    const handleViewportEnter = (): void => {
        if (hasFiredImpression.current) return;
        hasFiredImpression.current = true;
        trackCardImpression(
            post.slug.current,
            "featured",
            primaryCategory?.title,
        );
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            onViewportEnter={handleViewportEnter}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto w-[98%] max-w-[1400px]"
            aria-label="Featured post"
        >
            <Link
                href={`/blog/${post.slug.current}`}
                onClick={() =>
                    trackEvent(AnalyticsEvents.BlogCardClicked, {
                        post_slug: post.slug.current,
                        post_category: primaryCategory?.slug.current,
                        surface: "featured",
                    })
                }
                className="group relative grid overflow-hidden rounded-3xl border border-theme-border/60 bg-theme-card/80 shadow-sm transition-all duration-300 hover:border-theme-accent/50 hover:shadow-xl lg:min-h-[460px] lg:grid-cols-[1.15fr_1fr]"
            >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-theme-bg2 lg:aspect-auto lg:h-full">
                    {coverSrc ? (
                        <Image
                            src={coverSrc}
                            alt={post.coverImage?.alt ?? post.title}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 55vw"
                            className="object-contain transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/25 via-theme-bg2 to-theme-accent-end/15" />
                    )}
                </div>

                <div className="flex flex-col justify-center gap-4 p-6 sm:p-10 lg:p-12">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex w-fit rounded-full border border-theme-accent/30 bg-theme-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-theme-accent">
                            Featured
                        </span>
                        {primaryCategory ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-text/60">
                                {primaryCategory.title}
                            </span>
                        ) : null}
                    </div>

                    <h2
                        className="text-3xl font-black leading-tight tracking-tight text-theme-text transition-colors group-hover:text-theme-accent sm:text-4xl lg:text-5xl"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {post.title}
                    </h2>

                    {post.excerpt ? (
                        <p className="text-base leading-relaxed text-theme-text/75 sm:text-lg">
                            {post.excerpt}
                        </p>
                    ) : null}

                    <div className="mt-2 flex items-center gap-3 text-sm text-theme-text/70">
                        <span className="font-semibold text-theme-text">
                            {post.author.name}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatDate(post.publishedAt)}</span>
                        {post.readingTimeMinutes ? (
                            <>
                                <span aria-hidden>·</span>
                                <span>{post.readingTimeMinutes} min read</span>
                            </>
                        ) : null}
                    </div>

                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-theme-accent transition-transform group-hover:translate-x-1">
                        Read the full story →
                    </span>
                </div>
            </Link>
        </motion.section>
    );
}
