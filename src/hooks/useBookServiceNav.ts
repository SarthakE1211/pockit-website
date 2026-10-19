"use client";

import { useCallback, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/constants/appStores";
import { resolveNavHref } from "@/lib/siteUrls";

const MOBILE_MAX = 767;

function mobileStoreTarget(): "ios" | "android" | null {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    // iPadOS 13+ often reports as MacIntel with touch
    if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return "ios";
    if (/android/i.test(ua)) return "android";
    return null;
}

function scrollToDownloadSection() {
    const el = document.getElementById("download");
    const scroller = document.querySelector(".app-scrollbar") as HTMLElement | null;
    if (el && scroller) {
        const top = el.offsetTop - 80;
        scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        return;
    }
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * "Book a Service" / primary app CTA:
 * - On mobile Safari / Chrome: open the correct app store (iOS vs Android).
 * - Otherwise: smooth-scroll to #download on the main-site home, or navigate
 *   to the resolved `/#download` URL (which may be absolute on the blog build).
 *
 * The resolver ensures a click on the blog subdomain hops back to the main
 * site's #download anchor rather than attempting a same-origin scroll that has
 * nowhere to land.
 */
export function useBookServiceNav() {
    const pathname = usePathname();
    const isHome = pathname === "/";

    return useCallback(
        (e?: MouseEvent) => {
            e?.preventDefault();

            const isMobile =
                typeof window !== "undefined" &&
                window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;

            if (isMobile) {
                const store = mobileStoreTarget();
                if (store === "ios") {
                    window.location.href = APP_STORE_URL;
                    return;
                }
                if (store === "android") {
                    window.location.href = PLAY_STORE_URL;
                    return;
                }
            }

            if (isHome) {
                scrollToDownloadSection();
            } else {
                // On cross-origin (blog) builds `resolveNavHref` returns an
                // absolute main-site URL; on the main site it stays `/#download`.
                window.location.href = resolveNavHref("/#download", isHome);
            }
        },
        [isHome]
    );
}
