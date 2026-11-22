# Content expansion 2: review record (22 November 2026)

177 new questions in `content/source/expansion_2.py`, bringing the bank from 539 to 716.

| Game | New | Total now |
|---|---|---|
| Scripture Quiz (complete the verse 46, which book 40, where is it found 29) | 115 | 370 |
| Who Am I? (40 new people, e.g. Abel, Hagar, Ehud, Jephthah, Naomi, Joab, Jehu, Nebuchadnezzar, Mordecai, Bartimaeus, Jairus, Agrippa, Onesimus) | 40 | 134 |
| Story Sequencing (22 new stories, e.g. Balaam, Deborah and Barak, Absalom, Elisha, Josiah, Peter's denial, Philip and the Ethiopian, Paul and Silas at Philippi) | 22 | 63 |
| Picture Bible Quiz | 0 | 149 |

No picture questions were added: each of the 20 illustrations already has 7-9 questions, and more would repeat.

## Checks

1. **Automatic KJV check (build step).** Every reference exists, every keyword appears in its cited KJV passage, every missing word appears in its verse and no wrong option does, no "which book" verse appears word for word in a wrong-option book, and no "where is it found" wrong option has the same text. First run: 2 keyword errors (KJV spells "Beth-el"; Rhoda is named in verse 13, not 14), both fixed. Result: 177/177 passed. No new verse, person or story id repeats an existing one. The 539 existing questions are byte-for-byte unchanged.
2. **AI review (Claude Opus 5.5), with the KJV text supplied:**
   - Who Am I?, stage 1: all 40 answers correct. Wording tightened on 10 items (Ananias, Matthias, Simon of Cyrene, Jairus, Onesimus, Ehud, Benjamin, Joseph of Arimathea, Haman, Zipporah) where a clue overstated the text.
   - Who Am I?, stage 2 (each clue against the KJV text of its reference): 39 passed; Zipporah failed on a weak reference, clue reworded to Exodus 3:10 and re-checked: pass. 40/40.
   - Story Sequencing: 21 passed; Hezekiah flagged because the illness may have come before the Assyrian events. Replaced those events with clearly ordered ones (2 Kings 18:4, 18:13, 19:14, 19:35, 19:37) and re-checked: pass. 22/22.
   - Scripture items rely on the exact-text checks in step 1, as in expansion 1.
3. **Live database.** The 177 rows were inserted and verified with a content hash against the build output (match). All 716 questions are published.
4. **Live check on mybiblegem.com (Pixel 7 emulation):** home screen shows "716 questions available"; Who Am I? Advanced level 1 and Story Sequencing Intermediate level 1 (new questions, e.g. Agrippa, Ehud, Balaam, Absalom) were played to the results screen with no page errors. The test guest was deleted by id afterwards.

## Status in the database

All 177 are `published`, with `verification.ai_review = "passed"` and `human_review = "pending"`, so they appear in the Admin dashboard's Quick review for the owner.

Raw results: who1.jsonl, who2.jsonl, seq.jsonl in this folder (`.v1` files are first-pass results).

## Clue passages (22 Nov 2026)

Each of the 40 Who Am I? items has KJV references for every clue (content/source/clue_refs_2.py). References were drafted by AI, checked in a second pass (32 were widened with context verses), and finally every clue was checked against the exact passage text players see: 40/40 pass. Files: tests/review/exp2/passages/.

The same feature was extended to the other 94 Who Am I? questions on 22 Nov 2026; see tests/review/clue1.
