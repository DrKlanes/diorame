import{X as ya,l as Be,h as ce,r as Ze,S as Ma,o as me,M as at,p as zt,d as Pa,s as eo,x as wa,b as Ea,c as To,e as Aa,f as Ta,i as La,j as Ra,k as Da,A as Ba,m as Ca}from"./index-DIdfsZAY.js";const Fa=17.2,_a=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,Ue=`#version 300 es
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
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,tt=Ue+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Na=Ue+Ft+et+`
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
}`,Ia=Ue+`
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
}`,Ho=Ue+Ft+et+`
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
}`,ja=Ue+et+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Yo=Ue+et+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,Jo=Ue+vo+et+`
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
}`,Zo=Ue+vo+et+`
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
  oA=A; oB=B; }`,$a=Ue+vo+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,ea=Ue+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,qa={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Lo={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},za={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},we=(e,o,a)=>e+(o-e)*a;function ho(e,o){return{printW:240,pxmm:o*we(.4,1,e)/240,crisp:e<.5,scanBlur:we(1,.65,e),scanNoise:we(.6,.35,e)}}function Ua(e,o){const a=Object.assign({},za,e),t=a.imperfection,n=a.resolution,s=a.screenSize;return Object.assign({...ho(n,o),screen:a.screen==="dots"?1:0,grain:we(.09,.3,s),lpi:Math.round(we(120,45,s)),misreg:.04+1.1*Math.pow(t,1.6),rot:we(.01,.16,t),scl:we(.2,1.6,t),edge:we(.25,1.05,t),voids:we(.05,.45,t),texAmp:we(.6,1.45,t),starve:we(.05,.4,t),mottle:we(.3,1.2,t),bleed:we(.04,.07,t),inkLoad:we(.75,.5,t)},Lo[a.paper]||Lo.natural)}function Oa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,s=[],p=[];let l=0;const r=new Uint8Array(4),d=(i,c)=>{let x=t.get(i);x||(x=[],t.set(i,x)),x.push(c)};return{get mode(){return a},timerAvailable:!!o,setMode(i){a=i==="timer"&&!o?"off":i,t.clear(),n.clear(),s.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),l=performance.now()),a==="timer"&&this.poll()},before(i,c){if(n.has(i)||(n.set(i,c),s.push(i)),a!=="timer"||!o)return null;const x=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,x),x},after(i,c){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const x=performance.now();d(i,x-l),l=x}else c&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),p.push({name:i,q:c}))},poll(){if(o)for(;p.length&&e.getQueryParameter(p[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:i,q:c}=p.shift();e.getParameter(o.GPU_DISJOINT_EXT)||d(i,e.getQueryParameter(c,e.QUERY_RESULT)/1e6),e.deleteQuery(c)}},report(){return s.map(i=>{const c=[...t.get(i)??[]].sort((x,R)=>x-R);return{name:i,p50:c.length?c[Math.floor(c.length/2)]:null,n:c.length,info:n.get(i)}})}}}const Ga=tt+`
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
  float mot=.55*vnoise(mm/.45)+.3*vnoise(mm/.13)+.15*vnoise(mat2(.8,.6,-.6,.8)*mm/.035);
  float dT=d*(1.-uHollow*(1.-.75*uTonerK)*inner*(.006+.08*mot));
  dT*=1.-uBand*.05*smoothstep(.4,.9,vnoise(vec2(mm.x/9.,.5)));                      // bandas claras en la dirección de avance
  vec3 toner=vec3(1.,1.,1.08)*mix(.045,.0018,uTonerK)*(1.+.6*vnoise(mat2(.6,.8,-.8,.6)*mm/.028));    // negro del tóner: de gris gastado a negro profundo
  c=mix(cp, toner*mix(vec3(1.),T,.04), clamp(dT,0.,1.)*.995);                     // el tóner tapa; el color encima apenas lo tiñe
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ha={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},ye=(e,o,a)=>e+(o-e)*a;function Ya(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:ya[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:ye(.1,1,o),scratch:ye(0,.7,o),prints:ye(0,.45,o),smear:ye(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:ye(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:ye(.05,1,o),fog:ye(.05,1,o),streak:ye(0,.8,o),band:ye(.1,.8,o),hollow:ye(.2,.7,o),grain:ye(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:ye(.1,2.2,a),sloppy:ye(.25,1.2,a),wobble:ye(.2,.9,a),cover:ye(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function Ja(e,o,a){return{...ho(a,o),...Object.assign(Ya(e),e.fine),tech:"xerox"}}function Za(e){const{gl:o}=e;let a=null,t=null,n=0,s=0;const p=o.createTexture();let l;const r=o.createTexture();let d,i=null;const c=()=>{if(!i){i=document.createElement("canvas"),i.width=i.height=1;const g=i.getContext("2d");g.fillStyle="rgb(255,128,0)",g.fillRect(0,0,1,1)}return i};function x(g,h){if(a||(a={xlum:e.compile(Ga),xgen:e.compile(Wa),xid:e.compile(Xa),xcolor:e.compile(Ka),xcomp:e.compile(Qa),xdirt:e.compile(Va)}),t&&g===n&&h===s)return;t&&Object.values(t).forEach(e.freeTarget),n=g,s=h;const L=Math.max(1,g>>2),D=Math.max(1,h>>2);t={xa:e.target(g,h),xb:e.target(g,h),xc:e.target(g,h),xq1:e.target(L,D,2),xq2:e.target(L,D,2),xs:e.target(L,D)}}function R(g,h,L,D,z,ee,Y,k){x(ee,Y);const u=Object.assign({},Ha,g),m=t,E=a,F=ee/u.printW,O=(u.markers||[]).slice(0,6),Z=u.hand>0?O.length:0,_=[];for(let b=0;b<6;b++)_.push(...Be(ce(O[b]||"#ffffff")));const q=(u.keys&&u.keys.length?u.keys:O).slice(0,6),N=[];for(let b=0;b<6;b++)N.push(...Be(ce(q[b]||O[b]||"#ffffff")));u.regionMap&&u.regionMap!==d&&(e.texFrom(u.regionMap,{filter:o.NEAREST},r),d=u.regionMap),!u.regionMap&&d!==null&&(e.texFrom(c(),{filter:o.NEAREST},r),d=null);const oe=Ze(u.seed*4241+7),Q=[];for(let b=0;b<6;b++){const T=oe()*Math.PI*2,S=u.offset*(.35+.65*oe());Q.push(Math.cos(T)*S,Math.sin(T)*S)}u.orientMap&&u.orientMap!==l&&(e.texFrom(u.orientMap,{filter:o.NEAREST},p),l=u.orientMap),!u.orientMap&&l!==null&&(e.texFrom(c(),{filter:o.NEAREST},p),l=null);const ae=u.regionMap?1:0,be=Be(ce(u.paper)),I=Be(u.srcPaper||[1,1,1]),w=(b,T,S,C)=>e.run(b,T,S,$=>{$.f("uOff",0,0),$.f("uImg",ee,Y),C($)});w("PREP",e.PR.prep,h.prep,b=>{b.t("uSrc",L),b.f("uSrcRes",D,z),b.f("uSmoothPx",u.smooth*D/u.printW),b.f("uSrcPaper",...u.srcPaper||[1,1,1]),b.f("uPaper",1,1,1)}),w("XLUM",E.xlum,m.xa,b=>{b.f("uPxMm",F),b.t("uPrep",h.prep.t[0]),b.f("uDark",u.dark),b.f("uSoft",u.soft),b.f("uMotion",u.motion),b.f("uPhoto",u.photo),b.f("uLpi",u.lpi),b.f("uLid",u.lid)});const A=(b,T,S,C,$,B)=>w(`BLUR ${b}`,e.PR.blur,S,M=>{M.t("uTexA",T.t[0]),M.t("uTexB",T.t[T.t.length>1?1:0]),M.f("uDir",C,$),M.f("uSig",B)}),P=Math.max(1,Math.round(u.gens));for(let b=1;b<=P;b++){const T=Math.max(.05,u.genSpread*F*(b===1?.6:1));A(`gen${b} H`,m.xa,m.xb,1,0,T),A(`gen${b} V`,m.xb,m.xc,0,1,T),w(`XGEN ${b}`,E.xgen,m.xa,S=>{S.f("uPxMm",F),S.f("uSeed",u.seed),S.t("uD",m.xc.t[0]),S.t("uGreen",e.greenTex),S.f("uThr",u.thr),S.f("uGrain",u.grain),S.f("uDust",u.dust),S.f("uFog",u.fog),S.f("uStreak",u.streak),S.f("uGen",b)})}w("XDIRT",E.xdirt,m.xb,b=>{b.f("uPxMm",F),b.f("uSeed",u.seed),b.t("uD",m.xa.t[0]),b.f("uHair",u.hairs),b.f("uScratch",u.scratch),b.f("uPrint",u.prints),b.f("uSmear",u.smear)});const K=m.xb;A("sol ¼ H",K,h.qtmp,1,0,1.1*F/4),A("sol ¼ V",h.qtmp,m.xs,0,1,1.1*F/4);const W=Z>0;if(W){A("ps ¼ H",h.prep,h.qtmp,1,0,Math.max(.3,.12*F/4)),A("ps ¼ V",h.qtmp,m.xq1,0,1,Math.max(.3,.12*F/4)),w("XID",E.xid,m.xq2,T=>{T.t("uPS",m.xq1.t[0]),T.fv("uKey",N,3),T.t("uIdMap",r),T.i("uUseMap",ae),T.i("uNk",Z),T.f("uSrcPaperL",...I),T.f("uMinL",.32),T.f("uPxMm",F),T.f("uVoteMm",u.colorSmooth)});const b=u.hand===1?Math.max(1.5,.8*F/4):Math.max(.3,u.sloppy*F/4);A("mask H",m.xq2,h.qtmp,1,0,b),A("mask V",h.qtmp,m.xq1,0,1,b),w("XCOLOR",E.xcolor,m.xc,T=>{T.f("uPxMm",F),T.f("uSeed",u.seed),T.t("uMA",m.xq1.t[0]),T.t("uMB",m.xq1.t[1]),T.fv("uMk",_,3),T.i("uNk",Z),T.i("uMed",u.hand),T.fv("uCOff",Q,2),T.f("uWobble",u.wobble),T.f("uCover",u.cover),T.f("uStroke",u.stroke),T.f("uAng",u.strokeAng*Math.PI/180),T.f("uOverlap",u.overlap),T.f("uStrength",u.strength),T.f("uSlop",u.slop),T.f("uDry",u.dry),T.f("uFast",u.fast),l===void 0&&(e.texFrom(c(),{filter:o.NEAREST},p),l=null),T.t("uOri",p),T.f("uSheetMm",ee/F,Y/F),T.f("uWobMm",u.wobMm),T.f("uGran",u.gran),T.f("uDryB",u.dryB),T.f("uBloom",u.bloom)})}w("XCOMP",E.xcomp,h.comp,b=>{b.f("uPxMm",F),b.t("uD",K.t[0]),b.t("uSolX",m.xs.t[0]),b.f("uTonerK",u.tonerK),b.t("uC",m.xc.t[0]),b.t("uFib",e.fibTex),b.f("uPaper",...be),b.f("uHollow",u.hollow),b.f("uBand",u.band),b.f("uPaperTex",u.paperTex),b.f("uFibers",u.fibers),b.f("uHasColor",W?1:0)}),w("SCAN",e.PR.scan,k?h.out:null,b=>{b.f("uSeed",u.seed),b.t("uComp",h.comp.t[0]),b.f("uBlurPx",u.scanBlur),b.f("uNoise",u.scanNoise),b.i("uNorm",0),b.f("uPaper",...be)})}return{render:R}}const en=tt+Ft+et+`
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
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,on={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Ge=(e,o,a)=>e+(o-e)*a;function an(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:Ma[e.sup];return{cut:Ge(.3,4,Math.pow(e.cut,1.5)),facet:Ge(.3,1.1,o),misreg:Ge(0,2.2,o),lift:e.lift,liftMm:Ge(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Ge(.72,1.25,e.load),mist:Ge(.2,.85,o),drop:Ge(.4,3,e.dropSize),drips:e.drips,dripLen:Ge(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Ge(0,1.5,e.supTex),smooth:.12}}function nn(e,o,a){return{...ho(a,o),...an(e),tech:"stencil"}}const ta=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),oa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let Ut=null;const to=2048;function rn(){if(Ut)return Ut;const e=to,o=new Float32Array(e*e).fill(2),a=Ze(7),t=()=>{let g=0;for(;!g;)g=a();return Math.sqrt(-2*Math.log(g))*Math.cos(6.2832*a())};let n=0;const s=4.6*e*e;for(;n<s;){const g=a()<.07,h=Math.min(16,Math.max(.6,(g?5.5:2.6)*Math.exp(.45*t()))),L=a(),D=a()*e,z=a()*e,ee=Math.floor(D),Y=Math.floor(z),k=Math.ceil(h),u=h*h;for(let m=-k;m<=k;m++){const E=Y+m+.5-z;if(E*E>u)continue;const F=((Y+m)%e+e)%e*e;for(let O=-k;O<=k;O++){const Z=ee+O+.5-D;if(Z*Z+E*E>u)continue;const _=F+((ee+O)%e+e)%e;L<o[_]&&(o[_]=L)}}n+=Math.PI*u}const p=4096,l=new Uint32Array(p);let r=0;for(let g=0;g<e*e;g++)o[g]<2&&(l[Math.min(p-1,o[g]*p|0)]++,r++);const d=new Float32Array(p);let i=0;for(let g=0;g<p;g++)i+=l[g],d[g]=i/r;const c=document.createElement("canvas");c.width=c.height=e;const x=c.getContext("2d"),R=x.createImageData(e,e);for(let g=0;g<e*e;g++){const h=o[g]<2?d[Math.min(p-1,o[g]*p|0)]*.985:1,L=Math.round(h*255);R.data[g*4]=R.data[g*4+1]=R.data[g*4+2]=L,R.data[g*4+3]=255}return x.putImageData(R,0,0),Ut=c,c}function Mt(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let s=e;const p=new Float32Array(e.length);for(let l=0;l<3;l++){for(let r=0;r<a;r++){let d=0;const i=r*o;for(let c=-n;c<=n;c++)d+=s[i+Math.min(o-1,Math.max(0,c))];for(let c=0;c<o;c++)p[i+c]=d/(2*n+1),d+=s[i+Math.min(o-1,c+n+1)]-s[i+Math.max(0,c-n)]}for(let r=0;r<o;r++){let d=0;for(let i=-n;i<=n;i++)d+=p[Math.min(a-1,Math.max(0,i))*o+r];for(let i=0;i<a;i++)s=s===e?new Float32Array(e.length):s,s[i*o+r]=d/(2*n+1),d+=p[Math.min(a-1,i+n+1)*o+r]-p[Math.max(0,i-n)*o+r]}}return s}function sn(e,o,a){const t=(i,c)=>{let x=i*374761393+c*668265263+a*982451653|0;return x=(x^x>>>13)*1274126177|0,((x^x>>>16)>>>0)/4294967296},n=Math.floor(e),s=Math.floor(o),p=e-n,l=o-s,r=p*p*(3-2*p),d=l*l*(3-2*l);return(t(n,s)*(1-r)+t(n+1,s)*r)*(1-d)+(t(n,s+1)*(1-r)+t(n+1,s+1)*r)*d}function cn(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),s=document.createElement("canvas");s.width=t,s.height=n;const p=s.getContext("2d",{willReadFrequently:!0});return p.fillStyle="#fff",p.fillRect(0,0,t,n),p.drawImage(e,0,0,t,n),{D:p.getImageData(0,0,t,n).data,w:t,h:n,sp:Be(o).map(l=>Math.max(l,.02))}}const ln=.04;function un(e,o,a,t=null){const{D:n,w:s,h:p,sp:l}=cn(e,o),r=new Float64Array(256),d=new Float64Array(256),i=t?me(t):null;let c=0;for(let k=0;k<s*p;k++){const u=me([0,1,2].map(F=>oa(Math.min(1,ta(n[k*4+F]/255)/l[F])))),m=Math.max(0,Math.min(1,1-u[0]+.3*Math.hypot(u[1],u[2]))),E=Math.min(255,m*256|0);if(d[E]++,i){const F=me([n[k*4]/255,n[k*4+1]/255,n[k*4+2]/255]);if(Math.hypot(F[0]-i[0],F[1]-i[1],F[2]-i[2])<ln)continue}r[E]++,c++}c<s*p*.05&&r.set(d);{let k=0,u=0;for(let m=0;m<256;m++)k+=r[m],m>=20&&(u+=r[m]);if(u>k*.05)for(let m=0;m<20;m++)r[m]=0}const x=64,R=new Float64Array(x);for(let k=0;k<256;k++)R[k>>2]+=r[k];const g=new Float64Array(x+1),h=new Float64Array(x+1);for(let k=0;k<x;k++)g[k+1]=g[k]+R[k],h[k+1]=h[k]+R[k]*(k+.5)/x;const L=(k,u)=>{const m=g[u]-g[k];return m>0?(h[u]-h[k])*(h[u]-h[k])/m:0};let D=-1,z=[];const ee=new Array(a).fill(0),Y=(k,u,m)=>{if(k===a){const E=m+L(u,x);E>D&&(D=E,z=ee.slice());return}for(let E=u+1;E<=x-(a-k);E++)ee[k]=E,Y(k+1,E,m+L(u,E))};return Y(0,0,0),z.map(k=>Math.max(.04,Math.min(.95,k/x)))}function Ro(e,o){const a=o.printW||210,t=o.seed|0,n=Ze(t*7919+5),s=o.layers||[],p=()=>{let S=0;for(;!S;)S=n();return Math.sqrt(-2*Math.log(S))*Math.cos(6.2832*n())},l=e.width,r=e.height,d=Math.min(1,1024/Math.max(l,r)),i=Math.max(8,Math.round(l*d)),c=Math.max(8,Math.round(r*d)),x=i*c,R=a/i,g=document.createElement("canvas");g.width=i,g.height=c;const h=g.getContext("2d",{willReadFrequently:!0});h.fillStyle="#fff",h.fillRect(0,0,i,c),h.drawImage(e,0,0,i,c);const L=h.getImageData(0,0,i,c).data,D=Be(o.srcPaper||[1,1,1]).map(S=>Math.max(S,.02)),z=new Float32Array(x*3);for(let S=0;S<x;S++){const C=[0,1,2].map(B=>oa(Math.min(1,ta(L[S*4+B]/255)/D[B]))),$=me(C);z[S*3]=$[0],z[S*3+1]=$[1],z[S*3+2]=$[2]}const ee=(S,C)=>{const $=(C[0]-z[S*3])*.6,B=C[1]-z[S*3+1],M=C[2]-z[S*3+2];return $*$+B*B+M*M},Y=Math.max(.3,(o.cut||1)*.5/R),k=new Float32Array(x);for(let S=0;S<x;S++)k[S]=Math.max(0,Math.min(1,1-z[S*3]+.3*Math.hypot(z[S*3+1],z[S*3+2])));const u=Mt(k,i,c,Y),m=o.accKey?me(ce(o.accKey)):null;let E=null;if(m){const S=new Float32Array(x);for(let C=0;C<x;C++)S[C]=ee(C,m)<.045&&Math.hypot(z[C*3+1],z[C*3+2])>.06?1:0;E=Mt(S,i,c,Y)}const F=s.map(S=>S.kind===1&&S.key?me(ce(S.key)):null),O=s.map((S,C)=>{const $=new Uint8Array(x);if(S.kind===3){if(E)for(let B=0;B<x;B++)$[B]=E[B]>.5?1:0;return $}if(S.kind===1){const B=new Float32Array(x),M=F[C],y=Math.hypot(M[1],M[2]);for(let v=0;v<x;v++){const j=ee(v,M);if(j>.06||y>.06&&Math.hypot(z[v*3+1],z[v*3+2])<.5*y)continue;let V=!0;for(let G=0;G<F.length;G++)if(G!==C&&F[G]&&ee(v,F[G])<j){V=!1;break}B[v]=V?1:0}const U=Mt(B,i,c,Y);for(let v=0;v<x;v++)$[v]=U[v]>.5?1:0;return $}for(let B=0;B<x;B++)$[B]=u[B]>S.thr&&!(E&&E[B]>.5)?1:0;return $}),Z=3072/Math.max(i,c),_=Math.round(i*Z),q=Math.round(c*Z),N=_/a,oe=()=>{const S=document.createElement("canvas");S.width=_,S.height=q;const C=S.getContext("2d");return C.fillStyle="#000",C.fillRect(0,0,_,q),C.globalCompositeOperation="lighter",[S,C]},Q=["#ff0000","#00ff00","#0000ff"];let ae=null;if(o.bridges){const[S,C]=oe();ae=S;const $=(o.bridgeMm||.9)*N;C.lineCap="butt";const B=new Int32Array(x),M=new Int32Array(x),y=new Int32Array(x).fill(-1),U=new Int32Array(x),v=new Int32Array(x);s.forEach((j,V)=>{if(j.ch==null||j.ch<0)return;const G=O[V];B.fill(-1);let re=0;const pe=[];for(let ve=0;ve<x;ve++){if(G[ve]||B[ve]>=0)continue;let le=0;M[le++]=ve,B[ve]=re;const Pe=[];let Oe=!1;for(;le;){const te=M[--le];Pe.push(te);const Ie=te%i,f=te/i|0;(Ie===0||f===0||Ie===i-1||f===c-1)&&(Oe=!0),Ie>0&&!G[te-1]&&B[te-1]<0&&(B[te-1]=re,M[le++]=te-1),Ie<i-1&&!G[te+1]&&B[te+1]<0&&(B[te+1]=re,M[le++]=te+1),f>0&&!G[te-i]&&B[te-i]<0&&(B[te-i]=re,M[le++]=te-i),f<c-1&&!G[te+i]&&B[te+i]<0&&(B[te+i]=re,M[le++]=te+i)}!Oe&&Pe.length*R*R>=.6&&pe.push([re,Pe]),re++}C.strokeStyle=Q[j.ch],C.lineWidth=$;const Se=Math.round(12/R);let Te=0;for(const[ve,le]of pe.slice(0,600)){const Pe=le.length*R*R,Oe=Pe<40?1:Pe<400?2:3,te=[],Ie=le.filter(J=>{const de=J%i;return de>0&&G[J-1]||de<i-1&&G[J+1]||G[J-i]||G[J+i]}),f=Math.sqrt(le.length)*.75;for(let J=0;J<Oe;J++){Te++;const de=[];let Ce=0;for(const he of Ie)te.some(vt=>Math.hypot(vt%i-he%i,(vt/i|0)-(he/i|0))<f)||(y[he]=Te,U[he]=-1,v[he]=0,de.push(he));let ue=-1;for(;Ce<de.length;){const he=de[Ce++],vt=he%i,Ao=he/i|0;if(v[he]>Se)break;for(const qe of[vt>0?he-1:-1,vt<i-1?he+1:-1,Ao>0?he-i:-1,Ao<c-1?he+i:-1])if(!(qe<0||y[qe]===Te)){if(!G[qe]){if(B[qe]!==ve){U[qe]=he,ue=qe;break}continue}y[qe]=Te,U[qe]=he,v[qe]=v[he]+1,de.push(qe)}if(ue>=0)break}if(ue<0)break;let se=ue;for(;U[se]>=0&&G[U[se]];)se=U[se];const it=U[se]>=0?U[se]:se;te.push(it);const It=(it%i+.5)/i*_,jt=((it/i|0)+.5)/c*q,$t=(ue%i+.5)/i*_,qt=((ue/i|0)+.5)/c*q,Po=Math.hypot($t-It,qt-jt)||1,wo=($t-It)/Po*.5*N,Eo=(qt-jt)/Po*.5*N;C.beginPath(),C.moveTo(It-wo,jt-Eo),C.lineTo($t+wo,qt+Eo),C.stroke()}}})}const[be,I]=oe(),w=a*a*c/i,A=o.dripLen||8,P=o.dripW||.9,K=o.drips||0,W=o.splat||0,b=s.map((S,C)=>[S,C]).filter(([S])=>S.ch!=null&&S.ch>=0);if(b.forEach(([S,C],$)=>{if(K<=0)return;const B=O[C],M=[];for(let V=0;V<x-i;V++)B[V]&&!B[V+i]&&M.push(V);const y=.35+.65*($+1)/b.length,U=Math.min(260,Math.round(K*M.length*R*.06*y));if(!M.length)return;I.fillStyle=Q[S.ch];let v=0,j=0;for(;v<U&&j<U*8;){j++;const V=M[n()*M.length|0],G=V%i,re=V/i|0;if(n()>.15+sn(G*R/14,re*R/14,t+C*31))continue;v++;let pe=A*Math.exp(.75*p());n()<.25&&(pe*=.25),pe=Math.max(.8,Math.min(150,pe));const Se=P*(.55+.9*n())*(.7+.3*Math.min(1,pe/10)),Te=(G+n())*R,ve=(re+1)*R-(.3+n()*1.2),le=(n()-.5)*.8,Pe=.06+n()*.12,Oe=2+n()*4,te=n()*6.28;I.beginPath();const Ie=Math.max(.04,Se*.18);let f=Te,J=ve,de=Se/2;for(let ue=0;ue<=1.0001;ue+=Ie/pe){J=ve+ue*pe,f=Te+le*ue+Pe*Math.sin(ue*pe/Oe+te),de=Se/2*(1-.45*ue)*(ue<.08?1+(.08-ue)/.08*.6:1);const se=Math.max(.6,de*N);I.moveTo(f*N+se,J*N),I.arc(f*N,J*N,se,0,6.2832)}const Ce=de*(1.45+.6*n());I.moveTo(f*N+Ce*N,(J+Ce*.4)*N),I.arc(f*N,(J+Ce*.4)*N,Math.max(.7,Ce*N),0,6.2832),I.fill()}}),W>0&&b.length){const S=b[b.length-1],C=O[S[1]],$=[];for(let y=0;y<x;y+=3)C[y]&&$.push(y);const B=Math.min(900,Math.round(W*220*w/62370)),M=o.splatSize||.8;for(let y=0;y<B;y++){const U=n()<.75?S:b[n()*b.length|0];I.fillStyle=Q[U[0].ch];let v,j;if($.length&&n()<.65){const G=$[n()*$.length|0];v=(G%i+.5)*R+p()*22,j=((G/i|0)+.5)*R+p()*22}else v=n()*a,j=n()*a*c/i;const V=Math.max(.06,Math.min(4.5,M*.5*Math.exp(.8*p())));if(I.beginPath(),n()<.12){const G=n()*6.28;I.ellipse(v*N,j*N,V*N*2.4,V*N*.8,G,0,6.2832)}else I.arc(v*N,j*N,Math.max(.6,V*N),0,6.2832);if(n()<.45){const G=2+(n()*6|0),re=n()*6.28;for(let pe=0;pe<G;pe++){const Se=V*(1.3+n()*2.6),Te=re+(n()-.5)*1.3,ve=Math.max(.04,V*(.1+n()*.3)),le=(v+Math.cos(Te)*Se)*N,Pe=(j+Math.sin(Te)*Se)*N;I.moveTo(le+ve*N,Pe),I.arc(le,Pe,Math.max(.5,ve*N),0,6.2832)}}I.fill()}}let T=null;if(o.cloud){const C=Math.ceil(i/4),$=Math.ceil(c/4),B=new Float32Array(C*$);for(let j=0;j<x;j++){let V=0;for(const G of O)if(G[j]){V=1;break}if(V){const G=((j/i|0)/4|0)*C+(j%i/4|0);B[G]=1}}const M=Mt(B,C,$,(o.cloudMm||18)/(R*4));let y=0;for(const j of M)y=Math.max(y,j);T=document.createElement("canvas"),T.width=C,T.height=$;const U=T.getContext("2d"),v=U.createImageData(C,$);for(let j=0;j<C*$;j++){const V=Math.min(1,M[j]/(y*.55+1e-6));v.data[j*4]=Math.round(255*Math.pow(V,.8)),v.data[j*4+3]=255}U.putImageData(v,0,0)}return{drip:be,bridge:ae,cloud:T}}function fn(e){const{gl:o}=e;let a=null,t=null,n=0,s=0,p=null;const l=o.createTexture(),r=o.createTexture(),d=o.createTexture();let i,c=null;const x=()=>{if(!c){c=document.createElement("canvas"),c.width=c.height=1;const h=c.getContext("2d");h.fillStyle="#000",h.fillRect(0,0,1,1)}return c};function R(h,L){if(a||(a={scut:e.compile(en),spray:e.compile(tn)}),p||(p=e.texFrom(rn(),{wrap:o.REPEAT,mip:!0})),t&&h===n&&L===s)return;t&&Object.values(t).forEach(e.freeTarget),n=h,s=L;const D=Math.max(1,h>>2),z=Math.max(1,L>>2);t={b1:e.target(h,L),b2:e.target(h,L),sm:e.target(h,L,2),sq:e.target(D,z,2),sw:e.target(D,z,2)}}function g(h,L,D,z,ee,Y,k,u){R(Y,k);const m=Object.assign({},on,h),E=t,F=a,O=Y/m.printW,Z=(m.layers||[]).slice(0,5),_=Z.length,q=Ze(m.seed*6151+3),N=Be(m.srcPaper||[1,1,1]).map(v=>Math.max(v,.02)),oe=v=>Be(ce(v)).map((j,V)=>Math.min(1,j/N[V])),Q=[],ae=[],be=[],I=[],w=[],A=[],P=[];let K=0;for(let v=0;v<5;v++){const j=Z[v]||{kind:0,thr:2,hex:"#000000"};Q.push(j.kind|0),ae.push(j.thr==null?.5:j.thr),be.push(j.ch==null?-1:j.ch),w.push(j.op==null?.97:j.op),I.push(...Be(ce(j.hex))),A.push(...j.key?oe(j.key):[1,1,1]),v<_&&j.kind===1&&(K=v+1);const V=q()*Math.PI*2,G=m.misreg*Math.sqrt(q());P.push(Math.cos(V)*G,Math.sin(V)*G)}const W=m.maps||{drip:null,bridge:null,cloud:null};W!==i&&(e.texFrom(W.drip||x(),{},l),e.texFrom(W.bridge||x(),{},r),e.texFrom(W.cloud||x(),{},d),i=W);const b=W.drip?Math.max(.03,Math.min(.5,.5*W.drip.width/Y)):.5,T=m.accKey?oe(m.accKey):[1,1,1],S=Z.some(v=>v.kind===3)?1:0,C=Be(ce(m.support)),$=Be(ce(m.cloudHex||"#f4f4f0")),B=(v,j,V,G)=>e.run(v,j,V,re=>{re.f("uOff",0,0),re.f("uImg",Y,k),G(re)});B("PREP",e.PR.prep,L.prep,v=>{v.t("uSrc",D),v.f("uSrcRes",z,ee),v.f("uSmoothPx",m.smooth*z/m.printW),v.f("uSrcPaper",...m.srcPaper||[1,1,1]),v.f("uPaper",1,1,1)});const M=(v,j,V,G,re,pe)=>B(`BLUR ${v}`,e.PR.blur,V,Se=>{Se.t("uTexA",j.t[0]),Se.t("uTexB",j.t[j.t.length>1?1:0]),Se.f("uDir",G,re),Se.f("uSig",pe)}),y=Math.max(.05,m.cut*.5*O);M("cut H",L.prep,E.b1,1,0,y),M("cut V",E.b1,E.b2,0,1,y),B("SCUT",F.scut,E.sm,v=>{v.f("uPxMm",O),v.f("uSeed",m.seed),v.t("uSimp",E.b2.t[0]),v.t("uBr",r),v.i("uNL",_),v.i("uNK",K),v.i("uAccOn",S),v.iv("uKind",Q),v.iv("uCh",be),v.fv("uThr",ae,1),v.fv("uKey",A,3),v.f("uAccK",T[0],T[1],T[2]),v.fv("uOffs",P,2),v.f("uFacet",m.facet),v.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,y))))});const U=Math.max(.3,m.liftMm*O/4);M("lift ¼ H",E.sm,L.qtmp,1,0,U),M("lift ¼ V",L.qtmp,E.sq,0,1,U),M("wide ¼ H",E.sq,L.qtmp,1,0,U*2),M("wide ¼ V",L.qtmp,E.sw,0,1,U*2),B("SPRAY",F.spray,L.comp,v=>{v.f("uPxMm",O),v.f("uSeed",m.seed),v.t("uMA",E.sm.t[0]),v.t("uMB",E.sm.t[1]),v.t("uQA",E.sq.t[0]),v.t("uQB",E.sq.t[1]),v.t("uWA",E.sw.t[0]),v.t("uWB",E.sw.t[1]),v.t("uDr",l),v.t("uCl",d),v.t("uSpT",p),v.i("uNL",_),v.i("uSup",m.supType|0),v.iv("uCh",be),v.fv("uLc",I,3),v.fv("uOp",w,1),v.f("uSupLin",...C),v.f("uCloudLin",...$),v.f("uSupTex",m.supTex),v.f("uLift",m.lift),v.f("uOver",m.over),v.f("uLoad",m.load),v.f("uMist",m.mist),v.f("uDrop",m.drop),v.f("uCloud",W.cloud?m.cloud:0),v.f("uSpN",to),v.f("uTp",to/(143.36*m.drop*O)),v.f("uDrTp",b),v.f("uLiftScale",m.liftScale)}),B("SCAN",e.PR.scan,u?L.out:null,v=>{v.f("uSeed",m.seed),v.t("uComp",L.comp.t[0]),v.f("uBlurPx",m.scanBlur),v.f("uNoise",m.scanNoise),v.i("uNorm",0),v.f("uPaper",...C)})}return{render:g}}function Ne(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const pn=Ne(Ne(Yo," b+=texture(uTexB,uv+o2)*k;",""),"oA=a/w; oB=b/w;","oA=a/w; oB=vec4(0);"),aa=Ne(Ne(Ne(Ho,"float ba=eP, bs=length(oklabL(uPaper)-tSL);","float ba=eP, bs=length(oklabL(uPaper)-tSL); vec3 Da=vec3(0);"),"if(pass==0){ if(e<ba){ ba=e; Sa=S; } }","if(pass==0){ if(e<ba){ ba=e; Sa=S; Da=D; } }"),`  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD); }
`,`  ivec3 bS=Sa; vec3 bD=Da;
  if(Ss.x>=0){ vec3 Ds=Da; float es=ba; if(Ss!=Sa) es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; bD=Ds; } }
  else if(ba>eP-.025) bS=ivec3(-1);
`),Do=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,na=Ne(Zo,Do,Do+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Bo=1,Co=2,Fo=4,_o=8,mn=Ne(aa,"for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;","for(int it=0;it<3;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;"),dn=Ne(na,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),vn=Ne(ea,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),hn=Ne(Ne(Ne(Jo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),xn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,No=new Map,Io=(e,o)=>{let a=No.get(e);return a||(a=o(),No.set(e,a)),a};function gn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=Ze(e);t.lineCap="round";for(let s=0;s<2600;s++){const p=(.25+n()*n()*1.6)*85,l=n()*Math.PI*2,r=n()*1024,d=n()*1024,i=(n()-.5)*.9,c=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=c;for(const x of[-1024,0,1024])for(const R of[-1024,0,1024]){const g=r+x,h=d+R;g<-p-10||g>1024+p+10||h<-p-10||h>1024+p+10||(t.beginPath(),t.moveTo(g,h),t.quadraticCurveTo(g+Math.cos(l+i)*p*.5,h+Math.sin(l+i)*p*.5,g+Math.cos(l)*p,h+Math.sin(l)*p),t.stroke())}}return a}function bn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=Ze(e);t.lineCap="round",t.globalCompositeOperation="lighter";const s=1024/61;for(let p=0;p<70;p++){const l=n()<.7?"255,0,0":"0,255,0",r=(.4+n()*n()*3.5)*s,d=n()*Math.PI*2,i=n()*1024,c=n()*1024,x=(n()-.5)*1.6,R=(.015+n()*.03)*s;t.strokeStyle=`rgba(${l},${.35+n()*.5})`,t.lineWidth=Math.max(.6,R);for(const g of[-1024,0,1024])for(const h of[-1024,0,1024]){const L=i+g,D=c+h;L<-r||L>1024+r||D<-r||D>1024+r||(t.beginPath(),t.moveTo(L,D),t.bezierCurveTo(L+Math.cos(d+x)*r*.35,D+Math.sin(d+x)*r*.35,L+Math.cos(d-x)*r*.7,D+Math.sin(d-x)*r*.7,L+Math.cos(d)*r,D+Math.sin(d)*r),t.stroke())}}for(let p=0;p<160;p++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const l=(.02+n()*n()*.12)*s;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,l),0,7),t.fill()}return a}function ra(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);function s(w){const A=t.createProgram();for(const[W,b]of[[t.VERTEX_SHADER,_a],[t.FRAGMENT_SHADER,w]]){const T=t.createShader(W);if(t.shaderSource(T,b),t.compileShader(T),!t.getShaderParameter(T,t.COMPILE_STATUS)){const S=t.getShaderInfoLog(T);throw new Error(S??"shader compile error")}t.attachShader(A,T)}if(t.bindAttribLocation(A,0,"p"),t.linkProgram(A),!t.getProgramParameter(A,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(A)??"program link error");const P={},K=t.getProgramParameter(A,t.ACTIVE_UNIFORMS);for(let W=0;W<K;W++){const b=t.getActiveUniform(A,W);P[b.name.replace(/\[0\]$/,"")]=t.getUniformLocation(A,b.name)}return{p:A,u:P}}const p=new Map,l=w=>{let A=p.get(w);return A||(A=s(w),p.set(w,A)),A},r={sep0:s(Ho),lut:s(Na),prep:s(Ia),sep:s(ja),blur:s(Yo),screen:s(Jo),spread:s(Zo),compose:s($a),scan:s(ea)},d=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,d),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function i(w,A,{filter:P=t.LINEAR,wrap:K=t.CLAMP_TO_EDGE}={}){const W=t.createTexture();return t.bindTexture(t.TEXTURE_2D,W),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,w,A,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,K),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,K),W}function c(w,{filter:A=t.LINEAR,wrap:P=t.CLAMP_TO_EDGE,mip:K=!1}={},W=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,W),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,w),K&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,K?t.LINEAR_MIPMAP_LINEAR:A),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,A),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,P),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,P),W}function x(w,A,P=1){const K=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,K);const W=[];for(let b=0;b<P;b++){const T=i(w,A);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+b,t.TEXTURE_2D,T,0),W.push(T)}return t.drawBuffers(W.map((b,T)=>t.COLOR_ATTACHMENT0+T)),{f:K,t:W,w,h:A}}function R(w){w.t.forEach(A=>t.deleteTexture(A)),t.deleteFramebuffer(w.f)}const g=Oa(t);function h(w,A,P,K){const W=P?P.w:e.width,b=P?P.h:e.height;t.useProgram(A.p),t.bindFramebuffer(t.FRAMEBUFFER,P?P.f:null),t.viewport(0,0,W,b);let T=0;const S=A.u,C={t(B,M){S[B]!=null&&(t.activeTexture(t.TEXTURE0+T),t.bindTexture(t.TEXTURE_2D,M),t.uniform1i(S[B],T),T++)},f(B,...M){const y=S[B];y!=null&&(M.length===1?t.uniform1f(y,M[0]):M.length===2?t.uniform2f(y,M[0],M[1]):M.length===3?t.uniform3f(y,M[0],M[1],M[2]):t.uniform4f(y,M[0],M[1],M[2],M[3]))},i(B,M){S[B]!=null&&t.uniform1i(S[B],M)},fv(B,M,y){const U=S[B];if(U==null)return;const v=new Float32Array(M);y===1?t.uniform1fv(U,v):y===2?t.uniform2fv(U,v):t.uniform3fv(U,v)},m2(B,M){S[B]!=null&&t.uniformMatrix2fv(S[B],!1,new Float32Array(M))},iv(B,M){S[B]!=null&&t.uniform1iv(S[B],new Int32Array(M))}};C.f("uRes",W,b),K&&K(C);const $=g.mode==="off"?null:g.before(w,{w:W,h:b,att:P?P.t.length:1});t.drawArrays(t.TRIANGLES,0,3),g.mode!=="off"&&g.after(w,$)}const L=c(o.green,{wrap:t.REPEAT}),D={b:c(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:c(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:c(o.exLut)},z=c(Io("fib11",()=>gn(11)),{wrap:t.REPEAT,mip:!0}),ee=c(Io("inc23",()=>bn(23)),{wrap:t.REPEAT,mip:!0}),Y=w=>{w.t("uExB",D.b),w.t("uExR",D.r),w.t("uExLut",D.lut),w.f("uExBSize",D.bs[0],D.bs[1]),w.f("uExRSize",D.rs[0],D.rs[1]),w.f("uExPxMm",Fa)};let k=null,u=null;const m=x(1089,33,2);let E="";const F=t.createTexture();let O=0,Z=0,_=null,q=0,N=0;function oe(w,A){if(w===q&&A===N)return;q=w,N=A,_&&Object.values(_).forEach(R);const P=Math.max(1,w>>2),K=Math.max(1,A>>2);_={prep:x(w,A),sep:x(w,A,2),tmp:x(w,A,2),loc:x(w,A,2),qtmp:x(P,K,2),sol:x(P,K,2),scr:x(w,A,2),cov:x(w,A,2),comp:x(w,A),prepH:x(w,A),prepV:x(w,A),out:x(w,A)},e.width=w,e.height=A}const Q=t.getExtension("EXT_disjoint_timer_query_webgl2");let ae=null;function be(){if(!Q||!ae||!t.getQueryParameter(ae,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(Q.GPU_DISJOINT_EXT)||(I.gpuMs=t.getQueryParameter(ae,t.QUERY_RESULT)/1e6),t.deleteQuery(ae),ae=null}const I={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:g,lastVariants:"",setSource(w,A=!0){O=w.width,Z=w.height;const P=performance.now();c(w,{},F);const K=performance.now();A&&(t.bindTexture(t.TEXTURE_2D,F),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),I.lastUploadMs=K-P,I.lastMipMs=performance.now()-K},invalidateLut(){E=""},present(){if(!_)return;const w=_;h("PRESENT",l(xn),null,A=>{A.t("uT",w.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(w,A={}){const P=Object.assign({},qa,w),K=A.preview??0,W=!!A.lossless||K!==0,b=(f,J)=>K&f?"preview":W&&J?"lossless":"lab";I.lastVariants=`blurPrep:${W?"lossless":"lab"} sep0:${b(Bo,!0)} screen:${b(_o,!1)} spread:${b(Co,!0)} scan:${b(Fo,!1)}`;const T=performance.now();be(),g.mode!=="off"&&g.frameStart();const S=Q&&!ae&&g.mode!=="timer"?t.createQuery():null;S&&t.beginQuery(Q.TIME_ELAPSED_EXT,S);let C=Math.round(P.printW*P.pxmm),$=Math.round(C*Z/O);const B=Math.min(n,6144);if(Math.max(C,$)>B){const f=B/Math.max(C,$);C=Math.round(C*f),$=Math.round($*f)}const M=w.tech==="xerox"||w.tech==="stencil";M&&(C=Math.max(4,C&-4),$=Math.max(4,$&-4)),oe(C,$),I.width=C,I.height=$;const y=_;if(M){const f={gl:t,compile:s,run:h,target:x,freeTarget:R,texFrom:c,greenTex:L,fibTex:z,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},J={prep:y.prep,qtmp:y.qtmp,comp:y.comp,out:y.out};return w.tech==="stencil"?(u??=fn(f)).render(w,J,F,O,Z,C,$,!!A.toTexture):(k??=Za(f)).render(w,J,F,O,Z,C,$,!!A.toTexture),I.lastVariants=w.tech??"xerox",S&&(t.endQuery(Q.TIME_ELAPSED_EXT),ae=S),t.flush(),I.lastMs=performance.now()-T,I}const U=C/P.printW,v=Be(ce(P.paper)),j=Math.min(at,P.inks.length),V=P.inks.concat(Array(at).fill("#000000")).slice(0,at),G=P.opac.concat(Array(at).fill(.15)).slice(0,at),re=[];for(let f=0;f<at;f++)re.push(...Be(ce(zt(V[f]))));const pe=V.map(f=>me(ce(zt(f)))[0]<.42?0:1),Se=me(ce(P.paper)),Te=V.map(f=>Math.min(1.5,Pa(me(ce(zt(f))),Se)/.5)),ve=JSON.stringify([V,G,j,P.paper,P.inkCost,P.pair]);ve!==E&&(h("LUT",r.lut,m,f=>{f.fv("uCon",Te,1),f.fv("uInk",re,3),f.fv("uOp",G,1),f.i("uN",j),f.f("uPaper",...v),f.f("uCost",P.inkCost),f.f("uPair",P.pair)}),E=ve),h("PREP",r.prep,y.prep,f=>{f.t("uSrc",F),f.f("uSrcRes",O,Z),f.f("uSmoothPx",P.smooth*O/P.printW),f.f("uSrcPaper",...P.srcPaper),f.f("uPaper",...v)});const le=Ze(P.seed*7919+13),Pe=[],Oe=[];for(let f=0;f<at;f++){const J=(le()*2-1)*P.rot*Math.PI/180,de=1+(le()*2-1)*P.scl/1e3,Ce=Math.cos(J)*de,ue=Math.sin(J)*de;Pe.push(Ce,ue,-ue,Ce);const se=le()*Math.PI*2,it=P.misreg*Math.sqrt(le());Oe.push(Math.cos(se)*it,Math.sin(se)*it)}let te;if(W){const f=l(pn);h("BLUR prep H",f,y.prepH,J=>{J.t("uTexA",y.prep.t[0]),J.f("uDir",1,0),J.f("uSig",.3*U)}),h("BLUR prep V",f,y.prepV,J=>{J.t("uTexA",y.prepH.t[0]),J.f("uDir",0,1),J.f("uSig",.3*U)}),te=y.prepV.t[0]}else h("BLUR prep H",r.blur,y.loc,f=>{f.t("uTexA",y.prep.t[0]),f.t("uTexB",y.prep.t[0]),f.f("uDir",1,0),f.f("uSig",.3*U)}),h("BLUR prep V",r.blur,y.scr,f=>{f.t("uTexA",y.loc.t[0]),f.t("uTexB",y.loc.t[0]),f.f("uDir",0,1),f.f("uSig",.3*U)}),te=y.scr.t[0];h("SEP0",K&Bo?l(mn):W?l(aa):r.sep0,y.tmp,f=>{f.t("uPrepS",te),f.t("uPrep",y.prep.t[0]),f.t("uSet",m.t[0]),f.fv("uCon",Te,1),f.fv("uInk",re,3),f.fv("uOp",G,1),f.i("uN",j),f.f("uPaper",...v),f.f("uCost",P.inkCost),f.f("uPair",P.pair),f.f("uMinDot",P.minDot)}),h("WARP",r.sep,y.sep,f=>{f.f("uPxMm",U),f.t("uSA",y.tmp.t[0]),f.t("uSB",y.tmp.t[1]),f.i("uN",j),f.f("uCtr",P.printW/2,$/U/2),f.m2("uM",Pe),f.fv("uT",Oe,2)});const Ie=(f,J,de,Ce,ue)=>{h(`BLUR ${f} H`,r.blur,de,se=>{se.t("uTexA",J.t[0]),se.t("uTexB",J.t[1]),se.f("uDir",1,0),se.f("uSig",ue)}),h(`BLUR ${f} V`,r.blur,Ce,se=>{se.t("uTexA",de.t[0]),se.t("uTexB",de.t[1]),se.f("uDir",0,1),se.f("uSig",ue)})};return Ie("loc",y.sep,y.tmp,y.loc,.22*U),Ie("sol ¼",y.sep,y.qtmp,y.sol,1.5*U/4),h("SCREEN",K&_o?l(hn):r.screen,y.scr,f=>{Y(f),f.f("uPxMm",U),f.f("uSeed",P.seed),f.t("uSepA",y.sep.t[0]),f.t("uSepB",y.sep.t[1]),f.t("uSolA",y.sol.t[0]),f.t("uSolB",y.sol.t[1]),f.t("uLocA",y.loc.t[0]),f.t("uLocB",y.loc.t[1]),f.t("uGreen",L),f.i("uN",j),f.i("uMode",+P.screen),f.f("uGrain",P.grain),f.f("uLoad",P.inkLoad),f.f("uLpi",P.lpi),f.f("uMottle",P.mottle),f.f("uStarve",P.starve),f.f("uTexAmp",P.texAmp),f.f("uStreak",P.streak),f.f("uSolidLv",P.solidLv),f.fv("uExSel",pe,1),f.f("uTrap",P.trap)}),h("SPREAD",K&Co?l(dn):W?l(na):r.spread,y.cov,f=>{Y(f),f.f("uPxMm",U),f.f("uSeed",P.seed),f.t("uScrA",y.scr.t[0]),f.t("uScrB",y.scr.t[1]),f.t("uSepA",y.sep.t[0]),f.t("uSepB",y.sep.t[1]),f.t("uLocA",y.loc.t[0]),f.t("uLocB",y.loc.t[1]),f.i("uN",j),f.f("uBleedPx",P.bleed*U),f.f("uGain",P.gain),f.f("uEdge",P.edge),f.f("uSolidLv",P.solidLv),f.fv("uExSel",pe,1)}),h("COMPOSE",r.compose,y.comp,f=>{Y(f),f.f("uPxMm",U),f.f("uSeed",P.seed),f.t("uCovA",y.cov.t[0]),f.t("uCovB",y.cov.t[1]),f.t("uSolA",y.sol.t[0]),f.t("uSolB",y.sol.t[1]),f.f("uStarve",P.starve),f.t("uFib",z),f.t("uInc",ee),f.i("uN",j),f.fv("uInk",re,3),f.fv("uOp",G,1),f.f("uPaper",...v),f.f("uPaperTex",P.paperTex),f.f("uFibers",P.fibers),f.f("uIncl",P.incl),f.f("uVoids",P.voids),f.f("uMottle",P.mottle),f.f("uTexAmp",P.texAmp),f.fv("uExSel",pe,1)}),h("SCAN",K&Fo?l(vn):r.scan,A.toTexture?y.out:null,f=>{f.f("uSeed",P.seed),f.t("uComp",y.comp.t[0]),f.f("uBlurPx",P.scanBlur),f.f("uNoise",P.scanNoise),f.i("uNorm",+P.normWhite),f.f("uPaper",...v)}),S&&(t.endQuery(Q.TIME_ELAPSED_EXT),ae=S),t.flush(),I.lastMs=performance.now()-T,I}};return I}const sa=new URLSearchParams(window.location.search),dt=sa.get("srdebug")==="1",xe=dt?sa:new URLSearchParams,kn=["srres","srpipe","srhold","srpreview","srprevmask"],X={preserveDrawingBuffer:xe.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(xe.get("srres"))||1)),mip:xe.get("srmip")!=="0",bypass:xe.get("srbypass")==="1",darkPaperFromBase:xe.get("srdarkpaper")==="bg",simUpload:xe.get("srsim")==="1",offscreenBack:xe.get("sroff")==="1",bitmapUpload:xe.get("srbitmap")==="1",pipe:xe.get("srpipe")==="2"?2:xe.get("srpipe")==="1"?1:0,hold:xe.get("srhold")==="1",lossless:xe.get("srlossless")!=="0",preview:xe.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(xe.get("srprevmask"))||0)),auto:!kn.some(e=>xe.has(e)),forceLevel:xe.get("srlevel")==="preview"?"preview":xe.get("srlevel")==="full"?"full":null},ia={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},H={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},ot={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},Ot=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==X.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==X.offscreenBack;Object.assign(X,e),(o||a)&&ot.recreateEngine()},jo=5,$o=30,Sn=12,yn=300,oo=new Map;let je=null,Et="";const ca=(e,o)=>`${e}×${o}`;function Mn(e,o){if(X.forceLevel)return eo(X.forceLevel==="preview"),X.forceLevel;const a=oo.get(ca(e,o));return a?(eo(a==="preview"),a):"detect"}function qo(e,o,a,t){const n=ca(e,o);if((!je||je.size!==n)&&(je={size:n,seen:0,samples:[]}),++je.seen>jo+3*$o&&!je.samples.length){oo.set(n,"full"),je=null,Et=`${n}: sin medida (${t}) → full`;return}if(je.seen<=jo||a===null||(je.samples.push(a),je.samples.length<$o))return;const s=[...je.samples].sort((r,d)=>r-d),p=s[s.length>>1],l=p>Sn?"preview":"full";oo.set(n,l),je=null,Et=`${n}: coste p50 ${p.toFixed(1)} ms (${t}) → ${l}`,eo(l==="preview"),dt&&console.info(`[SuperRiso] quality level ${Et}`)}const Pn=()=>Et;let ht=null,Gt=null,zo=0,la="";function wn(e,o,a){return!!e&&!!ht&&o===Gt&&e.length===ht.length&&e.every((n,s)=>n===ht[s])||(zo=a,la=o!==Gt?"scene":(e??[]).map((n,s)=>n===ht?.[s]?"":s).filter(n=>n!=="").join(",")),ht=e??null,Gt=o,a-zo}const ua=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Wt(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:s,seed:p}){const[l,r]=ua(e.width,e.height,t),d=document.createElement("canvas");d.width=l,d.height=r;const i=d.getContext("2d",{willReadFrequently:!0});i.fillStyle="#fff",i.fillRect(0,0,l,r),i.drawImage(e,0,0,l,r);const c=i.getImageData(0,0,l,r).data,x=me(a),R=new Int8Array(l*r).fill(-1),g=l*r;if(t){const k=new Uint8Array(g);for(let _=0;_<g;_++){const q=me([c[_*4]/255,c[_*4+1]/255,c[_*4+2]/255]);k[_]=x[0]-q[0]>.14?1:0}const u=new Uint8Array(k);for(let _=0;_<r;_++)for(let q=0;q<l;q++){if(!k[_*l+q])continue;const N=_*l+q;q>0&&(u[N-1]=1),q<l-1&&(u[N+1]=1),_>0&&(u[N-l]=1),_<r-1&&(u[N+l]=1)}const m=new Int32Array(g).fill(-1),E=new Int32Array(g),F=Ze((p|0)*977+13);let O=0;const Z=Math.max(6,g*12e-5);for(let _=0;_<g;_++){if(u[_]||m[_]>=0)continue;let q=0;E[q++]=_,m[_]=O;const N=[];let oe=!1;for(;q;){const I=E[--q];N.push(I);const w=I%l,A=I/l|0;(w===0||A===0||w===l-1||A===r-1)&&(oe=!0),w>0&&!u[I-1]&&m[I-1]<0&&(m[I-1]=O,E[q++]=I-1),w<l-1&&!u[I+1]&&m[I+1]<0&&(m[I+1]=O,E[q++]=I+1),A>0&&!u[I-l]&&m[I-l]<0&&(m[I-l]=O,E[q++]=I-l),A<r-1&&!u[I+l]&&m[I+l]<0&&(m[I+l]=O,E[q++]=I+l)}O++;const Q=F(),ae=F();if(N.length<Z||oe&&N.length>g*.05||Q>s)continue;const be=Math.min(n-1,Math.floor(ae*n));for(const I of N)R[I]=be}for(let _=0;_<3;_++){const q=new Int8Array(R);for(let N=0;N<r;N++)for(let oe=0;oe<l;oe++){const Q=N*l+oe;if(q[Q]>=0||!u[Q])continue;const ae=oe>0&&q[Q-1]>=0?q[Q-1]:oe<l-1&&q[Q+1]>=0?q[Q+1]:N>0&&q[Q-l]>=0?q[Q-l]:N<r-1&&q[Q+l]>=0?q[Q+l]:-1;ae>=0&&(R[Q]=ae)}}}else{const k=o.map(u=>me(ce(u)));for(let u=0;u<g;u++){const m=me([c[u*4]/255,c[u*4+1]/255,c[u*4+2]/255]),E=Math.hypot(m[0]-x[0],m[1]-x[1],m[2]-x[2]),F=Math.hypot(m[1],m[2]);if(!(E>.08&&(m[0]>.32||F>.12)))continue;let O=-1,Z=1e9;for(let _=0;_<k.length;_++){const q=(k[_][0]-m[0])*.6,N=k[_][1]-m[1],oe=k[_][2]-m[2],Q=q*q+N*N+oe*oe;Q<Z&&(Z=Q,O=_)}Z<.045&&(R[u]=O)}}let h=null;if(t){h=document.createElement("canvas"),h.width=l,h.height=r;const k=h.getContext("2d"),u=k.createImageData(l,r);for(let m=0;m<g;m++)u.data[m*4]=(R[m]+1)*36,u.data[m*4+3]=255;k.putImageData(u,0,0)}const L=new Int32Array(g).fill(-1),D=i.createImageData(l,r),z=new Int32Array(g);for(let k=0;k<g;k++)D.data[k*4]=255,D.data[k*4+1]=128,D.data[k*4+2]=0,D.data[k*4+3]=255;let ee=0;for(let k=0;k<g;k++){if(R[k]<0||L[k]>=0)continue;const u=R[k];let m=0;z[m++]=k,L[k]=ee;const E=[];let F=0,O=0,Z=0,_=0,q=0,N=0;for(;m;){const M=z[--m];E.push(M);const y=M%l,U=M/l|0;F++,O+=y,Z+=U,_+=y*y,q+=U*U,N+=y*U,y>0&&R[M-1]===u&&L[M-1]<0&&(L[M-1]=ee,z[m++]=M-1),y<l-1&&R[M+1]===u&&L[M+1]<0&&(L[M+1]=ee,z[m++]=M+1),U>0&&R[M-l]===u&&L[M-l]<0&&(L[M-l]=ee,z[m++]=M-l),U<r-1&&R[M+l]===u&&L[M+l]<0&&(L[M+l]=ee,z[m++]=M+l)}if(ee++,F<6)continue;const oe=O/F,Q=Z/F,ae=_/F-oe*oe,be=q/F-Q*Q,I=N/F-oe*Q,w=.5*Math.atan2(2*I,ae-be),A=ae+be,P=ae*be-I*I,K=Math.sqrt(Math.max(0,A*A/4-P)),W=A/2+K,b=Math.max(1e-6,A/2-K),T=Math.sqrt(b/W),S=Math.max(0,Math.min(1,(.62-T)/.3)),C=Math.round(127.5+127.5*Math.cos(2*w)),$=Math.round(127.5+127.5*Math.sin(2*w)),B=Math.round(255*S);for(const M of E)D.data[M*4]=C,D.data[M*4+1]=$,D.data[M*4+2]=B}const Y=new Uint8ClampedArray(D.data);for(let k=0;k<2;k++){const u=new Uint8ClampedArray(Y);for(let m=0;m<r;m++)for(let E=0;E<l;E++){const F=m*l+E;if(!(u[F*4+2]>0))for(const[O,Z]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=E+O,q=m+Z;if(_<0||q<0||_>=l||q>=r)continue;const N=q*l+_;if(u[N*4+2]>0){Y[F*4]=u[N*4],Y[F*4+1]=u[N*4+1],Y[F*4+2]=u[N*4+2];break}}}}return D.data.set(Y),i.putImageData(D,0,0),{ori:d,ids:h}}const fa=300;let Fe=null,ao=0,Xt=!1;const ct=document.createElement("canvas"),En=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:fa}):setTimeout(e,0)},An=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),Tn=()=>ao;function Ln(e,o,a,t,n,s,p){const l=o.what==="fill",r={keys:l?[]:o.keys??o.paint,srcPaper:t,fill:l,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Wt(e,r);const d=JSON.stringify([l,r.keys,r.nk,l?r.cover:0,l?r.seed:0,t]),i=performance.now(),c={motion:s&&[...s],scene:p};if(!Fe||Fe.key!==d)return Fe={key:d,maps:Wt(e,r),at:i,sig:c},ao++,Fe.maps;if(!Xt&&i-Fe.at>=fa&&!An(c,Fe.sig)){const[x,R]=ua(e.width,e.height,l);(ct.width!==x||ct.height!==R)&&(ct.width=x,ct.height=R),ct.getContext("2d").drawImage(e,0,0,x,R),Xt=!0,Fe.at=i,Fe.sig=c,En(()=>{Xt=!1,!(!Fe||Fe.key!==d)&&(Fe.maps=Wt(ct,r),ao++)})}return Fe.maps}const no=300,Rn=200,Dn=e=>me(ce(e))[0]<.3?.995:.97;function Uo(e){const o=me(ce(e));let a=To[0][1],t=1e9;for(const[,n]of To){const s=me(ce(n)),p=Math.hypot(o[0]-s[0],2*(o[1]-s[1]),2*(o[2]-s[2]));p<t&&(t=p,a=n)}return a}const Bn=e=>me(e)[0]>.8?e:[1,1,1];function Cn(e,o,a){const t=(e.dark-.5)*.5,n=r=>Math.max(.03,Math.min(.95,r));let s=[],p=null;if(e.mode==="tone"){const r=e.n;s=a(r).map((i,c)=>({kind:0,thr:n(i-t),hex:Ea[r][c]})),e.accent&&o.length&&(p=o[0],s.push({kind:3,hex:e.colors==="own"?o[0]:Uo(o[0])}))}else s=o.slice(0,e.n).sort((d,i)=>me(ce(i))[0]-me(ce(d))[0]).map(d=>({kind:1,key:d,hex:e.colors==="own"?d:Uo(d)})),s.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===s.length&&s.forEach((r,d)=>{r.hex=e.manual[d]}),s.forEach(r=>{r.op=Dn(r.hex)}),s.map((r,d)=>d).filter(r=>s[r].kind!==3).slice(-3).forEach((r,d)=>{s[r].ch=d}),{layers:s,accKey:p}}const Kt=new Map;let nt=null,Pt=null,Oo=0;const ro=e=>e?[...e.slice(0,7),e[9]??0]:null;function Fn(e,o){const a=ro(e);return(!a||!Pt||a.length!==Pt.length||a.some((t,n)=>t!==Pt[n]))&&(Pt=a,Oo=o),!!a&&o-Oo>=Rn}let ge=null,wt=null,Vt=!1,so=0;const lt=document.createElement("canvas"),_n=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:no}):setTimeout(e,0)},Nn=()=>so;function In(e,o,a,t){const n=Bn(e.srcPaper),s=performance.now(),p=e.isLive?Fn(e.motion,s):!0,l=wa(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&p){const h=ro(e.motion);(!nt||nt.scene!==e.scene||!h||!nt.cam||h.some((D,z)=>D!==nt.cam[z]))&&(!nt||s-nt.at>=no)&&(Kt.clear(),nt={scene:e.scene,cam:h,at:s})}const r=h=>{const L=`${h}|${n.join(",")}|${e.bg.join(",")}`;let D=Kt.get(L);return D||(D=un(o,n,h,e.bg),Kt.set(L,D)),D},{layers:d,accKey:i}=Cn(e.s,l,r),c={layers:d,accKey:i,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:d,accKey:i,maps:Ro(o,c),srcPaper:n};const x=JSON.stringify([d.map(h=>[h.kind,h.thr,h.key,h.ch]),i,c.cut,c.bridges,c.drips,c.splat,c.cloud,t,c.printW,n]),R=ro(e.motion),g=!ge||ge.key!==x||ge.scene!==e.scene||!R||!ge.cam||R.some((h,L)=>h!==ge.cam[L]);if(g&&(p||!ge||ge.key!==x)&&!Vt&&(!ge||s-ge.at>=no)){const h=Math.min(1,1024/Math.max(o.width,o.height)),L=Math.max(8,Math.round(o.width*h)),D=Math.max(8,Math.round(o.height*h));(lt.width!==L||lt.height!==D)&&(lt.width=L,lt.height=D),lt.getContext("2d").drawImage(o,0,0,L,D),Vt=!0;const z=e.scene;ge&&(ge.at=s),_n(()=>{Vt=!1,ge={key:x,maps:Ro(lt,c),at:performance.now(),cam:R,scene:z},so++})}return ge?p&&!g?{layers:d,accKey:i,maps:ge.maps,srcPaper:n}:((!wt||wt.src!==ge.maps)&&(wt={src:ge.maps,maps:{drip:null,bridge:null,cloud:ge.maps.cloud}},so++),{layers:d,accKey:i,maps:wt.maps,srcPaper:n}):{layers:d,accKey:i,maps:null,srcPaper:n}}const jn=2400,$n=240,kt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function We(e,o){const a=kt[e];a.push(o),a.length>jn&&a.shift()}function Le(e,o,a){const t=kt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((s,p)=>s-p);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function xo(e=$n){const o=kt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:Le("interval",.5,e),frameP95:Le("interval",.95,e),totalP50:Le("total",.5,e),totalP95:Le("total",.95,e),flatP50:Le("flat",.5,e),uploadP50:Le("upload",.5,e),uploadP95:Le("upload",.95,e),mipP50:Le("mip",.5,e),renderP50:Le("render",.5,e),backP50:Le("back",.5,e),bitmapWaitP50:Le("bitmapWait",.5,e),gpuP50:Le("gpu",.5,e),gpuP95:Le("gpu",.95,e)}}function pa(){for(const e of Object.keys(kt))kt[e].length=0}let ut=null,xt=null,He=null,Ye=null,Ke=null,ma="",io="";function da(e){ma=e}function Qt(e){io=e,He&&(He.textContent=e,He.style.display=e?"block":"none")}function Go(e){Ke&&(Ke.disabled=e,Ke.style.opacity=e?".5":"1")}const _e=(e,o=1)=>e===null?"–":e.toFixed(o),co=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function qn(e){if(!Ye)return;Ye.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",co(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((p,l)=>setTimeout(()=>l(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const s=document.createElement("button");s.textContent="Cerrar",co(s),s.onclick=()=>{Ye&&(Ye.textContent="")},a.append(n,s,t),Ye.append(o,a)}function zn(e){ut||typeof document>"u"||(ut=document.createElement("div"),ut.setAttribute("data-superriso-overlay",""),Object.assign(ut.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Ye=document.createElement("div"),Ye.style.pointerEvents="auto",He=document.createElement("div"),Object.assign(He.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Ke=document.createElement("button"),Ke.textContent="Medir",co(Ke),Ke.style.pointerEvents="auto",Ke.onclick=e,xt=document.createElement("div"),Object.assign(xt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ut.append(Ye,He,Ke,xt),document.body.appendChild(ut),setInterval(()=>{if(!xt)return;const o=xo();xt.textContent=`${ma}
fps ${_e(o.fps)} · frame p50 ${_e(o.frameP50)} p95 ${_e(o.frameP95)} ms
SR p50 ${_e(o.totalP50)} p95 ${_e(o.totalP95)} ms (aplanado ${_e(o.flatP50)} · subida ${_e(o.uploadP50)} · mip ${_e(o.mipP50)} · motor ${_e(o.renderP50)} · vuelta ${_e(o.backP50)})
GPU motor p50 ${_e(o.gpuP50)} p95 ${_e(o.gpuP95)} ms`,io&&He&&(He.textContent=io)},500))}const yt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function va(e){return e&&yt?new OffscreenCanvas(1,1):document.createElement("canvas")}const go=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,bo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},ze=bo(),lo=bo();function ft(e,o,a,t,n,s){const{canvas:p,ctx:l}=e;return(p.width!==a||p.height!==t)&&(p.width=a,p.height=t),l.setTransform(1,0,0,1,0,0),l.globalAlpha=1,l.globalCompositeOperation="source-over",l.fillStyle=n,l.fillRect(0,0,a,t),l.globalCompositeOperation=s?"source-over":"multiply",l.imageSmoothingEnabled=!0,l.imageSmoothingQuality="medium",l.drawImage(o,0,0,a,t),l.globalCompositeOperation="source-over",p}let Ee=null,Ht=!1,Wo=0;function Un(e,o,a){Wo++;const t=Wo;let n=null;if(Ee&&Ee.bmp.width===o&&Ee.bmp.height===a?n={bmp:Ee.bmp,lag:t-Ee.frame}:Ee&&Ee.bmp.close(),Ee=null,!Ht){Ht=!0;const s=performance.now();createImageBitmap(e).then(p=>{We("bitmapWait",performance.now()-s),Ee&&Ee.bmp.close(),Ee={bmp:p,frame:t}}).catch(()=>{}).finally(()=>{Ht=!1})}return n}function On(){Ee&&Ee.bmp.close(),Ee=null}function st(e,o,a,t,n,s,p){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!p,e.drawImage(o,0,0,a,t,0,0,n,s)}finally{e.restore()}}function Tt(e,o,a,t,n,s,p){const l=go(o)?o.transferToImageBitmap():null;try{st(e,l??o,a,t,n,s,p)}finally{l?.close()}}const Qe=bo();let ko=!1;function So(e,o,a){const t=go(e)?e.transferToImageBitmap():null;try{return(Qe.canvas.width!==o||Qe.canvas.height!==a)&&(Qe.canvas.width=o,Qe.canvas.height=a),Qe.ctx.globalCompositeOperation="copy",Qe.ctx.drawImage(t??e,0,0),ko=!0,Qe.canvas}finally{t?.close()}}const At=()=>ko?Qe.canvas:null,uo=()=>{ko=!1},Lt=()=>({res:1,sim:!1,preview:0,lossless:X.lossless,pipe:0,hold:!1,holdFps:12});function ha(e,o,a){if(!X.auto)return{m:{res:X.resScale,sim:X.simUpload,preview:X.preview,lossless:X.lossless,pipe:X.pipe,hold:X.hold,holdFps:12},level:"manual"};const t=Mn(e,o);return t!=="preview"?{m:Lt(),level:t}:a.fullQuality?{m:{...Lt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:X.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const Gn=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),mt={inks:null,params:null};function Rt(e,o,a,t){const{settings:n,isDarkMode:s,isPixelArt:p}=a,l=n.technique==="xerox",r=n.technique==="stencil",d=l?Ja(n.xerox,e*t.res,n.resolution):r?nn(n.stencil,e*t.res,n.resolution):Ua(n,e*t.res),i=Math.round(240*d.pxmm),c=Math.round(i*o/e),x=t.sim?Math.min(e,i):e,R=t.sim?Math.min(o,c):o,g=Da(s,p),h=s&&!X.darkPaperFromBase,L=h?[1,1,1]:ce(g),D=l?Aa(n,a.shapes,a.hiddenLayers,L,h?g:null):null;D&&a.isLive&&Ta({rows:D.rows,what:D.what,zones:D.zones});const z=D?{inks:D.paint,names:D.rows.map(u=>u.id??""),opac:[],srcPaper:L}:r?{inks:[],names:[],opac:[],srcPaper:L}:La(a.shapes,a.hiddenLayers,n,L,h?g:null);a.isLive&&(mt.inks=z);const ee=[e,o,+s,+p,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+X.mip,+X.offscreenBack,+X.preserveDrawingBuffer,+X.darkPaperFromBase,n.technique,...D?[n.resolution,JSON.stringify(n.xerox),(D.keys??[]).join(","),Tn()]:r?[n.resolution,JSON.stringify(n.stencil),Nn()]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],z.inks.join(",")].join("|"),Y=D?{x:n.xerox,mk:D,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0,k=r?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:L,darkBase:h?g:null,bg:ce(g),isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:d,fw:x,fh:R,base:g,srcPaper:L,inks:z,key:ee,xerox:Y,stencil:k}}function pt(e){const o=e.stencil;if(o){const n=In(o,(o.isLive?ze:lo).canvas,e.style,1);return o.isLive&&Ra(n.layers.map(s=>({hex:s.hex,kind:s.kind}))),mt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return mt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:Ln((a.isLive?ze:lo).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return mt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const _t=e=>e%9999+1,St=e=>Math.floor(performance.now()*e/1e3);function Dt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):St(o)}const Je=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Bt=null;const Xo=()=>{Bt?.destroy(),Bt=null};function Wn(e,o,a,t,n){const s=performance.now(),p=t.exportFrame,l=!p||p.index===0,r=!p||p.index>=p.count-1;try{l&&Xo();const d=Bt??(Bt=ra(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),i=Lt(),c=Rt(o,a,t,i),x=ft(lo,e.canvas,c.fw,c.fh,c.base,t.isDarkMode);return d.setSource(x,!0),d.render({...pt(c),seed:_t(Dt(t))},Je(i)),d.gl.isContextLost()?!1:(Tt(e,d.canvas,d.width,d.height,o,a,!!c.style.crisp),dt&&console.info(`[SuperRiso] export frame ${p?`${p.index+1}/${p.count}`:"single"} ${o}×${a} → sim ${d.width}×${d.height}: ${(performance.now()-s).toFixed(1)} ms · ${d.lastVariants}`),!0)}finally{r&&Xo()}}const fo=2e3,xa=8e3,po=60,Ko=8,rt={...ia,simUpload:!0,auto:!1,lossless:!1},bt=e=>new Promise(o=>setTimeout(o,e)),Ve=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function Xn(){let o=ot.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),s=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:s}}function Kn(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,s=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,l])=>l!==null).sort((l,r)=>r[1]-l[1])[0],p=[];return s&&s[1]>=3&&p.push(`${s[0]} ${Ve(s[1])} ms`),t!==null&&t>=3&&p.push(`fuera de nuestras etapas ${Ve(t)} ms`),p.length?p.join(" + "):"sin espera apreciable"}async function Vo(e){const o=ot.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const s=o.report().find(p=>p.name==="SCAN");if(s&&s.n>=po)break;await bt(100)}e==="timer"&&(await bt(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(s=>s.p50!==null).sort((s,p)=>p.p50-s.p50).map(s=>s.name);return{mode:e,lines:t.map(s=>`  ${s.name.padEnd(13)} ${`${s.info.w}×${s.info.h}`.padEnd(10)} att ${s.info.att}  p50 ${Ve(s.p50,3).padStart(7)} ms  #${n.indexOf(s.name)+1}  (n=${s.n})`)}}function Vn(e,o,a,t,n){const s=Xn(),p=e.find(d=>d.id==="A")?.s.frameP50??null,l=ot.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Ba} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${H.canvasW}×${H.canvasH} · simulación (última) ${l?`${l.width}×${l.height}`:"–"}`),r.push(`GPU: ${s.renderer} · MAX_TEXTURE_SIZE ${s.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${yt?"sí":"no"}`),r.push(`Modo ${H.isDark?"oscuro":"claro"} · preset de cámara: ${H.preset||"–"} (velocidad ${H.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const d of a)r.push(`AVISO: ${d}`);r.push(`Cada fila: ${fo/1e3} s de calentamiento descartados + ${xa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const d of e){const i=d.s,c=R=>Ve(R,2).padStart(6),x=!d.patch.bypass&&i.frameP50!==null&&p!==null&&i.totalP50!==null?i.frameP50-p-i.totalP50:null;r.push(`${(d.id+" "+d.label).padEnd(20)}${Ve(i.fps).padStart(5)}  ${(Ve(i.frameP50)+"/"+Ve(i.frameP95)).padEnd(11)} |${c(i.totalP50)}${c(i.flatP50)} ${c(i.uploadP50)}${c(i.uploadP95)}${c(i.mipP50)}${c(i.renderP50)}${c(i.backP50)} |${c(x)}    |${c(i.gpuP50)}  ${d.res.padEnd(10)}  ${d.n.pipe}/${d.n.sync}/${d.n.held}  (n=${i.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const d of e)d.patch.bypass||r.push(`  ${d.id} ${d.label}: ${Kn(d,p)}`);for(const d of n)d&&(r.push(""),r.push(d.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${po} frames, temporizador de GPU por pasada:`),d.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...d.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Qn(){if(Yt)return;const e=[],o=performance.now()-H.lastCallAt;if(H.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):H.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,Go(!0);const a={...X},t=[],n=[];let s=!1,p="–",l=0;const r=async d=>{Qt(`Midiendo ${d.id} (${++l}/${Ko})…`),Ot(d.patch),await bt(fo),pa();const i={pipe:H.pipeFrames,sync:H.pipeSyncFrames,held:H.heldFrames};await bt(xa);const c=xo(1/0);c.gpuP50!==null&&(s=!0);const x={pipe:H.pipeFrames-i.pipe,sync:H.pipeSyncFrames-i.sync,held:H.heldFrames-i.held},R=ot.engineInfo(),g={id:d.id,label:d.label,res:d.patch.bypass||!R?"–":`${R.width}×${R.height}`,s:c,patch:d.patch,n:x};return t.push(g),g};try{await r({id:"A",label:"bypass",patch:{...ia,bypass:!0,auto:!1}});const d=await r({id:"B",label:".75 pipe1",patch:{...rt,resScale:.75,pipe:1}}),i=await r({id:"C",label:".75 pipe2",patch:{...rt,resScale:.75,pipe:2}}),c=(i.s.frameP50??1e9)<(d.s.frameP50??1e9)?2:1;p=`pipe${c} (${c===2?"C":"B"}: frame p50 ${Ve(c===2?i.s.frameP50:d.s.frameP50)} ms frente a ${Ve(c===2?d.s.frameP50:i.s.frameP50)})`,await r({id:"D",label:`.75 pipe${c} lossless`,patch:{...rt,resScale:.75,pipe:c,lossless:!0}}),await r({id:"E",label:`.75 pipe${c} preview`,patch:{...rt,resScale:.75,pipe:c,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${c} preview`,patch:{...rt,resScale:1,pipe:c,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${c} hold`,patch:{...rt,resScale:.75,pipe:c,hold:!0}}),Qt(`Midiendo P (${++l}/${Ko})… perfilado por pasada`),Ot({...rt,resScale:.75,pipe:1}),await bt(fo),n.push(await Vo("sync")),n.push(await Vo("timer"))}finally{Ot(a),Qt(""),Go(!1),Yt=!1}qn(Vn(t,s,e,p,n))}const Hn=["greennoise1024","ink_black","ink_red","ink_lut"];let Nt=null,Ct=!1,mo=!1,ie=null,Me=va(X.offscreenBack),Qo=X.preserveDrawingBuffer,Jt=0;const yo=(e,o)=>{Ct||(Ct=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},Yn=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(Hn.map(Yn)).then(([e,o,a,t])=>{Nt={green:e,exBlack:o,exRed:a,exLut:t}}).catch(e=>yo("textures",e));const ga=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===Me&&(mo=!0,ie=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===Me&&(mo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};ga(Me);const ba=()=>{const e=Me;ie=null,On(),ke=null,$e=null,fe=null,Re=null,Xe=null,Ae=null,uo(),Me=va(X.offscreenBack),ga(Me),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};ot.recreateEngine=ba;ot.engineInfo=()=>ie?{gl:ie.gl,width:ie.width,height:ie.height}:null;ot.profiler=()=>ie?ie.profiler:null;const ka=()=>[`pdb ${X.preserveDrawingBuffer?"on":"off"}`,`mip ${X.mip?"on":"off"}`,X.bitmapUpload?"bitmap":"",X.offscreenBack?yt?"offscreen":"offscreen→DOM":"",X.bypass?"BYPASS":""].filter(Boolean).join(" · ");dt&&(zn(()=>{Qn()}),da(`SUPER RISO · ${ka()}`),window.__superRiso={KNOBS:X,snapshot:xo,reset:pa,live:H,qualityReport:Pn,isSuperRisoPreviewDevice:Ca,get lastChange(){return la},get inks(){return mt.inks},get params(){return mt.params},get engine(){return ie},get disabled(){return Ct},get glCanvas(){return Me},get flat(){return ze.canvas}});function Mo(){return ie&&(Qo!==X.preserveDrawingBuffer||go(Me)!==(X.offscreenBack&&yt))&&ba(),ie||(ie=ra(Me,Nt,{preserveDrawingBuffer:X.preserveDrawingBuffer}),Qo=X.preserveDrawingBuffer),ie}let De=0,ke=null,$e=null,fe=null,Re=null;const ne={begin:0,upload:0,mip:0,render:0,backBegin:0};let Xe=null,Ae=null;const Sa=()=>Ct||mo||!Nt||X.bypass;function er(e,o,a){if(!a.isLive||(De++,$e=null,ne.begin=0,ne.upload=0,ne.mip=0,ne.render=0,ne.backBegin=0,Sa()))return;const{m:t}=ha(e,o,a.settings);if(!t.pipe||Re)return;const n=performance.now();try{const s=Rt(e,o,a,t);if(t.pipe===2){Jn(s,t,Dt(a),n);return}if(!ke||ke.key!==s.key||ke.frame!==De-1){ke=null;return}const p=St(t.holdFps);if(t.hold&&fe&&fe.key===s.key&&fe.tick===p&&At())return;const l=Mo();l.setSource(ze.canvas,X.mip);const r=performance.now();l.render({...ke.params,seed:_t(Dt(a))},Je(t));const d=performance.now();if(ke=null,l.gl.isContextLost())return;$e={key:s.key,frame:De,ew:l.width,eh:l.height,crisp:!!s.style.crisp,tick:p},ne.upload=l.lastUploadMs,ne.mip=l.lastMipMs,ne.render=d-r,ne.begin=d-n}catch(s){ie=null,yo("exception in beginSuperRisoFrame",s)}}function Jn(e,o,a,t){const n=St(o.holdFps);if(Xe&&Xe.frame===De-1&&Xe.key===e.key&&ie){const r=performance.now();ie.present(),So(Me,Xe.ew,Xe.eh),ne.backBegin=performance.now()-r,Ae={...Xe,frame:De}}if(Xe=null,!ke||ke.key!==e.key||ke.frame!==De-1){ke=null,ne.begin=performance.now()-t;return}if(o.hold&&Ae&&Ae.key===e.key&&Ae.tick===n){ne.begin=performance.now()-t;return}const s=Mo();s.setSource(ze.canvas,X.mip);const p=performance.now();s.render({...ke.params,seed:_t(a)},Je(o,!0));const l=performance.now();ke=null,!s.gl.isContextLost()&&(Xe={key:e.key,frame:De,tick:n,ew:s.width,eh:s.height,crisp:!!e.style.crisp},ne.upload=s.lastUploadMs,ne.mip=s.lastMipMs,ne.render=l-p,ne.begin=l-t)}function Zt(e,o,a,t,n,s,p,l,r){if(t.hold){const d=So(Me,s,p);fe={key:n,tick:r,ew:s,eh:p,crisp:l},st(e,d,s,p,o,a,l)}else Tt(e,Me,s,p,o,a,l)}function gt(e,o,a,t,n,s=!1){const p=Mo(),l=performance.now(),r=X.bitmapUpload?Un(o,e.fw,e.fh):null,d=performance.now()-l;r?(p.setSource(r.bmp,X.mip),r.bmp.close(),H.bitmapLagFrames=r.lag):p.setSource(o,X.mip);const i=performance.now();return p.render({...a,seed:_t(t)},n),s&&p.profiler.timerAvailable?qo(H.canvasW,H.canvasH,p.gpuMs===null?null:p.gpuMs+performance.now()-l,"GPU"):s&&(p.finish(),qo(H.canvasW,H.canvasH,performance.now()-l,"readback")),ne.upload+=p.lastUploadMs+d,ne.mip+=p.lastMipMs,ne.render+=performance.now()-i,p}function tr(e,o,a,t){const n=performance.now(),{isDarkMode:s,isLive:p,info:l}=t;if(p&&(dt&&Jt>0&&We("interval",n-Jt),Jt=n,H.lastCallAt=n,H.isDark=s,H.canvasW=o,H.canvasH=a,H.preset=l.preset,H.speed=l.speed,H.offscreenFallback=X.offscreenBack&&!yt),Sa())return!1;try{if(!p)return Wn(e,o,a,t,Nt);const{m:r,level:d}=ha(o,a,t.settings),i=Dt(t),c=Rt(o,a,t,r);H.level=d,fe&&(fe.key!==c.key||!r.hold)&&(fe=null,Re||uo());const x=wn(t.motion,t.scene,n);let R=n,g=n;const h=(k,u=r)=>{if(H.lastPath=k,!dt)return!0;const m=performance.now();return We("flat",R-n),We("upload",ne.upload),We("mip",ne.mip),We("render",ne.render),We("back",ne.backBegin+(m-g)),We("total",ne.begin+(m-n)),ie&&ie.gpuMs!==null&&We("gpu",ie.gpuMs),da(`SUPER RISO · ${d} · ${o}×${a} → sim ${ie?`${ie.width}×${ie.height}`:"–"} · src ${c.fw}×${c.fh} · ${Gn(u)} · ${ka()} · ${k}`),!0};if(d==="detect"){const k=ft(ze,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const u=gt(c,k,pt(c),i,Je(r),!0);return u.gl.isContextLost()?!1:(g=performance.now(),Tt(e,Me,u.width,u.height,o,a,!!c.style.crisp),h("detect"))}if(d==="preview"&&x>=yn){const k=Lt(),u=Rt(o,a,t,k);ke=null,$e=null,fe=null;const m=At();if(Re&&Re.key===u.key&&Re.tick===i&&m)return g=performance.now(),st(e,m,Re.ew,Re.eh,o,a,Re.crisp),H.heldFrames++,h("refined",k);const E=ft(ze,e.canvas,u.fw,u.fh,u.base,s);R=performance.now();const F=gt(u,E,pt(u),i,Je(k));if(F.gl.isContextLost())return!1;g=performance.now();const O=So(Me,F.width,F.height);return Re={key:u.key,tick:i,ew:F.width,eh:F.height,crisp:!!u.style.crisp},st(e,O,F.width,F.height,o,a,Re.crisp),h("refine",k)}Re&&(Re=null,uo());const L=()=>r.hold&&fe&&fe.key===c.key?At():null;if(r.pipe===2){const k=ft(ze,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const u=pt(c);ke={key:c.key,frame:De,params:u},g=performance.now();const m=At();if(Ae&&Ae.key===c.key&&m&&(Ae.frame===De||r.hold))return st(e,m,Ae.ew,Ae.eh,o,a,Ae.crisp),Ae.frame===De?H.pipeFrames++:H.heldFrames++,h(Ae.frame===De?"pipe2":"held");Ae=null;const E=gt(c,k,u,i,Je(r));return E.gl.isContextLost()?!1:(g=performance.now(),Tt(e,Me,E.width,E.height,o,a,!!c.style.crisp),H.pipeSyncFrames++,h("sync"))}if(r.pipe){const k=ft(ze,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const u=pt(c);if(ke={key:c.key,frame:De,params:u},g=performance.now(),$e&&$e.key===c.key&&$e.frame===De)return Zt(e,o,a,r,c.key,$e.ew,$e.eh,$e.crisp,$e.tick),H.pipeFrames++,h("pipe");const m=L();if(m&&fe)return st(e,m,fe.ew,fe.eh,o,a,fe.crisp),H.heldFrames++,h("held");const E=gt(c,k,u,i,Je(r));return E.gl.isContextLost()?!1:(g=performance.now(),Zt(e,o,a,r,c.key,E.width,E.height,!!c.style.crisp,St(r.holdFps)),H.pipeSyncFrames++,h("sync"))}const D=St(r.holdFps),z=L();if(z&&fe&&fe.tick===D)return st(e,z,fe.ew,fe.eh,o,a,fe.crisp),H.heldFrames++,h("held");const ee=ft(ze,e.canvas,c.fw,c.fh,c.base,s);R=performance.now();const Y=gt(c,ee,pt(c),i,Je(r));return Y.gl.isContextLost()?!1:(g=performance.now(),Zt(e,o,a,r,c.key,Y.width,Y.height,!!c.style.crisp,D),h("sync"))}catch(r){return ie=null,yo("exception in applySuperRiso",r),!1}}export{tr as applySuperRiso,er as beginSuperRisoFrame};
