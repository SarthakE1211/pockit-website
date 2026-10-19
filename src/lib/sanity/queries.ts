// ---------------------------------------------------------------------------
// GROQ queries + typed fetchers.
//
// Each GROQ query is defined once as a string (so Studio's Vision plugin
// and this codebase stay in sync) and paired with a typed fetch helper
// that returns the projection shape defined in `./types.ts`.
//
// Layering:
//   - Blog components call the `get*` helpers below.
//   - Helpers call `client.fetch` with the matching GROQ string.
//   - Next.js ISR is wired via `next: { revalidate, tags }` so editor
//     publishes can trigger on-demand revalidation without redeploys
//     (Sanity webhook → Vercel revalidateTag route, landing in #011/#014).
//
// Revalidation tags:
//   - "blog:index"   — invalidate all index-page fetches on any post publish
//   - "blog:post:<slug>"  — invalidate a single post
//   - "blog:taxonomy" — invalidate category/tag/author listings
//   - "blog:settings" — invalidate site settings
//
// Introduced in CHANGELOG #007.
// ---------------------------------------------------------------------------

import { groq } from "next-sanity";

import { client } from "./client";
import type {
    Author,
    Category,
    LandingPageCardData,
    LandingPageDetail,
    LandingPageSitemapRow,
    PostCardData,
    PostDetail,
    SearchIndexEntry,
    SiteSettings,
    Slug,
    Tag,
} from "./types";

// Default revalidation window for list/index queries. Individual posts can
// override this via the tag-based invalidation path above.
const LIST_REVALIDATE_SECONDS = 60;
const DETAIL_REVALIDATE_SECONDS = 60;

// ---------------------------------------------------------------------------
// Reusable GROQ fragments
// ---------------------------------------------------------------------------

/**
 * Lightweight projection used by cards on the index page and in "related
 * posts" blocks. Keep in lockstep with `PostCardData`.
 *
 * `readingTimeMinutes` is approximated from the raw text length of the
 * body's block nodes — ~200 wpm, rounded up. Computed in GROQ so it's
 * free on the server side and cached at the CDN layer.
 */
// GROQ array dereferences return null (not []) when the source field is
// unset or empty. Coalesce here once so every downstream consumer can
// treat `categories` / `tags` as a guaranteed array and our TS types
// stay honest.
const POST_CARD_PROJECTION = groq`
    _id,
    title,
    slug,
    excerpt,
    coverImage{..., asset->},
    publishedAt,
    featured,
    "author": author->{
        _id,
        name,
        slug,
        role,
        avatar{..., asset->}
    },
    "categories": coalesce(categories[]->{
        _id,
        title,
        slug
    }, []),
    "readingTimeMinutes": round(length(pt::text(body)) / 5 / 200) + 1
`;

const POST_DETAIL_PROJECTION = groq`
    _id,
    title,
    slug,
    excerpt,
    body,
    coverImage{..., asset->},
    publishedAt,
    featured,
    "author": author->{
        _id,
        name,
        slug,
        role,
        bio,
        avatar{..., asset->},
        socials
    },
    "categories": coalesce(categories[]->{
        _id,
        title,
        slug
    }, []),
    "tags": coalesce(tags[]->{
        _id,
        title,
        slug
    }, []),
    seo,
    "readingTimeMinutes": round(length(pt::text(body)) / 5 / 200) + 1
`;

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

export const indexPageQuery = groq`
    *[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))]
        | order(coalesce(publishedAt, _createdAt) desc) {
        ${POST_CARD_PROJECTION}
    }
`;

export const featuredPostQuery = groq`
    *[_type == "post" && featured == true && defined(slug.current) && !(_id in path("drafts.**"))]
        | order(coalesce(publishedAt, _createdAt) desc)[0] {
        ${POST_CARD_PROJECTION}
    }
`;

export const postBySlugQuery = groq`
    *[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
        ${POST_DETAIL_PROJECTION}
    }
`;

/**
 * Related posts: same category as the current post, excluding the current
 * post itself, ordered by recency, limited to 3.
 */
export const relatedPostsQuery = groq`
    *[_type == "post"
        && _id != $currentId
        && count((categories[]->_id)[@ in $categoryIds]) > 0
        && defined(slug.current)
        && !(_id in path("drafts.**"))]
        | order(coalesce(publishedAt, _createdAt) desc)[0...3] {
        ${POST_CARD_PROJECTION}
    }
`;

export const categoryBySlugQuery = groq`
    *[_type == "category" && slug.current == $slug][0] {
        _id,
        title,
        slug,
        description,
        order
    }
`;

