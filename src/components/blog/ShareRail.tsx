// ---------------------------------------------------------------------------
// ShareRail — vertical share column, docked under the ToC in the sticky
// left rail. Desktop only; the mobile breakpoint hides this via parent
// layout and falls back to the horizontal ShareBar.
//
// Each channel button:
//   - Opens the channel's share URL in a new tab (except Instagram).
//   - For Instagram, copies the post URL to the clipboard and shows a
//     transient "Copied" toast, because Instagram has no web share intent
//     (decision locked in CLAUDE.md / #009 plan).
//   - Fires `blog_share_click` to GA4 with `channel` + `post_slug`.
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

interface ShareRailProps {
    readonly target: ShareTarget;
    readonly postSlug: string;
}

const CHANNELS: readonly { id: ShareChannel; label: string }[] = [
    { id: "whatsapp", label: "Share on WhatsApp" },
    { id: "linkedin", label: "Share on LinkedIn" },
    { id: "twitter", label: "Share on X" },
    { id: "instagram", label: "Copy link for Instagram" },
];

export default function ShareRail({ target, postSlug }: ShareRailProps) {
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

        // Instagram path — copy to clipboard.
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
        <div className="relative">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-theme-text/50">
                Share
            </p>
            <div className="flex flex-col gap-2">
                {CHANNELS.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onShareClick(c.id)}
                        aria-label={c.label}
                        className="group flex h-10 w-10 items-center justify-center rounded-full border border-theme-border/70 bg-theme-card/80 text-theme-text/70 transition-all hover:-translate-y-0.5 hover:border-theme-accent/60 hover:text-theme-accent hover:shadow-md"
                    >
                        <ShareIcon channel={c.id} />
                    </button>
                ))}
            </div>
            {copied ? (
                <span
                    role="status"
                    className="absolute left-12 top-12 z-20 whitespace-nowrap rounded-full bg-theme-text px-3 py-1.5 text-xs font-semibold text-theme-bg shadow-lg"
                >
                    Link copied — paste it into Instagram
                </span>
            ) : null}
        </div>
    );
}

interface ShareIconProps {
    readonly channel: ShareChannel;
}

// Inline SVGs keep the component self-contained. Each icon is 18px so the
// hit target stays balanced inside the 40px circular button.
export function ShareIcon({ channel }: ShareIconProps) {
    switch (channel) {
        case "whatsapp":
            return (
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden
                    fill="currentColor"
                >
                    <path d="M20.52 3.48A11.77 11.77 0 0 0 12.04 0C5.53 0 .22 5.3.22 11.83c0 2.08.55 4.13 1.6 5.93L0 24l6.36-1.67a11.78 11.78 0 0 0 5.68 1.45h.01c6.51 0 11.82-5.3 11.82-11.83 0-3.16-1.23-6.12-3.35-8.47ZM12.05 21.4h-.01a9.78 9.78 0 0 1-4.98-1.36l-.36-.21-3.78.99 1.01-3.68-.23-.38a9.8 9.8 0 0 1-1.5-5.19c0-5.42 4.42-9.83 9.86-9.83 2.63 0 5.11 1.02 6.97 2.88a9.78 9.78 0 0 1 2.88 6.96c0 5.42-4.42 9.82-9.86 9.82Zm5.41-7.35c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07a8.23 8.23 0 0 1-2.44-1.51 9.07 9.07 0 0 1-1.68-2.1c-.18-.3-.02-.47.13-.62.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.66-1.6-.91-2.18-.24-.57-.48-.49-.66-.5-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.22 5.1 4.51.71.31 1.27.5 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.17-1.42-.08-.13-.27-.2-.57-.35Z" />
                </svg>
            );
        case "linkedin":
            return (
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden
                    fill="currentColor"
                >
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0Z" />
                </svg>
            );
        case "twitter":
            return (
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden
                    fill="currentColor"
                >
                    <path d="M18.244 2H21.5l-7.49 8.56L22.77 22h-6.86l-5.37-7.02L4.4 22H1.14l8.02-9.17L.96 2h7.03l4.85 6.42L18.244 2Zm-1.2 18.02h1.9L6.99 3.88h-2.03l12.08 16.14Z" />
                </svg>
            );
        case "instagram":
            return (
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
            );
    }
}
