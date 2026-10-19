# Blog Editors Guide

Day-to-day handbook for writers and editors working on **PockIT Engineers — Blog**. If you're an engineer looking for deploy/rollback mechanics, see `docs/BLOG_DEPLOY.md` instead.

This guide assumes you have Sanity Studio access and are writing on the live `production` dataset. Everything below happens inside the browser — no code, no terminal.

Pair this with:
- `docs/BLOG_DEPLOY.md` — operator/deploy reference (how the blog gets from your "Publish" click to the live URL).
- `CLAUDE.md` → "Blog project" — the locked editorial decisions (scope, features, analytics).

---

## 1. Getting access

Studio access is invitation-only. To be added, your email needs to be invited by a project admin via [sanity.io/manage](https://sanity.io/manage).

1. Open the invite email from Sanity and click **Accept invite**.
2. Create a Sanity account (Google or email/password — either works).
3. Once added, you can sign in at either of these URLs:
   - **Live Studio** (edit real production content): the Sanity-hosted Studio at `https://<name>.sanity.studio` (ask an engineer for the exact subdomain — it's set by `npx sanity deploy`). Studio is no longer embedded on the website.
   - **Local Studio** (engineering use only): `http://localhost:3001/studio`

> The live Studio edits the same `production` dataset an engineer would see from local. There is no separate "staging" blog — drafts live next to published documents and only appear on the public site once published.

---

## 2. What's in Studio

The left rail of Studio shows every document type we support:

| Type | What it is | When you touch it |
|---|---|---|
| **Post** | A single blog post. | Most of your time. |
| **Author** | A byline + bio. Has its own public page at `/blog/author/[slug]`. | Once per writer. |
| **Category** | Primary taxonomy (e.g. "Repairs", "Guides"). Shows as chip filters on the blog index. (Standalone `/blog/category/[slug]` pages are parked — they go live once at least one Category exists; ask an engineer to flip the route on.) | Rarely — define these up front. |
| **Tag** | Lighter-weight topic grouping (e.g. "laptop", "data-recovery"). Has `/blog/tag/[slug]` pages but no chip bar. | As needed per post. |
| **Site settings** | Blog-wide knobs: hero title, RSS metadata, default OG image, footer disclaimer. A **singleton** (only one document exists). | Rarely — when marketing copy on the blog index changes. |

Above the document list, the **Vision** tab is a read-only GROQ query playground. It's safe — feel free to explore, you can't break anything from there.

---

## 3. Prerequisites before your first post

A **Post** requires a chosen **Author** and **at least one Category**. Create those first, otherwise the Post form will block you from publishing.

### 3.1 Create an Author

1. In the left rail, click **Author** → **+ Create**.
2. Fill in:
   - **Name** — display name as it appears on the byline.
   - **Slug** — click **Generate** to auto-fill from the name. Keep it lowercase, hyphen-separated.
   - **Role** — optional, shows under the name on author pages (e.g. "Founder", "Senior Technician").
   - **Bio** — up to 500 chars. One or two short paragraphs.
   - **Avatar** — upload a square photo (400×400 or larger). Drag the crosshair to set the **hotspot** — that's the part of the image that stays in view when the frame is cropped smaller. See [§5 on images](#5-images-cover-alt-text-hotspot).
   - **Social links** — all optional.
3. Click **Publish** (bottom right). The author now appears in the Post form's author dropdown.

### 3.2 Create a Category

1. Left rail → **Category** → **+ Create**.
2. Fill in:
   - **Title** — short, capitalized. Max 40 chars. (e.g. "Guides")
   - **Slug** — auto-fill from title.
   - **Description** — optional, shown on the category's own page.
   - **Order** — a number. Lower = earlier in the chip bar. Leave at the default (`100`) unless you have a reason; space categories in increments of 10 if you ever need to reorder.
3. **Publish**.

### 3.3 Create a Tag

Same pattern, just lighter:

1. Left rail → **Tag** → **+ Create**.
2. **Title** (max 30 chars) + auto-generated **Slug**.
3. **Publish**.

Tags are cheap — add them liberally on posts. Categories should stay tight: prefer not creating a new category per post.

---

## 4. Writing a post

### 4.1 Start a new post

1. Left rail → **Post** → **+ Create**.
2. The form opens in the **Content** tab. You'll see four tabs: **Content**, **Taxonomy**, **Media**, **SEO**. Fill them in roughly in that order.

### 4.2 Content tab

| Field | What to write | Constraints |
|---|---|---|
| **Title** | The headline readers see on the index card and on the post page. | Required. 4–140 chars. |
| **Slug** | The URL segment (`/blog/[slug]`). | Required. Click **Generate** after writing the title. Edit manually only if you need a shorter URL. Avoid changing the slug after publishing — it breaks inbound links and share URLs. |
| **Excerpt** | One- or two-sentence summary. Shows on the index card **and** as the meta description if you don't override it in SEO. | Max 280 chars. |
| **Body** | The article itself. See [§4.3](#43-body-portable-text). | No hard length limit. |
| **Featured on blog index** | Toggle on to promote this post to the hero slot on `/blog`. If multiple posts have this on, the most recent by `publishedAt` wins. | Default off. |
| **Published at** | The visible byline date *and* the trigger for ordering and RSS. | Required. Defaults to "now" when you create the post. You can backdate or future-date freely. See [§6](#6-publishing-and-scheduling). |

### 4.3 Body (Portable Text)

The **Body** field is a rich text editor. It's not a WYSIWYG Word clone — it's a *structured* editor. Every paragraph has a declared style, and every bit of inline formatting has a meaning. That's why the blog pages know how to render it across every screen size.

**Block styles** (dropdown at the top-left of the toolbar):
- **Normal** — body paragraph. Default.
- **H2** — section heading. Use at most one H1-level concept per post (the post title is the H1); H2s are the top-level sections.
- **H3** — sub-section inside an H2.
- **H4** — sparingly. Usually only for long reference posts.
- **Quote** — a blockquote / pull quote.

**Inline marks** (toolbar):
- **Strong** (bold), **Emphasis** (italic), **Code** (inline `monospace`).
- **Link** — highlight text, click the link icon, paste the URL. For external links, consider whether it's a trusted source (we do not `nofollow` by default).

**Embedded blocks** (the **+** button at the end of a line):
- **Image** — see [§5](#5-images-cover-alt-text-hotspot).
- **Callout** — a highlighted aside. Pick a **tone**: `info` (neutral blue), `warning` (amber), or `success` (green). Good for tips, warnings, or "key takeaway" boxes. Keep callout bodies short — they're not a second body.

**Things the schema does not currently support** (intentional):
- Bulleted/numbered lists through the block editor. If you need a list, use short paragraphs or inline comma-separated phrasing. (If this becomes a recurring need, file a request in `BLOG_TASKS.md` under "Post-launch" and we'll add list styles.)
- Tables. Same story.
- Raw HTML embeds. Same story.

### 4.4 Taxonomy tab

- **Author** — dropdown. Pick the author you created in §3.1. Required.
- **Categories** — add at least one. Click **Add item → Select existing** to pick from your category documents. You can add more than one; the first one listed is what shows as the primary chip on the post card.
- **Tags** — optional but encouraged. Any number.

### 4.5 Media tab

- **Cover image** — the image that appears on the index card and at the top of the post page. See [§5](#5-images-cover-alt-text-hotspot) for sizing and hotspot guidance.

### 4.6 SEO tab

All optional overrides. Fill these only when you want something different from the defaults.

| Field | Default | Override when |
|---|---|---|
| **Meta title** | Post title | The title is long and you want a tighter search-snippet headline. Max 70 chars (Google truncates around 60). |
| **Meta description** | Excerpt | You want search-result copy that reads differently from the on-card excerpt. Max 160 chars. |
| **Open Graph image** | Cover image | You want a different image on Twitter/LinkedIn/Slack previews (e.g. a text-overlay version). |
| **Hide from search engines** | Off | You're publishing something internal that should be reachable by link but not indexed (rare — e.g. a partner-only draft). |

---

## 5. Images (cover, alt text, hotspot)

### 5.1 Sizing guidance

| Usage | Minimum | Recommended |
|---|---|---|
| Cover image | 1200×675 | 1600×900 (16:9) |
| Inline body image | 800 wide | 1600 wide (retina-ready) |
| Author avatar | 200×200 | 400×400 square |
| Open Graph override | 1200×630 | 1200×630 (Facebook/LinkedIn spec) |

JPEG for photos, PNG for screenshots with sharp edges, WebP if you already have it. Sanity will automatically serve optimized variants to the blog — don't pre-compress aggressively; start with a high-quality original.

### 5.2 Alt text

**Always fill in Alt text.** It's not optional, even if the field technically allows blank. Alt text is:
- Read aloud by screen readers.
- Used by Google Images and answer engines.
- The fallback text shown if the image fails to load.

Write *what the image is showing in context*, not "image of a laptop" — aim for "MacBook Pro with a liquid spill covering the keyboard" style.

### 5.3 Hotspot

When you upload an image, Sanity shows a crosshair overlay. Drag it to the **most important part** of the image (the face, the product, the thing the image is about). When the blog layout crops the image to a different aspect ratio (card vs hero vs thumbnail), the hotspot stays in view and the rest is trimmed.

Skip the hotspot → the default is dead center, which is usually fine for wide landscape shots but terrible for portraits and product shots.

### 5.4 Captions (body images only)

The inline-body image block has a **caption** field. Fill it if the image needs attribution or a punchline; leave it blank otherwise. The cover image does not get a caption.

---

## 6. Publishing and scheduling

### 6.1 Drafts vs published

- As you type, Sanity auto-saves your work as a **draft**. Nothing you type is visible on the live blog until you click **Publish**.
- The big green **Publish** button lives at the bottom-right of the document editor. Clicking it:
  1. Saves the current state as the published version.
  2. Fires a webhook that triggers the "Deploy main site to cPanel" GitHub Action, which rebuilds the static site (pulling your latest content from Sanity) and uploads it (see `docs/BLOG_DEPLOY.md` §5).
  3. Within ~4 minutes (build + upload), the post appears on the live blog (index + post page + RSS + sitemap + author pages).
- To update a published post: edit it, then click **Publish** again. The same rebuild flow runs.

### 6.2 Unpublishing

Click **⋮** (menu next to Publish) → **Unpublish**. This removes it from the live site but keeps your draft, so you can edit and re-publish later. For permanent removal, use **Delete** in the same menu — but be careful: deletion breaks any inbound link.

> Deletions are a **permanent** action. If you're not sure, unpublish and ask an engineer before deleting.

### 6.3 Scheduling future posts

Sanity's default "Publish" button is immediate. To schedule:

- Option A (simple): write the post, set **Published at** to the future date you want, and click **Publish**. Our GROQ queries for the index and RSS filter out anything with `publishedAt > now()`, so the post won't appear until the date hits — but because the site is a **static build baked at publish time**, the future date won't auto-surface the post on its own. A rebuild after the date passes is required: ping an engineer to trigger one (GitHub → Actions → "Deploy main site to cPanel" → Run workflow), or time your publish close to the intended date.
- Option B (future): if scheduled publishing becomes a recurring need, we can install Sanity's **Scheduled Publishing** plugin. File that request in `BLOG_TASKS.md`.

### 6.4 Backdating posts

Set **Published at** to a past date. The post appears on the live site immediately after you click Publish; the display date will show the past date you chose. This is fine for imported historical content or clearly-labeled retrospectives.

---

## 7. Previewing drafts

There is no one-click "Preview" button yet (tracked as a post-launch enhancement in `BLOG_TASKS.md`). Until then:

- **Local dev preview** (for engineers working with you): run the blog on `localhost:3001/blog/[your-slug]` — the dev server reads drafts if the Sanity read token is set.
- **Production preview** (editor-only): there is no way to view a draft on the live site without publishing it (it's a static build — only published content is baked in). If you need stakeholder sign-off before going live, the current workflow is:
  1. Ask an engineer to run the blog locally and share their screen / a screen recording.
  2. Or: publish with **Hide from search engines** (SEO → `noIndex`) turned on, share the live URL for review, then toggle `noIndex` off and re-publish.

---

## 8. Updating site settings

The **Site settings** document controls blog-wide copy you probably won't change often.

1. Left rail → **Site settings**. Only one document exists (it's a singleton — don't try to create a second one).
2. Fields you can tune:
   - **Blog hero — eyebrow / title / subtitle** — the copy at the top of `/blog`.
   - **RSS — title / description** — what RSS readers display for the feed.
   - **Default Open Graph image** — the fallback OG image used when a post doesn't set its own.
   - **Footer disclaimer** — legal or marketing text in the blog footer.
3. Click **Publish**. A rebuild runs, same as with posts.

---

## 9. Common editorial gotchas

- **Slug collisions.** Sanity won't prevent two posts from using the same slug if one is a draft and the other is published. The live blog uses the published version; just keep slugs distinct.
- **"Assign at least one category" error.** The Taxonomy tab is probably empty. Add a category ref.
- **Images look stretched / cropped weird.** You forgot to set the hotspot. Open the image, drag the crosshair, click **Apply**, re-publish.
- **Excerpt got truncated on the index card.** Our cards truncate around 160 chars even though the field allows 280. Keep it tight for the card's sake.
- **Headings not showing up in the table of contents** (if a post has one). Only **H2** blocks are collected into the ToC. If you used H3/H4, they're subordinate and won't surface.
- **Link opens in the same tab.** All inline links default to same-tab. That's intentional — we don't blanket-target `_blank`. If a specific link needs a new tab, note it in the body copy ("opens YouTube in a new tab") rather than trying to fake it in the editor.
- **Code block with multiple lines.** Portable Text's inline **Code** mark is for words/phrases. For multi-line code samples, use a callout or file a request for a `code` block type in `BLOG_TASKS.md`.

---

## 10. Quick URL reference

Once a post is published, it's reachable at several routes. Use this to double-check your work after publishing.

| What | Where |
|---|---|
| The post | `/blog/[slug]` |
| The blog index | `/blog` |
| Category page | `/blog/category/[category-slug]` |
| Tag page | `/blog/tag/[tag-slug]` |
| Author page | `/blog/author/[author-slug]` |
| RSS feed | `/blog/rss.xml` |
| Sitemap | `/sitemap.xml` (auto-includes blog posts) |

All of the above live under the **main site**: `https://www.pockitengineers.com/…` in production, `http://localhost:3001/…` locally. (Category pages are not on the live site yet — the route is parked until at least one Category document exists in Sanity.)

---

## 11. Where to go when something's broken

- **"I published but it's not on the live site."** Wait ~4 minutes for the rebuild + upload, then hard-refresh (Ctrl/Cmd+Shift+R). Still missing? Ping engineering — the Sanity → GitHub publish webhook or the "Deploy main site to cPanel" Action may have failed (see `docs/BLOG_DEPLOY.md` §8).
- **"The editor is acting weird / won't save."** Check your network. Sanity needs an open connection to save drafts. Refresh the page — drafts sync back from the server.
- **"I deleted something by accident."** Don't panic; ping engineering. Sanity keeps a document history for ~30 days and we can usually restore it.
- **"I need a new field / block type / category / feature."** Add it to `BLOG_TASKS.md` under "Post-launch" and tag an engineer. Editorial schema changes require a code change + deploy.
- **"Something about the live layout is off."** Screenshot it, note the URL, and send to engineering. Editorial content changes publish fast; layout changes require a code deploy.

---

## 12. Post-publish checklist (recommended)

After clicking **Publish** on a new post, spend 2 minutes doing this:

1. Open the live post URL (`https://www.pockitengineers.com/blog/[slug]`). Confirm:
   - Title, byline, and date are right.
   - Cover image shows and the hotspot crop looks good.
   - Headings render cleanly (H2/H3 hierarchy makes sense).
   - Images in the body have alt text (hover over them — it shows briefly as a tooltip).
   - Callouts render with the right tone color.
2. Open the blog index (`/blog`). Confirm the card shows up with the right cover, excerpt, and category chip.
3. Open the category page for whatever primary category you assigned — the post should appear there.
4. Paste the URL into Slack or LinkedIn. Confirm the link preview shows the right cover, title, and description (this tests OG metadata).
5. If this is your first post as this author, open the author page and confirm the bio/avatar look right.

If anything is off, edit → re-publish. No harm done.
