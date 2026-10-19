"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { NAV_LINKS, HEADER, whatsappHref } from "@/constants/copy";
import { trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";
import { useScrollTop } from "@/hooks/useScrollTop";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useBookServiceNav } from "@/hooks/useBookServiceNav";
import { getMainSiteHomeUrl, resolveNavHref } from "@/lib/siteUrls";

const THEMES = {
    dark: "dark-gradient",
    light: "light-corporate"
};

export default function Header() {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const isBlogContext = pathname?.startsWith("/blog") ?? false;
    const isExpertPage = pathname === "/become-a-technician";
    // Resolved URL for the logo — same-origin `/` on the main site / in dev,
    // absolute main-site URL on the Vercel blog build. See @/lib/siteUrls.
    const homeUrl = getMainSiteHomeUrl();
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [theme, setTheme] = useState<string>("light-corporate");
    const [themeHydrated, setThemeHydrated] = useState(false);
    const isMobile = useIsMobile();
    const onBookService = useBookServiceNav();

    useEffect(() => {
        const saved = localStorage.getItem("pockit-theme");
        const resolved = saved || "light-corporate";
        document.documentElement.setAttribute("data-theme", resolved);
        setTheme(resolved);
        setThemeHydrated(true);
    }, []);

    useScrollTop((scrollTop) => { setScrolled(scrollTop > 40); });

    const toggleTheme = () => {
        const newTheme = theme === THEMES.dark ? THEMES.light : THEMES.dark;
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("pockit-theme", newTheme);
    };
    // Use light-theme logo as the default (matches server render) until hydration completes
    const logoSrc = themeHydrated && theme === THEMES.dark ? "/images/OG%20Logo.svg" : "/images/blue_brand_logo.svg";
    const scrollToSection = (hash: string) => {
        const id = hash.replace(/^#/, "");
        const target = document.getElementById(id);
        if (!target) return;
        const appScroller = document.querySelector(".app-scrollbar") as HTMLElement | null;
        if (appScroller) {
            appScroller.scrollTo({ top: Math.max(0, target.offsetTop - 84), behavior: "smooth" });
            window.history.replaceState(null, "", `/#${id}`);
            return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const handleNavLinkClick = (href: string, e: MouseEvent<HTMLAnchorElement>) => {
        if (!href.startsWith("#") || !isHome) return;
        e.preventDefault();
        scrollToSection(href);
    };
    const handleLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // If the resolved home URL is cross-origin (blog build pointing back to
        // the main site), let the Link do a normal navigation.
        if (/^https?:\/\//i.test(homeUrl)) return;
        if (!isHome) return;
        e.preventDefault();
        const appScroller = document.querySelector(".app-scrollbar") as HTMLElement | null;
        if (appScroller) {
            appScroller.scrollTo({ top: 0, behavior: "smooth" });
            window.history.replaceState(null, "", "/");
            return;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 right-0 z-50 transition-all duration-300 top-0"
            style={{
                background: isMobile
                    ? "rgb(var(--nav-bg) / 0.97)"
                    : scrolled ? "rgb(var(--nav-bg) / 0.95)" : "rgb(var(--nav-bg) / 0.85)",
                ...(!isMobile && {
                    backdropFilter: "blur(12px) saturate(180%)",
                    WebkitBackdropFilter: "blur(12px) saturate(180%)",
                }),
                borderBottom: scrolled ? "1px solid rgb(var(--text-muted) / 0.08)" : "1px solid transparent",
                boxShadow: scrolled ? "0 4px 30px rgb(var(--bg-primary) / 0.30)" : "none",
            }}
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                <div className="flex h-[68px] items-center gap-8">
                    <Link
                        href={homeUrl}
                        className="flex items-center gap-2"
                        onClick={handleLogoClick}
                    >
                        <Image
                            src={logoSrc}
                            alt="Pockit Engineers Logo"
                            width={132}
                            height={40}
                            className="h-8 sm:h-9 lg:h-10 w-[132px] object-contain transition-all duration-300"
                            priority
                            unoptimized
                        />
                    </Link>

                    <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {NAV_LINKS.map(link => {
                            const isActiveBlog = link.href === "/blog" && isBlogContext;
                            const resolved = resolveNavHref(link.href, isHome);
                            const isExternal = /^https?:\/\//i.test(resolved);
                            const cls = isActiveBlog
                                ? "whitespace-nowrap px-4 py-2 text-[16px] font-semibold rounded-lg transition-colors duration-200 text-theme-accent-end bg-theme-text/5"
                                : "whitespace-nowrap px-4 py-2 text-[16px] font-medium rounded-lg transition-colors duration-200 text-theme-text/75 hover:text-theme-accent-end hover:bg-theme-text/5";
                            return isExternal ? (
                                <a
                                    key={link.label}
                                    href={resolved}
                                    aria-current={isActiveBlog ? "page" : undefined}
                                    className={cls}
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.label}
                                    href={resolved}
                                    onClick={(e) => handleNavLinkClick(link.href, e)}
                                    aria-current={isActiveBlog ? "page" : undefined}
                                    className={cls}
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <button
                            onClick={toggleTheme}
                            className="p-2 mr-2 rounded-full hover:bg-theme-text/5 text-theme-text/70 transition-colors"
                            aria-label={HEADER.themeToggleLabel}
                        >
                            {/* Render a neutral placeholder until hydration completes to avoid SSR/client mismatch */}
                            <span className="w-5 h-5 inline-block">
                                {themeHydrated && (theme === THEMES.dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                            </span>
                        </button>
                        {isExpertPage ? (
                            <a
                                href={whatsappHref()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[16px] font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
                                style={{
                                    padding: "9px 22px",
                                    borderRadius: 9999,
                                    background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                                    boxShadow: "0 2px 14px rgb(var(--accent-primary) / 0.40)",
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="m9 18 6-6-6-6" /></svg>
                                Join Us
                            </a>
                        ) : (
                            <Link
                                href={resolveNavHref("/#download", isHome)}
                                onClick={onBookService}
                                className="inline-flex items-center gap-2 text-[16px] font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
                                style={{
                                    padding: "9px 22px",
                                    borderRadius: 9999,
                                    background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                                    boxShadow: "0 2px 14px rgb(var(--accent-primary) / 0.40)",
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="m9 18 6-6-6-6" /></svg>
                                {HEADER.bookLabel}
                            </Link>
                        )}
                    </div>

                    <button
                        onClick={() => setOpen(!open)}
                        className="md:hidden ml-auto p-2 text-theme-text"
                        aria-label="Toggle menu"
                    >
                        {open ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                        )}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden px-5 pb-5"
                        style={{
                            background: "rgb(var(--nav-bg) / 0.98)",
                            borderBottom: "1px solid rgb(var(--text-muted) / 0.08)",
                        }}
                    >
                        <div className="flex flex-col gap-1 pt-2">
                            {NAV_LINKS.map(link => {
                                const isActiveBlog = link.href === "/blog" && isBlogContext;
                                const resolved = resolveNavHref(link.href, isHome);
                                const isExternal = /^https?:\/\//i.test(resolved);
                                const cls = isActiveBlog
                                    ? "px-4 py-3 text-base font-semibold rounded-xl transition-colors duration-200 text-theme-accent-end bg-theme-text/5"
                                    : "px-4 py-3 text-base font-medium rounded-xl transition-colors duration-200 text-theme-text/70 hover:text-theme-accent-end hover:bg-theme-text/5";
                                return isExternal ? (
                                    <a
                                        key={link.label}
                                        href={resolved}
                                        onClick={() => setOpen(false)}
                                        aria-current={isActiveBlog ? "page" : undefined}
                                        className={cls}
                                    >
                                        {link.label}
                                    </a>
                                ) : (
                                    <Link
                                        key={link.label}
                                        href={resolved}
                                        onClick={(e) => {
                                            handleNavLinkClick(link.href, e);
                                            setOpen(false);
                                        }}
                                        aria-current={isActiveBlog ? "page" : undefined}
                                        className={cls}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="h-px my-3 bg-theme-text/10" />
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-between w-full px-4 py-3 text-base font-medium rounded-xl transition-colors text-theme-text/70 hover:bg-theme-text/5 text-left"
                            >
                                <span>Theme: {themeHydrated && theme === THEMES.dark ? HEADER.themeDarkLabel : HEADER.themeLightLabel}</span>
                                <span className="w-5 h-5 inline-block">
                                    {themeHydrated && (theme === THEMES.dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
                                </span>
                            </button>
                            <div className="mt-3 flex flex-col gap-2">
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.pockitcust"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        trackPlayStoreClick("header-mobile");
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-center gap-3 rounded-xl border border-theme-glass/[0.14] bg-theme-glass/[0.08] px-4 py-3 text-sm font-semibold text-theme-text hover:border-theme-glass/25 hover:bg-theme-glass/[0.14] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
                                        <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .61-.92Z" fill="#4285F4" />
                                        <path d="M17.318 8.5 14.5 10.2 13.793 12l.707 1.8 2.818 1.7 3.186-1.89a1.005 1.005 0 0 0 0-1.72L17.318 8.5Z" fill="#FBBC04" />
                                        <path d="m3.61 1.814 10.89 10.186L17.318 8.5 7.236.645A1.01 1.01 0 0 0 3.61 1.814Z" fill="#34A853" />
                                        <path d="m3.61 22.186 3.626-1.169 10.082-6.517-2.818-2.5L3.61 22.186Z" fill="#EA4335" />
                                    </svg>
                                    <span className="flex flex-col leading-tight text-left">
                                        <span className="text-[10px] uppercase tracking-wide text-theme-text/60">{HEADER.googlePlaySuperLabel}</span>
                                        <span className="text-[15px] font-bold text-theme-text">{HEADER.googlePlayLabel}</span>
                                    </span>
                                </a>

                                <a
                                    href="https://apps.apple.com/in/app/pockit/id6745779480"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        trackAppStoreClick("header-mobile");
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-center gap-3 rounded-xl border border-theme-glass/[0.14] bg-theme-glass/[0.08] px-4 py-3 text-sm font-semibold text-theme-text hover:border-theme-glass/25 hover:bg-theme-glass/[0.14] transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                    </svg>
                                    <span className="flex flex-col leading-tight text-left">
                                        <span className="text-[10px] uppercase tracking-wide text-theme-text/60">{HEADER.appStoreSuperLabel}</span>
                                        <span className="text-[15px] font-bold text-theme-text">{HEADER.appStoreLabel}</span>
                                    </span>
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
