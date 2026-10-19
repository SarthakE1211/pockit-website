// ---------------------------------------------------------------------------
// chip.ai widget copy per reply language. The bot's replies are translated by
// the backend (language prompt); these are the widget's own fixed strings.
// Keys of CHAT_LANGUAGES are what the widget sends as `lang` (normalised to
// en / hi / mr by ChatApiService).
// ---------------------------------------------------------------------------

import type { ChatChip } from "@/services/chatbot.models";

export const CHAT_LANGUAGES = {
    English: { label: "English", speech: "en-IN" },
    Hindi: { label: "हिंदी", speech: "hi-IN" },
    Marathi: { label: "मराठी", speech: "mr-IN" },
} as const;

export type ChatLanguage = keyof typeof CHAT_LANGUAGES;

interface WidgetStrings {
    greeting: string;
    placeholder: string;
    locate: string;
    locating: string;
    handoffIntro: string;
    /** Starter chips for anonymous visitors. */
    starters: string[];
    /** Starter chips for logged-in Pockit customers (order-first). */
    customerStarters: ChatChip[];
}

export const CHAT_STRINGS: Record<ChatLanguage, WidgetStrings> = {
    English: {
        greeting: "Hello! How can I assist you with your tech issue or service inquiry today?",
        placeholder: "Describe your issue...",
        locate: "📍 Do you serve my area?",
        locating: "Finding your pincode…",
        handoffIntro: "Here's how to reach our support team:",
        starters: ["My laptop is slow", "Printer not working", "WiFi is weak", "Book a service", "What areas do you cover?"],
        customerStarters: [
            { label: "📦 Track my latest order", value: "What is the status of my latest order?" },
            { label: "👨‍🔧 Who is my technician?", value: "Who is the technician for my latest order and when is the visit?" },
            { label: "🧾 Show my orders", value: "Show my recent orders" },
            { label: "My laptop is slow" },
        ],
    },
    Hindi: {
        greeting: "नमस्ते! आज मैं आपकी किस टेक समस्या या सेवा में मदद कर सकता हूँ?",
        placeholder: "अपनी समस्या लिखें...",
        locate: "📍 क्या आप मेरे इलाके में सेवा देते हैं?",
        locating: "आपका पिनकोड ढूँढ रहे हैं…",
        handoffIntro: "हमारी सपोर्ट टीम से ऐसे संपर्क करें:",
        starters: ["मेरा लैपटॉप धीमा है", "प्रिंटर काम नहीं कर रहा", "WiFi कमज़ोर है", "सेवा बुक करें", "आप किन इलाकों में सेवा देते हैं?"],
        customerStarters: [
            { label: "📦 मेरा ताज़ा ऑर्डर ट्रैक करें", value: "मेरे सबसे नए ऑर्डर का स्टेटस क्या है?" },
            { label: "👨‍🔧 मेरा टेक्नीशियन कौन है?", value: "मेरे सबसे नए ऑर्डर का टेक्नीशियन कौन है और विज़िट कब है?" },
            { label: "🧾 मेरे ऑर्डर दिखाएँ", value: "मेरे हाल के ऑर्डर दिखाएँ" },
            { label: "मेरा लैपटॉप धीमा है" },
        ],
    },
    Marathi: {
        greeting: "नमस्कार! आज तुमच्या कोणत्या टेक समस्येत किंवा सेवेत मी मदत करू?",
        placeholder: "तुमची समस्या लिहा...",
        locate: "📍 तुम्ही माझ्या भागात सेवा देता का?",
        locating: "तुमचा पिनकोड शोधत आहोत…",
        handoffIntro: "आमच्या सपोर्ट टीमशी असा संपर्क करा:",
        starters: ["माझा लॅपटॉप स्लो आहे", "प्रिंटर चालत नाही", "WiFi कमकुवत आहे", "सेवा बुक करा", "तुम्ही कोणत्या भागात सेवा देता?"],
        customerStarters: [
            { label: "📦 माझा नवीन ऑर्डर ट्रॅक करा", value: "माझ्या सर्वात नवीन ऑर्डरचे स्टेटस काय आहे?" },
            { label: "👨‍🔧 माझा टेक्निशियन कोण आहे?", value: "माझ्या सर्वात नवीन ऑर्डरचा टेक्निशियन कोण आहे आणि भेट कधी आहे?" },
            { label: "🧾 माझे ऑर्डर दाखवा", value: "माझे अलीकडचे ऑर्डर दाखवा" },
            { label: "माझा लॅपटॉप स्लो आहे" },
        ],
    },
};

export function isChatLanguage(value: unknown): value is ChatLanguage {
    return typeof value === "string" && value in CHAT_LANGUAGES;
}
