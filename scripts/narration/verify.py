import json, sys, difflib, os
sys.path.insert(0,'/tmp/narr')
from split import norm
from asr import words
S=json.load(open('/tmp/narr/segments.json')); D='/home/user/workspace/narr_whoami/clips/'
out=open('/tmp/narr/verify.jsonl','w')
for s in S:
    aw=[x for w,a,b in words(D+s['key']+'.mp3') for x in norm(w)]; tw=norm(s['spoken'])
    sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False); m=sum(b.size for b in sm.get_matching_blocks())
    # first/last target words heard?
    blocks=[b for b in sm.get_matching_blocks() if b.size]
    first_ok = bool(blocks) and blocks[0].a<=1
    last_ok = bool(blocks) and blocks[-1].a+blocks[-1].size>=len(tw)-1
    out.write(json.dumps({'key':s['key'],'qid':s['qid'],'kind':s['kind'],'cov':round(m/max(1,len(tw)),2),'extra':len(aw)-m,'first':first_ok,'last':last_ok,'heard':' '.join(aw)[:200]})+'\n'); out.flush()
