// ---------------------------------------------------------------------------
// Blog analytics service.
//
// Thin domain wrapper over `src/lib/analytics.ts`. This file owns the
// "behavior" side of blog analytics — the trackers that listen for scroll
// and time milestones — while `lib/analytics.ts` stays a dumb adapter
// around `window.gtag`.
//
// Every export is safe to call during SSR: the underlying `trackEvent`
// no-ops when `window.gtag` is missing, and the factory helpers below
// defensively check for `window` / DOM APIs before wiring listeners.
//
// GA4 custom dimensions that this module populates (must be registered
// once in GA4 admin — see `docs/BLOG_ANALYTICS.md`):
//   - `post_slug`
//   - `post_category`
//   - `post_author`
//
// Introduced in CHANGELOG #012.
// ---------------------------------------------------------------------------

import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * Shape shared by every blog event: the three GA4 custom dimensions that
 * answer "which post / category / author did this action happen on?".
 * `post_category` is flattened to a single title because GA4 custom
 * dimensions are scalar — if a post has multiple categories we pick the
 * first (the "primary" category).
 */
export interface BlogPostContext {
    readonly post_slug: string;
    readonly post_category?: string;
    readonly post_author?: string;
}

/**
 * Where a card was rendered when a user saw/clicked it. Matches the
 * `surface` prop on PostCard / FeaturedPost.
 */
export type CardSurface =
    | "index"
    | "featured"
    | "related"
    | "category"
    | "author";

// ---------------------------------------------------------------------------
// One-off events
// ---------------------------------------------------------------------------

/**
 * Fire `post_view` once, on mount of a post page. Callers are expected to
 * hand over the flattened primary category title (or omit the field if
 * the post has none).
 */
export function trackPostView(ctx: BlogPostContext): void {
    trackEvent(AnalyticsEvents.BlogPostView, { ...ctx });
}

/**
 * Fire `card_impression` the first time a given post card enters the
 * viewport. De-duplication is the caller's responsibility — typically via
 * a ref flag that flips to `true` after the first call (see PostCard and
 * FeaturedPost usages).
 */
export function trackCardImpression(
    postSlug: string,
    surface: CardSurface,
    postCategory?: string,
): void {
    trackEvent(AnalyticsEvents.BlogCardImpression, {
        post_slug: postSlug,
        surface,
        ...(postCategory ? { post_category: postCategory } : {}),
    });
}

/**
 * Fire `cta_click` when a user clicks an in-post CTA button. The `cta_id`
 * is a stable identifier for the CTA (e.g., the Sanity document id of the
 * CTA block, or a human-authored string like "book-service-inline").
 *
 * Not wired to any concrete button in #012 because our Portable Text
 * schema doesn't include an inline CTA block yet — this is the seam that
 * a future Portable Text `ctaButton` type will hook into.
 */
export function trackCtaClick(params: {
    readonly ctaId: string;
    readonly ctaLabel?: string;
    readonly ctaHref?: string;
    readonly postContext: BlogPostContext;
}): void {
    trackEvent(AnalyticsEvents.BlogCtaClick, {
        cta_id: params.ctaId,
        ...(params.ctaLabel ? { cta_label: params.ctaLabel } : {}),
        ...(params.ctaHref ? { cta_href: params.ctaHref } : {}),
        ...params.postContext,
    });
}

// ---------------------------------------------------------------------------
// Scroll-depth tracker
// ---------------------------------------------------------------------------

const SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 100] as const;
type ScrollDepthMilestone = (typeof SCROLL_DEPTH_THRESHOLDS)[number];

interface ScrollDepthOptions {
    /** DOM id of the article element (same id handed to ReadingProgress). */
    readonly articleId: string;
    readonly postContext: BlogPostContext;
}

