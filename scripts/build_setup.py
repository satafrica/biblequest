#!/usr/bin/env python3
"""Regenerate the two paste-into-SQL-editor setup files from supabase/migrations and supabase/seed.sql.
Run after changing a migration or after `npm run build:content`:  python3 scripts/build_setup.py"""
import glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = ["-- BibleQuest database setup, part 1 of 2: tables, security rules and game functions.",
       "-- Paste all of this into Supabase -> SQL Editor -> New query, then press Run.",
       "-- Safe to run on a new, empty project. Generated from supabase/migrations/.",
       "begin;", ""]
for f in sorted(glob.glob(os.path.join(ROOT, "supabase", "migrations", "*.sql"))):
    out += [f"-- ===== {os.path.basename(f)} =====", open(f).read().rstrip("\n"), ""]
out += ["commit;"]
open(os.path.join(ROOT, "supabase", "setup", "1_database.sql"), "w").write("\n".join(out) + "\n")
seed = open(os.path.join(ROOT, "supabase", "seed.sql")).read()
open(os.path.join(ROOT, "supabase", "setup", "2_content.sql"), "w").write(
    "-- BibleQuest database setup, part 2 of 2: questions, adventures, store items and achievements.\n"
    "-- Run this after part 1. All questions load in 'review' status (not visible to players until published).\n" + seed)
print("wrote supabase/setup/1_database.sql and 2_content.sql")
