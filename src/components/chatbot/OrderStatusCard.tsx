"use client";

// ---------------------------------------------------------------------------
// Order status card for chip.ai: progress tracker + technician + visit.
//
// Data comes ready-made from the chatbot backend (`order` on the reply frame,
// built by app/services/order_card.py from the order lookup) — this component
// only renders it. Rendered under the bot bubble in Chatbot.tsx.
// ---------------------------------------------------------------------------

import type { OrderCard } from "@/services/chatbot.models";

const STATE_LABEL: Record<OrderCard["state"], string> = {
    active: "",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
};

export default function OrderStatusCard({ order, accent }: { order: OrderCard; accent: string }) {
    const tech = order.technician;
    return (
        <div className="cbot-order" style={{ ["--cbot-accent" as string]: accent }}>
            <div className="cbot-order-head">
                <div>
                    <p className="cbot-order-label">Order</p>
                    <p className="cbot-order-no">{order.order_number}</p>
                </div>
                <span className={`cbot-order-pill is-${order.state}`}>
                    {STATE_LABEL[order.state] || order.status}
                </span>
            </div>

            {order.live && (
                <div className="cbot-order-live" role="status">
                    <span className="cbot-order-live-dot" aria-hidden /> {order.live}
                </div>
            )}

            <ol className="cbot-steps" aria-label="Order progress">
                {order.steps.map(step => (
                    <li key={step.key} className={`cbot-step is-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
                        <span className="cbot-step-dot" aria-hidden>
                            {step.state === "done" ? "✓" : ""}
                        </span>
                        <span className="cbot-step-text">
                            <span className="cbot-step-label">{step.label}</span>
                            {step.at && <span className="cbot-step-at">{step.at}</span>}
                        </span>
                    </li>
                ))}
            </ol>

            {(order.visit || order.services?.length || order.amount) && (
                <dl className="cbot-order-facts">
                    {order.visit && order.state === "active" && (
                        <div><dt>Visit</dt><dd>{order.visit}</dd></div>
                    )}
                    {!!order.services?.length && (
                        <div><dt>Service</dt><dd>{order.services.join(", ")}</dd></div>
                    )}
                    {order.amount && (
                        <div><dt>Amount</dt><dd>{order.amount}</dd></div>
                    )}
                </dl>
            )}

            {tech && (
                <div className="cbot-tech">
                    <span className="cbot-tech-avatar" aria-hidden>{tech.name.charAt(0).toUpperCase()}</span>
                    <div className="cbot-tech-info">
                        <p className="cbot-tech-name">{tech.name}</p>
                        <p className="cbot-tech-sub">
                            Your technician{tech.rating ? <> · <span className="cbot-tech-star">★</span> {tech.rating}</> : null}
                        </p>
                    </div>
                    {tech.phone && (
                        <a className="cbot-tech-call" href={`tel:${tech.phone}`} aria-label={`Call ${tech.name}`}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
                            </svg>
                            Call
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
