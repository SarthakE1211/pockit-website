import { useEffect, useRef } from "react";

type Listener = (scrollTop: number, el: HTMLElement) => void;

const listeners = new Set<Listener>();
let attachedEl: HTMLElement | null = null;

function ensureInit() {
    const el = document.querySelector(".app-scrollbar") as HTMLElement | null;
    if (!el || el === attachedEl) return;
    attachedEl = el;
    el.addEventListener(
        "scroll",
        () => { listeners.forEach(fn => fn(el.scrollTop, el)); },
        { passive: true }
    );
}

export function useScrollTop(callback: (scrollTop: number, el: HTMLElement) => void) {
    const cbRef = useRef(callback);

    useEffect(() => {
        cbRef.current = callback;
    }, [callback]);

    useEffect(() => {
        ensureInit();
        const listener: Listener = (st, el) => cbRef.current(st, el);
        listeners.add(listener);
        // Sync immediately with current scroll position
        if (attachedEl) cbRef.current(attachedEl.scrollTop, attachedEl);
        return () => { listeners.delete(listener); };
    }, []);
}
