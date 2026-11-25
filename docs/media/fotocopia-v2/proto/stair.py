# stair.py img [x y w h] — staircase of dark/light edges, robust to blur. Sub-pixel edge position per column (area under the
# normalised ramp), chained along the edge; S = mean |second difference| of the position along chains (px). A smooth,
# antialiased contour gives ~0; a contour decided per pixel (then blurred or not) keeps its steps.
import sys, numpy as np
from PIL import Image
def cross(a, TD=.22, PMIN=.42):
    out=[]
    for flip in (False, True):
        b=a[::-1] if flip else a
        d=b<=TD; Hh=b.shape[0]
        run=d[2:-7]&d[1:-8]&d[:-9]&~d[3:-6]
        ys,xs=np.nonzero(run); ys=ys+2
        d0=(b[ys,xs]+b[ys-1,xs]+b[ys-2,xs])/3
        p=np.median(np.stack([b[ys+4,xs],b[ys+5,xs],b[ys+6,xs]]),0)
        ok=(p>=PMIN)&(np.abs(b[ys+4,xs]-b[ys+6,xs])<.12)
        ys,xs,d0,p=ys[ok],xs[ok],d0[ok],p[ok]
        pos=ys+sum(1-np.clip((b[ys+k,xs]-d0)/(p-d0),0,1) for k in (1,2,3))
        if flip: pos=Hh-1-pos
        out.append((xs,pos))
    return out
def chains(xs,pos,W,minlen=12):
    cols=[[] for _ in range(W)]
    for x,p in zip(xs,pos): cols[x].append(p)
    open_=[]; done=[]
    for x in range(W):
        cur=sorted(cols[x]); used=[False]*len(cur); nxt=[]
        for ch in open_:
            last=ch[-1]; best=-1; bd=1.5
            for i,p in enumerate(cur):
                if not used[i] and abs(p-last)<bd: bd=abs(p-last); best=i
            if best>=0: used[best]=True; ch.append(cur[best]); nxt.append(ch)
            else:
                if len(ch)>=minlen: done.append(ch)
        for i,p in enumerate(cur):
            if not used[i]: nxt.append([p])
        open_=nxt
    done+= [c for c in open_ if len(c)>=minlen]
    return done
def S_of(L):
    d2=[]; n=0
    for xs,pos in cross(L):
        for ch in chains(xs,pos,L.shape[1]):
            c=np.array(ch); d2.append(np.abs(c[2:]-2*c[1:-1]+c[:-2])); n+=len(c)
    if not d2: return 0,0,0
    d=np.concatenate(d2); return float(d.mean()), float((d>.25).mean()), n
im=Image.open(sys.argv[1]).convert('RGB')
if len(sys.argv)>5: x,y,w,h=map(int,sys.argv[2:6]); im=im.crop((x,y,x+w,y+h))
A=np.asarray(im).astype(np.float32)/255; L=A[...,0]*.2126+A[...,1]*.7152+A[...,2]*.0722
s1,j1,n1=S_of(L); s2,j2,n2=S_of(L.T.copy())
S=(s1*n1+s2*n2)/max(1,n1+n2); J=(j1*n1+j2*n2)/max(1,n1+n2)
print(f"{sys.argv[1].split('/')[-1]:34s} edgePx={n1+n2:6d}  S={S:.3f}  jumps>.25px={100*J:.1f}%")
