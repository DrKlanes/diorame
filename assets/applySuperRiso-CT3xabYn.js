import{X as ya,l as Be,h as ue,r as Ze,S as Ma,o as ge,M as at,p as Ut,d as Pa,s as eo,x as wa,b as Ea,c as To,e as Aa,f as Ta,i as La,j as Ra,k as Da,A as Ba,m as Ca}from"./index-itY9ZtrC.js";const Fa=17.2,_a=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,Oe=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform vec2 uRes; uniform float uPxMm; uniform float uSeed;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),u.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y); }
vec3 s2l(vec3 c){ return mix(c/12.92, pow((c+.055)/1.055, vec3(2.4)), step(.04045,c)); }
vec3 l2s(vec3 c){ c=max(c,0.); return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-.055, step(.0031308,c)); }
float pick(vec4 a, vec4 b, int i){ return i<4 ? a[i] : b[i-4]; }
// pendiente de la densidad suavizada a escala de ±0,5 mm: distingue un degradado (pendiente) de una zona plana casi llena
float slope(sampler2D LA, sampler2D LB, vec2 uv, int i, float pxmm){ vec2 h=vec2(.5*pxmm)/uRes;
  float gx=pick(texture(LA,uv+vec2(h.x,0)),texture(LB,uv+vec2(h.x,0)),i)-pick(texture(LA,uv-vec2(h.x,0)),texture(LB,uv-vec2(h.x,0)),i);
  float gy=pick(texture(LA,uv+vec2(0,h.y)),texture(LB,uv+vec2(0,h.y)),i)-pick(texture(LA,uv-vec2(0,h.y)),texture(LB,uv-vec2(0,h.y)),i);
  return abs(gx)+abs(gy); }
`,vo=`
uniform sampler2D uExB, uExR, uExLut; uniform vec2 uExBSize, uExRSize; uniform float uExPxMm;
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
float exS(sampler2D T, vec2 sz, float row, vec2 mm, float seed){
  vec2 uv=mm*uExPxMm/sz; vec2 g=uv*3.4641016;
  vec2 sk=vec2(g.x, -.57735027*g.x+1.15470054*g.y); vec2 b=floor(sk), f=fract(sk); float z=1.-f.x-f.y;
  vec2 v1,v2,v3; vec3 w;
  if(z>0.){ w=vec3(z,f.y,f.x); v1=b; v2=b+vec2(0,1); v3=b+vec2(1,0); } else { w=vec3(-z,1.-f.y,1.-f.x); v1=b+vec2(1); v2=b+vec2(1,0); v3=b+vec2(0,1); }
  w=pow(w,vec3(5.)); w/=(w.x+w.y+w.z);
  vec2 dx=dFdx(uv), dy=dFdy(uv);
  float t1=textureGrad(T,uv+hash2(v1+seed),dx,dy).r, t2=textureGrad(T,uv+hash2(v2+seed),dx,dy).r, t3=textureGrad(T,uv+hash2(v3+seed),dx,dy).r;
  float G=(dot(w,vec3(t1,t2,t3))-.5)*inversesqrt(dot(w,w))+.5;
  return texture(uExLut, vec2(clamp(G,0.,1.)*(255./256.)+.5/256., row)).r*2.;
}
float exThick(vec2 mm, float seed){ return exS(uExB, uExBSize, .25, mm, seed); }
float exThickR(vec2 mm, float seed){ return exS(uExR, uExRSize, .75, mm, seed); }
float exT(vec2 mm, float seed, float sel){ return sel<.5 ? exThick(mm,seed) : exThickR(mm,seed); }   // negro: tinta oscura; rojo: tintas claras
`,Ft=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,et=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,tt=Oe+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Na=Oe+Ft+et+`
uniform vec3 uInk[8]; uniform float uOp[8]; uniform float uCon[8]; uniform int uN; uniform vec3 uPaper; uniform float uCost, uPair;
// la parte cubriente de una tinta se ve como esa tinta sobre papel: así un tinte de una sola tinta coincide EXACTAMENTE con el modelo
vec3 ap(vec3 c, int i, float d){ if(i<0||d<=0.) return c; vec3 over=mix(c*uInk[i],uPaper*uInk[i],uOp[i]); return mix(c,over,d); }
float cost3(ivec3 id, vec3 d, vec3 t){
  vec3 c=ap(ap(ap(uPaper,id.x,d.x),id.y,d.y),id.z,d.z); vec3 e=oklabL(c)-t;
  // solo las tintas añadidas pagan: entre soluciones de una sola tinta decide el color, no el ahorro (si no, las rampas cambian de tinta a saltos)
  float a1=id.x>=0?sqrt(d.x+1e-6)*uCon[id.x]:0., a2=id.y>=0?sqrt(d.y+1e-6)*uCon[id.y]:0., a3=id.z>=0?sqrt(d.z+1e-6)*uCon[id.z]:0.;
  float s=a1+a2+a3-max(a1,max(a2,a3));
  return sqrt(dot(e,e)+1e-9)+uCost*s+(id.y>=0?uPair:0.)+(id.z>=0?uPair:0.); }
void main(){
  ivec2 f=ivec2(gl_FragCoord.xy);
  vec3 src=vec3(float(f.x%33), float(f.y), float(f.x/33))/32.;
  vec3 t=oklabL(s2l(src));
  ivec3 bi=ivec3(-1); vec3 bd=vec3(0); float bc=cost3(bi,bd,t);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    for(int a=1;a<=10;a++){ vec3 d=vec3(float(a)*.1,0,0); float k=cost3(ivec3(i,-1,-1),d,t); if(k<bc){bc=k;bi=ivec3(i,-1,-1);bd=d;} }
    for(int j=i+1;j<8;j++){ if(j>=uN) break;
      for(int a=1;a<=10;a++) for(int b=1;b<=10;b++){ vec3 d=vec3(float(a),float(b),0)*.1; float k=cost3(ivec3(i,j,-1),d,t); if(k<bc){bc=k;bi=ivec3(i,j,-1);bd=d;} }
      if(uN<=4) for(int l=j+1;l<4;l++){ if(l>=uN) break;
        for(int a=1;a<=5;a++) for(int b=1;b<=5;b++) for(int c=1;c<=5;c++){ vec3 d=vec3(a,b,c)*.2; float k=cost3(ivec3(i,j,l),d,t); if(k<bc){bc=k;bi=ivec3(i,j,l);bd=d;} } } } }
  float st=.05;
  for(int it=0;it<5;it++){
    for(int c=0;c<3;c++){ if(bi[c]<0) continue;
      for(int sg=-1;sg<=1;sg+=2){ vec3 d=bd; d[c]=clamp(d[c]+float(sg)*st,0.,1.); float k=cost3(bi,d,t); if(k<bc){bc=k;bd=d;} } }
    st*=.5; }
  oA=vec4(vec3(bi+1)/255.,1.); oB=vec4(0);                       // el LUT solo decide QUÉ tintas; las densidades se resuelven por píxel
}`,Ia=Oe+`
out vec4 o;
uniform sampler2D uSrc; uniform vec2 uSrcRes; uniform float uSmoothPx; uniform vec3 uSrcPaper; uniform vec3 uPaper;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec4 c0=texture(uSrc,uv); vec3 ctr=mix(vec3(1.),c0.rgb,c0.a);
  vec3 acc=vec3(0); float wsum=0.; float r=max(uSmoothPx,.0001);
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
    vec2 off=vec2(i,j)*r*.5/uSrcRes;
    vec4 s=texture(uSrc,uv+off); vec3 c=mix(vec3(1.),s.rgb,s.a);
    float ws=exp(-float(i*i+j*j)/4.5), wr=exp(-dot(c-ctr,c-ctr)/.012);
    acc+=c*ws*wr; wsum+=ws*wr; }
  vec3 cl=s2l(acc/wsum)/s2l(uSrcPaper)*uPaper;
  o=vec4(l2s(min(cl,vec3(1.))),1.);
}`,Ho=Oe+Ft+et+`
uniform sampler2D uPrep, uPrepS, uSet; uniform vec3 uInk[8]; uniform float uOp[8]; uniform float uCon[8]; uniform int uN; uniform vec3 uPaper; uniform float uCost, uPair, uMinDot;
vec3 layer(vec3 c, int i, float d){ vec3 ink=uInk[i]; return c*(1.-d+d*(1.-uOp[i])*ink) + d*uOp[i]*uPaper*ink; }
vec3 model(ivec3 S, vec3 D){ vec3 c=uPaper; if(S.x>=0) c=layer(c,S.x,D.x); if(S.y>=0) c=layer(c,S.y,D.y); if(S.z>=0) c=layer(c,S.z,D.z); return c; }
float solve(ivec3 S, vec3 t, vec3 tL, out vec3 D){
  D=vec3(.5)*vec3(greaterThanEqual(S,ivec3(0)));
  for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;
    vec3 D0=D; D0[k]=0.; vec3 D1=D; D1[k]=1.; vec3 f0=model(S,D0), g=model(S,D1)-f0; float gg=dot(g,g);
    D[k]= gg>1e-10 ? clamp(dot(t-f0,g)/gg,0.,1.) : 0.; }
  float e=length(oklabL(model(S,D))-tL);
  float a1=S.x>=0?sqrt(D.x+1e-6)*uCon[S.x]:0., a2=S.y>=0?sqrt(D.y+1e-6)*uCon[S.y]:0., a3=S.z>=0?sqrt(D.z+1e-6)*uCon[S.z]:0.;
  return e + uCost*(a1+a2+a3-max(a1,max(a2,a3))) + uPair*(float(S.y>=0)+float(S.z>=0)); }
ivec3 setAt(ivec3 n){ vec4 v=texelFetch(uSet, ivec2(n.z*33+n.x, n.y), 0); return ivec3(floor(v.xyz*255.+.5))-1; }
void main(){
  // Dos candidatos: el mejor conjunto para el color suavizado (~0,3 mm, estable, sin rayas) y el mejor para el píxel exacto.
  // Gana el suavizado salvo que en este píxel se equivoque claramente (bordes, detalles): así no hay rayas ni bordes rotos.
  vec2 uv=gl_FragCoord.xy/uRes; vec3 src=clamp(texture(uPrep,uv).rgb,0.,1.); vec3 t=s2l(src); vec3 tL=oklabL(t);
  vec3 srcS=clamp(texture(uPrepS,uv).rgb,0.,1.); vec3 tS=s2l(srcS), tSL=oklabL(tS);
  float eP=length(oklabL(uPaper)-tL);
  ivec3 Sa=ivec3(-1), Ss=ivec3(-1); float ba=eP, bs=length(oklabL(uPaper)-tSL);
  for(int pass=0;pass<2;pass++){
    vec3 c=pass==0?src:srcS; vec3 tt=pass==0?t:tS; vec3 ttL=pass==0?tL:tSL;
    vec3 g=c*32.; ivec3 b0=ivec3(floor(g)); ivec3 b1=min(b0+1,ivec3(32)); ivec3 last=ivec3(-9);
    for(int k=0;k<8;k++){
      ivec3 n=ivec3((k&1)!=0?b1.x:b0.x, (k&2)!=0?b1.y:b0.y, (k&4)!=0?b1.z:b0.z);
      ivec3 S=setAt(n); if(S.x<0 || S==last) continue; last=S;
      vec3 D; float e=solve(S,tt,ttL,D);
      if(pass==0){ if(e<ba){ ba=e; Sa=S; } } else { if(e<bs){ bs=e; Ss=S; } } } }
  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD); }
  vec4 A=vec4(0), B=vec4(0);
  for(int k=0;k<3;k++) if(bS[k]>=0){ float v=bD[k]; put(A,B,bS[k], v<uMinDot?0.:v); }
  oA=A; oB=B;
}`,$a=Oe+et+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Yo=Oe+et+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,Jo=Oe+vo+et+`
uniform sampler2D uSepA, uSepB, uSolA, uSolB, uLocA, uLocB, uGreen; uniform int uN, uMode;
uniform float uGrain, uLoad, uLpi, uMottle, uStarve, uTexAmp, uStreak, uSolidLv, uTrap; uniform float uExSel[8];
// Grain touch: umbral sobre un campo continuo de ruido azul (un texel = un grano). La cobertura es exactamente x
// (CDF inversa medida del campo), los granos se funden en tonos medios y quedan huecos sueltos en tonos altos. Sin rejilla.
float fmDots(vec2 mm, float x, float s){
  // Grain touch: umbral sobre "ruido verde" (racimos de puntos, como la difusión de error de la riso + tinta que se funde).
  // El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.
  float cov=0.; float tx=uGrain/3.; float px=1./(uPxMm*tx);
  for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;   // desfase acotado: con semillas altas, float32 perdía las submuestras
    float f=texture(uGreen,p/1024.).r;
    float h=h12(floor(p/3.)+s*3.1);
    float on=step(f,x);
    float load=mix(uLoad,1.,h);                               // grano aislado: no siempre carga tinta plena (medido: 60–80 %)
    float hole=mix(uLoad,1.,fract(h*7.3));                    // hueco aislado: la tinta vecina lo cierra en parte
    cov+= on*mix(load,1.,smoothstep(.3,.7,x)) + (1.-on)*(1.-mix(hole,1.,smoothstep(.7,.3,x))); }
  return cov/9.; }
float amDots(vec2 mm, float x, float s, float a){
  vec2 r=mat2(cos(a),sin(a),-sin(a),cos(a))*mm*(uLpi/25.4);
  float spot=.5+.25*(cos(6.2831853*r.x)+cos(6.2831853*r.y)) + (h12(floor(r)+s)-.5)*.06;
  float aa=fwidth(spot)*.8+.01;
  return smoothstep(1.-x-aa, 1.-x+aa, spot); }
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec2 uv=gl_FragCoord.xy/uRes;
  vec4 sA=texture(uSepA,uv), sB=texture(uSepB,uv), qA=texture(uSolA,uv), qB=texture(uSolB,uv), lA=texture(uLocA,uv), lB=texture(uLocB,uv);
  vec4 A=vec4(0), B=vec4(0);
  float ang[8]=float[8](.2618,1.309,0.,.7854,.5236,1.0472,.1309,1.1781);
  float sumD=0.; for(int j=0;j<8;j++){ if(j>=uN) break; sumD+=pick(sA,sB,j); }
  for(int i=0;i<8;i++){ if(i>=uN) break;
    float d=pick(sA,sB,i);
    // trapping: donde otra tinta ocupa el sitio y esta plancha está a menos de ~0,2 mm, la tinta se solapa (como un trap real)
    if(d<.05 && sumD-d>.5) d=max(d, uTrap*smoothstep(.04,.3,pick(lA,lB,i)));
    if(d<=0.){ continue; }
    float tone=1.-smoothstep(.06,.18,abs(d-pick(lA,lB,i)));     // zona suave (degradado o tinte) vs. borde/línea
    bool grad= tone>.5 && slope(uLocA,uLocB,uv,i,uPxMm)>.02;
    if(!grad && d>=uSolidLv) d=1.;                                // casi lleno y sin pendiente = sólido (el máster es binario); en degradados no
    if(d>=.999){ put(A,B,i,1.); continue; }
    float s=uSeed*7.31+float(i)*19.17;
    float t=exT(mm,s,uExSel[i]);
    float x=d*(1.+uTexAmp*(t-1.))*(1.+uMottle*.05*(vnoise(mm/28.+s)-.5)*2.);
    x+=uStreak*.05*(vnoise(vec2(mm.x/.35, mm.y/30.)+s*2.3)-.5)*2.;
    float g= uMode==0 ? fmDots(mm,x,s) : amDots(mm,x,s,ang[i]);
    // codifico en un solo valor: zona de línea → d (se umbraliza en SPREAD); zona de tono → puntos ya dibujados
    put(A,B,i, mix(d, g, tone)); }
  oA=A; oB=B;
}`,Zo=Oe+vo+et+`
uniform sampler2D uScrA, uScrB, uSepA, uSepB, uLocA, uLocB; uniform int uN; uniform float uBleedPx, uGain, uEdge, uSolidLv; uniform float uExSel[8];
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gl_FragCoord.xy/uPxMm;
  vec4 a=vec4(0), b=vec4(0); float w=0.; float r=max(uBleedPx,.35);
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA,uv+o2)*k; b+=texture(uScrB,uv+o2)*k; w+=k; }
  a/=w; b/=w;
  vec4 sA=texture(uSepA,uv), sB=texture(uSepB,uv), lA=texture(uLocA,uv), lB=texture(uLocB,uv);
  vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    float s=uSeed*7.31+float(i)*19.17;
    float v=pick(a,b,i); float d=pick(sA,sB,i);
    float tone=1.-smoothstep(.06,.18,abs(d-pick(lA,lB,i))); bool grad= tone>.5 && slope(uLocA,uLocB,uv,i,uPxMm)>.02;
    if(d>=.999||(!grad&&d>=uSolidLv)) tone=0.;
    float t=exT(mm,s,uExSel[i])-1., t2=exThickR(mm*2.3+17.,s*1.7)-1.;
    float aa=clamp(.5/(2.*r+1.),.06,.3);
    float edge=smoothstep(uGain-aa, uGain+aa, v + uEdge*(2.2*t+1.6*t2));
    put(A,B,i, mix(edge, v, tone)); }
  oA=A; oB=B; }`,ja=Oe+vo+`
