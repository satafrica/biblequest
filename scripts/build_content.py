#!/usr/bin/env python3
"""Build + verify MyBibleGem content.

* Checks every reference exists in the KJV text (content/kjv.json, public domain).
* Checks required keywords appear in the referenced passage.
* Builds Scripture Challenge items directly from verse text (no hand-typed quotations).
* Rejects ambiguous items (distractor word present in the verse, verse text found in a
  distractor book, duplicate ids, duplicate options).
* Emits src/content/generated/*.json for the offline/preview build and supabase/seed.sql.

All generated questions are seeded with status 'review'. Nothing is published
automatically; an editor must approve and an admin must publish.
Run: python3 scripts/build_content.py
"""
import hashlib, json, re, sys, os, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "content", "source"))
from picture_whoami import PICTURE, WHOAMI            # noqa: E402
from scripture_sequence import COMPLETE, WHICH_BOOK, MATCH_REF, SEQUENCES  # noqa: E402
from adventures_assets import ASSETS, ADVENTURES, STORE_ITEMS, ACHIEVEMENTS  # noqa: E402
from assets_2 import ASSETS_2                             # noqa: E402
import illustrations_2 as I2                              # noqa: E402
ASSETS = ASSETS + ASSETS_2
import expansion_1 as X1                                 # noqa: E402
PICTURE = PICTURE + X1.PICTURE_2; WHOAMI = WHOAMI + X1.WHOAMI_2
COMPLETE = COMPLETE + X1.COMPLETE_2; WHICH_BOOK = WHICH_BOOK + X1.WHICH_BOOK_2
MATCH_REF = MATCH_REF + X1.MATCH_REF_2; SEQUENCES = SEQUENCES + X1.SEQUENCES_2
import expansion_2 as X2                                 # noqa: E402
from clue_refs_2 import CLUE_REFS                         # noqa: E402
from clue_refs_1 import CLUE_REFS as CLUE_REFS_1           # noqa: E402
assert not set(CLUE_REFS) & set(CLUE_REFS_1)
CLUE_REFS = {**CLUE_REFS_1, **CLUE_REFS}
WHOAMI = WHOAMI + X2.WHOAMI_3
PICTURE = PICTURE + I2.PICTURE_3
COMPLETE = COMPLETE + X2.COMPLETE_3; WHICH_BOOK = WHICH_BOOK + X2.WHICH_BOOK_3
MATCH_REF = MATCH_REF + X2.MATCH_REF_3; SEQUENCES = SEQUENCES + X2.SEQUENCES_3

KJV = json.load(open(os.path.join(ROOT, "content", "kjv.json"), encoding="utf-8-sig"))
BOOKS = [b["name"] for b in KJV]
BOOK_IDX = {n: i for i, n in enumerate(BOOKS)}
errors = []

def parse_ref(ref):
    m = re.fullmatch(r"(.+?) (\d+):(\d+)(?:-(\d+))?", ref)
    if not m: raise ValueError(f"bad ref {ref}")
    book, ch, v1, v2 = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
    if book not in BOOK_IDX: raise ValueError(f"unknown book {book} in {ref}")
    chapters = KJV[BOOK_IDX[book]]["chapters"]
    if ch > len(chapters): raise ValueError(f"chapter out of range {ref}")
    if v2 > len(chapters[ch-1]) or v1 < 1 or v2 < v1: raise ValueError(f"verse out of range {ref}")
    return book, ch, v1, v2

def clean(text):
    """Tidy spacing artifacts in the source text (e.g. 'earth ,' -> 'earth,')."""
    return re.sub(r" +([.,;:?!])", r"\1", text).strip()

def passage(ref):
    book, ch, v1, v2 = parse_ref(ref)
    return clean(" ".join(KJV[BOOK_IDX[book]]["chapters"][ch-1][v1-1:v2]))

def passage_text(ref):
    """Full KJV passage for the clue/event verse reading: never shortened (references are kept to 15 verses or fewer)."""
    book, ch, v1, v2 = parse_ref(ref)
    if v2 - v1 + 1 > 15: raise ValueError(f"{ref} is longer than 15 verses")
    verses = KJV[BOOK_IDX[book]]["chapters"][ch-1][v1-1:v2]
    if len(verses) != v2 - v1 + 1: raise ValueError(f"{ref} runs past the end of the chapter")
    return clean(" ".join(verses))

