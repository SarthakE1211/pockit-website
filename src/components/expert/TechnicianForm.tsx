"use client";

// ---------------------------------------------------------------------------
// Technician application form — occupies the slot the hero illustration used
// to hold (CHANGELOG #078). Posts to the SendGrid relay
// (src/app/api/technician/route.server.ts), which emails
// itsupport@pockitengineers.com.
//
// Endpoint resolution mirrors the Meta Pixel/CAPI split (src/lib/metaPixel.ts):
// on the static cPanel build NEXT_PUBLIC_TECHNICIAN_ENDPOINT points at the
// Vercel absolute URL (cross-origin); on the server build it defaults to the
// same-origin /api/technician.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { EXPERT_FORM } from "@/constants/copy";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { trackTechnicianApplication } from "@/lib/metaPixel";

const ENDPOINT = process.env.NEXT_PUBLIC_TECHNICIAN_ENDPOINT ?? "/api/technician";

type Status = "idle" | "submitting" | "success" | "error";

export default function TechnicianForm() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [city, setCity] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [status, setStatus] = useState<Status>("idle");

    const toggleSkill = (id: string) => {
        setSkills((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === "submitting") return;
        setStatus("submitting");

        try {
            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, contactNumber, city, skills }),
            });
            if (!res.ok) throw new Error(`Relay error ${res.status}`);

            trackEvent(AnalyticsEvents.TechnicianApplySubmit, { skills: skills.join(",") });
            // Meta fires only from here — past the relay's OK, so a click that
            // never became an application is never counted as a conversion.
            // The submitted details go up as hashed Advanced Matching (#084).
            trackTechnicianApplication({ firstName, lastName, contactNumber, city, skills });
            setStatus("success");
        } catch (err) {
            console.warn("[TechnicianForm] submit failed", err);
            setStatus("error");
        }
    };

    // Shared field styling — tokenised so it tracks the light/dark theme.
    const fieldStyle = {
        borderColor: "rgb(var(--card-border) / 0.6)",
        background: "rgb(var(--bg-primary))",
        color: "rgb(var(--text-primary))",
    } as const;
    const fieldClass =
        "w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[rgb(var(--accent-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary)/0.25)]";

    if (status === "success") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border p-8 text-center"
                style={{
                    borderColor: "rgb(var(--card-border) / 0.5)",
                    background: "rgb(var(--bg-primary))",
                    boxShadow: "0 24px 60px rgb(0 0 0 / 0.12)",
                }}
            >
                <CheckCircle2 className="h-14 w-14" style={{ color: "rgb(var(--accent-primary))" }} strokeWidth={1.6} />
                <h3 className="mt-4 text-xl font-bold" style={{ color: "rgb(var(--text-primary))" }}>
                    {EXPERT_FORM.successTitle}
                </h3>
                <p className="mt-2 text-sm" style={{ color: "rgb(var(--text-primary) / 0.7)" }}>
                    {EXPERT_FORM.successBody}
                </p>
            </motion.div>
        );
    }

    return (
        <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-md rounded-3xl border p-6 sm:p-7"
            style={{
                borderColor: "rgb(var(--card-border) / 0.5)",
                background: "rgb(var(--bg-primary))",
                boxShadow: "0 24px 60px rgb(0 0 0 / 0.12)",
            }}
        >
            <h3 className="text-lg font-bold sm:text-xl" style={{ color: "rgb(var(--text-primary))" }}>
                {EXPERT_FORM.heading}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "rgb(var(--text-primary) / 0.65)" }}>
                {EXPERT_FORM.subheading}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="First name"
                    aria-label="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldClass}
                    style={fieldStyle}
                />
                <input
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Last name"
                    aria-label="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldClass}
                    style={fieldStyle}
                />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    pattern="[0-9+ ]{7,15}"
                    placeholder="Contact number"
                    aria-label="Contact number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className={fieldClass}
                    style={fieldStyle}
                />
                <input
                    type="text"
                    required
                    autoComplete="address-level2"
                    placeholder="City"
                    aria-label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={fieldClass}
                    style={fieldStyle}
                />
            </div>

            <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold" style={{ color: "rgb(var(--text-primary) / 0.85)" }}>
                    {EXPERT_FORM.skillsLabel}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                    {EXPERT_FORM.skills.map((skill) => {
                        const checked = skills.includes(skill.id);
                        return (
                            <label
                                key={skill.id}
                                className="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition"
                                style={{
                                    borderColor: checked
                                        ? "rgb(var(--accent-primary))"
                                        : "rgb(var(--card-border) / 0.6)",
                                    background: checked
                                        ? "rgb(var(--accent-primary) / 0.08)"
                                        : "rgb(var(--bg-primary))",
                                    color: "rgb(var(--text-primary) / 0.9)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSkill(skill.id)}
                                    className="h-4 w-4 accent-[rgb(var(--accent-primary))]"
                                />
                                {skill.label}
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {status === "error" && (
                <p className="mt-4 text-sm" style={{ color: "#DC2626" }}>
                    {EXPERT_FORM.errorBody}
                </p>
            )}

            <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                    background:
                        "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-secondary)) 100%)",
                    boxShadow: "0 10px 28px rgb(var(--accent-primary) / 0.35)",
                }}
            >
                {status === "submitting" ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                        {EXPERT_FORM.submittingLabel}
                    </>
                ) : (
                    EXPERT_FORM.submitLabel
                )}
            </button>
        </motion.form>
    );
}
