// ---------------------------------------------------------------------------
// ReadingProgress — fixed 3px bar at the top of the viewport, filled
// orange-gradient, shows how far the reader has scrolled through an
// article.
//
// Styling follows PockIT's aesthetic — the same accent token the hero
// uses, plus a soft halo underneath that matches the radial glow on
// `/about` and the landing hero. Deliberately NOT the Stack Dribbble
// thin-gray look.
//
// The progress value is the article body's scrolled distance relative to
// its own height, not the page's. That way the bar reaches 100% when the
// *reader* is at the end of the post, not when the footer is in view.
// We find the article element by ID — the page mounts us with the same
// ref the PostBody uses.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useRef, useState } from "react";

interface ReadingProgressProps {
    /** DOM id of the `<article>` element we're tracking. */
    readonly articleId: string;
}

export default function ReadingProgress({ articleId }: ReadingProgressProps) {
    const [progress, setProgress] = useState<number>(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const article = document.getElementById(articleId);
        if (!article) return;

        // After #016, <main> is h-screen + overflow-y-auto — it's the real
        // scroll container, not the window. We must listen to <main>'s
        // scroll event, not `window`'s. See CHANGELOG #016.1.
        const scrollContainer =
            document.querySelector<HTMLElement>("main") ?? window;

        function compute(): void {
            if (!article) return;
            const rect = article.getBoundingClientRect();
            const viewport = window.innerHeight;

            // Distance scrolled INTO the article, capped 0..articleHeight.
            // rect.top is negative once the top leaves the viewport.
            const totalScrollable = Math.max(rect.height - viewport, 1);
            const scrolled = Math.min(
                Math.max(-rect.top, 0),
                totalScrollable,
            );
            const pct = (scrolled / totalScrollable) * 100;
            setProgress(Math.min(Math.max(pct, 0), 100));
        }

        function onScroll(): void {
            if (rafRef.current !== null) return;
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = null;
                compute();
            });
        }

        compute();
        scrollContainer.addEventListener("scroll", onScroll, {
            passive: true,
        });
        window.addEventListener("resize", onScroll);
        return () => {
            scrollContainer.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, [articleId]);

    return (
        <div
            className="fixed inset-x-0 top-0 z-40 h-[3px] bg-transparent pointer-events-none"
            role="progressbar"
            aria-label="Article reading progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className="h-full origin-left transition-transform duration-100 ease-out"
                style={{
                    width: "100%",
                    transform: `scaleX(${progress / 100})`,
                    background:
                        "linear-gradient(90deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-end, var(--accent-primary))) 100%)",
                    boxShadow:
                        "0 0 12px rgb(var(--accent-primary) / 0.55), 0 0 24px rgb(var(--accent-primary) / 0.25)",
                }}
            />
        </div>
    );
}
