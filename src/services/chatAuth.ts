// ── chatAuth.ts ───────────────────────────────────────────────────────────────
// Mobile-number (OTP) login for the chip.ai chatbot.
//
// The chatbot backend proxies the OTP to the PockIT customer backend and, on
// success, returns its own short-lived access token. That token is used in
// place of the anonymous Firebase ID token for every chat call (REST header
// + WebSocket `?token=`), so the conversation is tied to the PockIT customer.
//
// Contract: AUTH_MOBILE_OTP.md in the chatbot backend repo.

const STORAGE_KEY = 'pockit_chat_auth';

/** Refresh margin — treat a token as expired a minute early. */
const EXPIRY_SKEW_MS = 60_000;

export interface ChatAuthUser {
    user_id: string;
    mobile: string;
    customer_id: number | null;
    name: string | null;
    is_registered: boolean;
}

export interface ChatAuthSession {
    accessToken: string;
    expiresAt: number; // epoch ms
    user: ChatAuthUser;
}

export interface OtpSendResult {
    mobile: string;
    is_registered: boolean;
    resend_after_seconds: number;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '/').replace(/\/$/, '');

/** Pull FastAPI's `{ detail }` (string or validation list) into one readable line. */
/** Backend error code for "no Pockit account for this mobile number". */
export const ACCOUNT_NOT_FOUND = 'account_not_found';

/** Login error with an optional machine-readable `code` (e.g. ACCOUNT_NOT_FOUND). */
export class ChatAuthError extends Error {
    constructor(message: string, readonly code?: string) {
        super(message);
        this.name = 'ChatAuthError';
    }
}

/** Turn FastAPI's `{ detail }` (string, `{code, message}`, or validation list) into a ChatAuthError. */
async function readError(res: Response): Promise<ChatAuthError> {
    try {
        const body = await res.json();
        const detail = body?.detail;
        if (typeof detail === 'string') return new ChatAuthError(detail);
        if (detail && typeof detail.message === 'string') return new ChatAuthError(detail.message, detail.code);
        if (Array.isArray(detail) && detail[0]?.msg) return new ChatAuthError(String(detail[0].msg));
    } catch {
        /* non-JSON error body */
    }
    if (res.status === 429) return new ChatAuthError('Too many attempts. Please wait and try again.');
    return new ChatAuthError('Something went wrong. Please try again.');
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw await readError(res);
    return res.json() as Promise<T>;
}

// ── Session storage ───────────────────────────────────────────────────────────

// In-memory copy so login still works for this page view when localStorage is blocked.
let memorySession: ChatAuthSession | null = null;

type Listener = (session: ChatAuthSession | null) => void;
const listeners = new Set<Listener>();

function emit(session: ChatAuthSession | null) {
    listeners.forEach(l => l(session));
}

export function getChatSession(): ChatAuthSession | null {
    if (typeof window === 'undefined') return null;
    let session = memorySession;
    if (!session) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            session = raw ? (JSON.parse(raw) as ChatAuthSession) : null;
        } catch {
            session = null;
        }
    }
    if (!session?.accessToken || Date.now() > session.expiresAt - EXPIRY_SKEW_MS) {
        clearStoredSession();
        return null;
    }
    memorySession = session;
    return session;
}

/** Access token for chat calls, or '' when the visitor isn't logged in. */
function clearStoredSession() {
    memorySession = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

export function getChatAccessToken(): string {
    return getChatSession()?.accessToken ?? '';
}

export function onChatSessionChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// ── API ───────────────────────────────────────────────────────────────────────

export function sendOtp(mobile: string, countryCode = '+91'): Promise<OtpSendResult> {
    return postJson<OtpSendResult>('/api/v1/auth/otp/send', { mobile, country_code: countryCode });
}

export async function verifyOtp(
    mobile: string,
    otp: string,
    countryCode = '+91',
): Promise<ChatAuthSession> {
    const res = await postJson<{ access_token: string; expires_in: number; user: ChatAuthUser }>(
        '/api/v1/auth/otp/verify',
        { mobile, otp, country_code: countryCode }, // name comes from the Pockit profile, server-side
    );
    const session: ChatAuthSession = {
        accessToken: res.access_token,
        expiresAt: Date.now() + res.expires_in * 1000,
        user: res.user,
    };
    memorySession = session;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        /* storage blocked — memorySession keeps it for this page view */
    }
    emit(session);
    return session;
}

export async function logoutChat(): Promise<void> {
    const token = getChatAccessToken();
    clearStoredSession();
    emit(null);
    if (token) {
        // Best effort — clears the server-held PockIT token; the local token is already gone.
        postJson('/api/v1/auth/logout', {}, token).catch(() => undefined);
    }
}
