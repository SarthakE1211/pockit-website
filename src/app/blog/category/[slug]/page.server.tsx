// ---------------------------------------------------------------------------
// /blog/category/[slug] — listing page for every post filed under a single
// category. Server component.
//
// Data flow:
//   1. Fetch the category by slug (for title / description) and the list of
//      posts filed under that category, in parallel.
//   2. If the category doesn't exist in Sanity, 404.
//   3. If the category exists but has no posts yet, render the hero with an
//      empty-state message instead of an empty grid. Still a 200 response so
//      the URL is linkable and crawlable.
//   4. Reuse `BlogHero` for visual continuity with /blog and /blog/author,
//      reuse `PostCard` for the grid.
//
// PARKED on `.server.tsx` — registers on the server/dev build only and is
// EXCLUDED from the static cPanel export. Sanity currently has 0 category
// documents, so generateStaticParams() would return [], which is fatal under
// `output: export`. The sibling blog routes are plain `.tsx` (both targets);
// this one stays gated until ≥1 category is authored, at which point rename it
// to `page.tsx` to fold it into the static export. See CHANGELOG #065 and #075.
//
// Introduced in CHANGELOG #010.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";

import BlogHero from "@/components/blog/BlogHero";
import PostCard from "@/components/blog/PostCard";
import BlogEmptyState from "@/components/blog/BlogEmptyState";

import {
    getAllCategorySlugs,
    getCategoryBySlug,
    getPostsByCategory,
} from "@/lib/sanity";

const BLOG_BASE_URL = "https://www.pockitengineers.com";

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<
    { readonly slug: string }[]
> {
    const slugs = await getAllCategorySlugs();
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
    const category = await getCategoryBySlug(slug);
    if (!category) {
        return { title: "Category not found · PockIT Engineers" };
    }

    const title = `${category.title} · PockIT Engineers`;
    const description =
        category.description ??
        `Articles filed under ${category.title} on the PockIT Engineers blog.`;
    const canonical = `${BLOG_BASE_URL}/blog/category/${slug}`;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            type: "website",
            url: canonical,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CategoryPage({
    params,
}: {
    params: PageParams;
}) {
    const { slug } = await params;

    const [category, posts] = await Promise.all([
        getCategoryBySlug(slug),
        getPostsByCategory(slug),
    ]);

    if (!category) notFound();

    const eyebrow = "Category";
    const subtitle =
        category.description ??
        `Every post on the PockIT Engineers blog filed under ${category.title}.`;

    return (
        <>
            <ThemeSync />
            {/* h-screen (not min-h-screen) so <main> is the real scroll
                container; matches AppShell + /blog + /blog/[slug].
                See CHANGELOG #016. */}
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />

                <BlogHero
                    eyebrow={eyebrow}
                    title={category.title}
                    subtitle={subtitle}
                />

                <section className="pt-10 sm:pt-12 lg:pt-14 pb-24">
                    <div className="mx-auto w-[92%] max-w-[1200px]">
                        <div className="mb-8 flex items-center justify-between gap-4">
                            <p className="text-sm text-theme-text/60">
                                {posts.length} {posts.length === 1 ? "post" : "posts"}
                            </p>
                            <Link
                                href="/blog"
                                className="text-sm font-semibold text-theme-accent transition-colors hover:text-theme-accent-end"
                            >
                                ← All posts
                            </Link>
                        </div>

                        {posts.length > 0 ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {posts.map((post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        surface="category"
                                    />
                                ))}
                            </div>
                        ) : (
                            <BlogEmptyState
                                title="Nothing here yet"
                                body={`Fresh writing under ${category.title} is on the way. Check back soon.`}
                            />
                        )}
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}
