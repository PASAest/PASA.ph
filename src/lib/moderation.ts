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

// Assets may only be books and calculators — no answer keys, exercises, practice sets or quizzes.
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

export type ModerationResult = { ok: true } | { ok: false; reason: string };

/** Checks chat messages, posts and comments. */
export function checkText(text: string): ModerationResult {
  if (findTerm(text, HARSH_WORDS)) {
    return { ok: false, reason: 'Your message has harsh or offensive words. Please keep PASA respectful.' };
  }
  if (findTerm(text, FLIRTY_PHRASES)) {
    return { ok: false, reason: 'PASA is for studying and trading only. Please keep messages professional.' };
  }
  return { ok: true };
}

/** Checks a new Assets listing against the books-and-calculators-only rule. */
export function checkListing(title: string, description: string): ModerationResult {
  const text = checkText(`${title} ${description}`);
  if (!text.ok) return text;
  const banned = findTerm(`${title} ${description}`, BANNED_ITEM_TERMS);
  if (banned) {
    return {
      ok: false,
      reason: `"${banned}" isn't allowed. Only books and calculators can be listed — no answer keys, exercises, practice sets, quizzes or reviewers.`,
    };
  }
  return { ok: true };
}
