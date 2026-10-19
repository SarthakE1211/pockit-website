# Blog Analytics

This document is the operator's guide to the blog's measurement plan: what we track, how it's wired, what's required in the GA4 admin UI for the numbers to be reportable, and how to verify the whole thing end to end.

All events route through the existing `window.gtag` loaded in `src/app/layout.tsx` (measurement ID `G-4MLTMPX7YX`, shared with the main site). There is no second analytics vendor in play.

Introduced end to end in CHANGELOG #012. Earlier increments: #008 shipped card-click / category-filter / search events; #009 shipped `share_click` on the share buttons.

---

## What we measure

| Event                | Where it fires                                                  | Parameters                                                                 |
|----------------------|-----------------------------------------------------------------|----------------------------------------------------------------------------|
| `post_view`          | On mount of `/blog/[slug]`                                      | `post_slug`, `post_category?`, `post_author?`                              |
| `scroll_depth`       | At 25 / 50 / 75 / 100 % of the article's scrolled distance      | `percent` (one of 25, 50, 75, 100), `post_slug`, `post_category?`, `post_author?` |
| `engagement`         | At 30 s / 60 s / 180 s of *visible* time on a post              | `seconds` (one of 30, 60, 180), `post_slug`, `post_category?`, `post_author?` |
| `card_impression`    | First time a post card enters the viewport (index + featured + related) | `post_slug`, `surface` (`index` / `featured` / `related` / `category` / `author`), `post_category?` |
| `blog_card_clicked`  | Click on any `PostCard` or `FeaturedPost` anchor                | `post_slug`, `post_category?`, `surface`                                   |
| `blog_category_filter` | `BlogIndexInteractive` category chip clicked                  | `category_slug`                                                            |
| `blog_search`        | `BlogIndexInteractive` search input commits                     | `query`                                                                    |
| `share_click`        | `ShareBar` / `ShareRail` button clicked                         | `channel` (e.g. `twitter`, `linkedin`, `copy`), `post_slug`                |
| `cta_click`          | In-post CTA clicked (seam; not yet wired — future Portable Text CTA block) | `cta_id`, `cta_label?`, `cta_href?`, `post_slug`, `post_category?`, `post_author?` |

**Scalar discipline.** GA4 custom dimensions are scalar-only. Posts can have multiple Sanity categories, so `post_category` is flattened to the primary (first) category's title — the same title the breadcrumb and hero chip already show.

---

## Code layout

```
src/lib/analytics.ts
  └── low-level `trackEvent(name, params)` wrapper around `window.gtag`.
      No blog-specific behavior, no DOM APIs, no timers.
      Just the registry + the adapter.

src/services/blogAnalytics.ts
  └── blog-specific service. Owns:
        - trackPostView(ctx)
        - trackCardImpression(slug, surface, category?)
        - trackCtaClick({ ctaId, ctaLabel?, ctaHref?, postContext })
        - createScrollDepthTracker({ articleId, postContext }) → cleanup
        - createEngagementTracker({ postContext })           → cleanup
      Every export is SSR-safe: factories check `typeof window === "undefined"`
      and return a no-op cleanup.

src/components/blog/PostAnalytics.tsx
  └── headless "use client" island. On mount it fires `post_view` (ref-guarded
      against React 19 StrictMode double-invoke) and starts the scroll + engagement
      trackers. On unmount it tears them both down.

src/components/blog/PostCard.tsx
src/components/blog/FeaturedPost.tsx
  └── hook Framer Motion's `onViewportEnter` (the same observer driving
      their `whileInView` entrance animation) to fire `card_impression`
      exactly once per mount via a `useRef<boolean>` guard.
```

**Why the service is separate from `lib/analytics.ts`.** Keep `lib/analytics.ts` as a dumb, domain-agnostic adapter over `gtag`. The blog's behavior (scroll math, visibility-aware timers, dimension flattening) lives in the service so the adapter doesn't grow a blog-shaped bulge.

**Why the scroll handler doesn't piggyback `ReadingProgress`.** `ReadingProgress` already has a RAF-throttled scroll path, but coupling analytics to a presentation component means a future UI refactor could silently break analytics. They're kept isolated. The overlap is two passive RAF-throttled listeners, which is cheap.

---

