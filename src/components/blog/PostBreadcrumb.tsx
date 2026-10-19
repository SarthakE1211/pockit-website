// ---------------------------------------------------------------------------
// PostBreadcrumb — small navigational strip at the top of a post page.
// Layout: Home → Blog → [primary category, if any] → current post title.
//
// The primary category is the first entry in `post.categories` (already
// ordered by Sanity when editors set it up). If the post has no category
// the segment is simply skipped — we don't inject "Uncategorized".
//
// Rendered as an <nav aria-label="Breadcrumb"> with a real <ol> so screen
// readers announce the hierarchy correctly. The current page is marked
// with `aria-current="page"`.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

import Link from "next/link";

interface BreadcrumbCrumb {
    readonly label: string;
    readonly href?: string;
}

interface PostBreadcrumbProps {
    readonly crumbs: readonly BreadcrumbCrumb[];
}

export default function PostBreadcrumb({ crumbs }: PostBreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="text-xs sm:text-sm">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-theme-text/60">
                {crumbs.map((c, i) => {
                    const isLast = i === crumbs.length - 1;
                    return (
                        <li
                            key={`${c.label}-${i}`}
                            className="flex items-center gap-2"
                        >
                            {c.href && !isLast ? (
                                <Link
                                    href={c.href}
                                    className="transition-colors hover:text-theme-accent"
                                >
                                    {c.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={isLast ? "page" : undefined}
                                    className={
                                        isLast
                                            ? "font-semibold text-theme-text/80 line-clamp-1"
                                            : undefined
                                    }
                                >
                                    {c.label}
                                </span>
                            )}
                            {!isLast ? (
                                <span aria-hidden className="text-theme-text/40">
                                    /
                                </span>
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
