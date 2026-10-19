"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";
import { Check, Zap, Laptop, Monitor, Printer, Wifi, Tv, Smartphone, ShieldCheck, Cctv, Disc3 } from "lucide-react";
import SectionPill from "./SectionPill";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

// Service catalogue — add new entries here to extend the grid.
//
//   `imgAlt`      — keyword-rich alt-text override (CHANGELOG #035).
//                   Falls back to `title` when absent.
//   `landingHref` — optional dedicated landing-page URL. When present,
//                   the card navigates to that page instead of the
//                   download anchor (CHANGELOG #037, Phase 2 of the May
//                   2026 SEO audit). Today only `laptop` has a page in
//                   Sanity (`/laptop-repair-mumbai`); add more as
//                   editors author them in Studio.
const SERVICES = [
    {
        id: "instant-help",
        title: "Instant Help",
        icon: Zap,
        isFast: true,
        img: "/images/service-instant.webp",
        imgAlt: "Instant remote IT help — quick tech support call in 10 minutes",
        landingHref: "/instant-it-help-mumbai",
        desc: "Instant Help is for those urgent tech problems where you just need someone to sort it out quickly, often without a full visit. Pockit connects you to an expert who can offer fast remote guidance for app glitches, minor settings issues, account problems and other quick fixes.",
        features: ["Quick remote fix (10–15 mins)", "App or software help", "Email / account issues"]
    },
    {
        id: "laptop",
        title: "Laptop",
        icon: Laptop,
        isFast: false,
        img: "/images/service-laptop.webp",
        imgAlt: "Doorstep laptop repair service in Mumbai — virus cleanup, slow laptop fix, hardware upgrade",
        landingHref: "/laptop-repair-mumbai",
        desc: "Pockit gives your everyday laptop a new life by speeding it up, cleaning out junk and fixing crashes without risking your data. We handle operating system errors, slow performance, basic hardware upgrades and software troubleshooting so work, studies and entertainment stay smooth.",
        features: ["Regular Service (Health Check)", "Slow laptop / performance tune-up", "Virus / malware cleanup"]
    },
    {
        id: "macbook",
        title: "MacBook",
        icon: Disc3,
        isFast: false,
        img: "/images/service-macbook.webp",
        imgAlt: "MacBook repair service in Mumbai — macOS update, storage optimisation, Time Machine backup",
        landingHref: "/macbook-repair-mumbai",
        desc: "For MacBook users, Pockit offers specialist help with macOS performance issues, storage running out and everyday app glitches. We assist with updates, backups, storage optimisation and configuration of productivity tools so your Mac stays as fast and dependable.",
        features: ["macOS update & performance issues", "Time Machine & backup setup", "Storage optimisation"]
    },
    {
        id: "desktop",
        title: "Desktop",
        icon: Monitor,
        isFast: false,
        img: "/images/service-desktop.webp",
        imgAlt: "Desktop PC repair at home in Mumbai — boot failure, hardware diagnosis, system cleanup",
        landingHref: "/desktop-repair-mumbai",
        desc: "Whether it's a home desktop or a small office machine, Pockit keeps your system stable and ready for work or gaming. Our technicians troubleshoot boot failures, random restarts, slow performance and hardware faults, and can advise when a simple upgrade is enough.",
        features: ["Desktop not starting / frequent restart", "Slow system / cleanup", "Hardware diagnosis"]
    },
    {
        id: "printer",
        title: "Printer",
        icon: Printer,
        isFast: false,
        img: "/images/service-printer.webp",
        imgAlt: "Printer setup and repair at home in Mumbai — Wi-Fi printer installation, driver fix, paper jam",
        landingHref: "/printer-repair-mumbai",
        desc: "From homework assignments to office invoices, Pockit keeps your printers running smoothly at home. We fix paper jams, \"printer offline\" errors, Wi-Fi connectivity issues and driver problems across major brands.",
        features: ["New printer setup (USB / Wi-Fi)", "Printer not printing / paper jam", "Multi-device sharing setup"]
    },
    {
        id: "wfh-setup",
        title: "WFH Setup",
        icon: Wifi,
        isFast: false,
        img: "/images/service-wfh.webp",
        imgAlt: "Work-from-home setup service in Mumbai — Wi-Fi optimisation, VPN, secure home office",
        landingHref: "/wfh-setup-mumbai",
        desc: "The WFH Setup service designs a reliable and comfortable work-from-home environment so you can focus on your job instead of fighting with tech. We assess your home Wi-Fi, optimise router placement, connect all your devices and help you set up VPN, office apps and basic security.",
        features: ["Home workspace assessment", "Internet speed & Wi-Fi coverage check", "Basic security review"]
    },
    {
        id: "smart-tv",
        title: "Smart TV",
        icon: Tv,
        isFast: false,
        img: "/images/service-tv.webp",
        imgAlt: "Smart TV setup and OTT installation at home in Mumbai — casting, mirroring, Wi-Fi setup",
        landingHref: "/smart-tv-setup-mumbai",
        desc: "Pockit makes your Smart TV experience seamless by handling everything after initial setup from streaming apps to wifi configuration. We connect your TV to the internet, sign you into OTT apps, fix casting and mirroring issues, and optimise picture and sound.",
        features: ["OTT apps setup", "Screen mirroring / casting issues", "Wi-Fi connectivity & optimisation"]
    },
    {
        id: "smart-phone",
        title: "Smart Phone",
        icon: Smartphone,
        isFast: false,
        img: "/images/service-phone.webp",
        imgAlt: "Smartphone setup and data-transfer service in Mumbai — new phone setup, storage cleanup, apps",
        landingHref: "/smartphone-help-mumbai",
        desc: "Pockit helps you get the most out of your smartphone, whether it's a brand-new device or one that's become slow and cluttered. We safely transfer data from old phones, set up essential apps, fix common glitches and organise backups.",
        features: ["New phone setup & data transfer", "Storage full / phone running slow", "App installation & troubleshooting"]
    },
    {
        id: "kids-safe",
        title: "Kids Safe (Kaspersky)",
        icon: ShieldCheck,
        isFast: false,
        img: "/images/service-kids.webp",
        imgAlt: "Kids Safe parental controls with Kaspersky — screen-time limits, safe browsing in Mumbai",
        landingHref: "/kids-safe-mumbai",
        desc: "Kids Safe in partnership with Kaspersky is all about making your family's devices safe and healthy for children to use. Pockit sets up parental controls, screen-time limits, safe browsing filters and kid-friendly profiles on phones, tablets and Smart TVs.",
        features: ["Parental controls on phones & tablets", "Safe browsing & content filters", "Screen-time limits & restrictions"]
    },
    {
        id: "cctv",
        title: "CCTV",
        icon: Cctv,
        isFast: false,
        img: "/images/service-kids.webp", // Re-using kid shield placeholder until CCTV generated
        imgAlt: "CCTV camera installation in Mumbai — home security setup with remote viewing on phone",
        landingHref: "/cctv-installation-mumbai",
        desc: "Keep an eye on your home, office, kids and elders with reliable CCTV setup and support. Pockit helps you choose the right cameras, install them neatly and connect them to your phone for easy viewing.",
        features: ["New CCTV installation", "Camera not working / no feed", "Remote viewing setup"]
    }
];

