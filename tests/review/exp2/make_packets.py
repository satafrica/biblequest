import json,sys,os
sys.path.insert(0,'../../../content/source')
import expansion_2 as X
q={x['id']:x for x in json.load(open('../../../src/content/generated/questions.json'))}
who=[];seq=[]
for w in X.WHOAMI_3:
    x=q['who-'+w[0]]
    who.append({'id':x['id'],'clues':x['clues'],'options':x['options'],'answer':x['options'][x['correct_index']],'reference_label':x['reference_label'],'ref_kjv':x['verse_text'],'explanation':x['explanation'],'hint':x['hint'],'difficulty':x['difficulty']})
for s in X.SEQUENCES_3:
    x=q['seq-'+s[0]]
    lines=x['verse_text'].split('\n')
    ev=[{'event':e,'ref':r,'kjv':l.split(': ',1)[1]} for e,r,l in zip(x['options'],x['events_refs'],lines)]
    seq.append({'id':x['id'],'title':x['prompt'],'difficulty':x['difficulty'],'reference_label':x['reference_label'],'hint':x['hint'],'events_in_stated_order':ev})
json.dump(who,open('who_packets.json','w'),ensure_ascii=False,indent=1);json.dump(seq,open('seq_packets.json','w'),ensure_ascii=False,indent=1)
print(len(who),len(seq))
