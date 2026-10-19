// ---------------------------------------------------------------------------
// Meta Conversions API (CAPI) relay — server-side companion to the browser
// Pixel. CHANGELOG #072.
//
// The browser (src/lib/metaPixel.ts) POSTs each conversion here with a
// shared `event_id`; this handler adds the visitor's IP + user-agent,
// hashes any PII, and forwards to Meta's Graph API using the secret access
// token. Meta deduplicates the browser + server copies by `event_id`.
//
// IMPORTANT: this is a `route.server.ts` — the pageExtensions gate in
// next.config.mjs includes it ONLY in the server (Vercel/Node) build and
// EXCLUDES it from the static cPanel export (which can't run server code).
//
// CROSS-ORIGIN: the production marketing site is served from cPanel
// (pockitengineers.com), while this route runs on the Vercel deployment.
// So the browser POSTs here CROSS-ORIGIN — which requires CORS (an OPTIONS
// preflight + Access-Control-Allow-Origin on responses). Allowed origins
// are the production domains (override via META_CAPI_ALLOWED_ORIGINS).
//
// Required env (server-only, never NEXT_PUBLIC):
//   META_CAPI_ACCESS_TOKEN   — Events Manager → Settings → Conversions API
//                              → Generate access token. SECRET.
// Optional:
//   META_CAPI_TEST_EVENT_CODE   — Events Manager → Test events code.
//   META_CAPI_ALLOWED_ORIGINS   — comma-separated origins allowed to POST
//                                 (defaults to the pockitengineers.com pair).
//   NEXT_PUBLIC_META_PIXEL_ID   — dataset/pixel id (defaults to prod id).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH_API_VERSION = "v21.0";
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1274218051363697";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;

const ALLOWED_ORIGINS = new Set(
    (process.env.META_CAPI_ALLOWED_ORIGINS ??
        "https://www.pockitengineers.com,https://pockitengineers.com")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
);

// CORS headers for an allowed cross-origin caller. Echoes the request
// origin only when it's on the allowlist (never a blanket `*`, since we
// accept POSTs with a JSON body).
function corsHeaders(origin: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
}

// Meta requires PII to be SHA-256 hashed, lower-cased and trimmed.
function hash(value: string): string {
    return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// ---------------------------------------------------------------------------
// Advanced Matching normalisation. CHANGELOG #084.
//
// Meta hashes on its side too and compares digests, so a value that differs by
// even one character — a space, a missing country code — simply never matches.
// Normalisation is therefore not cosmetic: get it wrong and the PII we went to
// the trouble of collecting contributes nothing. Rules are per-field, which is
// why `hash()` alone (trim + lower-case) isn't enough beyond names.
// ---------------------------------------------------------------------------

// Names: letters only — Meta's rule is "no punctuation, special characters or
// whitespace", so "D'Souza" hashes as "dsouza" and "Priya Nair" as "priyanair".
// Matched on \p{L} rather than [a-z] so non-Latin scripts survive; Meta hashes
// the UTF-8 bytes and expects those preserved. \p{M} is kept alongside it
// because Devanagari vowel signs are combining MARKS, not letters — dropping
// them would silently mangle "राहुल" into "रहल" and guarantee a miss.
function hashName(value: string): string | undefined {
    const clean = value.replace(/[^\p{L}\p{M}]/gu, "");
    return clean ? hash(clean) : undefined;
}

// City: lower-case, all whitespace and punctuation removed — "Navi Mumbai"
// must hash as "navimumbai" or it won't match Meta's copy.
function hashCity(value: string): string | undefined {
    const clean = value.trim().toLowerCase().replace(/[^a-z]/g, "");
    return clean ? hash(clean) : undefined;
}

// Phone: digits only, country code REQUIRED. A bare 10-digit Indian mobile is
// unmatchable as-is, so promote it to E.164 digits. Anything that can't be a
// real number is dropped rather than hashed into noise.
function hashPhone(value: string, country?: string): string | undefined {
    let digits = value.replace(/\D/g, "").replace(/^0+/, "");

    // 10 digits and an Indian context → prepend the country code.
    if (digits.length === 10 && (!country || country.trim().toLowerCase() === "in")) {
        digits = "91" + digits;
    }

    // E.164 allows 8–15 digits including the country code; below 11 here means
    // a national-format number we can't safely attribute to a country.
    if (digits.length < 11 || digits.length > 15) return undefined;
    return hash(digits);
}

// Country: 2-letter lower-case ISO 3166-1 alpha-2.
function hashCountry(value: string): string | undefined {
    const clean = value.trim().toLowerCase().replace(/[^a-z]/g, "");
    return clean.length === 2 ? hash(clean) : undefined;
}

// ---------------------------------------------------------------------------
// Client IP — address-family gate. CHANGELOG #083.
//
// Events Manager flagged three separate errors that all reduce to one cause:
//   • "Update Conversions API IP addresses to IPv6"        (53% of events)
//   • "Send client IP addresses that match ... your Pixel"  (54%)
//   • "Review events where client IPs are associated with
//      multiple users"                                      (89%)
//
// The host this route runs on publishes NO AAAA record, while the browser
// Pixel reaches connect.facebook.net / facebook.com over IPv6. So an
// IPv6-capable visitor — most Indian mobile traffic; Jio and Airtel are
// IPv6-first — hits Meta on IPv6 but is forced down to IPv4 to reach us. The
// IPv4 we then recorded was not the visitor's real address at all but their
// carrier's CGNAT/NAT64 pool address, shared by thousands of subscribers.
// That is worse than sending nothing: it both fails to match the Pixel's
// event and actively merges unrelated people behind one identifier.
//
// So: send `client_ip_address` ONLY when we observed the client over IPv6,
// which is the same family (and address) the Pixel reported. Match quality is
// carried instead by `_fbp`/`_fbc`, which the client now always supplies
// (see resolveFbCookies in src/lib/metaPixel.ts).
//
// This is deliberately a property of the observed address, not an env toggle:
// the moment this route is served from an IPv6-reachable host, real addresses
// start flowing again with no code change and no flag to remember.
// ---------------------------------------------------------------------------
function clientIpForMeta(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    let ip = raw.trim();

    // `::ffff:203.0.113.7` is an IPv4 address in IPv6 clothing — unwrap it so
    // it's judged as what it is rather than passing the `:` test below.
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    if (mapped) ip = mapped[1];

    return ip.includes(":") ? ip : undefined;
}

// Meta's `custom_data` has a fixed schema (value, currency, content_ids,
// content_type, order_id, …). Anything outside it must be nested under
// `custom_properties` or Events Manager reports it as an unsupported
// parameter. Our click context (click_time, page_path, device_type, platform,
// referrer, utm_*, location) is all non-standard, so it moves wholesale.
// The browser Pixel keeps sending these flat — it accepts arbitrary keys, and
// dedup is keyed on event_name + event_id, not on payload shape.
const STANDARD_CUSTOM_DATA = new Set([
    "value",
    "currency",
    "content_name",
    "content_category",
    "content_ids",
    "contents",
    "content_type",
    "order_id",
    "predicted_ltv",
    "num_items",
    "search_string",
    "status",
    "delivery_category",
]);

function shapeCustomData(input: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!input) return {};

    const standard: Record<string, unknown> = {};
    const custom: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
        if (STANDARD_CUSTOM_DATA.has(key)) standard[key] = value;
        else custom[key] = value;
    }

    if (Object.keys(custom).length > 0) standard.custom_properties = custom;
    return standard;
}

