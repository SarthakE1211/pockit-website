"use client";

// ---------------------------------------------------------------------------
// ReadMoreContent — the collapse shell for long-form on-page SEO copy.
//
// Used by Sanity landing pages, fed by `landingPage.seoContent` Portable Text
// (CHANGELOG #087). It briefly powered a home-page block too (#088), which was
// removed in #092 when the copy went back to /macbook-repair-mumbai — the
// component stays generic so a second surface can be added without a rewrite.
//
// It owns ONLY the collapse behaviour and the shared typography scale; the
// caller owns the copy.
//
// The children are ALWAYS rendered into the DOM — the collapse is a visual
// height clamp, never a conditional render. Crawlers and answer engines
// therefore index every word, while a visitor scanning towards the next CTA
// isn't made to scroll past a wall of prose.
//
// Layout: the toggle sits ABOVE the copy (CHANGELOG #090), styled as the same
// accent pill as SectionPill, so a collapsed block reads as a quiet chip
// rather than a loud CTA competing with the real buttons around it.
//
// `collapsedPx` defaults to 0: nothing shows until the reader opens the block
// (the house preference — see CHANGELOG #089). Pass a positive value to leave
// a teaser visible, in which case a fade is drawn over the cut-off edge.
// ---------------------------------------------------------------------------

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * Shared typography classes, applied by the landing-page Portable Text
 * serializers in LandingPageView. Exported so any future non-Portable-Text
 * caller can render through the same scale.
 *
 * These are explicit rather than Tailwind `prose` classes because
 * @tailwindcss/typography is NOT installed in this project — see
 * tailwind.config.ts (`plugins: []`), which makes `prose` a silent no-op.
 */
export const SEO_PROSE = {
    h2: "mt-10 first:mt-0 mb-4 text-2xl sm:text-3xl font-black tracking-tight text-theme-text",
    h3: "mt-9 first:mt-0 mb-3 text-lg sm:text-xl font-bold tracking-tight text-theme-text",
    p: "my-4 first:mt-0 text-[15px] sm:text-[16px] leading-[1.85] text-theme-text/75",
    ul: "my-5 space-y-2.5 list-none pl-0",
    li: "relative pl-7 text-[15px] sm:text-[16px] leading-[1.8] text-theme-text/75",
    strong: "font-semibold text-theme-text",
} as const;

/** Heading/body font, matched to the rest of the site. */
export const SEO_HEADING_FONT = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
} as const;

interface ReadMoreContentProps {
    readonly children: ReactNode;
    /**
     * Height of the clamped state, in px. Defaults to 0 — fully hidden, only
     * the pill shows. A positive value leaves that many px visible as a
     * teaser and draws a fade over the cut-off edge.
     */
    readonly collapsedPx?: number;
    /** Fired once each time the reader opens the block. */
    readonly onExpand?: () => void;
    /**
     * Token the teaser fade resolves to. Must match the background the block
     * sits on, or the gradient shows a seam. Defaults to the page background.
     * Unused when `collapsedPx` is 0 — there is no cut-off edge to soften.
     */
    readonly fadeTo?: string;
}

export default function ReadMoreContent({
    children,
    collapsedPx = 0,
    onExpand,
    fadeTo = "rgb(var(--bg-primary))",
}: ReadMoreContentProps) {
    const [expanded, setExpanded] = useState(false);
    const regionId = useId();

    return (
        <>
            <div className="flex justify-center">
                {/* Same accent pill as SectionPill — deliberately quiet, so it
                    doesn't read as a primary CTA next to "Book a Service". */}
                <motion.button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={regionId}
                    onClick={() => {
                        const next = !expanded;
                        setExpanded(next);
                        if (next) onExpand?.();
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 border border-theme-accent/20 bg-theme-accent/[0.06] hover:bg-theme-accent/[0.12] hover:border-theme-accent/35 transition-colors duration-200"
                >
                    <span className="text-[12px] font-semibold text-theme-accent tracking-wide">
                        {expanded ? "Read Less" : "Read More"}
                    </span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-theme-accent transition-transform duration-300 ${
                            expanded ? "rotate-180" : ""
                        }`}
                    />
                </motion.button>
            </div>

            <div className="relative">
                <motion.div
                    id={regionId}
                    initial={false}
                    animate={{ height: expanded ? "auto" : collapsedPx }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                >
                    {/* Padding lives INSIDE the animated box so the gap between
                        pill and copy collapses along with the copy. */}
                    <div className="pt-8">{children}</div>
                </motion.div>

                {!expanded && collapsedPx > 0 ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                        style={{
                            background: `linear-gradient(to bottom, transparent, ${fadeTo})`,
                        }}
                    />
                ) : null}
            </div>
        </>
    );
}
