# Getting PASA on people's phones

Android gets a real installable app (APK). iPhone gets the web app added to the home screen (a real App Store app needs Apple's $99/year developer account).

Website and web app: **https://pasaph.vercel.app** (admin panel at `/admin`).

## Part 1 · Set up once (you)

### A. Supabase
1. Run `supabase/schema.sql` in the SQL Editor after any update to it (safe to re-run; keeps data).
2. Demo accounts: run `supabase/seed-users.sql` after replacing `CHANGE-ME` with your demo password (don't commit it).
3. Authentication → Sign In / Providers → Email: keep **Confirm email** off for the demo.
4. Authentication → URL Configuration:
   - **Site URL**: `https://pasaph.vercel.app`
   - **Redirect URLs**: add `https://pasaph.vercel.app/**` (password-reset links open the "Set a new password" screen).

### B. Android app (APK)
1. Free account at expo.dev.
2. From `pasa-app`:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build -p android --profile preview
   ```
   Accept the defaults (including "Generate a new Android Keystore"). About 10–20 minutes; you get a download link.
3. Put the link in `ANDROID_APK_URL` in `src/config.ts` so the landing page shows an "Android app" link.
4. **Updating the Android app.** Phones with the new APK update **without reinstalling**: publish an update, and the app picks it up the next time it's opened (it may take two opens).
   ```bash
   npx eas-cli@latest update --channel preview --environment preview --message "What changed"
   ```
   Updates only carry app screens, features and fixes. **Rebuild the APK** (step 2) for a new app icon or name, new permissions, a new phone feature, or when you bump `version` in `app.json`. The website updates on its own after each push.

### C. Website (iPhone + any browser)
- Vercel deploys automatically from GitHub (`PASAest/PASA.ph`, project **pasa.ph**) a few minutes after each push. Nothing to run by hand.
- Vercel → Settings → Environment Variables must have `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as `.env`; never `SEED_PASSWORD`).

## Part 2 · On each phone

**Android:** open the APK link → Download → open the file → allow "Install unknown apps" if asked → Install.

**iPhone:** open **https://pasaph.vercel.app** in **Safari** (not Chrome) → Share → **Add to Home Screen** → Add. Open PASA from the home screen; it goes straight to Log in.

## Part 3 · After they open it
- Demo logins (password: the demo password from step A2):
  - `andrea@pasa.test`, `miguel@pasa.test`, `bea@pasa.test`, `carlo@pasa.test`
  - Group members, by first name: `april@`, `chaelly@`, `michael@`, `niamh@`, `leejhen@`, `mishi@`, `geneva@`, `karen@`, `janna@`, `mariekrystel@`, `graziela@pasa.test`
  - Admin panel: `admin@pasa.test` at `/admin`
- New accounts upload ID + COR and can browse, but booking, buying and selling unlock only after an admin approves them in `/admin` → Approvals. Keep an eye on it during testing.
- The first time someone opens their Wallet, they create a 4-digit wallet PIN.
- Everyone shares the same data live across Android, iPhone and web.

## Notes
- After an update, if the website looks old: wait a few minutes for Vercel, then refresh (Cmd + Shift + R on a laptop; close and reopen on a phone).
- Expo Go + a tunnel is only for development; it stops when your laptop is off.
- Test both links on your own phones before sharing.
