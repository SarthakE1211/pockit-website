// ---------------------------------------------------------------------------
// /blog/[slug] — individual post page. Server component.
//
// Data flow:
//   1. Fetch the post by slug. 404 if missing or unpublished.
//   2. In parallel, fetch related posts (same category, ≤ 3) and site
//      settings (used for fallback OG image).
//   3. Render the three-rail layout:
//        ┌─────────────────────────────────────────────┐
//        │  ReadingProgress (fixed top)                │
//        ├──────────┬─────────────────┬────────────────┤
//        │ sticky   │ article body    │  (empty)       │
//        │ ToC +    │ centered ~700px │                │
//        │ Share    │                 │                │
//        │ rail     │                 │                │
//        │ (lg+)    │                 │                │
//        └──────────┴─────────────────┴────────────────┘
//   4. Mobile stacks: ToC hidden, inline ShareBar above the body, full
//      AuthorBlock + RelatedPosts at the bottom.
//
// generateStaticParams pre-renders every published post at build time
// (Vercel server build). ISR then refreshes each page on the
// `blog:post:<slug>` tag when Sanity publishes an update.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";

import PostBreadcrumb from "@/components/blog/PostBreadcrumb";
import PostMeta from "@/components/blog/PostMeta";
import PostBody from "@/components/blog/PostBody";
import TableOfContents from "@/components/blog/TableOfContents";
import ShareBar from "@/components/blog/ShareBar";
import AuthorBlock from "@/components/blog/AuthorBlock";
import RelatedPosts from "@/components/blog/RelatedPosts";
import PostFaq from "@/components/blog/PostFaq";
import ReadingProgress from "@/components/blog/ReadingProgress";
import PostAnalytics from "@/components/blog/PostAnalytics";

import {
    getAllPostSlugs,
    getPostBySlug,
    getRelatedPosts,
    getSiteSettings,
    urlFor,
    urlForOG,
} from "@/lib/sanity";

// Canonical base for share URLs and OG tags. Lives on blog. subdomain in
// production; dev builds still emit these URLs because shares should
// point to the live site, not localhost.
const BLOG_BASE_URL = "https://www.pockitengineers.com";
const ARTICLE_DOM_ID = "post-article";

export const dynamicParams = false;

// ---------------------------------------------------------------------------
// Static params — pre-render every slug at build.
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<
    { readonly slug: string }[]
