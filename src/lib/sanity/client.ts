// ---------------------------------------------------------------------------
// Sanity clients — production + preview.
//
// Two clients, on purpose:
//
//   `client` (public / CDN)
//     Unauthenticated, reads from Sanity's CDN, published documents only.
//     Fast and cacheable. This is the default for everything that renders
//     published blog content — index page, post pages, category pages, RSS.
//
//   `previewClient` (authenticated)
//     Uses the Viewer token, reads from the live API (no CDN cache), can
//     see drafts. Used when we want to render an unpublished post via the
//     Sanity Presentation preview route. Token is server-only — never
//     instantiate `previewClient` in a "use client" file.
//
// Both use `createClient` from `next-sanity`, which wires Sanity's client
// up with Next's `fetch` so ISR revalidation and `next: { tags: [...] }`
// caching work out of the box.
//
// Introduced in CHANGELOG #007. Called from Server Components in the
// upcoming /blog routes (#008+).
// ---------------------------------------------------------------------------

import { createClient, type SanityClient } from "next-sanity";

import {
    apiVersion,
    dataset,
    optionalReadToken,
    projectId,
    requireReadToken,
} from "./env";

/**
 * Public client. Safe to import from Server Components; do NOT import from
 * a "use client" file (tree-shaking doesn't help — the client module
 * includes token code paths that shouldn't ship to the browser).
 *
 * `useCdn: true` sends reads through Sanity's edge CDN, which caches
 * responses for a few seconds. Perfect for blog index / post fetches. If
 * you need fresh-on-every-request reads (e.g. draft preview), use
 * `previewClient()` below, not this one.
 *
 * `perspective: "published"` tells Sanity to filter drafts out at the API
 * level, belt-and-braces with the GROQ `_id` guards we also use.
 */
export const client: SanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    perspective: "published",
});

/**
 * Preview client — lazy factory. We call this on request inside a preview
 * route handler, not at module-load time, so the token lookup error only
 * fires when preview is actually attempted. Keeps production startup
 * clean even if SANITY_API_READ_TOKEN isn't set.
 */
export function previewClient(): SanityClient {
    return createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false, // Drafts never come from the CDN.
        perspective: "drafts",
        token: requireReadToken(),
    });
}

/**
 * Authenticated production client — same published-only behavior as
 * `client`, but signed requests and no CDN. Useful for RSS/sitemap
 * generation and anywhere else we need to bypass CDN stale-while-
 * revalidate. Silently falls back to unauthenticated if no token is
 * configured, so local dev without a token still works.
 */
export function authenticatedClient(): SanityClient {
    const token = optionalReadToken();
    return createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        perspective: "published",
        ...(token ? { token } : {}),
    });
}
