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

if stage == 'wisdom':
    THEMES = ['honest speech, gossip and keeping promises', 'money, debt, generosity and contentment', 'anger, conflict, forgiveness and reconciliation',
              'work, diligence, laziness and planning', 'friendship, family and neighbours', 'pride, humility, correction and seeking advice',
              'worry, fear, patience and trusting God', 'justice, kindness to the poor, strangers and enemies']
    batches = [{'id': f'w{i+1}', 'theme': t} for i, t in enumerate(THEMES)]
    schema = arr(MC, 8)
    def prompt(b):
        return COMMON + ("\n\nWrite 8 'Bible Wisdom Decisions' items on the theme: " + b['theme'] + ". Each prompt is a short, realistic modern adult scenario (2-3 sentences, second person, "
            "e.g. at work, at home, with money or friends) ending with a question such as 'Which response best reflects the teaching of Proverbs 15:1?' or 'What does Scripture counsel here?'. "
            "Name the book (and usually the verse) in the question so the choice is anchored in a specific passage. Options are 4 plausible responses; the correct one is exactly what the cited "
            "passage teaches, and the other three are clearly contrary to that passage. Do not give medical, legal or professional advice; avoid disputed topics (alcohol, divorce, tithing amounts, "
            "politics, Sabbath day, gender roles, end times). Difficulty mix: 2 items each at difficulty 1, 2, 3 and 4 (4 = less familiar passages and subtler distinctions, still unambiguous). "
            "Use a different passage for every item; prefer Proverbs, Ecclesiastes, James, the Sermon on the Mount, Romans 12, Ephesians 4, Colossians 3, Philippians 4 and similar.")

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
    GROUPS = [('w', 'the life and ministry of Jesus in Galilee, Samaria and Judea', 'land'),
              ('x', 'the patriarchs, the exodus and the judges', 'land/east'),
              ('y', 'the kings, prophets, exile and the empires around Israel', 'land/east'),
              ('z', "the early church and Paul's journeys", 'med/east'),
              ('v', 'mountains, rivers, seas and valleys of the Bible', 'land/east'),
              ('u', 'cities of the Philistines, Phoenicia and the coast, and battles of Israel', 'land')]
    batches = [{'id': f'g{g}', 'topic': t, 'views': v} for g, t, v in GROUPS]
    schema = arr(GEO, 10)
    def prompt(b):
        return COMMON + ("\n\nWrite 10 'Bible Geography Explorer' items about " + b['topic'] + ". The game draws a real map (view 'land' = the Holy Land; 'east' = the Ancient Near East from Egypt to Persia; "
            "'med' = the Mediterranean world from Rome to Syria) with markers at the identified locations. Use views: " + b['views'] + ". Two kinds:\n"
            "- identify: the map shows ONE marker at 'place'; the prompt ties the place to a Bible event and asks which place is marked (e.g. 'Jesus grew up in the town marked on the map. Which town is it?'). "
            "Options will be the names of 'place' and the three 'distractors'.\n- locate: the map shows FOUR lettered markers (place + 3 distractors, shuffled); the prompt names the place and its Bible event and asks "
            "which marker it is (e.g. 'Jonah was sent to preach to Nineveh. Which marker shows Nineveh?'). Choose distractors at clearly different locations (at least ~30 km apart in 'land', farther in other views).\n"
            "The cited reference must mention the place by its KJV name, and that name must be one of the keywords. Do not ask about distances or modern borders. Do not use places whose identification is uncertain. "
            "Mix both kinds about equally. Difficulty mix across the 10: 3 at 1, 3 at 2, 3 at 3, 1 at 4. Every place, distractor and the view must come from this list (use the exact id, e.g. 'Bethlehem 1'):\n" + names)

elif stage == 'mystery':
    CASES = [('m1', 'The Silver Cup in the Sack', 'Genesis 44', 2), ('m2', 'The Bloodstained Coat', 'Genesis 37', 1), ('m3', "The Missing Household Gods", 'Genesis 31', 3),
             ('m4', 'The Spies on the Roof', 'Joshua 2', 1), ('m5', 'The Hidden Plunder', 'Joshua 7', 2), ('m6', "The Secret of Samson's Strength", 'Judges 16', 2),
             ('m7', 'Two Mothers and One Child', '1 Kings 3', 1), ('m8', 'The Writing on the Wall', 'Daniel 5', 3),
             ('m9', 'The Betrayer at the Table', 'John 13 and Matthew 26', 2), ('m10', 'The Price of the Land', 'Acts 5', 3), ('m11', 'The Prisoner Who Walked Free', 'Acts 12', 2),
             ('m12', 'The Plot Against the Queen\'s People', 'Esther 3-7', 4)]
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
    PARABLES = [('p1', 'The Sower', 'Matthew 13:3-9 and its explanation Matthew 13:18-23'), ('p2', 'The Good Samaritan', 'Luke 10:25-37'),
                ('p3', 'The Lost Sheep and the Lost Coin', 'Luke 15:1-10'), ('p4', 'The Prodigal Son', 'Luke 15:11-32'),
                ('p5', 'The Mustard Seed and the Leaven', 'Matthew 13:31-33'), ('p6', 'The Wise and Foolish Builders', 'Matthew 7:24-27'),
                ('p7', 'The Rich Fool', 'Luke 12:13-21'), ('p8', 'The Unforgiving Servant', 'Matthew 18:21-35'),
                ('p9', 'The Labourers in the Vineyard', 'Matthew 20:1-16'), ('p10', 'The Ten Virgins', 'Matthew 25:1-13'),
                ('p11', 'The Talents', 'Matthew 25:14-30'), ('p12', 'The Pharisee and the Publican', 'Luke 18:9-14')]
    batches = [{'id': c, 'title': t, 'passage': p} for c, t, p in PARABLES]
    schema = {'type': 'object', 'additionalProperties': False, 'properties': {
        'intro': {'type': 'string', 'description': '1-2 sentences on the setting: who Jesus was speaking to and why, citing the text'},
        'reading': {'type': 'array', 'items': {'type': 'string'}, 'description': 'the KJV references to read, in order, each a single chapter range of at most 15 verses, together covering the whole parable'},
        'questions': {'type': 'array', 'items': MC}}, 'required': ['intro', 'reading', 'questions']}
    def prompt(b):
        return COMMON + (f"\n\nWrite a 'Parables Explorer' chapter for the parable of {b['title']} ({b['passage']}). The player first reads the full KJV text of the parable, then answers 4 questions in story order: "
            "two about details of the story, one about the point Jesus himself draws (only as stated in the text), and one that connects it to its setting or explanation. "
            "Difficulty: questions 1-2 at difficulty 1 or 2, questions 3-4 at difficulty 2 or 3. Interpretations must be the ones Jesus or the narrator gives in the text, not later theology.")
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
