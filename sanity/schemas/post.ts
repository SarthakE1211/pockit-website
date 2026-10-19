// ---------------------------------------------------------------------------
// Post — the primary blog document.
//
// Fields fall into four groups:
//   1. Identity:     title, slug, excerpt
//   2. Taxonomy:     author, categories, tags
//   3. Presentation: coverImage, featured (index hero flag)
//   4. Body & meta:  body (Portable Text), publishedAt, seo (nested)
//
// The shape here is what downstream GROQ queries in src/lib/sanity/queries.ts
// (introduced in CHANGELOG #006) will project. Keep field names stable — the
// blog pages read them directly.
// ---------------------------------------------------------------------------

import { defineField, defineType } from "sanity";

export const post = defineType({
    name: "post",
    title: "Post",
    type: "document",
    groups: [
        { name: "content", title: "Content", default: true },
        { name: "taxonomy", title: "Taxonomy" },
        { name: "media", title: "Media" },
        { name: "seo", title: "SEO" },
    ],
    fields: [
        defineField({
            name: "title",
            title: "Title",
            type: "string",
            group: "content",
            validation: (Rule) => Rule.required().min(4).max(140),
        }),
        defineField({
            name: "slug",
            title: "Slug",
            type: "slug",
            group: "content",
            options: { source: "title", maxLength: 96 },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "excerpt",
            title: "Excerpt",
            description:
                "One- or two-sentence summary shown on the index card and in meta tags.",
            type: "text",
            rows: 3,
            group: "content",
            validation: (Rule) => Rule.max(280),
        }),
        defineField({
            name: "body",
            title: "Body",
            type: "array",
            group: "content",
            of: [
                {
                    type: "block",
                    styles: [
                        { title: "Normal", value: "normal" },
                        { title: "H2", value: "h2" },
                        { title: "H3", value: "h3" },
                        { title: "H4", value: "h4" },
                        { title: "Quote", value: "blockquote" },
                    ],
                    marks: {
                        decorators: [
                            { title: "Strong", value: "strong" },
                            { title: "Emphasis", value: "em" },
                            { title: "Code", value: "code" },
                        ],
                    },
                },
                {
                    type: "image",
                    options: { hotspot: true },
                    fields: [
                        {
                            name: "alt",
                            title: "Alt text",
                            type: "string",
                        },
                        {
                            name: "caption",
                            title: "Caption",
                            type: "string",
                        },
                    ],
                },
                {
                    type: "object",
                    name: "callout",
                    title: "Callout",
                    fields: [
                        {
                            name: "tone",
                            title: "Tone",
                            type: "string",
                            options: {
                                list: ["info", "warning", "success"],
                            },
                        },
                        { name: "body", title: "Body", type: "text" },
                    ],
                },
            ],
        }),
        defineField({
            name: "author",
            title: "Author",
            type: "reference",
            to: [{ type: "author" }],
            group: "taxonomy",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "categories",
            title: "Categories",
            type: "array",
            group: "taxonomy",
            of: [{ type: "reference", to: [{ type: "category" }] }],
            validation: (Rule) => Rule.min(1).error("Assign at least one category."),
        }),
        defineField({
            name: "tags",
            title: "Tags",
            type: "array",
            group: "taxonomy",
            of: [{ type: "reference", to: [{ type: "tag" }] }],
        }),
        defineField({
            name: "coverImage",
            title: "Cover image",
            type: "image",
            group: "media",
            options: { hotspot: true },
            fields: [
                { name: "alt", title: "Alt text", type: "string" },
            ],
        }),
        defineField({
            name: "featured",
            title: "Featured on blog index",
            description:
                "If multiple posts are featured, the most recent by publishedAt wins the hero slot.",
            type: "boolean",
            group: "content",
            initialValue: false,
        }),
        defineField({
            name: "publishedAt",
            title: "Published at",
            type: "datetime",
            group: "content",
            validation: (Rule) => Rule.required(),
            initialValue: () => new Date().toISOString(),
        }),
        defineField({
            name: "seo",
            title: "SEO",
            type: "object",
            group: "seo",
            fields: [
                {
                    name: "metaTitle",
                    title: "Meta title",
                    type: "string",
                    validation: (Rule) => Rule.max(70),
                },
                {
                    name: "metaDescription",
                    title: "Meta description",
                    type: "text",
                    rows: 2,
                    validation: (Rule) => Rule.max(160),
                },
                {
                    name: "ogImage",
                    title: "Open Graph image",
                    type: "image",
                },
                {
                    name: "noIndex",
                    title: "Hide from search engines",
                    type: "boolean",
                    initialValue: false,
                },
                {
                    name: "faq",
                    title: "FAQ (structured data)",
                    description:
                        "Add question–answer pairs to generate FAQPage JSON-LD schema. This helps Google AI Overviews and rich results surface your answers directly.",
                    type: "array",
                    of: [
                        {
                            type: "object",
                            name: "faqItem",
                            title: "FAQ item",
                            fields: [
                                {
                                    name: "question",
                                    title: "Question",
                                    type: "string",
                                    validation: (Rule) => Rule.required(),
                                },
                                {
                                    name: "answer",
                                    title: "Answer",
                                    type: "text",
                                    rows: 3,
                                    validation: (Rule) => Rule.required(),
                                },
                            ],
                            preview: {
                                select: { title: "question" },
                            },
                        },
                    ],
                },
            ],
        }),
    ],
    preview: {
        select: {
            title: "title",
            author: "author.name",
            media: "coverImage",
            publishedAt: "publishedAt",
        },
        prepare({ title, author, media, publishedAt }) {
            const date = publishedAt
                ? new Date(publishedAt).toLocaleDateString()
                : "unpublished";
            return {
                title,
                subtitle: `${author ?? "—"} · ${date}`,
                media,
            };
        },
    },
    orderings: [
        {
            title: "Published (newest first)",
            name: "publishedDesc",
            by: [{ field: "publishedAt", direction: "desc" }],
        },
    ],
});
