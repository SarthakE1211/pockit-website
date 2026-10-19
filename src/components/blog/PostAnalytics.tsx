"use client";

// ---------------------------------------------------------------------------
// PostAnalytics — headless client component that wires the per-post
// analytics lifecycle.
//
// On mount:
//   - Fires `post_view` once with `post_slug`, `post_category`, `post_author`.
//   - Starts the scroll-depth tracker (25 / 50 / 75 / 100 %).
//   - Starts the engagement timer (30 s / 60 s / 180 s, pauses when hidden).
//
// On unmount (route change, tab close via Next's cleanup):
//   - Tears down both trackers so we don't leak listeners or intervals.
//
// Why a separate component:
//   - The post page (`/blog/[slug]/page.server.tsx`) is a server component.
//     We can't `useEffect` there. Rather than marking the whole page
//     client-only, we drop a small `"use client"` island that owns the
//     side effects and nothing else — no DOM output.
//
// Introduced in CHANGELOG #012.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";

import {
    createEngagementTracker,
    createScrollDepthTracker,
    trackPostView,
    type BlogPostContext,
} from "@/services/blogAnalytics";

interface PostAnalyticsProps extends BlogPostContext {
    /** DOM id of the article container (same id handed to ReadingProgress). */
    readonly articleId: string;
}

export default function PostAnalytics({
    articleId,
    post_slug,
    post_category,
    post_author,
}: PostAnalyticsProps): null {
    // React 19 + StrictMode double-invokes effects in dev. A ref guard keeps
    // `post_view` from firing twice during that replay.
    const hasFiredPostView = useRef(false);

    useEffect(() => {
        const context: BlogPostContext = {
            post_slug,
            ...(post_category ? { post_category } : {}),
            ...(post_author ? { post_author } : {}),
        };

        if (!hasFiredPostView.current) {
            hasFiredPostView.current = true;
            trackPostView(context);
        }

        const cleanupScroll = createScrollDepthTracker({
            articleId,
            postContext: context,
        });
        const cleanupEngagement = createEngagementTracker({
            postContext: context,
        });

        return () => {
            cleanupScroll();
            cleanupEngagement();
        };
    }, [articleId, post_slug, post_category, post_author]);

    return null;
}
