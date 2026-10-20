import{A as St}from"./index-DALV5mKR.js";const Et=17.2,Tt=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,Y=`#version 300 es
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
`,Ne=`
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
`,et=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,ue=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,Pt=Y+et+ue+`
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
}`,At=Y+`
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
}`,kt=Y+et+ue+`
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
}`,yt=Y+ue+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Bt=Y+ue+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,Rt=Y+Ne+ue+`
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
}`,Mt=Y+Ne+ue+`
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
  oA=A; oB=B; }`,wt=Y+Ne+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Lt=Y+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,oe=8,_t={Black:.32,Cornflower:.35,"Light Gray":.4,Gray:.35,Granite:.35,"Metallic Gold":.4,Charcoal:.25,Midnight:.2},Ct={"#000000":"#25222a"},Dt=[["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]],X=t=>(t=t.replace("#",""),[0,2,4].map(o=>parseInt(t.substr(o,2),16)/255)),It=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4),Ft=t=>t<=.0031308?t*12.92:1.055*Math.pow(t,1/2.4)-.055,xe=t=>t.map(It);function U(t){const[o,i,e]=xe(t),s=Math.cbrt(.4122214708*o+.5363325363*i+.0514459929*e),f=Math.cbrt(.2119034982*o+.6806995451*i+.1073969566*e),a=Math.cbrt(.0883024619*o+.2817188376*i+.6299787005*e);return[.2104542553*s+.793617785*f-.0040720468*a,1.9779984951*s-2.428592205*f+.4505937099*a,.0259040371*s+.7827717662*f-.808675766*a]}const Le=(t,o)=>Math.hypot(t[0]-o[0],t[1]-o[1],t[2]-o[2]),Ae=(t,o)=>Math.hypot(t[0]-o[0],2*(t[1]-o[1]),2*(t[2]-o[2])),ve=t=>Ct[t.toLowerCase()]||t,Nt=(t,o)=>_t[t]??(U(X(o))[0]<.3?.3:.15);function ye(t){let o=t>>>0||1;return()=>(o^=o<<13,o>>>=0,o^=o>>17,o^=o<<5,o>>>=0,o/4294967296)}function Ut(t,o=160){const i=t.width,e=t.height,s=Math.min(1,o/Math.max(i,e)),f=Math.max(1,Math.round(i*s)),a=Math.max(1,Math.round(e*s)),p=document.createElement("canvas");p.width=f,p.height=a;const l=p.getContext("2d");l.fillStyle="#fff",l.fillRect(0,0,f,a),l.drawImage(t,0,0,f,a);const u=l.getImageData(0,0,f,a).data,c=[];for(let x=0;x<u.length;x+=4)c.push([u[x]/255,u[x+1]/255,u[x+2]/255]);return c}function $t(t,o){const i=t.map(U);let e=[];const s=ye(5);for(e.push(i[Math.floor(s()*i.length)]);e.length<o;){let l=null,u=-1;for(let c=0;c<200;c++){const x=i[Math.floor(s()*i.length)],g=Math.min(...e.map(M=>Le(M,x)));g>u&&(u=g,l=x)}e.push(l)}const f=new Array(i.length).fill(0);let a=[],p=[];for(let l=0;l<18;l++){for(let c=0;c<i.length;c++){let x=0,g=1e9;for(let M=0;M<o;M++){const v=Le(i[c],e[M]);v<g&&(g=v,x=M)}f[c]=x}const u=e.map(()=>[0,0,0,0]);for(let c=0;c<i.length;c++){const x=u[f[c]];x[0]+=t[c][0],x[1]+=t[c][1],x[2]+=t[c][2],x[3]++}a=u.map(c=>c[3]?[c[0]/c[3],c[1]/c[3],c[2]/c[3]]:[1,1,1]),p=u.map(c=>c[3]),e=a.map((c,x)=>p[x]?U(c):e[x])}return a.map((l,u)=>({c:l,n:p[u],L:U(l)})).sort((l,u)=>u.n-l.n)}function Ot(t,o,i){const e=Ut(t),s=$t(e,16),f=e.length;let a=s.find(v=>v.L[0]>.82&&Math.hypot(v.L[1],v.L[2])<.05&&v.n/f>.05);if(!a&&i===1){const v=s.filter(b=>b.L[0]>.65&&Math.hypot(b.L[1],b.L[2])<.06&&b.n/f>.02).sort((b,w)=>w.L[0]-b.L[0]);v.length&&(a=v[0])}const p=a?a.c:[1,1,1],l=(v,b)=>{const w=xe(v),P=xe(b),D=[];for(let j=0;j<=1.0001;j+=.1)D.push(U(w.map((I,_)=>Ft(I+(P[_]-I)*j))));return D},u=s.filter(v=>v!==a&&v.n/f>.002),c=[];let x=[U(p)];const g=v=>Math.min(...x.map(b=>Ae(b,v))),M=.02;for(let v=0;v<o;v++){let b=null,w=0;for(const D of u){if(c.includes(D)||c.some(_=>Ae(_.L,D.L)<.09))continue;const j=l(p,D.c).concat(...c.map(_=>l(_.c,D.c)));let I=0;for(const _ of s){const K=g(_.L),q=Math.max(0,K-M),Z=Math.max(0,Math.min(K,...j.map(ie=>Ae(ie,_.L)))-M);I+=_.n*(q-Z)}I>w&&(w=I,b=D)}if(!b||w/f<6e-4)break;const P=b;c.push(P),x=x.concat(l(p,P.c),...c.slice(0,-1).map(D=>l(D.c,P.c)))}return{chosen:c,srcPaper:p}}function Gt(t,o,i){let e=null,s=1e9;const f=U(o);for(const[a,p]of t){if(i.has(a))continue;const l=Ae(U(X(p)),f);l<s&&(s=l,e=[a,p])}return e}function jt(t,o,i,e=1){const{chosen:s,srcPaper:f}=Ot(t,i,e);let a=[];{const p=Dt.filter(u=>u[0]!=="White"),l=new Set;for(const u of s){const c=Gt(p,u.c,l);c&&(l.add(c[0]),a.push(c))}}return a.length||(a=[["Black","#000000"]]),a=a.slice(0,oe).sort((p,l)=>U(X(ve(l[1])))[0]-U(X(ve(p[1])))[0]),{inks:a.map(p=>p[1]),names:a.map(p=>p[0]),opac:a.map(p=>Nt(p[0],p[1])),srcPaper:f}}const zt={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},qe={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},Xt={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},He={clean:{label:"Taller limpio",panel:{inkSet:"own",maxInks:6,paper:"white",screen:"grain",screenSize:.35,imperfection:.2,resolution:.85}},zine:{label:"Fanzine",panel:{inkSet:"dpal",maxInks:4,paper:"recycled",screen:"grain",screenSize:.65,imperfection:.75,resolution:.6}},lofi:{label:"Lo-fi",panel:{inkSet:"own",maxInks:4,paper:"natural",screen:"grain",screenSize:.8,imperfection:.55,resolution:.1}},cmyk:{label:"Cuatricromía",panel:{inkSet:"cmyk",maxInks:4,paper:"white",screen:"dots",screenSize:.45,imperfection:.45,resolution:.7}}},F=(t,o,i)=>t+(o-t)*i;function Wt(t,o){const i=Object.assign({},Xt,t),e=i.imperfection,s=i.resolution,f=i.screenSize,a=240,p=o*F(.4,1,s)/a;return Object.assign({printW:a,pxmm:p,crisp:s<.5,screen:i.screen==="dots"?1:0,grain:F(.09,.3,f),lpi:Math.round(F(120,45,f)),misreg:.04+1.1*Math.pow(e,1.6),rot:F(.01,.16,e),scl:F(.2,1.6,e),edge:F(.25,1.05,e),voids:F(.05,.45,e),texAmp:F(.6,1.45,e),starve:F(.05,.4,e),mottle:F(.3,1.2,e),bleed:F(.04,.07,e),inkLoad:F(.75,.5,e),scanBlur:F(1,.65,s),scanNoise:F(.6,.35,s)},qe[i.paper]||qe.natural)}function qt(t){const i=document.createElement("canvas");i.width=i.height=1024;const e=i.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=ye(t);e.lineCap="round";for(let f=0;f<2600;f++){const a=(.25+s()*s()*1.6)*85,p=s()*Math.PI*2,l=s()*1024,u=s()*1024,c=(s()-.5)*.9,x=(.012+s()*.03)*85;e.strokeStyle=`rgba(255,255,255,${.15+s()*.55})`,e.lineWidth=x;for(const g of[-1024,0,1024])for(const M of[-1024,0,1024]){const v=l+g,b=u+M;v<-a-10||v>1024+a+10||b<-a-10||b>1024+a+10||(e.beginPath(),e.moveTo(v,b),e.quadraticCurveTo(v+Math.cos(p+c)*a*.5,b+Math.sin(p+c)*a*.5,v+Math.cos(p)*a,b+Math.sin(p)*a),e.stroke())}}return i}function Ht(t){const i=document.createElement("canvas");i.width=i.height=1024;const e=i.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=ye(t);e.lineCap="round",e.globalCompositeOperation="lighter";const f=1024/61;for(let a=0;a<70;a++){const p=s()<.7?"255,0,0":"0,255,0",l=(.4+s()*s()*3.5)*f,u=s()*Math.PI*2,c=s()*1024,x=s()*1024,g=(s()-.5)*1.6,M=(.015+s()*.03)*f;e.strokeStyle=`rgba(${p},${.35+s()*.5})`,e.lineWidth=Math.max(.6,M);for(const v of[-1024,0,1024])for(const b of[-1024,0,1024]){const w=c+v,P=x+b;w<-l||w>1024+l||P<-l||P>1024+l||(e.beginPath(),e.moveTo(w,P),e.bezierCurveTo(w+Math.cos(u+g)*l*.35,P+Math.sin(u+g)*l*.35,w+Math.cos(u-g)*l*.7,P+Math.sin(u-g)*l*.7,w+Math.cos(u)*l,P+Math.sin(u)*l),e.stroke())}}for(let a=0;a<160;a++){e.fillStyle=`rgba(255,0,0,${.2+s()*.6})`;const p=(.02+s()*s()*.12)*f;e.beginPath(),e.arc(s()*1024,s()*1024,Math.max(.5,p),0,7),e.fill()}return i}function Vt(t,o,i={}){const e=t.getContext("webgl2",{preserveDrawingBuffer:i.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!e)throw new Error("WebGL2 no disponible");const s=e.getParameter(e.MAX_TEXTURE_SIZE);function f(d){const r=e.createProgram();for(const[S,B]of[[e.VERTEX_SHADER,Tt],[e.FRAGMENT_SHADER,d]]){const y=e.createShader(S);if(e.shaderSource(y,B),e.compileShader(y),!e.getShaderParameter(y,e.COMPILE_STATUS)){const m=e.getShaderInfoLog(y);throw new Error(m??"shader compile error")}e.attachShader(r,y)}if(e.bindAttribLocation(r,0,"p"),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(r)??"program link error");const R={},A=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let S=0;S<A;S++){const B=e.getActiveUniform(r,S);R[B.name.replace(/\[0\]$/,"")]=e.getUniformLocation(r,B.name)}return{p:r,u:R}}const a={sep0:f(kt),lut:f(Pt),prep:f(At),sep:f(yt),blur:f(Bt),screen:f(Rt),spread:f(Mt),compose:f(wt),scan:f(Lt)},p=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,p),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);function l(d,r,{filter:R=e.LINEAR,wrap:A=e.CLAMP_TO_EDGE}={}){const S=e.createTexture();return e.bindTexture(e.TEXTURE_2D,S),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,d,r,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,R),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,R),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,A),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,A),S}function u(d,{filter:r=e.LINEAR,wrap:R=e.CLAMP_TO_EDGE,mip:A=!1}={},S=e.createTexture()){return e.bindTexture(e.TEXTURE_2D,S),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,d),A&&e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,A?e.LINEAR_MIPMAP_LINEAR:r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,R),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,R),S}function c(d,r,R=1){const A=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,A);const S=[];for(let B=0;B<R;B++){const y=l(d,r);e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+B,e.TEXTURE_2D,y,0),S.push(y)}return e.drawBuffers(S.map((B,y)=>e.COLOR_ATTACHMENT0+y)),{f:A,t:S,w:d,h:r}}function x(d){d.t.forEach(r=>e.deleteTexture(r)),e.deleteFramebuffer(d.f)}function g(d,r,R){const A=r?r.w:t.width,S=r?r.h:t.height;e.useProgram(d.p),e.bindFramebuffer(e.FRAMEBUFFER,r?r.f:null),e.viewport(0,0,A,S);let B=0;const y=d.u,m={t(k,E){y[k]!=null&&(e.activeTexture(e.TEXTURE0+B),e.bindTexture(e.TEXTURE_2D,E),e.uniform1i(y[k],B),B++)},f(k,...E){const C=y[k];C!=null&&(E.length===1?e.uniform1f(C,E[0]):E.length===2?e.uniform2f(C,E[0],E[1]):E.length===3?e.uniform3f(C,E[0],E[1],E[2]):e.uniform4f(C,E[0],E[1],E[2],E[3]))},i(k,E){y[k]!=null&&e.uniform1i(y[k],E)},fv(k,E,C){const H=y[k];if(H==null)return;const ee=new Float32Array(E);C===1?e.uniform1fv(H,ee):C===2?e.uniform2fv(H,ee):e.uniform3fv(H,ee)},m2(k,E){y[k]!=null&&e.uniformMatrix2fv(y[k],!1,new Float32Array(E))}};m.f("uRes",A,S),R&&R(m),e.drawArrays(e.TRIANGLES,0,3)}const M=u(o.green,{wrap:e.REPEAT}),v={b:u(o.exBlack,{wrap:e.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:u(o.exRed,{wrap:e.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:u(o.exLut)},b=u(qt(11),{wrap:e.REPEAT,mip:!0}),w=u(Ht(23),{wrap:e.REPEAT,mip:!0}),P=d=>{d.t("uExB",v.b),d.t("uExR",v.r),d.t("uExLut",v.lut),d.f("uExBSize",v.bs[0],v.bs[1]),d.f("uExRSize",v.rs[0],v.rs[1]),d.f("uExPxMm",Et)},D=c(1089,33,2);let j="";const I=e.createTexture();let _=0,K=0,q=null,Z=0,ie=0;function gt(d,r){if(d===Z&&r===ie)return;Z=d,ie=r,q&&Object.values(q).forEach(x);const R=Math.max(1,d>>2),A=Math.max(1,r>>2);q={prep:c(d,r),sep:c(d,r,2),tmp:c(d,r,2),loc:c(d,r,2),qtmp:c(R,A,2),sol:c(R,A,2),scr:c(d,r,2),cov:c(d,r,2),comp:c(d,r)},t.width=d,t.height=r}const fe=e.getExtension("EXT_disjoint_timer_query_webgl2");let ae=null;function bt(){if(!fe||!ae||!e.getQueryParameter(ae,e.QUERY_RESULT_AVAILABLE))return;e.getParameter(fe.GPU_DISJOINT_EXT)||(J.gpuMs=e.getQueryParameter(ae,e.QUERY_RESULT)/1e6),e.deleteQuery(ae),ae=null}const J={canvas:t,gl:e,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,setSource(d,r=!0){_=d.width,K=d.height;const R=performance.now();u(d,{},I);const A=performance.now();r&&(e.bindTexture(e.TEXTURE_2D,I),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR)),J.lastUploadMs=A-R,J.lastMipMs=performance.now()-A},render(d){const r=Object.assign({},zt,d),R=performance.now();bt();const A=fe&&!ae?e.createQuery():null;A&&e.beginQuery(fe.TIME_ELAPSED_EXT,A);let S=Math.round(r.printW*r.pxmm),B=Math.round(S*K/_);const y=Math.min(s,6144);if(Math.max(S,B)>y){const n=y/Math.max(S,B);S=Math.round(S*n),B=Math.round(B*n)}gt(S,B),J.width=S,J.height=B;const m=q,k=S/r.printW,E=xe(X(r.paper)),C=Math.min(oe,r.inks.length),H=r.inks.concat(Array(oe).fill("#000000")).slice(0,oe),ee=r.opac.concat(Array(oe).fill(.15)).slice(0,oe),Se=[];for(let n=0;n<oe;n++)Se.push(...xe(X(ve(H[n]))));const Be=H.map(n=>U(X(ve(n)))[0]<.42?0:1),ht=U(X(r.paper)),$e=H.map(n=>Math.min(1.5,Le(U(X(ve(n))),ht)/.5)),Oe=JSON.stringify([H,ee,C,r.paper,r.inkCost,r.pair]);Oe!==j&&(g(a.lut,D,n=>{n.fv("uCon",$e,1),n.fv("uInk",Se,3),n.fv("uOp",ee,1),n.i("uN",C),n.f("uPaper",...E),n.f("uCost",r.inkCost),n.f("uPair",r.pair)}),j=Oe),g(a.prep,m.prep,n=>{n.t("uSrc",I),n.f("uSrcRes",_,K),n.f("uSmoothPx",r.smooth*_/r.printW),n.f("uSrcPaper",...r.srcPaper),n.f("uPaper",...E)});const Ee=ye(r.seed*7919+13),Ge=[],je=[];for(let n=0;n<oe;n++){const se=(Ee()*2-1)*r.rot*Math.PI/180,Te=1+(Ee()*2-1)*r.scl/1e3,pe=Math.cos(se)*Te,$=Math.sin(se)*Te;Ge.push(pe,$,-$,pe);const Xe=Ee()*Math.PI*2,We=r.misreg*Math.sqrt(Ee());je.push(Math.cos(Xe)*We,Math.sin(Xe)*We)}g(a.blur,m.loc,n=>{n.t("uTexA",m.prep.t[0]),n.t("uTexB",m.prep.t[0]),n.f("uDir",1,0),n.f("uSig",.3*k)}),g(a.blur,m.scr,n=>{n.t("uTexA",m.loc.t[0]),n.t("uTexB",m.loc.t[0]),n.f("uDir",0,1),n.f("uSig",.3*k)}),g(a.sep0,m.tmp,n=>{n.t("uPrepS",m.scr.t[0]),n.t("uPrep",m.prep.t[0]),n.t("uSet",D.t[0]),n.fv("uCon",$e,1),n.fv("uInk",Se,3),n.fv("uOp",ee,1),n.i("uN",C),n.f("uPaper",...E),n.f("uCost",r.inkCost),n.f("uPair",r.pair),n.f("uMinDot",r.minDot)}),g(a.sep,m.sep,n=>{n.f("uPxMm",k),n.t("uSA",m.tmp.t[0]),n.t("uSB",m.tmp.t[1]),n.i("uN",C),n.f("uCtr",r.printW/2,B/k/2),n.m2("uM",Ge),n.fv("uT",je,2)});const ze=(n,se,Te,pe)=>{g(a.blur,se,$=>{$.t("uTexA",n.t[0]),$.t("uTexB",n.t[1]),$.f("uDir",1,0),$.f("uSig",pe)}),g(a.blur,Te,$=>{$.t("uTexA",se.t[0]),$.t("uTexB",se.t[1]),$.f("uDir",0,1),$.f("uSig",pe)})};return ze(m.sep,m.tmp,m.loc,.22*k),ze(m.sep,m.qtmp,m.sol,1.5*k/4),g(a.screen,m.scr,n=>{P(n),n.f("uPxMm",k),n.f("uSeed",r.seed),n.t("uSepA",m.sep.t[0]),n.t("uSepB",m.sep.t[1]),n.t("uSolA",m.sol.t[0]),n.t("uSolB",m.sol.t[1]),n.t("uLocA",m.loc.t[0]),n.t("uLocB",m.loc.t[1]),n.t("uGreen",M),n.i("uN",C),n.i("uMode",+r.screen),n.f("uGrain",r.grain),n.f("uLoad",r.inkLoad),n.f("uLpi",r.lpi),n.f("uMottle",r.mottle),n.f("uStarve",r.starve),n.f("uTexAmp",r.texAmp),n.f("uStreak",r.streak),n.f("uSolidLv",r.solidLv),n.fv("uExSel",Be,1),n.f("uTrap",r.trap)}),g(a.spread,m.cov,n=>{P(n),n.f("uPxMm",k),n.f("uSeed",r.seed),n.t("uScrA",m.scr.t[0]),n.t("uScrB",m.scr.t[1]),n.t("uSepA",m.sep.t[0]),n.t("uSepB",m.sep.t[1]),n.t("uLocA",m.loc.t[0]),n.t("uLocB",m.loc.t[1]),n.i("uN",C),n.f("uBleedPx",r.bleed*k),n.f("uGain",r.gain),n.f("uEdge",r.edge),n.f("uSolidLv",r.solidLv),n.fv("uExSel",Be,1)}),g(a.compose,m.comp,n=>{P(n),n.f("uPxMm",k),n.f("uSeed",r.seed),n.t("uCovA",m.cov.t[0]),n.t("uCovB",m.cov.t[1]),n.t("uSolA",m.sol.t[0]),n.t("uSolB",m.sol.t[1]),n.f("uStarve",r.starve),n.t("uFib",b),n.t("uInc",w),n.i("uN",C),n.fv("uInk",Se,3),n.fv("uOp",ee,1),n.f("uPaper",...E),n.f("uPaperTex",r.paperTex),n.f("uFibers",r.fibers),n.f("uIncl",r.incl),n.f("uVoids",r.voids),n.f("uMottle",r.mottle),n.f("uTexAmp",r.texAmp),n.fv("uExSel",Be,1)}),g(a.scan,null,n=>{n.f("uSeed",r.seed),n.t("uComp",m.comp.t[0]),n.f("uBlurPx",r.scanBlur),n.f("uNoise",r.scanNoise),n.i("uNorm",+r.normWhite),n.f("uPaper",...E)}),A&&(e.endQuery(fe.TIME_ELAPSED_EXT),ae=A),e.flush(),J.lastMs=performance.now()-R,J}};return J}const Qt=2400,Yt=240,ge={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function V(t,o){const i=ge[t];i.push(o),i.length>Qt&&i.shift()}function O(t,o,i){const e=ge[t].slice(-i);if(e.length===0)return null;const s=[...e].sort((f,a)=>f-a);return s[Math.min(s.length-1,Math.floor(o*s.length))]}function Ue(t=Yt){const o=ge.interval.slice(-t),i=o.length?o.reduce((e,s)=>e+s,0)/o.length:null;return{samples:o.length,fps:i?1e3/i:null,frameP50:O("interval",.5,t),frameP95:O("interval",.95,t),totalP50:O("total",.5,t),totalP95:O("total",.95,t),flatP50:O("flat",.5,t),uploadP50:O("upload",.5,t),mipP50:O("mip",.5,t),renderP50:O("render",.5,t),backP50:O("back",.5,t),bitmapWaitP50:O("bitmapWait",.5,t),gpuP50:O("gpu",.5,t),gpuP95:O("gpu",.95,t)}}function tt(){for(const t of Object.keys(ge))ge[t].length=0}let ce=null,me=null,ne=null,re=null,Q=null,ot="",_e="";function nt(t){ot=t}function Ve(t){_e=t,ne&&(ne.textContent=t,ne.style.display=t?"block":"none")}function Qe(t){Q&&(Q.disabled=t,Q.style.opacity=t?".5":"1")}const G=(t,o=1)=>t===null?"–":t.toFixed(o),Ce=t=>{Object.assign(t.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function Kt(t){if(!re)return;re.textContent="";const o=document.createElement("textarea");o.value=t,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const i=document.createElement("div");i.style.display="flex",i.style.gap="8px",i.style.marginTop="6px";const e=document.createElement("div");e.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const s=document.createElement("button");s.textContent="Copiar",Ce(s),s.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(t),new Promise((a,p)=>setTimeout(()=>p(new Error("timeout")),1500))]),e.textContent="Copiado ✓"}catch{o.focus(),o.select(),e.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const f=document.createElement("button");f.textContent="Cerrar",Ce(f),f.onclick=()=>{re&&(re.textContent="")},i.append(s,f,e),re.append(o,i)}function Zt(t){ce||typeof document>"u"||(ce=document.createElement("div"),ce.setAttribute("data-superriso-overlay",""),Object.assign(ce.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),re=document.createElement("div"),re.style.pointerEvents="auto",ne=document.createElement("div"),Object.assign(ne.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Q=document.createElement("button"),Q.textContent="Medir",Ce(Q),Q.style.pointerEvents="auto",Q.onclick=t,me=document.createElement("div"),Object.assign(me.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ce.append(re,ne,Q,me),document.body.appendChild(ce),setInterval(()=>{if(!me)return;const o=Ue();me.textContent=`${ot}
fps ${G(o.fps)} · frame p50 ${G(o.frameP50)} p95 ${G(o.frameP95)} ms
SR p50 ${G(o.totalP50)} p95 ${G(o.totalP95)} ms (aplanado ${G(o.flatP50)} · subida ${G(o.uploadP50)} · mip ${G(o.mipP50)} · motor ${G(o.renderP50)} · vuelta ${G(o.backP50)})
GPU motor p50 ${G(o.gpuP50)} p95 ${G(o.gpuP95)} ms`,_e&&ne&&(ne.textContent=_e)},500))}const te=new URLSearchParams(window.location.search),h={preserveDrawingBuffer:te.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(te.get("srres"))||1)),mip:te.get("srmip")!=="0",bypass:te.get("srbypass")==="1",darkPaperFromBase:te.get("srdarkpaper")==="bg",simUpload:te.get("srsim")==="1",offscreenBack:te.get("sroff")==="1",bitmapUpload:te.get("srbitmap")==="1"},rt={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1},L={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0},he={engineInfo:()=>null,recreateEngine:()=>{}},Ye=t=>{const o=t.preserveDrawingBuffer!==void 0&&t.preserveDrawingBuffer!==h.preserveDrawingBuffer,i=t.offscreenBack!==void 0&&t.offscreenBack!==h.offscreenBack;Object.assign(h,t),(o||i)&&he.recreateEngine()},be=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function at(t){return t&&be?new OffscreenCanvas(1,1):document.createElement("canvas")}const it=t=>typeof OffscreenCanvas<"u"&&t instanceof OffscreenCanvas,le=document.createElement("canvas"),z=le.getContext("2d");function Jt(t,o,i,e,s){return(le.width!==o||le.height!==i)&&(le.width=o,le.height=i),z.setTransform(1,0,0,1,0,0),z.globalAlpha=1,z.globalCompositeOperation="source-over",z.fillStyle=e,z.fillRect(0,0,o,i),z.globalCompositeOperation=s?"source-over":"multiply",z.imageSmoothingEnabled=!0,z.imageSmoothingQuality="medium",z.drawImage(t,0,0,o,i),z.globalCompositeOperation="source-over",le}let N=null,Re=!1,Ke=0;function eo(t,o,i){Ke++;const e=Ke;let s=null;if(N&&N.bmp.width===o&&N.bmp.height===i?s={bmp:N.bmp,lag:e-N.frame}:N&&N.bmp.close(),N=null,!Re){Re=!0;const f=performance.now();createImageBitmap(t).then(a=>{V("bitmapWait",performance.now()-f),N&&N.bmp.close(),N={bmp:a,frame:e}}).catch(()=>{}).finally(()=>{Re=!1})}return s}function to(){N&&N.bmp.close(),N=null}function oo(t,o,i,e,s,f,a){const p=it(o)?o.transferToImageBitmap():null;try{t.save(),t.setTransform(1,0,0,1,0,0),t.globalAlpha=1,t.globalCompositeOperation="copy",t.imageSmoothingEnabled=!a,t.drawImage(p??o,0,0,i,e,0,0,s,f)}finally{t.restore(),p?.close()}}const st=2e3,ct=8e3,lt={...rt,resScale:.5},ut={...lt,simUpload:!0},ft={...ut,mip:!1},pt={...ft,offscreenBack:!0},no={...pt,bitmapUpload:!0},de=[{id:"A",label:"bypass",patch:{...rt,bypass:!0}},{id:"B",label:"res .5 actual",patch:lt},{id:"C",label:"B+sim-upload",patch:ut},{id:"D",label:"C+sin mip",patch:ft},{id:"E",label:"D+offscreen",patch:pt},{id:"F",label:"E+bitmap",patch:no}],ro=de.length+2,Ze=t=>new Promise(o=>setTimeout(o,t)),Pe=(t,o=1)=>t===null?"–":t.toFixed(o);let Me=!1;function ao(){let o=he.engineInfo()?.gl??null,i=null;if(o||(i=document.createElement("canvas"),o=i.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const e=o.getExtension("WEBGL_debug_renderer_info"),s=String(e?o.getParameter(e.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),f=String(o.getParameter(o.MAX_TEXTURE_SIZE));return i&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:s,maxTex:f}}function io(t,o,i,e,s){const f=ao(),a=[];a.push(`SUPER RISO · medición automática C1b · Diorame ${St} · ${new Date().toISOString()}`),a.push(`UA: ${navigator.userAgent}`),a.push(`DPR ${window.devicePixelRatio} · canvas vivo ${L.canvasW}×${L.canvasH}`),a.push(`GPU: ${f.renderer} · MAX_TEXTURE_SIZE ${f.maxTex} · temporizador GPU: ${o?"sí":"no"}`),a.push(`Modo ${L.isDark?"oscuro":"claro"} · preset de cámara: ${L.preset||"–"} (velocidad ${L.speed||"–"})`),a.push(`OffscreenCanvas+WebGL2: ${be?"sí":"NO — E, F (y G/H si las eligen) usan el canvas DOM"}`),a.push(`Bitmap (F): última latencia ${s} frame(s) entre aplanado y subida`),a.push(`G y H usan la mejor de C–F por frame p50: ${e}`);for(const p of i)a.push(`AVISO: ${p}`);a.push(`Cada fila: ${st/1e3} s de calentamiento descartados + ${ct/1e3} s medidos. Etapas = CPU p50 en ms.`),a.push(""),a.push("cfg              fps   frame p50/p95 | SR    aplan  subida mip    motor  vuelta bmpWait | GPU   sim");for(const p of t){const l=p.s,u=c=>Pe(c,2).padStart(6);a.push(`${(p.id+" "+p.label).padEnd(15)} ${Pe(l.fps).padStart(5)}  ${(Pe(l.frameP50)+"/"+Pe(l.frameP95)).padEnd(11)} |${u(l.totalP50)}${u(l.flatP50)} ${u(l.uploadP50)}${u(l.mipP50)} ${u(l.renderP50)}${u(l.backP50)}  ${u(l.bitmapWaitP50)} |${u(l.gpuP50)}  ${p.res}  (n=${l.samples})`)}return a.join(`
`)}const so=t=>[t.simUpload?"sim-upload":"",t.mip===!1?"sin mip":"",t.offscreenBack?"offscreen":"",t.bitmapUpload?"bitmap":""].filter(Boolean).join(" + ")||"camino actual";async function co(){if(Me)return;const t=[],o=performance.now()-L.lastCallAt;if(L.lastCallAt===0||o>1e3?t.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):L.speed>0||t.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),t.length&&!window.confirm(`${t[0]}.

¿Medir igualmente?`))return;Me=!0,Qe(!0);const i={...h},e=[];let s=!1,f="–",a=0;const p=async(l,u)=>{Ve(`Midiendo ${l.id} (${u+1}/${ro})…`),Ye(l.patch),await Ze(st),tt(),await Ze(ct);const c=Ue(1/0);c.gpuP50!==null&&(s=!0),l.patch.bitmapUpload&&(a=L.bitmapLagFrames);const x=he.engineInfo();e.push({id:l.id,label:l.label,res:l.patch.bypass||!x?"–":`${x.width}×${x.height}`,s:c,patch:l.patch})};try{for(let c=0;c<de.length;c++)await p(de[c],c);const l=e.filter(c=>["C","D","E","F"].includes(c.id)&&c.s.frameP50!==null);l.sort((c,x)=>c.s.frameP50-x.s.frameP50||(c.s.totalP50??1e9)-(x.s.totalP50??1e9));const u=l[0]??e.find(c=>c.id==="C");f=`${u.id} (${so(u.patch)})`,await p({id:"G",label:`${u.id} a res 1`,patch:{...u.patch,resScale:1}},de.length),await p({id:"H",label:`${u.id} a res .75`,patch:{...u.patch,resScale:.75}},de.length+1)}finally{Ye(i),Ve(""),Qe(!1),Me=!1}Kt(io(e,s,t,f,a))}const lo=(t,o)=>t?o?"#000000":"#050505":o?"#ffffff":"#f8f9fa",uo=["greennoise1024","ink_black","ink_red","ink_lut"];let De=null,ke=!1,Ie=!1,T=null,W=at(h.offscreenBack),Je=h.preserveDrawingBuffer;const Fe=new Map;let we=0;const mt=(t,o)=>{ke||(ke=!0,console.warn(`[SuperRiso] disabled for this session: ${t}`,o??""))},fo=t=>new Promise((o,i)=>{const e=new Image;e.onload=()=>o(e),e.onerror=()=>i(new Error(`texture ${t} failed to load`)),e.src=`/textures/superRiso/${t}.png`});Promise.all(uo.map(fo)).then(([t,o,i,e])=>{De={green:t,exBlack:o,exRed:i,exLut:e}}).catch(t=>mt("textures",t));const dt=t=>{t.addEventListener("webglcontextlost",o=>{o.preventDefault(),t===W&&(Ie=!0,T=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),t.addEventListener("webglcontextrestored",()=>{t===W&&(Ie=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};dt(W);const vt=()=>{const t=W;T=null,to(),W=at(h.offscreenBack),dt(W),t.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};he.recreateEngine=vt;he.engineInfo=()=>T?{gl:T.gl,width:T.width,height:T.height}:null;const xt=()=>[`pdb ${h.preserveDrawingBuffer?"on":"off"}`,`res ${h.resScale}`,`mip ${h.mip?"on":"off"}`,h.simUpload?"sim-upload":"",h.bitmapUpload?"bitmap":"",h.offscreenBack?be?"offscreen":"offscreen→DOM":"",h.bypass?"BYPASS":""].filter(Boolean).join(" · ");Zt(()=>{co()});nt(`SUPER RISO · ${xt()}`);window.__superRiso={KNOBS:h,snapshot:Ue,reset:tt,inksByTheme:Fe,live:L,get engine(){return T},get disabled(){return ke},get glCanvas(){return W}};function mo(t,o,i,e,s,f,a,p){const l=performance.now();if(a&&(we>0&&V("interval",l-we),we=l,L.lastCallAt=l,L.isDark=e,L.canvasW=o,L.canvasH=i,L.preset=p.preset,L.speed=p.speed,L.offscreenFallback=h.offscreenBack&&!be),ke||Ie||!De||h.bypass)return!1;try{T&&(Je!==h.preserveDrawingBuffer||it(W)!==(h.offscreenBack&&be))&&vt(),T||(T=Vt(W,De,{preserveDrawingBuffer:h.preserveDrawingBuffer}),Je=h.preserveDrawingBuffer);const u=Wt(He.clean.panel,o*h.resScale),c=Math.round(240*u.pxmm),x=Math.round(c*i/o),g=h.simUpload?Math.min(o,c):o,M=h.simUpload?Math.min(i,x):i,v=lo(e,s),b=Jt(t.canvas,g,M,v,e),w=performance.now();let P=Fe.get(e);if(!P){const ie=performance.now();P=jt(b,"dpal",He.clean.panel.maxInks??6,1),Fe.set(e,P),console.info(`[SuperRiso] inks (${e?"dark":"light"}) picked in ${(performance.now()-ie).toFixed(1)} ms:`,P.names.join(", "))}const D=e&&!h.darkPaperFromBase?[1,1,1]:X(v),j=performance.now(),I=h.bitmapUpload&&a?eo(b,g,M):null,_=performance.now();I?(T.setSource(I.bmp,h.mip),I.bmp.close(),L.bitmapLagFrames=I.lag):T.setSource(b,h.mip);const K=performance.now();T.render({...u,inks:P.inks,names:P.names,opac:P.opac,srcPaper:D,seed:f%9999+1});const q=performance.now();if(T.gl.isContextLost())return!1;oo(t,W,T.width,T.height,o,i,!!u.crisp);const Z=performance.now();return a?(V("flat",w-l),V("upload",T.lastUploadMs+(_-j)),V("mip",T.lastMipMs),V("render",q-K),V("back",Z-q),V("total",Z-l),T.gpuMs!==null&&V("gpu",T.gpuMs),nt(`SUPER RISO · ${o}×${i} → sim ${T.width}×${T.height} · src ${g}×${M} · ${xt()}`)):console.info(`[SuperRiso] export frame ${o}×${i} → sim ${T.width}×${T.height}: ${(Z-l).toFixed(1)} ms`),!0}catch(u){return T=null,mt("exception in applySuperRiso",u),!1}}export{mo as applySuperRiso};
