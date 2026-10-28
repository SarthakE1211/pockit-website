// ── chatbot.models.ts ─────────────────────────────────────────────────────────

export interface ChatMessage {
    type: 'user' | 'bot';
    text: string;
    time: string;
    isError?: boolean;
    isStreaming?: boolean;   // true while token-streaming is in progress
    service?: {
        id: string | number;
        name: string;
        category?: string;
        price?: string;
        duration?: string;
        mode?: string;
        warranty?: string;
    } | null;
    showHumanHandoff?: boolean;
    /** Set on replies typed by a Pockit agent in Chatwoot (live takeover). */
    agent?: string;
    order?: OrderCard | null;      // order status tracker (backend get_order_details)
    pincode?: PincodeCard | null;  // serviceability badge (backend check_service_availability)
}

export type OrderStepState = 'done' | 'current' | 'upcoming';

export interface OrderCard {
    order_number: string;
    status: string;
    state: 'active' | 'completed' | 'cancelled' | 'rejected';
    steps: { key: string; label: string; state: OrderStepState; at?: string | null }[];
    live?: string | null;          // e.g. "Technician is on the way"
    visit?: string | null;         // formatted, IST
    services?: string[];
    technician?: { name: string; phone?: string | null; rating?: number | null } | null;
    amount?: string | null;
}

export interface PincodeCard {
    pincode: string;
    serviceable: boolean;
    location?: string | null;
    territory?: string | null;
    hours?: string | null;
    express?: boolean;
}

export interface ChatHistoryItem {
    type: 'user' | 'bot';
    text: string;
}

/**
 * Follow-up chip. Backend-built (app/services/chips.py) except 'retry'.
 *   send → send `value ?? label` as the customer's message
 *   locate → "Do you serve my area?" (browser location)
 *   book → booking flow (useBookServiceNav)
 *   call → dial `value`
 *   handoff → human-support card
 *   login → open the login panel
 *   retry → resend the last customer message
 */
export interface ChatChip {
    label: string;
    action?: 'send' | 'locate' | 'book' | 'call' | 'handoff' | 'login' | 'retry';
    value?: string;
}

export interface ChatApiResponse {
    message: string;
    service?: ChatMessage['service'];
    order?: ChatMessage['order'];
    pincode?: ChatMessage['pincode'];
    followUpChips?: ChatChip[];
    showHumanHandoff?: boolean;
    /** chip.ai says it can't help and a person should (backend `handoff`, CHANGELOG #135). */
    handoff?: boolean;
    /** chip.ai's short summary of the chat for the support team (backend `handoff_summary`). */
    handoffSummary?: string | null;
}

/** One line of the agent part of a chat, handed back to chip.ai after the team resolves it. */
export interface HandbackLine {
    role: 'user' | 'agent';
    text: string;
    agent?: string;
}