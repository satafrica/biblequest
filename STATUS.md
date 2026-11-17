# Development status report

Date: 16 November 2026 · Version 1.0.0-preview.3 (updated 17 November 2026)

Status labels:

- **Tested**: automated tests ran and passed in this build environment.
- **Built**: code exists, compiles and renders, but has not been run against a live Supabase project.
- **Pending**: not built yet.
- **Blocked**: needs a decision, account or permission from the project owner.

## Test results (this build)

| Suite | Command | Result |
|---|---|---|
| Unit: game rules, rewards, store, power-ups, adaptive difficulty | `npm test` | 18 / 18 passed |
| Database integration: real migrations, seed and RLS on PostgreSQL 18 (embedded), with a stub of Supabase's `auth` schema | `npm run test:db` | 54 / 54 passed (includes Old/New Testament filtering and separate level bonuses) |
| Browser (desktop Chrome and Pixel 7): full level, gems persist, replay earns nothing, hint purchase, dark mode and text size, locked content, answer sounds, plus the new KJV verse after answers, read-aloud, vibration, share, streak card and calendar, review-my-mistakes, Privacy and Terms | `npm run test:e2e` | all 76 passed, including the new testament test (one run hit a trace-file clash in a single test; it passed on rerun) |
| Accessibility: axe WCAG 2.0/2.1/2.2 A + AA rules on 14 routes (now including Privacy and Terms) × light/dark × desktop/mobile | `npm run test:e2e` | included in the 76 |
| Live gameplay against the real Supabase project (`tests/live/gameplay.spec.ts`) | `npx playwright test -c playwright.live.config.ts tests/live/gameplay.spec.ts` | 1 / 1 passed |
| Production build, and a check that the online build excludes the answer key | `npm run build` | Passed |
| Hosted preview: full level played, no page errors | manual Playwright run | Passed |

The database tests use a stand-in for Supabase's `auth` schema (`supabase/tests/supabase_auth_stub.sql`). They prove the SQL rules, but not Supabase's own Auth service.

## Completed and tested

- Five full game modes plus two challenge modes:
  - Picture Bible Quiz, Who Am I? (progressive clues and scoring), Scripture Challenge, Story Sequencing (accessible move buttons) and Bible Adventure Journey (2 journeys, 12 chapters, unlocked in order).
  - Daily Bible Challenge and Challenge Arena (optional 20-second timer; Expert arena unlocked by a store bonus).
- Four difficulties, chosen by the player. Adaptive suggestion: 85%+ accuracy moves up, under 50% moves down.
- 324 questions (picture 92, Who Am I 52, scripture 153, sequencing 27). Every reference was automatically checked against the KJV text.
- Gem rules, enforced server-side in SQL and mirrored in the preview:
  - 10 for a correct answer (first time per question only), 50 per level, 100 for a perfect round, 25 daily, 250 per adventure, each once.
  - No negative balances. Idempotent purchases. Power-ups are used up once per question.
  - Full transaction history.
- Store: 29 items (power-ups, badges, frames, colour themes, galleries, collectibles, decorations, bonus challenge). Purchases need confirmation; the store shows owned status, inventory, equipping and history.
- Row-level security: players read only their own data. All writes go through database functions. Only published content is visible.
- Editorial workflow in the database: draft → review → approved → published, publishing for admins only, reference-validation trigger, audit log.
- Responsive design in the brand palette; light, dark and high-contrast; text sizes; reduced motion; keyboard play; mobile tab bar.
- Answer sounds: a mini brass fanfare ("ta-DA": a G4 pickup into a C major chord) for correct, chosen by the owner on 17 November from nine options, a soft low tone for incorrect, and a short arpeggio when a round ends. They are generated in the browser (no audio files or licences), can be set to Off, Soft or Normal in Settings, and are never the only signal. Not yet checked by ear on a physical phone.
- PWA: manifest, icons, offline app shell (service worker registration checked locally).
- Gameplay upgrades (16 November):
  - After every answer, the KJV verse is shown (up to 6 verses), with a "Read aloud" button. Story Sequencing shows a short verse line per event.
  - Read question aloud, optional automatic reading and reading speed, using the device's built-in voice.
  - Vibration on right/wrong answers and at round end (can be turned off).
  - Share result: score pattern (■□) and the site address, never the answers. Falls back to copying; shows a note if neither is available.
  - Review my mistakes: replays questions you got wrong until you get them right (server-side in online mode).
  - Daily streaks: 7-day card on Home, month calendar on Profile, current and best streak, using the player's time zone.
- Privacy policy and Terms of use pages (`/privacy`, `/terms`), linked from the footer, Settings, About, Profile and the sign-up form. Plain-language drafts, not legal advice. The contact address comes from `VITE_CONTACT_EMAIL`, which is not set yet.
- Delete my account (online mode, Profile): type DELETE to confirm. It removes the player's data; content they edited as staff is kept.
- Spacing artifacts from the KJV source ("LORD ,") are cleaned in prompts and verses (14 prompts changed; answers unchanged).

