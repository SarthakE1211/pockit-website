// ---------------------------------------------------------------------------
// Share URL builders.
//
// Each channel takes a post URL + title and returns either:
//   - a string href that opens the channel's native share composer, or
//   - `null` if the channel has no web share endpoint (Instagram — see
//     ShareRail/ShareBar for the copy-to-clipboard fallback).
//
// Why keep these centralized? The share bar (horizontal, mobile) and the
// share rail (vertical, desktop) both render the same set of channels —
// this module is the one source of truth so the hrefs stay in lockstep.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

export type ShareChannel = "whatsapp" | "linkedin" | "twitter" | "instagram";

export interface ShareTarget {
    readonly url: string;
    readonly title: string;
}

export function buildShareHref(
    channel: ShareChannel,
    target: ShareTarget,
): string | null {
    const encodedUrl = encodeURIComponent(target.url);
    const encodedText = encodeURIComponent(target.title);

    switch (channel) {
        case "whatsapp":
            // `wa.me` deep links open WhatsApp on mobile and web.whatsapp.com
            // in a desktop browser. The pre-filled text carries the URL.
            return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        case "linkedin":
            return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        case "twitter":
            // We continue to call this "twitter" internally even though the
            // brand is X — the intent URL is stable at either host. Using
            // x.com to future-proof.
            return `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        case "instagram":
            // Instagram blocks inbound share intents from the web. The
            // button copies the link and opens IG; see ShareRail/ShareBar.
            return null;
    }
}
