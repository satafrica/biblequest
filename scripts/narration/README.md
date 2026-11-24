# Recorded narration

Who Am I? has recorded narration (Gemini voice "Algieba", an AI-generated voice). Clips live in the
public Supabase Storage bucket `narration` as `whoami/<key>.mp3`, plus `manifest.json` listing the
keys per game. `<key>` is `narrationKey(text)` from `src/lib/speech.ts`, a hash of the exact spoken
words, so a clip only plays for text it matches. If any part has no clip (for example after a question
is edited), or playback fails, the app reads the text with the device voice instead.

The parts come from `src/game/narration.ts` (the app and this script use the same functions):
prompt + clue 1, clue 2, clue 3, clue 4, options, answer detail (answer, reference, verse,
explanation unless it only repeats the verse), and the shared "Correct." / "Not quite.".

Workflow used on 24 Nov 2026 (804 clips, about 72,500 characters):
1. `node scripts/narration/build.mjs` (reads the published questions exported to /tmp/narr/whoami.json)
   writes the part texts (`whoami-segments.json` is the copy used).
2. One recording per question with all six parts, split by `split.py` using faster-whisper word
   timings and the pauses; parts that failed the word check were re-recorded singly (`single.py`).
3. `verify.py` / `verify_detail.py` re-transcribe every clip and flag skipped phrases; 2 answers with a
   skipped phrase were re-recorded (one in two halves).
4. `upload.mjs` uploads with a temporary guest that a uid-scoped storage policy allows to write; the
   policy and the guest are removed afterwards.

## Scripture Quiz (24 Nov 2026): five voices taking turns
Voices: Charon, Algieba, Vindemiatrix, Kore, Gacrux. Questions sorted by id get the voices in turn
(74 each). Clips are stored as `scripture/<voice>/<key>.mp3`; the manifest entry is
`{ voices: { <voice>: [key…] } }`. The app plays a list of parts only in a voice that has every
part, so a question and its feedback are always in the same voice. "Correct." and "Not quite." are
recorded in all five voices.
Parts per question: prompt, options, answer detail (1,110 + 10 verdicts, about 146,000 characters).
1. Export published questions to /tmp/narr/scripture.json; `node scripts/narration/build_scripture.mjs`.
2. Two questions per recording (`t_pNNN.txt`), split with `sq_split.py`; parts that failed were
   re-recorded singly (61).
3. Clips with a length far from their word count (repeats or cuts) were re-transcribed with
   `sq_verify.py` (140); 42 were re-recorded singly and checked again. Two clips that speech-to-text
   stopped early on were confirmed complete by transcribing their second half.
4. `upload_voices.mjs scripture <clipsDir> [--whoami-fix <dir> <keys.json>]` with the temporary
   uploader guest and uid-scoped storage policies (removed afterwards).
The feedback no longer repeats the reference ("This verse is Acts 9:4 (KJV).", or the reference
when it is the answer). That also shortened 5 Who Am I? answers, which were re-recorded in Algieba.

## Other games (24 Nov 2026): one voice per game
Picture Bible Quiz and Geography Explorer: Kore. Hidden Object: Vindemiatrix. Bible Mystery: Charon.
Wisdom Decisions and Sequence: Gacrux. Parables Explorer: Algieba. Manifest entries are
`{ voice, clips }`, stored as `<mode>/<key>.mp3`.
Read-aloud changes made for recording: Sequence reads the prompt and then each event as its own part
in the order on screen (the numbers are no longer read, because the shuffled order would need a
recording for every position); Hidden Object and Sequence feedback is a verdict part plus a detail part.
1. Export published questions of these games to /tmp/narr/others.json; `node scripts/narration/build_games.mjs`.
2. `python3 scripts/narration/g_batches.py` packs the unique parts into about 2,500-byte recordings
   (`narr_g/g_<mode>_NNN.txt`); "Correct." / "Not quite." are copied from the Scripture Quiz clips.
3. Record each with the game's voice, split with `g_split.py`, re-record failed parts singly.
4. Checks: `g_optcheck.py` (every option list) and `g_fullcheck.py <shard> <n>` (every other clip) re-transcribe
   the clips and flag missing or extra words (repeats, text from a neighbouring part); flagged clips and
   their neighbours were re-recorded singly. `g_audit.mjs` confirms every part of every published
   question (both verdicts) has a clip in manifest-next.json.
5. `upload_games.mjs <clipsDir>` uploads the clips and writes `manifest-next.json` (the live
   `manifest.json` is unchanged). A draft build with `VITE_NARRATION_MANIFEST=manifest-next.json`
   reads it. At publish: build normally, publish, then `upload_games.mjs --promote`.