def verse_text(ref, max_verses=6, max_chars=700):
    """KJV passage shown to the player after answering. Long passages are shortened, never rewritten."""
    book, ch, v1, v2 = parse_ref(ref)
    verses = KJV[BOOK_IDX[book]]["chapters"][ch-1][v1-1:v2]
    text = clean(" ".join(verses[:max_verses]))
    cut = len(verses) > max_verses
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0]; cut = True
    return text + (" \u2026" if cut else "")

def check_keywords(qid, ref, kws, ignore_hyphens=False):
    try: text = passage(ref)
    except ValueError as e: errors.append(f"{qid}: {e}"); return False
    norm = lambda s: s.replace("\u2019", "'").replace("\u00e6", "ae").replace("\u00c6", "Ae").lower()
    if ignore_hyphens: norm = (lambda f: lambda s: f(s).replace("-", ""))(norm)   # place names: Beer-sheba = Beersheba
    for k in kws:
        if norm(k) not in norm(text):
            errors.append(f"{qid}: keyword '{k}' not found in {ref}: {text[:140]}")
            return False
    return True

def shuffle(qid, options):
    """Deterministic shuffle so the correct answer is not always first."""
    keyed = sorted(range(len(options)), key=lambda i: hashlib.sha1(f"{qid}:{i}".encode()).hexdigest())
    return [options[i] for i in keyed], keyed.index(0)

def base(qid, mode, ref, diff, prompt, options, correct, expl, hint=None, image=None, tags=(), clues=None):
    book, ch, v1, v2 = parse_ref(ref)
    if len(set(o.lower() for o in options)) != len(options): errors.append(f"{qid}: duplicate options")
    return {"id": qid, "game_mode": mode, "book_id": BOOK_IDX[book] + 1, "book": book, "chapter": ch,
            "verse_start": v1, "verse_end": v2, "reference_label": ref, "difficulty": diff, "prompt": prompt,
            "clues": clues, "options": options, "correct_index": correct, "explanation": expl, "hint": hint,
            "image_id": image, "translation_id": "KJV", "tags": list(tags), "status": "review",
            "verification": {"reference_exists": True, "keywords_found": True, "checked_against": "KJV (thiagobodruk/bible en_kjv.json)",
                              "checked_at": datetime.date.today().isoformat(), "human_review": "pending"}}

REVIEWED = json.load(open(os.path.join(ROOT, "content", "source", "reviewed.json"), encoding="utf-8"))
REVIEWED_IDS = set(REVIEWED["ids"])
REVIEWED_BATCHES = []
for _name in ("reviewed.json", "reviewed_2.json", "reviewed_3.json", "reviewed_4.json"):
    _path = os.path.join(ROOT, "content", "source", _name)
    if os.path.exists(_path):
        _b = json.load(open(_path, encoding="utf-8")); _b["ids"] = set(_b["ids"]); REVIEWED_BATCHES.append(_b)

def section_hint(book):
    n = BOOK_IDX[book] + 1
    if n <= 5: return "Look in the books of Moses."
    if n <= 17: return "Look in the books of history."
    if n <= 22: return "Look in the books of poetry and wisdom."
    if n <= 27: return "Look in the Major Prophets."
    if n <= 39: return "Look in the Minor Prophets."
    if n <= 43: return "Look in the Gospels."
    if n == 44: return "Look in Acts."
    if n <= 57: return "Look in Paul's letters."
    if n <= 65: return "Look in the New Testament letters."
    return "Look in Revelation."

questions = []
# --- Picture quiz -----------------------------------------------------------
counts = {}
for (img, diff, prompt, opts, ref, kws, expl, hint) in PICTURE:
    counts[img] = counts.get(img, 0) + 1
    qid = f"pic-{img}-{counts[img]}"
    if not check_keywords(qid, ref, kws): continue
    o, c = shuffle(qid, opts)
    asset = next((a for a in ASSETS if a["id"] == img), None)
    q = base(qid, "picture", ref, diff, prompt, o, c, expl, hint or f"Read {ref}.", img, tags=[img, parse_ref(ref)[0]])
    q["image_alt"] = asset["alt"] if asset else None
    questions.append(q)