## One-time manual step: register custom dimensions in GA4

Every blog event ships `post_slug`, and most ship `post_category` and `post_author`. **Until these are registered as Custom Dimensions in the GA4 admin UI, they'll appear in DebugView but won't be reportable** (you won't be able to pivot the Engagement or Pages reports by post/category/author).

This is a one-time configuration task. Do it once and forget it.

1. Open **GA4 → Admin → Data display → Custom definitions → Custom dimensions**.
2. Click **Create custom dimension**. Fill in:

    | Field              | Value                                                         |
    |--------------------|---------------------------------------------------------------|
    | Dimension name     | `Post slug`                                                   |
    | Scope              | **Event**                                                     |
    | Description        | `Blog post slug (e.g., welcome-to-the-pockit-engineers-blog)` |
    | Event parameter    | `post_slug`                                                   |

3. **Save**. Repeat for:

    | Dimension name   | Scope | Event parameter | Description                                     |
    |------------------|-------|-----------------|-------------------------------------------------|
    | Post category    | Event | `post_category` | Primary category title (e.g. `Industry Insights`) |
    | Post author      | Event | `post_author`   | Author display name                              |

4. GA4 caps properties at 50 custom dimensions. We're using 3.
5. DebugView picks up the new values immediately. Standard reports can take up to 24 h.

---

## Verification (end to end)

Do this once after the dimensions are registered.

1. **Start the server build.** Run `npm run dev:server` (or `npm run build:server && npm run start:server` if you want to verify against the production bundle). Open `http://localhost:3001/blog`.
2. **Open GA4 DebugView.** In GA4 → Admin → DebugView. With Chrome's **GA Debugger** extension enabled (or `?debug_mode=1` on the URL) your own hits will appear here in real time.
3. **Browse the index.**
    - Scroll down so several post cards enter the viewport. Confirm one `card_impression` per card, with `surface: "index"` and `post_slug` matching the card.
    - Confirm one `card_impression` for the featured hero with `surface: "featured"`.
    - Click a category chip → confirm `blog_category_filter` with `category_slug`.
    - Type in the search box and commit → confirm `blog_search` with `query`.
4. **Click through to a post.** Confirm a `post_view` fires on arrival with `post_slug`, `post_category`, and `post_author` populated.
5. **Scroll the post slowly.** As you pass the 25 / 50 / 75 / 100 % marks of the article, confirm one `scroll_depth` event per milestone with the matching `percent` value. Each event should carry the post context.
6. **Sit on the post.** Wait 30 s, then 60 s. Confirm `engagement` events fire at both milestones with the matching `seconds` value. (Put the tab in the background for a while — the timer should pause, so backgrounded time should not count toward the next milestone.)
7. **Click a share button.** Confirm `share_click` with `channel` and `post_slug`.
8. **Scroll to the related-posts module and back to the top.** Confirm `card_impression` fires for the related cards with `surface: "related"`. Scrolling back over already-seen cards should **not** re-fire — impressions are one-shot per mount.

If any event fails to appear: check that `window.gtag` is defined in the console (`typeof window.gtag`) — if it's `"undefined"`, your `.env.local` probably doesn't have `NEXT_PUBLIC_GA_MEASUREMENT_ID` set for the build target you're running.

---

## Gotchas and notes

- **React 19 StrictMode.** Dev mode double-invokes effects. `PostAnalytics` guards `post_view` with a ref so it only fires once across the replay. Scroll + engagement trackers are internally idempotent (`Set` of fired milestones), so the mount/unmount/remount cycle is safe there too.
- **Page Visibility.** The engagement timer pauses when `document.hidden` is `true` and flushes elapsed time on cleanup. Background tabs therefore don't inflate engagement numbers, and a quick unmount still credits whatever seconds were already earned.
- **Hash navigation on long articles.** If a reader lands already-scrolled via an anchor link (e.g. a deep-link to a heading) the scroll tracker runs `compute()` once on setup so they still get credit for their starting depth.
- **Where `cta_click` will wire in.** The Portable Text schema doesn't have a CTA block type yet. `trackCtaClick` is the landing pad for a future `ctaButton` type — when that lands, the client-rendered button component can call `trackCtaClick({ ctaId, ctaLabel, ctaHref, postContext })` and no further analytics work is required.
