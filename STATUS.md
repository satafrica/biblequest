# Development status report

Date: 16 November 2026 · Version 1.0.0-preview.3 (updated 21 November 2026)

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
- 21 Nov 2026: at the owner's request, deploy 6afbc0e6 was published to production: https://biblequest-game.netlify.app (HTTP 200). Supabase site_url changed to that address and it was added to the redirect allow list. Live test on production (Pixel 7 emulation): Picture Bible Quiz Level 1 played to results, image loaded, 8 answers, server wallet 80 gems, no page errors; test guest deleted by id. Two other guest players had already played on production (120 and 130 gems) and were left untouched.
- 21 Nov 2026: accuracy check of the 232 non-picture questions (exact KJV text check for Scripture Quiz; two-stage AI check for Who Am I? and Sequence). 0 reference or answer errors; 19 wording fixes (13 Who Am I? hints now name the Bible section instead of the book that is an answer option, 4 Sequence hints now give the first verse and use a single verse range, 1 spacing fix). The fixes were applied on the live project and all 232 were marked human_review "approved" (reviewed_at 2026-11-21), verified by query. The 92 picture questions are still human_review "pending". Report: tests/review/REPORT.md.
- 21 Nov 2026: the owner saw a building in the creation picture. Replaced it with a new image (light over the waters, land, plants, sun, moon and stars; no buildings or people) and changed its prompt so it no longer asks for architecture; live question_assets.generation_prompt updated. 72 unit tests and 76 browser tests passed. Draft 6b02626b serves the new image (byte match checked). At the owner's request, draft 6b02626b was published to production on 22 Nov 2026 03:34 UTC; https://biblequest-game.netlify.app serves the new image (byte match checked) and the app loads (HTTP 200). Phones that already opened the app may show the old picture until the app refreshes its offline copy (close and reopen). Follow-up deploy 6b0262f2 (published 22 Nov 2026) renamed the runtime image cache to bq-images-v2 with a 30-day limit, so phones that cached the old large picture fetch the new one; verified on the draft that the new picture is stored in bq-images-v2.
- 22 Nov 2026: content expansion 1 added 215 questions (bank 324 -> 539): 102 Scripture Quiz, 57 Picture (using the existing illustrations), 42 Who Am I?, 14 Sequence. All passed the build's automatic KJV checks and a second AI review (Claude Opus 5.5) with fixes applied (tests/review/exp1/REPORT.md). Published on the live project at the owner's request ("More questions should be add"); human_review stays "pending" for these 215. Verified on production: home shows 539 questions, and new Who Am I? and Sequence levels played to results; test guest deleted by id.
- 22 Nov 2026: custom domain. The owner bought mybiblegem.com through Netlify (Netlify DNS). It was attached to the biblequest-game site as the primary domain, with www.mybiblegem.com as an alias. The Let's Encrypt certificate was issued (mybiblegem.com and *.mybiblegem.com, expires 2027-02-20) and HTTPS is forced. www and http redirect to https://mybiblegem.com. Supabase site_url is now https://mybiblegem.com, and both new hosts were added to the redirect allow list (the old netlify.app entries were kept). The old address https://biblequest-game.netlify.app still serves the same app. Guest progress is stored per address, so existing guests keep their progress at the old address; email accounts can sign in at either. Live test on https://mybiblegem.com (Pixel 7 emulation): 539 questions shown, Picture Level 1 played to results with the image loaded, server balance 80 gems, no page errors; the test guest was deleted by id.
- 22 Nov 2026: renamed to MyBibleGem. Every screen (header logo, footer, page title, home, About, Privacy, Terms, admin dashboard, loading and error screens), the share text, the PWA name and short name, and the Capacitor app name now say MyBibleGem. The Capacitor app id changed to com.mybiblegem.app (no native build or store listing existed yet). Admin CSV downloads are now mybiblegem-*.csv. The image ownership and licence notes for the 20 pictures were updated in the source and in the live database. Unchanged on purpose: saved-progress keys (bq.*), the GitHub repo, the Netlify site name biblequest-game, and the old netlify.app address. The account emails never used the old name. Tests: 72 unit and 76 end-to-end passed. Draft 6b026c40 was checked (title, header, footer, manifest and About/Terms/Privacy/Play pages have no 'BibleQuest'), then published to production at the owner's request and checked again on https://mybiblegem.com. Phones that installed the app may keep the old home-screen name until it is reinstalled.
- 22 Nov 2026: update fix. The owner's phone still showed 'BibleQuest' after the rename because the offline service worker kept the old saved copy until every tab of the site was closed. The service worker now uses skipWaiting, clientsClaim and cleanupOutdatedCaches, and main.tsx reloads the page once when a new version takes control. Tested locally with Playwright: after publishing a changed version, the open page switched to it by itself within a few seconds. 72 unit and 76 end-to-end tests passed. Draft 6b026ec0 was checked, then published to production with the owner's approval. Phones that still have the older copy need to close the site fully once (or refresh twice); later updates then appear automatically.
- 22 Nov 2026: faster human review. New admin tab "Quick review" (src/admin/QuickReview.tsx) shows 10 pending questions per page with the answer marked, the stored KJV text, explanation, hint, picture and automated-check badges. The reviewer flags problems with a note and approves the rest of the page with one button. New server function admin_review_questions (migration 20261122000008, applied to the live database) is staff-only, needs a note for "needs a fix", records human_review/reviewed_at/reviewed_by in questions.verification, and writes content_reviews and audit-log rows; it does not change publish status. Tested in rolled-back transactions (player refused, editor approve and flag, empty note refused). The 92 original picture questions got the same AI check as the newer ones (Claude Opus 5.5, tests/review/pic92): no wrong answers; 13 flagged for wording or picture match, with notes stored as verification.ai_note so they show first. All 307 pending questions now have an AI result (294 passed, 13 flagged). The owner's account (Samuel) was given the admin role, and staff now see an "Admin dashboard" button on Profile (the footer link is hidden on phones). UI tested on draft 6b02ec4d with a temporary editor guest (Pixel 7): 307 pending, flagged first, note required before flagging, correct save calls (intercepted, so no real reviews were recorded); the temporary guest was deleted. 72 unit and 76 end-to-end tests passed. Draft 6b02ed73 was published to production at the owner's request (22 Nov 2026); mybiblegem.com serves the Quick review and Profile admin button code.
- 22 Nov 2026: applied the 13 AI-flagged picture fixes (content/source/picture_whoami.py, same question IDs). Reworded: abraham_stars-5 ("his old age"), david_goliath-5 (names the Goliath episode), esther_king-3 ("brought up Esther"), pentecost-1 (no "upper-room"), solomon_temple-1 (now cites 1 Kings 6:14). Distractor changed: empty_tomb-4 ("The third day" became "The second day of the week"). Replaced with questions that match the picture and don't repeat existing ones: joseph_coat-4 (first dream, Genesis 37:7), joseph_coat-5 (Jacob and the coat, Genesis 37:33), moses_red_sea-4 (waters a wall, Exodus 14:22), solomon_temple-2 (cloud filled the house, 1 Kings 8:10-11), elijah_carmel-5 ("The LORD, he is the God", 1 Kings 18:39), daniel_lions-5 (Darius fasting, Daniel 6:18), jonah_fish-5 (prayed out of the fish's belly, Jonah 2:1). All passed the build's KJV keyword check and an AI re-check (tests/review/pic92/recheck, 13 of 13 pass). Updated in the live database (still published; human_review still pending; ai_note removed, ai_fix_applied added). Players get questions from the database, so no site deploy was needed; the offline preview and setup SQL were rebuilt. 0 questions remain AI-flagged.
- 22 Nov 2026: owner sign-off on the remaining 307 questions. At the owner's instruction, all 307 pending questions were marked human_review "approved" (reviewed_at 2026-11-22, reviewed_by the owner's account) on the basis of the KJV reference/keyword check and the AI review, after the 13 AI-flagged fixes. They were not read one by one in Quick review; the review_method field says so. Recorded in the live database with content_reviews and audit-log rows, and in content/source/reviewed_2.json so rebuilds keep it. All 539 questions are now approved and published; no publishing step was needed because they were already live.
- 22 Nov 2026: content expansion 2. 177 new questions (Scripture 115, Who Am I? 40, Story Sequencing 22; no new picture questions) took the bank from 539 to 716. All passed the KJV build check and AI review (Claude Opus 5.5) after 12 fixes, were inserted live as published with human_review "pending" (they show in Quick review), and were verified on mybiblegem.com: "716 questions available" and two new levels played to results. Details: tests/review/exp2/REPORT.md.
- 22 Nov 2026: Who Am I? clue passages. After answering one of the 40 new (expansion 2) Who Am I? questions, the feedback card now has an open-by-default section "Read the Scripture behind each clue" with the KJV passage for each of the 4 clues (185 passages, from the built-in KJV text), a "Read these passages aloud" button, and an open/closed choice that is remembered on the device. The passages are only sent after the answer (submit_answer returns clue_refs; the published_questions view does not expose them). Clue references were drafted and checked by AI (Claude Opus 5.5); every clue was then re-checked against the exact passage players see: 40 of 40 pass (tests/review/exp2/passages). Migration 20261122000009 applied to the live database; live passage data matches the build (md5 check). The other 94 Who Am I? questions keep the single answer verse. Tests: 73 unit and 76 end-to-end passed; draft 6b02fa5e tested against the live database (Pixel 7): Agrippa and Ehud showed 4 clue passages each, older questions unchanged, no page errors; test guest deleted by id. Published to production at the owner's request (22 Nov 2026, deploy 6b02fa5e) and re-tested on https://mybiblegem.com: same result, no page errors; test guest deleted by id.
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

- **Human review of the 20 illustrations.** All 716 questions are published. 539 are approved (232 after a KJV accuracy review on 21 Nov; 307 by owner sign-off on the automated checks on 22 Nov); the 177 from expansion 2 await human review in Quick review.
- **Licensing decisions:** the image generator's commercial terms, and KJV distribution in the UK (Crown patent).
