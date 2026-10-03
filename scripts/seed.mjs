// Adds demo content (posts, listings in every category, reviews, a chat) for the 4 demo users and the 11 group members.
// 1. Create the users first: run supabase/seed-users.sql in the Supabase SQL Editor.
// 2. Then: npm run seed   (reads EXPO_PUBLIC_SUPABASE_* from .env)
// Safe to re-run: content is only created once per user.

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

// Same password you set in supabase/seed-users.sql. Kept in .env (SEED_PASSWORD) so it's never committed.
const DEMO_PASSWORD = process.env.SEED_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Add SEED_PASSWORD=<the demo password> to .env');
  process.exit(1);
}
const emailFor = (handle) => `${handle}@pasa.test`;

const people = {
  andrea: {
    first_name: 'Andrea', last_name: 'Santos', program: 'BS Accountancy', year_level: 1,
    bio: 'First year, still figuring out debits and credits 😅',
  },
  miguel: {
    first_name: 'Miguel', last_name: 'Reyes', program: 'BS Accountancy', year_level: 3,
    bio: "Dean's lister. I like making accounting make sense.",
    tutor: {
      tutor_subjects: ['Financial Accounting', 'Cost Accounting', 'Management Accounting'],
      tutor_rate: 150,
      tutor_about: "3rd year BSA, consistent dean's lister. I teach with lots of practice problems and simple examples. Free MWF afternoons at the Main Library.",
    },
  },
  bea: {
    first_name: 'Bea', last_name: 'Cruz', program: 'BS Computer Science', year_level: 4,
    bio: 'Math nerd and coffee lover.',
    tutor: {
      tutor_subjects: ['Calculus', 'Algebra', 'Statistics', 'Programming'],
      tutor_rate: 120,
      tutor_about: '4th year CS. I tutor Calc, Algebra, Stats and intro programming. Patient with beginners!',
    },
  },
  carlo: {
    first_name: 'Carlo', last_name: 'Mendoza', program: 'BS Business Administration', year_level: 2,
    bio: 'Selling my old books and calcu. Message me!',
  },
  // Group members
  april: { first_name: 'April Jean', bio: 'BSA girlie. Will trade notes for coffee ☕' },
  chaelly: { first_name: 'Chaelly Anne', bio: 'Psych major. Always looking for study buddies.' },
  michael: {
    first_name: 'Michael Angelo', bio: 'IT senior. I build web apps and debug other people’s code for fun.',
    tutor: {
      tutor_subjects: ['Programming', 'Web Development', 'Database Systems'],
      tutor_rate: 180,
      tutor_about: '4th year IT. I can help with Java, Python, HTML/CSS/JS and SQL. We go through your actual code on screen share.',
    },
  },
  niamh: {
    first_name: 'Niamh Rylee', bio: 'Future English teacher. Grammar is my love language.',
    tutor: {
      tutor_subjects: ['Purposive Communication', 'English', 'Research Writing'],
      tutor_rate: 150,
      tutor_about: '3rd year BSEd English. I help with essays, reports, research papers and oral presentations. Send your draft before our session.',
    },
  },
  leejhen: { first_name: 'Leejhen', bio: 'CE student surviving on plates and coffee.' },
  mishi: { first_name: 'Mishi Nicole', bio: 'HM freshie. Ask me about baking 🧁' },
  geneva: {
    first_name: 'Geneva Andrey', bio: 'Graduating BSA. Board exam reviewee soon 🙏',
    tutor: {
      tutor_subjects: ['Financial Accounting', 'Auditing', 'Taxation'],
      tutor_rate: 200,
      tutor_about: '4th year BSA with a consistent 1.5 GWA. I teach FAR, Auditing and Taxation with board-exam-style drills.',
    },
  },
  karen: { first_name: 'Karen Joy', bio: 'Nursing student. Duty days are long but worth it.' },
  janna: { first_name: 'Miel Janna Shanelle', bio: 'CS freshie learning to code one bug at a time.' },
  mariekrystel: { first_name: 'Mariekrystel', bio: 'Marketing major. I like nice notebooks and nicer layouts.' },
  graziela: {
    first_name: 'Graziela', bio: 'Math major. Numbers make sense to me, people less so 😄',
    tutor: {
      tutor_subjects: ['Calculus', 'Statistics', 'Algebra'],
      tutor_rate: 160,
      tutor_about: '4th year BS Math. I break problems down step by step and give you practice sets after every session.',
    },
  },
};

