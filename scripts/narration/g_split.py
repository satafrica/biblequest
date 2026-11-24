import sys, json, os
sys.path.insert(0,'/tmp/narr')
from split import process
B=json.load(open('/tmp/narr/g/batches.json'))
for wav in sys.argv[1:]:
    bid=os.path.basename(wav)[:-4]; b=B[bid]
    od=f'/home/user/workspace/narr_g/clips/{b["mode"]}'; os.makedirs(od,exist_ok=True)
    r=process(dict(b,id=bid),wav,od); print(json.dumps(r)); sys.stdout.flush()
