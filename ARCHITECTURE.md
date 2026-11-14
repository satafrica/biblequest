# BibleQuest architecture

## Overview

```
Browser / PWA / Capacitor app (React + TypeScript + Tailwind)
  │  src/engine/index.ts picks a backend at build time
  ├── CloudBackend (src/engine/cloud.ts) ── supabase-js ──► Supabase
  │                                                          ├─ Auth (anonymous guests, email + password)
  │                                                          ├─ PostgreSQL + row-level security
  │                                                          │   └─ SECURITY DEFINER game functions (RPC)
  │                                                          └─ Storage bucket "illustrations"
  └── LocalBackend (src/engine/local.ts): editorial preview only, same rules in the browser
Netlify: static hosting of dist/, security headers (netlify.toml)
```

The two backends implement one `Backend` interface (`src/engine/types.ts`), so every screen works the same in both. The online build never includes `src/engine/content.ts` (the answer key). This was checked by building with Supabase variables set and confirming that no question text or answers appear in the output.

## Folder map

| Path | Purpose |
|---|---|
| `src/pages/` | Home, Play hub and mode pages, Adventures, Daily, Arena, Leaderboard, Store, Profile, Settings, Account, About, Community |
| `src/game/` | `GameRunner.tsx` (one engine for all question modes), `modes.ts` (catalogue of live and in-development modes) |
| `src/admin/` | Admin dashboard (lazy-loaded) |
| `src/engine/` | Backends, shared types, level keys, adaptive difficulty |
| `src/state/` | App context (user, wallet, inventory, progress, preferences) |
| `src/components/` | Layout, accessible modal, illustration, avatar and gem components |
| `src/lib/` | Supabase client, safe storage, ids, error monitor |
| `content/source/` | Hand-written question source files (Python data) |
| `scripts/build_content.py` | Verifies references against the KJV and writes `src/content/generated/*.json` and `supabase/seed.sql` |
| `supabase/migrations/` | Schema, functions, policies |
| `tests/db/` | Integration tests that run the real migrations on PostgreSQL |
| `tests/e2e/` | Playwright browser and accessibility tests |

## Game flow (server-authoritative)

1. `start_session(level_key)` creates a session and returns questions **without answers**. It checks that the level exists, that questions are published, that the chapter is unlocked, that the daily date is today, and that an expert arena bonus is owned.
2. `submit_answer` / `submit_sequence` checks one answer, records it once (a unique key on session + question), and returns the correct answer, explanation and reference.
3. `complete_session` requires every question answered, then updates progress and applies bonuses.

Level keys: `picture|whoami|scripture|sequence:<difficulty>:<set>` (8 questions), `adv:<chapter>`, `daily:<YYYY-MM-DD>` (5), `arena:<difficulty>` (10).

## Gem economy

All gem changes go through one database function, `_apply_gems`, inside the calling transaction:

- Each change has a unique **idempotency key**, for example `q:<question>`, `level:<key>`, `perfect:<key>`, `daily:<date>`, `adventure:<id>` or `buy:<client key>`. A repeated key does nothing, so retries, offline replays and double-clicks cannot double-award or double-charge.
- The wallet row is locked (`for update`), and a `check (balance >= 0)` constraint backs the "no negative balance" rule.
- Every change writes a `gem_transactions` row with `balance_after`, which gives a full history and makes balances recoverable.
- Reward amounts come from the `reward_rules` table: correct 10, level 50, daily 25, perfect 100, adventure 250. The browser never sends an amount.
- Players cannot insert or update wallets, transactions, inventory or progress directly. Row-level security allows only reading their own rows.
- Gems never expire and cannot be bought or redeemed for money. There is no payment code.

Purchases: the browser creates a key once per confirmed purchase, saves it (`bq.pendingPurchases.v1`), and reuses it if the request is retried. `purchase_item` returns `replayed: true` for a key it has already applied.

## Roles and content states

- Roles: `player`, `editor` (review), `admin` (publish, schedule, adjust).
- Content states: `draft → review → approved → published` (also `rejected`, `archived`). Only `published` rows are visible to players, enforced by row-level security and by the game functions. Publishing requires admin.
- A trigger rejects questions whose book or chapter does not exist (`invalid_reference`).
- `admin_audit_log` records every editorial action.

## Accessibility and preferences

Theme (system/light/dark), high contrast, three text sizes, reduced motion, optional arena timer, full keyboard play (1–4 keys, focus management, visible focus), screen-reader announcements, and an accessible sequencing board with move buttons. Automated axe scans (WCAG 2.0/2.1/2.2 A and AA rules) run on 12 routes, in light and dark, at desktop and mobile sizes.

## Internationalisation

Text lives in components today. Questions carry `translation_id`, and `bible_translations` records licence and permission status. The next step is to move UI strings into message files (`src/i18n/en.json`) before adding a second language.

## Offline

The PWA caches the app shell and small illustrations. In the online build, answers need the server, so the app shows an offline banner. An answer sent without a connection fails with a message and can be retried. If the first attempt actually reached the server, the retry reads back the stored result (`already_answered` recovery) instead of recording or awarding twice. An interrupted round resumes from `bq.active.v1`. Pending purchases keep their idempotency key and are safe to retry. Offline play queues were deliberately not built, because queued answers could not be verified without exposing answers.