out vec4 o;
uniform sampler2D uCovA, uCovB, uFib, uInc, uSolA, uSolB; uniform float uStarve; uniform int uN; uniform vec3 uInk[8]; uniform float uOp[8]; uniform vec3 uPaper;
uniform float uPaperTex, uFibers, uIncl, uVoids, uMottle, uTexAmp; uniform float uExSel[8];
float fbm3(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s/.875; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gl_FragCoord.xy/uPxMm;
  vec4 F1=texture(uFib, mm/12.), F2=texture(uFib, mat2(.8,.6,-.6,.8)*mm/17.3+.37);
  float fib=max(F1.r,F2.r*.85);
  vec4 I=texture(uInc, mm/61.);
  vec3 c=uPaper*(1.+uPaperTex*(.02*(fbm3(mm/.18)-.5)*2.+.015*(fbm3(mm/2.5)-.5)*2.))*(1.+uFibers*.04*fib);
  c=mix(c, c*vec3(.6,.58,.55), uIncl*I.r); c=mix(c, c*vec3(.8,.84,.92), uIncl*I.g*.7);
  vec4 cA=texture(uCovA,uv), cB=texture(uCovB,uv);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    float k=pick(cA,cB,i); if(k<=0.) continue;
    float s=uSeed*7.31+float(i)*19.17;
    float t=exT(mm,s,uExSel[i]);
    float th=1.+uTexAmp*(t-1.);
    th-=uVoids*.9*smoothstep(.93,.8,t);                         // los huecos reales se abren
    th*=1.+uMottle*.05*(vnoise(mm/28.+s)-.5)*2.;
    th*=1.-uStarve*.12*smoothstep(.7,1.,pick(texture(uSolA,uv),texture(uSolB,uv),i));   // sólidos grandes: el tambor se queda corto de tinta
    k*=1.-uVoids*.5*smoothstep(.6,.9,fib*uFibers);              // fibras que rechazan tinta
    vec3 T=pow(max(uInk[i],vec3(1e-3)), vec3(max(th,0.)));
    c=mix(c, mix(c*T, uPaper*T, uOp[i]), k); }
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,ea=Oe+`
out vec4 o;
uniform sampler2D uComp; uniform float uBlurPx, uNoise; uniform int uNorm; uniform vec3 uPaper;
void main(){ vec2 fc=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y); vec2 uv=fc/uRes;
  vec3 a=vec3(0); float w=0.; float r=max(uBlurPx,.05);
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l(texture(uComp,uv+vec2(i,j)/uRes).rgb)*k; w+=k; }
  vec3 c=a/w;
  if(uNorm==1) c=c/uPaper;
  vec3 s=l2s(min(c,vec3(1.)));
  float n=(h12(fc*.37+uSeed)-.5)*.02 + (h12(floor(fc*.5)+uSeed*1.3)-.5)*.012;
  s+=(vec3(h12(fc+uSeed), h12(fc+uSeed+3.1), h12(fc+uSeed+7.7))-.5)*uNoise*.025 + n*uNoise;
  o=vec4(clamp(s,0.,1.),1.); }`,za={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Lo={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},Ua={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},we=(e,o,a)=>e+(o-e)*a;function ho(e,o){return{printW:240,pxmm:o*we(.4,1,e)/240,crisp:e<.5,scanBlur:we(1,.65,e),scanNoise:we(.6,.35,e)}}function Oa(e,o){const a=Object.assign({},Ua,e),t=a.imperfection,n=a.resolution,s=a.screenSize;return Object.assign({...ho(n,o),screen:a.screen==="dots"?1:0,grain:we(.09,.3,s),lpi:Math.round(we(120,45,s)),misreg:.04+1.1*Math.pow(t,1.6),rot:we(.01,.16,t),scl:we(.2,1.6,t),edge:we(.25,1.05,t),voids:we(.05,.45,t),texAmp:we(.6,1.45,t),starve:we(.05,.4,t),mottle:we(.3,1.2,t),bleed:we(.04,.07,t),inkLoad:we(.75,.5,t)},Lo[a.paper]||Lo.natural)}function qa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,s=[],f=[];let l=0;const r=new Uint8Array(4),m=(i,c)=>{let k=t.get(i);k||(k=[],t.set(i,k)),k.push(c)};return{get mode(){return a},timerAvailable:!!o,setMode(i){a=i==="timer"&&!o?"off":i,t.clear(),n.clear(),s.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),l=performance.now()),a==="timer"&&this.poll()},before(i,c){if(n.has(i)||(n.set(i,c),s.push(i)),a!=="timer"||!o)return null;const k=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,k),k},after(i,c){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const k=performance.now();m(i,k-l),l=k}else c&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),f.push({name:i,q:c}))},poll(){if(o)for(;f.length&&e.getQueryParameter(f[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:i,q:c}=f.shift();e.getParameter(o.GPU_DISJOINT_EXT)||m(i,e.getQueryParameter(c,e.QUERY_RESULT)/1e6),e.deleteQuery(c)}},report(){return s.map(i=>{const c=[...t.get(i)??[]].sort((k,L)=>k-L);return{name:i,p50:c.length?c[Math.floor(c.length/2)]:null,n:c.length,info:n.get(i)}})}}}const Ga=tt+`
out vec4 o;
uniform sampler2D uPrep; uniform float uDark, uSoft, uMotion, uPhoto, uLpi, uLid;
float lumP(vec3 c){ vec3 l=s2l(c); return pow(dot(l,vec3(.2126,.7152,.0722)),1./2.2); }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm;
  float L=lumP(texture(uPrep,uv).rgb);
  if(uMotion>0.){ for(int k=1;k<=14;k++){ float t=float(k)/14.; vec2 off=vec2(0.,-t*uMotion*uPxMm)/uRes;
      L=min(L, mix(lumP(texture(uPrep,uv+off).rgb),1.,t*t*.8)); } }               // estela oscura en la dirección del barrido
  float scr=0.;
  if(uPhoto>0.){ vec2 r=mat2(.7071,.7071,-.7071,.7071)*mm*(uLpi/25.4);              // modo foto: trama de líneas gruesa a 45°
    scr=(abs(fract(r.x)-.5)*2.-.5)*.55*uPhoto*smoothstep(.04,.25,L)*smoothstep(.98,.75,L); }
  float t=mix(.26,.74,uDark);
  float v=(t-L+scr)/max(uSoft,.004);
  float d=clamp(.5+v,0.,1.);
  if(uLid>0.){ vec2 g=gpx(); float m=uLid*.07*min(uImg.x,uImg.y);                 // tapa abierta: marco negro fuera del original
    vec2 e=min(g, uImg-g); float out_=m-min(e.x,e.y);
    float sh=smoothstep(-1.2*uPxMm, .4*uPxMm, out_);
    d=max(d, sh*(.82+.18*vnoise(mm/1.7))); }
  o=vec4(d,0.,0.,1.); }`,Wa=tt+`
out vec4 o;
uniform sampler2D uD, uGreen; uniform float uThr, uGrain, uDust, uFog, uStreak, uGen;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; float g=uGen+uSeed*.137;
  float d=texture(uD,uv).r;
  float n=texture(uGreen, mm/(uGrain*3.)/1024.*vec2(1.,1.)+vec2(g*.31,g*.17)).r-.5;   // grano de tóner: racimos
  float n2=h12(floor(mm/.035)+g*3.7)-.5;
  float on=smoothstep(uThr-.06,uThr+.06, d + n*.13 + n2*.11);
  // motas del cristal (fijas en la hoja para toda la tirada; cada generación añade su cristal)
  vec2 c=floor(mm/1.6); float hs=h12(c+g*11.3);
  if(hs<uDust*.05){ vec2 ctr=(c+vec2(h12(c+1.7+g),h12(c+5.3+g)))*1.6; float r=.035+.16*pow(h12(c+9.1+g),3.);
    on=max(on, smoothstep(r, r*.55, length(mm-ctr)+(vnoise(mm*9.)-.5)*.03)); }
  // velo de fondo: tóner suelto sobre el blanco
  float hf=h12(floor(mm/.07)+g*2.3); on=max(on, step(hf, uFog*.012)*.85);
  // rayas del tambor: líneas finas en la dirección de avance (vertical), con intensidad que va y viene
  float col=floor(mm.x/.09); float hr=h12(vec2(col,7.7));
  if(hr<uStreak*.006){ float inten=smoothstep(.35,.7,vnoise(vec2(col*3.1, mm.y/35.))); on=max(on, inten*(.6+.4*h12(vec2(col,mm.y*3.)))); }
  o=vec4(on,0.,0.,1.); }`,Xa=tt+Ft+et+`
uniform sampler2D uPS, uIdMap; uniform vec3 uKey[6]; uniform int uNk, uUseMap; uniform vec3 uSrcPaperL; uniform float uMinL, uVoteMm;
int idAt(vec2 uv){
  if(uUseMap==1){ vec2 g=(uv*uRes*4.+uOff)/uImg; ivec2 sz=textureSize(uIdMap,0);           // huecos blancos: zonas decididas en CPU
    ivec2 q=clamp(ivec2(g*vec2(sz)),ivec2(0),sz-1); int v=int(floor(texelFetch(uIdMap,q,0).r*255./36.+.5))-1; return v<uNk?v:-1; }
  vec3 c=s2l(clamp(texture(uPS,uv).rgb,0.,1.)); vec3 L=oklabL(c);
  float dp=length(L-oklabL(uSrcPaperL)); float chroma=length(L.yz);
  if(!(dp>.08 && (L.x>uMinL || chroma>.12))) return -1;
  int bi=-1; float bd=1e9;
  for(int i=0;i<6;i++){ if(i>=uNk) break; vec3 K=oklabL(uKey[i]); vec3 e=K-L; e.x*=.6; float d=dot(e,e); if(d<bd){bd=d;bi=i;} }
  return bd<.045 ? bi : -1; }                                                   // zona = color del original parecido a la clave del rotulador
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 st=vec2(uVoteMm*uPxMm*.25)/uRes;   // uPxMm de la rejilla a ¼
  float cnt[6]; for(int i=0;i<6;i++) cnt[i]=0.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ int id=idAt(uv+vec2(x,y)*st); if(id>=0) cnt[id]+=1.; }
  int bi=-1; float bc=4.5; for(int i=0;i<6;i++){ if(i>=uNk) break; if(cnt[i]>bc){ bc=cnt[i]; bi=i; } }
  vec4 A=vec4(0), B=vec4(0); if(bi>=0) put(A,B,bi,1.);                              // mayoría: el color de la zona, no el del borde
  oA=A; oB=B; }`,Ka=tt+`
out vec4 o;
uniform sampler2D uMA, uMB, uOri; uniform vec2 uSheetMm; uniform vec3 uMk[6]; uniform int uNk, uMed; uniform vec2 uCOff[6];
uniform float uWobble, uCover, uStroke, uAng, uOverlap, uStrength, uSlop, uDry, uWobMm, uGran, uDryB, uBloom, uFast;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.07+11.3; a*=.5; } return s/.9375; }
float mkA(int i, vec2 pmm){ vec2 q=(pmm*uPxMm-uOff)/uRes; return pick(texture(uMA,q),texture(uMB,q),i); }
// Trazo de rotulador de punta biselada, calibrado con trazos reales (Moisés, 24-oct): extremos casi rectos con esquinas romas,
// banda oscura al FINAL (la punta se para y descarga) y filo fino al empezar; filo oscuro estrecho en los bordes largos (marca
// las costuras al solapar); grano fino de tinta; estrías claras cuando va seco; pulso imperfecto; casi siempre el mismo sentido.
float strokes(int i, vec2 p, float fi, float ang, float zs, float kcut, float zdir, float lim, float tidy){
  vec2 dir=vec2(cos(ang),sin(ang)), nr=vec2(-dir.y,dir.x);
  float u=dot(p,dir), v=dot(p,nr);
  float W=uStroke, sp=W*(1.-uOverlap);
  float kc=floor(v/sp); float D=0.;
  for(int dk=-1; dk<=2; dk++){
    float k=kc+float(dk); float hk=h12(vec2(k,fi*7.3+uSeed*.17+zs));
    float wk=W*(.95+.25*h12(vec2(k,fi+2.2+zs)));
    float vc=(k+.5)*sp+(hk-.5)*sp*.45;                                        // separación irregular entre pasadas
    float slope=(h12(vec2(k,fi+5.5+zs))-.5)*.022*(1.-.85*tidy);                 // en figuras alargadas se va recto a lo largo
    float sgn= h12(vec2(k,fi+9.9+zs))<.8 ? zdir : -zdir;
    if(lim>1.+6.*h12(vec2(k,fi+12.1+zs))) continue;                               // trazos de la zona vecina: cada uno entra hasta donde llega
    float P=90.+140.*h12(vec2(k,fi+8.8+zs)); float uo=h12(vec2(k,fi+1.1+zs))*P;   // trazos largos: casi siempre acaban en el contorno
    float j0=floor((u+uo)/P);
    for(int dj=-1; dj<=0; dj++){
      float j=j0+float(dj); float hj=h12(vec2(k*13.1+j,fi+3.3+zs));
      float hn=h12(vec2(k*13.1+j+1.,fi+3.3+zs));
      float s0=j*P-uo+(hj-.5)*P*.2, s1=(j+1.)*P-uo+(hn-.5)*P*.2+P*(.02+.1*h12(vec2(j,k+fi)));   // el siguiente trazo empieza antes de que este acabe: sin huecos
      float um=(s0+s1)*.5; float cur=(h12(vec2(j,k*3.+fi))-.5)*.0005;
      float vcc=vc+slope*(u-um)+cur*(u-um)*(u-um)+(vnoise(vec2(u/9.,k*3.+fi))-.5)*.22;   // el pulso no es perfecto
      float dv=v-vcc; if(abs(dv)>wk*.6) continue;
      vec2 pc=dir*u+nr*vcc;
      float m=mkA(i,pc), g=(mkA(i,pc+dir*.7)-mkA(i,pc-dir*.7))/1.4;
      float thr=.5+(h12(vec2(k+j*.37,fi+4.4))-.5)*.2;                              // umbral estable: un hueco del original no corta pasadas
      float eM=(m-thr)/max(abs(g),.025)+(h12(vec2(k*1.7+j,fi+6.1))-.42)*2.6*uSlop;   // en el contorno: unas pasadas se pasan ~1,5 mm, otras no llegan
      float sk=dv*kcut;                                                         // bisel: corte recto, algo inclinado, igual en los dos extremos
      float ea=min(u-s0+sk, g>=0.? eM+sk : 1e3), eb=min(s1-u-sk, g<0.? eM-sk : 1e3);   // fuera de la zona (m<umbral) siempre queda fuera
      if(sgn<0.){ float t=ea; ea=eb; eb=t; }                                    // ea: extremo de salida; eb: extremo de apoyo (banda oscura)
      float hw=wk*.5;
      // TRAZO RÁPIDO (calibrado con trazos reales): al levantar deprisa, la salida se deshilacha en fibras paralelas de largos
      // distintos, con huecos de papel, menos tinta en la punta y un lado más largo (la punta biselada se levanta inclinada).
      float fast=step(h12(vec2(j*1.3,k+fi*1.7)),uFast);
      float Lf=fast*wk*(.6+2.2*h12(vec2(k,j+fi*2.9)));
      float side=(h12(vec2(j*3.1,k+fi))<.5?-1.:1.)*clamp(dv/hw,-1.,1.);
      float fz=1.;
      if(Lf>0. && ea<Lf){
        float t=clamp(ea/Lf,0.,1.);                                             // 0 en la punta, 1 donde empieza el cuerpo
        float fid=floor((dv/hw*.5+.5)*15.);
        float len=.2+.8*pow(h12(vec2(fid,k*5.+j+fi)),.6);
        float reach=len*(.5+.5*side)+.12;                                       // el lado largo llega más lejos
        float fibOn=smoothstep(1.-t-.04,1.-t+.04,reach);
        float gap=smoothstep(.45,.62,vnoise(vec2(dv/(wk*.03),u/7.+k)));          // huecos finos entre fibras
        fz=fibOn*mix(1.-gap*.9,1.,smoothstep(.65,1.,t))*mix(.55,1.,t); }
      if(fast>0.){                                                              // a veces se rompe a medio camino y deja islas
        float tt=ea/max(ea+eb,1.);
        float br=step(h12(vec2(j,k*2.3+fi)),.12)*(1.-smoothstep(.15,.3,tt));        // rotura rara y cerca de la salida
        fz*=1.-br*(1.-smoothstep(.18,.3,vnoise(vec2(u/3.5+j*3.,dv/(wk*.6)+k*2.))+.1)); }
      if(fast>0.) ea=max(ea,.6)+(ea<0.?-9.:0.);                                // la salida rápida no tiene canto recto
      float eA=hw-abs(dv)+(vnoise(vec2(u/1.6,k+fi))-.5)*.09+(vnoise(p/.12+fi)-.5)*.05;
      float eE=min(ea,eb)+(vnoise(p/.15+fi*2.)-.5)*.06;
      float rc=wk*.12; vec2 q=vec2(rc-eE, rc-eA);
      float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-rc;                       // rectángulo de esquinas romas
      float cov=(1.-smoothstep(-.5,.22,sd+(vnoise(p/.5+fi)-.5)*.12))*fz;        // borde húmedo: se funde ~0,7 mm con la tinta de al lado
      if(cov<=0.) continue;
      float x=clamp(abs(dv)/hw,0.,1.);
      float rim=1.+.1*smoothstep(.6,1.,x);                                      // filo oscuro en los bordes largos, muy suave
      float endP=1.+.38*(.6+.4*hj)*exp(-max(eb,0.)/1.3);                        // banda oscura al final: la punta se para
      float stP=1.+.2*(1.-fast)*exp(-max(ea,0.)/.35);                           // filo fino al empezar (no en la salida rápida)
      float t=clamp(ea/max(ea+eb,1.),0.,1.);
      float dryk=uDry*(.3+.7*hj);
      float dry=1.-.18*dryk*smoothstep(.35,1.,t);
      float stt=vnoise(vec2(u/5.+j*7., dv/(wk*.045)+k));
      float streak=1.-.32*dryk*smoothstep(.55,.85,stt);                         // estrías claras del fieltro seco
      float grain=.93+.1*vnoise(p/.07+fi)+.05*vnoise(p/.6+fi*3.);               // grano fino de la tinta en el papel
      D+=cov*rim*endP*stP*dry*streak*grain*(.95+.1*hk);
    } }
  return D; }
// La hoja se gira para colorear cómodo: zonas grandes (Voronoi) con su propia orientación; dentro de una zona, todos
// los trazos van igual. En la frontera, las dos direcciones se cruzan (se retomó la zona con la hoja girada).
float marker(int i, vec2 p, float fi){
  vec2 z=p/62.; vec2 zc=floor(z); float d1=9., d2=9.; vec2 b1=vec2(0), b2=vec2(0);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=zc+vec2(x,y); vec2 q=c+vec2(h12(c+fi*.3),h12(c+fi*.7+3.1)); float d=length(z-q);
    if(d<d1){ d2=d1; b2=b1; d1=d; b1=c; } else if(d<d2){ d2=d; b2=c; } }
  // forma de cada mancha de color (analizada una vez, en CPU): si es alargada, se colorea a lo largo de su eje
  vec4 ori=texture(uOri, p/uSheetMm);
  float aSh=.5*atan(ori.g*2.-1., ori.r*2.-1.); float wAl=ori.b;
  float rot[4]=float[4](0.,1.5708,-.785,.9);
  float a1=uAng+rot[int(floor(h12(b1+fi*1.9)*3.999))]*step(.35,h12(b1+fi*2.3))+(h12(b1+fi*5.1)-.5)*.3;
  float a2=uAng+rot[int(floor(h12(b2+fi*1.9)*3.999))]*step(.35,h12(b2+fi*2.3))+(h12(b2+fi*5.1)-.5)*.3;
  // mezcla de ángulos en doble ángulo (sin saltos de 180°)
  vec2 v1=mix(vec2(cos(2.*a1),sin(2.*a1)), vec2(cos(2.*aSh),sin(2.*aSh)), wAl); a1=.5*atan(v1.y,v1.x);
  vec2 v2=mix(vec2(cos(2.*a2),sin(2.*a2)), vec2(cos(2.*aSh),sin(2.*aSh)), wAl); a2=.5*atan(v2.y,v2.x);
  float k1=tan(radians(30.*(h12(b1+fi*6.6)-.5)*2.*pow(h12(b1+fi*7.1),.7))); float z1=h12(b1+fi*8.2)<.5?-1.:1.;   // bisel y sentido por zona
  float D=strokes(i,p,fi,a1,h12(b1)*91.,k1,z1,0.,wAl);
  float band=(d2-d1)*62.;                                                       // mm hasta la frontera de zona
  if(band<6.){ float k2=tan(radians(30.*(h12(b2+fi*6.6)-.5)*2.*pow(h12(b2+fi*7.1),.7))); float z2=h12(b2+fi*8.2)<.5?-1.:1.;
    D+=strokes(i,p,fi,a2,h12(b2)*91.,k2,z2,band,wAl); }                            // la zona vecina invade con trazos sueltos, no con una franja
  // tinta con alcohol húmeda sobre húmeda: la segunda pasada redisuelve la primera; el solape oscurece, pero se satura (no dobla)
  return D<=1. ? D : 1.+.3*(1.-exp(-(D-1.)/.5)); }
float water(int i, vec2 p, vec2 pm, float fi, out float cov){
  vec2 w=vec2(fbm(p/6.+fi),fbm(p/6.+fi+7.7))-.5;
  w+=(vec2(vnoise(p/1.3+fi*3.),vnoise(p/1.3+fi*5.))-.5)*.45+(vec2(vnoise(p/.35+fi),vnoise(p/.35+fi+2.))-.5)*.12;
  vec2 q=p+w*uWobMm;                                                            // borde orgánico: el agua no sigue la línea
  float m=mkA(i,q);
  float avg=0., avgS=0.;
  for(int a=0;a<8;a++){ float an=float(a)*.7853982+fi; vec2 o=vec2(cos(an),sin(an)); avg+=mkA(i,q+o*1.1); avgS+=mkA(i,q+o*.35); }
  avg/=8.; avgS/=8.;
  cov=smoothstep(.47,.53,m);
  float rim=clamp((m-avg)*2.2,0.,1.)*cov;                                       // cerco ancho: el pigmento migra al borde al secar
  float line=clamp((m-avgS)*5.,0.,1.)*cov;                                      // línea dura del borde seco
  float gy=mkA(i,q+vec2(0.,1.))-mkA(i,q-vec2(0.,1.)); float pool=clamp(-gy*1.4,0.,1.);   // el agua baja: más carga abajo
  // la aguada se da en pinceladas anchas: variación direccional + gradiente grande (más carga donde se empezó)
  float ang=uAng*.5+(h12(vec2(fi,4.))-.5)*1.2; vec2 dr=vec2(cos(ang),sin(ang)); float acr=dot(p,vec2(-dr.y,dr.x));
  float brush=.9+.16*(vnoise(vec2(acr/9., dot(p,dr)/45.)+fi)-.5)*2.;
  float flow=.62+.55*fbm(p/32.+fi)+.16*(vnoise(p/5.+fi)-.5);
  // floraciones: pocas y grandes, borde de coliflor (fractal) más oscuro y centro lavado
  float bn=fbm(p/13.+fi*4.1)+.22*(fbm(p/1.6+fi)-.5)+.06*(vnoise(p/.3)-.5);
  float bt=.78-.1*uBloom; float bIn=smoothstep(bt,bt+.025,bn)*uBloom; float bEdge=exp(-pow((bn-bt)/.01,2.))*uBloom;
  // granulación: el pigmento flocula y cae a los valles del papel (misma textura que el papel)
  float ph=fbm(pm/.2);
  float floc=smoothstep(.45,.75,vnoise(pm/.16+fi)*.6+vnoise(pm/.5)*.4);
  float gran=1.+uGran*((.5-ph)*1.1+.35*(floc-.4));
  float dryb=1.-uDryB*smoothstep(.6,.78,ph)*smoothstep(.45,.75,vnoise(vec2(dot(p,dr)/16., acr/1.4)+fi));   // pincel seco
  return .8*flow*brush*gran*dryb*(1.-.45*bIn)*(1.+1.4*bEdge*cov)*(1.+1.3*rim*rim+1.6*line+1.*rim*pool); }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; vec3 T=vec3(1.);
  for(int i=0;i<6;i++){ if(i>=uNk) break; float fi=float(i)+uSeed*.371;
    vec2 p=mm-uCOff[i];
    float zone=smoothstep(.1,.25, vnoise(mm/40.+fi*13.7)-(1.-uCover)*.9+.2);  // zonas que se quedan sin pintar
    if(zone<=0.) continue;
    float D, cov=1.;
    if(uMed==1) D=marker(i,p,fi); else D=water(i,p,mm,fi,cov);
    D*=zone*cov; if(D<=0.) continue;
    T*=pow(max(uMk[i],vec3(1e-3)), vec3(D*uStrength)); }
  o=vec4(T,1.); }`,Va=tt+`
out vec4 o;
uniform sampler2D uD; uniform float uHair, uScratch, uPrint, uSmear;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// curva libre: N tramos con giro que va cambiando (pelo, pelusa). Devuelve cobertura con grosor que se afina en las puntas
float curve(vec2 p, vec2 a, float th, float L, float turn, float wig, float w0, float sd, int N){
  float best=0.; vec2 q=a; float ang=th; float l=L/float(N);
  for(int s=0;s<12;s++){ if(s>=N) break; float t=(float(s)+.5)/float(N);
    ang+=turn+(h12(vec2(sd,float(s)))-.5)*wig; vec2 n=q+vec2(cos(ang),sin(ang))*l;
    float w=w0*(.35+.65*sin(3.14159*t));
    best=max(best, 1.-smoothstep(w*.5, w*.5+.02, seg(p,q,n))); q=n; }
  return best; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; float sd=uSeed*.731;
  float d=texture(uD,uv).r; float dirt=0.;
  // pelos: largos, curvados, negros (están sobre el cristal: salen nítidos)
  vec2 c0=floor(mm/34.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=c0+vec2(x,y); float h=h12(c+sd);
    if(h<uHair*.32){ vec2 a=(c+vec2(h12(c+1.3),h12(c+2.7)))*34.; float L=8.+30.*h12(c+3.9);
      dirt=max(dirt, curve(mm,a,h12(c+4.1)*6.283,L,(h12(c+5.2)-.5)*.35,.5,.07+.09*h12(c+6.3),h12(c+7.7)*50.+sd,10)); } }
  // pelusas: cortas y rizadas, algo más grises
  vec2 c1=floor(mm/9.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=c1+vec2(x,y); float h=h12(c+sd+9.1);
    if(h<uHair*.12){ vec2 a=(c+vec2(h12(c+1.9),h12(c+2.1)))*9.; float L=1.5+4.*h12(c+3.3);
      dirt=max(dirt, .85*curve(mm,a,h12(c+4.4)*6.283,L,(h12(c+5.5)-.5)*1.4,1.2,.045+.04*h12(c+6.6),h12(c+8.8)*40.,6)); } }
  // racimos de polvo
  vec2 c2=floor(mm/14.); float hc=h12(c2+sd+3.3);
  if(hc<uHair*.25){ vec2 ctr=(c2+vec2(h12(c2+.7),h12(c2+.9)))*14.; float r=length(mm-ctr);
    if(r<3.){ vec2 g=floor(mm/.09); float hg=h12(g+c2); dirt=max(dirt, step(hg, .09*(1.-r/3.))*.95); } }
  // arañazos del cristal: rectos, largos y finos, grises
  vec2 c3=floor(mm/70.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=c3+vec2(x,y); float h=h12(c+sd*.3+11.);
    if(h<uScratch*.5){ vec2 a=(c+vec2(h12(c+1.),h12(c+2.)))*70.; float an=h12(c+3.)*3.1416; vec2 b=a+vec2(cos(an),sin(an))*(30.+80.*h12(c+4.));
      float dd=seg(mm,a,b); float dash=step(.25,vnoise(vec2(dot(mm-a,normalize(b-a))/6.,h*9.)));
      dirt=max(dirt, (1.-smoothstep(.012,.035,dd))*(.35+.3*h12(c+5.))*dash); } }
  // huellas: crestas de tóner en un óvalo, débiles
  vec2 c4=floor(mm/90.); float hf=h12(c4+sd+17.);
  if(hf<uPrint*.45){ vec2 ctr=(c4+vec2(.2+.6*h12(c4+1.),.2+.6*h12(c4+2.)))*90.; float an=h12(c4+3.)*3.14;
    vec2 q=mat2(cos(an),sin(an),-sin(an),cos(an))*(mm-ctr); q.y*=.78; float r=length(q);
    if(r<9.){ float ridge=sin(r*13.96+atan(q.y,q.x)*1.5+vnoise(q*.9)*3.)*.5+.5;
      dirt=max(dirt, smoothstep(.55,.9,ridge)*(1.-smoothstep(5.,9.,r))*(.28+.15*vnoise(q))); } }
  // arrastre del fusor: cola gris por debajo del negro (avance = +y)
  if(uSmear>0.){ float tr=0.; for(int k=1;k<=8;k++){ float t=float(k); tr=max(tr, texture(uD,uv-vec2(0.,t*.6*uPxMm)/uRes).r*exp(-t*.32)); }
    float col=vnoise(vec2(mm.x/.8, 3.3));                                        // por columnas, no uniforme
    dirt=max(dirt, tr*uSmear*.22*smoothstep(.3,.8,col)); }
  o=vec4(max(d,dirt),0.,0.,1.); }`,Qa=tt+`
out vec4 o;
uniform sampler2D uD, uSolX, uC, uFib; uniform vec3 uPaper; uniform float uHollow, uBand, uPaperTex, uFibers, uHasColor, uTonerK;
float fbm3(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s/.875; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm;
  vec4 F=texture(uFib, mm/12.);
  vec3 c=uPaper*(1.+uPaperTex*(.02*(fbm3(mm/.2)-.5)*2.))*(1.+uFibers*.03*F.r);
  vec3 T=uHasColor>.5 ? texture(uC,uv).rgb : vec3(1.);
  vec3 cp=c*T;                                                                     // color sobre el papel (transparente)
  float d=texture(uD,uv).r, S=texture(uSolX,uv).r;
  float inner=smoothstep(.62,.95,S);                                               // dentro de un sólido grande
  float mot=.55*vnoise(mm/.45)+.3*vnoise(mm/.13)+.15*h12(floor(mm/.04));
  float dT=d*(1.-uHollow*(1.-.75*uTonerK)*inner*(.006+.08*mot));
  dT*=1.-uBand*.05*smoothstep(.4,.9,vnoise(vec2(mm.x/9.,.5)));                      // bandas claras en la dirección de avance
  vec3 toner=vec3(1.,1.,1.08)*mix(.045,.0018,uTonerK)*(1.+.6*h12(floor(mm/.03)));    // negro del tóner: de gris gastado a negro profundo
  c=mix(cp, toner*mix(vec3(1.),T,.04), clamp(dT,0.,1.)*.995);                     // el tóner tapa; el color encima apenas lo tiñe
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ha={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},ye=(e,o,a)=>e+(o-e)*a;function Ya(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:ya[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:ye(.1,1,o),scratch:ye(0,.7,o),prints:ye(0,.45,o),smear:ye(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:ye(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:ye(.05,1,o),fog:ye(.05,1,o),streak:ye(0,.8,o),band:ye(.1,.8,o),hollow:ye(.2,.7,o),grain:ye(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:ye(.1,2.2,a),sloppy:ye(.25,1.2,a),wobble:ye(.2,.9,a),cover:ye(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function Ja(e,o,a){return{...ho(a,o),...Object.assign(Ya(e),e.fine),tech:"xerox"}}function Za(e){const{gl:o}=e;let a=null,t=null,n=0,s=0;const f=o.createTexture();let l;const r=o.createTexture();let m,i=null;const c=()=>{if(!i){i=document.createElement("canvas"),i.width=i.height=1;const b=i.getContext("2d");b.fillStyle="rgb(255,128,0)",b.fillRect(0,0,1,1)}return i};function k(b,h){if(a||(a={xlum:e.compile(Ga),xgen:e.compile(Wa),xid:e.compile(Xa),xcolor:e.compile(Ka),xcomp:e.compile(Qa),xdirt:e.compile(Va)}),t&&b===n&&h===s)return;t&&Object.values(t).forEach(e.freeTarget),n=b,s=h;const T=Math.max(1,b>>2),x=Math.max(1,h>>2);t={xa:e.target(b,h),xb:e.target(b,h),xc:e.target(b,h),xq1:e.target(T,x,2),xq2:e.target(T,x,2),xs:e.target(T,x)}}function L(b,h,T,x,C,q,W,F){k(q,W);const p=Object.assign({},Ha,b),d=t,B=a,j=q/p.printW,G=(p.markers||[]).slice(0,6),ee=p.hand>0?G.length:0,_=[];for(let g=0;g<6;g++)_.push(...Be(ue(G[g]||"#ffffff")));const U=(p.keys&&p.keys.length?p.keys:G).slice(0,6),N=[];for(let g=0;g<6;g++)N.push(...Be(ue(U[g]||G[g]||"#ffffff")));p.regionMap&&p.regionMap!==m&&(e.texFrom(p.regionMap,{filter:o.NEAREST},r),m=p.regionMap),!p.regionMap&&m!==null&&(e.texFrom(c(),{filter:o.NEAREST},r),m=null);const oe=Ze(p.seed*4241+7),Y=[];for(let g=0;g<6;g++){const A=oe()*Math.PI*2,S=p.offset*(.35+.65*oe());Y.push(Math.cos(A)*S,Math.sin(A)*S)}p.orientMap&&p.orientMap!==l&&(e.texFrom(p.orientMap,{filter:o.NEAREST},f),l=p.orientMap),!p.orientMap&&l!==null&&(e.texFrom(c(),{filter:o.NEAREST},f),l=null);const ae=p.regionMap?1:0,be=Be(ue(p.paper)),I=Be(p.srcPaper||[1,1,1]),w=(g,A,S,D)=>e.run(g,A,S,z=>{z.f("uOff",0,0),z.f("uImg",q,W),D(z)});w("PREP",e.PR.prep,h.prep,g=>{g.t("uSrc",T),g.f("uSrcRes",x,C),g.f("uSmoothPx",p.smooth*x/p.printW),g.f("uSrcPaper",...p.srcPaper||[1,1,1]),g.f("uPaper",1,1,1)}),w("XLUM",B.xlum,d.xa,g=>{g.f("uPxMm",j),g.t("uPrep",h.prep.t[0]),g.f("uDark",p.dark),g.f("uSoft",p.soft),g.f("uMotion",p.motion),g.f("uPhoto",p.photo),g.f("uLpi",p.lpi),g.f("uLid",p.lid)});const E=(g,A,S,D,z,R)=>w(`BLUR ${g}`,e.PR.blur,S,M=>{M.t("uTexA",A.t[0]),M.t("uTexB",A.t[A.t.length>1?1:0]),M.f("uDir",D,z),M.f("uSig",R)}),P=Math.max(1,Math.round(p.gens));for(let g=1;g<=P;g++){const A=Math.max(.05,p.genSpread*j*(g===1?.6:1));E(`gen${g} H`,d.xa,d.xb,1,0,A),E(`gen${g} V`,d.xb,d.xc,0,1,A),w(`XGEN ${g}`,B.xgen,d.xa,S=>{S.f("uPxMm",j),S.f("uSeed",p.seed),S.t("uD",d.xc.t[0]),S.t("uGreen",e.greenTex),S.f("uThr",p.thr),S.f("uGrain",p.grain),S.f("uDust",p.dust),S.f("uFog",p.fog),S.f("uStreak",p.streak),S.f("uGen",g)})}w("XDIRT",B.xdirt,d.xb,g=>{g.f("uPxMm",j),g.f("uSeed",p.seed),g.t("uD",d.xa.t[0]),g.f("uHair",p.hairs),g.f("uScratch",p.scratch),g.f("uPrint",p.prints),g.f("uSmear",p.smear)});const Q=d.xb;E("sol ¼ H",Q,h.qtmp,1,0,1.1*j/4),E("sol ¼ V",h.qtmp,d.xs,0,1,1.1*j/4);const K=ee>0;if(K){E("ps ¼ H",h.prep,h.qtmp,1,0,Math.max(.3,.12*j/4)),E("ps ¼ V",h.qtmp,d.xq1,0,1,Math.max(.3,.12*j/4)),w("XID",B.xid,d.xq2,A=>{A.t("uPS",d.xq1.t[0]),A.fv("uKey",N,3),A.t("uIdMap",r),A.i("uUseMap",ae),A.i("uNk",ee),A.f("uSrcPaperL",...I),A.f("uMinL",.32),A.f("uPxMm",j),A.f("uVoteMm",p.colorSmooth)});const g=Math.max(.3,(p.hand===1?.8:p.sloppy)*j/4);E("mask H",d.xq2,h.qtmp,1,0,g),E("mask V",h.qtmp,d.xq1,0,1,g),w("XCOLOR",B.xcolor,d.xc,A=>{A.f("uPxMm",j),A.f("uSeed",p.seed),A.t("uMA",d.xq1.t[0]),A.t("uMB",d.xq1.t[1]),A.fv("uMk",_,3),A.i("uNk",ee),A.i("uMed",p.hand),A.fv("uCOff",Y,2),A.f("uWobble",p.wobble),A.f("uCover",p.cover),A.f("uStroke",p.stroke),A.f("uAng",p.strokeAng*Math.PI/180),A.f("uOverlap",p.overlap),A.f("uStrength",p.strength),A.f("uSlop",p.slop),A.f("uDry",p.dry),A.f("uFast",p.fast),l===void 0&&(e.texFrom(c(),{filter:o.NEAREST},f),l=null),A.t("uOri",f),A.f("uSheetMm",q/j,W/j),A.f("uWobMm",p.wobMm),A.f("uGran",p.gran),A.f("uDryB",p.dryB),A.f("uBloom",p.bloom)})}w("XCOMP",B.xcomp,h.comp,g=>{g.f("uPxMm",j),g.t("uD",Q.t[0]),g.t("uSolX",d.xs.t[0]),g.f("uTonerK",p.tonerK),g.t("uC",d.xc.t[0]),g.t("uFib",e.fibTex),g.f("uPaper",...be),g.f("uHollow",p.hollow),g.f("uBand",p.band),g.f("uPaperTex",p.paperTex),g.f("uFibers",p.fibers),g.f("uHasColor",K?1:0)}),w("SCAN",e.PR.scan,F?h.out:null,g=>{g.f("uSeed",p.seed),g.t("uComp",h.comp.t[0]),g.f("uBlurPx",p.scanBlur),g.f("uNoise",p.scanNoise),g.i("uNorm",0),g.f("uPaper",...be)})}return{render:L}}const en=tt+Ft+et+`
uniform sampler2D uSimp, uBr; uniform int uNL, uNK, uAccOn; uniform int uKind[5]; uniform int uCh[5]; uniform float uThr[5];
uniform vec3 uKey[5]; uniform vec3 uAccK; uniform vec2 uOffs[5]; uniform float uFacet, uAA;
float keyD(vec3 L, vec3 K){ vec3 e=oklabL(K)-L; e.x*=.6; return dot(e,e); }
void main(){ vec2 mm=gpx()/uPxMm; vec2 g=gpx()/uImg; vec4 A=vec4(0), B=vec4(0); vec4 br=texture(uBr,g);
  for(int k=0;k<5;k++){ if(k<uNL){                                                     // sin break ni derivadas: Direct3D (ANGLE) las deja indefinidas en bucles
    vec2 uv=(gl_FragCoord.xy-uOffs[k]*uPxMm)/uRes;
    vec3 L=oklabL(s2l(clamp(texture(uSimp,uv).rgb,0.,1.))); float ch=length(L.yz), d=clamp(1.-L.x+.3*ch,0.,1.);              // «tinta»: oscuridad + saturación (un rojo vivo cuenta como mancha)
    int kind=uKind[k]; float f;
    if(kind==3){ f=min((.045-keyD(L,uAccK))*4., (ch-.06)*2.); }
    else if(kind==1){ float dk=keyD(L,uKey[k]), best=1e9;
      for(int j=0;j<5;j++){ if(j<uNK && j!=k) best=min(best,keyD(L,uKey[j])); }
      float kc=length(oklabL(uKey[k]).yz); f=min(min(best-dk, .06-dk), kc>.06 ? (ch-.5*kc)*3. : 1.); }   // un color vivo no se queda los grises del borde
    else { f=d-uThr[k]; if(uAccOn==1) f=min(f,(keyD(L,uAccK)-.045)*4.+(.06-ch)*2.); }   // el acento no entra en las capas de tono
    f+=(vnoise(mm*1.7+float(k)*13.1)-.5)*uFacet*.05 + (vnoise(mm*5.3+float(k)*7.7)-.5)*uFacet*.02;   // filo de cuchilla
    float m=clamp(f/uAA+.5,0.,1.);                                                     // antialias: pendiente de un borde desenfocado al tamaño de corte
    int c=uCh[k]; if(c>=0) m*=1.-br[c];
    put(A,B,k,m); } }
  oA=A; oB=B; }`,tn=tt+`
