import json, sys, difflib
sys.path.insert(0,'/tmp/narr')
from split import norm
from asr import words
S=[s for s in json.load(open('/tmp/narr/segments.json')) if s['kind'] in ('detail','options','head','clue2','clue3','clue4')]
D='/home/user/workspace/narr_whoami/clips/'
done=set()
try: done={json.loads(l)['key'] for l in open('/tmp/narr/vfull.jsonl')}
except FileNotFoundError: pass
out=open('/tmp/narr/vfull.jsonl','a')
for s in S:
    if s['key'] in done or s['kind']!='detail': continue
    aw=[x for w,a,b in words(D+s['key']+'.mp3') for x in norm(w)]; tw=norm(s['spoken'])
    sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False)
    gaps=[' '.join(tw[i1:i2]) for op,i1,i2,j1,j2 in sm.get_opcodes() if op in('delete','replace') and (i2-i1)-(j2-j1)>=3]
    ins=[' '.join(aw[j1:j2]) for op,i1,i2,j1,j2 in sm.get_opcodes() if op in('insert','replace') and (j2-j1)-(i2-i1)>=3]
    out.write(json.dumps({'key':s['key'],'qid':s['qid'],'gaps':gaps,'ins':ins})+'\n'); out.flush()
