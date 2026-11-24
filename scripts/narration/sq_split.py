import sys, json, os
sys.path.insert(0,'/tmp/narr')
from split import process
P=json.load(open('/tmp/narr/sq/pairs.json'))
outdir='/home/user/workspace/narr_sq/clips'
for wav in sys.argv[1:]:
    pid=os.path.basename(wav)[2:-4]
    od=os.path.join(outdir,P[pid]['voice']); os.makedirs(od,exist_ok=True)
    r=process(dict(P[pid],id=pid),wav,od); r['voice']=P[pid]['voice']
    print(json.dumps(r)); sys.stdout.flush()
