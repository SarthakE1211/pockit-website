"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";
import SectionPill from "./SectionPill";
import { FAQ_ITEMS, FAQ_SECTION } from "@/constants/copy";

function FAQItem({ item, index, isOpen, toggle }: { item: (typeof FAQ_ITEMS)[0]; index: number; isOpen: boolean; toggle: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
            <button
                onClick={toggle}
                className="group w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden"
                style={{
                    background: isOpen ? "rgb(var(--surface-glass) / 0.06)" : "rgb(var(--surface-glass) / 0.03)",
                    border: isOpen ? "1px solid rgb(var(--accent-primary) / 0.25)" : "1px solid rgb(var(--surface-glass) / 0.08)",
                    boxShadow: isOpen ? "0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgb(var(--accent-primary) / 0.08)" : "0 4px 16px rgba(0,0,0,0.15)",
                }}
            >
                <div className="flex items-center gap-4 px-6 sm:px-8 py-5 sm:py-6">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                            background: isOpen ? "rgb(var(--accent-primary) / 0.15)" : "rgb(var(--surface-glass) / 0.06)",
                            border: isOpen ? "1px solid rgb(var(--accent-primary) / 0.30)" : "1px solid rgb(var(--surface-glass) / 0.08)",
                        }}
                    >
                        <HelpCircle className={`w-4.5 h-4.5 transition-colors duration-300 ${isOpen ? "text-theme-accent" : "text-theme-text/40"}`} />
                    </div>
                    <span
                        className="flex-1 text-[15px] sm:text-[16px] font-semibold tracking-tight transition-colors duration-300"
                        style={{ color: isOpen ? "rgb(var(--text-primary))" : "rgb(var(--text-primary) / 0.75)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {item.q}
                    </span>
                    <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen
                            ? "bg-theme-accent text-white"
                            : "bg-theme-text/10 text-theme-text/50 group-hover:bg-theme-text/15"
                            }`}
                    >
                        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="px-6 sm:px-8 pb-6 sm:pb-7 pt-0">
                                <div className="h-px mb-5" style={{ background: "linear-gradient(90deg, transparent, rgb(var(--accent-primary) / 0.20), transparent)" }} />
                                <p className="text-[14px] sm:text-[15px] leading-[1.75] text-theme-text/60">
                                    {item.a}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
        </motion.div>
    );
}

const VISIBLE_COUNT = 5;

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [expanded, setExpanded] = useState(false);
    const headRef = useRef<HTMLDivElement>(null);
    const headInView = useInView(headRef, { once: true, margin: "-80px" });

    const visibleItems = expanded ? FAQ_ITEMS : FAQ_ITEMS.slice(0, VISIBLE_COUNT);
    const hiddenCount = FAQ_ITEMS.length - VISIBLE_COUNT;

    return (
        <section id="faq" className="relative py-24 bg-theme-bg2">
            <div className="absolute top-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgb(var(--bg-primary)), transparent)" }} />

            <div className="relative max-w-3xl mx-auto px-6 sm:px-8 lg:px-10">
                <div ref={headRef} className="text-center mb-14">
                    <SectionPill label={FAQ_SECTION.sectionPill} />
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={headInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-theme-text mb-4"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {FAQ_SECTION.heading} <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent to-theme-accent-end">{FAQ_SECTION.headingHighlight}</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={headInView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-theme-text/50 text-[15px]"
                    >
                        {FAQ_SECTION.subheading}
                    </motion.p>
                </div>

                <div className="space-y-3">
                    {visibleItems.map((item, i) => (
                        <FAQItem
                            key={i}
                            item={item}
                            index={i}
                            isOpen={openIndex === i}
                            toggle={() => setOpenIndex(openIndex === i ? null : i)}
                        />
                    ))}
                </div>

                <AnimatePresence initial={false}>
                    {!expanded && (
                        <motion.div
                            initial={false}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative pointer-events-none"
                        >
                            <div className="h-10 rounded-b-2xl" style={{ background: "linear-gradient(to bottom, transparent, rgb(var(--bg-secondary)))" }} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className={`flex justify-center ${expanded ? "mt-6" : "mt-3"}`}>
                    <motion.button
                        onClick={() => {
                            if (expanded) {
                                setExpanded(false);
                                setTimeout(() => {
                                    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
                                }, 50);
                            } else {
                                setExpanded(true);
                            }
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2.5 rounded-2xl border px-7 py-3.5 text-[14px] font-bold transition-all duration-200"
                        style={{
                            background: expanded ? "rgb(var(--accent-primary) / 0.10)" : "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                            border: expanded ? "1px solid rgb(var(--accent-primary) / 0.30)" : "1px solid transparent",
                            color: expanded ? "rgb(var(--accent-primary))" : "#ffffff",
                            boxShadow: expanded ? "none" : "0 8px 24px rgb(var(--accent-primary) / 0.30)",
                        }}
                    >
                        {expanded ? (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4"><path d="m18 15-6-6-6 6" /></svg>
                                See Less
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4"><path d="m6 9 6 6 6-6" /></svg>
                                See {hiddenCount} More Questions
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgb(var(--bg-primary)), transparent)" }} />
        </section>
    );
}