> {
    const slugs = await getAllPostSlugs();
    return slugs.map((s) => ({ slug: s.current }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type PageParams = Promise<{ readonly slug: string }>;

export async function generateMetadata({
    params,
}: {
    params: PageParams;
}): Promise<Metadata> {
    const { slug } = await params;
    const [post, settings] = await Promise.all([
        getPostBySlug(slug),
        getSiteSettings(),
    ]);
    if (!post) {
        return { title: "Post not found · PockIT Engineers" };
    }

    const title = post.seo?.metaTitle ?? post.title;
    const description =
        post.seo?.metaDescription ??
        post.excerpt ??
        `An article by ${post.author.name} on the PockIT Engineers blog.`;
    const ogSource =
        post.seo?.ogImage?.asset || post.coverImage?.asset
            ? (post.seo?.ogImage ?? post.coverImage)
            : (settings?.defaultOgImage ?? null);
    const ogUrl = ogSource?.asset ? urlForOG(ogSource) : undefined;
    const canonical = `${BLOG_BASE_URL}/blog/${slug}`;

    return {
        title: `${title} · PockIT Engineers`,
        description,
        alternates: { canonical },
        robots: post.seo?.noIndex ? { index: false, follow: false } : undefined,
        openGraph: {
            title,
            description,
            type: "article",
            url: canonical,
            publishedTime: post.publishedAt,
            authors: [post.author.name],
            images: ogUrl ? [{ url: ogUrl, width: 1200, height: 630 }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ogUrl ? [ogUrl] : undefined,
        },
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
    params,
}: {
    params: PageParams;
}) {
    const { slug } = await params;

    const post = await getPostBySlug(slug);
    if (!post) notFound();

    const categoryIds = post.categories.map((c) => c._id);
    const related = await getRelatedPosts(post._id, categoryIds);

    const primaryCategory = post.categories[0];
    const canonicalUrl = `${BLOG_BASE_URL}/blog/${slug}`;
    const coverSrc = post.coverImage?.asset
        ? urlFor(post.coverImage).width(1600).height(900).fit("crop").url()
        : null;

    const crumbs = [
        { label: "Home", href: "https://www.pockitengineers.com" },
        { label: "Blog", href: "/blog" },
        ...(primaryCategory
            ? [
                  {
                      label: primaryCategory.title,
                      href: `/blog/category/${primaryCategory.slug.current}`,
                  },
              ]
            : []),
        { label: post.title },
    ];

    // ---- FAQ JSON-LD (FAQPage schema for Google rich results) ----
    const faqItems = post.seo?.faq;
    const faqJsonLd =
        faqItems && faqItems.length > 0
            ? {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((item) => ({
                      "@type": "Question",
                      name: item.question,
                      acceptedAnswer: {
                          "@type": "Answer",
                          text: item.answer,
                      },
                  })),
              }
            : null;

    return (
        <>
            <ThemeSync />

            {/* FAQPage structured data — only rendered when the post has FAQ items in its SEO fields. */}
            {faqJsonLd ? (
                <script
                    type="application/ld+json"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(faqJsonLd),
                    }}
                />
            ) : null}

            <ReadingProgress articleId={ARTICLE_DOM_ID} />
            <PostAnalytics
                articleId={ARTICLE_DOM_ID}
                post_slug={slug}
                post_category={primaryCategory?.title}
                post_author={post.author.name}
            />

            {/*
                Must be `h-screen` (not `min-h-screen`) so this element is
                the real scroll container. With `min-h-screen` + `overflow-y-auto`,
                <main> grows to fit content, never scrolls internally, and the
                window scrolls instead — which breaks every `position: sticky`
                element inside (notably the left-rail TableOfContents), because
                sticky scopes to the nearest declared scroll container ancestor
                (<main> here) but that container isn't the one actually scrolling.
                See CHANGELOG #016. Pattern matches `src/components/landing/AppShell.tsx`.
            */}
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />

                <article
                    id={ARTICLE_DOM_ID}
                    className="pt-24 sm:pt-28 lg:pt-32 pb-20"
                >
                    {/* Breadcrumb — aligns with the centered body column. */}
                    <div className="mx-auto w-[92%] max-w-[760px] pb-6">
                        <PostBreadcrumb crumbs={crumbs} />
                    </div>

                    {/* Title + meta — centered on the page, same width as
                        the body column so typography alignment is
                        consistent end to end. */}
                    <header className="mx-auto w-[92%] max-w-[760px]">
                        {primaryCategory ? (
                            <span className="inline-flex rounded-full border border-theme-accent/30 bg-theme-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-theme-accent">
                                {primaryCategory.title}
                            </span>
                        ) : null}

                        <h1
                            className="mt-5 text-3xl font-black leading-tight tracking-tight text-theme-text sm:text-4xl lg:text-5xl"
                            style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                        >
                            {post.title}
                        </h1>

                        {post.excerpt ? (
                            <p className="mt-5 text-lg leading-relaxed text-theme-text/75">
                                {post.excerpt}
                            </p>
                        ) : null}

                        <div className="mt-7">
                            <PostMeta
                                author={post.author}
                                publishedAt={post.publishedAt}
                                readingTimeMinutes={post.readingTimeMinutes}
                            />
                        </div>
                    </header>

                    {/* Cover image — matches the body column width, stays
                        centered on the page. */}
                    {coverSrc ? (
                        <div className="mx-auto mt-10 w-[92%] max-w-[760px]">
                            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-theme-border/60 bg-theme-bg2">
                                <Image
                                    src={coverSrc}
                                    alt={post.coverImage?.alt ?? post.title}
                                    fill
                                    priority
                                    sizes="(max-width: 1024px) 92vw, 760px"
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    ) : null}

                    {/* Main grid. Body column is dead-centered on the page
                        by flanking it with a 220px rail (sticky ToC +
                        share) on the left and a matching 220px spacer on
                        the right. On mobile the rail collapses and the
                        body takes the full column. */}
                    <div className="mx-auto mt-10 w-[92%] max-w-[1260px] lg:grid lg:grid-cols-[220px_minmax(0,760px)_220px] lg:justify-center lg:gap-8">
                        <aside className="hidden lg:block">
                            {/* Sticky ToC only. Share buttons used to live
                                here stacked under the ToC, but the combined
                                height frequently exceeded the viewport on
                                laptops, which broke position:sticky (the
                                browser can't pin content taller than the
                                scroll container). Share now lives inline
                                above the body as a horizontal bar on all
                                breakpoints. */}
                            <div className="sticky top-28">
                                <TableOfContents blocks={post.body} />
                            </div>
                        </aside>

                        <div>
                            {/* Horizontal share bar above the body on every
                                breakpoint. */}
                            <div className="mb-8">
                                <ShareBar
                                    target={{
                                        url: canonicalUrl,
                                        title: post.title,
                                    }}
                                    postSlug={slug}
                                />
                            </div>

                            <PostBody blocks={post.body} />

                            {faqItems && faqItems.length > 0 ? (
                                <PostFaq items={faqItems} />
                            ) : null}

                            <AuthorBlock author={post.author} />

                            <RelatedPosts posts={related} />
                        </div>

                        {/* Right-side spacer to balance the left rail so
                            the body reads perfectly centered. */}
                        <div className="hidden lg:block" aria-hidden="true" />
                    </div>
                </article>

                <Footer />
            </main>
        </>
    );
}
