// ---------------------------------------------------------------------------
// /blog/author/[slug] — author profile page. Server component.
//
// Structure:
//   1. Standard BlogHero with "Writer" eyebrow, author name as title, and
//      (if present) the author's bio as subtitle. Visual continuity with
//      /blog and /blog/category/<slug>.
//   2. Author avatar + role + socials panel (reuses the same treatment as
//      AuthorBlock on the post page, but we render it inline at the top so
//      the profile reads like a bio card rather than a footnote).
//   3. Grid of every post this author has written.
//
// generateStaticParams pre-renders every known author at build time.
// `blog:author:<slug>` cache tag handles ISR on edits.
//
// Introduced in CHANGELOG #010.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";

import BlogHero from "@/components/blog/BlogHero";
import PostCard from "@/components/blog/PostCard";
import BlogEmptyState from "@/components/blog/BlogEmptyState";

import {
    getAllAuthorSlugs,
    getAuthorBySlug,
    getPostsByAuthor,
    urlFor,
} from "@/lib/sanity";

const BLOG_BASE_URL = "https://www.pockitengineers.com";

export const dynamicParams = false;

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<
    { readonly slug: string }[]
> {
    const slugs = await getAllAuthorSlugs();
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
    const author = await getAuthorBySlug(slug);
    if (!author) {
        return { title: "Author not found · PockIT Engineers" };
    }

    const title = `${author.name} · PockIT Engineers`;
    const description =
        author.bio ??
        `Articles by ${author.name}${author.role ? `, ${author.role}` : ""} on the PockIT Engineers blog.`;
    const canonical = `${BLOG_BASE_URL}/blog/author/${slug}`;
    const avatarUrl = author.avatar?.asset
        ? urlFor(author.avatar).width(1200).height(1200).fit("crop").url()
        : undefined;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            type: "profile",
            url: canonical,
            images: avatarUrl
                ? [{ url: avatarUrl, width: 1200, height: 1200 }]
                : undefined,
        },
        twitter: {
            card: "summary",
            title,
            description,
            images: avatarUrl ? [avatarUrl] : undefined,
        },
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AuthorPage({
    params,
}: {
    params: PageParams;
}) {
    const { slug } = await params;

    const [author, posts] = await Promise.all([
        getAuthorBySlug(slug),
        getPostsByAuthor(slug),
    ]);

    if (!author) notFound();

    const avatarSrc = author.avatar?.asset
        ? urlFor(author.avatar).width(320).height(320).fit("crop").url()
        : null;

    const socials = author.socials;
    const hasSocials =
        socials &&
        (socials.linkedin || socials.twitter || socials.website);

    return (
        <>
            <ThemeSync />
            {/* h-screen (not min-h-screen) so <main> is the real scroll
                container; matches AppShell + /blog + /blog/[slug].
                See CHANGELOG #016. */}
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />

                <BlogHero
                    eyebrow="Writer"
                    title={author.name}
                    subtitle={author.role}
                />

                {/* Bio card — reads like a profile. Avatar on the left,
                    name/role/bio/socials on the right. Mirrors the
                    AuthorBlock treatment used on post pages, but rendered
                    as the focal element of the listing. */}
                <section className="pt-10 sm:pt-12 lg:pt-14">
                    <div className="mx-auto w-[92%] max-w-[900px]">
                        <div className="flex flex-col gap-6 rounded-2xl border border-theme-border/60 bg-theme-card/70 p-6 sm:flex-row sm:gap-8 sm:p-8">
                            <div className="shrink-0">
                                {avatarSrc ? (
                                    <div className="relative h-24 w-24 overflow-hidden rounded-full border border-theme-border/60 bg-theme-bg2 sm:h-32 sm:w-32">
                                        <Image
                                            src={avatarSrc}
                                            alt={
                                                author.avatar?.alt ?? author.name
                                            }
                                            fill
                                            sizes="(max-width: 640px) 96px, 128px"
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-theme-accent/15 text-3xl font-bold text-theme-accent sm:h-32 sm:w-32 sm:text-4xl">
                                        {author.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-1 flex-col gap-3">
                                {author.bio ? (
                                    <p className="text-sm leading-relaxed text-theme-text/80 sm:text-base">
                                        {author.bio}
                                    </p>
                                ) : (
                                    <p className="text-sm italic text-theme-text/55">
                                        No bio yet.
                                    </p>
                                )}

                                {hasSocials ? (
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                                        {socials.linkedin ? (
                                            <a
                                                href={socials.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-theme-text/70 underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-accent hover:decoration-theme-accent"
                                            >
                                                LinkedIn
                                            </a>
                                        ) : null}
                                        {socials.twitter ? (
                                            <a
                                                href={socials.twitter}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-theme-text/70 underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-accent hover:decoration-theme-accent"
                                            >
                                                X / Twitter
                                            </a>
                                        ) : null}
                                        {socials.website ? (
                                            <a
                                                href={socials.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-theme-text/70 underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-accent hover:decoration-theme-accent"
                                            >
                                                Website
                                            </a>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="pt-12 sm:pt-16 pb-24">
                    <div className="mx-auto w-[92%] max-w-[1200px]">
                        <div className="mb-8 flex items-center justify-between gap-4">
                            <h2
                                className="text-2xl font-bold tracking-tight text-theme-text sm:text-3xl"
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                            >
                                Posts by {author.name}
                                <span className="ml-3 text-sm font-normal text-theme-text/60">
                                    {posts.length}{" "}
                                    {posts.length === 1 ? "post" : "posts"}
                                </span>
                            </h2>
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
                                        surface="author"
                                    />
                                ))}
                            </div>
                        ) : (
                            <BlogEmptyState
                                title="No posts yet"
                                body={`${author.name} hasn't published anything yet. Check back soon.`}
                            />
                        )}
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}
