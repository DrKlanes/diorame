import sys
from PIL import Image
# crop.py in out x y w h scale
src,dst,x,y,w,h,s=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:8])
im=Image.open(src).convert('RGB').crop((x,y,x+w,y+h)).resize((w*s,h*s),Image.NEAREST); im.save(dst); print(dst,im.size)
