// ---------------------------------------------------------------------------
// Meta (Facebook) Pixel — STANDALONE from Google Analytics.
//
// Deliberately decoupled from `src/lib/analytics.ts` (GA4 / `trackEvent`)
// and from GTM. The pixel fires exactly:
//
//   • a PageView on the initial load AND on every client-side navigation —
//     both fired from MetaPixelRouteTracker via trackMetaPageView() (a
//     STANDARD event). The base snippet in app/layout.tsx only fbq('init')s;
//     it no longer fires its own PageView, so PageView has a single source
//     and can carry a shared event_id for browser↔server dedup (#073); and
//   • three named CUSTOM conversion events, and nothing else:
//
//        trackWhatsAppClick()  → "WhatsAppContact"
//        trackPlayStoreClick() → "PlayStoreClick"
//        trackAppStoreClick()  → "AppStoreClick"
//
// These use distinct, self-describing names so each shows up as its own
// line in Meta Pixel Helper / Events Manager. Because they are NOT in
// Meta's standard-event vocabulary (Contact, Lead, …), they MUST be sent
// with fbq('trackCustom', …) — sending a custom name through 'track'
// makes Meta flag it as an unrecognised standard event. In Ads Manager
// you target them as "custom conversions".
//
// Call these helpers directly from the button's onClick. They do NOT go
// through `trackEvent`, so Meta and GA stay independent — changing one
// never touches the other. See CHANGELOG #052.
//
// Each helper is a no-op until the pixel script has loaded (and on the
// server), so it's always safe to call.
// ---------------------------------------------------------------------------

declare global {
    interface Window {
        // Meta Pixel global — installed by the base snippet in app/layout.tsx.
        fbq?: (...args: unknown[]) => void;
    }
}

type MetaParams = Record<string, string | number | boolean | undefined>;

/**
 * Meta Pixel / dataset id. Single source of truth — `app/layout.tsx` imports
 * this for the base snippet rather than repeating the literal, and Advanced
 * Matching below needs it to re-`init` the pixel. An empty string disables the
 * pixel for that build (e.g. staging). See docs/ANALYTICS.md.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1274218051363697";

/**
 * Personal details the visitor typed into a form. CHANGELOG #084, extended in
 * #086 to also feed browser-side Advanced Matching.
 *
 * These reach Meta through BOTH halves of the event, hashed on each side:
 *
 *   • Browser — `fbq('init', id, {fn, ln, ph, ct, country})`, which is Meta's
 *     sanctioned mechanism for sending personal data from the page. The Pixel
 *     SHA-256-hashes each value itself before anything leaves the browser, so
 *     nothing travels in cleartext. Events Manager then lists them under
 *     "Advanced matching parameters" on the event.
 *   • Server — the CAPI relay hashes them into `user_data` (see route.server.ts).
 *
 * They must NEVER go into `custom_data` instead: Meta's Business Tools Terms
 * forbid PII in event parameters, and Meta actively detects and drops it.
 * `custom_data` is for non-identifying business context (skills, page, device).
 *
 * Match quality is what makes a conversion attributable to an ad, so a form
 * submission — where the visitor hands us a real name and phone number — is
 * the one place on this site worth sending.
 */
type MetaUserData = {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    /** 2-letter ISO country, lower-cased by the relay. */
    country?: string;
};

/**
 * Promote a bare 10-digit Indian mobile to country-code form.
 *
 * This MUST mirror `hashPhone` in the CAPI route. The Pixel hashes the number
 * in the browser and the relay hashes it on the server; if the two normalise
 * differently, Meta receives two unrelated digests for one person and the
 * match is lost. The server rule is idempotent, so a number normalised here
 * passes through it unchanged.
 */
function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "").replace(/^0+/, "");
    return digits.length === 10 ? "91" + digits : digits;
}

/**
 * Attach Advanced Matching to the Pixel for subsequent events. Re-`init`-ing
 * with a user-data object is how Meta documents this; it is additive, not a
 * reset, and applies to every event fired afterwards in the page session.
 *
 * Values are passed RAW — the Pixel normalises and hashes them itself, and its
 * normalisation is the authoritative one. The single exception is the phone
 * number, where we pre-apply the country code so browser and server agree.
 */
function applyAdvancedMatching(userData: MetaUserData): void {
    if (typeof window.fbq !== "function" || !META_PIXEL_ID) return;

    const matching: Record<string, string> = {};
    if (userData.firstName) matching.fn = userData.firstName;
    if (userData.lastName) matching.ln = userData.lastName;
    if (userData.phone) matching.ph = normalizePhone(userData.phone);
    if (userData.city) matching.ct = userData.city;
    if (userData.country) matching.country = userData.country;

    if (Object.keys(matching).length === 0) return;
    window.fbq("init", META_PIXEL_ID, matching);
}

