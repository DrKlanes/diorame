import{X as ya,l as Ce,h as ce,r as ot,S as Ma,o as pe,M as rt,p as zt,d as Pa,s as eo,x as wa,b as Ea,c as To,e as Aa,f as Ta,i as La,j as Ra,k as Ba,A as Da,m as Fa}from"./index-CpFwPAWM.js";const Ca=17.2,_a=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,qe=`#version 300 es
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
`,Nt=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ye=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,at=qe+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Na=qe+Nt+Ye+`
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
}`,Ia=qe+`
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
}`,Ho=qe+Nt+Ye+`
uniform sampler2D uPrep, uPrepS, uSet; uniform vec3 uInk[8]; uniform float uOp[8]; uniform float uCon[8]; uniform int uN; uniform vec3 uPaper; uniform float uCost, uPair, uMinDot, uSingle;
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
  if(bS.x>=0){ float e=solve(bS,t,tL,bD);
    // una sola tinta si queda casi igual: un negro se imprime con negro, no con negro + azul en grano (islas moteadas)
    if(bS.y>=0){ int dk=bS.x; float dl=dot(uInk[bS.x],vec3(.2126,.7152,.0722));
      for(int k=1;k<3;k++){ if(bS[k]<0) continue; float l=dot(uInk[bS[k]],vec3(.2126,.7152,.0722)); if(l<dl){ dl=l; dk=bS[k]; } }
      ivec3 S1=ivec3(dk,-1,-1); vec3 D1; float e1=solve(S1,t,tL,D1);
      if(e1<=e+uSingle && D1.x>.97){ bS=S1; bD=D1; } } }   // solo si la tinta oscura ya va saturada: la segunda tinta solo serviría para oscurecer más allá de ella
  vec4 A=vec4(0), B=vec4(0);
  for(int k=0;k<3;k++) if(bS[k]>=0){ float v=bD[k]; put(A,B,bS[k], v<uMinDot?0.:v); }
  oA=A; oB=B;
}`,ja=qe+Ye+`
uniform sampler2D uRawA, uRawB, uWA, uWB; uniform int uN; uniform float uFill;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 rA=texture(uRawA,uv), rB=texture(uRawB,uv), wA=texture(uWA,uv), wB=texture(uWB,uv);
  vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i<uN){
    float d=pick(rA,rB,i), W=pick(wA,wB,i), cov=0., Wc=0.;
    for(int j=0;j<8;j++){ if(j>i && j<uN){ cov+=pick(rA,rB,j); Wc+=pick(wA,wB,j); } }   // tintas que imprimen después (más oscuras)
    float rho=min(1., W/max(.25, 1.-min(Wc,.95)));                                  // densidad de esta tinta alrededor, sin contar los huecos
    float f=rho*smoothstep(.2,.55,cov)*smoothstep(.035,.13,W)*uFill;                      // trap fino en bordes; trazos finos, relleno completo
    put(A,B,i,max(d,f)); } }
  oA=A; oB=B; }`,$a=qe+Ye+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Yo=qe+Ye+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,Jo=qe+vo+Ye+`
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
    d=mix(d,1.,smoothstep(uSolidLv-.08,uSolidLv+.14,d)*(grad?.5:1.));   // casi lleno → se cierra hacia sólido de forma continua (sin escalón)
    if(d>=.995){ put(A,B,i,1.); continue; }
    float s=uSeed*7.31+float(i)*19.17;
    float t=exT(mm,s,uExSel[i]);
    float x=d*(1.+uTexAmp*(t-1.))*(1.+uMottle*.05*(vnoise(mm/28.+s)-.5)*2.);
    x+=uStreak*.05*(vnoise(vec2(mm.x/.35, mm.y/30.)+s*2.3)-.5)*2.;
    float g= uMode==0 ? fmDots(mm,x,s) : amDots(mm,x,s,ang[i]);
    // codifico en un solo valor: zona de línea → d (se umbraliza en SPREAD); zona de tono → puntos ya dibujados
    put(A,B,i, mix(d, g, tone)); }
  oA=A; oB=B;
}`,Zo=qe+vo+Ye+`
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
    if(d>=.995) tone=0.;
    float t=exT(mm,s,uExSel[i])-1., t2=exThickR(mm*2.3+17.,s*1.7)-1.;
    float aa=clamp(.5/(2.*r+1.),.06,.3);
    float edge=smoothstep(uGain-aa, uGain+aa, v + uEdge*(2.2*t+1.6*t2));
    put(A,B,i, mix(edge, v, tone)); }
  oA=A; oB=B; }`,qa=qe+vo+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,ea=qe+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,za={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,fill:1,single:.035,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Lo={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},Ua={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},Ae=(e,o,a)=>e+(o-e)*a;function ho(e,o){return{printW:240,pxmm:o*Ae(.4,1,e)/240,crisp:e<.5,scanBlur:Ae(1,.65,e),scanNoise:Ae(.6,.35,e)}}function Oa(e,o){const a=Object.assign({},Ua,e),t=a.imperfection,n=a.resolution,s=a.screenSize;return Object.assign({...ho(n,o),screen:a.screen==="dots"?1:0,grain:Ae(.09,.3,s),lpi:Math.round(Ae(120,45,s)),misreg:.04+.6*Math.pow(t,1.6),rot:Ae(.01,.1,t),scl:Ae(.2,1.2,t),edge:Ae(.2,.65,t),voids:Ae(.05,.4,t),texAmp:Ae(.5,1.05,t),starve:Ae(.05,.4,t),mottle:Ae(.3,1.2,t),bleed:Ae(.04,.07,t),inkLoad:Ae(.75,.5,t)},Lo[a.paper]||Lo.natural)}function Wa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,s=[],p=[];let l=0;const r=new Uint8Array(4),d=(i,c)=>{let x=t.get(i);x||(x=[],t.set(i,x)),x.push(c)};return{get mode(){return a},timerAvailable:!!o,setMode(i){a=i==="timer"&&!o?"off":i,t.clear(),n.clear(),s.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),l=performance.now()),a==="timer"&&this.poll()},before(i,c){if(n.has(i)||(n.set(i,c),s.push(i)),a!=="timer"||!o)return null;const x=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,x),x},after(i,c){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const x=performance.now();d(i,x-l),l=x}else c&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),p.push({name:i,q:c}))},poll(){if(o)for(;p.length&&e.getQueryParameter(p[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:i,q:c}=p.shift();e.getParameter(o.GPU_DISJOINT_EXT)||d(i,e.getQueryParameter(c,e.QUERY_RESULT)/1e6),e.deleteQuery(c)}},report(){return s.map(i=>{const c=[...t.get(i)??[]].sort((x,R)=>x-R);return{name:i,p50:c.length?c[Math.floor(c.length/2)]:null,n:c.length,info:n.get(i)}})}}}const Ga=at+`
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
  o=vec4(d,0.,0.,1.); }`,Xa=at+`
out vec4 o;
uniform sampler2D uD, uGreen; uniform float uThr, uGrain, uDust, uFog, uStreak, uGen;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; float g=uGen+uSeed*.137;
  float d=texture(uD,uv).r;
  float n=texture(uGreen, mm/(uGrain*3.)/1024.*vec2(1.,1.)+vec2(g*.31,g*.17)).r-.5;   // grano de tóner: racimos
  float n2=(vnoise(mat2(.8,.6,-.6,.8)*mm/.03+g*3.7)-.5)*1.7;                         // grano fino sin celdas cuadradas
  float on=smoothstep(uThr-.06,uThr+.06, d + n*.13 + n2*.11);
  // motas del cristal (fijas en la hoja para toda la tirada; cada generación añade su cristal)
  vec2 c=floor(mm/1.6); float hs=h12(c+g*11.3);
  if(hs<uDust*.05){ vec2 ctr=(c+vec2(h12(c+1.7+g),h12(c+5.3+g)))*1.6; float r=.035+.16*pow(h12(c+9.1+g),3.);
    on=max(on, smoothstep(r, r*.55, length(mm-ctr)+(vnoise(mm*9.)-.5)*.03)); }
  // velo de fondo: tóner suelto sobre el blanco
  { vec2 q=mat2(.83,.56,-.56,.83)*mm/.25+g*2.3; vec2 c=floor(q), f=fract(q); float r=mix(.07,.18,h12(c+3.1));
    vec2 ctr=vec2(r)+(1.-2.*r)*vec2(h12(c+1.7),h12(c+4.9));
    on=max(on, step(h12(c), uFog*.15)*.85*(1.-smoothstep(r*.6,r,length(f-ctr)))); }
  // rayas del tambor: líneas finas en la dirección de avance (vertical), con intensidad que va y viene
  float col=floor(mm.x/.09); float hr=h12(vec2(col,7.7));
  if(hr<uStreak*.006){ float inten=smoothstep(.35,.7,vnoise(vec2(col*3.1, mm.y/35.))); on=max(on, inten*(.6+.4*h12(vec2(col,mm.y*3.)))); }
  o=vec4(on,0.,0.,1.); }`,Va=at+Nt+Ye+`
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
  oA=A; oB=B; }`,Ka=at+`
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
  o=vec4(T,1.); }`,Qa=at+`
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
    if(r<3.){ vec2 q=mat2(.6,.8,-.8,.6)*mm/.2; vec2 g=floor(q), f=fract(q); float rr=mix(.1,.24,h12(g+c2+2.2));
      vec2 ce=vec2(rr)+(1.-2.*rr)*vec2(h12(g+c2+.4),h12(g+c2+6.1));
      dirt=max(dirt, step(h12(g+c2), .45*(1.-r/3.))*.95*(1.-smoothstep(rr*.6,rr,length(f-ce)))); } }
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,Ha=at+`
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
  float mot=.55*vnoise(mm/.45)+.3*vnoise(mm/.13)+.15*vnoise(mat2(.8,.6,-.6,.8)*mm/.035);
  float dT=d*(1.-uHollow*(1.-.75*uTonerK)*inner*(.006+.08*mot));
  dT*=1.-uBand*.05*smoothstep(.4,.9,vnoise(vec2(mm.x/9.,.5)));                      // bandas claras en la dirección de avance
  vec3 toner=vec3(1.,1.,1.08)*mix(.045,.0018,uTonerK)*(1.+.6*vnoise(mat2(.6,.8,-.8,.6)*mm/.028));    // negro del tóner: de gris gastado a negro profundo
  c=mix(cp, toner*mix(vec3(1.),T,.04), clamp(dT,0.,1.)*.995);                     // el tóner tapa; el color encima apenas lo tiñe
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ya={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},Pe=(e,o,a)=>e+(o-e)*a;function Ja(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:ya[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:Pe(.1,1,o),scratch:Pe(0,.7,o),prints:Pe(0,.45,o),smear:Pe(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:Pe(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:Pe(.05,1,o),fog:Pe(.05,1,o),streak:Pe(0,.8,o),band:Pe(.1,.8,o),hollow:Pe(.2,.7,o),grain:Pe(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:Pe(.1,2.2,a),sloppy:Pe(.25,1.2,a),wobble:Pe(.2,.9,a),cover:Pe(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function Za(e,o,a){return{...ho(a,o),...Object.assign(Ja(e),e.fine),tech:"xerox"}}function en(e){const{gl:o}=e;let a=null,t=null,n=0,s=0;const p=o.createTexture();let l;const r=o.createTexture();let d,i=null;const c=()=>{if(!i){i=document.createElement("canvas"),i.width=i.height=1;const g=i.getContext("2d");g.fillStyle="rgb(255,128,0)",g.fillRect(0,0,1,1)}return i};function x(g,v){if(a||(a={xlum:e.compile(Ga),xgen:e.compile(Xa),xid:e.compile(Va),xcolor:e.compile(Ka),xcomp:e.compile(Ha),xdirt:e.compile(Qa)}),t&&g===n&&v===s)return;t&&Object.values(t).forEach(e.freeTarget),n=g,s=v;const L=Math.max(1,g>>2),B=Math.max(1,v>>2);t={xa:e.target(g,v),xb:e.target(g,v),xc:e.target(g,v),xq1:e.target(L,B,2),xq2:e.target(L,B,2),xs:e.target(L,B)}}function R(g,v,L,B,U,Z,Y,S){x(Z,Y);const f=Object.assign({},Ya,g),m=t,E=a,C=Z/f.printW,O=(f.markers||[]).slice(0,6),J=f.hand>0?O.length:0,_=[];for(let k=0;k<6;k++)_.push(...Ce(ce(O[k]||"#ffffff")));const q=(f.keys&&f.keys.length?f.keys:O).slice(0,6),N=[];for(let k=0;k<6;k++)N.push(...Ce(ce(q[k]||O[k]||"#ffffff")));f.regionMap&&f.regionMap!==d&&(e.texFrom(f.regionMap,{filter:o.NEAREST},r),d=f.regionMap),!f.regionMap&&d!==null&&(e.texFrom(c(),{filter:o.NEAREST},r),d=null);const te=ot(f.seed*4241+7),Q=[];for(let k=0;k<6;k++){const T=te()*Math.PI*2,y=f.offset*(.35+.65*te());Q.push(Math.cos(T)*y,Math.sin(T)*y)}f.orientMap&&f.orientMap!==l&&(e.texFrom(f.orientMap,{filter:o.NEAREST},p),l=f.orientMap),!f.orientMap&&l!==null&&(e.texFrom(c(),{filter:o.NEAREST},p),l=null);const ae=f.regionMap?1:0,ge=Ce(ce(f.paper)),I=Ce(f.srcPaper||[1,1,1]),w=(k,T,y,F)=>e.run(k,T,y,$=>{$.f("uOff",0,0),$.f("uImg",Z,Y),F($)});w("PREP",e.PR.prep,v.prep,k=>{k.t("uSrc",L),k.f("uSrcRes",B,U),k.f("uSmoothPx",f.smooth*B/f.printW),k.f("uSrcPaper",...f.srcPaper||[1,1,1]),k.f("uPaper",1,1,1)}),w("XLUM",E.xlum,m.xa,k=>{k.f("uPxMm",C),k.t("uPrep",v.prep.t[0]),k.f("uDark",f.dark),k.f("uSoft",f.soft),k.f("uMotion",f.motion),k.f("uPhoto",f.photo),k.f("uLpi",f.lpi),k.f("uLid",f.lid)});const A=(k,T,y,F,$,D)=>w(`BLUR ${k}`,e.PR.blur,y,P=>{P.t("uTexA",T.t[0]),P.t("uTexB",T.t[T.t.length>1?1:0]),P.f("uDir",F,$),P.f("uSig",D)}),M=Math.max(1,Math.round(f.gens));for(let k=1;k<=M;k++){const T=Math.max(.05,f.genSpread*C*(k===1?.6:1));A(`gen${k} H`,m.xa,m.xb,1,0,T),A(`gen${k} V`,m.xb,m.xc,0,1,T),w(`XGEN ${k}`,E.xgen,m.xa,y=>{y.f("uPxMm",C),y.f("uSeed",f.seed),y.t("uD",m.xc.t[0]),y.t("uGreen",e.greenTex),y.f("uThr",f.thr),y.f("uGrain",f.grain),y.f("uDust",f.dust),y.f("uFog",f.fog),y.f("uStreak",f.streak),y.f("uGen",k)})}w("XDIRT",E.xdirt,m.xb,k=>{k.f("uPxMm",C),k.f("uSeed",f.seed),k.t("uD",m.xa.t[0]),k.f("uHair",f.hairs),k.f("uScratch",f.scratch),k.f("uPrint",f.prints),k.f("uSmear",f.smear)});const V=m.xb;A("sol ¼ H",V,v.qtmp,1,0,1.1*C/4),A("sol ¼ V",v.qtmp,m.xs,0,1,1.1*C/4);const G=J>0;if(G){A("ps ¼ H",v.prep,v.qtmp,1,0,Math.max(.3,.12*C/4)),A("ps ¼ V",v.qtmp,m.xq1,0,1,Math.max(.3,.12*C/4)),w("XID",E.xid,m.xq2,T=>{T.t("uPS",m.xq1.t[0]),T.fv("uKey",N,3),T.t("uIdMap",r),T.i("uUseMap",ae),T.i("uNk",J),T.f("uSrcPaperL",...I),T.f("uMinL",.32),T.f("uPxMm",C),T.f("uVoteMm",f.colorSmooth)});const k=f.hand===1?Math.max(1.5,.8*C/4):Math.max(.3,f.sloppy*C/4);A("mask H",m.xq2,v.qtmp,1,0,k),A("mask V",v.qtmp,m.xq1,0,1,k),w("XCOLOR",E.xcolor,m.xc,T=>{T.f("uPxMm",C),T.f("uSeed",f.seed),T.t("uMA",m.xq1.t[0]),T.t("uMB",m.xq1.t[1]),T.fv("uMk",_,3),T.i("uNk",J),T.i("uMed",f.hand),T.fv("uCOff",Q,2),T.f("uWobble",f.wobble),T.f("uCover",f.cover),T.f("uStroke",f.stroke),T.f("uAng",f.strokeAng*Math.PI/180),T.f("uOverlap",f.overlap),T.f("uStrength",f.strength),T.f("uSlop",f.slop),T.f("uDry",f.dry),T.f("uFast",f.fast),l===void 0&&(e.texFrom(c(),{filter:o.NEAREST},p),l=null),T.t("uOri",p),T.f("uSheetMm",Z/C,Y/C),T.f("uWobMm",f.wobMm),T.f("uGran",f.gran),T.f("uDryB",f.dryB),T.f("uBloom",f.bloom)})}w("XCOMP",E.xcomp,v.comp,k=>{k.f("uPxMm",C),k.t("uD",V.t[0]),k.t("uSolX",m.xs.t[0]),k.f("uTonerK",f.tonerK),k.t("uC",m.xc.t[0]),k.t("uFib",e.fibTex),k.f("uPaper",...ge),k.f("uHollow",f.hollow),k.f("uBand",f.band),k.f("uPaperTex",f.paperTex),k.f("uFibers",f.fibers),k.f("uHasColor",G?1:0)}),w("SCAN",e.PR.scan,S?v.out:null,k=>{k.f("uSeed",f.seed),k.t("uComp",v.comp.t[0]),k.f("uBlurPx",f.scanBlur),k.f("uNoise",f.scanNoise),k.i("uNorm",0),k.f("uPaper",...ge)})}return{render:R}}const tn=at+Nt+Ye+`
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
  oA=A; oB=B; }`,on=at+`
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
// poros: motas redondas repartidas al azar en 3 rejillas giradas de escalas distintas y agrupadas por manchas (sin rejilla visible)
float pores(vec2 mm, float t){ float p=0., cl=smoothstep(.25,.75,fbm(mm/14.+7.3));
  for(int i=0;i<3;i++){ float fi=float(i), s=fi==0.?.55:fi==1.?.95:1.7, a=fi*1.13+.41;
    vec2 q=mat2(cos(a),sin(a),-sin(a),cos(a))*mm/s+fi*17.3; vec2 c=floor(q), f=fract(q);
    float r=mix(.07,.3,pow(h12(c+9.1),2.)); vec2 ctr=vec2(r)+(1.-2.*r)*vec2(h12(c+1.3),h12(c+5.7));
    float on=step(1.-(.05+.16*t)*(.35+1.3*cl), h12(c+13.+fi));
    p=max(p, on*(1.-smoothstep(r*.55,r,length(f-ctr)+(vnoise(q*5.)-.5)*.12*r))); }
  return p; }
void support(vec2 mm, out vec3 C, out float m, out float pore){
  C=uSupLin; m=1.; pore=0.; float t=uSupTex; float n1=fbm(mm/40.), n2=fbm(mm/6.);
  if(uSup==0){                                                                         // papel
    C*=1.+t*(.03*(n2-.5)+.025*(vnoise(mm/.25)-.5)); }
  else if(uSup==1){                                                                    // pared: manchas, grano y poros
    C*=1.+t*(.18*(n1-.5)+.08*(n2-.5)+.06*(vnoise(mm*9.+3.)-.5));
    pore=pores(mm,t)*smoothstep(1.5,3.,.2*uPxMm);
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
    float cv=sprayCov(dens,mm,fk)*(1.-pore*(.9-.45*smoothstep(1.,1.3,dens))*(1.-drip));
    C=mix(C, uLc[k]*mix(1.,.85,drip), cv*uOp[k]); } }
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,an={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Xe=(e,o,a)=>e+(o-e)*a;function nn(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:Ma[e.sup];return{cut:Xe(.3,4,Math.pow(e.cut,1.5)),facet:Xe(.3,1.1,o),misreg:Xe(0,2.2,o),lift:e.lift,liftMm:Xe(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Xe(.72,1.25,e.load),mist:Xe(.2,.85,o),drop:Xe(.4,3,e.dropSize),drips:e.drips,dripLen:Xe(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Xe(0,1.5,e.supTex),smooth:.12}}function rn(e,o,a){return{...ho(a,o),...nn(e),tech:"stencil"}}const ta=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),oa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let Ut=null;const to=2048;function sn(){if(Ut)return Ut;const e=to,o=new Float32Array(e*e).fill(2),a=ot(7),t=()=>{let g=0;for(;!g;)g=a();return Math.sqrt(-2*Math.log(g))*Math.cos(6.2832*a())};let n=0;const s=4.6*e*e;for(;n<s;){const g=a()<.07,v=Math.min(16,Math.max(.6,(g?5.5:2.6)*Math.exp(.45*t()))),L=a(),B=a()*e,U=a()*e,Z=Math.floor(B),Y=Math.floor(U),S=Math.ceil(v),f=v*v;for(let m=-S;m<=S;m++){const E=Y+m+.5-U;if(E*E>f)continue;const C=((Y+m)%e+e)%e*e;for(let O=-S;O<=S;O++){const J=Z+O+.5-B;if(J*J+E*E>f)continue;const _=C+((Z+O)%e+e)%e;L<o[_]&&(o[_]=L)}}n+=Math.PI*f}const p=4096,l=new Uint32Array(p);let r=0;for(let g=0;g<e*e;g++)o[g]<2&&(l[Math.min(p-1,o[g]*p|0)]++,r++);const d=new Float32Array(p);let i=0;for(let g=0;g<p;g++)i+=l[g],d[g]=i/r;const c=document.createElement("canvas");c.width=c.height=e;const x=c.getContext("2d"),R=x.createImageData(e,e);for(let g=0;g<e*e;g++){const v=o[g]<2?d[Math.min(p-1,o[g]*p|0)]*.985:1,L=Math.round(v*255);R.data[g*4]=R.data[g*4+1]=R.data[g*4+2]=L,R.data[g*4+3]=255}return x.putImageData(R,0,0),Ut=c,c}function wt(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let s=e;const p=new Float32Array(e.length);for(let l=0;l<3;l++){for(let r=0;r<a;r++){let d=0;const i=r*o;for(let c=-n;c<=n;c++)d+=s[i+Math.min(o-1,Math.max(0,c))];for(let c=0;c<o;c++)p[i+c]=d/(2*n+1),d+=s[i+Math.min(o-1,c+n+1)]-s[i+Math.max(0,c-n)]}for(let r=0;r<o;r++){let d=0;for(let i=-n;i<=n;i++)d+=p[Math.min(a-1,Math.max(0,i))*o+r];for(let i=0;i<a;i++)s=s===e?new Float32Array(e.length):s,s[i*o+r]=d/(2*n+1),d+=p[Math.min(a-1,i+n+1)*o+r]-p[Math.max(0,i-n)*o+r]}}return s}function cn(e,o,a){const t=(i,c)=>{let x=i*374761393+c*668265263+a*982451653|0;return x=(x^x>>>13)*1274126177|0,((x^x>>>16)>>>0)/4294967296},n=Math.floor(e),s=Math.floor(o),p=e-n,l=o-s,r=p*p*(3-2*p),d=l*l*(3-2*l);return(t(n,s)*(1-r)+t(n+1,s)*r)*(1-d)+(t(n,s+1)*(1-r)+t(n+1,s+1)*r)*d}function ln(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),s=document.createElement("canvas");s.width=t,s.height=n;const p=s.getContext("2d",{willReadFrequently:!0});return p.fillStyle="#fff",p.fillRect(0,0,t,n),p.drawImage(e,0,0,t,n),{D:p.getImageData(0,0,t,n).data,w:t,h:n,sp:Ce(o).map(l=>Math.max(l,.02))}}const un=.04;function fn(e,o,a,t=null){const{D:n,w:s,h:p,sp:l}=ln(e,o),r=new Float64Array(256),d=new Float64Array(256),i=t?pe(t):null;let c=0;for(let S=0;S<s*p;S++){const f=pe([0,1,2].map(C=>oa(Math.min(1,ta(n[S*4+C]/255)/l[C])))),m=Math.max(0,Math.min(1,1-f[0]+.3*Math.hypot(f[1],f[2]))),E=Math.min(255,m*256|0);if(d[E]++,i){const C=pe([n[S*4]/255,n[S*4+1]/255,n[S*4+2]/255]);if(Math.hypot(C[0]-i[0],C[1]-i[1],C[2]-i[2])<un)continue}r[E]++,c++}c<s*p*.05&&r.set(d);{let S=0,f=0;for(let m=0;m<256;m++)S+=r[m],m>=20&&(f+=r[m]);if(f>S*.05)for(let m=0;m<20;m++)r[m]=0}const x=64,R=new Float64Array(x);for(let S=0;S<256;S++)R[S>>2]+=r[S];const g=new Float64Array(x+1),v=new Float64Array(x+1);for(let S=0;S<x;S++)g[S+1]=g[S]+R[S],v[S+1]=v[S]+R[S]*(S+.5)/x;const L=(S,f)=>{const m=g[f]-g[S];return m>0?(v[f]-v[S])*(v[f]-v[S])/m:0};let B=-1,U=[];const Z=new Array(a).fill(0),Y=(S,f,m)=>{if(S===a){const E=m+L(f,x);E>B&&(B=E,U=Z.slice());return}for(let E=f+1;E<=x-(a-S);E++)Z[S]=E,Y(S+1,E,m+L(f,E))};return Y(0,0,0),U.map(S=>Math.max(.04,Math.min(.95,S/x)))}function Ro(e,o){const a=o.printW||210,t=o.seed|0,n=ot(t*7919+5),s=o.layers||[],p=()=>{let y=0;for(;!y;)y=n();return Math.sqrt(-2*Math.log(y))*Math.cos(6.2832*n())},l=e.width,r=e.height,d=Math.min(1,1024/Math.max(l,r)),i=Math.max(8,Math.round(l*d)),c=Math.max(8,Math.round(r*d)),x=i*c,R=a/i,g=document.createElement("canvas");g.width=i,g.height=c;const v=g.getContext("2d",{willReadFrequently:!0});v.fillStyle="#fff",v.fillRect(0,0,i,c),v.drawImage(e,0,0,i,c);const L=v.getImageData(0,0,i,c).data,B=Ce(o.srcPaper||[1,1,1]).map(y=>Math.max(y,.02)),U=new Float32Array(x*3);for(let y=0;y<x;y++){const F=[0,1,2].map(D=>oa(Math.min(1,ta(L[y*4+D]/255)/B[D]))),$=pe(F);U[y*3]=$[0],U[y*3+1]=$[1],U[y*3+2]=$[2]}const Z=(y,F)=>{const $=(F[0]-U[y*3])*.6,D=F[1]-U[y*3+1],P=F[2]-U[y*3+2];return $*$+D*D+P*P},Y=Math.max(.3,(o.cut||1)*.5/R),S=new Float32Array(x);for(let y=0;y<x;y++)S[y]=Math.max(0,Math.min(1,1-U[y*3]+.3*Math.hypot(U[y*3+1],U[y*3+2])));const f=wt(S,i,c,Y),m=o.accKey?pe(ce(o.accKey)):null;let E=null;if(m){const y=new Float32Array(x);for(let F=0;F<x;F++)y[F]=Z(F,m)<.045&&Math.hypot(U[F*3+1],U[F*3+2])>.06?1:0;E=wt(y,i,c,Y)}const C=s.map(y=>y.kind===1&&y.key?pe(ce(y.key)):null),O=s.map((y,F)=>{const $=new Uint8Array(x);if(y.kind===3){if(E)for(let D=0;D<x;D++)$[D]=E[D]>.5?1:0;return $}if(y.kind===1){const D=new Float32Array(x),P=C[F],b=Math.hypot(P[1],P[2]);for(let h=0;h<x;h++){const j=Z(h,P);if(j>.06||b>.06&&Math.hypot(U[h*3+1],U[h*3+2])<.5*b)continue;let K=!0;for(let W=0;W<C.length;W++)if(W!==F&&C[W]&&Z(h,C[W])<j){K=!1;break}D[h]=K?1:0}const z=wt(D,i,c,Y);for(let h=0;h<x;h++)$[h]=z[h]>.5?1:0;return $}for(let D=0;D<x;D++)$[D]=f[D]>y.thr&&!(E&&E[D]>.5)?1:0;return $}),J=3072/Math.max(i,c),_=Math.round(i*J),q=Math.round(c*J),N=_/a,te=()=>{const y=document.createElement("canvas");y.width=_,y.height=q;const F=y.getContext("2d");return F.fillStyle="#000",F.fillRect(0,0,_,q),F.globalCompositeOperation="lighter",[y,F]},Q=["#ff0000","#00ff00","#0000ff"];let ae=null;if(o.bridges){const[y,F]=te();ae=y;const $=(o.bridgeMm||.9)*N;F.lineCap="butt";const D=new Int32Array(x),P=new Int32Array(x),b=new Int32Array(x).fill(-1),z=new Int32Array(x),h=new Int32Array(x);s.forEach((j,K)=>{if(j.ch==null||j.ch<0)return;const W=O[K];D.fill(-1);let re=0;const fe=[];for(let me=0;me<x;me++){if(W[me]||D[me]>=0)continue;let le=0;P[le++]=me,D[me]=re;const Ee=[];let We=!1;for(;le;){const ee=P[--le];Ee.push(ee);const ze=ee%i,ye=ee/i|0;(ze===0||ye===0||ze===i-1||ye===c-1)&&(We=!0),ze>0&&!W[ee-1]&&D[ee-1]<0&&(D[ee-1]=re,P[le++]=ee-1),ze<i-1&&!W[ee+1]&&D[ee+1]<0&&(D[ee+1]=re,P[le++]=ee+1),ye>0&&!W[ee-i]&&D[ee-i]<0&&(D[ee-i]=re,P[le++]=ee-i),ye<c-1&&!W[ee+i]&&D[ee+i]<0&&(D[ee+i]=re,P[le++]=ee+i)}!We&&Ee.length*R*R>=.6&&fe.push([re,Ee]),re++}F.strokeStyle=Q[j.ch],F.lineWidth=$;const Se=Math.round(12/R);let Re=0;for(const[me,le]of fe.slice(0,600)){const Ee=le.length*R*R,We=Ee<40?1:Ee<400?2:3,ee=[],ze=le.filter(de=>{const u=de%i;return u>0&&W[de-1]||u<i-1&&W[de+1]||W[de-i]||W[de+i]}),ye=Math.sqrt(le.length)*.75;for(let de=0;de<We;de++){Re++;const u=[];let oe=0;for(const ve of ze)ee.some(xt=>Math.hypot(xt%i-ve%i,(xt/i|0)-(ve/i|0))<ye)||(b[ve]=Re,z[ve]=-1,h[ve]=0,u.push(ve));let ie=-1;for(;oe<u.length;){const ve=u[oe++],xt=ve%i,Ao=ve/i|0;if(h[ve]>Se)break;for(const Ue of[xt>0?ve-1:-1,xt<i-1?ve+1:-1,Ao>0?ve-i:-1,Ao<c-1?ve+i:-1])if(!(Ue<0||b[Ue]===Re)){if(!W[Ue]){if(D[Ue]!==me){z[Ue]=ve,ie=Ue;break}continue}b[Ue]=Re,z[Ue]=ve,h[Ue]=h[ve]+1,u.push(Ue)}if(ie>=0)break}if(ie<0)break;let Me=ie;for(;z[Me]>=0&&W[z[Me]];)Me=z[Me];const Ge=z[Me]>=0?z[Me]:Me;ee.push(Ge);const be=(Ge%i+.5)/i*_,lt=((Ge/i|0)+.5)/c*q,$t=(ie%i+.5)/i*_,qt=((ie/i|0)+.5)/c*q,Po=Math.hypot($t-be,qt-lt)||1,wo=($t-be)/Po*.5*N,Eo=(qt-lt)/Po*.5*N;F.beginPath(),F.moveTo(be-wo,lt-Eo),F.lineTo($t+wo,qt+Eo),F.stroke()}}})}const[ge,I]=te(),w=a*a*c/i,A=o.dripLen||8,M=o.dripW||.9,V=o.drips||0,G=o.splat||0,k=s.map((y,F)=>[y,F]).filter(([y])=>y.ch!=null&&y.ch>=0);if(k.forEach(([y,F],$)=>{if(V<=0)return;const D=O[F],P=[];for(let K=0;K<x-i;K++)D[K]&&!D[K+i]&&P.push(K);const b=.35+.65*($+1)/k.length,z=Math.min(260,Math.round(V*P.length*R*.06*b));if(!P.length)return;I.fillStyle=Q[y.ch];let h=0,j=0;for(;h<z&&j<z*8;){j++;const K=P[n()*P.length|0],W=K%i,re=K/i|0;if(n()>.15+cn(W*R/14,re*R/14,t+F*31))continue;h++;let fe=A*Math.exp(.75*p());n()<.25&&(fe*=.25),fe=Math.max(.8,Math.min(150,fe));const Se=M*(.55+.9*n())*(.7+.3*Math.min(1,fe/10)),Re=(W+n())*R,me=(re+1)*R-(.3+n()*1.2),le=(n()-.5)*.8,Ee=.06+n()*.12,We=2+n()*4,ee=n()*6.28;I.beginPath();const ze=Math.max(.04,Se*.18);let ye=Re,de=me,u=Se/2;for(let ie=0;ie<=1.0001;ie+=ze/fe){de=me+ie*fe,ye=Re+le*ie+Ee*Math.sin(ie*fe/We+ee),u=Se/2*(1-.45*ie)*(ie<.08?1+(.08-ie)/.08*.6:1);const Me=Math.max(.6,u*N);I.moveTo(ye*N+Me,de*N),I.arc(ye*N,de*N,Me,0,6.2832)}const oe=u*(1.45+.6*n());I.moveTo(ye*N+oe*N,(de+oe*.4)*N),I.arc(ye*N,(de+oe*.4)*N,Math.max(.7,oe*N),0,6.2832),I.fill()}}),G>0&&k.length){const y=k[k.length-1],F=O[y[1]],$=[];for(let b=0;b<x;b+=3)F[b]&&$.push(b);const D=Math.min(900,Math.round(G*220*w/62370)),P=o.splatSize||.8;for(let b=0;b<D;b++){const z=n()<.75?y:k[n()*k.length|0];I.fillStyle=Q[z[0].ch];let h,j;if($.length&&n()<.65){const W=$[n()*$.length|0];h=(W%i+.5)*R+p()*22,j=((W/i|0)+.5)*R+p()*22}else h=n()*a,j=n()*a*c/i;const K=Math.max(.06,Math.min(4.5,P*.5*Math.exp(.8*p())));if(I.beginPath(),n()<.12){const W=n()*6.28;I.ellipse(h*N,j*N,K*N*2.4,K*N*.8,W,0,6.2832)}else I.arc(h*N,j*N,Math.max(.6,K*N),0,6.2832);if(n()<.45){const W=2+(n()*6|0),re=n()*6.28;for(let fe=0;fe<W;fe++){const Se=K*(1.3+n()*2.6),Re=re+(n()-.5)*1.3,me=Math.max(.04,K*(.1+n()*.3)),le=(h+Math.cos(Re)*Se)*N,Ee=(j+Math.sin(Re)*Se)*N;I.moveTo(le+me*N,Ee),I.arc(le,Ee,Math.max(.5,me*N),0,6.2832)}}I.fill()}}let T=null;if(o.cloud){const F=Math.ceil(i/4),$=Math.ceil(c/4),D=new Float32Array(F*$);for(let j=0;j<x;j++){let K=0;for(const W of O)if(W[j]){K=1;break}if(K){const W=((j/i|0)/4|0)*F+(j%i/4|0);D[W]=1}}const P=wt(D,F,$,(o.cloudMm||18)/(R*4));let b=0;for(const j of P)b=Math.max(b,j);T=document.createElement("canvas"),T.width=F,T.height=$;const z=T.getContext("2d"),h=z.createImageData(F,$);for(let j=0;j<F*$;j++){const K=Math.min(1,P[j]/(b*.55+1e-6));h.data[j*4]=Math.round(255*Math.pow(K,.8)),h.data[j*4+3]=255}z.putImageData(h,0,0)}return{drip:ge,bridge:ae,cloud:T}}function pn(e){const{gl:o}=e;let a=null,t=null,n=0,s=0,p=null;const l=o.createTexture(),r=o.createTexture(),d=o.createTexture();let i,c=null;const x=()=>{if(!c){c=document.createElement("canvas"),c.width=c.height=1;const v=c.getContext("2d");v.fillStyle="#000",v.fillRect(0,0,1,1)}return c};function R(v,L){if(a||(a={scut:e.compile(tn),spray:e.compile(on)}),p||(p=e.texFrom(sn(),{wrap:o.REPEAT,mip:!0})),t&&v===n&&L===s)return;t&&Object.values(t).forEach(e.freeTarget),n=v,s=L;const B=Math.max(1,v>>2),U=Math.max(1,L>>2);t={b1:e.target(v,L),b2:e.target(v,L),sm:e.target(v,L,2),sq:e.target(B,U,2),sw:e.target(B,U,2)}}function g(v,L,B,U,Z,Y,S,f){R(Y,S);const m=Object.assign({},an,v),E=t,C=a,O=Y/m.printW,J=(m.layers||[]).slice(0,5),_=J.length,q=ot(m.seed*6151+3),N=Ce(m.srcPaper||[1,1,1]).map(h=>Math.max(h,.02)),te=h=>Ce(ce(h)).map((j,K)=>Math.min(1,j/N[K])),Q=[],ae=[],ge=[],I=[],w=[],A=[],M=[];let V=0;for(let h=0;h<5;h++){const j=J[h]||{kind:0,thr:2,hex:"#000000"};Q.push(j.kind|0),ae.push(j.thr==null?.5:j.thr),ge.push(j.ch==null?-1:j.ch),w.push(j.op==null?.97:j.op),I.push(...Ce(ce(j.hex))),A.push(...j.key?te(j.key):[1,1,1]),h<_&&j.kind===1&&(V=h+1);const K=q()*Math.PI*2,W=m.misreg*Math.sqrt(q());M.push(Math.cos(K)*W,Math.sin(K)*W)}const G=m.maps||{drip:null,bridge:null,cloud:null};G!==i&&(e.texFrom(G.drip||x(),{},l),e.texFrom(G.bridge||x(),{},r),e.texFrom(G.cloud||x(),{},d),i=G);const k=G.drip?Math.max(.03,Math.min(.5,.5*G.drip.width/Y)):.5,T=m.accKey?te(m.accKey):[1,1,1],y=J.some(h=>h.kind===3)?1:0,F=Ce(ce(m.support)),$=Ce(ce(m.cloudHex||"#f4f4f0")),D=(h,j,K,W)=>e.run(h,j,K,re=>{re.f("uOff",0,0),re.f("uImg",Y,S),W(re)});D("PREP",e.PR.prep,L.prep,h=>{h.t("uSrc",B),h.f("uSrcRes",U,Z),h.f("uSmoothPx",m.smooth*U/m.printW),h.f("uSrcPaper",...m.srcPaper||[1,1,1]),h.f("uPaper",1,1,1)});const P=(h,j,K,W,re,fe)=>D(`BLUR ${h}`,e.PR.blur,K,Se=>{Se.t("uTexA",j.t[0]),Se.t("uTexB",j.t[j.t.length>1?1:0]),Se.f("uDir",W,re),Se.f("uSig",fe)}),b=Math.max(.05,m.cut*.5*O);P("cut H",L.prep,E.b1,1,0,b),P("cut V",E.b1,E.b2,0,1,b),D("SCUT",C.scut,E.sm,h=>{h.f("uPxMm",O),h.f("uSeed",m.seed),h.t("uSimp",E.b2.t[0]),h.t("uBr",r),h.i("uNL",_),h.i("uNK",V),h.i("uAccOn",y),h.iv("uKind",Q),h.iv("uCh",ge),h.fv("uThr",ae,1),h.fv("uKey",A,3),h.f("uAccK",T[0],T[1],T[2]),h.fv("uOffs",M,2),h.f("uFacet",m.facet),h.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,b))))});const z=Math.max(.3,m.liftMm*O/4);P("lift ¼ H",E.sm,L.qtmp,1,0,z),P("lift ¼ V",L.qtmp,E.sq,0,1,z),P("wide ¼ H",E.sq,L.qtmp,1,0,z*2),P("wide ¼ V",L.qtmp,E.sw,0,1,z*2),D("SPRAY",C.spray,L.comp,h=>{h.f("uPxMm",O),h.f("uSeed",m.seed),h.t("uMA",E.sm.t[0]),h.t("uMB",E.sm.t[1]),h.t("uQA",E.sq.t[0]),h.t("uQB",E.sq.t[1]),h.t("uWA",E.sw.t[0]),h.t("uWB",E.sw.t[1]),h.t("uDr",l),h.t("uCl",d),h.t("uSpT",p),h.i("uNL",_),h.i("uSup",m.supType|0),h.iv("uCh",ge),h.fv("uLc",I,3),h.fv("uOp",w,1),h.f("uSupLin",...F),h.f("uCloudLin",...$),h.f("uSupTex",m.supTex),h.f("uLift",m.lift),h.f("uOver",m.over),h.f("uLoad",m.load),h.f("uMist",m.mist),h.f("uDrop",m.drop),h.f("uCloud",G.cloud?m.cloud:0),h.f("uSpN",to),h.f("uTp",to/(143.36*m.drop*O)),h.f("uDrTp",k),h.f("uLiftScale",m.liftScale)}),D("SCAN",e.PR.scan,f?L.out:null,h=>{h.f("uSeed",m.seed),h.t("uComp",L.comp.t[0]),h.f("uBlurPx",m.scanBlur),h.f("uNoise",m.scanNoise),h.i("uNorm",0),h.f("uPaper",...F)})}return{render:g}}function Ie(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const mn=Ie(Ie(Yo," b+=texture(uTexB,uv+o2)*k;",""),"oA=a/w; oB=b/w;","oA=a/w; oB=vec4(0);"),aa=Ie(Ie(Ie(Ho,"float ba=eP, bs=length(oklabL(uPaper)-tSL);","float ba=eP, bs=length(oklabL(uPaper)-tSL); vec3 Da=vec3(0);"),"if(pass==0){ if(e<ba){ ba=e; Sa=S; } }","if(pass==0){ if(e<ba){ ba=e; Sa=S; Da=D; } }"),`  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD);
`,`  ivec3 bS=Sa; vec3 bD=Da; float e=ba;
  if(Ss.x>=0){ vec3 Ds=Da; float es=ba; if(Ss!=Sa) es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; bD=Ds; e=es; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){
`),Bo=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,na=Ie(Zo,Bo,Bo+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Do=1,Fo=2,Co=4,_o=8,dn=Ie(aa,"for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;","for(int it=0;it<3;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;"),vn=Ie(na,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),hn=Ie(ea,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),xn=Ie(Ie(Ie(Jo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),gn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,No=new Map,Io=(e,o)=>{let a=No.get(e);return a||(a=o(),No.set(e,a)),a};function bn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ot(e);t.lineCap="round";for(let s=0;s<2600;s++){const p=(.25+n()*n()*1.6)*85,l=n()*Math.PI*2,r=n()*1024,d=n()*1024,i=(n()-.5)*.9,c=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=c;for(const x of[-1024,0,1024])for(const R of[-1024,0,1024]){const g=r+x,v=d+R;g<-p-10||g>1024+p+10||v<-p-10||v>1024+p+10||(t.beginPath(),t.moveTo(g,v),t.quadraticCurveTo(g+Math.cos(l+i)*p*.5,v+Math.sin(l+i)*p*.5,g+Math.cos(l)*p,v+Math.sin(l)*p),t.stroke())}}return a}function kn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ot(e);t.lineCap="round",t.globalCompositeOperation="lighter";const s=1024/61;for(let p=0;p<70;p++){const l=n()<.7?"255,0,0":"0,255,0",r=(.4+n()*n()*3.5)*s,d=n()*Math.PI*2,i=n()*1024,c=n()*1024,x=(n()-.5)*1.6,R=(.015+n()*.03)*s;t.strokeStyle=`rgba(${l},${.35+n()*.5})`,t.lineWidth=Math.max(.6,R);for(const g of[-1024,0,1024])for(const v of[-1024,0,1024]){const L=i+g,B=c+v;L<-r||L>1024+r||B<-r||B>1024+r||(t.beginPath(),t.moveTo(L,B),t.bezierCurveTo(L+Math.cos(d+x)*r*.35,B+Math.sin(d+x)*r*.35,L+Math.cos(d-x)*r*.7,B+Math.sin(d-x)*r*.7,L+Math.cos(d)*r,B+Math.sin(d)*r),t.stroke())}}for(let p=0;p<160;p++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const l=(.02+n()*n()*.12)*s;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,l),0,7),t.fill()}return a}function ra(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);function s(w){const A=t.createProgram();for(const[G,k]of[[t.VERTEX_SHADER,_a],[t.FRAGMENT_SHADER,w]]){const T=t.createShader(G);if(t.shaderSource(T,k),t.compileShader(T),!t.getShaderParameter(T,t.COMPILE_STATUS)){const y=t.getShaderInfoLog(T);throw new Error(y??"shader compile error")}t.attachShader(A,T)}if(t.bindAttribLocation(A,0,"p"),t.linkProgram(A),!t.getProgramParameter(A,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(A)??"program link error");const M={},V=t.getProgramParameter(A,t.ACTIVE_UNIFORMS);for(let G=0;G<V;G++){const k=t.getActiveUniform(A,G);M[k.name.replace(/\[0\]$/,"")]=t.getUniformLocation(A,k.name)}return{p:A,u:M}}const p=new Map,l=w=>{let A=p.get(w);return A||(A=s(w),p.set(w,A)),A},r={fill:s(ja),sep0:s(Ho),lut:s(Na),prep:s(Ia),sep:s($a),blur:s(Yo),screen:s(Jo),spread:s(Zo),compose:s(qa),scan:s(ea)},d=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,d),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function i(w,A,{filter:M=t.LINEAR,wrap:V=t.CLAMP_TO_EDGE}={}){const G=t.createTexture();return t.bindTexture(t.TEXTURE_2D,G),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,w,A,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,V),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,V),G}function c(w,{filter:A=t.LINEAR,wrap:M=t.CLAMP_TO_EDGE,mip:V=!1}={},G=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,G),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,w),V&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,V?t.LINEAR_MIPMAP_LINEAR:A),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,A),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,M),G}function x(w,A,M=1){const V=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,V);const G=[];for(let k=0;k<M;k++){const T=i(w,A);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+k,t.TEXTURE_2D,T,0),G.push(T)}return t.drawBuffers(G.map((k,T)=>t.COLOR_ATTACHMENT0+T)),{f:V,t:G,w,h:A}}function R(w){w.t.forEach(A=>t.deleteTexture(A)),t.deleteFramebuffer(w.f)}const g=Wa(t);function v(w,A,M,V){const G=M?M.w:e.width,k=M?M.h:e.height;t.useProgram(A.p),t.bindFramebuffer(t.FRAMEBUFFER,M?M.f:null),t.viewport(0,0,G,k);let T=0;const y=A.u,F={t(D,P){y[D]!=null&&(t.activeTexture(t.TEXTURE0+T),t.bindTexture(t.TEXTURE_2D,P),t.uniform1i(y[D],T),T++)},f(D,...P){const b=y[D];b!=null&&(P.length===1?t.uniform1f(b,P[0]):P.length===2?t.uniform2f(b,P[0],P[1]):P.length===3?t.uniform3f(b,P[0],P[1],P[2]):t.uniform4f(b,P[0],P[1],P[2],P[3]))},i(D,P){y[D]!=null&&t.uniform1i(y[D],P)},fv(D,P,b){const z=y[D];if(z==null)return;const h=new Float32Array(P);b===1?t.uniform1fv(z,h):b===2?t.uniform2fv(z,h):t.uniform3fv(z,h)},m2(D,P){y[D]!=null&&t.uniformMatrix2fv(y[D],!1,new Float32Array(P))},iv(D,P){y[D]!=null&&t.uniform1iv(y[D],new Int32Array(P))}};F.f("uRes",G,k),V&&V(F);const $=g.mode==="off"?null:g.before(w,{w:G,h:k,att:M?M.t.length:1});t.drawArrays(t.TRIANGLES,0,3),g.mode!=="off"&&g.after(w,$)}const L=c(o.green,{wrap:t.REPEAT}),B={b:c(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:c(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:c(o.exLut)},U=c(Io("fib11",()=>bn(11)),{wrap:t.REPEAT,mip:!0}),Z=c(Io("inc23",()=>kn(23)),{wrap:t.REPEAT,mip:!0}),Y=w=>{w.t("uExB",B.b),w.t("uExR",B.r),w.t("uExLut",B.lut),w.f("uExBSize",B.bs[0],B.bs[1]),w.f("uExRSize",B.rs[0],B.rs[1]),w.f("uExPxMm",Ca)};let S=null,f=null;const m=x(1089,33,2);let E="";const C=t.createTexture();let O=0,J=0,_=null,q=0,N=0;function te(w,A){if(w===q&&A===N)return;q=w,N=A,_&&Object.values(_).forEach(R);const M=Math.max(1,w>>2),V=Math.max(1,A>>2);_={prep:x(w,A),sep:x(w,A,2),tmp:x(w,A,2),loc:x(w,A,2),qtmp:x(M,V,2),sol:x(M,V,2),scr:x(w,A,2),cov:x(w,A,2),comp:x(w,A),prepH:x(w,A),prepV:x(w,A),out:x(w,A)},e.width=w,e.height=A}const Q=t.getExtension("EXT_disjoint_timer_query_webgl2");let ae=null;function ge(){if(!Q||!ae||!t.getQueryParameter(ae,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(Q.GPU_DISJOINT_EXT)||(I.gpuMs=t.getQueryParameter(ae,t.QUERY_RESULT)/1e6),t.deleteQuery(ae),ae=null}const I={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:g,lastVariants:"",setSource(w,A=!0){O=w.width,J=w.height;const M=performance.now();c(w,{},C);const V=performance.now();A&&(t.bindTexture(t.TEXTURE_2D,C),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),I.lastUploadMs=V-M,I.lastMipMs=performance.now()-V},invalidateLut(){E=""},present(){if(!_)return;const w=_;v("PRESENT",l(gn),null,A=>{A.t("uT",w.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(w,A={}){const M=Object.assign({},za,w),V=A.preview??0,G=!!A.lossless||V!==0,k=(u,oe)=>V&u?"preview":G&&oe?"lossless":"lab";I.lastVariants=`blurPrep:${G?"lossless":"lab"} sep0:${k(Do,!0)} screen:${k(_o,!1)} spread:${k(Fo,!0)} scan:${k(Co,!1)}`;const T=performance.now();ge(),g.mode!=="off"&&g.frameStart();const y=Q&&!ae&&g.mode!=="timer"?t.createQuery():null;y&&t.beginQuery(Q.TIME_ELAPSED_EXT,y);let F=Math.round(M.printW*M.pxmm),$=Math.round(F*J/O);const D=Math.min(n,6144);if(Math.max(F,$)>D){const u=D/Math.max(F,$);F=Math.round(F*u),$=Math.round($*u)}const P=w.tech==="xerox"||w.tech==="stencil";P&&(F=Math.max(4,F&-4),$=Math.max(4,$&-4)),te(F,$),I.width=F,I.height=$;const b=_;if(P){const u={gl:t,compile:s,run:v,target:x,freeTarget:R,texFrom:c,greenTex:L,fibTex:U,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},oe={prep:b.prep,qtmp:b.qtmp,comp:b.comp,out:b.out};return w.tech==="stencil"?(f??=pn(u)).render(w,oe,C,O,J,F,$,!!A.toTexture):(S??=en(u)).render(w,oe,C,O,J,F,$,!!A.toTexture),I.lastVariants=w.tech??"xerox",y&&(t.endQuery(Q.TIME_ELAPSED_EXT),ae=y),t.flush(),I.lastMs=performance.now()-T,I}const z=F/M.printW,h=Ce(ce(M.paper)),j=Math.min(rt,M.inks.length),K=M.inks.concat(Array(rt).fill("#000000")).slice(0,rt),W=M.opac.concat(Array(rt).fill(.15)).slice(0,rt),re=[];for(let u=0;u<rt;u++)re.push(...Ce(ce(zt(K[u]))));const fe=K.map(u=>pe(ce(zt(u)))[0]<.42?0:1),Se=pe(ce(M.paper)),Re=K.map(u=>Math.min(1.5,Pa(pe(ce(zt(u))),Se)/.5)),me=JSON.stringify([K,W,j,M.paper,M.inkCost,M.pair]);me!==E&&(v("LUT",r.lut,m,u=>{u.fv("uCon",Re,1),u.fv("uInk",re,3),u.fv("uOp",W,1),u.i("uN",j),u.f("uPaper",...h),u.f("uCost",M.inkCost),u.f("uPair",M.pair)}),E=me),v("PREP",r.prep,b.prep,u=>{u.t("uSrc",C),u.f("uSrcRes",O,J),u.f("uSmoothPx",M.smooth*O/M.printW),u.f("uSrcPaper",...M.srcPaper),u.f("uPaper",...h)});const le=ot(M.seed*7919+13),Ee=[],We=[];for(let u=0;u<rt;u++){const oe=(le()*2-1)*M.rot*Math.PI/180,ie=1+(le()*2-1)*M.scl/1e3,Me=Math.cos(oe)*ie,Ge=Math.sin(oe)*ie;Ee.push(Me,Ge,-Ge,Me);const be=le()*Math.PI*2,lt=M.misreg*Math.sqrt(le());We.push(Math.cos(be)*lt,Math.sin(be)*lt)}let ee;if(G){const u=l(mn);v("BLUR prep H",u,b.prepH,oe=>{oe.t("uTexA",b.prep.t[0]),oe.f("uDir",1,0),oe.f("uSig",.3*z)}),v("BLUR prep V",u,b.prepV,oe=>{oe.t("uTexA",b.prepH.t[0]),oe.f("uDir",0,1),oe.f("uSig",.3*z)}),ee=b.prepV.t[0]}else v("BLUR prep H",r.blur,b.loc,u=>{u.t("uTexA",b.prep.t[0]),u.t("uTexB",b.prep.t[0]),u.f("uDir",1,0),u.f("uSig",.3*z)}),v("BLUR prep V",r.blur,b.scr,u=>{u.t("uTexA",b.loc.t[0]),u.t("uTexB",b.loc.t[0]),u.f("uDir",0,1),u.f("uSig",.3*z)}),ee=b.scr.t[0];v("SEP0",V&Do?l(dn):G?l(aa):r.sep0,b.tmp,u=>{u.t("uPrepS",ee),u.t("uPrep",b.prep.t[0]),u.t("uSet",m.t[0]),u.fv("uCon",Re,1),u.fv("uInk",re,3),u.fv("uOp",W,1),u.i("uN",j),u.f("uPaper",...h),u.f("uCost",M.inkCost),u.f("uPair",M.pair),u.f("uMinDot",M.minDot),u.f("uSingle",M.single)});const ze=Math.max(.2,M.misreg*.9+.12),ye=Math.max(.3,ze*z/4);v("BLUR fill ¼ H",r.blur,b.qtmp,u=>{u.t("uTexA",b.tmp.t[0]),u.t("uTexB",b.tmp.t[1]),u.f("uDir",1,0),u.f("uSig",ye)}),v("BLUR fill ¼ V",r.blur,b.sol,u=>{u.t("uTexA",b.qtmp.t[0]),u.t("uTexB",b.qtmp.t[1]),u.f("uDir",0,1),u.f("uSig",ye)}),v("FILL",r.fill,b.loc,u=>{u.t("uRawA",b.tmp.t[0]),u.t("uRawB",b.tmp.t[1]),u.t("uWA",b.sol.t[0]),u.t("uWB",b.sol.t[1]),u.i("uN",j),u.f("uFill",M.fill)}),v("WARP",r.sep,b.sep,u=>{u.f("uPxMm",z),u.t("uSA",b.loc.t[0]),u.t("uSB",b.loc.t[1]),u.i("uN",j),u.f("uCtr",M.printW/2,$/z/2),u.m2("uM",Ee),u.fv("uT",We,2)});const de=(u,oe,ie,Me,Ge)=>{v(`BLUR ${u} H`,r.blur,ie,be=>{be.t("uTexA",oe.t[0]),be.t("uTexB",oe.t[1]),be.f("uDir",1,0),be.f("uSig",Ge)}),v(`BLUR ${u} V`,r.blur,Me,be=>{be.t("uTexA",ie.t[0]),be.t("uTexB",ie.t[1]),be.f("uDir",0,1),be.f("uSig",Ge)})};return de("loc",b.sep,b.tmp,b.loc,.22*z),de("sol ¼",b.sep,b.qtmp,b.sol,1.5*z/4),v("SCREEN",V&_o?l(xn):r.screen,b.scr,u=>{Y(u),u.f("uPxMm",z),u.f("uSeed",M.seed),u.t("uSepA",b.sep.t[0]),u.t("uSepB",b.sep.t[1]),u.t("uSolA",b.sol.t[0]),u.t("uSolB",b.sol.t[1]),u.t("uLocA",b.loc.t[0]),u.t("uLocB",b.loc.t[1]),u.t("uGreen",L),u.i("uN",j),u.i("uMode",+M.screen),u.f("uGrain",M.grain),u.f("uLoad",M.inkLoad),u.f("uLpi",M.lpi),u.f("uMottle",M.mottle),u.f("uStarve",M.starve),u.f("uTexAmp",M.texAmp),u.f("uStreak",M.streak),u.f("uSolidLv",M.solidLv),u.fv("uExSel",fe,1),u.f("uTrap",M.trap)}),v("SPREAD",V&Fo?l(vn):G?l(na):r.spread,b.cov,u=>{Y(u),u.f("uPxMm",z),u.f("uSeed",M.seed),u.t("uScrA",b.scr.t[0]),u.t("uScrB",b.scr.t[1]),u.t("uSepA",b.sep.t[0]),u.t("uSepB",b.sep.t[1]),u.t("uLocA",b.loc.t[0]),u.t("uLocB",b.loc.t[1]),u.i("uN",j),u.f("uBleedPx",M.bleed*z),u.f("uGain",M.gain),u.f("uEdge",M.edge),u.f("uSolidLv",M.solidLv),u.fv("uExSel",fe,1)}),v("COMPOSE",r.compose,b.comp,u=>{Y(u),u.f("uPxMm",z),u.f("uSeed",M.seed),u.t("uCovA",b.cov.t[0]),u.t("uCovB",b.cov.t[1]),u.t("uSolA",b.sol.t[0]),u.t("uSolB",b.sol.t[1]),u.f("uStarve",M.starve),u.t("uFib",U),u.t("uInc",Z),u.i("uN",j),u.fv("uInk",re,3),u.fv("uOp",W,1),u.f("uPaper",...h),u.f("uPaperTex",M.paperTex),u.f("uFibers",M.fibers),u.f("uIncl",M.incl),u.f("uVoids",M.voids),u.f("uMottle",M.mottle),u.f("uTexAmp",M.texAmp),u.fv("uExSel",fe,1)}),v("SCAN",V&Co?l(hn):r.scan,A.toTexture?b.out:null,u=>{u.f("uSeed",M.seed),u.t("uComp",b.comp.t[0]),u.f("uBlurPx",M.scanBlur),u.f("uNoise",M.scanNoise),u.i("uNorm",+M.normWhite),u.f("uPaper",...h)}),y&&(t.endQuery(Q.TIME_ELAPSED_EXT),ae=y),t.flush(),I.lastMs=performance.now()-T,I}};return I}const sa=new URLSearchParams(window.location.search),ht=sa.get("srdebug")==="1",he=ht?sa:new URLSearchParams,Sn=["srres","srpipe","srhold","srpreview","srprevmask"],X={preserveDrawingBuffer:he.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(he.get("srres"))||1)),mip:he.get("srmip")!=="0",bypass:he.get("srbypass")==="1",darkPaperFromBase:he.get("srdarkpaper")==="bg",simUpload:he.get("srsim")==="1",offscreenBack:he.get("sroff")==="1",bitmapUpload:he.get("srbitmap")==="1",pipe:he.get("srpipe")==="2"?2:he.get("srpipe")==="1"?1:0,hold:he.get("srhold")==="1",lossless:he.get("srlossless")!=="0",preview:he.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(he.get("srprevmask"))||0)),auto:!Sn.some(e=>he.has(e)),forceLevel:he.get("srlevel")==="preview"?"preview":he.get("srlevel")==="full"?"full":null},ia={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},H={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},nt={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},Ot=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==X.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==X.offscreenBack;Object.assign(X,e),(o||a)&&nt.recreateEngine()},jo=5,$o=30,yn=12,Mn=300,oo=new Map;let je=null,Tt="";const ca=(e,o)=>`${e}×${o}`;function Pn(e,o){if(X.forceLevel)return eo(X.forceLevel==="preview"),X.forceLevel;const a=oo.get(ca(e,o));return a?(eo(a==="preview"),a):"detect"}function qo(e,o,a,t){const n=ca(e,o);if((!je||je.size!==n)&&(je={size:n,seen:0,samples:[]}),++je.seen>jo+3*$o&&!je.samples.length){oo.set(n,"full"),je=null,Tt=`${n}: sin medida (${t}) → full`;return}if(je.seen<=jo||a===null||(je.samples.push(a),je.samples.length<$o))return;const s=[...je.samples].sort((r,d)=>r-d),p=s[s.length>>1],l=p>yn?"preview":"full";oo.set(n,l),je=null,Tt=`${n}: coste p50 ${p.toFixed(1)} ms (${t}) → ${l}`,eo(l==="preview"),ht&&console.info(`[SuperRiso] quality level ${Tt}`)}const wn=()=>Tt;let gt=null,Wt=null,zo=0,la="";function En(e,o,a){return!!e&&!!gt&&o===Wt&&e.length===gt.length&&e.every((n,s)=>n===gt[s])||(zo=a,la=o!==Wt?"scene":(e??[]).map((n,s)=>n===gt?.[s]?"":s).filter(n=>n!=="").join(",")),gt=e??null,Wt=o,a-zo}const ua=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Gt(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:s,seed:p}){const[l,r]=ua(e.width,e.height,t),d=document.createElement("canvas");d.width=l,d.height=r;const i=d.getContext("2d",{willReadFrequently:!0});i.fillStyle="#fff",i.fillRect(0,0,l,r),i.drawImage(e,0,0,l,r);const c=i.getImageData(0,0,l,r).data,x=pe(a),R=new Int8Array(l*r).fill(-1),g=l*r;if(t){const S=new Uint8Array(g);for(let _=0;_<g;_++){const q=pe([c[_*4]/255,c[_*4+1]/255,c[_*4+2]/255]);S[_]=x[0]-q[0]>.14?1:0}const f=new Uint8Array(S);for(let _=0;_<r;_++)for(let q=0;q<l;q++){if(!S[_*l+q])continue;const N=_*l+q;q>0&&(f[N-1]=1),q<l-1&&(f[N+1]=1),_>0&&(f[N-l]=1),_<r-1&&(f[N+l]=1)}const m=new Int32Array(g).fill(-1),E=new Int32Array(g),C=ot((p|0)*977+13);let O=0;const J=Math.max(6,g*12e-5);for(let _=0;_<g;_++){if(f[_]||m[_]>=0)continue;let q=0;E[q++]=_,m[_]=O;const N=[];let te=!1;for(;q;){const I=E[--q];N.push(I);const w=I%l,A=I/l|0;(w===0||A===0||w===l-1||A===r-1)&&(te=!0),w>0&&!f[I-1]&&m[I-1]<0&&(m[I-1]=O,E[q++]=I-1),w<l-1&&!f[I+1]&&m[I+1]<0&&(m[I+1]=O,E[q++]=I+1),A>0&&!f[I-l]&&m[I-l]<0&&(m[I-l]=O,E[q++]=I-l),A<r-1&&!f[I+l]&&m[I+l]<0&&(m[I+l]=O,E[q++]=I+l)}O++;const Q=C(),ae=C();if(N.length<J||te&&N.length>g*.05||Q>s)continue;const ge=Math.min(n-1,Math.floor(ae*n));for(const I of N)R[I]=ge}for(let _=0;_<3;_++){const q=new Int8Array(R);for(let N=0;N<r;N++)for(let te=0;te<l;te++){const Q=N*l+te;if(q[Q]>=0||!f[Q])continue;const ae=te>0&&q[Q-1]>=0?q[Q-1]:te<l-1&&q[Q+1]>=0?q[Q+1]:N>0&&q[Q-l]>=0?q[Q-l]:N<r-1&&q[Q+l]>=0?q[Q+l]:-1;ae>=0&&(R[Q]=ae)}}}else{const S=o.map(f=>pe(ce(f)));for(let f=0;f<g;f++){const m=pe([c[f*4]/255,c[f*4+1]/255,c[f*4+2]/255]),E=Math.hypot(m[0]-x[0],m[1]-x[1],m[2]-x[2]),C=Math.hypot(m[1],m[2]);if(!(E>.08&&(m[0]>.32||C>.12)))continue;let O=-1,J=1e9;for(let _=0;_<S.length;_++){const q=(S[_][0]-m[0])*.6,N=S[_][1]-m[1],te=S[_][2]-m[2],Q=q*q+N*N+te*te;Q<J&&(J=Q,O=_)}J<.045&&(R[f]=O)}}let v=null;if(t){v=document.createElement("canvas"),v.width=l,v.height=r;const S=v.getContext("2d"),f=S.createImageData(l,r);for(let m=0;m<g;m++)f.data[m*4]=(R[m]+1)*36,f.data[m*4+3]=255;S.putImageData(f,0,0)}const L=new Int32Array(g).fill(-1),B=i.createImageData(l,r),U=new Int32Array(g);for(let S=0;S<g;S++)B.data[S*4]=255,B.data[S*4+1]=128,B.data[S*4+2]=0,B.data[S*4+3]=255;let Z=0;for(let S=0;S<g;S++){if(R[S]<0||L[S]>=0)continue;const f=R[S];let m=0;U[m++]=S,L[S]=Z;const E=[];let C=0,O=0,J=0,_=0,q=0,N=0;for(;m;){const P=U[--m];E.push(P);const b=P%l,z=P/l|0;C++,O+=b,J+=z,_+=b*b,q+=z*z,N+=b*z,b>0&&R[P-1]===f&&L[P-1]<0&&(L[P-1]=Z,U[m++]=P-1),b<l-1&&R[P+1]===f&&L[P+1]<0&&(L[P+1]=Z,U[m++]=P+1),z>0&&R[P-l]===f&&L[P-l]<0&&(L[P-l]=Z,U[m++]=P-l),z<r-1&&R[P+l]===f&&L[P+l]<0&&(L[P+l]=Z,U[m++]=P+l)}if(Z++,C<6)continue;const te=O/C,Q=J/C,ae=_/C-te*te,ge=q/C-Q*Q,I=N/C-te*Q,w=.5*Math.atan2(2*I,ae-ge),A=ae+ge,M=ae*ge-I*I,V=Math.sqrt(Math.max(0,A*A/4-M)),G=A/2+V,k=Math.max(1e-6,A/2-V),T=Math.sqrt(k/G),y=Math.max(0,Math.min(1,(.62-T)/.3)),F=Math.round(127.5+127.5*Math.cos(2*w)),$=Math.round(127.5+127.5*Math.sin(2*w)),D=Math.round(255*y);for(const P of E)B.data[P*4]=F,B.data[P*4+1]=$,B.data[P*4+2]=D}const Y=new Uint8ClampedArray(B.data);for(let S=0;S<2;S++){const f=new Uint8ClampedArray(Y);for(let m=0;m<r;m++)for(let E=0;E<l;E++){const C=m*l+E;if(!(f[C*4+2]>0))for(const[O,J]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=E+O,q=m+J;if(_<0||q<0||_>=l||q>=r)continue;const N=q*l+_;if(f[N*4+2]>0){Y[C*4]=f[N*4],Y[C*4+1]=f[N*4+1],Y[C*4+2]=f[N*4+2];break}}}}return B.data.set(Y),i.putImageData(B,0,0),{ori:d,ids:v}}const fa=300;let _e=null,ao=0,Xt=!1;const ut=document.createElement("canvas"),An=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:fa}):setTimeout(e,0)},Tn=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),Ln=()=>ao;function Rn(e,o,a,t,n,s,p){const l=o.what==="fill",r={keys:l?[]:o.keys??o.paint,srcPaper:t,fill:l,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Gt(e,r);const d=JSON.stringify([l,r.keys,r.nk,l?r.cover:0,l?r.seed:0,t]),i=performance.now(),c={motion:s&&[...s],scene:p};if(!_e||_e.key!==d)return _e={key:d,maps:Gt(e,r),at:i,sig:c},ao++,_e.maps;if(!Xt&&i-_e.at>=fa&&!Tn(c,_e.sig)){const[x,R]=ua(e.width,e.height,l);(ut.width!==x||ut.height!==R)&&(ut.width=x,ut.height=R),ut.getContext("2d").drawImage(e,0,0,x,R),Xt=!0,_e.at=i,_e.sig=c,An(()=>{Xt=!1,!(!_e||_e.key!==d)&&(_e.maps=Gt(ut,r),ao++)})}return _e.maps}const no=300,Bn=200,Dn=e=>pe(ce(e))[0]<.3?.995:.97;function Uo(e){const o=pe(ce(e));let a=To[0][1],t=1e9;for(const[,n]of To){const s=pe(ce(n)),p=Math.hypot(o[0]-s[0],2*(o[1]-s[1]),2*(o[2]-s[2]));p<t&&(t=p,a=n)}return a}const Fn=e=>pe(e)[0]>.8?e:[1,1,1];function Cn(e,o,a){const t=(e.dark-.5)*.5,n=r=>Math.max(.03,Math.min(.95,r));let s=[],p=null;if(e.mode==="tone"){const r=e.n;s=a(r).map((i,c)=>({kind:0,thr:n(i-t),hex:Ea[r][c]})),e.accent&&o.length&&(p=o[0],s.push({kind:3,hex:e.colors==="own"?o[0]:Uo(o[0])}))}else s=o.slice(0,e.n).sort((d,i)=>pe(ce(i))[0]-pe(ce(d))[0]).map(d=>({kind:1,key:d,hex:e.colors==="own"?d:Uo(d)})),s.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===s.length&&s.forEach((r,d)=>{r.hex=e.manual[d]}),s.forEach(r=>{r.op=Dn(r.hex)}),s.map((r,d)=>d).filter(r=>s[r].kind!==3).slice(-3).forEach((r,d)=>{s[r].ch=d}),{layers:s,accKey:p}}const Vt=new Map;let st=null,Et=null,Oo=0;const ro=e=>e?[...e.slice(0,7),e[9]??0]:null;function _n(e,o){const a=ro(e);return(!a||!Et||a.length!==Et.length||a.some((t,n)=>t!==Et[n]))&&(Et=a,Oo=o),!!a&&o-Oo>=Bn}let xe=null,At=null,Kt=!1,so=0;const ft=document.createElement("canvas"),Nn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:no}):setTimeout(e,0)},In=()=>so;function jn(e,o,a,t){const n=Fn(e.srcPaper),s=performance.now(),p=e.isLive?_n(e.motion,s):!0,l=wa(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&p){const v=ro(e.motion);(!st||st.scene!==e.scene||!v||!st.cam||v.some((B,U)=>B!==st.cam[U]))&&(!st||s-st.at>=no)&&(Vt.clear(),st={scene:e.scene,cam:v,at:s})}const r=v=>{const L=`${v}|${n.join(",")}|${e.bg.join(",")}`;let B=Vt.get(L);return B||(B=fn(o,n,v,e.bg),Vt.set(L,B)),B},{layers:d,accKey:i}=Cn(e.s,l,r),c={layers:d,accKey:i,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:d,accKey:i,maps:Ro(o,c),srcPaper:n};const x=JSON.stringify([d.map(v=>[v.kind,v.thr,v.key,v.ch]),i,c.cut,c.bridges,c.drips,c.splat,c.cloud,t,c.printW,n]),R=ro(e.motion),g=!xe||xe.key!==x||xe.scene!==e.scene||!R||!xe.cam||R.some((v,L)=>v!==xe.cam[L]);if(g&&(p||!xe||xe.key!==x)&&!Kt&&(!xe||s-xe.at>=no)){const v=Math.min(1,1024/Math.max(o.width,o.height)),L=Math.max(8,Math.round(o.width*v)),B=Math.max(8,Math.round(o.height*v));(ft.width!==L||ft.height!==B)&&(ft.width=L,ft.height=B),ft.getContext("2d").drawImage(o,0,0,L,B),Kt=!0;const U=e.scene;xe&&(xe.at=s),Nn(()=>{Kt=!1,xe={key:x,maps:Ro(ft,c),at:performance.now(),cam:R,scene:U},so++})}return xe?p&&!g?{layers:d,accKey:i,maps:xe.maps,srcPaper:n}:((!At||At.src!==xe.maps)&&(At={src:xe.maps,maps:{drip:null,bridge:null,cloud:xe.maps.cloud}},so++),{layers:d,accKey:i,maps:At.maps,srcPaper:n}):{layers:d,accKey:i,maps:null,srcPaper:n}}const $n=2400,qn=240,yt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function Ve(e,o){const a=yt[e];a.push(o),a.length>$n&&a.shift()}function Be(e,o,a){const t=yt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((s,p)=>s-p);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function xo(e=qn){const o=yt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:Be("interval",.5,e),frameP95:Be("interval",.95,e),totalP50:Be("total",.5,e),totalP95:Be("total",.95,e),flatP50:Be("flat",.5,e),uploadP50:Be("upload",.5,e),uploadP95:Be("upload",.95,e),mipP50:Be("mip",.5,e),renderP50:Be("render",.5,e),backP50:Be("back",.5,e),bitmapWaitP50:Be("bitmapWait",.5,e),gpuP50:Be("gpu",.5,e),gpuP95:Be("gpu",.95,e)}}function pa(){for(const e of Object.keys(yt))yt[e].length=0}let pt=null,bt=null,Ze=null,et=null,Qe=null,ma="",io="";function da(e){ma=e}function Qt(e){io=e,Ze&&(Ze.textContent=e,Ze.style.display=e?"block":"none")}function Wo(e){Qe&&(Qe.disabled=e,Qe.style.opacity=e?".5":"1")}const Ne=(e,o=1)=>e===null?"–":e.toFixed(o),co=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function zn(e){if(!et)return;et.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",co(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((p,l)=>setTimeout(()=>l(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const s=document.createElement("button");s.textContent="Cerrar",co(s),s.onclick=()=>{et&&(et.textContent="")},a.append(n,s,t),et.append(o,a)}function Un(e){pt||typeof document>"u"||(pt=document.createElement("div"),pt.setAttribute("data-superriso-overlay",""),Object.assign(pt.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),et=document.createElement("div"),et.style.pointerEvents="auto",Ze=document.createElement("div"),Object.assign(Ze.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Qe=document.createElement("button"),Qe.textContent="Medir",co(Qe),Qe.style.pointerEvents="auto",Qe.onclick=e,bt=document.createElement("div"),Object.assign(bt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),pt.append(et,Ze,Qe,bt),document.body.appendChild(pt),setInterval(()=>{if(!bt)return;const o=xo();bt.textContent=`${ma}
fps ${Ne(o.fps)} · frame p50 ${Ne(o.frameP50)} p95 ${Ne(o.frameP95)} ms
SR p50 ${Ne(o.totalP50)} p95 ${Ne(o.totalP95)} ms (aplanado ${Ne(o.flatP50)} · subida ${Ne(o.uploadP50)} · mip ${Ne(o.mipP50)} · motor ${Ne(o.renderP50)} · vuelta ${Ne(o.backP50)})
GPU motor p50 ${Ne(o.gpuP50)} p95 ${Ne(o.gpuP95)} ms`,io&&Ze&&(Ze.textContent=io)},500))}const Pt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function va(e){return e&&Pt?new OffscreenCanvas(1,1):document.createElement("canvas")}const go=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,bo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},Oe=bo(),lo=bo();function mt(e,o,a,t,n,s){const{canvas:p,ctx:l}=e;return(p.width!==a||p.height!==t)&&(p.width=a,p.height=t),l.setTransform(1,0,0,1,0,0),l.globalAlpha=1,l.globalCompositeOperation="source-over",l.fillStyle=n,l.fillRect(0,0,a,t),l.globalCompositeOperation=s?"source-over":"multiply",l.imageSmoothingEnabled=!0,l.imageSmoothingQuality="medium",l.drawImage(o,0,0,a,t),l.globalCompositeOperation="source-over",p}let Te=null,Ht=!1,Go=0;function On(e,o,a){Go++;const t=Go;let n=null;if(Te&&Te.bmp.width===o&&Te.bmp.height===a?n={bmp:Te.bmp,lag:t-Te.frame}:Te&&Te.bmp.close(),Te=null,!Ht){Ht=!0;const s=performance.now();createImageBitmap(e).then(p=>{Ve("bitmapWait",performance.now()-s),Te&&Te.bmp.close(),Te={bmp:p,frame:t}}).catch(()=>{}).finally(()=>{Ht=!1})}return n}function Wn(){Te&&Te.bmp.close(),Te=null}function ct(e,o,a,t,n,s,p){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!p,e.drawImage(o,0,0,a,t,0,0,n,s)}finally{e.restore()}}function Rt(e,o,a,t,n,s,p){const l=go(o)?o.transferToImageBitmap():null;try{ct(e,l??o,a,t,n,s,p)}finally{l?.close()}}const Je=bo();let ko=!1;function So(e,o,a){const t=go(e)?e.transferToImageBitmap():null;try{return(Je.canvas.width!==o||Je.canvas.height!==a)&&(Je.canvas.width=o,Je.canvas.height=a),Je.ctx.globalCompositeOperation="copy",Je.ctx.drawImage(t??e,0,0),ko=!0,Je.canvas}finally{t?.close()}}const Lt=()=>ko?Je.canvas:null,uo=()=>{ko=!1},Bt=()=>({res:1,sim:!1,preview:0,lossless:X.lossless,pipe:0,hold:!1,holdFps:12});function ha(e,o,a){if(!X.auto)return{m:{res:X.resScale,sim:X.simUpload,preview:X.preview,lossless:X.lossless,pipe:X.pipe,hold:X.hold,holdFps:12},level:"manual"};const t=Pn(e,o);return t!=="preview"?{m:Bt(),level:t}:a.fullQuality?{m:{...Bt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:X.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const Gn=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),vt={inks:null,params:null};function Dt(e,o,a,t){const{settings:n,isDarkMode:s,isPixelArt:p}=a,l=n.technique==="xerox",r=n.technique==="stencil",d=l?Za(n.xerox,e*t.res,n.resolution):r?rn(n.stencil,e*t.res,n.resolution):Oa(n,e*t.res),i=Math.round(240*d.pxmm),c=Math.round(i*o/e),x=t.sim?Math.min(e,i):e,R=t.sim?Math.min(o,c):o,g=Ba(s,p),v=s&&!X.darkPaperFromBase,L=v?[1,1,1]:ce(g),B=l?Aa(n,a.shapes,a.hiddenLayers,L,v?g:null):null;B&&a.isLive&&Ta({rows:B.rows,what:B.what,zones:B.zones});const U=B?{inks:B.paint,names:B.rows.map(f=>f.id??""),opac:[],srcPaper:L}:r?{inks:[],names:[],opac:[],srcPaper:L}:La(a.shapes,a.hiddenLayers,n,L,v?g:null,!0);a.isLive&&(vt.inks=U);const Z=[e,o,+s,+p,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+X.mip,+X.offscreenBack,+X.preserveDrawingBuffer,+X.darkPaperFromBase,n.technique,...B?[n.resolution,JSON.stringify(n.xerox),(B.keys??[]).join(","),Ln()]:r?[n.resolution,JSON.stringify(n.stencil),In()]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],U.inks.join(",")].join("|"),Y=B?{x:n.xerox,mk:B,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0,S=r?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:L,darkBase:v?g:null,bg:ce(g),isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:d,fw:x,fh:R,base:g,srcPaper:L,inks:U,key:Z,xerox:Y,stencil:S}}function dt(e){const o=e.stencil;if(o){const n=jn(o,(o.isLive?Oe:lo).canvas,e.style,1);return o.isLive&&Ra(n.layers.map(s=>({hex:s.hex,kind:s.kind}))),vt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return vt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:Rn((a.isLive?Oe:lo).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return vt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const It=e=>e%9999+1,Mt=e=>Math.floor(performance.now()*e/1e3);function Ft(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):Mt(o)}const tt=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Ct=null;const Xo=()=>{Ct?.destroy(),Ct=null};function Xn(e,o,a,t,n){const s=performance.now(),p=t.exportFrame,l=!p||p.index===0,r=!p||p.index>=p.count-1;try{l&&Xo();const d=Ct??(Ct=ra(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),i=Bt(),c=Dt(o,a,t,i),x=mt(lo,e.canvas,c.fw,c.fh,c.base,t.isDarkMode);return d.setSource(x,!0),d.render({...dt(c),seed:It(Ft(t))},tt(i)),d.gl.isContextLost()?!1:(Rt(e,d.canvas,d.width,d.height,o,a,!!c.style.crisp),ht&&console.info(`[SuperRiso] export frame ${p?`${p.index+1}/${p.count}`:"single"} ${o}×${a} → sim ${d.width}×${d.height}: ${(performance.now()-s).toFixed(1)} ms · ${d.lastVariants}`),!0)}finally{r&&Xo()}}const fo=2e3,xa=8e3,po=60,Vo=8,it={...ia,simUpload:!0,auto:!1,lossless:!1},St=e=>new Promise(o=>setTimeout(o,e)),He=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function Vn(){let o=nt.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),s=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:s}}function Kn(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,s=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,l])=>l!==null).sort((l,r)=>r[1]-l[1])[0],p=[];return s&&s[1]>=3&&p.push(`${s[0]} ${He(s[1])} ms`),t!==null&&t>=3&&p.push(`fuera de nuestras etapas ${He(t)} ms`),p.length?p.join(" + "):"sin espera apreciable"}async function Ko(e){const o=nt.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const s=o.report().find(p=>p.name==="SCAN");if(s&&s.n>=po)break;await St(100)}e==="timer"&&(await St(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(s=>s.p50!==null).sort((s,p)=>p.p50-s.p50).map(s=>s.name);return{mode:e,lines:t.map(s=>`  ${s.name.padEnd(13)} ${`${s.info.w}×${s.info.h}`.padEnd(10)} att ${s.info.att}  p50 ${He(s.p50,3).padStart(7)} ms  #${n.indexOf(s.name)+1}  (n=${s.n})`)}}function Qn(e,o,a,t,n){const s=Vn(),p=e.find(d=>d.id==="A")?.s.frameP50??null,l=nt.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Da} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${H.canvasW}×${H.canvasH} · simulación (última) ${l?`${l.width}×${l.height}`:"–"}`),r.push(`GPU: ${s.renderer} · MAX_TEXTURE_SIZE ${s.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${Pt?"sí":"no"}`),r.push(`Modo ${H.isDark?"oscuro":"claro"} · preset de cámara: ${H.preset||"–"} (velocidad ${H.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const d of a)r.push(`AVISO: ${d}`);r.push(`Cada fila: ${fo/1e3} s de calentamiento descartados + ${xa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const d of e){const i=d.s,c=R=>He(R,2).padStart(6),x=!d.patch.bypass&&i.frameP50!==null&&p!==null&&i.totalP50!==null?i.frameP50-p-i.totalP50:null;r.push(`${(d.id+" "+d.label).padEnd(20)}${He(i.fps).padStart(5)}  ${(He(i.frameP50)+"/"+He(i.frameP95)).padEnd(11)} |${c(i.totalP50)}${c(i.flatP50)} ${c(i.uploadP50)}${c(i.uploadP95)}${c(i.mipP50)}${c(i.renderP50)}${c(i.backP50)} |${c(x)}    |${c(i.gpuP50)}  ${d.res.padEnd(10)}  ${d.n.pipe}/${d.n.sync}/${d.n.held}  (n=${i.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const d of e)d.patch.bypass||r.push(`  ${d.id} ${d.label}: ${Kn(d,p)}`);for(const d of n)d&&(r.push(""),r.push(d.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, temporizador de GPU por pasada:`),d.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...d.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Hn(){if(Yt)return;const e=[],o=performance.now()-H.lastCallAt;if(H.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):H.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,Wo(!0);const a={...X},t=[],n=[];let s=!1,p="–",l=0;const r=async d=>{Qt(`Midiendo ${d.id} (${++l}/${Vo})…`),Ot(d.patch),await St(fo),pa();const i={pipe:H.pipeFrames,sync:H.pipeSyncFrames,held:H.heldFrames};await St(xa);const c=xo(1/0);c.gpuP50!==null&&(s=!0);const x={pipe:H.pipeFrames-i.pipe,sync:H.pipeSyncFrames-i.sync,held:H.heldFrames-i.held},R=nt.engineInfo(),g={id:d.id,label:d.label,res:d.patch.bypass||!R?"–":`${R.width}×${R.height}`,s:c,patch:d.patch,n:x};return t.push(g),g};try{await r({id:"A",label:"bypass",patch:{...ia,bypass:!0,auto:!1}});const d=await r({id:"B",label:".75 pipe1",patch:{...it,resScale:.75,pipe:1}}),i=await r({id:"C",label:".75 pipe2",patch:{...it,resScale:.75,pipe:2}}),c=(i.s.frameP50??1e9)<(d.s.frameP50??1e9)?2:1;p=`pipe${c} (${c===2?"C":"B"}: frame p50 ${He(c===2?i.s.frameP50:d.s.frameP50)} ms frente a ${He(c===2?d.s.frameP50:i.s.frameP50)})`,await r({id:"D",label:`.75 pipe${c} lossless`,patch:{...it,resScale:.75,pipe:c,lossless:!0}}),await r({id:"E",label:`.75 pipe${c} preview`,patch:{...it,resScale:.75,pipe:c,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${c} preview`,patch:{...it,resScale:1,pipe:c,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${c} hold`,patch:{...it,resScale:.75,pipe:c,hold:!0}}),Qt(`Midiendo P (${++l}/${Vo})… perfilado por pasada`),Ot({...it,resScale:.75,pipe:1}),await St(fo),n.push(await Ko("sync")),n.push(await Ko("timer"))}finally{Ot(a),Qt(""),Wo(!1),Yt=!1}zn(Qn(t,s,e,p,n))}const Yn=["greennoise1024","ink_black","ink_red","ink_lut"];let jt=null,_t=!1,mo=!1,se=null,we=va(X.offscreenBack),Qo=X.preserveDrawingBuffer,Jt=0;const yo=(e,o)=>{_t||(_t=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},Jn=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(Yn.map(Jn)).then(([e,o,a,t])=>{jt={green:e,exBlack:o,exRed:a,exLut:t}}).catch(e=>yo("textures",e));const ga=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===we&&(mo=!0,se=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===we&&(mo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};ga(we);const ba=()=>{const e=we;se=null,Wn(),ke=null,$e=null,ue=null,De=null,Ke=null,Le=null,uo(),we=va(X.offscreenBack),ga(we),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};nt.recreateEngine=ba;nt.engineInfo=()=>se?{gl:se.gl,width:se.width,height:se.height}:null;nt.profiler=()=>se?se.profiler:null;const ka=()=>[`pdb ${X.preserveDrawingBuffer?"on":"off"}`,`mip ${X.mip?"on":"off"}`,X.bitmapUpload?"bitmap":"",X.offscreenBack?Pt?"offscreen":"offscreen→DOM":"",X.bypass?"BYPASS":""].filter(Boolean).join(" · ");ht&&(Un(()=>{Hn()}),da(`SUPER RISO · ${ka()}`),window.__superRiso={KNOBS:X,snapshot:xo,reset:pa,live:H,qualityReport:wn,isSuperRisoPreviewDevice:Fa,get lastChange(){return la},get inks(){return vt.inks},get params(){return vt.params},get engine(){return se},get disabled(){return _t},get glCanvas(){return we},get flat(){return Oe.canvas}});function Mo(){return se&&(Qo!==X.preserveDrawingBuffer||go(we)!==(X.offscreenBack&&Pt))&&ba(),se||(se=ra(we,jt,{preserveDrawingBuffer:X.preserveDrawingBuffer}),Qo=X.preserveDrawingBuffer),se}let Fe=0,ke=null,$e=null,ue=null,De=null;const ne={begin:0,upload:0,mip:0,render:0,backBegin:0};let Ke=null,Le=null;const Sa=()=>_t||mo||!jt||X.bypass;function tr(e,o,a){if(!a.isLive||(Fe++,$e=null,ne.begin=0,ne.upload=0,ne.mip=0,ne.render=0,ne.backBegin=0,Sa()))return;const{m:t}=ha(e,o,a.settings);if(!t.pipe||De)return;const n=performance.now();try{const s=Dt(e,o,a,t);if(t.pipe===2){Zn(s,t,Ft(a),n);return}if(!ke||ke.key!==s.key||ke.frame!==Fe-1){ke=null;return}const p=Mt(t.holdFps);if(t.hold&&ue&&ue.key===s.key&&ue.tick===p&&Lt())return;const l=Mo();l.setSource(Oe.canvas,X.mip);const r=performance.now();l.render({...ke.params,seed:It(Ft(a))},tt(t));const d=performance.now();if(ke=null,l.gl.isContextLost())return;$e={key:s.key,frame:Fe,ew:l.width,eh:l.height,crisp:!!s.style.crisp,tick:p},ne.upload=l.lastUploadMs,ne.mip=l.lastMipMs,ne.render=d-r,ne.begin=d-n}catch(s){se=null,yo("exception in beginSuperRisoFrame",s)}}function Zn(e,o,a,t){const n=Mt(o.holdFps);if(Ke&&Ke.frame===Fe-1&&Ke.key===e.key&&se){const r=performance.now();se.present(),So(we,Ke.ew,Ke.eh),ne.backBegin=performance.now()-r,Le={...Ke,frame:Fe}}if(Ke=null,!ke||ke.key!==e.key||ke.frame!==Fe-1){ke=null,ne.begin=performance.now()-t;return}if(o.hold&&Le&&Le.key===e.key&&Le.tick===n){ne.begin=performance.now()-t;return}const s=Mo();s.setSource(Oe.canvas,X.mip);const p=performance.now();s.render({...ke.params,seed:It(a)},tt(o,!0));const l=performance.now();ke=null,!s.gl.isContextLost()&&(Ke={key:e.key,frame:Fe,tick:n,ew:s.width,eh:s.height,crisp:!!e.style.crisp},ne.upload=s.lastUploadMs,ne.mip=s.lastMipMs,ne.render=l-p,ne.begin=l-t)}function Zt(e,o,a,t,n,s,p,l,r){if(t.hold){const d=So(we,s,p);ue={key:n,tick:r,ew:s,eh:p,crisp:l},ct(e,d,s,p,o,a,l)}else Rt(e,we,s,p,o,a,l)}function kt(e,o,a,t,n,s=!1){const p=Mo(),l=performance.now(),r=X.bitmapUpload?On(o,e.fw,e.fh):null,d=performance.now()-l;r?(p.setSource(r.bmp,X.mip),r.bmp.close(),H.bitmapLagFrames=r.lag):p.setSource(o,X.mip);const i=performance.now();return p.render({...a,seed:It(t)},n),s&&p.profiler.timerAvailable?qo(H.canvasW,H.canvasH,p.gpuMs===null?null:p.gpuMs+performance.now()-l,"GPU"):s&&(p.finish(),qo(H.canvasW,H.canvasH,performance.now()-l,"readback")),ne.upload+=p.lastUploadMs+d,ne.mip+=p.lastMipMs,ne.render+=performance.now()-i,p}function or(e,o,a,t){const n=performance.now(),{isDarkMode:s,isLive:p,info:l}=t;if(p&&(ht&&Jt>0&&Ve("interval",n-Jt),Jt=n,H.lastCallAt=n,H.isDark=s,H.canvasW=o,H.canvasH=a,H.preset=l.preset,H.speed=l.speed,H.offscreenFallback=X.offscreenBack&&!Pt),Sa())return!1;try{if(!p)return Xn(e,o,a,t,jt);const{m:r,level:d}=ha(o,a,t.settings),i=Ft(t),c=Dt(o,a,t,r);H.level=d,ue&&(ue.key!==c.key||!r.hold)&&(ue=null,De||uo());const x=En(t.motion,t.scene,n);let R=n,g=n;const v=(S,f=r)=>{if(H.lastPath=S,!ht)return!0;const m=performance.now();return Ve("flat",R-n),Ve("upload",ne.upload),Ve("mip",ne.mip),Ve("render",ne.render),Ve("back",ne.backBegin+(m-g)),Ve("total",ne.begin+(m-n)),se&&se.gpuMs!==null&&Ve("gpu",se.gpuMs),da(`SUPER RISO · ${d} · ${o}×${a} → sim ${se?`${se.width}×${se.height}`:"–"} · src ${c.fw}×${c.fh} · ${Gn(f)} · ${ka()} · ${S}`),!0};if(d==="detect"){const S=mt(Oe,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const f=kt(c,S,dt(c),i,tt(r),!0);return f.gl.isContextLost()?!1:(g=performance.now(),Rt(e,we,f.width,f.height,o,a,!!c.style.crisp),v("detect"))}if(d==="preview"&&x>=Mn){const S=Bt(),f=Dt(o,a,t,S);ke=null,$e=null,ue=null;const m=Lt();if(De&&De.key===f.key&&De.tick===i&&m)return g=performance.now(),ct(e,m,De.ew,De.eh,o,a,De.crisp),H.heldFrames++,v("refined",S);const E=mt(Oe,e.canvas,f.fw,f.fh,f.base,s);R=performance.now();const C=kt(f,E,dt(f),i,tt(S));if(C.gl.isContextLost())return!1;g=performance.now();const O=So(we,C.width,C.height);return De={key:f.key,tick:i,ew:C.width,eh:C.height,crisp:!!f.style.crisp},ct(e,O,C.width,C.height,o,a,De.crisp),v("refine",S)}De&&(De=null,uo());const L=()=>r.hold&&ue&&ue.key===c.key?Lt():null;if(r.pipe===2){const S=mt(Oe,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const f=dt(c);ke={key:c.key,frame:Fe,params:f},g=performance.now();const m=Lt();if(Le&&Le.key===c.key&&m&&(Le.frame===Fe||r.hold))return ct(e,m,Le.ew,Le.eh,o,a,Le.crisp),Le.frame===Fe?H.pipeFrames++:H.heldFrames++,v(Le.frame===Fe?"pipe2":"held");Le=null;const E=kt(c,S,f,i,tt(r));return E.gl.isContextLost()?!1:(g=performance.now(),Rt(e,we,E.width,E.height,o,a,!!c.style.crisp),H.pipeSyncFrames++,v("sync"))}if(r.pipe){const S=mt(Oe,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const f=dt(c);if(ke={key:c.key,frame:Fe,params:f},g=performance.now(),$e&&$e.key===c.key&&$e.frame===Fe)return Zt(e,o,a,r,c.key,$e.ew,$e.eh,$e.crisp,$e.tick),H.pipeFrames++,v("pipe");const m=L();if(m&&ue)return ct(e,m,ue.ew,ue.eh,o,a,ue.crisp),H.heldFrames++,v("held");const E=kt(c,S,f,i,tt(r));return E.gl.isContextLost()?!1:(g=performance.now(),Zt(e,o,a,r,c.key,E.width,E.height,!!c.style.crisp,Mt(r.holdFps)),H.pipeSyncFrames++,v("sync"))}const B=Mt(r.holdFps),U=L();if(U&&ue&&ue.tick===B)return ct(e,U,ue.ew,ue.eh,o,a,ue.crisp),H.heldFrames++,v("held");const Z=mt(Oe,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const Y=kt(c,Z,dt(c),i,tt(r));return Y.gl.isContextLost()?!1:(g=performance.now(),Zt(e,o,a,r,c.key,Y.width,Y.height,!!c.style.crisp,B),v("sync"))}catch(r){return se=null,yo("exception in applySuperRiso",r),!1}}export{or as applySuperRiso,tr as beginSuperRisoFrame};
