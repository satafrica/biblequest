"""Apply r1 'fix' verdicts. Writes items_fixed.json (fixed items, re-checked) for the r2 review."""
import json, sys
sys.argv = ['check.py']
from check import check_mc  # re-runs check.py's flattening (cheap) and gives the checker
items = {i['id']: i for i in json.load(open('items.json'))}
r1 = {json.loads(l)['id']: json.loads(l) for l in open('r1.jsonl')}
MANUAL_DROP = {'par-p7-4', 'par-p9-4'}  # the parable intro shown before the question gives the answer away
out = []
for iid, v in r1.items():
    if v['verdict'] != 'fix' or iid in MANUAL_DROP: continue
    it = dict(items[iid])
    if v['fixed_prompt']: it['prompt'] = v['fixed_prompt']
    if v['fixed_options'] and it['mode'] != 'geography':
        it['options'] = v['fixed_options']
        it['correct'] = v['fixed_correct'] if v['fixed_correct'] >= 0 else it['correct']
    elif v['fixed_correct'] >= 0 and it['mode'] != 'geography': it['correct'] = v['fixed_correct']
    for f in ('explanation', 'hint', 'clue'):
        if v[f'fixed_{f}']: it[f] = v[f'fixed_{f}']
    it['r1_problems'] = v['problems']
    errs = check_mc(it)
    # keywords were chosen for the original wording; keep only the reference check strict
    it['auto_errors'] = [e for e in errs if not e.startswith('keyword')]
    out.append(it)
json.dump(out, open('items_fixed.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'fixed;', sum(bool(i['auto_errors']) for i in out), 'with errors')
for i in out:
    if i['auto_errors']: print(i['id'], i['auto_errors'])
