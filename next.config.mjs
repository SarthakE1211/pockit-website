/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Dual-target build controlled by the BUILD_TARGET env var.
//
//   BUILD_TARGET=static  (default) → `output: "export"` for cPanel / S3 / any
//                                    static host. Produces `out/` via
//                                    `npm run build:static` (and the existing
//                                    `npm run build` + `npm run zip:cpanel`,
//                                    which alias to the static path).
//                                    /studio and /blog routes are excluded
//                                    from this build (Studio can't be
//                                    statically exported; blog only runs on
//                                    the server target).
//
//   BUILD_TARGET=server             → full Next.js server build for Vercel,
//                                    including the blog at /blog/** and the
//                                    embedded Sanity Studio at /studio.
//                                    Supports ISR, image optimization via
//                                    Sanity's CDN, and preview drafts.
//                                    Driven by `npm run build:server`.
//
// Default is `static` so any existing workflow (plain `next build`, CI, or
// `zip:cpanel`) keeps behaving exactly as it did before the blog was added.
// ---------------------------------------------------------------------------

const BUILD_TARGET = process.env.BUILD_TARGET ?? "static";
const isStatic = BUILD_TARGET === "static";

const nextConfig = {
    // Avoid React Strict Mode remount replay in development, which can
    // re-run mount animations (like the branded loader) and look like a double load.
    reactStrictMode: process.env.NODE_ENV === "production",

    // Static HTML export branch — enabled only when BUILD_TARGET=static.
    // `out/` is plain HTML/CSS/JS — host on cPanel, S3, any static host (no Node).
    // See README and CPANEL_STATIC.md for deploy steps.
    ...(isStatic ? { output: "export" } : {}),

    images: isStatic
        ? {
              // Required for `output: 'export'` — no Next.js image optimization server
              // is available in a static bundle, so images must be served as-is.
              unoptimized: true,
          }
        : {
              // Server build (Vercel): let Next.js optimize images and allow Sanity's
              // CDN as a source for blog imagery managed in Studio.
              remotePatterns: [
                  {
                      protocol: "https",
                      hostname: "cdn.sanity.io",
                  },
              ],
          },

    // ---------------------------------------------------------------------
    // pageExtensions: how we cleanly gate routes per build target.
    //
    // Default Next pageExtensions are ['tsx','ts','jsx','js']. We extend the
    // set asymmetrically with two custom suffixes:
    //
    //   .server.tsx / .server.ts   → visible ONLY on the server (Vercel)
    //                                build. Used for the embedded Sanity
    //                                Studio (`src/app/studio/[[...tool]]/
    //                                page.server.tsx`), the blog routes
    //                                under `src/app/blog/**`, and the
    //                                blog sitemap/robots/RSS.
    //
    //   .static.tsx / .static.ts   → visible ONLY on the static (cPanel)
    //                                build. Used for the marketing-site
    //                                sitemap at `src/app/sitemap.xml/
    //                                route.static.ts`, which would
    //                                otherwise collide with the blog
    //                                sitemap `route.server.ts` on the
    //                                server build (Next errors on routes
    //                                that resolve to the same URL,
    //                                regardless of pageExtension order).
    //
    // Both suffixes are listed BEFORE the defaults so the matching file
    // takes priority over a same-stem unsuffixed file should one ever
    // exist in the same directory.
    //
    // Introduced in CHANGELOG #005 (.server) and #022 (.static).
    // ---------------------------------------------------------------------
    pageExtensions: isStatic
        ? ["static.tsx", "static.ts", "tsx", "ts", "jsx", "js"]
        : ["server.tsx", "server.ts", "tsx", "ts", "jsx", "js"],

    // Note: `headers()` from next.config is not supported with static export.
    // Cache-Control for assets on cPanel lives in `public/.htaccess`.

    // `/expert` → `/become-a-technician`: `src/app/expert/page.tsx` + `public/.htaccess` (301 on Apache)
};

export default nextConfig; // see https://nextjs.org/docs/app/api-reference/config/next-config-js
