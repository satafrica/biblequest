# Pair each clue with the exact KJV passage text players would see, for the passage check.
import json,re,sys
K=json.load(open('../../../content/kjv.json',encoding='utf-8-sig'));B={b['name']:b for b in K}
def passage(ref):
    m=re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$',ref.strip())
    if not m: return None
    b,c,v1,v2=m.group(1),int(m.group(2)),int(m.group(3)),int(m.group(4) or m.group(3))
    try: return ' '.join(B[b]['chapters'][c-1][v-1] for v in range(v1,v2+1))
    except Exception: return None
who={x['id']:x for x in json.load(open('who_packets.json'))}
refs=json.load(open('refs.json'))  # {id: [[ref,...] per clue]}
out=[];miss=0
for i,w in who.items():
    pairs=[]
    for k,clue in enumerate(w['clues']):
        g=refs[i][k]; texts=[]
        for r in g:
            t=passage(r)
            if t is None: miss+=1; print('noref',i,r)
            texts.append(f'{r}: {t}')
        pairs.append({'clue':clue,'proposed_reference':'; '.join(g),'kjv_text':'\n'.join(texts)})
    out.append({'id':i,'answer':w['answer'],'options':w['options'],'clue_pairs':pairs,'hint':w['hint'],'explanation':w['explanation'],'reference_label':w['reference_label'],'ref_kjv':w['ref_kjv']})
json.dump(out,open('who2_packets.json','w'),ensure_ascii=False,indent=1);print(len(out),'missing',miss)
