"use client";

// ---------------------------------------------------------------------------
// Serviceability badge for chip.ai ("✓ We serve 400093 · Mumbai East").
// Data: `pincode` on the reply frame, from the backend's
// check_service_availability tool (live PockIT territory data).
// ---------------------------------------------------------------------------

import type { PincodeCard } from "@/services/chatbot.models";

export default function PincodeBadge({ card }: { card: PincodeCard }) {
    const ok = card.serviceable;
    return (
        <div className={`cbot-pin ${ok ? "is-ok" : "is-no"}`}>
            <span className="cbot-pin-icon" aria-hidden>{ok ? "✓" : "✕"}</span>
            <div className="cbot-pin-body">
                <p className="cbot-pin-title">
                    {ok ? <>We serve <strong>{card.pincode}</strong></> : <>Not yet available in <strong>{card.pincode}</strong></>}
                </p>
                <p className="cbot-pin-sub">
                    {ok
                        ? [card.territory, card.hours && `Onsite ${card.hours}`].filter(Boolean).join(" · ")
                        : card.location || "Outside our current service areas"}
                </p>
                {ok && card.express && <span className="cbot-pin-tag">⚡ Express service available</span>}
            </div>
        </div>
    );
}
