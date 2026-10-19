// ---------------------------------------------------------------------------
// Sanity image URL builder.
//
// Wraps `@sanity/image-url` so components can say:
//
//     urlFor(post.coverImage).width(1200).height(630).fit("crop").url()
//
// …and get back a CDN URL sized and cropped on Sanity's side. Hotspot data
// baked into the image asset is respected automatically.
//
// We expose both:
//   - `urlFor(source)` — chainable builder, used when the caller wants to
//                        pick width/height themselves.
//   - `urlForOG(source)` — convenience, returns a 1200x630 URL (Twitter /
//                          Facebook / LinkedIn meta tags all want this).
//
// Introduced in CHANGELOG #007.
// ---------------------------------------------------------------------------

import { createImageUrlBuilder } from "@sanity/image-url";

import { dataset, projectId } from "./env";
import type { SanityImageReference } from "./types";

const builder = createImageUrlBuilder({ projectId, dataset });

// Derive the builder's chainable type from the factory instead of deep-
// importing `@sanity/image-url/lib/types/builder`, which shifts between
// majors and has broken before.
type ImageUrlBuilder = ReturnType<typeof builder.image>;

/**
 * Build a URL for a Sanity image asset. Returns a chainable builder — call
 * `.url()` at the end to materialize the string.
 *
 * @example
 *   <Image src={urlFor(post.coverImage).width(800).url()} ... />
 */
export function urlFor(source: SanityImageReference): ImageUrlBuilder {
    return builder.image(source);
}

/**
 * 1200x630 cropped JPEG — the Open Graph / social-share standard. Used
 * in `<head>` meta tags on post pages.
 */
export function urlForOG(source: SanityImageReference): string {
    return builder
        .image(source)
        .width(1200)
        .height(630)
        .fit("crop")
        .format("jpg")
        .quality(85)
        .url();
}
