// ---------------------------------------------------------------------------
// Minimal Markdown renderer for chip.ai bot replies.
//
// The bot (gpt-4.1-mini) writes a small Markdown subset — **bold**, *italic*,
// `code`, "- " / "1. " lists, ### headings, [links](url) — which the widget
// used to print raw. This renders exactly that subset as React elements.
//
// Safety: no dangerouslySetInnerHTML anywhere — text only ever becomes React
// text nodes, and links are restricted to http(s), tel: and mailto:.
// Why not react-markdown: ~40 KB extra in the chatbot chunk for a subset this
// small (see ChatbotMount.tsx on keeping that chunk lean).
//
// Also auto-links phone numbers and emails so "Call +91 92402 51266" is
// tappable on mobile.
// ---------------------------------------------------------------------------

import { Fragment, type ReactNode } from "react";

// Order matters: earlier alternatives win at the same position.
const INLINE_RE = new RegExp(
    [
        String.raw`\[([^\]]+)\]\(((?:https?:\/\/|tel:|mailto:)[^\s)]+)\)`, // 1,2 [text](url)
        String.raw`\*\*(.+?)\*\*`, //                                          3   **bold**
        String.raw`__(.+?)__`, //                                              4   __bold__
        String.raw`(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])`, //              5   *italic*
        "`([^`]+)`", //                                                        6   `code`
        String.raw`(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])`, //               7   bare URL
        String.raw`([\w.+-]+@[\w-]+\.[\w.-]+\w)`, //                           8   email
        String.raw`(\+91[\s-]?\d{5}[\s-]?\d{5}|(?<!\d)[6-9]\d{9}(?!\d))`, //   9   phone
    ].join("|"),
    "g",
);

function renderInline(text: string, keyPrefix: string): ReactNode[] {
    const out: ReactNode[] = [];
    let last = 0;
    let i = 0;
    for (const m of text.matchAll(INLINE_RE)) {
        const start = m.index ?? 0;
        if (start > last) out.push(text.slice(last, start));
        const key = `${keyPrefix}-${i++}`;
        if (m[1] !== undefined) {
            out.push(<a key={key} href={m[2]} target={m[2].startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{m[1]}</a>);
        } else if (m[3] !== undefined || m[4] !== undefined) {
            out.push(<strong key={key}>{renderInline(m[3] ?? m[4], key)}</strong>);
        } else if (m[5] !== undefined) {
            out.push(<em key={key}>{renderInline(m[5], key)}</em>);
        } else if (m[6] !== undefined) {
            out.push(<code key={key}>{m[6]}</code>);
        } else if (m[7] !== undefined) {
            out.push(<a key={key} href={m[7]} target="_blank" rel="noopener noreferrer">{m[7]}</a>);
        } else if (m[8] !== undefined) {
            out.push(<a key={key} href={`mailto:${m[8]}`}>{m[8]}</a>);
        } else if (m[9] !== undefined) {
            out.push(<a key={key} href={`tel:${m[9].replace(/[\s-]/g, "")}`}>{m[9]}</a>);
        }
        last = start + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

type Block =
    | { kind: "p"; lines: string[] }
    | { kind: "ul" | "ol"; items: string[] }
    | { kind: "h"; text: string };

const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const H_RE = /^\s*#{1,6}\s+(.*)$/;

function toBlocks(source: string): Block[] {
    const blocks: Block[] = [];
    for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
        const line = raw.trimEnd();
        const prev = blocks[blocks.length - 1];
        const ul = UL_RE.exec(line);
        const ol = ul ? null : OL_RE.exec(line);
        const h = H_RE.exec(line);

        if (!line.trim()) {
            blocks.push({ kind: "p", lines: [] }); // paragraph break
        } else if (h) {
            blocks.push({ kind: "h", text: h[1] });
        } else if (ul || ol) {
            const kind = ul ? "ul" : "ol";
            const item = (ul ?? ol)![1];
            if (prev && prev.kind === kind) prev.items.push(item);
            else blocks.push({ kind, items: [item] });
        } else if (prev && prev.kind === "p" && prev.lines.length > 0) {
            prev.lines.push(line);
        } else if (prev && (prev.kind === "ul" || prev.kind === "ol") && /^\s{2,}\S/.test(raw)) {
            prev.items[prev.items.length - 1] += ` ${line.trim()}`; // wrapped list item
        } else {
            blocks.push({ kind: "p", lines: [line] });
        }
    }
    return blocks.filter(b => b.kind !== "p" || b.lines.length > 0);
}

export default function ChatMarkdown({ text }: { text: string }) {
    const blocks = toBlocks(text);
    return (
        <div className="cbot-md">
            {blocks.map((b, bi) => {
                const key = `b${bi}`;
                if (b.kind === "h") return <p key={key} className="cbot-md-h">{renderInline(b.text, key)}</p>;
                if (b.kind === "p") {
                    return (
                        <p key={key}>
                            {b.lines.map((line, li) => (
                                <Fragment key={`${key}-${li}`}>
                                    {li > 0 && <br />}
                                    {renderInline(line, `${key}-${li}`)}
                                </Fragment>
                            ))}
                        </p>
                    );
                }
                const List = b.kind; // "ul" | "ol"
                return (
                    <List key={key}>
                        {b.items.map((item, ii) => <li key={`${key}-${ii}`}>{renderInline(item, `${key}-${ii}`)}</li>)}
                    </List>
                );
            })}
        </div>
    );
}
