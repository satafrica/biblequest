import json, sys, subprocess, difflib, os, glob
sys.path.insert(0,'/tmp/narr')
from split import norm, dur
from asr import words
W='/home/user/workspace'
for wav in sys.argv[1:]:
    b=os.path.basename(wav)[:-4]; _,m,k=b.split('_',2)
    t=open(f'{W}/narr_g/single/{b}.txt').read().strip()
    aw=[x for w,a,c in words(wav) for x in norm(w)]; tw=norm(t)
    sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False); hit=sum(x.size for x in sm.get_matching_blocks())
    r=hit/max(1,len(tw)); extra=len(aw)-hit
    out=f'{W}/narr_g/clips/{m}/{k}.mp3'
    subprocess.run(['ffmpeg','-y','-v','error','-i',wav,'-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,afade=t=in:d=0.02','-ac','1','-ar','24000','-b:a','48k',out],check=True)
    print(json.dumps({'mode':m,'key':k,'ratio':round(r,2),'extra':extra,'dur':round(dur(out),2),'ok':r>=0.85 and extra<=3,'text':t[:80]})); sys.stdout.flush()
