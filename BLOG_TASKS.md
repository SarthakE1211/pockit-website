# Blog project — task list

Living tracker for the Sanity + Next.js blog build. Pairs with `CHANGELOG.md` (which carries the per-file code detail); this file is the **high-level status view** so you can see at a glance where we are without reading diffs.

**Architecture:** Single-host static. The blog is statically exported into the cPanel build and served at `pockitengineers.com/blog`, alongside the marketing site and SEO landing pages. Content comes from Sanity (fetched at build time); Studio is Sanity-hosted (`*.sanity.studio`). One repo, one deploy target.

> **2026-06-22 (CHANGELOG #065):** migration landed. The blog moved off the Vercel subdomain (`pockitblog.pockitengineers.com`) onto cPanel at `/blog`. The old hybrid/dual-origin model and the `BUILD_TARGET=server` Vercel build are retired; the subdomain is being 301'd to `/blog`. Earlier "Option B (hybrid)" task history below is preserved for the record but is superseded by this line.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked / needs attention

---

## Phase 0 — Setup & decisions

- [x] Lock architecture (Option B: hybrid cPanel + Vercel)
- [x] Choose CMS (Sanity, embedded Studio at `/studio`)
- [x] Define v1 feature scope (index, post, category, tag, author, featured, related, search, RSS, sitemap)
- [x] Choose GA events and custom dimensions
- [x] Create Sanity project — ID `pg938kpo`, dataset `production`
- [x] Generate Sanity Viewer API token (stored in `.env.local`)
- [x] Confirm existing GA4 measurement ID (`G-4MLTMPX7YX`, previously `G-QPGT0MW6T7` — swapped 2026-04-15) — shared with main site
- [x] Write locked decisions into `CLAUDE.md`
- [x] Create this task tracker
- [x] Create Vercel account (user confirmed existing personal account 2026-04-16)

---

## Phase 1 — Build configuration

- [x] **#002** Make `next.config.mjs` conditional on `BUILD_TARGET` (`static` vs `server`)
- [x] **#002** Add `npm run build:static` and `npm run build:server` scripts
- [x] **#002** Add `cdn.sanity.io` to `images.remotePatterns` (server branch)
- [x] **#003** Cross-shell build scripts via `cross-env` (fix PowerShell `'BUILD_TARGET' is not recognized`)
- [x] **#003** Portable `zip:cpanel` (replace `rm`/`zip` with Node one-liner + `bestzip`)
- [x] **#003** Verified: `npm run build:static` on PowerShell produces `out/` with 7 prerendered routes (2026-04-14)

---

## Phase 2 — Sanity integration

- [x] **#004** Add dependencies: `sanity`, `next-sanity`, `@sanity/client`, `@sanity/image-url`, `@sanity/vision`, `@portabletext/react`, `groq` (+ `styled-components` peer)
- [x] **#004** Create `sanity.config.ts` at the repo root
- [x] **#004** Write schemas under `sanity/schemas/`: `post`, `author`, `category`, `tag`, `siteSettings`
- [x] **#005** Align Sanity dep versions with Next 16 (`next-sanity@^12`, `sanity@^5`, `@sanity/client@^7`, React 19.2.3+)
- [~] **#005** Verify: `npm install` resolves cleanly, then `npm run build:static` still passes — **waiting on user**
- [x] **#006** Embedded Studio route at `src/app/studio/[[...tool]]/page.server.tsx` (server build only — excluded from static export via `pageExtensions`)
- [x] **#006** Dev scripts default to `BUILD_TARGET=server` so `/studio` works under `npm run dev`
- [~] **#006** Verify: Studio loads at `/studio` on dev server, editor can log in with Sanity credentials — **waiting on user**
- [ ] **#006** (follow-up) Enforce `siteSettings` singleton via Studio structure customization
- [x] **#007** Sanity client in `src/lib/sanity/client.ts` (public CDN + authenticated + preview clients)
- [x] **#007** Image URL builder in `src/lib/sanity/image.ts` (`urlFor`, `urlForOG`)
- [x] **#007** GROQ queries in `src/lib/sanity/queries.ts` (index, single post, related, by-category, by-author, all-slugs, categories, search-index, site settings) — each with a typed fetcher and ISR tags
- [x] **#007** TypeScript types matching schemas in `src/lib/sanity/types.ts`
- [x] **#007** Env + secrets centralized in `src/lib/sanity/env.ts`; barrel export in `src/lib/sanity/index.ts`

---

## Phase 3 — Blog pages

- [x] **#008** `/blog` index page: hero ("Insight and Updates" style), category chip filter, client-side search input, featured post card, post grid — all using existing theme tokens
- [x] **#008** Components: `BlogHero`, `PostCard`, `FeaturedPost`, `BlogEmptyState`, `BlogIndexInteractive` (chip bar + search folded into the interactive shell rather than split into separate `CategoryChipBar` / `SearchInput` — one source of filter state is cleaner)
- [ ] **#008** Verify: index renders with seed content, search filters client-side, category chips filter the grid _(user verification pending — hit `http://localhost:3001/blog` on the dev server)_
- [x] **#016** Fix: chip row on `/blog` was rendering only the "All" chip because `getAllCategories()` returns zero rows when no published Category documents exist. Server component now computes a de-duplicated union of canonical Category docs plus categories referenced on any published post — the chip bar is self-healing against missing taxonomy docs
- [ ] **#016** Re-verify: reload `http://localhost:3001/blog`; the chip row should list "All" plus every category referenced on any post. Click a chip and confirm the grid filters to only posts tagged with that category
- [x] **#075** Fix: `/blog` and all sub-routes 404'd on the dev server. `.static.*` suffixes (from #065) are invisible to the `server` build target that `npm run dev` uses. Reverted the blog index/post/author/RSS routes to plain `.tsx`/`.ts` (both targets); kept `/blog/category/[slug]` parked on `.server.tsx` (Sanity has 0 categories → empty `generateStaticParams()` is fatal under `output: export`); removed stray `NEXT_PUBLIC_BLOG_URL` from `.env`. Verified live on the dev server (all blog routes 200). See CHANGELOG #075.
- [x] **#009** `/blog/[slug]` individual post page: breadcrumb, title, meta row (author, date, reading time), cover image, Portable Text body, reading progress bar, share bar, related posts
- [x] **#009** Components: `PostBreadcrumb`, `PostMeta`, `PostBody` (Portable Text with anchor-id emitting headings), `TableOfContents` (sticky scroll-spy, desktop), `ShareRail` (vertical, desktop) + `ShareBar` (horizontal, mobile) sharing `src/lib/blog/share.ts`, `AuthorBlock`, `RelatedPosts`, `ReadingProgress` (top 3px bar with orange halo)
- [x] **#009** Share channels wired: WhatsApp, LinkedIn, X/Twitter (native web share intents), Instagram (copy-to-clipboard + "paste into Instagram" toast — IG blocks inbound web share URLs)
- [x] **#009** `BlogShareClick` analytics event added; fires `share_click` with `channel` + `post_slug` on every share button press
- [x] **#009** `generateStaticParams` + `revalidate=60` + the existing `blog:post:<slug>` cache tag from queries.ts wire SSG + ISR on the Vercel server build
- [ ] **#009** Verify: open a seed post at `http://localhost:3001/blog/<slug>`, confirm body renders, ToC highlights current section on scroll, share buttons open their channels (Instagram shows copy toast), related posts show, progress bar fills as you scroll
- [x] **#009.1** Fix: body column was visibly off-center (left-anchored inside its grid cell per the 2026-04-15 screenshot from user). Switched to `[220px_minmax(0,760px)_220px]` with `justify-center` + right spacer so body is truly centered on the page. Header/cover now use `max-w-[760px]` + `mx-auto` instead of `lg:ml-[252px]` offsets
- [ ] **#009.1** Re-verify: breadcrumb, title, cover, and body all share the page midline on desktop; mobile stacking unchanged
- [x] **#009.2** Fix: clicking a ToC item scrolled the page but the ToC list itself moved up out of view. Root cause — sticky rail held ToC + ShareRail, combined height exceeded viewport, so `position: sticky` can't pin. Moved share buttons to a horizontal `ShareBar` above the body on all breakpoints; sticky left rail now holds only the ToC (compact enough to stay pinned). Also satisfies user preference for horizontal share buttons across all screen sizes
- [ ] **#009.2** Re-verify: click a ToC item — the body scrolls to that section, the ToC stays visible on the left. Share bar reads horizontally above the body on desktop
- [x] **#016** Fix: TOC was never pinning at all during normal scrolling. Root cause — every blog route's `<main>` was `min-h-screen overflow-y-auto`, which declares a sticky scroll container but lets `<main>` grow to fit content so the window scrolls instead. Switched all four blog routes (`/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/blog/author/[slug]`) to `h-screen` so `<main>` becomes a real internal scroll container (matching `src/components/landing/AppShell.tsx`). Sticky descendants now pin correctly
- [ ] **#016** Re-verify: open any post, scroll the article body — the left-rail Table of Contents should stay pinned near the top. The section heading highlight should also update as different `<h2>`s cross the viewport
- [ ] **#009** (follow-up) 3-column grid check on `/blog` index — confirm desktop lays cards out as `lg:grid-cols-3` with unlimited rows (already wired in `BlogIndexInteractive.tsx`, just needs eyeballing once there are 4+ posts)
- [x] **#010** `/blog/category/[slug]` and `/blog/author/[slug]` listing pages — reuses `BlogHero`, `PostCard`, `BlogEmptyState`. Category page: hero + post grid. Author page: hero + profile card (avatar/bio/socials) + post grid. Both carry `generateStaticParams`, `revalidate=60`, and `blog:category:<slug>` / `blog:author:<slug>` cache tags
- [x] **#010** Added `getCategoryBySlug` + `getAuthorBySlug` fetchers + matching GROQ queries in `src/lib/sanity/queries.ts`
- [ ] **#010** Verify: publish a post with a category and author assigned, visit `http://localhost:3001/blog/category/<slug>` and `http://localhost:3001/blog/author/<slug>`; confirm hero, post card, "← All posts" link
- [x] **#011** `/blog/rss.xml` route handler generating the RSS 2.0 feed (`src/app/blog/rss.xml/route.server.ts`) — includes `<dc:creator>`, cover-image enclosure, category tags; honors `siteSettings.rssTitle` / `rssDescription`; inherits `blog:index` cache tag — **verified 2026-04-16, returns valid RSS 2.0 XML with both seed posts**
- [x] **#011** Sitemap as a route handler (`src/app/sitemap.xml/route.server.ts`) — lists `/blog`, `/blog/rss.xml`, every post (`lastModified` from `publishedAt`), every category, every author. _First pass used the `sitemap.ts` file convention but it doesn't compose with our `.server.ts` pageExtensions gating — rewritten as a manual handler to match the RSS pattern_
- [x] **#011** `robots.txt` as a route handler (`src/app/robots.txt/route.server.ts`) — allows all, disallows `/studio`, points crawlers at the sitemap
- [x] **#011** Verified 2026-04-16: `http://localhost:3001/sitemap.xml` returns valid XML with both posts, both authors, and the static entries (`/blog`, `/blog/rss.xml`); `http://localhost:3001/robots.txt` returns plain text with the sitemap line. Note: one placeholder author slug (`hi`) shows up — content cleanup for Studio before launch, not a code issue

---

## Phase 4 — Analytics

- [x] **#012** Extend `src/lib/analytics.ts` with new event constants
- [x] **#012** New module `src/services/blogAnalytics.ts` with scroll-depth tracker, engagement milestones, IntersectionObserver card impressions
- [x] **#012** Fire `post_view` with `post_slug`, `post_category`, `post_author` as GA4 custom dimensions
- [x] **#012** Fire `scroll_depth` at 25/50/75/100% milestones
- [x] **#012** Fire `engagement` at 30s, 1m, 3m
- [x] **#012** Fire `card_impression` on index when cards enter viewport (PostCard + FeaturedPost via Framer Motion's `onViewportEnter`)
- [x] **#012** Fire `cta_click` on in-post CTAs (seam ready in `trackCtaClick` — will wire to a Portable Text CTA block when that schema type lands) and `share_click` on share buttons (already wired in #009)
- [ ] **#012** Register the three custom dimensions in GA4 admin UI (**manual step — user action required**, see instructions below and in `docs/BLOG_ANALYTICS.md`)
- [ ] **#012** Verify: all events appear in GA4 DebugView during a test browse (**user verification**, step-by-step in `docs/BLOG_ANALYTICS.md`)

### #012 — GA4 admin: register the three custom dimensions (one-time, ~2 min)

This has to happen once in the GA4 UI before the new `post_slug` / `post_category` / `post_author` values become reportable. Until it's done, the events will still fire and show in DebugView, they just won't show up as dimensions in reports.

1. Go to **GA4 → Admin → Data display → Custom definitions → Custom dimensions**
2. Click **Create custom dimension** and add these three, one at a time (scope = **Event** for all three):

    | Dimension name   | Scope | Event parameter  | Description                              |
    |------------------|-------|------------------|------------------------------------------|
    | Post slug        | Event | `post_slug`      | Blog post slug (e.g., `welcome-to-the-pockit-engineers-blog`) |
    | Post category    | Event | `post_category`  | Primary category title (e.g., `Industry Insights`) |
    | Post author      | Event | `post_author`    | Author display name                      |

3. Save each. (Note: GA4 has a 50-custom-dimension-per-property ceiling; we're using three.)
4. It can take up to 24 h for these to appear in reports (DebugView shows them immediately).

---

## Phase 5 — Main-site integration

- [x] **#013** Add "Blog" link to `NAV_LINKS` / `HEADER` in `src/constants/copy.ts` — slotted second (after Services) for AEO; added a `NavLink` interface; also added a Blog entry to `FOOTER_LINKS.Company` between "How It Works" and "Join as a Technician".
- [x] **#013** Make the link point to `pockitblog.pockitengineers.com` in production, localhost:3001 in dev — implemented via `src/lib/siteUrls.ts` + `NEXT_PUBLIC_MAIN_SITE_URL` / `NEXT_PUBLIC_BLOG_URL` build-time env vars. Both unset in dev → same-origin; each build target sets exactly one.
- [x] **#013** Mirror the main site's `Header` and `Footer` on the blog so visual continuity holds across the subdomain boundary — Header, Footer, StickyBookCTA, and `useBookServiceNav` all now route through `resolveNavHref` so the same components correctly cross origins on either build. Blog nav link shows an active state when the user is on any `/blog/*` route (`aria-current="page"` + accent background).
- [ ] **#013** Verify (for the user, on `:3001` with both env vars unset):
  - [ ] From `/`, click "Blog" in the top nav → lands on `/blog`; the nav link gains the accent active style.
  - [ ] From `/blog`, click "Services" → hops to `/#download` and scrolls the home's download section.
  - [ ] From `/blog/<any-post>`, click the Pockit logo → lands on `/`.
  - [ ] Click "Book a Service" from both a home page and a blog page — both reach the download section.
  - [ ] Footer "Blog" link (Company column) behaves like the nav link.
- [ ] **#013 (deploy-time)** Set `NEXT_PUBLIC_BLOG_URL=https://pockitblog.pockitengineers.com` in the cPanel build env, and `NEXT_PUBLIC_MAIN_SITE_URL=https://pockitengineers.com` in Vercel's project settings. Re-run the same 5 clicks against the live origins and confirm the URL bar crosses origins where expected.

---

## Phase 6 — Deploy

### Docs (written by Claude — ready to hand off)

- [x] **#015** Create `docs/BLOG_DEPLOY.md` — 11-section operator guide: architecture diagram, build targets, one-time Vercel setup, GoDaddy DNS/CNAME walk-through, Sanity → Vercel webhook, every-push flow, rollback, failure triage, security hygiene, env var reference, open follow-ups
- [x] **#015** Create `docs/BLOG_EDITORS.md` — 12-section editor handbook: Studio access, prerequisite taxonomy setup, writing a post (content/taxonomy/media/SEO tabs), Portable Text guidance, image hotspot + alt text rules, publish/unpublish/schedule flow, draft preview workarounds, site-settings singleton, common gotchas, URL reference, post-publish checklist
- [x] **#015** Update `README.md` — reflect dual build targets, `src/app/blog` + `src/app/studio` + `sanity/` in project structure, required env vars, corrected scripts list, link to the three blog docs
- [x] **#015** Update `CLAUDE.md` build-target notes already reflect deploy-time env vars (#013)

### User-only steps (Claude cannot do these — require Sanity webhook admin, GitHub Secrets/PAT, Sanity Studio deploy)

Click-through instructions for each are in **`docs/BLOG_DEPLOY.md`**. Section pointers listed below.

> **2026-06-22 (CHANGELOG #065):** the Vercel-era setup below is **superseded** by the single-host static pipeline. The `[x]` rows are kept as history; the open items have been replaced with the single-host equivalents.

History (Vercel-era, now retired):
- [x] ~~Create Vercel project, set build command `npm run build:server`~~ — done 2026-04-17, now being torn down
- [x] ~~Set Vercel env vars (`BUILD_TARGET=server`, Sanity, GA, `NEXT_PUBLIC_MAIN_SITE_URL`)~~ — done 2026-04-17, obsolete
- [x] ~~First Vercel deploy → `*.vercel.app` preview loaded the blog~~ — done 2026-04-17
- [x] ~~Custom domain `pockitblog.pockitengineers.com` on Vercel + GoDaddy CNAME → `cname.vercel-dns.com`~~ — done 2026-04-17, subdomain being 301'd to `/blog`

Single-host setup (current):
- [ ] Deploy the Sanity-hosted Studio (`npx sanity deploy`) and share the `*.sanity.studio` URL with editors — **`docs/BLOG_DEPLOY.md` §3**
- [ ] Create a GitHub PAT (`repo` scope) and add the Sanity → GitHub publish webhook (`cPanel rebuild on content publish`, POST to the repo `dispatches` API, `event_type: sanity-publish`) — **`docs/BLOG_DEPLOY.md` §5**
- [ ] Confirm the `SANITY_API_READ_TOKEN` GitHub repo Secret is set so the `deploy-cpanel.yml` Action can fetch Sanity content at build time
- [ ] Smoke-test end-to-end: publish a draft in Studio, confirm the "Deploy main site to cPanel" Action runs and the post appears at `www.pockitengineers.com/blog/<slug>` within ~4 min — **`docs/BLOG_DEPLOY.md` §5.3**
- [ ] **(handoff)** Retire the Vercel blog project and 301-redirect `pockitblog.pockitengineers.com/blog/*` → `www.pockitengineers.com/blog/*`

---

## Phase SEO — May 2026 audit follow-through

Tracker for the recommendations that came out of `Pockit Engineers Seo Audit Presentation.pptx`. Not gated on the blog work — runs in parallel.

### Done in Phase 1 (CHANGELOG #031–#036, 2026-05-14)
- [x] Per-page meta titles + descriptions on `/`, `/about`, `/become-a-technician`, `/expert` (Mumbai-first keywords)
- [x] About-page H1 rewritten to be keyword-rich; Hero description rewritten with service + city keywords
- [x] Alt-text fixes on Hero phone + ten ServiceGrid cards (per-service `imgAlt` field)
- [x] LocalBusiness + WebSite (SearchAction) + FAQPage JSON-LD added in `app/layout.tsx`; AboutPage + JobPosting JSON-LD on respective routes
- [x] Floating WhatsApp button (`WhatsAppFloat.tsx`) mounted globally
- [x] Main-site `robots.txt` (`route.static.ts`) — was missing on the cPanel build
- [x] `BUSINESS` constants centralised in `copy.ts` so JSON-LD, WhatsApp button, and footer never drift

### Phase 2 (CHANGELOG #037, 2026-05-14)
- [x] Wire homepage Laptop card → `/laptop-repair-mumbai` (other services keep `#download` until their landing pages are authored)
- [x] Footer "Laptop Repair" link rewired to `/laptop-repair-mumbai`
- [x] Confirmed landing-page schema is already rich (LocalBusiness + Service + OfferCatalog + BreadcrumbList + FAQPage) — no schema work needed
- [x] Sitemap already pulls every published landing page from Sanity via `getAllLandingPagesForSitemap()` — no `STATIC_ROUTES` change needed
- [x] **Home-page H1 decision:** user opted to keep brand H1 ("Bharat's Only IT Services App"). Keyword payload lives in meta + Hero subtitle.
- [x] **LocalBusiness address decision:** user opted to defer to city-level only. Skip GBP enrichment until claim.

### Phase 4 — SEO team's JSON-LD brief (CHANGELOG #077, 2026-08-03)
- [x] All hand-authored JSON-LD extracted to `src/constants/schema.ts`; emitted via `src/components/seo/JsonLd.tsx`
- [x] Organization + WebSite site-wide from `layout.tsx` `<head>`; LocalBusiness + FAQPage moved to home page only
- [x] LocalBusiness now carries `streetAddress` + `postalCode` + `geo` (supersedes the 2026-05-14 "defer to city-level" decision at line 183)
- [x] Hand-authored `Service` + `FAQPage` on `/instant-it-help-mumbai`, `/laptop-repair-mumbai`, `/macbook-repair-mumbai`, `/desktop-repair-mumbai`, `/printer-repair-mumbai`; generated pair suppressed on those slugs
- [ ] ⚠️ **Confirm opening hours.** Brief supplied `opens 11:00 / closes 08:00` — `closes` precedes `opens`, so Google reads it as 11:00 → 08:00 next day. If the real hours are 11 AM – 8 PM, set `closes: "20:00"` in `LOCAL_BUSINESS_SCHEMA`.
- [ ] Confirm dropping `aggregateRating` (4.9 / 10,000) was intended — the brief omits it and there are no on-page reviews to back it
- [ ] Reconcile the three live phone numbers: `918069251494` (LocalBusiness), `+91-9240251266` (service-page provider), `+91 88822 80156` (`BUSINESS.telephone`, visible UI)
- [ ] Supply the Google Business Profile URL so it can join `Organization.sameAs`
- [ ] Validate the five service pages + home in Google's Rich Results Test after the next cPanel deploy

### Phase 2 carry-over (do as new landing pages land)
- [ ] Author next landing pages in Sanity Studio: `/macbook-repair-mumbai`, `/wifi-installation-mumbai`, `/printer-repair-mumbai`, `/cctv-installation-mumbai`, `/smart-tv-setup-mumbai` (the `landingPage` schema accepts them — no code change required)
- [ ] After each new page lands, set `landingHref` on the matching entry in `SERVICES` (`src/components/landing/ServiceGrid.tsx`) and update the matching `FOOTER_LINKS` href in `copy.ts`

### Phase 3 (CHANGELOG #038, #039, 2026-05-14)
- [x] Converted 18 PNG/JPG files in `public/` to WebP (~6.5 MB → ~1.4 MB, 78% saved). Script: `npm run convert:webp`
- [x] Deferred Chatbot + Firebase chunk past first paint via `ChatbotMount` wrapper — chunk now loads on first user interaction or 5 s idle, not on initial page load (~125 KB removed from critical path)
- [ ] Re-run [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.pockitengineers.com) once #037–#039 are deployed and capture the new mobile + desktop scores (audit baseline: 58 mobile / 59 desktop)
- [ ] Ask user to **submit `sitemap.xml` to Google Search Console** for `pockitengineers.com` (single host now — the blog lives at `/blog` under the same property; the retired `pockitblog.pockitengineers.com` subdomain no longer needs its own submission)
- [ ] Ask user to **register the new GA4 events** in GA4 admin: `whatsapp_float_click` (#033), `service_card_click` (#037)
- [ ] Optional follow-up cleanup: delete unreferenced PNG cruft (`public/images/hero_phone.png`, `blue_brand_logo.png`, `logo-footer.png`, `Kartik.JPG.jpeg`) after a final visual sweep of the dev server

### Phase 5 — Long-form on-page SEO copy (CHANGELOG #087, 2026-09-08)
- [x] New `landingPage.seoContent` Portable Text field + `SeoContentSection` in `LandingPageView.tsx` — renders below the FAQ accordion, clamped to 340px behind a **Read More** button, always present in the HTML so it indexes in full
- [x] MacBook supporting copy authored into the published `macbook-repair-mumbai` Sanity document (33 blocks: 1 H2, 5 H3, 12 paragraphs, 15 ticked bullets)
- [x] Collapse shell extracted to `src/components/seo/ReadMoreContent.tsx`; hidden by default (#089), accent pill above the copy (#090), gap under the FAQ tightened (#091)
- [x] **Placement settled on `/macbook-repair-mumbai` (CHANGELOG #092)** — briefly lived on the home page (#088); home-page block and `HOME_SEO_CONTENT` removed, copy re-pushed to Sanity unchanged
- [ ] **Run `npx sanity deploy`** — the Studio is Sanity-hosted, so editors can't see the new "Long-form SEO content" field until the Studio is redeployed
- [ ] Ask user to **register `content_expanded`** in GA4 admin (param: `page_slug` — the landing-page slug)
- [x] `/laptop-repair-mumbai` block authored (CHANGELOG #093) — 19 blocks, 5 bullets. Content-only; no code change needed
- [x] `/instant-it-help-mumbai` block authored (CHANGELOG #097) — 81 blocks, 7 H3 sub-sections, 32 ticked bullets, 8 Q&A pairs. Content-only; no code change needed
- [x] `/desktop-repair-mumbai` block authored (CHANGELOG #124) — 68 blocks, 6 H3 sub-sections, 29 ticked bullets (incl. the price table as bullets), 7 Q&A pairs. Content-only; no code change needed
- [ ] Author a *distinct* block for the last service page: `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
- [ ] **Decision for the user:** the desktop copy deck proposes a new meta title ("Desktop Repair in Mumbai | PC & Computer Repair at Home | Pockit") and H1 ("Desktop Repair in Mumbai at Your Doorstep") that differ from what's live on `desktop-repair-mumbai` ("Computer Repair in Mumbai …"). Not applied — #124 was scoped to the hidden block only. Applying them is a Studio field edit, no code change
- [ ] Decide whether the 8 Q&A pairs inside the `/instant-it-help-mumbai` block should be promoted into the visible `faqs` accordion (it currently holds 5 *different*, remote-session-specific questions). Only the visible ones reach the generated `FAQPage` JSON-LD
- [ ] Fix the "stands apart on three fronts" line on `/macbook-repair-mumbai` — four bullets follow it (one-field edit in Studio)
- [ ] Optional: point `IntroSection` at `seoContentComponents` too. Its `prose prose-lg …` classes are dead — `@tailwindcss/typography` is not installed (`tailwind.config.ts` → `plugins: []`)

### Off-page (NOT code work — flag back to the user / marketing team)
- [ ] Optimise Google Business Profile (claim, complete, post, reply to reviews)
- [ ] Author 2–4 blog posts per month (CMS already wired — uses Sanity Studio at `/studio`)
- [ ] Build backlinks via local listings, social bookmarking, articles, infographics

---

## Phase 7 — Post-launch verification

- [ ] Publish a test draft in Sanity, confirm the "Deploy main site to cPanel" Action runs and it appears at `www.pockitengineers.com/blog/<slug>` within ~4 minutes
- [ ] Scroll through a post, verify all four scroll-depth events fire in GA4 DebugView
- [ ] Click a CTA inside a post, verify `cta_click` event with correct params
- [ ] Click each share button, verify `share_click` with the right channel param
- [ ] Fetch `/blog/rss.xml`, validate with an RSS validator
- [ ] Check `sitemap.xml` — confirm blog URLs are listed
- [ ] Audit with Lighthouse (blog index + a post page), confirm no regressions vs. main site scores

---

## Reminders

> **[!] Rotate the Sanity API token before launch.** The current token (`sk...`) was pasted into chat history during setup. Once the blog is working end-to-end, go to `sanity.io/manage → pg938kpo → API → Tokens`, delete the current "Next.js read" token, create a fresh Viewer token, and update both `.env.local` (local dev) and the `SANITY_API_READ_TOKEN` GitHub repo Secret (used by `deploy-cpanel.yml`). Then re-run the Action.

> **Build parity.** Any change to `next.config.mjs` must be verified against `npm run build:static` (the live target). If it touches a parked route (`/studio`, `/blog/category/[slug]`), also run `npm run build:server`.

> **Changelog discipline.** Every code change → a new `CHANGELOG.md` entry with before/after per file. Non-negotiable.

> **Doc upkeep.** After each phase lands, update `README.md` if the change affects day-to-day dev workflow, and update this file (`BLOG_TASKS.md`) so the status view stays current.
