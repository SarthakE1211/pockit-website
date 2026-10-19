// Central registry of every document / object schema Sanity Studio should
// know about. Imported by sanity.config.ts.

import { post } from "./post";
import { author } from "./author";
import { category } from "./category";
import { tag } from "./tag";
import { siteSettings } from "./siteSettings";
import { landingPage } from "./landingPage";

export const schemaTypes = [
    // Document types (get their own entries in Studio's structure tool)
    post,
    author,
    category,
    tag,
    siteSettings,
    landingPage,
];
