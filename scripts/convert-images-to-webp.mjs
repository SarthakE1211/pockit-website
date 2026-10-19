#!/usr/bin/env node
// ---------------------------------------------------------------------------
// One-shot WebP conversion script.
//
// Reason for living in the repo (not just being a one-off shell command):
//   the conversion has a very specific allow-list — `/logo.png` stays PNG
//   because it doubles as the favicon + Schema.org `logo` URL where some
//   crawlers prefer broad compatibility, and a few `/public/images/*.png`
//   are cruft (legacy versions, replaced by SVG siblings) that we
//   intentionally don't touch. Capturing this in code avoids a future
//   "convert everything" pass accidentally re-touching those files.
//
// Usage: node scripts/convert-images-to-webp.mjs
//
// Behaviour: for each entry below, generate a sibling `.webp` via sharp,
// then delete the original on success. Quality 82 is the standard
// google-recommended default for photographic content; lossless would
// inflate the service-* PNG illustrations.
//
// Introduced in CHANGELOG #038 (Phase 3 of the May 2026 SEO audit).
// ---------------------------------------------------------------------------

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Paths are repo-relative. Each entry is converted in-place: write the
// .webp sibling, then delete the original on success.
const TARGETS = [
    // Root /public — referenced from /qr-linktree.png in DownloadBand.
    "public/qr-linktree.png",

    // Hero phone — biggest LCP-relevant asset besides the icon set.
    "public/images/hero_phone_v2.png",

    // ServiceGrid — 9 PNG illustrations, 500–660 KB each.
    "public/images/service-instant.png",
    "public/images/service-laptop.png",
    "public/images/service-macbook.png",
    "public/images/service-desktop.png",
    "public/images/service-printer.png",
    "public/images/service-wfh.png",
    "public/images/service-tv.png",
    "public/images/service-phone.png",
    "public/images/service-kids.png",

    // Become-a-technician hero illustration — single biggest file at 1.3 MB.
    "public/images/join_us_illustration.png",

    // Testimonial avatars (in REVIEWS constant in copy.ts).
    "public/images/tanya.jpg",
    "public/images/Yashodhan.jpg",
    "public/images/Aarya.jpg",
    "public/images/Kartik.jpg",
    "public/images/Tanmay.JPG.jpeg",
    "public/images/Amit.jpg",
];

// Files we explicitly DO NOT convert. Documented so future maintainers
// don't second-guess.
const SKIP_NOTES = {
    "public/logo.png":
        "favicon + JSON-LD `logo` field — broader crawler compatibility wins over the perf saving",
    "public/images/hero_phone.png":
        "old version, superseded by hero_phone_v2 — leave for now",
    "public/images/blue_brand_logo.png":
        "PNG sibling of blue_brand_logo.svg (svg is what's actually rendered)",
    "public/images/logo-footer.png":
        "PNG sibling of logo-footer.svg (svg is what's actually rendered)",
    "public/images/Kartik.JPG.jpeg":
        "duplicate of Kartik.jpg — not referenced anywhere",
};

const QUALITY = 82;

async function convertOne(rel) {
    const abs = path.join(repoRoot, rel);
    const ext = path.extname(abs);
    const webpPath = abs.replace(new RegExp(`\\${ext}$`, "i"), ".webp");

    const beforeBytes = (await fs.stat(abs)).size;
    await sharp(abs).webp({ quality: QUALITY }).toFile(webpPath);
    const afterBytes = (await fs.stat(webpPath)).size;
    await fs.unlink(abs);

    const saving = (1 - afterBytes / beforeBytes) * 100;
    const oldUrl = "/" + rel.replace(/^public\//, "");
    const newUrl = "/" + path.relative("public", webpPath).split(path.sep).join("/");
    console.log(
        `  ✓ ${rel}  (${(beforeBytes / 1024).toFixed(0)} KB → ${(afterBytes / 1024).toFixed(0)} KB, −${saving.toFixed(0)}%)`
    );
    return { oldUrl, newUrl };
}

async function main() {
    console.log(`WebP conversion (sharp, q=${QUALITY})\n`);

    const swaps = [];
    for (const t of TARGETS) {
        try {
            swaps.push(await convertOne(t));
        } catch (err) {
            if (err.code === "ENOENT") {
                console.log(`  – ${t} (already converted or missing — skipped)`);
            } else {
                console.error(`  ✗ ${t}: ${err.message}`);
                process.exitCode = 1;
            }
        }
    }

    console.log(`\nSkipped (intentional):`);
    for (const [p, reason] of Object.entries(SKIP_NOTES)) {
        console.log(`  – ${p}  // ${reason}`);
    }

    console.log(`\nReference swaps (use these to update code):`);
    for (const s of swaps) console.log(`  ${s.oldUrl}  →  ${s.newUrl}`);
    console.log(`\nDone. ${swaps.length} files converted.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
