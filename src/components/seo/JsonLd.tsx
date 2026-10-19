// ---------------------------------------------------------------------------
// <JsonLd> — renders one or more schema.org nodes as
// <script type="application/ld+json"> tags (CHANGELOG #077).
//
// Renders no visible UI and ships no client JS: it is a server component that
// emits inert <script> tags into the static HTML for crawlers and LLMs.
//
// Placement note — Next.js App Router only lets the root layout write into
// <head>, so layout-level schema lands in <head> while page-level schema lands
// at the top of <body>. Both are equally valid: Google's structured-data
// documentation explicitly supports JSON-LD in either location, and neither is
// visible to users. Do not contort the tree trying to hoist page schema.
// ---------------------------------------------------------------------------

import type { JsonLdNode } from "@/constants/schema";

export default function JsonLd({
    schema,
}: {
    /** A single node, or several to emit as sibling script tags. */
    schema: JsonLdNode | readonly JsonLdNode[];
}) {
    const nodes = Array.isArray(schema) ? schema : [schema as JsonLdNode];

    return (
        <>
            {nodes.map((node, i) => (
                <script
                    // Nodes are static and order-stable, so the index is a safe key.
                    key={(node["@id"] as string | undefined) ?? i}
                    type="application/ld+json"
                    // JSON.stringify escapes the characters that matter here, and
                    // the ld+json content type is opaque to the HTML parser.
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
                />
            ))}
        </>
    );
}
