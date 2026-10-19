# Analytics

The site runs **three independent** measurement layers:

- **Google Tag Manager** — container `GTM-WBQ96CNK`, installed in `app/layout.tsx` (#050). Governs GA4 and any future tags.
- **Google Analytics 4** — event coverage via `src/lib/analytics.ts` (`trackEvent`). Measurement ID in `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- **Meta (Facebook) Pixel** — three high-intent conversions only, via `src/lib/metaPixel.ts`. Pixel ID in `NEXT_PUBLIC_META_PIXEL_ID` (#052).

The Meta Pixel is **deliberately decoupled** from GA/GTM — it shares no code. Blog-specific GA analytics are documented separately in [`BLOG_ANALYTICS.md`](./BLOG_ANALYTICS.md).

## Google Analytics — `trackEvent`

`src/lib/analytics.ts` exports `trackEvent(eventName, params?)`. Every interaction calls this; it forwards to GA4 only (`gtag('event', …)`). No-op until `gtag` loads. **Do not** add `fbq` here — Meta is intentionally separate.

The event registry is the `AnalyticsEvents` map in `src/lib/analytics.ts` (source of truth). Newly added: `technician_apply_submit` — fires once on a successful `/become-a-technician` form submit; param `skills` (comma-joined skill ids). **Register it in GA4 admin.** The form POSTs to the SendGrid relay `src/app/api/technician/route.server.ts` (a `.server.ts` route, Vercel-only, called cross-origin from the static cPanel build via `NEXT_PUBLIC_TECHNICIAN_ENDPOINT` — same split as the Meta CAPI relay). Its email is unrelated to GA. See CHANGELOG #078.

## Meta Pixel — `src/lib/metaPixel.ts`

### Install

Base snippet in `src/app/layout.tsx` `<head>` only `fbq('init')`s the pixel — it does **not** fire its own `PageView`. Every `PageView` (initial load **and** SPA navigations) is fired by `src/components/analytics/MetaPixelRouteTracker.tsx` on each `pathname` change. Making it the single source means `PageView` carries a shared `event_id` and dedupes against its CAPI copy just like the custom events (#073). The `<noscript>` fallback still fires a plain `PageView` for JS-disabled visitors.

### Configuration

| Env var | Effect |
| --- | --- |
| _unset_ | Uses the default production ID `1274218051363697`. |
| — | The id is defined **once**, as `META_PIXEL_ID` in `src/lib/metaPixel.ts`; `app/layout.tsx` imports it for the base snippet (#086). Don't re-declare the literal. |
| `NEXT_PUBLIC_META_PIXEL_ID=<id>` | Use a different pixel (e.g. a test pixel). |
| `NEXT_PUBLIC_META_PIXEL_ID=` (empty) | **Disables** the pixel for that build (e.g. staging). |

Works on both build targets (`static` cPanel export and `server` Vercel build) — it's a client-side script.

### The only events Meta receives

`PageView` (standard, load + SPA nav) plus **exactly three** named **custom** events, called directly from each button's `onClick`:

| Helper (`src/lib/metaPixel.ts`) | Fires on | Custom event | Transport |
| --- | --- | --- | --- |
| `trackWhatsAppClick(location)` | WhatsApp chat button | `WhatsAppContact` | `fbq('trackCustom', …)` |
| `trackPlayStoreClick(location)` | Google Play badge | `PlayStoreClick` | `fbq('trackCustom', …)` |
| `trackAppStoreClick(location)` | Apple App Store badge | `AppStoreClick` | `fbq('trackCustom', …)` |
| `trackTechnicianApplication(details)` | Technician form **successful submit** | `technician_apply_submit` | `fbq('trackCustom', …)` + hashed Advanced Matching |

These are **custom** events (not Meta standard events), so each appears as its own labelled line in Events Manager. To optimise/report in Ads Manager, define a **custom conversion** per event name. Custom names must use `trackCustom` — never `track`, which is reserved for the standard vocabulary (PageView, Contact, Lead, …).

**Event params:** every custom event carries auto-context, built in `buildEventContext()` and merged centrally in `trackCustom` (caller params like `location` win on collision):

| Param | Source | Notes |
| --- | --- | --- |
| `location` | passed by the button | e.g. `hero`, `float`, `download_band`, `landing-hero` |
| `click_time` | `new Date().toISOString()` | #056 |
| `page_path` | `window.location.pathname` | landing-page attribution |
| `device_type` | viewport (`<768px` → mobile) | matches the app's breakpoint |
| `platform` | `navigator.userAgent` | `windows` \| `macos` \| `iphone` \| `ipad` \| `android_phone` \| `android_tablet` \| `linux` \| `unknown` (#058) |
| `referrer` | `document.referrer` | omitted for direct traffic |
| `utm_source` / `utm_medium` / `utm_campaign` | URL query string | omitted when absent; ties to the driving campaign |

Empty values are omitted rather than sent blank. No PII is sent: there is no logged-in user on this site (anonymous Firebase auth only), and raw email in custom data is rejected by Meta. To attach email later, capture a real one and use **hashed Advanced Matching**, not a raw custom param.

### Conversions API (server-side, #072)

Every event — `PageView` (#073) **and** the three custom conversions (#072) — is sent **twice**: browser Pixel + server-side CAPI, tagged with the **same `event_id`** so Meta deduplicates them. All of them route through one client choke point (`trackDeduplicated` in `metaPixel.ts`), which mints the id, passes it to the Pixel via `eventID`, and POSTs it to CAPI — so nothing can be sent server-side without a matching id. CAPI recovers events blocked by ad blockers / iOS privacy and raises match quality.

**Cross-origin setup:** production pages are served by **cPanel** (`pockitengineers.com`); the CAPI route runs on the **Vercel** deployment (`pockit-website-fluxenta.vercel.app`). So the cPanel browser POSTs the event **cross-origin** to the Vercel route, which is CORS-enabled for the pockitengineers.com origin.

- **Client** (`src/lib/metaPixel.ts`): generates `event_id`, passes it to the Pixel (`fbq(..., { eventID })`), resolves `_fbp`/`_fbc` (see below), and fire-and-forget POSTs the event to the relay. Endpoint from `NEXT_PUBLIC_META_CAPI_ENDPOINT` (cPanel build sets it to the absolute Vercel URL); empty disables it.
- **Server** (`src/app/api/meta/capi/route.server.ts`): handles the CORS preflight, adds visitor IP + user-agent, SHA-256-hashes any PII, reshapes `custom_data`, forwards to Graph API with the secret token. It's a `route.server.ts`, so it exists **only in the server (Node/Vercel) build**. Allowed origins: `META_CAPI_ALLOWED_ORIGINS` (default the pockitengineers.com pair).

#### Identifiers: `_fbp` / `_fbc` (#083)

`resolveFbCookies()` **mints these cookies when they're absent** instead of only reading them, then re-reads them immediately before every send:

- **`_fbc`** — written as `fb.1.<ts>.<fbclid>` whenever the URL carries an `fbclid`, and rewritten when a *different* click id arrives so a new campaign can't be attributed to a stale one. For an ad-blocked visitor arriving from an ad this is the **only** obtainable identifier.
- **`_fbp`** — generated as `fb.1.<ts>.<random>` if missing. `fbevents.js` adopts an existing `_fbp` rather than making its own, so browser and server stay on one id whichever wrote it first.

Both are set on the registrable domain (`.pockitengineers.com`) with a 90-day max-age, matching what the Pixel would have written. This exists because `fbevents.js` loads **async** (so the first `PageView` could outrun it) and **never loads at all** for ad-blocked / ITP visitors — precisely the visitors CAPI is there to recover. Before #083 those events reached Meta with nothing usable in `user_data`, which Events Manager reported as *"Send missing user data parameters"* on 44% of events.

#### Client IP is gated on address family (#083)

The route sends `client_ip_address` **only when the visitor reached it over IPv6**. The relay host publishes no `AAAA` record while `connect.facebook.net` is IPv6, so an IPv6-capable visitor (most Indian mobile — Jio and Airtel are IPv6-first) hits Meta on v6 but is downgraded to v4 to reach us. That v4 address is the carrier's **CGNAT/NAT64 pool**, shared by thousands of people — worse than sending nothing, since it neither matches the Pixel's event nor identifies one person. It caused three separate Events Manager errors at once (IPv6 mismatch 53%, IP-doesn't-match-Pixel 54%, IP-shared-across-users 89%).

This is keyed off the **observed address**, not an env flag — host this route somewhere IPv6-reachable and real addresses resume with no code change. Match quality is carried by `_fbp`/`_fbc` in the meantime.

#### `custom_data` shape

Meta's `custom_data` has a fixed schema. `shapeCustomData()` keeps recognised keys at the top level and nests everything else (`click_time`, `page_path`, `device_type`, `platform`, `referrer`, `utm_*`, `location`) under **`custom_properties`**, which is where Meta requires arbitrary keys. The browser Pixel still sends them flat — it accepts any key, and dedup is keyed on `event_name` + `event_id`, not payload shape.

**To activate** (all required):

| Step | Where |
| --- | --- |
| Generate access token | Events Manager → Settings → Conversions API → *Set up with Dataset Quality API* → Generate access token |
| `META_CAPI_ACCESS_TOKEN=<token>` | server env, **secret** (never `NEXT_PUBLIC`) — the only required var |
| `NEXT_PUBLIC_META_CAPI_ENDPOINT` | **optional** — endpoint defaults to `/api/meta/capi` in code. Only set it to override the path/origin, or to `""` to disable the client POST (e.g. on the static cPanel build) |
| `META_CAPI_TEST_EVENT_CODE=<code>` (optional) | while verifying in Events Manager → Test events |
| Deploy on a **Node host** (Vercel/server build) | CAPI can't run on the static cPanel deploy |

Scope: `PageView` + the three custom conversions — all deduplicated. (#072 covered only the custom events and left `PageView` browser-only because its base-snippet fire had no `eventID`; #073 moved the initial `PageView` into the route tracker so it, too, carries an id and dedupes.)

Call sites: `WhatsAppFloat.tsx` (bottom-right floating WhatsApp pill, home page), `Header.tsx` (mobile-drawer store badges), `Hero.tsx`, `DownloadBand.tsx`, `FloatingDownload.tsx`, `LandingPageView.tsx` (hero + footer-banner WhatsApp). **Nothing else** sends to Meta — chatbot, Book-a-Service, nav, scroll are GA-only.

> **Excluded by design:** technician-recruitment WhatsApp links (ExpertHero "Join Us", Header "Join Us") do **not** fire `trackWhatsAppClick` — different funnel; would pollute customer-acquisition data. The technician *application form* is the one recruitment surface that does report to Meta (#084), and it uses its own event name for exactly that reason — the two funnels stay separable in Ads Manager.

### Technician application — conversion on submit, not click (#084)

`TechnicianForm` fires `trackTechnicianApplication()` from its submit handler **after the relay returns OK**, alongside the existing GA event — never from the button's `onClick`. A press of "Apply Now" isn't a conversion: the form can still fail HTML validation or the relay can error, and counting those would inflate the rate Ads Manager optimises against.

It's a **custom** event, not Meta's standard `Lead`, to keep recruitment out of the customer-acquisition funnel (see the exclusion note above). Target it with a custom conversion on the name `technician_apply_submit`. If you later want Ads Manager's built-in Lead optimisation, switching is a one-line change — send it through `"track"` instead of `"trackCustom"`.

**The Meta and GA4 event names are identical on purpose** (`technician_apply_submit`, #085) so one submission reads the same in both dashboards. The string is *duplicated* in `metaPixel.ts` rather than imported from `analytics.ts` — this module stays decoupled from GA by design (see its file header), so a change on one side can never silently alter the other. **Rename it in one file and you must rename it in the other.** It breaks the PascalCase convention of the three older Meta events; that's an accepted trade for cross-platform parity.

**Advanced Matching.** The submitted details are what make an application attributable back to the ad that produced it, so they ride along in `user_data`:

| Form field | Meta key | Normalisation before hashing |
| --- | --- | --- |
| First / Last name | `fn` / `ln` | letters only, lower-cased — `D'Souza` → `dsouza`, `Priya Nair` → `priyanair`. Combining marks kept so Devanagari survives. |
| Contact number | `ph` | digits only **with country code** — a bare 10-digit mobile is promoted to `91…`. `+91 98765 43210`, `098765 43210` and `9876543210` all converge on one digest. |
| City | `ct` | lower-case letters only — `Navi Mumbai` → `navimumbai` |
| — | `country` | `in`, sent by the helper (the country code is what makes a national-format number matchable) |
| Skills | `custom_data.skills` | not identifying — business context, stays out of `user_data` |

**Both halves of the event carry the details** (#086), each hashing on its own side:

- **Browser** — `applyAdvancedMatching()` calls `fbq('init', META_PIXEL_ID, { fn, ln, ph, ct, country })` immediately before the track call. This is Meta's sanctioned mechanism for sending personal data from a page: the Pixel SHA-256-hashes each value *in the browser*, so nothing travels in cleartext. Events Manager then lists them on the event under **"Advanced matching parameters"**. Re-`init`-ing is additive, not a reset, and applies to every event fired afterwards in that page session.
- **Server** — the relay hashes the same fields into `user_data` (table above).

Raw PII **never enters `custom_data`** on either side. Meta's Business Tools Terms forbid PII in event parameters and Meta actively detects and drops it — `custom_data` is strictly for non-identifying business context (skills, page, device). This also means Events Manager shows you the *names* of the matched fields, never the values: seeing `First name, Last name, Phone, City` listed on the event **is** the confirmation that the data went with it.

The phone is the one field pre-normalised on the client (`normalizePhone`, mirroring the relay's `hashPhone`) so a bare 10-digit mobile gets its `91` prefix before the Pixel hashes it. Without that, browser and server would hash different strings and Meta would receive two unrelated digests for one person.

Normalisation is not cosmetic: Meta hashes its own copy and compares digests, so a value differing by one space or a missing country code simply never matches. Each normaliser returns nothing rather than hashing an unmatchable value into `user_data`.

### Verifying

Install the **Meta Pixel Helper** browser extension, then:

1. Load any page → one `PageView`.
2. Click a WhatsApp button (floating pill, Hero, landing CTA) → `WhatsAppContact`.
3. Click a Play Store badge → `PlayStoreClick`; an App Store badge → `AppStoreClick`.
4. Open the chatbot / click Book a Service → **no** Meta event (GA only).
5. Navigate to `/blog` and back → a second `PageView` on the SPA transition.

To verify the #083 identifier fix, in DevTools → Application → Cookies:

6. Hard-reload with the Pixel blocked (uBlock, or DevTools → Network → block `connect.facebook.net`) → `_fbp` still appears, `fb.1.<ts>.<random>`.
7. Load `/?fbclid=TEST123` → `_fbc` appears as `fb.1.<ts>.TEST123`. Reload with `?fbclid=TEST456` → it rewrites; reload with the same id → unchanged.
8. In Events Manager → Diagnostics, the four Conversions API errors should clear within ~72h of the deploy (the panel reports on a rolling three-day window).

For the technician conversion (#084), on `/become-a-technician`:

9. Press **Apply Now** with a required field empty → **no** Meta event (HTML validation blocks submit).
10. Fill it in and submit → exactly one `technician_apply_submit` in Pixel Helper, at the moment the success card appears — not on the press. The same name appears in GA4 Realtime for the same submission.
11. Expand the browser event in Events Manager → Test events. **"Advanced matching parameters"** should read `First name, Last name, Phone, City, Country` alongside `IP address, User agent` — if it still says only `IP address, User agent`, the #086 Advanced Matching isn't live on that build.
12. Events Manager → Test events (with `META_CAPI_TEST_EVENT_CODE` set) shows the server copy with `fn`, `ln`, `ph`, `ct`, `country` populated and deduplicated against the browser copy.
