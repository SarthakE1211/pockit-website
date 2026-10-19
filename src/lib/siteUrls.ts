// ---------------------------------------------------------------------------
// siteUrls — central resolver for cross-origin links between the main
// marketing site (cPanel, pockitengineers.com) and the blog subdomain
// (Vercel, pockitblog.pockitengineers.com).
//
// The same Header and Footer components render on both surfaces. Whether a
// given link stays same-origin or hops to the sibling site depends on *which
// build target produced the bundle rendering the link* — not on runtime
// detection. Two build-time env vars drive the swap:
//
//   NEXT_PUBLIC_MAIN_SITE_URL   set only on the Vercel (server) build.
//                               When set, anchor links and main-site routes
//                               (`#services`, `/#download`, `/about`, etc.)
//                               are rewritten to absolute URLs on the main
//                               site so a reader on the blog can hop there.
//
//   NEXT_PUBLIC_BLOG_URL        set only on the cPanel (static) build.
//                               When set, the Blog nav link becomes an
//                               absolute URL to the blog subdomain so a
//                               reader on the main site hops there.
//
// In local development both env vars are unset, so everything resolves to
// same-origin and the dev server on :3001 can serve the whole thing.
//
// Introduced in CHANGELOG #013.
// ---------------------------------------------------------------------------

/**
 * Resolved once at module load because Next inlines `process.env.NEXT_PUBLIC_*`
 * at build time. Re-reading `process.env` per call adds nothing.
 */
const MAIN_SITE_URL: string = (
    process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? ""
).replace(/\/+$/, "");

const BLOG_URL: string = (
    process.env.NEXT_PUBLIC_BLOG_URL ?? ""
).replace(/\/+$/, "");

/**
 * Destination for a logo click ("home"). On the Vercel blog build, "home" is
 * the main marketing site, so logos link off-origin. On the main-site build
 * and in dev, "home" stays same-origin at `/`.
 */
export function getMainSiteHomeUrl(): string {
    return MAIN_SITE_URL || "/";
}

/**
 * Destination for a "Blog" nav link. On the cPanel main-site build, the blog
 * lives at a different origin. On the Vercel blog build and in dev, it stays
 * same-origin at `/blog`.
 */
export function getBlogIndexUrl(): string {
    return BLOG_URL ? `${BLOG_URL}/blog` : "/blog";
}

/**
 * True when the current build targets the blog subdomain — i.e. we have a
 * main-site URL to link *back* to. Useful for conditional rendering (active
 * states, "back to pockitengineers.com" links, etc.).
 */
export function isBlogBuildTarget(): boolean {
    return MAIN_SITE_URL.length > 0;
}

/**
 * Resolve a `NAV_LINKS` / `FOOTER_LINKS` href to the actual URL to navigate
 * to, given the current page context.
 *
 * Rules, in order:
 *   1. Absolute URLs (`http…`) pass through unchanged.
 *   2. Pure anchors (`#services`) are main-site scroll targets.
 *      - If `MAIN_SITE_URL` is set (blog build) → absolute main-site URL.
 *      - Else on a non-home main-site page → `/#anchor` so Next navigates
 *        home first, then the browser scrolls.
 *      - Else (on the main-site homepage) → anchor as-is for smooth-scroll.
 *   3. Routes starting with `/`:
 *      - `/blog` or `/blog/…` — use `BLOG_URL` when set (main-site build),
 *        otherwise same-origin.
 *      - `/#anchor` (root + hash) — prefix with `MAIN_SITE_URL` when set,
 *        otherwise pass through.
 *      - Any other main-site route (`/about`, `/terms`, …) — prefix with
 *        `MAIN_SITE_URL` when set, otherwise pass through.
 *   4. Anything else passes through unchanged (defensive default).
 */
export function resolveNavHref(href: string, isHome: boolean): string {
    if (/^https?:\/\//i.test(href)) return href;

    // 2. Pure anchor links — main-site scroll targets
    if (href.startsWith("#")) {
        if (MAIN_SITE_URL) return `${MAIN_SITE_URL}/${href}`;
        return isHome ? href : `/${href}`;
    }

    // 3. Routes starting with `/`
    if (href.startsWith("/")) {
        // Blog routes: cross-origin on the main-site build
        if (href === "/blog" || href.startsWith("/blog/") || href.startsWith("/blog?")) {
            if (!BLOG_URL) return href;
            if (href === "/blog") return `${BLOG_URL}/blog`;
            // e.g. `/blog/some-post` → `${BLOG_URL}/blog/some-post`
            return `${BLOG_URL}${href}`;
        }

        // `/#anchor` root-hash links (from FOOTER_LINKS "/#download" etc.)
        if (href.startsWith("/#")) {
            return MAIN_SITE_URL ? `${MAIN_SITE_URL}${href}` : href;
        }

        // Any other main-site route (`/about`, `/terms`, …)
        return MAIN_SITE_URL ? `${MAIN_SITE_URL}${href}` : href;
    }

    // 4. Defensive passthrough for bare-string hrefs (should be rare)
    return href;
}