// Resolve the visitor's OS / device family from the user-agent string.
// UA parsing isn't bullet-proof (UAs can be spoofed) but it's the most
// reliable cross-browser option — `navigator.userAgentData` isn't
// supported in Safari/Firefox. Returns one of:
//   "windows" | "macos" | "iphone" | "ipad" | "android_phone"
//   | "android_tablet" | "linux" | "unknown"
function getPlatform(): string {
    const ua = navigator.userAgent;
    const touch = navigator.maxTouchPoints ?? 0;

    if (/iPhone/i.test(ua)) return "iphone";
    if (/iPad/i.test(ua)) return "ipad";
    // iPadOS 13+ reports as "Macintosh" in desktop-class Safari; a Mac with
    // a touch screen doesn't exist, so Macintosh + touch points means iPad.
    if (/Macintosh/i.test(ua) && touch > 1) return "ipad";
    if (/Android/i.test(ua)) {
        // Android tablets omit "Mobile" from the UA; phones include it.
        return /Mobile/i.test(ua) ? "android_phone" : "android_tablet";
    }
    if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
    if (/Windows/i.test(ua)) return "windows";
    if (/Linux/i.test(ua)) return "linux";
    return "unknown";
}

// Auto-context attached to every custom event. All values are derived
// client-side at click time — non-PII and policy-safe. Empty/absent values
// (e.g. no referrer, no UTM tags) are omitted rather than sent blank, so
// the payload stays clean. See CHANGELOG #057, #058.
//
//   click_time   — ISO-8601 moment of the interaction
//   page_path    — pathname the click happened on (landing-page attribution)
//   device_type  — "mobile" | "desktop" (viewport-based, matches app's 768px)
//   platform     — OS / device family (windows/macos/iphone/ipad/android_*)
//   referrer     — document.referrer (omitted for direct traffic)
//   utm_source / utm_medium / utm_campaign — from the URL, ties the
//                  conversion back to the ad/campaign that drove it
function buildEventContext(): MetaParams {
    const ctx: MetaParams = {
        click_time: new Date().toISOString(),
        page_path: window.location.pathname,
        device_type: window.innerWidth < 768 ? "mobile" : "desktop",
        platform: getPlatform(),
    };

    if (document.referrer) ctx.referrer = document.referrer;

    const query = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
        const value = query.get(key);
        if (value) ctx[key] = value;
    }

    return ctx;
}

// ---------------------------------------------------------------------------
// Conversions API (server-side) — CHANGELOG #072.
//
// Each custom event is sent BOTH ways: browser (Pixel) and server (CAPI),
// tagged with the SAME `event_id` so Meta deduplicates them into one. CAPI
// recovers conversions the browser Pixel loses to ad blockers / iOS privacy
// and raises event match quality.
//
// The client half here just POSTs the event to our own Next.js route
// (`/api/meta/capi`, a `route.server.ts` handler); that route holds the
// secret access token and forwards to Meta's Graph API.
//
// The endpoint DEFAULTS to the same-origin `/api/meta/capi`, so on the
// Node/server (Vercel) deployment CAPI works with NO env var — you only
// need the server-side `META_CAPI_ACCESS_TOKEN`. Override the path (or
// point at a different origin) with `NEXT_PUBLIC_META_CAPI_ENDPOINT`, or
// set it to an empty string to disable the client POST entirely (useful
// on the static cPanel build, where the route doesn't exist — the POST
// would 404 harmlessly, but empty disables it cleanly).
// ---------------------------------------------------------------------------
const CAPI_ENDPOINT = process.env.NEXT_PUBLIC_META_CAPI_ENDPOINT ?? "/api/meta/capi";

function readCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : undefined;
}

// ---------------------------------------------------------------------------
// First-party Meta identifiers (`_fbp` / `_fbc`) — CHANGELOG #083.
//
// Events Manager → Diagnostics was reporting "Send missing user data
// parameters" on 44% of events (PageView, WhatsAppContact, PlayStoreClick).
// Root cause: we only ever *read* `_fbp`/`_fbc`, and those cookies are
// written by `fbevents.js`, which (a) loads async — so the first PageView
// can fire before it lands — and (b) never loads at all for the large share
// of visitors running an ad blocker or iOS/ITP. Those are exactly the
// visitors CAPI exists to recover, and we were sending their events with
// nothing usable in `user_data`.
//
// Fix: mint the cookies ourselves when they're absent, synchronously, before
// any send. This removes the race rather than papering over it with a timer,
// and it works even when the Pixel is blocked outright. `fbevents.js` reads
// an existing `_fbp` at init and adopts it instead of generating its own, so
// the browser and server halves stay on the SAME identifier either way.
//
// Formats are Meta's (docs: "fbp and fbc parameters"):
//   _fbp = fb.<subdomainIndex>.<creationTime>.<random>
//   _fbc = fb.<subdomainIndex>.<creationTime>.<fbclid>
// subdomainIndex is 1 for a cookie set on the registrable domain.
// ---------------------------------------------------------------------------
const FB_COOKIE_MAX_AGE_DAYS = 90; // matches Meta's click-attribution window

