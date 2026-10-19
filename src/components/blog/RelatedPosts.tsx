// ---------------------------------------------------------------------------
// RelatedPosts — shows up to three cards that share a category with the
// current post. Hidden entirely when no related posts exist.
//
// The query runs on the server (see getRelatedPosts). We just receive
// `posts` already filtered down to the 3-max set and render.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

import type { PostCardData } from "@/lib/sanity/types";
import PostCard from "./PostCard";

interface RelatedPostsProps {
    readonly posts: readonly PostCardData[];
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
    if (posts.length === 0) return null;

    return (
        <section
            aria-labelledby="related-posts-heading"
            className="my-16 border-t border-theme-border/50 pt-12"
        >
            <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-accent">
                        Keep reading
                    </p>
                    <h2
                        id="related-posts-heading"
                        className="mt-2 text-2xl font-bold tracking-tight text-theme-text sm:text-3xl"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        Related posts
                    </h2>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                    <PostCard key={post._id} post={post} surface="related" />
                ))}
            </div>
        </section>
    );
}