out vec4 o;
uniform sampler2D uMA, uMB, uQA, uQB, uWA, uWB, uDr, uCl, uSpT;
uniform int uNL, uSup; uniform int uCh[5]; uniform vec3 uLc[5]; uniform float uOp[5];
uniform vec3 uSupLin, uCloudLin; uniform float uTp, uSupTex, uLift, uOver, uLoad, uMist, uDrop, uCloud, uSpN, uDrTp, uLiftScale;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.07+11.3; a*=.5; } return s/.9375; }
float sprayCov(float c, vec2 mm, float k){
  float a=k*1.7+uSeed*.37; mat2 R=mat2(cos(a),sin(a),-sin(a),cos(a));
  vec2 uv=R*(mm/(143.36*uDrop))+vec2(h12(vec2(k,mod(uSeed,97.))),h12(vec2(mod(uSeed,89.),k+3.)));
  float tp=uTp;                                                                         // texels de gota por píxel (constante del render)
  float T=textureLod(uSpT,uv,0.).r;                                                    // sin promediar: el grano del spray se ve también en la vista
  float fine=smoothstep(T,T+.02,c*1.02);                                                // carga 0 = nada; carga 1 = todo
  return mix(fine, clamp(c,0.,1.), smoothstep(5.,9.,tp)); }
