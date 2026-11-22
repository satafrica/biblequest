"""AI drafting for the new game modes. Drafts are NOT content: they go through
KJV build checks (scripts/build_content.py) and a separate AI review before use.
Usage: python3 draft.py wisdom|geography|mystery|parables
"""
import asyncio, json, os, sys
from model_batch import run_batch
from pplx.python.sdks.llm_api import Client, Conversation, FinishReason, Identity, LLMAPIClient, RoundRobinRetryPolicy, SamplingParams, StructuredOutputParams, ResponseFormat
MODEL = 'claude_opus_5_5'
stage = sys.argv[1]

COMMON = ("You write content for MyBibleGem, an adult Bible quiz game that quotes the King James Version (KJV). "
          "Every reference must be a real KJV reference in the form 'Book C:V' or 'Book C:V-V' (a single chapter, at most 15 verses), "
          "using KJV book names (Psalms, Song of Solomon, Revelation, 1 Samuel, etc.). Never invent a reference. "
          "'keywords' must be 1-3 words or short phrases that appear VERBATIM (same spelling, KJV wording) in the cited passage, so an automatic check can confirm the passage is about this. "
          "Explanations are 1-2 sentences, accurate to the cited text, and cite it. Hints nudge without giving the answer. "
          "Wrong options must be clearly wrong according to the cited text, never defensible. Keep a respectful, adult, non-denominational tone; avoid doctrines that Christian traditions dispute.")

MC = {'type': 'object', 'additionalProperties': False, 'properties': {
    'prompt': {'type': 'string'}, 'options': {'type': 'array', 'items': {'type': 'string'}},
    'correct': {'type': 'integer', 'description': 'index 0-3 of the correct option'},
    'reference': {'type': 'string'}, 'keywords': {'type': 'array', 'items': {'type': 'string'}},
    'explanation': {'type': 'string'}, 'hint': {'type': 'string'}, 'difficulty': {'type': 'integer', 'description': '1 Beginner, 2 Intermediate, 3 Advanced, 4 Expert'}},
    'required': ['prompt', 'options', 'correct', 'reference', 'keywords', 'explanation', 'hint', 'difficulty']}

def arr(item, n): return {'type': 'object', 'additionalProperties': False, 'properties': {'items': {'type': 'array', 'items': item}}, 'required': ['items']}


import json as _j
EXIST = _j.load(open('../../../content/source/new_modes.json'))
USED_WIS = sorted({x['reference'] for x in EXIST if x['mode'] == 'wisdom'})
USED_GEO = sorted({x['place'] for x in EXIST if x['mode'] == 'geography'})
if stage == 'wisdom':
    THEMES = ['self-control, temptation and integrity when no one is watching', 'grief, comfort, visiting the sick and caring for the elderly',
              'teaching the young, honouring parents and respecting elders', 'rest, time, priorities, gratitude and joy',
              'serving others, leadership and using authority well']
    batches = [{'id': f'w{i+9}', 'theme': t} for i, t in enumerate(THEMES)]
    schema = arr(MC, 8)
    def prompt(b):
        return COMMON + ("\n\nWrite 8 'Bible Wisdom Decisions' items on the theme: " + b['theme'] + ". Each prompt is a short, realistic modern adult scenario (2-3 sentences, second person, "
            "e.g. at work, at home, with money or friends) ending with a question such as 'Which response best reflects the teaching of Proverbs 15:1?' or 'What does Scripture counsel here?'. "
            "Name the book (and usually the verse) in the question so the choice is anchored in a specific passage. Options are 4 plausible responses; the correct one is exactly what the cited "
            "passage teaches, and the other three are clearly contrary to that passage. Do not give medical, legal or professional advice; avoid disputed topics (alcohol, divorce, tithing amounts, "
            "politics, Sabbath day, gender roles, end times). Difficulty mix: 2 items each at difficulty 1, 2, 3 and 4 (4 = less familiar passages and subtler distinctions, still unambiguous). "
            "Use a different passage for every item; prefer Proverbs, Ecclesiastes, James, the Sermon on the Mount, the Psalms, Romans 12, Galatians 6, Ephesians 4-6, Colossians 3, 1 Thessalonians 5, 1 Peter and similar. "
            "These references are ALREADY USED in the game, so do not cite them or overlapping verses: " + '; '.join(USED_WIS))