function ServiceCard({ service }: { service: (typeof SERVICES)[0] }) {
    const Icon = service.icon;
    // Services with a dedicated landing page (e.g. /laptop-repair-mumbai)
    // route there; everything else still funnels to the homepage download
    // band. This is the internal-linking fix the audit flagged on slide 8.
    const landingHref = "landingHref" in service ? service.landingHref : undefined;
    const href = landingHref ?? "#download";
    const destination: "landing" | "download" = landingHref ? "landing" : "download";

    return (
        <a
            href={href}
            rel={landingHref ? undefined : "noopener noreferrer"}
            onClick={() =>
                trackEvent(AnalyticsEvents.ServiceCardClick, {
                    service: service.id,
                    destination,
                })
            }
            className="group relative flex flex-col w-full h-[480px] sm:h-[500px] rounded-[32px] overflow-hidden hover:-translate-y-2 transition-transform duration-500"
            style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
        >
            {/* Background Image */}
            <Image
                src={service.img}
                alt={service.imgAlt ?? service.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />

            {/* Premium Deep Dark Gradient Overlay - neutral dark so text stays readable but works across themes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent pointer-events-none transition-all duration-500 group-hover:opacity-95" />

            {/* Soft inner glow ring */}
            <div className="absolute inset-0 rounded-[32px] pointer-events-none ring-1 ring-inset ring-white/10 group-hover:ring-theme-accent/50 transition-all duration-500" />

            {/* FAST Badge */}
            {service.isFast && (
                <div className="absolute top-5 right-5 z-20 bg-orange-500 text-white shadow-lg text-[10px] font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-widest uppercase whitespace-nowrap">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    10 Mins
                </div>
            )}

            {/* Glassmorphic Frosted Nested Card */}
            <div className="relative z-10 flex flex-col justify-end flex-1 p-5 sm:p-6 mt-auto pointer-events-none">
                <div className="backdrop-blur-xl bg-theme-card/95 border border-theme-border/50 rounded-[24px] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:bg-theme-card group-hover:border-theme-accent/40 group-hover:-translate-y-2">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-theme-accent text-white shadow-[0_0_20px_rgb(var(--accent-primary)/0.6)] group-hover:scale-110 transition-transform duration-500">
                            <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl sm:text-[22px] font-black text-theme-text tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {service.title}
                        </h3>
                    </div>

                    {/* Desc */}
                    <p className="text-[13px] sm:text-[14px] font-medium text-theme-text/70 leading-relaxed mb-5 line-clamp-2">
                        {service.desc}
                    </p>

                    <div className="w-full h-px bg-theme-border/30 mb-5" />

                    {/* Features List */}
                    <ul className="flex flex-col gap-3 mb-1">
                        {service.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-theme-accent/15 text-theme-accent mt-0.5">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                                <span className="text-[13px] font-semibold text-theme-text leading-snug line-clamp-1">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </a>
    );
}

export default function ServiceGrid() {
    const headRef = useRef<HTMLDivElement>(null);
    const headInView = useInView(headRef, { once: true, margin: "-60px" });
    const [showAll, setShowAll] = useState(false);

    return (
        <section id="services" className="relative pt-16 pb-28 sm:pt-24 sm:pb-28 bg-theme-bg overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgb(var(--bg-secondary)), transparent)" }} />


            <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
                <div ref={headRef} className="text-center mb-16">
                    <SectionPill label="Our Services" />
                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={headInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl sm:text-5xl font-black tracking-tight text-theme-text mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Everything IT. <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent to-theme-accent-end">Just a tap away.</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={headInView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-theme-text/50 max-w-lg mx-auto text-[15px]"
                    >
                        Tap any service to book via our app or web portal — a verified expert at your door in minutes.
                    </motion.p>
                </div>

                {/* Grid Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center mt-10">
                    {SERVICES.map((service, i) => (
                        <motion.div
                            key={`${service.id}-${i}`}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                            // on mobile show first 4, on desktop show ALL
                            className={`w-full ${!showAll && i >= 4 ? "hidden sm:flex" : "flex"}`}
                        >
                            <ServiceCard service={service} />
                        </motion.div>
                    ))}
                </div>

                {/* Mobile Show More Button */}
                <div className="mt-8 flex justify-center sm:hidden">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-6 py-2.5 rounded-full border border-theme-accent/30 text-theme-accent font-semibold text-sm hover:bg-theme-accent/10 transition-colors"
                    >
                        {showAll ? "Show Less" : "Show More Services"}
                    </button>
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgb(var(--bg-secondary)), transparent)" }} />
        </section >
    );
}
