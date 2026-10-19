"use client";

// ---------------------------------------------------------------------------
// Deferred mount wrapper for the Chatbot.
//
// Why this exists:
//   `Chatbot.tsx` statically imports `ChatApiService`, which in turn pulls
//   the Firebase Auth SDK (`firebase/app` + `firebase/auth`) — together a
//   ~140 KB chunk that has nothing to do with first-paint or LCP. Even
//   wrapping `Chatbot` in `next/dynamic` from `AppShell` only delays the
//   chunk a few RAFs because Next opportunistically prefetches it on
//   idle. This wrapper holds the dynamic import behind a state flag that
//   only flips on the FIRST sign of user engagement (any scroll / click /
//   keypress) OR after a 5 s idle window — whichever comes first. The
//   net effect: the Chatbot chunk (and Firebase) never enters the
//   critical path on bounce visitors.
//
// Why not `requestIdleCallback` alone:
//   `requestIdleCallback` is undefined on Safari iOS; the interaction
//   listeners cover that path. The 5 s setTimeout is the universal
//   floor.
//
// Introduced in CHANGELOG #039 (Phase 3 of the May 2026 SEO audit).
// ---------------------------------------------------------------------------

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Chatbot = dynamic(() => import("./Chatbot"), {
    ssr: false,
    loading: () => null,
});

export default function ChatbotMount() {
    const [shouldMount, setShouldMount] = useState(false);

    useEffect(() => {
        if (shouldMount) return;

        const mount = () => setShouldMount(true);

        // Floor: mount after 5 s no matter what so the chatbot is always
        // available for slow scrollers / keyboard-only users.
        const timeoutId = window.setTimeout(mount, 5000);

        // Earliest opportunity: any genuine engagement signal.
        const opts = { once: true, passive: true } as const;
        window.addEventListener("scroll", mount, opts);
        window.addEventListener("click", mount, opts);
        window.addEventListener("keydown", mount, opts);
        window.addEventListener("touchstart", mount, opts);

        // Best-effort idle hook — undefined on Safari iOS, hence the
        // floor + interaction fallbacks above.
        type IdleWindow = Window & {
            requestIdleCallback?: (
                cb: () => void,
                opts?: { timeout: number },
            ) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        const w = window as IdleWindow;
        const idleId = w.requestIdleCallback?.(mount, { timeout: 4000 });

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener("scroll", mount);
            window.removeEventListener("click", mount);
            window.removeEventListener("keydown", mount);
            window.removeEventListener("touchstart", mount);
            if (typeof idleId === "number" && w.cancelIdleCallback) {
                w.cancelIdleCallback(idleId);
            }
        };
    }, [shouldMount]);

    if (!shouldMount) return null;
    return <Chatbot />;
}
