"""Expansion 3: merge r1/r2 outcomes and APPEND to content/source/new_modes.json; add chapters to new_adventures.json."""
import json, collections, re
ROOT = '../../../content/'
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
        if iid not in fixed: continue
        it = dict(fixed[iid]); w = r2[iid]
        if w['verdict'] == 'drop': continue
        if w['verdict'] == 'fix':
            assert not (w['fixed_prompt'] or w['fixed_options']), iid
            for f in ('clue', 'hint', 'explanation'):
                if w[f'fixed_{f}']: it[f] = w[f'fixed_{f}']
    final.append(it)
KEEP = ['id', 'mode', 'kind', 'place', 'distractors', 'view', 'case', 'case_title', 'stage', 'clue', 'parable', 'parable_title',
        'prompt', 'options', 'correct', 'reference', 'keywords', 'explanation', 'hint', 'difficulty']
cases = collections.Counter(i['case'] for i in final if i['mode'] == 'mystery')
existing = json.load(open(ROOT + 'source/new_modes.json'))
have = {x['id'] for x in existing}
out = []
for i in final:
    assert i['id'] not in have, i['id']
    d = {k: i[k] for k in KEEP if k in i}
    if i['mode'] == 'geography': d.pop('options', None); d.pop('correct', None)
    if i['mode'] == 'mystery': d['stages'] = cases[i['case']]
    out.append(d)
json.dump(existing + out, open(ROOT + 'source/new_modes.json', 'w'), ensure_ascii=False, indent=1)
print('appended', len(out), collections.Counter(i['mode'] for i in out), 'cases', dict(cases))
json.dump(out, open('final_items.json', 'w'), ensure_ascii=False, indent=1)

LABEL = {'m13': 'Joshua 9', 'm14': '1 Kings 21', 'm15': 'Genesis 27', 'm16': 'Judges 3', 'm17': '2 Kings 5',
         'm18': 'Matthew 27; 28', 'm19': 'John 9', 'm20': 'Acts 19', 'm21': 'Acts 23'}
K = json.load(open(ROOT + 'kjv.json', encoding='utf-8-sig')); ORDER = {b['name']: n for n, b in enumerate(K)}
def key(label):
    m = re.match(r'(.+?) (\d+)(?::(\d+))?', label); return (ORDER[m.group(1)], int(m.group(2)), int(m.group(3) or 0))
by = collections.defaultdict(list); meta = {}
for i in final:
    if i['mode'] in ('mystery', 'parables'):
        k = i.get('case') or i.get('parable'); by[k].append(i['id']); meta[k] = i
A = json.load(open(ROOT + 'source/new_adventures.json')); adv = {a['id']: a for a in A}
for k, ids in by.items():
    m = meta[k]
    if m['mode'] == 'mystery':
        ch = {'id': f'case-{k}', 'title': m['case_title'], 'reference_label': LABEL[k], 'image_id': None, 'narrative': m['briefing'], 'question_ids': ids}
        target = 'cases-ot' if ORDER[LABEL[k].split(' ')[0] if not LABEL[k][0].isdigit() else ' '.join(LABEL[k].split(' ')[:2])] < 39 else 'cases-nt'
    else:
        reading = m['reading']
        bk = re.match(r'(.+?) \d', reading[0]).group(1)
        lbl = reading[0] if len(reading) == 1 else reading[0] + ', ' + ', '.join(r.split(':')[1] if r.split(':')[0] == reading[0].split(':')[0] else r for r in reading[1:])
        ch = {'id': f'parable-{k}', 'title': m['parable_title'], 'reference_label': lbl, 'image_id': None, 'narrative': m['intro'], 'reading': reading, 'question_ids': ids}
        target = 'parables-matthew' if bk == 'Matthew' else 'parables-luke'
    a = adv[target]; assert ch['id'] not in {c['id'] for c in a['chapters']}
    a['chapters'].append(ch); a['chapters'].sort(key=lambda c: key(c['reference_label']))
W = {3: 'Three', 9: 'Nine', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 7: 'Seven', 5: 'Five', 10: 'Ten', 11: 'Eleven', 6: 'Six', 8: 'Eight', 15: 'Fifteen', 16: 'Sixteen', 17: 'Seventeen'}
w = lambda n: W.get(n, str(n))
adv['cases-ot']['summary'] = f"{w(len(adv['cases-ot']['chapters']))} investigations from Genesis to Daniel. Read each briefing, study the clues and answer from the text."
adv['cases-nt']['summary'] = f"{w(len(adv['cases-nt']['chapters']))} investigations from the Gospels and Acts."
adv['parables-matthew']['summary'] = f"Read {w(len(adv['parables-matthew']['chapters'])).lower()} parables of Jesus from Matthew in the King James Version, then answer questions on each."
adv['parables-luke']['summary'] = f"Read {w(len(adv['parables-luke']['chapters'])).lower()} parables of Jesus from Luke in the King James Version, then answer questions on each."
json.dump(A, open(ROOT + 'source/new_adventures.json', 'w'), ensure_ascii=False, indent=1)
for a in A: print(a['id'], len(a['chapters']), [c['reference_label'] for c in a['chapters']])
