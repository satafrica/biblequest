"""Automatic checks for the questions still waiting for human review (pending in Quick review)."""
import json, re, os, itertools
ROOT = '/home/user/workspace/biblequest'
K = json.load(open(f'{ROOT}/content/kjv.json', encoding='utf-8-sig'))
BI = {b['name']: i for i, b in enumerate(K)}
ALIAS = {'Psalm': 'Psalms', 'Song of Songs': 'Song of Solomon'}
ALL = json.load(open(f'{ROOT}/src/content/generated/questions.json'))
G = {q['id']: q for q in ALL}
ids = json.load(open('/tmp/rv4/fix_ids.json'))
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s.lower().replace('’', "'"))).strip()
REF = re.compile(r'^((?:[123] )?[A-Z][A-Za-z ]+?) (\d+):(\d+)(?:-(\d+))?$')
def passage(ref):
    m = REF.match(ref.strip())
    if not m: return None
    b = ALIAS.get(m[1], m[1])
    if b not in BI: return None
    ch = K[BI[b]]['chapters']; c, v1 = int(m[2]), int(m[3]); v2 = int(m[4] or v1)
    if c > len(ch) or v2 > len(ch[c-1]) or v1 < 1: return None
    return ' '.join(ch[c-1][v1-1:v2])
def key(ref):
    m = REF.match(ref.strip()); b = ALIAS.get(m[1], m[1]); return (BI[b], int(m[2]), int(m[3]))
words = lambda s: set(w for w in norm(s).split() if len(w) > 3)
out = {}
for i in ids:
    q = G[i]; m = q['game_mode']; e = []
    o = q['options']
    if len(set(map(norm, o))) != len(o): e.append('duplicate options')
    if m != 'sequence' and not (0 <= q['correct_index'] < len(o)): e.append('correct index out of range')
    ans = o[q['correct_index']] if m != 'sequence' else None
    hint = q.get('hint') or ''
    if ans and m in ('whoami', 'scripture', 'geography', 'parables', 'mystery') and len(norm(ans)) > 2 and re.search(rf'\b{re.escape(norm(ans))}\b', norm(hint)): e.append(f'hint contains the answer "{ans}"')
    if m == 'whoami':
        name = norm(ans).split()[0]
        for n, c in enumerate(q['clues'] or []):
            if re.search(rf'\b{re.escape(name)}\b', norm(c)): e.append(f'clue {n+1} names the answer')
        for n, refs in enumerate(q.get('clue_refs') or []):
            for r in refs:
                p = passage(r['ref'])
                if p is None: e.append(f'clue ref {r["ref"]} not found')
                elif norm(r['text']) not in norm(p) and norm(p) not in norm(r['text']): e.append(f'clue ref {r["ref"]} text differs from KJV')
    if m == 'scripture':
        quote = re.search(r'“(.+)”', q['prompt'])
        vt = passage(q['reference_label'])
        if vt is None: e.append('reference not found')
        elif quote:
            qt = quote[1]
            if '_____' in qt:
                full = qt.replace('_____', ans)
                if norm(full) not in norm(vt): e.append('completed verse does not match KJV')
                if sum(norm(x) in norm(vt).split() for x in o if x != ans) and any(re.search(rf'\b{re.escape(norm(x))}\b', norm(qt.replace('_____', ''))) is None and norm(qt.replace('_____', x)) in norm(vt) for x in o if x != ans): e.append('a wrong option also completes the verse')
            elif norm(qt) not in norm(vt): e.append('quoted verse does not match KJV')
        if i.startswith('scr-bk') and norm(ans) != norm(ALIAS.get(q['book'], q['book'])) and norm(ans) != norm(q['book']): e.append('book answer mismatch')
        if i.startswith('scr-rf') and norm(ans) != norm(q['reference_label']): e.append('reference answer mismatch')
        if i.startswith('scr-rf'):
            vq = norm(quote[1]) if quote else ''
            for x in o:
                if x != ans:
                    p = passage(x)
                    if p and norm(p) == vq: e.append(f'wrong option {x} has the same text')
    elif m == 'sequence':
        refs = re.findall(r'\(([^()]+ \d+:\d+(?:-\d+)?)\)', q['explanation'])
        if len(refs) != len(o): e.append('explanation refs count != events')
        else:
            ks = [key(r) for r in refs]
            if ks != sorted(ks): e.append('events not in Bible order of references (check chronology)')
            for r in refs:
                if passage(r) is None: e.append(f'ref {r} not found')
    elif m == 'hidden':
        boxes = (q.get('extra') or {}).get('boxes') or []
        if not any(b['area'] == q['correct_index'] for b in boxes): e.append('no box for the correct area')
        for b in boxes:
            x, y, w, h = b['box']
            if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > 100.5 or y + h > 100.5: e.append(f'box out of range {b["box"]}')
        if passage(q['reference_label']) is None: e.append('reference not found')
    else:
        if passage(q['reference_label']) is None: e.append('reference not found')
    out[i] = e
# near-duplicates against every published question in the same mode
for a in ids:
    qa = G[a]
    for b, qb in G.items():
        if b == a or qb['game_mode'] != qa['game_mode'] or qa['game_mode'] in ('hidden', 'sequence'): continue
        if qa['game_mode'] == 'scripture':
            same = qa['reference_label'] == qb['reference_label'] and a.split('-')[1] == b.split('-')[1]
        else:
            wa, wb = words(qa['prompt'] + ' ' + qa['options'][qa['correct_index']]), words(qb['prompt'] + ' ' + qb['options'][qb['correct_index']])
            same = qa['reference_label'] == qb['reference_label'] and len(wa & wb) / max(1, len(wa | wb)) > 0.45
        if same: out[a].append(f'near-duplicate of {b}')
json.dump(out, open('auto.json', 'w'), indent=1)
flag = {k: v for k, v in out.items() if v}
print('checked', len(out), 'flagged', len(flag))
for k, v in flag.items(): print(k, v)