# --- Who am I ---------------------------------------------------------------
for (name, diff, clues, opts, ref, kws, expl) in WHOAMI:
    qid = f"who-{name}"
    if not check_keywords(qid, ref, kws): continue
    if len(clues) != 4: errors.append(f"{qid}: needs 4 clues")
    o, c = shuffle(qid, opts)
    book = parse_ref(ref)[0]
    # A hint naming a book that shares a name with an option would reveal (or misdirect to) a person.
    hint = section_hint(book) if any(book == x or book.endswith(" " + x) for x in opts) else f"Look in {book}."
    questions.append(base(qid, "whoami", ref, diff, "Who am I?", o, c, expl, hint, None,
                          tags=[name, parse_ref(ref)[0]], clues=clues))

# --- Scripture: complete the verse -----------------------------------------
for (ref, word, distract, diff) in COMPLETE:
    qid = "scr-cv-" + re.sub(r"[^a-z0-9]+", "-", ref.lower()).strip("-")
    try: text = passage(ref)
    except ValueError as e: errors.append(f"{qid}: {e}"); continue
    pat = re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
    if not pat.search(text): errors.append(f"{qid}: '{word}' not in {ref}"); continue
    for d in distract:
        if re.search(r"\b" + re.escape(d) + r"\b", text, re.IGNORECASE):
            errors.append(f"{qid}: distractor '{d}' appears in verse -> ambiguous")
    blanked = pat.sub("_____", text)
    o, c = shuffle(qid, [word] + distract)
    questions.append(base(qid, "scripture", ref, diff, f"Complete the verse: \u201c{blanked}\u201d", o, c,
                          f"{ref} (KJV): \u201c{text}\u201d", f"The missing word appears {len(pat.findall(text))} time(s).",
                          tags=["complete-verse", parse_ref(ref)[0]]))

# --- Scripture: which book --------------------------------------------------
def book_text(name):
    return " ".join(" ".join(ch) for ch in KJV[BOOK_IDX[name]]["chapters"])
for (ref, distract, diff) in WHICH_BOOK:
    qid = "scr-bk-" + re.sub(r"[^a-z0-9]+", "-", ref.lower()).strip("-")
    try: text = passage(ref); book = parse_ref(ref)[0]
    except ValueError as e: errors.append(f"{qid}: {e}"); continue
    for d in distract:
        if d not in BOOK_IDX: errors.append(f"{qid}: unknown distractor book {d}"); continue
        if d == book: errors.append(f"{qid}: distractor equals answer")
        if text in book_text(d): errors.append(f"{qid}: verse text also appears verbatim in {d} -> ambiguous")
    o, c = shuffle(qid, [book] + distract)
    questions.append(base(qid, "scripture", ref, diff, f"Which book contains this verse? \u201c{text}\u201d", o, c,
                          f"This verse is {ref} (KJV).", f"It is in the {'Old' if BOOK_IDX[book] < 39 else 'New'} Testament.",
                          tags=["which-book", book]))

# --- Scripture: match the reference ----------------------------------------
for (ref, distract, diff) in MATCH_REF:
    qid = "scr-rf-" + re.sub(r"[^a-z0-9]+", "-", ref.lower()).strip("-")
    try:
        text = passage(ref)
        for d in distract:
            if passage(d) == text: errors.append(f"{qid}: distractor {d} has identical text")
    except ValueError as e: errors.append(f"{qid}: {e}"); continue
    o, c = shuffle(qid, [ref] + distract)
    questions.append(base(qid, "scripture", ref, diff, f"Where is this verse found? \u201c{text}\u201d", o, c,
                          f"\u201c{text}\u201d is {ref} (KJV).", f"It is in {parse_ref(ref)[0]}.", tags=["match-reference", parse_ref(ref)[0]]))

# --- Story sequencing -------------------------------------------------------
for (sid, title, diff, events) in SEQUENCES:
    qid = f"seq-{sid}"
    ok = all(check_keywords(f"{qid}/{t[:20]}", r, k) for (t, r, k) in events)
    if not ok: continue
    first = events[0][1]
    label = f"{events[0][1].split(':')[0]} \u2013 {events[-1][1].split(':')[0]}"
    one_chapter = len({r.split(':')[0] for (_, r, _) in events}) == 1
    expl = " \u2192 ".join(f"{t} ({r})" for (t, r, _) in events)
    q = base(qid, "sequence", first, diff, f"Put these events in order: {title}", [t for (t, _, _) in events], 0,
             expl, f"The first event is in {first if one_chapter else first.split(':')[0]}.", tags=[sid, parse_ref(first)[0]])
    if one_chapter:
        b0, c0, v0, _ = parse_ref(first); _, _, _, vz = parse_ref(events[-1][1])
        label = f"{b0} {c0}:{v0}-{vz}"
    q["reference_label"] = label
    q["events_refs"] = [r for (_, r, _) in events]
    questions.append(q)

