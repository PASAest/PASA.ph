import { CANCEL_CUTOFF_MIN } from '@/config';

/** Terms, community rules and privacy: shown in the app (/terms) and on the website (/legal). */
export const termsSections = (fee: number): [string, string][] => [
  ['Who can join', 'PASA is for enrolled college students in Santa Rosa, Laguna. You verify with your school ID and COR, and tutors also submit a CV. One account per student.'],
  ['What you can list', 'Academic items only: books, calculators, school supplies, lab and drafting tools, uniforms and academic gadgets. Listings with photos, and anything that looks like answer keys, exercises, practice sets or quizzes, are checked by an admin first.'],
  ['Delivery', 'Delivery is by internal arrangement between buyer and seller. Agree on how and where in chat.'],
  ['Tutoring', `Sessions are online, on Zoom, Google Meet or MS Teams. Free cancellation until ${CANCEL_CUTOFF_MIN} minutes before the start time. No-shows can be reported.`],
  ['Payments and fees', `Pay with GCash or Maya through PASA so your money is protected. PASA adds a ${fee}% service fee and holds payment until the session is done or the item is received, then releases it to the tutor's or seller's wallet.`],
  ['Respect', 'Harsh, foul or flirtatious language and links are blocked. Breaking the rules can get your account suspended. Report anything that feels wrong.'],
  ['Your data', 'We collect only what we need to run PASA and protect it under the Data Privacy Act of 2012 (RA 10173). You can ask us to delete your account at any time.'],
];
