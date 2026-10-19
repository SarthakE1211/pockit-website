"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { REVIEWS } from "@/constants/copy";

function Stars({ count = 5 }: { count?: number }) {
    return (
        <div className="flex gap-1">
            {[...Array(count)].map((_, i) => (
                <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-theme-accent">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

function Avatar({ name, imageSrc }: { name: string; imageSrc?: string }) {
    const [showImage, setShowImage] = useState(Boolean(imageSrc));
    return (
        <>
            {showImage && imageSrc ? (
                <div className="w-12 h-12 relative rounded-full overflow-hidden shrink-0 ring-2 ring-white/10">
                    <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        className="object-cover"
                        onError={() => setShowImage(false)}
                        unoptimized
                    />
                </div>
            ) : (
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white shrink-0 ring-2 ring-white/10 text-[15px]"
                    style={{ background: "linear-gradient(135deg, rgb(var(--accent-primary)), rgb(var(--accent-primary-end)))" }}
                >
                    {name.charAt(0)}
                </div>
            )}
        </>
    );
}

const AUTO_MS = 6500;

type Review = (typeof REVIEWS)[0];

interface TestimonialSliderProps {
    reviews?: Review[];
}

export default function TestimonialSlider({ reviews = REVIEWS }: TestimonialSliderProps) {
    const [index, setIndex] = useState(0);
    const n = reviews.length;

    const go = useCallback(
        (dir: -1 | 1) => {
            setIndex((i) => (i + dir + n) % n);
        },
        [n]
    );

    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const t = window.setInterval(() => go(1), AUTO_MS);
        return () => window.clearInterval(t);
    }, [paused, go]);

    const review = reviews[index];

    if (!review) return null;

    return (
        <div className="max-w-3xl mx-auto">
            <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className="relative rounded-3xl border p-6 sm:p-7 min-h-[260px] sm:min-h-[230px] flex flex-col bg-theme-bg/35"
                style={{
                    background: "rgb(var(--card-bg))",
                    borderColor: "rgb(var(--card-border))",
                }}
            >
                <div className="flex items-center justify-between gap-4 mb-6">
                    <Stars />
                </div>

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={review.name + index}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 flex flex-col"
                    >
                        <blockquote
                            className="text-[17px] sm:text-lg font-medium leading-relaxed flex-1"
                            style={{ color: "rgb(var(--text-primary))" }}
                        >
                            {review.text}
                        </blockquote>

                        <div className="flex items-center gap-3 mt-8 pt-6 border-t" style={{ borderColor: "rgb(var(--card-border))" }}>
                            <Avatar name={review.name} imageSrc={review.avatar} />
                            <div>
                                <p className="text-[15px] font-bold" style={{ color: "rgb(var(--text-primary))" }}>
                                    {review.name}
                                </p>
                                <p className="text-[13px]" style={{ color: "rgb(var(--text-primary) / 0.45)" }}>
                                    {review.city}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        className="p-2.5 rounded-xl border transition-colors hover:bg-theme-accent/10 hover:border-theme-accent/30"
                        style={{ borderColor: "rgb(var(--card-border))" }}
                        aria-label="Previous testimonial"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-1.5">
                        {reviews.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setIndex(i)}
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: i === index ? 26 : 8,
                                    background:
                                        i === index
                                            ? "rgb(var(--accent-primary))"
                                            : "rgb(var(--text-primary) / 0.15)",
                                }}
                                aria-label={`Go to testimonial ${i + 1}`}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        className="p-2.5 rounded-xl border transition-colors hover:bg-theme-accent/10 hover:border-theme-accent/30"
                        style={{ borderColor: "rgb(var(--card-border))" }}
                        aria-label="Next testimonial"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
