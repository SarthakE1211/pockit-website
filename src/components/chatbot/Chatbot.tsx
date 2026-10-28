"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatApiService } from "@/services/chatApiService";
import { ChatwootBridge, botMeta, type BridgeState, type ChatMode } from "@/services/chatwootBridge";
import { detectHumanRequest } from "@/services/humanRequest";
import { ChatApiResponse, ChatChip, ChatMessage } from "@/services/chatbot.models";
import { CHAT_LANGUAGES, CHAT_STRINGS, type ChatLanguage, isChatLanguage } from "./chatStrings";
import { ChatAuthSession, ChatAuthUser, getChatSession, logoutChat, onChatSessionChange } from "@/services/chatAuth";
import ChatLogin from "./ChatLogin";
import ChatMarkdown from "./ChatMarkdown";
import OrderStatusCard from "./OrderStatusCard";
import PincodeBadge from "./PincodeBadge";
import { clearTranscript, loadOpenState, loadTranscript, saveOpenState, saveTranscript } from "@/services/chatTranscript";
import { useBookServiceNav } from "@/hooks/useBookServiceNav";
import { whatsappHref } from "@/constants/copy";
import { trackWhatsAppClick } from "@/lib/metaPixel";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const getTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const LANG_STORAGE_KEY = "pockit_chat_lang";
// Live takeover (Chatwoot): last agent message already shown + whether a visitor shared contact details.
const AGENT_SEEN_KEY = "pockit_chat_agent_seen";
const CONTACT_SHARED_KEY = "pockit_chat_contact_shared";
const POLL_MS_HUMAN = 4000;
const POLL_MS_BOT = 10000;
const SUPPORT_PHONE = "+919240251266";

// Shown when a reply fails.
const ERROR_CHIPS: ChatChip[] = [
    { label: "📞 Call support", action: "call", value: SUPPORT_PHONE },
    { label: "Talk to a human", action: "handoff" },
    { label: "Try again", action: "retry" },
];

/** WhatsApp prefill for the human-handoff card — carries the order in context. */
function handoffWhatsAppText(messages: ChatMessage[]): string {
    const order = [...messages].reverse().find(m => m.order)?.order?.order_number;
    return order
        ? `Hello Pockit! I need help with my order ${order}.`
        : "Hello Pockit! I need help (from the chip.ai chat).";
}

const THEMES = {
    dark: "dark-gradient",
    light: "light-corporate"
};

