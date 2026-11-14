# Development status report

Date: 14 November 2026 · Version 1.0.0-preview.1

Status labels:

- **Tested**: automated tests ran and passed in this build environment.
- **Built**: code exists, compiles and renders, but has not been run against a live Supabase project.
- **Pending**: not built yet.
- **Blocked**: needs a decision, account or permission from the project owner.

## Test results (this build)

| Suite | Command | Result |
|---|---|---|
| Unit: game rules, rewards, store, power-ups, adaptive difficulty | `npm test` | 12 / 12 passed |
| Database integration: real migrations, seed and RLS on PostgreSQL 18 (embedded), with a stub of Supabase's `auth` schema | `npm run test:db` | 43 / 43 passed |
| Browser: guest plays a full level, gems persist across reload, replay earns nothing, buy a hint with confirmation, dark mode and text size persist, locked content shown honestly. Desktop Chrome and Pixel 7 | `npm run test:e2e` | 6 / 6 passed |
| Accessibility: axe WCAG 2.0/2.1/2.2 A + AA rules on 12 routes × light/dark × desktop/mobile | `npm run test:e2e` | 48 / 48 passed |
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
- PWA: manifest, icons, offline app shell (service worker registration checked locally).

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
- Native app builds, store listings, privacy policy and terms pages.

## Blocked: needs the project owner

- **Human review of all content.** Every question, illustration and chapter is seeded as `review`, so the online site shows no questions until an admin approves and publishes them.
- **Supabase project.** Creating a new project may cost money and needs your approval. The existing LearningGem project was not touched.
- **Netlify production deploy.** Needs your go-ahead and the two environment variables.
- **Licensing decisions:** the image generator's commercial terms, and KJV distribution in the UK (Crown patent).
