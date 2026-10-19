// ---------------------------------------------------------------------------
// Heading slugifier — deterministic, dependency-free.
//
// Used by:
//   - PostBody: turns each h2/h3/h4 text into an `id` attribute so the ToC
//     anchors can jump to it.
//   - TableOfContents: generates the same slug from the same text so the
//     hrefs line up with the IDs the body emits.
//
// The function is deliberately boring — lowercase, strip punctuation,
// collapse whitespace to dashes, trim trailing dashes. Good enough for the
// editorial content we expect (short English headings). If a post ships
// with two headings that slugify to the same string we accept the collision
// for v1; fixing would require threading an index counter through every
// renderer and ToC pass, and we don't write posts at that cadence yet.
//
// Introduced in CHANGELOG #009.
// ---------------------------------------------------------------------------

export function slugifyHeading(raw: string): string {
    return raw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics
        .replace(/[^a-z0-9\s-]/g, "") // drop punctuation
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