# --- New modes: Wisdom, Geography, Mystery, Parables (AI-drafted, auto-checked, AI-reviewed twice) and Hidden Object
NEW = json.load(open(os.path.join(ROOT, "content", "source", "new_modes.json"), encoding="utf-8"))
GEO = json.load(open(os.path.join(ROOT, "content", "source", "geo_places.json"), encoding="utf-8"))
geo_name = lambda n: re.sub(r" \d+$", "", n)
NEW_IDS = set()
for it in NEW:
    qid = it["id"]
    mode = it["mode"]
    if not check_keywords(qid, it["reference"], it["keywords"], ignore_hyphens=mode == "geography"): continue
    if mode == "geography":
        names = [it["place"]] + it["distractors"]
        for n in names:
            if n not in GEO: errors.append(f"{qid}: place {n} not in gazetteer")
        if it["kind"] == "identify":
            o, c = shuffle(qid, [geo_name(n) for n in names])
            extra = {"map": {"view": it["view"], "kind": "identify", "markers": [{"lat": GEO[it["place"]]["lat"], "lon": GEO[it["place"]]["lon"]}]}}
        else:
            order, c = shuffle(qid, names)        # marker A..D in shuffled order; correct = letter of the place
            o = ["Marker A", "Marker B", "Marker C", "Marker D"]
            extra = {"map": {"view": it["view"], "kind": "locate", "markers": [{"lat": GEO[n]["lat"], "lon": GEO[n]["lon"], "label": "ABCD"[i]} for i, n in enumerate(order)]}}
        q = base(qid, "geography", it["reference"], it["difficulty"], it["prompt"], o, c, it["explanation"], it.get("hint"), tags=["geography", geo_name(it["place"]), parse_ref(it["reference"])[0]])
        q["extra"] = extra
        q["place_source"] = GEO[it["place"]]["url"]
    else:
        ordered = [it["options"][it["correct"]]] + [x for i, x in enumerate(it["options"]) if i != it["correct"]]
        o, c = shuffle(qid, ordered)      # deterministic shuffle so the answer is not always in the same place
        tags = [mode, parse_ref(it["reference"])[0]]
        q = base(qid, mode, it["reference"], it["difficulty"], it["prompt"], o, c, it["explanation"], it.get("hint"), tags=tags)
        if mode == "mystery":
            q["extra"] = {"case_title": it["case_title"], "stage": it["stage"], "stages": it["stages"], "clue": it["clue"]}
            q["tags"].append(it["case"])
        elif mode == "parables":
            q["extra"] = {"parable_title": it["parable_title"]}
            q["tags"].append(it["parable"])
        else:
            q["extra"] = None
    questions.append(q); NEW_IDS.add(qid)

from hidden_objects import HIDDEN              # noqa: E402
assert not set(HIDDEN) & set(I2.HIDDEN_2)
HIDDEN = {**HIDDEN, **I2.HIDDEN_2}
_asset_ids = {a["id"] for a in ASSETS}
for scene, objs in HIDDEN.items():
    if scene not in _asset_ids: errors.append(f"hidden: no illustration {scene}"); continue
    asset = next(a for a in ASSETS if a["id"] == scene)
    boxes = [{"area": i, "box": b} for i, ob in enumerate(objs) for b in ob[6]]
    for i, (key, prompt, ref, kws, expl, diff, bxs) in enumerate(objs):
        qid = f"hid-{scene}-{key}"
        if not check_keywords(qid, ref, kws): continue
        for b in bxs:
            if len(b) != 4 or b[0] < 0 or b[1] < 0 or b[0] + b[2] > 100.5 or b[1] + b[3] > 100.5: errors.append(f"{qid}: box out of the picture {b}")
        q = base(qid, "hidden", ref, diff, prompt, [f"Area {n + 1}" for n in range(len(objs))], i, expl,
                 f"Look for something mentioned in {ref}.", scene, tags=["hidden", scene, parse_ref(ref)[0]])
        q["image_alt"] = asset["alt"]
        q["extra"] = {"boxes": boxes}
        questions.append(q)

