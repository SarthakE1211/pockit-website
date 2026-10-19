// ---------------------------------------------------------------------------
// Technician application relay → SendGrid email. CHANGELOG #078.
//
// The /become-a-technician form (src/components/expert/TechnicianForm.tsx)
// POSTs the applicant's details here; this handler validates them and sends
// a formatted email to itsupport@pockitengineers.com using SendGrid.
//
// IMPORTANT: this is a `route.server.ts` — the pageExtensions gate in
// next.config.mjs includes it ONLY in the server (Vercel/Node) build and
// EXCLUDES it from the static cPanel export (which can't run server code).
// This mirrors the Meta CAPI relay (src/app/api/meta/capi/route.server.ts,
// CHANGELOG #072): SendGrid's secret key can never live in the static
// browser bundle, so the send runs here.
//
// CROSS-ORIGIN: the production marketing site is served from cPanel
// (pockitengineers.com), while this route runs on the Vercel deployment.
// The browser POSTs here CROSS-ORIGIN, so we need CORS (an OPTIONS preflight
// + Access-Control-Allow-Origin on responses). The static build points the
// form at this absolute URL via NEXT_PUBLIC_TECHNICIAN_ENDPOINT; on the
// server build the form defaults to the same-origin /api/technician.
//
// Required env (server-only, never NEXT_PUBLIC):
//   SENDGRID_API_KEY          — SendGrid → Settings → API Keys. SECRET.
// Optional:
//   TECHNICIAN_FROM_EMAIL     — verified SendGrid sender (default
//                               noreply@pockitengineers.com — VERIFY IT in
//                               SendGrid → Sender Authentication first).
//   TECHNICIAN_TO_EMAIL       — recipient (default itsupport@pockitengineers.com).
//   TECHNICIAN_ALLOWED_ORIGINS — comma-separated origins allowed to POST
//                               (defaults to the pockitengineers.com pair).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { EXPERT_FORM } from "@/constants/copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.TECHNICIAN_FROM_EMAIL ?? "noreply@pockitengineers.com";
const TO_EMAIL = process.env.TECHNICIAN_TO_EMAIL ?? "itsupport@pockitengineers.com";

const ALLOWED_ORIGINS = new Set(
    (process.env.TECHNICIAN_ALLOWED_ORIGINS ??
        "https://www.pockitengineers.com,https://pockitengineers.com")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
);

// Skill id → human label, sourced from the same constant the form renders
// from, so the server can (a) reject unknown ids a tampered client might
// POST and (b) print friendly labels in the email.
const SKILL_LABELS: Record<string, string> = Object.fromEntries(
    EXPERT_FORM.skills.map((s) => [s.id, s.label]),
);

// CORS headers for an allowed cross-origin caller. Echoes the request
// origin only when it's on the allow-list (never a blanket `*`, since we
// accept POSTs with a JSON body).
function corsHeaders(origin: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
}

interface TechnicianApplication {
    firstName?: string;
    lastName?: string;
    contactNumber?: string;
    city?: string;
    skills?: string[];
}

// Trim + clamp a free-text field so a hostile client can't stuff the email
// body with megabytes. Returns "" for non-strings.
function clean(value: unknown, max = 120): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Minimal HTML escape for values dropped into the email's HTML part.
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Preflight for the cross-origin JSON POST.
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
    const cors = corsHeaders(req.headers.get("origin"));

    if (!API_KEY) {
        console.error("[technician] SENDGRID_API_KEY not configured");
        return NextResponse.json(
            { ok: false, reason: "email_not_configured" },
            { status: 503, headers: cors },
        );
    }

    let body: TechnicianApplication;
    try {
        body = (await req.json()) as TechnicianApplication;
    } catch {
        return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400, headers: cors });
    }

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const contactNumber = clean(body.contactNumber, 30);
    const city = clean(body.city);

    // Keep only known skill ids, dedupe, and map to labels.
    const skillIds = Array.isArray(body.skills)
        ? [...new Set(body.skills.filter((s): s is string => typeof s === "string" && s in SKILL_LABELS))]
        : [];
    const skillLabels = skillIds.map((id) => SKILL_LABELS[id]);

    // Required-field validation. Skills are optional (an applicant may want
    // to talk first), but name + contact + city must be present.
    if (!firstName || !lastName || !contactNumber || !city) {
        return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 400, headers: cors });
    }

    const fullName = `${firstName} ${lastName}`;
    const skillsText = skillLabels.length ? skillLabels.join(", ") : "—";

    const textBody = [
        "New technician application from pockitengineers.com",
        "",
        `Name:     ${fullName}`,
        `Contact:  ${contactNumber}`,
        `City:     ${city}`,
        `Skills:   ${skillsText}`,
    ].join("\n");

    const htmlBody = `
        <h2 style="margin:0 0 12px;font-family:sans-serif">New technician application</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0;color:#666">Name</td><td><strong>${escapeHtml(fullName)}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">Contact</td><td>${escapeHtml(contactNumber)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">City</td><td>${escapeHtml(city)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">Skills</td><td>${escapeHtml(skillsText)}</td></tr>
        </table>
        <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:16px">
            Sent from the Become a Technician form.
        </p>`;

    sgMail.setApiKey(API_KEY);

    try {
        await sgMail.send({
            to: TO_EMAIL,
            from: FROM_EMAIL,
            replyTo: `${fullName} <${FROM_EMAIL}>`,
            subject: `New technician application — ${fullName} (${city})`,
            text: textBody,
            html: htmlBody,
        });
        return NextResponse.json({ ok: true }, { headers: cors });
    } catch (err) {
        // SendGrid errors carry useful detail on `.response.body`.
        const detail =
            err && typeof err === "object" && "response" in err
                ? (err as { response?: { body?: unknown } }).response?.body
                : err;
        console.error("[technician] SendGrid send failed:", JSON.stringify(detail));
        return NextResponse.json({ ok: false, reason: "send_failed" }, { status: 502, headers: cors });
    }
}
