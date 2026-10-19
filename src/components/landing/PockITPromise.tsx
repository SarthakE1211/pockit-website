"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, UserCheck, Award } from "lucide-react";
import SectionPill from "./SectionPill";
import { POCKIT_PROMISES, PROMISE } from "@/constants/copy";

const PROMISE_ICONS = [UserCheck, ShieldCheck, Award];

export default function PockitPromise({ id = "promise" }: { id?: string } = {}) {
    return (
        <section id={id} className="relative py-20 sm:py-28 overflow-hidden bg-theme-bg">
            <div className="absolute top-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgb(var(--bg-secondary)), transparent)" }} />

            <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 sm:px-8 lg:px-10">
                <div className="text-center">
                    <SectionPill label={PROMISE.sectionPill} />
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-black tracking-tight text-theme-text mb-5"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {PROMISE.heading} <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent to-theme-accent-end">{PROMISE.headingHighlight}</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-theme-text/50 max-w-xl mx-auto text-[15px] leading-relaxed"
                    >
                        {PROMISE.subheading}
                    </motion.p>
                </div>

                <div className="grid w-full gap-8 md:grid-cols-3">
                    {POCKIT_PROMISES.map((promise, index) => {
                        const Icon = PROMISE_ICONS[index] as React.ElementType;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.15 }}
                                className="group relative flex h-full flex-col gap-6 rounded-3xl border border-theme-border bg-theme-card p-8 text-left transition-all hover:border-theme-accent/50 hover:shadow-2xl"
                                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
                            >
                                <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-theme-accent opacity-0 blur-2xl transition-opacity group-hover:opacity-5" />

                                <div className="flex items-center justify-between">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-accent/10 text-theme-accent">
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className="block text-3xl font-bold tracking-tight text-theme-text"
                                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                        >
                                            {promise.stat}
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-theme-accent">
                                            {promise.statLabel}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3
                                        className="mb-3 text-xl font-semibold text-theme-text tracking-tight"
                                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                    >
                                        {promise.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-theme-text/60">
                                        {promise.desc}
                                    </p>
                                </div>

                                <ul className="mt-auto space-y-3 pt-6 border-t border-theme-border/50">
                                    {promise.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-2.5">
                                            <svg
                                                className="h-4 w-4 shrink-0 text-theme-accent"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="2.5"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M4.5 12.75l6 6 9-13.5"
                                                />
                                            </svg>
                                            <span className="text-sm font-medium text-theme-text/75">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgb(var(--bg-secondary)), transparent)" }} />
        </section>
    );
}
