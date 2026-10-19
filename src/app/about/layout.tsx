import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us — Pockit Engineers",
    description:
        "Bharat's only On-Demand IT Services App for modern households. Get fast, reliable tech help from verified experts.",
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
