# Packs each game's unique parts into recordings (about 2,500 bytes each, parts separated by a blank
# line). Writes /home/user/workspace/narr_g/g_<mode>_NNN.txt and /tmp/narr/g/batches.json.
# "Correct." / "Not quite." are copied from the Scripture Quiz clips of the same voice.
import json, os, shutil
T=json.load(open('/tmp/narr/g/todo.json')); D='/home/user/workspace/narr_g'; SQ='/home/user/workspace/narr_sq/clips'
B={}; reused=0
for m,e in T.items():
    v=e['voice']; od=f'{D}/clips/{m}'; os.makedirs(od,exist_ok=True)
    cur=[]; n=0
    def flush():
        global n
        if not cur: return
        n+=1; bid=f'g_{m}_{n:03d}'; B[bid]={'mode':m,'voice':v,'segs':[dict(s,kind='options' if s['spoken'].startswith('Option 1.') else 'part') for s in cur]}
        open(f'{D}/{bid}.txt','w').write('\n\n'.join(s['spoken'] for s in cur)+'\n'); cur.clear()
    for p in e['parts']:
        if p['spoken'] in ('Correct.','Not quite.') and os.path.exists(f'{SQ}/{v}/{p["key"]}.mp3'):
            shutil.copy(f'{SQ}/{v}/{p["key"]}.mp3', f'{od}/{p["key"]}.mp3'); reused+=1; continue
        if cur and sum(len(s['spoken'].encode())+2 for s in cur)+len(p['spoken'].encode())>2500: flush()
        cur.append(p)
    flush()
json.dump(B,open('/tmp/narr/g/batches.json','w'),indent=1)
from collections import Counter
print(len(B),'recordings', Counter(b['mode'] for b in B.values()), 'reused verdicts', reused)
