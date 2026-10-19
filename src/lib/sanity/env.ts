// ---------------------------------------------------------------------------
// Sanity environment config — single source of truth for projectId, dataset,
// apiVersion, and the Viewer token. Every other file in this folder imports
// from here so we don't sprinkle `process.env` reads across the codebase.
//
// Defaults match CLAUDE.md → Project preferences → Blog project so local dev
// works even if `.env.local` is missing (e.g. on a fresh clone before the
// user copies secrets). Server-only secrets (the API token) have no default.
//
// Introduced in CHANGELOG #007.
// ---------------------------------------------------------------------------

function requireEnv(name: string, value: string | undefined): string {
    if (!value || value.length === 0) {
        throw new Error(
            `Missing required environment variable: ${name}. See .env.local or CLAUDE.md → Project preferences → Blog project.`,
        );
    }
    return value;
}

/**
 * Sanity project ID. Locked to `pg938kpo` (see CLAUDE.md). Readable client-
 * side because the project ID is not secret — it's in every Studio URL.
 */
export const projectId: string =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";

/**
 * Dataset name. Locked to `production`. Will become dynamic later if we add
 * a staging dataset for preview branches.
 */
export const dataset: string =
    process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

/**
 * Sanity API version — freeze this to today's date so the shape of query
 * results is stable. Bump deliberately when we want new Sanity API
 * behavior, not accidentally on every deploy.
 *
 * 2026-04-15 matches the date #007 landed; queries projected here were
 * written against the API surface available on this date.
 */
export const apiVersion: string =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-04-15";

/**
 * Viewer token — server-only secret. Never prefixed with NEXT_PUBLIC_ so it
 * doesn't leak into the client bundle. Required for preview / draft fetches
 * and for any query that needs to read unpublished documents. The public
 * client runs unauthenticated against the CDN.
 *
 * Read lazily: calling code that needs a token should go through
 * `requireReadToken()` which gives a loud error if the env var is missing,
 * instead of silently returning `undefined` and producing a confusing
 * "unauthorized" error later.
 */
export function requireReadToken(): string {
    return requireEnv(
        "SANITY_API_READ_TOKEN",
        process.env.SANITY_API_READ_TOKEN,
    );
}

/**
 * Returns the token if present, `undefined` otherwise. Safe to call from
 * code paths that can proceed without a token (anonymous CDN reads).
 */
export function optionalReadToken(): string | undefined {
    return process.env.SANITY_API_READ_TOKEN;
}
