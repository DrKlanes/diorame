from PIL import Image, ImageDraw
import math
W,H,K=2400,1697,4
def mk(): im=Image.new('RGB',(W*K,H*K),(255,255,255)); return im,ImageDraw.Draw(im)
def fin(im,name): im.resize((W,H),Image.LANCZOS).save(name); print(name)
# toner sheet: discs, rings, oblique bars, a wavy band — clean antialiased black on white
im,d=mk(); k=K
for cx,cy,r in [(420,430,300),(1010,300,170),(1010,680,110),(1400,250,60)]: d.ellipse([(cx-r)*k,(cy-r)*k,(cx+r)*k,(cy+r)*k],fill=(0,0,0))
for cx,cy,r,t in [(1850,420,300,40),(1850,420,180,14)]:
    d.ellipse([(cx-r)*k,(cy-r)*k,(cx+r)*k,(cy+r)*k],outline=(0,0,0),width=t*k)
def bar(x0,y0,L,th,ang):
    a=math.radians(ang); dx,dy=math.cos(a),math.sin(a); nx,ny=-dy,dx
    pts=[(x0+nx*th/2,y0+ny*th/2),(x0+dx*L+nx*th/2,y0+dy*L+ny*th/2),(x0+dx*L-nx*th/2,y0+dy*L-ny*th/2),(x0-nx*th/2,y0-ny*th/2)]
    d.polygon([(x*k,y*k) for x,y in pts],fill=(0,0,0))
for i,(ang,th) in enumerate([(3,60),(7,30),(13,60),(23,16),(41,60)]): bar(150+i*30,900+i*130,1000,th,ang)
for i,(ang,th) in enumerate([(87,60),(83,30),(77,60),(67,16)]): bar(1450+i*230,880,720,th,ang)
pts=[(x, 1600+40*math.sin(x/90.)) for x in range(100,1300,2)]
d.line([(x*k,y*k) for x,y in pts],fill=(0,0,0),width=26*k,joint='curve')
fin(im,'out/toner-sheet.png')
# marker sheet: elongated colour patches aligned with the axes (pills and rounded bars), no black
im,d=mk()
cols=[(245,150,50),(70,165,235),(60,170,90)]
def pill(x,y,w,h,c): r=min(w,h)//2; d.rounded_rectangle([x*k,y*k,(x+w)*k,(y+h)*k],radius=r*k,fill=c)
def rbar(x,y,w,h,c): d.rounded_rectangle([x*k,y*k,(x+w)*k,(y+h)*k],radius=18*k,fill=c)
for i,c in enumerate(cols): pill(140,140+i*230,1100,150,c)
for i,c in enumerate(cols): rbar(140,880+i*250,1100,170,c)
for i,c in enumerate(cols): pill(1420+i*320,140,170,1400,c)
fin(im,'out/marker-sheet.png')
