"""Flatten AI drafts into items, run automatic KJV checks, and write review packets.
Output: items.json (all items with check results), packets.json (items that passed, with KJV text)."""
import json, math, re, sys
sys.path.insert(0, '../exp2')
K = json.load(open('../../../content/kjv.json', encoding='utf-8-sig')); B = {b['name']: b for b in K}
MENU = json.load(open('geo_menu.json')); G = json.load(open('../../../content/source/geo_places.json'))

def passage(ref):
    m = re.fullmatch(r'(.+?) (\d+):(\d+)(?:-(\d+))?', ref.strip())
    if not m: raise ValueError(f'bad reference format {ref!r}')
    b, c, v1, v2 = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
    if b not in B: raise ValueError(f'unknown book {b!r}')
    ch = B[b]['chapters']
    if c > len(ch) or v1 < 1 or v2 < v1 or v2 > len(ch[c-1]): raise ValueError(f'out of range {ref}')
    if v2 - v1 + 1 > 15: raise ValueError(f'more than 15 verses {ref}')
    return re.sub(r' +([.,;:?!])', r'\1', ' '.join(ch[c-1][v1-1:v2]))

norm = lambda s: s.replace('\u2019', "'").replace('\u00e6', 'ae').replace('-', '').lower()
def check_mc(it):
    errs = []
    try: it['kjv'] = passage(it['reference'])
    except ValueError as e: return [str(e)]
    for k in it['keywords']:
        if norm(k) not in norm(it['kjv']): errs.append(f'keyword {k!r} not in {it["reference"]}')
    o = it.get('options')
    if o is not None:
        if len(o) != 4 or len({x.lower() for x in o}) != 4: errs.append('options must be 4 distinct')
        if not 0 <= it['correct'] < len(o): errs.append('bad correct index')
    if it['difficulty'] not in (1, 2, 3, 4): errs.append('bad difficulty')
    return errs

def km(a, b):
    p, q = G[a], G[b]
    return math.hypot((p['lon'] - q['lon']) * 111 * math.cos(math.radians(p['lat'])), (p['lat'] - q['lat']) * 111)

items = []
for stage in ('wisdom', 'geography', 'mystery', 'parables'):
    for line in open(f'draft_{stage}.jsonl'):
        d = json.loads(line); bid = d['id']
        if stage == 'wisdom':
            for i, it in enumerate(d['items'], 1): items.append({'id': f'wis-{bid}-{i}', 'mode': 'wisdom', **it})
        elif stage == 'geography':
            for i, it in enumerate(d['items'], 1): items.append({'id': f'geo-{bid}-{i}', 'mode': 'geography', **it})
        elif stage == 'mystery':
            for i, it in enumerate(d['stages'], 1):
                items.append({'id': f'mys-{bid}-{i}', 'mode': 'mystery', 'case': bid, 'case_title': d['batch']['title'], 'briefing': d['briefing'], 'stage': i, **it})
        else:
            for i, it in enumerate(d['questions'], 1):
                items.append({'id': f'par-{bid}-{i}', 'mode': 'parables', 'parable': bid, 'parable_title': d['batch']['title'], 'intro': d['intro'], 'reading': d['reading'], **it})

OVERRIDES = json.load(open('overrides.json')) if __import__('os').path.exists('overrides.json') else {}
items = [i for i in items if OVERRIDES.get(i['id']) != 'drop']
for it in items:
    it.update(OVERRIDES.get(it['id'], {}))
    errs = check_mc(it)
    if it['mode'] == 'geography':
        names = [it['place']] + it['distractors']
        for n in names:
            if n not in MENU: errs.append(f'unknown place {n!r}')
            elif it['view'] not in MENU[n]['views']: errs.append(f'{n} not in view {it["view"]}')
        if len(set(names)) != 4: errs.append('places not distinct')
        if not errs:
            minkm = {'land': 12, 'east': 120, 'med': 120}[it['view']]
            close = [] if it['kind'] == 'identify' else [(a, b) for i, a in enumerate(names) for b in names[i+1:] if km(a, b) < minkm]
            if close: errs.append(f'markers too close: {close}')
            disp = lambda n: re.sub(r' \d+$', '', n)
            if norm(disp(it['place'])) not in norm(it.get('kjv', '')) and not any(norm(disp(it['place'])) in norm(k) for k in it['keywords']):
                errs.append(f'place name {disp(it["place"])!r} not in passage')
            it['options'] = [disp(n) for n in names] if it['kind'] == 'identify' else ['A', 'B', 'C', 'D']
            it['correct'] = 0
    if it['mode'] == 'parables':
        try: it['reading_text'] = [{'ref': r, 'text': passage(r)} for r in it['reading']]
        except ValueError as e: errs.append(f'reading: {e}')
    it['auto_errors'] = errs

json.dump(items, open('items.json', 'w'), ensure_ascii=False, indent=1)
ok = [i for i in items if not i['auto_errors']]
from collections import Counter
print('items', len(items), 'auto-pass', len(ok), Counter(i['mode'] for i in ok))
for i in items:
    if i['auto_errors']: print(i['id'], i['auto_errors'])
