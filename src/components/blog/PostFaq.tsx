// ---------------------------------------------------------------------------
// PostFaq — renders FAQ items from the post's SEO field as a visible
// accordion section at the bottom of the article. Driven entirely by the
// `seo.faq` array so authors only enter Q&A pairs once (in Studio's SEO
// tab), and both the visible section and the JSON-LD structured data are
// generated automatically.
//
// Introduced in CHANGELOG #018.1.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FaqItemData {
    readonly question: string;
    readonly answer: string;
}

interface PostFaqProps {
    readonly items: readonly FaqItemData[];
}

function FaqAccordionItem({ item, index }: { item: FaqItemData; index: number }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-theme-border/40 last:border-b-0">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-theme-accent"
                aria-expanded={open}
                aria-controls={`faq-answer-${index}`}
            >
                <span className="text-base font-semibold leading-snug text-theme-text sm:text-lg">
                    {item.question}
                </span>
                <span
                    className={`shrink-0 text-xl text-theme-accent transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                    }`}
                    aria-hidden
                >
                    +
                </span>
            </button>

            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        id={`faq-answer-${index}`}
                        role="region"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-[15px] leading-relaxed text-theme-text/75 sm:text-base">
                            {item.answer}
                        </p>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

export default function PostFaq({ items }: PostFaqProps) {
    if (!items || items.length === 0) return null;

    return (
        <section className="mt-14 mb-4" aria-labelledby="faq-heading">
            <h2
                id="faq-heading"
                className="mb-6 text-2xl font-black tracking-tight text-theme-text sm:text-3xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                Frequently Asked Questions
            </h2>

            <div className="rounded-2xl border border-theme-border/60 bg-theme-card/60 px-6">
                {items.map((item, i) => (
                    <FaqAccordionItem key={i} item={item} index={i} />
                ))}
            </div>
        </section>
    );
}
