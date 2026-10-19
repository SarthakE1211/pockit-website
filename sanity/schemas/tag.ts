// Tag — secondary taxonomy. Lighter than category: no description, no
// ordering. Used for finer-grained topic grouping on a post (e.g. "laptop",
// "data-recovery"). Not surfaced as top-level chips on the index.

import { defineField, defineType } from "sanity";

export const tag = defineType({
    name: "tag",
    title: "Tag",
    type: "document",
    fields: [
        defineField({
            name: "title",
            title: "Title",
            type: "string",
            validation: (Rule) => Rule.required().max(30),
        }),
        defineField({
            name: "slug",
            title: "Slug",
            type: "slug",
            options: { source: "title", maxLength: 30 },
            validation: (Rule) => Rule.required(),
        }),
    ],
    preview: {
        select: { title: "title" },
    },
});
