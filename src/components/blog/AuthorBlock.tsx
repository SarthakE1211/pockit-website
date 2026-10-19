// ---------------------------------------------------------------------------
// AuthorBlock — full author card, rendered under the post body.
//
// Shows: avatar, name, role, bio, and social links (LinkedIn / Twitter /
// website) if the author has any. Links out to the author's profile
// page at `/blog/author/[slug]` for follow-on reads (that listing page
// lands in #010).
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

import Image from "next/image";
import Link from "next/link";

import { urlFor } from "@/lib/sanity/image";
import type { Author } from "@/lib/sanity/types";

interface AuthorBlockProps {
    readonly author: Author;
}

export default function AuthorBlock({ author }: AuthorBlockProps) {
    const avatarSrc = author.avatar?.asset
        ? urlFor(author.avatar).width(240).height(240).fit("crop").url()
        : null;

    return (
        <aside
            aria-label={`About ${author.name}`}
            className="my-16 flex flex-col gap-6 rounded-2xl border border-theme-border/60 bg-theme-card/70 p-6 sm:flex-row sm:gap-8 sm:p-8"
        >
            <div className="shrink-0">
                {avatarSrc ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border border-theme-border/60 bg-theme-bg2 sm:h-24 sm:w-24">
                        <Image
                            src={avatarSrc}
                            alt={author.avatar?.alt ?? author.name}
                            fill
                            sizes="(max-width: 640px) 80px, 96px"
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-theme-accent/15 text-2xl font-bold text-theme-accent sm:h-24 sm:w-24">
                        {author.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-accent">
                        Written by
                    </p>
                    <Link
                        href={`/blog/author/${author.slug.current}`}
                        className="mt-1 inline-block text-xl font-bold text-theme-text transition-colors hover:text-theme-accent sm:text-2xl"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {author.name}
                    </Link>
                    {author.role ? (
                        <p className="text-sm text-theme-text/60">
                            {author.role}
                        </p>
                    ) : null}
                </div>

                {author.bio ? (
                    <p className="text-sm leading-relaxed text-theme-text/75 sm:text-base">
                        {author.bio}
                    </p>
                ) : null}

                {author.socials &&
                (author.socials.linkedin ||
                    author.socials.twitter ||
                    author.socials.website) ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                        {author.socials.linkedin ? (
                            <a
                                href={author.socials.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-theme-text/70 underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-accent hover:decoration-theme-accent"
                            >
                                LinkedIn
                            </a>
                        ) : null}
                        {author.socials.twitter ? (
                            <a
                                href={author.socials.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-theme-text/70 underline decoration-theme-border underline-offset-4 transition-colors hover:text-theme-accent hover:decoration-theme-accent"
                            >
                                X / Twitter
                            </a>
                        ) : null}
                        {author.socials.website ? (
                            <a
                                href={author.socials.website}
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
        </aside>
    );
}
