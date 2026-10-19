"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useTransform, useMotionValue, type Variants } from "framer-motion";
import { useScrollTop } from "@/hooks/useScrollTop";
import { HERO, whatsappHref } from "@/constants/copy";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { trackWhatsAppClick, trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";

const wordVariants: Variants = {
    hidden: { opacity: 0, y: 40, rotateX: -30, scale: 0.95 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 150,
            damping: 20,
            delay: 0.1 + i * 0.08,
        },
    }),
};

const headline = [HERO.headlineLine1, HERO.headlineLine2];

// Shared viewport config for all text-section whileInView elements
const TEXT_VIEWPORT = { once: true, margin: "-10% 0px" } as const;

export default function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const scrollProgress = useMotionValue(0);
    // Single shared scroll offset for BOTH columns. The text and the image
    // frame translate by the exact same amount, so they parallax against the
    // background together and stay edge-flush at every scroll position. (They
    // used to use different speeds — textY -80 vs phoneY -40 — which made the
    // image drift below the cities row as soon as you scrolled. CHANGELOG #064.)
    const contentY = useTransform(scrollProgress, [0, 1], [0, -80]);
    const bgScale = useTransform(scrollProgress, [0, 1], [1, 1.08]);
    const bgOpacity = useTransform(scrollProgress, [0, 0.9], [1, 0.6]);

    useScrollTop((scrollTop) => {
        const section = sectionRef.current;
        if (!section) return;
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight || 1;
        const raw = (scrollTop - sectionTop) / sectionHeight;
        scrollProgress.set(Math.max(0, Math.min(1, raw)));
    });

    return (
        <section
            ref={sectionRef}
            className="relative min-h-screen overflow-hidden flex items-center bg-theme-bg"
            style={{ background: "linear-gradient(135deg, rgb(var(--bg-primary)) 0%, rgb(var(--bg-secondary)) 50%, rgb(var(--bg-primary)) 100%)" }}
        >
            <motion.div
                style={{ scale: bgScale, opacity: bgOpacity }}
                className="absolute inset-0 pointer-events-none"
            >
                <div className="hidden sm:block absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-theme-accent/5 rounded-full blur-[140px] mix-blend-screen" />
                <div className="hidden sm:block absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-theme-accent-end/10 rounded-full blur-[120px] mix-blend-screen" />
            </motion.div>

            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, rgb(var(--accent-primary) / 0.05) 0%, transparent 60%)" }}
            />

            <div className="relative w-full max-w-[92rem] mx-auto px-6 sm:px-8 lg:px-10 py-20 sm:py-28 lg:py-32 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-24 items-center lg:items-stretch">
                <motion.div style={{ y: contentY }} className="flex flex-col max-w-2xl z-10 mt-6 sm:mt-0">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={TEXT_VIEWPORT}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                        className="inline-flex items-center gap-3 self-start rounded-full bg-theme-accent/10 border border-theme-accent/20 backdrop-blur-md px-4 py-2 mb-8 shadow-[0_0_24px_rgb(var(--accent-primary)/0.15)]"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent opacity-60" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-theme-accent" />
                        </span>
                        <span className="text-xs font-bold text-theme-accent tracking-wide uppercase">{HERO.badge}</span>
                    </motion.div>

                    <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-black tracking-tighter leading-[1.12] text-theme-text mb-6 drop-shadow-sm pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {headline.map((line, li) => (
                            <span key={li} className="block">
                                {line.split(" ").map((word, wi) => (
                                    <motion.span
                                        key={wi}
                                        custom={li * 3 + wi}
                                        variants={wordVariants}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={TEXT_VIEWPORT}
                                        className={`inline-block mr-3 sm:mr-4 pr-1 ${li === 1 ? "text-transparent bg-clip-text bg-gradient-to-br from-theme-accent via-theme-accent to-theme-accent-end pb-1" : ""}`}
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={TEXT_VIEWPORT}
                        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                        className="text-theme-text/70 text-[17px] sm:text-[20px] max-w-[540px] leading-[1.6] mb-10 sm:mb-12 font-medium"
                    >
                        {HERO.description}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={TEXT_VIEWPORT}
                        transition={{ delay: 0.8, type: "spring", stiffness: 150, damping: 20 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-12"
                    >
                        {/* WhatsApp — first CTA, identical size/layout/icon
                            treatment to the two store buttons (glass shell,
                            w-7 h-7 brand glyph, super-label + label stack).
                            Lives in the Hero as the site's single WhatsApp
                            home (CHANGELOG #041); user moved it to lead the
                            row ahead of the store buttons. */}
                        <motion.a
                            href={whatsappHref()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                                trackEvent(AnalyticsEvents.WhatsAppFloatClick, { location: "hero" });
                                trackWhatsAppClick("hero");
                            }}
                            aria-label="Chat with Pockit Engineers on WhatsApp"
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl border border-theme-glass/10 bg-theme-glass/5 backdrop-blur-xl px-6 py-4 hover:border-theme-glass/30 hover:bg-theme-glass/10 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                            </svg>
                            <div className="flex flex-col leading-tight text-left">
                                <span className="text-[10px] font-semibold text-theme-text/50 uppercase tracking-widest">{HERO.whatsappSuperLabel}</span>
                                <span className="text-[16px] font-bold text-theme-text mt-0.5">{HERO.whatsappLabel}</span>
                            </div>
                        </motion.a>

                        <motion.a
                            href="https://play.google.com/store/apps/details?id=com.pockitcust"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                                trackEvent(AnalyticsEvents.CtaDownloadApp, { store: "google_play", location: "hero" });
                                trackPlayStoreClick("hero");
                            }}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl border border-theme-glass/10 bg-theme-glass/5 backdrop-blur-xl px-6 py-4 hover:border-theme-glass/30 hover:bg-theme-glass/10 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="none">
                                <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .61-.92Z" fill="#4285F4" />
                                <path d="M17.318 8.5 14.5 10.2 13.793 12l.707 1.8 2.818 1.7 3.186-1.89a1.005 1.005 0 0 0 0-1.72L17.318 8.5Z" fill="#FBBC04" />
                                <path d="m3.61 1.814 10.89 10.186L17.318 8.5 7.236.645A1.01 1.01 0 0 0 3.61 1.814Z" fill="#34A853" />
                                <path d="m3.61 22.186 3.626-1.169 10.082-6.517-2.818-2.5L3.61 22.186Z" fill="#EA4335" />
                            </svg>
                            <div className="flex flex-col leading-tight text-left">
                                <span className="text-[10px] font-semibold text-theme-text/50 uppercase tracking-widest">{HERO.googlePlaySuperLabel}</span>
                                <span className="text-[16px] font-bold text-theme-text mt-0.5">{HERO.googlePlayLabel}</span>
                            </div>
                        </motion.a>

                        <motion.a
                            href="https://apps.apple.com/in/app/pockit/id6745779480"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                                trackEvent(AnalyticsEvents.CtaDownloadApp, { store: "app_store", location: "hero" });
                                trackAppStoreClick("hero");
                            }}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl border border-theme-glass/10 bg-theme-glass/5 backdrop-blur-xl px-6 py-4 hover:border-theme-glass/30 hover:bg-theme-glass/10 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="rgb(var(--text-primary))">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
                            </svg>
                            <div className="flex flex-col leading-tight text-left">
                                <span className="text-[10px] font-semibold text-theme-text/50 uppercase tracking-widest">{HERO.appStoreSuperLabel}</span>
                                <span className="text-[16px] font-bold text-theme-text mt-0.5">{HERO.appStoreLabel}</span>
                            </div>
                        </motion.a>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={TEXT_VIEWPORT}
                        transition={{ delay: 1.1, duration: 0.8 }}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                        <span className="text-[11px] font-bold text-theme-text/40 uppercase tracking-widest whitespace-nowrap">{HERO.nowLiveIn}</span>
                        <div className="flex flex-wrap gap-2">
                            {HERO.cities.map((city, i) => (
                                <motion.span
                                    key={city}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={TEXT_VIEWPORT}
                                    transition={{ delay: 1.2 + i * 0.05, type: "spring", stiffness: 200 }}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-theme-text/80 bg-theme-text/5 border border-theme-text/10 rounded-full px-3 py-1.5 transition-colors hover:bg-theme-text/10"
                                >
                                    {city}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateY: -20, y: 100 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
                    className="relative isolate flex justify-center items-center z-10 mx-auto lg:mx-0 lg:-translate-x-5 w-[300px] sm:w-[360px] md:w-[420px] lg:w-[440px] lg:h-full mt-12 lg:mt-0 perspective-[1200px]"
                    style={{ y: contentY }}
                >
                    <div className="absolute inset-[12%] bg-theme-accent/15 rounded-full blur-[90px]" />
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-12 rounded-[100%] bg-black/30 blur-2xl" />

                    {/* Hero artwork — Hero.webp (920×1380, 2:3) carries a white
                        studio backdrop baked into its lower edge. object-cover +
                        object-top crops that white strip off the bottom rather
                        than letterboxing it — the old object-contain showed it as
                        a white gap (CHANGELOG #063). On lg the frame is absolutely
                        stretched to fill the text column's height, so its top sits
                        flush with the badge and its bottom flush with the cities
                        row; on mobile it falls back to a fixed 3:4 frame (also
                        cropping the white). The phone mockup was removed in
                        CHANGELOG #054 and the PNG swapped for WebP in #061; the
                        continuous float loop was removed in #063 — entrance +
                        scroll parallax are preserved. */}
                    <div className="relative z-10 w-full aspect-[3/4] lg:aspect-auto lg:absolute lg:inset-0 overflow-hidden rounded-3xl border-[3px] border-theme-accent shadow-[0_24px_48px_rgba(0,0,0,0.15)] sm:shadow-[0_40px_80px_rgba(0,0,0,0.22)]">
                        <Image
                            src="/images/Hero.webp"
                            alt="Pockit Engineers — doorstep laptop repair and IT support in Mumbai"
                            fill
                            priority
                            className="object-cover object-top"
                            sizes="(max-width: 640px) 80vw, 440px"
                        />
                    </div>

                </motion.div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none" style={{ background: "linear-gradient(to top, rgb(var(--bg-primary)), transparent)" }} />
        </section>
    );
}
