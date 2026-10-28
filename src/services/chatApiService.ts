// ── chatApiService.ts ─────────────────────────────────────────────────────────
// Next.js static class — REST + WebSocket streaming
// WebSocket protocol matches backend: session → message events, token streaming

import { ChatApiResponse, ChatChip, ChatHistoryItem, ChatMessage, HandbackLine } from './chatbot.models';
import { firebaseAuthHelper } from './firebaseAuth.helper';
import { getChatAccessToken, getChatSession } from './chatAuth';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Raw events from the backend WebSocket.
 * Based on the integration guide:
 *   1. { type: "session", session_id: "..." }          — sent on connect
 *   2. { type: "message", role: "assistant", content } — greeting / full message
 *   3. { type: "token",   token: "..." }               — streaming partial
 *   4. { type: "done",    message, service?, followUpChips?, showHumanHandoff? }
 *   5. { type: "error",   message }
 */
export type WsChatEvent =
    | { type: 'session'; session_id: string }
    | {
        type: 'message'; role: string; content: string;
        // UI cards from this turn's backend lookups
        service?: ChatMessage['service']; order?: ChatMessage['order']; pincode?: ChatMessage['pincode'];
    }
    | { type: 'message_chunk'; content: string }
    | { type: 'token'; token: string }
    | { type: 'done'; message: string; service?: any; followUpChips?: string[]; showHumanHandoff?: boolean }
    | { type: 'error'; message: string };

export interface WsStreamCallbacks {
    onSession?: (sessionId: string) => void;   // called once on connect with session id
    onToken: (token: string) => void;           // streamed partial text
    onDone: (resp: ChatApiResponse) => void;    // final assembled response
    onError: (err: Error) => void;              // fatal error
    onClose?: () => void;                       // socket closed
    onOpen?: () => void;                        // socket opened
}

// Reconnection config
const WS_RECONNECT_ATTEMPTS = 3;
const WS_RECONNECT_DELAY_MS = 2000;

// ── Service ────────────────────────────────────────────────────────────────────
export class ChatApiService {
    private static readonly API_BASE =
        (process.env.NEXT_PUBLIC_API_BASE ?? '/').replace(/\/$/, '');