/**
 * Wire scroll-depth tracking for the lifetime of the current post page.
 * Returns a cleanup function the caller should call on unmount.
 *
 * Uses RAF throttling and passive scroll listeners so it's cheap to run
 * alongside ReadingProgress's own scroll handler.
 *
 * We intentionally re-implement scroll math here rather than piggybacking
 * on ReadingProgress so analytics concerns stay isolated — otherwise a
 * refactor of ReadingProgress for presentation reasons could silently
 * break analytics.
 */
export function createScrollDepthTracker(
    options: ScrollDepthOptions,
): () => void {
    if (typeof window === "undefined") return () => undefined;

    const fired = new Set<ScrollDepthMilestone>();
    let rafId: number | null = null;

    const compute = (): void => {
        const article = document.getElementById(options.articleId);
        if (!article) return;

        const rect = article.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // How much of the article has scrolled past the top of the viewport,
        // clamped to the article height so values stay in [0, 1].
        const total = Math.max(rect.height - viewportHeight, 1);
        const scrolled = Math.min(
            Math.max(-rect.top, 0),
            total,
        );
        const percent = Math.round((scrolled / total) * 100);

        for (const threshold of SCROLL_DEPTH_THRESHOLDS) {
            if (percent >= threshold && !fired.has(threshold)) {
                fired.add(threshold);
                trackEvent(AnalyticsEvents.BlogScrollDepth, {
                    percent: threshold,
                    ...options.postContext,
                });
            }
        }
    };

    const onScroll = (): void => {
        if (rafId !== null) return;
        rafId = window.requestAnimationFrame(() => {
            rafId = null;
            compute();
        });
    };

    // After #016, <main> is h-screen + overflow-y-auto — it's the real
    // scroll container, not the window. Listen to <main>'s scroll event.
    // Falls back to window if <main> isn't found (shouldn't happen).
    // See CHANGELOG #016.1.
    const scrollContainer: EventTarget =
        document.querySelector("main") ?? window;

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Run once on setup so a user landing already-scrolled (back/forward
    // cache, anchor link) still gets credit for their starting depth.
    compute();

    return () => {
        scrollContainer.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
    };
}

// ---------------------------------------------------------------------------
// Engagement tracker
// ---------------------------------------------------------------------------

const ENGAGEMENT_MILESTONES_SECONDS = [30, 60, 180] as const;
type EngagementMilestone = (typeof ENGAGEMENT_MILESTONES_SECONDS)[number];

interface EngagementOptions {
    readonly postContext: BlogPostContext;
}

/**
 * Wire engagement-time tracking. Fires `engagement` at 30 s, 60 s, and
 * 180 s of visible time on page. Pauses the timer while the tab is
 * hidden so a backgrounded tab doesn't inflate engagement numbers.
 *
 * Returns a cleanup function.
 */
export function createEngagementTracker(
    options: EngagementOptions,
): () => void {
    if (typeof window === "undefined") return () => undefined;

    const fired = new Set<EngagementMilestone>();
    let accumulatedMs = 0;
    let lastTickAt: number | null =
        typeof document !== "undefined" && !document.hidden
            ? Date.now()
            : null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fireIfDue = (): void => {
        const seconds = Math.floor(accumulatedMs / 1000);
        for (const milestone of ENGAGEMENT_MILESTONES_SECONDS) {
            if (seconds >= milestone && !fired.has(milestone)) {
                fired.add(milestone);
                trackEvent(AnalyticsEvents.BlogEngagement, {
                    seconds: milestone,
                    ...options.postContext,
                });
            }
        }
    };

    const tick = (): void => {
        if (lastTickAt === null) return;
        const now = Date.now();
        accumulatedMs += now - lastTickAt;
        lastTickAt = now;
        fireIfDue();
    };

    const onVisibilityChange = (): void => {
        if (document.hidden) {
            // Flush whatever's accumulated up to now, then pause.
            tick();
            lastTickAt = null;
        } else {
            // Resume timing from this moment.
            lastTickAt = Date.now();
        }
    };

    intervalId = setInterval(tick, 1_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
        // One last flush so a quick unmount still credits any time earned.
        tick();
        if (intervalId !== null) clearInterval(intervalId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
}
