import json, re, unicodedata
db=json.load(open('tests/review/db_questions.json'))
K=json.load(open('content/kjv.json', encoding='utf-8-sig'))
BOOKS=[b['name'] for b in K]
def norm(s): return re.sub(r' +([,;:.?!’])',r'\1',re.sub(r'\s+',' ',re.sub(r'[\u201c\u201d"]','',re.sub(r'\{[^}]*\}','',s))).strip())
def text(book, ch, v1, v2): return ' '.join(norm(v) for v in K[BOOKS.index(book)]['chapters'][ch-1][v1-1:v2])
def parse(ref):
    m=re.fullmatch(r'(.+?) (\d+):(\d+)(?:-(\d+))?',ref); b,c,a,e=m.groups(); return b,int(c),int(a),int(e or a)
ALL=[(b['name'],ci+1,vi+1,norm(v)) for b in K for ci,ch in enumerate(b['chapters']) for vi,v in enumerate(ch)]
def where(quote):
    q=quote.lower().rstrip(':;,. ')
    return [f"{b} {c}:{v}" for b,c,v,t in ALL if q in t.lower()]
rows=[]
for d in db:
    if d['game_mode']!='scripture': continue
    kind=[t for t in d['tags'] if t in('complete-verse','which-book','match-reference')][0]
    ref=d['reference_label']; b,c,a,e=parse(ref); kjv=text(b,c,a,e)
    issues=[]
    m=re.search(r'\u201c(.+)\u201d',d['prompt']); quote=norm(m.group(1)) if m else ''
    ans=d['options'][d['correct_index']]
    if kind=='complete-verse':
        filled=quote.replace('_____',ans)
        if filled.lower().rstrip('.:;,') not in kjv.lower(): issues.append('filled verse not in KJV ref')
        alts=[o for o in d['options'] if o!=ans and quote.replace('_____',o).lower().rstrip('.:;,') in kjv.lower()]
        if alts: issues.append(f'other option also fits: {alts}')
        if len(set(o.lower() for o in d['options']))<len(d['options']): issues.append('duplicate options')
    else:
        if quote.lower().rstrip('.:;,') not in kjv.lower(): issues.append('quote not in KJV ref')
        hits=where(quote)
        if kind=='which-book':
            if ans!=b: issues.append(f'answer {ans} != book {b}')
            other=[h for h in hits if parse(h)[0]!=b and parse(h)[0] in d['options']]
            if other: issues.append(f'quote also in option book: {other}')
        else:
            if ans!=ref: issues.append(f'answer {ans} != ref {ref}')
            other=[o for o in d['options'] if o!=ans and o in hits]
            if other: issues.append(f'quote also at option ref: {other}')
            for o in d['options']:
                try: parse(o); 
                except Exception: issues.append(f'bad option ref {o}')
        if len(hits)>1: issues.append(f'note: quote appears at {hits}')
    if ref.split(' ')[0] and ref not in d['explanation'] and kind!='complete-verse': issues.append('explanation lacks ref')
    rows.append({'id':d['id'],'kind':kind,'ref':ref,'answer':ans,'issues':issues})
json.dump(rows,open('tests/review/scripture_check.json','w'),indent=1)
from collections import Counter
print(len(rows), Counter(r['kind'] for r in rows))
for r in rows:
    if r['issues']: print(r['id'], r['ref'], '|', r['answer'], '|', r['issues'])