    private static readonly WS_BASE = (() => {
        let base = process.env.NEXT_PUBLIC_WS_BASE ?? '';

        // Only do the replacement if it's an http URL (no ws:// already)
        if (base.startsWith('http://')) {
            base = base.replace('http://', 'ws://');
        } else if (base.startsWith('https://')) {
            base = base.replace('https://', 'wss://');
        }

        // Force ws:// on localhost only
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            base = base.replace(/^wss:/, 'ws:');
        }

        return base.replace(/\/$/, '');
    })();

    private static readonly WS_ENABLED =
        process.env.NEXT_PUBLIC_WS_ENABLED === 'true';

    /** Active socket — one per page session */
    private static ws: WebSocket | null = null;

    /** Pending send queue — holds messages while socket is connecting */
    private static sendQueue: string[] = [];

    /** Reconnect attempt counter */
    private static reconnectCount = 0;

    /** Callbacks stored for reconnect */
    private static activeCallbacks: WsStreamCallbacks | null = null;
    private static activeClientId: string | null = null;

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Token for chat calls: the mobile-OTP login token when the visitor has
     * logged in, otherwise the anonymous Firebase ID token.
     */
    private static async getAuthToken(): Promise<string> {
        const loginToken = getChatAccessToken();
        if (loginToken) return loginToken;
        return firebaseAuthHelper.getIdToken();
    }

    private static async buildHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
            const token = await ChatApiService.getAuthToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            console.warn('[ChatApiService] auth token unavailable — proceeding unauthenticated', err);
        }
        return headers;
    }

    static normalizeLang(lang: string): string {
        const map: Record<string, string> = {
            english: 'en', hindi: 'hi', marathi: 'mr', tamil: 'ta', telugu: 'te',
        };
        return map[lang.toLowerCase()] ?? lang.toLowerCase();
    }

    static getClientId(): string {
        // One client id per identity: the backend binds a session to the user
        // that created it, so an anonymous session can't be reused after login.
        const loggedInUser = getChatSession()?.user.user_id;
        const KEY = loggedInUser ? `pockit_chat_client_id:${loggedInUser}` : 'pockit_chat_client_id';
        let cid = localStorage.getItem(KEY);
        if (!cid) {
            cid = typeof window.crypto?.randomUUID === 'function'
                ? window.crypto.randomUUID()
                : 'cid-' + Math.random().toString(36).slice(2, 12);
            localStorage.setItem(KEY, cid);
        }
        return cid;
    }

    /** Accept legacy string chips and backend chip objects alike. */
    private static normalizeChips(raw: unknown): ChatChip[] {
        if (!Array.isArray(raw)) return [];
        return raw
            .map((c): ChatChip | null =>
                typeof c === 'string' ? { label: c, action: 'send' }
                    : c && typeof c.label === 'string' ? { label: c.label, action: c.action ?? 'send', value: c.value }
                        : null)
            .filter((c): c is ChatChip => c !== null);
    }

    /**
     * Personal greeting right after mobile login (chatbot GET /auth/welcome):
     * text + latest active order card + chips. Null on any failure — the
     * caller falls back to a generic welcome.
     */
    static async getWelcome(lang: string): Promise<ChatApiResponse | null> {
        try {
            const res = await fetch(
                `${ChatApiService.API_BASE}/api/v1/auth/welcome?lang=${encodeURIComponent(ChatApiService.normalizeLang(lang))}`,
                { headers: await ChatApiService.buildHeaders() },
            );
            if (!res.ok) return null;
            const json = await res.json();
            return ChatApiService.shapeResponse({ ...json, message: json?.text });
        } catch {
            return null;
        }
    }

    private static shapeResponse(json: any): ChatApiResponse {
        // console.log("shapeResponse", json)
        return {
            message: json?.message ?? json?.content ?? json?.reply ?? '',
            service: json?.service ?? null,
            order: json?.order ?? null,
            pincode: json?.pincode ?? null,
            followUpChips: ChatApiService.normalizeChips(json?.followUpChips),
            showHumanHandoff: !!json?.showHumanHandoff,
            handoff: !!(json?.handoff ?? json?.handoff_requested),
            handoffSummary: typeof json?.handoff_summary === 'string' ? json.handoff_summary : null,
        };
    }

    // ── REST ───────────────────────────────────────────────────────────────────

    static async getResponse(
        message: string,
        lang: string,
        history: ChatHistoryItem[],
    ): Promise<ChatApiResponse> {
        const body = {
            message,
            lang: ChatApiService.normalizeLang(lang),
            history,
            clientId: ChatApiService.getClientId(),
        };

        const res = await fetch(`${ChatApiService.API_BASE}/api/v1/chat`, {
            method: 'POST',
            headers: await ChatApiService.buildHeaders(),
            body: JSON.stringify(body),
        });

        if (!res.ok) throw Object.assign(new Error(`Chat API error ${res.status}`), { status: res.status });
        return ChatApiService.shapeResponse(await res.json());
    }

    /**
     * getResponse with retries (CHANGELOG #135): network errors, timeouts, 429 and 5xx are
     * retried after 2 s and then 5 s, so one blip doesn't hand the chat to a person.
     * 4xx answers (bad request, auth) are not retried.
     */
    static async getResponseWithRetry(
        message: string,
        lang: string,
        history: ChatHistoryItem[],
        delaysMs: number[] = [2000, 5000],
    ): Promise<ChatApiResponse> {
        for (let attempt = 0; ; attempt++) {
            try {
                return await ChatApiService.getResponse(message, lang, history);
            } catch (err) {
                const status = (err as { status?: number })?.status;
                const retryable = status === undefined || status === 429 || status >= 500;
                if (!retryable || attempt >= delaysMs.length) throw err;
                await new Promise(r => setTimeout(r, delaysMs[attempt]));
            }
        }
    }

    /**
     * After the support team resolves a chat they took over, tell chip.ai what the agent and
     * customer said, so it continues with that in mind. Needs the backend's
     * POST /api/v1/chat/handback (see the hand-over prompt); until it exists this quietly
     * does nothing (fail-open).
     */
    static async sendHandback(lines: HandbackLine[], lang: string): Promise<void> {
        if (!lines.length) return;
        try {
            await fetch(`${ChatApiService.API_BASE}/api/v1/chat/handback`, {
                method: 'POST',
                headers: await ChatApiService.buildHeaders(),
                body: JSON.stringify({
                    clientId: ChatApiService.getClientId(),
                    lang: ChatApiService.normalizeLang(lang),
                    transcript: lines,
                }),
            });
        } catch {
            /* fail open */
        }
    }

    /**
     * "Use my location": browser coordinates → pincode, via the chatbot
     * backend (reverse geocoding; rate-limited per chat user). Throws an Error
     * whose message is safe to show the customer.
     */
    static async locatePincode(lat: number, lng: number): Promise<{ pincode: string; area?: string | null }> {
        const res = await fetch(`${ChatApiService.API_BASE}/api/v1/location/pincode`, {
            method: 'POST',
            headers: await ChatApiService.buildHeaders(),
            body: JSON.stringify({ lat, lng }),
        });
        if (!res.ok) {
            let detail = "Couldn't find your pincode. Please type it instead.";
            try {
                const body = await res.json();
                if (typeof body?.detail === 'string') detail = body.detail;
            } catch {
                /* non-JSON error */
            }
            throw new Error(detail);
        }
        return res.json();
    }

    static async getHistory(sessionId: string): Promise<ChatApiResponse[]> {
        const res = await fetch(
            `${ChatApiService.API_BASE}/api/v1/history/${sessionId}`,
            { headers: await ChatApiService.buildHeaders() },
        );
        if (!res.ok) throw new Error(`History fetch error ${res.status}`);
        return res.json();
    }

    // ── WebSocket streaming ────────────────────────────────────────────────────

    /**
     * Open a persistent WebSocket connection and stream tokens as they arrive.
     *
     * Protocol (from backend integration guide):
     *   On connect → backend sends: { type: "session", session_id: "..." }
     *                               { type: "message", role: "assistant", content: "Hello!" }
     *   On send    → backend streams: { type: "token", token: "..." } × N
     *                                 { type: "done", message, service?, followUpChips?, showHumanHandoff? }
     *   On error   → { type: "error", message }
     *
     * Usage:
     *   const cancel = await ChatApiService.connectWebSocket(clientId, {
     *     onSession: (sid) => setSessionId(sid),
     *     onToken:   (tok) => setStreamingText(prev => prev + tok),
     *     onDone:    (resp) => finaliseMessage(resp),
     *     onError:   (err)  => showError(err),
     *     onOpen:    ()    => setConnected(true),
     *     onClose:   ()    => setConnected(false),
     *   });
     *   // later: cancel();
     */
    static async connectWebSocket(
        clientId: string,
        callbacks: WsStreamCallbacks,
    ): Promise<() => void> {
        if (!ChatApiService.WS_ENABLED) {
            console.warn('[WS] WebSocket disabled (NEXT_PUBLIC_WS_ENABLED != "true")');
            return () => { };
        }

        // Store for reconnect
        ChatApiService.activeCallbacks = callbacks;
        ChatApiService.activeClientId = clientId;
        ChatApiService.reconnectCount = 0;

        await ChatApiService._openSocket(clientId, callbacks);

        // Return a cancellation function
        return () => {
            ChatApiService.reconnectCount = WS_RECONNECT_ATTEMPTS; // prevent reconnect
            ChatApiService.activeCallbacks = null;
            ChatApiService.activeClientId = null;
            ChatApiService.closeWebSocket();
        };
    }

    /** Internal: build URL, create WebSocket, wire events */
    private static async _openSocket(
        clientId: string,
        callbacks: WsStreamCallbacks,
    ): Promise<void> {
        // Close any stale socket first
        ChatApiService.closeWebSocket();

        let token = '';
        try {
            token = await ChatApiService.getAuthToken();
        } catch (err) {
            console.warn('[WS] Could not fetch auth token', err);
        }

        // Build WS URL — token passed as query param (browser WS can't set headers)
        let url = `${ChatApiService.WS_BASE}/api/v1/ws/chat/${encodeURIComponent(clientId)}`;
        if (token) {
            url += `?token=${encodeURIComponent(token)}`;
        }
        // console.log('[WS] Connecting →', url);
        const ws = new WebSocket(url);
        // console.log("ws", ws)
        ChatApiService.ws = ws;
        // console.log("ChatApiService.ws", ChatApiService.ws)

        ws.onopen = () => {
            // console.log('[WS] Connected');
            ChatApiService.reconnectCount = 0;

            callbacks.onOpen?.();

            // Send auth token after connect
            if (token) {
                ws.send(JSON.stringify({
                    type: "auth",
                    token: token
                }));
            }

            // Flush queued messages
            while (ChatApiService.sendQueue.length > 0) {
                const queued = ChatApiService.sendQueue.shift()!;
                // console.log("queued", queued)
                ws.send(queued);
            }
        };

        ws.onclose = (ev) => {
            // console.log('[WS] Closed', ev.code, ev.reason);
            callbacks.onClose?.();
            ChatApiService.ws = null;

            // ✅ Don't reconnect on auth errors (1008 = policy violation / forbidden)
            const shouldReconnect =
                ChatApiService.activeCallbacks !== null &&
                ChatApiService.activeClientId !== null &&
                ChatApiService.reconnectCount < WS_RECONNECT_ATTEMPTS &&
                ev.code !== 1000 &&  // normal closure
                ev.code !== 1008;

            if (shouldReconnect) {
                ChatApiService.reconnectCount++;
                // console.log(
                //     `[WS] Reconnecting (attempt ${ChatApiService.reconnectCount}/${WS_RECONNECT_ATTEMPTS}) in ${WS_RECONNECT_DELAY_MS}ms…`,
                // );
                setTimeout(() => {
                    if (ChatApiService.activeCallbacks && ChatApiService.activeClientId) {
                        ChatApiService._openSocket(
                            ChatApiService.activeClientId,
                            ChatApiService.activeCallbacks,
                        );
                    }
                }, WS_RECONNECT_DELAY_MS);
            }
        };

        ws.onerror = (ev) => {
            console.warn('[WS] Error', ev);
            callbacks.onError(new Error('WebSocket connection error'));
        };

        ws.onmessage = (ev: MessageEvent) => {
            let data: WsChatEvent;
            try {
                data = JSON.parse(ev.data as string);
                // console.log("data", data)
            } catch {
                callbacks.onError(new Error('Invalid WS message format'));
                return;
            }

            switch (data.type) {
                // ── Backend sends this first on connect ──────────────────────
                case 'session':
                    // console.log('[WS] Session established:', data.session_id);
                    callbacks.onSession?.(data.session_id);
                    break;

                // ── Full assistant reply ─────────────────────────────────────
                // Sent after the chunks when streaming, or alone when not.
                // The backend sends no greeting on connect (the UI renders its
                // own), so every assistant message is a real reply.
                case 'message':
                    if (data.role === 'assistant') {
                        // service / order / pincode = UI cards from the backend's tool lookups
                        callbacks.onDone(ChatApiService.shapeResponse({ ...data, message: data.content }));
                    }
                    break;

                // ── Streaming partial token ──────────────────────────────────
                // Backend sends `message_chunk`; `token` kept for older builds.
                case 'message_chunk':
                    callbacks.onToken(data.content);
                    break;
                case 'token':
                    callbacks.onToken(data.token);
                    break;

                // ── Streaming complete ───────────────────────────────────────
                case 'done':
                    callbacks.onDone(ChatApiService.shapeResponse(data));
                    break;

                // ── Server-side error ────────────────────────────────────────
                case 'error':
                    callbacks.onError(new Error(data.message ?? 'Unknown WS error'));
                    break;

                default:
                    console.warn('[WS] Unknown event type:', (data as any).type);
            }
        };
    }

    /**
     * Send a chat payload over the open socket.
     * If the socket is still CONNECTING, the message is queued and sent once open.
     * Falls back gracefully if socket is closed.
     */
    static sendWebSocketMessage(
        message: string,
        lang: string,
        history: ChatHistoryItem[],
    ): void {
        const payload = JSON.stringify({
            message,
            lang: ChatApiService.normalizeLang(lang),
            history,
            clientId: ChatApiService.getClientId(),
        });

        const ws = ChatApiService.ws;

        if (!ws) {
            console.warn('[WS] No socket — cannot send');
            return;
        }

        if (ws.readyState === WebSocket.CONNECTING) {
            // Queue until onopen fires
            // console.log('[WS] Socket still connecting — queuing message');
            ChatApiService.sendQueue.push(payload);
            return;
        }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
            return;
        }

        console.warn('[WS] Socket not open (state:', ws.readyState, ') — cannot send');
    }

    static isWebSocketOpen(): boolean {
        return ChatApiService.ws?.readyState === WebSocket.OPEN;
    }

    static isWebSocketConnecting(): boolean {
        return ChatApiService.ws?.readyState === WebSocket.CONNECTING;
    }

    static closeWebSocket(): void {
        if (ChatApiService.ws) {
            ChatApiService.ws.close(1000, 'Client closed');
            ChatApiService.ws = null;
        }
        ChatApiService.sendQueue = [];
    }
}