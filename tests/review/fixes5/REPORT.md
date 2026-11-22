# Fixes for the 37 questions left pending (22 Nov 2026)

These are the AI assistant's (Perplexity Computer) fixes for the 37 questions that failed the pending-batch review (`tests/review/pending4/REPORT.md`), made at the owner's request. Question ids are unchanged. All 37 stay **pending** in Quick review until they are approved.

## What changed
- **26 hints that gave the answer away.** They now point to the verse without restating the answer.
  - Mystery clues that also gave it away were reworded: m3-1, m4-1, m4-3, m6-3, m7-1, m11-4.
  - Case "The Spies on the Roof" was renamed "The Spies in Jericho" (all 5 stages and the chapter title).
  - wis-w7-2 got more realistic wrong choices.
  - wis-w8-1 now quotes all of Matthew 5:44.
  - who-achan's hint is now "Look in the books of history", and clue 1 says "from among the spoils".
- **Scripture Quiz:**
  - 1 Peter 5:7 has new wrong choices (1 Peter 5:6, 1 Peter 5:10, Psalms 55:22), so "It is in 1 Peter" no longer gives it away.
  - Matthew 7:7 no longer offers Luke 11:9, which has the same words; it offers Matthew 7:8 instead.
- **Accuracy:**
  - Daniel: "Find the mouth of the den, where the stone was laid."
  - Elijah's altar now cites 1 Kings 18:31-32.
  - The Good Samaritan question now asks for the priest and the Levite and cites Luke 10:31-32.
  - The Solomon's temple pillars explanation now names Hiram (1 Kings 7:13-21).
  - Noah: "Find a beast going forth out of the ark." Every animal pair counts.
- **Three near-duplicates replaced:**
  - geo-gx-3 is now Dothan (Genesis 37:17).
  - wis-w5-2 is now Proverbs 27:6, about honest friends. A first draft on Proverbs 22:7 (debt) failed review as money advice and was replaced.
  - wis-w7-6 is now Proverbs 13:20 (wise companions).
- **Picture answer areas:**
  - Moses: both walls of water now count.
  - Noah: the whole ark counts, and the rainbow follows its arc.
  - These box changes also touch the other questions on those two pictures, which stay approved: noah dove and bow, moses rod, flocks and moses. Mystery m4-4 and m4-5 changed only in the case title. The bow question's own answer area changed and was re-checked.

## Checks
- `auto.py`: KJV text, hints, options and boxes. 0 problems.
- Build checks: references, keywords and map markers. Passed.
- Fresh Claude Opus 5.5 review: 37/37 pass, after the 2 re-drafts above.
- Vision check (`hidden.jsonl`):
  - The red areas show the object clearly in all 9 pictures.
  - The remaining "blue also contains it" notes are overlaps, which the game resolves by taking the smaller box.
  - The assistant confirmed this with a tap map of each scene.
- Live DB: 44 rows updated, verified field by field against the build with 0 mismatches. Totals are 1286 approved and 37 pending.
- The live rows carry `verification.ai_fix_applied`. The build's `verification` does not carry this note.
