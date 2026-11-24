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