for q in questions: q.setdefault("extra", None)

# --- Who Am I?: KJV passage behind each clue (shown after answering) --------
_who_ids = {q["id"] for q in questions if q["game_mode"] == "whoami"}
for name in CLUE_REFS:
    if f"who-{name}" not in _who_ids: errors.append(f"clue_refs: no question who-{name}")
for q in questions:
    q["clue_refs"] = None
    name = q["id"][4:] if q["game_mode"] == "whoami" else None
    if name in CLUE_REFS:
        refs = CLUE_REFS[name]
        if len(refs) != len(q["clues"]): errors.append(f"{q['id']}: {len(refs)} clue reference lists for {len(q['clues'])} clues"); continue
        try: q["clue_refs"] = [[{"ref": r, "text": passage_text(r)} for r in group] for group in refs]
        except (ValueError, IndexError, KeyError) as e: errors.append(f"{q['id']}: clue reference {e}")
        if any(not g for g in refs): errors.append(f"{q['id']}: a clue has no reference")

# --- Story Sequencing: KJV passage behind each event, in the correct order (shown after answering)
from event_refs import EVENT_REFS                         # noqa: E402
_seq = {q["id"]: q for q in questions if q["game_mode"] == "sequence"}
for sid, refs in EVENT_REFS.items():
    q = _seq.get(sid)
    if q is None: errors.append(f"event_refs: no question {sid}"); continue
    if len(refs) != len(q["options"]): errors.append(f"{sid}: {len(refs)} event reference lists for {len(q['options'])} events"); continue
    if any(not g for g in refs): errors.append(f"{sid}: an event has no reference")
    try: q["clue_refs"] = [[{"ref": r, "text": passage_text(r)} for r in group] for group in refs]
    except (ValueError, IndexError, KeyError) as e: errors.append(f"{sid}: event reference {e}")

for q in questions:
    for batch in REVIEWED_BATCHES:
        if q["id"] in batch["ids"]:
            if batch.get("human_review", "approved") == "approved":
                q["verification"].update({"human_review": "approved", "reviewed_at": batch["reviewed_at"], "review_method": batch["method"]})
            else:  # AI-reviewed only: stays pending so it shows in the admin Quick review
                q["verification"].update({"ai_review": "passed", "ai_reviewed_at": batch["reviewed_at"], "review_method": batch["method"]})
    if q["game_mode"] == "sequence":
        q["verse_text"] = "\n".join(f"{r}: {verse_text(r, 2, 220)}" for r in q["events_refs"])
    else:
        q["verse_text"] = verse_text(q["reference_label"])

ids = [q["id"] for q in questions]
dups = {i for i in ids if ids.count(i) > 1}
if dups: errors.append(f"duplicate ids: {dups}")

# --- Adventures -------------------------------------------------------------
by_tag = {}
for q in questions:
    for t in q["tags"]: by_tag.setdefault(t, []).append(q["id"])
used = set()
adventures = []
for adv in ADVENTURES:
    chapters = []
    for pos, ch in enumerate(adv["chapters"], 1):
        picked = []
        pools = [[q for q in by_tag.get(tag, []) if q not in used] for tag in ch["tags"]]
        while len(picked) < 6 and any(pools):          # round-robin across tags for variety
            for pool in pools:
                while pool and pool[0] in picked: pool.pop(0)
                if pool and len(picked) < 6: picked.append(pool.pop(0))
        if len(picked) < 5: errors.append(f"adventure chapter {ch['id']} only has {len(picked)} questions")
        used.update(picked)
        for r in ch.get("refs", []): parse_ref(r)
        chapters.append({**{k: v for k, v in ch.items() if k not in ("tags", "refs")}, "position": pos, "question_ids": picked})
    adventures.append({**{k: v for k, v in adv.items() if k != "chapters"}, "chapters": chapters})

