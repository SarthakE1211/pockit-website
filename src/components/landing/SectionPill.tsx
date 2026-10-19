"use client";

import { motion } from "framer-motion";

interface SectionPillProps {
    label: string;
}

export default function SectionPill({ label }: SectionPillProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 border border-theme-accent/20 bg-theme-accent/[0.06]"
        >
            <span className="text-[12px] font-semibold text-theme-accent tracking-wide">
                {label}
            </span>
        </motion.div>
    );
}
