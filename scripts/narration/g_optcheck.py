import json,sys,difflib
sys.path.insert(0,'/tmp/narr')
from asr import words
from split import norm
T=json.load(open('/tmp/narr/g/todo.json'))
for m,e in T.items():
  for p in e['parts']:
    t=p['spoken']
    if not t.startswith('Option 1.'): continue
    f=f'narr_g/clips/{m}/{p["key"]}.mp3'
    aw=[x for w,a,b in words(f) for x in norm(w) if x!='option']; tw=[x for x in norm(t) if x!='option']
    sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False); hit=sum(b.size for b in sm.get_matching_blocks())
    print(json.dumps({'mode':m,'key':p['key'],'ratio':round(hit/max(1,len(tw)),2),'extra':len(aw)-hit,'n':len(tw),'asr':' '.join(aw),'t':t})); sys.stdout.flush()
