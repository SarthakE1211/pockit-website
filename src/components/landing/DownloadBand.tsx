"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import SectionPill from "./SectionPill";
import { DOWNLOAD_BAND } from "@/constants/copy";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";

export default function DownloadBand() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section id="download" className="relative overflow-hidden">
            <div
                className="absolute inset-0 z-0 bg-theme-bg"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 60% at 20% 30%, rgb(var(--accent-primary) / 0.25) 0%, transparent 60%),
                        radial-gradient(ellipse 70% 50% at 80% 70%, rgb(var(--text-primary) / 0.05) 0%, transparent 55%),
                        radial-gradient(ellipse 60% 80% at 50% 50%, rgb(var(--accent-primary-end) / 0.10) 0%, transparent 50%),
                        linear-gradient(135deg, rgb(var(--bg-primary)) 0%, rgb(var(--bg-secondary)) 30%, rgb(var(--bg-primary)) 60%, rgb(var(--bg-secondary)) 100%)
                    `,
                }}
            />
            <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(circle at 50% 50%, rgb(var(--text-primary) / 0.02) 0%, transparent 65%)" }} />

            <div className="absolute top-0 inset-x-0 h-20 pointer-events-none z-20" style={{ background: "linear-gradient(to bottom, rgb(var(--bg-secondary)), transparent)" }} />

            <div ref={ref} className="relative z-20 max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-20 sm:py-28">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
                    <div>
                        <SectionPill label={DOWNLOAD_BAND.sectionPill} />
                        <motion.h2
                            initial={{ opacity: 0, y: 24 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-theme-text mb-5"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            {DOWNLOAD_BAND.headingLine1}{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent to-theme-accent-end">
                                {DOWNLOAD_BAND.headingHighlight}
                            </span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="text-theme-text/60 text-[16px] sm:text-[17px] leading-[1.7] max-w-lg mb-10"
                        >
                            {DOWNLOAD_BAND.description}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                            transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 15 }}
                            className="flex flex-nowrap items-center gap-3 sm:gap-4"
                        >
                            <motion.a
                                href="https://play.google.com/store/apps/details?id=com.pockitcust"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                    trackEvent(AnalyticsEvents.CtaDownloadApp, { store: "google_play", location: "download_band" });
                                    trackPlayStoreClick("download_band");
                                }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-theme-glass/[0.12] bg-theme-glass/[0.06] px-4 py-3 sm:px-8 sm:py-5 hover:border-theme-glass/25 hover:bg-theme-glass/[0.10] transition-all duration-200"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-8 sm:h-8 shrink-0" fill="none">
                                    <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .61-.92Z" fill="#4285F4" />
                                    <path d="M17.318 8.5 14.5 10.2 13.793 12l.707 1.8 2.818 1.7 3.186-1.89a1.005 1.005 0 0 0 0-1.72L17.318 8.5Z" fill="#FBBC04" />
                                    <path d="m3.61 1.814 10.89 10.186L17.318 8.5 7.236.645A1.01 1.01 0 0 0 3.61 1.814Z" fill="#34A853" />
                                    <path d="m3.61 22.186 3.626-1.169 10.082-6.517-2.818-2.5L3.61 22.186Z" fill="#EA4335" />
                                </svg>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[8px] sm:text-[10px] font-medium text-[rgb(var(--text-primary)/0.5)] uppercase tracking-wide">{DOWNLOAD_BAND.googlePlaySuperLabel}</span>
                                    <span className="text-[13px] sm:text-[18px] font-bold text-[rgb(var(--text-primary))] -mt-0.5">{DOWNLOAD_BAND.googlePlayLabel}</span>
                                </div>
                            </motion.a>

                            <motion.a
                                href="https://apps.apple.com/in/app/pockit/id6745779480"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                    trackEvent(AnalyticsEvents.CtaDownloadApp, { store: "app_store", location: "download_band" });
                                    trackAppStoreClick("download_band");
                                }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-theme-glass/[0.12] bg-theme-glass/[0.06] px-4 py-3 sm:px-8 sm:py-5 hover:border-theme-glass/25 hover:bg-theme-glass/[0.10] transition-all duration-200"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-8 sm:h-8 shrink-0" fill="rgb(var(--text-primary))">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
                                </svg>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-[8px] sm:text-[10px] font-medium text-[rgb(var(--text-primary)/0.5)] uppercase tracking-wide">{DOWNLOAD_BAND.appStoreSuperLabel}</span>
                                    <span className="text-[13px] sm:text-[18px] font-bold text-[rgb(var(--text-primary))] -mt-0.5">{DOWNLOAD_BAND.appStoreLabel}</span>
                                </div>
                            </motion.a>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, rotateY: -10 }}
                        animate={inView ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="hidden lg:flex flex-col items-center"
                    >
                        <div
                            className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl flex items-center justify-center relative overflow-hidden"
                            style={{
                                background: "rgb(var(--surface-glass) / 0.06)",
                                border: "1px solid rgb(var(--surface-glass) / 0.12)",
                                boxShadow: "0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgb(var(--surface-glass) / 0.06)",
                            }}
                        >
                            <div className="absolute inset-4 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                                <Image
                                    src="/qr-linktree.webp"
                                    alt={DOWNLOAD_BAND.qrAlt}
                                    fill
                                    sizes="224px"
                                    className="object-contain p-2"
                                />
                            </div>
                            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgb(var(--surface-glass) / 0.08) 0%, transparent 50%)" }} />
                        </div>
                        <p className="text-[11px] font-semibold text-theme-text/40 mt-4 uppercase tracking-wider">{DOWNLOAD_BAND.qrScanLabel}</p>
                    </motion.div>
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-theme-accent/20 to-transparent z-20" />
        </section>
    );
}
