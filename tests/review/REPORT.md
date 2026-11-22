# BibleQuest Question Review: 232 Questions

Checked 21 November 2026 against the King James Version text the app uses (public domain, `content/kjv.json`). These are the 232 questions that were published on 17 November without review. The 92 Picture Bible Quiz questions were not part of this check.

## How they were checked

- **Scripture Quiz (153):** an exact computer check. Every quoted verse was compared word for word with the KJV at its stated reference. For fill-in-the-blank questions, the correct word must complete the verse and no wrong option may also complete it. For "which book" and "where is this verse" questions, the quote must appear at the stated reference, and the whole Bible was searched to make sure it doesn't also appear in a book or reference offered as a wrong option.
- **Who Am I? (52) and Sequence (27):** an AI review in two passes. For Who Am I?, each clue was matched to a supporting verse, the verse was confirmed to exist, and its KJV text was pulled from the local Bible file. A second pass then judged each clue against that text. For Sequence, each event was judged against the KJV text of its cited verses, and the event order was checked. I then read every flagged item myself.
- **Not a human theological review.** This is a careful accuracy check, not a sign-off by a pastor or scholar. The `human_review` field is still "pending" until you approve.

## Results

| Game | Checked | Reference or answer errors | Wording/hint issues |
|---|---|---|---|
| Scripture Quiz | 153 | 0 | 2 (stray spaces) |
| Who Am I? | 52 | 0 | 13 (hint gives the answer away) |
| Sequence | 27 | 0 | 4 (hint gives no help) |
| **Total** | **232** | **0** | **19** |

Every correct answer is right. Every Scripture Quiz quote matches the KJV exactly. Every Sequence order is correct, and no order was judged ambiguous.

## Issues to fix

### 1. Who Am I? hints that give the answer away (13)

The hint "Look in [book]." names a book with the same name as the person, so it either reveals the answer or points to a wrong option.

| Question | Answer | Current hint | Problem |
|---|---|---|---|
| who-caleb | Caleb | Look in Joshua. | points to the wrong option Joshua |
| who-daniel | Daniel | Look in Daniel. | reveals the answer |
| who-esther | Esther | Look in Esther. | reveals the answer |
| who-isaiah | Isaiah | Look in Isaiah. | reveals the answer |
| who-jeremiah | Jeremiah | Look in Jeremiah. | reveals the answer |
| who-job | Job | Look in Job. | reveals the answer |
| who-jonah | Jonah | Look in Jonah. | reveals the answer |
| who-joshua | Joshua | Look in Joshua. | reveals the answer |
| who-matthew | Matthew | Look in Matthew. | reveals the answer |
| who-nehemiah | Nehemiah | Look in Nehemiah. | reveals the answer |
| who-ruth | Ruth | Look in Ruth. | reveals the answer |
| who-samuel | Samuel | Look in 1 Samuel. | reveals the answer |
| who-timothy | Timothy | Look in 2 Timothy. | reveals the answer |

Proposed fix: replace the hint with the section of the Bible, for example "Look in the Major Prophets.", "Look in the books of history." or "Look in Paul's letters.".

### 2. Sequence hints that give no help (4)

All the events are in the same chapter, so "The first event is in Luke 15." tells the player nothing, and the reference reads oddly ("Luke 15 – Luke 15").

| Question | Current hint | Current reference |
|---|---|---|
| seq-creation | The first event is in Genesis 1. | Genesis 1 – Genesis 1 |
| seq-prodigal | The first event is in Luke 15. | Luke 15 – Luke 15 |
| seq-resurrection | The first event is in Luke 24. | Luke 24 – Luke 24 |
| seq-samaritan | The first event is in Luke 10. | Luke 10 – Luke 10 |

Proposed fix: give the first event's verse (for example "The first event is in Luke 15:12.") and show the reference as a single range ("Luke 15:11-32").

### 3. Stray spaces in two explanations (2)

`scr-cv-jeremiah-29-11` and `scr-rf-jeremiah-29-11` show "saith the LORD , thoughts of peace" with a space before the comma. Proposed fix: remove the space.

## Accurate but worth knowing

- **who-john_apostle:** two clues rest on tradition: that John is the "disciple whom Jesus loved", and that the John of Patmos is the apostle. The first clue says "Tradition identifies me…", so it is honest. You may want the Patmos clue worded the same way.
- **who-miriam:** Exodus 2 doesn't name the sister who watched baby Moses. Calling her Miriam is the standard reading, based on Numbers 26:59. This is acceptable.
- **who-matthew:** Luke 5:29 calls him Levi. Matthew 9:9-10 names him Matthew and would be a more direct source.
- **Sequence citations:** some events cite a verse just next to the action. For example, the burning bush cites Exodus 3:2, but God speaks in 3:4. The first Passover cites 12:13, but it is kept in 12:28. The events are accurate. Widening those references is optional polish.
