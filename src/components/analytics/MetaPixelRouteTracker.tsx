"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackMetaPageView } from "@/lib/metaPixel";

/**
 * Fires the Meta Pixel `PageView` — on the initial load AND on every
 * client-side navigation. This is now the SINGLE source of every PageView.
 *
 * Previously the base Pixel snippet in `app/layout.tsx` fired the first-load
 * PageView and this component skipped it (to avoid double-counting). That
 * snippet PageView carried no `event_id`, so it could never be deduplicated
 * against a server-side (CAPI) copy. We moved the initial PageView here so it
 * flows through `trackMetaPageView()` like every other one, gets a shared
 * `event_id`, and dedupes against CAPI (CHANGELOG #073).
 *
 * In the Next.js App Router, moving between pages (home → /blog → a post) is a
 * client-side transition with no full reload; `usePathname()` changes on each,
 * re-running the effect. Keyed on the pathname only (not search params) so we
 * don't need a Suspense boundary and don't over-count query-string-only changes.
 *
 * Introduced in CHANGELOG #052; became the sole PageView source in #073.
 */
export default function MetaPixelRouteTracker() {
    const pathname = usePathname();

    useEffect(() => {
        trackMetaPageView();
    }, [pathname]);

    return null;
}
