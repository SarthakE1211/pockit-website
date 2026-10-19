// ---------------------------------------------------------------------------
// Sanity Studio configuration — loaded by next-sanity / @sanity/cli.
//
// Embedded Studio lives at /studio (see src/app/studio/[[...tool]]/page.tsx,
// introduced in CHANGELOG #005). Only the server build (`BUILD_TARGET=server`,
// Vercel) serves this route; the static cPanel build skips it entirely.
//
// Project locked in CLAUDE.md → Project preferences → Blog project:
//   - projectId: pg938kpo
//   - dataset:   production
// These are read from env vars so the same file works for local dev, Vercel
// production, and any future preview/staging datasets without edits.
// ---------------------------------------------------------------------------

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";

import { schemaTypes } from "./sanity/schemas";

const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";
const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

export default defineConfig({
    name: "pockit-engineers-blog",
    title: "PockIT Engineers — Blog",

    projectId,
    dataset,

    // Studio is mounted at /studio on the blog subdomain.
    basePath: "/studio",

    plugins: [
        // Structure tool = the left-hand document browser (Posts, Authors,
        // Categories, Tags, Site Settings).
        structureTool(),

        // Vision tool = an in-Studio GROQ playground. Helpful for editors who
        // want to sanity-check a query, and for us when debugging. Safe to
        // ship: it honors the same auth / dataset permissions as Studio.
        visionTool(),
    ],

    schema: {
        types: schemaTypes,
    },
});
