// ── humanRequest.ts ───────────────────────────────────────────────────────────
// Spots, without any AI call, a customer TYPING that they want a person, or that they
// are complaining — in English, Hinglish, Hindi and Marathi. (CHANGELOG #135)
//
//   'person'    → treated exactly like the "Talk to a human" chip: the Call / WhatsApp /
//                 Email card is shown and the chat is flagged in Chatwoot (not a live chat).
//   'complaint' → flagged in Chatwoot for the team; chip.ai still answers.
//
// Patterns are deliberately narrow: a false "person" match costs the customer a bot
// answer, so only clear requests to speak to someone count.

export type HumanRequest = 'person' | 'complaint' | null;

const PERSON: RegExp[] = [
    // English
    /\b(talk|speak|chat|connect|transfer)\b[^.?!]{0,30}\b(human|person|agent|executive|representative|someone|somebody|real person|customer (care|support|service)|support team|your team)\b/i,
    /\b(human|live|real)\s+(agent|person|support|executive)\b/i,
    /\b(call me back|callback|call back)\b/i,
    /\bcustomer\s*care\b/i,
    // Hinglish
    /\b(insaan|insan|aadmi|admi|banda|bande|kisi|koi|agent|executive)\s+(se|say)\s+(baat|bat)/i,
    /\b(baat|bat)\s+(karni|karna|karao|karwao|karwa do|kara do)\b[^.?!]{0,20}\b(insaan|insan|aadmi|admi|agent|executive|kisi)\b/i,
    // Hindi
    /(इंसान|इन्सान|व्यक्ति|आदमी|किसी|एजेंट|कस्टमर\s*केयर)\s*से\s*बात/,
    // Marathi
    /(माणसा|माणूस|व्यक्ती|एजंट|कोणाशी|कोणाशीतरी)\S*\s*बोल/,
];

const COMPLAINT: RegExp[] = [
    /\b(complain|complaint|complaining|escalate|escalation|fraud|cheated|cheating|scam|worst|pathetic|consumer court|legal action|not satisfied|unsatisfied|dissatisfied)\b/i,
    /\bvery\s+(bad|poor)\s+(service|experience|response|reply)\b/i,
    /\b(unhappy|not happy|upset|disappointed|frustrated|angry)\b/i,
    /\b(shikayat|shikaayat|dhokha|bakwas|bekaar|bekar|naraz|naaraz|pareshan)\b/i,
    /(शिकायत|धोखा|बकवास|नाराज़|नाराज|परेशान|तक्रार|फसवणूक|नाराज)/,
];

export function detectHumanRequest(text: string): HumanRequest {
    const t = text.trim();
    if (!t) return null;
    if (PERSON.some(re => re.test(t))) return 'person';
    if (COMPLAINT.some(re => re.test(t))) return 'complaint';
    return null;
}
