// ---------------------------------------------------------------------------
// Embedded Sanity Studio — /studio
//
// This route is intentionally named `page.server.tsx` (not `page.tsx`) so
// `next.config.mjs` can gate it on `BUILD_TARGET`:
//
//   BUILD_TARGET=static  (cPanel) → pageExtensions does NOT include
//                                   `server.tsx`. Next ignores this file,
//                                   /studio is never registered, and
//                                   `next build` / export doesn't try to
//                                   statically generate a Studio (which it
//                                   couldn't anyway — Studio needs a runtime).
//
//   BUILD_TARGET=server  (Vercel) → pageExtensions includes `server.tsx`.
//                                   Next treats this as the /studio page and
//                                   mounts Studio dynamically.
//
// The catch-all `[[...tool]]` segment is required by Studio so it can own
// its own internal routing (Desk, Vision, presentation tool, etc.) without
// Next.js trying to match each Studio pane as a separate page.
//
// See CLAUDE.md → Project preferences → Build targets, and BLOG_TASKS.md
// Phase 2 (#006). Paired with `sanity.config.ts` at the repo root, which
// tells Studio its projectId/dataset/schemas.
// ---------------------------------------------------------------------------

"use client";

import { NextStudio } from "next-sanity/studio";

import config from "../../../../sanity.config";

// NOTE: route-segment config (`export const dynamic = ...`) is not permitted
// in a "use client" file. Studio's own client-side runtime handles routing
// inside `/studio/**`, so we don't need force-dynamic here — the catch-all
// `[[...tool]]` + client-only render already prevents static optimization.

export default function StudioPage() {
    return <NextStudio config={config} />;
}