// Registrable domain, so the cookie is shared across `www.` and the apex the
// way fbevents.js sets it. Returns undefined for localhost / bare hostnames
// and raw IPs, where a `domain` attribute is invalid and must be omitted.
function cookieDomain(): string | undefined {
    const host = window.location.hostname;
    if (/^[\d.]+$/.test(host) || !host.includes(".")) return undefined;
    return "." + host.split(".").slice(-2).join(".");
}

function writeCookie(name: string, value: string): void {
    const attributes =
        `; max-age=${FB_COOKIE_MAX_AGE_DAYS * 86400}` +
        `; path=/` +
        `; SameSite=Lax` +
        (window.location.protocol === "https:" ? "; Secure" : "");

    const domain = cookieDomain();
    if (domain) {
        document.cookie = `${name}=${encodeURIComponent(value)}; domain=${domain}${attributes}`;
        // A domain that is a public suffix (`.vercel.app` on a preview build,
        // `.co.uk`-style hosts) is rejected outright and silently. Fall through
        // to a host-only cookie so the identifier still persists there.
        if (readCookie(name)) return;
    }

    document.cookie = `${name}=${encodeURIComponent(value)}${attributes}`;
}

/**
 * Ensure `_fbp` and `_fbc` exist, then return them. Called immediately before
 * every send so we always read the freshest value — whichever of us or
 * `fbevents.js` won the race to create it.
 *
 * `_fbc` is (re)written whenever the URL carries an `fbclid`, mirroring the
 * Pixel's own behaviour: a new ad click must overwrite a stale click id or the
 * conversion gets attributed to the wrong campaign. For an ad-blocked visitor
 * arriving from an ad this is the ONLY identifier obtainable, which makes it
 * the highest-value part of this fix.
 */
function resolveFbCookies(): { fbp?: string; fbc?: string } {
    const now = Date.now();

    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) {
        const existing = readCookie("_fbc");
        // Only rewrite when this is a different click than the stored one.
        if (!existing || !existing.endsWith(`.${fbclid}`)) {
            writeCookie("_fbc", `fb.1.${now}.${fbclid}`);
        }
    }

    if (!readCookie("_fbp")) {
        // Meta's own generator uses a 10-digit random component.
        const random = Math.floor(Math.random() * 1e10);
        writeCookie("_fbp", `fb.1.${now}.${random}`);
    }

    return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}

function newEventId(): string {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Fire-and-forget POST to our CAPI relay. Never throws into the click path;
// `keepalive` lets it complete even if the click navigates away.
function sendToCapi(
    eventName: string,
    eventId: string,
    customData: MetaParams,
    userData?: MetaUserData,
): void {
    if (!CAPI_ENDPOINT) return;
    try {
        // Mints `_fbp`/`_fbc` if the Pixel hasn't (or can't) — see #083.
        const { fbp, fbc } = resolveFbCookies();
        void fetch(CAPI_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                event_name: eventName,
                event_id: eventId,
                event_source_url: window.location.href,
                custom_data: customData,
                fbp,
                fbc,
                // Hashed server-side before forwarding — see MetaUserData.
                first_name: userData?.firstName,
                last_name: userData?.lastName,
                phone: userData?.phone,
                city: userData?.city,
                country: userData?.country,
            }),
            keepalive: true,
            // Cross-origin beacon to the Vercel relay: be explicit about CORS
            // and don't ship cookies to that origin — the only match signals
            // we need (_fbp/_fbc) already travel in the body above.
            mode: "cors",
            credentials: "omit",
        }).catch(() => {});
    } catch {
        /* never break the click over analytics */
    }
}

// The single choke point for every event we send to Meta. Generates ONE
// `event_id` and uses it for BOTH the browser Pixel (via `eventID`) and the
// server-side CAPI POST, so Meta deduplicates the two copies into one event.
// `method` is "track" for Meta STANDARD events (PageView, Lead, …) and
// "trackCustom" for our custom-named conversions. Nothing outside this module
// should call `fbq(...)` for an event directly — routing everything through
// here is what guarantees dedup can never silently regress (see CHANGELOG
// #072 for the custom events; #073 extended it to PageView).
function trackDeduplicated(
    method: "track" | "trackCustom",
    event: string,
    customData: MetaParams,
    userData?: MetaUserData,
): void {
    if (typeof window === "undefined") return;

    const eventId = newEventId();

    if (typeof window.fbq === "function") {
        // Advanced Matching must be attached BEFORE the track call to apply to
        // it — the Pixel hashes these itself (#086). `userData` still never
        // enters `customData`: Meta forbids PII in event parameters.
        if (userData) applyAdvancedMatching(userData);
        window.fbq(method, event, customData, { eventID: eventId });
    }

    // Sent even if the Pixel was blocked — that's the whole point of CAPI.
    // The SAME eventId travels to the server so Meta can dedupe the pair.
    sendToCapi(event, eventId, customData, userData);
}

