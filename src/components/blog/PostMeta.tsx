// ---------------------------------------------------------------------------
// PostMeta — the small byline row that sits under the post title.
// Shows: author avatar (if present) + author name + role + published date
// + reading time. Compact, single-line on desktop; wraps on mobile.
//
// The full author card (bio + socials) is rendered separately by
// AuthorBlock at the bottom of the post — this component is only the
// top-of-post signature.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

import Image from "next/image";

import { urlFor } from "@/lib/sanity/image";
import type { Author } from "@/lib/sanity/types";

interface PostMetaProps {
    readonly author: Pick<Author, "name" | "role" | "avatar">;
    readonly publishedAt: string;
    readonly readingTimeMinutes?: number;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function PostMeta({
    author,
    publishedAt,
    readingTimeMinutes,
}: PostMetaProps) {
    const avatarSrc = author.avatar?.asset
        ? urlFor(author.avatar).width(96).height(96).fit("crop").url()
        : null;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-theme-text/70">
            <div className="flex items-center gap-3">
                {avatarSrc ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-theme-border/60 bg-theme-bg2">
                        <Image
                            src={avatarSrc}
                            alt={author.avatar?.alt ?? author.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-theme-accent/15 text-sm font-bold text-theme-accent">
                        {author.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex flex-col leading-tight">
                    <span className="font-semibold text-theme-text">
                        {author.name}
                    </span>
                    {author.role ? (
                        <span className="text-xs text-theme-text/60">
                            {author.role}
                        </span>
                    ) : null}
                </div>
            </div>

            <span aria-hidden className="h-4 w-px bg-theme-border/70" />

            <span>{formatDate(publishedAt)}</span>

            {readingTimeMinutes ? (
                <>
                    <span aria-hidden>·</span>
                    <span>{readingTimeMinutes} min read</span>
                </>
            ) : null}
        </div>
    );
}
