# Moving PASA to a new Supabase project

Data (users, posts, listings, photos) does not carry over. You start fresh with the demo accounts.

## 1. Create the project
supabase.com → New project. Region: Southeast Asia (Singapore). Save the database password somewhere safe.

## 2. Run the SQL (SQL Editor → New query)
1. Paste **all** of `supabase/schema.sql` → Run.
2. Open `supabase/seed-users.sql`, replace `CHANGE-ME` with a demo password (don't commit it) → paste → Run.
   The last result should list 5 users (andrea, bea, carlo, miguel, admin).

## 3. Auth settings
- Authentication → Sign In / Providers → Email: turn **Confirm email** off (demo).
- Authentication → URL Configuration → Site URL: your Vercel link (or `http://localhost:8081` for now).

## 4. Point the app at the new project
Project Settings → API Keys → copy the **Project URL** and the **publishable key**. In `pasa-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://NEW-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=new-publishable-key
SEED_PASSWORD="the demo password from step 2"
```
Then restart: `npx expo start --clear`

## 5. Demo content
`npm run seed` (posts, listings in every category, reviews, a chat).

## 6. Update the deployed copies
- **Vercel:** Settings → Environment Variables → replace both `EXPO_PUBLIC_…` values → redeploy (`npx vercel --prod`).
- **Android APK:** rebuild (`npx eas-cli@latest build -p android --profile preview`). The old APK still points at the old project.
- **Expo Go / tunnel:** just restart with `--clear`.
