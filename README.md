# PASA · Turn Potential Into PASAbilities

A student marketplace for college students in Santa Rosa, Laguna: **book tutors online** and **buy, sell or rent academic items**. This is a working prototype for the feasibility study. It uses real accounts, a shared database and live chat, but **payments are dummy only**.

Built with Expo (React Native) + Supabase. One codebase runs as an Android app, in Expo Go, and as an installable web app for iPhone.

---

## 1. One-time setup (about 15 minutes)

### a. Create the Supabase project (free)
1. Go to [supabase.com](https://supabase.com) → **New project**. Pick the Singapore region (closest to PH).
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Open **Authentication → Sign In / Providers → Email** and turn **OFF "Confirm email"**.
   Supabase's free email service only sends a few emails per hour, which breaks demos. The app itself checks that sign-ups use your school's email domain (see step c).
4. Open **Project Settings → API Keys** and copy the **Project URL** and the **publishable key** (or the legacy `anon` key).

### b. Connect the app
```bash
cp .env.example .env      # then paste the URL and key into .env
npm install
```

### c. Lists and links
Edit [`src/config.ts`](src/config.ts):
- `SCHOOLS`, `PROGRAMS`, `SUBJECTS`, `CATEGORIES`: the Santa Rosa colleges, programs, tutoring subjects and Assets categories
- `CONTACT_EMAIL`, `FACEBOOK_URL`, `ANDROID_APK_URL`: shown on the landing page once filled in

Fees and prices (commission %, minimum tutor rate, boosts, PASA Plus plans) are set by an admin in **/admin → Settings**, not in code.

**Updating an existing project:** after pulling new changes, run `supabase/schema.sql` again in the SQL Editor. It's safe to re-run and keeps your data.

### d. Add demo users and data (recommended for the defense)
1. In the Supabase **SQL Editor**, run [`supabase/seed-users.sql`](supabase/seed-users.sql). It creates 4 demo users (`andrea@pasa.test`, `miguel@pasa.test`, `bea@pasa.test`, `carlo@pasa.test`) and an admin (`admin@pasa.test`). First replace `CHANGE-ME` at the top of the file with a password of your choice, and set `school` to match `SCHOOL_NAME`. Don't commit the real password.
2. Put the same password in `.env` as `SEED_PASSWORD=...`, then add their posts, listings, reviews and a chat:
   ```bash
   npm run seed
   ```

---

## 2. Run it while developing

```bash
npx expo start
```
- **Phone:** install **Expo Go** from the Play Store or App Store, then scan the QR code. The phone and laptop must be on the same Wi-Fi. If they aren't, run `npx expo start --tunnel`.
- **Browser:** press `w`.

---

## 3. Install it on phones for the demo (no app-store fees)

### Android: installable APK
```bash
npx eas-cli@latest login          # free Expo account
npx eas-cli@latest build -p android --profile preview
```
When the build finishes (about 10–20 min in Expo's cloud), you get a **link and QR code**. On each Android phone, open the link → download → allow "Install unknown apps" → install **PASA**. The app works on its own after that; your laptop doesn't need to be on.

> `.env` is included in the cloud build through `.easignore`, so the APK knows your Supabase project.

### iPhone: add to Home Screen (web app)
```bash
npx expo export -p web
```
Then drag the generated **`dist`** folder onto [app.netlify.com/drop](https://app.netlify.com/drop) (free). You get a link like `https://pasa-xyz.netlify.app`.

On an iPhone, open the link in **Safari** → **Share** → **Add to Home Screen**. PASA gets its own icon and opens full-screen like an app. The same link also works on Android and laptops, which makes it a good backup on demo day.

---

### Web link on Vercel (any laptop or phone browser)
The project includes `vercel.json`, which sets the build command, the output folder and the rewrites that make links like `/admin` work.

1. Create a project on [vercel.com](https://vercel.com). Either import the GitHub repo, or run `npx vercel` inside `pasa-app`.
2. In **Settings → Environment Variables**, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with the same values as your `.env`. Don't add `SEED_PASSWORD`.
3. Deploy. Every push to `main` redeploys automatically, or run `npx vercel --prod` from your laptop.
4. Put the Vercel URL in Supabase → **Authentication → URL Configuration → Site URL**, so password-reset links work.

`.vercelignore` keeps `.env` from ever being uploaded.

## Admin panel

A web panel for the PASA team at **`/admin`**: `http://localhost:8081/admin` while developing, or `https://your-site.netlify.app/admin` once deployed.

- **Dashboard:** revenue, pending fees, users, tutors, sessions, orders, open reports, and a revenue-per-day chart
- **Reports:** what students flagged. View it, remove the post or listing, ban the person, resolve or dismiss.
- **Users:** search and filter (tutors, Plus, banned), ban or unban, export CSV
- **Listings & posts:** search everything, filter to items matching the banned-word rules, remove
- **Approvals:** verify students (ID + COR), approve tutors (+ CV), approve listings with photos or flagged words
- **Payments & payouts:** every demo payment with filters, revenue totals and **Export CSV**; wallet withdrawals to mark as sent
- **Settings:** commission %, Plus discount, minimum tutor rate, boost price, Plus boosts and plan prices

Sign in with `admin@pasa.test`, which `supabase/seed-users.sql` creates. To make another account an admin, run this in the SQL Editor:
```sql
insert into public.admins (user_id) select id from auth.users where email = 'someone@school.edu.ph';
```
Banned students are logged out immediately and can't post, list, message, book or buy. Admins can't read private chats.

## 4. Suggested demo script (two phones)

| Step | Phone A: Andrea (student) | Phone B: Miguel (tutor) |
|---|---|---|
| 1 | Home → **Find Tutors** → Miguel → **Book** (subject, time, Main Library) | Bell shows **New tutoring request** |
| 2 | | Profile → **Activity** → **Accept** |
| 3 | Activity → **Pay now** → GCash → any 4-digit PIN → **Payment successful** | Gets **Session confirmed** |
| 4 | Chat live about the session | Replies instantly |
| 5 | **Session done** (works anytime for the demo) → payment released → **Rate Miguel** | Gets **Payment released** |
| 6 | Assets → Bea's calculator → **Rent** → pay | |
| 7 | Try listing "Algebra answer key" → **blocked** by the Assets rule | Try sending a rude word in chat → **blocked** |

Tip: to show the "Starts in 15 min" reminder, book a session for the next available time slot.

---

## 5. What's in the prototype

| # (group's numbering) | Screen | File |
|---|---|---|
| 0 | Splash (logo + tagline) | `src/app/index.tsx` |
| 1 | Welcome (Sign Up / Log In) | `src/app/(auth)/welcome.tsx` |
| 2 | Create account | `src/app/(auth)/sign-up.tsx` |
| 2b | Profile setup (photo, bio, tutor?) | `src/app/(auth)/profile-setup.tsx` |
| 2.1 | Log in, forgot password | `src/app/(auth)/log-in.tsx`, `forgot-password.tsx` |
| 3 | Home: "Hi, Name!", Post something…, feed, Find Tutors | `src/app/(tabs)/index.tsx` |
| 3a/3b | Create post, post + comments | `src/app/post/` |
| 3.1 | Assets: search, filters, grid | `src/app/(tabs)/assets.tsx` |
| 3.1a/3.2 | List an item, item detail | `src/app/listing/` |
| 3.3 | Messages + live chat | `src/app/(tabs)/messages.tsx`, `src/app/chat/[id].tsx` |
| 3.4 | Profile: photo, bio, Connect/Message/More, ratings, tutoring, listings | `src/components/ProfileView.tsx` |
| 3.5 | Book a tutor | `src/app/book/[tutorId].tsx` |
| 3.6 | My Activity: accept, pay, done, extend, return, cancel | `src/app/activity.tsx` |
| 3.7 | Checkout + dummy GCash/Maya | `src/app/checkout.tsx`, `src/components/FakeWallet.tsx` |
| 3.8 | Review | `src/app/review.tsx` |
| 3.9 | Notifications | `src/app/notifications.tsx` |
| 3.10 | Boost / PASA Plus | `src/app/plus.tsx` |
| — | Become a tutor, report, settings, terms | `src/app/` |

**Business rules**
- Students sign up with their school, program and year, then upload their **school ID and COR**. They can browse right away, but booking, buying and selling unlock once an admin verifies them. Tutors also upload a **CV** and need admin approval.
- Tutoring is **online only** (Zoom, Google Meet or MS Teams; the tutor adds the meeting link). Tutors set their own rate, with a minimum (default ₱150/hour).
- Payment is **GCash or Maya** (dummy). The service fee (default 10%) is added on top. PASA Plus members pay 5 percentage points less.
- Money goes into the tutor's or seller's **wallet** once the session or delivery is confirmed. They can request a withdrawal to GCash or Maya, which an admin marks as sent.
- Item delivery is by **internal arrangement** in chat.
- **PASA Plus:** 1-month free trial, then 1-, 3-, 6- or 12-month plans. Members get 10 boosts a month, a lower fee and a badge.
- Online / offline / on-session status shows on avatars. Chat supports photo and video attachments. Light and dark mode are in Settings.
- Payments are "held" and only "released" when the student taps **Session done** or the buyer taps **I received it**. Cancelling refunds the payment. Every payment is recorded in the `payments` table, which you can use for the financial study.
- Free cancellation until 15 minutes before a session. Sessions can be extended by 30 minutes.
- Rentals have a due date and a deposit, which is refunded when the owner taps **Mark returned**.
- Harsh, foul and flirtatious words **and links** are blocked in posts, comments, chat and reviews. Listings with photos, or text that looks like answer keys, exercises, practice sets or quizzes, wait for admin approval. See `src/lib/moderation.ts`.

**Known prototype limits**
- **Payments are simulated.** Real GCash/Maya needs PayMongo or Xendit plus a registered business.
- **No push notifications.** Notifications appear in-app (bell badge, live), and upcoming sessions show a reminder card on Home.
- **Logo:** the minimalist "P" mark is in `src/components/Logo.tsx` and the images in `assets/` and `public/`. Replace them if the group finalizes a different logo.

## Useful commands
```bash
npm run typecheck        # TypeScript
npx expo lint            # lint
npx expo-doctor          # dependency health
```
