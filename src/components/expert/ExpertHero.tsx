"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Phone, Star } from "lucide-react";
import { EXPERT_BELOW, EXPERT_PAGE_UC } from "@/constants/copy";
import TechnicianForm from "@/components/expert/TechnicianForm";

export default function ExpertHero() {
    const { hero } = EXPERT_PAGE_UC;

    const pockitIdx = hero.headline.indexOf("Pockit");
    const headlineParts =
        pockitIdx >= 0
            ? {
                  before: hero.headline.slice(0, pockitIdx + 4),
                  it: hero.headline.slice(pockitIdx + 4, pockitIdx + 6),
                  after: hero.headline.slice(pockitIdx + 6),
              }
            : null;

    return (
        <div
            className="relative"
            style={{
                background: "rgb(var(--bg-secondary))",
            }}
        >
            <section
                className="relative overflow-hidden border-b pt-[5.25rem] pb-14 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20"
                style={{
                    borderColor: "rgb(var(--text-muted) / 0.08)",
                    background: "linear-gradient(180deg, rgb(var(--bg-primary)) 0%, rgb(var(--bg-secondary)) 100%)",
                }}
            >
                <div className="relative mx-auto grid w-[92%] max-w-6xl gap-12 lg:w-[88%] lg:grid-cols-2 lg:items-center lg:gap-16">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="text-center lg:text-left"
                    >
                        <h1
                            className="text-balance text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-[4.25rem] xl:leading-[1.05]"
                            style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                color: "rgb(var(--text-primary) / 0.95)",
                            }}
                        >
                            {headlineParts ? (
                                <>
                                    {headlineParts.before}
                                    <span className="text-theme-accent">{headlineParts.it}</span>
                                    {headlineParts.after}
                                </>
                            ) : (
                                hero.headline
                            )}
                        </h1>
                        <p
                            className="mx-auto mt-6 max-w-xl text-xl font-semibold leading-snug sm:text-2xl lg:mx-0"
                            style={{ color: "rgb(var(--text-primary) / 0.88)" }}
                        >
                            {hero.tagline}
                        </p>
                        <p
                            className="mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg lg:mx-0"
                            style={{ color: "rgb(var(--text-primary) / 0.72)" }}
                        >
                            {hero.body}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                            {["No chasing", "No uncertainty", "No middlemen"].map((item) => (
                                <span
                                    key={item}
                                    className="rounded-full border px-3.5 py-1.5 text-xs font-semibold sm:text-sm"
                                    style={{
                                        borderColor: "rgb(var(--card-border) / 0.45)",
                                        background: "rgb(var(--bg-primary) / 0.9)",
                                        color: "rgb(var(--text-primary) / 0.78)",
                                    }}
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:items-center lg:justify-start">
                            <div className="flex items-center">
                                {[
                                    { src: "/avatars/cartoon-1.svg", alt: "Cartoon expert avatar 1" },
                                    { src: "/avatars/cartoon-2.svg", alt: "Cartoon expert avatar 2" },
                                    { src: "/avatars/cartoon-3.svg", alt: "Cartoon expert avatar 3" },
                                ].map((avatar, idx) => (
                                    <div
                                        key={avatar.alt}
                                        className={`relative h-11 w-11 overflow-hidden rounded-full border-2 ${idx === 0 ? "" : "-ml-2.5"}`}
                                        style={{
                                            borderColor: "rgb(var(--bg-primary))",
                                            boxShadow: "0 4px 14px rgb(0 0 0 / 0.15)",
                                        }}
                                    >
                                        <Image
                                            src={avatar.src}
                                            alt={avatar.alt}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center gap-1 sm:justify-start">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className="h-4 w-4"
                                            style={{ color: "#FACC15", fill: "#FACC15" }}
                                            strokeWidth={1.8}
                                        />
                                    ))}
                                </div>
                                <p
                                    className="mt-1 text-sm font-medium sm:text-[15px]"
                                    style={{ color: "rgb(var(--text-primary) / 0.8)" }}
                                >
                                    4.75 from 300+ professionals
                                </p>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center lg:justify-start">
                            {/* Click-to-dial CTA — opens the phone dialer on
                                mobile. `tel:` anchor (not a button) so it's a
                                real link crawlers + assistive tech recognise.
                                See CHANGELOG #079. */}
                            <a
                                href={`tel:${hero.ctaDialNumber}`}
                                className="inline-flex items-center gap-2.5 rounded-2xl px-10 py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                                style={{
                                    background:
                                        "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-secondary)) 100%)",
                                    boxShadow: "0 10px 28px rgb(var(--accent-primary) / 0.35)",
                                }}
                            >
                                <Phone className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                                {hero.cta}
                            </a>
                        </div>
                    </motion.div>

                    {/* Right column: the application form now sits where the
                        illustration used to (CHANGELOG #078). */}
                    <TechnicianForm />
                </div>
            </section>

            <section
                className="border-t pb-20 pt-6 sm:pb-24 sm:pt-8"
                style={{
                    borderColor: "rgb(var(--text-muted) / 0.08)",
                    background: "rgb(var(--bg-secondary))",
                }}
            >
                <div className="mx-auto max-w-2xl px-4 text-center">
                    <motion.h2
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45 }}
                        className="mb-4 text-2xl font-bold sm:text-3xl"
                        style={{ color: "rgb(var(--text-primary))" }}
                    >
                        {EXPERT_BELOW.heading}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                        className="text-base leading-relaxed sm:text-lg"
                        style={{ color: "rgb(var(--text-primary) / 0.75)" }}
                    >
                        {EXPERT_BELOW.subheading}
                    </motion.p>
                </div>
            </section>
        </div>
    );
}
