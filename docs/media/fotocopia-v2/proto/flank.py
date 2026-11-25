# flank.py sheet.png out.png pxmm — marker contour against the KNOWN geometry of the sheet.
# For every straight flank of the sheet's patches: e(x) = position of the outermost colour boundary in the print minus the
# true edge. walls = jumps |e(x+1)-e(x)| >= .25 mm per 100 mm of flank (a battlement = two walls); rms of e in mm.
import sys, numpy as np
from PIL import Image
sheet,out,pxmm=sys.argv[1],sys.argv[2],float(sys.argv[3])
O=Image.open(out).convert('RGB'); I=Image.open(sheet).convert('RGB').resize(O.size,Image.LANCZOS)
def sat(im): a=np.asarray(im).astype(np.float32)/255; return a.max(2)-a.min(2)
R=int(round(3.6*pxmm)); TH=.16
def run(si,so):
    mi=si>TH; H,W=mi.shape; walls=0; n=0; es=[]
    up=mi[1:]&~mi[:-1]; dn=~mi[1:]&mi[:-1]            # top edges (paper above), bottom edges (paper below)
    for edge,sgn in ((up,1),(dn,-1)):
        ys,xs=np.nonzero(edge)
        # straight flanks only: same edge row in the 12 neighbouring columns on both sides
        key={}
        for y,x in zip(ys,xs): key.setdefault(y,[]).append(x)
        for y,cols in key.items():
            cols=np.array(sorted(cols)); 
            if len(cols)<200: continue
            seg=[]; prev=None
            for x in cols:
                yt=y+ (1 if sgn==1 else 0)             # first colour row (top) / last colour row is y (bottom)
                lo,hi=max(0,yt-R),min(H-1,yt+R)
                col=so[lo:hi+1,x]
                if sgn==-1: col=col[::-1]
                idx=np.nonzero(col>TH)[0]
                # outermost colour boundary, scanning from the paper side; needs a run of 3 colour px (ignores specks)
                e=None
                for i in idx:
                    if i+2<len(col) and col[i+1]>TH and col[i+2]>TH:
                        f=0. if i==0 else np.clip((TH-col[i-1])/max(col[i]-col[i-1],1e-3),0,1)
                        e=(i-1+f)-(R-0.5); break
                if e is None: prev=None; continue
                es.append(e); n+=1
                if prev is not None and abs(e-prev)>=.25*pxmm: walls+=1
                prev=e
    es=np.array(es)/pxmm
    return walls,n,es
w1,n1,e1=run(sat(I),sat(O)); w2,n2,e2=run(sat(I).T.copy(),sat(O).T.copy())
n=n1+n2; e=np.concatenate([e1,e2]); mm=n/pxmm
print(f"{out.split('/')[-1]:22s} flank={mm:6.0f} mm  walls/100mm={100*(w1+w2)/mm:5.2f}  rms={e.std():.3f} mm  mean={e.mean():+.3f} mm  p95|e|={np.percentile(np.abs(e-np.median(e)),95):.2f} mm")
