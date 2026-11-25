# edge.py img [x y w h]  — hardness of dark(toner)/light edges on a capture of the visible canvas.
# For every row and column: crossings dark-run(>=3 px) -> light plateau. n1 = normalised value of the first pixel after the
# dark run. HARD if n1>=.85 (no intermediate pixel: a binary, per-pixel decision). H = hard/total. W = mean ramp width (px).
import sys, numpy as np
from PIL import Image
def measure(a, TD=.22, PMIN=.42):
    hard=tot=0; ws=[]
    for flip in (False, True):
        b=a[:, ::-1] if flip else a
        d=b<=TD
        # i: dark at i-2,i-1,i ; not dark at i+1
        run=d[:, 2:-7]&d[:, 1:-8]&d[:, :-9]&~d[:, 3:-6]
        ys,xs=np.nonzero(run); xs=xs+2
        d0=(b[ys,xs]+b[ys,xs-1]+b[ys,xs-2])/3
        p=np.median(np.stack([b[ys,xs+4],b[ys,xs+5],b[ys,xs+6]]),0)
        flat=np.abs(b[ys,xs+4]-b[ys,xs+6])<.12
        ok=(p>=PMIN)&flat&~d[ys,xs+2]&~d[ys,xs+3]
        ys,xs,d0,p=ys[ok],xs[ok],d0[ok],p[ok]
        n=[np.clip((b[ys,xs+k]-d0)/(p-d0),0,1) for k in (1,2,3)]
        hard+=int((n[0]>=.85).sum()); tot+=len(ys); ws.append(1-n[0]+1-n[1]+1-n[2])
    return hard,tot,np.concatenate(ws) if ws else np.zeros(0)
im=Image.open(sys.argv[1]).convert('RGB')
if len(sys.argv)>5: x,y,w,h=map(int,sys.argv[2:6]); im=im.crop((x,y,x+w,y+h))
A=np.asarray(im).astype(np.float32)/255; L=A[...,0]*.2126+A[...,1]*.7152+A[...,2]*.0722
h1,t1,w1=measure(L); h2,t2,w2=measure(L.T)
H=(h1+h2)/max(1,t1+t2); W=float(np.concatenate([w1,w2]).mean()) if t1+t2 else 0
print(f"{sys.argv[1].split('/')[-1]:32s} crossings={t1+t2:6d}  H={H:.3f}  rampPx={W:.3f}")
