// ---------------------------------------------------------------------------
// /robots.txt — main marketing-site robots file (cPanel static build).
//
// Symmetric to `route.server.ts` (which serves the blog subdomain
// robots): this `.static.ts` variant only matches when BUILD_TARGET=
// static, gated by the `static.ts` page extension in `next.config.mjs`.
//
// Why a route handler and not the `app/robots.ts` metadata file:
//   Our `pageExtensions` config replaces the default `ts/tsx` list with
//   build-target-specific suffixes (`server.ts` / `static.ts`). Next's
//   metadata-file convention is keyed off the plain extensions, so it
//   silently no-ops on suffixed files. Using a regular route handler
//   sidesteps the issue and matches the pattern used for sitemap.xml.
//
// Build-time behaviour:
//   Under `output: "export"`, this GET runs once during `npm run
//   build:static` and the response body lands at `out/robots.txt`.
//
// Introduced May 2026 in response to the SEO audit (slide 5, "Robots.txt
// missing"). See CHANGELOG #034.
// ---------------------------------------------------------------------------

const SITE_URL = "https://www.pockitengineers.com";

// Force static generation so this works under `output: "export"`.
export const dynamic = "force-static";

export function GET(): Response {
    const body = [
        "# robots.txt — Pockit Engineers (pockitengineers.com)",
        "# Blog subdomain has its own robots file at",
        "# https://pockitblog.pockitengineers.com/robots.txt",
        "",
        "User-agent: *",
        "Allow: /",
        "",
        // Block the Sanity Studio surface so the embedded CMS routes
        // (which only exist on the Vercel build but are referenced via
        // cross-origin links from the main site) never get indexed.
        "Disallow: /studio",
        "Disallow: /studio/",
        "",
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        "",
    ].join("\n");

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control":
                "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
    });
}
