// School-specific settings. PASA runs on one campus for now; change these to match yours.
export const SCHOOL_NAME = 'PUP Sta Rosa';

// Only emails ending in this domain can sign up. Leave empty ('') to allow any email during testing.
export const SCHOOL_EMAIL_DOMAIN = '';

export const PROGRAMS = [
  'BS Accountancy',
  'BS Management Accounting',
  'BS Business Administration',
  'BS Information Technology',
  'BS Computer Science',
  'BS Psychology',
  'BS Nursing',
  'BS Civil Engineering',
  'BSEd',
  'Other',
];

export const YEAR_LEVELS = [1, 2, 3, 4, 5];

// Face-to-face meetup spots on campus, used for tutoring sessions and item handoffs.
export const CAMPUS_SPOTS = ['Main Library', 'Study Hall', 'Cafeteria', 'Student Lounge', 'Quadrangle Benches'];

export const SUBJECTS = [
  'Financial Accounting',
  'Cost Accounting',
  'Management Accounting',
  'Taxation',
  'Auditing',
  'Economics',
  'Business Math',
  'Statistics',
  'Calculus',
  'Algebra',
  'Physics',
  'Chemistry',
  'Programming',
  'English',
  'Filipino',
];

// Business rules
export const SERVICE_FEE_RATE = 0.1; // 10% added on top of the tutor's or seller's price
export const PLUS_SERVICE_FEE_RATE = 0.05; // PASA Plus members pay 5%
export const BOOST_PRICE = 20; // PHP for 3 days at the top
export const BOOST_DAYS = 3;
export const PLUS_PRICE = 49; // PHP per month
export const CANCEL_CUTOFF_MIN = 15; // free cancellation until 15 minutes before a session
