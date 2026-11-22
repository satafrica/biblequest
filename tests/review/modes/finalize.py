"""Merge r1/r2 outcomes into content/source/new_modes.json, new_adventures.json and reviewed_3.json."""
import json, collections
items = {i['id']: i for i in json.load(open('items.json'))}
fixed = {i['id']: i for i in json.load(open('items_fixed.json'))}
r1 = {json.loads(l)['id']: json.loads(l) for l in open('r1.jsonl')}
r2 = {json.loads(l)['id']: json.loads(l) for l in open('r2.jsonl')}
final = []
for iid, it in items.items():
    if it['auto_errors']: continue
    v = r1.get(iid)
    if not v or v['verdict'] == 'drop': continue
    if v['verdict'] == 'fix':
        if iid not in fixed: continue                      # manually dropped
        it = dict(fixed[iid]); w = r2[iid]
        if w['verdict'] == 'drop': continue
        if w['verdict'] == 'fix':                           # r2 only asked for hint wording changes
            assert not (w['fixed_prompt'] or w['fixed_options']), iid
            if w['fixed_clue']: it['clue'] = w['fixed_clue']
            if w['fixed_hint']: it['hint'] = w['fixed_hint']
            if w['fixed_explanation']: it['explanation'] = w['fixed_explanation']
    final.append(it)
KEEP = ['id', 'mode', 'kind', 'place', 'distractors', 'view', 'case', 'case_title', 'stage', 'clue', 'parable', 'parable_title',
        'prompt', 'options', 'correct', 'reference', 'keywords', 'explanation', 'hint', 'difficulty']
cases = collections.Counter(i['case'] for i in final if i['mode'] == 'mystery')
out = []
for i in final:
    d = {k: i[k] for k in KEEP if k in i}
    if i['mode'] == 'geography': d.pop('options', None); d.pop('correct', None)
    if i['mode'] == 'mystery': d['stages'] = cases[i['case']]
    out.append(d)
json.dump(out, open('../../../content/source/new_modes.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), collections.Counter(i['mode'] for i in out), 'cases', dict(cases))
by = collections.defaultdict(list)
meta = {}
for i in final:
    if i['mode'] in ('mystery', 'parables'):
        k = i.get('case') or i.get('parable'); by[k].append(i['id'])
        meta[k] = i
json.dump({'by': by, 'meta': {k: {x: m.get(x) for x in ('case_title', 'briefing', 'parable_title', 'intro', 'reading')} for k, m in meta.items()}},
          open('adv_groups.json', 'w'), ensure_ascii=False, indent=1)
