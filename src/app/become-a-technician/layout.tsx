import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Join as a Technician — Pockit Engineers",
    description:
        "Join 500+ skilled IT engineers across Delhi, Mumbai, Bangalore. Earn more, earn respect, stay employed. Apply now to join as a technician.",
};

export default function BecomeTechnicianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
