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
//  • "Talk to a human" (chip or typed), complaints and chip.ai saying it can't help only flag
//    the chat for follow-up, with a handover summary for the team (CHANGELOG #135).
//  • Context the bridge passes to the team: login details (name, mobile, email, pincode, city,
//    address, customer id) and what chip.ai found (service, order, pincode, language).
//
// Fail-open by design: if NEXT_PUBLIC_CHATWOOT_BRIDGE_URL is unset or the bridge
// is unreachable, every call resolves to null and the chatbot behaves exactly
// as it did before this integration.

import { ChatApiService } from './chatApiService';
import { getChatSession } from './chatAuth';
import type { ChatMessage, HandbackLine } from './chatbot.models';

const BASE = (process.env.NEXT_PUBLIC_CHATWOOT_BRIDGE_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 6000;

export type ChatMode = 'bot' | 'human';

export interface AgentMessage {
    id: number;
    text: string;
    agent: string;
    ts: number;
}

/**
 * The bridge's view of the chat. `waiting` = handed to the team (chip.ai failed) but no agent has
 * replied yet. `notice: 'team_busy'` (once) = nobody picked up in time, chip.ai is back.
 */
export interface BridgeState {
    mode: ChatMode;
    waiting?: boolean;
    agentName?: string | null;
    notice?: 'team_busy';
    dropped?: boolean;
}

export interface PollResult extends BridgeState {
    agentName: string | null;
    messages: AgentMessage[];
    /** Present once, right after the team resolves a chat they took over. */
    handback?: HandbackLine[];
}

/** What chip.ai found this turn; becomes the chat's running context in Chatwoot. */
export interface BotMeta {
    lang?: string;
    service?: { name: string } | null;
    order?: { order_number: string; status?: string } | null;
    pincode?: { pincode: string; serviceable: boolean; location?: string | null } | null;
}

/** Reasons that flag the chat for the team (none of them starts a live chat). */
export type FlagReason = 'talk_to_human' | 'asked_for_person' | 'complaint' | 'bot_suggested';

/** Trim a bot reply's cards down to what the support team needs. */
export function botMeta(lang: string, m: Pick<ChatMessage, 'service' | 'order' | 'pincode'>): BotMeta {
    return {
        lang,
        service: m.service ? { name: m.service.name } : null,
        order: m.order ? { order_number: m.order.order_number, status: m.order.status } : null,
        pincode: m.pincode ? { pincode: m.pincode.pincode, serviceable: m.pincode.serviceable, location: m.pincode.location } : null,
    };
}

/** Logged-in Pockit customers: details come from the chat login, never re-asked. */
function loggedInUser() {
    const u = getChatSession()?.user;
    return u
        ? {
              name: u.name, mobile: u.mobile, customer_id: u.customer_id,
              email: u.email, pincode: u.pincode, city: u.city, address: u.address,
          }
        : undefined;
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

    /**
     * Copy one message to Chatwoot. Resolves to the chat's current state (null if unavailable).
     * A chip.ai answer sent after a person took over comes back `dropped` (not shown in Chatwoot).
     */
    mirror(role: 'user' | 'bot', text: string, meta?: BotMeta): Promise<BridgeState | null> {
        return post<BridgeState>('/web/event', { role, text, meta });
    },

    /**
     * A FlagReason flags the chat for follow-up (with a handover summary); any other reason
     * means chip.ai failed (live takeover during support hours).
     * `quote` = the customer's words, `summary` = chip.ai's own summary when it sends one.
     */
    handoff(reason: FlagReason | string, extra?: { quote?: string; summary?: string | null }): Promise<BridgeState | null> {
        return post<BridgeState>('/web/handoff', { reason, ...extra });
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
