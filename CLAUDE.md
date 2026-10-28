# Project rules for Claude

These rules apply to every task in this repository. They override default behavior.

## 1. No patchwork fixes

No patchwork fixes — only structured, planned fixes that make the foundation and the application stronger instead of leaving it susceptible to breaking. Before editing, understand the root cause, consider the ripple effects across the codebase, and prefer the change that leaves the system more coherent than you found it. **Always interview the user for clarity to understand their requirements** before making non-trivial changes, and document those user preferences in the "Project preferences" section of this file so future sessions don't re-ask.

## 2. Maintain `CHANGELOG.md` on every code change

Every time code is added, modified, or removed in this repo, append an entry to `CHANGELOG.md` at the repository root. This is mandatory — not optional — and applies to feature work, bug fixes, refactors, config tweaks, and dependency changes.

### Rules

- **One entry per logical change.** If a single task touches multiple files, group them under one entry with one before/after block per file.
- **Newest on top.** New entries go directly below the `<!-- NEW ENTRIES GO HERE -->` marker in `CHANGELOG.md`.
- **Number sequentially.** Use `#NNN` (zero-padded). The baseline is `#000`; the next change is `#001`, then `#002`, etc.
- **Before/after is required.** Show the relevant code block *before* the change and *after* the change for each file touched. Trim to the relevant section — don't paste whole files unless the whole file changed.
- **Explain the why, not just the what.** A one-line rationale is the minimum. If the change has migration steps, side effects, or follow-ups, note them under "Notes".
- **Update in the same turn as the code edit.** Don't defer the log entry to "later" — the log and the code must land together.

### Entry shape

```
## [YYYY-MM-DD] #NNN — Short title
- **Type:** feature | fix | refactor | chore | docs | config | perf | security
- **Scope:** files / areas touched
- **Why:** one-line rationale
- **Related:** issue / ticket / PR (if any)

### Summary
Two or three sentences describing what changed and why it matters.

### Before
\`\`\`tsx
// path/to/file.tsx
...original code...
\`\`\`

### After
\`\`\`tsx
// path/to/file.tsx
...new code...
\`\`\`

### Notes
- Follow-ups, gotchas, migration steps, verification performed.
```

### When in doubt

- Pure whitespace or comment-only reformatting of a single file — still log it, but keep the entry short.
- Generated files (e.g. `out/`, `.next/`, `node_modules/`) — do **not** log.
- Renames — log with a before/after showing the old and new paths.
- Deletions — log with a "Before" block and an "After" block that explicitly says `(file removed)` and explains why.

## 3. Read `CHANGELOG.md` before editing

Before making a change, skim recent entries in `CHANGELOG.md` to check whether the area you're about to touch has context you should respect (recent refactors, known gotchas, active migrations). This prevents re-doing work that was just undone or stepping on a decision that was made two entries ago.

## 4. Use the right plugin/skill for each task

While coding, figure out what plugin or skill fits the task. If unclear, ask the user. Use the specific skill/plugin the task calls for rather than building from scratch when a matching tool already exists.

## 5. Keep documentation updated after each pass

Update the relevant documentation (`README.md`, files under `docs/`, `BLOG_TASKS.md`, and any feature-specific guides) whenever a pass of work lands. If the existing docs don't cover the new area, ask the user to approve creating new documentation rather than silently leaving a gap.

## 6. Track work-in-progress in `BLOG_TASKS.md`

The blog project tracks its step-by-step progress in `BLOG_TASKS.md` at the repo root. Tick items off as they complete, add new tasks as they surface, and keep the "Reminders" section honest — especially the token-rotation item.

---

# Project preferences (locked decisions)

Captured here so future sessions don't re-litigate settled choices. Update when a decision genuinely changes; otherwise treat these as load-bearing.

## Blog project (introduced April 2026)

