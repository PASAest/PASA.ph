# Getting PASA on people's phones

Android gets a real installable app (APK). iPhone gets the web app added to the home screen (a real iPhone app needs Apple's $99/year developer account).

## Part 1 · Set up once (you)

### A. Supabase
1. Run `supabase/schema.sql` again in the SQL Editor (safe to re-run; keeps data).
2. Run `supabase/seed-users.sql` after replacing `CHANGE-ME` with your demo password (don't commit it).
3. Authentication → Sign In / Providers → Email: keep **Confirm email** off for the demo.
4. Authentication → URL Configuration → **Site URL**: your Vercel link (step C), so password-reset emails work.

### B. Android app (APK)
1. Free account at expo.dev.
2. From `pasa-app`:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build -p android --profile preview
   ```
   Accept the defaults (including "Generate a new Android Keystore"). About 10–20 minutes; you get a download link.
3. Put the link in `ANDROID_APK_URL` in `src/config.ts` so the landing page shows an "Android app" button.
4. Rebuild after app changes (always after adding native features).

### C. Web link (iPhone + any browser)
1. In Vercel → Settings → Environment Variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as `.env`; never `SEED_PASSWORD`).
2. From `pasa-app`: `npx vercel --prod`
3. You get `https://….vercel.app` (admin panel at `/admin`).

## Part 2 · On each phone

**Android:** open the APK link → Download → open the file → allow "Install unknown apps" if asked → Install.

**iPhone:** open the Vercel link in **Safari** (not Chrome) → Share → **Add to Home Screen** → Add. Open PASA from the home screen.

## Part 3 · After they open it
- Demo logins: `andrea@pasa.test`, `miguel@pasa.test`, `bea@pasa.test`, `carlo@pasa.test`.
- New accounts upload ID + COR and can browse, but booking, buying and selling unlock only after an admin approves them in `/admin` → Approvals. Keep an eye on it during testing.
- Everyone shares the same data live across Android, iPhone and web.

## Notes
- Expo Go + a tunnel is only for development; it stops when your laptop is off.
- Test both links on your own phones before sharing.
