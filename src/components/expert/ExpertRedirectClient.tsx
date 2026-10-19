"use client";

// ---------------------------------------------------------------------------
// Client-side fallback redirect for the legacy /expert URL.
//
// Why a client component (and not just an Apache 301):
//   The Apache rule in `public/.htaccess` already 301s /expert →
//   /become-a-technician on cPanel. This file is the host-agnostic
//   fallback for any non-Apache deploy (e.g. local `next start`,
//   static hosts without rewrite support).
//
// Split out from `page.tsx` in May 2026 so the route file could stay a
// server component and own the canonical-tag metadata. See CHANGELOG #031.
// ---------------------------------------------------------------------------

import { useEffect } from "react";

export default function ExpertRedirectClient() {
    useEffect(() => {
        window.location.replace("/become-a-technician");
    }, []);

    return (
        <p className="p-6 text-center text-theme-muted">
            Redirecting to Become a Technician…
        </p>
    );
}
