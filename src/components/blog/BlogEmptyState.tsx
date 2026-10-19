// ---------------------------------------------------------------------------
// BlogEmptyState — fallback shown when the current filter + search combo
// yields zero posts. Also used on /blog itself before any posts are
// published (day-one state).
//
// Pure server component — no interactivity, no analytics.
//
// Introduced in CHANGELOG #008.
// ---------------------------------------------------------------------------

interface BlogEmptyStateProps {
    readonly title: string;
    readonly body?: string;
}

export default function BlogEmptyState({
    title,
    body,
}: BlogEmptyStateProps) {
    return (
        <div className="mx-auto my-12 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-dashed border-theme-border bg-theme-bg2/50 px-8 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-theme-accent/10 text-theme-accent">
                <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            </div>
            <h3 className="text-lg font-bold text-theme-text">{title}</h3>
            {body ? (
                <p className="text-sm leading-relaxed text-theme-text/70">
                    {body}
                </p>
            ) : null}
        </div>
    );
}
