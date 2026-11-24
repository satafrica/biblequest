import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("base.en", device="cpu", compute_type="int8")
def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def words(p):
    segs,_ = m.transcribe(load(p), word_timestamps=True, beam_size=1, language='en')
    return [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
if __name__ == '__main__':
    ws = words(sys.argv[1]); print(' '.join(f"{w}@{a:.2f}" for w,a,b in ws))