- **CMS:** Sanity. Project ID `pg938kpo`, dataset `production`. Studio moved off the site to **Sanity-hosted** (`*.sanity.studio`, via `npx sanity deploy`) in the 2026-06-22 migration; the embedded `/studio` route is parked on `.server.tsx` and excluded from the static export.
- **Publish model:** **Single-host static (changed 2026-06-22, CHANGELOG #065).** The blog is statically exported into the cPanel build and served at `pockitengineers.com/blog` alongside the marketing site — one host, one deploy (`npm run build:static` → FTP). Content still comes from Sanity, fetched at **build time**; the `deploy-cpanel.yml` Action (already wired to the Sanity publish webhook) rebuilds + uploads on publish. The old Vercel subdomain (`pockitblog.pockitengineers.com`) is being retired + 301'd. _Prior model was Hybrid Option B (blog on a Vercel subdomain); see CHANGELOG #065 and the `blog-path-migration-shelved` memory for why the Cloudflare/proxy routes were ruled out._
- **Design language:** Inherit the existing site theme — `light-corporate` / `dark-gradient` tokens from `src/app/globals.css`, Plus Jakarta Sans typography, orange brand accent, Framer Motion entrance patterns. The Stack Dribbble shot is a **layout** reference only (centered hero, chip filters, card grid). Visuals come from our brand, not Stack.
- **v1 feature scope:** blog index, individual post pages, category pages, tag pages, author profile pages, featured hero post on the index, related posts module, client-side search, RSS feed, sitemap entries.
- **Analytics:** GA4 measurement ID `G-4MLTMPX7YX`, shared with the main site (swapped from the original `G-QPGT0MW6T7` property on 2026-04-15 — see CHANGELOG #008.2). Custom events: `post_view`, `scroll_depth` (25/50/75/100), `engagement` (30s / 1m / 3m), `card_impression`, `cta_click`, `share_click`. Custom dimensions: `post_slug`, `post_category`, `post_author`.
- **Environment variables** (live only in `.env.local`, never committed):
  - `NEXT_PUBLIC_SANITY_PROJECT_ID=pg938kpo`
  - `NEXT_PUBLIC_SANITY_DATASET=production`
  - `SANITY_API_READ_TOKEN=<viewer token — rotate before launch, see BLOG_TASKS.md>`
- **Cross-origin nav env vars** — **obsolete as of 2026-06-22 (CHANGELOG #065).** The blog and marketing site are now the same origin, so `src/lib/siteUrls.ts` resolves everything same-origin and neither `NEXT_PUBLIC_BLOG_URL` nor `NEXT_PUBLIC_MAIN_SITE_URL` should be set on any build. (Historical: they bridged the two origins under the old hybrid model — `BLOG_URL` on the cPanel build pointed the "Blog" nav link at the subdomain; `MAIN_SITE_URL` on the Vercel build pointed links back. Leaving `BLOG_URL` set now would wrongly rewrite the in-site `/blog` link to the dead subdomain.)

## Build targets

- **Blog route file suffixes (corrected 2026-07-13, CHANGELOG #075):** the blog index, post, author, and RSS routes are **plain `.tsx`/`.ts`** (`src/app/blog/page.tsx`, `[slug]/page.tsx`, `author/[slug]/page.tsx`, `rss.xml/route.ts`), so they register on **both** build targets — they render live on the dev server AND prerender into the static export. They are **not** `.static.*`. (#065 briefly moved them to `.static.*`, which made `/blog` 404 on the dev server since `next dev` runs the `server` target, whose `pageExtensions` don't include `static.tsx`. #075 reverted to plain suffixes.) The **only** parked blog route is `/blog/category/[slug]`, still on `.server.tsx` because Sanity has **0 category documents** and an empty `generateStaticParams()` is fatal under `output: export` — rename it to `page.tsx` once ≥1 category is authored.
- `BUILD_TARGET=static` → cPanel static export, driven by `npm run build:static`. Includes the blog (`/blog`, 32 posts, 6 author pages, RSS) — exported from Sanity at build time (CHANGELOG #065). Excludes `/studio` (Sanity-hosted) and `/blog/category/[slug]` (parked, see above). `NEXT_PUBLIC_BLOG_URL` must **not** be set (it 404s the "Blog" nav link — see below).
- `BUILD_TARGET=server` → full Next.js build (also what `npm run dev` uses). Serves the whole site **including the blog** at `/blog/**` (plain `.tsx` routes) plus the parked `/blog/category/[slug]`. This is the target you preview the blog on locally. The Vercel deploy of this target is being retired, but the target itself is **not** blog-less — that was the #065-era state, corrected in #075.

## SEO landing pages (introduced May 2026)

- **Programme:** Mumbai SEO landing pages. First page `/laptop-repair-mumbai`; the next ~27 (`/macbook-repair-mumbai`, `/laptop-repair-andheri`, `/laptop-not-turning-on-mumbai`, …) author-able in Sanity Studio without a code change. See CHANGELOG #022 and `docs/LANDING_PAGES.md`.
- **CMS shape:** Sanity `landingPage` document (city / locality / problem-fix variants), same dataset as the blog (`production`).
- **Route:** `src/app/[slug]/page.static.tsx` — root catch-all, gated to `BUILD_TARGET=static` (renamed from `page.tsx` in CHANGELOG #030 so Vercel doesn't accidentally serve the marketing landing pages on the blog subdomain). Specific routes (`/about`, `/blog`, …) win by Next routing precedence; reserved-slug list also enforced in the schema and `generateStaticParams`.
- **Sitemap (unified 2026-06-22, CHANGELOG #065):** `src/app/sitemap.xml/route.static.ts` is now the **single** sitemap for the whole site — marketing routes + landing pages + blog (index, posts, authors, RSS), all on `https://www.pockitengineers.com`. The old blog-only `route.server.ts` sitemap + `robots.txt/route.server.ts` were deleted. The `.static`/`.server` suffix system in `next.config.mjs` still exists for the parked `/studio` + `/blog/category/[slug]` routes; don't remove the suffix lists without rethinking it.
- **Adding/removing top-level static pages** (e.g. `/careers`) — also update `STATIC_ROUTES` in `src/app/sitemap.xml/route.static.ts` AND the `RESERVED_SLUGS` arrays in `sanity/schemas/landingPage.ts` and `src/app/[slug]/page.static.tsx`.
- **Seed script:** `npm run seed:landing` (one-shot bootstrap; needs `SANITY_API_WRITE_TOKEN`, Editor role). Don't re-run after editors start authoring or it will overwrite their changes.
- **GA4 events:** `landing_view`, `landing_cta_click`, `landing_faq_expanded`, `content_expanded` (added #087, renamed in #088 — it fires on the home page too). Custom dimensions: `page_slug`, `page_type`, `location`, `service`. Register these in GA4 Admin alongside the existing blog dimensions.
- **Long-form "Read More" SEO blocks (added 2026-09-08, CHANGELOG #087; placement settled in #092).** `src/components/seo/ReadMoreContent.tsx` owns the collapse and the `SEO_PROSE` typography — never re-implement it.
  - **Landing pages only.** Copy is authored in Studio as `landingPage.seoContent` (Portable Text) and renders below the FAQ accordion. Don't hardcode per-slug copy in a constants module. Field additions need `npx sanity deploy` before editors can see them. Live on `/macbook-repair-mumbai`.
  - **Not on the home page (settled 2026-09-08).** #088 briefly put the MacBook copy there via a `HOME_SEO_CONTENT` constant; #092 removed it. The dedicated landing page is what should rank for those terms, and the home page keeps its whole-catalogue focus. Don't re-add it without the user asking.
  **Collapsed means fully hidden (locked 2026-09-08, CHANGELOG #089):** `collapsedPx` defaults to 0, so nothing but the toggle shows until the reader clicks — no teaser paragraph, no visible heading. Don't reintroduce a teaser.
  **The toggle is a quiet accent pill above the copy (locked 2026-09-08, CHANGELOG #090):** same chip styling as `SectionPill` (`rounded-full`, `bg-theme-accent/[0.06]`, `border-theme-accent/20`, 12px semibold accent text), positioned *before* the collapsed region. It must not look like a primary CTA — the orange gradient button competes with "Book a Service".
  The copy is always in the HTML — the collapse is a zero-height `overflow-hidden` wrapper, never a conditional render — so it indexes in full. **Don't run the same block on two pages at once:** duplicate long-form copy on two indexed URLs makes them compete.
- **Portable Text on landing pages needs explicit serializers.** `tailwind.config.ts` has `plugins: []`, so `@tailwindcss/typography` is absent and `prose` classes are a no-op. `seoContentComponents` in `LandingPageView.tsx` is the styling source; `IntroSection` still carries dead `prose` classes (known gap).

## SEO audit follow-through (May 2026)

Locked decisions from `Pockit Engineers Seo Audit Presentation.pptx` (CHANGELOG #031–#036). Live status tracker: `BLOG_TASKS.md` → "Phase SEO".

- **Keyword strategy:** **Mumbai-first.** All meta titles, descriptions, alt text, JSON-LD, and new H1s lead with "Mumbai" + a service word ("laptop repair", "MacBook repair", "WiFi installation", …). Multi-city positioning stays in the Hero "Now live in" chip row.
- **Service pages = Sanity landing pages.** Don't build hardcoded `/services/[service]` routes. Author each one in Sanity Studio under the existing `landingPage` schema (CHANGELOG #022). First-pass service in scope: **Laptop Repair** — `/laptop-repair-mumbai` already exists.
- **WhatsApp:** floating pill (`WhatsAppFloat.tsx`, brand-green `#25D366`) mounted via `AppShell` (home page), bottom-RIGHT — it occupies the slot the old `StickyBookCTA` "Book a Service" float used to hold (repurposed + renamed on 2026-06-12, CHANGELOG #053). The header WhatsApp pill was removed at the same time; the header keeps only the orange "Book a Service" CTA. Number + prefilled message live in `BUSINESS` constants in `copy.ts` — change there, not in the component. (`FloatingDownload`'s store CTA also sits bottom-right; they stack.) **⚠️ REVERTED 2026-10-06 (CHANGELOG #123):** the two-pill stack was rolled back with the whole app-popup feature; `WhatsAppFloat.tsx` is back to its pre-2026-09-24 state — a lone WhatsApp pill, no "Book a service" pill, no `appPopup` wiring. ~~As of 2026-10-01 (CHANGELOG #111), `WhatsAppFloat.tsx` renders a two-pill VERTICAL STACK, not a lone WhatsApp pill: an orange "Book a service" pill (opens the app popup via `HEADER.loginHref` + `appLinkAttrs`/`handleAppLinkClick`) sits at the corner with WhatsApp directly above it. Both share one container, one scroll trigger, and one hover-to-expand state. It's still the single owner of the bottom-right float.~~
- **Schema (restructured 2026-08-03, CHANGELOG #077):** every hand-authored JSON-LD node lives in **`src/constants/schema.ts`** and is emitted through `src/components/seo/JsonLd.tsx`. Never inline a new `<script type="application/ld+json">` — add it to the constants module. Split follows the SEO team's brief: `layout.tsx` `<head>` → Organization + WebSite (all pages); `app/page.tsx` → LocalBusiness + FAQPage (home only); `SERVICE_PAGE_SCHEMA[slug]` → hand-authored Service + FAQPage on five service pages, which suppresses the Sanity-derived pair for those slugs only. `/about` adds AboutPage; `/become-a-technician` adds JobPosting. LocalBusiness now has the real `streetAddress` / `postalCode` / `geo`; still missing the **Google Business Profile URL** for `sameAs`.
- **Schema is an SEO-only surface (decided 2026-08-03).** The user explicitly wants structured data emitted for crawlers/LLMs *without* rendering it as visible content, and accepts that FAQPage markup therefore diverges from the visible FAQ copy (`FAQ_ITEMS` in `copy.ts`, Sanity `faqs` on landing pages). Don't "fix" this drift by syncing them — it's deliberate. Don't re-raise Google's visible-content guideline either; it's been flagged and accepted.
- **Per-page metadata pattern:** `app/<route>/page.tsx` is a server component that owns `<Metadata>` + JSON-LD; the interactive UI lives in `src/components/<route>/<RouteClient>.tsx` with `"use client"`. Same pattern as the blog (`page.server.tsx`) and as `/about` + `/become-a-technician` (CHANGELOG #031).
- **WebP conversion:** when this lands, **replace the originals** (don't keep PNG + WebP siblings). User opted for the cleanest result over belt-and-braces. Update import paths at the same time.
- **GA4 events to register in admin:** `whatsapp_float_click` (in addition to existing blog + landing-page events).
- **Meta conversions fire on outcome, not intent (locked 2026-08-14, CHANGELOG #084).** A conversion event is sent only once the action actually completed — the technician form fires `TechnicianApplication` after the relay returns OK, never from the "Apply Now" `onClick`. Don't add click-time conversion events; they inflate the rate Ads Manager optimises against.
- **Meta events use CUSTOM names, not the standard vocabulary.** `WhatsAppContact`, `PlayStoreClick`, `AppStoreClick`, `technician_apply_submit`, `book_service_open` — all via `fbq('trackCustom', …)`. Technician recruitment deliberately stays a separate funnel from customer acquisition, so it must not be folded into a standard `Lead`. Target each with a custom conversion in Ads Manager.
- **The technician event name is shared with GA4 (locked 2026-08-14, CHANGELOG #085).** Meta and GA4 both call it `technician_apply_submit` so one submission reads identically in both dashboards. The string is duplicated across `metaPixel.ts` and `analytics.ts` rather than imported, because those modules are deliberately decoupled — **rename it in one and you must rename it in the other.** It intentionally breaks the PascalCase convention of the older Meta events.
- **⚠️ REVERTED 2026-10-06 (CHANGELOG #123):** #121 and #122 (the two bullets below) are obsolete — `src/lib/appPopup.ts`, `handleAppLinkClick`, `openAppLink`, and the `book_service_open` Meta event no longer exist. The header "Book a Service"/"Login" CTAs are back to their pre-2026-09-24 `useBookServiceNav` wiring. GTM/Meta booking tracking that depended on the app-popup choke point is gone; reinstate deliberately if the feature is rebuilt.
- ~~**Book-a-Service tracking lives at the choke point, never on the buttons (locked 2026-10-05, CHANGELOG #121).**~~ The Meta `book_service_open` event fires inside `handleAppLinkClick` (`src/lib/appPopup.ts`), which every app CTA already routes through — header, footer, home hero, floating pill, and the three landing-page CTAs. **Don't add an onClick Meta call to a new "Book a Service" button**; wire it with `appLinkAttrs(href)` + `handleAppLinkClick(e, href, "<location>")` and it reports automatically. The header **"Login"** link is excluded on purpose (it uses `openAppLink`, which opens the app without the Meta event — CHANGELOG #122), so sign-ins stay out of the booking funnel — don't "fix" that by moving the event into `openAppPopup()`. The name intentionally does **not** match GA4's `cta_book_service`: GA fires on click from two surfaces, Meta on app-open from seven, and one name for two different numbers would mislead.
- **GTM counts Login as a booking (decided 2026-10-06, CHANGELOG #122).** The marketing team's GTM conversion is a link-click trigger on `Click URL` contains `my.pockitengineers.com` (Check Validation OFF). The user chose one combined number, so the desktop "Login" is an `<a href>` to the app and is counted alongside "Book a Service". Meta stays bookings-only: Login uses `openAppLink`, not `handleAppLinkClick`. Keep every app CTA a real `<a href>` (never a bare `<button>`) or GTM can't see it.
- **PII goes to Meta server-side only, hashed.** Raw personal data must never enter the browser `fbq(...)` payload — pass it as `MetaUserData` through `trackDeduplicated`, which routes it to the CAPI relay for SHA-256 hashing. Per-field normalisation (`hashName` / `hashPhone` / `hashCity` in `route.server.ts`) is load-bearing: Meta compares digests, so one stray space or a missing country code means no match at all. Add new PII fields there, not inline.

## Nav order

- **Header nav:** Services → How It Works → Our Promise → Testimonials → **Blog** → FAQ. Blog was originally second (AEO reasoning); user moved it after Testimonials on 2026-04-16 (CHANGELOG #016.1).
- **⚠️ REVERTED 2026-10-06 (CHANGELOG #123):** the two bullets below (Header CTAs #094 and App popup shared #099) describe the removed app-popup / `LoginModal` feature. `src/lib/appPopup.ts` and `src/components/landing/LoginModal.tsx` were deleted and Header/Footer restored to `useBookServiceNav`. Treat the text below as historical until/unless the feature is rebuilt.
- ~~**Header CTAs (added 2026-09-24, CHANGELOG #094):**~~ theme toggle → "Book a Service" (orange gradient; "Join Us" on `/become-a-technician`) → **"Login"** (outlined secondary pill). **Both "Book a Service" and "Login" open the same app popup** (#102). The Footer's "Book a Service" opens it too (#105); `useBookServiceNav` was deleted, so phones get the web app in a new tab, not an app store. On desktop, Login opens `https://my.pockitengineers.com/` (moved from `pockitapp.` in #101; the old host is still recognised as an app link in `APP_HOSTS`) in a centered popup the size of a **mobile screen**: the iframe is always exactly 390 × 844 and the whole screen is **scaled** with a transform to fit shorter windows (#103). The iframe carries `scrolling="no"` (#104): the app's document overflows its frame by 59px and would otherwise show vertical + horizontal scrollbars. Don't remove it. It's closed by a round ✕ icon just outside its **top-right corner** (`LoginModal.tsx`, CHANGELOG #096/#098). Not a Cancel pill below it. **Clicking the backdrop does not close it** (#100): only the ✕, or Esc, so a stray click can't discard what the user typed. Plain rounded screen, **no device mockup** (the user rejected a bezel/status-bar frame). Keep the width under 420px, or the embedded app stretches (#095). On mobile, it opens in a new tab from the menu. The URL and labels live in `HEADER` in `copy.ts`.
- **App popup is shared (CHANGELOG #099).** Its open state lives in `src/lib/appPopup.ts` (`openAppPopup()`), and `LoginModal` is mounted once, in `Header`. **Any CTA whose href points at the web app host opens the popup** on desktop and a new tab on mobile. Wire new CTAs with `appLinkAttrs(href)` + `handleAppLinkClick(e, href)`; never mount a second modal. Landing-page hero primary/secondary and the bottom banner are wired. The home-page hero is not (not requested).

## Chatbot backend (decided 2026-10-19)

- The chatbot backend (`SarthakE1211/customer_chatbot_backend-`, FastAPI) is hosted on **Vercel**, deployed manually or through Vercel's Git integration. **No GitHub Actions / CI pipeline** for it. Its setup guide is `VERCEL_DEPLOY.md` in that repo.
- Vercel Functions can't hold WebSockets, so the website talks to it over **REST only** (`POST /api/v1/chat`). Static builds must leave `NEXT_PUBLIC_WS_ENABLED` unset/`false`. `NEXT_PUBLIC_API_BASE` = the Vercel URL (GitHub secret used by `deploy-cpanel.yml`). Don't re-enable WS against the Vercel host.
- The static website (with the chatbot) is also mirrored to the public repo `SarthakE1211/pockit-website` and hosted on Vercel (Next.js preset, default `npm run build` = static export). That repo has **no `.github/` workflows** on purpose, and it was pushed as a fresh single commit (no history). Re-push a snapshot with a temp index (`GIT_INDEX_FILE`, `git add -A`, drop `.github`, `commit-tree`), never by pushing `main`. It's a public repo, so scan for secrets before every push. `/api/technician.php` doesn't run there, so the technician form only works on cPanel.

## chip.ai ↔ Chatwoot (decided 2026-10-27, CHANGELOG #134)

- **What:** every chip.ai website chat is mirrored to the support team's Chatwoot (`chat.pockitengineers.com`, inbox "Website – chip.ai") through the **`chip-bridge`** service (repo `pockit-chatwoot`, `chip-bridge/web.js`, served at `https://chat.pockitengineers.com/chip-bridge`). The browser never talks to Chatwoot directly and holds no Chatwoot tokens. Widget side: `src/services/chatwootBridge.ts`, enabled by `NEXT_PUBLIC_CHATWOOT_BRIDGE_URL` (unset = feature off).
- **All chats visible:** bot-handled chats sit in Chatwoot status `pending`; the team can watch any of them.
- **Live takeover happens only when** (a) an agent replies in Chatwoot, or (b) chip.ai fails **during support hours (Mon–Sun 10 AM–7 PM IST)**. Takeover = Chatwoot status `open`; chip.ai is then silent and agent replies show in the widget (polling, 4 s human / 10 s bot). **Resolving** in Chatwoot returns the chat to chip.ai.
- **"Talk to a human" is NOT a live chat (user's choice).** It keeps the Call / WhatsApp / Email card and additionally flags the conversation in Chatwoot (**High** priority + `follow_up` attribute + private note; Chatwoot bot tokens can't add labels) so the team assigns it and gets back to the customer. Don't turn it into a live handoff without asking.
- **Outside support hours** chip.ai keeps answering; chip.ai failures are only flagged (High priority), no takeover.
- **Customer details:** logged-in customers' name / mobile / `customer_id` come from the chat login (`getChatSession()`), never re-asked. Visitors who aren't logged in see a name + mobile form only once an agent has taken over.
- **Fail-open is load-bearing:** any bridge error must leave the chatbot behaving exactly as before. Don't make chip.ai replies wait on the bridge.
- **WhatsApp auto-answer by chip.ai is parked** (bridge `ENABLE_WHATSAPP_BOT=false`); revisit later.
- **Added 2026-10-28 (CHANGELOG #135):**
  - chip.ai calls are **retried twice (2 s, 5 s)** before counting as a failure.
  - A customer **typing** that they want a person (English / Hinglish / Hindi / Marathi, `src/services/humanRequest.ts`) is treated exactly like the "Talk to a human" chip: card + flag, no chip.ai call. **Complaints** are flagged and chip.ai still answers. Keep the patterns narrow; a false "person" match costs the customer a bot answer.
  - Every flag/takeover posts a **handover summary** private note (why, customer details, first + latest asks, what chip.ai found, language, next step), and the conversation's attributes keep a running context (`chat_topic`, `latest_ask`, `chip_service`, `chip_order`, `chip_pincode`, `chat_language`, `handover_reason`).
  - Customer details sent to the team: name, mobile, email, pincode, city, address, customer id, whichever the chat login provides (the backend currently returns name/mobile/customer id; email + address are requested from Sarthak).
  - After the team **resolves** a chat they took over, the agent conversation is posted to chip.ai (`POST /api/v1/chat/handback`, fail-open until the backend has it), because chip.ai keeps its own server-side history and ignores the widget's `history`.
  - A backend `handoff: true` (+ `handoff_summary`) flags the chat as "chip.ai couldn't help". Not a live chat.
- **Handover timing (2026-10-28, CHANGELOG #136):** the bridge is the single source of truth for bot/human and checks Chatwoot on every call. chip.ai replies that arrive after an agent joined are dropped (widget waits ≤1.5 s for the bridge's answer). A chip.ai-failure handover says "connecting you…" until an agent actually replies; if nobody replies within 3 min (`HUMAN_WAIT_MINUTES`), chip.ai takes back the chat, the customer sees "Our team is busy" + the contact card, and the chat is flagged; for the next 30 min further chip.ai failures only flag. Bridge unreachable in human mode → chip.ai answers.

## Testing expectations

- The user runs the site on a dev server and will test changes live. After each pass, hand the user a **specific thing to click or visit** (URL, button, scenario) rather than assuming the build passing is sufficient verification.

## Open reminders

- **Rotate the Sanity API token** once the blog is verified end-to-end — the current token was pasted in chat history during setup and should not be the one that lives in production. Tracked in `BLOG_TASKS.md` under "Post-launch".
