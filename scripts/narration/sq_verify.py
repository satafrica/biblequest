# Re-transcribe each clip and compare with its words: coverage, extra words (repeats), first/last word heard.
import json, sys, difflib, os
sys.path.insert(0,'/tmp/narr')
from split import norm
from asr import words
D='/home/user/workspace/narr_sq/clips/'
todo=json.load(open('/tmp/narr/sq/todo.json'))
only=set(sys.argv[2:]) if len(sys.argv)>2 else None
out=open(sys.argv[1],'a')
for v,items in todo.items():
    for s in items:
        if only and s['key'] not in only: continue
        f=f'{D}{v}/{s["key"]}.mp3'
        if not os.path.exists(f): out.write(json.dumps({'voice':v,'key':s['key'],'missing':True})+'\n'); continue
        if s['spoken'] in ('Correct.','Not quite.'): continue
        aw=[x for w,a,b in words(f) for x in norm(w)]; tw=norm(s['spoken'])
        sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False); bl=[b for b in sm.get_matching_blocks() if b.size]; m=sum(b.size for b in bl)
        r={'voice':v,'key':s['key'],'cov':round(m/max(1,len(tw)),2),'extra':len(aw)-m,'first':bool(bl) and bl[0].a<=1,'last':bool(bl) and bl[-1].a+bl[-1].size>=len(tw)-1,'n':len(tw)}
        out.write(json.dumps(r)+'\n'); out.flush()
