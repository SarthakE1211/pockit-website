// ---------------------------------------------------------------------------
// PostCard — compact post card used on the blog index grid, category /
// author listings, and the "related posts" section inside a post page.
//
// Visual: rounded card, cover image on top, category chip, title, excerpt,
// author row with reading time. Matches the main site's card treatment
// (`bg-theme-card`, `border-theme-border`, orange accent hover).
//
// Analytics:
//   - `blog_card_clicked` on anchor click (since #008).
//   - `card_impression` fires once when the card first enters the viewport.
//     Piggybacks on Framer Motion's `onViewportEnter` (the same mechanism
//     driving the entrance animation) so we don't wire a second
//     IntersectionObserver alongside `whileInView`. A `useRef<boolean>`
//     guard keeps the event to exactly one fire per mount — important
//     because the Framer viewport callback can be re-invoked on remount
//     (filter changes, route transitions). Added in #012.
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
import { trackCardImpression, type CardSurface } from "@/services/blogAnalytics";

/**
 * PostCard is never rendered as the "featured" surface (that's FeaturedPost's
 * job), so narrow the shared CardSurface union here.
 */
type PostCardSurface = Exclude<CardSurface, "featured">;

interface PostCardProps {
    readonly post: PostCardData;
    /** Surface the card is rendered on — informs the analytics payload. */
    readonly surface?: PostCardSurface;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function PostCard({
    post,
    surface = "index",
}: PostCardProps) {
    const coverSrc = post.coverImage?.asset
        ? urlFor(post.coverImage).width(720).height(420).fit("crop").url()
        : null;
    const primaryCategory = post.categories[0];

    // One-shot impression guard. Flips true on the first viewport entry so
    // later scrolls back over the card don't re-fire.
    const hasFiredImpression = useRef(false);

    const handleViewportEnter = (): void => {
        if (hasFiredImpression.current) return;
        hasFiredImpression.current = true;
        trackCardImpression(
            post.slug.current,
            surface,
            primaryCategory?.title,
        );
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            onViewportEnter={handleViewportEnter}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-theme-border/60 bg-theme-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-theme-accent/50 hover:shadow-lg"
        >
            <Link
                href={`/blog/${post.slug.current}`}
                onClick={() =>
                    trackEvent(AnalyticsEvents.BlogCardClicked, {
                        post_slug: post.slug.current,
                        post_category: primaryCategory?.slug.current,
                        surface,
                    })
                }
                className="flex h-full flex-col"
                aria-label={post.title}
            >
                {coverSrc ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-theme-bg2">
                        <Image
                            src={coverSrc}
                            alt={post.coverImage?.alt ?? post.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-theme-accent/15 via-theme-bg2 to-theme-accent-end/10" />
                )}

                <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                    {primaryCategory ? (
                        <span className="inline-flex w-fit rounded-full border border-theme-accent/25 bg-theme-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-theme-accent">
                            {primaryCategory.title}
                        </span>
                    ) : null}

                    <h3
                        className="text-xl font-bold leading-snug tracking-tight text-theme-text transition-colors group-hover:text-theme-accent sm:text-2xl"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {post.title}
                    </h3>

                    {post.excerpt ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-theme-text/70">
                            {post.excerpt}
                        </p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-xs text-theme-text/60">
                        <span className="font-medium text-theme-text/80">
                            {post.author.name}
                        </span>
                        <span className="flex items-center gap-2">
                            <span>{formatDate(post.publishedAt)}</span>
                            {post.readingTimeMinutes ? (
                                <>
                                    <span aria-hidden>·</span>
                                    <span>
                                        {post.readingTimeMinutes} min read
                                    </span>
                                </>
                            ) : null}
                        </span>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}
