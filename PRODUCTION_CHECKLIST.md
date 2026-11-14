# Production launch checklist

Tick each item before inviting the public.

## Content (human review required)

- [ ] Review all 324 questions in Admin → Questions. Approve or reject each one, then publish the approved ones. Automated checks confirmed that each reference exists in the KJV and that the cited verses contain the answer's key words. That check is not a substitute for a reader.
- [ ] Review the 20 illustrations and their "artistic interpretation" notes. Publish them.
- [ ] Review the 12 adventure chapters. Publish them.
- [ ] Decide on more illustrations. The brief targets 100–150; 20 exist.
- [ ] Confirm wording is neutral where Christian traditions differ (About page, explanations).

## Licensing and legal

- [ ] **Illustrations:** confirm the commercial-use terms of the image generator before public or paid use. Record the result in `question_assets.license`.
- [ ] **KJV in the United Kingdom:** the KJV is under Crown letters patent in the UK (administered by Cambridge University Press). Either obtain permission or restrict UK distribution, or use a different translation for UK users. The KJV is public domain elsewhere.
- [ ] Any additional translation: get written permission first and set `permission_status = 'licensed'`.
- [ ] Privacy policy and terms of use pages, including data collected (email, display name, gameplay) and account deletion requests.
- [ ] If the app is offered in app stores, complete the age rating and data-safety forms.

## Supabase

- [ ] A new project, separate from LearningGem. Run the migrations and seed (SETUP.md).
- [ ] Anonymous sign-ins on, email confirmation on, Site URL and redirect URLs set.
- [ ] Custom SMTP for auth emails. The built-in sender is heavily rate-limited.
- [ ] Branded email templates (confirm signup, reset password).
- [ ] Turn on the CAPTCHA option for sign-ups and anonymous sign-ins to limit abuse.
- [ ] Backups: the paid plan provides daily backups. On the free plan, export regularly.
- [ ] Run the Security Advisor and Performance Advisor in the dashboard. Fix any findings.
- [ ] First admin account created (SETUP.md step 5). Keep admins to a minimum.

## Netlify

- [ ] Use the **online build**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set. The editorial preview build bundles the answer key and must not be the public site.
- [ ] Confirm the banner "Editorial preview" does not appear.
- [ ] Custom domain and HTTPS.
- [ ] Check that the Content-Security-Policy in `netlify.toml` allows any error-reporting endpoint you add.

## Testing on the live site

- [ ] Guest: play a level, reload, gems kept.
- [ ] Register from guest: gems and progress carry over.
- [ ] Sign in on a second device: same balance and progress.
- [ ] Password reset email works end-to-end.
- [ ] Store: buy, cancel, double-click Buy, poor connection. The balance must change exactly once.
- [ ] Admin: approve and publish one question, confirm it appears in play, archive it, confirm it disappears.
- [ ] Phone, tablet and desktop. Screen reader spot-check (VoiceOver / TalkBack).
- [ ] `BASE_URL=https://your-site npx playwright test tests/e2e/a11y.spec.ts` against the live site. The guest-flow tests assume the preview build.

## Mobile apps

- [ ] Generate native projects with Capacitor, set icons and splash, and set the deep-link scheme for auth emails.
- [ ] Test on real devices, then do internal testing on Play / TestFlight.
