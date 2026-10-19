"use client";

// ---------------------------------------------------------------------------
// Client UI for /become-a-technician. Split out from the route file so
// `page.tsx` can stay a server component and own per-page <Metadata> +
// JobPosting JSON-LD. See CHANGELOG #031 (May 2026 SEO audit).
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ExpertHero from "@/components/expert/ExpertHero";
import ThemeSync from "@/components/landing/ThemeSync";

export default function BecomeTechnicianClient() {
    useEffect(() => {
        const saved = localStorage.getItem("pockit-theme");
        if (saved) {
            document.documentElement.setAttribute("data-theme", saved);
        }
    }, []);

    return (
        <>
            <ThemeSync />
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden"
            >
                <Header />
                <ExpertHero />
                <Footer />
            </motion.main>
        </>
    );
}
