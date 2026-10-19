"use client";

import { useEffect } from "react";

/**
 * Reads the saved theme from localStorage and applies it to <html data-theme>
 * so that CSS variable-based theming works on standalone pages like /terms.
 */
export default function ThemeSync() {
    useEffect(() => {
        const saved = localStorage.getItem("pockit-theme");
        if (saved) {
            document.documentElement.setAttribute("data-theme", saved);
        } else {
            document.documentElement.setAttribute("data-theme", "light-corporate");
        }
    }, []);
    return null;
}