elif stage == 'geography':
    MENU = json.load(open('geo_menu.json'))
    names = '; '.join(f"{k} ({v['type']}; views: {'/'.join(v['views'])})" for k, v in sorted(MENU.items()))
    GEO = {'type': 'object', 'additionalProperties': False, 'properties': {
        'kind': {'type': 'string', 'enum': ['identify', 'locate']},
        'place': {'type': 'string', 'description': 'exact place id from the list'},
        'view': {'type': 'string', 'enum': ['land', 'east', 'med']},
        'prompt': {'type': 'string'}, 'distractors': {'type': 'array', 'items': {'type': 'string'}, 'description': 'three other exact place ids from the list, same view'},
        'reference': {'type': 'string'}, 'keywords': {'type': 'array', 'items': {'type': 'string'}},
        'explanation': {'type': 'string'}, 'hint': {'type': 'string'}, 'difficulty': {'type': 'integer'}},
        'required': ['kind', 'place', 'view', 'prompt', 'distractors', 'reference', 'keywords', 'explanation', 'hint', 'difficulty']}
    GROUPS = [('t', 'the judges, Samuel, Saul, David and Solomon, and the prophets Elijah and Elisha', 'land'),
              ('s', "the journeys of Paul and his companions, the early church and the seven churches of Revelation", 'med/east')]
    batches = [{'id': f'g{g}', 'topic': t, 'views': v} for g, t, v in GROUPS]
    schema = arr(GEO, 10)
    def prompt(b):
        return COMMON + ("\n\nWrite 10 'Bible Geography Explorer' items about " + b['topic'] + ". The game draws a real map (view 'land' = the Holy Land; 'east' = the Ancient Near East from Egypt to Persia; "
            "'med' = the Mediterranean world from Rome to Syria) with markers at the identified locations. Use views: " + b['views'] + ". Two kinds:\n"
            "- identify: the map shows ONE marker at 'place'; the prompt ties the place to a Bible event and asks which place is marked (e.g. 'Jesus grew up in the town marked on the map. Which town is it?'). "
            "Options will be the names of 'place' and the three 'distractors'.\n- locate: the map shows FOUR lettered markers (place + 3 distractors, shuffled); the prompt names the place and its Bible event and asks "
            "which marker it is (e.g. 'Jonah was sent to preach to Nineveh. Which marker shows Nineveh?'). Choose distractors at clearly different locations (at least ~30 km apart in 'land', farther in other views).\n"
            "The cited reference must mention the place by its KJV name, and that name must be one of the keywords. Do not ask about distances or modern borders. Do not use places whose identification is uncertain. "
            "Mix both kinds about equally. Difficulty mix across the 10: 3 at 1, 3 at 2, 3 at 3, 1 at 4. The answer 'place' must NOT be one of these, which the game already asks about: " + '; '.join(USED_GEO) +
            ". (They may still be used as distractors.) Use 10 different answer places. Every place, distractor and the view must come from this list (use the exact id, e.g. 'Bethlehem 1'):\n" + names)
elif stage == 'mystery':
    CASES = [('m13', 'The Travellers with Mouldy Bread', 'Joshua 9', 2), ('m14', "Naboth's Vineyard", '1 Kings 21', 2), ('m15', 'The Stolen Blessing', 'Genesis 27', 1),
             ('m16', 'The Left-Handed Messenger', 'Judges 3:12-30', 3), ('m17', "The Servant's Secret Errand", '2 Kings 5:15-27', 2),
             ('m18', "The Guards' Story", 'Matthew 27:62-66 and Matthew 28:1-15', 2), ('m19', 'The Man Born Blind', 'John 9', 1),
             ('m20', 'The Uproar at Ephesus', 'Acts 19:23-41', 3), ('m21', 'The Plot of the Forty', 'Acts 23:12-35', 2)]
    batches = [{'id': c, 'title': t, 'passage': p, 'difficulty': d} for c, t, p, d in CASES]
    STAGE = {'type': 'object', 'additionalProperties': False, 'properties': {
        'clue': {'type': 'string', 'description': 'a short case-file clue (1-2 sentences, written like evidence or a witness statement)'}, **MC['properties']},
        'required': ['clue'] + MC['required']}
    schema = {'type': 'object', 'additionalProperties': False, 'properties': {
        'briefing': {'type': 'string', 'description': '2-3 sentences setting up the case without giving the solution, citing the chapter'},
        'stages': {'type': 'array', 'items': STAGE}}, 'required': ['briefing', 'stages']}
    def prompt(b):
        return COMMON + (f"\n\nWrite a 'Bible Mystery' case file titled '{b['title']}' based on {b['passage']}. The player investigates in 5 stages, in story order. Each stage has a clue (evidence, a witness statement "
            "or a detail from the text) and a multiple-choice question the clue and the cited passage answer. Stages 1-4 gather evidence (who, what, where, why); stage 5 is the solution (e.g. who did it or what really happened). "
            f"Every stage cites its own KJV passage within the story. Difficulty of every stage: {b['difficulty']}. Stay strictly with what the text says; do not add motives or details Scripture does not give.")
