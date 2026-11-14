# BibleQuest setup guide

This guide assumes no programming experience. Expect about an hour the first time. You need three free accounts: GitHub (code), Supabase (database and logins) and Netlify (website hosting).

Never paste a Supabase **service_role** or **secret** key into Netlify, GitHub, the code, or a chat. BibleQuest only needs the public **anon / publishable** key.

---

## 1. GitHub: the code

The code is already in a private GitHub repository named `biblequest`. To make changes later, edit files on github.com or with an AI builder. Every change pushed to the `main` branch can trigger a new Netlify deploy (step 4).

## 2. Supabase: create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Name it `biblequest`. Choose a strong database password and save it in a password manager. Pick the region closest to your players.
3. Wait until the project is ready (about 2 minutes).

Use a new project. Do not reuse the LearningGem project.

## 3. Supabase: load the database

### Option A: SQL editor (no installs)

In the Supabase dashboard open **SQL Editor → New query**. Run these files from the repository **in this order**. For each one, open the file on GitHub, click **Raw**, copy all of it, paste it into the editor and press **Run**:

1. `supabase/migrations/20261114000001_core_schema.sql`
2. `supabase/migrations/20261114000002_functions_and_security.sql`
3. `supabase/migrations/20261114000003_editorial_content_status.sql`
4. `supabase/migrations/20261114000004_admin_content_tools.sql`
5. `supabase/seed.sql`, which loads the questions, adventures, store and achievements. It is large (about 340 KB). If the editor refuses it, use option B.

Each run should end with "Success. No rows returned".

### Option B: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                      # applies supabase/migrations
psql "YOUR_CONNECTION_STRING" -f supabase/seed.sql
```

Find the connection string under **Project Settings → Database**.

### Turn on sign-in methods

1. Go to **Authentication → Sign In / Providers**:
   - Turn on **Allow anonymous sign-ins**. Guests then play and keep gems without registering.
   - Make sure **Email** is enabled. Leave **Confirm email** on.
2. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to your Netlify address, for example `https://biblequest.netlify.app`.
   - Add the same address to **Redirect URLs**, plus `http://localhost:5173` for local testing.
3. Optional: under **Authentication → Emails**, edit the confirmation and password-reset emails to say "BibleQuest".

### Collect the two public values

In **Project Settings → API** (or **API Keys**), copy:

- **Project URL**, which looks like `https://abcd1234.supabase.co`
- **anon / publishable key**, a long string. Do **not** copy the service_role/secret key.

## 4. Netlify: publish the website

1. Go to [app.netlify.com](https://app.netlify.com), then **Add new site → Import an existing project → GitHub**, and choose `biblequest`.
2. Netlify reads `netlify.toml` automatically. The build command is `npm run build` and the publish directory is `dist`.
3. Before deploying, open **Site configuration → Environment variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon/publishable key
4. Click **Deploy**. When it finishes, open the site. The "Editorial preview" banner should be gone. That banner only appears in builds without Supabase.

If you change environment variables later, run **Deploys → Trigger deploy → Clear cache and deploy site**.

## 5. Become the administrator

1. On your live site, click **Sign in → Create account**. Register with your email and confirm it.
2. In Supabase, go to **Table Editor → profiles**, find your row and copy the `id`.
3. In **SQL Editor**, run:

   ```sql
   update public.profiles set role = 'admin' where id = 'PASTE-YOUR-ID';
   ```

4. Reload the site and open **Content review** in the footer, or go to `/#/admin`. You now have the full dashboard.

Use the role `editor` for helpers who may review content but not publish it.

## 6. Review and publish questions

All 324 questions arrive in the **review** state, so players see none until you publish them. Games show "No published questions are available here yet" until then.

1. Go to **Admin → Questions**.
2. Read each question, its reference and explanation. Use **Approve** or **Reject** (for example by filtering "Picture · Beginner" and working through it).
3. Select approved questions and choose **Publish**. Only admins can publish.
4. Do the same for **Illustrations** and **Adventures** (chapters).
5. Under **Daily**, pick 3–10 published questions for upcoming dates. If no daily set is chosen, the server picks one automatically from published questions.

Every action is recorded in **Admin → Audit**.

## 7. Mobile apps (later)

The project is ready for [Capacitor](https://capacitorjs.com). On a computer with Android Studio:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run cap:sync
npx cap open android
```

Publishing to Google Play also needs a signing key, a Play Console account, store listing text and screenshots. None of that has been done yet.

## 8. Optional: error reports

Set `VITE_ERROR_ENDPOINT` to an HTTPS address that accepts JSON, for example a Netlify Function or an error service. Reports contain only the error message, the page name and the app version. Emails, tokens and query strings are removed. If you leave it empty, errors appear only in the browser console.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Banner still says "Editorial preview" | Environment variables are missing or misspelled. Re-check step 4 and redeploy with a cleared cache |
| "No published questions are available here yet" | Publish questions in Admin (step 6) |
| Guests cannot play | Turn on anonymous sign-ins (step 3) |
| Password reset link opens the wrong site | Fix the Site URL and Redirect URLs (step 3) |
| Admin page shows "You do not have permission" | Set your role (step 5), then sign out and back in |
