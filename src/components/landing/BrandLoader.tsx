"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const FILL_DURATION = 1.8;
const FILL_DELAY = 0.3;

interface BrandLoaderProps {
    onComplete?: () => void;
}

export default function BrandLoader({ onComplete }: BrandLoaderProps) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        if (typeof document === "undefined") return;

        const syncTheme = () => {
            const theme = document.documentElement.getAttribute("data-theme") || "light-corporate";
            setIsDark(theme.startsWith("dark"));
        };

        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => observer.disconnect();
    }, []);

    const handleAnimationComplete = useCallback(() => {
        onComplete?.();
    }, [onComplete]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-theme-bg"
            aria-label="Loading Pockit Engineers"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="w-[260px] sm:w-[320px]"
            >
                <motion.div
                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={{
                        duration: FILL_DURATION,
                        ease: [0.4, 0, 0.2, 1],
                        delay: FILL_DELAY,
                    }}
                    onAnimationComplete={handleAnimationComplete}
                >
                    <Image
                        src={isDark ? "/images/OG%20Logo.svg" : "/images/blue_brand_logo.svg"}
                        alt="Pockit Engineers"
                        width={600}
                        height={168}
                        className="w-full h-auto"
                        priority
                        unoptimized
                    />
                </motion.div>
            </motion.div>
        </div>
    );
}
