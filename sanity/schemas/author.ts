// Author — the byline + bio behind each post. Individual author pages live
// at /blog/author/[slug] (Phase 3).

import { defineField, defineType } from "sanity";

export const author = defineType({
    name: "author",
    title: "Author",
    type: "document",
    fields: [
        defineField({
            name: "name",
            title: "Name",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "slug",
            title: "Slug",
            type: "slug",
            options: { source: "name", maxLength: 60 },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "role",
            title: "Role",
            description: "E.g. 'Founder', 'Senior Technician', 'Guest writer'.",
            type: "string",
        }),
        defineField({
            name: "bio",
            title: "Bio",
            type: "text",
            rows: 3,
            validation: (Rule) => Rule.max(500),
        }),
        defineField({
            name: "avatar",
            title: "Avatar",
            type: "image",
            options: { hotspot: true },
            fields: [
                { name: "alt", title: "Alt text", type: "string" },
            ],
        }),
        defineField({
            name: "socials",
            title: "Social links",
            type: "object",
            fields: [
                { name: "website", title: "Website", type: "url" },
                { name: "linkedin", title: "LinkedIn", type: "url" },
                { name: "twitter", title: "Twitter / X", type: "url" },
            ],
        }),
    ],
    preview: {
        select: { title: "name", subtitle: "role", media: "avatar" },
    },
});
