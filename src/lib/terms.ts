import { CANCEL_CUTOFF_MIN, CONTACT_EMAIL, FACEBOOK_PAGE_NAME } from '@/config';

/** Terms, community rules and privacy: shown in the app (/terms) and on the website (/legal). */
export const termsSections = (fee: number): [string, string][] => [
  ['Who can join', 'PASA is for enrolled college students in Santa Rosa, Laguna. You verify with your school ID or COR, and tutors also submit a CV.'],
  ['What you can list', 'Academic items only: books, calculators, school supplies, and lab and drafting tools. Listings with photos, and anything that looks like answer keys, exercises, practice sets or quizzes, are checked by an admin first.'],
  ['Delivery', 'Delivery is by internal arrangement between buyer and seller. Agree on how and where in chat.'],
  ['Tutoring', `Sessions are online, on Zoom, Google Meet or MS Teams. Free cancellation until ${CANCEL_CUTOFF_MIN} minutes before the start time. No-shows can be reported.`],
  ['Payments and fees', `Pay with GCash, Maya, or Online Banking through PASA so your money is protected. You pay the listed price. PASA keeps a ${fee}% commission from the tutor's or seller's earnings (less for PASA Plus members) and holds payment until the session is done or the item is received, then releases the rest to their wallet.`],
  ['Respect', 'Harsh, foul or flirtatious language and links are blocked. Breaking the rules can get your account suspended. Report anything that feels wrong.'],
  ['Your data', 'We collect only what we need to run PASA and protect it under the Data Privacy Act of 2012 (RA 10173). You can ask us to delete your account at any time.'],
  ['Contact PASA', `Email: ${CONTACT_EMAIL}\nFacebook page: ${FACEBOOK_PAGE_NAME}`],
];