export const authorBySlugQuery = groq`
    *[_type == "author" && slug.current == $slug][0] {
        _id,
        name,
        slug,
        role,
        bio,
        avatar{..., asset->},
        socials
    }
`;

export const postsByCategoryQuery = groq`
    *[_type == "post"
        && $categorySlug in categories[]->slug.current
        && defined(slug.current)
        && !(_id in path("drafts.**"))]
        | order(coalesce(publishedAt, _createdAt) desc) {
        ${POST_CARD_PROJECTION}
    }
`;

export const postsByAuthorQuery = groq`
    *[_type == "post"
        && author->slug.current == $authorSlug
        && defined(slug.current)
        && !(_id in path("drafts.**"))]
        | order(coalesce(publishedAt, _createdAt) desc) {
        ${POST_CARD_PROJECTION}
    }
`;

export const allPostSlugsQuery = groq`
    *[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))].slug
`;

export const allCategorySlugsQuery = groq`
    *[_type == "category" && defined(slug.current)].slug
`;

export const allAuthorSlugsQuery = groq`
    *[_type == "author" && defined(slug.current)].slug
`;

export const allCategoriesQuery = groq`
    *[_type == "category" && defined(slug.current)]
        | order(coalesce(order, 100) asc, title asc) {
        _id,
        title,
        slug,
        description,
        order
    }
`;

export const searchIndexQuery = groq`
    *[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))] {
        _id,
        title,
        slug,
        excerpt,
        "categoryTitles": coalesce(categories[]->title, []),
        "tagTitles": coalesce(tags[]->title, []),
        "authorName": author->name
    }
`;

export const siteSettingsQuery = groq`
    *[_type == "siteSettings"][0] {
        blogHeroEyebrow,
        blogHeroTitle,
        blogHeroSubtitle,
        rssTitle,
        rssDescription,
        defaultOgImage{..., asset->},
        footerDisclaimer
    }
`;

// ---------------------------------------------------------------------------
// Typed fetchers
//
// Every helper wires a revalidation window + a cache tag so Next's fetch
// cache can invalidate precisely when a webhook fires.
// ---------------------------------------------------------------------------

export async function getAllPosts(): Promise<PostCardData[]> {
    return client.fetch<PostCardData[]>(indexPageQuery, {}, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:index"] },
    });
}

export async function getFeaturedPost(): Promise<PostCardData | null> {
    return client.fetch<PostCardData | null>(featuredPostQuery, {}, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:index"] },
    });
}

export async function getPostBySlug(
    slug: string,
): Promise<PostDetail | null> {
    return client.fetch<PostDetail | null>(
        postBySlugQuery,
        { slug },
        {
            next: {
                revalidate: DETAIL_REVALIDATE_SECONDS,
                tags: [`blog:post:${slug}`],
            },
        },
    );
}

export async function getRelatedPosts(
    currentId: string,
    categoryIds: readonly string[],
): Promise<PostCardData[]> {
    if (categoryIds.length === 0) return [];
    return client.fetch<PostCardData[]>(
        relatedPostsQuery,
        { currentId, categoryIds },
        {
            next: {
                revalidate: LIST_REVALIDATE_SECONDS,
                tags: ["blog:index"],
            },
        },
    );
}

export async function getCategoryBySlug(
    slug: string,
): Promise<Category | null> {
    return client.fetch<Category | null>(
        categoryBySlugQuery,
        { slug },
        {
            next: {
                revalidate: LIST_REVALIDATE_SECONDS,
                tags: ["blog:taxonomy", `blog:category:${slug}`],
            },
        },
    );
}

export async function getAuthorBySlug(
    slug: string,
): Promise<Author | null> {
    return client.fetch<Author | null>(
        authorBySlugQuery,
        { slug },
        {
            next: {
                revalidate: LIST_REVALIDATE_SECONDS,
                tags: ["blog:taxonomy", `blog:author:${slug}`],
            },
        },
    );
}

export async function getPostsByCategory(
    categorySlug: string,
): Promise<PostCardData[]> {
    return client.fetch<PostCardData[]>(
        postsByCategoryQuery,
        { categorySlug },
        {
            next: {
                revalidate: LIST_REVALIDATE_SECONDS,
                tags: ["blog:taxonomy", `blog:category:${categorySlug}`],
            },
        },
    );
}

