// ---------------------------------------------------------------------------
// /sitemap.xml — main marketing-site sitemap (cPanel static build).
//
// Why this file uses the `.static.ts` extension:
//   Two sitemap handlers coexist at this URL — the blog one in
//   `route.server.ts` (visible only on the server/Vercel build) and this
//   one (visible only on the static/cPanel build). The first attempt at
//   gating used a plain `route.ts`, but Next refuses to register two
//   files that resolve to the same URL even when `pageExtensions` lists
//   the suffixed variant first — it surfaces a "Duplicate page detected"
//   error during dev/build. The fix is the symmetric `.static.ts`
//   suffix added to `pageExtensions` for static builds only — see
//   `next.config.mjs` and CHANGELOG #022.
//
// Build-time behaviour:
//   With `output: "export"`, this GET handler is invoked once during
//   `npm run build:static` and its body is written to `out/sitemap.xml`.
//   Sanity edits require a rebuild — same lifecycle as every other
//   landing-page change.
//
// Introduced in CHANGELOG #022.
// ---------------------------------------------------------------------------

import {
    getAllAuthorSlugs,
    getAllCategorySlugs,
    getAllLandingPagesForSitemap,
    getAllPosts,
} from "@/lib/sanity";

const SITE_URL = "https://www.pockitengineers.com";

// Force static generation so this works under `output: "export"`.
export const dynamic = "force-static";

type ChangeFrequency =
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

interface SitemapEntry {
    readonly url: string;
    readonly lastModified: Date;
    readonly changeFrequency: ChangeFrequency;
    readonly priority: number;
}

// Static main-site routes that exist as TSX pages in src/app/. Keep this
// list updated when new top-level pages are added.
const STATIC_ROUTES: readonly Omit<SitemapEntry, "lastModified">[] = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    {
        url: `${SITE_URL}/become-a-technician`,
        changeFrequency: "monthly",
        priority: 0.7,
    },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    {
        url: `${SITE_URL}/privacy-policy`,
        changeFrequency: "yearly",
        priority: 0.3,
    },
    {
        url: `${SITE_URL}/delete-account`,
        changeFrequency: "yearly",
        priority: 0.2,
    },
];

function escapeXml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildUrlElement(entry: SitemapEntry): string {
    return [
        "    <url>",
        `        <loc>${escapeXml(entry.url)}</loc>`,
        `        <lastmod>${entry.lastModified.toISOString()}</lastmod>`,
        `        <changefreq>${entry.changeFrequency}</changefreq>`,
        `        <priority>${entry.priority.toFixed(1)}</priority>`,
        "    </url>",
    ].join("\n");
}

export async function GET(): Promise<Response> {
    const now = new Date();

    // Pull every published, non-noindex landing page from Sanity.
    let landingRows: Awaited<
        ReturnType<typeof getAllLandingPagesForSitemap>
    > = [];
    try {
        landingRows = await getAllLandingPagesForSitemap();
    } catch (err) {
        // Don't break the build if Sanity is unreachable during static
        // export — emit the static-route portion of the sitemap so the
        // site at least has the marketing routes covered, and surface the
        // error in the build log.
        // eslint-disable-next-line no-console
        console.error("[sitemap] Failed to fetch landing pages:", err);
    }

    // Pull blog content (posts + taxonomy) in a second resilient block so a
    // Sanity outage during static export degrades to the marketing + landing
    // portion of the sitemap rather than failing the whole build.
    let posts: Awaited<ReturnType<typeof getAllPosts>> = [];
    let categorySlugs: Awaited<ReturnType<typeof getAllCategorySlugs>> = [];
    let authorSlugs: Awaited<ReturnType<typeof getAllAuthorSlugs>> = [];
    try {
        [posts, categorySlugs, authorSlugs] = await Promise.all([
            getAllPosts(),
            getAllCategorySlugs(),
            getAllAuthorSlugs(),
        ]);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[sitemap] Failed to fetch blog content:", err);
    }

    const entries: SitemapEntry[] = [
        ...STATIC_ROUTES.map((r) => ({ ...r, lastModified: now })),
        ...landingRows.map<SitemapEntry>((row) => ({
            url: `${SITE_URL}/${row.slug.current}`,
            lastModified: row._updatedAt
                ? new Date(row._updatedAt)
                : row.publishedAt
                  ? new Date(row.publishedAt)
                  : now,
            changeFrequency: "weekly",
            priority: 0.85,
        })),
        {
            url: `${SITE_URL}/blog`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/blog/rss.xml`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.3,
        },
        ...posts.map<SitemapEntry>((post) => ({
            url: `${SITE_URL}/blog/${post.slug.current}`,
            lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
            changeFrequency: "weekly",
            priority: 0.8,
        })),
        ...categorySlugs.map<SitemapEntry>((slug) => ({
            url: `${SITE_URL}/blog/category/${slug.current}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
        })),
        ...authorSlugs.map<SitemapEntry>((slug) => ({
            url: `${SITE_URL}/blog/author/${slug.current}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.5,
        })),
    ];

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        entries.map(buildUrlElement).join("\n"),
        "</urlset>",
    ].join("\n");

    return new Response(xml, {
        status: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
        },
    });
}
