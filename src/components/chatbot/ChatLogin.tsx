"use client";

// ---------------------------------------------------------------------------
// In-widget mobile-number login for chip.ai.
//
// Step 1: mobile → "Send OTP" (OTP arrives on WhatsApp)
// Step 2: 4-digit OTP → "Verify & continue"
// No account for the number → "notfound": register in the Pockit app (store
// links). The backend checks this BEFORE sending an OTP, so none is wasted.
//
// All network calls go through `@/services/chatAuth`; this component only
// owns the form state. Rendered by Chatbot.tsx in place of the message list.
// No name field: the chatbot backend reads the customer's name from their
// Pockit profile at login (removed from the form 2026-10-15, CHANGELOG #131).
// ---------------------------------------------------------------------------

import { FormEvent, useEffect, useRef, useState } from "react";
import { ACCOUNT_NOT_FOUND, ChatAuthError, ChatAuthSession, sendOtp, verifyOtp } from "@/services/chatAuth";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/constants/appStores";

interface ChatLoginProps {
    accent: string;
    onSuccess: (session: ChatAuthSession) => void;
    onCancel: () => void;
}

const MOBILE_RE = /^[6-9]\d{9}$/;

const isAccountNotFound = (err: unknown) => err instanceof ChatAuthError && err.code === ACCOUNT_NOT_FOUND;

export default function ChatLogin({ accent, onSuccess, onCancel }: ChatLoginProps) {
    const [step, setStep] = useState<"details" | "otp" | "notfound">("details");
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [resendIn, setResendIn] = useState(0);
    const otpRef = useRef<HTMLInputElement>(null);

    // Resend countdown
    useEffect(() => {
        if (resendIn <= 0) return;
        const id = window.setTimeout(() => setResendIn(s => s - 1), 1000);
        return () => window.clearTimeout(id);
    }, [resendIn]);

    useEffect(() => {
        if (step === "otp") otpRef.current?.focus();
    }, [step]);

    const requestOtp = async () => {
        setError("");
        if (!MOBILE_RE.test(mobile)) return setError("Enter a valid 10-digit mobile number.");

        setBusy(true);
        try {
            const res = await sendOtp(mobile);
            setStep("otp");
            setOtp("");
            setResendIn(res.resend_after_seconds);
        } catch (err) {
            if (isAccountNotFound(err)) return setStep("notfound");
            setError(err instanceof Error ? err.message : "Could not send OTP.");
        } finally {
            setBusy(false);
        }
    };

    const submitDetails = (e: FormEvent) => {
        e.preventDefault();
        if (!busy) requestOtp();
    };

    const submitOtp = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError("");
        if (!/^\d{4,6}$/.test(otp)) return setError("Enter the OTP sent to your WhatsApp.");

        setBusy(true);
        try {
            const session = await verifyOtp(mobile, otp);
            onSuccess(session);
        } catch (err) {
            if (isAccountNotFound(err)) return setStep("notfound");
            setError(err instanceof Error ? err.message : "Could not verify OTP.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="cbot-login" style={{ ["--cbot-accent" as string]: accent }}>
            <div className="cbot-login-card">
                <p className="cbot-login-title">
                    {step === "details" ? "Log in to chip.ai" : step === "otp" ? "Enter OTP" : "Account not found"}
                </p>
                <p className="cbot-login-sub">
                    {step === "details" && "Use the mobile number linked to your Pockit account."}
                    {step === "otp" && <>We sent a code on WhatsApp to <strong>+91 {mobile}</strong></>}
                    {step === "notfound" && (
                        <>No Pockit account is linked to <strong>+91 {mobile}</strong>. Download the Pockit app to register, then log in here.</>
                    )}
                </p>

                {step === "notfound" ? (
                    <div className="cbot-login-form">
                        <div className="cbot-login-stores">
                            <a className="cbot-login-store" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                                <span className="cbot-login-store-sub">Get it on</span>Google Play
                            </a>
                            <a className="cbot-login-store" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                                <span className="cbot-login-store-sub">Download on the</span>App Store
                            </a>
                        </div>
                        <button
                            type="button"
                            className="cbot-login-link cbot-login-retry"
                            onClick={() => { setStep("details"); setMobile(""); setError(""); }}
                        >
                            Try another number
                        </button>
                    </div>
                ) : step === "details" ? (
                    <form onSubmit={submitDetails} className="cbot-login-form" noValidate>
                        <label className="cbot-login-label" htmlFor="cbot-login-mobile">Mobile number</label>
                        <div className="cbot-login-phone">
                            <span className="cbot-login-cc">+91</span>
                            <input
                                id="cbot-login-mobile"
                                className="cbot-login-input"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                maxLength={10}
                                value={mobile}
                                onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile"
                                disabled={busy}
                                autoFocus
                            />
                        </div>

                        {error && <p className="cbot-login-error" role="alert">{error}</p>}

                        <button className="cbot-login-primary" type="submit" disabled={busy}>
                            {busy ? "Sending…" : "Send OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={submitOtp} className="cbot-login-form" noValidate>
                        <label className="cbot-login-label" htmlFor="cbot-login-otp">OTP</label>
                        <input
                            id="cbot-login-otp"
                            ref={otpRef}
                            className="cbot-login-input cbot-login-otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="••••"
                            disabled={busy}
                        />

                        {error && <p className="cbot-login-error" role="alert">{error}</p>}

                        <button className="cbot-login-primary" type="submit" disabled={busy}>
                            {busy ? "Verifying…" : "Verify & continue"}
                        </button>

                        <div className="cbot-login-links">
                            <button
                                type="button"
                                className="cbot-login-link"
                                onClick={() => { setStep("details"); setError(""); }}
                                disabled={busy}
                            >
                                Change number
                            </button>
                            <button
                                type="button"
                                className="cbot-login-link"
                                onClick={requestOtp}
                                disabled={busy || resendIn > 0}
                            >
                                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                            </button>
                        </div>
                    </form>
                )}

                <button type="button" className="cbot-login-cancel" onClick={onCancel} disabled={busy}>
                    Continue without login
                </button>
            </div>
        </div>
    );
}