export async function getPostsByAuthor(
    authorSlug: string,
): Promise<PostCardData[]> {
    return client.fetch<PostCardData[]>(
        postsByAuthorQuery,
        { authorSlug },
        {
            next: {
                revalidate: LIST_REVALIDATE_SECONDS,
                tags: ["blog:taxonomy", `blog:author:${authorSlug}`],
            },
        },
    );
}

export async function getAllPostSlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(allPostSlugsQuery, {}, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:index"] },
    });
}

export async function getAllCategorySlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(allCategorySlugsQuery, {}, {
        next: {
            revalidate: LIST_REVALIDATE_SECONDS,
            tags: ["blog:taxonomy"],
        },
    });
}

export async function getAllAuthorSlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(allAuthorSlugsQuery, {}, {
        next: {
            revalidate: LIST_REVALIDATE_SECONDS,
            tags: ["blog:taxonomy"],
        },
    });
}

export async function getAllCategories(): Promise<Category[]> {
    return client.fetch<Category[]>(allCategoriesQuery, {}, {
        next: {
            revalidate: LIST_REVALIDATE_SECONDS,
            tags: ["blog:taxonomy"],
        },
    });
}

export async function getSearchIndex(): Promise<SearchIndexEntry[]> {
    return client.fetch<SearchIndexEntry[]>(searchIndexQuery, {}, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:index"] },
    });
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
    return client.fetch<SiteSettings | null>(siteSettingsQuery, {}, {
        next: {
            revalidate: LIST_REVALIDATE_SECONDS,
            tags: ["blog:settings"],
        },
    });
}

// ---------------------------------------------------------------------------
// Landing pages (SEO city / locality / problem-fix)
//
// Schema: sanity/schemas/landingPage.ts (CHANGELOG #022).
// Route:  src/app/[slug]/page.tsx — statically exported on the cPanel build.
//
// Revalidation tags:
//   - "landing:index"          — invalidate sitemap + slug enumeration
//   - "landing:page:<slug>"    — invalidate a single page
// ---------------------------------------------------------------------------

const LANDING_CARD_PROJECTION = groq`
    _id,
    title,
    slug,
    pageType,
    service,
    location,
    heroSubheading
`;

const LANDING_DETAIL_PROJECTION = groq`
    _id,
    title,
    slug,
    pageType,
    service,
    location,
    problem,
    heroEyebrow,
    heroHeading,
    heroSubheading,
    heroBullets,
    heroPrimaryCta,
    heroSecondaryCta,
    intro,
    services,
    trustBullets,
    process,
    seoContent,
    areasServed,
    priceRange,
    phone,
    responseTime,
    faqs,
    "relatedPages": coalesce(relatedPages[]->{
        ${LANDING_CARD_PROJECTION}
    }, []),
    seo,
    publishedAt,
    _updatedAt
`;

export const landingPageBySlugQuery = groq`
    *[_type == "landingPage"
        && slug.current == $slug
        && !(_id in path("drafts.**"))][0] {
        ${LANDING_DETAIL_PROJECTION}
    }
`;

export const allLandingPageSlugsQuery = groq`
    *[_type == "landingPage"
        && defined(slug.current)
        && !(_id in path("drafts.**"))
        && (seo.noIndex != true || !defined(seo.noIndex))]
        .slug
`;

export const allLandingPagesForSitemapQuery = groq`
    *[_type == "landingPage"
        && defined(slug.current)
        && !(_id in path("drafts.**"))
        && (seo.noIndex != true || !defined(seo.noIndex))] {
        slug,
        publishedAt,
        _updatedAt,
        "noIndex": seo.noIndex
    }
`;

export async function getLandingPageBySlug(
    slug: string,
): Promise<LandingPageDetail | null> {
    return client.fetch<LandingPageDetail | null>(
        landingPageBySlugQuery,
        { slug },
        {
            next: {
                revalidate: DETAIL_REVALIDATE_SECONDS,
                tags: [`landing:page:${slug}`],
            },
        },
    );
}

export async function getAllLandingPageSlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(
        allLandingPageSlugsQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}

export async function getAllLandingPagesForSitemap(): Promise<
    LandingPageSitemapRow[]
> {
    return client.fetch<LandingPageSitemapRow[]>(
        allLandingPagesForSitemapQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}

// Re-export author/tag types so callers that import from `queries.ts` have
// one clean entry point (matches the barrel in `./index.ts`).
export type {
    Author,
    Category,
    LandingPageCardData,
    LandingPageDetail,
    LandingPageSitemapRow,
    PostCardData,
    PostDetail,
    SearchIndexEntry,
    SiteSettings,
    Tag,
};
