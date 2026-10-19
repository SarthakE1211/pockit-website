# PockIT Engineers — Marketing Website + Blog

Single codebase, one host. Everything is a static export served from cPanel at `pockitengineers.com`:
- **Marketing site** + **SEO landing pages** — static-exported to cPanel.
- **Blog** (`pockitengineers.com/blog`) — statically exported into the **same** cPanel build, content pulled from Sanity at build time. Studio is **Sanity-hosted** (`*.sanity.studio`), not embedded on the site.

> As of 2026-06-22 (CHANGELOG #065) the blog moved off its Vercel subdomain (`pockitblog.pockitengineers.com`) and onto the cPanel site at `/blog`. The `BUILD_TARGET=server` (Vercel) build is legacy/retired.

Built with:
- **Next.js 16** (App Router, dual `BUILD_TARGET=static|server`)
- **React 19**
- **Tailwind CSS**
- **Framer Motion**
- **Lucide React**
- **Sanity v5** + `next-sanity` — headless CMS powering the blog

See `docs/BLOG_DEPLOY.md` for the single-host build/publish pipeline, and `CLAUDE.md` → "Blog project" for locked editorial decisions.

---

## Tech Stack and Runtime

- **Node.js:** `>=24` (see `package.json` + `.nvmrc`)
- **Package manager:** npm
- **Linting:** ESLint 9 (`eslint.config.mjs`)
- **Build tooling:** Next.js + PostCSS + Tailwind

---

## Project Structure

### Root

- `package.json` — scripts, dependencies, engine constraints.
- `package-lock.json` — locked dependency tree.
- `.nvmrc` — local Node version hint.
- `next.config.mjs` — Next runtime config (image formats/cache headers, strict mode behavior).
- `tailwind.config.ts` — Tailwind theme extension/config.
- `postcss.config.mjs` — PostCSS pipeline.
- `tsconfig.json` — TypeScript compiler config.
- `eslint.config.mjs` — ESLint flat config.
- `.gitignore` — ignored files.
- `README.md` — this file.

### App Router (`src/app`)

- `src/app/layout.tsx` — root HTML shell, global metadata/icons, theme bootstrap script.
- `src/app/page.tsx` — home page entry, mounts landing shell.
- `src/app/loading.tsx` — route loading boundary (currently returns `null`).
- `src/app/globals.css` — global styles and theme CSS variable tokens.

#### Route groups/pages
- `src/app/about/layout.tsx` — metadata for About Us.
- `src/app/about/page.tsx` — About Us (company story + “Join as a Technician” section).
- `src/app/become-a-technician/layout.tsx` — metadata for technician onboarding page.
- `src/app/become-a-technician/page.tsx` — **Join as a Technician** at `/become-a-technician` (legacy `/expert` redirects here).
- `src/app/privacy-policy/page.tsx` — privacy policy page.
- `src/app/delete-account/page.tsx` — account-deletion instructions; the URL given to Google Play's Data safety form. Keep the app/developer name and steps in sync with the Play listing.
- `src/app/terms/page.tsx` — terms and conditions page.

### Components

#### Landing components (`src/components/landing`)
- `AppShell.tsx` — main landing composition and page fade-in container.
- `Header.tsx` — top nav, theme toggle, responsive menu, theme-aware logo.
- `Hero.tsx` — hero section, CTAs, city pills, motion effects.
- `ServiceGrid.tsx` — service cards section.
- `HowItWorks.tsx` — process walkthrough.
- `PockITPromise.tsx` — trust/safety proposition section.
- `KPIStats.tsx` — KPI counter/stat section.
- `TestimonialsSection.tsx` — testimonial bento grid and stat cards.
- `FAQ.tsx` — FAQ accordion/content.
- `DownloadBand.tsx` — app download CTA band.
- `FloatingDownload.tsx` — floating app store CTA.
- `WhatsAppFloat.tsx` — bottom-right floating WhatsApp pill (home page, appears after scroll).
- `Footer.tsx` — footer links, social links, theme-aware logo.
- `ScrollProgress.tsx` — reading/scroll progress indicator.
- `SectionPill.tsx` — reusable section label chip.
- `ThemeSync.tsx` — applies persisted `data-theme` on routes that use it.
- `BrandLoader.tsx` — branded loader component (available in codebase; not currently mounted in `AppShell`).

#### Expert components (`src/components/expert`)
- `ExpertHero.tsx` — full technician page: hero (Hinglish + value strip), stats, section nav, service categories, how it works/join, CTA band, animated FAQ accordion.

### Shared constants and hooks

- `src/constants/copy.ts` — primary content source: landing copy, footer/nav, `EXPERT_PAGE_UC` (technician page sections), `EXPERT_HERO` / `EXPERT_BELOW`, FAQ items, etc.
- `src/hooks/useScrollTop.ts` — scroll observer hook.
- `src/hooks/useIsMobile.ts` — mobile viewport detection hook.

### Static assets (`public`)

- `public/logo.png` — site icon/favicon asset.
- `public/qr-linktree.png` — QR asset used in download sections.
- `public/images/` — logos, illustrations, hero/service artwork.
  - Brand/logo assets: `OG Logo.svg`, `blue_brand_logo.svg`, `logo-footer.svg`, etc.
  - Landing illustrations/photos: `tanya.jpg`, `hero_phone.png`, service images, KPI/response illustrations.
- `public/avatars/` — cartoon-style rating avatars on the technician page (`cartoon-1.svg`, etc.).

### Blog + CMS (`src/app/blog`, `sanity/`)

The blog lives under `/blog/**` and is **statically exported into the cPanel build** — its routes are `.static.tsx` files, so `npm run build:static` emits `/blog`, every post, and author pages into `out/`. Content comes from Sanity, fetched at **build time**. Two routes stay out of the static export via the `.server.tsx` pageExtension: the embedded `/studio` (Studio is Sanity-hosted now) and `/blog/category/[slug]` (parked until the dataset has ≥1 category — an empty `generateStaticParams()` is fatal under `output: export`).

- `src/app/blog/**` — index (`.static.tsx`), post (`.static.tsx`), author (`.static.tsx`), RSS (`.static.ts`); `/blog/category/[slug]` parked as `.server.tsx`.
- `src/app/sitemap.xml/route.static.ts` — single sitemap for the host (marketing + landing + blog).
- `src/app/studio/[[...tool]]/page.server.tsx` — embedded Studio mount point, excluded from the static export. Editors use the Sanity-hosted Studio (`npx sanity deploy` → `*.sanity.studio`).
- `sanity.config.ts` — Studio configuration (projectId, dataset, plugins).
- `sanity/schemas/` — document schemas: `post`, `author`, `category`, `tag`, `siteSettings`, `landingPage`.
- `src/lib/sanity/` — GROQ queries, image URL builder, typed client.
- `src/lib/siteUrls.ts` — link resolver used by the shared Header/Footer. The blog is same-origin now, so it resolves all in-site links relative (the cross-origin env vars are obsolete).

### SEO landing pages (`src/app/[slug]`, `src/components/landing-pages/`)

Sanity-driven city / locality / problem-fix pages mounted at the marketing-site root — `/laptop-repair-mumbai`, `/laptop-repair-andheri`, `/laptop-not-turning-on-mumbai`, etc. One Sanity `landingPage` document = one statically exported HTML page on cPanel. New pages ship by authoring in Studio + redeploying the static build, no code change. See `docs/LANDING_PAGES.md`.

### Docs

- `docs/CSS.md` — theme/token reference and styling conventions.
- `docs/BLOG_ANALYTICS.md` — GA4 setup, custom events, dashboards.
- `docs/BLOG_DEPLOY.md` — operator reference: single-host static pipeline, build targets, Sanity → GitHub publish webhook, rollback, failure triage.
- `docs/BLOG_EDITORS.md` — day-to-day guide for writers/editors: log in, draft a post, add images, publish, preview.
- `docs/LANDING_PAGES.md` — SEO landing-page programme: how to author a new page in Studio, build/deploy flow, troubleshooting.

---

## How Content Is Managed

Most landing copy and stats are centralized in:
- `src/constants/copy.ts`

If you need to update text like KPI numbers, city names, labels, button text, FAQ items, or technician-page copy, start there first. Technician WhatsApp number lives in `EXPERT_HERO.ctaHref`; the default prefilled message is set in `ExpertHero.tsx` (`handleJoinClick`).

---

## Theming

The site uses CSS variables with `data-theme` on `<html>`.
- Theme tokens: `src/app/globals.css`
- Runtime theme syncing: `Header.tsx`, `Footer.tsx`, `ThemeSync.tsx`
- Persisted preference key: `localStorage["pockit-theme"]`

---

## Local Development

```bash
npm ci
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). (The dev server runs in `BUILD_TARGET=server` mode so both the marketing site and the blog are reachable locally — `/`, `/blog`, `/studio`, etc.)

### Required env vars (local)

Create a `.env.local` at the repo root (do **not** commit) with:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=pg938kpo
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=<viewer token — ask an engineer>
```

Do **not** set `NEXT_PUBLIC_MAIN_SITE_URL` or `NEXT_PUBLIC_BLOG_URL` — anywhere. They are obsolete since the blog moved to the same origin (`/blog`); the shared Header/Footer's link resolver (`src/lib/siteUrls.ts`) resolves everything same-origin. Setting `NEXT_PUBLIC_BLOG_URL` would wrongly point the in-site `/blog` link at the dead subdomain.

### Scripts

- `npm run dev` — start dev server on port 3001 in server mode (webpack).
- `npm run dev:turbo` — same, but with Next's Turbopack.
- `npm run build:static` (aliased as `npm run build`) — cPanel export → `out/`. Includes marketing, landing pages, and the blog (`/blog`, posts, author pages, RSS). Excludes `/studio` and the parked `/blog/category/[slug]`.
- `npm run build:server` — full server build → `.next/`. **Legacy/retired** — the Vercel blog build is being torn down. Kept only so the parked `/studio` + `/blog/category/[slug]` routes can be type-checked.
- `npm run zip:cpanel` — run `build:static` then zip `out/` → `public/pockit-cpanel-site.zip` for cPanel upload.
- `npm run preview:static` — serve the `out/` folder locally after `build:static` (port 3000).
- `npm run start` — **not used** for the marketing site export. Only relevant if you ever run the server build locally (`next start` on the `.next/` output).
- `npm run lint` — ESLint across the repo.
- `npm run seed:landing` — one-shot bootstrap that pushes the initial `laptop-repair-mumbai` document to Sanity. Requires `SANITY_API_WRITE_TOKEN` (Editor role). Re-running OVERWRITES; don't re-run after editors start authoring. See `docs/LANDING_PAGES.md`.

---

## Deployment Notes

Everything ships from the **same git trunk** to **one host** (cPanel) as a single static export. Content comes from Sanity at build time. Full operator guide: **`docs/BLOG_DEPLOY.md`**.

### Whole site (marketing + landing + blog) → cPanel (static export)

The `deploy-cpanel.yml` GitHub Action ("Deploy main site to cPanel") builds and FTP-uploads `out/` automatically. It triggers on:
1. **push to `main`** (paths under `src/**`, `public/**`, `next.config.mjs`, etc.).
2. **`workflow_dispatch`** — manual run from the Actions tab.
3. **`repository_dispatch`** type `sanity-publish` — fired by the Sanity publish webhook.

Manual / local fallback:

1. `npm ci`
2. `npm run build:static` — writes `out/` (marketing + landing pages + `/blog`; no `/studio`).
3. Upload **everything inside** `out/` to cPanel **public_html** (or `npm run zip:cpanel` → `public/pockit-cpanel-site.zip` for a one-click upload).

Do **not** set `NEXT_PUBLIC_BLOG_URL` on this build — the blog is same-origin at `/blog`. Legacy per-step cPanel notes: **`CPANEL_STATIC.md`**.

### Content publish flow (Sanity → live in ~4 min)

Editor clicks **Publish** in the Sanity-hosted Studio (`*.sanity.studio`) → a single Sanity webhook POSTs to GitHub's dispatch API (`repository_dispatch: sanity-publish`) → `deploy-cpanel.yml` rebuilds the static site (pulling the latest Sanity content) and FTP-uploads → live at `pockitengineers.com/blog`. See **`docs/BLOG_DEPLOY.md` §5**.

### Blog → Vercel (legacy/retired)

The blog used to be a `BUILD_TARGET=server` build on `pockitblog.pockitengineers.com` via Vercel. That is **retired** as of 2026-06-22 (CHANGELOG #065) — the subdomain is being 301'd to `/blog` and the Vercel project torn down. Do not deploy the blog from Vercel anymore.

---

## Security

- The static build has no runtime secrets in the shipped bundle, but the **build** reads `SANITY_API_READ_TOKEN` from the environment (wired as a GitHub repo Secret for the Action). Never commit it. Rotate it after any pairing session where the token string has been pasted into chat or a doc. Tracked as an open reminder in `CLAUDE.md`.
- `.env.local` holds local secrets and is git-ignored.
- The Sanity publish webhook authenticates to GitHub with a Personal Access Token (`repo` scope). That PAT is a secret — anyone with it can dispatch a production rebuild. Scope it tightly and regenerate it if it leaks.

---

## License

Proprietary. Confirm usage/redistribution rights with PockIT Engineers.
