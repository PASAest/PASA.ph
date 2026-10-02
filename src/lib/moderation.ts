// Content rules from the group's "Limitations" section.
// This is a simple keyword filter for the prototype; a real launch would add admin review.

const HARSH_WORDS = [
  'putangina', 'tangina', 'puta', 'gago', 'gaga', 'bobo', 'tanga', 'ulol', 'tarantado', 'leche', 'bwisit',
  'pakyu', 'hayop ka', 'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'stupid', 'idiot', 'dumbass',
];

const FLIRTY_PHRASES = [
  'crush kita', 'ganda mo', 'pogi mo', 'sexy', 'hot mo', 'date tayo', 'baby ko', 'babe', 'jowa',
  'send pics', 'send pic', 'kiss', 'miss na kita', 'love you', 'iloveyou', 'i love you',
];

// Academic items with answer keys, exercises, practice sets or quizzes need admin approval.
const BANNED_ITEM_TERMS = [
  'answer key', 'answers', 'answer sheet', 'solution manual', 'solutions manual', 'solutions', 'exercise',
  'exercises', 'practice set', 'practice sets', 'quiz', 'quizzes', 'reviewer', 'test bank', 'leaked',
];

const normalize = (text: string) =>
  ` ${text.toLowerCase().replace(/[0@]/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/\$/g, 's').replace(/[^a-zñ\s]/g, ' ').replace(/\s+/g, ' ')} `;

const findTerm = (text: string, terms: string[]) => {
  const t = normalize(text);
  return terms.find((w) => t.includes(` ${w} `));
};

// Links are blocked so deals and payments stay inside PASA (meeting links on bookings are the one exception).
const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|ph|io|me|ly|gg|link|xyz|co|app|site|info|biz|to|tk)\b(\/\S*)?/i;

export type ModerationResult = { ok: true } | { ok: false; reason: string };

/** Checks chat messages, posts, comments, bios and reviews. */
export function checkText(text: string): ModerationResult {
  if (LINK.test(text)) {
    return { ok: false, reason: 'Links aren\'t allowed on PASA. Keep chats, deals and payments in the app.' };
  }
  if (findTerm(text, HARSH_WORDS)) {
    return { ok: false, reason: 'Your message has harsh or offensive words. Please keep PASA respectful.' };
  }
  if (findTerm(text, FLIRTY_PHRASES)) {
    return { ok: false, reason: 'PASA is for studying and trading only. Please keep messages professional.' };
  }
  return { ok: true };
}

export type ListingCheck = ModerationResult & { needsReview?: string };

/**
 * Checks a new Assets listing. Offensive words and links are blocked. Possible answer keys, exercises,
 * practice sets or quizzes aren't blocked outright: the listing goes to an admin for approval.
 */
export function checkListing(title: string, description: string): ListingCheck {
  const text = checkText(`${title} ${description}`);
  if (!text.ok) return text;
  const flagged = findTerm(`${title} ${description}`, BANNED_ITEM_TERMS);
  return flagged ? { ok: true, needsReview: `mentions "${flagged}"` } : { ok: true };
}
