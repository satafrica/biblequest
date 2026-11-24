import sys, json, re, subprocess, difflib, os
sys.path.insert(0,'/tmp/narr')
from asr import words
NUM={'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10'}
def norm(t):
    t=t.lower().replace('\u2019',"'").replace('æ','ae')
    out=[]
    for w in re.findall(r"[a-z0-9']+",t):
        w=NUM.get(w,w).strip("'")
        if w in ('chapter','verse','verses','clu','clue'): continue
        if w: out.append(w)
    return out
def silences(wav):
    e=subprocess.run(['ffmpeg','-i',wav,'-af','silencedetect=n=-38dB:d=0.18','-f','null','-'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',e)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',e)]
    return list(zip(st,en))
def dur(wav): return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',wav],capture_output=True,text=True).stdout)
def process(q, wav, outdir):
    segs=q['segs']; tgt=[]; owner=[]
    for i,s in enumerate(segs):
        for w in norm(s['spoken']): tgt.append(w); owner.append(i)
    asr=words(wav); aw=[]; at=[]
    for w,a,b in asr:
        for x in norm(w): aw.append(x); at.append((a,b))
    sm=difflib.SequenceMatcher(None,tgt,aw,autojunk=False)
    t2a={}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): t2a[blk.a+k]=blk.b+k
    D=dur(wav); sil=silences(wav)
    # boundary before segment i: start time of first matched word belonging to seg i, last matched word end of seg i-1
    cuts=[0.0]; problems=[]
    for i in range(1,len(segs)):
        firsts=[t2a[k] for k in range(len(tgt)) if owner[k]==i and k in t2a]
        lasts=[t2a[k] for k in range(len(tgt)) if owner[k]==i-1 and k in t2a]
        if not firsts or not lasts: problems.append(f'seg{i}: no match'); cuts.append(None); continue
        s0=at[min(firsts)][0]; e0=at[max(lasts)][1]
        cand=[(a,b) for a,b in sil if b>=e0-0.4 and a<=s0+0.3]
        if not cand: problems.append(f'seg{i}: no pause between {e0:.2f} and {s0:.2f}'); cuts.append(None); continue
        a,b=max(cand,key=lambda x:x[1]-x[0]); cuts.append((a+b)/2)
    cuts.append(D)
    res=[]
    for i,s in enumerate(segs):
        own=[k for k in range(len(tgt)) if owner[k]==i]; hit=sum(1 for k in own if k in t2a)
        ratio=hit/max(1,len(own))
        struct=[k for k in own if tgt[k]=='option' or (k>0 and tgt[k-1]=='option')]
        need=0.6 if s['kind']=='options' else 0.75
        ok=ratio>=need and all(k in t2a for k in struct) and cuts[i] is not None and cuts[i+1] is not None
        r={'key':s['key'],'kind':s['kind'],'ratio':round(ratio,2),'ok':ok}
        if ok:
            a=cuts[i]; b=cuts[i+1]
            out=os.path.join(outdir,s['key']+'.mp3')
            subprocess.run(['ffmpeg','-y','-v','error','-i',wav,'-ss',f'{a:.3f}','-to',f'{b:.3f}','-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,afade=t=in:d=0.02','-ac','1','-ar','24000','-b:a','48k',out],check=True)
            r['dur']=round(dur(out),2)
        res.append(r)
    return {'id':q['id'],'problems':problems,'segs':res}
if __name__=='__main__':
    P={q['id']:q for q in json.load(open('/tmp/narr/perq.json'))}
    outdir=sys.argv[1]; os.makedirs(outdir,exist_ok=True)
    for wav in sys.argv[2:]:
        qid=os.path.basename(wav)[2:-4]
        print(json.dumps(process(P[qid],wav,outdir)))