elif stage == 'parables':
    PARABLES = [('p13', 'The Wheat and the Tares', 'Matthew 13:24-30 and its explanation Matthew 13:36-43'),
                ('p14', 'The Hidden Treasure, the Pearl and the Net', 'Matthew 13:44-50'),
                ('p15', 'The Two Sons', 'Matthew 21:23-32'), ('p16', 'The Wicked Husbandmen', 'Matthew 21:33-46'),
                ('p17', "The Marriage of the King's Son", 'Matthew 22:1-14'), ('p18', 'The Friend at Midnight', 'Luke 11:1-13'),
                ('p19', 'The Barren Fig Tree', 'Luke 13:1-9'), ('p20', 'The Great Supper', 'Luke 14:15-24'),
                ('p21', 'The Unjust Judge', 'Luke 18:1-8'), ('p22', 'The Two Debtors', 'Luke 7:36-50')]
    batches = [{'id': c, 'title': t, 'passage': p} for c, t, p in PARABLES]
    schema = {'type': 'object', 'additionalProperties': False, 'properties': {
        'intro': {'type': 'string', 'description': '1-2 sentences on the setting: who Jesus was speaking to and why, citing the text'},
        'reading': {'type': 'array', 'items': {'type': 'string'}, 'description': 'the KJV references to read, in order, each a single chapter range of at most 15 verses, together covering the whole parable'},
        'questions': {'type': 'array', 'items': MC}}, 'required': ['intro', 'reading', 'questions']}
    def prompt(b):
        return COMMON + (f"\n\nWrite a 'Parables Explorer' chapter for the parable of {b['title']} ({b['passage']}). The player first reads the full KJV text of the parable, then answers 4 questions in story order: "
            "two about details of the story, one about the point Jesus himself draws (only as stated in the text), and one that connects it to its setting or explanation. "
            "Difficulty: questions 1-2 at difficulty 1 or 2, questions 3-4 at difficulty 2 or 3. Interpretations must be the ones Jesus or the narrator gives in the text, not later theology. "
            "The intro must not give away the answer to any question.")
else:
    raise SystemExit('unknown stage')

out = f'draft_{stage}.jsonl'
done = {json.loads(l)['id'] for l in open(out)} if os.path.exists(out) else set()
todo = [b for b in batches if b['id'] not in done]
print('to run', len(todo))

async def main():
    client = LLMAPIClient(grpc_max_retries=0)
    async def call(b):
        c = Conversation(); c.add_user(prompt(b))
        r = await client.messages.create(model=MODEL, identity=Identity(client=Client.ASI, use_case='pplx_sdk'), convo=c,
            sampling_params=SamplingParams(max_tokens=12000), retry_policy=RoundRobinRetryPolicy(rounds=1),
            structured_output_params=StructuredOutputParams(response_format=ResponseFormat(name='result', schema=schema)))
        if r.finish_reason != FinishReason.END_TURN: raise ValueError(f"{b['id']} {r.finish_reason}")
        j = json.loads(r.text); j['id'] = b['id']; j['batch'] = b
        with open(out, 'a') as f: f.write(json.dumps(j, ensure_ascii=False) + '\n')
        print('done', b['id'], flush=True)
    try: await run_batch(todo, call, concurrency=6)
    except* Exception as eg:
        for e in eg.exceptions: print('ERR', type(e).__name__, str(e)[:300])
asyncio.run(main())
