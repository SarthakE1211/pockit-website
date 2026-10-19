// ---------------------------------------------------------------------------
// One-off cleanup — deletes landingPage docs whose `_id` contains a dot.
//
// Sanity treats dotted IDs (e.g. `landingPage.macbook-repair-mumbai`) as
// system-namespaced and hides them from anonymous public reads. The
// build-time GROQ client has no token so it cannot see those docs, which
// means `generateStaticParams` returns an empty slug list and no page is
// emitted on the static cPanel build.
//
// Earlier seed runs (locality drafts session + the first
// `seed-service-pages.ts` run) created docs with this dotted shape. This
// script removes them. After the cleanup, re-run `npm run seed:services`
// — the updated seed uses dotless IDs (`<slug>`) and the new docs will be
// publicly visible to the build.
//
// Run with:
//
//     npm run delete:dotted-landing
//
// Env: SANITY_API_WRITE_TOKEN (Editor role).
// ---------------------------------------------------------------------------

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token =
    process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_API_READ_TOKEN;

if (!token) {
    console.error(
        "[delete-dotted] No SANITY_API_WRITE_TOKEN in env. Aborting.",
    );
    process.exit(1);
}

// `perspective: "raw"` returns both drafts (`drafts.<id>`) and their
// published twins. Without it, the default perspective hides drafts —
// and the drafts hold their own copy of `relatedPages`, which still
// references the published doc we want to delete. Mutate refuses the
// delete in that case. Scrubbing both perspectives in one pass avoids
// that cycle.
const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-04-15",
    useCdn: false,
    token,
    perspective: "raw",
});

interface DocSummary {
    readonly _id: string;
    readonly slug?: string;
}

async function main(): Promise<void> {
    // Match any landingPage doc whose ID contains a `.` — this is the
    // namespaced-ID pattern that anonymous reads can't see. The bare
    // randomly-generated `x9AkaoQOe6dzdFl4eJwcsh`-style IDs are dotless
    // and will not match, so the Mumbai laptop doc (created by hand in
    // Studio earlier) is preserved.
    const docs = await client.fetch<DocSummary[]>(
        '*[_type=="landingPage" && _id match "*.*"]{_id,"slug":slug.current}',
    );

    if (docs.length === 0) {
        console.log("[delete-dotted] Nothing to delete — no dotted IDs found.");
        return;
    }

    console.log(
        `[delete-dotted] Found ${docs.length} doc(s) with dotted IDs.`,
    );

    // Pass 1: unset every cross-reference field on every dotted doc.
    // The `relatedPages` field (Internal links tab) holds Sanity
    // `reference` entries pointing at other dotted docs; Sanity refuses
    // to delete a doc that is still referenced, so we must scrub the
    // edges before we can drop the nodes. `unset` removes the field
    // entirely (vs `set: { relatedPages: [] }` which would leave an
    // empty array — same effect for delete but unset is cleaner).
    console.log("[delete-dotted] Pass 1: unsetting `relatedPages` on each…");
    for (const d of docs) {
        try {
            await client.patch(d._id).unset(["relatedPages"]).commit();
            console.log(`  ✓ unset    ${d._id}.relatedPages`);
        } catch (err) {
            console.error(`  ✗ failed   ${d._id} (unset):`, err);
        }
    }

    // Pass 2: delete each doc. With references gone, the cascade rule no
    // longer blocks. Any doc that still fails here has a reference from
    // a document we didn't scrub (e.g. an editor-added link from a
    // dotless doc) — the error message names the referrer and we deal
    // with it manually.
    console.log("[delete-dotted] Pass 2: deleting each doc…");
    for (const d of docs) {
        try {
            await client.delete(d._id);
            console.log(`  ✓ deleted  ${d._id} (slug=${d.slug ?? "—"})`);
        } catch (err) {
            console.error(`  ✗ failed   ${d._id} (delete):`, err);
        }
    }

    console.log("[delete-dotted] done.");
}

main();
