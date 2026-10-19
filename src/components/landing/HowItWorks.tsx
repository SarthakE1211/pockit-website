"use client";

import { motion } from "framer-motion";
import SectionPill from "./SectionPill";
import { HOW_IT_WORKS, STEPS } from "@/constants/copy";
import { ClipboardCheck, Search, MapPin, Truck, Wrench, CircleCheck } from "lucide-react";

function StepIllustration({ index }: { index: number }) {
    const accent = {
        background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
    };

    return (
        <div className="relative w-full flex items-center justify-center">
            {/* Decorative ring */}
            <div
                aria-hidden
                className="absolute inset-0 m-auto h-[132px] w-[132px] rounded-3xl"
                style={{
                    background: "radial-gradient(circle at 30% 20%, rgb(var(--accent-primary) / 0.18) 0%, transparent 55%)",
                }}
            />

            {/* Main badge */}
            <div
                className="relative h-[92px] w-[92px] rounded-3xl border border-theme-accent/25 flex items-center justify-center"
                style={{
                    background:
                        "linear-gradient(180deg, rgb(var(--card-bg) / 0.30) 0%, rgb(var(--bg-secondary) / 0.10) 100%)",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
            >
                {/* Icon */}
                <div
                    className="absolute -top-3 right-1 h-[34px] w-[34px] rounded-2xl flex items-center justify-center"
                    style={accent}
                >
                    {index === 0 ? (
                        <Search className="h-5 w-5 text-white" strokeWidth={2.5} />
                    ) : index === 1 ? (
                        <MapPin className="h-5 w-5 text-white" strokeWidth={2.5} />
                    ) : (
                        <CircleCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
                    )}
                </div>

                {index === 0 && <ClipboardCheck className="h-11 w-11 text-theme-accent" strokeWidth={2.6} />}
                {index === 1 && <Truck className="h-11 w-11 text-theme-accent" strokeWidth={2.6} />}
                {index === 2 && <Wrench className="h-11 w-11 text-theme-accent" strokeWidth={2.6} />}
            </div>

            {/* Small orbit lines */}
            <svg
                aria-hidden
                className="absolute h-[150px] w-[150px]"
                viewBox="0 0 200 200"
                fill="none"
            >
                <path
                    d="M35 105C55 60 100 40 145 55"
                    stroke="rgb(var(--accent-primary) / 0.22)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M55 155C90 175 135 170 165 135"
                    stroke="rgb(var(--accent-primary-end) / 0.18)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <circle cx="52" cy="150" r="6" fill="rgb(var(--accent-primary) / 0.14)" />
                <circle cx="150" cy="55" r="5" fill="rgb(var(--accent-primary-end) / 0.12)" />
            </svg>
        </div>
    );
}

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative bg-theme-bg2 py-24 sm:py-32">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--accent-primary)/0.04)_0%,transparent_55%)]" />

            <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
                <div className="text-center mb-16">
                    <SectionPill label={HOW_IT_WORKS.sectionPill} />
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-black tracking-tight text-theme-text mb-4"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        {HOW_IT_WORKS.heading} <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent to-theme-accent-end">{HOW_IT_WORKS.headingHighlight}</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-theme-text/60 max-w-lg mx-auto text-[15px]"
                    >
                        {HOW_IT_WORKS.subheading}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {STEPS.map((step, i) => (
                        <motion.div
                            key={step.num}
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.15 }}
                            className="group relative rounded-3xl border border-theme-border bg-theme-card overflow-hidden flex flex-col"
                            style={{ boxShadow: "0 0 0 1px rgb(var(--surface-glass)/0.06), 0 25px 80px rgba(0,0,0,0.15)" }}
                        >
                            <motion.div
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                                className={`h-[3px] bg-gradient-to-r ${step.accent}`}
                                style={{ transformOrigin: "left" }}
                            />

                            <div className="px-6 pt-6 pb-4">
                                <span className="inline-block text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-theme-accent mb-4">
                                    {step.pill}
                                </span>
                                <h3 className="text-xl sm:text-2xl font-bold text-theme-text tracking-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {step.title}
                                </h3>
                                <p className="text-[13px] text-theme-text/55 leading-[1.65]">
                                    {step.desc}
                                </p>
                            </div>

                            <div className="flex-1 flex items-center justify-center px-6 pb-7 pt-1">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-60px" }}
                                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                                    className="w-full max-w-[220px] rounded-2xl border border-theme-border/80 bg-theme-bg2/30 flex items-center justify-center py-6"
                                >
                                    <StepIllustration index={i} />
                                </motion.div>
                            </div>

                            <span className="absolute -bottom-6 -right-2 text-[120px] font-black text-theme-text/[0.02] leading-none select-none pointer-events-none group-hover:text-theme-accent/[0.04] transition-colors duration-500">
                                {step.num}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-theme-border to-transparent" />
        </section>
    );
}