// Meta CUSTOM event (any name we choose) — fbq('trackCustom', …). Each
// event is enriched with buildEventContext() (timestamp, page, device,
// referrer, UTM); caller-supplied `params` (e.g. `location`) merge on top
// and win on key collisions.
function trackCustom(event: string, params?: MetaParams, userData?: MetaUserData): void {
    trackDeduplicated(
        "trackCustom",
        event,
        { ...buildEventContext(), ...(params ?? {}) },
        userData,
    );
}

/**
 * Meta PageView (STANDARD event). Fired once on the initial load AND on every
 * client-side navigation by <MetaPixelRouteTracker /> — this is now the SINGLE
 * source of every PageView (the base snippet in app/layout.tsx no longer fires
 * one). Sent through both the browser Pixel and CAPI under a shared event_id
 * so Meta deduplicates the browser + server copies instead of double-counting
 * them (CHANGELOG #073).
 *
 * Sent with an EMPTY custom_data payload: PageView is a vanilla standard event
 * and doesn't need the click-context enrichment the custom conversions carry.
 */
export function trackMetaPageView(): void {
    trackDeduplicated("track", "PageView", {});
}

/**
 * WhatsApp chat button pressed → custom `WhatsAppContact` event.
 * `location` (e.g. "header", "hero", "landing-hero") keeps the click
 * sources distinguishable in Ads Manager without splitting the event.
 */
export function trackWhatsAppClick(location?: string): void {
    trackCustom("WhatsAppContact", { ...(location ? { location } : {}) });
}

/** Google Play Store badge pressed → custom `PlayStoreClick` event. */
export function trackPlayStoreClick(location?: string): void {
    trackCustom("PlayStoreClick", { ...(location ? { location } : {}) });
}

/** Apple App Store badge pressed → custom `AppStoreClick` event. */
export function trackAppStoreClick(location?: string): void {
    trackCustom("AppStoreClick", { ...(location ? { location } : {}) });
}

/**
 * Technician application form SUBMITTED SUCCESSFULLY → custom
 * `technician_apply_submit` event. CHANGELOG #084, renamed in #085.
 *
 * Fired from `TechnicianForm`'s submit handler *after* the relay returns OK —
 * never on the button press. A click on "Apply Now" is not a conversion: the
 * form can still fail validation or the relay can error, and counting those
 * would inflate the conversion rate Ads Manager optimises against.
 *
 * NAME: intentionally identical to the GA4 event `AnalyticsEvents
 * .TechnicianApplySubmit` ("technician_apply_submit" in src/lib/analytics.ts),
 * so one submission reads the same in Events Manager and GA4. The string is
 * duplicated rather than imported on purpose — this module is deliberately
 * decoupled from analytics.ts (see the header) so a change to GA can never
 * alter what Meta receives. If you rename it in one place, rename it in both.
 * Note this breaks the PascalCase convention of the three older Meta events;
 * that's an accepted trade for cross-platform name parity.
 *
 * A CUSTOM name rather than Meta's standard `Lead` deliberately: technician
 * recruitment is a different funnel from customer acquisition, and the two
 * must stay separable in Ads Manager (see docs/ANALYTICS.md). Target it by
 * creating a custom conversion on this event name. Switching to standard
 * `Lead` later is a one-line change — swap `trackCustom` for a `"track"` call.
 *
 * The submitted details ride along as hashed Advanced Matching (`fn`, `ln`,
 * `ph`, `ct`, `country`), which is what lets Meta attribute the application
 * back to the ad that produced it. Skills go in `custom_data` as business
 * context — they're not identifying and don't belong in `user_data`.
 */
export function trackTechnicianApplication(details: {
    firstName: string;
    lastName: string;
    contactNumber: string;
    city: string;
    skills: string[];
}): void {
    trackCustom(
        // Keep in sync with AnalyticsEvents.TechnicianApplySubmit — see above.
        "technician_apply_submit",
        {
            skills: details.skills.join(",") || "none_selected",
            skill_count: details.skills.length,
        },
        {
            firstName: details.firstName,
            lastName: details.lastName,
            phone: details.contactNumber,
            city: details.city,
            // The form is India-only; the country code is what makes a bare
            // 10-digit mobile matchable on Meta's side.
            country: "in",
        },
    );
}
