import json,re
K=json.load(open('../../../content/kjv.json',encoding='utf-8-sig'));B={b['name']:b for b in K}
def passage(ref):
    m=re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$',ref.strip())
    if not m: return None
    b,c,v1,v2=m.group(1),int(m.group(2)),int(m.group(3)),int(m.group(4) or m.group(3))
    if v2<v1: return None
    try: return ' '.join(B[b]['chapters'][c-1][v-1] for v in range(v1,v2+1))
    except Exception: return None
