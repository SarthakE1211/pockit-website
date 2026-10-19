# SEO landing pages — author + deploy guide

This system powers the Mumbai SEO programme: pages like
`/laptop-repair-mumbai`, `/laptop-repair-andheri`,
`/laptop-not-turning-on-mumbai`. One Sanity document = one statically exported
HTML page on `pockitengineers.com`. No code change is required to add a new
page — only a new Sanity document and a redeploy of the static build.

Introduced in CHANGELOG #022.

---

## How it works (one paragraph)

A single Next.js route at `src/app/[slug]/page.static.tsx` reads every
`landingPage` document from Sanity at build time, calls `generateStaticParams`
for each slug, and emits `out/<slug>/index.html` into the cPanel zip. Specific
Next routes (`/about`, `/blog`, `/studio`, …) win over the dynamic `[slug]`, so
the catch-all only ever resolves slugs that don't collide with existing
pages. JSON-LD (`LocalBusiness` + `Service` + `BreadcrumbList` + `FAQPage`)
is emitted server-side, so crawlers see structured data even with JS off.

### Hand-authored schema overrides

Five slugs — `instant-it-help-mumbai`, `laptop-repair-mumbai`,
`macbook-repair-mumbai`, `desktop-repair-mumbai`, `printer-repair-mumbai` —
ship `Service` + `FAQPage` nodes written by the SEO team rather than derived
from Sanity. They live in `SERVICE_PAGE_SCHEMA` in
[`src/constants/schema.ts`](../src/constants/schema.ts), keyed by slug
(CHANGELOG #077).

For those slugs the route suppresses its own generated `Service` and
`FAQPage`, so the page carries exactly one of each; the Sanity-derived
`LocalBusiness` + `BreadcrumbList` still render. Every other landing page is
unaffected and keeps the full generated graph.

Two consequences worth knowing:

- **Editing FAQs in Studio does not change the schema on these five pages.**
  The visible accordion still reads Sanity `faqs`; the markup reads
  `SERVICE_PAGE_SCHEMA`. Keeping them in sync is a manual, deliberate act.
- **Bringing another page under the brief** means adding one entry to
  `SERVICE_PAGE_SCHEMA` — no other file changes.

---

## Adding a new page (editor flow)

1. **Open Studio** at the Sanity-hosted Studio (`https://<name>.sanity.studio`
   — ask an engineer for the exact subdomain; set by `npx sanity deploy`), or
   `http://localhost:3001/studio` in local dev. Studio is no longer embedded on
   the website.
2. In the structure tool sidebar, pick **Landing page (SEO)** → **Create new**.
3. Fill the fields, top to bottom:
   - **Title** — plain editor-facing title (e.g. `Laptop Repair Andheri`).
   - **URL slug** — what shows up in the URL (e.g. `laptop-repair-andheri`).
     Studio validates against the reserved list (`about`, `blog`, `studio`,
     `terms`, `privacy-policy`, `become-a-technician`, …) so you can't
     accidentally shadow a real route.
   - **Page type** — pick one:
     - `service-city` — a service for the whole city (e.g. Laptop Repair
       Mumbai).
     - `service-locality` — same service in a specific neighborhood
       (e.g. Laptop Repair Andheri).
     - `problem-fix` — symptom-led page (e.g. Laptop not turning on – Mumbai).
   - **Service** — short label (`Laptop Repair`, `WiFi Setup`, `MacBook
     Repair`). Surfaces in JSON-LD and breadcrumb.
   - **Location** — city or area (`Mumbai`, `Andheri`, `Powai`).
   - **Problem** — only for `problem-fix` pages.
   - **Hero heading / subheading / bullets / CTAs** — what the visitor sees
     above the fold.
   - **Intro** — one or two paragraphs of body copy.
   - **Services** — the cards in the "What we fix" section. Add as many as
     are relevant; 6–9 reads best.
   - **Trust bullets** — short reasons to choose Pockit; renders as a strip
     under the hero.
   - **Process** — optional 3-step "How it works".
   - **Areas served** — sub-localities. Optional `href` makes each chip a
     link to a sibling landing page (powerful internal linking — do this
     wherever you have a page for the area).
   - **Price range / phone / response time** — used in JSON-LD
     `LocalBusiness` and the hero microcopy.
   - **FAQs** — every Q/A pair becomes a visible accordion item AND a
     `FAQPage` JSON-LD entry. Aim for 6–10.
   - **Long-form SEO content (collapsed behind "Read More")** — optional
     keyword-rich supporting copy rendered *below* the FAQ accordion. Lead
     with one **H2** for the block title, then an **H3** per sub-section;
     bullet lists render as orange-ticked items. The whole block is always
     in the page HTML (crawlers and answer engines read all of it) but is
     hidden entirely until the visitor taps **Read More** (CHANGELOG #089) —
     so you can go long without burying the closing CTA. The toggle is a small accent pill
     sitting above the copy. Don't run the same copy on two pages —
     duplicate long-form text on two indexed URLs makes them compete.
     Live examples: `/macbook-repair-mumbai`, `/laptop-repair-mumbai`,
     `/instant-it-help-mumbai`, `/desktop-repair-mumbai`. See CHANGELOG #087,
     #089–#093, #097, #124.
     **No tables and no numbered lists** — the field registers a bullet list
     only. A price table becomes `**Service** — starts from ₹499` bullets and a
     numbered sequence carries its ordinal in the text (`**1. Book in the
     app**: …`); `/desktop-repair-mumbai` is the worked example. If you put
     prices here, keep them in step with the `Services` cards above.
     The schema offers only `normal`/`h2`/`h3`, and the single H2 is reserved
     for the block title — if your source copy nests a third heading level,
     fold it into bullets shaped `**Lead phrase** — explanation.` rather than
     inventing a deeper level (the `/instant-it-help-mumbai` block is the
     worked example). Q&A pairs inside the block render as a bolded question
     paragraph followed by the answer; note they do **not** reach the
     generated `FAQPage` JSON-LD — only the `FAQs` field above does.
   - **Related pages** — references to sibling `landingPage` documents.
     Drives the "Related services" module and is a major SEO signal.
   - **SEO**:
     - `Meta title` — ≤ 70 chars; falls back to `<title> · Pockit Engineers`.
     - `Meta description` — ≤ 160 chars; sentence case, action verb up front.
     - `OG image` — 1200×630 social share image.
     - `noIndex` — tick to keep the page out of search engines AND the
       sitemap (useful while drafting).
4. **Publish** the document.
5. **Trigger a cPanel rebuild** — `npm run build:static` from a working tree
   with the Sanity env vars in `.env.local`. Upload the resulting `out/`
   (or `public/pockit-cpanel-site.zip`) to cPanel.
6. **Submit the new URL** to Google Search Console (Inspect → Request
   indexing) and verify the sitemap entry appears at
   `https://www.pockitengineers.com/sitemap.xml`.

---

## Bootstrap / first-run

When the schema is first registered or the dataset is empty, populate the
initial `laptop-repair-mumbai` document with the seed script:

```bash
# 1. Make sure SANITY_API_WRITE_TOKEN is in .env.local
#    (Editor role — generate at sanity.io/manage → API → Tokens)
# 2. Run the seed
npm run seed:landing
```

The script uses `createOrReplace` so re-running it OVERWRITES the document.
Don't re-run after the editor team has started authoring in Studio.

If you only have `SANITY_API_READ_TOKEN`, the script will try it and exit
with instructions if it doesn't have write permission.

---

## Local development

`npm run dev` serves the route at `http://localhost:3001/<slug>` with live
Sanity data (the dev server runs the `BUILD_TARGET=server` config, which
includes Sanity Studio at `/studio` too). Changes published in Studio
appear after Next's revalidation window (≤ 60 s) without a server restart.

---

## Build target matrix

As of CHANGELOG #065 the blog is part of the **static** cPanel export too, so
`BUILD_TARGET=static` now covers the whole live site. `BUILD_TARGET=server`
is legacy/retired (the Vercel blog build is being torn down) and only still
holds the two parked routes.

|                              | `BUILD_TARGET=static` (cPanel — live) | `BUILD_TARGET=server` (legacy/retired) |
|------------------------------|---------------------------------------|----------------------------------------|
| `/`, `/about`, `/terms`, …   | ✓ static HTML                         | ✓ (same)                               |
| `/blog`, `/blog/[slug]`, `/blog/author/[slug]`, `/blog/rss.xml` | ✓ static HTML at build (`.static.*`) | — (was SSR + ISR) |
| `/blog/category/[slug]`      | excluded (`.server.tsx`, parked)      | ✓ (parked here until ≥1 category)      |
| `/studio`                    | excluded (`.server.tsx`)              | ✓ embedded (Studio is Sanity-hosted now) |
| `/<landing-page-slug>`       | ✓ static HTML at build                | ✓                                      |
| `/sitemap.xml`               | one sitemap: main-site + landings + blog (`route.static.ts`) | — (blog-only `route.server.ts` deleted) |

There is now a **single** `/sitemap.xml` for the host: the blog-only
`route.server.ts` sitemap and robots handlers were deleted and merged into
the main-site `src/app/sitemap.xml/route.static.ts`. The `.static.ts` suffix
is visible only on the static build via `pageExtensions` (see
`next.config.mjs`). A plain `route.ts` here would have collided with the
old blog sitemap on the server build — Next refuses to register two files
that resolve to the same URL — which is why the `.static.ts` / `.server.ts`
suffixing exists.

---

## Operations

- **GA4 dimensions** — `landing_view` events carry `page_slug`,
  `page_type`, `location`, `service`. Register these in GA4 Admin → Custom
  Definitions (same flow as the blog dimensions in CHANGELOG #012).
- **Adding a new top-level static page** to the main site
  (e.g. `/careers`) — also add it to the `STATIC_ROUTES` list in
  `src/app/sitemap.xml/route.static.ts` AND to the `RESERVED_SLUGS` arrays in
  both `sanity/schemas/landingPage.ts` and `src/app/[slug]/page.static.tsx`.
- **Renaming a landing page** — change the `slug.current` in Sanity AND
  add a 301 in `public/.htaccess` from the old slug to the new one. Don't
  rely on Sanity history alone.

---

## Troubleshooting

- **A new page isn't appearing on the live site** — did you run
  `npm run build:static` AND re-upload `out/` (or
  `public/pockit-cpanel-site.zip`) to cPanel? Static builds are baked at
  build time; new Sanity docs need a rebuild to ship.
- **A page works in Studio preview but not on the live site** — check the
  `noIndex` toggle; if it's on, the page is excluded from
  `generateStaticParams` and the sitemap.
- **`/sitemap.xml` doesn't include landing pages** — confirm the
  `SANITY_API_READ_TOKEN` env var is present at build time. If it's
  missing, the route handler logs the error and emits a sitemap with the
  static main-site routes only.
- **A reserved slug error in Studio** — pick a different slug. Reserved
  slugs are real routes (`/about`, `/blog`, `/studio`, …) and would be
  silently shadowed by Next routing precedence.
