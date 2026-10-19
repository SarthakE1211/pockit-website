// ---------------------------------------------------------------------------
// Sanity TypeScript types — mirror what our GROQ projections return.
//
// These are NOT auto-generated from the schemas (we're not running
// sanity-codegen). They're written by hand to match the shapes projected in
// `./queries.ts`. If you add a field to a schema under `/sanity/schemas`,
// also:
//   1. Update the matching GROQ projection in `queries.ts`, and
//   2. Update the type here.
//
// Keeping these three aligned is the contract that makes blog page
// components typesafe end-to-end.
//
// Introduced in CHANGELOG #007.
// ---------------------------------------------------------------------------

/**
 * Portable Text is an array of blocks (paragraphs, headings, quotes) plus
 * inline objects (images, callouts). We keep it loose as `unknown[]` here —
 * `@portabletext/react` will accept this and render it using its own
 * serializer map. Narrowing would require reproducing Sanity's Portable Text
 * schema types locally; not worth the maintenance cost for v1.
 */
export type PortableTextBlocks = readonly unknown[];

/**
 * Sanity image asset reference. What the Image URL builder consumes.
 * Matches what Sanity returns for an `image` field (with or without hotspot).
 */
export interface SanityImageReference {
    readonly _type?: "image";
    readonly asset?: {
        readonly _ref?: string;
        readonly _type?: "reference";
    };
    readonly hotspot?: {
        readonly x: number;
        readonly y: number;
        readonly height: number;
        readonly width: number;
    };
    readonly crop?: {
        readonly top: number;
        readonly bottom: number;
        readonly left: number;
        readonly right: number;
    };
}

/**
 * Projected image with our custom fields (alt, optional caption).
 */
export interface BlogImage extends SanityImageReference {
    readonly alt?: string;
    readonly caption?: string;
}

export interface Slug {
    readonly current: string;
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export interface Category {
    readonly _id: string;
    readonly title: string;
    readonly slug: Slug;
    readonly description?: string;
    readonly order?: number;
}

export interface Tag {
    readonly _id: string;
    readonly title: string;
    readonly slug: Slug;
}

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export interface AuthorSocials {
    readonly website?: string;
    readonly linkedin?: string;
    readonly twitter?: string;
}

export interface Author {
    readonly _id: string;
    readonly name: string;
    readonly slug: Slug;
    readonly role?: string;
    readonly bio?: string;
    readonly avatar?: BlogImage;
    readonly socials?: AuthorSocials;
}

// ---------------------------------------------------------------------------
// Post — two shapes:
//   - PostCardData:    the lightweight projection used on index / related /
//                      category / author listing pages.
//   - PostDetail:      the full projection used on /blog/[slug] — includes
//                      the Portable Text body, SEO fields, full author bio.
// ---------------------------------------------------------------------------

export interface FaqItem {
    readonly question: string;
    readonly answer: string;
}

export interface PostSeo {
    readonly metaTitle?: string;
    readonly metaDescription?: string;
    readonly ogImage?: BlogImage;
    readonly noIndex?: boolean;
    readonly faq?: readonly FaqItem[];
}

export interface PostCardData {
    readonly _id: string;
    readonly title: string;
    readonly slug: Slug;
    readonly excerpt?: string;
    readonly coverImage?: BlogImage;
    readonly publishedAt: string; // ISO datetime
    readonly featured?: boolean;
    readonly author: Pick<Author, "_id" | "name" | "slug" | "role" | "avatar">;
    readonly categories: readonly Pick<Category, "_id" | "title" | "slug">[];
    readonly readingTimeMinutes?: number;
}

export interface PostDetail extends PostCardData {
    readonly body: PortableTextBlocks;
    readonly tags: readonly Pick<Tag, "_id" | "title" | "slug">[];
    readonly seo?: PostSeo;
    readonly author: Author;
}

// ---------------------------------------------------------------------------
// Search index — shape used by the client-side search on /blog. Kept
// deliberately small so we can ship the whole corpus to the browser on
// index-page load without blowing up the bundle.
// ---------------------------------------------------------------------------

export interface SearchIndexEntry {
    readonly _id: string;
    readonly title: string;
    readonly slug: Slug;
    readonly excerpt?: string;
    readonly categoryTitles: readonly string[];
    readonly tagTitles: readonly string[];
    readonly authorName: string;
}

// ---------------------------------------------------------------------------
// Site settings (singleton)
// ---------------------------------------------------------------------------

export interface SiteSettings {
    readonly blogHeroEyebrow?: string;
    readonly blogHeroTitle: string;
    readonly blogHeroSubtitle?: string;
    readonly rssTitle?: string;
    readonly rssDescription?: string;
    readonly defaultOgImage?: BlogImage;
    readonly footerDisclaimer?: string;
}

// ---------------------------------------------------------------------------
// Landing pages — SEO city / locality / problem-fix pages mounted at the
// marketing-site root (e.g. /laptop-repair-mumbai). One Sanity document =
// one statically exported HTML page on the cPanel build.
//
// Schema lives in sanity/schemas/landingPage.ts (CHANGELOG #022). Keep these
// types, the GROQ projections in queries.ts, and that schema in lockstep.
// ---------------------------------------------------------------------------

export type LandingPageType =
    | "service-city"
    | "service-locality"
    | "problem-fix";

export interface LandingPageCta {
    readonly label?: string;
    readonly href?: string;
}

export interface LandingPageServiceItem {
    readonly title: string;
    readonly description?: string;
    readonly priceFrom?: number;
}

export interface LandingPageProcessStep {
    readonly title?: string;
    readonly description?: string;
}

export interface LandingPageAreaServed {
    readonly name: string;
    readonly href?: string;
}

export interface LandingPageFaqItem {
    readonly question: string;
    readonly answer: string;
}

export interface LandingPageSeo {
    readonly metaTitle?: string;
    readonly metaDescription?: string;
    readonly ogImage?: BlogImage;
    readonly noIndex?: boolean;
}

/**
 * Lightweight projection — used in `relatedPages` lists and the sitemap so
 * we don't hydrate every section just to render an internal link.
 */
export interface LandingPageCardData {
    readonly _id: string;
    readonly title: string;
    readonly slug: Slug;
    readonly pageType: LandingPageType;
    readonly service: string;
    readonly location: string;
    readonly heroSubheading?: string;
}

/**
 * Full projection — used by the route at /[slug].
 */
export interface LandingPageDetail extends LandingPageCardData {
    readonly problem?: string;
    readonly heroEyebrow?: string;
    readonly heroHeading?: string;
    readonly heroBullets?: readonly string[];
    readonly heroPrimaryCta?: LandingPageCta;
    readonly heroSecondaryCta?: LandingPageCta;
    readonly intro?: PortableTextBlocks;
    readonly services?: readonly LandingPageServiceItem[];
    readonly trustBullets?: readonly string[];
    readonly process?: readonly LandingPageProcessStep[];
    readonly seoContent?: PortableTextBlocks;
    readonly areasServed?: readonly LandingPageAreaServed[];
    readonly priceRange?: string;
    readonly phone?: string;
    readonly responseTime?: string;
    readonly faqs?: readonly LandingPageFaqItem[];
    readonly relatedPages?: readonly LandingPageCardData[];
    readonly seo?: LandingPageSeo;
    readonly publishedAt: string;
    readonly _updatedAt?: string;
}

/**
 * Sitemap row — minimal projection for sitemap.xml emission.
 */
export interface LandingPageSitemapRow {
    readonly slug: Slug;
    readonly publishedAt?: string;
    readonly _updatedAt?: string;
    readonly noIndex?: boolean;
}
