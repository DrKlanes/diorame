import{A as ut}from"./index-CaP4Y7WO.js";const lt=17.2,ft=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,q=`#version 300 es
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
`,Ie=`
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
`,Ke=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,ae=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,pt=q+Ke+ae+`
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
}`,mt=q+`
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
}`,dt=q+Ke+ae+`
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
}`,vt=q+ae+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,xt=q+ae+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,gt=q+Ie+ae+`
uniform sampler2D uSepA, uSepB, uSolA, uSolB, uLocA, uLocB, uGreen; uniform int uN, uMode;
uniform float uGrain, uLoad, uLpi, uMottle, uStarve, uTexAmp, uStreak, uSolidLv, uTrap; uniform float uExSel[8];
// Grain touch: umbral sobre un campo continuo de ruido azul (un texel = un grano). La cobertura es exactamente x
// (CDF inversa medida del campo), los granos se funden en tonos medios y quedan huecos sueltos en tonos altos. Sin rejilla.
float fmDots(vec2 mm, float x, float s){
  // Grain touch: umbral sobre "ruido verde" (racimos de puntos, como la difusión de error de la riso + tinta que se funde).
  // El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.
  float cov=0.; float tx=uGrain/3.; float px=1./(uPxMm*tx);
  for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+vec2(s*131.,s*57.)+(vec2(i,j)-1.)/3.*px;
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
}`,ht=q+Ie+ae+`
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
  oA=A; oB=B; }`,bt=q+Ie+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,St=q+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,V=8,Et={Black:.32,Cornflower:.35,"Light Gray":.4,Gray:.35,Granite:.35,"Metallic Gold":.4,Charcoal:.25,Midnight:.2},Tt={"#000000":"#25222a"},At=[["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]],G=t=>(t=t.replace("#",""),[0,2,4].map(r=>parseInt(t.substr(r,2),16)/255)),Pt=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4),kt=t=>t<=.0031308?t*12.92:1.055*Math.pow(t,1/2.4)-.055,ve=t=>t.map(Pt);function N(t){const[r,a,e]=ve(t),s=Math.cbrt(.4122214708*r+.5363325363*a+.0514459929*e),c=Math.cbrt(.2119034982*r+.6806995451*a+.1073969566*e),i=Math.cbrt(.0883024619*r+.2817188376*a+.6299787005*e);return[.2104542553*s+.793617785*c-.0040720468*i,1.9779984951*s-2.428592205*c+.4505937099*i,.0259040371*s+.7827717662*c-.808675766*i]}const Be=(t,r)=>Math.hypot(t[0]-r[0],t[1]-r[1],t[2]-r[2]),Te=(t,r)=>Math.hypot(t[0]-r[0],2*(t[1]-r[1]),2*(t[2]-r[2])),de=t=>Tt[t.toLowerCase()]||t,yt=(t,r)=>Et[t]??(N(G(r))[0]<.3?.3:.15);function Pe(t){let r=t>>>0||1;return()=>(r^=r<<13,r>>>=0,r^=r>>17,r^=r<<5,r>>>=0,r/4294967296)}function Rt(t,r=160){const a=t.width,e=t.height,s=Math.min(1,r/Math.max(a,e)),c=Math.max(1,Math.round(a*s)),i=Math.max(1,Math.round(e*s)),l=document.createElement("canvas");l.width=c,l.height=i;const f=l.getContext("2d");f.fillStyle="#fff",f.fillRect(0,0,c,i),f.drawImage(t,0,0,c,i);const p=f.getImageData(0,0,c,i).data,u=[];for(let h=0;h<p.length;h+=4)u.push([p[h]/255,p[h+1]/255,p[h+2]/255]);return u}function wt(t,r){const a=t.map(N);let e=[];const s=Pe(5);for(e.push(a[Math.floor(s()*a.length)]);e.length<r;){let f=null,p=-1;for(let u=0;u<200;u++){const h=a[Math.floor(s()*a.length)],x=Math.min(...e.map(R=>Be(R,h)));x>p&&(p=x,f=h)}e.push(f)}const c=new Array(a.length).fill(0);let i=[],l=[];for(let f=0;f<18;f++){for(let u=0;u<a.length;u++){let h=0,x=1e9;for(let R=0;R<r;R++){const v=Be(a[u],e[R]);v<x&&(x=v,h=R)}c[u]=h}const p=e.map(()=>[0,0,0,0]);for(let u=0;u<a.length;u++){const h=p[c[u]];h[0]+=t[u][0],h[1]+=t[u][1],h[2]+=t[u][2],h[3]++}i=p.map(u=>u[3]?[u[0]/u[3],u[1]/u[3],u[2]/u[3]]:[1,1,1]),l=p.map(u=>u[3]),e=i.map((u,h)=>l[h]?N(u):e[h])}return i.map((f,p)=>({c:f,n:l[p],L:N(f)})).sort((f,p)=>p.n-f.n)}function Bt(t,r,a){const e=Rt(t),s=wt(e,16),c=e.length;let i=s.find(v=>v.L[0]>.82&&Math.hypot(v.L[1],v.L[2])<.05&&v.n/c>.05);if(!i&&a===1){const v=s.filter(g=>g.L[0]>.65&&Math.hypot(g.L[1],g.L[2])<.06&&g.n/c>.02).sort((g,B)=>B.L[0]-g.L[0]);v.length&&(i=v[0])}const l=i?i.c:[1,1,1],f=(v,g)=>{const B=ve(v),w=ve(g),M=[];for(let F=0;F<=1.0001;F+=.1)M.push(N(B.map(($,_)=>kt($+(w[_]-$)*F))));return M},p=s.filter(v=>v!==i&&v.n/c>.002),u=[];let h=[N(l)];const x=v=>Math.min(...h.map(g=>Te(g,v))),R=.02;for(let v=0;v<r;v++){let g=null,B=0;for(const M of p){if(u.includes(M)||u.some(_=>Te(_.L,M.L)<.09))continue;const F=f(l,M.c).concat(...u.map(_=>f(_.c,M.c)));let $=0;for(const _ of s){const ee=x(_.L),te=Math.max(0,ee-R),ge=Math.max(0,Math.min(ee,...F.map(he=>Te(he,_.L)))-R);$+=_.n*(te-ge)}$>B&&(B=$,g=M)}if(!g||B/c<6e-4)break;const w=g;u.push(w),h=h.concat(f(l,w.c),...u.slice(0,-1).map(M=>f(M.c,w.c)))}return{chosen:u,srcPaper:l}}function Lt(t,r,a){let e=null,s=1e9;const c=N(r);for(const[i,l]of t){if(a.has(i))continue;const f=Te(N(G(l)),c);f<s&&(s=f,e=[i,l])}return e}function Mt(t,r,a,e=1){const{chosen:s,srcPaper:c}=Bt(t,a,e);let i=[];{const l=At.filter(p=>p[0]!=="White"),f=new Set;for(const p of s){const u=Lt(l,p.c,f);u&&(f.add(u[0]),i.push(u))}}return i.length||(i=[["Black","#000000"]]),i=i.slice(0,V).sort((l,f)=>N(G(de(f[1])))[0]-N(G(de(l[1])))[0]),{inks:i.map(l=>l[1]),names:i.map(l=>l[0]),opac:i.map(l=>yt(l[0],l[1])),srcPaper:c}}const Dt={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Xe={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},_t={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},We={clean:{label:"Taller limpio",panel:{inkSet:"own",maxInks:6,paper:"white",screen:"grain",screenSize:.35,imperfection:.2,resolution:.85}},zine:{label:"Fanzine",panel:{inkSet:"dpal",maxInks:4,paper:"recycled",screen:"grain",screenSize:.65,imperfection:.75,resolution:.6}},lofi:{label:"Lo-fi",panel:{inkSet:"own",maxInks:4,paper:"natural",screen:"grain",screenSize:.8,imperfection:.55,resolution:.1}},cmyk:{label:"Cuatricromía",panel:{inkSet:"cmyk",maxInks:4,paper:"white",screen:"dots",screenSize:.45,imperfection:.45,resolution:.7}}},C=(t,r,a)=>t+(r-t)*a;function Ct(t,r){const a=Object.assign({},_t,t),e=a.imperfection,s=a.resolution,c=a.screenSize,i=240,l=r*C(.4,1,s)/i;return Object.assign({printW:i,pxmm:l,crisp:s<.5,screen:a.screen==="dots"?1:0,grain:C(.09,.3,c),lpi:Math.round(C(120,45,c)),misreg:.04+1.1*Math.pow(e,1.6),rot:C(.01,.16,e),scl:C(.2,1.6,e),edge:C(.25,1.05,e),voids:C(.05,.45,e),texAmp:C(.6,1.45,e),starve:C(.05,.4,e),mottle:C(.3,1.2,e),bleed:C(.04,.07,e),inkLoad:C(.75,.5,e),scanBlur:C(1,.65,s),scanNoise:C(.6,.35,s)},Xe[a.paper]||Xe.natural)}function It(t){const a=document.createElement("canvas");a.width=a.height=1024;const e=a.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=Pe(t);e.lineCap="round";for(let c=0;c<2600;c++){const i=(.25+s()*s()*1.6)*85,l=s()*Math.PI*2,f=s()*1024,p=s()*1024,u=(s()-.5)*.9,h=(.012+s()*.03)*85;e.strokeStyle=`rgba(255,255,255,${.15+s()*.55})`,e.lineWidth=h;for(const x of[-1024,0,1024])for(const R of[-1024,0,1024]){const v=f+x,g=p+R;v<-i-10||v>1024+i+10||g<-i-10||g>1024+i+10||(e.beginPath(),e.moveTo(v,g),e.quadraticCurveTo(v+Math.cos(l+u)*i*.5,g+Math.sin(l+u)*i*.5,v+Math.cos(l)*i,g+Math.sin(l)*i),e.stroke())}}return a}function Nt(t){const a=document.createElement("canvas");a.width=a.height=1024;const e=a.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=Pe(t);e.lineCap="round",e.globalCompositeOperation="lighter";const c=1024/61;for(let i=0;i<70;i++){const l=s()<.7?"255,0,0":"0,255,0",f=(.4+s()*s()*3.5)*c,p=s()*Math.PI*2,u=s()*1024,h=s()*1024,x=(s()-.5)*1.6,R=(.015+s()*.03)*c;e.strokeStyle=`rgba(${l},${.35+s()*.5})`,e.lineWidth=Math.max(.6,R);for(const v of[-1024,0,1024])for(const g of[-1024,0,1024]){const B=u+v,w=h+g;B<-f||B>1024+f||w<-f||w>1024+f||(e.beginPath(),e.moveTo(B,w),e.bezierCurveTo(B+Math.cos(p+x)*f*.35,w+Math.sin(p+x)*f*.35,B+Math.cos(p-x)*f*.7,w+Math.sin(p-x)*f*.7,B+Math.cos(p)*f,w+Math.sin(p)*f),e.stroke())}}for(let i=0;i<160;i++){e.fillStyle=`rgba(255,0,0,${.2+s()*.6})`;const l=(.02+s()*s()*.12)*c;e.beginPath(),e.arc(s()*1024,s()*1024,Math.max(.5,l),0,7),e.fill()}return a}function Ft(t,r,a={}){const e=t.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!e)throw new Error("WebGL2 no disponible");const s=e.getParameter(e.MAX_TEXTURE_SIZE);function c(d){const n=e.createProgram();for(const[b,k]of[[e.VERTEX_SHADER,ft],[e.FRAGMENT_SHADER,d]]){const T=e.createShader(b);if(e.shaderSource(T,k),e.compileShader(T),!e.getShaderParameter(T,e.COMPILE_STATUS)){const m=e.getShaderInfoLog(T);throw new Error(m??"shader compile error")}e.attachShader(n,T)}if(e.bindAttribLocation(n,0,"p"),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(n)??"program link error");const L={},P=e.getProgramParameter(n,e.ACTIVE_UNIFORMS);for(let b=0;b<P;b++){const k=e.getActiveUniform(n,b);L[k.name.replace(/\[0\]$/,"")]=e.getUniformLocation(n,k.name)}return{p:n,u:L}}const i={sep0:c(dt),lut:c(pt),prep:c(mt),sep:c(vt),blur:c(xt),screen:c(gt),spread:c(ht),compose:c(bt),scan:c(St)},l=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,l),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);function f(d,n,{filter:L=e.LINEAR,wrap:P=e.CLAMP_TO_EDGE}={}){const b=e.createTexture();return e.bindTexture(e.TEXTURE_2D,b),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,d,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,L),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,L),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,P),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,P),b}function p(d,{filter:n=e.LINEAR,wrap:L=e.CLAMP_TO_EDGE,mip:P=!1}={},b=e.createTexture()){return e.bindTexture(e.TEXTURE_2D,b),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,d),P&&e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,P?e.LINEAR_MIPMAP_LINEAR:n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,L),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,L),b}function u(d,n,L=1){const P=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,P);const b=[];for(let k=0;k<L;k++){const T=f(d,n);e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+k,e.TEXTURE_2D,T,0),b.push(T)}return e.drawBuffers(b.map((k,T)=>e.COLOR_ATTACHMENT0+T)),{f:P,t:b,w:d,h:n}}function h(d){d.t.forEach(n=>e.deleteTexture(n)),e.deleteFramebuffer(d.f)}function x(d,n,L){const P=n?n.w:t.width,b=n?n.h:t.height;e.useProgram(d.p),e.bindFramebuffer(e.FRAMEBUFFER,n?n.f:null),e.viewport(0,0,P,b);let k=0;const T=d.u,m={t(E,S){T[E]!=null&&(e.activeTexture(e.TEXTURE0+k),e.bindTexture(e.TEXTURE_2D,S),e.uniform1i(T[E],k),k++)},f(E,...S){const D=T[E];D!=null&&(S.length===1?e.uniform1f(D,S[0]):S.length===2?e.uniform2f(D,S[0],S[1]):S.length===3?e.uniform3f(D,S[0],S[1],S[2]):e.uniform4f(D,S[0],S[1],S[2],S[3]))},i(E,S){T[E]!=null&&e.uniform1i(T[E],S)},fv(E,S,D){const O=T[E];if(O==null)return;const H=new Float32Array(S);D===1?e.uniform1fv(O,H):D===2?e.uniform2fv(O,H):e.uniform3fv(O,H)},m2(E,S){T[E]!=null&&e.uniformMatrix2fv(T[E],!1,new Float32Array(S))}};m.f("uRes",P,b),L&&L(m),e.drawArrays(e.TRIANGLES,0,3)}const R=p(r.green,{wrap:e.REPEAT}),v={b:p(r.exBlack,{wrap:e.REPEAT,mip:!0}),bs:[r.exBlack.width,r.exBlack.height],r:p(r.exRed,{wrap:e.REPEAT,mip:!0}),rs:[r.exRed.width,r.exRed.height],lut:p(r.exLut)},g=p(It(11),{wrap:e.REPEAT,mip:!0}),B=p(Nt(23),{wrap:e.REPEAT,mip:!0}),w=d=>{d.t("uExB",v.b),d.t("uExR",v.r),d.t("uExLut",v.lut),d.f("uExBSize",v.bs[0],v.bs[1]),d.f("uExRSize",v.rs[0],v.rs[1]),d.f("uExPxMm",lt)},M=u(1089,33,2);let F="";const $=e.createTexture();let _=0,ee=0,te=null,ge=0,he=0;function at(d,n){if(d===ge&&n===he)return;ge=d,he=n,te&&Object.values(te).forEach(h);const L=Math.max(1,d>>2),P=Math.max(1,n>>2);te={prep:u(d,n),sep:u(d,n,2),tmp:u(d,n,2),loc:u(d,n,2),qtmp:u(L,P,2),sol:u(L,P,2),scr:u(d,n,2),cov:u(d,n,2),comp:u(d,n)},t.width=d,t.height=n}const ce=e.getExtension("EXT_disjoint_timer_query_webgl2");let Z=null;function st(){if(!ce||!Z||!e.getQueryParameter(Z,e.QUERY_RESULT_AVAILABLE))return;e.getParameter(ce.GPU_DISJOINT_EXT)||(oe.gpuMs=e.getQueryParameter(Z,e.QUERY_RESULT)/1e6),e.deleteQuery(Z),Z=null}const oe={canvas:t,gl:e,lastMs:0,width:0,height:0,gpuMs:null,setSource(d,n=!0){_=d.width,ee=d.height,p(d,{mip:n},$)},render(d){const n=Object.assign({},Dt,d),L=performance.now();st();const P=ce&&!Z?e.createQuery():null;P&&e.beginQuery(ce.TIME_ELAPSED_EXT,P);let b=Math.round(n.printW*n.pxmm),k=Math.round(b*ee/_);const T=Math.min(s,6144);if(Math.max(b,k)>T){const o=T/Math.max(b,k);b=Math.round(b*o),k=Math.round(k*o)}at(b,k),oe.width=b,oe.height=k;const m=te,E=b/n.printW,S=ve(G(n.paper)),D=Math.min(V,n.inks.length),O=n.inks.concat(Array(V).fill("#000000")).slice(0,V),H=n.opac.concat(Array(V).fill(.15)).slice(0,V),be=[];for(let o=0;o<V;o++)be.push(...ve(G(de(O[o]))));const ke=O.map(o=>N(G(de(o)))[0]<.42?0:1),ct=N(G(n.paper)),Fe=O.map(o=>Math.min(1.5,Be(N(G(de(o))),ct)/.5)),Ue=JSON.stringify([O,H,D,n.paper,n.inkCost,n.pair]);Ue!==F&&(x(i.lut,M,o=>{o.fv("uCon",Fe,1),o.fv("uInk",be,3),o.fv("uOp",H,1),o.i("uN",D),o.f("uPaper",...S),o.f("uCost",n.inkCost),o.f("uPair",n.pair)}),F=Ue),x(i.prep,m.prep,o=>{o.t("uSrc",$),o.f("uSrcRes",_,ee),o.f("uSmoothPx",n.smooth*_/n.printW),o.f("uSrcPaper",...n.srcPaper),o.f("uPaper",...S)});const Se=Pe(n.seed*7919+13),$e=[],je=[];for(let o=0;o<V;o++){const re=(Se()*2-1)*n.rot*Math.PI/180,Ee=1+(Se()*2-1)*n.scl/1e3,ue=Math.cos(re)*Ee,U=Math.sin(re)*Ee;$e.push(ue,U,-U,ue);const Ge=Se()*Math.PI*2,Oe=n.misreg*Math.sqrt(Se());je.push(Math.cos(Ge)*Oe,Math.sin(Ge)*Oe)}x(i.blur,m.loc,o=>{o.t("uTexA",m.prep.t[0]),o.t("uTexB",m.prep.t[0]),o.f("uDir",1,0),o.f("uSig",.3*E)}),x(i.blur,m.scr,o=>{o.t("uTexA",m.loc.t[0]),o.t("uTexB",m.loc.t[0]),o.f("uDir",0,1),o.f("uSig",.3*E)}),x(i.sep0,m.tmp,o=>{o.t("uPrepS",m.scr.t[0]),o.t("uPrep",m.prep.t[0]),o.t("uSet",M.t[0]),o.fv("uCon",Fe,1),o.fv("uInk",be,3),o.fv("uOp",H,1),o.i("uN",D),o.f("uPaper",...S),o.f("uCost",n.inkCost),o.f("uPair",n.pair),o.f("uMinDot",n.minDot)}),x(i.sep,m.sep,o=>{o.f("uPxMm",E),o.t("uSA",m.tmp.t[0]),o.t("uSB",m.tmp.t[1]),o.i("uN",D),o.f("uCtr",n.printW/2,k/E/2),o.m2("uM",$e),o.fv("uT",je,2)});const ze=(o,re,Ee,ue)=>{x(i.blur,re,U=>{U.t("uTexA",o.t[0]),U.t("uTexB",o.t[1]),U.f("uDir",1,0),U.f("uSig",ue)}),x(i.blur,Ee,U=>{U.t("uTexA",re.t[0]),U.t("uTexB",re.t[1]),U.f("uDir",0,1),U.f("uSig",ue)})};return ze(m.sep,m.tmp,m.loc,.22*E),ze(m.sep,m.qtmp,m.sol,1.5*E/4),x(i.screen,m.scr,o=>{w(o),o.f("uPxMm",E),o.f("uSeed",n.seed),o.t("uSepA",m.sep.t[0]),o.t("uSepB",m.sep.t[1]),o.t("uSolA",m.sol.t[0]),o.t("uSolB",m.sol.t[1]),o.t("uLocA",m.loc.t[0]),o.t("uLocB",m.loc.t[1]),o.t("uGreen",R),o.i("uN",D),o.i("uMode",+n.screen),o.f("uGrain",n.grain),o.f("uLoad",n.inkLoad),o.f("uLpi",n.lpi),o.f("uMottle",n.mottle),o.f("uStarve",n.starve),o.f("uTexAmp",n.texAmp),o.f("uStreak",n.streak),o.f("uSolidLv",n.solidLv),o.fv("uExSel",ke,1),o.f("uTrap",n.trap)}),x(i.spread,m.cov,o=>{w(o),o.f("uPxMm",E),o.f("uSeed",n.seed),o.t("uScrA",m.scr.t[0]),o.t("uScrB",m.scr.t[1]),o.t("uSepA",m.sep.t[0]),o.t("uSepB",m.sep.t[1]),o.t("uLocA",m.loc.t[0]),o.t("uLocB",m.loc.t[1]),o.i("uN",D),o.f("uBleedPx",n.bleed*E),o.f("uGain",n.gain),o.f("uEdge",n.edge),o.f("uSolidLv",n.solidLv),o.fv("uExSel",ke,1)}),x(i.compose,m.comp,o=>{w(o),o.f("uPxMm",E),o.f("uSeed",n.seed),o.t("uCovA",m.cov.t[0]),o.t("uCovB",m.cov.t[1]),o.t("uSolA",m.sol.t[0]),o.t("uSolB",m.sol.t[1]),o.f("uStarve",n.starve),o.t("uFib",g),o.t("uInc",B),o.i("uN",D),o.fv("uInk",be,3),o.fv("uOp",H,1),o.f("uPaper",...S),o.f("uPaperTex",n.paperTex),o.f("uFibers",n.fibers),o.f("uIncl",n.incl),o.f("uVoids",n.voids),o.f("uMottle",n.mottle),o.f("uTexAmp",n.texAmp),o.fv("uExSel",ke,1)}),x(i.scan,null,o=>{o.f("uSeed",n.seed),o.t("uComp",m.comp.t[0]),o.f("uBlurPx",n.scanBlur),o.f("uNoise",n.scanNoise),o.i("uNorm",+n.normWhite),o.f("uPaper",...S)}),P&&(e.endQuery(ce.TIME_ELAPSED_EXT),Z=P),e.flush(),oe.lastMs=performance.now()-L,oe}};return oe}const Ut=2400,$t=240,xe={interval:[],total:[],flat:[],render:[],back:[],gpu:[]};function ne(t,r){const a=xe[t];a.push(r),a.length>Ut&&a.shift()}function X(t,r,a){const e=xe[t].slice(-a);if(e.length===0)return null;const s=[...e].sort((c,i)=>c-i);return s[Math.min(s.length-1,Math.floor(r*s.length))]}function Ne(t=$t){const r=xe.interval.slice(-t),a=r.length?r.reduce((e,s)=>e+s,0)/r.length:null;return{samples:r.length,fps:a?1e3/a:null,frameP50:X("interval",.5,t),frameP95:X("interval",.95,t),totalP50:X("total",.5,t),totalP95:X("total",.95,t),flatP50:X("flat",.5,t),renderP50:X("render",.5,t),backP50:X("back",.5,t),gpuP50:X("gpu",.5,t),gpuP95:X("gpu",.95,t)}}function Ze(){for(const t of Object.keys(xe))xe[t].length=0}let ie=null,le=null,Q=null,Y=null,W=null,Je="",Le="";function et(t){Je=t}function qe(t){Le=t,Q&&(Q.textContent=t,Q.style.display=t?"block":"none")}function He(t){W&&(W.disabled=t,W.style.opacity=t?".5":"1")}const j=(t,r=1)=>t===null?"–":t.toFixed(r),Me=t=>{Object.assign(t.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function jt(t){if(!Y)return;Y.textContent="";const r=document.createElement("textarea");r.value=t,r.readOnly=!0,r.rows=22,r.wrap="off",Object.assign(r.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const e=document.createElement("div");e.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const s=document.createElement("button");s.textContent="Copiar",Me(s),s.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(t),new Promise((i,l)=>setTimeout(()=>l(new Error("timeout")),1500))]),e.textContent="Copiado ✓"}catch{r.focus(),r.select(),e.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const c=document.createElement("button");c.textContent="Cerrar",Me(c),c.onclick=()=>{Y&&(Y.textContent="")},a.append(s,c,e),Y.append(r,a)}function zt(t){ie||typeof document>"u"||(ie=document.createElement("div"),ie.setAttribute("data-superriso-overlay",""),Object.assign(ie.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Y=document.createElement("div"),Y.style.pointerEvents="auto",Q=document.createElement("div"),Object.assign(Q.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),W=document.createElement("button"),W.textContent="Medir",Me(W),W.style.pointerEvents="auto",W.onclick=t,le=document.createElement("div"),Object.assign(le.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ie.append(Y,Q,W,le),document.body.appendChild(ie),setInterval(()=>{if(!le)return;const r=Ne();le.textContent=`${Je}
fps ${j(r.fps)} · frame p50 ${j(r.frameP50)} p95 ${j(r.frameP95)} ms
SR p50 ${j(r.totalP50)} p95 ${j(r.totalP95)} ms (aplanado+subida ${j(r.flatP50)} · motor ${j(r.renderP50)} · vuelta ${j(r.backP50)})
GPU motor p50 ${j(r.gpuP50)} p95 ${j(r.gpuP95)} ms`,Le&&Q&&(Q.textContent=Le)},500))}const fe=new URLSearchParams(window.location.search),y={preserveDrawingBuffer:fe.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(fe.get("srres"))||1)),mip:fe.get("srmip")!=="0",bypass:fe.get("srbypass")==="1",darkPaperFromBase:fe.get("srdarkpaper")==="bg"},pe={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1},I={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0},se={engineInfo:()=>null,recreateEngine:()=>{}},Ve=t=>{const r=t.preserveDrawingBuffer!==void 0&&t.preserveDrawingBuffer!==y.preserveDrawingBuffer;Object.assign(y,t),r&&se.recreateEngine()},tt=2e3,ot=8e3,ye=[{id:"A",label:"bypass",patch:{...pe,bypass:!0}},{id:"B",label:"defecto",patch:{...pe}},{id:"C",label:"pdb:false",patch:{...pe,preserveDrawingBuffer:!1}},{id:"D",label:"C+res .75",patch:{...pe,preserveDrawingBuffer:!1,resScale:.75}},{id:"E",label:"C+res .5",patch:{...pe,preserveDrawingBuffer:!1,resScale:.5}}],Qe=t=>new Promise(r=>setTimeout(r,t)),me=(t,r=1)=>t===null?"–":t.toFixed(r);let Re=!1;function Gt(){let r=se.engineInfo()?.gl??null,a=null;if(r||(a=document.createElement("canvas"),r=a.getContext("webgl2")),!r)return{renderer:"sin WebGL2",maxTex:"–"};const e=r.getExtension("WEBGL_debug_renderer_info"),s=String(e?r.getParameter(e.UNMASKED_RENDERER_WEBGL):r.getParameter(r.RENDERER)),c=String(r.getParameter(r.MAX_TEXTURE_SIZE));return a&&r.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:s,maxTex:c}}function Ot(t,r,a){const e=Gt(),s=se.engineInfo(),c=[];c.push(`SUPER RISO · medición automática · Diorame ${ut} · ${new Date().toISOString()}`),c.push(`UA: ${navigator.userAgent}`),c.push(`DPR ${window.devicePixelRatio} · canvas vivo ${I.canvasW}×${I.canvasH} · simulación ${s?`${s.width}×${s.height}`:"–"}`),c.push(`GPU: ${e.renderer} · MAX_TEXTURE_SIZE ${e.maxTex} · temporizador GPU: ${r?"sí":"no"}`),c.push(`Modo ${I.isDark?"oscuro":"claro"} · preset de cámara: ${I.preset||"–"} (velocidad ${I.speed||"–"})`);for(const i of a)c.push(`AVISO: ${i}`);c.push("A bypass = módulo cargado, efecto sin aplicar · C pdb:false = preserveDrawingBuffer:false"),c.push(`Cada fila: ${tt/1e3} s de calentamiento descartados + ${ot/1e3} s medidos`),c.push(""),c.push("cfg                 fps    frame p50/p95 ms   SR cpu p50 ms   GPU p50 ms   sim");for(const i of t){const l=i.s;c.push(`${(i.id+" "+i.label).padEnd(18)}  ${me(l.fps).padStart(5)}  ${(me(l.frameP50)+" / "+me(l.frameP95)).padEnd(17)}  ${me(l.totalP50,2).padStart(12)}  ${me(l.gpuP50,2).padStart(10)}   ${i.res}  (n=${l.samples})`)}return c.join(`
`)}async function Xt(){if(Re)return;const t=[],r=performance.now()-I.lastCallAt;if(I.lastCallAt===0||r>1e3?t.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):I.speed>0||t.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),t.length&&!window.confirm(`${t[0]}.

¿Medir igualmente?`))return;Re=!0,He(!0);const a={...y},e=[];let s=!1;try{for(let c=0;c<ye.length;c++){const i=ye[c];qe(`Midiendo ${i.id} (${c+1}/${ye.length})…`),Ve(i.patch),await Qe(tt),Ze(),await Qe(ot);const l=Ne(1/0);l.gpuP50!==null&&(s=!0);const f=se.engineInfo();e.push({id:i.id,label:i.label,res:i.patch.bypass||!f?"–":`${f.width}×${f.height}`,s:l})}}finally{Ve(a),qe(""),He(!1),Re=!1}jt(Ot(e,s,t))}const Wt=(t,r)=>t?r?"#000000":"#050505":r?"#ffffff":"#f8f9fa",qt=["greennoise1024","ink_black","ink_red","ink_lut"];let De=null,Ae=!1,_e=!1,A=null,K=document.createElement("canvas"),Ye=y.preserveDrawingBuffer;const J=document.createElement("canvas"),z=J.getContext("2d"),Ce=new Map;let we=0;const rt=(t,r)=>{Ae||(Ae=!0,console.warn(`[SuperRiso] disabled for this session: ${t}`,r??""))},Ht=t=>new Promise((r,a)=>{const e=new Image;e.onload=()=>r(e),e.onerror=()=>a(new Error(`texture ${t} failed to load`)),e.src=`/textures/superRiso/${t}.png`});Promise.all(qt.map(Ht)).then(([t,r,a,e])=>{De={green:t,exBlack:r,exRed:a,exLut:e}}).catch(t=>rt("textures",t));const nt=t=>{t.addEventListener("webglcontextlost",r=>{r.preventDefault(),t===K&&(_e=!0,A=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),t.addEventListener("webglcontextrestored",()=>{t===K&&(_e=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};nt(K);const it=()=>{const t=K;A=null,K=document.createElement("canvas"),nt(K),t.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};se.recreateEngine=it;se.engineInfo=()=>A?{gl:A.gl,width:A.width,height:A.height}:null;zt(()=>{Xt()});et(`SUPER RISO spike · pdb ${y.preserveDrawingBuffer?"on":"off"} · res ${y.resScale} · mip ${y.mip?"on":"off"}${y.bypass?" · BYPASS":""}`);window.__superRiso={KNOBS:y,snapshot:Ne,reset:Ze,inksByTheme:Ce,get engine(){return A},get disabled(){return Ae}};function Qt(t,r,a,e,s,c,i,l){const f=performance.now();if(i&&(we>0&&ne("interval",f-we),we=f,I.lastCallAt=f,I.isDark=e,I.canvasW=r,I.canvasH=a,I.preset=l.preset,I.speed=l.speed),Ae||_e||!De||y.bypass)return!1;try{A&&Ye!==y.preserveDrawingBuffer&&it(),A||(A=Ft(K,De,{preserveDrawingBuffer:y.preserveDrawingBuffer}),Ye=y.preserveDrawingBuffer);const p=Ct(We.clean.panel,r*y.resScale),u=Math.round(240*p.pxmm),h=Math.round(u*a/r),x=y.mip?r:Math.min(r,u),R=y.mip?a:Math.min(a,h);(J.width!==x||J.height!==R)&&(J.width=x,J.height=R);const v=Wt(e,s);z.setTransform(1,0,0,1,0,0),z.globalAlpha=1,z.globalCompositeOperation="source-over",z.fillStyle=v,z.fillRect(0,0,x,R),z.globalCompositeOperation=e?"source-over":"multiply",z.imageSmoothingEnabled=!0,z.imageSmoothingQuality="medium",z.drawImage(t.canvas,0,0,x,R),z.globalCompositeOperation="source-over";let g=Ce.get(e);if(!g){const $=performance.now();g=Mt(J,"dpal",We.clean.panel.maxInks??6,1),Ce.set(e,g),console.info(`[SuperRiso] inks (${e?"dark":"light"}) picked in ${(performance.now()-$).toFixed(1)} ms:`,g.names.join(", "))}const B=e&&!y.darkPaperFromBase?[1,1,1]:G(v);A.setSource(J,y.mip);const w=performance.now();A.render({...p,inks:g.inks,names:g.names,opac:g.opac,srcPaper:B,seed:c%9999+1});const M=performance.now();if(A.gl.isContextLost())return!1;t.save(),t.setTransform(1,0,0,1,0,0),t.globalAlpha=1,t.globalCompositeOperation="copy",t.imageSmoothingEnabled=!p.crisp,t.drawImage(K,0,0,A.width,A.height,0,0,r,a),t.restore();const F=performance.now();return i?(ne("flat",w-f),ne("render",M-w),ne("back",F-M),ne("total",F-f),A.gpuMs!==null&&ne("gpu",A.gpuMs),et(`SUPER RISO spike · ${r}×${a} → sim ${A.width}×${A.height} · pdb ${y.preserveDrawingBuffer?"on":"off"} · res ${y.resScale} · mip ${y.mip?"on":"off"}`)):console.info(`[SuperRiso] export frame ${r}×${a} → sim ${A.width}×${A.height}: ${(F-f).toFixed(1)} ms`),!0}catch(p){return A=null,rt("exception in applySuperRiso",p),!1}}export{Qt as applySuperRiso};
