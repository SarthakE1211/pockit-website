// ---------------------------------------------------------------------------
// /blog — the index page. Server component: fetches every dataset we need
// from Sanity in parallel, then hands them to the client container
// (BlogIndexInteractive) which owns the filter + search state.
//
// Plain `.tsx` route — registers on BOTH build targets: it renders on the
// local dev server (BUILD_TARGET=server) for live preview AND is prerendered
// into the static cPanel export (BUILD_TARGET=static) at build time from
// Sanity. Single-host static model — see CHANGELOG #065 and #075.
//
// Data flow:
//   1. Parallel fetches: featured post, all posts, all categories, search
//      index, site settings. Each fetcher wires its own Next ISR tag so a
//      Sanity webhook (landing in #014) can invalidate precisely.
//   2. Featured post is rendered separately above the grid. It's also
//      filtered OUT of the grid's post list so we don't show the same card
//      twice.
//   3. The client container receives the filtered grid list + categories +
//      search index and does all interactivity in-browser (≤ ~200-post
//      scale, per the Project preferences decision).
//
// Introduced in CHANGELOG #008.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";

import BlogHero from "@/components/blog/BlogHero";
import FeaturedPost from "@/components/blog/FeaturedPost";
import BlogIndexInteractive from "@/components/blog/BlogIndexInteractive";

import {
    getAllCategories,
    getAllPosts,
    getFeaturedPost,
    getSearchIndex,
    getSiteSettings,
    type Category,
} from "@/lib/sanity";

const DEFAULT_EYEBROW = "Blog";
const DEFAULT_TITLE = "Blogs, Tech Hacks & More";
const DEFAULT_SUBTITLE =
    "Tips from our Leaders, field notes from our technician network, and how we think about on-demand IT for Indian households.";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const title = settings?.blogHeroTitle ?? DEFAULT_TITLE;
    const description = settings?.blogHeroSubtitle ?? DEFAULT_SUBTITLE;

    return {
        title: `${title} · PockIT Engineers`,
        description,
        // Self-referencing canonical. Without this, the blog index inherits the
        // root layout's `alternates.canonical: "/"`, which wrongly points /blog
        // at the homepage and tells crawlers the two are duplicates.
        alternates: {
            canonical: "https://www.pockitengineers.com/blog",
        },
        openGraph: {
            title,
            description,
            type: "website",
            url: "https://www.pockitengineers.com/blog",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

export default async function BlogIndexPage() {
    const [featured, posts, categories, searchIndex, settings] =
        await Promise.all([
            getFeaturedPost(),
            getAllPosts(),
            getAllCategories(),
            getSearchIndex(),
            getSiteSettings(),
        ]);

    // Don't show the featured post twice — it renders as its own hero card
    // above the grid, so strip it from the grid's post list.
    const gridPosts = featured
        ? posts.filter((p) => p._id !== featured._id)
        : posts;

    // Merge canonical categories (from getAllCategories) with any categories
    // actually referenced on published posts that aren't in the canonical
    // set. Self-heals the chip bar when editors tag posts with a category
    // whose own document is unpublished/missing — we never render an empty
    // chip row if there are posts with category references. Canonical
    // entries keep their Sanity `order` sort; fallbacks are appended
    // alphabetically afterwards.
    //
    // Introduced in CHANGELOG #016.
    const canonicalCategoryIds = new Set(categories.map((c) => c._id));
    const fallbackCategoriesById = new Map<string, Category>();
    for (const post of posts) {
        for (const cat of post.categories) {
            if (canonicalCategoryIds.has(cat._id)) continue;
            if (fallbackCategoriesById.has(cat._id)) continue;
            fallbackCategoriesById.set(cat._id, cat);
        }
    }
    const fallbackCategories = Array.from(
        fallbackCategoriesById.values(),
    ).sort((a, b) => a.title.localeCompare(b.title));
    const mergedCategories: readonly Category[] = [
        ...categories,
        ...fallbackCategories,
    ];

    return (
        <>
            <ThemeSync />
            {/* h-screen (not min-h-screen) so <main> is the real scroll
                container; matches AppShell + /blog/[slug]. See CHANGELOG #016. */}
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />

                <BlogHero
                    eyebrow={settings?.blogHeroEyebrow ?? DEFAULT_EYEBROW}
                    title={settings?.blogHeroTitle ?? DEFAULT_TITLE}
                    subtitle={settings?.blogHeroSubtitle ?? DEFAULT_SUBTITLE}
                />

                {featured ? (
                    <section className="pt-10 sm:pt-12 lg:pt-14">
                        <FeaturedPost post={featured} />
                    </section>
                ) : null}

                <BlogIndexInteractive
                    posts={gridPosts}
                    categories={mergedCategories}
                    searchIndex={searchIndex}
                />

                <Footer />
            </main>
        </>
    );
}
