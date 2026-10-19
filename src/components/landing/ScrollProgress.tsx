"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useScrollTop } from "@/hooks/useScrollTop";

export default function ScrollProgress() {
    const progress = useMotionValue(0);
    const scaleX = useSpring(progress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        queueMicrotask(() => setMounted(true));
    }, []);

    useScrollTop((scrollTop, el) => {
        const scrollHeight = el.scrollHeight - el.clientHeight;
        if (scrollHeight > 0) progress.set(scrollTop / scrollHeight);
    });

    if (!mounted) return null;

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
            style={{
                scaleX,
                background: "linear-gradient(90deg, rgb(var(--accent-primary)), rgb(var(--accent-primary-end)))",
            }}
        />
    );
}
