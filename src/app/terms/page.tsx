import type { Metadata } from "next";
/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import ThemeSync from "@/components/landing/ThemeSync";

export const metadata: Metadata = {
    title: "Terms & Conditions — Pockit Engineers",
    description:
        "Read the Terms and Conditions governing use of the Pockit Engineers platform and services. Operated by Pockit Technologies Private Limited.",
};

// ─── Section & clause helpers ─────────────────────────────────────────────────
function H2({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xl font-bold mt-10 mb-3" style={{ color: "rgb(var(--text-primary))" }}>
            {children}
        </h2>
    );
}

function H3({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: "rgb(var(--text-primary))" }}>
            {children}
        </h3>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[14px] leading-relaxed mb-3" style={{ color: "rgb(var(--text-primary) / 0.7)" }}>
            {children}
        </p>
    );
}

function UL({ items }: { items: string[] }) {
    return (
        <ul className="list-disc list-inside space-y-1 mb-4 pl-2">
            {items.map((item, i) => (
                <li key={i} className="text-[14px] leading-relaxed" style={{ color: "rgb(var(--text-primary) / 0.65)" }}>
                    {item}
                </li>
            ))}
        </ul>
    );
}

function Divider() {
    return <hr className="my-8 border-t" style={{ borderColor: "rgb(var(--card-border))" }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TermsPage() {
    return (
        <main
            className="min-h-screen py-16 px-4 sm:px-6"
            style={{ background: "rgb(var(--bg-primary))" }}
        >
            <ThemeSync />
            <div className="max-w-3xl mx-auto">
                {/* Back link */}
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

                {/* Title block */}
                <div className="mb-10">
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
                        Terms &amp; Conditions
                    </h1>
                    <p className="text-[13px]" style={{ color: "rgb(var(--text-primary) / 0.45)" }}>
                        Effective Date: 18 March 2026 &nbsp;·&nbsp; Version 1.0
                    </p>
                </div>

                {/* ── 1. Introduction ─────────────────────────────────────────── */}
                <H2>1. Introduction</H2>
                <P>
                    Welcome to PockIT Engineers, a technology-enabled on-demand platform operated by{" "}
                    <strong>Pockit Technologies Private Limited</strong> ("Company", "we", "us", or "our"), a company incorporated under the Companies Act, 2013 with its registered office at B 901 Kapil Abhijat, Dahanukar Colony, Kothrud, Pune – 411038, Maharashtra, India (CIN: U62013PN2025PTC239189).
                </P>
                <P>
                    These Terms and Conditions ("Terms") govern your access to and use of the PockIT Engineers mobile application ("App"), website, and related digital platforms (collectively, the "Platform"), as well as all IT repair, installation, setup, maintenance, and technical support services offered through the Platform ("Services"). By accessing, registering on, or using the Platform or Services, you confirm that you have read, understood, and agree to be bound by these Terms, including our Privacy Policy (
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(var(--accent-primary))" }}>
                        /privacy-policy
                    </a>
                    ), which is incorporated herein by reference.
                </P>
                <P>
                    If you do not agree to these Terms, you must immediately discontinue use of the Platform and Services. These Terms apply to all Users, including customers, visitors, and any other persons who access or interact with the Platform.
                </P>

                <Divider />

                {/* ── 2. Definitions ─────────────────────────────────────────── */}
                <H2>2. Definitions</H2>
                <P>For the purposes of these Terms, the following terms shall have the meanings assigned to them below:</P>
                <UL items={[
                    '"App" means the PockIT Engineers mobile application available on Android (Google Play Store) and iOS (Apple App Store) platforms.',
                    '"Booking" means a confirmed service request placed by a User through the Platform.',
                    '"Company" means Pockit Technologies Private Limited, operating the Platform under the brand name PockIT Engineers.',
                    '"Device" means any electronic or computing device submitted by the User for repair, installation, setup, or maintenance, including but not limited to laptops, desktop computers, smartphones, tablets, smart TVs, routers, printers, CCTV systems, and home networking equipment.',
                    '"Platform" means the App, website (pockitengineers.com and related subdomains), and all digital interfaces operated by the Company.',
                    '"Services" means all IT repair, installation, configuration, maintenance, and related support services offered through the Platform.',
                    '"Technician" means a background-verified IT professional — whether employed by the Company (full-time) or an authorised partner technician — assigned to deliver Services.',
                    '"User" or "you" means any person who accesses or uses the Platform or Services, whether or not registered.',
                    '"We", "us", and "our" refer to Pockit Technologies Private Limited.',
                ]} />

                <Divider />

                {/* ── 3. Eligibility and Registration ────────────────────────── */}
                <H2>3. Eligibility and Registration</H2>
                <P>
                    To access and use the Platform, you must be at least 18 years of age and legally competent to enter into binding contracts under applicable law. By using the Platform, you represent and warrant that you meet this eligibility requirement.
                </P>
                <P>To register on the Platform, you are required to provide accurate, current, and complete information and to keep such information updated at all times. You agree to:</P>
                <UL items={[
                    "Provide your full legal name, valid mobile number, and email address;",
                    "Set a strong, unique password and maintain its confidentiality;",
                    "Immediately notify the Company of any unauthorized access to your account at itsupport@pockitengineers.com;",
                    "Accept responsibility for all activities conducted under your account, whether authorized by you or not.",
                ]} />
                <P>
                    The Company reserves the right to refuse registration, suspend, or terminate any account at its sole discretion if false, inaccurate, incomplete, or misleading information is detected, or for any breach of these Terms.
                </P>

                <Divider />

                {/* ── 4. Service Requests, Bookings, and Cancellations ───────── */}
                <H2>4. Service Requests, Bookings, and Cancellations</H2>

                <H3>4.1 Placing a Booking</H3>
                <P>
                    Service requests may be placed through the Platform by following the on-screen instructions. A booking is confirmed only after acceptance by the Company or the assigned technician. Confirmation will be communicated via the App, SMS, email, or push notification. The Company reserves the right to decline or reschedule bookings due to technician unavailability, operational limitations, or service area restrictions.
                </P>

                <H3>4.2 Technician Model</H3>
                <P>PockIT Engineers deploys technicians as follows:</P>
                <UL items={[
                    "Full-time employed technicians: Mumbai, Noida, and Pune;",
                    "Authorised partner technicians: All other service locations.",
                ]} />
                <P>All technicians, whether employed or partner-based, are required to adhere to the Company's service standards, code of conduct, and applicable legal requirements.</P>

                <H3>4.3 Device Inspection Before Repair</H3>
                <P>Before commencing any repair, the technician may conduct an inspection of the device, which may include:</P>
                <UL items={[
                    "Visual examination of the device;",
                    "Diagnostic testing to identify faults;",
                    "Photographic or written documentation of pre-existing physical condition.",
                ]} />
                <P>If additional faults are discovered during inspection or in the course of repair, the technician will inform you and provide a revised service estimate before proceeding. No additional work will be undertaken without your express approval. The Company reserves the right to decline repair if the device condition prevents safe, reliable, or commercially viable servicing.</P>

                <H3>4.4 Device Condition Acknowledgement</H3>
                <P>By submitting your device for repair, you acknowledge and agree that:</P>
                <UL items={[
                    "The device may contain pre-existing defects or damage not caused by the Company;",
                    "Certain internal faults may only become visible during the repair process;",
                    "The Company shall not be liable for pre-existing defects or damage revealed during repair;",
                    "Service documentation including photographs and technician notes may be retained for quality control, audit, and dispute resolution purposes.",
                ]} />

                <H3>4.5 Cancellation Policy</H3>
                <UL items={[
                    "Cancellation before booking acceptance: Permitted at no charge.",
                    "Cancellation after booking acceptance: Not permitted. Once a technician has accepted the booking, the service request is locked.",
                    "Technician already dispatched: If a technician has been dispatched to your location and the booking is cancelled, visit charges as communicated at the time of booking will apply.",
                ]} />
                <P>Visit charges will be disclosed to the User at the time of booking and prior to confirmation. The Company reserves the right to revise these charges with prior notice on the Platform.</P>

                <H3>4.6 Unclaimed Devices</H3>
                <P>
                    Devices left uncollected for more than 30 (thirty) days after service completion will be subject to storage charges. If a device remains unclaimed despite reasonable attempts to contact the customer, the Company reserves the right to recycle or dispose of the device in accordance with applicable e-waste and regulatory provisions. The Company shall not be liable for any loss arising from disposal of abandoned devices after this notice period.
                </P>

                <Divider />

                {/* ── 5. Pricing, Payment, and Invoicing ─────────────────────── */}
                <H2>5. Pricing, Payment, and Invoicing</H2>

                <H3>5.1 Service Pricing</H3>
                <P>Service charges depend on the nature and complexity of the repair, diagnostic outcomes, and parts required. Prices displayed on the Platform are indicative and subject to revision without prior notice. Final charges will be communicated to the User prior to commencement of repair, and no work will proceed without User consent on revised pricing.</P>

                <H3>5.2 Accepted Payment Methods</H3>
                <P>The following payment methods are accepted, processed through Razorpay:</P>
                <UL items={[
                    "Unified Payments Interface (UPI);",
                    "Credit and debit cards;",
                    "Net banking;",
                    "PockIT Credits — a closed-loop credit wallet operated solely by the Company. Credits may be issued as refunds, adjustments, or promotional rewards and may be redeemed only against PockIT Engineers' own Services. PockIT Credits have no cash value and are non-transferable.",
                ]} />
                <P>Note: Cash on delivery (COD) may be available in certain locations at the Company's discretion. Remote/InstaHelp services require advance payment before service commencement.</P>

                <H3>5.3 Payment Timing</H3>
                <P>Payment for Services is required in advance at the time of booking confirmation unless otherwise expressly stated on the Platform. Where additional spare parts are required during repair, the cost will be communicated and collected separately upon approval.</P>

                <H3>5.4 GST and Taxation</H3>
                <P>All prices are exclusive of applicable Goods and Services Tax (GST) unless expressly stated otherwise. GST will be added to your invoice at the prevailing statutory rate. A valid GST-compliant invoice (GSTIN: 27AAPCP5344N1ZO) will be issued for all transactions.</P>

                <H3>5.5 Third-Party Payment Processor</H3>
                <P>Payments are processed through Razorpay. By making a payment, you also agree to Razorpay's terms of service and privacy policy. The Company shall not be liable for any error, failure, or delay attributable to Razorpay's systems.</P>

                <H3>5.6 Digital Invoices</H3>
                <P>Digital invoices and service records will be made available through your account dashboard on the Platform.</P>

                <Divider />

                {/* ── 6. Device Data, Backup, and Confidentiality ────────────── */}
                <H2>6. Device Data, Backup, and Confidentiality</H2>

                <H3>6.1 Customer's Data Backup Obligation</H3>
                <P>You are strongly advised to create a complete backup of all data before submitting a device for service. Certain repair procedures — including motherboard repair, chip-level work, firmware updates, and OS reinstallation — may result in data loss as an unavoidable technical consequence. The Company shall not be responsible for loss of personal files, applications, photographs, or system data unless caused by proven gross negligence of a Company technician.</P>

                <H3>6.2 Access to Customer Data During Repair</H3>
                <P>Technicians will access device data only to the extent strictly necessary to perform the authorised repair. Access to deep system data requires your prior explicit consent. The Company will not use, copy, share, or retain any personal data accessed during repair for any purpose other than performing the authorised service.</P>

                <H3>6.3 Confidentiality of Customer Information</H3>
                <P>Any business or personal information shared by you in connection with service requests will be treated as confidential and protected in accordance with our Privacy Policy. The Company will not disclose your information to third parties except as required by law, regulatory authority, or to perform the contracted Services.</P>

                <Divider />

                {/* ── 7. Warranty and Service Guarantee ──────────────────────── */}
                <H2>7. Warranty and Service Guarantee</H2>

                <H3>7.1 Standard Service Warranty</H3>
                <P>The Company provides a 30 (thirty) day warranty on completed repairs, covering the same defect or malfunction for which the service was originally performed. If the issue recurs within the warranty period due to a fault in workmanship or parts supplied by the Company, the technician will return and rectify the issue at no additional charge.</P>

                <H3>7.2 Warranty Exclusions</H3>
                <P>The warranty does not cover:</P>
                <UL items={[
                    "Physical damage, liquid damage, or accidental damage occurring after service completion;",
                    "Damage arising from unauthorised modifications, tampering, or use of non-original parts not supplied by the Company;",
                    "Software issues unrelated to the original repair;",
                    "Consumable components (batteries, screens, charging ports) subject to natural wear;",
                    "Defects in parts or components supplied or specified by the User.",
                ]} />

                <H3>7.3 Spare Parts</H3>
                <P>Where spare parts are required, the Company will source Original Equipment Manufacturer (OEM) or OEM-equivalent parts wherever available. Where only after-market parts are available, the User will be informed before fitment. The Company does not warrant the availability of specific parts for older or discontinued device models.</P>

                <H3>7.4 InstaHelp / Remote Support Services</H3>
                <P>For remote diagnostic and support services provided via the Platform's remote session feature, the Company warrants that the service will be performed with reasonable skill and care. However, no warranty is provided for issues that cannot be remotely diagnosed or resolved, or that require physical inspection of the device.</P>

                <Divider />

                {/* ── 8. Limitation of Liability ──────────────────────────────── */}
                <H2>8. Limitation of Liability</H2>

                <H3>8.1 Exclusion of Consequential Loss</H3>
                <P>To the fullest extent permitted by applicable law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of revenue, loss of business opportunities, loss of profits, or reputational harm, arising from or in connection with the use of the Platform or Services.</P>

                <H3>8.2 Cap on Direct Liability</H3>
                <P>The Company's maximum aggregate liability arising from any single claim in connection with these Terms or the Services shall not exceed the total amount actually paid by the User for the specific Service giving rise to the claim, or INR 10,000 (Indian Rupees Ten Thousand), whichever is lower.</P>

                <H3>8.3 No Liability for Third-Party Acts</H3>
                <P>The Company shall not be liable for any damage, loss, or injury caused by unauthorised third-party interference with the Platform, data breaches attributable to third-party systems, or acts of partner technicians acting outside the scope of their authorised service engagement.</P>

                <Divider />

                {/* ── 9. User Obligations and Prohibited Conduct ─────────────── */}
                <H2>9. User Obligations and Prohibited Conduct</H2>
                <P>By using the Platform, you agree to:</P>
                <UL items={[
                    "Provide accurate and complete information when booking services;",
                    "Ensure a safe working environment for the attending technician;",
                    "Be present or have an authorised adult representative present during service;",
                    "Refrain from recording, photographing, or filming technicians without their prior consent;",
                    "Not use the Platform for any unlawful, fraudulent, or abusive purpose;",
                    "Not engage in harassment, threats, or inappropriate conduct towards any Company employee, technician, or representative;",
                    "Not attempt to circumvent security systems, tamper with the Platform, or gain unauthorised access.",
                ]} />
                <P>
                    The Company reserves the right to suspend or permanently terminate your access to the Platform for any violation of these obligations, without prejudice to any other remedies available in law or equity.
                </P>

                <Divider />

                {/* ── 10. Intellectual Property ──────────────────────────────── */}
                <H2>10. Intellectual Property</H2>
                <P>All content on the Platform — including the PockIT Engineers brand name, logo, taglines, software code, user interface design, text, graphics, images, and proprietary processes — is owned by or licensed to Pockit Technologies Private Limited and is protected under applicable Indian and international intellectual property laws.</P>
                <P>You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for the purpose of availing Services. You may not copy, reproduce, distribute, modify, create derivative works from, sublicense, sell, or exploit any content of the Platform without express prior written consent from the Company.</P>

                <Divider />

                {/* ── 11. Privacy and Data Protection ────────────────────────── */}
                <H2>11. Privacy and Data Protection</H2>
                <P>
                    The Company is committed to protecting your privacy and personal data in compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. For full details on how we collect, use, store, share, and protect your data, please refer to our Privacy Policy at{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(var(--accent-primary))" }}>
                        /privacy-policy
                    </a>.
                </P>
                <P>By using the Platform, you consent to the collection and processing of your data as described in the Privacy Policy. The Company will not sell your personal data to third parties for marketing or commercial purposes.</P>

                <Divider />

                {/* ── 12. Third-Party Services and Links ──────────────────────── */}
                <H2>12. Third-Party Services and Links</H2>
                <P>The Platform may integrate with or link to third-party services, platforms, or websites. These integrations are provided for convenience and do not constitute an endorsement of those third-party services. The Company does not control, and is not responsible for, the content, privacy practices, or terms of any third-party service. Your interactions with third-party services are governed solely by their terms.</P>
                <P>Third-party integrations currently used include: Razorpay (payment processing), Google Maps or equivalent mapping APIs (location services), and Firebase or equivalent (push notifications).</P>

                <Divider />

                {/* ── 13. Disclaimer of Warranties ────────────────────────────── */}
                <H2>13. Disclaimer of Warranties</H2>
                <P>The Platform and Services are provided on an "as is" and "as available" basis. To the fullest extent permitted by law, the Company disclaims all representations and warranties, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, accuracy, reliability, or non-infringement.</P>
                <P>The Company does not warrant that:</P>
                <UL items={[
                    "The Platform will be available at all times or free from technical errors;",
                    "All defects or issues on a device can be diagnosed or repaired;",
                    "Specific parts will be available for all device models;",
                    "The Services will meet your specific expectations or requirements in all cases.",
                ]} />

                <Divider />

                {/* ── 14. Termination ─────────────────────────────────────────── */}
                <H2>14. Termination</H2>
                <P>You may terminate your account at any time by contacting the Company at itsupport@pockitengineers.com and requesting deletion of your account. Upon termination, your right to access the Platform will cease immediately.</P>
                <P>The Company reserves the right to suspend or terminate your access to the Platform at any time and without prior notice if:</P>
                <UL items={[
                    "You breach any provision of these Terms;",
                    "Your conduct poses a risk to the safety of technicians, other users, or the Company;",
                    "You engage in fraudulent, abusive, or illegal activity;",
                    "The Company determines, in its sole discretion, that termination is necessary to protect the integrity of the Platform or the safety of its users.",
                ]} />
                <P>Termination shall not release you from any outstanding obligations, including pending payments, or affect any accrued rights or liabilities.</P>

                <Divider />

                {/* ── 15. Indemnification ──────────────────────────────────────── */}
                <H2>15. Indemnification</H2>
                <P>You agree to indemnify, defend (at the Company's option), and hold harmless Pockit Technologies Private Limited and its directors, officers, employees, agents, partners, and representatives from and against any and all claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable legal fees and court costs) arising from or related to:</P>
                <UL items={[
                    "Your access to or use of the Platform or Services;",
                    "Your breach of any provision of these Terms;",
                    "Any misrepresentation of information provided by you in connection with the Services;",
                    "Your violation of any applicable law or third-party rights;",
                    "Any claim by a third party arising from your acts or omissions in connection with the Services;",
                    "Any fraud, wilful misconduct, or unlawful activity on your part.",
                ]} />

                <Divider />

                {/* ── 16. Force Majeure ────────────────────────────────────────── */}
                <H2>16. Force Majeure</H2>
                <P>The Company shall not be liable for any failure, delay, or interruption in the performance of its obligations under these Terms arising from events beyond its reasonable control, including but not limited to:</P>
                <UL items={[
                    "Acts of God, natural disasters, earthquakes, floods, or pandemics;",
                    "Strikes, labour disputes, or civil unrest;",
                    "Internet or telecommunications network failures;",
                    "Government orders, regulations, or sanctions;",
                    "Cyberattacks, hacking, or denial-of-service attacks on the Platform's infrastructure;",
                    "Any other event that could not reasonably have been prevented by the Company.",
                ]} />
                <P>In the event of a force majeure, the Company will notify Users as soon as practicable and will use reasonable efforts to resume normal service operations.</P>

                <Divider />

                {/* ── 17. Consumer Grievance Redressal ────────────────────────── */}
                <H2>17. Consumer Grievance Redressal</H2>
                <P>In compliance with the Consumer Protection Act, 2019, and the Consumer Protection (E-Commerce) Rules, 2020, the Company has designated a Grievance Officer to address consumer complaints.</P>
                <div
                    className="rounded-2xl border p-6 my-4 text-[13px] space-y-1.5"
                    style={{ background: "rgb(var(--card-bg))", borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.7)" }}
                >
                    <p className="font-bold text-[14px]" style={{ color: "rgb(var(--text-primary))" }}>Grievance Officer</p>
                    <p><span className="font-medium">Name:</span> Mr. Pooran Singh Negi</p>
                    <p><span className="font-medium">Designation:</span> Service Desk Manager</p>
                    <p><span className="font-medium">Email:</span>{" "}
                        <a href="mailto:pnegi@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>pnegi@pockitengineers.com</a>
                    </p>
                    <p><span className="font-medium">Address:</span> Unit No. 1101, 11th Floor, Tower-1, Assotech Business Cresterra, Plot No. 22, Sector-135, Noida – 201305, Dist. Gautam Budh Nagar, Uttar Pradesh</p>
                </div>
                <P>Grievance complaints will be acknowledged within 48 hours of receipt and resolved within the timelines prescribed under applicable consumer protection laws. For general support, write to{" "}
                    <a href="mailto:itsupport@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>itsupport@pockitengineers.com</a>.
                </P>
                <P>If you are not satisfied with the Company's response, you may approach the relevant Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019, or the National Consumer Helpline at 1800-11-4000.</P>

                <Divider />

                {/* ── 18. Cookie Policy and Digital Consent ───────────────────── */}
                <H2>18. Cookie Policy and Digital Consent</H2>
                <P>The Platform uses cookies and similar tracking technologies to enhance user experience, analyse traffic, and provide personalised content. By using the Platform, you consent to the use of cookies in accordance with our{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(var(--accent-primary))" }}>Privacy Policy</a>.
                </P>
                <UL items={[
                    "Essential cookies: Required for the Platform to function correctly (login sessions, bookings);",
                    "Analytics cookies: Used to understand how Users interact with the Platform (anonymised data);",
                    "Preference cookies: Used to remember your settings and preferences;",
                    "Marketing cookies: Used to deliver relevant service offers (requires explicit opt-in).",
                ]} />
                <P>You may manage or disable cookie preferences through your browser or device settings. Disabling essential cookies may affect the functionality of certain features of the Platform.</P>

                <Divider />

                {/* ── 19. Governing Law and Dispute Resolution ────────────────── */}
                <H2>19. Governing Law and Dispute Resolution</H2>
                <P>These Terms shall be governed by and construed in accordance with the laws of the Republic of India.</P>

                <H3>19.1 Step 1 – Amicable Negotiation</H3>
                <P>In the event of a dispute, the aggrieved party shall first issue a written notice of dispute, clearly describing the nature of the grievance and the relief sought. The parties shall attempt to resolve the dispute amicably through good-faith negotiation within 30 (thirty) days of receipt of such notice.</P>

                <H3>19.2 Step 2 – Arbitration</H3>
                <P>If the dispute is not resolved within the Negotiation Period, either party may refer it to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended). The arbitration shall be conducted by a sole arbitrator mutually appointed by the parties. The seat and venue of arbitration shall be Pune, Maharashtra. The language of arbitration shall be English. The arbitrator's award shall be final and binding on both parties.</P>

                <H3>19.3 Step 3 – Courts</H3>
                <P>For any disputes not subject to arbitration, or for enforcing an arbitral award, the parties submit to the exclusive jurisdiction of the competent courts located at Pune, Maharashtra, India.</P>
                <P>As a consumer, you also have the right to approach the appropriate Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019, regardless of the above.</P>

                <Divider />

                {/* ── 20. Miscellaneous Provisions ────────────────────────────── */}
                <H2>20. Miscellaneous Provisions</H2>

                <H3>20.1 Amendments</H3>
                <P>The Company reserves the right to amend, update, or modify these Terms at any time without prior notice. Revised Terms are effective immediately upon posting on the Platform. Your continued use of the Platform after such posting constitutes acceptance of the revised Terms.</P>

                <H3>20.2 Severability</H3>
                <P>If any provision of these Terms is held by a competent court to be unlawful, void, or unenforceable, that provision shall be severed without affecting the validity and enforceability of the remaining provisions.</P>

                <H3>20.3 Waiver</H3>
                <P>No failure or delay by the Company in exercising any right or remedy under these Terms shall constitute a waiver of that right or remedy.</P>

                <H3>20.4 Entire Agreement</H3>
                <P>These Terms, together with the{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(var(--accent-primary))" }}>Privacy Policy</a>
                    {" "}and any supplemental terms, constitute the entire agreement between you and the Company concerning the Platform and Services.</P>

                <H3>20.5 Assignment</H3>
                <P>You may not assign or transfer any rights or obligations under these Terms without the Company's prior written consent. The Company may freely assign its rights and obligations to any affiliate, subsidiary, successor, or acquirer.</P>

                <H3>20.6 No Third-Party Rights</H3>
                <P>These Terms do not confer any rights or remedies upon any third party. Only the parties to these Terms — you and the Company — have rights under them.</P>

                <H3>20.7 Notices</H3>
                <P>All formal notices to the Company shall be sent by email to{" "}
                    <a href="mailto:itsupport@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>itsupport@pockitengineers.com</a>
                    {" "}or by registered post to the Company's registered office address.</P>

                <Divider />

                {/* ── 21. Contact Information ──────────────────────────────────── */}
                <H2>21. Contact Information</H2>
                <div
                    className="rounded-2xl border p-6 my-4 text-[13px] space-y-1.5"
                    style={{ background: "rgb(var(--card-bg))", borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.7)" }}
                >
                    <p className="font-bold text-[14px]" style={{ color: "rgb(var(--text-primary))" }}>Pockit Technologies Private Limited (Brand: PockIT Engineers)</p>
                    <p><span className="font-medium">Registered Address:</span> B 901 Kapil Abhijat, Dahanukar Colony, Kothrud, Pune – 411038, Maharashtra, India</p>
                    <p><span className="font-medium">Support Email:</span>{" "}
                        <a href="mailto:itsupport@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>itsupport@pockitengineers.com</a>
                    </p>
                    <p><span className="font-medium">Customer Support Phone:</span>{" "}
                        <a href="tel:+919240251266" style={{ color: "rgb(var(--accent-primary))" }}>9240251266</a>
                    </p>
                    <p><span className="font-medium">Grievance Officer Email:</span>{" "}
                        <a href="mailto:pnegi@pockitengineers.com" style={{ color: "rgb(var(--accent-primary))" }}>pnegi@pockitengineers.com</a>
                    </p>
                    <p><span className="font-medium">Privacy Policy:</span>{" "}
                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "rgb(var(--accent-primary))" }}>
                            /privacy-policy
                        </a>
                    </p>
                </div>

                {/* Footer note */}
                <p
                    className="text-[12px] mt-12 pt-6 border-t text-center"
                    style={{ borderColor: "rgb(var(--card-border))", color: "rgb(var(--text-primary) / 0.35)" }}
                >
                    © 2026 Pockit Technologies Private Limited. All rights reserved. &nbsp;|&nbsp; CIN: U62013PN2025PTC239189 &nbsp;|&nbsp; These Terms and Conditions are governed by the laws of India.
                    <br />
                    Pockit Engineers is an independent service provider and is not affiliated with or authorized by Apple, Lenovo, Dell, HP, Microsoft, or any other brand unless explicitly stated. All trademarks and brand names are the property of their respective owners.
                </p>
            </div>
        </main>
    );
}
