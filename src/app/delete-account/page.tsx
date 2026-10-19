import type { Metadata } from "next";
/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import ThemeSync from "@/components/landing/ThemeSync";
import { BUSINESS, whatsappHref } from "@/constants/copy";

/**
 * Account-deletion page required by the Google Play "Data safety" form
 * (Delete account URL). Google fetches this URL and rejects it unless it
 * names the app + developer and shows the deletion steps, so keep the app
 * name, developer name and steps in sync with the Play Store listing.
 */
export const metadata: Metadata = {
    title: "Delete Your Account — Pockit Engineers",
    description:
        "How to delete your Pockit Engineers account and personal data, from the app or by email, and what data is deleted or retained.",
    alternates: { canonical: "/delete-account" },
};

const DELETION_SUBJECT = "Account deletion request";
const DELETION_BODY =
    "Hi Pockit team,\n\nPlease delete my Pockit Engineers account and associated personal data.\n\nRegistered mobile number: +91 \nName on account: \n\nThank you.";
const deletionMailto = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(DELETION_SUBJECT)}&body=${encodeURIComponent(DELETION_BODY)}`;

function H2({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xl font-bold mt-10 mb-3" style={{ color: "rgb(var(--text-primary))" }}>
            {children}
        </h2>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[14px] leading-relaxed mb-3" style={{ color: "rgb(var(--text-primary) / 0.72)" }}>
            {children}
        </p>
    );
}

function UL({ items }: { items: React.ReactNode[] }) {
    return (
        <ul className="list-disc list-inside space-y-1 mb-4 pl-2">
            {items.map((item, i) => (
                <li key={i} className="text-[14px] leading-relaxed" style={{ color: "rgb(var(--text-primary) / 0.66)" }}>
                    {item}
                </li>
            ))}
        </ul>
    );
}

function OL({ items }: { items: React.ReactNode[] }) {
    return (
        <ol className="list-decimal list-inside space-y-1.5 mb-4 pl-2">
            {items.map((item, i) => (
                <li key={i} className="text-[14px] leading-relaxed" style={{ color: "rgb(var(--text-primary) / 0.72)" }}>
                    {item}
                </li>
            ))}
        </ol>
    );
}

function Divider() {
    return <hr className="my-8 border-t" style={{ borderColor: "rgb(var(--card-border))" }} />;
}

function Strong({ children }: { children: React.ReactNode }) {
    return <strong style={{ color: "rgb(var(--text-primary))" }}>{children}</strong>;
}

const linkStyle = { color: "rgb(var(--accent-primary))" };

export default function DeleteAccountPage() {
    return (
        <main
            className="min-h-screen py-16 px-4 sm:px-6"
            style={{ background: "rgb(var(--bg-primary))" }}
        >
            <ThemeSync />
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-10 transition-colors duration-150"
                    style={linkStyle}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Back to Home
                </Link>

                <div className="mb-8">
                    <span
                        className="inline-block text-[11px] font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full border"
                        style={{
                            color: "rgb(var(--accent-primary))",
                            borderColor: "rgb(var(--accent-primary) / 0.25)",
                            background: "rgb(var(--accent-primary) / 0.06)",
                        }}
                    >
                        Your Data
                    </span>
                    <h1
                        className="text-3xl sm:text-4xl font-black tracking-tight mb-3"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgb(var(--text-primary))" }}
                    >
                        Delete Your Pockit Account
                    </h1>
                    <p className="text-[13px]" style={{ color: "rgb(var(--text-primary) / 0.45)" }}>
                        App: Pockit Engineers &nbsp;·&nbsp; Developer: {BUSINESS.legalName} &nbsp;·&nbsp; Last updated: 16 October 2026
                    </p>
                </div>

                <P>
                    You can ask us to delete your <Strong>Pockit Engineers</Strong> account and the personal data linked to it at
                    any time. This page explains how to do it, both from the app and without the app, and what happens to your
                    data afterwards.
                </P>

                <Divider />

                <H2>1. Delete your account in the app</H2>
                <OL
                    items={[
                        <>Open the <Strong>Pockit Engineers</Strong> app and log in with your registered mobile number.</>,
                        <>Tap <Strong>Menu</Strong>.</>,
                        <>Tap <Strong>Delete Account</Strong>.</>,
                        <>Confirm the deletion when prompted.</>,
                    ]}
                />
                <P>Your account is closed straight away and you are logged out of the app.</P>

                <Divider />

                <H2>2. Don't have the app? Request deletion by email</H2>
                <P>If you have uninstalled the app or can't log in, email us instead:</P>
                <OL
                    items={[
                        <>
                            Send an email to{" "}
                            <a href={deletionMailto} style={linkStyle}>
                                {BUSINESS.email}
                            </a>{" "}
                            with the subject <Strong>"{DELETION_SUBJECT}"</Strong>.
                        </>,
                        <>Include the <Strong>mobile number registered</Strong> on your Pockit account and the name on the account.</>,
                        <>To confirm the request is really from you, we may send a one-time verification code (OTP) to that mobile number.</>,
                        <>We will confirm by email once your account has been deleted.</>,
                    ]}
                />
                <P>
                    You can also message us on{" "}
                    <a href={whatsappHref("Hi Pockit, I want to delete my account.")} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                        WhatsApp
                    </a>{" "}
                    from your registered mobile number. We process email and WhatsApp requests within <Strong>30 days</Strong>.
                </P>

                <Divider />

                <H2>3. Data we delete</H2>
                <P>When your account is deleted, we permanently delete or irreversibly anonymise:</P>
                <UL
                    items={[
                        "Your profile: name, mobile number, email address and login details.",
                        "Saved addresses and location data.",
                        "Booking history linked to your identity.",
                        "Support chat transcripts, call notes and feedback linked to your account.",
                        "Device identifiers and push-notification tokens.",
                    ]}
                />

                <Divider />

                <H2>4. Data we keep, and for how long</H2>
                <P>Indian law requires us to keep some records even after your account is deleted:</P>
                <UL
                    items={[
                        <><Strong>Invoices, payment and transaction records:</Strong> kept for up to 8 years, as required by Indian tax and company law (GST and the Companies Act, 2013).</>,
                        <><Strong>Records needed for an open booking, refund, warranty claim or dispute:</Strong> kept until it is resolved, then deleted.</>,
                        <><Strong>Records we must keep to prevent fraud or comply with a legal request:</Strong> kept only as long as the law requires.</>,
                    ]}
                />
                <P>
                    These records are stored securely, are used only for these legal purposes, and are deleted when the retention
                    period ends. Anonymised, aggregated statistics that can't identify you may be kept.
                </P>

                <Divider />

                <H2>5. Before you delete</H2>
                <UL
                    items={[
                        "Deletion is permanent. Your account, booking history and saved details can't be recovered.",
                        "Please finish or cancel any upcoming bookings and wait for pending refunds first.",
                        "You can sign up again later with the same mobile number, but it will be a new, empty account.",
                    ]}
                />
                <P>
                    For more on how we handle your data, see our{" "}
                    <Link href="/privacy-policy" style={linkStyle}>
                        Privacy Policy
                    </Link>
                    .
                </P>

                <Divider />

                <H2>6. Contact</H2>
                <div
                    className="rounded-2xl border p-6 my-4 text-[13px] space-y-1.5"
                    style={{ background: "rgb(var(--card-bg))", borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.72)" }}
                >
                    <p className="font-bold text-[14px]" style={{ color: "rgb(var(--text-primary))" }}>
                        {BUSINESS.legalName}
                    </p>
                    <p>Email: <a href={deletionMailto} style={linkStyle}>{BUSINESS.email}</a></p>
                    <p>Phone: {BUSINESS.telephone}</p>
                </div>

                <p
                    className="text-[12px] mt-12 pt-6 border-t text-center"
                    style={{ borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.38)" }}
                >
                    © 2026 {BUSINESS.legalName}. All rights reserved.
                </p>
            </div>
        </main>
    );
}
