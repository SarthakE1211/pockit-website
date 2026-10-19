"use client";

// ---------------------------------------------------------------------------
// Client UI for /about. Split out from the route file so `page.tsx` can
// stay a server component and own per-page <Metadata> + JSON-LD. Static
// markup mostly — no state — but the imported Header/Footer/ThemeSync
// chain pulls in client hooks (theme + GA), so the whole subtree must be
// `"use client"`.
//
// Introduced as part of the May 2026 SEO audit — see CHANGELOG #031.
// ---------------------------------------------------------------------------

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ThemeSync from "@/components/landing/ThemeSync";

export default function AboutClient() {
    return (
        <>
            <ThemeSync />
            <main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />

                <section className="pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-18 lg:pb-20 bg-theme-bg border-b border-theme-border/40">
                    <div className="mx-auto w-[92%] max-w-6xl">
                        <p className="inline-flex rounded-full border border-theme-accent/25 bg-theme-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-theme-accent">
                            About Us
                        </p>
                        <h1
                            className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Doorstep Laptop Repair &amp; On-Demand IT Support in Mumbai &amp; across Bharat.
                        </h1>
                        <p className="mt-6 max-w-3xl text-base leading-relaxed text-theme-text/75 sm:text-lg">
                            Pockit Engineers is Bharat&apos;s only on-demand IT services app. Background-verified laptop, MacBook, WiFi, smart-TV, printer and CCTV experts at your door in under 60 minutes — no friction, no delays, no confusion.
                        </p>
                        <div className="mt-10 grid gap-6 sm:grid-cols-3">
                            <div className="rounded-2xl border border-theme-border/60 bg-theme-bg2/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-text/60">
                                    Response
                                </p>
                                <p className="mt-2 text-lg font-bold text-theme-text">
                                    Instant help in 10 minutes
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-border/60 bg-theme-bg2/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-text/60">
                                    Experts
                                </p>
                                <p className="mt-2 text-lg font-bold text-theme-text">
                                    Background-verified technicians only
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-border/60 bg-theme-bg2/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-text/60">
                                    Experience
                                </p>
                                <p className="mt-2 text-lg font-bold text-theme-text">
                                    Live tracking & transparent pricing
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-14 sm:py-16 lg:py-20 bg-theme-bg2 border-b border-theme-border/40">
                    <div className="mx-auto w-[92%] max-w-6xl text-theme-text/80">
                        <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-start">
                            <div className="space-y-6">
                                <p className="text-base leading-relaxed sm:text-lg">
                                    Get instant IT help in 10 minutes from verified experts who can fix your issues remotely or
                                    at your home. With live tracking and transparent pricing, you&apos;re always in control - you
                                    know who&apos;s coming, what&apos;s happening, and what it costs.
                                </p>
                                <div className="space-y-1.5 text-base sm:text-lg">
                                    <p>No chasing technicians.</p>
                                    <p>No guesswork.</p>
                                    <p>No last-minute surprises.</p>
                                </div>
                                <p className="text-base leading-relaxed sm:text-lg">
                                    Just fast, reliable tech support - exactly when you need it.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-border/60 bg-theme-bg p-6 sm:p-7">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-text/55">
                                    How it feels for customers
                                </p>
                                <ul className="mt-4 space-y-2 text-sm sm:text-base">
                                    <li>• Book in a few taps via app or web.</li>
                                    <li>• Track your expert in real time.</li>
                                    <li>• Know the work and pricing upfront.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-14 sm:py-16 lg:py-20 bg-theme-bg border-b border-theme-border/40">
                    <div className="mx-auto w-[92%] max-w-6xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.11em] text-theme-text/55">
                            Join as a Technician
                        </p>
                        <h2
                            className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Join as a Technician
                        </h2>
                        <p className="mt-5 text-xl font-semibold text-theme-text sm:text-2xl">
                            Kaam rukna nahi chahiye. Earning rukni nahi chahiye.
                        </p>
                        <p className="mt-5 max-w-4xl text-base leading-relaxed text-theme-text/75 sm:text-lg">
                            Pockit helps you get regular work, clear payments, and a system you can rely on. No chasing
                            customers, no uncertainty - just steady jobs based on your skills.
                        </p>
                        <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-stretch">
                            <div className="rounded-2xl border border-theme-accent/30 bg-theme-accent/8 p-6 sm:p-7">
                            <h3 className="text-2xl font-black text-theme-accent sm:text-3xl">
                                Built for experts who know their worth
                            </h3>
                                <p className="mt-3 text-base leading-relaxed text-theme-text/80 sm:text-lg">
                                    We bring the customers. You bring the craft. Get verified, set your schedule, and grow your
                                    practice with India&apos;s trusted network of on-demand IT professionals.
                                </p>
                                <a
                                    href="/become-a-technician"
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-theme-accent px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
                                >
                                    Join as a Technician
                                </a>
                            </div>
                            <div className="rounded-2xl border border-theme-border/60 bg-theme-bg2 p-6 sm:p-7">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-text/55">
                                    What experts get
                                </p>
                                <ul className="mt-4 space-y-2 text-sm sm:text-base text-theme-text/80">
                                    <li>• Steady work based on skills and city.</li>
                                    <li>• Clear, on-time payouts.</li>
                                    <li>• No chasing customers for leads or payments.</li>
                                    <li>• A system and brand you can rely on.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}