void support(vec2 mm, out vec3 C, out float m, out float pore){
  C=uSupLin; m=1.; pore=0.; float t=uSupTex; float n1=fbm(mm/40.), n2=fbm(mm/6.);
  if(uSup==0){                                                                         // papel
    C*=1.+t*(.03*(n2-.5)+.025*(vnoise(mm/.25)-.5)); }
  else if(uSup==1){                                                                    // pared: manchas, grano y poros
    C*=1.+t*(.18*(n1-.5)+.08*(n2-.5)+.05*(h12(floor(mm*9.)+3.)-.5));
    vec2 c=floor(mm/.8), f=fract(mm/.8)-.5-(vec2(h12(c),h12(c+5.))-.5)*.5; float r=mix(.06,.24,h12(c+9.))/.8;
    pore=step(1.-.35*t,h12(c+13.))*(1.-smoothstep(r*.6,r,length(f)))*smoothstep(1.5,3.,.2*uPxMm);
    C*=1.-.3*pore; }
  else if(uSup==2){                                                                    // cartón ondulado
    float a=smoothstep(2.,5.,4.6*uPxMm), s=sin(mm.x*6.2832/4.6);
    float fl=smoothstep(-1.,1.,s)*2.-1.;
    C*=1.+t*(.014*fl*a+.08*(n1-.5)+.03*(vnoise(mm*vec2(.9,.45))-.5)+.03*(vnoise(mm/.25)-.5));
    m=1.+.1*t*fl*a; }
  else if(uSup==3){                                                                    // lienzo: trama
    float p=.62, a=smoothstep(2.,4.,p*uPxMm); float sx=sin(mm.x*6.2832/p), sy=sin(mm.y*6.2832/p);
    float h=mix(.5,.5+.25*sx*(.5+.5*sy)+.25*sy*(.5-.5*sx),a);
    C*=1.+t*(.13*(h-.5)+.03*(n2-.5)); m=mix(1.,.72+.56*h,t*.8); }
  else {                                                                               // madera: veta
    float w=sin((mm.y+4.*fbm(mm*vec2(.03,.2)))*6.2832/2.2);
    C*=1.+t*(.07*w+.12*(fbm(mm*vec2(.04,.6))-.5)); m=1.+t*.1*w; } }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; vec2 g=gpx()/uImg;
  vec3 C; float sm, pore; support(mm,C,sm,pore);
  if(uCloud>0.){ float cd=texture(uCl,g).r*uCloud*(.45+1.1*fbm(mm/16.+3.)); cd*=1.+(sm-1.)*(1.-min(cd*cd,1.));               // nube a mano alzada detrás del motivo
    C=mix(C,uCloudLin,sprayCov(cd*1.1,mm,9.)*(1.-pore*.9)*.97); }
  vec4 dr=texture(uDr,g);
  for(int k=0;k<5;k++){ if(k<uNL){ float fk=float(k);
    float hard=pick(texture(uMA,uv),texture(uMB,uv),k);
    float soft=pick(texture(uQA,uv),texture(uQB,uv),k), wide=pick(texture(uWA,uv),texture(uWB,uv),k);
    float lf=fbm(mm/uLiftScale+vec2(fk*7.3,fk*3.1)+mod(uSeed,50.)*.13);
    float lift=smoothstep(.78-.5*uLift,.92-.5*uLift,lf)*step(.01,uLift);              // tramos donde la plantilla no pisa
    float under=clamp(soft*1.8,0.,1.)*lift;
    float over=wide*uOver*.42*(.55+.9*fbm(mm/9.+fk));
    float load=uLoad*(1.+uMist*(fbm(mm/30.+fk*5.)-.5)*.9);
    float dens=hard*load+(1.-hard)*max(under*load,over);
    int c=uCh[k]; float drip=0.;
    if(c>=0){ drip=c==0?dr.r:c==1?dr.g:dr.b; drip=smoothstep(.5-uDrTp,.5+uDrTp,drip+(vnoise(mm*3.)-.5)*.12); }
    dens=max(dens*(1.+(sm-1.)*(1.-min(dens*dens,1.))), drip*1.4);                    // la textura del soporte solo se nota con poca carga
    float cv=sprayCov(dens,mm,fk)*(1.-pore*.88*(1.-drip));
    C=mix(C, uLc[k]*mix(1.,.85,drip), cv*uOp[k]); } }
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,on={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Ge=(e,o,a)=>e+(o-e)*a;function an(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:Ma[e.sup];return{cut:Ge(.3,4,Math.pow(e.cut,1.5)),facet:Ge(.3,1.1,o),misreg:Ge(0,2.2,o),lift:e.lift,liftMm:Ge(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Ge(.72,1.25,e.load),mist:Ge(.2,.85,o),drop:Ge(.4,3,e.dropSize),drips:e.drips,dripLen:Ge(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Ge(0,1.5,e.supTex),smooth:.12}}function nn(e,o,a){return{...ho(a,o),...an(e),tech:"stencil"}}const ta=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),oa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let Ot=null;const to=2048;function rn(){if(Ot)return Ot;const e=to,o=new Float32Array(e*e).fill(2),a=Ze(7),t=()=>{let b=0;for(;!b;)b=a();return Math.sqrt(-2*Math.log(b))*Math.cos(6.2832*a())};let n=0;const s=4.6*e*e;for(;n<s;){const b=a()<.07,h=Math.min(16,Math.max(.6,(b?5.5:2.6)*Math.exp(.45*t()))),T=a(),x=a()*e,C=a()*e,q=Math.floor(x),W=Math.floor(C),F=Math.ceil(h),p=h*h;for(let d=-F;d<=F;d++){const B=W+d+.5-C;if(B*B>p)continue;const j=((W+d)%e+e)%e*e;for(let G=-F;G<=F;G++){const ee=q+G+.5-x;if(ee*ee+B*B>p)continue;const _=j+((q+G)%e+e)%e;T<o[_]&&(o[_]=T)}}n+=Math.PI*p}const f=4096,l=new Uint32Array(f);let r=0;for(let b=0;b<e*e;b++)o[b]<2&&(l[Math.min(f-1,o[b]*f|0)]++,r++);const m=new Float32Array(f);let i=0;for(let b=0;b<f;b++)i+=l[b],m[b]=i/r;const c=document.createElement("canvas");c.width=c.height=e;const k=c.getContext("2d"),L=k.createImageData(e,e);for(let b=0;b<e*e;b++){const h=o[b]<2?m[Math.min(f-1,o[b]*f|0)]*.985:1,T=Math.round(h*255);L.data[b*4]=L.data[b*4+1]=L.data[b*4+2]=T,L.data[b*4+3]=255}return k.putImageData(L,0,0),Ot=c,c}function Mt(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let s=e;const f=new Float32Array(e.length);for(let l=0;l<3;l++){for(let r=0;r<a;r++){let m=0;const i=r*o;for(let c=-n;c<=n;c++)m+=s[i+Math.min(o-1,Math.max(0,c))];for(let c=0;c<o;c++)f[i+c]=m/(2*n+1),m+=s[i+Math.min(o-1,c+n+1)]-s[i+Math.max(0,c-n)]}for(let r=0;r<o;r++){let m=0;for(let i=-n;i<=n;i++)m+=f[Math.min(a-1,Math.max(0,i))*o+r];for(let i=0;i<a;i++)s=s===e?new Float32Array(e.length):s,s[i*o+r]=m/(2*n+1),m+=f[Math.min(a-1,i+n+1)*o+r]-f[Math.max(0,i-n)*o+r]}}return s}function sn(e,o,a){const t=(i,c)=>{let k=i*374761393+c*668265263+a*982451653|0;return k=(k^k>>>13)*1274126177|0,((k^k>>>16)>>>0)/4294967296},n=Math.floor(e),s=Math.floor(o),f=e-n,l=o-s,r=f*f*(3-2*f),m=l*l*(3-2*l);return(t(n,s)*(1-r)+t(n+1,s)*r)*(1-m)+(t(n,s+1)*(1-r)+t(n+1,s+1)*r)*m}function cn(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),s=document.createElement("canvas");s.width=t,s.height=n;const f=s.getContext("2d",{willReadFrequently:!0});return f.fillStyle="#fff",f.fillRect(0,0,t,n),f.drawImage(e,0,0,t,n),{D:f.getImageData(0,0,t,n).data,w:t,h:n,sp:Be(o).map(l=>Math.max(l,.02))}}function ln(e,o,a){const{D:t,w:n,h:s,sp:f}=cn(e,o),l=new Float64Array(256);for(let x=0;x<n*s;x++){const C=ge([0,1,2].map(W=>oa(Math.min(1,ta(t[x*4+W]/255)/f[W])))),q=Math.max(0,Math.min(1,1-C[0]+.3*Math.hypot(C[1],C[2])));l[Math.min(255,q*256|0)]++}{let x=0,C=0;for(let q=0;q<256;q++)x+=l[q],q>=20&&(C+=l[q]);if(C>x*.05)for(let q=0;q<20;q++)l[q]=0}const r=64,m=new Float64Array(r);for(let x=0;x<256;x++)m[x>>2]+=l[x];const i=new Float64Array(r+1),c=new Float64Array(r+1);for(let x=0;x<r;x++)i[x+1]=i[x]+m[x],c[x+1]=c[x]+m[x]*(x+.5)/r;const k=(x,C)=>{const q=i[C]-i[x];return q>0?(c[C]-c[x])*(c[C]-c[x])/q:0};let L=-1,b=[];const h=new Array(a).fill(0),T=(x,C,q)=>{if(x===a){const W=q+k(C,r);W>L&&(L=W,b=h.slice());return}for(let W=C+1;W<=r-(a-x);W++)h[x]=W,T(x+1,W,q+k(C,W))};return T(0,0,0),b.map(x=>Math.max(.04,Math.min(.95,x/r)))}function Ro(e,o){const a=o.printW||210,t=o.seed|0,n=Ze(t*7919+5),s=o.layers||[],f=()=>{let S=0;for(;!S;)S=n();return Math.sqrt(-2*Math.log(S))*Math.cos(6.2832*n())},l=e.width,r=e.height,m=Math.min(1,1024/Math.max(l,r)),i=Math.max(8,Math.round(l*m)),c=Math.max(8,Math.round(r*m)),k=i*c,L=a/i,b=document.createElement("canvas");b.width=i,b.height=c;const h=b.getContext("2d",{willReadFrequently:!0});h.fillStyle="#fff",h.fillRect(0,0,i,c),h.drawImage(e,0,0,i,c);const T=h.getImageData(0,0,i,c).data,x=Be(o.srcPaper||[1,1,1]).map(S=>Math.max(S,.02)),C=new Float32Array(k*3);for(let S=0;S<k;S++){const D=[0,1,2].map(R=>oa(Math.min(1,ta(T[S*4+R]/255)/x[R]))),z=ge(D);C[S*3]=z[0],C[S*3+1]=z[1],C[S*3+2]=z[2]}const q=(S,D)=>{const z=(D[0]-C[S*3])*.6,R=D[1]-C[S*3+1],M=D[2]-C[S*3+2];return z*z+R*R+M*M},W=Math.max(.3,(o.cut||1)*.5/L),F=new Float32Array(k);for(let S=0;S<k;S++)F[S]=Math.max(0,Math.min(1,1-C[S*3]+.3*Math.hypot(C[S*3+1],C[S*3+2])));const p=Mt(F,i,c,W),d=o.accKey?ge(ue(o.accKey)):null;let B=null;if(d){const S=new Float32Array(k);for(let D=0;D<k;D++)S[D]=q(D,d)<.045&&Math.hypot(C[D*3+1],C[D*3+2])>.06?1:0;B=Mt(S,i,c,W)}const j=s.map(S=>S.kind===1&&S.key?ge(ue(S.key)):null),G=s.map((S,D)=>{const z=new Uint8Array(k);if(S.kind===3){if(B)for(let R=0;R<k;R++)z[R]=B[R]>.5?1:0;return z}if(S.kind===1){const R=new Float32Array(k),M=j[D],y=Math.hypot(M[1],M[2]);for(let v=0;v<k;v++){const $=q(v,M);if($>.06||y>.06&&Math.hypot(C[v*3+1],C[v*3+2])<.5*y)continue;let H=!0;for(let X=0;X<j.length;X++)if(X!==D&&j[X]&&q(v,j[X])<$){H=!1;break}R[v]=H?1:0}const O=Mt(R,i,c,W);for(let v=0;v<k;v++)z[v]=O[v]>.5?1:0;return z}for(let R=0;R<k;R++)z[R]=p[R]>S.thr&&!(B&&B[R]>.5)?1:0;return z}),ee=3072/Math.max(i,c),_=Math.round(i*ee),U=Math.round(c*ee),N=_/a,oe=()=>{const S=document.createElement("canvas");S.width=_,S.height=U;const D=S.getContext("2d");return D.fillStyle="#000",D.fillRect(0,0,_,U),D.globalCompositeOperation="lighter",[S,D]},Y=["#ff0000","#00ff00","#0000ff"];let ae=null;if(o.bridges){const[S,D]=oe();ae=S;const z=(o.bridgeMm||.9)*N;D.lineCap="butt";const R=new Int32Array(k),M=new Int32Array(k),y=new Int32Array(k).fill(-1),O=new Int32Array(k),v=new Int32Array(k);s.forEach(($,H)=>{if($.ch==null||$.ch<0)return;const X=G[H];R.fill(-1);let re=0;const pe=[];for(let de=0;de<k;de++){if(X[de]||R[de]>=0)continue;let ce=0;M[ce++]=de,R[de]=re;const Pe=[];let qe=!1;for(;ce;){const te=M[--ce];Pe.push(te);const Ie=te%i,u=te/i|0;(Ie===0||u===0||Ie===i-1||u===c-1)&&(qe=!0),Ie>0&&!X[te-1]&&R[te-1]<0&&(R[te-1]=re,M[ce++]=te-1),Ie<i-1&&!X[te+1]&&R[te+1]<0&&(R[te+1]=re,M[ce++]=te+1),u>0&&!X[te-i]&&R[te-i]<0&&(R[te-i]=re,M[ce++]=te-i),u<c-1&&!X[te+i]&&R[te+i]<0&&(R[te+i]=re,M[ce++]=te+i)}!qe&&Pe.length*L*L>=.6&&pe.push([re,Pe]),re++}D.strokeStyle=Y[$.ch],D.lineWidth=z;const Se=Math.round(12/L);let Te=0;for(const[de,ce]of pe.slice(0,600)){const Pe=ce.length*L*L,qe=Pe<40?1:Pe<400?2:3,te=[],Ie=ce.filter(Z=>{const me=Z%i;return me>0&&X[Z-1]||me<i-1&&X[Z+1]||X[Z-i]||X[Z+i]}),u=Math.sqrt(ce.length)*.75;for(let Z=0;Z<qe;Z++){Te++;const me=[];let Ce=0;for(const ve of Ie)te.some(vt=>Math.hypot(vt%i-ve%i,(vt/i|0)-(ve/i|0))<u)||(y[ve]=Te,O[ve]=-1,v[ve]=0,me.push(ve));let le=-1;for(;Ce<me.length;){const ve=me[Ce++],vt=ve%i,Ao=ve/i|0;if(v[ve]>Se)break;for(const ze of[vt>0?ve-1:-1,vt<i-1?ve+1:-1,Ao>0?ve-i:-1,Ao<c-1?ve+i:-1])if(!(ze<0||y[ze]===Te)){if(!X[ze]){if(R[ze]!==de){O[ze]=ve,le=ze;break}continue}y[ze]=Te,O[ze]=ve,v[ze]=v[ve]+1,me.push(ze)}if(le>=0)break}if(le<0)break;let se=le;for(;O[se]>=0&&X[O[se]];)se=O[se];const it=O[se]>=0?O[se]:se;te.push(it);const It=(it%i+.5)/i*_,$t=((it/i|0)+.5)/c*U,jt=(le%i+.5)/i*_,zt=((le/i|0)+.5)/c*U,Po=Math.hypot(jt-It,zt-$t)||1,wo=(jt-It)/Po*.5*N,Eo=(zt-$t)/Po*.5*N;D.beginPath(),D.moveTo(It-wo,$t-Eo),D.lineTo(jt+wo,zt+Eo),D.stroke()}}})}const[be,I]=oe(),w=a*a*c/i,E=o.dripLen||8,P=o.dripW||.9,Q=o.drips||0,K=o.splat||0,g=s.map((S,D)=>[S,D]).filter(([S])=>S.ch!=null&&S.ch>=0);if(g.forEach(([S,D],z)=>{if(Q<=0)return;const R=G[D],M=[];for(let H=0;H<k-i;H++)R[H]&&!R[H+i]&&M.push(H);const y=.35+.65*(z+1)/g.length,O=Math.min(260,Math.round(Q*M.length*L*.06*y));if(!M.length)return;I.fillStyle=Y[S.ch];let v=0,$=0;for(;v<O&&$<O*8;){$++;const H=M[n()*M.length|0],X=H%i,re=H/i|0;if(n()>.15+sn(X*L/14,re*L/14,t+D*31))continue;v++;let pe=E*Math.exp(.75*f());n()<.25&&(pe*=.25),pe=Math.max(.8,Math.min(150,pe));const Se=P*(.55+.9*n())*(.7+.3*Math.min(1,pe/10)),Te=(X+n())*L,de=(re+1)*L-(.3+n()*1.2),ce=(n()-.5)*.8,Pe=.06+n()*.12,qe=2+n()*4,te=n()*6.28;I.beginPath();const Ie=Math.max(.04,Se*.18);let u=Te,Z=de,me=Se/2;for(let le=0;le<=1.0001;le+=Ie/pe){Z=de+le*pe,u=Te+ce*le+Pe*Math.sin(le*pe/qe+te),me=Se/2*(1-.45*le)*(le<.08?1+(.08-le)/.08*.6:1);const se=Math.max(.6,me*N);I.moveTo(u*N+se,Z*N),I.arc(u*N,Z*N,se,0,6.2832)}const Ce=me*(1.45+.6*n());I.moveTo(u*N+Ce*N,(Z+Ce*.4)*N),I.arc(u*N,(Z+Ce*.4)*N,Math.max(.7,Ce*N),0,6.2832),I.fill()}}),K>0&&g.length){const S=g[g.length-1],D=G[S[1]],z=[];for(let y=0;y<k;y+=3)D[y]&&z.push(y);const R=Math.min(900,Math.round(K*220*w/62370)),M=o.splatSize||.8;for(let y=0;y<R;y++){const O=n()<.75?S:g[n()*g.length|0];I.fillStyle=Y[O[0].ch];let v,$;if(z.length&&n()<.65){const X=z[n()*z.length|0];v=(X%i+.5)*L+f()*22,$=((X/i|0)+.5)*L+f()*22}else v=n()*a,$=n()*a*c/i;const H=Math.max(.06,Math.min(4.5,M*.5*Math.exp(.8*f())));if(I.beginPath(),n()<.12){const X=n()*6.28;I.ellipse(v*N,$*N,H*N*2.4,H*N*.8,X,0,6.2832)}else I.arc(v*N,$*N,Math.max(.6,H*N),0,6.2832);if(n()<.45){const X=2+(n()*6|0),re=n()*6.28;for(let pe=0;pe<X;pe++){const Se=H*(1.3+n()*2.6),Te=re+(n()-.5)*1.3,de=Math.max(.04,H*(.1+n()*.3)),ce=(v+Math.cos(Te)*Se)*N,Pe=($+Math.sin(Te)*Se)*N;I.moveTo(ce+de*N,Pe),I.arc(ce,Pe,Math.max(.5,de*N),0,6.2832)}}I.fill()}}let A=null;if(o.cloud){const D=Math.ceil(i/4),z=Math.ceil(c/4),R=new Float32Array(D*z);for(let $=0;$<k;$++){let H=0;for(const X of G)if(X[$]){H=1;break}if(H){const X=(($/i|0)/4|0)*D+($%i/4|0);R[X]=1}}const M=Mt(R,D,z,(o.cloudMm||18)/(L*4));let y=0;for(const $ of M)y=Math.max(y,$);A=document.createElement("canvas"),A.width=D,A.height=z;const O=A.getContext("2d"),v=O.createImageData(D,z);for(let $=0;$<D*z;$++){const H=Math.min(1,M[$]/(y*.55+1e-6));v.data[$*4]=Math.round(255*Math.pow(H,.8)),v.data[$*4+3]=255}O.putImageData(v,0,0)}return{drip:be,bridge:ae,cloud:A}}function un(e){const{gl:o}=e;let a=null,t=null,n=0,s=0,f=null;const l=o.createTexture(),r=o.createTexture(),m=o.createTexture();let i,c=null;const k=()=>{if(!c){c=document.createElement("canvas"),c.width=c.height=1;const h=c.getContext("2d");h.fillStyle="#000",h.fillRect(0,0,1,1)}return c};function L(h,T){if(a||(a={scut:e.compile(en),spray:e.compile(tn)}),f||(f=e.texFrom(rn(),{wrap:o.REPEAT,mip:!0})),t&&h===n&&T===s)return;t&&Object.values(t).forEach(e.freeTarget),n=h,s=T;const x=Math.max(1,h>>2),C=Math.max(1,T>>2);t={b1:e.target(h,T),b2:e.target(h,T),sm:e.target(h,T,2),sq:e.target(x,C,2),sw:e.target(x,C,2)}}function b(h,T,x,C,q,W,F,p){L(W,F);const d=Object.assign({},on,h),B=t,j=a,G=W/d.printW,ee=(d.layers||[]).slice(0,5),_=ee.length,U=Ze(d.seed*6151+3),N=Be(d.srcPaper||[1,1,1]).map(v=>Math.max(v,.02)),oe=v=>Be(ue(v)).map(($,H)=>Math.min(1,$/N[H])),Y=[],ae=[],be=[],I=[],w=[],E=[],P=[];let Q=0;for(let v=0;v<5;v++){const $=ee[v]||{kind:0,thr:2,hex:"#000000"};Y.push($.kind|0),ae.push($.thr==null?.5:$.thr),be.push($.ch==null?-1:$.ch),w.push($.op==null?.97:$.op),I.push(...Be(ue($.hex))),E.push(...$.key?oe($.key):[1,1,1]),v<_&&$.kind===1&&(Q=v+1);const H=U()*Math.PI*2,X=d.misreg*Math.sqrt(U());P.push(Math.cos(H)*X,Math.sin(H)*X)}const K=d.maps||{drip:null,bridge:null,cloud:null};K!==i&&(e.texFrom(K.drip||k(),{},l),e.texFrom(K.bridge||k(),{},r),e.texFrom(K.cloud||k(),{},m),i=K);const g=K.drip?Math.max(.03,Math.min(.5,.5*K.drip.width/W)):.5,A=d.accKey?oe(d.accKey):[1,1,1],S=ee.some(v=>v.kind===3)?1:0,D=Be(ue(d.support)),z=Be(ue(d.cloudHex||"#f4f4f0")),R=(v,$,H,X)=>e.run(v,$,H,re=>{re.f("uOff",0,0),re.f("uImg",W,F),X(re)});R("PREP",e.PR.prep,T.prep,v=>{v.t("uSrc",x),v.f("uSrcRes",C,q),v.f("uSmoothPx",d.smooth*C/d.printW),v.f("uSrcPaper",...d.srcPaper||[1,1,1]),v.f("uPaper",1,1,1)});const M=(v,$,H,X,re,pe)=>R(`BLUR ${v}`,e.PR.blur,H,Se=>{Se.t("uTexA",$.t[0]),Se.t("uTexB",$.t[$.t.length>1?1:0]),Se.f("uDir",X,re),Se.f("uSig",pe)}),y=Math.max(.05,d.cut*.5*G);M("cut H",T.prep,B.b1,1,0,y),M("cut V",B.b1,B.b2,0,1,y),R("SCUT",j.scut,B.sm,v=>{v.f("uPxMm",G),v.f("uSeed",d.seed),v.t("uSimp",B.b2.t[0]),v.t("uBr",r),v.i("uNL",_),v.i("uNK",Q),v.i("uAccOn",S),v.iv("uKind",Y),v.iv("uCh",be),v.fv("uThr",ae,1),v.fv("uKey",E,3),v.f("uAccK",A[0],A[1],A[2]),v.fv("uOffs",P,2),v.f("uFacet",d.facet),v.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,y))))});const O=Math.max(.3,d.liftMm*G/4);M("lift ¼ H",B.sm,T.qtmp,1,0,O),M("lift ¼ V",T.qtmp,B.sq,0,1,O),M("wide ¼ H",B.sq,T.qtmp,1,0,O*2),M("wide ¼ V",T.qtmp,B.sw,0,1,O*2),R("SPRAY",j.spray,T.comp,v=>{v.f("uPxMm",G),v.f("uSeed",d.seed),v.t("uMA",B.sm.t[0]),v.t("uMB",B.sm.t[1]),v.t("uQA",B.sq.t[0]),v.t("uQB",B.sq.t[1]),v.t("uWA",B.sw.t[0]),v.t("uWB",B.sw.t[1]),v.t("uDr",l),v.t("uCl",m),v.t("uSpT",f),v.i("uNL",_),v.i("uSup",d.supType|0),v.iv("uCh",be),v.fv("uLc",I,3),v.fv("uOp",w,1),v.f("uSupLin",...D),v.f("uCloudLin",...z),v.f("uSupTex",d.supTex),v.f("uLift",d.lift),v.f("uOver",d.over),v.f("uLoad",d.load),v.f("uMist",d.mist),v.f("uDrop",d.drop),v.f("uCloud",K.cloud?d.cloud:0),v.f("uSpN",to),v.f("uTp",to/(143.36*d.drop*G)),v.f("uDrTp",g),v.f("uLiftScale",d.liftScale)}),R("SCAN",e.PR.scan,p?T.out:null,v=>{v.f("uSeed",d.seed),v.t("uComp",T.comp.t[0]),v.f("uBlurPx",d.scanBlur),v.f("uNoise",d.scanNoise),v.i("uNorm",0),v.f("uPaper",...D)})}return{render:b}}function Ne(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const fn=Ne(Ne(Yo," b+=texture(uTexB,uv+o2)*k;",""),"oA=a/w; oB=b/w;","oA=a/w; oB=vec4(0);"),aa=Ne(Ne(Ne(Ho,"float ba=eP, bs=length(oklabL(uPaper)-tSL);","float ba=eP, bs=length(oklabL(uPaper)-tSL); vec3 Da=vec3(0);"),"if(pass==0){ if(e<ba){ ba=e; Sa=S; } }","if(pass==0){ if(e<ba){ ba=e; Sa=S; Da=D; } }"),`  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD); }
`,`  ivec3 bS=Sa; vec3 bD=Da;
  if(Ss.x>=0){ vec3 Ds=Da; float es=ba; if(Ss!=Sa) es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; bD=Ds; } }
  else if(ba>eP-.025) bS=ivec3(-1);
`),Do=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,na=Ne(Zo,Do,Do+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Bo=1,Co=2,Fo=4,_o=8,pn=Ne(aa,"for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;","for(int it=0;it<3;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;"),mn=Ne(na,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),dn=Ne(ea,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),vn=Ne(Ne(Ne(Jo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),hn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,No=new Map,Io=(e,o)=>{let a=No.get(e);return a||(a=o(),No.set(e,a)),a};function xn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=Ze(e);t.lineCap="round";for(let s=0;s<2600;s++){const f=(.25+n()*n()*1.6)*85,l=n()*Math.PI*2,r=n()*1024,m=n()*1024,i=(n()-.5)*.9,c=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=c;for(const k of[-1024,0,1024])for(const L of[-1024,0,1024]){const b=r+k,h=m+L;b<-f-10||b>1024+f+10||h<-f-10||h>1024+f+10||(t.beginPath(),t.moveTo(b,h),t.quadraticCurveTo(b+Math.cos(l+i)*f*.5,h+Math.sin(l+i)*f*.5,b+Math.cos(l)*f,h+Math.sin(l)*f),t.stroke())}}return a}function gn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=Ze(e);t.lineCap="round",t.globalCompositeOperation="lighter";const s=1024/61;for(let f=0;f<70;f++){const l=n()<.7?"255,0,0":"0,255,0",r=(.4+n()*n()*3.5)*s,m=n()*Math.PI*2,i=n()*1024,c=n()*1024,k=(n()-.5)*1.6,L=(.015+n()*.03)*s;t.strokeStyle=`rgba(${l},${.35+n()*.5})`,t.lineWidth=Math.max(.6,L);for(const b of[-1024,0,1024])for(const h of[-1024,0,1024]){const T=i+b,x=c+h;T<-r||T>1024+r||x<-r||x>1024+r||(t.beginPath(),t.moveTo(T,x),t.bezierCurveTo(T+Math.cos(m+k)*r*.35,x+Math.sin(m+k)*r*.35,T+Math.cos(m-k)*r*.7,x+Math.sin(m-k)*r*.7,T+Math.cos(m)*r,x+Math.sin(m)*r),t.stroke())}}for(let f=0;f<160;f++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const l=(.02+n()*n()*.12)*s;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,l),0,7),t.fill()}return a}function ra(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);function s(w){const E=t.createProgram();for(const[K,g]of[[t.VERTEX_SHADER,_a],[t.FRAGMENT_SHADER,w]]){const A=t.createShader(K);if(t.shaderSource(A,g),t.compileShader(A),!t.getShaderParameter(A,t.COMPILE_STATUS)){const S=t.getShaderInfoLog(A);throw new Error(S??"shader compile error")}t.attachShader(E,A)}if(t.bindAttribLocation(E,0,"p"),t.linkProgram(E),!t.getProgramParameter(E,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(E)??"program link error");const P={},Q=t.getProgramParameter(E,t.ACTIVE_UNIFORMS);for(let K=0;K<Q;K++){const g=t.getActiveUniform(E,K);P[g.name.replace(/\[0\]$/,"")]=t.getUniformLocation(E,g.name)}return{p:E,u:P}}const f=new Map,l=w=>{let E=f.get(w);return E||(E=s(w),f.set(w,E)),E},r={sep0:s(Ho),lut:s(Na),prep:s(Ia),sep:s($a),blur:s(Yo),screen:s(Jo),spread:s(Zo),compose:s(ja),scan:s(ea)},m=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,m),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function i(w,E,{filter:P=t.LINEAR,wrap:Q=t.CLAMP_TO_EDGE}={}){const K=t.createTexture();return t.bindTexture(t.TEXTURE_2D,K),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,w,E,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,Q),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,Q),K}function c(w,{filter:E=t.LINEAR,wrap:P=t.CLAMP_TO_EDGE,mip:Q=!1}={},K=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,K),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,w),Q&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,Q?t.LINEAR_MIPMAP_LINEAR:E),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,E),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,P),K}function k(w,E,P=1){const Q=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,Q);const K=[];for(let g=0;g<P;g++){const A=i(w,E);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+g,t.TEXTURE_2D,A,0),K.push(A)}return t.drawBuffers(K.map((g,A)=>t.COLOR_ATTACHMENT0+A)),{f:Q,t:K,w,h:E}}function L(w){w.t.forEach(E=>t.deleteTexture(E)),t.deleteFramebuffer(w.f)}const b=qa(t);function h(w,E,P,Q){const K=P?P.w:e.width,g=P?P.h:e.height;t.useProgram(E.p),t.bindFramebuffer(t.FRAMEBUFFER,P?P.f:null),t.viewport(0,0,K,g);let A=0;const S=E.u,D={t(R,M){S[R]!=null&&(t.activeTexture(t.TEXTURE0+A),t.bindTexture(t.TEXTURE_2D,M),t.uniform1i(S[R],A),A++)},f(R,...M){const y=S[R];y!=null&&(M.length===1?t.uniform1f(y,M[0]):M.length===2?t.uniform2f(y,M[0],M[1]):M.length===3?t.uniform3f(y,M[0],M[1],M[2]):t.uniform4f(y,M[0],M[1],M[2],M[3]))},i(R,M){S[R]!=null&&t.uniform1i(S[R],M)},fv(R,M,y){const O=S[R];if(O==null)return;const v=new Float32Array(M);y===1?t.uniform1fv(O,v):y===2?t.uniform2fv(O,v):t.uniform3fv(O,v)},m2(R,M){S[R]!=null&&t.uniformMatrix2fv(S[R],!1,new Float32Array(M))},iv(R,M){S[R]!=null&&t.uniform1iv(S[R],new Int32Array(M))}};D.f("uRes",K,g),Q&&Q(D);const z=b.mode==="off"?null:b.before(w,{w:K,h:g,att:P?P.t.length:1});t.drawArrays(t.TRIANGLES,0,3),b.mode!=="off"&&b.after(w,z)}const T=c(o.green,{wrap:t.REPEAT}),x={b:c(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:c(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:c(o.exLut)},C=c(Io("fib11",()=>xn(11)),{wrap:t.REPEAT,mip:!0}),q=c(Io("inc23",()=>gn(23)),{wrap:t.REPEAT,mip:!0}),W=w=>{w.t("uExB",x.b),w.t("uExR",x.r),w.t("uExLut",x.lut),w.f("uExBSize",x.bs[0],x.bs[1]),w.f("uExRSize",x.rs[0],x.rs[1]),w.f("uExPxMm",Fa)};let F=null,p=null;const d=k(1089,33,2);let B="";const j=t.createTexture();let G=0,ee=0,_=null,U=0,N=0;function oe(w,E){if(w===U&&E===N)return;U=w,N=E,_&&Object.values(_).forEach(L);const P=Math.max(1,w>>2),Q=Math.max(1,E>>2);_={prep:k(w,E),sep:k(w,E,2),tmp:k(w,E,2),loc:k(w,E,2),qtmp:k(P,Q,2),sol:k(P,Q,2),scr:k(w,E,2),cov:k(w,E,2),comp:k(w,E),prepH:k(w,E),prepV:k(w,E),out:k(w,E)},e.width=w,e.height=E}const Y=t.getExtension("EXT_disjoint_timer_query_webgl2");let ae=null;function be(){if(!Y||!ae||!t.getQueryParameter(ae,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(Y.GPU_DISJOINT_EXT)||(I.gpuMs=t.getQueryParameter(ae,t.QUERY_RESULT)/1e6),t.deleteQuery(ae),ae=null}const I={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:b,lastVariants:"",setSource(w,E=!0){G=w.width,ee=w.height;const P=performance.now();c(w,{},j);const Q=performance.now();E&&(t.bindTexture(t.TEXTURE_2D,j),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),I.lastUploadMs=Q-P,I.lastMipMs=performance.now()-Q},invalidateLut(){B=""},present(){if(!_)return;const w=_;h("PRESENT",l(hn),null,E=>{E.t("uT",w.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(w,E={}){const P=Object.assign({},za,w),Q=E.preview??0,K=!!E.lossless||Q!==0,g=(u,Z)=>Q&u?"preview":K&&Z?"lossless":"lab";I.lastVariants=`blurPrep:${K?"lossless":"lab"} sep0:${g(Bo,!0)} screen:${g(_o,!1)} spread:${g(Co,!0)} scan:${g(Fo,!1)}`;const A=performance.now();be(),b.mode!=="off"&&b.frameStart();const S=Y&&!ae&&b.mode!=="timer"?t.createQuery():null;S&&t.beginQuery(Y.TIME_ELAPSED_EXT,S);let D=Math.round(P.printW*P.pxmm),z=Math.round(D*ee/G);const R=Math.min(n,6144);if(Math.max(D,z)>R){const u=R/Math.max(D,z);D=Math.round(D*u),z=Math.round(z*u)}const M=w.tech==="xerox"||w.tech==="stencil";M&&(D=Math.max(4,D&-4),z=Math.max(4,z&-4)),oe(D,z),I.width=D,I.height=z;const y=_;if(M){const u={gl:t,compile:s,run:h,target:k,freeTarget:L,texFrom:c,greenTex:T,fibTex:C,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},Z={prep:y.prep,qtmp:y.qtmp,comp:y.comp,out:y.out};return w.tech==="stencil"?(p??=un(u)).render(w,Z,j,G,ee,D,z,!!E.toTexture):(F??=Za(u)).render(w,Z,j,G,ee,D,z,!!E.toTexture),I.lastVariants=w.tech??"xerox",S&&(t.endQuery(Y.TIME_ELAPSED_EXT),ae=S),t.flush(),I.lastMs=performance.now()-A,I}const O=D/P.printW,v=Be(ue(P.paper)),$=Math.min(at,P.inks.length),H=P.inks.concat(Array(at).fill("#000000")).slice(0,at),X=P.opac.concat(Array(at).fill(.15)).slice(0,at),re=[];for(let u=0;u<at;u++)re.push(...Be(ue(Ut(H[u]))));const pe=H.map(u=>ge(ue(Ut(u)))[0]<.42?0:1),Se=ge(ue(P.paper)),Te=H.map(u=>Math.min(1.5,Pa(ge(ue(Ut(u))),Se)/.5)),de=JSON.stringify([H,X,$,P.paper,P.inkCost,P.pair]);de!==B&&(h("LUT",r.lut,d,u=>{u.fv("uCon",Te,1),u.fv("uInk",re,3),u.fv("uOp",X,1),u.i("uN",$),u.f("uPaper",...v),u.f("uCost",P.inkCost),u.f("uPair",P.pair)}),B=de),h("PREP",r.prep,y.prep,u=>{u.t("uSrc",j),u.f("uSrcRes",G,ee),u.f("uSmoothPx",P.smooth*G/P.printW),u.f("uSrcPaper",...P.srcPaper),u.f("uPaper",...v)});const ce=Ze(P.seed*7919+13),Pe=[],qe=[];for(let u=0;u<at;u++){const Z=(ce()*2-1)*P.rot*Math.PI/180,me=1+(ce()*2-1)*P.scl/1e3,Ce=Math.cos(Z)*me,le=Math.sin(Z)*me;Pe.push(Ce,le,-le,Ce);const se=ce()*Math.PI*2,it=P.misreg*Math.sqrt(ce());qe.push(Math.cos(se)*it,Math.sin(se)*it)}let te;if(K){const u=l(fn);h("BLUR prep H",u,y.prepH,Z=>{Z.t("uTexA",y.prep.t[0]),Z.f("uDir",1,0),Z.f("uSig",.3*O)}),h("BLUR prep V",u,y.prepV,Z=>{Z.t("uTexA",y.prepH.t[0]),Z.f("uDir",0,1),Z.f("uSig",.3*O)}),te=y.prepV.t[0]}else h("BLUR prep H",r.blur,y.loc,u=>{u.t("uTexA",y.prep.t[0]),u.t("uTexB",y.prep.t[0]),u.f("uDir",1,0),u.f("uSig",.3*O)}),h("BLUR prep V",r.blur,y.scr,u=>{u.t("uTexA",y.loc.t[0]),u.t("uTexB",y.loc.t[0]),u.f("uDir",0,1),u.f("uSig",.3*O)}),te=y.scr.t[0];h("SEP0",Q&Bo?l(pn):K?l(aa):r.sep0,y.tmp,u=>{u.t("uPrepS",te),u.t("uPrep",y.prep.t[0]),u.t("uSet",d.t[0]),u.fv("uCon",Te,1),u.fv("uInk",re,3),u.fv("uOp",X,1),u.i("uN",$),u.f("uPaper",...v),u.f("uCost",P.inkCost),u.f("uPair",P.pair),u.f("uMinDot",P.minDot)}),h("WARP",r.sep,y.sep,u=>{u.f("uPxMm",O),u.t("uSA",y.tmp.t[0]),u.t("uSB",y.tmp.t[1]),u.i("uN",$),u.f("uCtr",P.printW/2,z/O/2),u.m2("uM",Pe),u.fv("uT",qe,2)});const Ie=(u,Z,me,Ce,le)=>{h(`BLUR ${u} H`,r.blur,me,se=>{se.t("uTexA",Z.t[0]),se.t("uTexB",Z.t[1]),se.f("uDir",1,0),se.f("uSig",le)}),h(`BLUR ${u} V`,r.blur,Ce,se=>{se.t("uTexA",me.t[0]),se.t("uTexB",me.t[1]),se.f("uDir",0,1),se.f("uSig",le)})};return Ie("loc",y.sep,y.tmp,y.loc,.22*O),Ie("sol ¼",y.sep,y.qtmp,y.sol,1.5*O/4),h("SCREEN",Q&_o?l(vn):r.screen,y.scr,u=>{W(u),u.f("uPxMm",O),u.f("uSeed",P.seed),u.t("uSepA",y.sep.t[0]),u.t("uSepB",y.sep.t[1]),u.t("uSolA",y.sol.t[0]),u.t("uSolB",y.sol.t[1]),u.t("uLocA",y.loc.t[0]),u.t("uLocB",y.loc.t[1]),u.t("uGreen",T),u.i("uN",$),u.i("uMode",+P.screen),u.f("uGrain",P.grain),u.f("uLoad",P.inkLoad),u.f("uLpi",P.lpi),u.f("uMottle",P.mottle),u.f("uStarve",P.starve),u.f("uTexAmp",P.texAmp),u.f("uStreak",P.streak),u.f("uSolidLv",P.solidLv),u.fv("uExSel",pe,1),u.f("uTrap",P.trap)}),h("SPREAD",Q&Co?l(mn):K?l(na):r.spread,y.cov,u=>{W(u),u.f("uPxMm",O),u.f("uSeed",P.seed),u.t("uScrA",y.scr.t[0]),u.t("uScrB",y.scr.t[1]),u.t("uSepA",y.sep.t[0]),u.t("uSepB",y.sep.t[1]),u.t("uLocA",y.loc.t[0]),u.t("uLocB",y.loc.t[1]),u.i("uN",$),u.f("uBleedPx",P.bleed*O),u.f("uGain",P.gain),u.f("uEdge",P.edge),u.f("uSolidLv",P.solidLv),u.fv("uExSel",pe,1)}),h("COMPOSE",r.compose,y.comp,u=>{W(u),u.f("uPxMm",O),u.f("uSeed",P.seed),u.t("uCovA",y.cov.t[0]),u.t("uCovB",y.cov.t[1]),u.t("uSolA",y.sol.t[0]),u.t("uSolB",y.sol.t[1]),u.f("uStarve",P.starve),u.t("uFib",C),u.t("uInc",q),u.i("uN",$),u.fv("uInk",re,3),u.fv("uOp",X,1),u.f("uPaper",...v),u.f("uPaperTex",P.paperTex),u.f("uFibers",P.fibers),u.f("uIncl",P.incl),u.f("uVoids",P.voids),u.f("uMottle",P.mottle),u.f("uTexAmp",P.texAmp),u.fv("uExSel",pe,1)}),h("SCAN",Q&Fo?l(dn):r.scan,E.toTexture?y.out:null,u=>{u.f("uSeed",P.seed),u.t("uComp",y.comp.t[0]),u.f("uBlurPx",P.scanBlur),u.f("uNoise",P.scanNoise),u.i("uNorm",+P.normWhite),u.f("uPaper",...v)}),S&&(t.endQuery(Y.TIME_ELAPSED_EXT),ae=S),t.flush(),I.lastMs=performance.now()-A,I}};return I}const sa=new URLSearchParams(window.location.search),dt=sa.get("srdebug")==="1",he=dt?sa:new URLSearchParams,bn=["srres","srpipe","srhold","srpreview","srprevmask"],V={preserveDrawingBuffer:he.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(he.get("srres"))||1)),mip:he.get("srmip")!=="0",bypass:he.get("srbypass")==="1",darkPaperFromBase:he.get("srdarkpaper")==="bg",simUpload:he.get("srsim")==="1",offscreenBack:he.get("sroff")==="1",bitmapUpload:he.get("srbitmap")==="1",pipe:he.get("srpipe")==="2"?2:he.get("srpipe")==="1"?1:0,hold:he.get("srhold")==="1",lossless:he.get("srlossless")!=="0",preview:he.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(he.get("srprevmask"))||0)),auto:!bn.some(e=>he.has(e)),forceLevel:he.get("srlevel")==="preview"?"preview":he.get("srlevel")==="full"?"full":null},ia={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},J={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},ot={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},qt=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==V.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==V.offscreenBack;Object.assign(V,e),(o||a)&&ot.recreateEngine()},$o=5,jo=30,kn=12,Sn=300,oo=new Map;let $e=null,Et="";const ca=(e,o)=>`${e}×${o}`;function yn(e,o){if(V.forceLevel)return eo(V.forceLevel==="preview"),V.forceLevel;const a=oo.get(ca(e,o));return a?(eo(a==="preview"),a):"detect"}function zo(e,o,a,t){const n=ca(e,o);if((!$e||$e.size!==n)&&($e={size:n,seen:0,samples:[]}),++$e.seen>$o+3*jo&&!$e.samples.length){oo.set(n,"full"),$e=null,Et=`${n}: sin medida (${t}) → full`;return}if($e.seen<=$o||a===null||($e.samples.push(a),$e.samples.length<jo))return;const s=[...$e.samples].sort((r,m)=>r-m),f=s[s.length>>1],l=f>kn?"preview":"full";oo.set(n,l),$e=null,Et=`${n}: coste p50 ${f.toFixed(1)} ms (${t}) → ${l}`,eo(l==="preview"),dt&&console.info(`[SuperRiso] quality level ${Et}`)}const Mn=()=>Et;let ht=null,Gt=null,Uo=0,la="";function Pn(e,o,a){return!!e&&!!ht&&o===Gt&&e.length===ht.length&&e.every((n,s)=>n===ht[s])||(Uo=a,la=o!==Gt?"scene":(e??[]).map((n,s)=>n===ht?.[s]?"":s).filter(n=>n!=="").join(",")),ht=e??null,Gt=o,a-Uo}const ua=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Wt(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:s,seed:f}){const[l,r]=ua(e.width,e.height,t),m=document.createElement("canvas");m.width=l,m.height=r;const i=m.getContext("2d",{willReadFrequently:!0});i.fillStyle="#fff",i.fillRect(0,0,l,r),i.drawImage(e,0,0,l,r);const c=i.getImageData(0,0,l,r).data,k=ge(a),L=new Int8Array(l*r).fill(-1),b=l*r;if(t){const F=new Uint8Array(b);for(let _=0;_<b;_++){const U=ge([c[_*4]/255,c[_*4+1]/255,c[_*4+2]/255]);F[_]=k[0]-U[0]>.14?1:0}const p=new Uint8Array(F);for(let _=0;_<r;_++)for(let U=0;U<l;U++){if(!F[_*l+U])continue;const N=_*l+U;U>0&&(p[N-1]=1),U<l-1&&(p[N+1]=1),_>0&&(p[N-l]=1),_<r-1&&(p[N+l]=1)}const d=new Int32Array(b).fill(-1),B=new Int32Array(b),j=Ze((f|0)*977+13);let G=0;const ee=Math.max(6,b*12e-5);for(let _=0;_<b;_++){if(p[_]||d[_]>=0)continue;let U=0;B[U++]=_,d[_]=G;const N=[];let oe=!1;for(;U;){const I=B[--U];N.push(I);const w=I%l,E=I/l|0;(w===0||E===0||w===l-1||E===r-1)&&(oe=!0),w>0&&!p[I-1]&&d[I-1]<0&&(d[I-1]=G,B[U++]=I-1),w<l-1&&!p[I+1]&&d[I+1]<0&&(d[I+1]=G,B[U++]=I+1),E>0&&!p[I-l]&&d[I-l]<0&&(d[I-l]=G,B[U++]=I-l),E<r-1&&!p[I+l]&&d[I+l]<0&&(d[I+l]=G,B[U++]=I+l)}G++;const Y=j(),ae=j();if(N.length<ee||oe&&N.length>b*.05||Y>s)continue;const be=Math.min(n-1,Math.floor(ae*n));for(const I of N)L[I]=be}for(let _=0;_<3;_++){const U=new Int8Array(L);for(let N=0;N<r;N++)for(let oe=0;oe<l;oe++){const Y=N*l+oe;if(U[Y]>=0||!p[Y])continue;const ae=oe>0&&U[Y-1]>=0?U[Y-1]:oe<l-1&&U[Y+1]>=0?U[Y+1]:N>0&&U[Y-l]>=0?U[Y-l]:N<r-1&&U[Y+l]>=0?U[Y+l]:-1;ae>=0&&(L[Y]=ae)}}}else{const F=o.map(p=>ge(ue(p)));for(let p=0;p<b;p++){const d=ge([c[p*4]/255,c[p*4+1]/255,c[p*4+2]/255]),B=Math.hypot(d[0]-k[0],d[1]-k[1],d[2]-k[2]),j=Math.hypot(d[1],d[2]);if(!(B>.08&&(d[0]>.32||j>.12)))continue;let G=-1,ee=1e9;for(let _=0;_<F.length;_++){const U=(F[_][0]-d[0])*.6,N=F[_][1]-d[1],oe=F[_][2]-d[2],Y=U*U+N*N+oe*oe;Y<ee&&(ee=Y,G=_)}ee<.045&&(L[p]=G)}}let h=null;if(t){h=document.createElement("canvas"),h.width=l,h.height=r;const F=h.getContext("2d"),p=F.createImageData(l,r);for(let d=0;d<b;d++)p.data[d*4]=(L[d]+1)*36,p.data[d*4+3]=255;F.putImageData(p,0,0)}const T=new Int32Array(b).fill(-1),x=i.createImageData(l,r),C=new Int32Array(b);for(let F=0;F<b;F++)x.data[F*4]=255,x.data[F*4+1]=128,x.data[F*4+2]=0,x.data[F*4+3]=255;let q=0;for(let F=0;F<b;F++){if(L[F]<0||T[F]>=0)continue;const p=L[F];let d=0;C[d++]=F,T[F]=q;const B=[];let j=0,G=0,ee=0,_=0,U=0,N=0;for(;d;){const M=C[--d];B.push(M);const y=M%l,O=M/l|0;j++,G+=y,ee+=O,_+=y*y,U+=O*O,N+=y*O,y>0&&L[M-1]===p&&T[M-1]<0&&(T[M-1]=q,C[d++]=M-1),y<l-1&&L[M+1]===p&&T[M+1]<0&&(T[M+1]=q,C[d++]=M+1),O>0&&L[M-l]===p&&T[M-l]<0&&(T[M-l]=q,C[d++]=M-l),O<r-1&&L[M+l]===p&&T[M+l]<0&&(T[M+l]=q,C[d++]=M+l)}if(q++,j<6)continue;const oe=G/j,Y=ee/j,ae=_/j-oe*oe,be=U/j-Y*Y,I=N/j-oe*Y,w=.5*Math.atan2(2*I,ae-be),E=ae+be,P=ae*be-I*I,Q=Math.sqrt(Math.max(0,E*E/4-P)),K=E/2+Q,g=Math.max(1e-6,E/2-Q),A=Math.sqrt(g/K),S=Math.max(0,Math.min(1,(.62-A)/.3)),D=Math.round(127.5+127.5*Math.cos(2*w)),z=Math.round(127.5+127.5*Math.sin(2*w)),R=Math.round(255*S);for(const M of B)x.data[M*4]=D,x.data[M*4+1]=z,x.data[M*4+2]=R}const W=new Uint8ClampedArray(x.data);for(let F=0;F<2;F++){const p=new Uint8ClampedArray(W);for(let d=0;d<r;d++)for(let B=0;B<l;B++){const j=d*l+B;if(!(p[j*4+2]>0))for(const[G,ee]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=B+G,U=d+ee;if(_<0||U<0||_>=l||U>=r)continue;const N=U*l+_;if(p[N*4+2]>0){W[j*4]=p[N*4],W[j*4+1]=p[N*4+1],W[j*4+2]=p[N*4+2];break}}}}return x.data.set(W),i.putImageData(x,0,0),{ori:m,ids:h}}const fa=300;let Fe=null,ao=0,Xt=!1;const ct=document.createElement("canvas"),wn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:fa}):setTimeout(e,0)},En=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),An=()=>ao;function Tn(e,o,a,t,n,s,f){const l=o.what==="fill",r={keys:l?[]:o.keys??o.paint,srcPaper:t,fill:l,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Wt(e,r);const m=JSON.stringify([l,r.keys,r.nk,l?r.cover:0,l?r.seed:0,t]),i=performance.now(),c={motion:s&&[...s],scene:f};if(!Fe||Fe.key!==m)return Fe={key:m,maps:Wt(e,r),at:i,sig:c},ao++,Fe.maps;if(!Xt&&i-Fe.at>=fa&&!En(c,Fe.sig)){const[k,L]=ua(e.width,e.height,l);(ct.width!==k||ct.height!==L)&&(ct.width=k,ct.height=L),ct.getContext("2d").drawImage(e,0,0,k,L),Xt=!0,Fe.at=i,Fe.sig=c,wn(()=>{Xt=!1,!(!Fe||Fe.key!==m)&&(Fe.maps=Wt(ct,r),ao++)})}return Fe.maps}const no=300,Ln=200,Rn=e=>ge(ue(e))[0]<.3?.995:.97;function Oo(e){const o=ge(ue(e));let a=To[0][1],t=1e9;for(const[,n]of To){const s=ge(ue(n)),f=Math.hypot(o[0]-s[0],2*(o[1]-s[1]),2*(o[2]-s[2]));f<t&&(t=f,a=n)}return a}const Dn=e=>ge(e)[0]>.8?e:[1,1,1];function Bn(e,o,a){const t=(e.dark-.5)*.5,n=r=>Math.max(.03,Math.min(.95,r));let s=[],f=null;if(e.mode==="tone"){const r=e.n;s=a(r).map((i,c)=>({kind:0,thr:n(i-t),hex:Ea[r][c]})),e.accent&&o.length&&(f=o[0],s.push({kind:3,hex:e.colors==="own"?o[0]:Oo(o[0])}))}else s=o.slice(0,e.n).sort((m,i)=>ge(ue(i))[0]-ge(ue(m))[0]).map(m=>({kind:1,key:m,hex:e.colors==="own"?m:Oo(m)})),s.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===s.length&&s.forEach((r,m)=>{r.hex=e.manual[m]}),s.forEach(r=>{r.op=Rn(r.hex)}),s.map((r,m)=>m).filter(r=>s[r].kind!==3).slice(-3).forEach((r,m)=>{s[r].ch=m}),{layers:s,accKey:f}}const Kt=new Map;let nt=null,Pt=null,qo=0;const ro=e=>e?[...e.slice(0,7),e[9]??0]:null;function Cn(e,o){const a=ro(e);return(!a||!Pt||a.length!==Pt.length||a.some((t,n)=>t!==Pt[n]))&&(Pt=a,qo=o),!!a&&o-qo>=Ln}let xe=null,wt=null,Vt=!1,so=0;const lt=document.createElement("canvas"),Fn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:no}):setTimeout(e,0)},_n=()=>so;function Nn(e,o,a,t){const n=Dn(e.srcPaper),s=performance.now(),f=e.isLive?Cn(e.motion,s):!0,l=wa(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&f){const h=ro(e.motion);(!nt||nt.scene!==e.scene||!h||!nt.cam||h.some((x,C)=>x!==nt.cam[C]))&&(!nt||s-nt.at>=no)&&(Kt.clear(),nt={scene:e.scene,cam:h,at:s})}const r=h=>{const T=`${h}|${n.join(",")}`;let x=Kt.get(T);return x||(x=ln(o,n,h),Kt.set(T,x)),x},{layers:m,accKey:i}=Bn(e.s,l,r),c={layers:m,accKey:i,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:m,accKey:i,maps:Ro(o,c),srcPaper:n};const k=JSON.stringify([m.map(h=>[h.kind,h.thr,h.key,h.ch]),i,c.cut,c.bridges,c.drips,c.splat,c.cloud,t,c.printW,n]),L=ro(e.motion),b=!xe||xe.key!==k||xe.scene!==e.scene||!L||!xe.cam||L.some((h,T)=>h!==xe.cam[T]);if(b&&(f||!xe||xe.key!==k)&&!Vt&&(!xe||s-xe.at>=no)){const h=Math.min(1,1024/Math.max(o.width,o.height)),T=Math.max(8,Math.round(o.width*h)),x=Math.max(8,Math.round(o.height*h));(lt.width!==T||lt.height!==x)&&(lt.width=T,lt.height=x),lt.getContext("2d").drawImage(o,0,0,T,x),Vt=!0;const C=e.scene;xe&&(xe.at=s),Fn(()=>{Vt=!1,xe={key:k,maps:Ro(lt,c),at:performance.now(),cam:L,scene:C},so++})}return xe?f&&!b?{layers:m,accKey:i,maps:xe.maps,srcPaper:n}:((!wt||wt.src!==xe.maps)&&(wt={src:xe.maps,maps:{drip:null,bridge:null,cloud:xe.maps.cloud}},so++),{layers:m,accKey:i,maps:wt.maps,srcPaper:n}):{layers:m,accKey:i,maps:null,srcPaper:n}}const In=2400,$n=240,kt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function We(e,o){const a=kt[e];a.push(o),a.length>In&&a.shift()}function Le(e,o,a){const t=kt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((s,f)=>s-f);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function xo(e=$n){const o=kt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:Le("interval",.5,e),frameP95:Le("interval",.95,e),totalP50:Le("total",.5,e),totalP95:Le("total",.95,e),flatP50:Le("flat",.5,e),uploadP50:Le("upload",.5,e),uploadP95:Le("upload",.95,e),mipP50:Le("mip",.5,e),renderP50:Le("render",.5,e),backP50:Le("back",.5,e),bitmapWaitP50:Le("bitmapWait",.5,e),gpuP50:Le("gpu",.5,e),gpuP95:Le("gpu",.95,e)}}function pa(){for(const e of Object.keys(kt))kt[e].length=0}let ut=null,xt=null,He=null,Ye=null,Ke=null,ma="",io="";function da(e){ma=e}function Qt(e){io=e,He&&(He.textContent=e,He.style.display=e?"block":"none")}function Go(e){Ke&&(Ke.disabled=e,Ke.style.opacity=e?".5":"1")}const _e=(e,o=1)=>e===null?"–":e.toFixed(o),co=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function jn(e){if(!Ye)return;Ye.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",co(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((f,l)=>setTimeout(()=>l(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const s=document.createElement("button");s.textContent="Cerrar",co(s),s.onclick=()=>{Ye&&(Ye.textContent="")},a.append(n,s,t),Ye.append(o,a)}function zn(e){ut||typeof document>"u"||(ut=document.createElement("div"),ut.setAttribute("data-superriso-overlay",""),Object.assign(ut.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Ye=document.createElement("div"),Ye.style.pointerEvents="auto",He=document.createElement("div"),Object.assign(He.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Ke=document.createElement("button"),Ke.textContent="Medir",co(Ke),Ke.style.pointerEvents="auto",Ke.onclick=e,xt=document.createElement("div"),Object.assign(xt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ut.append(Ye,He,Ke,xt),document.body.appendChild(ut),setInterval(()=>{if(!xt)return;const o=xo();xt.textContent=`${ma}
fps ${_e(o.fps)} · frame p50 ${_e(o.frameP50)} p95 ${_e(o.frameP95)} ms
SR p50 ${_e(o.totalP50)} p95 ${_e(o.totalP95)} ms (aplanado ${_e(o.flatP50)} · subida ${_e(o.uploadP50)} · mip ${_e(o.mipP50)} · motor ${_e(o.renderP50)} · vuelta ${_e(o.backP50)})
GPU motor p50 ${_e(o.gpuP50)} p95 ${_e(o.gpuP95)} ms`,io&&He&&(He.textContent=io)},500))}const yt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function va(e){return e&&yt?new OffscreenCanvas(1,1):document.createElement("canvas")}const go=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,bo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},Ue=bo(),lo=bo();function ft(e,o,a,t,n,s){const{canvas:f,ctx:l}=e;return(f.width!==a||f.height!==t)&&(f.width=a,f.height=t),l.setTransform(1,0,0,1,0,0),l.globalAlpha=1,l.globalCompositeOperation="source-over",l.fillStyle=n,l.fillRect(0,0,a,t),l.globalCompositeOperation=s?"source-over":"multiply",l.imageSmoothingEnabled=!0,l.imageSmoothingQuality="medium",l.drawImage(o,0,0,a,t),l.globalCompositeOperation="source-over",f}let Ee=null,Ht=!1,Wo=0;function Un(e,o,a){Wo++;const t=Wo;let n=null;if(Ee&&Ee.bmp.width===o&&Ee.bmp.height===a?n={bmp:Ee.bmp,lag:t-Ee.frame}:Ee&&Ee.bmp.close(),Ee=null,!Ht){Ht=!0;const s=performance.now();createImageBitmap(e).then(f=>{We("bitmapWait",performance.now()-s),Ee&&Ee.bmp.close(),Ee={bmp:f,frame:t}}).catch(()=>{}).finally(()=>{Ht=!1})}return n}function On(){Ee&&Ee.bmp.close(),Ee=null}function st(e,o,a,t,n,s,f){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!f,e.drawImage(o,0,0,a,t,0,0,n,s)}finally{e.restore()}}function Tt(e,o,a,t,n,s,f){const l=go(o)?o.transferToImageBitmap():null;try{st(e,l??o,a,t,n,s,f)}finally{l?.close()}}const Qe=bo();let ko=!1;function So(e,o,a){const t=go(e)?e.transferToImageBitmap():null;try{return(Qe.canvas.width!==o||Qe.canvas.height!==a)&&(Qe.canvas.width=o,Qe.canvas.height=a),Qe.ctx.globalCompositeOperation="copy",Qe.ctx.drawImage(t??e,0,0),ko=!0,Qe.canvas}finally{t?.close()}}const At=()=>ko?Qe.canvas:null,uo=()=>{ko=!1},Lt=()=>({res:1,sim:!1,preview:0,lossless:V.lossless,pipe:0,hold:!1,holdFps:12});function ha(e,o,a){if(!V.auto)return{m:{res:V.resScale,sim:V.simUpload,preview:V.preview,lossless:V.lossless,pipe:V.pipe,hold:V.hold,holdFps:12},level:"manual"};const t=yn(e,o);return t!=="preview"?{m:Lt(),level:t}:a.fullQuality?{m:{...Lt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:V.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const qn=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),mt={inks:null,params:null};function Rt(e,o,a,t){const{settings:n,isDarkMode:s,isPixelArt:f}=a,l=n.technique==="xerox",r=n.technique==="stencil",m=l?Ja(n.xerox,e*t.res,n.resolution):r?nn(n.stencil,e*t.res,n.resolution):Oa(n,e*t.res),i=Math.round(240*m.pxmm),c=Math.round(i*o/e),k=t.sim?Math.min(e,i):e,L=t.sim?Math.min(o,c):o,b=Da(s,f),h=s&&!V.darkPaperFromBase,T=h?[1,1,1]:ue(b),x=l?Aa(n,a.shapes,a.hiddenLayers,T,h?b:null):null;x&&a.isLive&&Ta({rows:x.rows,what:x.what,zones:x.zones});const C=x?{inks:x.paint,names:x.rows.map(p=>p.id??""),opac:[],srcPaper:T}:r?{inks:[],names:[],opac:[],srcPaper:T}:La(a.shapes,a.hiddenLayers,n,T,h?b:null);a.isLive&&(mt.inks=C);const q=[e,o,+s,+f,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+V.mip,+V.offscreenBack,+V.preserveDrawingBuffer,+V.darkPaperFromBase,n.technique,...x?[n.resolution,JSON.stringify(n.xerox),(x.keys??[]).join(","),An()]:r?[n.resolution,JSON.stringify(n.stencil),_n()]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],C.inks.join(",")].join("|"),W=x?{x:n.xerox,mk:x,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0,F=r?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:T,darkBase:h?b:null,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:m,fw:k,fh:L,base:b,srcPaper:T,inks:C,key:q,xerox:W,stencil:F}}function pt(e){const o=e.stencil;if(o){const n=Nn(o,(o.isLive?Ue:lo).canvas,e.style,1);return o.isLive&&Ra(n.layers.map(s=>({hex:s.hex,kind:s.kind}))),mt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return mt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:Tn((a.isLive?Ue:lo).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return mt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const _t=e=>e%9999+1,St=e=>Math.floor(performance.now()*e/1e3);function Dt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):St(o)}const Je=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Bt=null;const Xo=()=>{Bt?.destroy(),Bt=null};function Gn(e,o,a,t,n){const s=performance.now(),f=t.exportFrame,l=!f||f.index===0,r=!f||f.index>=f.count-1;try{l&&Xo();const m=Bt??(Bt=ra(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),i=Lt(),c=Rt(o,a,t,i),k=ft(lo,e.canvas,c.fw,c.fh,c.base,t.isDarkMode);return m.setSource(k,!0),m.render({...pt(c),seed:_t(Dt(t))},Je(i)),m.gl.isContextLost()?!1:(Tt(e,m.canvas,m.width,m.height,o,a,!!c.style.crisp),dt&&console.info(`[SuperRiso] export frame ${f?`${f.index+1}/${f.count}`:"single"} ${o}×${a} → sim ${m.width}×${m.height}: ${(performance.now()-s).toFixed(1)} ms · ${m.lastVariants}`),!0)}finally{r&&Xo()}}const fo=2e3,xa=8e3,po=60,Ko=8,rt={...ia,simUpload:!0,auto:!1,lossless:!1},bt=e=>new Promise(o=>setTimeout(o,e)),Ve=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function Wn(){let o=ot.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),s=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:s}}function Xn(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,s=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,l])=>l!==null).sort((l,r)=>r[1]-l[1])[0],f=[];return s&&s[1]>=3&&f.push(`${s[0]} ${Ve(s[1])} ms`),t!==null&&t>=3&&f.push(`fuera de nuestras etapas ${Ve(t)} ms`),f.length?f.join(" + "):"sin espera apreciable"}async function Vo(e){const o=ot.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const s=o.report().find(f=>f.name==="SCAN");if(s&&s.n>=po)break;await bt(100)}e==="timer"&&(await bt(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(s=>s.p50!==null).sort((s,f)=>f.p50-s.p50).map(s=>s.name);return{mode:e,lines:t.map(s=>`  ${s.name.padEnd(13)} ${`${s.info.w}×${s.info.h}`.padEnd(10)} att ${s.info.att}  p50 ${Ve(s.p50,3).padStart(7)} ms  #${n.indexOf(s.name)+1}  (n=${s.n})`)}}function Kn(e,o,a,t,n){const s=Wn(),f=e.find(m=>m.id==="A")?.s.frameP50??null,l=ot.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Ba} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${J.canvasW}×${J.canvasH} · simulación (última) ${l?`${l.width}×${l.height}`:"–"}`),r.push(`GPU: ${s.renderer} · MAX_TEXTURE_SIZE ${s.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${yt?"sí":"no"}`),r.push(`Modo ${J.isDark?"oscuro":"claro"} · preset de cámara: ${J.preset||"–"} (velocidad ${J.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const m of a)r.push(`AVISO: ${m}`);r.push(`Cada fila: ${fo/1e3} s de calentamiento descartados + ${xa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const m of e){const i=m.s,c=L=>Ve(L,2).padStart(6),k=!m.patch.bypass&&i.frameP50!==null&&f!==null&&i.totalP50!==null?i.frameP50-f-i.totalP50:null;r.push(`${(m.id+" "+m.label).padEnd(20)}${Ve(i.fps).padStart(5)}  ${(Ve(i.frameP50)+"/"+Ve(i.frameP95)).padEnd(11)} |${c(i.totalP50)}${c(i.flatP50)} ${c(i.uploadP50)}${c(i.uploadP95)}${c(i.mipP50)}${c(i.renderP50)}${c(i.backP50)} |${c(k)}    |${c(i.gpuP50)}  ${m.res.padEnd(10)}  ${m.n.pipe}/${m.n.sync}/${m.n.held}  (n=${i.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const m of e)m.patch.bypass||r.push(`  ${m.id} ${m.label}: ${Xn(m,f)}`);for(const m of n)m&&(r.push(""),r.push(m.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, temporizador de GPU por pasada:`),m.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...m.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Vn(){if(Yt)return;const e=[],o=performance.now()-J.lastCallAt;if(J.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):J.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,Go(!0);const a={...V},t=[],n=[];let s=!1,f="–",l=0;const r=async m=>{Qt(`Midiendo ${m.id} (${++l}/${Ko})…`),qt(m.patch),await bt(fo),pa();const i={pipe:J.pipeFrames,sync:J.pipeSyncFrames,held:J.heldFrames};await bt(xa);const c=xo(1/0);c.gpuP50!==null&&(s=!0);const k={pipe:J.pipeFrames-i.pipe,sync:J.pipeSyncFrames-i.sync,held:J.heldFrames-i.held},L=ot.engineInfo(),b={id:m.id,label:m.label,res:m.patch.bypass||!L?"–":`${L.width}×${L.height}`,s:c,patch:m.patch,n:k};return t.push(b),b};try{await r({id:"A",label:"bypass",patch:{...ia,bypass:!0,auto:!1}});const m=await r({id:"B",label:".75 pipe1",patch:{...rt,resScale:.75,pipe:1}}),i=await r({id:"C",label:".75 pipe2",patch:{...rt,resScale:.75,pipe:2}}),c=(i.s.frameP50??1e9)<(m.s.frameP50??1e9)?2:1;f=`pipe${c} (${c===2?"C":"B"}: frame p50 ${Ve(c===2?i.s.frameP50:m.s.frameP50)} ms frente a ${Ve(c===2?m.s.frameP50:i.s.frameP50)})`,await r({id:"D",label:`.75 pipe${c} lossless`,patch:{...rt,resScale:.75,pipe:c,lossless:!0}}),await r({id:"E",label:`.75 pipe${c} preview`,patch:{...rt,resScale:.75,pipe:c,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${c} preview`,patch:{...rt,resScale:1,pipe:c,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${c} hold`,patch:{...rt,resScale:.75,pipe:c,hold:!0}}),Qt(`Midiendo P (${++l}/${Ko})… perfilado por pasada`),qt({...rt,resScale:.75,pipe:1}),await bt(fo),n.push(await Vo("sync")),n.push(await Vo("timer"))}finally{qt(a),Qt(""),Go(!1),Yt=!1}jn(Kn(t,s,e,f,n))}const Qn=["greennoise1024","ink_black","ink_red","ink_lut"];let Nt=null,Ct=!1,mo=!1,ie=null,Me=va(V.offscreenBack),Qo=V.preserveDrawingBuffer,Jt=0;const yo=(e,o)=>{Ct||(Ct=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},Hn=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(Qn.map(Hn)).then(([e,o,a,t])=>{Nt={green:e,exBlack:o,exRed:a,exLut:t}}).catch(e=>yo("textures",e));const ga=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===Me&&(mo=!0,ie=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===Me&&(mo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};ga(Me);const ba=()=>{const e=Me;ie=null,On(),ke=null,je=null,fe=null,Re=null,Xe=null,Ae=null,uo(),Me=va(V.offscreenBack),ga(Me),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};ot.recreateEngine=ba;ot.engineInfo=()=>ie?{gl:ie.gl,width:ie.width,height:ie.height}:null;ot.profiler=()=>ie?ie.profiler:null;const ka=()=>[`pdb ${V.preserveDrawingBuffer?"on":"off"}`,`mip ${V.mip?"on":"off"}`,V.bitmapUpload?"bitmap":"",V.offscreenBack?yt?"offscreen":"offscreen→DOM":"",V.bypass?"BYPASS":""].filter(Boolean).join(" · ");dt&&(zn(()=>{Vn()}),da(`SUPER RISO · ${ka()}`),window.__superRiso={KNOBS:V,snapshot:xo,reset:pa,live:J,qualityReport:Mn,isSuperRisoPreviewDevice:Ca,get lastChange(){return la},get inks(){return mt.inks},get params(){return mt.params},get engine(){return ie},get disabled(){return Ct},get glCanvas(){return Me},get flat(){return Ue.canvas}});function Mo(){return ie&&(Qo!==V.preserveDrawingBuffer||go(Me)!==(V.offscreenBack&&yt))&&ba(),ie||(ie=ra(Me,Nt,{preserveDrawingBuffer:V.preserveDrawingBuffer}),Qo=V.preserveDrawingBuffer),ie}let De=0,ke=null,je=null,fe=null,Re=null;const ne={begin:0,upload:0,mip:0,render:0,backBegin:0};let Xe=null,Ae=null;const Sa=()=>Ct||mo||!Nt||V.bypass;function Zn(e,o,a){if(!a.isLive||(De++,je=null,ne.begin=0,ne.upload=0,ne.mip=0,ne.render=0,ne.backBegin=0,Sa()))return;const{m:t}=ha(e,o,a.settings);if(!t.pipe||Re)return;const n=performance.now();try{const s=Rt(e,o,a,t);if(t.pipe===2){Yn(s,t,Dt(a),n);return}if(!ke||ke.key!==s.key||ke.frame!==De-1){ke=null;return}const f=St(t.holdFps);if(t.hold&&fe&&fe.key===s.key&&fe.tick===f&&At())return;const l=Mo();l.setSource(Ue.canvas,V.mip);const r=performance.now();l.render({...ke.params,seed:_t(Dt(a))},Je(t));const m=performance.now();if(ke=null,l.gl.isContextLost())return;je={key:s.key,frame:De,ew:l.width,eh:l.height,crisp:!!s.style.crisp,tick:f},ne.upload=l.lastUploadMs,ne.mip=l.lastMipMs,ne.render=m-r,ne.begin=m-n}catch(s){ie=null,yo("exception in beginSuperRisoFrame",s)}}function Yn(e,o,a,t){const n=St(o.holdFps);if(Xe&&Xe.frame===De-1&&Xe.key===e.key&&ie){const r=performance.now();ie.present(),So(Me,Xe.ew,Xe.eh),ne.backBegin=performance.now()-r,Ae={...Xe,frame:De}}if(Xe=null,!ke||ke.key!==e.key||ke.frame!==De-1){ke=null,ne.begin=performance.now()-t;return}if(o.hold&&Ae&&Ae.key===e.key&&Ae.tick===n){ne.begin=performance.now()-t;return}const s=Mo();s.setSource(Ue.canvas,V.mip);const f=performance.now();s.render({...ke.params,seed:_t(a)},Je(o,!0));const l=performance.now();ke=null,!s.gl.isContextLost()&&(Xe={key:e.key,frame:De,tick:n,ew:s.width,eh:s.height,crisp:!!e.style.crisp},ne.upload=s.lastUploadMs,ne.mip=s.lastMipMs,ne.render=l-f,ne.begin=l-t)}function Zt(e,o,a,t,n,s,f,l,r){if(t.hold){const m=So(Me,s,f);fe={key:n,tick:r,ew:s,eh:f,crisp:l},st(e,m,s,f,o,a,l)}else Tt(e,Me,s,f,o,a,l)}function gt(e,o,a,t,n,s=!1){const f=Mo(),l=performance.now(),r=V.bitmapUpload?Un(o,e.fw,e.fh):null,m=performance.now()-l;r?(f.setSource(r.bmp,V.mip),r.bmp.close(),J.bitmapLagFrames=r.lag):f.setSource(o,V.mip);const i=performance.now();return f.render({...a,seed:_t(t)},n),s&&f.profiler.timerAvailable?zo(J.canvasW,J.canvasH,f.gpuMs===null?null:f.gpuMs+performance.now()-l,"GPU"):s&&(f.finish(),zo(J.canvasW,J.canvasH,performance.now()-l,"readback")),ne.upload+=f.lastUploadMs+m,ne.mip+=f.lastMipMs,ne.render+=performance.now()-i,f}function er(e,o,a,t){const n=performance.now(),{isDarkMode:s,isLive:f,info:l}=t;if(f&&(dt&&Jt>0&&We("interval",n-Jt),Jt=n,J.lastCallAt=n,J.isDark=s,J.canvasW=o,J.canvasH=a,J.preset=l.preset,J.speed=l.speed,J.offscreenFallback=V.offscreenBack&&!yt),Sa())return!1;try{if(!f)return Gn(e,o,a,t,Nt);const{m:r,level:m}=ha(o,a,t.settings),i=Dt(t),c=Rt(o,a,t,r);J.level=m,fe&&(fe.key!==c.key||!r.hold)&&(fe=null,Re||uo());const k=Pn(t.motion,t.scene,n);let L=n,b=n;const h=(F,p=r)=>{if(J.lastPath=F,!dt)return!0;const d=performance.now();return We("flat",L-n),We("upload",ne.upload),We("mip",ne.mip),We("render",ne.render),We("back",ne.backBegin+(d-b)),We("total",ne.begin+(d-n)),ie&&ie.gpuMs!==null&&We("gpu",ie.gpuMs),da(`SUPER RISO · ${m} · ${o}×${a} → sim ${ie?`${ie.width}×${ie.height}`:"–"} · src ${c.fw}×${c.fh} · ${qn(p)} · ${ka()} · ${F}`),!0};if(m==="detect"){const F=ft(Ue,e.canvas,c.fw,c.fh,c.base,s);L=performance.now();const p=gt(c,F,pt(c),i,Je(r),!0);return p.gl.isContextLost()?!1:(b=performance.now(),Tt(e,Me,p.width,p.height,o,a,!!c.style.crisp),h("detect"))}if(m==="preview"&&k>=Sn){const F=Lt(),p=Rt(o,a,t,F);ke=null,je=null,fe=null;const d=At();if(Re&&Re.key===p.key&&Re.tick===i&&d)return b=performance.now(),st(e,d,Re.ew,Re.eh,o,a,Re.crisp),J.heldFrames++,h("refined",F);const B=ft(Ue,e.canvas,p.fw,p.fh,p.base,s);L=performance.now();const j=gt(p,B,pt(p),i,Je(F));if(j.gl.isContextLost())return!1;b=performance.now();const G=So(Me,j.width,j.height);return Re={key:p.key,tick:i,ew:j.width,eh:j.height,crisp:!!p.style.crisp},st(e,G,j.width,j.height,o,a,Re.crisp),h("refine",F)}Re&&(Re=null,uo());const T=()=>r.hold&&fe&&fe.key===c.key?At():null;if(r.pipe===2){const F=ft(Ue,e.canvas,c.fw,c.fh,c.base,s);L=performance.now();const p=pt(c);ke={key:c.key,frame:De,params:p},b=performance.now();const d=At();if(Ae&&Ae.key===c.key&&d&&(Ae.frame===De||r.hold))return st(e,d,Ae.ew,Ae.eh,o,a,Ae.crisp),Ae.frame===De?J.pipeFrames++:J.heldFrames++,h(Ae.frame===De?"pipe2":"held");Ae=null;const B=gt(c,F,p,i,Je(r));return B.gl.isContextLost()?!1:(b=performance.now(),Tt(e,Me,B.width,B.height,o,a,!!c.style.crisp),J.pipeSyncFrames++,h("sync"))}if(r.pipe){const F=ft(Ue,e.canvas,c.fw,c.fh,c.base,s);L=performance.now();const p=pt(c);if(ke={key:c.key,frame:De,params:p},b=performance.now(),je&&je.key===c.key&&je.frame===De)return Zt(e,o,a,r,c.key,je.ew,je.eh,je.crisp,je.tick),J.pipeFrames++,h("pipe");const d=T();if(d&&fe)return st(e,d,fe.ew,fe.eh,o,a,fe.crisp),J.heldFrames++,h("held");const B=gt(c,F,p,i,Je(r));return B.gl.isContextLost()?!1:(b=performance.now(),Zt(e,o,a,r,c.key,B.width,B.height,!!c.style.crisp,St(r.holdFps)),J.pipeSyncFrames++,h("sync"))}const x=St(r.holdFps),C=T();if(C&&fe&&fe.tick===x)return st(e,C,fe.ew,fe.eh,o,a,fe.crisp),J.heldFrames++,h("held");const q=ft(Ue,e.canvas,c.fw,c.fh,c.base,s);L=performance.now();const W=gt(c,q,pt(c),i,Je(r));return W.gl.isContextLost()?!1:(b=performance.now(),Zt(e,o,a,r,c.key,W.width,W.height,!!c.style.crisp,x),h("sync"))}catch(r){return ie=null,yo("exception in applySuperRiso",r),!1}}export{er as applySuperRiso,Zn as beginSuperRisoFrame};
