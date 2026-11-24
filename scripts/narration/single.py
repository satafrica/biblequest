import json, sys, subprocess, difflib
sys.path.insert(0,'/tmp/narr')
from split import norm, dur
from asr import words
todo=json.load(open('/tmp/narr/redo.json'))
D='/home/user/workspace/narr_whoami/'
bad=[]
for k,t in todo:
    wav=f'{D}s_{k}.wav'
    aw=[x for w,a,b in words(wav) for x in norm(w)]; tw=norm(t)
    sm=difflib.SequenceMatcher(None,tw,aw,autojunk=False); r=sum(b.size for b in sm.get_matching_blocks())/max(1,len(tw))
    # trailing words not in target means extra speech
    extra=len(aw)-sum(b.size for b in sm.get_matching_blocks())
    subprocess.run(['ffmpeg','-y','-v','error','-i',wav,'-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,afade=t=in:d=0.02','-ac','1','-ar','24000','-b:a','48k',f'{D}clips/{k}.mp3'],check=True)
    print(k, round(r,2), 'extra', extra, round(dur(f'{D}clips/{k}.mp3'),2), t[:60])
    if r<0.75 or extra>3: bad.append(k)
print('bad',bad)
