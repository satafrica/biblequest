# Content expansion 1: review record (22 November 2026)

215 new questions in `content/source/expansion_1.py`, bringing the bank from 324 to 539.

| Game | New | Total now |
|---|---|---|
| Scripture Quiz (complete the verse 47, which book 35, where is it found 20) | 102 | 255 |
| Picture Bible Quiz (reusing the existing illustrations) | 57 | 149 |
| Who Am I? | 42 | 94 |
| Story Sequencing | 14 | 41 |

## Checks

1. **Automatic KJV check (build step).** Every reference exists. Every keyword appears in the cited KJV passage. Every missing word appears in its verse, and no wrong option for it does. No "which book" verse appears word for word in a wrong-option book. No "where is it found" wrong option has the same text. Result: 215/215 passed. No existing question changed (byte comparison of the 324 old items).
2. **AI review (Claude Opus 5.5), with the KJV text of each cited passage supplied:**
   - Picture: answer supported, no defensible wrong option, explanation accurate, fits the illustration. The first pass flagged 10 items whose question was about a different scene than the illustration. All were replaced with scene-based questions. Second pass: 57/57 passed.
   - Sequence: events supported, order correct and unambiguous. The first pass flagged 2 items (one event reference, one misleading title "Saul Becomes Paul"). Both were fixed. Second pass: 14/14 passed.
   - Who Am I?, stage 1 (reference for every clue): all 42 answers were correct. Clue wording was tightened on 6 items (Andrew, Caiaphas, Hosea, Bathsheba, Cornelius).
   - Who Am I?, stage 2 (each clue checked against the KJV text of its proposed reference): 41 passed. 1 fix was applied (Andrew: clue 2 wording and reference extended to John 1:40-42).
3. **Live check on production (Pixel 7 emulation):**
   - The home screen shows "539 questions available".
   - Who Am I? Advanced level 4 (new questions) and Story Sequencing Beginner level 1 were played to the results screen with no page errors.
   - The test guest was deleted by id afterwards.

## Status in the database

All 215 are `published`, with `verification.ai_review = "passed"`. `human_review` stays `"pending"`: no person has reviewed them yet.

Raw results: pic.jsonl, seq.jsonl, who1.jsonl and who2.jsonl in this folder. The `.v1` files are the first-pass results.
