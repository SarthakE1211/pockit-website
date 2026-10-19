// ---------------------------------------------------------------------------
// TableOfContents — sticky left-rail ToC with scroll-spy highlighting.
//
// How it works:
//   1. The server passes in the post's raw Portable Text blocks.
//   2. We walk the blocks once on mount to extract every h2 + h3. Each
//      entry is given the same slugified id the PostBody renderer emits,
//      so the anchor hrefs resolve to real elements.
//   3. An IntersectionObserver tracks which heading is closest to the top
//      of the viewport and the matching ToC entry gets highlighted.
//
// Why client-only?
//   - IntersectionObserver is a browser API. The initial unhighlighted
//     list is fine SSR-side, and the highlight just flips on once the
//     observer boots.
//
// Desktop only — the parent (PostLayout) hides it below lg.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useMemo, useState } from "react";

import { slugifyHeading } from "@/lib/blog/slugify";
import type { PortableTextBlocks } from "@/lib/sanity/types";

interface TocEntry {
    readonly id: string;
    readonly text: string;
    readonly level: 2 | 3;
}

interface TableOfContentsProps {
    readonly blocks: PortableTextBlocks;
}

function extractHeadings(blocks: PortableTextBlocks): TocEntry[] {
    const out: TocEntry[] = [];
    for (const raw of blocks) {
        if (!raw || typeof raw !== "object") continue;
        const block = raw as {
            _type?: string;
            style?: string;
            children?: readonly { _type?: string; text?: string }[];
        };
        if (block._type !== "block") continue;
        if (block.style !== "h2" && block.style !== "h3") continue;

        const text = (block.children ?? [])
            .filter((c) => c._type === "span" && typeof c.text === "string")
            .map((c) => c.text ?? "")
            .join("")
            .trim();
        if (text.length === 0) continue;

        out.push({
            id: slugifyHeading(text),
            text,
            level: block.style === "h2" ? 2 : 3,
        });
    }
    return out;
}

export default function TableOfContents({ blocks }: TableOfContentsProps) {
    const entries = useMemo(() => extractHeadings(blocks), [blocks]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (entries.length === 0) return;

        // After #016, <main> is h-screen + overflow-y-auto, making it the
        // real scroll container (not the window). The IntersectionObserver
        // must use <main> as its `root` so it fires on <main>'s internal
        // scroll events. With `root: null` (viewport), the observer never
        // fires because the document doesn't scroll — <main> does.
        const scrollContainer =
            document.querySelector<HTMLElement>("main") ?? null;

        const observer = new IntersectionObserver(
            (records) => {
                const visible = records
                    .filter((r) => r.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                if (visible.length > 0) {
                    setActiveId(visible[0].target.id);
                }
            },
            {
                root: scrollContainer,
                rootMargin: "-96px 0px -70% 0px",
                threshold: 0,
            },
        );

        const els: Element[] = [];
        for (const entry of entries) {
            const el = document.getElementById(entry.id);
            if (el) {
                observer.observe(el);
                els.push(el);
            }
        }

        // Seed the first entry so we're not blank before the user scrolls.
        setActiveId((prev) => prev ?? entries[0]?.id ?? null);

        return () => {
            for (const el of els) observer.unobserve(el);
            observer.disconnect();
        };
    }, [entries]);

    if (entries.length === 0) return null;

    /**
     * Handle ToC link clicks manually. After #016, <main> is the scroll
     * container (not the window). The browser's default fragment navigation
     * scrolls the *document*, which no longer scrolls — so hash-link clicks
     * would appear to do nothing. We intercept, find the heading, and call
     * `scrollIntoView` which scrolls the nearest scrollable ancestor
     * (<main>). See CHANGELOG #016.1.
     */
    function handleTocClick(
        e: React.MouseEvent<HTMLAnchorElement>,
        headingId: string,
    ): void {
        e.preventDefault();
        const target = document.getElementById(headingId);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            // Update the URL hash without triggering default scroll.
            window.history.pushState(null, "", `#${headingId}`);
        }
    }

    return (
        <nav aria-label="Table of contents" className="text-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-theme-text/50">
                On this page
            </p>
            <ol className="space-y-1.5 border-l border-theme-border/60">
                {entries.map((e) => {
                    const isActive = activeId === e.id;
                    return (
                        <li
                            key={e.id}
                            className={e.level === 3 ? "pl-3" : undefined}
                        >
                            <a
                                href={`#${e.id}`}
                                onClick={(ev) => handleTocClick(ev, e.id)}
                                className={
                                    isActive
                                        ? "-ml-px block border-l-2 border-theme-accent pl-3 text-theme-accent transition-colors"
                                        : "-ml-px block border-l-2 border-transparent pl-3 text-theme-text/65 transition-colors hover:text-theme-accent"
                                }
                            >
                                {e.text}
                            </a>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