for adv in adventures: adv["kind"] = "journey"
for ch in (c for a in adventures for c in a["chapters"]): ch["reading"] = None
_by_id = {q["id"]: q for q in questions}
for adv in json.load(open(os.path.join(ROOT, "content", "source", "new_adventures.json"), encoding="utf-8")):
    chapters = []
    for pos, ch in enumerate(adv["chapters"], 1):
        qids = [i for i in ch["question_ids"] if i in _by_id]
        if len(qids) < 3: errors.append(f"{adv['id']}/{ch['id']}: only {len(qids)} questions")
        for r in ch.get("refs", []): parse_ref(r)
        reading = None
        if ch.get("reading"):
            try: reading = [{"ref": r, "text": passage_text(r)} for r in ch["reading"]]
            except ValueError as e: errors.append(f"{ch['id']}: reading {e}")
        chapters.append({"id": ch["id"], "title": ch["title"], "reference_label": ch["reference_label"], "image_id": ch.get("image_id"),
                         "narrative": ch["narrative"], "position": pos, "question_ids": qids, "reading": reading})
    adventures.append({**{k: v for k, v in adv.items() if k != "chapters"}, "chapters": chapters})

if errors:
    print("CONTENT VERIFICATION FAILED:\n  " + "\n  ".join(errors)); sys.exit(1)

# --- Outputs ----------------------------------------------------------------
gen = os.path.join(ROOT, "src", "content", "generated"); os.makedirs(gen, exist_ok=True)
json.dump(questions, open(os.path.join(gen, "questions.json"), "w"), ensure_ascii=False)
json.dump(adventures, open(os.path.join(gen, "adventures.json"), "w"), ensure_ascii=False, indent=1)
json.dump([{k: v for k, v in a.items() if k != "prompt"} for a in ASSETS], open(os.path.join(gen, "assets.json"), "w"), ensure_ascii=False, indent=1)
json.dump(STORE_ITEMS, open(os.path.join(gen, "store.json"), "w"), ensure_ascii=False, indent=1)
json.dump(ACHIEVEMENTS, open(os.path.join(gen, "achievements.json"), "w"), ensure_ascii=False, indent=1)
json.dump([{"id": i + 1, "name": n, "testament": "OT" if i < 39 else "NT", "chapters": len(KJV[i]["chapters"])} for i, n in enumerate(BOOKS)],
          open(os.path.join(gen, "books.json"), "w"))

