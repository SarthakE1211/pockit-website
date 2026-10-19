// Category — primary taxonomy shown as chip filters on the blog index
// (CategoryChipBar in Phase 3) and as its own index page at
// /blog/category/[slug].

import { defineField, defineType } from "sanity";

export const category = defineType({
    name: "category",
    title: "Category",
    type: "document",
    fields: [
        defineField({
            name: "title",
            title: "Title",
            type: "string",
            validation: (Rule) => Rule.required().max(40),
        }),
        defineField({
            name: "slug",
            title: "Slug",
            type: "slug",
            options: { source: "title", maxLength: 40 },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "description",
            title: "Description",
            type: "text",
            rows: 2,
            validation: (Rule) => Rule.max(200),
        }),
        defineField({
            name: "order",
            title: "Order",
            description: "Lower numbers appear first in the chip bar.",
            type: "number",
            initialValue: 100,
        }),
    ],
    orderings: [
        {
            title: "Display order",
            name: "orderAsc",
            by: [{ field: "order", direction: "asc" }],
        },
    ],
    preview: {
        select: { title: "title", subtitle: "description" },
    },
});
