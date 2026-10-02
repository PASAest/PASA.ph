// Adds demo content (posts, listings in every category, reviews, a chat) for the 4 demo users.
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

console.log('\nDone! Log in as andrea@pasa.test, miguel@pasa.test, bea@pasa.test or carlo@pasa.test (password: SEED_PASSWORD in .env).');
