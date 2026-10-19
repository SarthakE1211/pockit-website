// ---------------------------------------------------------------------------
// BlogIndexInteractive — the stateful shell around the /blog post grid.
// Holds the two filter inputs (category chip + free-text search) and
// derives a filtered + sorted list of PostCardData entries in memory.
//
// Why client-side filtering? With v1 we expect a modest number of posts
// (≤ ~200). Shipping the whole index as PostCardData (light projection —
// no body) costs only a few KB gzipped, and client-side filtering means
// instant UI response without server round-trips. If the corpus outgrows
// this, we'll swap for server-rendered query params (/blog?category=x).
//
// Search uses a small custom ranker over title + excerpt + category +
// author — no fuzzy library, no index. Fast, good enough, and we can
// observe how editors actually search before over-engineering.
//
// Introduced in CHANGELOG #008.
// ---------------------------------------------------------------------------

"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import type {
    Category,
    PostCardData,
    SearchIndexEntry,
} from "@/lib/sanity/types";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

import BlogEmptyState from "./BlogEmptyState";
import PostCard from "./PostCard";

interface BlogIndexInteractiveProps {
    readonly posts: readonly PostCardData[];
    readonly categories: readonly Category[];
    readonly searchIndex: readonly SearchIndexEntry[];
}

const ALL_CHIP_ID = "__all__";

/**
 * Very small scoring function. Title matches weigh more than excerpt,
 * category, or author matches. Returns null when the post doesn't match
 * at all, so we can filter-and-sort in one pass.
 */
function scorePost(
    query: string,
    post: PostCardData,
    index: SearchIndexEntry | undefined,
): number | null {
    if (query.length === 0) return 0;
    const q = query.toLowerCase();
    let score = 0;

    if (post.title.toLowerCase().includes(q)) score += 10;
    if (post.excerpt && post.excerpt.toLowerCase().includes(q)) score += 4;
    if (post.author.name.toLowerCase().includes(q)) score += 2;
    for (const cat of post.categories) {
        if (cat.title.toLowerCase().includes(q)) score += 3;
    }
    if (index) {
        for (const tag of index.tagTitles) {
            if (tag.toLowerCase().includes(q)) score += 2;
        }
    }

    return score > 0 ? score : null;
}

export default function BlogIndexInteractive({
    posts,
    categories,
    searchIndex,
}: BlogIndexInteractiveProps) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
        ALL_CHIP_ID,
    );
    const [rawQuery, setRawQuery] = useState<string>("");

    // Searching is a high-signal user action; log it at most once per
    // committed query rather than on every keystroke.
    function onSearchCommit(value: string): void {
        if (value.length === 0) return;
        trackEvent(AnalyticsEvents.BlogSearch, { query: value });
    }

    function onCategoryPick(id: string, slug: string | null): void {
        setSelectedCategoryId(id);
        if (slug !== null) {
            trackEvent(AnalyticsEvents.BlogCategoryFilter, { category: slug });
        }
    }

    // Build a quick lookup of search-index rows by _id so we can enrich
    // the scorer with tag matches without another pass.
    const indexById = useMemo(() => {
        const map = new Map<string, SearchIndexEntry>();
        for (const entry of searchIndex) map.set(entry._id, entry);
        return map;
    }, [searchIndex]);

    const visiblePosts = useMemo(() => {
        const q = rawQuery.trim();
        const filtered = posts.filter((post) => {
            if (selectedCategoryId !== ALL_CHIP_ID) {
                const inCategory = post.categories.some(
                    (cat) => cat._id === selectedCategoryId,
                );
                if (!inCategory) return false;
            }
            return true;
        });

        if (q.length === 0) return filtered;

        const ranked: { post: PostCardData; score: number }[] = [];
        for (const post of filtered) {
            const score = scorePost(q, post, indexById.get(post._id));
            if (score !== null) ranked.push({ post, score });
        }
        ranked.sort((a, b) => b.score - a.score);
        return ranked.map((r) => r.post);
    }, [posts, selectedCategoryId, rawQuery, indexById]);

    return (
        <div className="mx-auto w-[92%] max-w-6xl py-12 sm:py-16">
            {/* Filter row — chips on the left, search on the right on
                wide screens; stacked on mobile. */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="-mx-2 flex min-w-0 flex-1 gap-2 overflow-x-auto px-2 pb-1 lg:flex-wrap lg:overflow-visible">
                    <ChipButton
                        label="All"
                        active={selectedCategoryId === ALL_CHIP_ID}
                        onClick={() => onCategoryPick(ALL_CHIP_ID, null)}
                    />
                    {categories.map((cat) => (
                        <ChipButton
                            key={cat._id}
                            label={cat.title}
                            active={selectedCategoryId === cat._id}
                            onClick={() =>
                                onCategoryPick(cat._id, cat.slug.current)
                            }
                        />
                    ))}
                </div>

                <label className="relative flex w-full items-center lg:w-80">
                    <svg
                        viewBox="0 0 24 24"
                        className="pointer-events-none absolute left-3 h-4 w-4 text-theme-text/50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                    >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="search"
                        value={rawQuery}
                        onChange={(e) => setRawQuery(e.target.value)}
                        onBlur={(e) => onSearchCommit(e.target.value.trim())}
                        placeholder="Search posts"
                        aria-label="Search blog posts"
                        className="w-full rounded-full border border-theme-border bg-theme-card/80 py-2.5 pl-10 pr-4 text-sm text-theme-text placeholder:text-theme-text/50 shadow-sm outline-none transition-all focus:border-theme-accent/60 focus:ring-2 focus:ring-theme-accent/20"
                    />
                </label>
            </div>

            {/* Grid */}
            <div className="mt-10">
                {visiblePosts.length === 0 ? (
                    <BlogEmptyState
                        title={
                            rawQuery.trim().length > 0
                                ? `No posts match "${rawQuery.trim()}"`
                                : "No posts yet"
                        }
                        body={
                            rawQuery.trim().length > 0
                                ? "Try a different keyword or clear the filter."
                                : "Fresh writing is on the way. Check back soon."
                        }
                    />
                ) : (
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={`${selectedCategoryId}-${rawQuery.trim()}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {visiblePosts.map((post) => (
                                <PostCard
                                    key={post._id}
                                    post={post}
                                    surface="index"
                                />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

interface ChipButtonProps {
    readonly label: string;
    readonly active: boolean;
    readonly onClick: () => void;
}

function ChipButton({ label, active, onClick }: ChipButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={
                active
                    ? "inline-flex shrink-0 items-center rounded-full border border-theme-accent bg-theme-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm"
                    : "inline-flex shrink-0 items-center rounded-full border border-theme-border bg-theme-card/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-theme-text/80 transition-all hover:border-theme-accent/50 hover:text-theme-accent"
            }
        >
            {label}
        </button>
    );
}