interface CapiRequestBody {
    event_name?: string;
    event_id?: string;
    event_source_url?: string;
    custom_data?: Record<string, unknown>;
    fbp?: string;
    fbc?: string;
    // Optional PII — hashed here before it ever leaves the server. Supplied by
    // the technician application form on successful submit (#084); the rest of
    // the site sends none (anonymous visitors).
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    country?: string;
    external_id?: string;
}

// Preflight for the cross-origin JSON POST.
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
    const cors = corsHeaders(req.headers.get("origin"));

    // Not configured (no token) → succeed quietly so the client's
    // fire-and-forget POST never surfaces an error to visitors.
    if (!ACCESS_TOKEN) {
        return NextResponse.json({ ok: false, reason: "capi_not_configured" }, { status: 200, headers: cors });
    }

    let body: CapiRequestBody;
    try {
        body = (await req.json()) as CapiRequestBody;
    } catch {
        return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400, headers: cors });
    }

    const {
        event_name,
        event_id,
        event_source_url,
        custom_data,
        fbp,
        fbc,
        email,
        phone,
        first_name,
        last_name,
        city,
        country,
        external_id,
    } = body;
    if (!event_name || !event_id) {
        return NextResponse.json({ ok: false, reason: "missing_event_name_or_id" }, { status: 400, headers: cors });
    }

    // Match signals: client IP + user-agent lift event match quality. The IP
    // is gated on address family — see clientIpForMeta above (#083).
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const clientIp = clientIpForMeta(
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined,
    );

    const userData: Record<string, unknown> = {};
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    if (external_id) userData.external_id = [hash(external_id)];

    // Advanced Matching (#084). Each helper returns undefined when the input
    // can't be normalised into something Meta could match, so we never hash
    // junk into `user_data` — an unmatchable digest is indistinguishable from
    // a wrong one and only dilutes match quality.
    const em = email ? hash(email) : undefined;
    const ph = phone ? hashPhone(phone, country) : undefined;
    const fn = first_name ? hashName(first_name) : undefined;
    const ln = last_name ? hashName(last_name) : undefined;
    const ct = city ? hashCity(city) : undefined;
    const cn = country ? hashCountry(country) : undefined;

    if (em) userData.em = [em];
    if (ph) userData.ph = [ph];
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (ct) userData.ct = [ct];
    if (cn) userData.country = [cn];

    const payload = {
        data: [
            {
                event_name,
                event_time: Math.floor(Date.now() / 1000),
                event_id, // dedup key — must match the Pixel's eventID
                action_source: "website",
                event_source_url,
                user_data: userData,
                custom_data: shapeCustomData(custom_data),
            },
        ],
        access_token: ACCESS_TOKEN,
        ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            },
        );
        const result = (await res.json()) as { events_received?: number; error?: unknown };

        if (!res.ok) {
            console.error("[CAPI] Meta rejected event:", JSON.stringify(result));
            return NextResponse.json({ ok: false, reason: "meta_rejected" }, { status: 502, headers: cors });
        }

        return NextResponse.json({ ok: true, events_received: result.events_received ?? 1 }, { headers: cors });
    } catch (err) {
        console.error("[CAPI] forward failed:", err);
        return NextResponse.json({ ok: false, reason: "forward_failed" }, { status: 502, headers: cors });
    }
}
