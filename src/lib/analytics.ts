declare global {
    interface Window {
        dataLayer?: Array<Record<string, unknown> | IArguments>;
        gtag?: (...args: unknown[]) => void;
    }
}

type EventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: EventParams): void {
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;

    window.gtag("event", eventName, params ?? {});
}

export const AnalyticsEvents = {
    ChatbotOpened: "chatbot_opened",
    ChatbotMessageSent: "chatbot_message_sent",
    CtaBookService: "cta_book_service",
    CtaDownloadApp: "cta_download_app",
    CtaBecomeTechnician: "cta_become_technician",
    FaqExpanded: "faq_expanded",
    TestimonialViewed: "testimonial_viewed",
    NavLinkClicked: "nav_link_clicked",

    // Blog — landed incrementally:
    //   #008  cards, category filter, search
    //   #009  share buttons
    //   #012  post view, scroll depth, engagement milestones, card
    //         impressions, in-post CTA clicks (+ custom dimensions
    //         `post_slug`, `post_category`, `post_author` registered in
    //         GA4 admin — see docs/BLOG_ANALYTICS.md).
    BlogCardClicked: "blog_card_clicked",
    BlogCategoryFilter: "blog_category_filter",
    BlogSearch: "blog_search",
    BlogShareClick: "share_click",
    BlogPostView: "post_view",
    BlogScrollDepth: "scroll_depth",
    BlogEngagement: "engagement",
    BlogCardImpression: "card_impression",
    BlogCtaClick: "cta_click",

    // Landing pages — Mumbai SEO programme (CHANGELOG #022).
    // Custom dimensions on these events: page_slug, page_type, location,
    // service. Register them in GA4 admin to use them in reports.
    LandingPageView: "landing_view",
    LandingCtaClick: "landing_cta_click",
    LandingFaqExpanded: "landing_faq_expanded",

    // Long-form "Read More" SEO block. Fires on the home page AND on any
    // Sanity landing page carrying `seoContent` — `page_slug` says which
    // ("home" | the landing-page slug). See CHANGELOG #087, #088.
    ContentExpanded: "content_expanded",

    // Floating WhatsApp button — global on every page.
    // Param: `location` ("global_floating" | future: hero | service | …).
    // See CHANGELOG #033 (May 2026 SEO audit).
    WhatsAppFloatClick: "whatsapp_float_click",

    // Become-a-technician application form submit (CHANGELOG #078).
    // Fires once on a successful POST to the SendGrid relay. Param:
    // `skills` (comma-joined skill ids the applicant ticked).
    TechnicianApplySubmit: "technician_apply_submit",

    // Homepage ServiceGrid card click. Fires whether the card targets the
    // download band OR a dedicated landing page. Params: `service` (the
    // service id like "laptop") and `destination` ("download" | "landing").
    // See CHANGELOG #037 (Phase 2 of the May 2026 SEO audit).
    ServiceCardClick: "service_card_click",
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
