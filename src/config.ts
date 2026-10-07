// PASA serves tertiary-level students in Santa Rosa, Laguna. Edit these lists to match.

// Colleges and universities with campuses in Santa Rosa, Laguna (Wikipedia and local listings, Oct 2026).
// Double-check names with the group; "Other" lets students type a school that isn't listed.
export const SCHOOLS = [
  'Polytechnic University of the Philippines – Santa Rosa',
  'University of Santo Tomas – Santa Rosa',
  'Our Lady of Fatima University – Laguna (Santa Rosa)',
  'Our Lady of Assumption College – Santa Rosa',
  'STI College – Santa Rosa',
  'Citi Global College',
  'University of the East – Santa Rosa',
  'Other',
];

// Only emails ending in this domain can sign up. Leave empty ('') to allow any email.
export const SCHOOL_EMAIL_DOMAIN = '';

export const PROGRAMS = [
  // Business and accountancy
  'BS Accountancy', 'BS Management Accounting', 'BS Accounting Information System', 'BS Internal Auditing',
  'BSBA Financial Management', 'BSBA Marketing Management', 'BSBA Human Resource Management',
  'BSBA Operations Management', 'BS Entrepreneurship', 'BS Office Administration', 'BS Real Estate Management',
  'BS Customs Administration',
  // Hospitality and tourism
  'BS Hospitality Management', 'BS Tourism Management',
  // Computing
  'BS Information Technology', 'BS Computer Science', 'BS Information Systems', 'BS Entertainment and Multimedia Computing',
  // Engineering and architecture
  'BS Civil Engineering', 'BS Mechanical Engineering', 'BS Electrical Engineering', 'BS Electronics Engineering',
  'BS Computer Engineering', 'BS Industrial Engineering', 'BS Chemical Engineering', 'BS Architecture',
  // Health sciences
  'BS Nursing', 'BS Pharmacy', 'BS Medical Technology', 'BS Physical Therapy', 'BS Radiologic Technology',
  'BS Psychology', 'BS Nutrition and Dietetics', 'Doctor of Dental Medicine',
  // Education
  'Bachelor of Elementary Education', 'BSEd English', 'BSEd Mathematics', 'BSEd Science', 'BSEd Filipino',
  'BSEd Social Studies', 'Bachelor of Physical Education', 'Bachelor of Technical-Vocational Teacher Education',
  // Arts, sciences and communication
  'AB Communication', 'AB Journalism', 'AB English Language Studies', 'AB Political Science', 'AB Psychology',
  'BS Biology', 'BS Mathematics', 'BS Applied Mathematics', 'BS Chemistry', 'BS Criminology',
  'BS Social Work', 'BS Public Administration', 'Bachelor of Multimedia Arts',
  // Others
  'Diploma / Associate program', 'Graduate studies', 'Other',
];

export const YEAR_LEVELS = [1, 2, 3, 4, 5];

export const SUBJECTS = [
  // Accounting and business
  'Financial Accounting', 'Intermediate Accounting', 'Advanced Accounting', 'Cost Accounting',
  'Management Accounting', 'Auditing', 'Taxation', 'Business Law', 'Economics', 'Microeconomics',
  'Macroeconomics', 'Business Math', 'Business Finance', 'Marketing', 'Management', 'Entrepreneurship',
  // Math and science
  'Algebra', 'Trigonometry', 'Calculus', 'Differential Equations', 'Statistics', 'Discrete Mathematics',
  'Mathematics in the Modern World', 'Physics', 'Chemistry', 'Organic Chemistry', 'Biology',
  'Anatomy and Physiology', 'Biochemistry', 'Microbiology', 'Pharmacology',
  // Computing
  'Programming', 'Data Structures and Algorithms', 'Web Development', 'Database Systems',
  'Networking', 'Mobile Development',
  // Engineering
  'Engineering Mechanics', 'Strength of Materials', 'Thermodynamics', 'Electrical Circuits',
  'Technical Drawing / Drafting', 'AutoCAD',
  // Languages and general education
  'English', 'Purposive Communication', 'Filipino', 'Readings in Philippine History',
  'The Contemporary World', 'Understanding the Self', 'Ethics', 'Art Appreciation',
  'Science, Technology and Society', 'Research / Thesis Writing', 'Psychology',
  'Criminology', 'Nursing Concepts',
];

// Academic items students can sell or rent in Assets.
export const CATEGORIES = [
  { key: 'book', label: 'Books', icon: 'book' },
  { key: 'calculator', label: 'Calculators', icon: 'calculator' },
  { key: 'school_supplies', label: 'School supplies', icon: 'pencil' },
  { key: 'lab_equipment', label: 'Lab equipment', icon: 'flask' },
  { key: 'drafting_tools', label: 'Drafting tools', icon: 'construct' },
  { key: 'uniform', label: 'Uniforms', icon: 'shirt' },
  { key: 'gadget', label: 'Academic gadgets', icon: 'laptop' },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]['key'];
export const categoryOf = (key: string) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];

// Online tutoring happens on a third-party app; PASA only stores the link.
export const PLATFORMS = ['Zoom', 'Google Meet', 'MS Teams'] as const;
const PLATFORM_DOMAINS: Record<string, string[]> = {
  Zoom: ['zoom.us', 'zoom.com'],
  'Google Meet': ['meet.google.com'],
  'MS Teams': ['teams.microsoft.com', 'teams.live.com'],
};
/** True if the meeting link belongs to the chosen platform (meeting links are the only links allowed). */
export function isMeetingLink(platform: string, link: string) {
  try {
    const host = new URL(link.trim()).hostname.toLowerCase();
    return (PLATFORM_DOMAINS[platform] ?? []).some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export const CANCEL_CUTOFF_MIN = 15; // free cancellation until 15 minutes before a session
export const DELIVERY_NOTE = 'Delivery is by internal arrangement. Agree on how and where with the seller in chat.';

// Landing page links. Fill these in once the group creates them (business email, Facebook page, APK link).
export const CONTACT_EMAIL = '';
export const FACEBOOK_URL = '';
export const ANDROID_APK_URL = 'https://expo.dev/artifacts/eas/VZyPOAlZvX5SYDetUL9FlaAIdUys6O4ceY5aXxiqCyM.apk';
// Store badges on the landing page. PASA isn't listed yet, so these open the stores themselves.
// Swap in the app's own store pages once it's published.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps';
export const APP_STORE_URL = 'https://www.apple.com/app-store/';
