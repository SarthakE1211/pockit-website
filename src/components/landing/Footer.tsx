"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FOOTER, FOOTER_LINKS } from "@/constants/copy";
import { useBookServiceNav } from "@/hooks/useBookServiceNav";
import { resolveNavHref } from "@/lib/siteUrls";

const THEMES = {
    dark: "dark-gradient",
    light: "light-corporate"
};

export default function Footer() {
    const pathname = usePathname();
    const isHome = pathname === "/";
    // Use the shared resolver so footer links behave correctly on both the main
    // site and the Vercel blog subdomain. See @/lib/siteUrls.
    const linkHref = (href: string) => resolveNavHref(href, isHome);
    const onBookService = useBookServiceNav();
    const [theme, setTheme] = useState<string>("light-corporate");
    const [themeHydrated, setThemeHydrated] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("pockit-theme");
        const resolved = saved || document.documentElement.getAttribute("data-theme") || "light-corporate";
        setTheme(resolved);
        setThemeHydrated(true);

        const obs = new MutationObserver(() => {
            setTheme(document.documentElement.getAttribute("data-theme") || "dark-gradient");
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        return () => obs.disconnect();
    }, []);

    return (
        <footer
            className="relative border-t border-theme-border bg-theme-bg"
        >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-theme-accent/20 to-transparent" />

            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Image
                                src={themeHydrated && theme === THEMES.dark ? "/images/OG%20Logo.svg" : "/images/blue_brand_logo.svg"}
                                alt={FOOTER.logoAlt}
                                width={180} height={54}
                                className="h-10 w-auto md:h-12"
                                unoptimized
                            />
                        </div>
                        <p className="text-[13px] text-theme-text/60 leading-relaxed max-w-xs mb-7">
                            {FOOTER.description}
                        </p>
                        <div className="flex items-center gap-3">
                            {[
                                {
                                    label: "LinkedIn",
                                    href: "https://www.linkedin.com/company/pockit-engineers/",
                                    path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
                                    fill: false,
                                    color: "#0A66C2",
                                },
                                {
                                    label: "X (Twitter)",
                                    href: "https://x.com/PockITEngineers",
                                    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
                                    fill: true,
                                    color: "#1D9BF0",
                                },
                                {
                                    label: "Facebook",
                                    href: "https://www.facebook.com/profile.php?id=61576204075910",
                                    path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
                                    fill: false,
                                    color: "#1877F2",
                                },
                                {
                                    label: "Instagram",
                                    href: "https://www.instagram.com/baspockitkaro/",
                                    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
                                    fill: true,
                                    color: "#E1306C",
                                },
                            ].map(s => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={s.label}
                                    className="w-9 h-9 rounded-xl border transition-all duration-200 flex items-center justify-center group"
                                    style={{
                                        backgroundColor: `${s.color}1E`,
                                        borderColor: `${s.color}45`,
                                        color: `${s.color}CC`,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor = `${s.color}30`;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${s.color}70`;
                                        (e.currentTarget as HTMLElement).style.color = s.color;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.backgroundColor = `${s.color}1E`;
                                        (e.currentTarget as HTMLElement).style.borderColor = `${s.color}45`;
                                        (e.currentTarget as HTMLElement).style.color = `${s.color}CC`;
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill={s.fill ? "currentColor" : "none"} stroke={s.fill ? "none" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d={s.path} />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {FOOTER_LINKS.map(col => (
                        <div key={col.title}>
                            <p className="text-[11px] font-bold text-theme-text/40 uppercase tracking-[0.18em] mb-5 font-mono">{col.title}</p>
                            <ul className="space-y-3">
                                {col.links.map(link => {
                                    const href = linkHref(link.href);
                                    const isExternal = href.startsWith("http");
                                    return (
                                        <li key={link.label}>
                                            {isExternal ? (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[13px] text-theme-text/60 hover:text-theme-accent-end transition-colors duration-200"
                                                >
                                                    {link.label}
                                                </a>
                                            ) : (
                                                <Link
                                                    href={href}
                                                    className="text-[13px] text-theme-text/60 hover:text-theme-accent-end transition-colors duration-200"
                                                >
                                                    {link.label}
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-14 pt-6 border-t border-theme-border flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex flex-col gap-2 max-w-3xl">
                        <p className="text-[12px] text-theme-text/50">
                            {FOOTER.copyright}
                        </p>
                        <p className="text-[11px] text-theme-text/40 leading-relaxed">
                            {FOOTER.disclaimer}
                        </p>
                    </div>
                    <motion.a
                        href={resolveNavHref("/#download", isHome)}
                        onClick={onBookService}
                        whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgb(var(--accent-primary)/0.35)" }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110"
                        style={{
                            background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                            boxShadow: "0 8px 30px rgb(var(--accent-primary)/0.30)",
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        {FOOTER.bookCTA}
                    </motion.a>
                </div>
            </div>
        </footer>
    );
}
