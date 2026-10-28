# PockIT Engineers — Code Change Log

A running record of every code change Claude makes to this repository. Newest entries sit at the **top**. Each entry must include the scope of the change, the rationale, and **before/after** snippets so the evolution of any file or feature can be traced without digging through git.

This file is maintained in parallel with the code. If you see a mismatch between the code and this log, the log is out of date — flag it or ask Claude to reconcile.

---

## How to read an entry

Every entry follows this shape:

```
## [YYYY-MM-DD] #NNN — Short title
- **Type:** feature | fix | refactor | chore | docs | config | perf | security
- **Scope:** files / areas touched
- **Why:** one-line rationale
- **Related:** issue / ticket / PR (if any)

### Summary
Two or three sentences describing what changed and why it matters.

### Before
\`\`\`tsx
// path/to/file.tsx
...original code...
\`\`\`

### After
\`\`\`tsx
// path/to/file.tsx
...new code...
\`\`\`

### Notes
- Follow-ups, gotchas, migration steps, verification performed.
```

If a change spans multiple files, include one before/after block per file under the same entry.

---

## Worked example (reference only — do not delete)

Hypothetical: adding Google Analytics to the site head.

### Before

```tsx
// src/app/layout.tsx
<head>
  <script type="application/ld+json" ... />
</head>
```

### After

```tsx
// src/app/layout.tsx
<head>
  <script type="application/ld+json" ... />
  {GA_MEASUREMENT_ID ? (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=...gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});` }} />
    </>
  ) : null}
</head>
```

The point of the example is to show the **shape** of a well-formed entry. Real entries replace this once a change is made.

---

# Entries

<!-- NEW ENTRIES GO HERE, DIRECTLY BELOW THIS LINE -->
## [2026-10-28] #136 — Smoother bot ⇄ agent handover (no chip.ai reply after an agent joins, honest "connecting", team-busy fallback)
- **Type:** fix
- **Scope:** `src/components/chatbot/Chatbot.tsx`, `src/services/chatwootBridge.ts`, `src/components/chatbot/chatStrings.ts`, `src/services/humanRequest.ts`, `CLAUDE.md`
- **Why:** Amit saw handovers that weren't smooth. Timing gaps: the widget only learnt that an agent had joined on its next poll (up to 10 s), so chip.ai could still answer right after the agent; a chip.ai-failure handover said "Our team from our support team has joined the chat" before anyone had; if nobody picked up, the customer waited in silence; after a page reload the widget didn't poll until the customer typed.
- **Related:** #134, #135; `chip-bridge` now checks Chatwoot on every call and returns `{ mode, waiting, agentName, notice, dropped }`.

### Summary
The bridge's answer to each customer message now says whether an agent has joined; the widget waits up to 1.5 s for it before showing chip.ai's reply and drops the reply (and the bridge keeps it out of Chatwoot) when a person has taken over. A chip.ai-failure handover shows "connecting you to our support team" and only says "<name> has joined" when an agent actually replies. If no agent replies within 3 minutes (`HUMAN_WAIT_MINUTES` on the bridge), chip.ai takes the chat back, the customer sees "Our team is busy right now…" with the Call/WhatsApp/Email card, and the chat is flagged for a call-back. Polling starts as soon as the chat window opens. If the bridge can't be reached while in human mode, chip.ai answers (fail-open).

### Before
```tsx
// Chatbot.tsx
} else {
    void ChatwootBridge.mirror("user", text);   // mode in the answer ignored
}
...
const parsed = await ChatApiService.getResponseWithRetry(text, lang, history);
setMessages(prev => [...prev, { type: "bot", text: parsed.message, ... }]);
...
if (mode === "human") applyMode("human");     // "Our team ... has joined" even if nobody had
...
if (!ChatwootBridge.enabled || !isOpen || !hasConversation) return; // no poll until first message
```

### After
```tsx
mirrored = ChatwootBridge.mirror("user", text);           // BridgeState
...
const parsed = await ChatApiService.getResponseWithRetry(text, lang, history);
if (await agentJoinedMeanwhile()) return;                  // agent joined → chip.ai reply not shown
...
syncMode(st);   // waiting → t.connecting; agent reply → t.agentJoined(name); notice team_busy → t.teamBusy + card
...
if (!ChatwootBridge.enabled || !isOpen) return;            // poll as soon as the chat opens
```

### Notes
- Found from the laptop test logs (Devendra's chat): "i am very unhappy with the responce" wasn't flagged; complaint patterns now include unhappy / not happy / upset / disappointed / frustrated / angry, naraz / pareshan, नाराज़ / परेशान.
- Same logs: every message showed "marked open by system due to an error with the agent bot". Chatwoot 4.x refuses internal webhook addresses, so the website Agent Bot no longer has an outgoing URL (bridge repo; no website change).
- Verified in a browser end-to-end (fake chip.ai + fake Chatwoot): agent replies and the customer types before the next poll → chip.ai's answer is shown neither in the widget nor in Chatwoot, one "Rishab … has joined" line; chip.ai down → "connecting…", no false "joined"; nobody answers → "Our team is busy right now" + card after the wait; `tsc` + eslint clean.

## [2026-10-28] #135 — Chatwoot handover: retries, typed "talk to a person", handover summary, customer details, handback
- **Type:** feature
- **Scope:** `src/services/humanRequest.ts` (new), `src/services/chatwootBridge.ts`, `src/services/chatApiService.ts`, `src/services/chatAuth.ts`, `src/services/chatbot.models.ts`, `src/components/chatbot/Chatbot.tsx`, `CLAUDE.md`
- **Why:** Amit's review of a similar human-in-the-loop design: avoid handing chats to people on one network blip, catch customers who *type* that they want a person, and give the agent the context (who, what, where) at handover.
- **Related:** #134; `chip-bridge` (repo `pockit-chatwoot`) summary notes + running context; backend asks for Sarthak in the hand-over prompt (`PROMPT-for-Sarthak-chip.ai-backend.md`).

### Summary
chip.ai calls are retried (after 2 s and 5 s) before a failure hands the chat to the team. Typed requests for a person in English / Hinglish / Hindi / Marathi behave like the "Talk to a human" chip (card + Chatwoot flag, no chip.ai call); complaints are flagged and chip.ai still answers. chip.ai's reply cards (service / order / pincode / language) and the login profile (email, pincode, city, address when the backend sends them) go to the bridge, which posts a **handover summary** note and keeps a running context in the conversation's attributes. When the team resolves a chat they took over, the agent part of the conversation is sent to chip.ai (`POST /api/v1/chat/handback`, fail-open until the backend adds it). A backend `handoff: true` (+ `handoff_summary`) flags the chat as "chip.ai couldn't help".

### Before
```tsx
// src/components/chatbot/Chatbot.tsx — sendMessage (REST path)
const parsed = await ChatApiService.getResponse(text, lang, history);
...
if (parsed.message) void ChatwootBridge.mirror("bot", parsed.message);
```
```ts
// src/services/chatwootBridge.ts
return u ? { name: u.name, mobile: u.mobile, customer_id: u.customer_id } : undefined;
async handoff(reason: string) { ... post('/web/handoff', { reason }) }
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx — sendMessage
const asked = detectHumanRequest(text);
if (asked === "person") {
    showHandoffCard();
    void ChatwootBridge.handoff("asked_for_person", { quote: text });
    return;
}
if (asked === "complaint") void ChatwootBridge.handoff("complaint", { quote: text });
...
const parsed = await ChatApiService.getResponseWithRetry(text, lang, history);
...
afterBotReply(parsed); // mirror with botMeta(service/order/pincode/lang); flag when parsed.handoff
```
```tsx
// poll: the team resolved a chat they took over -> tell chip.ai what was said
if (r.handback?.length) void ChatApiService.sendHandback(r.handback, langRef.current);
```
```ts
// src/services/chatwootBridge.ts
return u ? { name, mobile, customer_id, email, pincode, city, address } : undefined;
async handoff(reason: FlagReason | string, extra?: { quote?: string; summary?: string | null })
```

### Notes
- Verified: `tsc --noEmit` + eslint clean; browser end-to-end (Playwright, fake chip.ai + fake Chatwoot): typed "mujhe insaan se baat karni hai" → card, 0 chip.ai calls, handover summary note; resolve → handback sent with the agent conversation; chip.ai down → 3 attempts over ~7 s, then live takeover.
- `ChatApiService.normalizeLang` is now public (used for the bridge context).
- Backend follow-ups (not in this repo): return `email` / address in the login user, `handoff` + `handoff_summary` in chat replies, and `POST /api/v1/chat/handback`.

## [2026-10-27] #134 — chip.ai website chats mirrored to Chatwoot, with live agent takeover
- **Type:** feature
- **Scope:** `src/services/chatwootBridge.ts` (new), `src/components/chatbot/Chatbot.tsx`, `src/components/chatbot/chatStrings.ts`, `src/services/chatbot.models.ts`, `src/app/globals.css`, `CLAUDE.md`
- **Why:** The support team (Chatwoot at `chat.pockitengineers.com`) needs to see every chip.ai conversation and take over when chip.ai can't help.
- **Related:** `chip-bridge` service (repo `pockit-chatwoot`, `chip-bridge/web.js`); decisions in CLAUDE.md → "chip.ai ↔ Chatwoot".

### Summary
Every website chat is copied to a Chatwoot API inbox through the `chip-bridge` service. If an agent replies in Chatwoot, or chip.ai fails during support hours (10 AM–7 PM IST), the chat switches to "human" mode: chip.ai stays silent, the agent's replies appear in the same chat window (polling), and visitors who aren't logged in are asked for name + mobile. Resolving the chat in Chatwoot hands it back to chip.ai. "Talk to a human" still shows the Call/WhatsApp/Email card and additionally flags the chat for the team (Chatwoot **High** priority + private note). Everything is behind `NEXT_PUBLIC_CHATWOOT_BRIDGE_URL`; unset (or bridge down) = exactly the previous behaviour.

### Before
```tsx
// src/components/chatbot/Chatbot.tsx — sendMessage (REST path)
        setFollowUpChips([]);
        setIsLoading(true);
        ...
            setFollowUpChips(parsed.followUpChips ?? []);
        } catch {
            setMessages(prev => [...prev, { type: "bot", text: "", isError: true, time: getTime() }]);
            setFollowUpChips(ERROR_CHIPS);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, lang, isLoading]);

// runChip
            case "handoff":
                setFollowUpChips([]);
                setMessages(prev => [...prev, { type: "bot", text: t.handoffIntro, showHumanHandoff: true, time: getTime() }]);
                return;
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx — sendMessage (REST path)
        setFollowUpChips([]);

        // A Pockit agent is handling this chat: send to Chatwoot only, chip.ai stays silent.
        if (chatModeRef.current === "human") {
            const mode = await ChatwootBridge.mirror("user", text);
            if (mode === "bot") applyMode("bot");
            else return;
        } else {
            void ChatwootBridge.mirror("user", text);
        }
        setIsLoading(true);
        ...
            setFollowUpChips(parsed.followUpChips ?? []);
            if (parsed.message) void ChatwootBridge.mirror("bot", parsed.message);
        } catch (err) {
            // chip.ai failed: during support hours the bridge hands the chat to an agent.
            const mode = await ChatwootBridge.handoff(`chip.ai error: ${err instanceof Error ? err.message : "unknown"}`);
            if (mode === "human") {
                applyMode("human");
            } else {
                setMessages(prev => [...prev, { type: "bot", text: "", isError: true, time: getTime() }]);
                setFollowUpChips(ERROR_CHIPS);
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputText, lang, isLoading, applyMode]);

// runChip
            case "handoff":
                setFollowUpChips([]);
                setMessages(prev => [...prev, { type: "bot", text: t.handoffIntro, showHumanHandoff: true, time: getTime() }]);
                // Not a live chat (agreed 2026-10-27): flags the chat in Chatwoot for follow-up.
                void ChatwootBridge.handoff("talk_to_human");
                return;

// New: chatMode state + applyMode() (posts "X has joined" / "chip.ai is back" once per switch),
// a polling effect (4 s in human mode, 10 s in bot mode, only while the chat is open and started),
// an agent label inside agent bubbles, and a name + mobile form above the input in human mode
// for visitors who aren't logged in. WS onDone also mirrors the bot reply (WS is off in prod).
```

```ts
// src/services/chatwootBridge.ts — (new file)
// ChatwootBridge.mirror(role, text) / handoff(reason) / shareContact(name, phone) / poll(after)
// Base URL: NEXT_PUBLIC_CHATWOOT_BRIDGE_URL. Fail-open: any error → null, chatbot unaffected.
// Logged-in customers send { name, mobile, customer_id } from the chat login with every call.
```

```ts
// src/components/chatbot/chatStrings.ts — WidgetStrings (Before)
    handoffIntro: string;
    /** Starter chips for anonymous visitors. */

// (After) — added in English / Hindi / Marathi
    handoffIntro: string;
    /** Live takeover from Chatwoot (see services/chatwootBridge.ts). */
    agentJoined: (name: string) => string;
    botBack: string;
    contactPrompt: string;
    contactName: string;
    contactPhone: string;
    contactSend: string;
    contactThanks: string;
    /** Starter chips for anonymous visitors. */
```

```ts
// src/services/chatbot.models.ts — ChatMessage (Before)
    showHumanHandoff?: boolean;
    order?: OrderCard | null;
// (After)
    showHumanHandoff?: boolean;
    /** Set on replies typed by a Pockit agent in Chatwoot (live takeover). */
    agent?: string;
    order?: OrderCard | null;
```

```css
/* src/app/globals.css — (Before) */
/* ── Handoff banner ── */
/* (After) — new block above it */
/* ── Live takeover (Chatwoot agent replies + visitor contact form) ── */
.cbot-agent-label { ... }  .cbot-contact { ... }  .cbot-contact-title { ... }
.cbot-contact-row { ... }  .cbot-contact-input { ... }  .cbot-contact-send { ... }
```

### Notes
- **Env:** set `NEXT_PUBLIC_CHATWOOT_BRIDGE_URL=https://chat.pockitengineers.com/chip-bridge` on the cPanel build (GitHub secret used by `deploy-cpanel.yml`) and on the Vercel mirror. Leave it unset to ship the code dormant.
- **Bridge side:** the bridge must list the site origins in `WIDGET_ORIGINS` (pockitengineers.com, www., and the Vercel mirror) or the browser blocks the calls (CORS).
- **Verified:** `tsc --noEmit` clean, eslint clean on touched files; end-to-end in a real browser against the dev server with a fake chip.ai + fake Chatwoot: mirroring, "Talk to a human" → High priority + note, agent reply → takeover + agent bubble + contact form, customer message in human mode goes to Chatwoot only (0 chip.ai calls), contact saved as +91…, resolve → chip.ai back, chip.ai failure in hours → takeover instead of error card.
- **Not covered:** WebSocket path is mirrored but untested (WS is disabled in production per CLAUDE.md).

## [2026-10-16] #133 — New `/delete-account` page for Google Play's Data safety form
- **Type:** feature
- **Scope:** `src/app/delete-account/page.tsx` (new), `src/app/sitemap.xml/route.static.ts`, `src/app/[slug]/page.static.tsx`, `sanity/schemas/landingPage.ts`, `src/constants/copy.ts`, `README.md`
- **Why:** Google Play's Data safety form needs a live "Delete account" URL. `https://www.pockitengineers.com/delete-account` returned 404. Without this page, users who uninstalled the app had no way to request deletion.
- **Related:** Play Console → App content → Data safety → Data deletion

### Summary
- **New page:** a static page in the same style as `/privacy-policy` (`ThemeSync`, theme tokens, H2/P/UL helpers). It covers:
  - The app name (Pockit Engineers) and the developer name (`BUSINESS.legalName`).
  - In-app steps: Menu → Delete Account.
  - Requests without the app, by email (prefilled `mailto:` to `BUSINESS.email`) or WhatsApp, verified with an OTP to the registered number.
  - What is deleted and what is kept: invoices and payment records for up to 8 years, open disputes until they are resolved.
- **Route registration:**
  - Added to the sitemap.
  - Added to both `RESERVED_SLUGS` lists, so a Sanity landing page can't claim the slug.
  - Linked from the footer's Support column.

### Before
```ts
// src/app/delete-account/page.tsx
(file did not exist; /delete-account → 404)

// src/constants/copy.ts (FOOTER → Support)
{ label: "Privacy Policy", href: "/privacy-policy" },
{ label: "Terms & Conditions", href: "/terms" },

// src/app/[slug]/page.static.tsx + sanity/schemas/landingPage.ts (RESERVED_SLUGS)
"privacy-policy",
"sitemap.xml",
```

### After
```ts
// src/app/delete-account/page.tsx
export const metadata: Metadata = { title: "Delete Your Account — Pockit Engineers", alternates: { canonical: "/delete-account" }, ... };
export default function DeleteAccountPage() { /* 1. In-app steps · 2. Email/WhatsApp request · 3. Data deleted · 4. Data kept + periods · 5. Before you delete · 6. Contact */ }

// src/constants/copy.ts
{ label: "Privacy Policy", href: "/privacy-policy" },
{ label: "Delete Account", href: "/delete-account" },
{ label: "Terms & Conditions", href: "/terms" },

// src/app/[slug]/page.static.tsx + sanity/schemas/landingPage.ts
"privacy-policy",
"delete-account",

// src/app/sitemap.xml/route.static.ts
{ url: `${SITE_URL}/delete-account`, changeFrequency: "yearly", priority: 0.2 },
```

### Notes
- **Have the business confirm these before submitting to Play.** They are stated as assumptions on the page:
  - The **8-year** retention period for invoices.
  - The **30-day** turnaround for email/WhatsApp requests.
  - **OTP verification** for requests sent by email.
  - Whether deleting **in the app** is immediate.
- The app name "Pockit Engineers" and the developer name "Pockit Technologies Private Limited" must match the Play listing exactly. If they don't, change them on the page.
- The email is `BUSINESS.email` (`support@pockitengineers.com`). `/privacy-policy` lists `itsupport@` instead. That inconsistency already existed and has not been changed.
- The sanity schema change needs `npx sanity deploy` before Studio enforces the new reserved slug. The build-time filter in `[slug]/page.static.tsx` already enforces it.
- `tsc --noEmit` and eslint pass. Not checked in a browser, because no dev server was running.


## [2026-10-15] #132 — chip.ai login: unregistered numbers get "Account not found — register on the app"
- **Type:** feature
- **Scope:** `src/components/chatbot/ChatLogin.tsx`, `src/services/chatAuth.ts`, `src/app/globals.css`
- **Why:** User request. A number with no Pockit account was being "logged in" as a guest ("Your number is verified. I couldn't find a Pockit account…"). It should instead be told the account wasn't found and pointed to the app to register.
- **Related:** chatbot backend `auth_service.send_otp` now checks `/customer/getconfiltcsCustomers/` (read-only) before sending an OTP and returns `404 {detail: {code: "account_not_found", message}}`. `verify_otp` refuses unregistered numbers too.

### Summary
- **New login state:** the panel gains a third state, **Account not found**: "No Pockit account is linked to +91 …. Download the Pockit app to register, then log in here.", with **Google Play** / **App Store** buttons (`PLAY_STORE_URL` / `APP_STORE_URL`) and **Try another number**.
- **Error codes:** `chatAuth` now throws `ChatAuthError` carrying the backend's error `code`, so the panel can tell this case apart from wrong-OTP or rate-limit errors.
- **No wasted OTP:** the check runs **before** any OTP is sent.

### Before
```ts
// src/services/chatAuth.ts
async function readError(res: Response): Promise<string> { ... }      // string only
if (!res.ok) throw new Error(await readError(res));
// src/components/chatbot/ChatLogin.tsx
useState<"details" | "otp">("details")
```

### After
```ts
// src/services/chatAuth.ts
export const ACCOUNT_NOT_FOUND = 'account_not_found';
export class ChatAuthError extends Error { constructor(message: string, readonly code?: string) }
if (!res.ok) throw await readError(res);                               // handles {detail: {code, message}}
// src/components/chatbot/ChatLogin.tsx
useState<"details" | "otp" | "notfound">("details")
} catch (err) { if (isAccountNotFound(err)) return setStep("notfound"); ... }
```

### Notes
- Verified live: `POST /auth/otp/send {"mobile":"9764135647"}` → 404 `account_not_found`, and no WhatsApp message sent. A registered number (9764135683) still gets an OTP. The hardcoded backend test number `8669806792` is **not** registered on pre-prod, so it can no longer log in to the chat.
- Any existing guest chat session (`phone:+91…`) stays valid until its token expires (24 h). Log out to clear it.
- `tsc --noEmit` + eslint clean.

## [2026-10-15] #131 — chip.ai login: remove the Name field
- **Type:** feature
- **Scope:** `src/components/chatbot/ChatLogin.tsx`, `src/services/chatAuth.ts`
- **Why:** User request: login should ask only for the mobile number. The name now comes from the customer's Pockit profile.
- **Related:** chatbot backend `auth_service.verify_otp` reads `NAME` from `POST /api/customer/get` (`AND ID = <customer id>`, same call as the customer app's profile screen) at login.

### Summary
Step 1 of the login panel is now just **Mobile number → Send OTP** (autofocus on the mobile field). `verifyOtp()` no longer sends a name. The backend fills the token's `name` from the customer profile, so the welcome still says "Hi Sarthak 👋". Numbers with no Pockit account (or no profile name) get "Hi 👋".

### Before
```tsx
// src/components/chatbot/ChatLogin.tsx
const [name, setName] = useState("");
if (!name.trim()) return setError("Please enter your name.");
<label htmlFor="cbot-login-name">Name</label>
<input id="cbot-login-name" ... value={name} onChange={e => setName(e.target.value)} autoFocus />
const session = await verifyOtp(mobile, otp, name);
// src/services/chatAuth.ts
export async function verifyOtp(mobile: string, otp: string, name: string, countryCode = '+91')
    { mobile, otp, name: name.trim() || undefined, country_code: countryCode }
```

### After
```tsx
// src/components/chatbot/ChatLogin.tsx — no name state/field; mobile input has autoFocus
const session = await verifyOtp(mobile, otp);
// src/services/chatAuth.ts
export async function verifyOtp(mobile: string, otp: string, countryCode = '+91')
    { mobile, otp, country_code: countryCode } // name comes from the Pockit profile, server-side
```

### Notes
- The backend's optional `name` field on `/auth/otp/verify` stays as a legacy fallback, so older widget builds don't break.
- `tsc --noEmit` + eslint clean. Backend tests cover the profile-name read, including ignoring rows for other IDs.

## [2026-10-15] #130 — chip.ai: personal welcome, action chips, logged-in starters, Hindi/Marathi
- **Type:** feature
- **Scope:** `src/components/chatbot/Chatbot.tsx`, `src/components/chatbot/chatStrings.ts` (new), `src/services/chatApiService.ts`, `src/services/chatbot.models.ts`, `src/app/globals.css`
- **Why:** Make the chat feel personal. Greet logged-in customers with their live order, suggest the next step after every answer, and speak the customer's language.
- **Related:** chatbot backend `welcome_service.py` (`GET /auth/welcome`), `chips.py`, `language.py` (see its `AUTH_MOBILE_OTP.md` → "Personalisation").

### Summary
- **Welcome:** after login the widget calls `GET /auth/welcome` and shows "Hi Sarthak 👋 Your order … is Order Scheduled with Vijay Korate…" with that order's status card and chips. It falls back to the old generic welcome if the call fails.
- **Chips:** follow-up chips are now typed actions (`ChatChip {label, action, value}`): `send`, `locate`, `book`, `call`, `handoff`, `login`, `retry`. They're dispatched by `runChip`. Action chips get a filled style.
- **Human-support card:** gains a WhatsApp button (`whatsappHref`, prefilled with the latest order number; Meta `WhatsAppContact` with location `chatbot`).
- **Error chips:** the reply-failure chips are real actions (call support / talk to a human / retry the last message).
- **Starter chips:** logged-in customers see Track my latest order · Who is my technician? · Show my orders.
- **Language:** a 🌐 English / हिंदी / मराठी picker in the footer (saved per browser) sets the `lang` sent with each message. The greeting, placeholder, starter chips and voice-input locale follow it.

### Before
```tsx
// src/components/chatbot/Chatbot.tsx
const initialChips = ['My laptop is slow', ...];            // same for everyone, English only
const [followUpChips, setFollowUpChips] = useState<string[]>([]);
const [lang] = useState("English");                        // no way to change
{followUpChips.map(chip => <button onClick={() => sendMessage(chip)}>{chip}</button>)}
setFollowUpChips(["Call support", "Send email", "Try again"]); // sent as chat text
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx
const starterChips = authUser?.customer_id != null ? t.customerStarters : t.starters.map(label => ({ label }));
const [followUpChips, setFollowUpChips] = useState<ChatChip[]>([]);
const [lang, setLang] = useState<ChatLanguage>("English");   // footer picker, localStorage
{followUpChips.map(chip => <button onClick={() => runChip(chip)}>{chip.label}</button>)}
setFollowUpChips(ERROR_CHIPS);                                // call / handoff / retry
const welcome = await ChatApiService.getWelcome(lang);       // in handleLoginSuccess
```

### Notes
- Verified live through the real model: the welcome for customer 120 is accurate (Vijay Korate, visit window). A Hindi question returned a Hindi answer with a Hindi service recommendation and Hindi chips. A Marathi pincode question returned a Marathi answer.
- Static UI outside the strings module (login panel, cards, error banner) is still English.
- `tsc --noEmit` + eslint clean.

## [2026-10-15] #129 — chip.ai: order status tracker card, pincode badge, "Do you serve my area?"
- **Type:** feature
- **Scope:** `src/components/chatbot/OrderStatusCard.tsx` (new), `src/components/chatbot/PincodeBadge.tsx` (new), `src/components/chatbot/Chatbot.tsx`, `src/services/chatApiService.ts`, `src/services/chatbot.models.ts`, `src/app/globals.css`
- **Why:** Order and pincode answers were plain sentences. The user wants visual cards and a way to check coverage without knowing the pincode.
- **Related:** chatbot backend `order_card.py`, `serviceability_service.pincode_card`, `geocoding_service.py`, `POST /api/v1/location/pincode` (see its `AUTH_MOBILE_OTP.md` → "Widget cards").

### Summary
Reply frames now carry `order` and `pincode` cards alongside `service`. **OrderStatusCard** renders a vertical progress tracker (Placed → Accepted → Scheduled → Technician visit → Completed) with times, a live "Technician is on the way" banner, visit, service and amount, and a technician row with initial avatar, ★ rating and a green **Call** button (`tel:`, active orders only). **PincodeBadge** is green "✓ We serve 400093 · Mumbai East · Onsite 10:00 AM – 7:00 PM" or grey "✕ Not yet available in 422602 · Sangamner…". A new starter chip, **📍 Do you serve my area?**, gets the browser location, asks the chatbot for the pincode, then sends "Do you provide service at my location, pincode …?", so the badge comes through the normal answer path. Cards persist with the transcript (#128).

### Before
```ts
// src/services/chatApiService.ts
callbacks.onDone(ChatApiService.shapeResponse({ message: data.content, service: data.service }));
// src/components/chatbot/Chatbot.tsx — only the service card rendered under bot bubbles
```

### After
```ts
// src/services/chatApiService.ts
callbacks.onDone(ChatApiService.shapeResponse({ ...data, message: data.content })); // service + order + pincode
static async locatePincode(lat: number, lng: number): Promise<{ pincode: string; area?: string | null }>
// src/components/chatbot/Chatbot.tsx
{msg.type === "bot" && !msg.isError && msg.order && <OrderStatusCard order={msg.order} accent={accent} />}
{msg.type === "bot" && !msg.isError && msg.pincode && <PincodeBadge card={msg.pincode} />}
<button className="cbot-chip cbot-chip-locate" onClick={checkMyArea}>📍 Do you serve my area?</button>
```

### Notes
- The PockIT backend's `/getPincodes` was **not** used: it returns push-channel names, not the pincode, and subscribes the caller to promotion channels. The chatbot reverse-geocodes itself (Google if `GOOGLE_MAPS_API_KEY` is set, else OpenStreetMap).
- Geolocation needs a secure context (https or localhost). Denied permission gets a friendly "type your pincode" note.
- Verified live: the 00533 card shows Placed ✓ / Accepted ✓ / Scheduled ● with technician Vijay Korate. The 400093 badge shows Mumbai East. Andheri coordinates → 400059. `tsc --noEmit` + eslint clean.

## [2026-10-15] #128 — chip.ai: formatted bot replies + chat survives reloads
- **Type:** feature + fix
- **Scope:** `src/components/chatbot/ChatMarkdown.tsx` (new), `src/services/chatTranscript.ts` (new), `src/components/chatbot/Chatbot.tsx`, `src/app/globals.css`
- **Why:** Bot replies showed raw `**bold**` / `- list` Markdown. A reload or page change wiped the conversation.
- **Related:** chatbot backend formats all tool dates/times before the model sees them (`app/services/display_format.py`), so replies say "14 Oct 2026, 6:43 PM", not "18:43".

### Summary
Bot bubbles now render the Markdown subset the model uses: bold, italic, code, bullet and numbered lists, headings and links. Phone numbers and emails auto-link to `tel:` / `mailto:`. The renderer builds React elements only, with no `dangerouslySetInnerHTML`, and links are limited to http(s), tel and mailto. It's ~3 KB instead of adding react-markdown (~40 KB) to the deferred chatbot chunk. The transcript, including service cards, is saved to localStorage: 24 h, last 60 messages, no streaming or error bubbles. Open/closed state is saved to sessionStorage, so the chat reappears where the customer left it. Reset clears it. Log out clears it too, because a transcript can contain order details.

### Before
```tsx
// src/components/chatbot/Chatbot.tsx
{msg.text}
...
const resetChat = () => {
    setMessages([]);
...
const handleLogout = async () => {
    await logoutChat();
    setMessages(prev => [...prev, { type: "bot", text: "You've been logged out.", time: getTime() }]);
};
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx
{msg.type === "bot" ? <ChatMarkdown text={msg.text} /> : msg.text}
...
// restore once, then save on every settled change (`restored` is state so the
// first empty render can't overwrite the stored transcript)
useEffect(() => { const saved = loadTranscript(); if (saved.length) setMessages(saved);
                  if (loadOpenState()) { setIsOpen(true); setHasOpened(true); } setRestored(true); }, []);
useEffect(() => { if (!restored || messages.some(m => m.isStreaming)) return; saveTranscript(messages); }, [messages, restored]);
useEffect(() => { if (restored) saveOpenState(isOpen); }, [isOpen, restored]);
...
const resetChat = () => {
    clearTranscript();
    setMessages([]);
...
const handleLogout = async () => {
    await logoutChat();
    clearTranscript();
    setFollowUpChips([]);
    setMessages([{ type: "bot", text: "You've been logged out, and this conversation has been cleared.", time: getTime() }]);
};
```

### Notes
- Why client-side storage rather than the backend's `/api/v1/history/{session_id}`: that history lacks service cards. The backend Redis session also expires after ~8 min idle and issues a new session_id, so the old history would be unreachable.
- Known gap: after the backend session expires (`REDIS_SESSION_TTL=500` s), the customer still *sees* the old conversation but the bot no longer has it as context. Raise `REDIS_SESSION_TTL` on the chatbot if follow-up questions after a long pause matter.
- The chatbot mounts lazily (`ChatbotMount`, first interaction or 5 s), so a restored open chat appears at that point, not at first paint.
- Verified: `tsc --noEmit` + eslint clean. `renderToStaticMarkup` of a real bot reply produced correct `<strong>/<em>/<ul>/<a href="tel:…">/<a href="mailto:…">`, and an injected `<script>` came out as escaped text.

## [2026-10-14] #127 — chip.ai: recommended-service card on problem replies; fix dead "Book Now"
- **Type:** feature + fix
- **Scope:** `src/services/chatApiService.ts`, `src/services/chatbot.models.ts`, `src/components/chatbot/Chatbot.tsx`, `src/app/globals.css`
- **Why:** User wants the bot to suggest a service when a customer describes a problem ("my laptop is not charging"). Before, it only asked a diagnostic question. The chatbot backend now runs a `recommend_services` tool and sends the matched service with the reply. The widget already had a service-card UI but never received data, and its "Book Now" linked to a non-existent `/book` route.
- **Related:** chatbot backend `app/services/service_catalog.py` (knowledge-base catalogue, semantic match, `pick_card`)

### Summary
The final WS `message` frame now carries `service: {id, name, category, price, duration, mode, warranty}`. `ChatApiService` passes it to `onDone`, so the existing card renders under the reply. The card header shows the category instead of `ID #<n>`. "Book Now" now uses `useBookServiceNav`, the same destination as the header "Book a Service": the app store on phones, `#download` on desktop. It's a `<button>` because the hook navigates and the Next lint rule forbids `<a href="/…">`.

### Before
```tsx
// src/services/chatApiService.ts
callbacks.onDone(ChatApiService.shapeResponse({ message: data.content }));
// src/components/chatbot/Chatbot.tsx
<span>ID #{msg.service.id}</span>
...
<a className="cbot-book-btn" href={`/book?serviceId=${msg.service.id}`}>Book Now →</a>
```

### After
```tsx
// src/services/chatApiService.ts
callbacks.onDone(ChatApiService.shapeResponse({ message: data.content, service: data.service }));
// src/components/chatbot/Chatbot.tsx
{msg.service.category && <span>{msg.service.category}</span>}
...
<button type="button" className="cbot-book-btn" onClick={bookService}>Book Now →</button>
// src/app/globals.css — .cbot-book-btn gains width:100%; border:none; cursor:pointer; font-family:inherit
```

### Notes
- Backend source is the knowledge-base `services` list (80 entries). The PockIT backend catalogue endpoints (`/order/getServices/`, `/order/getServicesForWeb/`) require territory + sub-category and can't search by symptom. Verified live: both return "parameter missing- teritory_id, subcategory_id".
- Verified live through the real model: "my laptop is unable to charging" → recommends Battery Replacement (₹499) / Laptop Health Check (₹299); card = Battery Replacement. "Printer paper jam" → Paper Jam & Feed Repair (₹599).
- `tsc --noEmit` + eslint clean.

## [2026-10-14] #126 — chip.ai WebSocket: render streamed replies, stop hiding the first answer
- **Type:** fix
- **Scope:** `src/services/chatApiService.ts`
- **Why:** The widget's WS handler didn't match what the chatbot backend actually sends. Streamed text never showed, and the first real reply was hidden. That breaks the new logged-in order lookups (#125 follow-up), whose answer is usually the first reply.
- **Related:** chatbot backend now answers order questions for logged-in customers (status, schedule, technician, payment). See `AUTH_MOBILE_OTP.md` → "Order lookups" in that repo.

### Summary
The backend streams `{type:"message_chunk", content}` frames and then a final `{type:"message", role:"assistant", content}`. The widget only handled `token`/`done`. It also threw away the first assistant `message` as a "greeting", but the backend sends no greeting on connect. The widget now streams `message_chunk` into the bubble and treats every assistant `message` as a real reply. `token` is kept for compatibility.

### Before
```ts
// src/services/chatApiService.ts
let initialGreetingSwallowed = false;
...
case 'message':
    if (data.role === 'assistant') {
        if (!initialGreetingSwallowed) { initialGreetingSwallowed = true; break; }
        callbacks.onDone(ChatApiService.shapeResponse({ message: data.content }));
    }
    break;
case 'token':
    callbacks.onToken(data.token);
    break;
```

### After
```ts
// src/services/chatApiService.ts
case 'message':
    if (data.role === 'assistant') {
        callbacks.onDone(ChatApiService.shapeResponse({ message: data.content }));
    }
    break;
// Backend sends `message_chunk`; `token` kept for older builds.
case 'message_chunk':
    callbacks.onToken(data.content);
    break;
case 'token':
    callbacks.onToken(data.token);
    break;
```

### Notes
- The backend side was fixed in the same pass. It now reads `message` out of the widget's JSON frame `{message, lang, history, clientId}`; before, it treated the whole JSON string as the user's text. It also ignores the `{type:"auth"}` frame the widget sends on open.
- Verified: `tsc --noEmit` + eslint clean. Backend order tools exercised live against pre-prod for a logged-in customer.

## [2026-10-14] #125 — chip.ai chatbot: mobile-number + OTP login
- **Type:** feature
- **Scope:** `src/services/chatAuth.ts` (new), `src/components/chatbot/ChatLogin.tsx` (new), `src/components/chatbot/Chatbot.tsx`, `src/services/chatApiService.ts`, `src/app/globals.css`
- **Why:** User wants customers to log in inside the chatbot with name + mobile number, verified by OTP against the PockIT customer backend, so chats are tied to a real Pockit customer.
- **Related:** chatbot backend repo `pockit-customersupport-chatbot-backendonly`: new `/api/v1/auth/otp/send|verify|me|logout` endpoints, documented in its `AUTH_MOBILE_OTP.md`

### Summary
The chat header gets a **Login** pill. It opens an in-widget panel: name + 10-digit mobile → "Send OTP" (delivered on WhatsApp by the PockIT backend) → OTP → "Verify & continue". On success the chatbot backend returns its own access token, which `ChatApiService` now prefers over the anonymous Firebase ID token for REST and WebSocket calls. The WebSocket reconnects so the conversation is bound to `pockit:<customer_id>`. Logged-in visitors see "Logged in as …" and a log-out icon. Anonymous chat keeps working unchanged ("Continue without login").

### Before
```ts
// src/services/chatApiService.ts
const token = await firebaseAuthHelper.getIdToken();          // buildHeaders + _openSocket
...
static getClientId(): string {
    const KEY = 'pockit_chat_client_id';
```

### After
```ts
// src/services/chatApiService.ts
private static async getAuthToken(): Promise<string> {
    const loginToken = getChatAccessToken();
    if (loginToken) return loginToken;
    return firebaseAuthHelper.getIdToken();
}
...
static getClientId(): string {
    // One client id per identity: the backend binds a session to the user
    // that created it, so an anonymous session can't be reused after login.
    const loggedInUser = getChatSession()?.user.user_id;
    const KEY = loggedInUser ? `pockit_chat_client_id:${loggedInUser}` : 'pockit_chat_client_id';
```

### Before
```tsx
// src/components/chatbot/Chatbot.tsx — header
<p className="cbot-sub">Your Personal Tech Assistant</p>
...
<div className="flex flexdirection-row gap-3">
    <button className="cbot-close-btn" onClick={resetChat} aria-label="Reset">…</button>
...
}, [isOpen]);   // WS effect
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx — header
<p className="cbot-sub">
    {authUser ? `Logged in as ${authUser.name || authUser.mobile}` : "Your Personal Tech Assistant"}
</p>
...
{authUser
    ? <button className="cbot-close-btn" onClick={handleLogout} aria-label="Log out">…</button>
    : <button className="cbot-login-btn" onClick={() => setShowLogin(v => !v)}>… Login</button>}
...
{showLogin ? <ChatLogin accent={…} onSuccess={handleLoginSuccess} onCancel={…} /> : (<> messages + input </>)}
...
}, [isOpen, authUser?.user_id]);   // reconnect on login/logout
```

### After (new files)
```ts
// src/services/chatAuth.ts — sendOtp(), verifyOtp(), logoutChat(), getChatSession(),
// getChatAccessToken(), onChatSessionChange(). Session in localStorage `pockit_chat_auth`
// (+ in-memory fallback), dropped 60s before expiry.
// src/components/chatbot/ChatLogin.tsx — two-step form (details → OTP), resend countdown,
// "Change number", "Continue without login".
// src/app/globals.css — .cbot-login-btn and .cbot-login-* rules, accent via --cbot-accent.
```

### Notes
- Needs the chatbot backend running with `POCKIT_BACKEND_*` + `CHATBOT_JWT_SECRET` set. Locally `NEXT_PUBLIC_API_BASE=http://localhost:8000` (`.env.development.local`).
- The PockIT backend returns an empty name at OTP login, so the name typed in the form is used for display (sent as `name` to `/auth/otp/verify`). It is **not** saved to the customer record.
- Numbers with no Pockit account still log in (`phone:+91…` identity, `is_registered: false`). The chatbot never creates accounts.
- No GA4 events added for login yet.
- Verified: `tsc --noEmit` clean, eslint clean on touched files. Not yet clicked through in a browser.

## [2026-10-14] #124 — Long-form "Read More" SEO block on /desktop-repair-mumbai
- **Type:** content
- **Scope:** Sanity doc `desktop-repair-mumbai`, `BLOG_TASKS.md`
- **Why:** Fourth service page in the Mumbai programme gets the collapsible supporting copy shipped in #087.
- **Related:** follows `/macbook-repair-mumbai` (#087), `/laptop-repair-mumbai` (#093), `/instant-it-help-mumbai` (#097)

### Summary
**No code changed.** The copy supplied as `Desktop repair content .pdf` was
authored straight into Sanity as 68 Portable Text blocks and picked up by the
existing `SeoContentSection` renderer, so the page gained a "Read More" block
with nothing to deploy beyond a rebuild. One new shape for this programme: the
deck's **price table**, which the Portable Text schema cannot express, so it
renders as a bulleted price list instead.

### Before

```jsonc
// Sanity: landingPage "desktop-repair-mumbai"
{
  "_id": "desktop-repair-mumbai",
  "title": "Computer Repair in Mumbai | Desktop Repair Experts | Pockit Engineers",
  "faqs": [ /* 9 items */ ]
  // no seoContent field
}
```

### After

```jsonc
// Sanity: landingPage "desktop-repair-mumbai"
{
  "_id": "desktop-repair-mumbai",
  "title": "Computer Repair in Mumbai | Desktop Repair Experts | Pockit Engineers",
  "faqs": [ /* 9 items, unchanged */ ],
  "seoContent": [
    { "style": "h2", "children": [{ "text": "Desktop Repair in Mumbai at Your Doorstep" }] },
    /* 1 opening paragraph */
    { "style": "h3", "children": [{ "text": "Common Desktop Computer Problems We Diagnose and Repair" }] },
    /* 2 paragraphs, 8 bullets, 1 paragraph */
    { "style": "h3", "children": [{ "text": "Fast & Reliable Desktop Repair in Mumbai with On-Site Support" }] },
    /* 3 paragraphs, 3 numbered-style bullets, 1 paragraph */
    { "style": "h3", "children": [{ "text": "Why Choose Pockit Engineers for Desktop Repair in Mumbai" }] },
    /* 1 paragraph, 6 bullets, 1 paragraph */
    { "style": "h3", "children": [{ "text": "Fix Slow Computers, Startup Errors & Desktop Performance Issues" }] },
    /* 2 paragraphs, 5 bullets, 2 paragraphs */
    { "style": "h3", "children": [{ "text": "Affordable Computer Repair in Mumbai for Home & Office Users" }] },
    /* 1 paragraph, 7 price bullets, 3 paragraphs */
    { "style": "h3", "children": [{ "text": "Frequently Asked Questions About Desktop Repair in Mumbai" }] }
    /* 7 Q&A pairs */
  ]
}
```

### Before

```md
<!-- BLOG_TASKS.md -->
- [ ] Author a *distinct* block for the remaining service pages: `/desktop-repair-mumbai`, `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
```

### After

```md
<!-- BLOG_TASKS.md -->
- [x] `/desktop-repair-mumbai` block authored (CHANGELOG #124) — 68 blocks, 6 H3 sub-sections, 29 ticked bullets (incl. the price table as bullets), 7 Q&A pairs. Content-only; no code change needed
- [ ] Author a *distinct* block for the last service page: `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
- [ ] **Decision for the user:** the desktop copy deck proposes a new meta title and H1 that differ from what's live. Not applied — #124 was scoped to the hidden block only
```

### Notes
- **The price table became a bulleted list.** `landingPage.seoContent` allows
  only `normal`/`h2`/`h3` blocks and a bullet list — there is no table type, and
  adding one would mean a schema change plus `npx sanity deploy` plus a new
  serializer in `seoContentComponents`. The seven rows render as
  `**Service** — starts from ₹499`, which reads correctly on mobile (where a
  two-column table would have been the worse outcome anyway). **The figures were
  cross-checked against the document's own `services[].priceFrom` and match
  exactly** (499 / 499 / 499 / 499 / 599 / 699 / 999), so the hidden block and
  the visible pricing cards cannot drift apart today. If one is edited later,
  edit both.
- **The deck's numbered list became bullets** (`**1. Book in the app**: …`), for
  the same reason — the schema registers `lists: [{ value: "bullet" }]` only.
  The ordinal is carried in the text so the sequence still reads.
- **Not applied: the deck's new meta title and H1.** It proposes
  `Desktop Repair in Mumbai | PC & Computer Repair at Home | Pockit` and an H1 of
  `Desktop Repair in Mumbai at Your Doorstep`; the page currently runs
  `Computer Repair in Mumbai | Desktop Repair Experts | Pockit Engineers` and an
  H1 of `Computer Repair in Mumbai`. Changing those alters the **visible** page
  and its search snippet, which is outside "add the hidden block" — flagged to
  the user and parked in `BLOG_TASKS.md` instead. Because they differ, the
  deck's H1 was free to become the block's H2 without duplicating the live H1.
- **The `Meta title -` / `Meta description -` / `H1-` label lines were dropped**
  from the block; they are instructions to the editor, not body copy. Same call
  as #093/#097.
- **Source H2s became H3s**, the single H2 staying the block title — the house
  pattern since #087. The deck's own `Label: explanation` bullets already match
  the established bolded-lead-in idiom, so unlike #097 nothing had to be
  reshaped.
- Straight apostrophes and quotes normalised to typographic ones (the deck's
  error-message quotes — "No bootable device", "CMOS checksum error" — are now
  curly), matching #093/#097.
- **Known overlap, accepted.** Two of the deck's seven Q&As sit close to live
  accordion items: "Do you offer doorstep computer repair services in Mumbai?"
  against "Can you repair my desktop at home or office?", and "Do you provide
  desktop computer upgrades?" against "Can you upgrade my desktop instead of
  replacing it?". Neither is a verbatim repeat and each targets a different
  query, so both were kept — unlike #097, where one question was word-for-word
  identical and got dropped. The three-step "How our desktop repair works"
  bullets likewise restate the visible `process` section in keyword-richer
  prose. Flagged so a future pass doesn't read these as accidents.
- **Distinct copy per page, deliberately.** Shares no sentences with the MacBook,
  Laptop or IT-support blocks — duplicate long-form text across indexed URLs
  makes them compete (the constraint recorded in `CLAUDE.md`).
- The block's Q&As do **not** reach the generated `FAQPage` JSON-LD — only the
  `faqs` field does. `/desktop-repair-mumbai` is one of the five slugs carrying
  hand-authored `SERVICE_PAGE_SCHEMA` anyway (#077), so its markup is unchanged
  by this entry.
- **Verified:** clean `rm -rf .next && npm run build:static`, real exit code 0.
  In `out/desktop-repair-mumbai.html` the markers appear in this order: the FAQ
  heading → the last visible FAQ question ("Why choose Pockit for desktop
  repair?") → the `Read More` pill → the block H2 → the first H3 → the price
  bullets → the last Q&A → the visible CTA "Ready to fix it today?", with the
  block inside a `height:0px` wrapper. The other three blocks are untouched —
  `macbook`, `laptop` and `instant-it-help` still carry exactly one `Read More`
  each; `printer-repair-mumbai` and `index.html` carry none.
- The write went to the published document (no draft existed and none was left
  behind), so a rebuild is all that is needed — the `deploy-cpanel.yml` Action
  also fires on the Sanity publish webhook.

---

## [2026-10-06] #123 — Revert the app-popup / Login / "Book a Service" feature to its pre-Sep-24 state
- **Type:** refactor
- **Scope:** `src/lib/appPopup.ts` (removed), `src/components/landing/LoginModal.tsx` (removed), `src/hooks/useBookServiceNav.ts` (restored), `src/components/landing/{Header,Footer,Hero,WhatsAppFloat}.tsx`, `src/components/landing-pages/LandingPageView.tsx`, `src/components/chatbot/Chatbot.tsx`, `src/app/globals.css`, `src/constants/copy.ts`, `src/lib/metaPixel.ts`, `sanity/schemas/landingPage.ts`, `docs/ANALYTICS.md`, `docs/LANDING_PAGES.md`
- **Why:** At the user's request, remove Deven Randive's 7 commits from 2026-09-24 → 2026-10-01 (the login popup, shared app-popup infra, header/footer/hero/landing "Book a Service" CTA rewiring, `useBookServiceNav` removal, and the Oct-1 chatbot scroll-gating revert). Because SarthakE1211's two later commits (`a9e62e8` Meta `book_service_open` event, `34966c3` `my.pockitengineers.com` login link) were built *entirely* on top of that feature, their feature-dependent code was removed in the same pass.

### Summary
The entire app-popup / login-modal / "Book a Service" CTA feature introduced across commits `a9e6d8e`…`2dfd310` (plus its two SarthakE1211 extensions) is rolled back. Each affected **code** file was restored to its `7f98888` (2026-09-17) state — the last commit before the feature began — which guarantees an internally-consistent pre-feature snapshot (type-check passes, no dangling imports). SarthakE1211's unrelated interleaved commit `db9e0c9` ("hidden section below FAQ on insta-IT-help page") is preserved: `docs/LANDING_PAGES.md` was restored to the `db9e0c9` state (not `7f98888`) so its doc addition survives, and `BLOG_TASKS.md` was left untouched.

### Before
\`\`\`
src/lib/appPopup.ts            — openAppPopup / handleAppLinkClick / openAppLink / appLinkAttrs
src/components/landing/LoginModal.tsx — 390×844 scaled iframe popup, Esc/✕ close
Header/Footer/Hero/WhatsAppFloat/LandingPageView — wired to appLinkAttrs + handleAppLinkClick
src/hooks/useBookServiceNav.ts — (deleted in #… by 72792e8)
src/lib/metaPixel.ts           — book_service_open custom Meta event
\`\`\`

### After
\`\`\`
src/lib/appPopup.ts            — (file removed)
src/components/landing/LoginModal.tsx — (file removed)
Header/Footer — restored to useBookServiceNav() onClick wiring (7f98888)
Hero/WhatsAppFloat/LandingPageView/Chatbot/globals.css/copy.ts — restored to 7f98888
src/hooks/useBookServiceNav.ts — restored (7f98888)
src/lib/metaPixel.ts           — restored to 7f98888 (book_service_open helper removed)
\`\`\`

### Notes
- Done on branch `revert-deven-sep24-onward`; backup tag `backup/pre-revert-deven-34966c3` points at the pre-revert HEAD. `main` is untouched until the user merges.
- Historical CHANGELOG entries for the reverted features (#094–#122 app-popup items) are **kept** as an append-only ledger per project rule #2; this entry records the rollback rather than deleting them.
- **CLAUDE.md follow-up required:** the "Header CTAs", "App popup is shared", and related locked decisions (#099/#102/#103/#104/#105/#111/#121/#122) now describe removed behaviour. Not auto-edited here because CLAUDE.md had a concurrent intentional user edit; flagged to the user for a decision.
- Verification: `npx tsc --noEmit` → 0 errors; `grep` for `appPopup`/`LoginModal`/`handleAppLinkClick` → no dangling references.

## [2026-10-06] #122 — Header "Login" becomes a real link so GTM counts it with "Book a Service"
- **Type:** feature
- **Scope:** `src/lib/appPopup.ts`, `src/components/landing/Header.tsx`, `docs/ANALYTICS.md`, `CLAUDE.md`
- **Why:** The marketing team's GTM conversion matches `Click URL` contains `my.pockitengineers.com`. The desktop "Login" was a `<button>` with no URL, so GTM couldn't see it. The user chose to count Login in the same combined GTM number.

### Summary
Desktop header "Login" is now an `<a href={HEADER.loginHref}>`. It looks and behaves the same (popup on desktop, new tab on Cmd/Ctrl-click). The open logic of `handleAppLinkClick` was extracted into a new `openAppLink` helper that does **not** fire Meta's `book_service_open`. So Login is visible to GTM but stays out of the Meta booking funnel (#121).

### Before
```ts
// src/lib/appPopup.ts
    trackBookServiceOpen(location);

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    openAppPopup();
}
```

### After
```ts
// src/lib/appPopup.ts
    trackBookServiceOpen(location);

    openAppLink(e, href);
}

export function openAppLink(e: MouseEvent<HTMLAnchorElement>, href: string | undefined) {
    if (!isPockitAppHref(href)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    openAppPopup();
}
```

### Before
```tsx
// src/components/landing/Header.tsx
<button
    type="button"
    onClick={openAppPopup}
    ...
>
    {HEADER.loginLabel}
</button>
```

### After
```tsx
// src/components/landing/Header.tsx
<a
    href={HEADER.loginHref}
    {...appLinkAttrs(HEADER.loginHref)}
    onClick={(e) => openAppLink(e, HEADER.loginHref)}
    ...
>
    {HEADER.loginLabel}
</a>
```

### Notes
- GTM trigger: Click – Just Links, `Click URL` contains `my.pockitengineers.com`, **Check Validation OFF**. Drop the earlier suggested `Click Text does not contain Login` condition, since Login is now meant to be counted.
- The mobile-drawer Login was already an `<a href>` to the app, so it was already visible to GTM.
- Meta `book_service_open` unchanged: Login still doesn't fire it.

## [2026-10-05] #121 — Meta conversion on every "Book a Service" CTA, fired from the app-popup choke point
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `src/lib/appPopup.ts`, `src/components/landing/{Header,Footer,Hero,WhatsAppFloat}.tsx`, `src/components/landing-pages/LandingPageView.tsx`, `docs/ANALYTICS.md`, `CLAUDE.md`
- **Why:** User asked for a Meta event on the "Book a Service" button everywhere it appears, firing when the app screen actually opens.
- **Related:** builds on #099 (shared app popup), #084 (conversions fire on outcome)

### Summary
A new `book_service_open` custom event fires whenever a "Book a Service" CTA actually opens the Pockit web app. It is wired **once**, inside `handleAppLinkClick` — the single helper every app CTA already routes through — rather than as an `onClick` on each of the seven buttons. That covers all current surfaces and any future CTA wired with the standard helpers, with no chance of a new button silently going untracked. Each call site passes a `location` so the surfaces stay distinguishable in Ads Manager.

### Before
```ts
// src/lib/appPopup.ts
export function handleAppLinkClick(e: MouseEvent<HTMLAnchorElement>, href: string | undefined) {
    if (!isPockitAppHref(href)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    openAppPopup();
}
```

```tsx
// src/components/landing/Hero.tsx (representative of all 7 call sites)
onClick={(e) => {
    trackEvent(AnalyticsEvents.CtaBookService, { location: "hero" });
    handleAppLinkClick(e, HEADER.loginHref);
}}
```

```ts
// src/lib/metaPixel.ts — no booking event existed
export function trackAppStoreClick(location?: string): void {
    trackCustom("AppStoreClick", { ...(location ? { location } : {}) });
}
```

### After
```ts
// src/lib/appPopup.ts
import { trackBookServiceOpen } from "@/lib/metaPixel";

export function handleAppLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
    href: string | undefined,
    location?: string,
) {
    if (!isPockitAppHref(href)) return;

    // Past this line the app opens one way or another, so the conversion is
    // real. Fired BEFORE the modifier/viewport bail-outs below, which hand the
    // click to the browser rather than cancelling it.
    trackBookServiceOpen(location);

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    openAppPopup();
}
```

```tsx
// src/components/landing/Hero.tsx — call sites only gain a location label
onClick={(e) => {
    trackEvent(AnalyticsEvents.CtaBookService, { location: "hero" });
    handleAppLinkClick(e, HEADER.loginHref, "hero");
}}
```

```ts
// src/lib/metaPixel.ts
export function trackBookServiceOpen(location?: string): void {
    trackCustom("book_service_open", { ...(location ? { location } : {}) });
}
```

### Coverage
| Surface | File | `location` |
| --- | --- | --- |
| Header "Book a Service" (desktop) | `Header.tsx` | `header` |
| Footer "Book a Service" | `Footer.tsx` | `footer` |
| Home hero "Book now" | `Hero.tsx` | `hero` |
| Floating orange book pill | `WhatsAppFloat.tsx` | `float` |
| Landing hero primary | `LandingPageView.tsx` | `landing-hero` |
| Landing hero secondary | `LandingPageView.tsx` | `landing-hero-secondary` |
| Landing footer banner | `LandingPageView.tsx` | `landing-footer-banner` |

### Notes
- **Fires on outcome, not intent (#084).** The event sits past the `isPockitAppHref` guard, so a press that does nothing never counts. It sits *before* the modifier-key and viewport bail-outs, because those hand the click to the browser (new tab) rather than cancelling it — the app still opens, so the conversion is still real. All three routes (desktop popup, mobile new tab, modifier-click new tab) report exactly once.
- **The header "Login" button is deliberately excluded.** It calls `openAppPopup()` directly instead of going through the href helpers, so returning users signing in never pollute the booking funnel. Hooking the event into `openAppPopup()` would have swept Login in — that's why the seam is `handleAppLinkClick`, not the popup opener.
- **Name does NOT match GA4's `cta_book_service`, on purpose.** They are different triggers: GA fires on click from only two surfaces (`Hero`, `WhatsAppFloat`), Meta fires on app-open from all seven. Sharing a name across dashboards that count different things would be worse than two names. This is a deliberate departure from the #085 precedent, which only matched names because both fired from the identical moment.
- **Known gap left alone:** the Header and Footer "Book a Service" CTAs still fire *no* GA event at all — they never did. Closing that would mean moving GA into the same choke point, which would double-fire on `Hero`/`WhatsAppFloat` and add `cta_book_service` to landing pages that currently report `landing_cta_click`. Out of scope here; flagged for a decision.
- The landing-page *secondary* hero CTA is included because it is an app href and does open the app; its Sanity-authored label may not read "Book a Service". `location` keeps it separable if it ever needs excluding.
- Verified: `npx tsc --noEmit` clean; full `npm run build:static` succeeds; confirmed in the compiled bundle that the helper emits `i("book_service_open",{...e?{location:e}:{}})` and that all seven labels reach the call sites. The 3 remaining eslint problems (`Header.tsx:41`, `Footer.tsx:29`, `LandingPageView.tsx:459`) are pre-existing and outside every line this change touched.


## [2026-10-01] #120 — Revert chatbot scroll-gating: keep the launcher always visible
- **Type:** fix
- **Scope:** `src/components/chatbot/Chatbot.tsx`, `src/components/landing/AppShell.tsx`
- **Why:** User wants the earlier behavior back: the Chip.ai launcher shown constantly on the home page, with only WhatsApp + "Book a service" revealing on scroll (the launcher still lifts into line when they appear). Reverts #117.
- **Related:** #115, #116, #117, #118, #119

### Summary
Removed the home-page scroll gate added in #117: deleted the `scrollHidden` state and its MutationObserver
from the chatbot, restored the FAB render condition to `{!isOpen && mounted && ...}`, and dropped the
`is-home` body-class effect from AppShell. The chatbot is visible again at the top of the home page. The
`.cbot-fab-lift` / `body.floats-visible` lift from #115/#116 stays, so the launcher still slides up in line
when the float stack appears on scroll. The label constant (#118/#119) is kept.

### Before
```tsx
// Chatbot.tsx
const [scrollHidden, setScrollHidden] = useState(false);
useEffect(() => { /* MutationObserver on body: is-home && !floats-visible */ }, []);
{!isOpen && mounted && !scrollHidden && ( <motion.div ...> )}

// AppShell.tsx
useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
}, []);
```

### After
```tsx
// Chatbot.tsx — gate removed
{!isOpen && mounted && ( <motion.div ...> )}

// AppShell.tsx — no is-home effect
export default function AppShell() {
    return ( <motion.main ...> );
}
```

### Notes
- Net home-page behavior: chatbot always visible → on scroll, WhatsApp + Book appear and the chatbot lifts to sit above them in one column.
- `floats-visible` (WhatsAppFloat) + `.cbot-fab-lift` (globals.css) are still the lift contract; only the visibility gate was removed.

## [2026-10-01] #119 — Move the Chip.ai launcher label into a copy constant
- **Type:** refactor
- **Scope:** `src/constants/copy.ts`, `src/components/chatbot/Chatbot.tsx`
- **Why:** User wants the "Chat with Chip.ai" label as a constant, following the project's single-source-of-truth copy pattern, rather than hardcoded in the component.
- **Related:** #118

### Summary
Added a `CHATBOT` export to `copy.ts` with `fabLabel: "Chat with Chip.ai"` and referenced it from the
launcher. The chatbot previously imported nothing from `copy.ts`; this is the first string pulled out — more
can follow the same way if wanted.

### Before
```tsx
// src/components/chatbot/Chatbot.tsx
// (no copy import)
<motion.span ...>Chat with Chip.ai</motion.span>
```

### After
```ts
// src/constants/copy.ts
export const CHATBOT = {
    fabLabel: "Chat with Chip.ai",
};
```
```tsx
// src/components/chatbot/Chatbot.tsx
import { CHATBOT } from "@/constants/copy";
<motion.span ...>{CHATBOT.fabLabel}</motion.span>
```

### Notes
- Other hardcoded chatbot strings ("chip.ai by Pockit · Powered by AI", greeting, starter chips) are still inline; left untouched to keep scope tight. Can be migrated into `CHATBOT` on request.

## [2026-10-01] #118 — Show the "Chat with Chip.ai" label like the WhatsApp/Book pills
- **Type:** fix
- **Scope:** `src/components/chatbot/Chatbot.tsx`
- **Why:** The Chip.ai launcher didn't reveal its label the way WhatsApp/Book do. Those use `showLabel = expanded || isMobile` (label on mobile always + desktop hover); the FAB used `expanded && !isMobile`, so it never showed a label on mobile. Label casing was also "chip.ai".
- **Related:** #111, #117

### Summary
Aligned the FAB label with the float-stack pills: condition changed to `expanded || isMobile`, padding
widened to fit the label, icon↔label gap set to `gap-2`, and the text corrected to "Chat with Chip.ai".
Now when the launcher appears on scroll it reads as a labelled pill on mobile (and expands on hover on
desktop), matching the WhatsApp "WhatsApp" and "Book a service" pills.

### Before
```tsx
// src/components/chatbot/Chatbot.tsx
className="flex items-center gap-0 ..."
style={{ padding: isMobile ? "0px 0px" : expanded ? "0px 8px" : "0px 1px", ... }}
// ...
{(expanded && !isMobile) && (
    <motion.span ...>Chat with chip.ai</motion.span>
)}
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx
className="flex items-center gap-2 ..."
style={{ padding: (expanded || isMobile) ? "0px 18px 0px 2px" : "0px 1px", ... }}
// ...
{(expanded || isMobile) && (
    <motion.span ... className="... pr-1">Chat with Chip.ai</motion.span>
)}
```

### Notes
- Desktop collapsed state is unchanged (icon-only until hover), same as WhatsApp/Book on desktop.

## [2026-10-01] #117 — Scroll-gate the Chip.ai launcher on the home page
- **Type:** feature
- **Scope:** `src/components/landing/AppShell.tsx`, `src/components/chatbot/Chatbot.tsx`
- **Why:** User wants the Chip.ai chatbot launcher to appear on scroll together with WhatsApp + "Book a service", on the home page only (other pages keep the always-visible chatbot).
- **Related:** #111, #115, #116

### Summary
`AppShell` now flags `<body>` with `is-home` while the home page is mounted. The global chatbot watches the
body class list (MutationObserver) and hides its launcher while `is-home` is set but `floats-visible` is not
— i.e. on the home page before the reader scrolls past the hero. Once WhatsAppFloat sets `floats-visible`
(scrollTop > 600), the launcher renders and plays its existing scale/opacity entrance, so all three reveal
together and lift into one column. On non-home pages `is-home` is never set, so the launcher stays visible
as before.

### Before
```tsx
// Chatbot.tsx — FAB always shown once mounted
{!isOpen && mounted && (
    <motion.div ...>
```

### After
```tsx
// AppShell.tsx
useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
}, []);

// Chatbot.tsx — new gate derived from body classes
const [scrollHidden, setScrollHidden] = useState(false);
useEffect(() => {
    const sync = () => {
        const cl = document.body.classList;
        setScrollHidden(cl.contains("is-home") && !cl.contains("floats-visible"));
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
}, []);
// ...
{!isOpen && mounted && !scrollHidden && (
    <motion.div ...>
```

### Notes
- Near the footer WhatsAppFloat clears `floats-visible`, so all three (Book / WhatsApp / Chip.ai) hide together there too.
- Contract: `is-home` (AppShell) + `floats-visible` (WhatsAppFloat) are the two body-class signals the chatbot depends on — keep the names in sync across these three files.
- Verification pending from user (dev server).

## [2026-10-01] #116 — Fix chatbot class collision that broke its fixed positioning
- **Type:** fix
- **Scope:** `src/components/chatbot/Chatbot.tsx`, `src/app/globals.css`
- **Why:** The chatbot sat far above the float stack with a big gap. Root cause: the hook class added in #113, `cbot-fab-wrap`, collided with a pre-existing legacy rule `.cbot-fab-wrap { position: relative }` (globals.css ~line 852). That flipped the launcher from `position: fixed` to `relative`, so the `bottom: 138px` offset became a *relative* shift and pushed the FAB way up.
- **Related:** #113, #114, #115

### Summary
Renamed the launcher hook class from `cbot-fab-wrap` to the unique `cbot-fab-lift` (component + both CSS
rules). The FAB keeps its Tailwind `fixed` positioning, and `bottom: 138px` (134px mobile) now correctly
places it ~12px above the WhatsApp pill — one evenly-spaced column again.

### Before
```tsx
// Chatbot.tsx — collides with legacy `.cbot-fab-wrap { position: relative }`
className="cbot-fab-wrap fixed bottom-20 right-6 z-50"
```
```css
/* globals.css */
body.floats-visible .cbot-fab-wrap { bottom: 138px; }  /* applied `bottom` to a now-relative element */
```

### After
```tsx
// Chatbot.tsx — unique hook, FAB stays fixed
className="cbot-fab-lift fixed bottom-20 right-6 z-50"
```
```css
/* globals.css */
.cbot-fab-lift { transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
body.floats-visible .cbot-fab-lift { bottom: 138px; }   /* desktop */
body.floats-visible .cbot-fab-lift { bottom: 134px; }   /* mobile */
```

### Notes
- Lesson: `cbot-*` is a crowded namespace in globals.css — new hooks must be grep-checked against existing selectors before use.

## [2026-10-01] #115 — Chatbot lifts into line only while the float stack is on screen
- **Type:** fix
- **Scope:** `src/components/landing/WhatsAppFloat.tsx`, `src/components/landing/AppShell.tsx`, `src/app/globals.css`
- **Why:** #112–#114 lifted the chatbot whenever the home page was mounted (`body.home-floats` from AppShell), so it floated high even at the top of the page where the WhatsApp/Book pills are hidden. The chatbot must stay low when alone and only rise into line when the pills appear on scroll.
- **Related:** #111, #112, #113, #114

### Summary
Moved the body-class toggle from AppShell's mount effect to WhatsAppFloat's scroll-`visible` state, and
renamed it `floats-visible`. Now the always-on chatbot FAB sits at its default `bottom-20` (80px) until the
reader scrolls past the hero; once WhatsApp + "Book a service" appear, `floats-visible` is set and the FAB
slides up (`transition: bottom 0.3s`) to ~12px above the stack, forming one evenly-spaced column. Scrolling
back to the top (or near the footer) hides the pills and drops the FAB back down.

### Before
```tsx
// AppShell.tsx — lifted on mount, regardless of scroll
useEffect(() => {
    document.body.classList.add("home-floats");
    return () => document.body.classList.remove("home-floats");
}, []);
```
```css
/* globals.css */
body.home-floats .cbot-fab-wrap { bottom: 138px; }   /* desktop */
body.home-floats .cbot-fab-wrap { bottom: 134px; }   /* mobile */
```

### After
```tsx
// WhatsAppFloat.tsx — lifted only while the stack is visible on scroll
useEffect(() => {
    document.body.classList.toggle("floats-visible", visible);
    return () => document.body.classList.remove("floats-visible");
}, [visible]);
```
```css
/* globals.css */
.cbot-fab-wrap { transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
body.floats-visible .cbot-fab-wrap { bottom: 138px; }   /* desktop */
body.floats-visible .cbot-fab-wrap { bottom: 134px; }   /* mobile */
```

### Notes
- AppShell reverted to its pre-#112 form (no mount effect, no `useEffect` import).
- Because the trigger is now the float's own visibility, this also naturally covers non-home pages: no float there → class never set → chatbot stays at default.

## [2026-10-01] #114 — Tighten chatbot gap so it lines up evenly with the float stack
- **Type:** fix
- **Scope:** `src/app/globals.css`
- **Why:** #113's 148px offset left a ~22px gap above the WhatsApp pill — bigger than the 12px gaps inside the stack — so the chatbot looked detached ("too above").
- **Related:** #111, #112, #113

### Summary
Lowered the home-page chatbot FAB offset to sit a consistent ~12px above the WhatsApp pill (stack top ≈
126px desktop / ≈124px mobile), so the three bottom-right elements read as one evenly-spaced vertical line:
Book a service → WhatsApp → chatbot.

### Before
```css
/* src/app/globals.css */
body.home-floats .cbot-fab-wrap { bottom: 148px; }   /* desktop */
body.home-floats .cbot-fab-wrap { bottom: 140px; }   /* mobile */
```

### After
```css
/* src/app/globals.css */
body.home-floats .cbot-fab-wrap { bottom: 138px; }   /* desktop */
body.home-floats .cbot-fab-wrap { bottom: 134px; }   /* mobile */
```

## [2026-10-01] #113 — Fix: lift the actual chatbot FAB (not `.cbot-wrap`) above the float stack
- **Type:** fix
- **Scope:** `src/app/globals.css`, `src/components/chatbot/Chatbot.tsx`
- **Why:** #112 raised `.cbot-wrap`, but that container only holds the OPEN chat window. The closed-state launcher is a *separate* fixed element (`fixed bottom-20 right-6 z-50`, line 651) that #112 never touched — so the launcher still overlapped the float stack.
- **Related:** #111, #112

### Summary
The chatbot renders two fixed elements: `.cbot-wrap` (the open window) and a standalone FAB launcher shown
only while closed. #112 moved the former; the overlap was the latter. Added a `cbot-fab-wrap` hook class to
the FAB and pointed the `body.home-floats` offset at it instead (148px desktop / 140px mobile). Tailwind's
`bottom-20` (specificity 0,1,0) is overridden by `body.home-floats .cbot-fab-wrap` (0,2,0).

### Before
```tsx
// src/components/chatbot/Chatbot.tsx (FAB, closed state)
                    className="fixed bottom-20 right-6 z-50"
```
```css
/* src/app/globals.css */
body.home-floats .cbot-wrap:not(.is-open) { bottom: 148px; }   /* wrong target */
/* mobile */
body.home-floats .cbot-wrap:not(.is-open) { bottom: 140px; }
```

### After
```tsx
// src/components/chatbot/Chatbot.tsx (FAB, closed state)
                    className="cbot-fab-wrap fixed bottom-20 right-6 z-50"
```
```css
/* src/app/globals.css */
body.home-floats .cbot-fab-wrap { bottom: 148px; }             /* correct target */
/* mobile */
body.home-floats .cbot-fab-wrap { bottom: 140px; }
```

### Notes
- The open chat window still anchors at `bottom: 20px` (unchanged) — it covers the floats while chatting, which is fine.
- Verify: on the home page, scroll past the hero and confirm the chatbot launcher sits clearly above the WhatsApp + Book pills.

## [2026-10-01] #112 — Lift the chatbot above the home-page float stack (fix overlap)
- **Type:** fix
- **Scope:** `src/components/landing/AppShell.tsx`, `src/app/globals.css`
- **Why:** The chatbot FAB (`bottom: 83px`) was positioned to clear the old single WhatsApp pill. The new two-pill float stack (#111) is ~132px tall, so the chatbot overlapped the WhatsApp pill.
- **Related:** #111

### Summary
`AppShell` now toggles a `home-floats` class on `<body>` while the home page is mounted; a scoped CSS rule
lifts the chatbot launcher above the taller float stack (148px desktop / 140px mobile). Scoped to the home
page so blog / landing pages — which have no floats — keep the chatbot at its default 83px/72px offset.
`:not(.is-open)` keeps the open chat window anchored at `bottom: 20px`.

### Before
```tsx
// src/components/landing/AppShell.tsx
export default function AppShell() {
    return (
        <motion.main ...>
```
```css
/* src/app/globals.css */
.cbot-wrap.is-open { bottom: 20px; }
/* (no home-scoped offset — chatbot stayed at 83px and overlapped the stack) */
```

### After
```tsx
// src/components/landing/AppShell.tsx
export default function AppShell() {
    useEffect(() => {
        document.body.classList.add("home-floats");
        return () => document.body.classList.remove("home-floats");
    }, []);
    return (
        <motion.main ...>
```
```css
/* src/app/globals.css */
.cbot-wrap.is-open { bottom: 20px; }
body.home-floats .cbot-wrap:not(.is-open) { bottom: 148px; }
/* inside @media (max-width: 480px): */
body.home-floats .cbot-wrap:not(.is-open) { bottom: 140px; }
```

### Notes
- Column order bottom→top on the home page is now: "Book a service" pill → WhatsApp pill → chatbot FAB — no overlap.
- Verification: scroll the home page past the hero and confirm the three bottom-right elements are clear of each other; open the chat and confirm the window still anchors at the corner.

## [2026-10-01] #111 — Add a floating "Book a service" pill below the WhatsApp float
- **Type:** feature
- **Scope:** `src/components/landing/WhatsAppFloat.tsx`
- **Why:** User wants a "Book now"/"Book a service" button to appear on scroll alongside the existing bottom-right WhatsApp float.
- **Related:** #053, #099, #102, #106

### Summary
Turned the bottom-right WhatsApp float into a vertical action stack sharing one container, one scroll
trigger (`scrollTop > 600 && !near-bottom`), and one hover-to-expand state. A new orange "Book a service"
pill now sits at the very corner with WhatsApp directly above it, so Book reads as the primary action and
renders below WhatsApp. It opens the shared app popup on desktop (`handleAppLinkClick` + `HEADER.loginHref`)
and a new tab on mobile (`appLinkAttrs`), and fires `cta_book_service` with `location: "floating_button"`.
Chose to extend the existing float rather than mount a second fixed element, which would need a brittle
hand-tuned vertical offset against the WhatsApp pill's height.

### Before
```tsx
// src/components/landing/WhatsAppFloat.tsx
                    className="fixed bottom-6 right-6 z-50"
                >
                    <a href={whatsappHref()} ... >  {/* only the WhatsApp pill */}
```

### After
```tsx
// src/components/landing/WhatsAppFloat.tsx
                    className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
                >
                    <a href={whatsappHref()} ... >  {/* WhatsApp — above */}
                    <a
                        href={HEADER.loginHref}
                        {...appLinkAttrs(HEADER.loginHref)}
                        onClick={(e) => {
                            trackEvent(AnalyticsEvents.CtaBookService, { location: "floating_button", device: ... });
                            handleAppLinkClick(e, HEADER.loginHref);
                        }}
                        style={{ background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)", ... }}
                    >  {/* Book a service — corner, primary */}
```

### Notes
- Both pills collapse to icon-only on desktop and expand their labels together on hover (shared `expanded` state); on mobile both labels show, matching the prior WhatsApp behavior.
- `WhatsAppFloat.tsx` is still the single owner of the bottom-right float (per the #053 lock) — it now hosts a two-pill stack rather than a lone WhatsApp pill. `FloatingDownload` (store CTAs) remains a separate bottom-left float on desktop.

## [2026-10-01] #110 — Equal-width Hero CTA buttons via a 2-column grid
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** User wants all four Hero CTA buttons the same length on desktop. With `sm:w-auto` each sized to its own content, and four full-size buttons don't fit equally in one row inside the hero's `max-w-2xl` text column.
- **Related:** #106, #107, #108, #109

### Summary
Replaced the flex row with a 2-column CSS grid. Grid tracks are equal width by definition and grid items
stretch to equal height automatically, so the four buttons now form a balanced 2×2 block (Book a service ·
WhatsApp / Google Play · App Store), all identical in size. Each button fills its cell with `w-full h-full`.
Capped the block at `max-w-xl` so it doesn't stretch the full text column.

### Before
```tsx
// src/components/landing/Hero.tsx
                        className="flex flex-col sm:flex-row items-start sm:items-stretch gap-4 sm:gap-5 mb-12"
// ...each button:
                            className="w-full sm:w-auto inline-flex items-center justify-center ..."
```

### After
```tsx
// src/components/landing/Hero.tsx
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-12 max-w-xl"
// ...each button:
                            className="w-full h-full inline-flex items-center justify-center ..."
```

### Notes
- Mobile is a single column (`grid-cols-1`), unchanged in feel from the prior `flex-col`.
- `sm:items-stretch` (#107) is gone — grid handles equal height natively.

## [2026-10-01] #109 — Rename Hero primary CTA label to "Book a service"
- **Type:** chore
- **Scope:** `src/constants/copy.ts`
- **Why:** User wants the Hero primary CTA to read "Book a service" instead of "Book now".
- **Related:** #106, #108

### Summary
Copy-only change to the Hero primary CTA label. The button structure, gradient, super-label ("In 10 minutes"),
and app-popup behavior are unchanged.

### Before
```ts
// src/constants/copy.ts
    bookNowLabel: "Book now",
```

### After
```ts
// src/constants/copy.ts
    bookNowLabel: "Book a service",
```

## [2026-10-01] #108 — Make "Book now" structurally identical to the Hero glass buttons
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`, `src/constants/copy.ts`
- **Why:** On desktop the single-line "Book now" still read as a different size than the two-line WhatsApp / store buttons; `items-stretch` (#107) equalised the outer height but the internal layout (single centered line, `px-7`, `gap-2.5`, smaller icon) still looked off.
- **Related:** #106, #107

### Summary
Rebuilt "Book now" to use the *exact same shell* as the glass buttons — `px-6 py-4 gap-3.5 rounded-2xl`,
a `w-7 h-7` icon, and a two-line super-label + label stack — so its intrinsic size matches the siblings by
construction, not just via the row's stretch. Only the fill differs: orange brand gradient with white text.
Added `HERO.bookNowSuperLabel` ("In 10 minutes") to feed the top line, mirroring the brand promise and the
"Get it on / Google Play" pattern.

### Before
```tsx
// src/components/landing/Hero.tsx
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 text-white text-[16px] font-bold hover:brightness-110 transition-all duration-300"
                            style={{ background: "linear-gradient(...)", boxShadow: "..." }}
                        >
                            <svg ... className="w-5 h-5 shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                            {HERO.bookNowLabel}
```

### After
```tsx
// src/components/landing/Hero.tsx
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300"
                            style={{ background: "linear-gradient(...)", boxShadow: "..." }}
                        >
                            <svg ... className="w-7 h-7 shrink-0"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
                            <div className="flex flex-col leading-tight text-left">
                                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{HERO.bookNowSuperLabel}</span>
                                <span className="text-[16px] font-bold text-white mt-0.5">{HERO.bookNowLabel}</span>
                            </div>
```

```ts
// src/constants/copy.ts
    bookNowSuperLabel: "In 10 minutes",
    bookNowLabel: "Book now",
```

### Notes
- The `sm:items-stretch` from #107 stays as a harmless safety net; the structural match is what now guarantees equal size.
- Icon swapped from a chevron to a calendar glyph (white stroke) to suit "Book now" and sit at the same `w-7 h-7` footprint as the brand icons.

## [2026-10-01] #107 — Match "Book now" button height to the Hero glass buttons
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** The single-line "Book now" button (#106) was shorter than the two-line WhatsApp / store buttons; user wants them the same size.
- **Related:** #106

### Summary
Switched the Hero CTA row's cross-axis alignment from `sm:items-center` to `sm:items-stretch` so every
button grows to the tallest one (the two-line glass buttons). "Book now" now matches their height exactly,
with its icon + label still vertically centered via its own `inline-flex items-center`. No per-button
padding hacks — the row owns the equal-height contract.

### Before
```tsx
// src/components/landing/Hero.tsx
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-12"
```

### After
```tsx
// src/components/landing/Hero.tsx
                        className="flex flex-col sm:flex-row items-start sm:items-stretch gap-4 sm:gap-5 mb-12"
```

### Notes
- Mobile (`flex-col`) is unaffected — the buttons are already `w-full` there.

## [2026-10-01] #106 — Add primary "Book now" CTA to the Hero button row
- **Type:** feature
- **Scope:** `src/components/landing/Hero.tsx`, `src/constants/copy.ts`
- **Why:** User wants a "Book now" button leading the Hero CTA row, before the WhatsApp / Google Play / App Store buttons.
- **Related:** #099, #102, #105

### Summary
Added a "Book now" button as the first CTA in the Hero row. Per the user's choices it's styled as the
orange brand gradient (primary) so booking stands out against the three glass store/WhatsApp buttons, and
it opens the shared app popup — it points at `HEADER.loginHref` and reuses `appLinkAttrs` +
`handleAppLinkClick`, so desktop gets the `LoginModal` popup and mobile (or Cmd/Ctrl-click) gets a new tab,
exactly like the header and footer "Book a Service" CTAs. Fires `cta_book_service` with `location: "hero"`.

### Before
```tsx
// src/components/landing/Hero.tsx
import { HERO, whatsappHref } from "@/constants/copy";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { trackWhatsAppClick, trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";
// ...
                        {/* WhatsApp — first CTA, ... */}
                        <motion.a
                            href={whatsappHref()}
```

```ts
// src/constants/copy.ts
    description: "...10 minutes.",
    googlePlaySuperLabel: "Get it on",
```

### After
```tsx
// src/components/landing/Hero.tsx
import { HERO, HEADER, whatsappHref } from "@/constants/copy";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { trackWhatsAppClick, trackPlayStoreClick, trackAppStoreClick } from "@/lib/metaPixel";
import { appLinkAttrs, handleAppLinkClick } from "@/lib/appPopup";
// ...
                        {/* Book now — primary CTA leading the row ... */}
                        <motion.a
                            href={HEADER.loginHref}
                            {...appLinkAttrs(HEADER.loginHref)}
                            onClick={(e) => {
                                trackEvent(AnalyticsEvents.CtaBookService, { location: "hero" });
                                handleAppLinkClick(e, HEADER.loginHref);
                            }}
                            aria-label="Book a Pockit service now"
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 text-white text-[16px] font-bold hover:brightness-110 transition-all duration-300"
                            style={{
                                background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                                boxShadow: "0 8px 24px rgb(var(--accent-primary) / 0.35)",
                            }}
                        >
                            <svg ...><path d="m9 18 6-6-6-6" /></svg>
                            {HERO.bookNowLabel}
                        </motion.a>

                        {/* WhatsApp — ... now second in the row ... */}
                        <motion.a
                            href={whatsappHref()}
```

```ts
// src/constants/copy.ts
    description: "...10 minutes.",
    bookNowLabel: "Book now",
    googlePlaySuperLabel: "Get it on",
```

### Notes
- Label lives in `HERO.bookNowLabel`; behavior/host come from `HEADER.loginHref` (single source of truth for the app popup).
- No new analytics event — reuses the existing `CtaBookService` (`cta_book_service`) with a `location: "hero"` param, consistent with the store buttons' `location` param.

## [2026-09-25] #105 — Footer "Book a Service" opens the app popup
- **Type:** feature
- **Scope:** `src/components/landing/Footer.tsx`, `src/hooks/useBookServiceNav.ts` (removed), `CLAUDE.md`
- **Why:** User wants the footer's "Book a Service" to open the same web-app popup as the header CTAs.
- **Related:** #099, #102

### Summary
The footer CTA now links to `HEADER.loginHref` and uses the shared `appLinkAttrs` +
`handleAppLinkClick` helpers, the same as the header's "Book a Service" (#102). On desktop a
click opens the popup. On mobile, or with Cmd/Ctrl-click, the web app opens in a new tab.
The footer was the last user of `useBookServiceNav`, so the hook was deleted.

### Before
```tsx
// src/components/landing/Footer.tsx
import { FOOTER, FOOTER_LINKS } from "@/constants/copy";
import { useBookServiceNav } from "@/hooks/useBookServiceNav";
...
const onBookService = useBookServiceNav();
...
<motion.a
    href={resolveNavHref("/#download", isHome)}
    onClick={onBookService}
    ...>
```

```ts
// src/hooks/useBookServiceNav.ts
// Mobile: redirect to App Store / Play Store by user agent.
// Otherwise: smooth-scroll to #download on home, or navigate to /#download.
export function useBookServiceNav() { ... }
```

### After
```tsx
// src/components/landing/Footer.tsx
import { FOOTER, FOOTER_LINKS, HEADER } from "@/constants/copy";
import { appLinkAttrs, handleAppLinkClick } from "@/lib/appPopup";
...
<motion.a
    href={HEADER.loginHref}
    {...appLinkAttrs(HEADER.loginHref)}
    onClick={(e) => handleAppLinkClick(e, HEADER.loginHref)}
    ...>
```

```ts
// src/hooks/useBookServiceNav.ts
(file removed — no remaining callers after this change; recover from git if a
store-redirect CTA is ever needed again)
```

### Notes
- **Mobile behaviour changed.** Phones used to be sent to the App Store or Play Store.
  They now open the web app in a new tab, which is the rule for all app-host CTAs (#099).
  The `#download` band and the store badges in the header's mobile menu still link to the stores.
- No site-wide "Book a Service" CTA scrolls to `#download` any more.
- Verified: `npx tsc --noEmit` exit 0. ESLint on `Footer.tsx` shows only the existing
  `react-hooks/set-state-in-effect` error in the theme-hydration effect (same as Header, #096).

---

## [2026-09-24] #104 — Remove the scrollbars inside the app popup (`scrolling="no"` on the iframe)
- **Type:** fix
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** The popup still showed a vertical and a horizontal scrollbar after #103. The real cause is overflow inside the embedded app's document.
- **Related:** #103 (misdiagnosed), #094

### Summary
Measured in headless Chrome by attaching to the popup's cross-origin iframe at the popup's
real size (390 × 844). The app's login sheet is a full-screen layer with
`transform: translateY(59px)`, so its document is **903px tall in an 844px frame**. The
app only clips overflow in its ≥480px phone-frame mode, so at 390px the iframe document
scrolled. The vertical scrollbar took 15px of width (clientWidth 375), which made a 390px
SVG overflow and added a horizontal scrollbar too. `scrolling="no"` turns off
document-level scrolling in the frame. Before/after screenshots show both scrollbars gone,
and the login form gets its full 390px width back (it was squeezed to 375px).

### Before
```tsx
// src/components/landing/LoginModal.tsx
<iframe
    src={HEADER.loginHref}
    title={HEADER.loginDialogTitle}
    className="h-full w-full border-0"
/>
```

### After
```tsx
// src/components/landing/LoginModal.tsx
<iframe
    src={HEADER.loginHref}
    title={HEADER.loginDialogTitle}
    scrolling="no"
    className="h-full w-full border-0"
/>
```

### Notes
- **#103's diagnosis was wrong.** It blamed a short popup height, but the overflow happens
  even at the full 844px. The 390 × 844 fixed viewport + transform scaling from #103 is kept:
  it's harmless, and it gives the app a true phone viewport on short windows. Its changelog
  title overstates what it fixed.
- **Why disabling scrolling is safe:** the app's `#root` is `100dvh`, and its screens scroll
  inside React Native views (their own elements), never at document level. So nothing
  legitimate is lost. The only thing clipped is the bottom 59px of the translated sheet,
  which the app's own design pushes off-screen anyway.
- `scrolling` is deprecated in HTML5 (TypeScript shows a hint), but Chrome, Safari and
  Firefox all still honour it. No CSS alternative exists for a cross-origin document.
- **Proper upstream fix (app repo):** add `overflow: hidden` to `#root` (or `html, body`)
  in the narrow-viewport CSS of the web app's `index.html`, matching what the ≥480px
  phone-frame mode already does. Then `scrolling="no"` becomes redundant (keep it anyway).
- Verified: `npx tsc --noEmit` exit 0, ESLint clean on `LoginModal.tsx`. Headless Chrome
  before/after screenshots of the iframe at 390 × 844 loading `https://my.pockitengineers.com/`.

---

## [2026-09-24] #103 — App popup: fixed 390 × 844 viewport, scaled to fit (removes in-app scrollbar)
- **Type:** fix
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** On laptop-height windows the popup shrank to about 700px, so the embedded app's screens (designed for a full phone height) overflowed and showed a scrollbar.
- **Related:** #095, #096

### Summary
The iframe is now always rendered at exactly 390 × 844. The whole screen is scaled down
with a CSS transform to fit the window, instead of the iframe's height shrinking. The app
always sees a real phone viewport, so its screens don't overflow. The scrollbar was inside
the cross-origin app, where our CSS can't reach, so this is the only fix available on our side.

### Before
```tsx
// src/components/landing/LoginModal.tsx
<motion.div role="dialog" className="relative shrink-0"
    style={{ width: SCREEN_W, height: `min(${SCREEN_H}px, calc(100vh - 3rem))` }}>
    <div className="h-full w-full overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <iframe className="h-full w-full border-0" ... />
    </div>
```

### After
```tsx
// src/components/landing/LoginModal.tsx
const MARGIN_Y = 48;
const MARGIN_X = 48 + (12 + 40) * 2;   // room for the ✕ on both sides, keeps it centered
function useFitScale() {                // useSyncExternalStore on window resize
    return useSyncExternalStore(subscribeResize, getFitScale, () => 1);
}
...
<motion.div role="dialog" className="relative shrink-0"
    style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}>
    <div className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[28px] ..."
        style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}>
        <iframe className="h-full w-full border-0" ... />
    </div>
```

### Notes
- The dialog's layout box is the *scaled* size, so flex centering and the ✕ (which isn't
  scaled) line up with what's visible.
- The scale is never above 1. On a tall window the popup is exactly 390 × 844, as before.
- `useSyncExternalStore` instead of an effect + setState avoids the
  `react-hooks/set-state-in-effect` lint rule and SSR mismatches (the server snapshot is 1).
- If a specific app screen is genuinely taller than 844px, it will still scroll. That's
  the app's own layout, and hiding its scrollbar would need a CSS change in the app repo
  (`scrollbar-width: none` / `::-webkit-scrollbar { display: none }`).
- Verified: `npx tsc --noEmit` exit 0, ESLint clean on `LoginModal.tsx`.

---

## [2026-09-24] #102 — Header "Book a Service" opens the app popup
- **Type:** feature
- **Scope:** `src/components/landing/Header.tsx`
- **Why:** User wants the header's primary CTA to open the same web-app popup as Login, instead of scrolling to the app-download band.
- **Related:** #094, #099, #101

### Summary
The desktop header's "Book a Service" now links to `HEADER.loginHref` and is wired with
the shared `appLinkAttrs` + `handleAppLinkClick` helpers. A plain click opens the popup;
Cmd/Ctrl-click (or no JS) opens the app in a new tab. Styling is unchanged.

### Before
```tsx
// src/components/landing/Header.tsx
import { useBookServiceNav } from "@/hooks/useBookServiceNav";
...
const onBookService = useBookServiceNav();
...
<Link href={resolveNavHref("/#download", isHome)} onClick={onBookService} ...>
    ...{HEADER.bookLabel}
</Link>
```

### After
```tsx
// src/components/landing/Header.tsx
import { appLinkAttrs, handleAppLinkClick, openAppPopup } from "@/lib/appPopup";
...
<a
    href={HEADER.loginHref}
    {...appLinkAttrs(HEADER.loginHref)}
    onClick={(e) => handleAppLinkClick(e, HEADER.loginHref)}
    ...>
    ...{HEADER.bookLabel}
</a>
```

### Notes
- **Header only.** The Footer's "Book a Service" still uses `useBookServiceNav` (app store
  on phones, `#download` scroll elsewhere), and so do the landing-page defaults. The hook is
  kept.
- The button sits in the `hidden md:flex` group, so it never renders on phones. The
  mobile menu has only the Login link (new tab), which is unchanged.
- "Join Us" on `/become-a-technician` still goes to WhatsApp; that branch is untouched.
- Verified: `npx tsc --noEmit` exit 0. ESLint on `Header.tsx` shows only the existing
  `react-hooks/set-state-in-effect` error in the theme-hydration effect (noted in #096).

---

## [2026-09-24] #101 — Login popup points at my.pockitengineers.com
- **Type:** config
- **Scope:** `src/constants/copy.ts`, `src/lib/appPopup.ts`, `sanity/schemas/landingPage.ts`, `docs/LANDING_PAGES.md`, `CLAUDE.md`
- **Why:** The web app's public URL is now `https://my.pockitengineers.com/`.
- **Related:** #094, #099

### Summary
The popup (header Login and app-link CTAs) now loads `https://my.pockitengineers.com/`.
App-link detection accepts both the new host and the legacy
`pockitapp.pockitengineers.com`. Without that, the 10 Sanity landing pages whose "Book
Now" CTA still links to the old domain would stop opening the popup. Those CTAs now open
the popup, and it loads the new URL.

### Before
```ts
// src/constants/copy.ts
loginHref: "https://pockitapp.pockitengineers.com/",
```

### After
```ts
// src/constants/copy.ts
loginHref: "https://my.pockitengineers.com/",
```

### Before
```ts
// src/lib/appPopup.ts
const APP_HOST = new URL(HEADER.loginHref).host;
...
return new URL(href).host === APP_HOST;
```

### After
```ts
// src/lib/appPopup.ts
const APP_HOSTS = new Set([
    new URL(HEADER.loginHref).host,
    "pockitapp.pockitengineers.com",
]);
...
return APP_HOSTS.has(new URL(href).host);
```

### Before
```ts
// sanity/schemas/landingPage.ts — heroPrimaryCta.href description
"... A https://pockitapp.pockitengineers.com/ link opens the app in a phone-sized popup ..."
```

### After
```ts
"... A https://my.pockitengineers.com/ link opens the app in a phone-sized popup ..."
```

### Notes
- **Checked the new host before switching.** It sends no `X-Frame-Options` / CSP
  `frame-ancestors` header, so it can be embedded, and it serves the same app with the same
  420px layout clamp. The 390px popup width (#095/#096) stays correct.
- **Follow-up (content):** update the 10 landing pages' CTA href in Studio to
  `https://my.pockitengineers.com/`. The popup already loads the new URL, but the mobile
  new-tab fallback and Cmd-click still go to whatever the href says. Once none link to
  the old domain, drop it from `APP_HOSTS`.
- The `copy.ts` URL edit was made by the user. This entry logs it alongside the
  detection change it required.
- Verified: `npx tsc --noEmit` exit 0, ESLint clean on `appPopup.ts`.

---

## [2026-09-24] #100 — App popup no longer closes on backdrop click
- **Type:** fix
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** A stray click outside the popup closed it and discarded whatever the user had typed into the embedded app. The user wants only the ✕ to close it.
- **Related:** #098, #099

### Summary
Removed the backdrop's `onClick={onClose}`, and with it the dialog's `stopPropagation`,
which existed only to stop that handler. The popup now closes via the ✕ button, or via
Esc for keyboard users.

### Before
```tsx
// src/components/landing/LoginModal.tsx
<motion.div className="fixed inset-0 ..." style={{ background: ... }} onClick={onClose}>
    <motion.div role="dialog" ... onClick={(e) => e.stopPropagation()} ...>
```

### After
```tsx
// src/components/landing/LoginModal.tsx
<motion.div className="fixed inset-0 ..." style={{ background: ... }}
    // No close-on-backdrop-click: a stray click outside would
    // discard whatever the user typed into the app. Only the ✕
    // (and Esc) close it (CHANGELOG #100).
>
    <motion.div role="dialog" ...>
```

### Notes
- **Esc still closes the popup.** It's the standard keyboard escape for dialogs and a
  deliberate keypress, so it's not an accidental close. Remove the `keydown` listener in
  the effect if Esc should be disabled too.
- Verified: `npx tsc --noEmit` exit 0, ESLint clean on `LoginModal.tsx`.

---

## [2026-09-24] #099 — Landing-page CTAs pointing at the web app open the Login popup
- **Type:** feature
- **Scope:** `src/lib/appPopup.ts` (new), `src/components/landing/LoginModal.tsx`, `src/components/landing/Header.tsx`, `src/components/landing-pages/LandingPageView.tsx`, `sanity/schemas/landingPage.ts`, `docs/LANDING_PAGES.md`
- **Why:** Editors set a landing page's Hero primary CTA ("Book Now") to `https://pockitapp.pockitengineers.com/`. It should open in the same popup as the header Login button, not navigate away.
- **Related:** #094–#096, #098

### Summary
The popup's open state moved out of `Header`'s local `useState` into a small shared store
(`src/lib/appPopup.ts`, `useSyncExternalStore`), so any component can open it. The popup
is still mounted once, in `Header`, which is on every page. Landing-page CTAs detect an
app href by host. On desktop (≥768px) they open the popup; on mobile they open a new tab,
matching the header's mobile Login link. This covers the hero primary, the hero secondary,
and the bottom "Ready to fix it today?" banner (which reuses the primary CTA). It's driven
by the href alone, so editors need no extra toggle.

### Before
```tsx
// src/components/landing/Header.tsx
const [loginOpen, setLoginOpen] = useState(false);
const closeLogin = useCallback(() => setLoginOpen(false), []);
...
<button type="button" onClick={() => setLoginOpen(true)} ...>{HEADER.loginLabel}</button>
...
<LoginModal open={loginOpen} onClose={closeLogin} />
```

### After
```tsx
// src/components/landing/Header.tsx
import { openAppPopup } from "@/lib/appPopup";
...
<button type="button" onClick={openAppPopup} ...>{HEADER.loginLabel}</button>
...
<LoginModal />
```

### Before
```tsx
// src/components/landing/LoginModal.tsx
export default function LoginModal({ open, onClose }: LoginModalProps) {
```

### After
```tsx
// src/components/landing/LoginModal.tsx
export default function LoginModal() {
    const open = useAppPopupOpen();
    const onClose = closeAppPopup;
```

### Before
```tsx
// src/components/landing-pages/LandingPageView.tsx (hero primary; same shape for hero-secondary + footer-banner)
<Link
    href={primaryHref}
    onClick={() =>
        trackEvent(AnalyticsEvents.LandingCtaClick, { page_slug: pageSlug, cta: "hero-primary" })
    }
```

### After
```tsx
// src/components/landing-pages/LandingPageView.tsx
<Link
    href={primaryHref}
    {...appLinkAttrs(primaryHref)}            // target=_blank for app hrefs (mobile/no-JS fallback)
    onClick={(e) => {
        trackEvent(AnalyticsEvents.LandingCtaClick, { page_slug: pageSlug, cta: "hero-primary" });
        handleAppLinkClick(e, primaryHref);   // desktop: preventDefault + openAppPopup()
    }}
```

### Before
```ts
// src/lib/appPopup.ts
(file did not exist)
```

### After
```ts
// src/lib/appPopup.ts
export const openAppPopup / closeAppPopup;
export function useAppPopupOpen(): boolean;                 // useSyncExternalStore
export function isPockitAppHref(href): boolean;             // host === new URL(HEADER.loginHref).host
export function appLinkAttrs(href);                         // { target, rel } | {}
export function handleAppLinkClick(e, href);                // desktop + plain left-click only
```

### Before
```ts
// sanity/schemas/landingPage.ts — heroPrimaryCta.href description
"Use `#download` to scroll to the app-download band on home, or a full route."
```

### After
```ts
"Use `#download` to scroll to the app-download band on home, or a full route. A https://pockitapp.pockitengineers.com/ link opens the app in a phone-sized popup on desktop (new tab on mobile)."
```

### Notes
- **Analytics is unchanged.** `landing_cta_click` still fires before the popup opens.
- Cmd/Ctrl/Shift-clicks and middle-clicks skip the popup and open the app in a new tab,
  as a normal link would.
- The app host comes from `HEADER.loginHref`, so changing that one constant updates both
  the Login button and CTA detection.
- The schema description change needs `npx sanity deploy` before editors see the new
  hint. Behaviour doesn't depend on it.
- The home page hero CTA (`HERO` in `copy.ts`) isn't wired. Only Sanity landing pages
  were asked for. To add it, spread `appLinkAttrs` and call `handleAppLinkClick` on
  that link the same way.
- Verified: `npx tsc --noEmit` exit 0. ESLint shows 0 errors on the touched files; the one
  warning is an existing unused `eslint-disable` directive in `LandingPageView.tsx`.

---

## [2026-09-24] #098 — Login popup: Cancel becomes a close (✕) icon at the top-right corner
- **Type:** feature
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** User wants the standard close-icon placement instead of a Cancel pill below the popup.
- **Related:** #094, #096

### Summary
The text "Cancel" pill below the window is replaced by a round ✕ button (lucide `X`). It sits
just outside the screen's top-right corner, so it never covers the embedded app's own
header controls. The window's height no longer reserves room for a button beneath it.

### Before
```tsx
// src/components/landing/LoginModal.tsx
<motion.div role="dialog" className="shrink-0 overflow-hidden rounded-[28px] ..."
    style={{ width: SCREEN_W, height: `min(${SCREEN_H}px, calc(100vh - 76px - 3rem))` }}>
    <iframe ... />
</motion.div>
<button ref={cancelRef} className="... px-7 py-2.5 ...">{HEADER.loginCancelLabel}</button>
```

### After
```tsx
// src/components/landing/LoginModal.tsx
<motion.div role="dialog" className="relative shrink-0"
    style={{ width: SCREEN_W, height: `min(${SCREEN_H}px, calc(100vh - 3rem))` }}>
    <div className="h-full w-full overflow-hidden rounded-[28px] bg-white shadow-2xl"><iframe ... /></div>
    <button ref={cancelRef} aria-label={HEADER.loginCancelLabel}
        className="absolute top-0 left-[calc(100%+12px)] h-10 w-10 rounded-full ...">
        <X className="h-5 w-5" />
    </button>
</motion.div>
```

### Notes
- **Log repair.** This change shipped in commit `a9e6d8e`, but its entry was overwritten
  when #097 (the instant-IT-help SEO block) was written in parallel. The entry was re-added
  here as #098 alongside #099.
- `HEADER.loginCancelLabel` ("Cancel") is kept as the button's `aria-label` / tooltip.
- Esc and clicking the backdrop still close the popup.
- Verified: `npx tsc --noEmit` exit 0, ESLint clean on `LoginModal.tsx`.

---

## [2026-09-24] #097 — Long-form "Read More" SEO block on /instant-it-help-mumbai
- **Type:** content
- **Scope:** Sanity doc `instant-it-help-mumbai`, `BLOG_TASKS.md`
- **Why:** Third service page in the Mumbai programme gets the collapsible supporting copy shipped in #087.
- **Related:** follows `/macbook-repair-mumbai` (#087) and `/laptop-repair-mumbai` (#093)

### Summary
**No code changed.** The IT-support copy supplied as `Instant IT help.pdf` was
authored straight into Sanity as 81 Portable Text blocks and picked up by the
existing `SeoContentSection` renderer, so the page gained a "Read More" block
with nothing to deploy beyond a rebuild. This is the longest block so far — the
source document carried seven sub-sections plus its own FAQ set.

### Before

```jsonc
// Sanity: landingPage "instant-it-help-mumbai"
{
  "_id": "instant-it-help-mumbai",
  "title": "IT Support in Mumbai | Same Day IT Technician | Pockit Engineers",
  "faqs": [ /* 5 items */ ]
  // no seoContent field
}
```

### After

```jsonc
// Sanity: landingPage "instant-it-help-mumbai"
{
  "_id": "instant-it-help-mumbai",
  "title": "IT Support in Mumbai | Same Day IT Technician | Pockit Engineers",
  "faqs": [ /* 5 items, unchanged */ ],
  "seoContent": [
    { "style": "h2", "children": [{ "text": "IT Support Services in Mumbai" }] },
    /* 3 intro paragraphs */
    { "style": "h3", "children": [{ "text": "Same-Day IT Support in Mumbai with On-Site Assistance" }] },
    /* 3 paragraphs, lead-in, 7 bullets, 1 paragraph */
    { "style": "h3", "children": [{ "text": "Professional IT Technicians in Mumbai for Quick & Reliable Support" }] },
    /* 3 paragraphs, lead-in, 8 bullets */
    { "style": "h3", "children": [{ "text": "Why Choose Pockit Engineers for IT Support in Mumbai?" }] },
    /* 2 paragraphs, 6 bullets */
    { "style": "h3", "children": [{ "text": "Complete IT Support for Computers, Laptops, Printers, Networks & More" }] },
    /* 1 paragraph, 5 bullets */
    { "style": "h3", "children": [{ "text": "Fast & Convenient IT Support at Your Home or Office in Mumbai" }] },
    /* 4 paragraphs, 2 bullets */
    { "style": "h3", "children": [{ "text": "How Pockit IT Support Works" }] },
    /* 4 bullets */
    { "style": "h3", "children": [{ "text": "IT Support Across Mumbai" }] },
    /* 3 paragraphs */
    { "style": "h3", "children": [{ "text": "Frequently Asked Questions" }] }
    /* 8 Q&A pairs, then 2 closing paragraphs */
  ]
}
```

### Before

```md
<!-- BLOG_TASKS.md -->
- [ ] Author a *distinct* block for the remaining service pages: `/instant-it-help-mumbai`, `/desktop-repair-mumbai`, `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
```

### After

```md
<!-- BLOG_TASKS.md -->
- [x] `/instant-it-help-mumbai` block authored (CHANGELOG #097) — 81 blocks, 7 H3 sub-sections, 32 ticked bullets, 8 Q&A pairs. Content-only; no code change needed
- [ ] Author a *distinct* block for the remaining service pages: `/desktop-repair-mumbai`, `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
- [ ] Decide whether the 8 Q&A pairs inside the `/instant-it-help-mumbai` block should be promoted into the visible `faqs` accordion (it currently holds 5 *different*, remote-session-specific questions). Only the visible ones reach the generated `FAQPage` JSON-LD
```

### Notes
- **Editorial calls on the supplied copy.** The source PDF is a whole-page
  rewrite, not just a supporting block, so the parts that already exist
  elsewhere on the page were not duplicated into the hidden block:
  - **Title + Meta Description dropped** — already live and byte-identical in
    `seo.metaTitle` / `seo.metaDescription`. Nothing to change.
  - **The H1 "Fast & Reliable IT Support in Mumbai" dropped** — already the
    page's `heroHeading`. Repeating it inside the block would put a second H1's
    worth of text on the page. Its three body paragraphs were kept and now open
    the block under the H2.
  - **Block H2 is "IT Support Services in Mumbai"** — the `| Same Day IT
    Technician | Pockit Engineers` suffix is a title-tag pattern, not a body
    heading. Same call as #093.
  - **Source H2s became H3s.** The schema offers only `normal`/`h2`/`h3` and the
    house pattern reserves the single H2 for the block title. The source's own
    H3 sub-headings (`Verified IT Technicians`, `Computer Support in Mumbai`,
    `01. Tell us what you need`, …) therefore collapsed into the existing
    bulleted "**Lead phrase** — explanation" idiom rather than inventing a
    fourth heading level.
  - **Two lists left unbolded** ("What can our IT technicians help with?" fully,
    and the trailing halves of "Why choose Pockit for IT support?"). Those
    bullets are plain capability phrases with no explanation clause, so there is
    no lead phrase to bold — forcing a split mid-phrase read as arbitrary. The
    tick icon already carries the structure.
  - **Research-voice sentences rewritten.** The draft addressed the reader about
    our own site ("with the website stating that technicians can typically
    reach…", "The current Pockit website follows a similar three-step…",
    "Pockit's current website states that typical on-site arrival is…"). These
    were writer's notes, not customer-facing copy. The first became "Pockit
    combines remote assistance with doorstep support, and technicians typically
    reach customers across Mumbai within 60 minutes" (consistent with the doc's
    `responseTime: "60 minutes"`), the second was dropped, the third trimmed to
    the fact.
  - **One FAQ dropped: "What if my problem cannot be fixed remotely?"** — the
    visible accordion already asks it ("What if the problem cannot be fixed
    remotely?") with a different answer. Answering the same question twice on
    one page helps nobody. 8 of the source's 9 Q&As are in the block.
  - **The "Ready to Fix Your IT Problem?" heading dropped**, its two lines kept
    as the block's closing paragraphs. The visible CTA banner "Ready to fix it
    today?" sits directly below the block — two near-identical headings back to
    back looked like a bug. The `Book IT Support →` / WhatsApp line was dropped
    too: those are button labels, and the page already has both the CTA banner
    and the WhatsApp float.
- Straight apostrophes normalised to typographic ones, matching #093.
- **Distinct copy per page, deliberately.** Shares no sentences with the MacBook
  or Laptop blocks — duplicate long-form text across indexed URLs makes them
  compete (the constraint recorded in `CLAUDE.md`).
- **Known overlap, accepted.** The "How Pockit IT Support Works" bullets and the
  neighbourhood list restate the page's visible `process` steps and `areasServed`
  chips in keyword-richer prose. Kept because the block is the indexable surface
  and the wording differs; flagged here so a future pass doesn't treat it as an
  accident.
- **Verified:** clean `rm -rf .next && npm run build:static`, real exit code 0.
  In `out/instant-it-help-mumbai.html` the markers appear in this order: the FAQ
  heading "Common questions, straight answers" → the last visible FAQ question
  ("Is there a warranty on a quick remote fix?") → the `Read More` pill → the
  block H2 → the first H3 → the last Q&A → the closing line → the visible CTA
  "Ready to fix it today?", with the block inside a `height:0px` wrapper.
  `out/laptop-repair-mumbai.html` and `out/macbook-repair-mumbai.html` still
  carry exactly one `Read More` each; `desktop-repair-mumbai`,
  `printer-repair-mumbai` and `index.html` carry none.
- The write went to the published document (no draft existed and none was left
  behind), so a rebuild is all that is needed — the `deploy-cpanel.yml` Action
  also fires on the Sanity publish webhook.

---

## [2026-09-24] #096 — Login popup sized as a mobile screen
- **Type:** feature
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** User wants the desktop login popup to be the size of a phone screen.
- **Related:** #094, #095

### Summary
The popup is now a mobile-screen-sized window, 390 × 844 (iPhone 14 class), with rounded
corners. Its height shrinks to fit shorter windows. The title bar was removed, and
Cancel moved below the window as a pill on the dimmed backdrop. Keyboard focus moves
to Cancel on open and returns to Login on close.

### Before
```tsx
// src/components/landing/LoginModal.tsx
const LOGIN_APP_WIDTH = 420;
<motion.div role="dialog" className="relative flex flex-col max-w-full h-[min(760px,88vh)] ... rounded-2xl ...">
    <div className="... border-b ..."><span>{HEADER.loginDialogTitle}</span><button>{HEADER.loginCancelLabel}</button></div>
    <iframe width={LOGIN_APP_WIDTH} className="flex-1 max-w-full ..." />
</motion.div>
```

### After
```tsx
// src/components/landing/LoginModal.tsx
const SCREEN_W = 390;
const SCREEN_H = 844;
<motion.div role="dialog" className="shrink-0 overflow-hidden rounded-[28px] bg-white shadow-2xl"
    style={{ width: SCREEN_W, height: `min(${SCREEN_H}px, calc(100vh - 76px - 3rem))` }}>
    <iframe className="h-full w-full border-0" />
</motion.div>
<button ref={cancelRef}>{HEADER.loginCancelLabel}</button>  {/* below the window */}
```

### Notes
- **Width stays fixed and under 420px** because of the app's layout clamp (#095). Only
  the height adapts to the window.
- A full device mockup (bezel, status bar, Dynamic Island) was tried and dropped in the
  same session. The user asked for the mobile screen *size*, not a drawn phone.
- `HEADER.loginDialogTitle` is now used only as the dialog/iframe accessible name.
- Verified: `npx tsc --noEmit` exit 0. ESLint is clean on `LoginModal.tsx`. `Header.tsx`
  still has one existing `react-hooks/set-state-in-effect` error in the theme-hydration
  effect. It predates #094 and is left for a separate pass.

---

## [2026-09-24] #095 — Fix stretched right edge in the Login popup
- **Type:** fix
- **Scope:** `src/components/landing/LoginModal.tsx`
- **Why:** The embedded app rendered at 420px inside a 480px iframe, leaving a stretched strip on the right.
- **Related:** #094

### Summary
The Pockit web app clamps its React Native layout to 420px (`MOBILE_MAX_WIDTH`). At a
viewport of 480px or more, it also switches into its own centered phone-frame mode. #094's
480px-wide iframe hit both. The iframe is now pinned to exactly 420px, and the dialog
shrink-wraps to it, so the app renders edge to edge at its design width.

### Before
```tsx
// src/components/landing/LoginModal.tsx
className="relative flex flex-col w-full max-w-[480px] h-[min(760px,88vh)] ..."
...
<iframe src={HEADER.loginHref} title={HEADER.loginDialogTitle}
    className="flex-1 w-full border-0 bg-white" />
```

### After
```tsx
// src/components/landing/LoginModal.tsx
/** Must match MOBILE_MAX_WIDTH in the Pockit web app (web/shims/react-native.ts). */
const LOGIN_APP_WIDTH = 420;
...
className="relative flex flex-col max-w-full h-[min(760px,88vh)] ..."
...
<iframe src={HEADER.loginHref} title={HEADER.loginDialogTitle}
    width={LOGIN_APP_WIDTH} className="flex-1 max-w-full border-0 bg-white" />
```

### Notes
- If the app team changes `MOBILE_MAX_WIDTH`, update `LOGIN_APP_WIDTH` to match.
- Verified: `npx tsc --noEmit` exit 0.

---

## [2026-09-24] #094 — Header "Login" button opening the Pockit web app in a centered popup
- **Type:** feature
- **Scope:** `src/components/landing/LoginModal.tsx` (new), `src/components/landing/Header.tsx`, `src/constants/copy.ts`
- **Why:** Give returning customers a direct way into the web app (`https://pockitapp.pockitengineers.com/`) from every page without leaving the site.

### Summary
A secondary outlined "Login" pill now sits right after "Book a Service" (or "Join Us" on
`/become-a-technician`) in the desktop header. Clicking it opens a centered modal that
embeds the web app in an iframe, with a "Cancel" button in the modal's title bar. Esc and
clicking the backdrop also close it. On mobile the menu gets a "Login" link that opens the
app in a new tab instead, because a modal is too cramped at phone width.

### Before
```ts
// src/constants/copy.ts
export const HEADER = {
    loginLabel: "Get the app",
    /** In-app: use `/#download` so hash works from any route */
    loginHref: "/#download",
    bookLabel: "Book a Service",
```

### After
```ts
// src/constants/copy.ts
export const HEADER = {
    /** Header "Login" CTA — opens the Pockit web app in a centered popup on
     *  desktop (`LoginModal`), a new tab from the mobile menu. CHANGELOG #094. */
    loginLabel: "Login",
    loginHref: "https://pockitapp.pockitengineers.com/",
    loginDialogTitle: "Login to Pockit",
    loginCancelLabel: "Cancel",
    bookLabel: "Book a Service",
```

### Before
```tsx
// src/components/landing/Header.tsx (desktop CTA group)
                                {HEADER.bookLabel}
                            </Link>
                        )}
                    </div>
```

### After
```tsx
// src/components/landing/Header.tsx (desktop CTA group)
                                {HEADER.bookLabel}
                            </Link>
                        )}
                        <button type="button" onClick={() => setLoginOpen(true)}
                            className="... text-theme-accent-end border border-theme-accent/40 hover:bg-theme-accent/[0.08] ..."
                            style={{ padding: "8px 22px", borderRadius: 9999 }}>
                            {HEADER.loginLabel}
                        </button>
                    </div>
// ...mobile menu: <a href={HEADER.loginHref} target="_blank"> Login </a> above the divider
// ...end of header: <LoginModal open={loginOpen} onClose={closeLogin} />
```

### Before
```tsx
// src/components/landing/LoginModal.tsx
(file did not exist)
```

### After
```tsx
// src/components/landing/LoginModal.tsx
// Portaled to <body>: backdrop (click closes) → dialog (max-w 480px, h min(760px, 88vh))
// → title bar with "Cancel" → <iframe src={HEADER.loginHref} />. Esc closes; body
// scroll locked while open. Framer Motion fade/scale entrance.
```

### Notes
- **Portal is load-bearing.** The header is a `motion.header` with a transform. A
  transformed ancestor becomes the containing block for `position: fixed`, so without
  `createPortal` the overlay would be clipped to the header bar.
- The login styling is deliberately **outlined, not the orange gradient**, so it doesn't
  compete with "Book a Service" as the primary CTA.
- Embedding works today because `pockitapp.pockitengineers.com` sends no
  `X-Frame-Options` / CSP `frame-ancestors` header (checked 2026-09-24). If the app team
  adds one, the modal will show a blank frame. Fall back to `target="_blank"` then.
- Third-party cookies: if the app's session cookie is `SameSite=Lax/Strict`, login may not
  persist inside the iframe in Safari/Chrome. Verify a full login round-trip in the popup.
- `HEADER.loginLabel` / `loginHref` were previously unused, so repurposing them has no
  other call sites.
- Verified: `npx tsc --noEmit` exit 0.

---

## [2026-09-17] #093 — Long-form "Read More" SEO block on /laptop-repair-mumbai
- **Type:** content
- **Scope:** Sanity doc `laptop-repair-mumbai` (`_id: x9AkaoQOe6dzdFl4eJwcsh`), `BLOG_TASKS.md`
- **Why:** Second service page in the Mumbai programme gets the collapsible supporting copy shipped in #087.
- **Related:** first use was `/macbook-repair-mumbai` (#087, placement settled #092)

### Summary
**No code changed** — which is the payoff of the `landingPage.seoContent` design
from #087. The laptop copy was authored straight into Sanity as 19 Portable Text
blocks and picked up by the existing `SeoContentSection` renderer, so the page
gained a "Read More" block with nothing to deploy beyond a rebuild.

### Before

```jsonc
// Sanity: landingPage "laptop-repair-mumbai"
{
  "_id": "x9AkaoQOe6dzdFl4eJwcsh",
  "title": "Laptop Repair in Mumbai | Same Day Computer Repair | Pockit Engineers",
  "faqs": [ /* 10 items */ ]
  // no seoContent field
}
```

### After

```jsonc
// Sanity: landingPage "laptop-repair-mumbai"
{
  "_id": "x9AkaoQOe6dzdFl4eJwcsh",
  "title": "Laptop Repair in Mumbai | Same Day Computer Repair | Pockit Engineers",
  "faqs": [ /* 10 items */ ],
  "seoContent": [
    { "style": "h2", "children": [{ "text": "Laptop Repair Services in Mumbai" }] },
    { "style": "h3", "children": [{ "text": "Same-Day Laptop Repair in Mumbai with Doorstep Support" }] },
    /* 2 paragraphs */
    { "style": "h3", "children": [{ "text": "Benefits of Choosing a Professional Laptop Repair Service in Mumbai" }] },
    /* 3 paragraphs */
    { "style": "h3", "children": [{ "text": "Why Choose Pockit Engineers for Laptop Repair in Mumbai" }] },
    /* 1 paragraph, 5 bullets with bolded lead-ins, 1 paragraph */
    { "style": "h3", "children": [{ "text": "Cost-Effective Laptop Repair Without Compromising Quality" }] }
    /* 2 paragraphs */
  ]
}
```

### Before

```md
<!-- BLOG_TASKS.md -->
- [ ] Author a *distinct* block for each service page: `/laptop-repair-mumbai`, `/instant-it-help-mumbai`, `/desktop-repair-mumbai`, `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
```

### After

```md
<!-- BLOG_TASKS.md -->
- [x] `/laptop-repair-mumbai` block authored (CHANGELOG #093) — 19 blocks, 5 bullets. Content-only; no code change needed
- [ ] Author a *distinct* block for the remaining service pages: `/instant-it-help-mumbai`, `/desktop-repair-mumbai`, `/printer-repair-mumbai` (the field + renderer are live; write unique copy per page)
```

### Notes
- **Two editorial calls on the supplied copy**, both matching what was done for
  the MacBook page so the two read as a set:
  - Dropped the `| Pockit Engineers` suffix from the block's H2 — that's a
    title-tag pattern, not a body heading. The H2 is "Laptop Repair Services in
    Mumbai".
  - Bolded the lead phrase of each of the five bullets ("Doorstep service",
    "Same day laptop repair in Mumbai", "Verified technicians", "Transparent
    pricing", "Real-time tracking"). The source had them as plain sentences;
    the MacBook block already uses bolded lead-ins.
- Copy is otherwise verbatim, with straight apostrophes normalised to
  typographic ones.
- **Distinct copy per page, deliberately.** This block shares no sentences with
  the MacBook one — duplicate long-form text across indexed URLs makes them
  compete (the constraint recorded in `CLAUDE.md`).
- **Verified:** clean `rm -rf .next && npm run build:static`, real exit code 0.
  `out/laptop-repair-mumbai.html` carries the H2, all four H3s and the closing
  line behind a `height:0px` wrapper, with the pill ordered between "Common
  questions, straight answers" and "Ready to fix it today".
  `out/macbook-repair-mumbai.html` unchanged; `out/index.html` still has no
  Read More block.

---

## [2026-09-08] #092 — Move the "Read More" SEO block back to /macbook-repair-mumbai; drop the home-page copy
- **Type:** refactor
- **Scope:** `src/components/landing/SeoContentBlock.tsx` (removed), `src/components/landing/AppShell.tsx`, `src/constants/copy.ts`, `src/components/landing-pages/LandingPageView.tsx`, `src/components/seo/ReadMoreContent.tsx`, `CLAUDE.md`, `docs/LANDING_PAGES.md`, `BLOG_TASKS.md`, Sanity doc `macbook-repair-mumbai`
- **Why:** User settled the placement: the MacBook block belongs on `/macbook-repair-mumbai`, not the home page.
- **Related:** reverses the move made in #088; restores the #087 placement, keeping the #089/#090/#091 refinements

### Summary
The home-page block is gone — unmounted from `AppShell`, its component deleted,
and `HOME_SEO_CONTENT` removed from `copy.ts`. The copy went back into Sanity on
`macbook-repair-mumbai`, generated from the exact `HOME_SEO_CONTENT` values that
were live on the home page so not a character drifted. The landing-page section
keeps everything learned in between: hidden by default (#089), an accent pill
above the copy (#090), and the tightened gap under the FAQ (#091, applied here
as `-mt-8` against `FaqSection`'s `py-16 sm:py-20`).

### Before

```tsx
// src/components/landing/AppShell.tsx
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
const SeoContentBlock = dynamic(() => import("@/components/landing/SeoContentBlock"));
// …
            <FAQ />
            <SeoContentBlock />
            <DownloadBand />
```

```ts
// src/constants/copy.ts
// ─── Home-page long-form SEO copy (collapsed behind "Read More") ─────────────
export interface SeoBullet { /* … */ }
export type SeoContentNode = /* … */;
export interface SeoContentSubsection { /* … */ }
export interface SeoContentDoc { /* … */ }
export const HOME_SEO_CONTENT: SeoContentDoc = { heading: "MacBook Repair Services in Mumbai", sections: [ /* 5 sections */ ] };
```

```tsx
// src/components/landing/SeoContentBlock.tsx
export default function SeoContentBlock() { /* rendered HOME_SEO_CONTENT through ReadMoreContent */ }
```

```tsx
// src/components/landing-pages/LandingPageView.tsx
        <section className="pt-4 pb-16 sm:pb-20">
```

### After

```tsx
// src/components/landing/AppShell.tsx
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
// …
            <FAQ />
            <DownloadBand />
```

```ts
// src/constants/copy.ts
// (section removed — file now ends at FAQ_ITEMS, as it did before #088)
```

```tsx
// src/components/landing/SeoContentBlock.tsx
// (file removed — the home page no longer carries a long-form SEO block;
//  the copy lives in Sanity on macbook-repair-mumbai)
```

```tsx
// src/components/landing-pages/LandingPageView.tsx
    // `-mt-8` pulls the block up into the FAQ section's own bottom padding so
    // the pill reads as a continuation of the accordion, not a new section.
    return (
        <section className="-mt-8 pb-16 sm:pb-20">
```

### Notes
- **Copy re-pushed from the live values, not retyped.** A throwaway `tsx` script
  imported `HOME_SEO_CONTENT` and converted it to Portable Text, so the Sanity
  document is byte-identical to what the home page was rendering. Verified:
  33 blocks, 15 bullets, styles `[h2, h3, normal]`, H2 "MacBook Repair Services
  in Mumbai".
- **`ReadMoreContent` stays generic** even though only one surface uses it now —
  it's the shared shell for any future landing page that fills `seoContent`.
- **This is the better SEO outcome anyway.** `/macbook-repair-mumbai` is the page
  built to rank for these terms; the home page's topical focus stays the whole
  service catalogue, and the two no longer risk competing.
- **`content_expanded` still applies** — it now only ever fires with a
  landing-page slug, never `page_slug: "home"`. No rename needed.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on all touched files
  (one pre-existing warning on `IntroSection`); clean
  `rm -rf .next && npm run build:static` exits 0 with the block present in
  `out/macbook-repair-mumbai.html` behind a `height:0px` wrapper and absent from
  `out/index.html`.

---

## [2026-09-08] #091 — Tighten the gap between the FAQ and the "Read More" pill
- **Type:** fix
- **Scope:** `src/components/landing/SeoContentBlock.tsx`
- **Why:** ~96px sat between "See 7 More Questions" and the Read More pill, reading as two unrelated sections rather than one group.
- **Related:** follows the pill restyle in #090

### Summary
The gap was the FAQ section's own `py-24` bottom padding, not the SEO block's
— `pt-0` couldn't shrink it. The block is now pulled back up into that padding
with `-mt-16`, closing the gap from ~96px to ~32px. Its background drops to
transparent so the FAQ's bottom fade still reads through the overlap; the page
is already `--bg-primary`, which is what `bg-theme-bg` was painting anyway.
`FAQ.tsx` is left untouched — it's a shared section and its rhythm shouldn't
shift because of what happens to follow it.

### Before

```tsx
// src/components/landing/SeoContentBlock.tsx
        <section
            id="more-about-our-services"
            className="relative bg-theme-bg pt-0 pb-16 sm:pb-20"
        >
```

### After

```tsx
// src/components/landing/SeoContentBlock.tsx
        <section
            id="more-about-our-services"
            /* The FAQ section above ends with 96px of its own `py-24` bottom
               padding. This block is a continuation of that group, not a new
               one, so it is pulled back up into that padding rather than the
               FAQ's shared rhythm being changed. Background stays transparent
               (the page is already `--bg-primary`) so the FAQ's bottom fade
               still reads through. */
            className="relative -mt-16 pb-16 sm:pb-20"
        >
```

### Notes
- **Why a negative margin and not smaller FAQ padding:** `FAQ.tsx` is a shared
  landing section. Trimming its `py-24` would leave it sitting too close to
  `DownloadBand` on any page where the SEO block isn't rendered. The offset
  belongs to the block that wants to sit closer.
- **`bg-theme-bg` removed, not replaced.** It resolved to `--bg-primary`, which
  the body already paints, so dropping it changes nothing visually while
  letting the FAQ's `h-20` bottom gradient show through the overlapped region.
- Overlap is safe: the FAQ's fade is `pointer-events-none` and decorative, and
  this section paints after it in DOM order, so the pill stays clickable.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean;
  `npm run build:static` exits 0 with
  `<section id="more-about-our-services" class="relative -mt-16 pb-16 sm:pb-20">`
  in `out/index.html`, section order and the `height:0px` collapsed wrapper
  both unchanged.

---

## [2026-09-08] #090 — "Read More" becomes a SectionPill-style chip, moved above the copy
- **Type:** refactor
- **Scope:** `src/components/seo/ReadMoreContent.tsx`, `src/components/landing/SeoContentBlock.tsx`, `CLAUDE.md`
- **Why:** A full-width orange gradient CTA read as a primary action competing with "Book a Service"; the user wants the quiet accent pill used by `SectionPill`, sitting directly below "See 7 More Questions".
- **Related:** restyles the toggle introduced in #087 and defaulted to fully-hidden in #089

### Summary
The toggle now renders as the same rounded accent chip as
`src/components/landing/SectionPill.tsx` — `bg-theme-accent/[0.06]`,
`border-theme-accent/20`, 12px semibold accent text — and moved **above** the
copy so a collapsed block is just a small pill under the FAQ's "See 7 More
Questions" button. The gap between pill and copy moved inside the animated box
so it collapses with the copy instead of leaving 32px of dead space, and the
section's top padding dropped to 0 now that the FAQ section's own `py-24`
supplies the separation.

### Before

```tsx
// src/components/seo/ReadMoreContent.tsx — copy first, gradient CTA below it
    return (
        <>
            <div className="relative">
                <motion.div id={regionId} animate={{ height: expanded ? "auto" : collapsedPx }} className="overflow-hidden">
                    {children}
                </motion.div>
                {!expanded && collapsedPx > 0 ? <div /* fade */ /> : null}
            </div>

            <div className="mt-6 flex justify-center">
                <motion.button
                    className="inline-flex items-center gap-2.5 rounded-2xl border px-7 py-3.5 text-[14px] font-bold transition-colors duration-200"
                    style={{
                        background: expanded
                            ? "rgb(var(--accent-primary) / 0.10)"
                            : "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
                        border: expanded ? "1px solid rgb(var(--accent-primary) / 0.30)" : "1px solid transparent",
                        color: expanded ? "rgb(var(--accent-primary))" : "#ffffff",
                        boxShadow: expanded ? "none" : "0 8px 24px rgb(var(--accent-primary) / 0.30)",
                    }}
                >
                    <ChevronDown className={`w-4 h-4 … ${expanded ? "rotate-180" : ""}`} />
                    {expanded ? "Read Less" : "Read More"}
                </motion.button>
            </div>
        </>
    );
```

### After

```tsx
// src/components/seo/ReadMoreContent.tsx — pill first, copy unfolds beneath it
    return (
        <>
            <div className="flex justify-center">
                {/* Same accent pill as SectionPill — deliberately quiet, so it
                    doesn't read as a primary CTA next to "Book a Service". */}
                <motion.button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={regionId}
                    onClick={() => { const next = !expanded; setExpanded(next); if (next) onExpand?.(); }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 border border-theme-accent/20 bg-theme-accent/[0.06] hover:bg-theme-accent/[0.12] hover:border-theme-accent/35 transition-colors duration-200"
                >
                    <span className="text-[12px] font-semibold text-theme-accent tracking-wide">
                        {expanded ? "Read Less" : "Read More"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-theme-accent … ${expanded ? "rotate-180" : ""}`} />
                </motion.button>
            </div>

            <div className="relative">
                <motion.div id={regionId} animate={{ height: expanded ? "auto" : collapsedPx }} className="overflow-hidden">
                    {/* Padding lives INSIDE the animated box so the gap between
                        pill and copy collapses along with the copy. */}
                    <div className="pt-8">{children}</div>
                </motion.div>
                {!expanded && collapsedPx > 0 ? <div /* fade */ /> : null}
            </div>
        </>
    );
```

### Before

```tsx
// src/components/landing/SeoContentBlock.tsx
            className="relative bg-theme-bg pt-6 pb-16 sm:pb-20"
```

### After

```tsx
// src/components/landing/SeoContentBlock.tsx
            className="relative bg-theme-bg pt-0 pb-16 sm:pb-20"
```

### Notes
- **Pill-above-copy is the layout for both surfaces**, not a prop. A landing
  page using `landingPage.seoContent` gets the same arrangement.
- The chevron is kept (scaled to 3.5) for expand affordance — `SectionPill`
  itself has no icon, but that's a static label, not a control.
- `aria-expanded` / `aria-controls` still wire the pill to the region, so the
  control keeps announcing its state now that it precedes the content.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on both files;
  `npm run build:static` exits 0, `out/index.html` still carries the full copy
  behind a `height:0px` wrapper with the pill markup ahead of it.

---

## [2026-09-08] #089 — "Read More" block starts fully hidden, no teaser
- **Type:** fix
- **Scope:** `src/components/seo/ReadMoreContent.tsx`, `src/components/landing/SeoContentBlock.tsx`, `CLAUDE.md`
- **Why:** #087/#088 left ~340px of copy visible above the button; the user wants **nothing** shown until Read More is clicked.
- **Related:** adjusts the collapse behaviour introduced in #087 and shared in #088

### Summary
`collapsedPx` now defaults to `0`, so the collapsed state renders only the
button — no teaser paragraph, no heading. The teaser fade is skipped whenever
`collapsedPx` is 0 (there is no cut-off edge to soften), and the home-page
section's top padding is trimmed now that it opens with a lone button instead
of a block of text. The copy is still always in the DOM behind a zero-height
`overflow-hidden` wrapper, so it indexes exactly as before.

### Before

```tsx
// src/components/seo/ReadMoreContent.tsx
interface ReadMoreContentProps {
    readonly children: ReactNode;
    /** Height of the clamped state, in px. Roughly one screenful on mobile. */
    readonly collapsedPx?: number;
    // …
}

export default function ReadMoreContent({
    children,
    collapsedPx = 340,
    onExpand,
    fadeTo = "rgb(var(--bg-primary))",
}: ReadMoreContentProps) {
    // …
                {!expanded ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                        style={{ background: `linear-gradient(to bottom, transparent, ${fadeTo})` }}
                    />
                ) : null}
```

```tsx
// src/components/landing/SeoContentBlock.tsx
        <section
            id="more-about-our-services"
            className="relative bg-theme-bg pt-16 pb-20 sm:pt-20 sm:pb-24"
        >
```

### After

```tsx
// src/components/seo/ReadMoreContent.tsx
interface ReadMoreContentProps {
    readonly children: ReactNode;
    /**
     * Height of the clamped state, in px. Defaults to 0 — fully hidden, only
     * the button shows. A positive value leaves that many px visible as a
     * teaser and draws a fade over the cut-off edge.
     */
    readonly collapsedPx?: number;
    // …
}

export default function ReadMoreContent({
    children,
    collapsedPx = 0,
    onExpand,
    fadeTo = "rgb(var(--bg-primary))",
}: ReadMoreContentProps) {
    // …
                {!expanded && collapsedPx > 0 ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                        style={{ background: `linear-gradient(to bottom, transparent, ${fadeTo})` }}
                    />
                ) : null}
```

```tsx
// src/components/landing/SeoContentBlock.tsx
        <section
            id="more-about-our-services"
            className="relative bg-theme-bg pt-6 pb-16 sm:pb-20"
        >
```

### Notes
- **Fully hidden is now the house default**, not a per-call-site opt-in. A
  future landing page using `landingPage.seoContent` gets the same behaviour
  with no extra wiring. Pass an explicit `collapsedPx={340}` if a teaser is
  ever wanted again.
- **SEO is unaffected.** The children still render into a zero-height
  `overflow-hidden` wrapper rather than being conditionally mounted, so the
  full text remains in the served HTML — verified in `out/index.html`.
- **UX note flagged to the user:** collapsed, the section is a lone orange
  "Read More" button with no surrounding context. Keeping the H2 visible as
  an anchor would read more naturally; the user asked for no visible text, so
  that's what shipped.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on both files;
  `npm run build:static` exits 0 with the full copy present in `out/index.html`
  and the wrapper collapsed.

---

## [2026-09-08] #088 — Move the "Read More" SEO block to the home page; extract a shared collapse shell
- **Type:** feature
- **Scope:** `src/components/seo/ReadMoreContent.tsx` (new), `src/components/landing/SeoContentBlock.tsx` (new), `src/components/landing/AppShell.tsx`, `src/components/landing-pages/LandingPageView.tsx`, `src/constants/copy.ts`, `src/lib/analytics.ts`, `docs/LANDING_PAGES.md`, Sanity doc `macbook-repair-mumbai`
- **Why:** #087 put the MacBook block on `/macbook-repair-mumbai`; the user wanted it on the **home page**, below the FAQ accordion.
- **Related:** supersedes the placement decided in #087 (the infrastructure from #087 stays)

### Summary
The collapse behaviour and typography from #087 are extracted into a shared
`ReadMoreContent` shell, and a new home-page `SeoContentBlock` renders the
MacBook copy through it — mounted between `<FAQ />` and `<DownloadBand />`.
The Sanity-backed landing-page section now renders through the same shell, so
the two surfaces cannot drift apart visually. The copy was **unset** on the
`macbook-repair-mumbai` document: the same 400-word block on two indexed URLs
would make them compete for the same queries, so it now lives in exactly one
place. The `landingPage.seoContent` field, its GROQ projection and its
serializers all remain in place and working — any landing page can still opt in.

### Before

```tsx
// src/components/landing-pages/LandingPageView.tsx — #087 owned the collapse inline
const SEO_CONTENT_COLLAPSED_PX = 340;

function SeoContentSection({ blocks, pageSlug }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <section className="pt-4 pb-16 sm:pb-20">
            <div className="mx-auto w-[92%] max-w-[820px]">
                <div className="relative">
                    <motion.div animate={{ height: expanded ? "auto" : SEO_CONTENT_COLLAPSED_PX }} …>
                        <PortableText value={blocks} components={seoContentComponents} />
                    </motion.div>
                    {!expanded ? <div className="… fade" /> : null}
                </div>
                <motion.button onClick={…}>{expanded ? "Read Less" : "Read More"}</motion.button>
            </div>
        </section>
    );
}

const seoContentComponents: PortableTextComponents = {
    block: { h2: /* inline classes */, h3: /* inline classes */, normal: /* inline classes */ },
    // …
};
```

### After

```tsx
// src/components/seo/ReadMoreContent.tsx — NEW: the shell, content-agnostic
export const SEO_PROSE = {
    h2: "mt-10 first:mt-0 mb-4 text-2xl sm:text-3xl font-black tracking-tight text-theme-text",
    h3: "mt-9 first:mt-0 mb-3 text-lg sm:text-xl font-bold tracking-tight text-theme-text",
    p: "my-4 first:mt-0 text-[15px] sm:text-[16px] leading-[1.85] text-theme-text/75",
    ul: "my-5 space-y-2.5 list-none pl-0",
    li: "relative pl-7 text-[15px] sm:text-[16px] leading-[1.8] text-theme-text/75",
    strong: "font-semibold text-theme-text",
} as const;

export default function ReadMoreContent({ children, collapsedPx = 340, onExpand, fadeTo }) {
    const [expanded, setExpanded] = useState(false);
    const regionId = useId();
    // clamp + fade + aria-expanded/aria-controls button — see the file
}
```

```tsx
// src/components/landing-pages/LandingPageView.tsx — now just supplies content
function SeoContentSection({ blocks, pageSlug }) {
    return (
        <section className="pt-4 pb-16 sm:pb-20">
            <div className="mx-auto w-[92%] max-w-[820px]">
                <ReadMoreContent
                    onExpand={() =>
                        trackEvent(AnalyticsEvents.ContentExpanded, { page_slug: pageSlug })
                    }
                >
                    <PortableText value={blocks} components={seoContentComponents} />
                </ReadMoreContent>
            </div>
        </section>
    );
}

const seoContentComponents: PortableTextComponents = {
    block: {
        h2: ({ children }) => <h2 className={SEO_PROSE.h2} style={SEO_HEADING_FONT}>{children}</h2>,
        // …same SEO_PROSE strings the home page uses
    },
};
```

### Before

```tsx
// src/components/landing/AppShell.tsx
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
// …
            <FAQ />
            <DownloadBand />
```

### After

```tsx
// src/components/landing/AppShell.tsx
const FAQ = dynamic(() => import("@/components/landing/FAQ"));
const SeoContentBlock = dynamic(() => import("@/components/landing/SeoContentBlock"));
// …
            <FAQ />
            <SeoContentBlock />
            <DownloadBand />
```

### Before

```ts
// src/constants/copy.ts — (no long-form SEO copy)
```

### After

```ts
// src/constants/copy.ts
export type SeoContentNode =
    | { readonly type: "p"; readonly text: string }
    | { readonly type: "bullets"; readonly items: readonly SeoBullet[] };

export const HOME_SEO_CONTENT: SeoContentDoc = {
    heading: "MacBook Repair Services in Mumbai",
    sections: [
        { heading: "Same-Day MacBook Repair in Mumbai with Doorstep Support", body: [ /* … */ ] },
        { heading: "Benefits of Choosing a Professional MacBook Repair Service in Mumbai", body: [ /* … */ ] },
        { heading: "Why Choose Pockit Engineers for Apple MacBook Repair in Mumbai", body: [ /* … */ ] },
        { heading: "Common Problems We Fix During MacBook Repair in Mumbai", body: [ /* … */ ] },
        { heading: "Affordable Apple MacBook Repair in Mumbai Without Compromising Quality", body: [ /* … */ ] },
    ],
};
```

### Before

```ts
// src/lib/analytics.ts
    LandingFaqExpanded: "landing_faq_expanded",
    LandingContentExpanded: "landing_content_expanded",
```

### After

```ts
// src/lib/analytics.ts
    LandingFaqExpanded: "landing_faq_expanded",

    // Long-form "Read More" SEO block. Fires on the home page AND on any
    // Sanity landing page carrying `seoContent` — `page_slug` says which
    // ("home" | the landing-page slug). See CHANGELOG #087, #088.
    ContentExpanded: "content_expanded",
```

### Notes
- **Event renamed before anyone registered it.** `landing_content_expanded`
  (#087, one day old, never registered in GA4 admin) became
  `content_expanded`, because it now fires on the home page too. Register
  **`content_expanded`** — param `page_slug` (`"home"` or a landing-page slug).
- **Copy lives in two different places by design.** The home block is a code
  constant (`HOME_SEO_CONTENT` in `copy.ts`) because the home page has never
  been Sanity-driven; landing pages stay Sanity-authored. Both render through
  `SEO_PROSE`, so they look the same.
- **`seoContent` unset on `macbook-repair-mumbai`.** Verified `defined(seoContent) == false`.
  To put it back, re-author the field in Studio — the schema, projection and
  serializers are all still live.
- **The home page now carries MacBook-specific copy.** Worth a second look:
  `/macbook-repair-mumbai` is the page built to rank for those terms, and the
  home page's topical focus is the whole service catalogue. Flagged to the
  user; placement is their call.
- **`SeoContentBlock` is lazy-loaded** via `next/dynamic`, matching every other
  below-the-fold section in `AppShell`, so it costs nothing on first paint.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on all touched
  files (one pre-existing warning on `IntroSection`); `npm run build:static`
  exits 0 with all six headings, the 15 ticked bullets and the Read More button
  present in `out/index.html` between the FAQ accordion and the download band,
  and `out/macbook-repair-mumbai.html` back to its pre-#087 state.

---

## [2026-09-08] #087 — Collapsible long-form SEO content block below the FAQ on landing pages
- **Type:** feature
- **Scope:** `sanity/schemas/landingPage.ts`, `src/lib/sanity/types.ts`, `src/lib/sanity/queries.ts`, `src/components/landing-pages/LandingPageView.tsx`, `src/lib/analytics.ts`, `docs/LANDING_PAGES.md`, Sanity doc `macbook-repair-mumbai`
- **Why:** The Mumbai SEO programme needs keyword-dense supporting copy on service pages without pushing the closing CTA below a wall of prose.
- **Related:** follows the landing-page programme in #022 / #037 and the SEO audit follow-through in #031–#036

### Summary
Adds a new `seoContent` Portable Text field to the `landingPage` schema and a
`SeoContentSection` that renders it directly below the FAQ accordion, visually
clamped to 340px behind a **Read More** button. The copy is *always* present in
the HTML — the collapse is a pure height clamp plus a fade, never a conditional
render — so crawlers and answer engines index every word while visitors see a
tidy page. The first page to use it is `/macbook-repair-mumbai`, whose copy was
authored into Sanity; every other landing page renders exactly as before because
the section is skipped when the field is empty.

### Before

```ts
// sanity/schemas/landingPage.ts
        defineField({
            name: "process",
            title: "How it works (steps)",
            // …
        }),

        // ── Local SEO ─────────────────────────────────────────────────────
```

### After

```ts
// sanity/schemas/landingPage.ts
        defineField({
            name: "process",
            title: "How it works (steps)",
            // …
        }),
        defineField({
            name: "seoContent",
            title: "Long-form SEO content (collapsed behind “Read More”)",
            description:
                "Keyword-rich supporting copy rendered below the FAQ accordion. It is always " +
                "present in the page HTML — crawlers and answer engines read all of it — but " +
                "visually clamped until the visitor taps “Read More”. Lead with one H2 for the " +
                "block title, then an H3 per sub-section. Bullet lists render as ticked items.",
            type: "array",
            group: "sections",
            of: [
                {
                    type: "block",
                    styles: [
                        { title: "Normal", value: "normal" },
                        { title: "H2", value: "h2" },
                        { title: "H3", value: "h3" },
                    ],
                    lists: [{ title: "Bullet", value: "bullet" }],
                    marks: {
                        decorators: [
                            { title: "Strong", value: "strong" },
                            { title: "Emphasis", value: "em" },
                        ],
                    },
                },
            ],
        }),

        // ── Local SEO ─────────────────────────────────────────────────────
```

### Before

```ts
// src/lib/sanity/types.ts
    readonly process?: readonly LandingPageProcessStep[];
    readonly areasServed?: readonly LandingPageAreaServed[];
```

```ts
// src/lib/sanity/queries.ts  (LANDING_DETAIL_PROJECTION)
    process,
    areasServed,
```

### After

```ts
// src/lib/sanity/types.ts
    readonly process?: readonly LandingPageProcessStep[];
    readonly seoContent?: PortableTextBlocks;
    readonly areasServed?: readonly LandingPageAreaServed[];
```

```ts
// src/lib/sanity/queries.ts  (LANDING_DETAIL_PROJECTION)
    process,
    seoContent,
    areasServed,
```

### Before

```tsx
// src/components/landing-pages/LandingPageView.tsx
import { PortableText } from "@portabletext/react";
// …
                {page.faqs && page.faqs.length > 0 ? (
                    <FaqSection items={page.faqs} pageSlug={page.slug.current} />
                ) : null}

                <CtaBanner /* … */ />
```

### After

```tsx
// src/components/landing-pages/LandingPageView.tsx
import { PortableText, type PortableTextComponents } from "@portabletext/react";
// …
                {page.faqs && page.faqs.length > 0 ? (
                    <FaqSection items={page.faqs} pageSlug={page.slug.current} />
                ) : null}

                {page.seoContent && page.seoContent.length > 0 ? (
                    <SeoContentSection
                        blocks={page.seoContent}
                        pageSlug={page.slug.current}
                    />
                ) : null}

                <CtaBanner /* … */ />

// …and, declared below FaqSection (abridged — see the file for the full styling):

/** Height of the clamped state, in px. Roughly one screenful on mobile. */
const SEO_CONTENT_COLLAPSED_PX = 340;

function SeoContentSection({ blocks, pageSlug }: { /* … */ }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <section className="pt-4 pb-16 sm:pb-20">
            <div className="mx-auto w-[92%] max-w-[820px]">
                <div className="relative">
                    <motion.div
                        id="landing-seo-content"
                        initial={false}
                        animate={{ height: expanded ? "auto" : SEO_CONTENT_COLLAPSED_PX }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <PortableText value={blocks} components={seoContentComponents} />
                    </motion.div>

                    {!expanded ? (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                            style={{ background: "linear-gradient(to bottom, transparent, rgb(var(--bg-primary)))" }}
                        />
                    ) : null}
                </div>

                <motion.button
                    aria-expanded={expanded}
                    aria-controls="landing-seo-content"
                    onClick={/* toggle + trackEvent(AnalyticsEvents.LandingContentExpanded) */}
                >
                    {expanded ? "Read Less" : "Read More"}
                </motion.button>
            </div>
        </section>
    );
}

/** Explicit serializers — @tailwindcss/typography is NOT installed, so `prose` is a no-op here. */
const seoContentComponents: PortableTextComponents = {
    block: { h2: /* … */, h3: /* … */, normal: /* … */ },
    list: { bullet: /* … */ },
    listItem: { bullet: /* CheckCircle2 tick + text */ },
    marks: { strong: /* … */, em: /* … */ },
};
```

### Before

```ts
// src/lib/analytics.ts
    LandingFaqExpanded: "landing_faq_expanded",
```

### After

```ts
// src/lib/analytics.ts
    LandingFaqExpanded: "landing_faq_expanded",
    LandingContentExpanded: "landing_content_expanded",
```

### Notes
- **Content lives in Sanity, not in code.** The MacBook copy (33 Portable Text
  blocks: 1 × H2, 5 × H3, 12 paragraphs, 15 ticked bullets) was patched into the
  published `macbook-repair-mumbai` document with the write token, guarded by
  `ifRevisionId`. That document has no draft, so the change is live to the next
  build. Any future landing page gets the same treatment by filling the field in
  Studio — no code change.
- **Studio needs a redeploy** before editors can see the new field:
  `npx sanity deploy`. Reads already work (GROQ doesn't consult the deployed
  schema); only the Studio UI is stale until then.
- **`prose` classes are dead in this repo.** `tailwind.config.ts` has
  `plugins: []`, so the `prose prose-lg …` classes on the existing
  `IntroSection` render nothing. The new section therefore ships explicit
  Portable Text serializers. `IntroSection` still carries the no-op classes —
  pointing it at `seoContentComponents` is a one-line follow-up.
- **Register `landing_content_expanded`** in GA4 admin alongside
  `landing_faq_expanded`. Param: `page_slug`.
- **Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on every touched
  file (one pre-existing warning on `IntroSection`); `npm run build:static`
  exits 0 and `out/macbook-repair-mumbai.html` contains all six new headings,
  the bullet list and the Read More button, sitting between "Common questions,
  straight answers" and "Ready to fix it today?". `out/printer-repair-mumbai.html`
  is unchanged (0 occurrences of "Read More"), confirming the section stays
  inert on pages without the field.
- **Copy nit left as authored:** the "Why Choose Pockit Engineers" paragraph
  says "stands apart on three fronts" but four bullets follow. Left verbatim —
  it's a one-field edit in Studio.

---

## [2026-08-14] #086 — Send the form data with the browser event too (Meta Advanced Matching), single-source the pixel id
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `src/app/layout.tsx`, `docs/ANALYTICS.md`
- **Why:** The browser event showed only "Advanced matching parameters: IP address, User agent" — the submitted name/phone/city were reaching Meta server-side only. User wants the data attached to the event itself.
- **Related:** completes #084/#085

### Summary
`applyAdvancedMatching()` now re-`init`s the Pixel with `{fn, ln, ph, ct, country}` immediately before the track call, so the browser half of the event carries the submitted details as well as the CAPI half. This is Meta's sanctioned mechanism — the Pixel SHA-256-hashes each value in the browser, so nothing travels in cleartext and nothing goes into `custom_data`, which Meta's terms forbid for PII. The pixel id also moved into `metaPixel.ts` as the single source of truth, since Advanced Matching needs it and `layout.tsx` was holding a duplicate literal.

### Before
```ts
// src/lib/metaPixel.ts — PII deliberately withheld from the browser call
    if (typeof window.fbq === "function") {
        // `userData` is deliberately NOT passed here — PII goes to the relay
        // only, never into the browser payload (see MetaUserData).
        window.fbq(method, event, customData, { eventID: eventId });
    }
```

```tsx
// src/app/layout.tsx — pixel id duplicated here
const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1274218051363697";
```

### After
```ts
// src/lib/metaPixel.ts
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1274218051363697";

// Mirrors `hashPhone` in the CAPI route — if the two normalise differently,
// Meta receives two unrelated digests for one person and the match is lost.
function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "").replace(/^0+/, "");
    return digits.length === 10 ? "91" + digits : digits;
}

function applyAdvancedMatching(userData: MetaUserData): void {
    if (typeof window.fbq !== "function" || !META_PIXEL_ID) return;

    const matching: Record<string, string> = {};
    if (userData.firstName) matching.fn = userData.firstName;
    if (userData.lastName) matching.ln = userData.lastName;
    if (userData.phone) matching.ph = normalizePhone(userData.phone);
    if (userData.city) matching.ct = userData.city;
    if (userData.country) matching.country = userData.country;

    if (Object.keys(matching).length === 0) return;
    window.fbq("init", META_PIXEL_ID, matching);
}

    if (typeof window.fbq === "function") {
        // Advanced Matching must be attached BEFORE the track call to apply to
        // it — the Pixel hashes these itself (#086). `userData` still never
        // enters `customData`: Meta forbids PII in event parameters.
        if (userData) applyAdvancedMatching(userData);
        window.fbq(method, event, customData, { eventID: eventId });
    }
```

```tsx
// src/app/layout.tsx — imports the shared constant, no local literal
import { META_PIXEL_ID } from "@/lib/metaPixel";
```

### Notes
- **What the user will actually see:** Events Manager lists the *names* of matched fields, never the values — "Advanced matching parameters: First name, Last name, Phone, City, Country". That listing IS the confirmation the data went with the event. Putting the raw values where they'd be readable would require `custom_data`, which violates Meta's Business Tools Terms and gets detected and dropped.
- `normalizePhone` on the client deliberately duplicates the relay's `hashPhone` rule rather than sharing code across the client/server boundary. The server rule is idempotent, so a number normalised here passes through unchanged — but if either is edited, **both must change** or browser and server hash different strings.
- Re-`init`-ing the Pixel with a user-data object is additive per Meta's docs, not a reset; matching applies to events fired afterwards in the same page session. Harmless here — the form unmounts into the success card straight after.
- Guarded on an empty matching object so a call with no usable fields doesn't pointlessly re-init.
- Verified: full `npm run build:static` succeeds (this change crosses the server→client import boundary — `layout.tsx` is a server component importing from `metaPixel.ts` — so a compile-only check wasn't sufficient). Confirmed in the built bundle that the init lands immediately before the track call: `…&&window.fbq("init",t,r)}(a),window.fbq(e,o,i,{eventID:l})`. `tsc` and `eslint` clean; the one `layout.tsx` lint warning (GTM inline script) is pre-existing and untouched.
- `@sendgrid/mail` was installed locally with `--no-save` to get a full build — it was already in `package.json` but missing from local `node_modules`, which had been masking type-check completion. `package.json` and `package-lock.json` are unchanged.

## [2026-08-14] #085 — Rename the Meta technician conversion to `technician_apply_submit` (match the GA4 name)
- **Type:** refactor
- **Scope:** `src/lib/metaPixel.ts`, `docs/ANALYTICS.md`, `CLAUDE.md`
- **Why:** User searched Events Manager for `technician_apply_submit` and got 0 results — that name was GA4-only, while Meta used `TechnicianApplication`. They want one name across both.
- **Related:** renames the event introduced in #084

### Summary
The Meta custom event is now `technician_apply_submit`, identical to the GA4 event name, so a single form submission reads the same in Events Manager and GA4. Trigger, payload and Advanced Matching are unchanged — only the event name moved. Done now because the old name had been live for well under a day, so there is effectively no history to strand.

### Before
```ts
// src/lib/metaPixel.ts
/**
 * Technician application form SUBMITTED SUCCESSFULLY → custom
 * `TechnicianApplication` event. CHANGELOG #084.
 * ...
 */
export function trackTechnicianApplication(details: { ... }): void {
    trackCustom(
        "TechnicianApplication",
        { skills: ..., skill_count: ... },
        { firstName: ..., lastName: ..., phone: ..., city: ..., country: "in" },
    );
}
```

### After
```ts
// src/lib/metaPixel.ts
/**
 * Technician application form SUBMITTED SUCCESSFULLY → custom
 * `technician_apply_submit` event. CHANGELOG #084, renamed in #085.
 * ...
 * NAME: intentionally identical to the GA4 event `AnalyticsEvents
 * .TechnicianApplySubmit` ("technician_apply_submit" in src/lib/analytics.ts),
 * so one submission reads the same in Events Manager and GA4. The string is
 * duplicated rather than imported on purpose — this module is deliberately
 * decoupled from analytics.ts (see the header) so a change to GA can never
 * alter what Meta receives. If you rename it in one place, rename it in both.
 * Note this breaks the PascalCase convention of the three older Meta events;
 * that's an accepted trade for cross-platform name parity.
 * ...
 */
export function trackTechnicianApplication(details: { ... }): void {
    trackCustom(
        // Keep in sync with AnalyticsEvents.TechnicianApplySubmit — see above.
        "technician_apply_submit",
        { skills: ..., skill_count: ... },
        { firstName: ..., lastName: ..., phone: ..., city: ..., country: "in" },
    );
}
```

### Notes
- **String duplicated, not imported, deliberately.** `metaPixel.ts` is decoupled from `analytics.ts` by a standing decision in its file header ("Meta and GA stay independent — changing one never touches the other"). Importing `AnalyticsEvents` to share the literal would break that boundary for a cosmetic gain. The cost is a rename must be applied in both files; both sites now carry a cross-reference comment saying so, and it's recorded in `CLAUDE.md`.
- **Action required in Events Manager:** any custom conversion built on `TechnicianApplication` must be recreated against `technician_apply_submit`. Meta treats the two as unrelated events — no history carries over. Data under the old name (a few test submissions from 2026-08-14) is stranded and can be ignored.
- The exported function keeps the name `trackTechnicianApplication` — it's a code identifier, not the wire event name, and reads better at the call site.
- Naming now diverges from the three older Meta events (`WhatsAppContact`, `PlayStoreClick`, `AppStoreClick`, all PascalCase). Left alone: they have live history and renaming them would strand it for no benefit. Aligning them later is a deliberate choice, not a cleanup to do casually.
- Verified: `npx tsc --noEmit` and `npx eslint` clean; grepped `src/` and `public/` to confirm no `TechnicianApplication` event-name string survives (remaining hits are the exported function name and an unrelated TS interface in the SendGrid route).

## [2026-08-14] #084 — Fire a Meta conversion on technician-form SUBMIT (not click), with hashed Advanced Matching
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `src/app/api/meta/capi/route.server.ts`, `src/components/expert/TechnicianForm.tsx`, `docs/ANALYTICS.md`, `CLAUDE.md`
- **Why:** User asked for a Meta event that fires only once an application is actually submitted, carrying the submitted details — not on the "Apply Now" press.
- **Related:** builds on #083 (`_fbp`/`_fbc` minting, CAPI user_data)

### Summary
`TechnicianForm` now fires a `TechnicianApplication` custom event from its submit handler *after* the relay returns OK, next to the existing GA event — so a press that never became an application is never counted. The submitted name, phone and city travel as **hashed Advanced Matching** (`fn`, `ln`, `ph`, `ct`, `country`) through the CAPI relay, which is what lets Meta attribute an application back to the ad that produced it. Raw PII never enters the browser `fbq(...)` payload.

### Before
```tsx
// src/components/expert/TechnicianForm.tsx
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
// ...
            if (!res.ok) throw new Error(`Relay error ${res.status}`);

            trackEvent(AnalyticsEvents.TechnicianApplySubmit, { skills: skills.join(",") });
            setStatus("success");
```

```ts
// src/app/api/meta/capi/route.server.ts — only email/phone/external_id, one crude rule
    if (email) userData.em = [hash(email)];
    if (phone) userData.ph = [hash(phone.replace(/[^0-9]/g, ""))];
    if (external_id) userData.external_id = [hash(external_id)];
```

### After
```tsx
// src/components/expert/TechnicianForm.tsx
import { trackTechnicianApplication } from "@/lib/metaPixel";
// ...
            if (!res.ok) throw new Error(`Relay error ${res.status}`);

            trackEvent(AnalyticsEvents.TechnicianApplySubmit, { skills: skills.join(",") });
            // Meta fires only from here — past the relay's OK, so a click that
            // never became an application is never counted as a conversion.
            // The submitted details go up as hashed Advanced Matching (#084).
            trackTechnicianApplication({ firstName, lastName, contactNumber, city, skills });
            setStatus("success");
```

```ts
// src/lib/metaPixel.ts — PII reaches the relay only, never the Pixel call
type MetaUserData = {
    firstName?: string; lastName?: string; phone?: string; city?: string; country?: string;
};

function trackDeduplicated(method, event, customData, userData?: MetaUserData): void {
    // ...
    if (typeof window.fbq === "function") {
        // `userData` is deliberately NOT passed here — PII goes to the relay
        // only, never into the browser payload (see MetaUserData).
        window.fbq(method, event, customData, { eventID: eventId });
    }
    sendToCapi(event, eventId, customData, userData);
}

export function trackTechnicianApplication(details): void {
    trackCustom("TechnicianApplication",
        { skills: details.skills.join(",") || "none_selected", skill_count: details.skills.length },
        { firstName: details.firstName, lastName: details.lastName,
          phone: details.contactNumber, city: details.city, country: "in" });
}
```

```ts
// src/app/api/meta/capi/route.server.ts — per-field normalisation, then hash
function hashName(value: string): string | undefined {
    const clean = value.replace(/[^\p{L}\p{M}]/gu, "");
    return clean ? hash(clean) : undefined;
}
function hashCity(value: string): string | undefined {
    const clean = value.trim().toLowerCase().replace(/[^a-z]/g, "");
    return clean ? hash(clean) : undefined;
}
function hashPhone(value: string, country?: string): string | undefined {
    let digits = value.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 10 && (!country || country.trim().toLowerCase() === "in")) {
        digits = "91" + digits;
    }
    if (digits.length < 11 || digits.length > 15) return undefined;
    return hash(digits);
}

    if (em) userData.em = [em];
    if (ph) userData.ph = [ph];
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (ct) userData.ct = [ct];
    if (cn) userData.country = [cn];
```

### Notes
- **Custom event, not standard `Lead`, deliberately.** `docs/ANALYTICS.md` has a standing decision that technician recruitment stays out of the customer-acquisition funnel. A distinct name keeps them separable in Ads Manager; target it with a custom conversion on `TechnicianApplication`. Switching to standard `Lead` later is a one-line change (`"track"` instead of `"trackCustom"`).
- **Normalisation is load-bearing, not cosmetic.** Meta hashes its own copy and compares digests, so one stray space or a missing country code means no match at all. Verified that `9876543210`, `+91 98765 43210`, `098765 43210`, `919876543210`, `+919876543210` and `98765-43210` all converge on `919876543210`; `12345` is dropped rather than hashed into noise.
- `hashName` keeps `\p{M}` alongside `\p{L}` — Devanagari vowel signs are combining *marks*, so a letters-only rule silently mangled `राहुल` into `रहल`. Caught in testing.
- Every normaliser returns `undefined` rather than hashing an unmatchable value: a junk digest is indistinguishable from a wrong one and only dilutes match quality.
- This event also benefits the #083 diagnostic work — it's the one event on the site with strong identifiers, so it should show a materially higher Event Match Quality than `PageView`.
- Verified: `npx tsc --noEmit` and `npx eslint` clean across all three files; normalisation unit-checked against the input tables above. Not yet exercised end-to-end against Meta — needs a live submit on `/become-a-technician` after deploy.

## [2026-08-13] #083 — Fix four Meta Conversions API diagnostics: mint `_fbp`/`_fbc`, gate client IP on address family, nest `custom_data`
- **Type:** fix
- **Scope:** `src/lib/metaPixel.ts`, `src/app/api/meta/capi/route.server.ts`, `docs/ANALYTICS.md`
- **Why:** Events Manager → Diagnostics showed 4 active Conversions API errors affecting 44–89% of events; three of them shared a single root cause.
- **Related:** follows #072 (CAPI introduced) and #073 (PageView routed through CAPI)

### Summary
Events Manager reported *"Send missing user data parameters"* (44%), *"IPs associated with multiple users"* (89%), *"Update CAPI IP addresses to IPv6"* (53%) and *"Send client IPs that match your Pixel"* (54%). The last three are one bug: the relay host publishes no `AAAA` record while `connect.facebook.net` is IPv6, so IPv6-capable visitors reach Meta on v6 but are downgraded to v4 to reach us — and that v4 address is their carrier's shared CGNAT/NAT64 pool, not them. The first is that we only ever *read* `_fbp`/`_fbc`, which don't exist when `fbevents.js` hasn't loaded yet or is blocked outright. Both are fixed at the source, plus non-standard `custom_data` keys now nest under `custom_properties` as Meta's schema requires.

### Before
```ts
// src/lib/metaPixel.ts
function sendToCapi(eventName: string, eventId: string, customData: MetaParams): void {
    if (!CAPI_ENDPOINT) return;
    try {
        void fetch(CAPI_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                event_name: eventName,
                event_id: eventId,
                event_source_url: window.location.href,
                custom_data: customData,
                fbp: readCookie("_fbp"),
                fbc: readCookie("_fbc"),
            }),
```

```ts
// src/app/api/meta/capi/route.server.ts
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;

    const userData: Record<string, unknown> = {};
    if (clientIp) userData.client_ip_address = clientIp;
    // ...
                user_data: userData,
                custom_data: custom_data ?? {},
```

### After
```ts
// src/lib/metaPixel.ts — mint the cookies when absent, then re-read them
function resolveFbCookies(): { fbp?: string; fbc?: string } {
    const now = Date.now();

    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) {
        const existing = readCookie("_fbc");
        // Only rewrite when this is a different click than the stored one.
        if (!existing || !existing.endsWith(`.${fbclid}`)) {
            writeCookie("_fbc", `fb.1.${now}.${fbclid}`);
        }
    }

    if (!readCookie("_fbp")) {
        const random = Math.floor(Math.random() * 1e10);
        writeCookie("_fbp", `fb.1.${now}.${random}`);
    }

    return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}

function sendToCapi(eventName: string, eventId: string, customData: MetaParams): void {
    if (!CAPI_ENDPOINT) return;
    try {
        // Mints `_fbp`/`_fbc` if the Pixel hasn't (or can't) — see #083.
        const { fbp, fbc } = resolveFbCookies();
        void fetch(CAPI_ENDPOINT, {
            // ...
            body: JSON.stringify({ /* ... */ custom_data: customData, fbp, fbc }),
```

```ts
// src/app/api/meta/capi/route.server.ts — send the IP only when it's IPv6
function clientIpForMeta(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    let ip = raw.trim();

    // `::ffff:203.0.113.7` is an IPv4 address in IPv6 clothing — unwrap it.
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    if (mapped) ip = mapped[1];

    return ip.includes(":") ? ip : undefined;
}

function shapeCustomData(input: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!input) return {};
    const standard: Record<string, unknown> = {};
    const custom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
        if (STANDARD_CUSTOM_DATA.has(key)) standard[key] = value;
        else custom[key] = value;
    }
    if (Object.keys(custom).length > 0) standard.custom_properties = custom;
    return standard;
}

    const clientIp = clientIpForMeta(
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined,
    );
    // ...
                user_data: userData,
                custom_data: shapeCustomData(custom_data),
```

### Notes
- **The IP gate is keyed off the observed address, not an env flag** — deliberately. Host the relay somewhere IPv6-reachable (Cloudflare in front of the domain would do it, and would also make the route same-origin) and real addresses resume with zero code change and no toggle to remember. Today the host has no `AAAA`, so in practice no IP is sent and `_fbp`/`_fbc` carry match quality.
- Cookies are written on the registrable domain (`.pockitengineers.com`), 90-day max-age, `SameSite=Lax`, `Secure` on HTTPS — matching what `fbevents.js` would write. `fbevents.js` adopts an existing `_fbp` rather than generating its own, so browser and server stay on one identifier regardless of who wins the race.
- `writeCookie` verifies the write took and retries host-only if it didn't. The registrable-domain guess (last two hostname labels) lands on a **public suffix** for a `*.vercel.app` preview, which browsers reject silently — without the fallback the identifier would never persist on preview builds.
- Dedup is unaffected: it keys on `event_name` + `event_id`, not payload shape, so the Pixel keeping `custom_data` flat while CAPI nests it is fine.
- **Unresolved, needs a decision:** CAPI still depends on the Vercel deployment that #065 slated for retirement, and `sendToCapi` swallows every failure — if that project is deleted or throttled, 100% of server events vanish silently. A same-origin cPanel PHP relay (pattern: `public/api/technician.php`) or Cloudflare would fix that *and* the IPv6 gap together.
- Verified: `npx tsc --noEmit` clean for both files (the `@sendgrid/mail` error is a pre-existing local `node_modules` gap, unrelated); `npx eslint` clean; IP-family parsing unit-checked against IPv6 / IPv4 / IPv4-mapped / padded inputs. The live relay was probed before the change and accepted events (`{"ok":true,"events_received":1}`), confirming `META_CAPI_ACCESS_TOKEN` is configured — two probe events (`diagnostic-probe-001`, `diag-probe-002`) landed in the live dataset and should be ignored.

## [2026-08-13] #082 — Expert hero CTA: "Join as a Technician" → "Contact Us Now" with phone icon
- **Type:** feature
- **Scope:** `src/constants/copy.ts`, `src/components/expert/ExpertHero.tsx`
- **Why:** User asked to relabel the hero click-to-dial CTA and lead it with a phone icon.

### Summary
Renamed the `/become-a-technician` hero CTA copy and added a leading `Phone` icon (lucide-react) inside the existing `tel:` anchor. Behaviour is unchanged — still a click-to-dial to `ctaDialNumber`.

### Before
```ts
// src/constants/copy.ts
cta: "Join as a Technician",
```
```tsx
// src/components/expert/ExpertHero.tsx
import { Star } from "lucide-react";
...
<a
    href={`tel:${hero.ctaDialNumber}`}
    className="inline-block rounded-2xl px-10 py-3.5 ...">
    {hero.cta}
</a>
```

### After
```ts
// src/constants/copy.ts
cta: "Contact Us Now",
```
```tsx
// src/components/expert/ExpertHero.tsx
import { Phone, Star } from "lucide-react";
...
<a
    href={`tel:${hero.ctaDialNumber}`}
    className="inline-flex items-center gap-2.5 rounded-2xl px-10 py-3.5 ...">
    <Phone className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
    {hero.cta}
</a>
```

### Notes
- Anchor switched `inline-block` → `inline-flex items-center gap-2.5` to sit the icon and label on one line.
- Icon marked `aria-hidden` since the label already conveys the action.


## [2026-08-13] #081 — Move technician form off Vercel to a same-origin cPanel PHP endpoint
- **Type:** fix
- **Scope:** `public/api/technician.php` (new), `.github/workflows/deploy-cpanel.yml`
- **Why:** The Vercel-hosted `/api/technician` relay was blocked (commit-email/GitHub mismatch) and then hit a Vercel plan-upgrade wall, so the static cPanel site's cross-origin POST got no `Access-Control-Allow-Origin` back → CORS failure on `/become-a-technician`. Removing the cross-origin hop entirely is the structural fix.
- **Related:** supersedes #078 / #080 (Vercel relay path)

### Summary
Replaced the Vercel `route.server.ts` relay (in the request path for production) with a PHP endpoint that ships **inside** the static export (`public/api/technician.php` → `out/api/technician.php` → cPanel `/api/technician.php`) and runs on cPanel's own PHP. The form now POSTs **same-origin**, so there is no cross-origin request and no CORS to configure — and Vercel is no longer required for the site to function. The PHP calls the SendGrid v3 API with a key read from a config file placed **above** `public_html` (never in the repo, never served, never touched by the FTP sync). `src/app/api/technician/route.server.ts` is kept only so the form still works on the local dev server (`npm run dev`), which can't run PHP.

### Before
```yaml
# .github/workflows/deploy-cpanel.yml
NEXT_PUBLIC_TECHNICIAN_ENDPOINT: "https://pockit-website-fluxenta.vercel.app/api/technician"
```
```php
// public/api/technician.php
(file did not exist)
```

### After
```yaml
# .github/workflows/deploy-cpanel.yml
NEXT_PUBLIC_TECHNICIAN_ENDPOINT: "/api/technician.php"
```
```php
// public/api/technician.php
// Same-origin SendGrid relay for cPanel. Reads SENDGRID_API_KEY from
// pockit-secrets/technician.php (placed once, above public_html), validates
// firstName/lastName/contactNumber/city + allow-listed skill ids, then POSTs
// to https://api.sendgrid.com/v3/mail/send via curl. Returns {ok:true} on 2xx.
```

### Notes
- **One-time manual step on cPanel** (not automatable via FTP, by design): in File Manager, at the account HOME level (the folder that *contains* `public_html`), create `pockit-secrets/technician.php` returning `['SENDGRID_API_KEY' => 'SG.…', 'FROM_EMAIL' => 'noreply@pockitengineers.com', 'TO_EMAIL' => 'itsupport@pockitengineers.com']`. Above the web root → Apache never serves it and the deploy never overwrites it.
- SendGrid sender `noreply@pockitengineers.com` must be **Verified** (SendGrid → Sender Authentication) or the send returns `{"ok":false,"reason":"send_failed"}`.
- The skill-id allow-list in the PHP mirrors `EXPERT_FORM.skills` in `src/constants/copy.ts` by hand (PHP can't import the TS constant) — keep both in sync if skills change.
- Vercel can now be retired for this feature. The old `route.server.ts` stays for local dev only.
- Verify: after the next cPanel deploy, `curl -i https://www.pockitengineers.com/api/technician.php` should return JSON (405 for GET), and submitting the form on `/become-a-technician` should email `itsupport@`.


## [2026-08-13] #080 — Wire NEXT_PUBLIC_TECHNICIAN_ENDPOINT into the cPanel build (deploy prep for #078)
- **Type:** config
- **Scope:** `.github/workflows/deploy-cpanel.yml`
- **Why:** Without this, the deployed static form POSTs same-origin `/api/technician` — which 404s on cPanel (no server) — so every submission fails. Points the static build at the Vercel-hosted SendGrid relay, mirroring `NEXT_PUBLIC_META_CAPI_ENDPOINT`.
- **Related:** #078, verbal request 2026-08-13

### Summary
Added `NEXT_PUBLIC_TECHNICIAN_ENDPOINT` (public URL, not a secret) to the static-export build step so the cPanel technician form POSTs cross-origin to `https://pockit-website-fluxenta.vercel.app/api/technician`. This completes the same cross-origin contract already used for the Meta CAPI relay.

### Before
```yaml
# .github/workflows/deploy-cpanel.yml — Build static export env
NEXT_PUBLIC_META_CAPI_ENDPOINT: "https://pockit-website-fluxenta.vercel.app/api/meta/capi"
NEXT_PUBLIC_API_BASE: ${{ secrets.NEXT_PUBLIC_API_BASE }}
```

### After
```yaml
NEXT_PUBLIC_META_CAPI_ENDPOINT: "https://pockit-website-fluxenta.vercel.app/api/meta/capi"
NEXT_PUBLIC_TECHNICIAN_ENDPOINT: "https://pockit-website-fluxenta.vercel.app/api/technician"
NEXT_PUBLIC_API_BASE: ${{ secrets.NEXT_PUBLIC_API_BASE }}
```

### Notes
- **Manual prerequisite (Vercel dashboard, only the account owner can do this):** set `SENDGRID_API_KEY` in the Vercel project's **Production** env (server-only secret — same home as `META_CAPI_ACCESS_TOKEN`, which is pulled via `vercel pull`, NOT stored in the workflow). Optionally set `TECHNICIAN_FROM_EMAIL` / `TECHNICIAN_TO_EMAIL`; if unset, the relay defaults to `noreply@` → `itsupport@pockitengineers.com`.
- **Manual prerequisite (SendGrid):** verify the `noreply@pockitengineers.com` sender (or domain) or SendGrid rejects the send.
- Push to `main` auto-triggers BOTH workflows: cPanel (matches `src/**`, `package.json`) and Vercel (matches `src/app/api/**`, `package.json`).

## [2026-08-13] #079 — Technician hero CTA: WhatsApp deep link → click-to-dial (tel:)
- **Type:** feature
- **Scope:** `src/components/expert/ExpertHero.tsx`, `src/constants/copy.ts`
- **Why:** User wants the "Join as a Technician" CTA to open the phone dialer directly (call +919240251266) instead of launching WhatsApp.
- **Related:** verbal request 2026-08-13

### Summary
Replaced the hero CTA's WhatsApp deep link with a direct `tel:` click-to-dial to `+919240251266`. The number lives in `EXPERT_PAGE_UC.hero.ctaDialNumber` (single source of truth, E.164), and the CTA is now a real `<a href="tel:…">` anchor rather than a button with an `onClick` handler — better for mobile dialers, crawlers, and assistive tech. Dropped the now-unused `whatsappHref` import and `handleJoinClick` handler (and the unused `EXPERT_HERO` import that came with them).

### Before
```tsx
// src/components/expert/ExpertHero.tsx
import { EXPERT_HERO, EXPERT_BELOW, EXPERT_PAGE_UC, whatsappHref } from "@/constants/copy";

const handleJoinClick = () => {
    const url = whatsappHref("Hi, I want to connect and know more about Pockit Engineers");
    window.open(url, "_blank");
};
// ...
<button type="button" onClick={handleJoinClick} ...>{hero.cta}</button>
```

### After
```tsx
// src/components/expert/ExpertHero.tsx
import { EXPERT_BELOW, EXPERT_PAGE_UC } from "@/constants/copy";
// ...
<a href={`tel:${hero.ctaDialNumber}`} className="inline-block ...">{hero.cta}</a>
```

```ts
// src/constants/copy.ts — EXPERT_PAGE_UC.hero
ctaDialNumber: "+919240251266",  // E.164; drives the tel: CTA
```

### Notes
- Only the technician hero CTA changed. The floating WhatsApp pill and every other WhatsApp CTA still use `whatsappHref` / `BUSINESS.whatsappNumber` — untouched.
- Verified locally: `tsc --noEmit` clean; `/become-a-technician` renders `href="tel:+919240251266"`.

## [2026-08-12] #078 — Become-a-technician: replace hero image with an application form + SendGrid email relay
- **Type:** feature
- **Scope:** `src/components/expert/ExpertHero.tsx`, `src/components/expert/TechnicianForm.tsx` (new), `src/app/api/technician/route.server.ts` (new), `src/constants/copy.ts`, `src/lib/analytics.ts`, `.env`, `package.json` (`@sendgrid/mail`), `docs/ANALYTICS.md`
- **Why:** The page needed a direct capture path for prospective technicians instead of only a WhatsApp CTA; user asked to drop the illustration and collect name/contact/city/skills, emailed to itsupport@pockitengineers.com.
- **Related:** verbal request 2026-08-12

### Summary
Removed the right-column illustration in the `/become-a-technician` hero and put an application form in its place (First/Last name, Contact number, City, and a six-way Skill checklist: Laptop/Desktop, MacBook, Printer, CCTV, Smart TV, Smart Phone). Because the production site is a **static export** (no server), the form POSTs to a new `route.server.ts` SendGrid relay that runs on the Vercel deployment and is called cross-origin — the exact pattern established for the Meta CAPI relay (#072). The relay validates fields, filters skills against an allow-list shared with the form, and emails the applicant details to `itsupport@pockitengineers.com` from a verified `noreply@` sender.

### Before
```tsx
// src/components/expert/ExpertHero.tsx
<motion.div /* right column */ className="relative mx-auto w-full max-w-md lg:max-w-none">
    <div className="absolute ... rounded-full" style={{ background: "linear-gradient(...)" }} />
    <Image src="/images/join_us_illustration.webp" alt="IT expert working at dual monitors ..." width={1024} height={768} ... priority />
</motion.div>
```

### After
```tsx
// src/components/expert/ExpertHero.tsx
import TechnicianForm from "@/components/expert/TechnicianForm";
// ...
{/* Right column: the application form now sits where the illustration used to. */}
<TechnicianForm />
```

```ts
// src/app/api/technician/route.server.ts  (new — Node runtime, CORS, .server.ts so it's excluded from the static export)
sgMail.setApiKey(API_KEY);
await sgMail.send({ to: TO_EMAIL, from: FROM_EMAIL, subject: `New technician application — ${fullName} (${city})`, text, html });
```

### Notes
- **New env (server-only):** `SENDGRID_API_KEY` (SECRET — set locally in `.env` AND in the Vercel project env). Optional: `TECHNICIAN_FROM_EMAIL` (default `noreply@pockitengineers.com` — **must be a verified sender in SendGrid → Sender Authentication**), `TECHNICIAN_TO_EMAIL` (default `itsupport@pockitengineers.com`), `TECHNICIAN_ALLOWED_ORIGINS`.
- **New env (public, static build only):** `NEXT_PUBLIC_TECHNICIAN_ENDPOINT` — absolute URL of the Vercel-hosted relay so the cPanel form POSTs cross-origin. Leave UNSET on the server build / local dev (defaults to same-origin `/api/technician`). Mirrors `NEXT_PUBLIC_META_CAPI_ENDPOINT`.
- The relay short-circuits with `503 email_not_configured` when `SENDGRID_API_KEY` is unset — so the form UI/validation can be exercised before the key lands.
- New GA4 event `technician_apply_submit` (param `skills`) — register in GA4 admin.
- **Follow-ups for the user:** (1) paste a real `SENDGRID_API_KEY`; (2) verify the `noreply@pockitengineers.com` sender/domain in SendGrid; (3) set `SENDGRID_API_KEY` (+ optional overrides) in Vercel and `NEXT_PUBLIC_TECHNICIAN_ENDPOINT` on the cPanel build. Verified locally: page returns 200, form renders all fields, illustration removed, route returns the expected 503 until the key is set; `tsc --noEmit` clean.

## [2026-08-03] #077 — Implement the SEO team's JSON-LD brief (Organization, WebSite, LocalBusiness, home FAQ, 5 service pages)
- **Type:** feature
- **Scope:** `src/constants/schema.ts` (new), `src/components/seo/JsonLd.tsx` (new), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[slug]/page.static.tsx`
- **Why:** The SEO team supplied a structured-data brief covering site-wide entities, the home page, and five Mumbai service pages. It needed to land as invisible `<script type="application/ld+json">` payloads only — no visible UI changes — without duplicating the schema the site already generated.

### Summary
Extracted every hand-authored JSON-LD node into a single constants module and split emission along the brief's own boundaries: Organization + WebSite site-wide from the root layout `<head>`, LocalBusiness + FAQPage on the home page only, and hand-authored `Service` + `FAQPage` on the five named service pages. The Sanity-derived `Service`/`FAQPage` nodes are suppressed on exactly those five slugs so no page carries two of either; the other seven landing pages keep their fully generated graph. This also closes the long-standing "waiting on a real street address + lat/long" item in `CLAUDE.md` — LocalBusiness now carries `streetAddress`, `postalCode`, and `geo`.

### Before
```tsx
// src/app/layout.tsx
const organizationJsonLd = { /* ...built from BUSINESS constants... */ } as const;
const localBusinessJsonLd = { /* ...no address/geo, had aggregateRating 4.9/10000... */ } as const;
const websiteJsonLd = { /* ... */ } as const;
const faqPageJsonLd = { mainEntity: FAQ_ITEMS.map(/* ... */) } as const;

const allJsonLd = {
  "@context": "https://schema.org",
  "@graph": [organizationJsonLd, localBusinessJsonLd, websiteJsonLd, faqPageJsonLd],
} as const;

// ...in <head>, on EVERY page including blog posts:
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(allJsonLd) }} />
```

### After
```tsx
// src/app/layout.tsx — only the two "common on all pages" entities remain here
import { ORGANIZATION_SCHEMA, SITE_URL, WEBSITE_SCHEMA } from "@/constants/schema";
import JsonLd from "@/components/seo/JsonLd";

// ...in <head>:
<JsonLd schema={[ORGANIZATION_SCHEMA, WEBSITE_SCHEMA]} />
```

```tsx
// src/app/page.tsx — LocalBusiness + FAQPage are home-page-only per the brief
import { HOME_FAQ_SCHEMA, LOCAL_BUSINESS_SCHEMA } from "@/constants/schema";

export default function Home() {
    return (
        <>
            <JsonLd schema={[LOCAL_BUSINESS_SCHEMA, HOME_FAQ_SCHEMA]} />
            <AppShell />
        </>
    );
}
```

```tsx
// src/app/[slug]/page.static.tsx — authored schema wins, generated pair suppressed
const authored = SERVICE_PAGE_SCHEMA[slug];
const jsonLd = buildJsonLd(page, { hasAuthoredService: Boolean(authored) });

return (
    <>
        <JsonLd schema={jsonLd} />
        {authored ? <JsonLd schema={authored} /> : null}
        <LandingPageView page={page} />
    </>
);

// ...and inside buildJsonLd:
const graph: JsonLdNode[] = opts.hasAuthoredService
    ? [localBusiness, breadcrumb]
    : [localBusiness, service, breadcrumb];

if (!opts.hasAuthoredService && page.faqs && page.faqs.length > 0) { /* ...FAQPage... */ }
```

```ts
// src/constants/schema.ts (new) — single source of truth, keyed by slug
export const SERVICE_PAGE_SCHEMA: Readonly<Record<string, readonly JsonLdNode[]>> = {
    "instant-it-help-mumbai": [serviceNode({ /* ... */ }), faqNode("instant-it-help-mumbai", [/* ... */])],
    "laptop-repair-mumbai":   [serviceNode({ /* ... */ }), faqNode("laptop-repair-mumbai", [/* ... */])],
    "macbook-repair-mumbai":  [serviceNode({ /* ... */ }), faqNode("macbook-repair-mumbai", [/* ... */])],
    "desktop-repair-mumbai":  [serviceNode({ /* ... */ }), faqNode("desktop-repair-mumbai", [/* ... */])],
    "printer-repair-mumbai":  [serviceNode({ /* ... */ }), faqNode("printer-repair-mumbai", [/* ... */])],
};
```

### Notes

**Deliberate deviations from the brief** — each is commented at its definition in `src/constants/schema.ts`:
- **Logo/image use `blue_brand_logo.png`, not `.svg`.** Google's Organization logo rich result rejects SVG. The `.png` sibling already exists in `public/images/`.
- **`WebSite.potentialAction.target`** is `https://www.pockitengineers.com/blog?q={search_term_string}` rather than the brief's bare `"{search_term_string}"`, which is not a URL and causes Google to discard the SearchAction outright.
- **`LocalBusiness["@id"]`** is `…/#localbusiness` rather than the brief's empty string, so the node can be referenced.
- **Brand name cased as "Pockit Engineers"**, not the brief's lowercase "pockit Engineers".
- **`sameAs` is additive** — the four social profiles from the brief plus the two existing app-store listings.

**Open items for the user:**
- ⚠️ **Opening hours are emitted exactly as supplied: `opens 11:00 / closes 08:00`.** `closes` is earlier than `opens`, so Google reads this as 11:00 → 08:00 the next day. If the real hours are 11 AM – 8 PM, change `closes` to `"20:00"` in `LOCAL_BUSINESS_SCHEMA`. This replaced the previous 09:00–21:00.
- **`aggregateRating` (4.9 / 10,000 reviews) was dropped** — the brief omits it, and Google requires such ratings be backed by reviews visible on the same page. Re-add to `LOCAL_BUSINESS_SCHEMA` if that was unintended.
- **Three different phone numbers are now in play**: `918069251494` (LocalBusiness, per brief), `+91-9240251266` (service-page provider, per brief and #074), and `BUSINESS.telephone` = `+91 88822 80156` (still used by visible UI). Worth reconciling.
- **FAQ schema text is intentionally decoupled from visible copy.** The home page renders `FAQ_ITEMS` from `copy.ts` while the schema uses the brief's rewording; the five service pages render Sanity `faqs` while the schema uses the brief's. Google's guidelines expect FAQPage markup to mirror visible content — this was an explicit product decision to treat schema as an SEO-only surface. (Practical exposure is limited: Google retired FAQ rich results for most sites in Aug 2023, so the value here is mainly AEO/LLM ingestion.)

**Placement:** layout-level schema lands in `<head>`; page-level schema lands at the top of `<body>`. Next.js App Router only permits the root layout to write into `<head>`, and Google's documentation explicitly supports JSON-LD in either location. Neither is visible to users.

**Verification:** `npx tsc --noEmit` clean; `npm run build:static` succeeded (54 pages). Confirmed in the export that `out/index.html` carries Organization + WebSite in head and LocalBusiness + FAQPage in body; `out/laptop-repair-mumbai.html` carries exactly one `Service` and one `FAQPage` (both authored) with the generated graph reduced to LocalBusiness + BreadcrumbList; and `out/cctv-installation-mumbai.html` (not in the brief) retains its full Sanity-derived graph.

## [2026-07-21] #076 — Update "Which IT services does Pockit offer?" FAQ answer
- **Type:** content
- **Scope:** `src/constants/copy.ts` (FAQ_ITEMS)
- **Why:** User supplied a full service breakdown for this FAQ; the old answer was a thin one-line summary. Also fixed the double `??` typo in the question.

### Summary
Replaced the single-sentence answer with a comprehensive plain-text paragraph covering all nine service categories (Laptop, MacBook, Desktop, Printer, Wi-Fi/WFH, CCTV, Smart TV, Smartphone, Kids Safe) plus a Chip AI closing note. Content-only change — the answer stays a plain string so it continues to render in the FAQ accordion and feed the FAQPage JSON-LD in `layout.tsx` unchanged.

### Before
\`\`\`ts
// src/constants/copy.ts
{
    q: "Which IT services does Pockit offer??",
    a: "We cover 10+ IT categories including Laptop & Desktop Repair, WiFi Setup & Troubleshooting, Smart TV Installation, CCTV & Security Camera Setup, Data Recovery, Printer Setup, Software Installation, Networking, and more.",
},
\`\`\`

### After
\`\`\`ts
// src/constants/copy.ts
{
    q: "Which IT services does Pockit offer?",
    a: "Pockit provides doorstep IT support for both your home and work devices. Our services include Laptop Services (...), MacBook Services (...), Desktop Services (...), Printer Services (...), Wi-Fi & Work-From-Home Setup, CCTV Services, Smart TV Support (software only), Smartphone Support (software only), and Kids Safe (Kaspersky Safe Kids setup). Not sure which service you need? Ask our AI Assistant, Chip AI — describe your issue and it will point you to the right service.",
},
\`\`\`

### Notes
- Fixed the `??` typo in the question text.
- No component or type changes — `FAQ.tsx` and the `FAQ_ITEMS` shape are untouched.
- Verify: run the dev server, scroll to the FAQ section, expand "Which IT services does Pockit offer?" and confirm the new answer text.

## [2026-07-13] #075 — Fix blog 404 on dev server: revert blog routes to plain `.tsx` (dual-target)
- **Type:** fix
- **Scope:** `src/app/blog/**` (route file suffixes), `.env` (`NEXT_PUBLIC_BLOG_URL`), `CLAUDE.md` (build-targets doc)
- **Why:** `/blog` and all blog sub-routes 404'd on the local dev server; the `.static.*` suffix (from #065) hides them from the `server` build target that `npm run dev` runs on.

### Summary
After #065 moved the blog routes to `.static.tsx`/`.static.ts`, they only registered under `BUILD_TARGET=static`. But `npm run dev` runs `BUILD_TARGET=server`, whose `pageExtensions` don't include `static.tsx`, so `/blog`, `/blog/[slug]`, `/blog/author/[slug]`, and `/blog/rss.xml` all 404'd during local development. Compounding it, `HEAD` carried duplicate `page.tsx` + `page.static.tsx` files (a "duplicate page" static-build hazard), a category `page.static.tsx` whose `generateStaticParams()` is empty (Sanity has **0 categories** → fatal under `output: export`), and a stray `NEXT_PUBLIC_BLOG_URL=http://localhost:3000` in `.env` that rewrote the "Blog" nav link cross-origin. This reverts the four data-backed blog routes to **plain `.tsx`/`.ts`** so they register on **both** targets (live dev preview + static export), keeps `/blog/category/[slug]` **parked on `.server.tsx`** (excluded from the static export until a category exists), and removes the obsolete env var.

### Before
```
src/app/blog/page.tsx                       ← duplicate (staged for deletion)
src/app/blog/page.static.tsx                ← static-only, 404s in dev
src/app/blog/[slug]/page.static.tsx
src/app/blog/author/[slug]/page.static.tsx
src/app/blog/rss.xml/route.static.ts
src/app/blog/category/[slug]/page.server.tsx  ← parked
src/app/blog/category/[slug]/page.static.tsx  ← empty generateStaticParams() → breaks static build
```
```dotenv
# .env
NEXT_PUBLIC_BLOG_URL=http://localhost:3000
```

### After
```
src/app/blog/page.tsx                       ← plain: registers on BOTH targets
src/app/blog/[slug]/page.tsx
src/app/blog/author/[slug]/page.tsx
src/app/blog/rss.xml/route.ts
src/app/blog/category/[slug]/page.server.tsx  ← single parked route (0 categories in Sanity)
```
```dotenv
# .env
# NEXT_PUBLIC_BLOG_URL intentionally UNSET — single-host static model. Do not re-add.
```

### Notes
- Root cause of the 404: `next.config.mjs` `pageExtensions` for `server` = `["server.tsx","server.ts","tsx","ts",...]` — `page.static.tsx` strips to stem `page.static` ≠ `page`, so Next ignores it. Plain `page.tsx` registers on both targets.
- `/blog/category/[slug]` stays `.server.tsx` **deliberately**: `count(*[_type=="category"]) == 0` in Sanity, and an empty `generateStaticParams()` is fatal under `output: export`. Rename to `page.tsx` once ≥1 category is authored.
- Sanity content at time of fix: 32 posts, 6 authors, 0 categories.
- `NEXT_PUBLIC_BLOG_URL` is not set by the CI cPanel build (`deploy-cpanel.yml`), so production was unaffected; the stray value only lived in the local gitignored `.env`.
- Verified on the running dev server (`server` target): `/blog` 200, a real post 200, `/blog/author/amit-goyal` 200, `/blog/rss.xml` 200 (valid RSS 2.0 XML), `/blog/category/*` reachable in dev. Static build (`npm run build:static`) not run in-session to avoid clobbering the active dev server's `.next`; category exclusion + non-empty post/author params make it logically safe (posts/authors already exported under #065).

## [2026-07-06] #074 — Update service-page JSON-LD telephone fallback
- **Type:** fix
- **Scope:** `src/app/[slug]/page.static.tsx`
- **Why:** The hardcoded fallback used in `LocalBusiness.telephone` when a landing page has no Sanity `phone` value was a stale number; replaced with the current line.

### Summary
Service/landing pages already source their visible call button from the Sanity `landingPage.phone` field. Only the JSON-LD schema fallback (used when that field is blank) was a stale hardcoded number. Updated that fallback to `+91-9240251266` so structured data reflects the correct line.

### Before
```tsx
// src/app/[slug]/page.static.tsx
telephone: page.phone ?? "+91-9769939163",
```

### After
```tsx
// src/app/[slug]/page.static.tsx
telephone: page.phone ?? "+91-9240251266",
```

### Notes
- Visible hero call button is unaffected — it renders `page.phone` (Sanity) directly and shows nothing when blank.

## [2026-07-03] #073 — Deduplicate Meta `PageView` (browser↔server) — finish the surgery #072 deferred
- **Type:** fix
- **Scope:** `src/lib/metaPixel.ts`, `src/app/layout.tsx`, `src/components/analytics/MetaPixelRouteTracker.tsx`, `docs/ANALYTICS.md`
- **Why:** Meta Events Manager flagged `PageView` (and the custom events) as *"sent through both pixel and server… not deduplicated because an event_id parameter hasn't been added"* — inflating counts and hurting ad attribution. #072 deduped the three custom events but deliberately left `PageView` browser-only because its base-snippet fire had no `eventID` to dedup against. This does that deferred snippet surgery.

### Summary
`PageView` now flows through the same dedup path as the custom conversions: a single client choke point mints one `event_id`, passes it to the Pixel via `eventID`, and POSTs the same id to CAPI so Meta collapses the browser + server copies into one. The base Pixel snippet in `layout.tsx` no longer fires its own (id-less) `PageView`; instead `MetaPixelRouteTracker` fires **every** `PageView` — initial load and SPA navigations — making it the single source that can carry an id.

### Before
```ts
// src/lib/metaPixel.ts — PageView had no event_id and never hit CAPI
function track(event, params) {                       // standard-event helper
    window.fbq("track", event, params ?? {});         // no eventID
}
export function trackMetaPageView() { track("PageView"); }

function trackCustom(event, params) {                 // custom events already deduped
    const eventId = newEventId();
    const customData = { ...buildEventContext(), ...(params ?? {}) };
    if (typeof window.fbq === "function") window.fbq("trackCustom", event, customData, { eventID: eventId });
    sendToCapi(event, eventId, customData);
}
```
```tsx
// src/app/layout.tsx — inline snippet fired an id-less PageView
… fbq('init','${META_PIXEL_ID}');fbq('track','PageView');
```
```tsx
// src/components/analytics/MetaPixelRouteTracker.tsx — skipped first render
const isFirstRender = useRef(true);
useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; } // base snippet owned load
    trackMetaPageView();
}, [pathname]);
```

### After
```ts
// src/lib/metaPixel.ts — one dedup choke point for standard AND custom events
function trackDeduplicated(method /* "track" | "trackCustom" */, event, customData) {
    const eventId = newEventId();
    if (typeof window.fbq === "function") window.fbq(method, event, customData, { eventID: eventId }); // browser
    sendToCapi(event, eventId, customData);                                                            // server (same id)
}
function trackCustom(event, params) {
    trackDeduplicated("trackCustom", event, { ...buildEventContext(), ...(params ?? {}) });
}
export function trackMetaPageView() {
    trackDeduplicated("track", "PageView", {});   // now deduped, empty custom_data (vanilla standard event)
}
```
```tsx
// src/app/layout.tsx — snippet only init's; no PageView here anymore
… fbq('init','${META_PIXEL_ID}');
```
```tsx
// src/components/analytics/MetaPixelRouteTracker.tsx — fires the initial load too
useEffect(() => {
    trackMetaPageView();          // single source of every PageView (load + SPA nav)
}, [pathname]);
```

### Notes
- **Trade-off:** the initial `PageView` now fires just after hydration (from React) instead of synchronously in `<head>`. Acceptable — the pixel still `init`s in the head, the `<noscript>` fallback still covers JS-disabled visitors, and the gain is a dedup-capable id. Net PageView count on first load is unchanged (one source instead of snippet + skipped-tracker).
- **`PageView` now hits CAPI**, including from the static cPanel build (cross-origin to the Vercel relay via `NEXT_PUBLIC_META_CAPI_ENDPOINT`) — higher volume than before but the standard CAPI pattern; fire-and-forget with `keepalive`, empty `custom_data`.
- **Custom events (`PlayStoreClick`, `WhatsAppContact`, `AppStoreClick`) were already correct** in code (#072 passes a shared `event_id` both ways). If Events Manager still flags them, the server copy Meta sees isn't carrying our id — check for (a) the #072 build not yet being live, or (b) a **second server sender** (Meta CAPI Gateway / partner integration) mirroring events without an `event_id`. Neither is fixable in this repo's client/route code.
- Verified: `tsc --noEmit` clean; `eslint` on the three files clean (only the pre-existing GTM-script warning on `layout.tsx:208`). Removed the now-unused `useRef` import from the route tracker.
- **Test:** with Meta Pixel Helper + Events Manager Test Events open, load a page and confirm a single `PageView` with an `eventID`; in Test Events the browser + server `PageView` should show as **Deduplicated**. Then navigate `/ → /blog → back` and confirm each SPA transition emits one deduped `PageView`.

## [2026-07-03] #072 — Meta Conversions API (server-side) with browser↔server dedup
- **Type:** feature
- **Scope:** `src/app/api/meta/capi/route.server.ts` (new), `src/lib/metaPixel.ts`, `.github/workflows/deploy-cpanel.yml`, `.github/workflows/deploy-vercel.yml`, `docs/ANALYTICS.md`
- **Why:** Meta Events Manager diagnostic flagged low Conversions API coverage (8 server vs 102 browser events) and 6.1/10 match quality. CAPI recovers conversions the browser Pixel loses to ad blockers / iOS privacy and lifts match quality.

### Summary
Every custom conversion (`WhatsAppContact`, `PlayStoreClick`, `AppStoreClick`) is now sent **both** ways — browser Pixel and server-side CAPI — tagged with the **same `event_id`** so Meta deduplicates them into one conversion. The client generates the `event_id`, passes it to the Pixel via `eventID`, reads the `_fbp`/`_fbc` match cookies, and fire-and-forget POSTs the event to a new Next.js route handler. The route adds the visitor IP + user-agent, hashes any PII (SHA-256), and forwards to Meta's Graph API with the secret access token.

### Architecture / build-target gating
- The route is `route.server.ts`, so the `pageExtensions` gate in `next.config.mjs` **includes it only in the server (Vercel/Node) build** and **excludes it from the static cPanel export** (which can't run server code). Verified: static build omits `/api/meta/capi`; server build lists it as `ƒ (Dynamic)`.
- The client POST endpoint **defaults to same-origin `/api/meta/capi`**, so CAPI needs **no client env var** on the Node deployment — only the server-side `META_CAPI_ACCESS_TOKEN`. Override the path/origin with `NEXT_PUBLIC_META_CAPI_ENDPOINT`, or set it to `""` to disable the client POST (e.g. on the static cPanel build, where the route doesn't exist).

### After (client — src/lib/metaPixel.ts)
```ts
function trackCustom(event, params) {
    const eventId = newEventId();
    const customData = { ...buildEventContext(), ...(params ?? {}) };
    if (typeof window.fbq === "function")
        window.fbq("trackCustom", event, customData, { eventID: eventId }); // browser
    sendToCapi(event, eventId, customData);                                  // server (same id)
}
```

### After (server — src/app/api/meta/capi/route.server.ts)
```ts
export const runtime = "nodejs";
export async function POST(req) {
    // + client_ip_address, client_user_agent, fbp/fbc, hashed em/ph/external_id
    await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
        method: "POST",
        body: JSON.stringify({ data: [{ event_name, event_id, action_source: "website", ... }], access_token }),
    });
}
```

### Required setup (not code — must be done to activate)
1. **Generate access token:** Events Manager → Settings → Conversions API → *Set up with Dataset Quality API* → **Generate access token**.
2. **Server env** (secret, never `NEXT_PUBLIC`): `META_CAPI_ACCESS_TOKEN=<token>`. Optional `META_CAPI_TEST_EVENT_CODE=<code>` while verifying.
3. **Client env:** `NEXT_PUBLIC_META_CAPI_ENDPOINT=/api/meta/capi` on the Node/server deployment.
4. **Deploy to a Node host** (Vercel/server target). CAPI cannot run on the static cPanel deployment — the route doesn't exist there.

### Notes
- Scope is the three custom conversions. `PageView` stays browser-only for now (its first-load Pixel fire has no `eventID`, so a CAPI PageView couldn't dedup — would need snippet surgery). The diagnostic's PageView-specific line won't fully clear yet, but overall CAPI coverage + match quality improve.
- No PII is currently sent (anonymous visitors); the `em/ph/external_id` hashing path is ready for a future form.
- The client beacon POSTs cross-origin with `mode: "cors"` + `credentials: "omit"` — no cookies are sent to the Vercel origin (the `_fbp`/`_fbc` match signals already travel in the body).
- Both builds verified green (static excludes the route, server includes it); typecheck + lint clean.
- **Cross-origin architecture (corrected):** production pages are served by **cPanel** (`pockitengineers.com`); the CAPI route runs on the **Vercel** deployment. So the cPanel browser POSTs **cross-origin** to the Vercel route. The route therefore adds **CORS** — an `OPTIONS` preflight handler + `Access-Control-Allow-Origin` echoing an allowlisted origin (`META_CAPI_ALLOWED_ORIGINS`, default the pockitengineers.com pair).
- **cPanel workflow (`deploy-cpanel.yml`):** `NEXT_PUBLIC_META_CAPI_ENDPOINT` is set to `https://pockit-website-fluxenta.vercel.app/api/meta/capi` so the static site sends events cross-origin. (Empty `""` disables CAPI entirely and is only for when no Vercel endpoint exists.)
- **Vercel:** set `META_CAPI_ACCESS_TOKEN` in the **Vercel project dashboard** (Production env, runtime secret) — `vercel pull` carries it into the deploy. NOT added to `deploy-vercel.yml`'s build env (runtime secret, not a build-time `NEXT_PUBLIC` var). The Vercel deployment must be **kept alive** — it is now the CAPI endpoint host.


## [2026-06-25] #071 — Break disclaimer onto its own line on the Terms footer (fix stray `| \n`)
- **Type:** fix
- **Scope:** `src/app/terms/page.tsx`
- **Why:** The footer note had a literal `| \n` that rendered as visible text, and the disclaimer ran on the same line as the copyright. User wanted the disclaimer on its own line.

### Summary
Replaced the stray trailing `| \n` (which JSX renders as the literal characters, not a line break) with a real `<br />`, putting the brand-affiliation disclaimer on its own line below the copyright/CIN/governing-law line.

### Before
```tsx
// src/app/terms/page.tsx
    ... governed by the laws of India.| \n
    Pockit Engineers is an independent service provider ...
```

### After
```tsx
// src/app/terms/page.tsx
    ... governed by the laws of India.
    <br />
    Pockit Engineers is an independent service provider ...
```

## [2026-06-25] #070 — Break disclaimer onto its own line on the Privacy Policy footer
- **Type:** docs
- **Scope:** `src/app/privacy-policy/page.tsx`
- **Why:** The brand-affiliation disclaimer was running on the same line as the copyright; user wanted it visually separated.

### Summary
Inserted a `<br />` between the copyright line and the independence disclaimer in the Privacy Policy page footer so the disclaimer reads as its own line.

### Before
```tsx
// src/app/privacy-policy/page.tsx
    © 2026 Pockit Technologies Private Limited. All rights reserved.
    Pockit Engineers is an independent service provider ...
```

### After
```tsx
// src/app/privacy-policy/page.tsx
    © 2026 Pockit Technologies Private Limited. All rights reserved.
    <br />
    Pockit Engineers is an independent service provider ...
```

## [2026-06-25] #069 — Add brand-affiliation disclaimer to the site footer
- **Type:** docs
- **Scope:** `src/constants/copy.ts`, `src/components/landing/Footer.tsx`
- **Why:** Legal/trademark clarity — surface the same independence disclaimer used on the Terms page sitewide, under the footer copyright.

### Summary
Added a `disclaimer` string to the `FOOTER` copy constant and rendered it in the footer's bottom bar, directly under the copyright line. The bottom bar was restructured into a vertical stack so the copyright + CTA stay on one row and the disclaimer spans full width below them.

### Before
```ts
// src/constants/copy.ts
    copyright: `© ${new Date().getFullYear()} Pockit Engineers. All rights reserved.`,
    bookCTA: "Book a Service",
```

### After
```ts
// src/constants/copy.ts
    copyright: `© ${new Date().getFullYear()} Pockit Engineers. All rights reserved.`,
    disclaimer:
        "Pockit Engineers is an independent service provider and is not affiliated with or authorized by Apple, Lenovo, Dell, HP, Microsoft, or any other brand unless explicitly stated. All trademarks and brand names are the property of their respective owners.",
    bookCTA: "Book a Service",
```

### Before
```tsx
// src/components/landing/Footer.tsx
                <div className="mt-14 pt-6 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[12px] text-theme-text/50">
                        {FOOTER.copyright}
                    </p>
                    <motion.a ...>
                        ...
                        {FOOTER.bookCTA}
                    </motion.a>
                </div>
```

### After
```tsx
// src/components/landing/Footer.tsx
                <div className="mt-14 pt-6 border-t border-theme-border flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[12px] text-theme-text/50">
                        {FOOTER.copyright}
                    </p>
                    <motion.a ...>
                        ...
                        {FOOTER.bookCTA}
                    </motion.a>
                  </div>
                  <p className="text-[11px] text-theme-text/40 leading-relaxed max-w-4xl">
                      {FOOTER.disclaimer}
                  </p>
                </div>
```

### Notes
- Copy is sourced from the `FOOTER` constant (single source of truth) — same wording as the Terms page third-party rights clause.
- Footer is shared across the marketing site, so the disclaimer now appears on every page that renders `<Footer />`.

## [2026-06-25] #068 — SEO fix: blog index was emitting the homepage canonical
- **Type:** fix
- **Scope:** `src/app/blog/page.static.tsx`
- **Why:** The live `/blog` page emitted `<link rel="canonical" href="https://www.pockitengineers.com"/>` — the homepage URL — telling Google the blog index is a duplicate of the home page.

### Summary
`generateMetadata()` on the blog index set `openGraph.url` to `/blog` but never set `alternates.canonical`. With no canonical of its own, the page inherited the root layout's `alternates.canonical: "/"`, which resolves against `metadataBase` to the homepage. Confirmed live via View Source and `document.querySelector('link[rel="canonical"]').href` → `https://www.pockitengineers.com/`. Added an explicit self-referencing canonical so `/blog` points at itself.

### Before
```tsx
// src/app/blog/page.static.tsx
return {
    title: `${title} · PockIT Engineers`,
    description,
    openGraph: {
        title,
        description,
        type: "website",
        url: "https://www.pockitengineers.com/blog",
    },
```

### After
```tsx
// src/app/blog/page.static.tsx
return {
    title: `${title} · PockIT Engineers`,
    description,
    alternates: {
        canonical: "https://www.pockitengineers.com/blog",
    },
    openGraph: {
        title,
        description,
        type: "website",
        url: "https://www.pockitengineers.com/blog",
    },
```

### Notes
- Goes live on the next `npm run build:static` → FTP deploy. After deploy, re-run the console check on `https://www.pockitengineers.com/blog` — it should return `https://www.pockitengineers.com/blog`, not the homepage.
- Individual blog posts (`blog/[slug]`), author pages, and landing pages already set their own self-referencing `www` canonicals — only the index was affected by the inheritance.
- This is the one real fix from the canonical-tag audit; pages 1–10 in that document were already correct (`www`, verified live).

## [2026-06-25] #067 — SEO: force `www` host on the two remaining non-`www` URL emitters
- **Type:** fix
- **Scope:** `src/app/blog/category/[slug]/page.server.tsx`, `src/app/blog/[slug]/page.static.tsx`
- **Why:** Per the canonical-tag audit, every canonical/sitemap URL must use the `https://www.pockitengineers.com` host. The sitemap and all active canonical tags already did; these two were the last stragglers.

### Summary
The sitemap (`sitemap.xml/route.static.ts`) and all active canonical tags (`layout.tsx` `metadataBase`, landing pages, blog posts, authors, RSS) already emit the `www` host — the audit PDF reflected the pre-migration live build. This change cleans up the only two remaining non-`www` references: the parked blog-category route still pointed at the dead `pockitblog.` subdomain, and the blog-post JSON-LD breadcrumb "Home" link used a bare-host (non-`www`) URL. No change was needed to the sitemap or to any canonical tag itself.

### Before
```tsx
// src/app/blog/category/[slug]/page.server.tsx
const BLOG_BASE_URL = "https://pockitblog.pockitengineers.com";
```
```tsx
// src/app/blog/[slug]/page.static.tsx
const crumbs = [
    { label: "Home", href: "https://pockitengineers.com" },
```

### After
```tsx
// src/app/blog/category/[slug]/page.server.tsx
const BLOG_BASE_URL = "https://www.pockitengineers.com";
```
```tsx
// src/app/blog/[slug]/page.static.tsx
const crumbs = [
    { label: "Home", href: "https://www.pockitengineers.com" },
```

### Notes
- The live site must be **rebuilt and redeployed** (`npm run build:static` → FTP) for crawlers to see the `www` canonicals/sitemap — the audit was run against an older deployment.
- The blog category route is `.server.tsx` (parked, excluded from the static export until ≥1 category exists), so this fix is pre-emptive consistency, not a live-facing change.
- The audit PDF recommended bare-host (non-`www`) canonicals; the user overrode that in favour of `www` to match the existing sitemap and `metadataBase`.

## [2026-06-22] #066 — Docs: sync operator/editor guides to the single-host static-blog model
- **Type:** docs
- **Scope:** `docs/BLOG_DEPLOY.md`, `README.md`, `BLOG_TASKS.md`, `docs/BLOG_EDITORS.md`, `docs/LANDING_PAGES.md`, `.github/workflows/deploy-cpanel.yml` (comment)
- **Why:** After #065 the docs still described the retired hybrid model (blog on a Vercel subdomain, Sanity→Vercel deploy hook, cross-origin env vars). Bring every operator/editor doc in line with reality so whoever runs this next isn't misled.

### Summary
Reworked the blog docs to the single-host model: blog is statically exported into the cPanel build at `pockitengineers.com/blog`; the `BUILD_TARGET=server` (Vercel) build is legacy/retired; Studio is Sanity-hosted (`npx sanity deploy`); the publish pipeline is Sanity → **GitHub `repository_dispatch` webhook** → `deploy-cpanel.yml` → FTP (not the old Vercel deploy hook); `NEXT_PUBLIC_BLOG_URL`/`NEXT_PUBLIC_MAIN_SITE_URL` are obsolete; `/blog/category/[slug]` is parked. `BLOG_DEPLOY.md` got the largest rework (diagram, build-targets, webhook, rollback, failure-triage, env reference); `BLOG_EDITORS.md` updated Studio + live URLs + the ~4-min-rebuild timing; `LANDING_PAGES.md` fixed the #065-renamed paths; `README.md`/`BLOG_TASKS.md` updated their architecture statements. Also corrected the stale `deploy-cpanel.yml` path-filter comment that still claimed blog/Studio "live only on Vercel."

### Notes
- Docs-only + one workflow comment; no runtime behaviour change. The workflow file is in the deploy path-filter, so pushing this to `main` triggers one (idempotent) cPanel rebuild.
- Not audited (out of scope, flagged for a later pass): `docs/BLOG_ANALYTICS.md` (no stale refs found), `CPANEL_STATIC.md`, `GODADDY_DEPLOYMENT.md`. `deploy-vercel.yml` still exists (Vercel teardown is a pending user follow-up), so docs describe it as retired rather than removed.

## [2026-06-22] #065 — Blog moves onto the cPanel static site at `/blog` (off the Vercel subdomain)
- **Type:** refactor
- **Scope:** `src/app/blog/**`, `src/app/sitemap.xml/route.static.ts`, `src/app/{sitemap.xml,robots.txt}/route.server.ts` (removed), `.github/workflows/deploy-cpanel.yml`, `public/.htaccess`
- **Why:** The blog was on a Vercel subdomain (`pockitblog.pockitengineers.com/blog`). The user wants it served at `pockitengineers.com/blog` on the **same** host as the marketing site, without Cloudflare and without moving the marketing site to Vercel. Since GoDaddy shared cPanel can't reverse-proxy (mod_proxy is off — see the shelved Cloudflare migration), the only path that satisfies all constraints is to **statically export the blog into the cPanel build**. See [[blog-path-migration-shelved]].

### Summary
Converted the blog from a Vercel server build (SSR + ISR) to a fully static export so `npm run build:static` emits `/blog`, every post, and author pages into `out/`, hosted on cPanel alongside the marketing site. Content still comes from Sanity — fetched at **build time** instead of request time — and the existing `deploy-cpanel.yml` Action (already triggered by the Sanity publish webhook) regenerates and FTP-uploads on publish. The 4 blog routes + RSS were renamed `.server.*`→`.static.*`, their `export const revalidate` (which is fatal under `output: "export"`) was dropped, dynamic routes got `dynamicParams = false`, and every hardcoded `pockitblog.pockitengineers.com` host constant became `www.pockitengineers.com`. The blog sitemap/robots `.server.ts` handlers were merged into the marketing `.static.ts` sitemap (one sitemap for the single host). The `/blog/category/[slug]` route is **parked on `.server.tsx`** (kept out of the static build) because the dataset currently has 0 categories and an empty `generateStaticParams()` is a fatal export error; it converts the moment categories are used. Studio leaves the site (moves to Sanity-hosted) — see Notes.

### Before
```tsx
// src/app/blog/[slug]/page.server.tsx
const BLOG_BASE_URL = "https://pockitblog.pockitengineers.com";
export const revalidate = 60;            // ISR — request-time revalidation on Vercel
// (file gated OUT of the cPanel static export via the .server.tsx suffix)
```
```ts
// src/app/sitemap.xml/route.server.ts  (blog-only sitemap, Vercel build)
const BLOG_BASE_URL = "https://pockitblog.pockitengineers.com";
export const revalidate = 3600;
// + src/app/robots.txt/route.server.ts (blog-only robots)
```
```yaml
# .github/workflows/deploy-cpanel.yml
    paths:
      - "src/**"
      - "!src/app/blog/**"      # blog lived on Vercel, didn't trigger cPanel
      - "!src/app/studio/**"
# ...
        env:
          NEXT_PUBLIC_BLOG_URL: ${{ secrets.NEXT_PUBLIC_BLOG_URL }}   # cross-origin Blog link
```

### After
```tsx
// src/app/blog/[slug]/page.static.tsx   (now part of the cPanel static export)
const BLOG_BASE_URL = "https://www.pockitengineers.com";
export const dynamicParams = false;      // export only the slugs generateStaticParams() returns
// data fetched at BUILD time via the same public Sanity client the landing pages use
```
```ts
// src/app/sitemap.xml/route.static.ts  (single sitemap, marketing + landing + blog)
import { getAllAuthorSlugs, getAllCategorySlugs, getAllLandingPagesForSitemap, getAllPosts } from "@/lib/sanity";
// ...blog content fetched in a try/catch (Sanity outage can't fail the build), appended to entries:
//   ${SITE_URL}/blog, /blog/rss.xml, /blog/<post>, /blog/category/<c>, /blog/author/<a>
// blog-only route.server.ts sitemap + robots handlers DELETED
```
```yaml
# .github/workflows/deploy-cpanel.yml
    paths:
      - "src/**"
      - "!src/app/studio/**"   # blog exclusion removed → blog code changes rebuild cPanel
# NEXT_PUBLIC_BLOG_URL removed — blog is same-origin at /blog now, the nav link is just "/blog"
```

### Notes
- **Verified:** `npm run build:static` is green; route table shows `/blog` (static), `/blog/[slug]` (22 posts, SSG), `/blog/author/[slug]` (6 authors, SSG), `/blog/rss.xml`, and `/sitemap.xml` with 29 `/blog/` URLs. `tsc --noEmit` clean.
- **`.htaccess` nested clean-URLs:** added a `blog/`-scoped rewrite (`^(blog/.+?)/?$ → /$1.html`) so Apache serves `out/blog/<slug>.html` for `/blog/<slug>` and `/blog/author/<slug>`. The pre-existing rule only matched single-segment paths (`/about`), so without this every post would 404 on cPanel. Scoped to `blog/` so marketing-page behaviour is unchanged.
- **`queries.ts` untouched** — the landing pages already prove the public client + per-fetch `next:{revalidate,tags}` build fine under `output: "export"`; only segment-level `export const revalidate` is fatal.
- **Studio** moves off the site to Sanity-hosted (`npx sanity deploy` → `*.sanity.studio`). The embedded `/studio` route is excluded from the static export automatically; it stays as `.server.tsx` (parked with the dying Vercel build).
- **Category route parked:** `src/app/blog/category/[slug]/page.server.tsx` stays out of the static build until ≥1 category exists in Sanity. Posts are all uncategorized today, so no category links break. Flip to `.static.tsx` when categories are in use.
- **Follow-ups (handoff):** retire the Vercel blog project + 301 `pockitblog.pockitengineers.com/blog/*` → `www.pockitengineers.com/blog/*` for SEO once the cPanel blog is verified; add the Sanity-hosted Studio origin if needed. Docs (CLAUDE.md/BLOG_DEPLOY/README/BLOG_TASKS) updated to the single-host model.

## [2026-06-18] #064 — Hero image: lock the parallax to the text so the frame stays edge-flush on scroll
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** After #063 the image top/bottom lined up with the text column at the very top of the page, but drifted *below* the "Now live in" row the moment you scrolled — because the text and the image parallaxed at different speeds (`textY` −80 vs `phoneY` −40).

### Summary
The hero ran two scroll-parallax layers at different rates, so the text column rose faster than the image frame. Edge alignment therefore only held at scroll position 0 and broke everywhere else (the screenshot that flagged this was mid-scroll). Collapsed the two motion values into one shared `contentY` applied to both columns, so they translate identically — they still parallax against the background, but never drift relative to each other and stay top- and bottom-flush at every scroll position.

### Before
```tsx
// src/components/landing/Hero.tsx
const textY = useTransform(scrollProgress, [0, 1], [0, -80]);
const phoneY = useTransform(scrollProgress, [0, 1], [0, -40]);
// ...
<motion.div style={{ y: textY }} className="flex flex-col max-w-2xl ...">   {/* text */}
<motion.div ... style={{ y: phoneY }}>                                      {/* image frame */}
```

### After
```tsx
// src/components/landing/Hero.tsx
const contentY = useTransform(scrollProgress, [0, 1], [0, -80]);  // shared by both columns
// ...
<motion.div style={{ y: contentY }} className="flex flex-col max-w-2xl ...">  {/* text */}
<motion.div ... style={{ y: contentY }}>                                      {/* image frame */}
```

### Notes
- Two parallax layers at different speeds can only be edge-aligned at one scroll position; sharing a single motion value is what makes "flush top + bottom" hold while scrolling.
- Background scale/opacity drift (`bgScale`/`bgOpacity`) is unchanged, so the depth effect against the backdrop is preserved. `tsc --noEmit` clean.

## [2026-06-18] #063 — Hero image: crop the white gap, kill the float loop, flush the frame to the text column
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** The Hero.webp studio shot has a white backdrop baked into its lower edge; `object-contain` rendered that as a visible white gap inside the orange border, the continuous float loop drew the eye, and the image overhung the "Now live in" cities row instead of lining up with the text column.

### Summary
Three coupled fixes to the hero artwork. (1) Switched the `<Image>` from `object-contain` to `object-cover object-top` so the frame fills edge-to-edge and the baked-in white strip is cropped off the bottom instead of letterboxed. (2) Removed the perpetual float bob — the `phoneFloatVariants`, the `useAnimation` controls, and the `IntersectionObserver` effect that gated it — keeping only the one-time entrance and the scroll parallax. (3) Re-laid the frame so the text column dictates height: on `lg` the frame is `absolute inset-0` inside a fixed-width (`lg:w-[440px]`) column that stretches to the text's height, so the image top is flush with the badge and its bottom flush with the cities row. The orphaned `card0/1/2Variants` (left over from the long-removed phone mockup) were deleted in the same pass.

### Before
```tsx
// src/components/landing/Hero.tsx
const phoneFloatVariants: Variants = { idle: { y: 0 }, animate: { y: [0, -6, 0], transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } } };
// + card0/1/2Variants, phoneRef, phoneControls = useAnimation(), IntersectionObserver effect

<motion.div ref={phoneRef} ... className="... lg:w-auto lg:h-full ...">
    <motion.div className="relative z-10 w-full lg:w-auto lg:h-full" animate={phoneControls} variants={phoneFloatVariants}>
        <div className="relative w-full lg:w-auto lg:h-full aspect-[2/3] overflow-hidden rounded-3xl border-[3px] border-theme-accent ...">
            <Image src="/images/Hero.webp" fill priority className="object-contain" sizes="(max-width: 640px) 80vw, 460px" />
        </div>
    </motion.div>
</motion.div>
```

### After
```tsx
// src/components/landing/Hero.tsx
// phoneFloatVariants / card variants / phoneControls / observer all removed

<motion.div ... className="... lg:w-[440px] lg:h-full ...">
    <div className="relative z-10 w-full aspect-[3/4] lg:aspect-auto lg:absolute lg:inset-0 overflow-hidden rounded-3xl border-[3px] border-theme-accent ...">
        <Image src="/images/Hero.webp" fill priority className="object-cover object-top" sizes="(max-width: 640px) 80vw, 440px" />
    </div>
</motion.div>
```

### Notes
- `object-top` anchors the subject's head and crops from the bottom (where the white is); mobile uses a fixed `aspect-[3/4]` so the white is cropped there too.
- On `lg` the frame is absolutely positioned, so it contributes ~0 intrinsic height — the text column wins the row-height race and the image stretches to match it (no more overhang). Verified `tsc --noEmit` clean.
- Entrance spring (fade/scale/rotateY) and scroll parallax (`phoneY`) are intentionally preserved per the user's "float loop only" choice.

## [2026-06-17] #062 — Canonical host: 301 the bare apex to www
- **Type:** config
- **Scope:** `public/.htaccess`
- **Why:** Site was serving on both `pockitengineers.com` and `www.pockitengineers.com`, splitting SEO signals across two hosts. Force a single canonical host (www).

### Summary
The cPanel static host answered on both the bare apex and the www host, so the same pages were reachable on two URLs — duplicate content that dilutes ranking. All of the site's canonical URLs, JSON-LD, sitemap, and robots already declare `https://www.pockitengineers.com`, so the apex now 301-redirects to www to match. The rule is the first directive in the rewrite block so every later rule (legacy `/expert`, clean-URL mapping) runs on the canonical host, and it is scoped to the exact apex so the Vercel-hosted blog subdomain is untouched.

### Before
```apache
# public/.htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On

    # /expert legacy redirect (SEO 301)
    RewriteRule ^expert/?$ /become-a-technician [R=301,L]
```

### After
```apache
# public/.htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Canonical host: force the www version (SEO 301).
    RewriteCond %{HTTP_HOST} ^pockitengineers\.com$ [NC]
    RewriteRule ^(.*)$ https://www.pockitengineers.com/$1 [R=301,L]

    # /expert legacy redirect (SEO 301)
    RewriteRule ^expert/?$ /become-a-technician [R=301,L]
```

### Notes
- `public/.htaccess` is copied into `out/` on `npm run build`. The fix ships to production on the next `npm run build:static` + cPanel deploy — the live `out/.htaccess` is a build artifact and is regenerated, so it was not hand-edited.
- The `^pockitengineers\.com$` anchor matches only the bare apex; `pockitblog.pockitengineers.com` (Vercel) is never matched.
- Requires a DNS A/CNAME record for both `pockitengineers.com` and `www` pointing at the cPanel host for the redirect to be reachable — already in place since both versions currently resolve.

## [2026-06-17] #061 — Mobile performance: shrink Hero LCP image + add compression/caching
- **Type:** perf
- **Scope:** `public/images/Hero.png` → `public/images/Hero.webp`, `src/components/landing/Hero.tsx`, `public/.htaccess`
- **Why:** PageSpeed Insights (mobile) flagged a slow page. Root cause audit found the Hero artwork — the above-the-fold `priority` LCP image — was a **2.3 MB PNG**, and the cPanel static host shipped **no text compression and no cache-control headers** (the two most common PSI diagnostics for this stack).
- **Related:** https://pagespeed.web.dev/analysis/https-www-pockitengineers-com/ (mobile)

### Summary
Three changes, all on the marketing-site static build. (1) Re-encoded the Hero artwork from a 2317 KB / 1024×1536 PNG to a 220 KB / 920×1380 WebP (−90.5%) — 920px gives full retina headroom for its ≤460px render width. The original PNG was deleted (per the locked "replace originals, no PNG+WebP siblings" preference) and the import path updated. (2) Added Brotli/gzip text compression to `.htaccess`. (3) Added `Cache-Control` policies: `immutable` 1-year for hashed `/_next/static/**` JS/CSS/fonts, 30 days for `/images/**`, and `must-revalidate` for HTML so redeploys are picked up immediately. The Hero swap is the dominant LCP win; compression + caching clear the remaining PSI diagnostics and speed up repeat visits.

### Before
```tsx
// src/components/landing/Hero.tsx
<Image src="/images/Hero.png" ... />
// public/images/Hero.png — 2,317 KB, 1024×1536 PNG (LCP element)
```
```apache
# public/.htaccess — no compression, no cache-control (ends after mod_dir block)
```

### After
```tsx
// src/components/landing/Hero.tsx
<Image src="/images/Hero.webp" ... />
// public/images/Hero.webp — 220 KB, 920×1380 WebP (Hero.png removed)
```
```apache
# public/.htaccess
<IfModule mod_brotli.c>  AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript ... </IfModule>
<IfModule mod_deflate.c> AddOutputFilterByType DEFLATE        text/html text/css application/javascript ... </IfModule>
<IfModule mod_expires.c>
  <FilesMatch "\.(js|css|woff2?|...)$"> Cache-Control "public, max-age=31536000, immutable" </FilesMatch>
  <FilesMatch "\.(png|jpe?g|webp|...)$"> Cache-Control "public, max-age=2592000" </FilesMatch>
  <FilesMatch "\.html$"> Cache-Control "public, max-age=0, must-revalidate" </FilesMatch>
</IfModule>
```

### Notes
- WebP generated with `sharp` (`resize 920w, quality 80, effort 6`).
- All `.htaccess` directives are wrapped in `<IfModule>` — if a module is absent on the host they no-op rather than 500.
- Unrelated heavy but **unreferenced** files still in `public/images/` (`hero_phone.png` 384 KB, `hero_phone_v2.webp`, `Hero_imag.jpeg` 192 KB) were left in place — they don't load on any page, so deleting them is a repo-cleanup decision flagged to the user, not a perf fix.
- Could not capture live before/after PSI numbers this session — the anonymous PageSpeedInsights API daily quota was exhausted (HTTP 429). Re-run the PSI URL after deploy to confirm the LCP drop.
- Verification pending: rebuild (`npm run build:static`) and re-test on a real device / PSI after the next cPanel deploy.

## [2026-06-17] #060 — Size Hero artwork to the text column height (no longer oversized)
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** The right-column artwork was width-driven (`lg:w-[460px]` + `aspect-[2/3]` ≈ 690px tall), making it noticeably taller than the text column and looking oversized. User wanted its top/bottom to line up with the "Instant Help" badge and the "Now live in" row.

### Summary
Flipped the artwork from width-driven to height-driven on `lg`. The grid now stretches both columns (`lg:items-stretch`), so the **text column defines the row height** and the artwork fills it (`lg:h-full`) with its width derived from the 2:3 aspect ratio (`lg:w-auto`). The image stays at its native 2:3 ratio with no letterboxing, and its top/bottom align with the badge and city chips. Mobile is unchanged (all new utilities are `lg:`-prefixed).

### Before
```tsx
// src/components/landing/Hero.tsx
<div className="... grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-24 items-center">
  ...
  <motion.div
    className="... lg:-translate-x-5 w-[300px] sm:w-[360px] md:w-[420px] lg:w-[460px] mt-12 lg:mt-0 perspective-[1200px]"
    style={{ y: phoneY, height: "auto" }}
  >
    ...
    <motion.div className="relative z-10 w-full" animate={phoneControls} variants={phoneFloatVariants}>
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-3xl border-[3px] border-theme-accent ...">
```

### After
```tsx
// src/components/landing/Hero.tsx
<div className="... grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-24 items-center lg:items-stretch">
  ...
  <motion.div
    className="... lg:-translate-x-5 w-[300px] sm:w-[360px] md:w-[420px] lg:w-auto lg:h-full mt-12 lg:mt-0 perspective-[1200px]"
    style={{ y: phoneY }}
  >
    ...
    <motion.div className="relative z-10 w-full lg:w-auto lg:h-full" animate={phoneControls} variants={phoneFloatVariants}>
      <div className="relative w-full lg:w-auto lg:h-full aspect-[2/3] overflow-hidden rounded-3xl border-[3px] border-theme-accent ...">
```

### Notes
- Removed the inline `height: "auto"` from the artwork's `style` — it would have overridden `lg:h-full` (inline styles beat utility classes).
- Height chain is non-circular: the text column provides the definite row height; the artwork's `h-full` resolves against it and the width follows from the aspect ratio.
- Float + entrance motion preserved.

## [2026-06-16] #059 — Swap GTM container to `GTM-WBQ96CNK`
- **Type:** config
- **Scope:** `src/app/layout.tsx`
- **Why:** Point the site at the new Google Tag Manager container provided by the user.

### Summary
Replaced the GTM container ID so the head IIFE loader and the `<body>` noscript iframe both report into the new container. No structural change — both snippets already match Google's standard install format and reference the single `GTM_ID` constant, so the one-line swap propagates to both insertion points across both build targets.

### Before
```tsx
// src/app/layout.tsx
const GTM_ID = "GTM-5GZLFFP9";
```

### After
```tsx
// src/app/layout.tsx
const GTM_ID = "GTM-WBQ96CNK";
```

### Notes
- The `GTM_ID` constant feeds both the `<head>` loader script (line ~210) and the `<body>` noscript `<iframe>` (line ~272); no other edits required.
- Verification: load the site and confirm `https://www.googletagmanager.com/gtm.js?id=GTM-WBQ96CNK` is requested in the Network tab, and GTM Preview connects.

## [2026-06-12] #058 — Add OS/device `platform` to Meta custom events
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `docs/ANALYTICS.md`
- **Why:** Wanted finer device detail than the coarse `device_type` (mobile/desktop) — distinguish Windows / macOS / iPhone / iPad / Android phone / Android tablet for segmentation (e.g. App Store vs Play Store interest by OS).

### Summary
Added a `getPlatform()` UA parser, surfaced as a `platform` param on every Meta custom event alongside `device_type`. Handles the iPadOS-13+ quirk where iPads report as "Macintosh" (disambiguated via `navigator.maxTouchPoints`) and distinguishes Android phone vs tablet via the "Mobile" UA token.

### After
```ts
// src/lib/metaPixel.ts
function getPlatform() {
    const ua = navigator.userAgent;
    const touch = navigator.maxTouchPoints ?? 0;
    if (/iPhone/i.test(ua)) return "iphone";
    if (/iPad/i.test(ua)) return "ipad";
    if (/Macintosh/i.test(ua) && touch > 1) return "ipad";   // iPadOS 13+
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "android_phone" : "android_tablet";
    if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
    if (/Windows/i.test(ua)) return "windows";
    if (/Linux/i.test(ua)) return "linux";
    return "unknown";
}
// buildEventContext() now also sets: platform: getPlatform()
```

### Notes
- Returns: `windows | macos | iphone | ipad | android_phone | android_tablet | linux | unknown`.
- `device_type` (mobile/desktop, viewport-based) is kept — `platform` complements it, doesn't replace it.
- UA parsing is best-effort (spoofable); `navigator.userAgentData` was avoided due to no Safari/Firefox support.

## [2026-06-12] #057 — Enrich Meta custom events with page/device/referrer/UTM context
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `docs/ANALYTICS.md`
- **Why:** Make the three Meta conversions segmentable by page and attributable to the campaign that drove them, without any new user input or PII.

### Summary
Added a `buildEventContext()` helper that every custom event (`WhatsAppContact`, `PlayStoreClick`, `AppStoreClick`) now merges in: `page_path`, `device_type` ("mobile"/"desktop"), `referrer`, and `utm_source`/`utm_medium`/`utm_campaign` — on top of the existing `click_time` and `location`. All values are derived client-side at click time; empty values (direct traffic, no UTM tags) are omitted rather than sent blank. No PII (consistent with the email decision in #056).

### Before
```ts
// src/lib/metaPixel.ts
function trackCustom(event, params) {
    window.fbq?.("trackCustom", event, {
        click_time: new Date().toISOString(),
        ...(params ?? {}),
    });
}
```

### After
```ts
// src/lib/metaPixel.ts
function buildEventContext() {
    const ctx = {
        click_time: new Date().toISOString(),
        page_path: window.location.pathname,
        device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    };
    if (document.referrer) ctx.referrer = document.referrer;
    const query = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
        const value = query.get(key);
        if (value) ctx[key] = value;
    }
    return ctx;
}
function trackCustom(event, params) {
    window.fbq?.("trackCustom", event, { ...buildEventContext(), ...(params ?? {}) });
}
```

### Notes
- Example payload: `PlayStoreClick → { click_time, page_path: "/laptop-repair-mumbai", device_type: "mobile", referrer: "https://google.com/", utm_source: "fb", utm_campaign: "mumbai_q2", location: "hero" }`.
- `event_id` was offered but not selected; add later if a server-side Conversions API + dedup is introduced.
- `PageView` (via `track`) is unaffected — context applies only to the three custom events.

## [2026-06-12] #056 — Stamp Meta custom events with `click_time`
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts`, `docs/ANALYTICS.md`
- **Why:** Wanted the exact interaction time on each Meta conversion in Events Manager / for export.

### Summary
Every Meta custom event (`WhatsAppContact`, `PlayStoreClick`, `AppStoreClick`) now carries a `click_time` ISO-8601 timestamp, added centrally in `trackCustom` so all three stay consistent; a caller-supplied `click_time` overrides the default. The requested `email` field was intentionally **not** added: this is a public marketing site with anonymous Firebase auth only (no `currentUser.email`), and raw email in custom data violates Meta's policy (it must be hashed Advanced Matching). User opted to skip email for now.

### Before
```ts
// src/lib/metaPixel.ts
function trackCustom(event, params) {
    window.fbq?.("trackCustom", event, params ?? {});
}
```

### After
```ts
// src/lib/metaPixel.ts
function trackCustom(event, params) {
    window.fbq?.("trackCustom", event, {
        click_time: new Date().toISOString(),
        ...(params ?? {}),
    });
}
```

### Notes
- Example payload now: `PlayStoreClick → { click_time: "2026-06-12T…Z", location: "hero" }`.
- `PageView` is unaffected (it goes through `track`, not `trackCustom`).
- To add email later: capture a real email (e.g. a booking form) and pass it via **hashed** Advanced Matching, not a raw custom param.

## [2026-06-12] #055 — Add brand-orange border to the Hero artwork
- **Type:** chore
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** User asked for an orange border around the Hero image, using the site's existing brand orange.

### Summary
Wrapped the Hero `Hero.png` image in a rounded, clipped container with a 3px border in the site's brand-orange token (`border-theme-accent` → `--accent-primary`, `#EA580C`). The drop-shadow moved from the `<Image>` onto the wrapper so the rounded corners clip the artwork cleanly.

### Before
```tsx
<div className="relative w-full aspect-[2/3]">
  <Image src="/images/Hero.png" ... className="object-contain drop-shadow-[...]" />
</div>
```

### After
```tsx
<div className="relative w-full aspect-[2/3] overflow-hidden rounded-3xl border-[3px] border-theme-accent shadow-[0_24px_48px_rgba(0,0,0,0.15)] sm:shadow-[0_40px_80px_rgba(0,0,0,0.22)]">
  <Image src="/images/Hero.png" ... className="object-contain" />
</div>
```

### Notes
- Uses the theme token (`border-theme-accent`), so it tracks the brand orange and stays correct across light/dark themes — no hardcoded hex.

## [2026-06-12] #054 — Replace the Hero phone mockup with the plain Hero.png artwork
- **Type:** refactor
- **Scope:** `src/components/landing/Hero.tsx`, asset `public/images/Hero.png`
- **Why:** User wants the new `Hero.png` artwork shown directly in the Hero, without the phone-mockup ("mobile modal") chrome around it.

### Summary
Removed the Hero's right-column phone mockup (bezel, notch, home indicator, black screen frame) and replaced it with the plain `Hero.png` image at its native 2:3 ratio (`object-contain`, so nothing is cropped). The entrance + float motion, parallax, and a softened glow/ground-shadow are preserved. The image column was widened (`w-[300px]`→`lg:w-[460px]`) to suit full artwork, and the phone-screen-specific blue glow was neutralised to a soft brand-accent glow.

### Before
```tsx
// src/components/landing/Hero.tsx — phone mockup
<div className="relative w-full aspect-[390/844] drop-shadow-[...]">
  <div className="...rounded-[3.2rem] bg-zinc-900 p-[10px] ring-1 ring-white/15...">
    <div className="...overflow-hidden rounded-[2.7rem] bg-black">
      <Image src="/images/hero_phone_v2.webp" fill priority className="object-cover" .../>
      {/* notch */}{/* home indicator */}
    </div>
  </div>
</div>
```

### After
```tsx
// src/components/landing/Hero.tsx — plain artwork
<div className="relative w-full aspect-[2/3]">
  <Image
    src="/images/Hero.png"
    alt="Pockit Engineers — doorstep laptop repair and IT support in Mumbai"
    fill priority
    className="object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.15)] sm:drop-shadow-[0_40px_80px_rgba(0,0,0,0.22)]"
    sizes="(max-width: 640px) 80vw, 460px"
  />
</div>
```

### Notes
- `object-contain` at the image's native 2:3 ratio → no cropping.
- **Asset weight:** `Hero.png` is ~2.3 MB and is the LCP image (`priority`). Per the project's WebP-conversion preference, recommend converting it to WebP and replacing the original before launch.
- `hero_phone_v2.webp` is now unreferenced in `src/`; left in place (not deleted) in case of rollback.
- `phoneRef`/`phoneControls`/`phone*Variants` names kept as-is (internal; behaviour unchanged) to limit churn.

## [2026-06-12] #053 — Move WhatsApp to the floating CTA; drop the header WhatsApp pill
- **Type:** refactor
- **Scope:** `src/components/landing/StickyBookCTA.tsx` → `src/components/landing/WhatsAppFloat.tsx` (renamed + repurposed), `src/components/landing/AppShell.tsx`, `src/components/landing/Header.tsx`
- **Why:** User asked for a single, unmistakable WhatsApp entry point in the floating CTA slot and to clear the WhatsApp pill out of the header so the header keeps just the orange "Book a Service" CTA.

### Summary
The bottom-right floating CTA used to be a "Book a Service" pill (linking to `/#download`). It now becomes a brand-green (`#25D366`) WhatsApp pill that opens `wa.me` via `whatsappHref()`. The component was renamed `StickyBookCTA` → `WhatsAppFloat` to match its new purpose (the name `CLAUDE.md` already anticipated). The header's green WhatsApp pill was removed from both the desktop bar and the mobile drawer; the desktop "Book a Service" pill and the mobile store buttons stay. `Header.tsx`'s now-unused `trackEvent`/`AnalyticsEvents`/`trackWhatsAppClick` imports were dropped (`whatsappHref` stays — the `/become-a-technician` "Join Us" pill still uses it).

### Notes
- **Reach change:** the header WhatsApp pill rendered site-wide; the floating WhatsApp pill mounts only via `AppShell` (home page) and only after ~600px of scroll. WhatsApp is therefore now a home-page channel, not a site-wide one. Flagged to the user.
- Float analytics: `WhatsAppFloatClick` (GA, `location: "floating_button"`) + `trackWhatsAppClick("float")` (Meta Pixel).
- Conflicts with an earlier memory note ("WhatsApp single home = Hero CTA chip"); superseded by this explicit request.

### Before
```tsx
// src/components/landing/StickyBookCTA.tsx (bottom-right float)
<Link href={resolveNavHref("/#download", isHome)} onClick={...}
    style={{ background: "linear-gradient(135deg, rgb(var(--accent-primary)), ...)" }}>
    <svg ...><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
    ...Book a Service...
</Link>

// src/components/landing/Header.tsx (desktop + mobile drawer)
{!isExpertPage ? (<a href={whatsappHref()} ... style={{ background: "#25D366" }}>...WhatsApp...</a>) : null}
```

### After
```tsx
// src/components/landing/WhatsAppFloat.tsx (bottom-right float)
<a href={whatsappHref()} target="_blank" rel="noopener noreferrer"
    style={{ background: "#25D366", boxShadow: "0 8px 32px rgba(37,211,102,0.45), ..." }}>
    <svg ...><path d="M17.472 14.382c-...WhatsApp glyph..." /></svg>
    ...WhatsApp...
</a>

// src/components/landing/Header.tsx — WhatsApp pills removed; "Book a Service" + store buttons retained
```

## [2026-06-11] #052 — Integrate Meta (Facebook) Pixel (standalone from GA/GTM)
- **Type:** feature
- **Scope:** `src/lib/metaPixel.ts` (new), `src/components/analytics/MetaPixelRouteTracker.tsx` (new), `src/app/layout.tsx`, `src/components/landing/{Header,Hero,DownloadBand,FloatingDownload}.tsx`, `src/components/landing-pages/LandingPageView.tsx`, `docs/ANALYTICS.md` (new)
- **Why:** Marketing needs the Meta Pixel live to attribute Meta Ads against the three high-intent CTAs (WhatsApp, App Store, Play Store), kept fully separate from Google Analytics / GTM.

### Summary
Installed the Meta Pixel base snippet in the root layout (gated on `NEXT_PUBLIC_META_PIXEL_ID`, default production ID, empty string disables). A standalone module `src/lib/metaPixel.ts` exposes three helpers that fire **named custom events** — `WhatsAppContact`, `PlayStoreClick`, `AppStoreClick` — via `fbq('trackCustom', …)`, called directly from each button. PageView fires on first load plus on every SPA navigation via `MetaPixelRouteTracker`. The pixel shares no code with `trackEvent` (GA) — the two pipelines are independent.

### Before
```tsx
// src/app/layout.tsx — no Meta Pixel; GA + GTM only
{GA_MEASUREMENT_ID ? (<>...gtag...</>) : null}
</head>
```

### After
```tsx
// src/app/layout.tsx — Meta Pixel added alongside (independent of) GA + GTM
{GA_MEASUREMENT_ID ? (<>...gtag...</>) : null}
{META_PIXEL_ID ? (
  <>
    <script dangerouslySetInnerHTML={{ __html: `!function(...)(...);fbq('init','${META_PIXEL_ID}');fbq('track','PageView');` }} />
    <noscript><img height="1" width="1" style={{display:"none"}} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
  </>
) : null}
</head>
// + <MetaPixelRouteTracker /> in <body> for SPA PageViews
```

### After (new module)
```ts
// src/lib/metaPixel.ts
function trackCustom(event, params) { window.fbq?.("trackCustom", event, params ?? {}); }
export function trackWhatsAppClick(location?)  { trackCustom("WhatsAppContact", { ...loc }); }
export function trackPlayStoreClick(location?) { trackCustom("PlayStoreClick", { ...loc }); }
export function trackAppStoreClick(location?)  { trackCustom("AppStoreClick", { ...loc }); }
```

### Notes
- **Events sent to Meta:** `PageView` (load + SPA nav) and exactly three custom conversions. Nothing else (chatbot, Book-a-Service, nav, scroll) reaches Meta — those stay GA-only.
- **Custom vs standard:** these are *custom* events (clear names in Events Manager); to optimise/report in Ads Manager, define a Custom Conversion per name.
- **Call sites (12):** Header desktop + mobile WhatsApp, Header mobile-drawer store badges, Hero (WhatsApp/Play/App), DownloadBand (Play/App), FloatingDownload (Play/App), LandingPageView (hero + footer WhatsApp). The Header drawer + FloatingDownload store badges previously had no analytics at all.
- **Excluded by design:** technician-recruitment WhatsApp links (ExpertHero/Header "Join Us") do NOT fire `WhatsAppContact` — different funnel.
- **Env:** `NEXT_PUBLIC_META_PIXEL_ID` (default `1274218051363697`). Works on both build targets (client-side script).
- **Verification:** with Meta Pixel Helper — `PageView` on load; WhatsApp pill → `WhatsAppContact`; store badges → `PlayStoreClick`/`AppStoreClick`; chatbot open → no Meta event; `/blog` nav → second `PageView`. Typecheck + lint clean (the 3 lint flags are pre-existing in GTM/theme/disable-directive code).

## [2026-06-11] #051 — Reorder Hero CTA row: WhatsApp first
- **Type:** refactor
- **Scope:** `src/components/landing/Hero.tsx`
- **Why:** User wants "Chat us / WhatsApp" to lead the Hero CTA row, ahead of the Android (Google Play) and App Store buttons.

### Summary
Moved the WhatsApp CTA from the third (last) position to the first in the Hero button row. New order is **WhatsApp → Google Play → App Store**. No change to styling, analytics events, or the buttons' markup — only their order. WhatsApp remains the site's single WhatsApp home.

### Before
\`\`\`tsx
// src/components/landing/Hero.tsx — CTA row order
// 1. Google Play  2. App Store  3. WhatsApp
\`\`\`

### After
\`\`\`tsx
// src/components/landing/Hero.tsx — CTA row order
// 1. WhatsApp  2. Google Play  3. App Store
\`\`\`

### Notes
- Verification: visit the home page hero — the green WhatsApp ("Chat us") button is now the leftmost (first) of the three; on mobile it stacks on top.

## [2026-06-11] #050 — Install Google Tag Manager site-wide
- **Type:** feature
- **Scope:** `src/app/layout.tsx`
- **Why:** Add the GTM-5GZLFFP9 container to every page so all tags (incl. GA4) can be managed centrally without further code changes.

### Summary
Added the Google Tag Manager container `GTM-5GZLFFP9` to the shared root layout. The GTM IIFE is injected as the first child of `<head>` ("as high as possible") and the `<noscript>` iframe as the first child of `<body>`, following GTM's standard install. Because the root layout is shared by both build targets, GTM now loads across the whole property — the cPanel main site and the Vercel blog/Studio/landing pages alike. The container ID is a public, non-secret value, so it's hardcoded (unlike the env-gated GA4 ID) and rendered unconditionally.

### Before
\`\`\`tsx
// src/app/layout.tsx
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
\`\`\`
\`\`\`tsx
// src/app/layout.tsx
      <head>
        {/* Blocking theme script: runs before paint to prevent theme colour flash */}
\`\`\`
\`\`\`tsx
// src/app/layout.tsx
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
\`\`\`

### After
\`\`\`tsx
// src/app/layout.tsx
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Google Tag Manager container. Public (non-secret) ID; rendered on every
// page across both build targets (cPanel main site + Vercel blog) so the
// whole property reports into one GTM container...
const GTM_ID = "GTM-5GZLFFP9";
\`\`\`
\`\`\`tsx
// src/app/layout.tsx
      <head>
        {/* Google Tag Manager — placed as high in <head> as possible ... */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){...})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* Blocking theme script: runs before paint to prevent theme colour flash */}
\`\`\`
\`\`\`tsx
// src/app/layout.tsx
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) — must be the first child of <body> */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0" width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
\`\`\`

### Notes
- GTM coexists with the existing direct GA4 (`gtag.js`) install. If GA4 is later migrated to be fired *through* GTM, remove the inline `gtag` block in this file to avoid double-counting `page_view`.
- Verification: load any page, open DevTools → Network, filter `gtm.js` → expect a 200 for `gtm.js?id=GTM-5GZLFFP9`; in Console, `window.dataLayer` should contain a `gtm.start` entry. Confirm in GTM Preview / Tag Assistant.

## [2026-06-05] #049 — Stop cropping the Featured blog cover image + widen Vercel path filter
- **Type:** fix
- **Scope:** `src/components/blog/FeaturedPost.tsx`, `.github/workflows/deploy-vercel.yml`
- **Why:** Editor reported the cover image in the Featured blog card was getting cropped on the right — the branded "Pockit Engineers" wordmark visibly lost its tail at the divider. Two compounding causes: Sanity was pre-cropping to a forced `1400×900` before delivery, then `object-cover` was zooming the result to fill the asymmetric `1.15fr × min-h-460px` desktop card cell. Either step alone would mangle a non-16:9 upload; together they guaranteed it.
- **Related:** Touches only `src/components/blog/FeaturedPost.tsx`. `PostCard` (regular blog grid) stays on `object-cover` because every grid card is fixed 16:9 and the result is consistent across the row.

### Summary
Two surgical changes. First, the Sanity image transform drops the forced height + `fit("crop")` and switches to `fit("max")` + `auto("format")` — so the editor's upload is delivered unmolested at a max 1400 px wide, in modern formats where supported. Second, the Featured card swaps `object-cover` → `object-contain` so the full image always shows; any letterbox area inherits the existing `bg-theme-bg2` container colour and blends with the card. A path-filter widening to `.github/workflows/deploy-vercel.yml` (next item) ensures this commit actually triggers a Vercel build.

### Before
```tsx
// src/components/blog/FeaturedPost.tsx
const coverSrc = post.coverImage?.asset
    ? urlFor(post.coverImage).width(1400).height(900).fit("crop").url()
    : null;

// later
<Image
    src={coverSrc}
    alt={post.coverImage?.alt ?? post.title}
    fill
    priority
    sizes="(max-width: 1024px) 100vw, 55vw"
    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
/>
```

```yaml
# .github/workflows/deploy-vercel.yml — paths filter only covered app/blog
paths:
  - "src/app/blog/**"
  - "src/app/studio/**"
  - "sanity.config.ts"
  - "sanity/schemas/**"
  - "src/lib/sanity/**"
```

### After
```tsx
// src/components/blog/FeaturedPost.tsx
// No forced height + fit("max") so Sanity does NOT pre-crop the editor's
// upload. auto("format") returns WebP / AVIF where the client supports it.
// object-contain on the <Image> shows the full image; letterbox area falls
// back to bg-theme-bg2 and blends with the card surround.
const coverSrc = post.coverImage?.asset
    ? urlFor(post.coverImage).width(1400).fit("max").auto("format").url()
    : null;

<Image
    src={coverSrc}
    …
    className="object-contain transition-transform duration-700 group-hover:scale-[1.04]"
/>
```

```yaml
# .github/workflows/deploy-vercel.yml — adds the two blog/landing component dirs
paths:
  - "src/app/blog/**"
  - "src/app/studio/**"
  - "src/components/blog/**"
  - "src/components/landing-pages/**"
  - "sanity.config.ts"
  - "sanity/schemas/**"
  - "src/lib/sanity/**"
```

### Notes
- `PostCard` (grid cards) intentionally left on `object-cover` — its container is fixed `aspect-[16/9]` so every card matches and `cover` reads as design intent, not accidental crop.
- Editor still has the option to set a Sanity hotspot on the cover image; with `fit("max")` that hotspot is honoured if present and ignored cleanly if absent.
- Adding `src/components/blog/**` + `src/components/landing-pages/**` to the Vercel workflow's `paths` filter closes a gap where component-only edits to those dirs would never trigger Vercel — the cPanel workflow's filter already covered them, but Vercel was silent.
- `tsc --noEmit` clean post-change.

---

## [2026-06-05] #048 — Restore WhatsApp pill to the global site Header
- **Type:** feat
- **Scope:** `src/components/landing/Header.tsx`
- **Why:** Marketing flagged that the header WhatsApp button (CHANGELOG #040) was missing from every page. #042 moved it out of the Header into the home Hero's three-button CTA row, which left every non-home surface — landing pages, /about, /become-a-technician, blog — without a top-of-page WhatsApp affordance. The hero/banner WhatsApp additions in #047 helped on landing pages specifically, but the user's ask was for the always-visible header pill. Restoring it covers every page mounting `Header` in one place.
- **Related:** Reverses the header-pull part of #042 while preserving the Hero WhatsApp button it added on the home page; pairs with #047 which added hero + banner WhatsApp affordances on landing pages.

### Summary
Re-added a WhatsApp pill to the right-hand CTA group of the desktop Header, next to "Book a Service", and mirrored it to the top of the mobile drawer's store-row. Pill uses the canonical WhatsApp brand green (`#25D366`) and brand glyph, matching the visual treatment used in the Hero (#042) and the landing-page hero/footer-banner CTAs (#047). The pill is hidden on `/become-a-technician` ("expert page"), which already swaps the Book button for a "Join Us" WhatsApp pill — duplicating WhatsApp affordances there would be visual noise.

### Before
```tsx
// src/components/landing/Header.tsx — desktop CTA group ended at Book a Service
<Link href={resolveNavHref("/#download", isHome)} … >
    {HEADER.bookLabel}
</Link>
/* WhatsApp CTA moved out of the Header into the Hero
   download row (CHANGELOG #041) so the site has a
   single WhatsApp home alongside the store buttons. */
```

```tsx
// Mobile drawer store row had Google Play + App Store only
<div className="mt-3 flex flex-col gap-2">
    {/* WhatsApp CTA moved to the Hero download row (CHANGELOG #041) */}
    <a href="https://play.google.com/…">…</a>
    <a href="https://apps.apple.com/…">…</a>
</div>
```

### After
```tsx
// Desktop: WhatsApp pill rendered right after Book a Service (hidden on /become-a-technician)
{!isExpertPage ? (
    <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Pockit Engineers on WhatsApp"
        onClick={() => trackEvent(AnalyticsEvents.WhatsAppFloatClick, { location: "header" })}
        className="inline-flex items-center gap-2 text-[16px] font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
        style={{ padding: "9px 18px", borderRadius: 9999, background: "#25D366", boxShadow: "0 2px 14px rgba(37,211,102,0.40)" }}
    >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true"><path d="…WhatsApp glyph…" /></svg>
        WhatsApp
    </a>
) : null}
```

```tsx
// Mobile drawer: WhatsApp pill prepended above the store buttons
<a
    href={whatsappHref()}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with Pockit Engineers on WhatsApp"
    onClick={() => { trackEvent(AnalyticsEvents.WhatsAppFloatClick, { location: "header-mobile" }); setOpen(false); }}
    className="flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
    style={{ background: "#25D366", boxShadow: "0 2px 14px rgba(37,211,102,0.30)" }}
>
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0" aria-hidden="true"><path d="…WhatsApp glyph…" /></svg>
    WhatsApp
</a>
```

### Notes
- Pill is hidden on `/become-a-technician` because that page already swaps the Book button for a green "Join Us" WhatsApp pill pointing at the same number — second pill there would be redundant.
- Analytics fires `WhatsAppFloatClick` with `location: "header" | "header-mobile"` so the existing GA4 funnel rolls these clicks together with Hero (#042) and landing-page (#047) clicks across one event.
- Number + prefilled message still resolve through `whatsappHref()` (`src/constants/copy.ts`) — single source of truth, edit in one place.
- Home page now shows WhatsApp twice (Header pill + Hero third button) — that is intentional: top-of-page channel + below-the-fold third CTA. Mirrors how landing pages now have Header pill + hero CTA + footer banner from #047.
- `tsc --noEmit` clean post-change.

---

## [2026-06-05] #047 — Add WhatsApp CTA to every Sanity-driven landing page
- **Type:** feat
- **Scope:** `src/components/landing-pages/LandingPageView.tsx`
- **Why:** Home page Hero has a WhatsApp button (#042), but the Sanity-driven landing pages (`/laptop-repair-mumbai`, `/macbook-repair-mumbai`, all 10 service pages + future locality pages) never rendered it. Marketing flagged: "no page should be missing that button". Adding it in two places per page — hero CTA row and bottom CTA banner — closes the gap without touching Sanity schema or editor workflow.
- **Related:** Mirrors the home Hero pattern from #042. Lights up the full set of service pages seeded in #044 / wired in #046.

### Summary
Imported `whatsappHref` from `@/constants/copy` into `LandingPageView` and added two new WhatsApp anchors: one as a fourth CTA in the hero row alongside Book / Secondary / Phone, and one as a companion CTA next to the primary "Book a Service" button in the bottom `CtaBanner` section. Both use the brand-green WhatsApp glyph and open `wa.me/…` in a new tab. Analytics fires twice per click — `WhatsAppFloatClick` (so it rolls up alongside home Hero clicks in the existing GA4 funnel) and `LandingCtaClick` with a `cta: "hero-whatsapp" | "footer-banner-whatsapp"` discriminator (so per-page funnels keep working).

### Before
```tsx
// src/components/landing-pages/LandingPageView.tsx — HeroCtas row ended after the phone CTA
{phone ? (
    <a href={`tel:${phone.replace(/\s+/g, "")}`} …>
        <Phone className="w-4 h-4 text-theme-accent" />
        {phone}
    </a>
) : null}
</motion.div>
```

```tsx
// CtaBanner had only the primary button
<div className="mt-8 flex justify-center">
    <Link href={href} …>
        {primaryCta.label ?? "Book a Service"}
        <ArrowRight className="w-4 h-4" />
    </Link>
</div>
```

### After
```tsx
// HeroCtas row — WhatsApp added as fourth button, compact pill matching the phone CTA
<a
    href={whatsappHref()}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with Pockit Engineers on WhatsApp"
    onClick={() => {
        trackEvent(AnalyticsEvents.WhatsAppFloatClick, { location: "landing-hero", page_slug: pageSlug });
        trackEvent(AnalyticsEvents.LandingCtaClick, { page_slug: pageSlug, cta: "hero-whatsapp" });
    }}
    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-text/15 bg-theme-glass/5 px-5 py-4 text-[14px] font-semibold text-theme-text hover:bg-theme-glass/10 transition-colors"
>
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#25D366" aria-hidden="true"><path d="…" /></svg>
    WhatsApp
</a>
```

```tsx
// CtaBanner — WhatsApp companion next to the primary button, row layout for the two
<div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
    <Link href={href} …>{primaryCta.label ?? "Book a Service"}<ArrowRight className="w-4 h-4" /></Link>
    <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" aria-label="Chat with Pockit Engineers on WhatsApp" …>
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#25D366" aria-hidden="true"><path d="…" /></svg>
        Chat on WhatsApp
    </a>
</div>
```

### Notes
- Two click points per page (hero + footer banner) match the home page convention (single Hero WhatsApp + bottom DownloadBand WhatsApp).
- Brand colour kept at `#25D366` (canonical WhatsApp green) so the channel stays instantly recognisable across all surfaces.
- WhatsApp number + prefilled message are read from `BUSINESS` constants via `whatsappHref()`. Edits to the number in `src/constants/copy.ts` automatically propagate to every landing page.
- Analytics double-fire (`WhatsAppFloatClick` + `LandingCtaClick`) is intentional: the first is for the brand-wide WhatsApp funnel that already exists in GA4, the second is for per-slug landing-page conversion attribution.
- Applies to every Sanity-driven landing page (all 10 service-city slugs today, every future locality / problem-fix slug tomorrow). No Sanity schema change, no editor workflow change.

---

## [2026-06-02] #046 — Wire every home `ServiceGrid` card to its landing page
- **Type:** feat
- **Scope:** `src/components/landing/ServiceGrid.tsx`
- **Why:** Home page service cards previously had `landingHref` only on the `laptop` card; the other nine funneled to `#download`. With #044/#045 having seeded the remaining nine Mumbai service landing pages in Sanity, every card can now point at its dedicated page. Internal linking from home is the primary SEO discovery path for the cluster; without it the new pages would be orphaned from a crawl perspective.
- **Related:** Follows #044 (seed script) and #045 (dotless-ID fix that made the new docs publicly visible to the build).

### Summary
Added a `landingHref` field on each of the nine remaining `SERVICES` entries, pointing at the Sanity slug created by `seed-service-pages.ts`. `ServiceCard` already routes to `landingHref` when present and tracks the `ServiceCardClick` analytics event with a `destination: "landing" | "download"` discriminator, so no component logic change was needed.

### Before
Only the `laptop` entry carried a `landingHref`; the other nine `SERVICES` entries omitted the field, so `ServiceCard` defaulted them to `#download`.

### After
Every entry carries a `landingHref` matching its seeded Sanity slug:

| `id` | `landingHref` |
|------|---------------|
| `instant-help` | `/instant-it-help-mumbai` |
| `laptop` | `/laptop-repair-mumbai` |
| `macbook` | `/macbook-repair-mumbai` |
| `desktop` | `/desktop-repair-mumbai` |
| `printer` | `/printer-repair-mumbai` |
| `wfh-setup` | `/wfh-setup-mumbai` |
| `smart-tv` | `/smart-tv-setup-mumbai` |
| `smart-phone` | `/smartphone-help-mumbai` |
| `kids-safe` | `/kids-safe-mumbai` |
| `cctv` | `/cctv-installation-mumbai` |

### Notes
- Each `landingHref` exactly matches the dotless `_id` / `slug.current` produced by `npm run seed:services` (#045). Renaming a slug in Sanity needs a matching update here.
- Cards whose landing page is still `seo.noIndex: true` route to a real-but-not-yet-indexed page. The link resolves for users; Google ignores the page until the editor unticks noIndex in Studio.
- `ServiceCardClick` analytics now records `destination: "landing"` for every service card click instead of mostly `"download"`.

---

## [2026-06-02] #045 — Switch seeded landingPage IDs from `landingPage.<slug>` to bare `<slug>` + cleanup script
- **Type:** fix
- **Scope:** `scripts/seed-service-pages.ts`, `scripts/delete-dotted-landing-pages.ts` (new), `package.json`
- **Why:** First run of #044's seed silently produced 9 docs that were invisible to anonymous reads. Sanity treats document `_id`s containing a `.` as system-namespaced and hides them from the unauthenticated public API. The build-time GROQ `client` runs without a token, so `generateStaticParams` would have seen an empty slug list for those docs and never emitted HTML for them. The previous session's 15 locality drafts have the same bug for the same reason — their `landingPage.laptop-repair-*` IDs were equally invisible to the build, which is why their `/laptop-repair-<locality>` URLs 404'd even after publish webhooks fired.
- **Related:** Fixes #044. Same root cause as the locality drafts session's "published but won't build" mystery.

### Summary
Two changes:
1. `seed-service-pages.ts` `buildDoc` now sets `_id: cfg.slug` (bare slug, no dot) instead of `_id: `landingPage.${cfg.slug}``. New docs are publicly visible and the build picks them up.
2. New one-off `scripts/delete-dotted-landing-pages.ts` removes every legacy `landingPage.*` doc. Two-pass: pass 1 patches each doc to `unset(["relatedPages"])` so cross-references between dotted docs are broken; pass 2 deletes each doc. Runs against `perspective: "raw"` so drafts (`drafts.landingPage.*`) are scrubbed too — they hold their own `relatedPages` copies and would otherwise block deletion of the published twin.

### Before
```ts
// scripts/seed-service-pages.ts
function buildDoc(cfg: ServiceConfig) {
    return {
        _id: `landingPage.${cfg.slug}`,
        _type: "landingPage",
        // …
    };
}
```

```jsonc
// package.json
{
  "scripts": {
    "seed:services": "tsx --env-file=.env.local scripts/seed-service-pages.ts"
  }
}
```

### After
```ts
// scripts/seed-service-pages.ts
function buildDoc(cfg: ServiceConfig) {
    return {
        // NOTE: avoid dots in custom `_id`. Sanity treats `foo.bar` IDs as
        // system-namespaced and excludes them from anonymous public reads
        // (the build-time `client` has no token, so it would never see
        // dotted-ID docs). Using the bare slug keeps the doc in the public
        // perspective and lets generateStaticParams pick it up.
        _id: cfg.slug,
        _type: "landingPage",
        // …
    };
}
```

```jsonc
// package.json
{
  "scripts": {
    "seed:services": "tsx --env-file=.env.local scripts/seed-service-pages.ts",
    "delete:dotted-landing": "tsx --env-file=.env.local scripts/delete-dotted-landing-pages.ts"
  }
}
```

```ts
// scripts/delete-dotted-landing-pages.ts (new)
const client = createClient({
    projectId, dataset, apiVersion: "2026-04-15",
    useCdn: false, token,
    // Returns both drafts and published twins so we scrub both.
    perspective: "raw",
});

// Pass 1: unset `relatedPages` on every dotted doc.
for (const d of docs) {
    await client.patch(d._id).unset(["relatedPages"]).commit();
}
// Pass 2: delete each doc.
for (const d of docs) {
    await client.delete(d._id);
}
```

### Notes
- Verified on the live API after cleanup + re-seed: the anonymous query `*[_type=="landingPage"]{_id, "slug": slug.current}` returns all 10 docs (1 Mumbai laptop with random ID + 9 new service docs with bare-slug IDs). Build now has a non-empty slug list to walk.
- The 9 new service docs are still `seo.noIndex: true` — editor flips them false in Studio once copy is polished. That gate is intentional and independent of this fix.
- Mumbai laptop's `_id` is `x9AkaoQOe6dzdFl4eJwcsh` (random, Studio-generated) — left untouched. Random Sanity IDs have no dots so they are publicly visible by default.
- The legacy 15 locality drafts (`landingPage.laptop-repair-andheri`, …) are also removed by the cleanup script. That matches the current "Mumbai service pages only, no locality pages yet" scope. When locality pages come back later, the editor creates them via Studio (which generates dotless random IDs).

---

## [2026-06-02] #044 — Seed script for Mumbai service-city landing pages
- **Type:** chore
- **Scope:** `scripts/seed-service-pages.ts` (new), `package.json`
- **Why:** Mumbai laptop landing page proved the schema + render path works end-to-end. Need 9 more service-city pages (MacBook, Desktop, Printer, WFH Setup, Smart TV, Smartphone, Kids Safe, CCTV, Instant IT Help) so each service shown on the home `ServiceGrid` has a doorway page that can rank for `"<service> Mumbai"` queries. Editor would otherwise have to create each doc by hand and risk slug/pageType typos. A seed script bootstraps the structure correctly once; editors then polish copy in Studio.
- **Related:** Follow-up to #022 (landingPage schema), #024 (cPanel deploy workflow), #026/#027 (CDN-bypass attempt + revert).

### Summary
New script `scripts/seed-service-pages.ts` upserts 9 `landingPage` documents into Sanity (`pg938kpo` / `production`) using `createIfNotExists`. Unlike `seed-landing-pages.ts` which uses `createOrReplace` and would overwrite editor changes, this script is safe to re-run: existing docs are left untouched. Each seeded doc has correct slug + pageType + service + location, placeholder hero / intro / services / FAQ copy, and `seo.noIndex: true` so the page stays out of Google's index until the editor flips the toggle. Every `areasServed` entry has `name` only — no `href` — so the locality chip grid renders as non-clickable spans (Mumbai-only scope for now; locality pages are out of scope until later).

### Before
```jsonc
// package.json
{
  "scripts": {
    "seed:landing": "tsx --env-file=.env.local scripts/seed-landing-pages.ts"
  }
}
```

```text
scripts/
  seed-landing-pages.ts   # seeds only the Mumbai laptop doc
```

### After
```jsonc
// package.json
{
  "scripts": {
    "seed:landing": "tsx --env-file=.env.local scripts/seed-landing-pages.ts",
    "seed:services": "tsx --env-file=.env.local scripts/seed-service-pages.ts"
  }
}
```

```text
scripts/
  seed-landing-pages.ts   # Mumbai laptop, createOrReplace (run once)
  seed-service-pages.ts   # 9 service docs, createIfNotExists (re-runnable)
```

Slug + service map produced by the script:

| Slug | Service | Page type |
|------|---------|-----------|
| `instant-it-help-mumbai` | Instant IT Help | service-city |
| `macbook-repair-mumbai` | MacBook Repair | service-city |
| `desktop-repair-mumbai` | Desktop Repair | service-city |
| `printer-repair-mumbai` | Printer Repair | service-city |
| `wfh-setup-mumbai` | Work-From-Home Setup | service-city |
| `smart-tv-setup-mumbai` | Smart TV Setup | service-city |
| `smartphone-help-mumbai` | Smartphone Help | service-city |
| `kids-safe-mumbai` | Kids Safe (Kaspersky) | service-city |
| `cctv-installation-mumbai` | CCTV Installation | service-city |

### Notes
- **One-off run:** `npm run seed:services` (needs `SANITY_API_WRITE_TOKEN` in `.env.local` — Editor role).
- **Idempotent:** `createIfNotExists` means re-runs skip docs that already exist, so editor copy is never overwritten. Safe to re-invoke if a run partially fails.
- **noIndex gate:** every doc is seeded with `seo.noIndex: true`. Editor flips it false in Studio after polishing copy. Stops thin seeded pages from getting indexed and dragging the cluster's quality signal.
- **Non-clickable chips:** `areasServed[].href` is omitted across the board. The `<a.href ? <Link> : <span>>` ternary in `LandingPageView.tsx` already renders spans when href is missing, so no component change is needed. When per-locality pages exist later, editor can add hrefs back per-area.
- **Webhook behaviour:** seeding writes drafts that the editor publishes individually. Each publish fires the existing `sanity-publish` webhook → cPanel rebuild. Concurrency group `deploy-cpanel` cancels in-flight runs so the final publish is the one that ships all docs. Same pattern as the locality drafts session.
- **Per-doc copy is placeholder.** The intro paragraphs, FAQs, and service items are factually plausible starting points but should be rewritten by the editor for SEO — Google's Helpful Content System penalises near-duplicate text across slugs in the same cluster.
- Renumbered from #041 to #044 during rebase to avoid collision with a parallel `develop` commit series (#041 WhatsApp number, #042 WhatsApp CTA move, #043 nav-link nowrap).

---

## [2026-06-01] #043 — Stop desktop nav links from wrapping (alignment fix)
- **Type:** fix
- **Scope:** `src/components/landing/Header.tsx`
- **Why:** Two-word nav items ("How It Works", "Our Promise") wrapped to a second line when the row got tight, pushing them out of vertical alignment with the single-word items.

### Summary
The desktop nav links had no wrapping guard, so when the header row was space-constrained the multi-word labels broke onto two lines while "Services / Testimonials / Blog / FAQ" stayed single-line — the whole nav looked misaligned. Added `whitespace-nowrap` to the shared link class so every label stays on one line and the row baselines line up.

### Before
```tsx
// src/components/landing/Header.tsx
const cls = isActiveBlog
    ? "px-4 py-2 text-[16px] font-semibold rounded-lg transition-colors duration-200 text-theme-accent-end bg-theme-text/5"
    : "px-4 py-2 text-[16px] font-medium rounded-lg transition-colors duration-200 text-theme-text/75 hover:text-theme-accent-end hover:bg-theme-text/5";
```

### After
```tsx
// src/components/landing/Header.tsx
const cls = isActiveBlog
    ? "whitespace-nowrap px-4 py-2 text-[16px] font-semibold rounded-lg transition-colors duration-200 text-theme-accent-end bg-theme-text/5"
    : "whitespace-nowrap px-4 py-2 text-[16px] font-medium rounded-lg transition-colors duration-200 text-theme-text/75 hover:text-theme-accent-end hover:bg-theme-text/5";
```

### Notes
- Desktop nav only (`hidden md:flex`); the mobile drawer stacks links vertically and was never affected.
- With the WhatsApp CTA already moved out of the header (#042), the nav has ample room at `md`+ even with all labels single-line, so `nowrap` won't cause horizontal overflow.

## [2026-06-01] #042 — Move WhatsApp CTA from Header into the Hero download row
- **Type:** refactor
- **Scope:** `src/components/landing/Header.tsx`, `src/components/landing/Hero.tsx`, `src/constants/copy.ts`
- **Why:** Give the site a single WhatsApp home as a third store-style button matching the Google Play / App Store buttons, per user direction: "three button size n icon style and all should same."

### Summary
Removed the WhatsApp pill from the desktop Header and the WhatsApp button from the mobile drawer (both introduced in #040), and added WhatsApp as the third button in the Hero CTA row directly after App Store. The new button reuses the exact glass shell, `w-7 h-7` icon size, and super-label/label stack of the two store buttons, so all three are visually identical apart from the brand glyph. This supersedes #040's header-pill placement and aligns with the locked "single WhatsApp home in the Hero CTA row" preference.

### Before
```tsx
// src/components/landing/Header.tsx (desktop CTA group)
<a href={whatsappHref()} ... className="inline-flex items-center gap-2 ... text-white ..."
   style={{ padding: "9px 22px", borderRadius: 9999, background: "linear-gradient(...)", ... }}>
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">...</svg>
  WhatsApp
</a>
// + a second full-width WhatsApp <a> in the mobile drawer
```
```tsx
// src/components/landing/Hero.tsx (CTA row ended at App Store)
        </motion.a>   {/* App Store */}
    </motion.div>
```
```ts
// src/constants/copy.ts (HERO)
    appStoreLabel: "App Store",
    nowLiveIn: "Now live in —",
```

### After
```tsx
// src/components/landing/Header.tsx
// WhatsApp CTA moved out of the Header into the Hero download row — single home.
// (both desktop pill and mobile-drawer button removed; trackEvent/AnalyticsEvents
//  import dropped as it was only used by those buttons)
```
```tsx
// src/components/landing/Hero.tsx (third button, identical to the store buttons)
<motion.a href={whatsappHref()} ... whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
   className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl border border-theme-glass/10 bg-theme-glass/5 backdrop-blur-xl px-6 py-4 ...">
  <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="#25D366">...</svg>
  <div className="flex flex-col leading-tight text-left">
    <span className="text-[10px] ... uppercase tracking-widest">{HERO.whatsappSuperLabel}</span>
    <span className="text-[16px] font-bold text-theme-text mt-0.5">{HERO.whatsappLabel}</span>
  </div>
</motion.a>
```
```ts
// src/constants/copy.ts (HERO)
    appStoreLabel: "App Store",
    whatsappSuperLabel: "Chat with us on",
    whatsappLabel: "WhatsApp",
    nowLiveIn: "Now live in —",
```

### Notes
- Click tracking preserved: the Hero button still fires `AnalyticsEvents.WhatsAppFloatClick` with `location: "hero"`.
- `whatsappHref()` is still imported in Header.tsx — the expert-page "Join Us" CTA uses it.
- Icon kept WhatsApp brand green (`#25D366`) so the channel stays recognizable while the layout matches the store buttons.
- Supersedes #040 (header pill). `tsc --noEmit` passes.

## [2026-05-25] #041 — Update WhatsApp business number to +91 80692 51494
- **Type:** config
- **Scope:** `src/constants/copy.ts`
- **Why:** Business handed over a new dedicated WhatsApp Business line; every header pill + ExpertHero CTA reads from `BUSINESS.whatsappNumber`, so a single edit retargets the whole site.

### Summary
Swapped `BUSINESS.whatsappNumber` to the new line. Because every WhatsApp surface routes through `whatsappHref()` (CHANGELOG #040), the three Header pills and the ExpertHero "Join Us" CTA pick up the change automatically. Also synced the two stale hardcoded `wa.me/918882280156` strings (`FOOTER.whatsappHref`, `EXPERT_HERO.ctaHref`) — they're orphaned constants today, but leaving them pointed at an even older number would mislead the next reader.

### Before
```ts
// src/constants/copy.ts
export const BUSINESS = {
    ...
    whatsappNumber: "9199716 62153  ",
    ...
} as const;
...
export const FOOTER = {
    ...
    whatsappHref: "https://wa.me/918882280156",
};
...
export const EXPERT_HERO = {
    ...
    ctaHref: "https://wa.me/918882280156",
};
```

### After
```ts
// src/constants/copy.ts
export const BUSINESS = {
    ...
    whatsappNumber: "91 80692 51494",
    ...
} as const;
...
export const FOOTER = {
    ...
    whatsappHref: "https://wa.me/918069251494",
};
...
export const EXPERT_HERO = {
    ...
    ctaHref: "https://wa.me/918069251494",
};
```

### Notes
- Verification: open the dev server, click any Header WhatsApp pill (desktop nav, mobile sheet, mobile nav anchor) and the "Join Us" CTA on `/become-a-technician` — each should open `wa.me/918069251494` with the prefilled message.
- `FOOTER.whatsappHref` and `EXPERT_HERO.ctaHref` are still unread by any component (Footer renders bookCTA; ExpertHero's `handleJoinClick` uses `whatsappHref()`). They survived #040 as dead constants — kept in sync here, but a future pass could delete them outright.
- Country code prefix (`91`) is kept inside `whatsappNumber` because the helper drops the string straight into `wa.me/<digits>`, which requires an international form without the `+`.

## [2026-05-14] #040 — Replace floating WhatsApp icon with header pill CTA
- **Type:** refactor
- **Scope:** `src/components/landing/Header.tsx`, `src/constants/copy.ts`, `src/components/expert/ExpertHero.tsx`, `src/app/layout.tsx`, `src/components/landing/WhatsAppFloat.tsx` (deleted)
- **Why:** User feedback on the floating WhatsApp pill from #033, then a follow-up on the colour: *"i didnt what whatsapp icon like that. want similiar button like Book a Service add whatsapp after that"* → *"need the bg n all like book a service"*. Reworked the WhatsApp affordance to a pill button that sits immediately after "Book a Service" in the header (and as a full-width primary action in the mobile menu drawer). Identical visual treatment to the primary "Book a Service" CTA — same `borderRadius: 9999`, same 9×22 padding, same 16 px font, same brand-orange gradient (`linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)`), same shadow. Only differences: the inline WhatsApp glyph and the "WhatsApp" label, which keeps the channel legible without breaking the visual family. Floating component (`WhatsAppFloat.tsx`) and the global mount in `layout.tsx` removed.
- **Related:** Reverses the UX choice in #033 (which is from this same day's audit pass — keeping the analytics event `whatsapp_float_click` rather than renaming it, even though "float" no longer applies, to preserve a continuous GA4 funnel from before the rework). User preference saved to memory: [[feedback-no-floating-buttons]].

### Before
```tsx
// src/components/landing/Header.tsx — desktop CTA region
<Link href="/#download" /* "Book a Service" pill */>
    Book a Service
</Link>
{/* nothing after — WhatsApp lived in the floating widget below */}

// src/app/layout.tsx
<body>
    {children}
    <WhatsAppFloat />   {/* fixed bottom-left, pulse animation */}
</body>

// src/components/landing/WhatsAppFloat.tsx — fixed bottom-5 left-5 round green pill with pulse keyframe
// src/components/expert/ExpertHero.tsx
const url = `${EXPERT_HERO.ctaHref}?text=${encoded}`;   // hardcoded number 918882280156
```

### After
```tsx
// src/constants/copy.ts — central wa.me builder (handles whitespace in BUSINESS.whatsappNumber)
export function whatsappHref(prefilled?: string): string {
    const digits = BUSINESS.whatsappNumber.replace(/\s+/g, "");
    const text = encodeURIComponent(prefilled ?? BUSINESS.whatsappPrefilled);
    return `https://wa.me/${digits}?text=${text}`;
}

// src/components/landing/Header.tsx — new pill right after the primary CTA
<Link href="/#download" /* "Book a Service" pill */>
    Book a Service
</Link>
<a
    href={whatsappHref()}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => trackEvent(AnalyticsEvents.WhatsAppFloatClick, { location: "header_desktop" })}
    aria-label="Chat with Pockit Engineers on WhatsApp"
    className="inline-flex items-center gap-2 text-[16px] font-semibold text-white …"
    style={{
        padding: "9px 22px",
        borderRadius: 9999,
        background: "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-primary-end)) 100%)",
        boxShadow: "0 2px 14px rgb(var(--accent-primary) / 0.40)",
    }}
>
    <svg viewBox="0 0 32 32" /* WhatsApp glyph */ />
    WhatsApp
</a>

// Mobile drawer also gets a full-width WhatsApp pill above the store buttons.

// src/app/layout.tsx — floating mount removed
<body>{children}</body>

// src/components/landing/WhatsAppFloat.tsx → DELETED
// src/components/expert/ExpertHero.tsx
const url = whatsappHref("Hi, I want to connect and know more about Pockit Engineers");   // routes through central builder
```

### Notes
- Verified by `npm run build:static` — every page that mounts the Header (`/`, `/about`, `/become-a-technician`, `/laptop-repair-mumbai`, `/terms`, `/privacy-policy`) now serves the new green pill in the static HTML. `/become-a-technician` carries 2 wa.me occurrences (the existing "Join Us" pill + the new WhatsApp pill) — both pointing at the same number so there's no contact split.
- `BUSINESS.whatsappNumber` switched from `918882280156` to a new contact (`9199716 62153` — the helper strips the embedded space). Every WhatsApp surface now reads through `whatsappHref()`, so swapping numbers in future is a single-line change in `copy.ts`.
- `FOOTER.whatsappHref` constant in `copy.ts` is unused (`grep -r FOOTER.whatsappHref src/` returns no consumers) — left in place for now to avoid touching footer behaviour. Safe to delete in a separate pass.
- GA4 event name kept as `whatsapp_float_click` even though the surface is no longer floating — renaming would split the funnel. New `location` param values: `header_desktop`, `header_mobile` (was `global_floating`).

---

## [2026-05-14] #039 — Defer Chatbot + Firebase chunk past first paint
- **Type:** perf
- **Scope:** `src/components/chatbot/ChatbotMount.tsx` (new), `src/components/landing/AppShell.tsx`
- **Why:** SEO audit (slides 2–3, slide 16) flagged "Reduce JS execution time" and "Reduce unused JS." `Chatbot.tsx` statically imports `ChatApiService`, which pulls `firebase/app` + `firebase/auth` — together a ~125 KB chunk that had nothing to do with first paint or LCP. `AppShell` was already wrapping `Chatbot` in `next/dynamic`, but Next opportunistically prefetches dynamic chunks on idle, so the Firebase chunk still entered the bandwidth budget for bounce visitors who never opened the chat. New `ChatbotMount` wrapper holds the dynamic import behind a state flag that flips on the first sign of engagement (scroll / click / keypress / touchstart) OR after a 5 s idle timer — whichever comes first.
- **Related:** Phase 3 of the May-2026 SEO audit. Slides 2–3 (Mobile 58 / Desktop 59 PSI scores).

### Before
```tsx
// src/components/landing/AppShell.tsx
import Chatbot from "@/components/chatbot/Chatbot";   // ← module pulled into AppShell graph

// …
<Chatbot />   // dynamic-imported elsewhere, but the chunk prefetches on idle
```

Eager Firebase chunk (~142 KB, contained Firebase + ChatApiService + Chatbot UI) was reachable from the initial HTML preload list.

### After
```tsx
// src/components/chatbot/ChatbotMount.tsx (new) — abridged
const Chatbot = dynamic(() => import("./Chatbot"), { ssr: false, loading: () => null });

export default function ChatbotMount() {
    const [shouldMount, setShouldMount] = useState(false);
    useEffect(() => {
        if (shouldMount) return;
        const mount = () => setShouldMount(true);
        const timeoutId = window.setTimeout(mount, 5000);   // floor
        const opts = { once: true, passive: true } as const;
        window.addEventListener("scroll", mount, opts);
        window.addEventListener("click", mount, opts);
        window.addEventListener("keydown", mount, opts);
        window.addEventListener("touchstart", mount, opts);
        const idleId = (window as IdleWindow).requestIdleCallback?.(mount, { timeout: 4000 });
        return () => { window.clearTimeout(timeoutId); /* + remove listeners + cancelIdleCallback */ };
    }, [shouldMount]);
    if (!shouldMount) return null;
    return <Chatbot />;
}

// src/components/landing/AppShell.tsx
import ChatbotMount from "@/components/chatbot/ChatbotMount";   // ← swap

// …
<ChatbotMount />   // chatbot chunk only reaches the network on engagement / 5s idle
```

### Notes
- Verified: `out/index.html` no longer preloads the chatbot chunk (`grep -c 0af54bljmrvqu out/index.html` → 0). Before this change, the chunk hash showed up in the preload `<link>` block.
- Listeners use `{ once: true, passive: true }` so they fire exactly once and don't block scroll. `requestIdleCallback` is undefined on Safari iOS — the timeout + interaction listeners cover that fallback path.
- `groq` and `styled-components` were considered for removal but are transitive deps of `next-sanity` / Sanity Studio internals — keep them.
- Real PSI / Lighthouse delta needs a live deploy. Re-run [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.pockitengineers.com) once #037–#039 are in production and post the score.

---

## [2026-05-14] #038 — Convert public images to WebP
- **Type:** perf
- **Scope:** `scripts/convert-images-to-webp.mjs` (new), `package.json`, `src/components/landing/Hero.tsx`, `src/components/landing/DownloadBand.tsx`, `src/components/landing/ServiceGrid.tsx`, `src/components/expert/ExpertHero.tsx`, `src/constants/copy.ts`, `public/**/*.{png,jpg,jpeg}` (replaced)
- **Why:** SEO audit (slide 16) flagged "Convert all images to the latest WebP format." `public/images/` carried ~6.5 MB of PNG/JPG: `join_us_illustration.png` at 1.3 MB, `hero_phone_v2.png` at 714 KB, nine `service-*.png` at 487–644 KB each. Wrote a one-shot `sharp`-based script (`npm run convert:webp`) that converts a curated allow-list in place: write the `.webp` sibling at `q=82`, then delete the original. Then swapped every reference in the codebase to the new extension. Net saving: 6.5 MB → 1.4 MB across 18 files (~80% reduction).
- **Related:** Phase 3 of the May-2026 SEO audit. Slides 2–3 (PSI 58 / 59).

### Before
```
public/images/join_us_illustration.png        1303 KB
public/images/hero_phone_v2.png                714 KB
public/images/service-laptop.png               644 KB
public/images/service-macbook.png              631 KB
public/images/service-instant.png              553 KB
public/images/service-desktop.png              526 KB
public/images/service-printer.png              494 KB
public/images/service-wfh.png                  515 KB
public/images/service-tv.png                   487 KB
public/images/service-phone.png                501 KB
public/images/service-kids.png                 504 KB
public/qr-linktree.png                          68 KB
+ 6 testimonial JPGs (.jpg / .jpeg)
TOTAL: ~6.5 MB

# References
src/components/landing/Hero.tsx:                 src="/images/hero_phone_v2.png"
src/components/landing/DownloadBand.tsx:         src="/qr-linktree.png"
src/components/landing/ServiceGrid.tsx:          img: "/images/service-laptop.png"   (×9)
src/components/expert/ExpertHero.tsx:            src="/images/join_us_illustration.png"
src/constants/copy.ts:                           avatar: "/images/tanya.jpg"   (×6)
```

### After
```
public/images/join_us_illustration.webp        395 KB   (−70%)
public/images/hero_phone_v2.webp                65 KB   (−91%)
public/images/service-laptop.webp               61 KB   (−91%)
public/images/service-macbook.webp              65 KB   (−90%)
public/images/service-instant.webp              46 KB   (−92%)
public/images/service-desktop.webp              46 KB   (−91%)
public/images/service-printer.webp              33 KB   (−93%)
public/images/service-wfh.webp                  33 KB   (−94%)
public/images/service-tv.webp                   32 KB   (−94%)
public/images/service-phone.webp                35 KB   (−93%)
public/images/service-kids.webp                 36 KB   (−93%)
public/qr-linktree.webp                         37 KB   (−46%)
+ 6 testimonial WebPs
TOTAL: ~1.4 MB   (overall −78%)

# References — every .png / .jpg / .jpeg path swapped to .webp
# package.json — new script
"convert:webp": "node scripts/convert-images-to-webp.mjs"
```

### Notes
- **Intentionally skipped** (documented in `SKIP_NOTES` in the script):
  - `public/logo.png` — favicon + Schema.org `logo` field; broader crawler/browser compatibility wins over the few-KB saving.
  - `public/images/hero_phone.png` — old version, superseded by `hero_phone_v2`. Cruft, can be deleted in a separate pass.
  - `public/images/blue_brand_logo.png`, `public/images/logo-footer.png` — PNG siblings of the actually-rendered SVG. Cruft.
  - `public/images/Kartik.JPG.jpeg` — duplicate of `Kartik.jpg`, never referenced.
- Conversion is repeatable: re-run `npm run convert:webp` if a new PNG/JPG lands. The script no-ops on already-converted paths (`ENOENT` is treated as "skipped").
- Verified by `npm run build:static` — no broken `<Image>` references; static export emits all new `.webp` files into `out/images/`.

---

## [2026-05-14] #037 — Wire Laptop service card → /laptop-repair-mumbai
- **Type:** feature
- **Scope:** `src/components/landing/ServiceGrid.tsx`, `src/constants/copy.ts`, `src/lib/analytics.ts`
- **Why:** Phase 2 of the May-2026 SEO audit. Slide 8 specifically called out "Service Page internal Linking" — the homepage's Laptop card linked to `#download` instead of the dedicated `/laptop-repair-mumbai` landing page (which has existed since #022). That left the page orphaned from the homepage and starved it of internal-link equity. Added an optional `landingHref` field on each service entry: when present, the card navigates to that page instead of the download anchor. Today only `laptop` is wired; future services get the same treatment as their Sanity landing-page docs are authored. Same swap on the footer's "Laptop Repair" link in `FOOTER_LINKS`. Click tracked via new `service_card_click` GA4 event with `service` + `destination` ("landing" | "download") params.
- **Related:** Phase 2 of the May-2026 SEO audit. Slide 8 ("Service Page internal Linking"). Builds on #022 (landing-page system) and #035 (alt-text + per-service fields).

### Before
```tsx
// src/components/landing/ServiceGrid.tsx
const SERVICES = [
    { id: "laptop", title: "Laptop", icon: Laptop, isFast: false, img: "/images/service-laptop.png", imgAlt: "…", desc: "…", features: […] },
    // … no `landingHref`
];

function ServiceCard({ service }: { service: (typeof SERVICES)[0] }) {
    return (
        <a href="#download" rel="noopener noreferrer" className="…">
            {/* … */}
        </a>
    );
}

// src/constants/copy.ts
export const FOOTER_LINKS = [
    {
        title: "Services",
        links: [
            { label: "Laptop Repair", href: "/#download" },
            // …
        ],
    },
];
```

### After
```tsx
// src/components/landing/ServiceGrid.tsx
const SERVICES = [
    {
        id: "laptop",
        title: "Laptop",
        icon: Laptop,
        isFast: false,
        img: "/images/service-laptop.png",
        imgAlt: "…",
        landingHref: "/laptop-repair-mumbai",   // ← new
        desc: "…",
        features: […],
    },
    // … other services keep falling back to #download until their pages land
];

function ServiceCard({ service }: { service: (typeof SERVICES)[0] }) {
    const landingHref = "landingHref" in service ? service.landingHref : undefined;
    const href = landingHref ?? "#download";
    const destination: "landing" | "download" = landingHref ? "landing" : "download";

    return (
        <a
            href={href}
            rel={landingHref ? undefined : "noopener noreferrer"}
            onClick={() => trackEvent(AnalyticsEvents.ServiceCardClick, { service: service.id, destination })}
            className="…"
        >
            {/* … */}
        </a>
    );
}

// src/constants/copy.ts
export const FOOTER_LINKS = [
    {
        title: "Services",
        links: [
            { label: "Laptop Repair", href: "/laptop-repair-mumbai" },   // ← was /#download
            // …
        ],
    },
];

// src/lib/analytics.ts — new event constant
ServiceCardClick: "service_card_click",
```

### Notes
- Verified by `npm run build:static` — `out/index.html` contains two occurrences of `/laptop-repair-mumbai` (Laptop card + footer Services link); was zero before.
- Landing-page schema audit also confirmed rich and complete — `/[slug]/page.static.tsx:186-302` already emits LocalBusiness + Service + OfferCatalog + BreadcrumbList + FAQPage. No schema work needed.
- When the next landing page goes live in Sanity (e.g. `/macbook-repair-mumbai`), set `landingHref: "/macbook-repair-mumbai"` on the corresponding `SERVICES` entry and update the matching `FOOTER_LINKS` href. No other code change required.
- New GA4 event `service_card_click` — register in GA4 admin alongside `whatsapp_float_click` from #033.

---

## [2026-05-14] #036 — Hero description rewrite + central BUSINESS constants
- **Type:** feature
- **Scope:** `src/constants/copy.ts`
- **Why:** SEO audit (May 2026, slide 16) called out "Optimize H1 tag according to the keywords" and "Optimize SEO friendly content using targeted keywords." Visible H1 ("Bharat's Only IT Services App") preserved as the brand line — changing it is a brand decision, raised back to the user. The keyword payload moved to the Hero description right under the H1 so crawlers and SERP snippets see "doorstep IT support in Mumbai", "laptop", "MacBook", "WiFi", "smart-TV", "printer", "CCTV" without us touching the headline. Same edit also introduces a single `BUSINESS` constant block that the new JSON-LD schema (#032) and floating WhatsApp button (#033) read from, so contact info has one source of truth.
- **Related:** Phase 1 of the May-2026 SEO audit. See also #031, #032, #033, #034, #035.

### Before
```ts
// src/constants/copy.ts
export const SITE_META = {
    title: "Pockit Engineers — On-Demand IT Support",
    description:
        "Bharat's only dedicated IT on-demand service app. Background-verified experts at your door in under 60 minutes.",
};

export const HERO = {
    badge: "Instant IT Help in 10 mins",
    headlineLine1: "Bharat's Only",
    headlineLine2: "IT Services App",
    description:
        "Get Trusted, Verified & Certified Technicians at home to fix all your tech troubles.",
    // …
```

### After
```ts
// src/constants/copy.ts
export const SITE_META = {
    title: "Doorstep Laptop Repair & IT Support in Mumbai | Pockit Engineers",
    description:
        "Book verified laptop, MacBook, WiFi, printer, smart TV & CCTV experts at your door in Mumbai in under 60 minutes. Pockit Engineers — Bharat's on-demand IT services app.",
};

export const BUSINESS = {
    legalName: "Pockit Technologies Private Limited",
    brandName: "Pockit Engineers",
    telephone: "+91 88822 80156",
    whatsappNumber: "918882280156",
    whatsappPrefilled: "Hi Pockit Engineers, I need help with",
    email: "support@pockitengineers.com",
    primaryCity: "Mumbai",
    primaryRegion: "Maharashtra",
    primaryCountry: "IN",
    serviceCities: ["Mumbai", "Delhi NCR", "Pune", "Noida"],
    foundingYear: 2024,
} as const;

export const HERO = {
    badge: "Instant IT Help in 10 mins",
    headlineLine1: "Bharat's Only",
    headlineLine2: "IT Services App",
    description:
        "Doorstep IT support in Mumbai — book a verified laptop, MacBook, WiFi, smart-TV, printer or CCTV expert at your home in 10 minutes.",
    // …
```

### Notes
- Visible H1 unchanged on purpose — flag this back to the user if they want the brand line replaced with a fully keyword-loaded headline like "Doorstep IT Support in Mumbai".
- `BUSINESS.email` is a placeholder — swap if support@ isn't the right alias.

---

## [2026-05-14] #035 — Descriptive, keyword-aware alt text on hero + service cards
- **Type:** fix
- **Scope:** `src/components/landing/Hero.tsx`, `src/components/landing/ServiceGrid.tsx`
- **Why:** SEO audit (slide 11 + slide 16) flagged "Image Alt Tags: No (Missing Alt tag)" — the Hero phone alt was a generic "Pockit Engineers App" and every ServiceGrid card alt was the bare service title (one word: "Laptop", "MacBook", "Printer"…). Crawlers and screen-reader users get nothing useful from those. Added a per-service `imgAlt` field (keyword-rich, one-line) and rewired the `<Image>` to fall back to the title only if no override exists. Decorative illustrations (`alt=""` in KPIStats and TestimonialsSection) were left intentionally empty — that's correct semantics.
- **Related:** Phase 1 of the May-2026 SEO audit.

### Before
```tsx
// src/components/landing/Hero.tsx
<Image
    src="/images/hero_phone_v2.png"
    alt="Pockit Engineers App"
    fill priority
    className="object-cover"
    sizes="(max-width: 640px) 80vw, 380px"
/>

// src/components/landing/ServiceGrid.tsx
<Image
    src={service.img}
    alt={service.title}   // ← single word: "Laptop", "MacBook", …
    fill
    className="…"
    sizes="…"
/>
```

### After
```tsx
// src/components/landing/Hero.tsx
<Image
    src="/images/hero_phone_v2.png"
    alt="Pockit Engineers app — book doorstep laptop repair and IT support in Mumbai"
    fill priority
    className="object-cover"
    sizes="(max-width: 640px) 80vw, 380px"
/>

// src/components/landing/ServiceGrid.tsx — per-service `imgAlt` field
const SERVICES = [
    { id: "laptop", title: "Laptop", imgAlt: "Doorstep laptop repair service in Mumbai — virus cleanup, slow laptop fix, hardware upgrade", … },
    { id: "macbook", title: "MacBook", imgAlt: "MacBook repair service in Mumbai — macOS update, storage optimisation, Time Machine backup", … },
    // … one per service
];

<Image
    src={service.img}
    alt={service.imgAlt ?? service.title}
    fill
    className="…"
    sizes="…"
/>
```

### Notes
- Avatar alts in `TestimonialSlider.tsx` / `TestimonialsSection.tsx` (line 29 / 34) use just the reviewer's name — that's correct: an avatar identifies a person and the surrounding markup gives the testimonial context.

---

## [2026-05-14] #034 — Main-site robots.txt for cPanel build
- **Type:** feature
- **Scope:** `src/app/robots.txt/route.static.ts` (new)
- **Why:** SEO audit (slide 5) flagged "Robots.txt missing" on `pockitengineers.com`. Until now the robots route handler at `src/app/robots.txt/route.server.ts` only registered on the Vercel (blog) build because of the `.server.ts` page-extension gate, so the cPanel marketing site shipped with no `/robots.txt` at all and crawlers had no sitemap pointer. The fix is symmetric to the sitemap.xml split (#022): a sibling `route.static.ts` that only registers under `BUILD_TARGET=static`. Same `pageExtensions` gate, opposite target.
- **Related:** #022 (sitemap.xml split that established this pattern). Slide 5 of the May-2026 SEO audit.

### Before
```
src/app/robots.txt/
└── route.server.ts   ← visible only on Vercel (blog subdomain)

# pockitengineers.com/robots.txt → 404
```

### After
```ts
// src/app/robots.txt/route.static.ts (new) — main-site robots
const SITE_URL = "https://www.pockitengineers.com";
export const dynamic = "force-static";
export function GET(): Response {
    const body = [
        "# robots.txt — Pockit Engineers (pockitengineers.com)",
        "User-agent: *",
        "Allow: /",
        "Disallow: /studio",
        "Disallow: /studio/",
        "",
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        "",
    ].join("\n");
    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
    });
}
```

### Notes
- Verified by `npm run build:static` — the route table now lists `/robots.txt` (it was missing before).
- Build emits the body to `out/robots.txt` under `output: "export"`. cPanel deploy ships as-is.

---

## [2026-05-14] #033 — Floating WhatsApp button on every page
- **Type:** feature
- **Scope:** `src/components/landing/WhatsAppFloat.tsx` (new), `src/app/layout.tsx`, `src/lib/analytics.ts`
- **Why:** SEO audit (slide 16) called out "Add the WhatsApp icon on the website." A WhatsApp link already lived in the Header and Footer, but there was no persistent quick-tap button that follows the user as they scroll. Added a fixed-position pill (bottom-LEFT, since the right corner is taken by `StickyBookCTA` and `FloatingDownload`). Mounts via `app/layout.tsx` so every route — main site, blog, landing pages, future pages — gets it without per-route plumbing.
- **Related:** Phase 1 of the May-2026 SEO audit.

### Before
```
(no global WhatsApp affordance — only inline links in Header.tsx and Footer.tsx)
```

### After
```tsx
// src/components/landing/WhatsAppFloat.tsx (new) — abridged
const WA_HREF = `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(BUSINESS.whatsappPrefilled)}`;

export default function WhatsAppFloat() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = window.setTimeout(() => setVisible(true), 600); // defer past LCP
        return () => window.clearTimeout(t);
    }, []);
    // …<motion.a className="fixed bottom-5 left-5 z-[60] …">
    //     <span aria-hidden style={{ animation: "pockit-wa-pulse 2.4s …" }}/>
    //     <svg viewBox="0 0 32 32"> {/* inline WhatsApp glyph */} </svg>
    //   </motion.a>…
}

// src/app/layout.tsx
<body>
  {children}
  <WhatsAppFloat />   {/* mounted globally */}
</body>

// src/lib/analytics.ts — new event constant
WhatsAppFloatClick: "whatsapp_float_click",
```

### Notes
- Mount delayed 600ms after first paint so the button never blocks LCP.
- Z-index `60` sits above chatbot (50) and sticky CTAs but below modals/loaders (100). Revisit if z-stack changes.
- New GA4 event `whatsapp_float_click` with `location: "global_floating"` — register the event in GA4 admin if you want it as a conversion.

---

## [2026-05-14] #032 — Enriched JSON-LD: LocalBusiness, WebSite, FAQPage
- **Type:** feature
- **Scope:** `src/app/layout.tsx`
- **Why:** SEO audit (slide 16) flagged "Add schema on the Website." We were emitting only a bare Organization JSON-LD object — no LocalBusiness (so no Google local pack signal), no FAQPage (so the home FAQ couldn't earn expandable SERP results), no WebSite SearchAction (so no SERP search box). Replaced the single object with a `@graph` carrying four cross-referenced entities: Organization, LocalBusiness (Mumbai HQ + Maharashtra + India + 9-21 hours + aggregate rating), WebSite (with SearchAction pointing at `/blog?q=…`), and FAQPage (auto-generated from the canonical `FAQ_ITEMS` constant so the markup never drifts from the visible UI).
- **Related:** Phase 1 of the May-2026 SEO audit.

### Before
```tsx
// src/app/layout.tsx
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pockit Engineers",
  url: SITE_URL,
  description: "Bharat's only dedicated IT on-demand service app. …",
} as const;

// …<script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
```

### After
```tsx
// src/app/layout.tsx — abridged
import { BUSINESS, FAQ_ITEMS, SITE_META } from "@/constants/copy";

const organizationJsonLd = { "@type": "Organization", "@id": "/#organization", name: BUSINESS.brandName, legalName: BUSINESS.legalName, url: SITE_URL, logo: …, contactPoint: [{ telephone: BUSINESS.telephone, areaServed: "IN", availableLanguage: ["en","hi"] }], sameAs: [Play Store, App Store] };

const localBusinessJsonLd = { "@type": "LocalBusiness", "@id": "/#localbusiness", telephone: BUSINESS.telephone, email: BUSINESS.email, priceRange: "₹₹", address: { addressLocality: "Mumbai", addressRegion: "Maharashtra", addressCountry: "IN" }, areaServed: BUSINESS.serviceCities.map(name => ({ "@type": "City", name })), openingHoursSpecification: [{ dayOfWeek: [Mon..Sun], opens: "09:00", closes: "21:00" }], aggregateRating: { ratingValue: "4.9", reviewCount: "10000" } };

const websiteJsonLd = { "@type": "WebSite", "@id": "/#website", potentialAction: { "@type": "SearchAction", target: { urlTemplate: "/blog?q={search_term_string}" }, "query-input": "required name=search_term_string" } };

const faqPageJsonLd = { "@type": "FAQPage", "@id": "/#faq", mainEntity: FAQ_ITEMS.map(item => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };

const allJsonLd = { "@context": "https://schema.org", "@graph": [organizationJsonLd, localBusinessJsonLd, websiteJsonLd, faqPageJsonLd] };

// …<script type="application/ld+json">{JSON.stringify(allJsonLd)}</script>
```

### Notes
- `BUSINESS.email` and the LocalBusiness `address` use placeholders ("Mumbai, Maharashtra, IN") — when the user wants to claim a Google Business Profile they should hand over a full street address + lat/long and we'll add `streetAddress`, `postalCode`, `geo.{latitude,longitude}` to the LocalBusiness block.
- `aggregateRating` is the public 4.9/10k claim from the testimonials section — keep it consistent with the section copy.
- Validate after deploy via [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema.org Validator](https://validator.schema.org/).

---

## [2026-05-14] #031 — Per-page metadata + JSON-LD: home, /about, /become-a-technician, /expert
- **Type:** refactor
- **Scope:** `src/app/page.tsx`, `src/app/about/page.tsx` (split), `src/components/about/AboutClient.tsx` (new), `src/app/become-a-technician/page.tsx` (split), `src/components/become-a-technician/BecomeTechnicianClient.tsx` (new), `src/app/expert/page.tsx` (split), `src/components/expert/ExpertRedirectClient.tsx` (new)
- **Why:** SEO audit (slide 9, slide 16) flagged "Meta optimization missing." Three of the four primary pages (`/about`, `/become-a-technician`, `/expert`) were `"use client"` and so could not export a `<Metadata>` block — they all inherited the bare layout defaults. Split each route into a server `page.tsx` (owns `<Metadata>` + JSON-LD) plus a sibling client component under `src/components/<route>/<RouteClient>.tsx` (owns the existing UI). The home page also gets a fuller metadata block with canonical, OpenGraph, and Twitter cards.
- **Related:** Phase 1 of the May-2026 SEO audit. Pattern matches the existing blog `page.server.tsx` split (#008).

### Before
```tsx
// src/app/about/page.tsx
"use client";   // ← blocked Next from honoring `export const metadata`
import Header from "@/components/landing/Header";
// …UI inline…

// src/app/become-a-technician/page.tsx
"use client";   // ← same problem
// …UI inline…

// src/app/expert/page.tsx
"use client";
useEffect(() => window.location.replace("/become-a-technician"), []);   // no metadata, no canonical hint
```

### After
```tsx
// src/app/about/page.tsx (server) — emits AboutPage JSON-LD too
import type { Metadata } from "next";
import AboutClient from "@/components/about/AboutClient";

export const metadata: Metadata = {
    title: "About Pockit Engineers — Doorstep IT Support in Mumbai",
    description: "Bharat's only on-demand IT services app — verified laptop, MacBook, WiFi, smart-TV, printer & CCTV experts at your door in Mumbai…",
    alternates: { canonical: "/about" },
    openGraph: { type: "website", url: "/about", title: "…", description: "…", siteName: "Pockit Engineers", locale: "en_IN" },
};

const aboutPageJsonLd = { "@type": "AboutPage", name: "About Pockit Engineers", url: "https://www.pockitengineers.com/about", … };

export default function AboutPage() {
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }} /><AboutClient /></>);
}

// src/app/become-a-technician/page.tsx (server) — emits JobPosting JSON-LD
export const metadata: Metadata = { title: "Become a Pockit Technician — IT & Laptop Repair Jobs in Mumbai", description: "…", alternates: { canonical: "/become-a-technician" }, openGraph: { … } };
const jobPostingJsonLd = { "@type": "JobPosting", title: "On-Demand IT Technician (Laptop / WiFi / Smart-TV / CCTV)", datePosted: "2026-05-14", validThrough: "2026-08-12", hiringOrganization: { name: "Pockit Engineers", … }, jobLocation: [Mumbai, Pune, Delhi], directApply: true };
export default function BecomeTechnicianPage() { return (<><script … /><BecomeTechnicianClient /></>); }

// src/app/expert/page.tsx (server) — adds canonical to /become-a-technician + noindex
export const metadata: Metadata = { title: "Become a Pockit Technician — IT & Laptop Repair Jobs in Mumbai", description: "…", alternates: { canonical: "/become-a-technician" }, robots: { index: false, follow: true } };
export default function ExpertRedirectPage() { return <ExpertRedirectClient />; }

// src/components/about/AboutClient.tsx — UI body, "use client"
// src/components/become-a-technician/BecomeTechnicianClient.tsx — UI body, "use client"
// src/components/expert/ExpertRedirectClient.tsx — useEffect redirect, "use client"
```

### Notes
- Same `export const metadata` pattern was already in use on `/privacy-policy/page.tsx` and `/terms/page.tsx` — those pages already had per-page metadata, no change needed.
- `/about` H1 also rewritten to be keyword-rich: "Doorstep Laptop Repair & On-Demand IT Support in Mumbai & across Bharat."
- `/expert` now sets `robots: { index: false, follow: true }` + canonical to `/become-a-technician` so the legacy URL stops competing for the same intent in the SERP — the Apache 301 in `public/.htaccess` does the heavy lifting; this is the host-agnostic backup.
- JobPosting `validThrough` is +90 days — bump it when the page is materially changed.
- Verified by both `npm run build:static` and `npm run build:server` — both targets emit the routes (`○` static for `/about`, `/become-a-technician`, `/expert`) with no warnings.

---

## [2026-05-13] #030 — Scope landing pages to cPanel + fix cross-origin chip links
- **Type:** fix
- **Scope:** `src/app/[slug]/page.tsx` → `src/app/[slug]/page.static.tsx` (rename), `src/components/landing-pages/LandingPageView.tsx`
- **Why:** Two bugs surfaced together:
  1. `pockitblog.pockitengineers.com/laptop-repair-mumbai` was responding 200 because `page.tsx` matched both build targets, so Vercel was happily serving the landing page on the wrong domain. The page belongs to the marketing site only.
  2. The "Areas served" chips rendered as relative `<Link href="/laptop-repair-andheri">`, so a reader on the blog subdomain clicking a chip stayed on `pockitblog.*` and 404'd. Chips need to route back to the main site on the blog build.
- **Related:** Follow-up to #022 (landing pages). Pattern symmetric to the `.server.tsx` gating used for Studio (#005) and the `.static.ts` sitemap (#022).

### Summary
1. Renamed the route file so it only matches `BUILD_TARGET=static`. Vercel build no longer emits `/[slug]` at all — only cPanel does. Verified by running both targets locally; the server route table shows no `/[slug]` after the rename.
2. Wrapped the chip's `<Link href>` in `resolveNavHref` (already imported for other links in the file). On the Vercel build, the helper prefixes `NEXT_PUBLIC_MAIN_SITE_URL` so chips become absolute URLs to `pockitengineers.com/<slug>`. On the cPanel build the helper passes the path through unchanged.

### Before
```tsx
// src/app/[slug]/page.tsx   ← matched BOTH static + server pageExtensions
// src/components/landing-pages/LandingPageView.tsx
<Link
    key={a.name}
    href={a.href}
    className="..."
>
    <MapPin className="w-3.5 h-3.5" />
    {a.name}
</Link>
```

### After
```tsx
// src/app/[slug]/page.static.tsx  ← matches ONLY BUILD_TARGET=static (cPanel)
// src/components/landing-pages/LandingPageView.tsx
<Link
    key={a.name}
    href={resolveNavHref(a.href, false)}
    className="..."
>
    <MapPin className="w-3.5 h-3.5" />
    {a.name}
</Link>
```

### Notes
- Per-locality landing pages (e.g. `/laptop-repair-andheri`) still 404 because no Sanity doc exists for those slugs yet. That's a separate decision (editor authors per-locality docs vs code-generated templated fallback) deferred until later.
- `resolveNavHref` was already imported in `LandingPageView.tsx` (line 38 in pre-patch source) — no new import needed.

---

## [2026-05-13] #029 — Add push trigger to cPanel deploy workflow
- **Type:** ci
- **Scope:** `.github/workflows/deploy-cpanel.yml`
- **Why:** Until now `deploy-cpanel.yml` only fired on Sanity webhook or manual click. Code pushes to `main` (e.g. component edits, schema changes, htaccess tweaks) required a separate `gh workflow run` to ship — easy to forget. Adding `push: branches: [main]` with a path filter makes the marketing-site build/deploy symmetric with `deploy-vercel.yml`: any code change that affects the static target auto-rebuilds + redeploys cPanel.
- **Related:** Complements #024 (workflow add) and #028 (Vercel symmetric workflow).

### Before
```yaml
on:
  repository_dispatch:
    types: [sanity-publish]
  workflow_dispatch:
```

### After
```yaml
on:
  repository_dispatch:
    types: [sanity-publish]
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "src/**"
      - "public/**"
      - "sanity/schemas/landingPage.ts"
      - "package.json"
      - "package-lock.json"
      - "next.config.mjs"
      - ".github/workflows/deploy-cpanel.yml"
      - "!src/app/blog/**"
      - "!src/app/studio/**"
```

### Notes
- `!src/app/blog/**` and `!src/app/studio/**` exclude blog and Studio paths — those affect only the Vercel server build, not the static cPanel export. Negative globs keep `deploy-vercel.yml` and `deploy-cpanel.yml` from both firing on a blog-only PR.
- Pure docs / CHANGELOG / BLOG_TASKS edits don't match the path filter, so the workflow stays idle on those.

---

## [2026-05-13] #028 — Add Vercel auto-deploy workflow for blog + Studio
- **Type:** ci
- **Scope:** `.github/workflows/deploy-vercel.yml` (new)
- **Why:** The existing Sanity → Vercel Deploy Hook URL stopped working after we disconnected the project from Git (org-private repo + Vercel Hobby blocks git-driven builds). Without git, the Deploy Hook has no source ref to build from. Symmetric to `deploy-cpanel.yml`: GH Action receives a Sanity webhook, builds locally, deploys to Vercel via CLI (`vercel deploy --prebuilt`), bypassing Vercel's broken Git integration entirely.
- **Related:** Complements #024 (cPanel deploy workflow). Editor workflow: Studio publish → Sanity webhook → GitHub dispatch → CLI deploy.

### Summary
New workflow listens for `repository_dispatch: vercel-deploy-blog`, `workflow_dispatch`, and pushes to `main` that touch blog/Studio/schema paths. It runs `vercel pull` + `vercel build --prod` + `vercel deploy --prebuilt --prod` against the production environment. Requires three new repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

### After
```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy blog + Studio to Vercel

on:
  repository_dispatch:
    types: [vercel-deploy-blog]
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "src/app/blog/**"
      - "src/app/studio/**"
      - "sanity.config.ts"
      - "sanity/schemas/**"
      - "src/lib/sanity/**"
      - "package.json"
      - "package-lock.json"
      - "next.config.mjs"
      - ".github/workflows/deploy-vercel.yml"

# ... build-and-deploy job:
#   1. checkout main
#   2. setup Node 24, npm ci
#   3. install vercel CLI
#   4. vercel pull --environment=production
#   5. vercel build --prod
#   6. vercel deploy --prebuilt --prod
```

### Notes
- The path filter on the `push` trigger keeps marketing-site-only commits (e.g. landingPage CHANGELOG edits) from rebuilding Vercel.
- Existing Sanity `vercel-deploy` webhook still points at the dead Vercel hook URL. Follow-up: re-aim it at `https://api.github.com/repos/PockIT-Engineers/POCKIT-Website-Fluxenta/dispatches` with `event_type: vercel-deploy-blog` and filter `_type in ["post", "author", "category", "tag", "siteSettings"]`.
- The first deploy after secret setup verifies the chain. Subsequent edits in Studio → published → ~3 min live on Vercel.

---

## [2026-05-13] #027 — Revert #026 (CDN bypass broke Next 16 static export)
- **Type:** fix
- **Scope:** `src/lib/sanity/queries.ts`
- **Why:** The CDN bypass introduced in #026 caused `next build` (Next 16.2.3, Turbopack) to fail static export with `Error: Page "/[slug]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.` even though `generateStaticParams` is exported. The Sanity API still returned the slug correctly via direct curl, so the regression was inside Next's build-time fetch cache wrapper interacting with the per-call `authenticatedClient()` factory. Reverting restores the green build. The stale-CDN risk #026 was trying to fix is theoretical (10-minute window) and will be solved differently — likely by pinning a `useCdn: false` client at module scope, or by gating the deploy workflow on a `sleep 60` after a Sanity edit. Tracked as a follow-up.
- **Related:** Reverts #026. Verified `npm run build:static` emits `out/laptop-repair-mumbai.html`.

### Summary
Restore the original `client`-backed (CDN) fetchers for `getAllLandingPageSlugs` and `getAllLandingPagesForSitemap`. Drop the `authenticatedClient` import.

### Before
```ts
// src/lib/sanity/queries.ts
import { authenticatedClient, client } from "./client";

export async function getAllLandingPageSlugs(): Promise<Slug[]> {
    return authenticatedClient().fetch<Slug[]>(...);
}

export async function getAllLandingPagesForSitemap(): Promise<LandingPageSitemapRow[]> {
    return authenticatedClient().fetch<LandingPageSitemapRow[]>(...);
}
```

### After
```ts
// src/lib/sanity/queries.ts
import { client } from "./client";

export async function getAllLandingPageSlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(...);
}

export async function getAllLandingPagesForSitemap(): Promise<LandingPageSitemapRow[]> {
    return client.fetch<LandingPageSitemapRow[]>(...);
}
```

### Notes
- Follow-up to investigate why `authenticatedClient()` invoked inside `generateStaticParams` returns empty during Next 16 build but works in a Node REPL. Suspect: next-sanity's Next-fetch wrapper caches per-client-instance, and a new client per call defeats the cache without populating results.

---

## [2026-05-13] #026 — Bypass Sanity CDN for landing-page slug enumeration
- **Type:** fix
- **Scope:** `src/lib/sanity/queries.ts`
- **Why:** Static-export builds were enumerating landing-page slugs through the CDN-backed `client`. The Sanity CDN holds responses for ~10 minutes, so a Sanity edit followed by an immediate rebuild (manual or webhook-driven via `.github/workflows/deploy-cpanel.yml`) could see a stale slug list: a slug deleted in Studio could come back as an orphan `<slug>.html` on cPanel, and a freshly added slug could be missing from the next deploy. Switching the two enumeration fetchers to `authenticatedClient()` forces a no-CDN read at build time so the rebuild always reflects the latest published state.
- **Related:** Follow-up to #022 (landing pages programme) and #024 (cPanel deploy workflow).

### Summary
`getAllLandingPageSlugs` and `getAllLandingPagesForSitemap` now use `authenticatedClient()` (`useCdn: false`) instead of the shared CDN `client`. Detail fetches (`getLandingPageBySlug`) keep the CDN — runtime reads on the Vercel target benefit from edge caching, and the per-slug cache tag handles invalidation when individual pages change.

### Before
```ts
// src/lib/sanity/queries.ts
import { client } from "./client";

export async function getAllLandingPageSlugs(): Promise<Slug[]> {
    return client.fetch<Slug[]>(
        allLandingPageSlugsQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}

export async function getAllLandingPagesForSitemap(): Promise<
    LandingPageSitemapRow[]
> {
    return client.fetch<LandingPageSitemapRow[]>(
        allLandingPagesForSitemapQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}
```

### After
```ts
// src/lib/sanity/queries.ts
import { authenticatedClient, client } from "./client";

// Slug enumeration runs at static-export build time. The CDN-backed `client`
// has a ~10-minute cache window; if an editor deletes a slug in Studio and
// the deploy workflow rebuilds within that window, the build sees the stale
// slug and re-emits the orphan HTML. We bypass the CDN here so the build
// always reads the live published-perspective snapshot. Detail fetches
// (`getLandingPageBySlug`) keep the CDN — runtime reads benefit from edge
// caching and the per-slug cache tag handles invalidation.
export async function getAllLandingPageSlugs(): Promise<Slug[]> {
    return authenticatedClient().fetch<Slug[]>(
        allLandingPageSlugsQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}

export async function getAllLandingPagesForSitemap(): Promise<
    LandingPageSitemapRow[]
> {
    return authenticatedClient().fetch<LandingPageSitemapRow[]>(
        allLandingPagesForSitemapQuery,
        {},
        { next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["landing:index"] } },
    );
}
```

### Notes
- `authenticatedClient()` falls back to unauthenticated reads if `SANITY_API_READ_TOKEN` is missing, so local dev without a token still works.
- Build performance impact is ~200ms per query (two queries per build). Negligible.
- The runtime detail path (`getLandingPageBySlug`) remains CDN-backed — orphan-slug fix targets the enumeration step that drives `generateStaticParams`, not per-page reads.

---

## [2026-05-13] #025 — Switch Sanity MCP from deprecated stdio package to remote HTTP server
- **Type:** config
- **Scope:** `.mcp.json`
- **Why:** `@sanity/mcp-server` npm package was deprecated upstream — npx invocation failed with "could not determine executable to run", so the local Sanity MCP never connected. Sanity now ships a hosted MCP at `https://mcp.sanity.io/mcp` (streamable-HTTP transport, OAuth-based auth) that supersedes the stdio package.
- **Related:** Closes the "rotate Sanity API token" reminder in `CLAUDE.md` — OAuth replaces the long-lived bearer token.

### Summary
Replaced the dead stdio-based Sanity MCP server (npx + bearer token in env) with a direct HTTP transport pointing at Sanity's hosted MCP endpoint. First tool call will trigger an OAuth handshake; the previous `SANITY_API_TOKEN` value is no longer needed and was dropped from the config.

### Before
```json
// .mcp.json
{
  "mcpServers": {
    "sanity": {
      "command": "npx",
      "args": ["-y", "@sanity/mcp-server@latest"],
      "env": {
        "SANITY_PROJECT_ID": "pg938kpo",
        "SANITY_DATASET": "production",
        "SANITY_API_TOKEN": "sk...",
        "MCP_USER_ROLE": "developer"
      }
    }
  }
}
```

### After
```json
// .mcp.json
{
  "mcpServers": {
    "sanity": {
      "type": "http",
      "url": "https://mcp.sanity.io/mcp"
    }
  }
}
```

### Notes
- `.mcp.json` is gitignored (`.gitignore:44`), so the previous bearer token was never pushed to GitHub — exposure was local only. Still recommend revoking the token in the Sanity dashboard for hygiene.
- Restart Claude Code session to re-read `.mcp.json` and trigger the OAuth flow for `mcp.sanity.io`.
- The `NEXT_PUBLIC_SANITY_*` env vars in `.env.local` and the build-time `@sanity/client` config are unchanged — those are separate from the MCP integration.

## [2026-05-12] #024 — Auto-deploy to cPanel on Sanity publish (GitHub Actions + FTP)
- **Type:** feature
- **Scope:** `.github/workflows/deploy-cpanel.yml` (new), `.env.local` (FTP creds added locally; mirrored as repo Secrets)
- **Why:** Static cPanel export is frozen at build time, so Sanity edits never reach live until a manual rebuild + zip upload. This wires Sanity → GitHub Actions → FTPS to GoDaddy cPanel so a publish in Studio triggers an automatic rebuild and deploy of `out/` to `public_html/`.
- **Related:** Follows on from CHANGELOG #022 (Sanity-driven landing pages) which made the staleness problem visible.

### Summary
Adds a single workflow that runs `npm run build:static` on Node 24, then syncs the `out/` directory to GoDaddy cPanel over FTPS via `SamKirkland/FTP-Deploy-Action`. Triggers on `repository_dispatch` (event_type `sanity-publish`, fired by a Sanity webhook) and on manual `workflow_dispatch` for forced rebuilds. Concurrency group cancels in-flight runs so a burst of edits doesn't pile up. Sync state lives on the cPanel server, so first run uploads everything and subsequent runs only push diffs. Required Secrets: `CPANEL_FTP_HOST`, `CPANEL_FTP_PORT`, `CPANEL_FTP_USER`, `CPANEL_FTP_PASS`, `CPANEL_FTP_PATH`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_BLOG_URL`.

### Before
```
(no workflow file existed; deploys were manual: `npm run zip:cpanel` → upload `public/pockit-cpanel-site.zip` to cPanel File Manager → extract)
```

### After
```yaml
# .github/workflows/deploy-cpanel.yml
name: Deploy main site to cPanel
on:
  repository_dispatch:
    types: [sanity-publish]
  workflow_dispatch:
concurrency:
  group: deploy-cpanel
  cancel-in-progress: true
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: main }
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: 'npm' }
      - run: npm ci
      - run: npm run build:static
        env:
          SANITY_API_READ_TOKEN: ${{ secrets.SANITY_API_READ_TOKEN }}
          NEXT_PUBLIC_SANITY_PROJECT_ID: pg938kpo
          NEXT_PUBLIC_SANITY_DATASET: production
          NEXT_PUBLIC_BLOG_URL: ${{ secrets.NEXT_PUBLIC_BLOG_URL }}
          NEXT_PUBLIC_GA_MEASUREMENT_ID: G-4MLTMPX7YX
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.CPANEL_FTP_HOST }}
          port: ${{ secrets.CPANEL_FTP_PORT }}
          username: ${{ secrets.CPANEL_FTP_USER }}
          password: ${{ secrets.CPANEL_FTP_PASS }}
          server-dir: ${{ secrets.CPANEL_FTP_PATH }}
          local-dir: ./out/
          protocol: ftps
          security: loose
```

### Notes
- Protocol forced to plain `ftp` (port 21) because the GoDaddy cPanel server on this account does not advertise FTPS (FileZilla reports "Insecure server, it does not support FTP over TLS"). Credentials and file contents travel cleartext between the GitHub Actions runner and the cPanel host. Mitigation: rotate `CPANEL_FTP_PASS` every ~90 days; if hosting plan ever gains SSH, switch to `protocol: sftp` + port `22`.
- First run will upload the full `out/` tree (~hundreds of files). The action stores `.ftp-deploy-sync-state.json` on the server to enable diff uploads on subsequent runs — do **not** delete that file via cPanel File Manager.
- Sanity webhook (configured in manage.sanity.io, project `pg938kpo`) POSTs to `https://api.github.com/repos/PockIT-Engineers/POCKIT-Website-Fluxenta/dispatches` with body `{"event_type":"sanity-publish"}`. Auth header uses a fine-grained PAT scoped to this repo with `Actions: read+write` permission.
- Build pulls fresh Sanity content via `SANITY_API_READ_TOKEN` so any newly-published `landingPage` doc shows up immediately on next deploy.
- Verification path: (1) Push this commit to `main`. (2) GitHub → Actions → "Deploy main site to cPanel" → "Run workflow" → confirm green. (3) Add Sanity webhook + send test → confirm Action fires. (4) Edit a `landingPage` in Studio, publish, wait ~3 min, refresh `pockitengineers.com/laptop-repair-mumbai`.

## [2026-05-06] #023 — Switch to named export of `createImageUrlBuilder`

- **Type:** chore
- **Scope:** `src/lib/sanity/image.ts`
- **Why:** Silence the runtime deprecation warning emitted on every Studio/landing-page render — `@sanity/image-url@2.1.1` deprecated the default export in favor of a named one.
- **Related:** Console warning observed on `/studio/...` and `/laptop-repair-mumbai` GETs.

### Summary
`@sanity/image-url` v2.1 keeps the default export only as a deprecated alias of the new named export `createImageUrlBuilder`. The runtime now logs `The default export of @sanity/image-url has been deprecated. Use the named export 'createImageUrlBuilder' instead.` on every page that imports `urlFor`. Swapping to the named import clears the warning with no behavior change — the factory signature and the returned builder are identical.

### Before
```ts
// src/lib/sanity/image.ts
import createImageUrlBuilder from "@sanity/image-url";
```

### After
```ts
// src/lib/sanity/image.ts
import { createImageUrlBuilder } from "@sanity/image-url";
```

### Notes
- Verified via `node_modules/@sanity/image-url/lib/index.d.ts`: the named export is the canonical one; the default is annotated `@deprecated`.
- Test by reloading any page that renders a Sanity image (e.g. `/studio/structure/landingPage;landingPage.laptop-repair-mumbai` or any blog post) and confirm the deprecation line no longer appears in the dev-server log.

## [2026-05-06] #022 — Sanity-driven SEO landing pages (Mumbai programme)

- **Type:** feature
- **Scope:**
  - `sanity/schemas/landingPage.ts` (new)
  - `sanity/schemas/index.ts`
  - `src/lib/sanity/types.ts`
  - `src/lib/sanity/queries.ts`
  - `src/app/[slug]/page.tsx` (new)
  - `src/components/landing-pages/LandingPageView.tsx` (new)
  - `next.config.mjs` (new `.static.ts` / `.static.tsx` page extensions for the static build)
  - `src/app/sitemap.xml/route.static.ts` (new — coexists with the blog `route.server.ts`)
  - `src/lib/analytics.ts`
  - `scripts/seed-landing-pages.ts` (new)
  - `package.json` (new `seed:landing` script + `tsx` devDep)
  - `docs/LANDING_PAGES.md` (new)
  - `README.md`, `CLAUDE.md`
- **Why:** Kick off the Mumbai SEO programme. First page is `/laptop-repair-mumbai`; the system is built so the next ~27 (`/macbook-repair-mumbai`, `/laptop-repair-andheri`, `/laptop-not-turning-on-mumbai`, …) can be authored in Sanity Studio without touching code or shipping a new deploy of TSX. Pages are statically exported from the cPanel build via `generateStaticParams`, so SEO crawlers see plain HTML.

### Summary

A new Sanity document type `landingPage` (city / locality / problem-fix variants) drives a single root catch-all route at `src/app/[slug]/page.tsx`. Specific routes (`/about`, `/blog`, `/studio`, `/terms`, …) win over the catch-all by Next.js precedence, and a reserved-slug guard inside both the Sanity schema and the route protects against accidental shadowing. Each page emits `<title>` / canonical / OpenGraph / Twitter metadata plus a `@graph` of `LocalBusiness` + `Service` + `BreadcrumbList` + `FAQPage` JSON-LD. The static cPanel build now also emits a `sitemap.xml` listing every main-site route plus every published landing page; the existing blog sitemap (`route.server.ts`) keeps emitting separately on the Vercel build because `.server.ts` outranks `.ts` in `pageExtensions`. A one-shot seed script (`npm run seed:landing`) pushes the first `laptop-repair-mumbai` document into Sanity so the editor team can iterate on real content immediately.

### Before

```ts
// sanity/schemas/index.ts
export const schemaTypes = [post, author, category, tag, siteSettings];
```

### After

```ts
// sanity/schemas/index.ts
export const schemaTypes = [
    post, author, category, tag, siteSettings,
    landingPage,
];
```

### Before

```ts
// src/app/[slug]/page.tsx
// (file did not exist)
```

### After

```ts
// src/app/[slug]/page.tsx — root catch-all for Sanity landingPage docs.
export async function generateStaticParams() {
    const slugs = await getAllLandingPageSlugs();
    return slugs.map((s) => s.current).filter((s) => !RESERVED_SLUGS.has(s)).map((slug) => ({ slug }));
}
export const dynamicParams = false;
export async function generateMetadata({ params }) { /* full SEO meta */ }
export default async function LandingPageRoute({ params }) {
    const page = await getLandingPageBySlug(slug);
    if (!page) notFound();
    return (<><script type="application/ld+json" .../><LandingPageView page={page} /></>);
}
```

### Before

```js
// next.config.mjs
pageExtensions: isStatic
    ? ["tsx", "ts", "jsx", "js"]
    : ["server.tsx", "server.ts", "tsx", "ts", "jsx", "js"],
```

### After

```js
// next.config.mjs — symmetric .static.ts suffix added so static-only files
// can coexist with .server.ts files at the same URL without Next throwing
// "Duplicate page detected" on the server build.
pageExtensions: isStatic
    ? ["static.tsx", "static.ts", "tsx", "ts", "jsx", "js"]
    : ["server.tsx", "server.ts", "tsx", "ts", "jsx", "js"],
```

### Before

```ts
// src/app/sitemap.xml/route.server.ts (only file at this path — invisible to static build)
// Static cPanel build shipped without any sitemap.xml.
```

### After

```ts
// src/app/sitemap.xml/route.static.ts — visible only on the static (cPanel)
// build. Server (Vercel) build keeps using route.server.ts unchanged.
// Initial attempt used route.ts, but Next errors on duplicate URL routes
// regardless of pageExtensions order — hence the symmetric .static.ts
// suffix added to next.config.mjs in this same change.
export const dynamic = "force-static";
export async function GET() {
    const landingRows = await getAllLandingPagesForSitemap();
    /* emit static main-site routes + every landing page */
}
```

### Before

```ts
// src/lib/analytics.ts
export const AnalyticsEvents = {
    /* …blog + chatbot events… */
    BlogCtaClick: "cta_click",
} as const;
```

### After

```ts
// src/lib/analytics.ts
export const AnalyticsEvents = {
    /* …blog + chatbot events… */
    BlogCtaClick: "cta_click",
    LandingPageView: "landing_view",
    LandingCtaClick: "landing_cta_click",
    LandingFaqExpanded: "landing_faq_expanded",
} as const;
```

### Notes

- **Verification on the user's side:** start `npm run dev`, visit `http://localhost:3001/laptop-repair-mumbai` once `npm run seed:landing` has been run (or after the editor authors the doc in Studio at `/studio`). Click the hero "Book a Service" CTA, expand a couple of FAQ items, scroll the related-pages module, and view-source to confirm the JSON-LD `@graph` is present.
- **Editor workflow:** the seed script is one-shot. After the initial seed, content edits happen in Studio. Re-running the seed will OVERWRITE editor changes for that specific slug — don't run it twice.
- **Token requirement:** seeding needs `SANITY_API_WRITE_TOKEN` (Editor role at sanity.io/manage → API → Tokens). The current `SANITY_API_READ_TOKEN` is a viewer and won't have write permission.
- **Custom GA4 dimensions:** `landing_view` carries `page_slug`, `page_type`, `location`, `service`. Register these in GA4 Admin → Custom Definitions (same flow used for the blog dimensions in #012).
- **`public/sitemap.xml`** does not exist; the new route handler produces `out/sitemap.xml` at build time. Submit `https://www.pockitengineers.com/sitemap.xml` to Google Search Console after the next cPanel deploy.
- **Adding the next page** — open Studio → "Landing page (SEO)" → "Create new", pick a `pageType`, fill the fields, hit Publish. Next deploy of `npm run build:static` includes it. See `docs/LANDING_PAGES.md` for the full author flow.
- **Build-target invariant preserved:** `BUILD_TARGET=static` does NOT include `/blog` or `/studio`. The new `[slug]` route is regular `.tsx` (not `.server.tsx`) so it ships on cPanel.

## [2026-04-17] #021 — Fix Blog link landing on subdomain root instead of /blog

- **Type:** fix
- **Scope:** `src/lib/siteUrls.ts`
- **Why:** `resolveNavHref("/blog")` returned `BLOG_URL` (`https://pockitblog.pockitengineers.com`) without the `/blog` path, so clicking Blog in the nav landed on the subdomain homepage instead of the blog index. Users had to click twice — first to reach the subdomain, then again to reach `/blog`.

### Before

```ts
// src/lib/siteUrls.ts
if (href === "/blog") return BLOG_URL;
// getBlogIndexUrl
return BLOG_URL || "/blog";
```

### After

```ts
// src/lib/siteUrls.ts
if (href === "/blog") return `${BLOG_URL}/blog`;
// getBlogIndexUrl
return BLOG_URL ? `${BLOG_URL}/blog` : "/blog";
```

### Notes

- Requires cPanel rebuild + re-upload and a Vercel redeploy (push to GitHub).

## [2026-04-17] #020 — Fix Blog nav link requiring double-click

- **Type:** fix
- **Scope:** `src/components/landing/Header.tsx`
- **Why:** On the cPanel static build, the Blog link resolves to an external URL (`https://pockitblog.pockitengineers.com`). Next.js `<Link>` intercepts the first click for client-side routing, fails to match the external URL, and only navigates on the second click. Switching to a plain `<a>` tag for external hrefs lets the browser handle the navigation immediately.

### Summary

Added an `isExternal` check in both the desktop and mobile nav link loops. When `resolveNavHref` returns an absolute URL (`http…`), the component renders a plain `<a>` tag instead of Next.js `<Link>`. Internal links continue to use `<Link>` for client-side transitions. The Footer already had this pattern; now the Header matches.

### Before

```tsx
// src/components/landing/Header.tsx — desktop nav loop
<Link
    key={link.label}
    href={resolveNavHref(link.href, isHome)}
    onClick={(e) => handleNavLinkClick(link.href, e)}
    ...
>
    {link.label}
</Link>
```

### After

```tsx
// src/components/landing/Header.tsx — desktop nav loop
const resolved = resolveNavHref(link.href, isHome);
const isExternal = /^https?:\/\//i.test(resolved);
return isExternal ? (
    <a key={link.label} href={resolved} ...>{link.label}</a>
) : (
    <Link key={link.label} href={resolved} onClick={(e) => handleNavLinkClick(link.href, e)} ...>{link.label}</Link>
);
```

### Notes

- Same pattern applied to the mobile nav loop.
- The Footer (`Footer.tsx`) already used this `isExternal ? <a> : <Link>` pattern — no change needed there.
- Requires a cPanel rebuild (`build:static`) and re-upload for the fix to reach the marketing site.

## [2026-04-17] #019 — Rename blog subdomain to `pockitblog.pockitengineers.com`

- **Type:** config
- **Scope:** 8 source files, 5 doc/meta files (`CLAUDE.md`, `BLOG_TASKS.md`, `README.md`, `docs/BLOG_DEPLOY.md`, `docs/BLOG_EDITORS.md`)
- **Why:** User chose the subdomain `pockitblog` instead of `blog` during Vercel custom-domain setup. All hardcoded `blog.pockitengineers.com` references needed to match the live DNS.

### Summary

Global find-and-replace of `blog.pockitengineers.com` → `pockitblog.pockitengineers.com` across every file in the repo. Source files updated: `siteUrls.ts`, `sitemap.xml/route.server.ts`, `robots.txt/route.server.ts`, `rss.xml/route.server.ts`, `blog/page.server.tsx`, `blog/[slug]/page.server.tsx`, `blog/category/[slug]/page.server.tsx`, `blog/author/[slug]/page.server.tsx`. Doc files updated: `CLAUDE.md`, `BLOG_TASKS.md`, `README.md`, `docs/BLOG_DEPLOY.md`, `docs/BLOG_EDITORS.md`. The GoDaddy CNAME record name reference in `BLOG_DEPLOY.md` was also changed from `blog` to `pockitblog`.

### Before

```ts
// (all 8 source files)
const BLOG_BASE_URL = "https://blog.pockitengineers.com";
```

### After

```ts
// (all 8 source files)
const BLOG_BASE_URL = "https://pockitblog.pockitengineers.com";
```

### Notes

- CHANGELOG.md itself is **not** bulk-replaced — historical entries retain the old URL as a faithful record of what was true at the time.
- After pushing, Vercel auto-redeploys with the new URLs. The cPanel main-site build also needs a rebuild with `NEXT_PUBLIC_BLOG_URL=https://pockitblog.pockitengineers.com`.
- Sanity CORS origins should include `https://pockitblog.pockitengineers.com` (replace any `https://blog.pockitengineers.com` entry).

## [2026-04-17] #018.1 — Feature: visible FAQ accordion rendered from SEO field

- **Type:** feature
- **Scope:** `src/components/blog/PostFaq.tsx` (new), `src/app/blog/[slug]/page.server.tsx`
- **Why:** FAQ items entered in the SEO tab were only outputting invisible JSON-LD. Authors expect visible FAQ content on the page without entering it twice.

### Summary

Created a `PostFaq` accordion component that reads the same `seo.faq` array used for JSON-LD and renders it as an interactive accordion section between the post body and the author block. Each question expands/collapses with Framer Motion animation. Authors enter FAQ items once in Studio's SEO tab and get both the visible section and the structured data automatically.

### Before

```tsx
// src/app/blog/[slug]/page.server.tsx — FAQ only existed as invisible JSON-LD
<PostBody blocks={post.body} />
<AuthorBlock author={post.author} />
```

### After

```tsx
// src/app/blog/[slug]/page.server.tsx
<PostBody blocks={post.body} />
{faqItems && faqItems.length > 0 ? <PostFaq items={faqItems} /> : null}
<AuthorBlock author={post.author} />
```

### Notes

- New file: `src/components/blog/PostFaq.tsx` — client component with Framer Motion accordion.
- Renders nothing if the post has no FAQ items.
- Styled to match the blog's theme tokens (card bg, border, accent).

---

## [2026-04-16] #018 — Feature: FAQ structured data (FAQPage JSON-LD) from Sanity

- **Type:** feature
- **Scope:** `sanity/schemas/post.ts`, `src/lib/sanity/types.ts`, `src/app/blog/[slug]/page.server.tsx`
- **Why:** Enable Google AI Overviews and rich results by adding FAQPage JSON-LD schema to blog posts, driven from a reusable FAQ field in Sanity Studio.

### Summary

Added an optional FAQ array field inside the post schema's SEO group. Each item has a question (string) and answer (text). When a post has FAQ items, the blog post page renders a `<script type="application/ld+json">` tag with the FAQPage schema. The GROQ query already fetches `seo` as a whole object, so no query changes were needed — just the Sanity schema, TypeScript types, and page rendering.

### Before

```ts
// sanity/schemas/post.ts — SEO fields ended at noIndex
{ name: "noIndex", title: "Hide from search engines", type: "boolean", initialValue: false },

// src/lib/sanity/types.ts
export interface PostSeo {
    readonly metaTitle?: string;
    readonly metaDescription?: string;
    readonly ogImage?: BlogImage;
    readonly noIndex?: boolean;
}
```

### After

```ts
// sanity/schemas/post.ts — new FAQ array field after noIndex
{ name: "faq", title: "FAQ (structured data)", type: "array",
  of: [{ type: "object", name: "faqItem", fields: [
    { name: "question", type: "string" },
    { name: "answer", type: "text", rows: 3 }
  ]}]
}

// src/lib/sanity/types.ts
export interface FaqItem {
    readonly question: string;
    readonly answer: string;
}
export interface PostSeo {
    readonly metaTitle?: string;
    readonly metaDescription?: string;
    readonly ogImage?: BlogImage;
    readonly noIndex?: boolean;
    readonly faq?: readonly FaqItem[];
}

// src/app/blog/[slug]/page.server.tsx — renders JSON-LD when FAQ items exist
{faqJsonLd ? (
    <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
) : null}
```

### Notes

- No GROQ query changes needed — `seo` is projected as-is, so new sub-fields flow through automatically.
- The FAQ field appears in Studio under the SEO tab on any post.
- JSON-LD is only rendered when the post actually has FAQ items populated.

---

## [2026-04-16] #017 — FeaturedPost card layout refinements

- **Type:** fix
- **Scope:** `src/components/blog/FeaturedPost.tsx`
- **Why:** The FeaturedPost hero card's desktop layout severely cropped the cover image and felt visually unbalanced. Multiple tweaks to card width, grid proportions, and min-height.

### Summary

Iterated on the FeaturedPost card layout until the proportions felt right. Widened the card container from `max-w-6xl` / `w-[92%]` to `max-w-[1400px]` / `w-[98%]`; adjusted image-to-text grid ratio from `1.1fr:1fr` to `1.15fr:1fr`; added `lg:min-h-[460px]` so the card is tall enough for the cover image to display fully; kept `lg:aspect-auto lg:h-full` on the image container so it fills the grid cell height on desktop.

### Before

```tsx
// src/components/blog/FeaturedPost.tsx
className="mx-auto w-[92%] max-w-6xl"
// ...
className="group relative grid ... lg:grid-cols-[1.1fr_1fr]"
// ...
<div className="relative aspect-[16/9] w-full overflow-hidden bg-theme-bg2 lg:aspect-auto lg:h-full">
```

### After

```tsx
// src/components/blog/FeaturedPost.tsx
className="mx-auto w-[98%] max-w-[1400px]"
// ...
className="group relative grid ... lg:min-h-[460px] lg:grid-cols-[1.15fr_1fr]"
// ...
<div className="relative aspect-[16/9] w-full overflow-hidden bg-theme-bg2 lg:aspect-auto lg:h-full">
```

### Notes

- `lg:min-h-[460px]` ensures the card is tall enough for cover image branding to be fully visible.
- Image column ratio `1.15fr` balances well with the text column.

---

## [2026-04-16] #016.3 — Fix: cover images render at natural aspect ratio (no crop)

- **Type:** fix
- **Scope:** `src/app/blog/[slug]/page.server.tsx`, `src/components/blog/FeaturedPost.tsx`, `src/components/blog/PostCard.tsx`
- **Why:** Square (1:1) cover images were heavily cropped by the hardcoded 16:9 / 16:10 / 7:4 aspect ratio containers. Images now display at their natural ratio so nothing is cut off.

### Summary

All three image locations (post page cover, featured card, post grid card) previously forced a fixed landscape aspect ratio using `fill` + `object-cover`, which crops any image that isn't the exact target ratio. Replaced with `width`/`height` + `h-auto w-full` so images render at their natural dimensions. The FeaturedPost desktop layout still uses `object-cover` in the side-by-side grid cell (it needs to fill a variable-height column), but the mobile view now shows the full uncropped image. The empty-state gradient placeholders (no cover image) keep their original aspect ratios since they have no content to preserve.

### Notes

- `width`/`height` on `next/image` are layout hints for the placeholder, not pixel constraints. The actual rendered size is controlled by CSS (`w-full h-auto`). The image's intrinsic ratio is preserved.
- Posts with landscape images will still look great. Posts with square or portrait images will no longer be cropped.
- The FeaturedPost component now renders two `<Image>` tags (one for mobile, one for desktop) hidden via Tailwind responsive classes. Only one is visible at a time; both share the same `src` so no extra network request.

---

## [2026-04-16] #016.2 — Chore: update blog hero fallback text

- **Type:** chore
- **Scope:** `src/app/blog/page.server.tsx`
- **Why:** User requested the hero text change from "Insight and updates from the PockIT team" to "Blogs, Tech Hacks & More". Updated the hardcoded fallbacks so the change applies immediately without requiring a Site Settings document in Sanity.

### Before

```tsx
// src/app/blog/page.server.tsx
const DEFAULT_EYEBROW = "Insights";
const DEFAULT_TITLE = "Insight and updates from the PockIT team";
const DEFAULT_SUBTITLE =
    "Service-delivery lessons, field notes from our technician network, and how we think about on-demand IT for Indian households.";
```

### After

```tsx
// src/app/blog/page.server.tsx
const DEFAULT_EYEBROW = "Blog";
const DEFAULT_TITLE = "Blogs, Tech Hacks & More";
const DEFAULT_SUBTITLE =
    "Tips, tricks, and expert advice to keep your tech running smoothly.";
```

### Notes

- These are fallbacks — if a Site Settings document is created in Sanity with a `blogHeroTitle`, that value takes precedence. Until then, these defaults drive the hero.

---

## [2026-04-16] #016.1 — Fix: scroll listeners + TOC hash links + nav reorder

- **Type:** fix
- **Scope:** `src/components/blog/TableOfContents.tsx`, `src/components/blog/ReadingProgress.tsx`, `src/services/blogAnalytics.ts`, `src/constants/copy.ts`
- **Why:** Three cascading side-effects of #016's `h-screen` scroll-container change (IntersectionObserver, scroll event listeners, and hash-link clicks all assumed the window was the scroll container), plus a nav order change requested by user.
- **Related:** CHANGELOG #016.

### Summary

The #016 fix moved the scroll container from the window to `<main>`. This broke three JavaScript behaviors that listened to `window` scroll: the TOC's IntersectionObserver for scroll-spy highlighting, the ReadingProgress bar's scroll listener, and the scroll-depth analytics tracker. All three now query for `<main>` and attach their observer/listener to it instead.

Additionally, clicking a TOC heading link used the browser's default fragment navigation, which scrolls the *document*. Since the document no longer scrolls, clicks appeared to do nothing. TOC links now intercept the click, call `element.scrollIntoView()` (which scrolls the nearest scrollable ancestor — `<main>`), and update the URL hash via `history.pushState`.

Separately, the user requested the "Blog" nav tab be moved from position 2 (after Services) to position 5 (after Testimonials, before FAQ).

### Before

```tsx
// src/components/blog/TableOfContents.tsx — IntersectionObserver
const observer = new IntersectionObserver(
    (records) => { /* ... */ },
    {
        rootMargin: "-96px 0px -70% 0px",
        threshold: 0,
    },
);
// ... and <a href={`#${e.id}`}> with no onClick handler
```

### After

```tsx
// src/components/blog/TableOfContents.tsx — IntersectionObserver
const scrollContainer =
    document.querySelector<HTMLElement>("main") ?? null;

const observer = new IntersectionObserver(
    (records) => { /* ... */ },
    {
        root: scrollContainer,
        rootMargin: "-96px 0px -70% 0px",
        threshold: 0,
    },
);
// ... and <a href={`#${e.id}`} onClick={handleTocClick}>
// handleTocClick: e.preventDefault() + target.scrollIntoView({ behavior: "smooth" })
// + history.pushState for URL hash
```

### Before

```tsx
// src/components/blog/ReadingProgress.tsx
window.addEventListener("scroll", onScroll, { passive: true });
```

### After

```tsx
// src/components/blog/ReadingProgress.tsx
const scrollContainer =
    document.querySelector<HTMLElement>("main") ?? window;
scrollContainer.addEventListener("scroll", onScroll, { passive: true });
```

### Before

```tsx
// src/services/blogAnalytics.ts — createScrollDepthTracker
window.addEventListener("scroll", onScroll, { passive: true });
```

### After

```tsx
// src/services/blogAnalytics.ts — createScrollDepthTracker
const scrollContainer: EventTarget =
    document.querySelector("main") ?? window;
scrollContainer.addEventListener("scroll", onScroll, { passive: true });
```

### Before

```ts
// src/constants/copy.ts — NAV_LINKS
{ label: "Services", href: "#services" },
{ label: "Blog", href: "/blog" },
{ label: "How It Works", href: "#how-it-works" },
{ label: "Our Promise", href: "#promise" },
{ label: "Testimonials", href: "#testimonials" },
{ label: "FAQ", href: "#faq" },
```

### After

```ts
// src/constants/copy.ts — NAV_LINKS
{ label: "Services", href: "#services" },
{ label: "How It Works", href: "#how-it-works" },
{ label: "Our Promise", href: "#promise" },
{ label: "Testimonials", href: "#testimonials" },
{ label: "Blog", href: "/blog" },
{ label: "FAQ", href: "#faq" },
```

### Notes

- The `getBoundingClientRect()` math in `ReadingProgress` and `blogAnalytics.ts` still works correctly: `<main>` is positioned at the viewport top (`h-screen`), so article rect.top is still relative to the viewport. No math changes needed.
- The engagement tracker (`createEngagementTracker`) uses `setInterval` + `visibilitychange`, not scroll — it didn't need a fix.
- `window.addEventListener("resize")` remains on the window (not `<main>`) — resize events only fire on `window`, and they correctly trigger recomputation regardless of which element scrolls.
- User preference recorded in CLAUDE.md: Blog nav link position is after Testimonials, before FAQ.

---

## [2026-04-16] #016 — Fix: TOC sticky pinning + self-healing category chips

- **Type:** fix
- **Scope:** `src/app/blog/page.server.tsx`, `src/app/blog/[slug]/page.server.tsx`, `src/app/blog/category/[slug]/page.server.tsx`, `src/app/blog/author/[slug]/page.server.tsx`
- **Why:** Two user-reported regressions on a live test — the post page's Table-of-Contents rail never pinned while scrolling, and the `/blog` index showed only the "All" chip even though posts were categorized.
- **Related:** Phase 3 verification pass (BLOG_TASKS.md).

### Summary

Two structural fixes, both applied at the server-component level so the downstream components stay purely presentational.

First, the `<main>` element on every blog route was `min-h-screen overflow-y-auto`. That combination creates a sticky containing block (because `overflow-y-auto` is a scroll container) but the container never actually scrolls — `min-h-screen` lets `<main>` grow to fit its children, so the window scrolls instead. `position: sticky` scopes to the nearest declared scroll container ancestor (our `<main>`), but since that container isn't the one actually scrolling, every sticky descendant (notably `TableOfContents` on `/blog/[slug]`) fails silently. Changed all four blog page `<main>` elements to `h-screen` so the element becomes a real fixed-height internal scroll container — the same pattern `src/components/landing/AppShell.tsx` already uses on the main site.

Second, the chip bar on `/blog` was rendering only "All" because `getAllCategories()` only returns published Category documents. If editors tag posts with a category whose own Category document isn't published (or wasn't created separately), the chip row ends up empty. `/blog/page.server.tsx` now computes a de-duplicated union of canonical categories and any categories actually referenced on published posts, and passes the merged list to `BlogIndexInteractive`. The chip bar is now self-healing against missing canonical taxonomy documents.

### Before

```tsx
// src/app/blog/page.server.tsx
import {
    getAllCategories,
    getAllPosts,
    getFeaturedPost,
    getSearchIndex,
    getSiteSettings,
} from "@/lib/sanity";

// ...

    // Don't show the featured post twice — it renders as its own hero card
    // above the grid, so strip it from the grid's post list.
    const gridPosts = featured
        ? posts.filter((p) => p._id !== featured._id)
        : posts;

    return (
        <>
            <ThemeSync />
            <main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />
                {/* ... */}
                <BlogIndexInteractive
                    posts={gridPosts}
                    categories={categories}
                    searchIndex={searchIndex}
                />
                {/* ... */}
            </main>
        </>
    );
```

### After

```tsx
// src/app/blog/page.server.tsx
import {
    getAllCategories,
    getAllPosts,
    getFeaturedPost,
    getSearchIndex,
    getSiteSettings,
    type Category,
} from "@/lib/sanity";

// ...

    // Don't show the featured post twice — it renders as its own hero card
    // above the grid, so strip it from the grid's post list.
    const gridPosts = featured
        ? posts.filter((p) => p._id !== featured._id)
        : posts;

    // Merge canonical categories (from getAllCategories) with any categories
    // actually referenced on published posts that aren't in the canonical
    // set. Self-heals the chip bar when editors tag posts with a category
    // whose own document is unpublished/missing — we never render an empty
    // chip row if there are posts with category references. Canonical
    // entries keep their Sanity `order` sort; fallbacks are appended
    // alphabetically afterwards.
    //
    // Introduced in CHANGELOG #016.
    const canonicalCategoryIds = new Set(categories.map((c) => c._id));
    const fallbackCategoriesById = new Map<string, Category>();
    for (const post of posts) {
        for (const cat of post.categories) {
            if (canonicalCategoryIds.has(cat._id)) continue;
            if (fallbackCategoriesById.has(cat._id)) continue;
            fallbackCategoriesById.set(cat._id, cat);
        }
    }
    const fallbackCategories = Array.from(
        fallbackCategoriesById.values(),
    ).sort((a, b) => a.title.localeCompare(b.title));
    const mergedCategories: readonly Category[] = [
        ...categories,
        ...fallbackCategories,
    ];

    return (
        <>
            <ThemeSync />
            {/* h-screen (not min-h-screen) so <main> is the real scroll
                container; matches AppShell + /blog/[slug]. See CHANGELOG #016. */}
            <main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />
                {/* ... */}
                <BlogIndexInteractive
                    posts={gridPosts}
                    categories={mergedCategories}
                    searchIndex={searchIndex}
                />
                {/* ... */}
            </main>
        </>
    );
```

### Before

```tsx
// src/app/blog/[slug]/page.server.tsx
<main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ...article with left-rail TableOfContents using position: sticky ... */}
</main>
```

### After

```tsx
// src/app/blog/[slug]/page.server.tsx
{/*
    Must be `h-screen` (not `min-h-screen`) so this element is
    the real scroll container. With `min-h-screen` + `overflow-y-auto`,
    <main> grows to fit content, never scrolls internally, and the
    window scrolls instead — which breaks every `position: sticky`
    element inside (notably the left-rail TableOfContents), because
    sticky scopes to the nearest declared scroll container ancestor
    (<main> here) but that container isn't the one actually scrolling.
    See CHANGELOG #016. Pattern matches `src/components/landing/AppShell.tsx`.
*/}
<main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ... */}
</main>
```

### Before

```tsx
// src/app/blog/category/[slug]/page.server.tsx
<main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ... */}
</main>
```

### After

```tsx
// src/app/blog/category/[slug]/page.server.tsx
{/* h-screen (not min-h-screen) so <main> is the real scroll
    container; matches AppShell + /blog + /blog/[slug].
    See CHANGELOG #016. */}
<main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ... */}
</main>
```

### Before

```tsx
// src/app/blog/author/[slug]/page.server.tsx
<main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ... */}
</main>
```

### After

```tsx
// src/app/blog/author/[slug]/page.server.tsx
{/* h-screen (not min-h-screen) so <main> is the real scroll
    container; matches AppShell + /blog + /blog/[slug].
    See CHANGELOG #016. */}
<main className="relative h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
    <Header />
    {/* ... */}
</main>
```

### Notes

- The category and author pages don't currently have any `position: sticky` descendants, but they got the `h-screen` change for structural consistency across all four blog routes. Future sticky elements (e.g. a category filter rail, an author share bar) will "just work".
- The `BlogIndexInteractive` client component was NOT modified. The fix deliberately lives in the server component so the client stays purely presentational — if a future page wants a different chip source (e.g. only categories with ≥ 3 posts), it can pre-compute and pass.
- TypeScript note: `post.categories` items are `Pick<Category, "_id" | "title" | "slug">`. They're structurally assignable to `Category` because `Category.description` and `Category.order` are optional — so storing them in `Map<string, Category>` and spreading alongside canonical rows type-checks cleanly without a cast.
- Verification: the user will reload `/blog` (expect the chip row to render every category present on any post, with "All" first) and open any post page (expect the left-rail Table of Contents to pin in place as the article body scrolls under it).

---

## [2026-04-16] #015 — Docs: Phase 6 deploy + editor onboarding; README refresh

- **Type:** docs
- **Scope:** `docs/BLOG_DEPLOY.md` (new), `docs/BLOG_EDITORS.md` (new), `README.md`, `BLOG_TASKS.md`
- **Why:** Phase 6 of the blog rollout is "deploy + docs." The code for the blog is functionally done (Phases 1–5 landed in #002–#014), but nothing is written down about how to actually stand the blog up on Vercel, point GoDaddy DNS at it, wire the Sanity → Vercel webhook, or onboard a non-engineer editor. Without these two docs, launching is a one-person operation that lives only in chat history. This pass writes the operator guide and the editor handbook, updates the README so new contributors can find them, and rescopes the Phase 6 task list in `BLOG_TASKS.md` to distinguish "Claude wrote the docs" (done) from "user clicks through Vercel/DNS/Sanity UIs" (still to do).

### Summary

Created two new documents under `docs/`:

- **`docs/BLOG_DEPLOY.md`** — 11-section operator reference:
  1. Architecture diagram showing the cPanel ↔ Vercel split and the single-trunk git flow.
  2. Build-targets table (`build:static` vs `build:server`, what's included, what's excluded).
  3. One-time Vercel setup: project creation, env var table, first deploy.
  4. GoDaddy DNS: CNAME `blog` → `cname.vercel-dns.com`, propagation/TLS gotchas.
  5. Sanity → Vercel webhook: deploy-hook creation + GROQ filter.
  6. The every-push flow.
  7. Rollback (both Vercel instant rollback and cPanel zip swap).
  8. Failure triage table (9 common failures with fixes).
  9. Security hygiene (token rotation, `.env.local`, deploy-hook secrecy, CORS).
  10. Env-var reference by build target.
  11. Open follow-ups.
- **`docs/BLOG_EDITORS.md`** — 12-section editor handbook:
  - Studio access via `blog.pockitengineers.com/studio`.
  - Tour of Studio document types (Post, Author, Category, Tag, Site settings).
  - Prerequisite taxonomy setup (create an author + category before the first post).
  - Writing a post across the four schema groups (content / taxonomy / media / SEO), with full Portable Text guidance (block styles, marks, embedded image + callout blocks, explicit callouts about what the schema *doesn't* yet support — lists, tables, raw HTML).
  - Image guidance (sizing table per usage, alt-text rules, hotspot explanation, captions).
  - Publish flow (draft auto-save → Publish → webhook → rebuild → live in ~60s), unpublish vs delete, backdating, future-dated posts.
  - Draft preview workarounds (no one-click preview yet; interim options).
  - Updating the `siteSettings` singleton.
  - Common gotchas (slug collisions, category requirement, cropping, ToC only picks up H2).
  - URL reference for verifying published content.
  - Post-publish 2-minute checklist.

Updated `README.md`:
- Tagline now reflects "Marketing Website + Blog" instead of just the marketing site.
- Tech stack lists Sanity + `next-sanity` and calls out dual `BUILD_TARGET`.
- Project-structure section gains a "Blog + CMS" entry mapping `src/app/blog`, `src/app/studio`, `sanity/`, `src/lib/sanity/`, and `src/lib/siteUrls.ts`.
- "Docs" list expanded to cover all four doc files (CSS, BLOG_ANALYTICS, BLOG_DEPLOY, BLOG_EDITORS).
- "Local Development" now calls out port 3001 (server-mode dev) and the required `.env.local` variables.
- "Scripts" rewritten to match the actual `package.json` (`dev`, `dev:turbo`, `build:static`, `build:server`, `zip:cpanel`, `preview:static`).
- "Deployment Notes" restructured around the two-target model, with per-target env-var instructions and a pointer to `docs/BLOG_DEPLOY.md`.
- "Security" note updated for `SANITY_API_READ_TOKEN` rotation and deploy-hook secrecy.

Updated `BLOG_TASKS.md` Phase 6:
- Split the phase into "Docs (written by Claude)" — ticked off — and "User-only steps" — each with a pointer to the relevant `docs/BLOG_DEPLOY.md` section so the user can click through without re-reading chat history.
- Ticked off the Phase 0 "Create Vercel account" item (user confirmed existing personal account).

### Before

```
# repo root
docs/
  CSS.md
  BLOG_ANALYTICS.md
README.md               # described the codebase as "Marketing Website" only
                        # scripts section listed stale scripts (no build:static/server)
                        # no mention of /blog, /studio, Sanity, or dual build targets
BLOG_TASKS.md Phase 6:
  - [ ] #014 Create Vercel project, connect this repo, set root directory
  - [ ] #014 Set Vercel env vars: ...
  - [ ] #014 Configure custom domain ...
  - [ ] #014 Add DNS CNAME: ...
  - [ ] #014 Generate Vercel deploy hook URL
  - [ ] #014 Add Sanity → Vercel webhook ...
  - [ ] Create docs/BLOG_DEPLOY.md — ...
  - [ ] Create docs/BLOG_EDITORS.md — ...
```

### After

```
# repo root
docs/
  CSS.md
  BLOG_ANALYTICS.md
  BLOG_DEPLOY.md        # NEW — 11-section operator guide
  BLOG_EDITORS.md       # NEW — 12-section editor handbook
README.md               # updated tagline, tech stack, structure, scripts, deploy notes, security
BLOG_TASKS.md Phase 6:
  ### Docs (written by Claude — ready to hand off)
  - [x] #015 Create docs/BLOG_DEPLOY.md — ...
  - [x] #015 Create docs/BLOG_EDITORS.md — ...
  - [x] #015 Update README.md — ...
  - [x] #015 CLAUDE.md build-target notes already cover env vars (#013)
  ### User-only steps (Claude cannot do these — require Vercel UI, GoDaddy DNS admin, Sanity webhook admin)
  - [ ] Create Vercel project ... — docs/BLOG_DEPLOY.md §3.1
  - [ ] Set Vercel env vars ... — docs/BLOG_DEPLOY.md §3.2
  - [ ] First Vercel deploy ... — docs/BLOG_DEPLOY.md §3.3
  - [ ] Configure custom domain ... — docs/BLOG_DEPLOY.md §4.1
  - [ ] Add GoDaddy DNS CNAME ... — docs/BLOG_DEPLOY.md §4.2–4.3
  - [ ] Generate Vercel deploy hook URL ... — docs/BLOG_DEPLOY.md §5.1
  - [ ] Add Sanity → Vercel webhook ... — docs/BLOG_DEPLOY.md §5.2
  - [ ] Smoke-test end-to-end ... — docs/BLOG_DEPLOY.md §6
  - [ ] Re-run cPanel build with NEXT_PUBLIC_BLOG_URL set
```

### Notes

- No code changed in this pass — docs-only. `README.md` is the only existing tracked file edited in content (plus `BLOG_TASKS.md`).
- `docs/BLOG_DEPLOY.md` is written so it works for both the *first* deploy and for "unstick me at 2am" moments (§7 rollback + §8 failure triage). It intentionally names the exact Vercel menu items and GoDaddy DNS fields so the user can complete the work without Claude in the loop.
- `docs/BLOG_EDITORS.md` speaks past the engineer and directly to a writer/editor. No code, no env vars, no terminal. It's safe to send to a freelance writer after Studio access is granted.
- Post-launch follow-ups called out in both docs: rotate the Sanity read token (blocked until the live site is verified), consider Sanity's Scheduled Publishing plugin if schedule-ahead-of-time becomes a repeat need, wire one-click draft preview once we have a production deploy to preview *against*.
- Verification handoff for the user: open `README.md`, confirm the new scripts/structure/deploy sections read cleanly; skim `docs/BLOG_DEPLOY.md` §3–§5 and flag anything that won't match the real Vercel UI when you start clicking through; skim `docs/BLOG_EDITORS.md` §4 (writing a post) and confirm the field instructions match what Studio actually shows.

---

## [2026-04-16] #014 — Fix: nav "Services" link targets the service grid, not the app-download band

- **Type:** fix
- **Scope:** `src/constants/copy.ts`
- **Why:** The "Services" nav tab was pointing at `#download` (the DownloadBand section) instead of `#services` (the ServiceGrid section). Clicking "Services" was dropping users on the app-download CTA rather than the actual services list. Spotted by the user while verifying #013.

### Summary
Flipped the `Services` entry in `NAV_LINKS` from `#download` → `#services` so clicking it jumps to the ServiceGrid (`id="services"` on `src/components/landing/ServiceGrid.tsx`). Footer service-category links still point to `/#download` on purpose — those are booking CTAs that should lead to the download band, not nav breadcrumbs. The `Header.bookHref` / `Header.loginHref` also still target `#download` because the "Book a Service" button is meant to drive app installs.

### Before

```ts
// src/constants/copy.ts
export const NAV_LINKS: readonly NavLink[] = [
    { label: "Services", href: "#download" },
    { label: "Blog", href: "/blog" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Promise", href: "#promise" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
];
```

### After

```ts
// src/constants/copy.ts
export const NAV_LINKS: readonly NavLink[] = [
    // "Services" targets the ServiceGrid section (`id="services"`), not the
    // app-download band (`id="download"`) — see CHANGELOG #014.
    { label: "Services", href: "#services" },
    { label: "Blog", href: "/blog" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Promise", href: "#promise" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
];
```

### Notes

- No Header/Footer code changes were needed — `resolveNavHref` already treats any `#xxx` anchor identically.
- `handleNavLinkClick` → `scrollToSection("#services")` works exactly the same path as `#download` did.
- Verify: on `/`, click "Services" → browser scrolls to the "Everything IT. Just a tap away." section, URL bar becomes `/#services`.

## [2026-04-16] #013 — Shared Header/Footer across main site and blog subdomain (cross-origin nav)

- **Type:** feature
- **Scope:** `src/lib/siteUrls.ts` (new), `src/constants/copy.ts`, `src/components/landing/Header.tsx`, `src/components/landing/Footer.tsx`, `src/components/landing/StickyBookCTA.tsx`, `src/hooks/useBookServiceNav.ts`, `CLAUDE.md`
- **Why:** The blog lives on Vercel at `blog.pockitengineers.com` while the marketing site stays on cPanel at `pockitengineers.com`. The same Header/Footer render on both, so the nav needs to be aware of which surface it's rendering on and hop origins when appropriate. Added a Blog link to the main-site nav (second slot, for AEO) and FOOTER_LINKS so answer-engine crawlers and humans discover blog content early.

### Summary
Introduced a central `resolveNavHref` helper in `src/lib/siteUrls.ts` that swaps link destinations at render time based on two build-time env vars (`NEXT_PUBLIC_MAIN_SITE_URL` on the Vercel build, `NEXT_PUBLIC_BLOG_URL` on the cPanel build). Both unset in dev → everything resolves same-origin on `:3001`. Updated Header, Footer, StickyBookCTA, and `useBookServiceNav` to use the resolver so anchor links, `/#download` CTAs, the "Blog" route, and the logo all hop origins correctly. Added `NavLink` interface + Blog entry to `NAV_LINKS` and `FOOTER_LINKS.Company`. Active state styling highlights "Blog" when the user is on any `/blog/*` route.

### Before

```ts
// src/lib/siteUrls.ts
(file did not exist)
```

```ts
// src/constants/copy.ts — NAV_LINKS
export const NAV_LINKS = [
    { label: "Services", href: "#download" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Promise", href: "#promise" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
];
```

```tsx
// src/components/landing/Header.tsx (relevant bits)
const pathname = usePathname();
const isHome = pathname === "/";
const navHref = (href: string) => (href.startsWith("#") && !isHome ? `/${href}` : href);
// …
<Link href="/" className="flex items-center gap-2" onClick={handleLogoClick}>
// …
{NAV_LINKS.map(link => (
    <Link
        key={link.label}
        href={navHref(link.href)}
        onClick={(e) => handleNavLinkClick(link.href, e)}
        className="px-4 py-2 text-[16px] font-medium rounded-lg …"
    >
        {link.label}
    </Link>
))}
// CTA
<Link href="/#download" onClick={onBookService} …>
```

```tsx
// src/components/landing/Footer.tsx (relevant bits)
const linkHref = (href: string) => (href.startsWith("#") && !isHome ? `/${href}` : href);
// …
<motion.a href="/#download" onClick={onBookService} …>
```

```tsx
// src/components/landing/StickyBookCTA.tsx (relevant bits)
<Link
    href="/#download"
    onClick={(e) => { …; onBookService(e); }}
>
```

```ts
// src/hooks/useBookServiceNav.ts (branch that navigates when not on home)
if (pathname === "/") {
    scrollToDownloadSection();
} else {
    window.location.href = "/#download";
}
```

### After

```ts
// src/lib/siteUrls.ts (new file)
const MAIN_SITE_URL = (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "").replace(/\/+$/, "");
const BLOG_URL = (process.env.NEXT_PUBLIC_BLOG_URL ?? "").replace(/\/+$/, "");

export function getMainSiteHomeUrl(): string { return MAIN_SITE_URL || "/"; }
export function getBlogIndexUrl(): string { return BLOG_URL || "/blog"; }
export function isBlogBuildTarget(): boolean { return MAIN_SITE_URL.length > 0; }

export function resolveNavHref(href: string, isHome: boolean): string {
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith("#")) {
        if (MAIN_SITE_URL) return `${MAIN_SITE_URL}/${href}`;
        return isHome ? href : `/${href}`;
    }
    if (href.startsWith("/")) {
        if (href === "/blog" || href.startsWith("/blog/") || href.startsWith("/blog?")) {
            if (!BLOG_URL) return href;
            if (href === "/blog") return BLOG_URL;
            return `${BLOG_URL}${href}`;
        }
        if (href.startsWith("/#")) return MAIN_SITE_URL ? `${MAIN_SITE_URL}${href}` : href;
        return MAIN_SITE_URL ? `${MAIN_SITE_URL}${href}` : href;
    }
    return href;
}
```

```ts
// src/constants/copy.ts — NAV_LINKS (Blog moved into second slot for AEO)
export interface NavLink {
    readonly label: string;
    readonly href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
    { label: "Services", href: "#download" },
    { label: "Blog", href: "/blog" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Our Promise", href: "#promise" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
];

// FOOTER_LINKS.Company also gains a Blog entry between "How It Works" and
// "Join as a Technician".
```

```tsx
// src/components/landing/Header.tsx (relevant bits)
import { getMainSiteHomeUrl, resolveNavHref } from "@/lib/siteUrls";
// …
const isBlogContext = pathname?.startsWith("/blog") ?? false;
const homeUrl = getMainSiteHomeUrl();
// …
<Link href={homeUrl} className="flex items-center gap-2" onClick={handleLogoClick}>
// …
{NAV_LINKS.map(link => {
    const isActiveBlog = link.href === "/blog" && isBlogContext;
    return (
        <Link
            key={link.label}
            href={resolveNavHref(link.href, isHome)}
            onClick={(e) => handleNavLinkClick(link.href, e)}
            aria-current={isActiveBlog ? "page" : undefined}
            className={isActiveBlog
                ? "px-4 py-2 text-[16px] font-semibold rounded-lg … text-theme-accent-end bg-theme-text/5"
                : "px-4 py-2 text-[16px] font-medium rounded-lg … text-theme-text/75 hover:text-theme-accent-end hover:bg-theme-text/5"}
        >
            {link.label}
        </Link>
    );
})}
// CTA
<Link href={resolveNavHref("/#download", isHome)} onClick={onBookService} …>
```

`handleLogoClick` now checks for an absolute `homeUrl` and lets the Link navigate naturally when the resolved URL is cross-origin (blog build pointing back to the main site).

```tsx
// src/components/landing/Footer.tsx
import { resolveNavHref } from "@/lib/siteUrls";
// …
const linkHref = (href: string) => resolveNavHref(href, isHome);
// …
<motion.a href={resolveNavHref("/#download", isHome)} onClick={onBookService} …>
```

```tsx
// src/components/landing/StickyBookCTA.tsx
import { usePathname } from "next/navigation";
import { resolveNavHref } from "@/lib/siteUrls";
// …
const pathname = usePathname();
const isHome = pathname === "/";
// …
<Link href={resolveNavHref("/#download", isHome)} …>
```

```ts
// src/hooks/useBookServiceNav.ts
import { resolveNavHref } from "@/lib/siteUrls";
// …
const isHome = pathname === "/";
// …
if (isHome) {
    scrollToDownloadSection();
} else {
    // Cross-origin (blog) builds → absolute main-site URL.
    window.location.href = resolveNavHref("/#download", isHome);
}
```

### Notes

- **Env var wiring (not done in this entry — ship with deploy):**
  - Set `NEXT_PUBLIC_BLOG_URL=https://blog.pockitengineers.com` on the cPanel (static) build.
  - Set `NEXT_PUBLIC_MAIN_SITE_URL=https://pockitengineers.com` on the Vercel (server) build.
  - Leave both unset in `.env.local`; everything stays same-origin on `:3001`.
- Documented the new env vars and the per-build-target guidance in `CLAUDE.md` under "Project preferences".
- The Blog nav slot sits second (after Services) by design — top-of-nav placement gives answer-engine crawlers the best chance of discovering the blog. Tracked as a locked AEO decision.
- Active state for Blog uses `aria-current="page"` plus a subtle background + accent-colored text so it works with keyboard focus rings and assistive tech.
- `tsc --noEmit` couldn't be run cleanly in this session because the bash mount snapshot lagged behind the file-tool writes (same pattern as #012). User should run `npx tsc --noEmit` locally to confirm before deploying.
- **Verification for the user to click through on `:3001`:**
  1. From `/`, click "Blog" in the top nav → should land on `/blog`; nav link gains the accent-colored active treatment.
  2. From `/blog`, click "Services" → should hop to `/#download` and scroll the main-site home.
  3. From `/blog/<any-post>`, click the Pockit logo → should land on the main-site home (`/`).
  4. Click "Book a Service" from both a main-site page and a blog page — both should land at the download section, with blog clicks bouncing to `/#download` first.
  5. Footer "Blog" link (Company column) should behave like the nav link.
- **Deploy-time check:** once env vars are set on each build target, repeat the same five clicks against the production origins and confirm the URL bar crosses origins where expected.

## [2026-04-16] #012 — Full blog analytics: post_view, scroll_depth, engagement, card_impression, cta_click
- **Type:** feature
- **Scope:** `src/lib/analytics.ts`, `src/services/blogAnalytics.ts` (new), `src/components/blog/PostAnalytics.tsx` (new), `src/app/blog/[slug]/page.server.tsx`, `src/components/blog/PostCard.tsx`, `src/components/blog/FeaturedPost.tsx`
- **Why:** Move blog analytics off the "cards + share only" MVP (#008 / #009) onto the full measurement plan the roadmap calls for — per-post reach, attention (scroll + time), card reach on listings, and a CTA seam for future in-post buttons. These are the signals the team will actually use to decide what to write next.
- **Related:** BLOG_TASKS.md Phase 3 → #012

### Summary
Added five new events to the analytics registry and a new `src/services/blogAnalytics.ts` service that owns the behavior around them: a headless post-view fire, a RAF-throttled scroll-depth tracker (25/50/75/100 %), a visibility-aware engagement timer (30 s / 60 s / 180 s that pauses when the tab is hidden), a reusable `trackCardImpression` helper, and a `trackCtaClick` seam ready for a future Portable Text CTA block. A small `"use client"` island (`PostAnalytics`) mounts those trackers on the server-rendered post page without turning the whole page client-only. `PostCard` and `FeaturedPost` now hook Framer Motion's existing `onViewportEnter` (same observer that drives `whileInView`) to fire `card_impression` once per card per mount. Three custom dimensions (`post_slug`, `post_category`, `post_author`) ride along on every blog event — they still need to be registered in the GA4 admin UI one time (steps in `docs/BLOG_ANALYTICS.md`).

### Before
```ts
// src/lib/analytics.ts — event registry before #012
BlogCardClicked: "blog_card_clicked",
BlogCategoryFilter: "blog_category_filter",
BlogSearch: "blog_search",
BlogShareClick: "share_click",
```

### After
```ts
// src/lib/analytics.ts — event registry after #012
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
```

### Before
```
(no src/services/blogAnalytics.ts)
```

### After
```ts
// src/services/blogAnalytics.ts — new file
export interface BlogPostContext {
    readonly post_slug: string;
    readonly post_category?: string;
    readonly post_author?: string;
}

export type CardSurface =
    | "index"
    | "featured"
    | "related"
    | "category"
    | "author";

export function trackPostView(ctx: BlogPostContext): void {
    trackEvent(AnalyticsEvents.BlogPostView, { ...ctx });
}

export function trackCardImpression(
    postSlug: string,
    surface: CardSurface,
    postCategory?: string,
): void {
    trackEvent(AnalyticsEvents.BlogCardImpression, {
        post_slug: postSlug,
        surface,
        ...(postCategory ? { post_category: postCategory } : {}),
    });
}

export function trackCtaClick(params: {
    readonly ctaId: string;
    readonly ctaLabel?: string;
    readonly ctaHref?: string;
    readonly postContext: BlogPostContext;
}): void { /* ...flattens postContext into the event... */ }

export function createScrollDepthTracker(options: {
    readonly articleId: string;
    readonly postContext: BlogPostContext;
}): () => void {
    // RAF-throttled scroll + resize listeners, computes percent scrolled
    // of the article rect, fires once per 25/50/75/100 % milestone.
    // Returns a cleanup fn.
}

export function createEngagementTracker(options: {
    readonly postContext: BlogPostContext;
}): () => void {
    // setInterval(1s) accumulator, paused via Page Visibility API while
    // the tab is hidden so background tabs don't inflate numbers.
    // Fires once per 30/60/180 s milestone. Returns a cleanup fn.
}
```

### Before
```
(no src/components/blog/PostAnalytics.tsx)
```

### After
```tsx
// src/components/blog/PostAnalytics.tsx — new file
"use client";

import { useEffect, useRef } from "react";
import {
    createEngagementTracker,
    createScrollDepthTracker,
    trackPostView,
    type BlogPostContext,
} from "@/services/blogAnalytics";

interface PostAnalyticsProps extends BlogPostContext {
    readonly articleId: string;
}

export default function PostAnalytics({
    articleId,
    post_slug,
    post_category,
    post_author,
}: PostAnalyticsProps): null {
    const hasFiredPostView = useRef(false);

    useEffect(() => {
        const context: BlogPostContext = {
            post_slug,
            ...(post_category ? { post_category } : {}),
            ...(post_author ? { post_author } : {}),
        };

        if (!hasFiredPostView.current) {
            hasFiredPostView.current = true;
            trackPostView(context);
        }

        const cleanupScroll = createScrollDepthTracker({
            articleId, postContext: context,
        });
        const cleanupEngagement = createEngagementTracker({
            postContext: context,
        });

        return () => {
            cleanupScroll();
            cleanupEngagement();
        };
    }, [articleId, post_slug, post_category, post_author]);

    return null;
}
```

### Before
```tsx
// src/app/blog/[slug]/page.server.tsx — fragment, before #012
<ThemeSync />
<ReadingProgress articleId={ARTICLE_DOM_ID} />

<main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
```

### After
```tsx
// src/app/blog/[slug]/page.server.tsx — fragment, after #012
import PostAnalytics from "@/components/blog/PostAnalytics";
// ...
<ThemeSync />
<ReadingProgress articleId={ARTICLE_DOM_ID} />
<PostAnalytics
    articleId={ARTICLE_DOM_ID}
    post_slug={slug}
    post_category={primaryCategory?.title}
    post_author={post.author.name}
/>

<main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
```

### Before
```tsx
// src/components/blog/PostCard.tsx — fragment, before #012
export default function PostCard({ post, surface = "index" }: PostCardProps) {
    const coverSrc = post.coverImage?.asset
        ? urlFor(post.coverImage).width(720).height(420).fit("crop").url()
        : null;
    const primaryCategory = post.categories[0];

    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            // ...
        >
```

### After
```tsx
// src/components/blog/PostCard.tsx — fragment, after #012
import { useRef } from "react";
import { trackCardImpression, type CardSurface } from "@/services/blogAnalytics";

type PostCardSurface = Exclude<CardSurface, "featured">;

interface PostCardProps {
    readonly post: PostCardData;
    readonly surface?: PostCardSurface;
}

export default function PostCard({ post, surface = "index" }: PostCardProps) {
    // ...
    const hasFiredImpression = useRef(false);
    const handleViewportEnter = (): void => {
        if (hasFiredImpression.current) return;
        hasFiredImpression.current = true;
        trackCardImpression(post.slug.current, surface, primaryCategory?.title);
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px 0px" }}
            onViewportEnter={handleViewportEnter}
            transition={{ duration: 0.45, ease: "easeOut" }}
            // ...
        >
```

### Before
```tsx
// src/components/blog/FeaturedPost.tsx — fragment, before #012
export default function FeaturedPost({ post }: FeaturedPostProps) {
    // ...
    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            // ...
```

### After
```tsx
// src/components/blog/FeaturedPost.tsx — fragment, after #012
import { useRef } from "react";
import { trackCardImpression } from "@/services/blogAnalytics";

export default function FeaturedPost({ post }: FeaturedPostProps) {
    // ...
    const hasFiredImpression = useRef(false);
    const handleViewportEnter = (): void => {
        if (hasFiredImpression.current) return;
        hasFiredImpression.current = true;
        trackCardImpression(post.slug.current, "featured", primaryCategory?.title);
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            onViewportEnter={handleViewportEnter}
            transition={{ duration: 0.6, ease: "easeOut" }}
            // ...
```

### Notes
- **Why a separate scroll handler instead of piggybacking `ReadingProgress`.** `ReadingProgress` already has an RAF-throttled scroll path, but piggybacking would couple analytics to a presentation component. If a future refactor reworks the progress bar, analytics shouldn't silently break. Kept isolated; the overlap is two passive RAF-throttled listeners, which is cheap.
- **StrictMode double-invoke.** React 19 dev mode double-fires effects. `PostAnalytics` guards `post_view` with a `useRef<boolean>` so it only fires once across the replay. Scroll/engagement trackers are naturally idempotent via their internal `fired: Set` state, so cleanup+remount is safe.
- **Visibility-aware engagement.** Background tabs shouldn't inflate engagement. Uses Page Visibility API to pause the timer while `document.hidden` is `true`, and does a final flush on cleanup so a quick unmount still credits earned time.
- **`post_category` is scalar.** GA4 custom dimensions are scalar-only. Posts can have multiple categories in Sanity, so we flatten to the primary (first) category's title — matches what the breadcrumb and hero already display.
- **SSR safety.** Every factory defensively checks `typeof window === "undefined"` and returns a no-op cleanup, so the service can be imported anywhere without SSR hazard.
- **`trackCtaClick` is a deliberate seam.** No CTA block exists in the Portable Text schema yet; this is the future hook for an in-post "Book Service" button. Landing the fn shape now means the Portable Text type, when it arrives, can wire in a one-liner.
- **Manual step required: register three GA4 custom dimensions.** `post_slug`, `post_category`, `post_author` are passed as event-scoped parameters on every blog event. Until they're registered in the GA4 admin UI as custom dimensions, they'll show in DebugView but won't be reportable. Steps in `docs/BLOG_ANALYTICS.md`.
- **Verification:** on a running `npm run dev:server`, open `/blog` → scroll the index → click through to a post → scroll to the bottom → wait past 30 s and 60 s. In GA4 DebugView you should see `card_impression` (one per visible card), `post_view`, `scroll_depth` at 25/50/75/100, and `engagement` at 30 s and 60 s. Each event should carry `post_slug` (and `post_category`/`post_author` where applicable).

---

## [2026-04-16] #011 — RSS 2.0 feed, sitemap, and robots for the blog subdomain
- **Type:** feature
- **Scope:** `src/app/blog/rss.xml/route.server.ts` (new), `src/app/sitemap.xml/route.server.ts` (new), `src/app/robots.txt/route.server.ts` (new)
- **Why:** Make published posts syndicatable and crawlable. Feed readers, aggregators, and search engines now have a canonical index into the blog that updates automatically when Sanity publishes.
- **Related:** BLOG_TASKS.md Phase 3 → #011

### Summary
Three new server-only files live behind the `BUILD_TARGET=server` gate (the `.server.ts` extension is only matched by `pageExtensions` in the Vercel build, so the static cPanel export never sees them). `route.server.ts` under `/blog/rss.xml` hand-rolls an RSS 2.0 channel with a `<dc:creator>` per item, cover-image enclosure, and category tags. `sitemap.server.ts` emits a Next.js-convention sitemap that lists `/blog`, the RSS URL, every published post, every category, and every author. `robots.server.ts` disallows `/studio` and points crawlers at the sitemap. All three reuse the existing Sanity fetchers and therefore inherit the `blog:index` / `blog:taxonomy` cache tags — a Sanity publish webhook will refresh them in place.

### Before
```
(no RSS feed, no sitemap, no robots.txt on the blog subdomain)
```

### After
```ts
// src/app/blog/rss.xml/route.server.ts
import { getAllPosts, getSiteSettings, urlFor } from "@/lib/sanity";
import type { PostCardData } from "@/lib/sanity";

const BLOG_BASE_URL = "https://blog.pockitengineers.com";
const FEED_DEFAULT_TITLE = "PockIT Engineers — Blog";
const FEED_DEFAULT_DESCRIPTION =
    "Insights, updates, and field notes from the PockIT Engineers team.";

export const revalidate = 300;

function escapeXml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function cdata(input: string): string {
    return `<![CDATA[${input.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function formatRfc822(date: string | undefined): string {
    const parsed = date ? new Date(date) : new Date();
    return parsed.toUTCString();
}

function buildItem(post: PostCardData): string {
    const postUrl = `${BLOG_BASE_URL}/blog/${post.slug.current}`;
    // ...title, pubDate, description, categories, enclosure rendered here...
    return `    <item>...</item>`;
}

export async function GET(): Promise<Response> {
    const [posts, settings] = await Promise.all([
        getAllPosts(),
        getSiteSettings(),
    ]);
    const xml = /* assembled RSS 2.0 channel with items */ "";
    return new Response(xml, {
        status: 200,
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control":
                "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        },
    });
}
```

```ts
// src/app/sitemap.xml/route.server.ts
import {
    getAllAuthorSlugs,
    getAllCategorySlugs,
    getAllPosts,
} from "@/lib/sanity";

const BLOG_BASE_URL = "https://blog.pockitengineers.com";
export const revalidate = 3600;

function escapeXml(input: string): string { /* ...standard five-char escape... */ return input; }
function buildUrlElement(entry: SitemapEntry): string { /* <url><loc><lastmod><changefreq><priority>... */ return ""; }

export async function GET(): Promise<Response> {
    const [posts, categorySlugs, authorSlugs] = await Promise.all([
        getAllPosts(),
        getAllCategorySlugs(),
        getAllAuthorSlugs(),
    ]);
    const now = new Date();
    const entries = [
        { url: `${BLOG_BASE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${BLOG_BASE_URL}/blog/rss.xml`, lastModified: now, changeFrequency: "daily", priority: 0.3 },
        ...posts.map((p) => ({
            url: `${BLOG_BASE_URL}/blog/${p.slug.current}`,
            lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
            changeFrequency: "weekly", priority: 0.8,
        })),
        ...categorySlugs.map((s) => ({ url: `${BLOG_BASE_URL}/blog/category/${s.current}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 })),
        ...authorSlugs.map((s) => ({ url: `${BLOG_BASE_URL}/blog/author/${s.current}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 })),
    ];
    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        entries.map(buildUrlElement).join("\n"),
        "</urlset>",
    ].join("\n");
    return new Response(xml, {
        status: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
```

```ts
// src/app/robots.txt/route.server.ts
const BLOG_BASE_URL = "https://blog.pockitengineers.com";
export const revalidate = 86400;

export function GET(): Response {
    const body = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /studio",
        "Disallow: /studio/",
        "",
        `Sitemap: ${BLOG_BASE_URL}/sitemap.xml`,
        "",
    ].join("\n");
    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
    });
}
```

### Notes
- **Route handlers, not metadata file conventions.** The first pass tried Next.js's built-in `sitemap.ts` and `robots.ts` file conventions, but they don't compose cleanly with our `pageExtensions = ["server.ts", "server.tsx", ...]` gating — the dev server threw `Cannot find module for page: route not found /robots.txt/route`. Rewritten as manual route handlers under `src/app/sitemap.xml/route.server.ts` and `src/app/robots.txt/route.server.ts`, matching the pattern used for `/blog/rss.xml`. This works because a route handler file named `route.server.ts` sits inside a directory named after the target URL — the directory becomes the path, and `pageExtensions` matches the handler file.
- All three files use the `.server.ts` extension. `pageExtensions` in `next.config.mjs` only includes `server.ts` when `BUILD_TARGET=server`; the static cPanel build ignores these files. Same gating as `/blog/**` and `/studio`.
- Feed and sitemap piggyback on Sanity's existing cache tags. A Sanity → Vercel webhook that calls `revalidateTag("blog:index")` (wired in #014) will flush feed, sitemap, and all post listings in one shot.
- RSS feed honors `siteSettings.rssTitle` / `siteSettings.rssDescription` (schema fields already exist) and falls back to sensible defaults if Studio hasn't populated them.
- `<enclosure length="0">` is an RFC-tolerated compromise — we don't HEAD the CDN image to get content-length. Strict validators will warn but still render the item.
- Verification: RSS feed confirmed working at `http://localhost:3001/blog/rss.xml` with two published posts. Sitemap and robots pending verification after the route-handler rewrite.

---

## [2026-04-16] #010 — Category and author listing pages (`/blog/category/[slug]`, `/blog/author/[slug]`)
- **Type:** feature
- **Scope:** `src/app/blog/category/[slug]/page.server.tsx` (new), `src/app/blog/author/[slug]/page.server.tsx` (new), `src/lib/sanity/queries.ts` (modified — added `categoryBySlugQuery`, `authorBySlugQuery`, `getCategoryBySlug`, `getAuthorBySlug`)
- **Why:** Phase 3 #010 — give categories and authors real destination pages. Without these, the category chips on post cards and the author-name link in `AuthorBlock` pointed at routes that didn't exist. Each page is also a valuable SEO surface and serves as a natural "more like this" landing page for readers arriving from search.
- **Related:** BLOG_TASKS.md Phase 3 / #010. Completes the set of taxonomy-driven routes that the post page (#009) and index (#008) already link to.

### Summary
Adds two new routes and the two fetchers they need:

- `/blog/category/[slug]` — reuses `BlogHero` with a "Category" eyebrow and the category title as headline. Below the hero, a `PostCard` grid (same `sm:grid-cols-2 lg:grid-cols-3` treatment as /blog) lists every post filed under that category, newest first. Post count and a "← All posts" link sit above the grid. Empty state when the category has no posts yet.
- `/blog/author/[slug]` — reuses `BlogHero` with a "Writer" eyebrow and the author's name as headline. Below the hero, a profile card (avatar + bio + social links) reads like a bio, and the post grid beneath it shows everything that author has written.

Both pages use `generateStaticParams` to pre-render every known category/author at build, carry `revalidate = 60`, and tag their fetches with `blog:category:<slug>` / `blog:author:<slug>` so the Sanity webhook (landing in #014) can invalidate them precisely. 404s are emitted via `notFound()` when the slug doesn't exist in Sanity.

Two small additions to the query layer: `getCategoryBySlug` and `getAuthorBySlug`, both projected to the same shape as their list counterparts so the types line up with the existing `Category` / `Author` interfaces with no extra narrowing.

### Before
```tsx
// src/app/blog/category/[slug]/page.server.tsx
(file did not exist)

// src/app/blog/author/[slug]/page.server.tsx
(file did not exist)

// src/lib/sanity/queries.ts — no getCategoryBySlug / getAuthorBySlug,
// only list-level queries + slug generators.
```

### After
```tsx
// src/lib/sanity/queries.ts (new queries + fetchers)
export const categoryBySlugQuery = groq`
    *[_type == "category" && slug.current == $slug][0] { _id, title, slug, description, order }
`;
export const authorBySlugQuery = groq`
    *[_type == "author" && slug.current == $slug][0] {
        _id, name, slug, role, bio, avatar{..., asset->}, socials
    }
`;

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
    return client.fetch(categoryBySlugQuery, { slug }, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:taxonomy", `blog:category:${slug}`] },
    });
}
export async function getAuthorBySlug(slug: string): Promise<Author | null> {
    return client.fetch(authorBySlugQuery, { slug }, {
        next: { revalidate: LIST_REVALIDATE_SECONDS, tags: ["blog:taxonomy", `blog:author:${slug}`] },
    });
}

// src/app/blog/category/[slug]/page.server.tsx — summary
export async function generateStaticParams() {
    const slugs = await getAllCategorySlugs();
    return slugs.map((s) => ({ slug: s.current }));
}
export default async function CategoryPage({ params }: { params: PageParams }) {
    const { slug } = await params;
    const [category, posts] = await Promise.all([
        getCategoryBySlug(slug),
        getPostsByCategory(slug),
    ]);
    if (!category) notFound();

    return (
        <main>
            <Header />
            <BlogHero eyebrow="Category" title={category.title} subtitle={...} />
            {posts.length > 0
                ? <PostCard grid surface="category" />
                : <BlogEmptyState title="Nothing here yet" body=... />}
            <Footer />
        </main>
    );
}

// src/app/blog/author/[slug]/page.server.tsx — summary
export default async function AuthorPage({ params }: { params: PageParams }) {
    const { slug } = await params;
    const [author, posts] = await Promise.all([
        getAuthorBySlug(slug),
        getPostsByAuthor(slug),
    ]);
    if (!author) notFound();

    return (
        <main>
            <Header />
            <BlogHero eyebrow="Writer" title={author.name} subtitle={author.role} />
            <ProfileCard avatar bio socials />
            {posts.length > 0
                ? <PostCard grid surface="author" />
                : <BlogEmptyState title="No posts yet" body=... />}
            <Footer />
        </main>
    );
}
```

### Notes
- Uses `.server.tsx` extension so both routes are excluded from the static cPanel export and only register on the Vercel server build, same pattern as `/blog` and `/blog/[slug]`.
- `PostCard` was already designed to accept a `surface` prop — this hands it `"category"` or `"author"` so analytics events from card clicks can tell us which surface they came from.
- Author page renders the avatar + bio + socials in a card above the grid, mirroring `AuthorBlock`'s treatment on post pages for visual consistency. The post-page `AuthorBlock` still lives under the body of each post — it also links here via `/blog/author/${author.slug.current}` which previously 404'd and now resolves.
- Empty-state copy is intentionally soft ("Fresh writing is on the way", "hasn't published anything yet"). No CTAs or fallback post grids — the page stays focused on the one facet.
- No `searchIndex` or category-chip filter on these pages — keeping them single-facet by design. If we ever want cross-filtering (e.g. posts by author X *and* in category Y), we'd layer it into the `/blog` index search surface rather than balloon these pages.
- Verification ask: publish a post, assign it to a category and an author, then visit `http://localhost:3001/blog/category/<category-slug>` and `http://localhost:3001/blog/author/<author-slug>` — confirm the hero reads correctly, the post card shows up, and "← All posts" returns to `/blog`.

---

## [2026-04-15] #009.2 — Move share buttons out of the sticky rail (fix ToC sticky bug)
- **Type:** fix
- **Scope:** `src/app/blog/[slug]/page.server.tsx`
- **Why:** The sticky left rail held ToC + ShareRail stacked together, and their combined height exceeded the viewport on most laptop screens. When a sticky element is taller than its scroll container, browsers can't pin it in place — it scrolls off as the page scrolls, so clicking a ToC link would jump to the section but the ToC list itself disappeared upward. User also preferred the horizontal share button style over the vertical rail.
- **Related:** Follow-up to #009.1, based on the user reporting "if I click on a topic on the left it scrolls down but the list moves up so I always have to scroll upwards to read a particular topic" + request to switch share buttons to horizontal on desktop.

### Summary
Removed `ShareRail` from the sticky left rail entirely. The sticky container now holds only the `TableOfContents`, which is short enough to fit comfortably within the viewport on every laptop size. Share buttons now use the horizontal `ShareBar` on every breakpoint — it sits inline above the post body, replacing the old mobile-only `lg:hidden` treatment. `ShareRail` component is no longer imported here (still exists in the codebase in case we want it back for a different layout).

### Before
```tsx
// src/app/blog/[slug]/page.server.tsx
import ShareRail from "@/components/blog/ShareRail";
import ShareBar from "@/components/blog/ShareBar";
// ...
<aside className="hidden lg:block">
    <div className="sticky top-28 flex flex-col gap-10">
        <TableOfContents blocks={post.body} />
        <ShareRail target={{ url: canonicalUrl, title: post.title }} postSlug={slug} />
    </div>
</aside>

<div>
    <div className="mb-8 lg:hidden">
        <ShareBar target={{ url: canonicalUrl, title: post.title }} postSlug={slug} />
    </div>
    <PostBody blocks={post.body} />
    ...
</div>
```

### After
```tsx
// src/app/blog/[slug]/page.server.tsx
import ShareBar from "@/components/blog/ShareBar";
// ...
<aside className="hidden lg:block">
    <div className="sticky top-28">
        <TableOfContents blocks={post.body} />
    </div>
</aside>

<div>
    <div className="mb-8">
        <ShareBar target={{ url: canonicalUrl, title: post.title }} postSlug={slug} />
    </div>
    <PostBody blocks={post.body} />
    ...
</div>
```

### Notes
- `ShareRail` component kept in the codebase (not deleted) — it's a clean vertical-share primitive we may want for a different surface later, and pruning it now would require another round of import cleanup if we bring it back.
- `ShareBar` now renders on every breakpoint. No `lg:hidden` on the wrapper anymore.
- The sticky ToC now has plenty of headroom — even a post with 15+ headings should fit because ToC items are ~28px tall each.
- Verification ask reissued: click a ToC item and confirm the list stays visible on the left while the body scrolls to that section.

---

## [2026-04-15] #009.1 — Center the `/blog/[slug]` body column on the page
- **Type:** fix
- **Scope:** `src/app/blog/[slug]/page.server.tsx`
- **Why:** The initial #009 layout used a `[220px_1fr]` grid inside a 1100px container, which pushed the body column visibly off-center to the right. The breadcrumb, title, cover, and body all listed to the right of the viewport midline — particularly obvious on a post with no ToC entries, where the left rail was sparse.
- **Related:** Follow-up to #009 based on a screenshot from the user showing the off-center result.

### Summary
Switched the article layout from a two-column `[220px_1fr]` grid (body anchored left inside its cell) to a three-column `[220px_minmax(0,760px)_220px]` grid with `justify-center` and a 1260px outer cap. A 220px empty spacer now flanks the body on the right so the reading column is visually dead-centered on the page while the sticky left rail still floats in the left gutter. Breadcrumb, header, and cover image were also pulled out of the 1100px-wide wrappers with `lg:ml-[252px]` offsets and instead live inside `max-w-[760px]` containers that center with `mx-auto` — much simpler and guaranteed to stay aligned with the body column regardless of screen width.

### Before
```tsx
// src/app/blog/[slug]/page.server.tsx
<div className="mx-auto w-[92%] max-w-[1100px] pb-6">
    <PostBreadcrumb crumbs={crumbs} />
</div>

<header className="mx-auto w-[92%] max-w-[1100px]">
    <div className="max-w-[760px] lg:ml-[252px]">
        {/* title, excerpt, meta */}
    </div>
</header>

{coverSrc ? (
    <div className="mx-auto mt-10 w-[92%] max-w-[1100px]">
        <div className="max-w-[760px] lg:ml-[252px]">
            {/* cover */}
        </div>
    </div>
) : null}

<div className="mx-auto mt-10 w-[92%] max-w-[1100px] lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
    <aside className="hidden lg:block">{/* sticky rail */}</aside>
    <div className="max-w-[760px]">{/* body */}</div>
</div>
```

### After
```tsx
// src/app/blog/[slug]/page.server.tsx
<div className="mx-auto w-[92%] max-w-[760px] pb-6">
    <PostBreadcrumb crumbs={crumbs} />
</div>

<header className="mx-auto w-[92%] max-w-[760px]">
    {/* title, excerpt, meta — directly, no ml offset */}
</header>

{coverSrc ? (
    <div className="mx-auto mt-10 w-[92%] max-w-[760px]">
        {/* cover */}
    </div>
) : null}

<div className="mx-auto mt-10 w-[92%] max-w-[1260px] lg:grid lg:grid-cols-[220px_minmax(0,760px)_220px] lg:justify-center lg:gap-8">
    <aside className="hidden lg:block">{/* sticky rail */}</aside>
    <div>{/* body */}</div>
    <div className="hidden lg:block" aria-hidden="true" /> {/* right spacer */}
</div>
```

### Notes
- The right spacer is `aria-hidden` and purely visual — no content, no interactive children, so it does not affect the reading order or tab sequence.
- Mobile layout is unchanged: the grid only activates at `lg` and above, so below 1024px everything stacks in a single 760px column as before.
- No touches to the components inside the page — `TableOfContents`, `ShareRail`, `ShareBar`, `PostBody`, `AuthorBlock`, `RelatedPosts`, `ReadingProgress` all behave identically.
- Verification ask reissued: revisit `/blog/<slug>` on the dev server and confirm the breadcrumb, title, cover, and body now share a common center line with the page.

---

## [2026-04-15] #009 — Individual blog post page (`/blog/[slug]`)
- **Type:** feature
- **Scope:** `src/app/blog/[slug]/page.server.tsx` (new), `src/components/blog/PostBreadcrumb.tsx` (new), `src/components/blog/PostMeta.tsx` (new), `src/components/blog/PostBody.tsx` (new), `src/components/blog/TableOfContents.tsx` (new), `src/components/blog/ShareRail.tsx` (new), `src/components/blog/ShareBar.tsx` (new), `src/components/blog/AuthorBlock.tsx` (new), `src/components/blog/RelatedPosts.tsx` (new), `src/components/blog/ReadingProgress.tsx` (new), `src/lib/blog/slugify.ts` (new), `src/lib/blog/share.ts` (new), `src/lib/analytics.ts` (modified)
- **Why:** Phase 3 #009 — land the long-form reading experience. Without this, posts written in Studio have nowhere to render on the blog subdomain. The page is the single biggest conversion surface we'll have: it's what readers land on from search, shares, and newsletters, so the layout, typography, and share affordances all have to be right the first time.
- **Related:** BLOG_TASKS.md Phase 3 / #009; follows CHANGELOG #008 (/blog index) and #007 (Sanity client + queries).

### Summary
Adds the `/blog/[slug]` route plus nine supporting components and two helper modules. Layout locked with the user: asymmetric with a sticky left rail on desktop (ToC scroll-spy + vertical share column), centered ~760px body column, stacked single-column on mobile with an inline horizontal share bar. Author shown twice — compact byline beneath the title via `PostMeta`, full card beneath the body via `AuthorBlock`. Share channels: WhatsApp, LinkedIn, X/Twitter (all native web share intents), and Instagram (copy-to-clipboard + "paste into Instagram" toast, since IG blocks inbound web shares). Reading progress is a top 3px accent-orange bar with the same soft halo the hero uses — tracks scroll distance through the `<article>` element, not the whole page. `generateStaticParams` pre-renders every published slug at build time; `revalidate = 60` + the existing `blog:post:<slug>` cache tags handle ISR invalidation when a Sanity webhook fires. Portable Text serializers emit stable `id` attributes on h2/h3/h4 so the ToC's anchor links resolve. `BlogShareClick` event added to `analytics.ts`; post_view / scroll_depth / engagement events remain queued for #012.

### Before
```
(no /blog/[slug] route existed — clicking a post card from /blog 404'd)
```

### After
```tsx
// src/app/blog/[slug]/page.server.tsx  (NEW)
export default async function BlogPostPage({ params }: { params: PageParams }) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) notFound();
    const related = await getRelatedPosts(post._id, post.categories.map(c => c._id));
    // ... renders <ReadingProgress /> + Header + breadcrumb + title + cover +
    //     <aside><TableOfContents/><ShareRail/></aside> (sticky, lg+)
    //     + <article><ShareBar/><PostBody/><AuthorBlock/><RelatedPosts/></article>
    //     + Footer
}
```

```ts
// src/lib/analytics.ts (before)
BlogCardClicked: "blog_card_clicked",
BlogCategoryFilter: "blog_category_filter",
BlogSearch: "blog_search",

// src/lib/analytics.ts (after)
BlogCardClicked: "blog_card_clicked",
BlogCategoryFilter: "blog_category_filter",
BlogSearch: "blog_search",
BlogShareClick: "share_click",
```

### Notes
- **Verify:** start the dev server, publish a post with at least one h2 and one h3 in Studio (plus a cover image if possible), then visit `http://localhost:3001/blog/<slug>`. Expected: progress bar fills as you scroll; ToC highlights the current section; share buttons open WhatsApp/LinkedIn/X in a new tab; Instagram button copies the link and shows a "Copied — paste into Instagram" toast; related posts appear at the bottom if the post shares a category with another published post.
- **Mobile check:** below `lg` (1024px), the left rail is hidden and the horizontal `ShareBar` renders inline above the body. ToC is intentionally absent on mobile for v1.
- **Accessibility:** breadcrumb is a real `<nav aria-label="Breadcrumb">` with an `<ol>` and `aria-current="page"` on the last crumb. Share buttons all have `aria-label`s. Progress bar carries `role="progressbar"` with `aria-valuenow`.
- **Static export parity:** the file uses the `.server.tsx` extension, so the static cPanel build skips it entirely (matching the `BUILD_TARGET=static` rule in `next.config.mjs`). No regression to `npm run build:static`.
- **Follow-ups (tracked in BLOG_TASKS.md):** `/blog/category/[slug]` and `/blog/author/[slug]` listings land in #010. RSS + sitemap in #011. Full GA4 event schema (post_view, scroll_depth, engagement, card_impression) in #012.

## [2026-04-15] #008.2 — Swap GA4 measurement ID to `G-4MLTMPX7YX`
- **Type:** config
- **Scope:** `.env.local`, `CLAUDE.md`, `BLOG_TASKS.md`
- **Why:** The old ID (`G-QPGT0MW6T7`) pointed to a different GA4 property than the one the user is actually monitoring in the GA4 console. Deploying the site with the old ID would have sent every pageview and custom event to a property nobody is watching, and the GA4 "Test your website" tool would never light up green on the property that matters. Locking the correct ID now — before the first production deploy — prevents a day-one data loss window.
- **Related:** CHANGELOG #008, #008.1; user confirmation in-session.

### Summary
Single-value config swap: `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env.local` moved from `G-QPGT0MW6T7` to `G-4MLTMPX7YX`. The application code in `src/app/layout.tsx` is unchanged — it already reads the ID from the env var behind a conditional render, so the gtag script and `gtag('config', ...)` call pick up the new value automatically on the next server restart. Also mirrored the change into `CLAUDE.md` (locked decisions) and `BLOG_TASKS.md` (Phase 1 checklist) so future sessions don't re-litigate or regress.

### Before

```ini
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QPGT0MW6T7
```

```md
# CLAUDE.md — Project preferences / Blog project
- **Analytics:** GA4 measurement ID `G-QPGT0MW6T7`, shared with the main site. ...
```

```md
# BLOG_TASKS.md — Phase 1
- [x] Confirm existing GA4 measurement ID (`G-QPGT0MW6T7`) — shared with main site
```

### After

```ini
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-4MLTMPX7YX
```

```md
# CLAUDE.md — Project preferences / Blog project
- **Analytics:** GA4 measurement ID `G-4MLTMPX7YX`, shared with the main site (swapped from the original `G-QPGT0MW6T7` property on 2026-04-15 — see CHANGELOG #008.2). ...
```

```md
# BLOG_TASKS.md — Phase 1
- [x] Confirm existing GA4 measurement ID (`G-4MLTMPX7YX`, previously `G-QPGT0MW6T7` — swapped 2026-04-15) — shared with main site
```

### Notes
- **Restart the dev server** so Next picks up the new env value — Turbopack caches `.env.local` at process start, not per-request.
- The old property (`G-QPGT0MW6T7`) will stop receiving events once the new static build is deployed to cPanel. Consider archiving it in the GA4 admin to avoid confusion later.
- No source code change required; `src/app/layout.tsx` consumes `NEXT_PUBLIC_GA_MEASUREMENT_ID` from `process.env` with a conditional gtag render, so there's nothing in `src/**` to modify.
- Verification path: (a) restart `npm run dev:turbo`, (b) open DevTools → Network, reload any page, confirm a request to `https://www.googletagmanager.com/gtag/js?id=G-4MLTMPX7YX`. Then after deploying the static build to cPanel, re-run GA4's "Test your website" with `https://pockitengineers.com` — should flip from "wasn't detected" to detected.
- Post-deploy caveat: the "Data collection isn't active" banner in GA4 typically takes 24–48 hours and real traffic to clear, not just the initial tag detection.

---

## [2026-04-15] #008.1 — Coalesce empty array dereferences in GROQ; fix hero eyebrow animation
- **Type:** fix
- **Scope:** `src/lib/sanity/queries.ts`, `src/components/blog/BlogHero.tsx`
- **Why:** First real post published in Studio crashed `/blog` at runtime (`Cannot read properties of null (reading '0')` inside `FeaturedPost`) because the post had no categories assigned and Sanity GROQ returns `null` — not `[]` — for empty dereferenced array fields. Also: the hero's "Insights" eyebrow pill wasn't rendering because `whileInView` doesn't fire reliably for elements that mount already inside the viewport.
- **Related:** CHANGELOG #008; reported by user after publishing the first test post.

### Summary
Two bugs surfaced the moment real content hit the page. Fixed both at the right layer rather than papering over them in components.

1. **GROQ `coalesce` on every dereferenced array.** `POST_CARD_PROJECTION`, `POST_DETAIL_PROJECTION`, and `searchIndexQuery` now wrap `categories[]->{...}`, `tags[]->{...}`, `categories[]->title`, and `tags[]->title` in `coalesce(..., [])`. One fix at the data layer means every component (`FeaturedPost`, `PostCard`, `BlogIndexInteractive`'s filter + scorer) can keep trusting the TypeScript types — `readonly Category[]` means `[]` in the empty case, not `null`. No defensive `?.` sprinkled across the render tree.
2. **Hero eyebrow animation.** `BlogHero` was using `whileInView` + `viewport={{ margin: "-10% 0px" }}` for the eyebrow, title, and subtitle. Because the hero mounts already inside the viewport, the intersection observer's threshold sometimes never crossed, and the elements stayed at `opacity: 0` indefinitely. Switched to plain `initial` + `animate` with a staggered delay chain (eyebrow 0s, title 0.1s, subtitle 0.25s). Above-the-fold content should never depend on intersection events.

### Before

```ts
// src/lib/sanity/queries.ts — POST_CARD_PROJECTION
"categories": categories[]->{
    _id,
    title,
    slug
},
```

```ts
// src/lib/sanity/queries.ts — POST_DETAIL_PROJECTION
"categories": categories[]->{ _id, title, slug },
"tags": tags[]->{ _id, title, slug },
```

```ts
// src/lib/sanity/queries.ts — searchIndexQuery
"categoryTitles": categories[]->title,
"tagTitles": tags[]->title,
```

```tsx
// src/components/blog/BlogHero.tsx
const TEXT_VIEWPORT = { once: true, margin: "-10% 0px" } as const;

<motion.p
    initial={{ opacity: 0, y: -12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={TEXT_VIEWPORT}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="..."
>
    {eyebrow}
</motion.p>
<motion.h1 variants={titleVariants} initial="hidden" whileInView="visible" viewport={TEXT_VIEWPORT}>...</motion.h1>
<motion.p initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={TEXT_VIEWPORT}>{subtitle}</motion.p>
```

### After

```ts
// src/lib/sanity/queries.ts — POST_CARD_PROJECTION
"categories": coalesce(categories[]->{
    _id,
    title,
    slug
}, []),
```

```ts
// src/lib/sanity/queries.ts — POST_DETAIL_PROJECTION
"categories": coalesce(categories[]->{ _id, title, slug }, []),
"tags": coalesce(tags[]->{ _id, title, slug }, []),
```

```ts
// src/lib/sanity/queries.ts — searchIndexQuery
"categoryTitles": coalesce(categories[]->title, []),
"tagTitles": coalesce(tags[]->title, []),
```

```tsx
// src/components/blog/BlogHero.tsx
<motion.p
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="..."
>
    {eyebrow}
</motion.p>
<motion.h1
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.1 }}
>...</motion.h1>
<motion.p
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
>{subtitle}</motion.p>
```

### Notes
- `coalesce` only fires when the left side is `null` / `undefined`, so populated posts pay zero cost.
- The same null-array trap exists for any future dereferenced array field — if we add `relatedPosts[]->` or similar, wrap it in `coalesce(..., [])` as a default habit.
- The `author` field still dereferences to `null` if a post has no author assigned. That case isn't exercised yet — every post in Studio has an author set — but in #009 (post detail page) we should decide whether "no author" is a valid state or a schema validation error.
- Hero animation: the small delay chain (0 → 0.1 → 0.25) matches the landing page rhythm, so the two surfaces feel like siblings.
- Verification ask: reload `http://localhost:3001/blog` — expect (a) the page renders without crashing, (b) the "Insights" orange pill is visible above the headline on first paint, and (c) the published test post appears (as the featured hero if `featured: true`, otherwise in the grid).

---

## [2026-04-15] #008 — Blog index page + card/hero/filter components
- **Type:** feature
- **Scope:** `src/app/blog/page.server.tsx` (new), `src/components/blog/BlogHero.tsx` (new), `src/components/blog/PostCard.tsx` (new), `src/components/blog/FeaturedPost.tsx` (new), `src/components/blog/BlogEmptyState.tsx` (new), `src/components/blog/BlogIndexInteractive.tsx` (new), `src/lib/analytics.ts`
- **Why:** Stand up `/blog` as a working, filterable index so editors can publish and preview end-to-end. First user-facing surface of the blog project.
- **Related:** BLOG_TASKS.md Phase 3 (#008)

### Summary
Built the full `/blog` index page as a Next 16 server component that fetches featured post + all posts + categories + search index + site settings from Sanity in parallel, then composes a reusable hero block, a featured hero card, and a client-side filter + search grid. The interactive shell (`BlogIndexInteractive`) holds chip + query state in-memory and uses a small bespoke scorer (title × 10, excerpt × 4, category × 3, author × 2, tag × 2) over a lightweight search index — fast enough for our v1 corpus (~200 posts) and avoids a fuzzy-match library. All visuals inherit the existing theme tokens and Plus Jakarta Sans typography so the subdomain feels like one product with the marketing site. Extended the analytics constants with the three blog events we can fire from day one (`blog_card_clicked`, `blog_category_filter`, `blog_search`); the fuller event set (`post_view`, `scroll_depth`, `engagement`, `card_impression`, `share_click`) is deferred to #012.

### Before

```ts
// src/lib/analytics.ts
export const AnalyticsEvents = {
    ChatbotOpened: "chatbot_opened",
    ChatbotMessageSent: "chatbot_message_sent",
    CtaBookService: "cta_book_service",
    CtaDownloadApp: "cta_download_app",
    CtaBecomeTechnician: "cta_become_technician",
    FaqExpanded: "faq_expanded",
    TestimonialViewed: "testimonial_viewed",
    NavLinkClicked: "nav_link_clicked",
} as const;
```

```tsx
// src/app/blog/page.server.tsx
(file did not exist)
```

```tsx
// src/components/blog/BlogHero.tsx
(file did not exist)
```

```tsx
// src/components/blog/PostCard.tsx
(file did not exist)
```

```tsx
// src/components/blog/FeaturedPost.tsx
(file did not exist)
```

```tsx
// src/components/blog/BlogEmptyState.tsx
(file did not exist)
```

```tsx
// src/components/blog/BlogIndexInteractive.tsx
(file did not exist)
```

### After

```ts
// src/lib/analytics.ts
export const AnalyticsEvents = {
    ChatbotOpened: "chatbot_opened",
    ChatbotMessageSent: "chatbot_message_sent",
    CtaBookService: "cta_book_service",
    CtaDownloadApp: "cta_download_app",
    CtaBecomeTechnician: "cta_become_technician",
    FaqExpanded: "faq_expanded",
    TestimonialViewed: "testimonial_viewed",
    NavLinkClicked: "nav_link_clicked",

    // Blog — minimal set landed with #008. Full blog event schema
    // (post_view, scroll_depth, engagement, card_impression, share_click)
    // lands in #012.
    BlogCardClicked: "blog_card_clicked",
    BlogCategoryFilter: "blog_category_filter",
    BlogSearch: "blog_search",
} as const;
```

```tsx
// src/app/blog/page.server.tsx
export default async function BlogIndexPage() {
    const [featured, posts, categories, searchIndex, settings] =
        await Promise.all([
            getFeaturedPost(),
            getAllPosts(),
            getAllCategories(),
            getSearchIndex(),
            getSiteSettings(),
        ]);

    const gridPosts = featured
        ? posts.filter((p) => p._id !== featured._id)
        : posts;

    return (
        <>
            <ThemeSync />
            <main className="relative min-h-screen app-scrollbar overflow-y-auto overflow-x-hidden">
                <Header />
                <BlogHero
                    eyebrow={settings?.blogHeroEyebrow ?? DEFAULT_EYEBROW}
                    title={settings?.blogHeroTitle ?? DEFAULT_TITLE}
                    subtitle={settings?.blogHeroSubtitle ?? DEFAULT_SUBTITLE}
                />
                {featured ? (
                    <section className="pt-10 sm:pt-12 lg:pt-14">
                        <FeaturedPost post={featured} />
                    </section>
                ) : null}
                <BlogIndexInteractive
                    posts={gridPosts}
                    categories={categories}
                    searchIndex={searchIndex}
                />
                <Footer />
            </main>
        </>
    );
}
```

```tsx
// src/components/blog/BlogHero.tsx
export default function BlogHero({ eyebrow, title, subtitle }: BlogHeroProps) {
    return (
        <section className="pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16 lg:pb-20 ...">
            {/* accent-glow radial, matches /about hero */}
            <div className="relative mx-auto w-[92%] max-w-5xl text-center">
                <motion.p>{eyebrow}</motion.p>
                <motion.h1 variants={titleVariants}>{title}</motion.h1>
                {subtitle ? <motion.p>{subtitle}</motion.p> : null}
            </div>
        </section>
    );
}
```

```tsx
// src/components/blog/PostCard.tsx
export default function PostCard({ post, surface = "index" }: PostCardProps) {
    // cover image (720x420 crop via urlFor), primary category chip,
    // title (hover -> accent), line-clamp-3 excerpt, author + date +
    // reading-time row. Fires BlogCardClicked with surface on link click.
}
```

```tsx
// src/components/blog/FeaturedPost.tsx
export default function FeaturedPost({ post }: FeaturedPostProps) {
    // 1400x900 cover, priority, lg:grid-cols-[1.1fr_1fr] split layout,
    // "Featured" + category chips, 5xl headline, "Read the full story"
    // CTA. Fires BlogCardClicked with surface="featured".
}
```

```tsx
// src/components/blog/BlogEmptyState.tsx
export default function BlogEmptyState({ title, body }: BlogEmptyStateProps) {
    // Pure server component. Dashed-border card, search-icon glyph,
    // headline + optional body. Used for day-one state AND for the
    // "no results" state inside BlogIndexInteractive.
}
```

```tsx
// src/components/blog/BlogIndexInteractive.tsx
function scorePost(query, post, index): number | null {
    if (query.length === 0) return 0;
    const q = query.toLowerCase();
    let score = 0;
    if (post.title.toLowerCase().includes(q)) score += 10;
    if (post.excerpt?.toLowerCase().includes(q)) score += 4;
    if (post.author.name.toLowerCase().includes(q)) score += 2;
    for (const cat of post.categories) {
        if (cat.title.toLowerCase().includes(q)) score += 3;
    }
    if (index) {
        for (const tag of index.tagTitles) {
            if (tag.toLowerCase().includes(q)) score += 2;
        }
    }
    return score > 0 ? score : null;
}
// Shell: chip row (categories + "All") + search input + responsive grid
// wrapped in AnimatePresence keyed by `${categoryId}-${query}` so the
// grid fades when filters change.
```

### Notes
- `.server.tsx` extension keeps the route out of the static cPanel export; it only registers when `BUILD_TARGET=server` (same gate we use for `/studio`).
- Featured post is stripped from the grid list to avoid showing the same card twice.
- Analytics for filter + search are throttled to meaningful commits: `BlogCategoryFilter` fires on chip click, `BlogSearch` fires on input blur when the query is non-empty. Keystroke-level firing would spam GA4.
- `PostCardData` is the light projection from #007 — no Portable Text body — so the index payload stays small even at 200 posts.
- Post links point to `/blog/[slug]`; that route lands in #009 and will 404 until then (expected).
- Verification ask: run `npm run dev:turbo`, visit `http://localhost:3001/blog` — expect the hero block, "No posts yet" empty state (or posts if any published), a working chip filter, and search that narrows results live. Once at least one post is published and one is marked `featured`, confirm the featured hero appears above the grid and is not duplicated inside the grid.

---

## [2026-04-15] #007 — Sanity data layer: client, image builder, typed GROQ queries

- **Type:** feature
- **Scope:** `src/lib/sanity/env.ts` (new), `src/lib/sanity/types.ts` (new), `src/lib/sanity/client.ts` (new), `src/lib/sanity/image.ts` (new), `src/lib/sanity/queries.ts` (new), `src/lib/sanity/index.ts` (new)
- **Why:** The upcoming blog pages (#008+) need a single, typed, cacheable entry point to read content from Sanity. Scattered `createClient` / `fetch` calls across /blog/** would duplicate config, leak tokens, and fork the GROQ projections away from the TypeScript types. This lands the whole data layer in one folder so every page just says `import { getAllPosts, urlFor } from "@/lib/sanity"`.
- **Related:** CHANGELOG #004, #005, #006; BLOG_TASKS.md Phase 2 (#007)

### Summary

Six new files under `src/lib/sanity/`. `env.ts` centralizes project ID / dataset / API version / token lookup so no other file reads `process.env` directly. `types.ts` mirrors the GROQ projections as TypeScript shapes (`PostCardData`, `PostDetail`, `Author`, `Category`, `Tag`, `SearchIndexEntry`, `SiteSettings`). `client.ts` exports a public CDN client plus factories for an authenticated client and a preview (draft-reading) client. `image.ts` wraps `@sanity/image-url` for cover images, Portable Text inline images, and OG tags. `queries.ts` holds every GROQ string we need for v1 — index listing, single post, related posts, by-category, by-author, slug lists (for `generateStaticParams`), categories, search index, site settings — each paired with a typed fetcher that wires Next's ISR tags (`blog:index`, `blog:post:<slug>`, `blog:taxonomy`, `blog:settings`) so the webhook path in #011/#014 can revalidate precisely. `index.ts` is a barrel export.

### Before

```
src/lib/
    analytics.ts    // unchanged
```

### After

```
src/lib/
    analytics.ts
    sanity/
        env.ts          // projectId, dataset, apiVersion, token helpers
        types.ts        // PostCardData, PostDetail, Author, Category, Tag,
                        // SearchIndexEntry, SiteSettings, BlogImage, Slug
        client.ts       // client (public CDN), authenticatedClient(),
                        //   previewClient()
        image.ts        // urlFor(), urlForOG()
        queries.ts      // GROQ strings + typed fetchers
        index.ts        // barrel: export * from every file above
```

### Before

```ts
// src/lib/sanity/** — did not exist
```

### After (abridged — see files for full context)

```ts
// src/lib/sanity/client.ts
import { createClient, type SanityClient } from "next-sanity";
import { apiVersion, dataset, projectId, requireReadToken } from "./env";

export const client: SanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    perspective: "published",
});

export function previewClient(): SanityClient {
    return createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        perspective: "drafts",
        token: requireReadToken(),
    });
}
```

```ts
// src/lib/sanity/queries.ts (shape only)
export async function getAllPosts(): Promise<PostCardData[]> {
    return client.fetch<PostCardData[]>(indexPageQuery, {}, {
        next: { revalidate: 60, tags: ["blog:index"] },
    });
}
// plus getFeaturedPost, getPostBySlug, getRelatedPosts,
// getPostsByCategory, getPostsByAuthor, getAllPostSlugs,
// getAllCategorySlugs, getAllAuthorSlugs, getAllCategories,
// getSearchIndex, getSiteSettings.
```

### Notes

- **Why two projections (`PostCardData` / `PostDetail`)?** Index pages fetch ~dozens of posts at a time — pulling the full Portable Text body for each would blow up the payload. `PostCardData` is the lightweight shape used by cards; `PostDetail` extends it with body, tags, full author bio, and SEO fields, used only on the post page itself.
- **Reading time is computed in GROQ** via `round(length(pt::text(body)) / 5 / 200) + 1`. `pt::text` flattens Portable Text blocks to plain text, divide by ~5 chars/word, divide by 200 wpm. Keeps the calculation server-side and CDN-cached; no client-side `.map` over blocks.
- **Draft filter is belt-and-braces.** Both `perspective: "published"` on the client AND `!(_id in path("drafts.**"))` in every query. Either alone would do the job; running both means a misconfigured client still can't leak drafts.
- **Image builder uses `ReturnType<typeof builder.image>`** instead of importing `ImageUrlBuilder` from `@sanity/image-url/lib/types/builder`. That deep path has shifted between majors; derivation is stable.
- **`SANITY_API_READ_TOKEN` is server-only** — no `NEXT_PUBLIC_` prefix. The public `client` export runs unauthenticated against the CDN; the authenticated variants are lazy factories that only read the token on first call, so a missing token doesn't break module load for the common (unauthenticated) path.
- **Revalidation tags were chosen to match the webhook wiring planned for #014.** When Sanity fires a webhook on any post publish, the Vercel handler will call `revalidateTag("blog:index")` and `revalidateTag(`blog:post:${slug}`)`. Taxonomy changes hit `"blog:taxonomy"`. Settings hit `"blog:settings"`.
- Verification for the user: no visible surface yet — #008 wires these fetchers into the actual `/blog` page. For now, `npm run build:static` should still produce the same 7-route `out/` (lib code isn't imported by any page yet, so tree-shaking eliminates it), and `npm run build:server` should compile without type errors.


---

## [2026-04-15] #006 — Embed Sanity Studio at /studio, gated out of the static build

- **Type:** feature
- **Scope:** `next.config.mjs`, `src/app/studio/[[...tool]]/page.server.tsx` (new), `package.json`
- **Why:** We need editors to reach Studio at `blog.pockitengineers.com/studio` on Vercel, but the cPanel static export must never see `/studio` — Studio is a live editor that can't be pre-rendered, and the marketing site has no runtime to host it. Instead of suppressing the route with `generateStaticParams: () => []` (which still leaves Next crawling the folder), we use Next's `pageExtensions` to make the Studio page file literally invisible to the static build.
- **Related:** CHANGELOG #002, #004, #005; BLOG_TASKS.md Phase 2 (#006)

### Summary

Three changes land together: (1) `next.config.mjs` now conditionally registers `server.tsx`/`server.ts` as route file extensions — only when `BUILD_TARGET=server`. (2) A new `src/app/studio/[[...tool]]/page.server.tsx` mounts `NextStudio` with the root `sanity.config.ts`; because of its `.server.tsx` extension it's recognized as a page on Vercel and ignored by the cPanel export. (3) Dev scripts in `package.json` default to `BUILD_TARGET=server` so `npm run dev` actually serves `/studio` locally — otherwise dev would inherit the static default and 404 the route.

### Before

```js
// next.config.mjs — before #006
const nextConfig = {
    reactStrictMode: process.env.NODE_ENV === "production",
    ...(isStatic ? { output: "export" } : {}),
    images: isStatic ? { unoptimized: true } : { remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }] },
    // no pageExtensions override
};
```

### After

```js
// next.config.mjs — after #006
const nextConfig = {
    reactStrictMode: process.env.NODE_ENV === "production",
    ...(isStatic ? { output: "export" } : {}),
    images: isStatic ? { unoptimized: true } : { remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }] },

    // Default pageExtensions are ['tsx','ts','jsx','js']. We extend that
    // set with `server.tsx` / `server.ts` ONLY in the server build. Files
    // named `page.server.tsx` become real routes on Vercel but are
    // invisible to the static cPanel build.
    pageExtensions: isStatic
        ? ["tsx", "ts", "jsx", "js"]
        : ["server.tsx", "server.ts", "tsx", "ts", "jsx", "js"],
};
```

### Before

```
src/app/studio/** — did not exist
```

### After

```tsx
// src/app/studio/[[...tool]]/page.server.tsx — new file
"use client";

import { NextStudio } from "next-sanity/studio";

import config from "../../../../sanity.config";

export default function StudioPage() {
    return <NextStudio config={config} />;
}
```

### Before

```json
// package.json — dev scripts before #006
"dev": "next dev --webpack",
"dev:turbo": "next dev",
"dev:low": "cross-env NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
```

### After

```json
// package.json — dev scripts after #006
"dev": "cross-env BUILD_TARGET=server next dev --webpack",
"dev:turbo": "cross-env BUILD_TARGET=server next dev",
"dev:low": "cross-env BUILD_TARGET=server NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
```

### Notes

- Why `page.server.tsx` and not `page.tsx`? With `pageExtensions = ["tsx","ts","jsx","js"]` in the static build, a file literally named `page.server.tsx` is not recognized as a page at all — Next sees the `[[...tool]]` folder as empty. This is cleaner than conditionally rendering an empty component or tricking the router with `notFound()`.
- The catch-all `[[...tool]]` segment is Studio's requirement: Studio owns its own internal routing inside `/studio` (Desk pane, Vision, presentation tool), so Next needs to hand it any sub-path without matching them itself.
- `"use client"` is required because `NextStudio` mounts the full Studio runtime, which is client-only. Studio cannot be a server component, cannot be pre-rendered, and cannot run during `next build` in export mode.
- Dev-mode behavior: `npm run dev` now boots the server target by default. If you specifically want to reproduce a cPanel-only scenario locally, use `cross-env BUILD_TARGET=static npm run dev:turbo` or just run the build (`npm run build:static`). We don't ship a `dev:static` alias because ~95% of day-to-day dev wants the server target (blog + Studio).
- Singleton enforcement for `siteSettings` is still outstanding — planned for the Studio structure customization pass alongside any future UI tweaks. Deferring it here kept this entry focused on "Studio exists and works."
- Verification the user should run: `npm run dev` (or `dev:turbo`), visit `http://localhost:3000/studio` (port may vary), confirm Studio UI loads and log in with Sanity credentials. Then `npm run build:static` must still produce the same 7-route `out/` — no `/studio` folder, no Studio runtime in the bundle.


---

## [2026-04-15] #005 — Sanity dep versions: align with Next 16 (correct #004's ranges)

- **Type:** fix
- **Scope:** `package.json`
- **Why:** The version ranges I wrote in #004 were stale. `next-sanity@^9.8.38` only peer-accepts `next@^14.2 || ^15.0.0-0`, so `npm install` against Next 16.2.3 failed with `ERESOLVE unable to resolve dependency tree`. Verified the actual latest versions via `npm view <pkg>@latest` and their peerDependency ranges — Sanity's Next-16-compatible line is `next-sanity@12.x` which in turn requires `sanity@^5.20.0`, `@sanity/client@^7.20.0`, and React 19.2.3+. Bumped every Sanity package to its true current major so the tree resolves cleanly.
- **Related:** CHANGELOG #004, BLOG_TASKS.md — Phase 2

### Summary

Replaced every dep range added in #004 with the actual current major. No file structure changes — `sanity.config.ts` and the five schema files written in #004 are API-compatible with `sanity@5` and `next-sanity@12` (they use `defineConfig`, `defineType`, `defineField`, `structureTool`, `visionTool`, all of which are stable across v3→v5). So this is a pure version-range correction: what we wrote still works, we just need the packages to actually install.

### Before

```json
// package.json — dependencies (from #004, broken)
"@portabletext/react": "^3.2.0",
"@sanity/client": "^6.22.5",
"@sanity/image-url": "^1.1.0",
"@sanity/vision": "^3.68.3",
"groq": "^3.68.3",
"next-sanity": "^9.8.38",
"react": "^19.2.0",
"react-dom": "^19.2.0",
"sanity": "^3.68.3",
"styled-components": "^6.1.13"
```

### After

```json
// package.json — dependencies (aligned with Next 16)
"@portabletext/react": "^6.0.3",
"@sanity/client": "^7.21.0",
"@sanity/image-url": "^2.1.1",
"@sanity/vision": "^5.20.0",
"groq": "^5.20.0",
"next-sanity": "^12.2.2",
"react": "^19.2.3",
"react-dom": "^19.2.3",
"sanity": "^5.20.0",
"styled-components": "^6.4.0"
```

### Notes

- **Peer-dep chain that drove the versions** (verified via `npm view <pkg>@latest peerDependencies`):
  - `next-sanity@12.2.2` → `next: ^16.0.0-0`, `react: ^19.2.3`, `sanity: ^5.20.0`, `@sanity/client: ^7.20.0`, `styled-components: ^6.1`
  - `sanity@5.20.0` → `react: ^19.2.2`, `react-dom: ^19.2.2`, `styled-components: ^6.1.15`
  - `@sanity/vision@5.20.0` → `sanity: ^4.0.0-0 || ^5.0.0-0`
  - `@portabletext/react@6.0.3` → `react: ^18.2 || ^19`
  - All compatible — no further conflicts expected.
- **Schema code unaffected.** `sanity@3` → `sanity@5` renamed a few internals but kept `defineConfig`, `defineType`, `defineField`, `structureTool`, `visionTool` stable. The files under `sanity/schemas/` (written in #004) don't need changes.
- **Verification step, now correct:**
  1. `npm install` — should now resolve cleanly.
  2. `npm run build:static` — marketing-only routes, same output as before.

### Follow-ups

- None if install succeeds. If another peer conflict surfaces, log a #006 correction — don't patch silently.

---

## [2026-04-15] #004 — Sanity CMS scaffolding: deps, config, schemas

- **Type:** feature
- **Scope:** `package.json`, `sanity.config.ts` (new), `sanity/schemas/*.ts` (new — 6 files)
- **Why:** First step of Phase 2 — bring Sanity into the repo as a CMS foundation. Ships the dependency set, the root `sanity.config.ts` (points at the locked `pg938kpo` / `production` project), and the five content schemas (`post`, `author`, `category`, `tag`, `siteSettings`) that the Studio and the blog pages will both read from. Nothing is wired into a Next route yet — that's #005 (embedded Studio) and #006 (client + queries).
- **Related:** BLOG_TASKS.md — Phase 2 (Sanity integration)

### Summary

Added seven runtime dependencies (`sanity`, `next-sanity`, `@sanity/client`, `@sanity/image-url`, `@sanity/vision`, `@portabletext/react`, `groq`) plus `styled-components` (required peer for Sanity Studio's UI). Created `sanity.config.ts` at the repo root — reads project/dataset from env vars with hardcoded fallbacks matching the locked decisions, mounts at `basePath: "/studio"`, wires the Structure tool and Vision (GROQ playground) plugins, and pulls schemas from `./sanity/schemas`. Wrote five schemas: `post` (the blog document — title, slug, excerpt, Portable Text body with images and callouts, author/category/tag references, cover image, featured flag, publishedAt, SEO object), `author` (name, slug, role, bio, avatar, socials), `category` (title, slug, description, display order), `tag` (title, slug — deliberately minimal), and `siteSettings` (singleton for hero copy, RSS metadata, default OG image, footer disclaimer). Schemas expose `groups` and `preview` so the Studio UI is usable from day one.

### Before

```json
// package.json — dependencies (before)
"dependencies": {
    "firebase": "^12.11.0",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.6.0",
    "next": "^16.2.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
}
```

```
// sanity.config.ts — did not exist
// sanity/schemas/*.ts — did not exist
```

### After

```json
// package.json — dependencies (after)
"dependencies": {
    "@portabletext/react": "^3.2.0",
    "@sanity/client": "^6.22.5",
    "@sanity/image-url": "^1.1.0",
    "@sanity/vision": "^3.68.3",
    "firebase": "^12.11.0",
    "framer-motion": "^12.38.0",
    "groq": "^3.68.3",
    "lucide-react": "^1.6.0",
    "next": "^16.2.3",
    "next-sanity": "^9.8.38",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "sanity": "^3.68.3",
    "styled-components": "^6.1.13"
}
```

```ts
// sanity.config.ts (new)
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "pg938kpo";
const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET    ?? "production";

export default defineConfig({
    name: "pockit-engineers-blog",
    title: "PockIT Engineers — Blog",
    projectId,
    dataset,
    basePath: "/studio",
    plugins: [structureTool(), visionTool()],
    schema: { types: schemaTypes },
});
```

```ts
// sanity/schemas/index.ts (new)
import { post } from "./post";
import { author } from "./author";
import { category } from "./category";
import { tag } from "./tag";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [post, author, category, tag, siteSettings];
```

```ts
// sanity/schemas/post.ts (new — excerpt)
export const post = defineType({
    name: "post",
    title: "Post",
    type: "document",
    groups: [ /* content, taxonomy, media, seo */ ],
    fields: [
        /* title, slug, excerpt, body (Portable Text),
           author (ref), categories[] (refs), tags[] (refs),
           coverImage, featured, publishedAt,
           seo: { metaTitle, metaDescription, ogImage, noIndex } */
    ],
    /* preview + orderings defined */
});
```

```ts
// sanity/schemas/author.ts (new)
// name, slug, role, bio, avatar, socials{ website, linkedin, twitter }

// sanity/schemas/category.ts (new)
// title, slug, description, order (for chip display)

// sanity/schemas/tag.ts (new)
// title, slug

// sanity/schemas/siteSettings.ts (new — singleton)
// blogHeroEyebrow, blogHeroTitle, blogHeroSubtitle,
// rssTitle, rssDescription, defaultOgImage, footerDisclaimer
```

### Notes

- **Install step required.** Run `npm install` to pull in the new packages before the next build. Expect ~70 MB of install; `sanity` brings in its own tooling.
- **No routes touched.** `sanity.config.ts` exists at the repo root but isn't imported by any Next page yet, so both `build:static` and `build:server` should succeed. The Studio goes live in #005; the blog pages start reading these schemas in #007.
- **`styled-components` is required**, not optional — Sanity Studio's UI depends on it. Listed as a direct dependency so the version is explicit.
- **Singleton enforcement for `siteSettings`** is deferred to #005 (where we customize Studio's structure tool to hide the "Create new" action for that type). Until then editors could theoretically create two — we'll just use the most recent in queries and harden this in #005.
- **Fallback hardcoding** of `pg938kpo` / `production` inside `sanity.config.ts` is intentional belt-and-suspenders in case `.env.local` is missing in a dev checkout. The Vercel build will read real env vars and override these.
- **Verification to run next:**
  1. `npm install`
  2. `npm run build:static` — should still pass (marketing routes unchanged).
  3. `npm run build:server` — will also pass at this point (no `/studio` or `/blog` routes yet, just the marketing pages plus the schemas loaded via imports elsewhere... actually not even that — `sanity.config.ts` is only read by `@sanity/cli` and the Studio component in #005, so it should be tree-shaken entirely from both builds today).

### Follow-ups

- **#005** — Embedded Studio at `src/app/studio/[[...tool]]/page.tsx` + structure customization to make `siteSettings` a true singleton. Must be excluded from the static export (route gated on `BUILD_TARGET`).
- **#006** — Sanity client, image URL builder, GROQ queries, TS types matching these schemas (so pages can import strongly-typed fetches).

---

## [2026-04-14] #003 — Cross-shell build scripts (Windows PowerShell fix)

- **Type:** fix
- **Scope:** `package.json`
- **Why:** The inline env-var syntax introduced in #002 (`BUILD_TARGET=static next build`) is Unix-only. On Windows PowerShell the user saw `'BUILD_TARGET' is not recognized as an internal or external command`. The build scripts must work on the user's actual shell, not just bash/zsh.
- **Related:** BLOG_TASKS.md — Phase 1 verification unblocker

### Summary

Added `cross-env` as a devDependency and prefixed every script that sets an environment variable with it (`build`, `build:static`, `build:server`, `dev:low`). `cross-env` transparently handles env-var assignment across PowerShell, cmd, bash, zsh, git-bash, WSL, and CI runners, so the same `package.json` works for anyone on the team regardless of OS. Also replaced the two Unix-only shell primitives in `zip:cpanel` (`rm -f` → a portable inline Node one-liner; `zip` → `bestzip` via `npx`) so the cPanel packaging step works on Windows too.

### Before

```json
// package.json — scripts
"scripts": {
    "dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "dev:low": "NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
    "build": "BUILD_TARGET=static next build",
    "build:static": "BUILD_TARGET=static next build",
    "build:server": "BUILD_TARGET=server next build",
    "zip:cpanel": "rm -f public/pockit-cpanel-site.zip && npm run build:static && cd out && zip -r ../public/pockit-cpanel-site.zip . -x \"*.DS_Store\" -x \"**/.DS_Store\"",
    "start": "next start",
    "preview:static": "npx --yes serve@latest out -l 3000",
    "lint": "eslint ."
}
```

```json
// package.json — devDependencies
"devDependencies": {
    "@types/node": "^24.10.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "eslint": "^9.39.0",
    "eslint-config-next": "16.2.1",
    "postcss": "^8.5.8",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.0"
}
```

### After

```json
// package.json — scripts
"scripts": {
    "dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "dev:low": "cross-env NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
    "build": "cross-env BUILD_TARGET=static next build",
    "build:static": "cross-env BUILD_TARGET=static next build",
    "build:server": "cross-env BUILD_TARGET=server next build",
    "zip:cpanel": "npm run build:static && node -e \"const fs=require('fs'),p='public/pockit-cpanel-site.zip';if(fs.existsSync(p))fs.unlinkSync(p)\" && cd out && npx --yes bestzip ../public/pockit-cpanel-site.zip *",
    "start": "next start",
    "preview:static": "npx --yes serve@latest out -l 3000",
    "lint": "eslint ."
}
```

```json
// package.json — devDependencies
"devDependencies": {
    "@types/node": "^24.10.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "cross-env": "^7.0.3",
    "eslint": "^9.39.0",
    "eslint-config-next": "16.2.1",
    "postcss": "^8.5.8",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.0"
}
```

### Notes

- **Install step required before retrying the build.** Run `npm install` once to pull in `cross-env` (and `bestzip` will be fetched on-demand by `npx` the first time `zip:cpanel` runs).
- **Behavior unchanged on Unix.** `cross-env` is a transparent wrapper — on bash/zsh the final command executed is identical to before #003.
- **`zip:cpanel` is now fully portable.** No `rm`, no `zip` binary needed. The `out/` → `public/pockit-cpanel-site.zip` output is byte-equivalent for the cPanel upload.
- **Verification to run next:** on PowerShell, `npm run build:static` should now complete cleanly and produce `out/`.

### Follow-ups

- None. #004 is the next forward-motion entry (embedded Sanity Studio), pending #003 verification + #002 retroactive verification on the now-fixed command.

---

## [2026-04-14] #002 — Dual-target build: static (cPanel) vs server (Vercel)

- **Type:** config
- **Scope:** `next.config.mjs`, `package.json`
- **Why:** The existing static export (`output: "export"`) is incompatible with the blog (needs Sanity fetch at request-time on Vercel) and the embedded Sanity Studio (authenticated client app, can't be statically exported). A single Next.js config can't do both modes at once, so we branch on a `BUILD_TARGET` env var. This is the foundation that lets cPanel and Vercel coexist cleanly from one repo.
- **Related:** BLOG_TASKS.md — Phase 1 (Build configuration)

### Summary

Introduced a `BUILD_TARGET` env var that `next.config.mjs` reads to pick between the existing static export (for cPanel) and a full server build (for Vercel). Default is `static` so any script or CI that calls plain `next build` continues to produce the same `out/` it did yesterday. The server branch adds `cdn.sanity.io` to `images.remotePatterns` so blog imagery managed in Studio will render through Next.js's image optimizer on Vercel. Added two explicit npm scripts (`build:static`, `build:server`) and retargeted `zip:cpanel` to call `build:static` directly so intent is visible in the script itself.

### Before

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: process.env.NODE_ENV === "production",
    output: "export",
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
```

```json
// package.json — scripts
"scripts": {
    "dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "dev:low": "NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
    "build": "next build",
    "zip:cpanel": "rm -f public/pockit-cpanel-site.zip && npm run build && cd out && zip -r ../public/pockit-cpanel-site.zip . -x \"*.DS_Store\" -x \"**/.DS_Store\"",
    "start": "next start",
    "preview:static": "npx --yes serve@latest out -l 3000",
    "lint": "eslint ."
}
```

### After

```js
// next.config.mjs
/** @type {import('next').NextConfig} */

const BUILD_TARGET = process.env.BUILD_TARGET ?? "static";
const isStatic = BUILD_TARGET === "static";

const nextConfig = {
    reactStrictMode: process.env.NODE_ENV === "production",

    // Static HTML export branch — enabled only when BUILD_TARGET=static.
    ...(isStatic ? { output: "export" } : {}),

    images: isStatic
        ? { unoptimized: true }  // required for output: "export"
        : {
              // Server build (Vercel): allow Sanity CDN as an image source.
              remotePatterns: [
                  { protocol: "https", hostname: "cdn.sanity.io" },
              ],
          },
};

export default nextConfig;
```

```json
// package.json — scripts
"scripts": {
    "dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "dev:low": "NODE_OPTIONS=--max-old-space-size=2048 next dev --webpack",
    "build": "BUILD_TARGET=static next build",
    "build:static": "BUILD_TARGET=static next build",
    "build:server": "BUILD_TARGET=server next build",
    "zip:cpanel": "rm -f public/pockit-cpanel-site.zip && npm run build:static && cd out && zip -r ../public/pockit-cpanel-site.zip . -x \"*.DS_Store\" -x \"**/.DS_Store\"",
    "start": "next start",
    "preview:static": "npx --yes serve@latest out -l 3000",
    "lint": "eslint ."
}
```

### Notes

- **No behavior change for the current cPanel workflow.** `npm run build`, `npm run build:static`, and `npm run zip:cpanel` all produce the same `out/` as before — they just set `BUILD_TARGET=static` explicitly.
- **Env-var syntax** uses the Unix-style inline form to match the existing `dev:low` script (`NODE_OPTIONS=... next dev`). This will continue to work on bash / zsh / git-bash / WSL. If Windows cmd becomes a target later we'd add `cross-env` as a devDependency.
- **`build:server` won't run successfully yet** — it just builds what's in the repo, which is marketing-only at this point. It becomes meaningful in #003+ when Sanity, Studio, and blog routes land. Running it now should succeed and output a `.next/` server bundle with just the marketing pages.
- **Verification suggested:** run `npm run build:static` (or `npm run build`) on the dev server, confirm `out/` is produced and the marketing pages are identical to the prior build. Optionally diff the pre-change `out/` against the post-change one — they should match.

### Follow-ups

- No direct follow-ups. The next entry (#003) adds Sanity dependencies, `sanity.config.ts`, and the schemas under `sanity/schemas/`.

---

## [2026-04-14] #001 — Lock project preferences, add blog task tracker

- **Type:** docs
- **Scope:** `CLAUDE.md`, `BLOG_TASKS.md` (new)
- **Why:** Capture every decision made during planning in one durable place so future sessions don't re-ask, and introduce a living phase-by-phase tracker for the blog build so progress is visible at a glance without reading diffs.
- **Related:** Blog project kickoff (Sanity + Vercel hybrid)

### Summary

Expanded `CLAUDE.md` with three new behavioral rules (interview before changing, use the right plugin/skill, keep docs updated) and a "Project preferences" section that records the locked blog decisions: Sanity project ID `pg938kpo`, dataset `production`, hybrid Option-B architecture (Vercel subdomain for blog, cPanel for marketing), inherit-existing-theme design direction, v1 feature scope, GA4 event/dimension list, and the environment variable names. Created `BLOG_TASKS.md` as the living work tracker paired with this changelog. No runtime code changed.

### Before

```md
// CLAUDE.md  (58 lines)
# Project rules for Claude

## 1. No patchwork fixes
## 2. Maintain `CHANGELOG.md` on every code change
## 3. Read `CHANGELOG.md` before editing
```

```md
// BLOG_TASKS.md
(file does not exist)
```

### After

```md
// CLAUDE.md  (107 lines)
# Project rules for Claude

## 1. No patchwork fixes   (now includes: always interview the user before changing)
## 2. Maintain `CHANGELOG.md` on every code change
## 3. Read `CHANGELOG.md` before editing
## 4. Use the right plugin/skill for each task
## 5. Keep documentation updated after each pass
## 6. Track work-in-progress in `BLOG_TASKS.md`

# Project preferences (locked decisions)

## Blog project (introduced April 2026)
- CMS: Sanity (pg938kpo / production), Studio embedded at /studio
- Publish model: Hybrid (Option B) — blog on Vercel, marketing on cPanel
- Design: inherit existing theme; Stack shot is layout reference only
- v1 scope: index, post, category, tag, author, featured, related, search, RSS, sitemap
- Analytics: GA4 G-QPGT0MW6T7; events post_view, scroll_depth, engagement, card_impression, cta_click, share_click; dimensions post_slug, post_category, post_author
- Env vars: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_READ_TOKEN

## Build targets
- BUILD_TARGET=static → cPanel static export
- BUILD_TARGET=server → Vercel server build (includes blog + Studio)

## Testing expectations
- User tests on dev server; after each pass, give user a specific thing to click

## Open reminders
- Rotate Sanity API token before launch (tracked in BLOG_TASKS.md)
```

```md
// BLOG_TASKS.md  (new file)
# Blog project — task list

Phase 0 — Setup & decisions                     (all ticked)
Phase 1 — Build configuration                   (#002)
Phase 2 — Sanity integration                    (#003, #004, #005)
Phase 3 — Blog pages                            (#006, #007, #008, #009)
Phase 4 — Analytics                             (#010)
Phase 5 — Main-site integration                 (#011)
Phase 6 — Deploy                                (#012 + BLOG_DEPLOY.md + BLOG_EDITORS.md)
Phase 7 — Post-launch verification

## Reminders
[!] Rotate the Sanity API token before launch
Build parity across both targets
Changelog discipline
Doc upkeep after each phase
```

### Notes

- No runtime code was touched. This entry is pure project-meta / documentation.
- The Sanity read token is stored only in `.env.local` (gitignored). The post-launch rotation of that token is the #1 reminder in `BLOG_TASKS.md`.
- The next entry (#002) is the first entry that changes a build artifact: conditional `next.config.mjs` + new `build:static` / `build:server` npm scripts.

---

## [2026-04-14] #000 — Baseline snapshot

- **Type:** docs
- **Scope:** whole repository (no code changed)
- **Why:** Establish a starting point so future before/after diffs have a reference.
- **Related:** initial CHANGELOG.md creation

### Summary

This is the starting state of the repository at the moment the change log was introduced. No code was modified for this entry — it documents what exists today so subsequent entries can show meaningful before/after diffs against it.

### Repository at a glance

- **Project:** `pockit-engineers-mvp-v01` — PockIT Engineers marketing site.
- **Framework:** Next.js 16 (App Router) + React 19 + Tailwind CSS + Framer Motion + Lucide React.
- **Node:** `>=24` (see `.nvmrc` and `package.json#engines`).
- **Output mode:** `output: "export"` in `next.config.mjs` — produces a static site in `out/` for cPanel/S3/any static host.
- **Environment:** `.env.local` at root (not committed). Recognized variables:
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — toggles Google Analytics in `src/app/layout.tsx`.

### Current structure

**App Router (`src/app/`):**

- `layout.tsx` — root HTML shell, metadata, JSON-LD, theme bootstrap script, conditional GA tags.
- `page.tsx` — home page, mounts landing shell.
- `loading.tsx` — route loading boundary (returns `null`).
- `globals.css` — global styles and theme CSS variable tokens.
- `about/` — About Us page and layout.
- `become-a-technician/` — Join as a Technician page and layout.
- `expert/page.tsx` — legacy redirect to `/become-a-technician`.
- `privacy-policy/page.tsx`, `terms/page.tsx` — static legal pages.

**Landing components (`src/components/landing/`):**

`AppShell`, `Header`, `Hero`, `ServiceGrid`, `HowItWorks`, `PockITPromise`, `KPIStats`, `TestimonialsSection`, `TestimonialSlider`, `FAQ`, `DownloadBand`, `FloatingDownload`, `StickyBookCTA`, `Footer`, `ScrollProgress`, `SectionPill`, `ThemeSync`, `BrandLoader`.

**Expert components (`src/components/expert/`):** `ExpertHero.tsx` (full technician page).

**Chatbot (`src/components/chatbot/`):** `Chatbot.tsx`.

**Constants, hooks, services, lib:**

- `src/constants/copy.ts`, `src/constants/appStores.ts` — primary content source (landing copy, nav, technician page sections, FAQ items).
- `src/hooks/useBookServiceNav.ts`, `useIsMobile.ts`, `useScrollTop.ts`.
- `src/lib/analytics.ts` — `trackEvent()` wrapper around `window.gtag`, plus the `AnalyticsEvents` enum.
- `src/services/chatApiService.ts`, `chatbot.models.ts`, `firebaseAuth.helper.ts`.

### Build and deploy surface

- `npm run dev` — local dev (webpack).
- `npm run build` — production build → static export into `out/`.
- `npm run zip:cpanel` — rebuild and zip `out/` into `public/pockit-cpanel-site.zip` for cPanel upload.
- `npm run preview:static` — serve `out/` on port 3000 for smoke-testing the static bundle.
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`).

### Known ambient state at baseline

- Working tree has a large set of uncommitted modifications across `src/**` and config files (see `git status`). These are pre-existing and **not** introduced by Claude — future entries should only describe changes Claude makes from here forward.
- GA is **wired but dormant** by default: the `<script>` tags in `layout.tsx` only render when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, and `src/lib/analytics.ts#trackEvent` is a no-op unless `window.gtag` is present.
- `docs/CSS.md` exists alongside this file and covers styling conventions.

### Notes

- This entry is numbered `#000` to make it unambiguous as the origin. The next code change Claude makes will be `#001`.
- When an entry's before/after would be very large (e.g. a whole new file), it's fine to include a concise excerpt and link to the file path rather than pasting thousands of lines — but the entry must still make the intent of the change obvious.
