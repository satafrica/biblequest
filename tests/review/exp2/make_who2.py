import json,re
K=json.load(open('../../../content/kjv.json',encoding='utf-8-sig'));B={b['name']:b for b in K}
def passage(ref):
    m=re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$',ref.strip())
    if not m: return None
    b,c,v1,v2=m.group(1),int(m.group(2)),int(m.group(3)),int(m.group(4) or m.group(3))
    try: return ' '.join(B[b]['chapters'][c-1][v-1] for v in range(v1,v2+1))
    except Exception: return None
who={x['id']:x for x in json.load(open('who_packets.json'))}
r1={json.loads(l)['id']:json.loads(l) for l in open('who1.jsonl')}
out=[];miss=0
for i,w in who.items():
    pairs=[]
    for k,clue in enumerate(w['clues']):
        ref=r1[i]['clues'][k]['reference']; t=passage(ref)
        if t is None: miss+=1; print('noref',i,ref)
        pairs.append({'clue':clue,'proposed_reference':ref,'kjv_text':f'{ref}: {t}'})
    out.append({'id':i,'answer':w['answer'],'options':w['options'],'clue_pairs':pairs,'hint':w['hint'],'explanation':w['explanation'],'reference_label':w['reference_label'],'ref_kjv':w['ref_kjv']})
json.dump(out,open('who2_packets.json','w'),ensure_ascii=False,indent=1);print(len(out),miss)
