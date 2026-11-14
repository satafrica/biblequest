# BibleQuest

**Explore Scripture. Play the Adventure. Discover the Truth.**

BibleQuest is a Bible gaming and learning platform for adults. Every answer shows its Scripture reference and a short explanation drawn from the text. Guests can play without registering. Signed-in players keep their progress and gems across devices.

> Status: Version 1.0 preview. See [STATUS.md](STATUS.md) for what is complete, tested, pending and blocked.

## What is in this repository

| Area | Where | Notes |
|---|---|---|
| Web app (React 19, TypeScript, Tailwind) | `src/` | Installable PWA. Light and dark modes, high contrast, text size, reduced motion |
| Game engine | `src/game/GameRunner.tsx`, `src/engine/` | Picture Quiz, Who Am I?, Scripture Challenge, Story Sequencing, Adventure Journey, Daily Challenge, Challenge Arena |
| Database (Supabase / PostgreSQL) | `supabase/migrations/` | Tables, indexes, constraints, row-level security and server-side game functions |
| Seed content | `supabase/seed.sql` | 324 KJV-checked questions, 2 adventures (12 chapters), 20 illustrations, 29 store items, 12 achievements |
| Content pipeline | `content/source/`, `scripts/build_content.py` | Checks every reference against the KJV text before the question is accepted |
| Admin dashboard | `src/admin/` | Draft → review → approved → published workflow, uploads, adventures, daily challenges, reports, audit log |
| Tests | `src/**/*.test.ts`, `tests/db/`, `tests/e2e/` | Unit, real-PostgreSQL integration, and Playwright browser and accessibility tests |
| Deployment | `netlify.toml`, `.env.example` | Netlify build, security headers |
| Mobile | `capacitor.config.ts` | Capacitor wrapper for Android and iOS (native projects not generated yet) |

## Two build modes

1. **Editorial preview (no environment variables).** Runs entirely in the browser using the bundled questions. Gems are practice gems saved on that device. Accounts are switched off. This build includes the answer key in its JavaScript, so it is for review only, not for production.
2. **Online build (Supabase variables set).** Questions, answers, gems, purchases and progress all live in Supabase. Answers are checked and gems are awarded only by database functions. This build does not contain the answer key.

## Commands

```bash
npm install            # once
npm run dev            # local development at http://localhost:5173
npm run build          # production build into dist/
npm test               # unit tests (game rules)
npm run test:db        # database tests on a real, temporary PostgreSQL
npm run test:e2e       # browser tests (desktop + mobile) and WCAG scans
npm run build:content  # rebuild questions from content/source after editing
```

## Documents

- [SETUP.md](SETUP.md): step-by-step GitHub, Supabase and Netlify setup for non-programmers
- [ARCHITECTURE.md](ARCHITECTURE.md): how the pieces fit together, the gem rules and the security model
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md): what must happen before public launch
- [STATUS.md](STATUS.md): development status report

## Content and licensing

- Scripture text: King James Version. Public domain outside the United Kingdom. In the UK, the KJV is under Crown letters patent administered by Cambridge University Press. See PRODUCTION_CHECKLIST.md.
- KJV source file used for automated checks: [thiagobodruk/bible](https://github.com/thiagobodruk/bible) (`json/en_kjv.json`).
- Illustrations: AI-generated artistic interpretations made for BibleQuest. Each one carries a note separating what Scripture describes from what the artist imagined.
- No other translations are bundled. Add one only after its licence is confirmed (see the `bible_translations.permission_status` column).
