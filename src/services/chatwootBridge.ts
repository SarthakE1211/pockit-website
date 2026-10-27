// ── chatwootBridge.ts ─────────────────────────────────────────────────────────
// Mirrors chip.ai website chats into Chatwoot (Pockit's support inbox) and lets
// an agent take a chat over. Talks to the `chip-bridge` service, never to
// Chatwoot directly (no Chatwoot tokens in the browser).
//
// Agreed behaviour (2026-10-27, see CLAUDE.md → "chip.ai ↔ Chatwoot"):
//  • Every chat is copied to Chatwoot; chip.ai answers while mode === 'bot'.
//  • mode === 'human' when an agent replies in Chatwoot, or chip.ai fails during
//    support hours. chip.ai is then silent; agent replies arrive via poll().
//  • Resolving the chat in Chatwoot returns it to chip.ai.
//  • "Talk to a human" only flags the chat for follow-up (handoff('talk_to_human')).
//
// Fail-open by design: if NEXT_PUBLIC_CHATWOOT_BRIDGE_URL is unset or the bridge
// is unreachable, every call resolves to null and the chatbot behaves exactly
// as it did before this integration.

import { ChatApiService } from './chatApiService';
import { getChatSession } from './chatAuth';

const BASE = (process.env.NEXT_PUBLIC_CHATWOOT_BRIDGE_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 6000;

export type ChatMode = 'bot' | 'human';

export interface AgentMessage {
    id: number;
    text: string;
    agent: string;
    ts: number;
}

export interface PollResult {
    mode: ChatMode;
    agentName: string | null;
    messages: AgentMessage[];
}

/** Logged-in Pockit customers: details come from the chat login, never re-asked. */
function loggedInUser() {
    const u = getChatSession()?.user;
    return u ? { name: u.name, mobile: u.mobile, customer_id: u.customer_id } : undefined;
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
    if (!BASE || typeof window === 'undefined') return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null; // fail open — the chatbot must never break because of Chatwoot
    } finally {
        clearTimeout(timer);
    }
}

const post = <T>(path: string, body: Record<string, unknown>) =>
    call<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: ChatApiService.getClientId(), user: loggedInUser(), ...body }),
        keepalive: true,
    });

export const ChatwootBridge = {
    enabled: Boolean(BASE),

    /** Copy one message to Chatwoot. Resolves to the current mode (or null if unavailable). */
    async mirror(role: 'user' | 'bot', text: string): Promise<ChatMode | null> {
        const r = await post<{ mode: ChatMode }>('/web/event', { role, text });
        return r?.mode ?? null;
    },

    /** 'talk_to_human' flags for follow-up; any other reason = chip.ai failed. */
    async handoff(reason: string): Promise<ChatMode | null> {
        const r = await post<{ mode: ChatMode }>('/web/handoff', { reason });
        return r?.mode ?? null;
    },

    /** Name + phone from a visitor who isn't logged in. */
    async shareContact(name: string, phone: string): Promise<boolean> {
        const r = await post<{ ok: boolean }>('/web/contact', { name, phone });
        return !!r?.ok;
    },

    /** Agent messages newer than `after`, plus the current mode. */
    poll(after: number): Promise<PollResult | null> {
        const q = new URLSearchParams({ clientId: ChatApiService.getClientId(), after: String(after) });
        return call<PollResult>(`/web/poll?${q}`);
    },

    isLoggedIn: () => !!getChatSession()?.user,
};
