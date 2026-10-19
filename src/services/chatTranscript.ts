// ── chatTranscript.ts ─────────────────────────────────────────────────────────
// Keeps the chip.ai conversation across page reloads and page-to-page
// navigation.
//
// Why client-side rather than the backend's /api/v1/history/{session_id}:
//   - the rendered transcript includes UI-only data (service cards, login
//     notices) that the backend history doesn't store;
//   - the backend session (Redis, ~8 min idle TTL) issues a new session_id
//     after expiry, so the old history would be unreachable anyway.
//
// Scope: one transcript per browser, 24 h, last 60 messages. Cleared by the
// widget's Reset button and on Log out (so a shared device doesn't show the
// previous customer's order chat). Open/closed state is per tab
// (sessionStorage) so a new tab doesn't pop the chat open.

import { ChatMessage } from './chatbot.models';

const TRANSCRIPT_KEY = 'pockit_chat_transcript_v1';
const OPEN_KEY = 'pockit_chat_open';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 60;

interface StoredTranscript {
    savedAt: number;
    messages: ChatMessage[];
}

export function loadTranscript(): ChatMessage[] {
    try {
        const raw = localStorage.getItem(TRANSCRIPT_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw) as StoredTranscript;
        if (!Array.isArray(data?.messages) || Date.now() - data.savedAt > TTL_MS) {
            localStorage.removeItem(TRANSCRIPT_KEY);
            return [];
        }
        return data.messages;
    } catch {
        return [];
    }
}

export function saveTranscript(messages: ChatMessage[]): void {
    // Never persist half-streamed replies or transient error bubbles.
    const keep = messages.filter(m => !m.isStreaming && !m.isError).slice(-MAX_MESSAGES);
    try {
        if (keep.length === 0) {
            localStorage.removeItem(TRANSCRIPT_KEY);
            return;
        }
        const data: StoredTranscript = { savedAt: Date.now(), messages: keep };
        localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(data));
    } catch {
        /* storage full or blocked — persistence is best-effort */
    }
}

export function clearTranscript(): void {
    try {
        localStorage.removeItem(TRANSCRIPT_KEY);
    } catch {
        /* ignore */
    }
}

export function loadOpenState(): boolean {
    try {
        return sessionStorage.getItem(OPEN_KEY) === '1';
    } catch {
        return false;
    }
}

export function saveOpenState(open: boolean): void {
    try {
        if (open) sessionStorage.setItem(OPEN_KEY, '1');
        else sessionStorage.removeItem(OPEN_KEY);
    } catch {
        /* ignore */
    }
}