async function login(handle) {
  const p = people[handle];
  const client = createClient(url, key, { auth: { persistSession: false } });
  const email = emailFor(handle);
  const { data, error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}. Run supabase/seed-users.sql in the SQL Editor first.`);
  const id = data.user.id;
  await client.from('profiles').update({ bio: p.bio, is_tutor: !!p.tutor, ...(p.tutor ?? {}) }).eq('id', id);
  console.log(`✓ ${p.first_name} (${email})`);
  return { client, id };
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

async function once(client, table, ownerCol, ownerId, rows) {
  const { count } = await client.from(table).select('id', { count: 'exact', head: true }).eq(ownerCol, ownerId);
  if (count) return;
  const { error } = await client.from(table).insert(rows, { defaultToNull: false });
  if (error) throw new Error(`${table}: ${error.message}`);
}

/** Adds each listing whose title this seller doesn't have yet, so re-running picks up newly added items. */
async function addListings(client, sellerId, rows) {
  const { data } = await client.from('listings').select('title').eq('seller_id', sellerId);
  const have = new Set((data ?? []).map((l) => l.title));
  const missing = rows.filter((r) => !have.has(r.title)).map((r) => ({ ...r, seller_id: sellerId }));
  if (!missing.length) return 0;
  const { error } = await client.from('listings').insert(missing, { defaultToNull: false });
  if (error) throw new Error(`listings: ${error.message}`);
  return missing.length;
}

const andrea = await login('andrea');
const miguel = await login('miguel');
const bea = await login('bea');
const carlo = await login('carlo');

await once(andrea.client, 'posts', 'author_id', andrea.id, [
  {
    author_id: andrea.id, type: 'need_tutor', subject: 'Financial Accounting', budget: 150, created_at: hoursAgo(2),
    body: 'Need help with adjusting entries and the worksheet before our long quiz on Friday 😭 Free Thursday 3–5pm. Library or cafeteria is fine!',
  },
]);
await once(miguel.client, 'posts', 'author_id', miguel.id, [
  {
    author_id: miguel.id, type: 'offer_tutoring', subject: 'Cost Accounting', budget: 150, created_at: hoursAgo(5),
    body: 'Midterms are coming! I can tutor Cost Accounting (job order, process costing, CVP). 1-on-1 or small groups at the Main Library. Book me on PASA 📚',
  },
]);
await once(bea.client, 'posts', 'author_id', bea.id, [
  {
    author_id: bea.id, type: 'offer_tutoring', subject: 'Calculus', budget: 120, created_at: hoursAgo(20),
    body: 'Struggling with limits and derivatives? I explain it step by step. Available Tue/Thu at the Study Hall.',
  },
]);
await once(carlo.client, 'posts', 'author_id', carlo.id, [
  {
    author_id: carlo.id, type: 'general', subject: '', created_at: hoursAgo(30),
    body: 'Reminder: the library extends its hours during exam week (until 9pm). Good luck everyone! 💪',
  },
]);

await addListings(carlo.client, carlo.id, [
  {
    seller_id: carlo.id, category: 'calculator', mode: 'sale', title: 'Casio fx-991ES Plus', condition: 'Like new', price: 650,
    meetup_spot: 'Cafeteria', description: 'Used for one semester only. Complete with cover. Allowed in board exams.',
  },
  {
    seller_id: carlo.id, category: 'book', mode: 'rent', title: 'Advanced Algebra, 4th Ed.', book_author: 'Sullivan', condition: 'Good',
    price: 50, deposit: 300, meetup_spot: 'Main Library', description: 'Some highlights in chapters 1–3. Rent it for the sem!',
  },
]);
await addListings(miguel.client, miguel.id, [
  {
    seller_id: miguel.id, category: 'book', mode: 'rent', title: 'Intermediate Accounting Vol. 1', book_author: 'Valix, Peralta', condition: 'Good',
    price: 60, deposit: 400, meetup_spot: 'Main Library', description: 'Latest edition. Clean pages, no writing inside.',
  },
]);
await addListings(bea.client, bea.id, [
  {
    seller_id: bea.id, category: 'book', mode: 'sale', title: 'Calculus: Early Transcendentals, 8th Ed.', book_author: 'Stewart', condition: 'Fair',
    price: 450, meetup_spot: 'Study Hall', description: 'Cover is a bit worn but all pages intact.',
  },
  {
    seller_id: bea.id, category: 'calculator', mode: 'rent', title: 'Casio fx-570EX ClassWiz', condition: 'Good',
    price: 40, deposit: 500, meetup_spot: 'Study Hall', description: 'Rent for exam week. Deposit returned when you give it back.',
  },
]);

// More items so there's plenty to buy and rent in Assets.
const boosted = new Date(Date.now() + 3 * 86400000).toISOString();
const extra = [
  await addListings(carlo.client, carlo.id, [
    { category: 'book', mode: 'sale', title: 'Principles of Economics, 8th Ed.', book_author: 'Mankiw', condition: 'Good', price: 380, meetup_spot: 'Cafeteria', description: 'Used for ECON 1. A few pencil notes in the margins, easy to erase.' },
    { category: 'calculator', mode: 'sale', title: 'Casio fx-82MS', condition: 'Good', price: 350, meetup_spot: 'Cafeteria', description: 'Basic scientific calculator, perfect for first-year math. Battery just replaced.' },
    { category: 'book', mode: 'sale', title: 'Readings in Philippine History', condition: 'Like new', price: 200, meetup_spot: 'Student Lounge', description: 'GE book, barely opened. Cover still glossy.' },
    { category: 'book', mode: 'sale', title: 'Mathematics in the Modern World', condition: 'Good', price: 180, meetup_spot: 'Student Lounge', description: 'GE math book. Name written on the first page, otherwise clean.' },
  ]),
  await addListings(miguel.client, miguel.id, [
    { category: 'calculator', mode: 'sale', title: 'Casio fx-991EX ClassWiz', condition: 'Like new', price: 900, meetup_spot: 'Main Library', description: 'Upgraded to a newer model, so letting this go. Complete with box and cover.', boosted_until: boosted },
    { category: 'book', mode: 'sale', title: 'Cost Accounting: Principles and Procedures', book_author: 'Guerrero, Peralta', condition: 'Good', price: 420, meetup_spot: 'Main Library', description: 'Clean copy. Helpful for Cost Accounting 1 and 2.' },
    { category: 'book', mode: 'rent', title: 'Basic Financial Accounting and Reporting', book_author: 'Ballada', condition: 'Good', price: 45, deposit: 300, meetup_spot: 'Main Library', description: 'Great for first-year BSA. Rent it for the whole sem.' },
  ]),
  await addListings(bea.client, bea.id, [
    { category: 'book', mode: 'sale', title: 'Elementary Statistics: A Step by Step Approach', book_author: 'Bluman', condition: 'Good', price: 500, meetup_spot: 'Study Hall', description: 'Used for STAT 101. Some highlights in chapters 2 to 5.' },
    { category: 'book', mode: 'rent', title: 'Discrete Mathematics and Its Applications', book_author: 'Rosen', condition: 'Good', price: 70, deposit: 500, meetup_spot: 'Study Hall', description: 'Heavy but worth it for CS students. Rent weekly.' },
    { category: 'book', mode: 'sale', title: 'Physics for Scientists and Engineers', book_author: 'Serway, Jewett', condition: 'Fair', price: 600, meetup_spot: 'Study Hall', description: 'Spine is a bit loose but all pages are complete.' },
    { category: 'calculator', mode: 'rent', title: 'Sharp EL-W516X', condition: 'Good', price: 35, deposit: 400, meetup_spot: 'Study Hall', description: 'Rent for exam week. Deposit returned when you give it back.' },
  ]),
  await addListings(andrea.client, andrea.id, [
    { category: 'book', mode: 'sale', title: 'Purposive Communication', condition: 'Like new', price: 150, meetup_spot: 'Cafeteria', description: 'Bought it but our prof gave us a PDF. Still wrapped in plastic.' },
    { category: 'calculator', mode: 'sale', title: 'Casio fx-570ES Plus', condition: 'Good', price: 500, meetup_spot: 'Cafeteria', description: 'Got a new one as a gift, so selling this. Works perfectly.' },
  ]),
  await addListings(carlo.client, carlo.id, [
    { category: 'uniform', mode: 'sale', title: 'PE Uniform Set (Large)', condition: 'Good', price: 250, description: 'Shirt and jogging pants, washed and ironed. Outgrew it.' },
    { category: 'school_supplies', mode: 'sale', title: 'Scientific Notebook Bundle (5 pcs)', condition: 'Brand new', price: 120, description: 'Unused, still sealed. Extra from enrollment.' },
  ]),
  await addListings(bea.client, bea.id, [
    { category: 'lab_equipment', mode: 'sale', title: 'Lab Gown (Medium)', condition: 'Like new', price: 280, description: 'Worn for one semester of Chem lab. No stains.' },
    { category: 'drafting_tools', mode: 'rent', title: 'Drafting Set with T-square', condition: 'Good', price: 40, deposit: 300, description: 'Complete set: T-square, triangles, compass and protractor. Rent weekly for Engineering Drawing.' },
    { category: 'gadget', mode: 'rent', title: 'Graphing Calculator TI-84 Plus', condition: 'Good', price: 80, deposit: 1500, description: 'For Calculus and Statistics. Rent weekly; deposit returned on return.' },
  ]),
  await addListings(andrea.client, andrea.id, [
    { category: 'school_supplies', mode: 'sale', title: 'Accounting Columnar Pads (2-, 4- and 8-column)', condition: 'Brand new', price: 90, description: 'Bought too many. Complete set of three pads.' },
  ]),
].reduce((a, b) => a + b, 0);
console.log(`✓ ${extra} new item${extra === 1 ? '' : 's'} added to Assets`);

// A few past reviews so ratings show on the tutors' profiles.
const review = (client, reviewer_id, reviewee_id, role, stars, comment) =>
  client.from('reviews').insert({ reviewer_id, reviewee_id, role, ref_type: 'booking', ref_id: crypto.randomUUID(), stars, comment });
const { count: reviewCount } = await andrea.client.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewee_id', miguel.id);
if (!reviewCount) {
  await review(andrea.client, andrea.id, miguel.id, 'tutor', 5, 'Super clear explanation of CVP. I finally get it!');
  await review(carlo.client, carlo.id, miguel.id, 'tutor', 4, 'Very patient and prepared. Would book again.');
  await review(andrea.client, andrea.id, bea.id, 'tutor', 5, 'Bea made derivatives easy 🙌');
  await review(miguel.client, miguel.id, carlo.id, 'seller', 5, 'Item exactly as described, smooth meetup.');
}

// A starter chat between Andrea and Miguel.
const { data: convo } = await andrea.client.rpc('start_conversation', { other: miguel.id });
const { count: msgCount } = await andrea.client.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convo);
if (!msgCount) {
  await andrea.client.from('messages').insert({ conversation_id: convo, sender_id: andrea.id, body: 'Hi Miguel! Are you free this week for FAR tutoring?' });
  await miguel.client.from('messages').insert({ conversation_id: convo, sender_id: miguel.id, body: 'Hi Andrea! Yes, Thursday afternoon works. Book me through PASA so it’s recorded 😊' });
}

// ── Group members ──
const g = {};
for (const handle of ['april', 'chaelly', 'michael', 'niamh', 'leejhen', 'mishi', 'geneva', 'karen', 'janna', 'mariekrystel', 'graziela']) {
  try {
    g[handle] = await login(handle);
  } catch (e) {
    console.warn(`! skipped ${handle}: ${e.message}`);
  }
}
const post = (handle, hours, type, subject, body, budget) =>
  g[handle] && once(g[handle].client, 'posts', 'author_id', g[handle].id, [
    { author_id: g[handle].id, type, subject, body, created_at: hoursAgo(hours), ...(budget ? { budget } : {}) },
  ]);

await post('april', 1, 'need_tutor', 'Intermediate Accounting', 'Anyone free to explain PPE depreciation methods? I keep mixing up SYD and double declining 😩 Free Wed after 4pm.', 180);
await post('chaelly', 3, 'need_tutor', 'Statistics', 'Need help with t-tests and ANOVA for our research paper. Can do a Zoom session this weekend!', 160);
await post('michael', 4, 'offer_tutoring', 'Programming', 'Finals project stressing you out? I can help you debug Java, Python or web projects over screen share. Book me on PASA 💻', 180);
await post('niamh', 6, 'offer_tutoring', 'Research Writing', 'Writing your RRL or methodology? I can check your draft and help with APA 7th citations. 1-hour online sessions.', 150);
await post('leejhen', 9, 'general', '', 'Does anyone have a spare drafting set I can rent for Engineering Drawing? Mine broke 😭 Check Assets if you’re selling one!');
await post('mishi', 12, 'need_tutor', 'Mathematics in the Modern World', 'Help! Logic and set theory are confusing me. Looking for a patient tutor before the midterms.', 150);
await post('geneva', 14, 'offer_tutoring', 'Auditing', 'BSA juniors: I’m opening Auditing and Taxation review sessions for the midterms. Board-exam-style drills, small groups welcome 📚', 200);
await post('karen', 18, 'general', '', 'Selling my extra nursing scrubs and a stethoscope in Assets. Freshies, message me before you buy new ones!');
await post('janna', 22, 'need_tutor', 'Programming', 'First time coding and loops are confusing me. Anyone who can explain for/while loops in Python? 🥲', 150);
await post('mariekrystel', 26, 'general', '', 'Tip: you can rent books on PASA for the sem instead of buying. Saved ₱800 this term!');
await post('graziela', 30, 'offer_tutoring', 'Calculus', 'Calculus 1 and 2 tutoring: limits, derivatives, integrals. I give practice sets after every session. Online via Google Meet.', 160);

const addListingsFor = (handle, rows) => (g[handle] ? addListings(g[handle].client, g[handle].id, rows) : 0);
const groupItems = [
  await addListingsFor('april', [
    { category: 'book', mode: 'sale', title: 'Intermediate Accounting Vol. 2', book_author: 'Valix, Peralta', condition: 'Good', price: 450, description: 'Some yellow highlights but no writing. Great for ACCO 3.' },
    { category: 'calculator', mode: 'rent', title: 'Casio fx-991ES Plus (Rent)', condition: 'Good', price: 35, deposit: 400, description: 'Rent for exam week. Deposit returned when you give it back.' },
  ]),
  await addListingsFor('chaelly', [
    { category: 'book', mode: 'sale', title: 'Psychology: Themes and Variations', book_author: 'Weiten', condition: 'Good', price: 550, description: 'Used for Intro to Psych. Clean pages, small dent on the cover.' },
    { category: 'school_supplies', mode: 'sale', title: 'Highlighter and Sticky Notes Set', condition: 'Brand new', price: 95, description: 'Pastel highlighters (6) plus sticky tabs. Unopened.' },
  ]),
  await addListingsFor('michael', [
    { category: 'gadget', mode: 'sale', title: 'Logitech Wireless Mouse M185', condition: 'Like new', price: 350, description: 'Switched to a trackpad. Comes with the USB receiver.' },
    { category: 'book', mode: 'rent', title: 'Head First Java, 3rd Ed.', book_author: 'Sierra, Bates', condition: 'Good', price: 50, deposit: 400, description: 'Best book for learning OOP. Rent it for the whole sem.' },
  ]),
  await addListingsFor('niamh', [
    { category: 'book', mode: 'sale', title: 'Purposive Communication (with workbook)', condition: 'Like new', price: 170, description: 'Workbook pages are still blank. GE requirement for all programs.' },
  ]),
  await addListingsFor('leejhen', [
    { category: 'drafting_tools', mode: 'sale', title: 'Technical Pens Set (0.1 to 0.8)', condition: 'Good', price: 300, description: 'Complete set of 6. All ink cartridges still working.' },
    { category: 'book', mode: 'sale', title: 'Engineering Mechanics: Statics', book_author: 'Hibbeler', condition: 'Fair', price: 480, description: 'Spine is worn but all pages are intact. Has my solved examples in pencil.' },
  ]),
  await addListingsFor('mishi', [
    { category: 'uniform', mode: 'sale', title: 'HM Kitchen Uniform (Small)', condition: 'Like new', price: 400, description: 'Chef’s jacket, apron and toque. Worn twice for lab class.' },
  ]),
  await addListingsFor('geneva', [
    { category: 'book', mode: 'sale', title: 'Auditing Theory', book_author: 'Salosagcol', condition: 'Good', price: 380, description: 'Board-exam reviewer. A few notes in the margins that actually help.' },
    { category: 'book', mode: 'rent', title: 'Income Taxation', book_author: 'Valencia, Roxas', condition: 'Good', price: 45, deposit: 350, description: 'Latest TRAIN law edition. Rent weekly or for the sem.' },
  ]),
  await addListingsFor('karen', [
    { category: 'lab_equipment', mode: 'sale', title: 'Littmann Classic III Stethoscope', condition: 'Like new', price: 3500, description: 'Got a cardiology one, so selling this. Original box included.' },
    { category: 'uniform', mode: 'sale', title: 'Nursing Scrubs Set (Medium)', condition: 'Good', price: 450, description: 'Two sets, washed and ironed. School-approved color.' },
  ]),
  await addListingsFor('janna', [
    { category: 'school_supplies', mode: 'sale', title: 'A4 Clearbook and Folder Bundle', condition: 'Brand new', price: 80, description: 'Extras from enrollment. 3 clearbooks and 5 folders.' },
  ]),
  await addListingsFor('mariekrystel', [
    { category: 'book', mode: 'sale', title: 'Marketing Management, 15th Ed.', book_author: 'Kotler, Keller', condition: 'Good', price: 520, description: 'Required for MKTG 101. Light highlights in early chapters.' },
    { category: 'school_supplies', mode: 'sale', title: 'Dotted Journal and Brush Pens', condition: 'Brand new', price: 220, description: 'Perfect for notes and planners. Still sealed.' },
  ]),
  await addListingsFor('graziela', [
    { category: 'gadget', mode: 'rent', title: 'Casio fx-CG50 Graphing Calculator', condition: 'Like new', price: 90, deposit: 2000, description: 'Color graphing calculator for Calculus and Stats. Rent weekly.' },
    { category: 'book', mode: 'sale', title: 'Calculus with Analytic Geometry', book_author: 'Leithold', condition: 'Good', price: 400, description: 'Classic Leithold. Solved exercises in pencil, easy to erase.' },
  ]),
].reduce((a, b) => a + b, 0);
console.log(`✓ ${groupItems} new group item${groupItems === 1 ? '' : 's'} added to Assets`);

// A few reviews for the group tutors (each one added once).
const reviewIf = async (from, to, ...rest) => {
  if (!g[from] || !g[to]) return;
  const { count } = await g[from].client.from('reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', g[from].id).eq('reviewee_id', g[to].id);
  if (!count) await review(g[from].client, g[from].id, g[to].id, ...rest);
};
await reviewIf('april', 'geneva', 'tutor', 5, 'Geneva’s drills are exactly like the exam. Passed my Auditing quiz!');
await reviewIf('janna', 'michael', 'tutor', 5, 'Fixed my Python project in one session and explained everything.');
await reviewIf('chaelly', 'graziela', 'tutor', 5, 'Stats finally makes sense. Super patient!');
await reviewIf('mishi', 'niamh', 'tutor', 4, 'Very helpful with my essay structure.');

console.log('\nDone! Log in as andrea@pasa.test, miguel@pasa.test, bea@pasa.test, carlo@pasa.test, or a group member like april@pasa.test (password: SEED_PASSWORD in .env).');