## Live Supabase project (16 November 2026)

- Project `biblequest` (ref `zosmfpridatotdrvbqrx`) was created in a new **Free** organization called "BibleQuest". The LearningGem organization and project were not touched.
- Both setup scripts ran on it: 28 tables, all with row-level security, 324 questions (0 published), 29 store items, 12 chapters and 12 achievements.
- Fixed while loading: the `story_sequences` table was missing from the row-level-security list. It is now locked in the live database, `supabase/setup/1_database.sql` and the migration.
- Auth: anonymous guest sign-ins are on; email sign-up with email confirmation is on. The Site URL is still `http://localhost:3000` and must be changed to the real address once the site is hosted.
- **Tested live** (`tests/live`, Playwright desktop Chrome against a local server of the online build): a guest played a full 8-question level and earned 80 gems, which survived a reload. The guest added an email and kept the gems, set a password and bought a 30-gem hint. A second, fresh browser then signed in with that email and password and showed 50 gems. Database check: balance 50, 5 ledger entries, hint ×1 in inventory.
- For that test only, email confirmation was switched off and 8 picture questions were published. Both were reverted afterwards, and the test accounts were deleted.
- Not yet tested: the real confirmation and password-reset emails, phones, and a hosted address. Supabase's built-in email sender is limited to 2 emails per hour; add custom SMTP before launch. CAPTCHA is not enabled.

### Security and performance hardening (applied live 16 November)

- Migrations `20261116000005_hardening_and_gameplay.sql` and `20261116000006_merge_read_policies.sql` were run on the live project, and verse text was added to all 324 questions.
- Role checks moved to a private schema. Every policy was rewritten to name its roles and evaluate the user once per query. A bug in the groups policy was fixed. The `published_questions` view no longer bypasses security, and a counts function replaces it for visitors. All 20 foreign keys are indexed. Deleting a user no longer fails because of content they edited.
- Auth: minimum password length raised from 6 to 8 (the app already required 8). Localhost addresses were added to the redirect allow list. The Site URL is still `http://localhost:3000`.
- The project is hosted in AWS us-east-2 (Ohio, United States), as the Privacy page says.
- Supabase advisors after the change:
  - Security: the earlier ERROR (security-definer view) is gone.
  - Remaining warnings are by design: anonymous guest sign-ins; game and admin functions callable by signed-in users (each checks permissions inside); the leaderboard and question-count functions are public; `story_sequences` is locked with no policy (answers are read only inside functions).
  - Performance: the 15 per-row auth warnings, 20 unindexed foreign keys and duplicate read policies are gone. What remains is 22 "unused index" notes, which is expected with no traffic yet.
- Live gameplay test: a guest played a picture level and all 8 answers showed the verse. Share was offered, the streak showed 1 day, the review round replayed the 5 missed questions with verses, and deleting the account returned the player to a new guest with 0 gems. For this test only, the 92 picture questions were published; they were set back to `review` and the test users were deleted. Live database now: 0 users, 324 questions in `review`.
- The earlier sign-up/second-device live test (`step1`/`step2`) was not rerun after this change.

## Netlify draft (17 November 2026)

- A new Netlify site, `biblequest-game`, was created on the owner's Netlify account. No other Netlify site was changed. A **draft** of the online build was uploaded: https://6afbc0e6f1cef7e3a5b48251--biblequest-game.netlify.app (latest draft: includes the testament choice, the fanfare correct-answer sound and deleted-guest recovery; replaces earlier drafts). Nothing is published to production, so https://biblequest-game.netlify.app shows "not found" for now.
- The security headers from `netlify.toml` are served (checked: Content-Security-Policy, X-Frame-Options, HSTS).
- Supabase Auth: the Site URL is now the draft address. Redirects are allowed for `https://*--biblequest-game.netlify.app/**`, `https://biblequest-game.netlify.app/**` and localhost.
- **Tested on the hosted draft** (Playwright, Pixel 7 emulation, against live Supabase): the gameplay test passed with 8/8 verses, streak, a 5-question review round, account deletion and no page errors. The 92 picture questions were published only for this run, then set back to `review`, and the test users were deleted.
- **Testament choice, tested on the new draft** (Pixel 7 emulation, live Supabase): New Testament levels served only NT references, the choice was remembered after reload, and Old Testament chosen in Settings carried into the Arena with OT references only. The live gameplay test passed again (8/8 verses, 5-question review, no page errors). Picture questions were published only for this run, then set back to `review` (0 published, 324 in review) and test users deleted.
- Not yet tested: a real phone (the owner is testing next), real confirmation emails from the hosted address.
- Note: `netlify.toml` builds `dist` with `npm run build`. If Netlify is later connected to GitHub, set the Supabase variables in Netlify and check that the build output is the online version.

## Testament choice (17 November 2026)

