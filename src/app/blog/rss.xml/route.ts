// ---------------------------------------------------------------------------
// /blog/rss.xml — RSS 2.0 feed for the PockIT Engineers blog.
//
// Why a Route Handler (not a static file):
//   - The feed has to reflect whatever Sanity publishes, without a redeploy.
//   - We piggyback on the same ISR machinery as the blog pages: 5-minute
//     revalidation + the `blog:index` cache tag. A Sanity webhook that calls
//     `revalidateTag("blog:index")` will flush the feed immediately along
//     with the index page.
//
// Plain `.ts` route handler — registers on both build targets. On the static
// cPanel export it is emitted as a static `rss.xml` at build time (see
// `dynamic = "force-static"` below); on the dev server it runs per request.
// Single-host static model — see CHANGELOG #065 and #075.
//
// Spec reference: RSS 2.0 (https://www.rssboard.org/rss-specification).
//
// Introduced in CHANGELOG #011.
// ---------------------------------------------------------------------------

import { getAllPosts, getSiteSettings, urlFor } from "@/lib/sanity";
import type { PostCardData } from "@/lib/sanity";

const BLOG_BASE_URL = "https://www.pockitengineers.com";
const FEED_DEFAULT_TITLE = "PockIT Engineers — Blog";
const FEED_DEFAULT_DESCRIPTION =
    "Insights, updates, and field notes from the PockIT Engineers team.";

// 5 minutes. Tag-based invalidation will handle urgent publishes.
export const dynamic = "force-static";

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

/**
 * Minimal XML-safe escape for text nodes and attributes. We avoid a template
 * library here because the payload is small and the substitutions are well
 * known.
 */
function escapeXml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Wrap a string in CDATA so HTML-ish content inside `<description>` doesn't
 * confuse RSS consumers. The `]]>` sequence is the only thing that can break
 * a CDATA section, so split it if it ever appears.
 */
function cdata(input: string): string {
    return `<![CDATA[${input.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function formatRfc822(date: string | undefined): string {
    const parsed = date ? new Date(date) : new Date();
    // RSS 2.0 requires RFC 822. `toUTCString()` produces the exact format
    // (e.g. "Tue, 15 Apr 2026 09:00:00 GMT").
    return parsed.toUTCString();
}

function buildPostUrl(slug: string): string {
    return `${BLOG_BASE_URL}/blog/${slug}`;
}

function buildItem(post: PostCardData): string {
    const postUrl = buildPostUrl(post.slug.current);
    const title = escapeXml(post.title);
    const pubDate = formatRfc822(post.publishedAt);
    const description = post.excerpt ?? "";
    const categories = post.categories
        .map(
            (category) =>
                `        <category>${escapeXml(category.title)}</category>`,
        )
        .join("\n");
    const authorLine = post.author.name
        ? `        <dc:creator>${cdata(post.author.name)}</dc:creator>`
        : "";

    // A single `<enclosure>` for the cover image lets feed readers show a
    // thumbnail. Only emit it when the post actually has a cover.
    const enclosure = post.coverImage?.asset
        ? `        <enclosure url="${escapeXml(
              urlFor(post.coverImage).width(1200).height(630).fit("crop").url(),
          )}" type="image/jpeg" length="0" />`
        : "";

    return [
        "    <item>",
        `        <title>${title}</title>`,
        `        <link>${escapeXml(postUrl)}</link>`,
        `        <guid isPermaLink="true">${escapeXml(postUrl)}</guid>`,
        `        <pubDate>${pubDate}</pubDate>`,
        authorLine,
        `        <description>${cdata(description)}</description>`,
        categories,
        enclosure,
        "    </item>",
    ]
        .filter((line) => line.length > 0)
        .join("\n");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<Response> {
    const [posts, settings] = await Promise.all([
        getAllPosts(),
        getSiteSettings(),
    ]);

    const feedTitle = settings?.rssTitle ?? FEED_DEFAULT_TITLE;
    const feedDescription =
        settings?.rssDescription ?? FEED_DEFAULT_DESCRIPTION;
    const lastBuildDate = formatRfc822(
        posts[0]?.publishedAt ?? new Date().toISOString(),
    );

    const items = posts.map(buildItem).join("\n");

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
        "<channel>",
        `    <title>${escapeXml(feedTitle)}</title>`,
        `    <link>${escapeXml(`${BLOG_BASE_URL}/blog`)}</link>`,
        `    <description>${cdata(feedDescription)}</description>`,
        "    <language>en-us</language>",
        `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
        `    <atom:link href="${escapeXml(
            `${BLOG_BASE_URL}/blog/rss.xml`,
        )}" rel="self" type="application/rss+xml" />`,
        items,
        "</channel>",
        "</rss>",
    ].join("\n");

    return new Response(xml, {
        status: 200,
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            // Edge cache for 5 minutes; SWR for a day so stale readers still
            // get something while we refresh.
            "Cache-Control":
                "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        },
    });
}
