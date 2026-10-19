import type { Metadata } from "next";
/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import ThemeSync from "@/components/landing/ThemeSync";

export const metadata: Metadata = {
    title: "Privacy Policy — Pockit Engineers",
    description:
        "Read how Pockit Engineers collects, uses, stores, and safeguards your personal data across app, website, and support channels.",
};

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

function UL({ items }: { items: string[] }) {
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

function Divider() {
    return <hr className="my-8 border-t" style={{ borderColor: "rgb(var(--card-border))" }} />;
}

export default function PrivacyPolicyPage() {
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
                    style={{ color: "rgb(var(--accent-primary))" }}
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
                        Legal
                    </span>
                    <h1
                        className="text-3xl sm:text-4xl font-black tracking-tight mb-3"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgb(var(--text-primary))" }}
                    >
                        Privacy Policy
                    </h1>
                    <p className="text-[13px]" style={{ color: "rgb(var(--text-primary) / 0.45)" }}>
                        Pockit Technologies Private Limited (PockIT Engineers) &nbsp;·&nbsp; Last updated: 24 March 2026
                    </p>
                </div>

                <H2>1. Introduction</H2>
                <P>
                    Pockit Technologies Private Limited ("Company", "we", "our", "us") respects your privacy and is committed to
                    protecting your personal data. This Privacy Policy explains how we collect, use, disclose, store, and safeguard
                    information when you use the PockIT Engineers mobile application, website, customer support channels, and related
                    services (collectively, the "Platform").
                </P>
                <P>
                    By using our Platform, you agree to the practices described in this Privacy Policy. If you do not agree, please
                    discontinue use of the Platform.
                </P>

                <Divider />

                <H2>2. Scope</H2>
                <P>
                    This policy applies to all users, including customers, registered account holders, and visitors interacting with
                    PockIT Engineers for bookings, support, payments, and communication.
                </P>
                <P>
                    It covers personal data collected through direct inputs, automated technologies, customer interactions, and
                    integrations required to deliver Services.
                </P>

                <Divider />

                <H2>3. Information We Collect</H2>
                <UL
                    items={[
                        "Personal identity data: full name, phone number, email address.",
                        "Account data: login credentials and profile details.",
                        "Service data: address, booking type, appointment slots, technician interaction notes.",
                        "Payment data: transaction identifiers, payment status, and billing records (processed via secure payment partners).",
                        "Device and usage data: app version, device model, IP address, browser details, crash diagnostics, and analytics events.",
                        "Support data: chat transcripts, call records, complaint details, and feedback submissions.",
                    ]}
                />

                <Divider />

                <H2>4. Purpose and Legal Basis for Processing</H2>
                <P>We process your information for one or more of the following purposes:</P>
                <UL
                    items={[
                        "To create and manage your account.",
                        "To process bookings and provide requested Services.",
                        "To coordinate technicians and live service operations.",
                        "To process payments, refunds, and invoices.",
                        "To provide support and resolve complaints.",
                        "To improve reliability, security, and platform performance.",
                        "To comply with legal obligations under applicable Indian laws.",
                    ]}
                />
                <P>
                    We process data based on consent, contractual necessity, legitimate interest, and legal compliance, as applicable.
                </P>

                <Divider />

                <H2>5. Disclosure of Information</H2>
                <P>We may share limited personal data only where necessary with:</P>
                <UL
                    items={[
                        "Authorised technicians and field partners for service fulfilment.",
                        "Payment processors and banking partners for transaction handling.",
                        "Cloud, analytics, communication, and infrastructure service providers operating under confidentiality obligations.",
                        "Regulatory authorities, law enforcement, or judicial bodies when required by law.",
                    ]}
                />
                <P>We do not sell personal data to third parties.</P>

                <Divider />

                <H2>6. Data Security</H2>
                <P>
                    We maintain administrative, technical, and organizational safeguards to protect personal information against
                    unauthorized access, misuse, disclosure, alteration, and destruction.
                </P>
                <UL
                    items={[
                        "Access controls and role-based permissions.",
                        "Encrypted data transmission over secure channels.",
                        "Audit trails for critical service and support operations.",
                        "Periodic review of operational and security controls.",
                    ]}
                />
                <P>
                    While we take reasonable safeguards, no digital system can be guaranteed to be 100% secure at all times.
                </P>

                <Divider />

                <H2>7. Location Permission and Usage</H2>
                <P>
                    Location data may be requested to help detect serviceability, assign nearby technicians, and provide accurate visit
                    timelines. You may deny or disable location access through device settings; however, some location-dependent
                    features may be limited.
                </P>

                <Divider />

                <H2>8. Data Retention</H2>
                <P>
                    We retain personal data only for as long as required to provide services, maintain records, resolve disputes,
                    enforce legal terms, and meet statutory requirements.
                </P>
                <P>
                    Retention periods vary by record type (for example, invoices, complaint logs, and compliance records) and legal
                    obligations.
                </P>

                <Divider />

                <H2>9. Cookies and Tracking Technologies</H2>
                <P>
                    We use cookies and similar technologies on our web properties to improve functionality, analytics, and service
                    quality. You can manage cookie preferences through browser settings.
                </P>

                <Divider />

                <H2>10. On Our Mobile App</H2>
                <P>
                    The app may collect operational diagnostics and usage events necessary for booking flow, session reliability,
                    notifications, crash recovery, and service continuity.
                </P>

                <Divider />

                <H2>11. Third-Party Mobile SDKs</H2>
                <P>
                    We may use vetted third-party SDKs for payments, analytics, communications, and performance monitoring. Such SDKs
                    are integrated strictly for service operations and are reviewed for compliance.
                </P>

                <Divider />

                <H2>12. Changes to this Policy</H2>
                <P>
                    We may update this Privacy Policy from time to time. Material changes will be posted on this page with the revised
                    effective date. Continued use of the Platform after changes constitutes acceptance of the updated policy.
                </P>

                <Divider />

                <H2>13. Privacy around Our Website (pockitengineers.com)</H2>
                <P>
                    Website usage may involve collection of basic telemetry and interaction analytics to improve performance and user
                    experience. Sensitive personal information is not intentionally collected unless you provide it through forms or
                    account actions.
                </P>

                <Divider />

                <H2>14. Downloadable Legal Format (PDF Version)</H2>
                <P>
                    If you need a downloadable legal copy of this Privacy Policy for your records, contact us and we will provide the
                    latest approved version.
                </P>

                <Divider />

                <H2>15. Contact Information</H2>
                <div
                    className="rounded-2xl border p-6 my-4 text-[13px] space-y-1.5"
                    style={{ background: "rgb(var(--card-bg))", borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.72)" }}
                >
                    <p className="font-bold text-[14px]" style={{ color: "rgb(var(--text-primary))" }}>
                        Pockit Technologies Private Limited
                    </p>
                    <p>Email: <a href="mailto:itsupport@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>itsupport@pockitengineers.com</a></p>
                    <p>Address: Unit No. 1101, 11th Floor, Tower-1, Assotech Business Cresterra, Plot No. 22, Sector-135, Noida – 201305</p>
                </div>

                <p
                    className="text-[12px] mt-12 pt-6 border-t text-center"
                    style={{ borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.38)" }}
                >
                    © 2026 Pockit Technologies Private Limited. All rights reserved.
                    <br />
                    Pockit Engineers is an independent service provider and is not affiliated with or authorized by Apple, Lenovo, Dell, HP, Microsoft, or any other brand unless explicitly stated. All trademarks and brand names are the property of their respective owners.
                </p>
            </div>
        </main>
    );
}