- Players choose **Whole Bible**, **Old Testament** or **New Testament** on the Play hub, on each game's level list, in the Challenge Arena and in Settings ("Bible questions from"). The choice is remembered on the device and, when signed in, saved to the profile.
- Old Testament and New Testament levels are separate levels, each with its own one-time 50-gem completion bonus. Whole-Bible progress is unchanged.
- The server enforces the filter: `start_session` accepts `mode:difficulty:set:ot|nt` and `arena:difficulty:ot|nt`, and only serves questions from books of that testament (migration `20261117000007_testament_choice.sql`, applied to the live project). `published_question_counts()` now returns counts per testament.
- The Daily Challenge and Review my mistakes still use the whole Bible. Adventures already have separate Old and New Testament journeys.
- Current reviewed picture questions: 55 Old Testament, 37 New Testament (none are published yet).

## Owner phone test and fix (17 November 2026)

- The owner's Android phone reached the live project (guest sign-in, catalog and stats requests all succeeded). Its first round requests found no published questions for the chosen game (only picture questions were published). A cleanup of recent test guests then also deleted the owner's guest account by mistake, after which every round failed because the phone kept a sign-in for a deleted account. No round from the phone was saved.
- Fix: on start, the app now checks a saved sign-in with Supabase and drops it if the account no longer exists, and if a guest round fails because the account is gone, it starts a fresh guest once and retries. Tested live: guest started a round, the account was deleted, the same browser came back and its new round and answer were saved under a new guest account.
- Live gameplay test passed again on the new draft (Pixel 7 emulation): 8/8 verses, gems shown from the server (80), review round, no page errors. Test users deleted afterwards.
- Owner retest PASSED on a real phone (Android, Firefox) on draft 6afbc0e6 at 04:54-04:58 UTC 17 Nov 2026: guest started Picture Bible Quiz Level 1, 8/8 answers stored server-side, session marked completed, wallet 230 gems (8 x 10 correct + 50 level + 100 perfect) with 10 matching ledger rows, player_progress saved. The owner then turned the guest into an email account; the email confirmation link worked and the same account kept its gems and progress.
- Owner reported the pictures did not show. Cause: only the 92 picture questions had been published; their 19 illustrations (question_assets) were still in review, and the server only sends an image path for published illustrations. My earlier live gameplay test checked answers and gems but not that images loaded, so it missed this. Fixed by temporarily publishing the 19 illustrations those questions use (hero_jerusalem stays in review). Verified on the hosted draft (Pixel 7 emulation): the image on the first three questions loads (natural width > 0) and appears on screen. Revert both together: questions back to review and these 19 illustrations back to review.
- 17 Nov 2026: at the owner's request ("I want all of them"), all 324 questions were published on the live project (232 more: 153 Scripture Quiz, 52 Who Am I?, 27 Sequence), plus the 2 Journeys and 12 chapters built from them. These have NOT had a human reference review; the owner chose to publish without it. Only the hero_jerusalem illustration remains in review. Live test on the hosted draft (Pixel 7 emulation) played to the results screen in Scripture Quiz (beginner, intermediate NT, advanced), Who Am I? (whole Bible and OT), Sequence (beginner and OT), today's Daily Challenge and Journey chapter ot-1, with server gems rising and no page errors. Not tested: Challenge Arena (needs a store unlock).
- Cleanup rule going forward: never delete accounts while the owner may be testing; delete only after the owner says they are done.

## Built, not yet tested against live Supabase

- Accounts: anonymous guest sessions, registration (keeps guest progress), sign-in, sign-out, password reset and change, cross-device saves (`src/engine/cloud.ts`).
- Admin dashboard, online mode: question editor and bulk status changes, illustration upload to Storage, adventure chapter editor, daily scheduling, store and reward settings, reports, audit log. The read-only preview mode was tested by the accessibility scans.
- Question reporting by players.
- Opt-in daily and weekly leaderboards. The SQL is tested; the screen in online mode is not.
- Error monitoring hook (`src/lib/monitor.ts`); needs `VITE_ERROR_ENDPOINT`.
- Netlify config and security headers (`netlify.toml`). Not yet deployed to Netlify.
- Capacitor config. Native Android/iOS projects have not been generated.

## Pending

- Six game modes, listed as "In development" and not playable: Bible Mystery, Geography Explorer, Hidden Object, Wisdom Decisions, Parables Explorer and Bible Master Challenge.
- More illustrations: 20 of the targeted 100–150 exist.
- Multiplayer, friends and groups: database tables exist, but the features are switched off and labelled "Not yet available".
- Moving UI text into translation files (i18n) and adding a second Bible translation.
- Native app builds and store listings.
- Legal review of the Privacy and Terms drafts, and a public contact email (`VITE_CONTACT_EMAIL`).
- Read-aloud and vibration on a physical phone (tested only with browser stand-ins).

## Blocked: needs the project owner

- **Human review of all content.** Every question, illustration and chapter is seeded as `review`, so the online site shows no questions until an admin approves and publishes them.
- **Netlify production deploy.** Needs your go-ahead and the two environment variables.
- **Licensing decisions:** the image generator's commercial terms, and KJV distribution in the UK (Crown patent).
