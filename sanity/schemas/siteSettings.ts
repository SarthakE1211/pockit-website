// Site settings — a singleton document. Holds blog-wide editorial knobs that
// shouldn't live in code: the hero copy on /blog, the RSS metadata, default
// OG image, footer disclaimer, etc. Editors can tune these without a deploy.
//
// Singleton behavior (exactly one document of this type) will be enforced in
// the Studio structure customization when we embed Studio (CHANGELOG #005).

import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
    name: "siteSettings",
    title: "Site settings",
    type: "document",
    fields: [
        defineField({
            name: "blogHeroEyebrow",
            title: "Blog hero — eyebrow",
            description: "Small label above the main hero heading.",
            type: "string",
            initialValue: "Insights",
        }),
        defineField({
            name: "blogHeroTitle",
            title: "Blog hero — title",
            type: "string",
            initialValue: "Insight and updates",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "blogHeroSubtitle",
            title: "Blog hero — subtitle",
            type: "text",
            rows: 2,
        }),
        defineField({
            name: "rssTitle",
            title: "RSS feed — title",
            type: "string",
            initialValue: "PockIT Engineers — Blog",
        }),
        defineField({
            name: "rssDescription",
            title: "RSS feed — description",
            type: "text",
            rows: 2,
        }),
        defineField({
            name: "defaultOgImage",
            title: "Default Open Graph image",
            description:
                "Fallback OG image used when a post doesn't specify its own.",
            type: "image",
        }),
        defineField({
            name: "footerDisclaimer",
            title: "Footer disclaimer",
            type: "text",
            rows: 2,
        }),
    ],
    preview: {
        prepare() {
            return { title: "Site settings" };
        },
    },
});
