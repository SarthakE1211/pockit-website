# Blog Deploy Guide

> **2026-06-22 — blog moved to single-host static cPanel (CHANGELOG #065).** The blog used to be a Vercel server build on its own subdomain (`pockitblog.pockitengineers.com`). It is now **statically exported into the cPanel build** and served at `https://www.pockitengineers.com/blog` — the **same host** as the marketing site. There is no longer a hybrid/dual-origin split. The old Vercel subdomain is being retired and 301-redirected to `/blog`. Sections that describe the Vercel setup below are kept as **legacy/retired** for history, not as live procedure.

The marketing site, the SEO landing pages, and the blog now all ship from the **same git repository** to the **same host** (cPanel) as one static export. This document is the operator's reference for how that pipeline is wired, how to ship changes, and how to unstick a failed deploy.

Pair this with:
- `CHANGELOG.md` — the historical record of every code change.
- `BLOG_TASKS.md` — the task queue for the blog rollout.
- `CLAUDE.md` — the locked project decisions (CMS, build targets, env vars).
- `docs/BLOG_EDITORS.md` — day-to-day guide for writers/editors.

---

## 1. The flow at a glance

Everything is one static build on one host. Content lives in Sanity and is pulled **at build time**; an editor publishing in Studio fires a webhook that rebuilds and re-uploads the whole static site.

```
   ┌──────────────────────────┐
   │   Sanity (content CMS)    │   project pg938kpo · dataset production
   │   posts, authors, landing │
   │   pages, site settings    │
   └────────────┬─────────────┘
                │  Editor clicks "Publish"
                │  → single Sanity webhook ("cPanel rebuild on content publish")
                │     POSTs to GitHub dispatch API (repository_dispatch: sanity-publish)
                ▼
   ┌──────────────────────────┐
   │  GitHub Action            │   .github/workflows/deploy-cpanel.yml
   │  "Deploy main site to     │   - checks out main
   │   cPanel"                 │   - npm ci
   │                           │   - npm run build:static  (pulls latest Sanity content)
   │                           │   - FTP-uploads out/ to cPanel
   └────────────┬─────────────┘
                │  ~4 min
                ▼
   ┌──────────────────────────┐
   │   cPanel (static host)    │   www.pockitengineers.com
   │   out/ → public_html/     │
   │                           │
   │   Marketing  /, /about,   │
   │   Landing    /laptop-…,   │
   │   Blog       /blog/**     │   (served via .htaccess clean-URL rewrite)
   └──────────────────────────┘
```

Same git trunk also triggers the Action on a push to `main` and on a manual `workflow_dispatch`. The `Header`, `Footer`, and CTA hooks render identically across marketing, landing, and blog pages because everything is now same-origin — `src/lib/siteUrls.ts` resolves all in-site links relative (no cross-origin hop needed).

---

## 2. Build targets

Both targets are driven by the `BUILD_TARGET` env var read at the top of `next.config.mjs`.

| Target | Script | Output | What's included | What's excluded |
|---|---|---|---|---|
| `static` (default) | `npm run build:static` (alias of `npm run build`) | `out/` — plain HTML/CSS/JS | Marketing pages, `/about`, `/become-a-technician`, SEO landing pages, **`/blog`, `/blog/[slug]`, `/blog/author/[slug]`, `/blog/rss.xml`**, the single `/sitemap.xml`, images, `public/.htaccess` | `/studio`, `/blog/category/[slug]` (both still `.server.tsx` — see below) |
| `server` (legacy/retired) | `npm run build:server` | `.next/` — Next.js server bundle | Everything in `static` **plus** the parked `/studio` + `/blog/category/[slug]` routes | — |

The blog is now part of the **static** export: its routes were renamed `.server.*` → `.static.*` and their segment-level `export const revalidate` (fatal under `output: "export"`) was dropped; dynamic routes use `dynamicParams = false` so only the slugs `generateStaticParams()` returns are emitted. Content is fetched at **build time** through the same public Sanity client the landing pages use.

Two routes are still gated out of the static export via the `.server.tsx` pageExtension:
- **`/studio`** — Studio moved off the site to Sanity-hosted (see §3). The embedded route is parked with the dying Vercel build.
- **`/blog/category/[slug]`** — **parked** because the dataset currently has **0 categories**, and an empty `generateStaticParams()` is a fatal error under `output: "export"`. It converts to `.static.tsx` the moment categories are in use (CHANGELOG #065).

> **`server` build is legacy.** `BUILD_TARGET=server` / `npm run build:server` and the Vercel project that ran it are being torn down (marketing-only history). Do not deploy the blog from Vercel anymore. Keep `build:server` runnable only so the two parked routes can still be type-checked.

> **Build parity rule.** After any `next.config.mjs` tweak, run `npm run build:static` and confirm it stays green. If you touch a parked route, also run `npm run build:server`.

---

## 3. Studio (Sanity-hosted)

The Sanity Studio is no longer embedded on the site. It is **Sanity-hosted**: deploy it once with

```bash
npx sanity deploy
```

and editors use the resulting `https://<name>.sanity.studio` URL. The embedded `/studio` route is excluded from the static cPanel export (it stays as `.server.tsx`, parked with the retired Vercel build), so there is no `pockitengineers.com/studio` — editing happens entirely on `*.sanity.studio`.

**CORS:** Sanity-hosted Studio (`*.sanity.studio`) origins are auto-allowed by Sanity — you do **not** need to add a CORS entry for it in `sanity.io/manage`. (The old guidance to add `https://pockitblog.pockitengineers.com` as a CORS origin is obsolete.)

---

## 4. Legacy / retired — Vercel blog subdomain

> **This whole section is historical.** The blog no longer deploys to Vercel. It is kept so the wiring is documented while the Vercel project and subdomain are decommissioned. **Action item (handoff):** retire the Vercel blog project and 301-redirect `https://pockitblog.pockitengineers.com/blog/*` → `https://www.pockitengineers.com/blog/*` so the indexed subdomain URLs forward for SEO.

The blog used to run as `BUILD_TARGET=server` on Vercel:
- Vercel project root `.`, build command `npm run build:server`, Node 24.x.
- Production env vars on Vercel included `BUILD_TARGET=server`, the Sanity project/dataset/read-token, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and `NEXT_PUBLIC_MAIN_SITE_URL=https://pockitengineers.com`.
- Custom domain `pockitblog.pockitengineers.com` was a **CNAME → `cname.vercel-dns.com`** on GoDaddy DNS.
- A Sanity → Vercel **deploy hook** rebuilt the subdomain on publish.

All of that is superseded by the single-host static pipeline in §1, §5, and §6. None of it should be set up fresh.

---

## 5. Sanity → GitHub publish webhook (cPanel rebuild)

This is the live publish path. Without it, the cPanel site only rebuilds on git pushes — so an editor publishing a post in Studio wouldn't see it until a code push. The webhook fixes that by POSTing to GitHub's dispatch API every time a Sanity document changes, which fires the `deploy-cpanel.yml` Action.

### 5.1 Create a GitHub PAT (one-time)

The webhook authenticates to GitHub with a Personal Access Token that has **`repo`** scope. Generate it at GitHub → Settings → Developer settings → Personal access tokens, and treat it as a secret. (It only needs permission to dispatch workflows on `PockIT-Engineers/POCKIT-Website-Fluxenta`.)

### 5.2 Wire the webhook into Sanity

1. [sanity.io/manage](https://sanity.io/manage) → project `pg938kpo` → **API → Webhooks → Create webhook**.
2. Configure:
   - **Name:** `cPanel rebuild on content publish`
   - **URL:** `https://api.github.com/repos/PockIT-Engineers/POCKIT-Website-Fluxenta/dispatches`
   - **Dataset:** `production`
   - **Trigger on:** Create, Update, Delete (all three).
   - **HTTP method:** `POST`
   - **HTTP headers:**
     - `Accept: application/vnd.github+json`
     - `User-Agent: sanity-webhook`
     - `Authorization: Bearer <GitHub PAT with repo scope>`
   - **Filter:** `_type in ["landingPage","post","author","category","tag","siteSettings"]` — only rebuild when real content changes, not every Studio tweak.
   - **Projection:**
     ```groq
     {
       "event_type": "sanity-publish",
       "client_payload": {
         "docType": _type,
         "slug": slug.current,
         "operation": delta::operation()
       }
     }
     ```
     The `event_type: "sanity-publish"` is what matches the Action's `repository_dispatch` trigger; the `client_payload` is echoed into the Action's run summary for debugging.
   - **API version:** `v2024-01-01` (or the latest stable offered).
   - **Include drafts:** off.
3. **Save**, then click Sanity's **test** button — confirm a new run appears under GitHub → Actions → "Deploy main site to cPanel".

### 5.3 Verify end-to-end

- In Studio (`*.sanity.studio`), publish any minor edit on a post.
- Within seconds, GitHub → Actions shows a new "Deploy main site to cPanel" run starting.
- ~4 minutes later (build + FTP upload), the change is live at `https://www.pockitengineers.com/blog/<slug>`.

If it doesn't trigger, check the webhook's **Log** tab in Sanity — it shows every POST attempt and GitHub's response code (a `204` is success for `repository_dispatch`; a `401`/`403` means the PAT is wrong or out of scope).

---

## 6. The "every push" flow

The `deploy-cpanel.yml` Action ("Deploy main site to cPanel") triggers on three events:

1. **`repository_dispatch`** of type `sanity-publish` — the Sanity webhook (§5). Content-only changes.
2. **`workflow_dispatch`** — manual run from the GitHub Actions tab.
3. **push to `main`** — scoped to `src/**`, `public/**`, `sanity/schemas/landingPage.ts`, `package.json`, `package-lock.json`, `next.config.mjs`, and the workflow file (with `!src/app/studio/**` excluded). Doc-only edits (CHANGELOG, README) don't trigger a deploy.

For a normal code change: open a PR, merge to `main`, and the path filter fires the Action automatically — `npm ci` → `npm run build:static` (which pulls the latest Sanity content) → FTP-upload `out/` to cPanel. No manual step for Sanity-only content changes — the webhook handles those.

### Manual rebuild fallbacks

If you need to force a rebuild without a content or code change:
- **GitHub → Actions → "Deploy main site to cPanel" → Run workflow** (the `workflow_dispatch` trigger), or
- push any qualifying change to `main`, or
- build locally and upload by hand: `npm run build:static` then upload `out/` to cPanel `public_html` (shortcut: `npm run zip:cpanel` bundles `out/` → `public/pockit-cpanel-site.zip`).

---

## 7. Rollback

There is now a single host to roll back, and it's deploy-by-artifact.

1. **Keep the last good build.** Before each manual upload, keep the previous `out/` (or `public/pockit-cpanel-site.zip`) around. For Action-driven deploys, the previous successful run is the artifact of record.
2. **Fastest:** GitHub → Actions → "Deploy main site to cPanel" → open an earlier **successful** run → **Re-run jobs**. It rebuilds from that commit and re-uploads.
3. **Code rollback:** `git revert <bad-commit> && git push origin main` — the path filter fires a fresh deploy from the reverted tree.
4. **Manual file rollback (cPanel has no version history):** in cPanel File Manager, rename the current `public_html` contents to `public_html_broken_YYYYMMDD`, then upload + extract the previous known-good zip.

> **Email + DNS are untouched by deploys.** A bad deploy only replaces static files under `public_html`. Zoho (MX) email and the domain's DNS records are unaffected, so a rollback never risks mail.

---

## 8. Failure triage

| Symptom | First guess | Fix |
|---|---|---|
| Action build fails with `Module not found: Can't resolve '@sanity/client'` | A `next.config.mjs` change dropped Sanity from the static build, or a blog route lost its `.static.tsx` suffix. | Confirm the blog routes are `*.static.tsx` and `npm run build:static` is green locally. |
| Action build fails with `Missing environment variable NEXT_PUBLIC_SANITY_PROJECT_ID` / `SANITY_API_READ_TOKEN` | The build step's `env:` block in `deploy-cpanel.yml` is missing a var, or a GitHub repo Secret was deleted. | Check the `env:` block in the "Build static export" step + GitHub → Settings → Secrets → Actions. |
| Build fails: `export const revalidate` … not allowed under `output: export` | A blog route kept (or re-added) a segment-level `revalidate`, which is fatal under static export. | Remove the `export const revalidate` line; rely on the per-fetch `next: { revalidate, tags }` in `queries.ts` instead (CHANGELOG #065). |
| Build fails on `/blog/category/[slug]`: empty `generateStaticParams()` | The category route was flipped to `.static.tsx` while the dataset still has 0 categories. | Keep it `.server.tsx` until ≥1 category exists in Sanity, then convert. |
| `/blog/<post>` returns 404 on the live site (but `/blog` works) | The `.htaccess` nested clean-URL rewrite is missing or got overwritten. | Confirm `public/.htaccess` has `RewriteRule ^(blog/.+?)/?$ /$1.html [L]`; it maps `/blog/<slug>` → `out/blog/<slug>.html`. Re-deploy. |
| Blog loads but images are broken | `images.unoptimized`/loader config changed, or a Sanity image URL is malformed. | Confirm the static export keeps unoptimized images and the `urlFor()` builder points at `cdn.sanity.io`. |
| Publishing in Studio doesn't trigger a rebuild | Webhook not firing, filter too strict, or the PAT expired. | Sanity → API → Webhooks → `cPanel rebuild on content publish` → **Log** tab. A `401`/`403` = bad/expired PAT; widen the filter if it's over-restrictive. |
| "Blog" nav link points at the dead subdomain | `NEXT_PUBLIC_BLOG_URL` is set on the build — it shouldn't be anymore (blog is same-origin). | Remove `NEXT_PUBLIC_BLOG_URL` from the build env / GitHub Secrets. The link should resolve to the relative `/blog`. |
| Old `pockitblog.pockitengineers.com/blog/...` URLs 404 | The Vercel subdomain is being retired but the 301 isn't in place yet. | Add the `pockitblog.pockitengineers.com/blog/*` → `www.pockitengineers.com/blog/*` 301 (handoff item) so indexed URLs forward. |
| GA4 DebugView empty on live but works locally | Brave Shields / an ad blocker, or the measurement ID wrong in the build env. | Test in Chrome incognito. Confirm `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4MLTMPX7YX` is in the Action's build env. See `docs/BLOG_ANALYTICS.md`. |

---

## 9. Security hygiene

- **Rotate `SANITY_API_READ_TOKEN` before launch.** The token used during setup lived in chat history. Go to `sanity.io/manage → pg938kpo → API → Tokens` → delete the old "Next.js read" token → create a new Viewer token → update both `.env.local` and the GitHub repo Secret → re-run the Action.
- **The GitHub PAT in the Sanity webhook is a secret.** Anyone with it can dispatch a production rebuild. Scope it to `repo` only, and regenerate it in GitHub if it leaks.
- **Never commit `.env.local`.** It's in `.gitignore`; verify with `git check-ignore -v .env.local` before any push.
- **CORS on Sanity.** Sanity-hosted Studio (`*.sanity.studio`) is auto-allowed — no entry needed. Only add `http://localhost:3001` for local dev. Don't add `*`.

---

## 10. Reference: environment variables

The blog is **same-origin** now, so the cross-origin resolver env vars are obsolete on every build.

```
# .env.local (dev, same for everyone working on the repo)
NEXT_PUBLIC_SANITY_PROJECT_ID=pg938kpo
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=<viewer token — keep private>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4MLTMPX7YX
# Do NOT set NEXT_PUBLIC_BLOG_URL or NEXT_PUBLIC_MAIN_SITE_URL — everything is same-origin.
```

```
# cPanel static build (BUILD_TARGET=static) — wired in deploy-cpanel.yml's build step
NEXT_PUBLIC_SANITY_PROJECT_ID=pg938kpo
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=<GitHub repo Secret>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4MLTMPX7YX
# (plus the chatbot/Firebase NEXT_PUBLIC_* vars the Action already wires)
```

**Obsolete — do not set on any build:**

| Variable | Status | Why |
|---|---|---|
| `NEXT_PUBLIC_BLOG_URL` | **Obsolete** | Blog is same-origin at `/blog`. Setting it would rewrite the in-site `/blog` link to the dead `pockitblog.pockitengineers.com` subdomain. |
| `NEXT_PUBLIC_MAIN_SITE_URL` | **Obsolete** | There is no separate blog origin to hop back from; `siteUrls.ts` resolves main-site links relative. |
| `BUILD_TARGET=server` (on a deploy) | **Legacy** | The Vercel blog build is retired. |

---

## 11. Open follow-ups

- **Retire the Vercel blog project** and **301-redirect** `pockitblog.pockitengineers.com/blog/*` → `www.pockitengineers.com/blog/*` once the cPanel blog is verified end-to-end (preserves SEO on already-indexed subdomain URLs).
- **Flip `/blog/category/[slug]` to `.static.tsx`** the moment the dataset has ≥1 category (it's parked as `.server.tsx` today to avoid the empty-`generateStaticParams()` export error).
- Write a smoke-test script that hits `/blog`, a representative post, `/blog/rss.xml`, and `/sitemap.xml` post-deploy — fail the deploy if any return non-200.
- Add a deploy-status badge to the README from the `deploy-cpanel.yml` Action.
