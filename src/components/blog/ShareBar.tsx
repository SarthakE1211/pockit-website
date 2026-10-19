// ---------------------------------------------------------------------------
// ShareBar — horizontal share strip, used above the body on mobile (and
// optionally on desktop as an inline supplement). Shares the click logic
// with ShareRail via the same `buildShareHref` helper; only the layout
// differs.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";

import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import {
    buildShareHref,
    type ShareChannel,
    type ShareTarget,
} from "@/lib/blog/share";
import { ShareIcon } from "./ShareRail";

interface ShareBarProps {
    readonly target: ShareTarget;
    readonly postSlug: string;
    /** Optional caption to the left of the buttons. Defaults to "Share". */
    readonly label?: string;
}

const CHANNELS: readonly { id: ShareChannel; label: string }[] = [
    { id: "whatsapp", label: "Share on WhatsApp" },
    { id: "linkedin", label: "Share on LinkedIn" },
    { id: "twitter", label: "Share on X" },
    { id: "instagram", label: "Copy link for Instagram" },
];

export default function ShareBar({
    target,
    postSlug,
    label = "Share",
}: ShareBarProps) {
    const [copied, setCopied] = useState<boolean>(false);

    function onShareClick(channel: ShareChannel): void {
        trackEvent(AnalyticsEvents.BlogShareClick, {
            channel,
            post_slug: postSlug,
        });

        const href = buildShareHref(channel, target);
        if (href) {
            window.open(href, "_blank", "noopener,noreferrer");
            return;
        }

        if (
            typeof navigator !== "undefined" &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
        ) {
            void navigator.clipboard.writeText(target.url).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2400);
            });
        }
    }

    return (
        <div
            className="relative flex items-center gap-3 rounded-2xl border border-theme-border/60 bg-theme-card/70 px-4 py-3"
            role="group"
            aria-label="Share this post"
        >
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-theme-text/60">
                {label}
            </span>
            <div className="flex items-center gap-2">
                {CHANNELS.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onShareClick(c.id)}
                        aria-label={c.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-theme-border/60 bg-theme-bg text-theme-text/70 transition-all hover:border-theme-accent/60 hover:text-theme-accent"
                    >
                        <ShareIcon channel={c.id} />
                    </button>
                ))}
            </div>
            {copied ? (
                <span
                    role="status"
                    className="absolute -top-9 right-4 whitespace-nowrap rounded-full bg-theme-text px-3 py-1.5 text-xs font-semibold text-theme-bg shadow-lg"
                >
                    Link copied — paste it into Instagram
                </span>
            ) : null}
        </div>
    );
}
