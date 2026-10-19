"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FLOATING_DOWNLOAD } from "@/constants/copy";
import { useScrollTop } from "@/hooks/useScrollTop";
import { trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";

export default function FloatingStoreCTA() {
    const [visible, setVisible] = useState(false);

    useScrollTop((scrollTop, el) => {
        const isNearBottom = el.scrollHeight - scrollTop - el.clientHeight < 320;
        setVisible(scrollTop > 500 && !isNearBottom);
    });

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 200, damping: 22 }}
                    className="hidden md:flex fixed z-50 flex-row items-center justify-center gap-2.5 p-2.5 w-[calc(100%-48px)] sm:w-auto left-6 right-6 sm:right-auto sm:left-6 bottom-6
                               rounded-2xl bg-theme-card/95 border border-theme-border/70 shadow-[0_18px_45px_rgba(15,23,42,0.35)] text-theme-text
                               backdrop-blur-xl"
                >
                    <a
                        href="https://play.google.com/store/apps/details?id=com.pockitcust"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackPlayStoreClick("floating_download")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-theme-text transition-all duration-200
                                   rounded-xl border border-theme-border/60 bg-theme-bg/5 px-2.5 py-2
                                   hover:bg-theme-accent/10 hover:border-theme-accent/40"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
                            <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .61-.92Z" fill="#4285F4" />
                            <path d="M17.318 8.5 14.5 10.2 13.793 12l.707 1.8 2.818 1.7 3.186-1.89a1.005 1.005 0 0 0 0-1.72L17.318 8.5Z" fill="#FBBC04" />
                            <path d="m3.61 1.814 10.89 10.186L17.318 8.5 7.236.645A1.01 1.01 0 0 0 3.61 1.814Z" fill="#34A853" />
                            <path d="m3.61 22.186 3.626-1.169 10.082-6.517-2.818-2.5L3.61 22.186Z" fill="#EA4335" />
                        </svg>
                        <div className="leading-none flex-col flex items-start">
                            <p className="text-[8px] font-medium opacity-60 leading-none">{FLOATING_DOWNLOAD.googlePlaySuperLabel}</p>
                            <p className="text-[11px] sm:text-[12px] font-bold leading-tight mt-0.5">{FLOATING_DOWNLOAD.googlePlayLabel}</p>
                        </div>
                    </a>

                    <a
                        href="https://apps.apple.com/in/app/pockit/id6745779480"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAppStoreClick("floating_download")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-theme-text transition-all duration-200
                                   rounded-xl border border-theme-border/60 bg-theme-bg/5 px-2.5 py-2
                                   hover:bg-theme-accent/10 hover:border-theme-accent/40"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        <div className="leading-none flex-col flex items-start">
                            <p className="text-[8px] font-medium opacity-60 leading-none">{FLOATING_DOWNLOAD.appStoreSuperLabel}</p>
                            <p className="text-[11px] sm:text-[12px] font-bold leading-tight mt-0.5">{FLOATING_DOWNLOAD.appStoreLabel}</p>
                        </div>
                    </a>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