// ── WebSocket enabled flag (mirrors service) ──────────────────────────────────
const WS_ENABLED = process.env.NEXT_PUBLIC_WS_ENABLED === 'true';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [inputText, setInputText] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [followUpChips, setFollowUpChips] = useState<ChatChip[]>([]);
    // Reply language (sent with every message; backend replies in it). Saved per browser.
    const [lang, setLang] = useState<ChatLanguage>("English");
    const langRef = useRef(lang);
    langRef.current = lang;
    const t = CHAT_STRINGS[lang];
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LANG_STORAGE_KEY);
            if (isChatLanguage(saved)) setLang(saved);
        } catch { /* storage blocked */ }
    }, []);
    const changeLang = (next: ChatLanguage) => {
        setLang(next);
        try { localStorage.setItem(LANG_STORAGE_KEY, next); } catch { /* ignore */ }
    };
    const [greetTime] = useState(() => getTime());
    const [expanded, setExpanded] = useState(false);
    const [theme, setTheme] = useState(THEMES.light);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    // ── WebSocket state ────────────────────────────────────────────────────────
    const [wsConnected, setWsConnected] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState<string>("");
    const isStreamingRef = useRef(false);

    // ── Mobile-OTP login ───────────────────────────────────────────────────────
    const bookService = useBookServiceNav();
    const [authUser, setAuthUser] = useState<ChatAuthUser | null>(null);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        setAuthUser(getChatSession()?.user ?? null);
        return onChatSessionChange(session => setAuthUser(session?.user ?? null));
    }, []);

    // ── Live takeover from Chatwoot (services/chatwootBridge.ts) ───────────────
    // 'bot' = chip.ai answers; 'human' = a Pockit agent is replying from Chatwoot.
    const [chatMode, setChatMode] = useState<ChatMode>("bot");
    const chatModeRef = useRef<ChatMode>("bot");
    const [contactShared, setContactShared] = useState(false);
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    useEffect(() => {
        try { setContactShared(localStorage.getItem(CONTACT_SHARED_KEY) === "1"); } catch { /* storage blocked */ }
    }, []);

    // ── Transcript persistence (survives reloads + page navigation) ────────────
    // `restored` is state, not a ref: it flips in the same render as the
    // restored messages, so the save effect can never write the initial empty
    // list over the stored transcript.
    const [restored, setRestored] = useState(false);
    useEffect(() => {
        const saved = loadTranscript();
        if (saved.length) setMessages(saved);
        if (loadOpenState()) {
            setIsOpen(true);
            setHasOpened(true);
        }
        setRestored(true);
    }, []);

    useEffect(() => {
        if (!restored || messages.some(m => m.isStreaming)) return;
        saveTranscript(messages);
    }, [messages, restored]);

    useEffect(() => {
        if (restored) saveOpenState(isOpen);
    }, [isOpen, restored]);

    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const cancelWsRef = useRef<(() => void) | null>(null);

    // ── History ref — kept in sync so sendMessage closure always has latest ───
    const messagesRef = useRef<ChatMessage[]>([]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // ── Mount / resize ─────────────────────────────────────────────────────────
    useEffect(() => {
        setMounted(true);
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // ── Theme observer ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("pockit-theme");
        const initialTheme = saved || document.documentElement.getAttribute("data-theme") || THEMES.light;
        document.documentElement.setAttribute("data-theme", initialTheme);
        setTheme(initialTheme);

        const obs = new MutationObserver(() => {
            setTheme(document.documentElement.getAttribute("data-theme") || THEMES.dark);
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        return () => obs.disconnect();
    }, []);

    // ── Auto-scroll ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (messagesAreaRef.current) {
            messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        }
    }, [messages, isLoading, followUpChips, streamingText]);

    // ── Cleanup recognition on unmount ─────────────────────────────────────────
    useEffect(() => {
        return () => { recognitionRef.current?.stop?.(); };
    }, []);

    // NOTE: The greeting is rendered as static JSX in the message area
    // (see the `<div className="cbot-bubble cbot-bot-bubble">{t.greeting}</div>`
    // row below the suggested-prompt chips). We do NOT push the greeting
    // into the `messages` state — when WS_ENABLED was false in
    // production this effect added a duplicate greeting that the static
    // JSX also rendered, so users saw the greeting twice on every chat
    // open. The static JSX is the single source of truth for the
    // greeting; `messages` only holds the real conversation.

    // Call / WhatsApp / Email card (the "Talk to a human" answer).
    const showHandoffCard = useCallback(() => {
        setFollowUpChips([]);
        setMessages(prev => [...prev, { type: "bot", text: t.handoffIntro, showHumanHandoff: true, time: getTime() }]);
    }, [t]);

    // Follow the bridge's bot ⇄ human state and tell the customer what is happening, once per step
    // (CHANGELOG #136): "connecting you…" while nobody has picked up, "<name> has joined" when an
    // agent replies, "chip.ai is back" on resolve, "our team is busy" when nobody picked up in time.
    const agentAnnouncedRef = useRef(false);
    const syncMode = useCallback((st: BridgeState) => {
        const prev = chatModeRef.current;
        const say = (text: string, extra: Partial<ChatMessage> = {}) =>
            setMessages(p => [...p, { type: "bot", text, time: getTime(), ...extra }]);
        if (st.mode === "human") {
            if (prev !== "human") {
                chatModeRef.current = "human";
                setChatMode("human");
                setFollowUpChips([]);
                agentAnnouncedRef.current = false;
                if (st.waiting) say(t.connecting);
            }
            if (!st.waiting && !agentAnnouncedRef.current) {
                agentAnnouncedRef.current = true;
                say(t.agentJoined(st.agentName || "Our team"));
            }
            return;
        }
        agentAnnouncedRef.current = false;
        if (prev === "human") {
            chatModeRef.current = "bot";
            setChatMode("bot");
            setFollowUpChips([]);
        }
        if (st.notice === "team_busy") say(t.teamBusy, { showHumanHandoff: true });
        else if (prev === "human") say(t.botBack);
    }, [t]);
    const pollNowRef = useRef<() => void>(() => {});

    // Copy chip.ai's reply to Chatwoot with what it found (service / order / pincode), and flag
    // the chat when chip.ai says a person should help (CHANGELOG #135).
    const afterBotReply = useCallback((resp: ChatApiResponse) => {
        if (!resp.message) return;
        void ChatwootBridge.mirror("bot", resp.message, botMeta(ChatApiService.normalizeLang(langRef.current), {
            service: resp.service ?? null, order: resp.order ?? null, pincode: resp.pincode ?? null,
        })).then(st => { if (st?.mode === "human") { syncMode(st); pollNowRef.current(); } });
        if (resp.handoff || resp.showHumanHandoff) {
            void ChatwootBridge.handoff("bot_suggested", { summary: resp.handoffSummary });
        }
    }, [syncMode]);

    // ── WebSocket: connect when chat opens, disconnect when it closes ──────────
    useEffect(() => {
        if (!WS_ENABLED) return;

        if (isOpen) {
            const clientId = ChatApiService.getClientId();

            ChatApiService.connectWebSocket(clientId, {
                onOpen: () => setWsConnected(true),

                onClose: () => setWsConnected(false),

                onSession: (sid) => {
                    setSessionId(sid);
                },

                onToken: (token) => {
                    if (!isStreamingRef.current) {
                        isStreamingRef.current = true;
                        setMessages(prev => [
                            ...prev,
                            {
                                type: 'bot',
                                text: '',
                                isStreaming: true,
                                time: getTime(),
                            },
                        ]);
                    }
                    setStreamingText(prev => prev + token);
                    setMessages(prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.isStreaming) {
                            updated[updated.length - 1] = {
                                ...last,
                                text: last.text + token,
                            };
                        }
                        return updated;
                    });
                },

                onDone: (resp) => {
                    isStreamingRef.current = false;
                    setStreamingText("");
                    setIsLoading(false);

                    setMessages(prev => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;

                        if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
                            updated[lastIdx] = {
                                type: 'bot',
                                text: resp.message || updated[lastIdx].text || 'Sorry, I couldn\'t get a response.',
                                service: resp.service ?? null,
                                order: resp.order ?? null,
                                pincode: resp.pincode ?? null,
                                showHumanHandoff: !!resp.showHumanHandoff,
                                isError: false,
                                isStreaming: false,
                                time: getTime(),
                            };
                            return updated;
                        }

                        return [
                            ...updated,
                            {
                                type: 'bot',
                                text: resp.message || 'Sorry, I couldn\'t get a response.',
                                service: resp.service ?? null,
                                order: resp.order ?? null,
                                pincode: resp.pincode ?? null,
                                showHumanHandoff: !!resp.showHumanHandoff,
                                isError: false,
                                isStreaming: false,
                                time: getTime(),
                            },
                        ];
                    });

                    setFollowUpChips(resp.followUpChips ?? []);
                    afterBotReply(resp);
                },

                onError: (err) => {
                    console.warn('[Chatbot] WS error:', err);
                    isStreamingRef.current = false;
                    setStreamingText("");
                    setIsLoading(false);

                    setMessages(prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.isStreaming) {
                            updated[updated.length - 1] = {
                                type: 'bot',
                                text: '',
                                isError: true,
                                isStreaming: false,
                                time: getTime(),
                            };
                            return updated;
                        }
                        return [
                            ...updated,
                            { type: 'bot', text: '', isError: true, isStreaming: false, time: getTime() },
                        ];
                    });

                    setFollowUpChips(ERROR_CHIPS);
                },
            }).then(cancel => {
                cancelWsRef.current = cancel;
            });
        } else {
            cancelWsRef.current?.();
            cancelWsRef.current = null;
            setWsConnected(false);
        }

        return () => {
            cancelWsRef.current?.();
            cancelWsRef.current = null;
        };
        // Reconnects on login/logout: the socket carries the identity's token
        // and client id, so a new identity needs a fresh connection.
    }, [isOpen, authUser?.user_id, afterBotReply]);

    // Poll the bridge for agent replies whenever the chat is open: also right after a page reload,
    // so a chat an agent is handling is picked up before the customer types (CHANGELOG #136).
    useEffect(() => {
        if (!ChatwootBridge.enabled || !isOpen) return;
        let stopped = false;
        let running = false;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            if (running) return;
            running = true;
            clearTimeout(timer);
            let seen = 0;
            try { seen = Number(localStorage.getItem(AGENT_SEEN_KEY) || 0); } catch { /* ignore */ }
            const r = await ChatwootBridge.poll(seen);
            running = false;
            if (stopped) return;
            if (r) {
                if (r.mode === "human") syncMode({ ...r, agentName: r.agentName ?? r.messages[0]?.agent });
                if (r.messages.length) {
                    setIsLoading(false);
                    setMessages(prev => [...prev, ...r.messages.map(m => ({
                        type: "bot" as const, text: m.text, agent: m.agent, time: getTime(),
                    }))]);
                    try { localStorage.setItem(AGENT_SEEN_KEY, String(r.messages[r.messages.length - 1].id)); } catch { /* ignore */ }
                }
                if (r.mode === "bot") syncMode(r);
                // The team resolved a chat they took over: tell chip.ai what was said.
                if (r.handback?.length) void ChatApiService.sendHandback(r.handback, langRef.current);
            }
            timer = setTimeout(tick, chatModeRef.current === "human" ? POLL_MS_HUMAN : POLL_MS_BOT);
        };
        pollNowRef.current = () => { void tick(); };
        tick();
        return () => { stopped = true; clearTimeout(timer); pollNowRef.current = () => {}; };
    }, [isOpen, authUser?.user_id, syncMode]);

    const submitContact = async () => {
        const name = contactName.trim();
        const phone = contactPhone.replace(/[^\d+]/g, "");
        if (!name || phone.replace(/\D/g, "").length < 10) return;
        if (await ChatwootBridge.shareContact(name, phone)) {
            setContactShared(true);
            try { localStorage.setItem(CONTACT_SHARED_KEY, "1"); } catch { /* ignore */ }
            setMessages(prev => [...prev, { type: "bot", text: t.contactThanks, time: getTime() }]);
        }
    };

    // ── Login / logout ─────────────────────────────────────────────────────────
    const handleLoginSuccess = async (session: ChatAuthSession) => {
        setShowLogin(false);
        // Personal greeting built by the backend from the latest active order
        // ("Hi Sarthak 👋 Your order … is Order Scheduled with Vijay Korate…"),
        // with that order's card + chips. Generic fallback if it's unavailable.
        setIsLoading(true);
        const welcome = await ChatApiService.getWelcome(lang);
        setIsLoading(false);
        if (welcome?.message) {
            setMessages(prev => [...prev, {
                type: "bot",
                text: welcome.message,
                order: welcome.order ?? null,
                time: getTime(),
            }]);
            setFollowUpChips(welcome.followUpChips ?? []);
            return;
        }
        const who = session.user.name ? `, ${session.user.name}` : "";
        setMessages(prev => [...prev, {
            type: "bot",
            text: session.user.is_registered
                ? `Welcome back${who}! You're logged in with ${session.user.mobile}. How can I help you today?`
                : `Thanks${who}! Your number ${session.user.mobile} is verified. We couldn't find a Pockit account for it yet, but I can still help you.`,
            time: getTime(),
        }]);
    };

    const handleLogout = async () => {
        await logoutChat();
        // The conversation may contain order details — don't leave it on a
        // shared device after log out.
        clearTranscript();
        setFollowUpChips([]);
        setMessages([{
            type: "bot",
            text: "You've been logged out, and this conversation has been cleared.",
            time: getTime(),
        }]);
    };

    // ── Reset ──────────────────────────────────────────────────────────────────
    const resetChat = () => {
        clearTranscript();
        setMessages([]);
        setInputText("");
        setFollowUpChips([]);
        setIsLoading(false);
        setIsListening(false);
        setHasOpened(false);
        setStreamingText("");
        setShowLogin(false);
        isStreamingRef.current = false;
    };

    // ── Toggle open/close ──────────────────────────────────────────────────────
    const toggleChat = () => {
        if (!isOpen) {
            setHasOpened(true);
            trackEvent(AnalyticsEvents.ChatbotOpened, {
                entry_point: "floating_button",
                transport: WS_ENABLED ? "websocket" : "rest",
            });
        }
        setIsOpen(prev => {
            const next = !prev;
            if (next) setExpanded(false);
            return next;
        });
    };

    // ── Voice recognition ──────────────────────────────────────────────────────
    // FIX: Removed speechSupported state entirely.
    // The mic button is always rendered. Support and permission errors are
    // handled at click-time with user-facing messages, which also fixes
    // the iOS Safari late-detection bug and Mac permission-denied silence.
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop?.();
            setIsListening(false);
            return;
        }

        const SR =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SR) {
            alert("Voice input isn't supported in this browser. Please try Chrome or Safari 16+.");
            return;
        }

        const recognition = new SR();
        recognition.lang = CHAT_LANGUAGES[lang].speech;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (e: any) => {
            const transcript = Array.from(e.results)
                .map((r: any) => r[0].transcript)
                .join("");
            setInputText(transcript);
        };

        recognition.onerror = (e: any) => {
            setIsListening(false);
            if (e.error === "not-allowed") {
                alert(
                    "Microphone access was denied.\n\n" +
                    "• Mac: System Settings → Privacy & Security → Microphone → enable your browser.\n" +
                    "• iPhone: Settings → Safari → Microphone → Allow."
                );
            } else if (e.error === "network") {
                alert("Voice recognition requires an internet connection.");
            }
            // "aborted" and "no-speech" fail silently — expected behaviour
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
        recognitionRef.current = recognition;
    };

    // ── Logo component ─────────────────────────────────────────────────────────
    const PELogo = ({ size = 20 }: { size?: number }) => (
        <Image
            src={theme === THEMES.dark ? "/svg/orange_chat_icon.svg" : "/svg/Blue_chat_icon.svg"}
            alt="Pockit Engineers"
            width={30}
            height={30}
            priority
        />
    );

    // ── WS connection indicator ────────────────────────────────────────────────
    const WsIndicator = () => {
        if (!WS_ENABLED) return null;
        return (
            <span
                title={wsConnected ? "Live connection active" : "Connecting…"}
                style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: wsConnected ? '#22c55e' : '#f59e0b',
                    marginLeft: 4,
                    verticalAlign: 'middle',
                    transition: 'background 0.3s',
                }}
            />
        );
    };

    // ── Send message ───────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (overrideText?: string) => {
        const text = (overrideText !== undefined ? overrideText : inputText).trim();
        if (!text || isLoading) return;

        trackEvent(AnalyticsEvents.ChatbotMessageSent, {
            source: overrideText !== undefined ? "chip" : "input",
            message_length: text.length,
            language: lang,
            transport: WS_ENABLED && ChatApiService.isWebSocketOpen() ? "websocket" : "rest",
        });

        const userMsg: ChatMessage = { type: "user", text, time: getTime() };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setFollowUpChips([]);

        // A Pockit agent is handling this chat: send to Chatwoot only, chip.ai stays silent.
        // If the bridge is unreachable the agent can't answer either, so chip.ai takes over (fail-open).
        let mirrored: Promise<BridgeState | null>;
        if (chatModeRef.current === "human") {
            const st = await ChatwootBridge.mirror("user", text);
            if (st?.mode === "human") { syncMode(st); return; }
            syncMode(st ?? { mode: "bot" });
            mirrored = Promise.resolve(st);
        } else {
            mirrored = ChatwootBridge.mirror("user", text);
        }
        // An agent may have joined since the last poll: the bridge says so in its answer to this
        // message, and then chip.ai's reply is not shown (checked again before displaying it).
        const agentJoinedMeanwhile = async () => {
            const st = await Promise.race([mirrored, new Promise<null>(r => setTimeout(() => r(null), 1500))]);
            if (st?.mode !== "human") return false;
            syncMode(st);
            pollNowRef.current();
            return true;
        };

        // Typed "I want to talk to a person" → same as the "Talk to a human" chip (card + flag,
        // no chip.ai call). A complaint is flagged for the team and chip.ai still answers.
        const asked = detectHumanRequest(text);
        if (asked === "person") {
            showHandoffCard();
            void ChatwootBridge.handoff("asked_for_person", { quote: text });
            return;
        }
        if (asked === "complaint") void ChatwootBridge.handoff("complaint", { quote: text });
        setIsLoading(true);

        const history = [...messagesRef.current, userMsg]
            .slice(-6)
            .map(m => ({ type: m.type, text: m.text }));

        // ── WebSocket path ─────────────────────────────────────────────────────
        if (WS_ENABLED && ChatApiService.isWebSocketOpen()) {
            ChatApiService.sendWebSocketMessage(text, lang, history);
            return;
        }

        // ── REST fallback ──────────────────────────────────────────────────────
        try {
            const parsed = await ChatApiService.getResponseWithRetry(text, lang, history);
            if (await agentJoinedMeanwhile()) return;
            setMessages(prev => [...prev, {
                type: "bot",
                text: parsed.message || "Sorry, I couldn't get a response.",
                service: parsed.service ?? null,
                order: parsed.order ?? null,
                pincode: parsed.pincode ?? null,
                showHumanHandoff: !!parsed.showHumanHandoff,
                isError: false,
                time: getTime(),
            }]);
            setFollowUpChips(parsed.followUpChips ?? []);
            afterBotReply(parsed);
        } catch (err) {
            // chip.ai failed even after retries: during support hours the bridge hands the chat to an agent.
            if (await agentJoinedMeanwhile()) return;
            const st = await ChatwootBridge.handoff(`chip.ai error: ${err instanceof Error ? err.message : "unknown"}`);
            if (st?.mode === "human") {
                syncMode(st);
            } else {
                setMessages(prev => [...prev, { type: "bot", text: "", isError: true, time: getTime() }]);
                setFollowUpChips(ERROR_CHIPS);
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputText, lang, isLoading, syncMode, afterBotReply, showHandoffCard]);

    // ── "Do you serve my area?" — browser location → pincode → ask the bot ────
    // The bot's check_service_availability tool answers and returns the
    // pincode badge, so this path renders exactly like a typed pincode question.
    const [locating, setLocating] = useState(false);
    const botNote = (text: string) =>
        setMessages(prev => [...prev, { type: "bot", text, time: getTime() }]);

    const checkMyArea = () => {
        if (locating) return;
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            botNote("Your browser can't share location. Please type your 6-digit pincode and I'll check.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async pos => {
                try {
                    const { pincode, area } = await ChatApiService.locatePincode(pos.coords.latitude, pos.coords.longitude);
                    sendMessage(`Do you provide service at my location, pincode ${pincode}${area ? ` (${area})` : ""}?`);
                } catch (err) {
                    botNote(err instanceof Error ? err.message : "Couldn't find your pincode. Please type it instead.");
                } finally {
                    setLocating(false);
                }
            },
            err => {
                setLocating(false);
                botNote(
                    err.code === err.PERMISSION_DENIED
                        ? "No problem — location access is off. Just type your 6-digit pincode and I'll check."
                        : "I couldn't get your location. Please type your 6-digit pincode instead.",
                );
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
        );
    };

    const accent = theme === THEMES.dark ? "#ea580c" : "#3b3fa8";

    // Starter chips: order-first for logged-in Pockit customers.
    const starterChips: ChatChip[] = authUser?.customer_id != null
        ? t.customerStarters
        : t.starters.map(label => ({ label }));

    // ── Chip actions (backend chips.py + local ones) ────────────────────────────
    const runChip = (chip: ChatChip) => {
        switch (chip.action) {
            case "locate":
                checkMyArea();
                return;
            case "book":
                bookService();
                return;
            case "call":
                if (chip.value) window.location.href = `tel:${chip.value.replace(/[^d+]/g, "")}`;
                return;
            case "login":
                setShowLogin(true);
                return;
            case "handoff":
                showHandoffCard();
                // Not a live chat (agreed 2026-10-27): flags the chat in Chatwoot for follow-up.
                void ChatwootBridge.handoff("talk_to_human");
                return;
            case "retry": {
                const lastUser = [...messagesRef.current].reverse().find(m => m.type === "user");
                if (lastUser) sendMessage(lastUser.text);
                return;
            }
            default:
                sendMessage(chip.value ?? chip.label);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`cbot-wrap ${isOpen ? "is-open" : ""}`}>

            {isOpen && (
                <div className="cbot-window">

                    {/* ── Header ── */}
                    <div
                        className="cbot-header"
                        style={{ background: theme === THEMES.dark ? "#ea580c" : "#3b3fa8" }}
                    >
                        <div className="cbot-header-left">
                            <div className="cbot-av-outer">
                                <Image
                                    src={theme === THEMES.dark ? "/svg/orange_chat_icon.svg" : "/svg/Blue_chat_icon.svg"}
                                    alt="Pockit Engineers"
                                    width={600}
                                    height={168}
                                    className="w-full h-auto"
                                    priority
                                />
                                <span className="cbot-online" />
                            </div>
                            <div>
                                <p className="cbot-name">chip.ai</p>
                                <p className="cbot-sub">
                                    {authUser
                                        ? `Logged in as ${authUser.name || authUser.mobile}`
                                        : "Your Personal Tech Assistant"}
                                </p>
                            </div>
                        </div>
                        <div className="flex flexdirection-row gap-3">
                            {authUser ? (
                                <button className="cbot-close-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    className="cbot-login-btn"
                                    onClick={() => setShowLogin(v => !v)}
                                    aria-label="Log in with mobile number"
                                    aria-expanded={showLogin}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                    </svg>
                                    Login
                                </button>
                            )}
                            <button className="cbot-close-btn" onClick={resetChat} aria-label="Reset">
                                <svg width="12" height="12" viewBox="0 0 22 22" fill="none">
                                    <path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    <polyline points="21 3 21 9 15 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button className="cbot-close-btn" onClick={toggleChat} aria-label="Close">
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ── Login panel (replaces messages + input while open) ── */}
                    {showLogin ? (
                        <ChatLogin
                            accent={theme === THEMES.dark ? "#ea580c" : "#3b3fa8"}
                            onSuccess={handleLoginSuccess}
                            onCancel={() => setShowLogin(false)}
                        />
                    ) : (<>
                    {/* ── Messages ── */}
                    <div className="cbot-messages" ref={messagesAreaRef}>

                        {/* ── Initial chips ── */}
                        <div className="cbot-chips-grid">
                            {starterChips.map(chip => (
                                <button key={chip.label} className="cbot-chip" type="button" onClick={() => runChip(chip)}>
                                    {chip.label}
                                </button>
                            ))}
                            <button
                                className="cbot-chip cbot-chip-locate"
                                type="button"
                                onClick={checkMyArea}
                                disabled={locating || isLoading}
                            >
                                {locating ? t.locating : t.locate}
                            </button>
                        </div>
                        <hr className="cbot-divider" />
                        <div className="cbot-row">
                            <div className="cbot-msg-av"><PELogo size={15} /></div>
                            <div className="cbot-body">
                                <div className="cbot-bubble cbot-bot-bubble">{t.greeting}</div>
                                <span className="cbot-time">{greetTime}</span>
                            </div>
                        </div>

                        {messages.map((msg, i) => (
                            <div key={i} className={`cbot-row ${msg.type === "user" ? "cbot-user-row" : ""}`}>
                                {msg.type === "bot" && (
                                    <div className="cbot-msg-av"><PELogo size={15} /></div>
                                )}
                                <div className="cbot-body">
                                    {msg.isError ? (
                                        <div className="cbot-error">
                                            <p className="cbot-err-title">⚠️ Something went wrong</p>
                                            <p className="cbot-err-sub">Our AI is temporarily unavailable.</p>
                                            <div className="cbot-err-actions">
                                                <a href="tel:+919240251266" className="cbot-err-call">📞 +91 92402 51266</a>
                                                <a href="mailto:itsupport@pockitengineers.com" className="cbot-err-email">✉ Email</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={`cbot-bubble ${msg.type === "user" ? "cbot-user-bubble" : "cbot-bot-bubble"}`}
                                            style={{
                                                background:
                                                    msg.type === "user"
                                                        ? theme === THEMES.dark ? "#ea580c" : "#3b3fa8"
                                                        : "#f3f4f6",
                                            }}
                                        >
                                            {msg.agent && <span className="cbot-agent-label">👤 {msg.agent} · Pockit team</span>}
                                            {msg.type === "bot" ? <ChatMarkdown text={msg.text} /> : msg.text}
                                            {msg.isStreaming && (
                                                <span
                                                    aria-hidden
                                                    style={{
                                                        display: 'inline-block',
                                                        width: 2,
                                                        height: '1em',
                                                        background: '#6b7280',
                                                        marginLeft: 2,
                                                        verticalAlign: 'middle',
                                                        animation: 'cbot-blink 0.8s step-start infinite',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Service card */}
                                    {msg.type === "bot" && !msg.isError && msg.service && (
                                        <div className="cbot-service-card">
                                            <div className="cbot-sc-head">
                                                <span>{msg.service.name}</span>
                                                {msg.service.category && <span>{msg.service.category}</span>}
                                            </div>
                                            <div className="cbot-sc-body">
                                                {msg.service.price && <span className="cbot-sc-price">{msg.service.price}</span>}
                                                {msg.service.duration && <span className="cbot-tag cbot-tag-blue">⏱ {msg.service.duration}</span>}
                                                {msg.service.mode && <span className={`cbot-tag ${msg.service.mode.includes("Remote") ? "cbot-tag-blue" : "cbot-tag-orange"}`}>{msg.service.mode}</span>}
                                                {msg.service.warranty && <span className="cbot-tag cbot-tag-green">✓ {msg.service.warranty}</span>}
                                            </div>
                                            <div className="cbot-sc-foot">
                                                {/* Same destination as the header "Book a Service" (app store on
                                                    phones, #download on desktop) — there is no /book route. */}
                                                <button type="button" className="cbot-book-btn" onClick={bookService}>Book Now →</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order status tracker / pincode badge (backend lookups) */}
                                    {msg.type === "bot" && !msg.isError && msg.order && (
                                        <OrderStatusCard order={msg.order} accent={accent} />
                                    )}
                                    {msg.type === "bot" && !msg.isError && msg.pincode && (
                                        <PincodeBadge card={msg.pincode} />
                                    )}

                                    {/* Human handoff */}
                                    {msg.type === "bot" && !msg.isError && msg.showHumanHandoff && (
                                        <div className="cbot-handoff">
                                            <div>
                                                <p className="cbot-ho-title">Need a human? We are here!</p>
                                                <p className="cbot-ho-hours">Mon–Sun · 10 AM–7 PM</p>
                                            </div>
                                            <div className="cbot-ho-btns">
                                                <a href="tel:+919240251266" className="cbot-ho-call">📞 Call</a>
                                                <a
                                                    href={whatsappHref(handoffWhatsAppText(messages))}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="cbot-ho-wa"
                                                    onClick={() => trackWhatsAppClick("chatbot")}
                                                >
                                                    WhatsApp
                                                </a>
                                                <a href="mailto:itsupport@pockitengineers.com" className="cbot-ho-email">✉ Email</a>
                                            </div>
                                        </div>
                                    )}

                                    <span className={`cbot-time ${msg.type === "user" ? "cbot-time-r" : ""}`}>{msg.time}</span>
                                </div>

                                {msg.type === "user" && (
                                    <div
                                        className="cbot-msg-av cbot-user-av"
                                        style={{
                                            background: theme === THEMES.dark ? "#ea580c" : "#3b3fa8",
                                            color: "white",
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && !isStreamingRef.current && (
                            <div className="cbot-row">
                                <div className="cbot-msg-av"><PELogo size={15} /></div>
                                <div className="cbot-body">
                                    <div className="cbot-bubble cbot-bot-bubble">
                                        <div className="cbot-typing"><span /><span /><span /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Follow-up chips */}
                        {!isLoading && followUpChips.length > 0 && (
                            <div className="cbot-followup">
                                {followUpChips.map(chip => (
                                    <button
                                        key={chip.label}
                                        className={`cbot-chip cbot-chip-sm ${chip.action && chip.action !== "send" ? "cbot-chip-action" : ""}`}
                                        type="button"
                                        onClick={() => runChip(chip)}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Contact details when an agent takes over (visitors who aren't logged in) ── */}
                    {ChatwootBridge.enabled && chatMode === "human" && !authUser && !contactShared && (
                        <form
                            className="cbot-contact"
                            onSubmit={e => { e.preventDefault(); void submitContact(); }}
                        >
                            <p className="cbot-contact-title">{t.contactPrompt}</p>
                            <div className="cbot-contact-row">
                                <input
                                    className="cbot-contact-input"
                                    value={contactName}
                                    onChange={e => setContactName(e.target.value)}
                                    placeholder={t.contactName}
                                    autoComplete="name"
                                    maxLength={80}
                                />
                                <input
                                    className="cbot-contact-input"
                                    value={contactPhone}
                                    onChange={e => setContactPhone(e.target.value)}
                                    placeholder={t.contactPhone}
                                    autoComplete="tel"
                                    inputMode="tel"
                                    maxLength={16}
                                />
                                <button type="submit" className="cbot-contact-send" style={{ background: accent }}>
                                    {t.contactSend}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── Input ── */}
                    <div className="cbot-input-area">
                        {isListening && (
                            <div className="cbot-listening">
                                <span className="cbot-l-dot" /> Listening...
                            </div>
                        )}
                        <div className="cbot-input-row">
                            <input
                                className="cbot-input"
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !isLoading && sendMessage()}
                                placeholder={isListening ? "Listening..." : t.placeholder}
                                disabled={isLoading}
                            />
                            <div className="cbot-input-btns">
                                {/* FIX: mic button is always rendered — no speechSupported gate.
                                    Support check + permission errors are handled inside toggleListening. */}
                                <button
                                    className={`cbot-icon-btn cbot-mic ${isListening ? "active" : ""}`}
                                    type="button"
                                    onClick={toggleListening}
                                    disabled={isLoading}
                                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                                >
                                    {isListening
                                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 10a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-1.062A8 8 0 0 1 4 12a1 1 0 1 1 2 0 6 6 0 1 0 12 0 1 1 0 0 1 1-1z" /></svg>
                                    }
                                </button>
                                <button
                                    className="cbot-icon-btn cbot-send"
                                    type="button"
                                    onClick={() => sendMessage()}
                                    disabled={isLoading || !inputText.trim()}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    </>)}

                    {/* ── Footer ── */}
                    <div className="cbot-footer">
                        <Image
                            src={theme === THEMES.dark ? "/svg/orange_chat_icon.svg" : "/svg/Blue_chat_icon.svg"}
                            alt="Pockit Engineers"
                            width={30}
                            height={30}
                            priority
                        />
                        <span className="cbot-footer-txt">chip.ai by Pockit · Powered by AI</span>
                        <label className="cbot-lang">
                            <span aria-hidden>🌐</span>
                            <select
                                value={lang}
                                onChange={e => isChatLanguage(e.target.value) && changeLang(e.target.value)}
                                aria-label="Reply language"
                            >
                                {(Object.keys(CHAT_LANGUAGES) as ChatLanguage[]).map(code => (
                                    <option key={code} value={code}>{CHAT_LANGUAGES[code].label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
            )}

            {/* ── FAB ── */}
            {!isOpen && mounted && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    onMouseEnter={() => setExpanded(true)}
                    onMouseLeave={() => setExpanded(false)}
                    className="fixed bottom-20 right-6 z-50"
                >
                    <button
                        onClick={toggleChat}
                        className="flex items-center gap-0 text-white font-semibold shadow-2xl transition-all duration-300"
                        style={{
                            padding: isMobile ? "0px 0px" : expanded ? "0px 8px" : "0px 1px",
                            borderRadius: 9999,
                            background: theme === THEMES.dark
                                ? "linear-gradient(135deg, #ed793a, #ea580c)"
                                : "linear-gradient(135deg, #0d129c, #3b3fa8)",
                            boxShadow: theme === THEMES.dark
                                ? "0 8px 32px rgba(237, 121, 58, 0.45), 0 0 0 4px rgba(237, 121, 58, 0.08)"
                                : "0 8px 32px rgba(13, 18, 156, 0.45), 0 0 0 4px rgba(13, 18, 156, 0.08)"
                        }}
                    >
                        <Image
                            src={theme === THEMES.dark ? "/svg/orange_chat_icon.svg" : "/svg/Blue_chat_icon.svg"}
                            alt="chip.ai"
                            width={48}
                            height={48}
                            className="object-contain"
                        />
                        <AnimatePresence mode="wait">
                            {(expanded && !isMobile) && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-[14px] whitespace-nowrap overflow-hidden"
                                >
                                    Chat with chip.ai
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </motion.div>
            )}

            {/* ── Global keyframe for streaming cursor ── */}
            <style>{`
                @keyframes cbot-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}