def lit(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (list, dict)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"
def arr(v): return "array[" + ",".join(lit(x) for x in v) + "]::text[]" if v else "'{}'::text[]"

out = ["-- GENERATED by scripts/build_content.py - do not edit by hand", "begin;",
 "insert into public.bible_translations (id, name, language_code, license, license_notes, permission_status, source_url) values "
 "('KJV','King James Version','en','Public domain (outside the United Kingdom)',"
 "'In the UK the KJV text is under Crown patent administered by Cambridge University Press; obtain permission before UK distribution of KJV text.',"
 "'public_domain','https://github.com/thiagobodruk/bible') on conflict (id) do nothing;"]
out.append("insert into public.bible_books (id, name, testament, chapter_count) values " +
  ",".join(f"({i+1},{lit(n)},'{'OT' if i < 39 else 'NT'}',{len(KJV[i]['chapters'])})" for i, n in enumerate(BOOKS)) + " on conflict (id) do nothing;")
modes = [("picture","Picture Bible Quiz","Identify stories, people and places from illustrations.","live",1),
 ("whoami","Who Am I?","Name the Bible character in as few clues as possible.","live",2),
 ("scripture","Scripture Challenge","Complete verses, name the book and match references.","live",3),
 ("sequence","Story Sequencing","Put the events of a Bible story in order.","live",4),
 ("adventure","Bible Adventure Journey","Travel from Genesis to Revelation, chapter by chapter.","live",5),
 ("arena","Bible Challenge Arena","Timed rounds with optional leaderboards.","live",6),
 ("daily","Daily Bible Challenge","Five questions, new every day.","live",7),
 ("mystery","Bible Mystery","Multi-stage investigations with clues.","live",8),
 ("geography","Bible Geography Explorer","Cities, rivers, mountains and journeys on reviewed maps.","live",9),
 ("hidden","Hidden Object Adventure","Find objects connected to Bible stories.","live",10),
 ("wisdom","Bible Wisdom Decisions","Real-life choices connected to biblical teaching.","live",11),
 ("parables","Parables Explorer","Interactive journeys through the parables of Jesus.","live",12),
 ("master","Bible Master Challenge","Expert-level challenges across all of Scripture.","live",13),
 ("challenge","Challenge Match","Play the same questions as friends or a group.","live",15)]
out.append("insert into public.game_modes (id, name, description, availability, sort_order) values " +
  ",".join(f"({lit(a)},{lit(b)},{lit(c)},{lit(d)},{e})" for a,b,c,d,e in modes) + " on conflict (id) do update set availability = excluded.availability;")
out.append("insert into public.reward_rules (id, gems, description) values ('correct_answer',10,'First correct answer to a question'),"
  "('level_complete',50,'First completion of a level'),('daily_challenge',25,'Daily challenge completed'),"
  "('perfect_round',100,'First perfect score on a level'),('adventure_complete',250,'All chapters of an adventure completed') on conflict (id) do nothing;")
for a in ASSETS:
    out.append("insert into public.question_assets (id, description, bible_reference, generation_prompt, ownership, license, is_artistic_interpretation, interpretation_note, alt_text, storage_path, width, height, review_status) values ("
      + ",".join([lit(a["id"]), lit(a["description"]), lit(a["reference"]), lit(a["prompt"]), lit("MyBibleGem project owner"),
                  lit("AI-generated for MyBibleGem (GPT Image); confirm commercial-use terms of the generator before release"), "true",
                  lit(a["interpretation_note"]), lit(a["alt"]), lit(a["path"]), "1200", lit(a.get("height", 900)), "'review'"]) + ") on conflict (id) do nothing;")
for q in questions:
    out.append("insert into public.questions (id, game_mode, book_id, chapter, verse_start, verse_end, reference_label, difficulty, prompt, clues, options, correct_index, explanation, hint, image_id, image_alt, translation_id, tags, status, verification, verse_text, clue_refs, extra) values ("
      + ",".join([lit(q["id"]), lit(q["game_mode"]), str(q["book_id"]), str(q["chapter"]), str(q["verse_start"]), str(q["verse_end"]),
                  lit(q["reference_label"]), str(q["difficulty"]), lit(q["prompt"]), lit(q["clues"]), lit(q["options"]), str(q["correct_index"]),
                  lit(q["explanation"]), lit(q["hint"]), lit(q["image_id"]), lit(q.get("image_alt")), "'KJV'", arr(q["tags"]), "'review'", lit(q["verification"]), lit(q["verse_text"]), lit(q["clue_refs"]), lit(q["extra"])])
      + ") on conflict (id) do nothing;")
for i, adv in enumerate(adventures):
    out.append(f"insert into public.adventures (id, title, summary, testament, image_id, sort_order, status, kind) values ({lit(adv['id'])},{lit(adv['title'])},{lit(adv['summary'])},{lit(adv['testament'])},{lit(adv['image_id'])},{i},'review',{lit(adv['kind'])}) on conflict (id) do nothing;")
    for ch in adv["chapters"]:
        out.append(f"insert into public.adventure_chapters (id, adventure_id, position, title, reference_label, narrative, image_id, question_ids, status, reading) values ({lit(ch['id'])},{lit(adv['id'])},{ch['position']},{lit(ch['title'])},{lit(ch['reference_label'])},{lit(ch['narrative'])},{lit(ch['image_id'])},{arr(ch['question_ids'])},'review',{lit(ch['reading'])}) on conflict (id) do nothing;")
for s in STORE_ITEMS:
    out.append(f"insert into public.store_items (id, name, description, category, price, consumable, image_path, image_alt, sort_order) values ({lit(s['id'])},{lit(s['name'])},{lit(s['description'])},{lit(s['category'])},{s['price']},{lit(s['consumable'])},{lit(s.get('image'))},{lit(s.get('image_alt'))},{s.get('sort',0)}) on conflict (id) do nothing;")
for a in ACHIEVEMENTS:
    out.append(f"insert into public.achievements (id, name, description, icon, rule) values ({lit(a['id'])},{lit(a['name'])},{lit(a['description'])},{lit(a['icon'])},{lit(a['rule'])}) on conflict (id) do nothing;")
out.append("commit;")
open(os.path.join(ROOT, "supabase", "seed.sql"), "w").write("\n".join(out) + "\n")

modes_count = {}
for q in questions: modes_count[q["game_mode"]] = modes_count.get(q["game_mode"], 0) + 1
print(f"OK: {len(questions)} questions verified {modes_count}; {sum(len(a['chapters']) for a in adventures)} adventure chapters; {len(ASSETS)} assets")
