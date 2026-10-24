import{X as Go,l as Oe,h as be,r as Je,M as Be,p as gt,o as Ce,d as Xo,s as Tt,x as Wo,b as Vo,c as Ko,e as Qo,A as Ho,i as Yo}from"./index-CzKboyDQ.js";const Zo=17.2,Jo=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,Se=`#version 300 es
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
`,It=`
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
`,$t=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ne=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,ea=Se+$t+Ne+`
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
}`,ta=Se+`
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
}`,xo=Se+$t+Ne+`
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
}`,oa=Se+Ne+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,go=Se+Ne+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,bo=Se+It+Ne+`
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
}`,So=Se+It+Ne+`
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
  oA=A; oB=B; }`,aa=Se+It+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,ko=Se+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,ra={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Zt={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},na={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},se=(e,o,a)=>e+(o-e)*a;function yo(e,o){return{printW:240,pxmm:o*se(.4,1,e)/240,crisp:e<.5,scanBlur:se(1,.65,e),scanNoise:se(.6,.35,e)}}function sa(e,o){const a=Object.assign({},na,e),t=a.imperfection,l=a.resolution,c=a.screenSize;return Object.assign({...yo(l,o),screen:a.screen==="dots"?1:0,grain:se(.09,.3,c),lpi:Math.round(se(120,45,c)),misreg:.04+1.1*Math.pow(t,1.6),rot:se(.01,.16,t),scl:se(.2,1.6,t),edge:se(.25,1.05,t),voids:se(.05,.45,t),texAmp:se(.6,1.45,t),starve:se(.05,.4,t),mottle:se(.3,1.2,t),bleed:se(.04,.07,t),inkLoad:se(.75,.5,t)},Zt[a.paper]||Zt.natural)}function ia(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,l=new Map,c=[],f=[];let r=0;const n=new Uint8Array(4),d=(h,u)=>{let P=t.get(h);P||(P=[],t.set(h,P)),P.push(u)};return{get mode(){return a},timerAvailable:!!o,setMode(h){a=h==="timer"&&!o?"off":h,t.clear(),l.clear(),c.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,n),r=performance.now()),a==="timer"&&this.poll()},before(h,u){if(l.has(h)||(l.set(h,u),c.push(h)),a!=="timer"||!o)return null;const P=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,P),P},after(h,u){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,n);const P=performance.now();d(h,P-r),r=P}else u&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),f.push({name:h,q:u}))},poll(){if(o)for(;f.length&&e.getQueryParameter(f[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:h,q:u}=f.shift();e.getParameter(o.GPU_DISJOINT_EXT)||d(h,e.getQueryParameter(u,e.QUERY_RESULT)/1e6),e.deleteQuery(u)}},report(){return c.map(h=>{const u=[...t.get(h)??[]].sort((P,M)=>P-M);return{name:h,p50:u.length?u[Math.floor(u.length/2)]:null,n:u.length,info:l.get(h)}})}}}const Ge=Se+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,la=Ge+`
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
  o=vec4(d,0.,0.,1.); }`,ca=Ge+`
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
  o=vec4(on,0.,0.,1.); }`,ua=Ge+$t+Ne+`
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
  oA=A; oB=B; }`,fa=Ge+`
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
  o=vec4(T,1.); }`,pa=Ge+`
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,ma=Ge+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,da={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},re=(e,o,a)=>e+(o-e)*a;function va(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:Go[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:re(.1,1,o),scratch:re(0,.7,o),prints:re(0,.45,o),smear:re(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:re(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:re(.05,1,o),fog:re(.05,1,o),streak:re(0,.8,o),band:re(.1,.8,o),hollow:re(.2,.7,o),grain:re(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:re(.1,2.2,a),sloppy:re(.25,1.2,a),wobble:re(.2,.9,a),cover:re(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function ha(e,o,a){return{...yo(a,o),...Object.assign(va(e),e.fine),tech:"xerox"}}function xa(e){const{gl:o}=e;let a=null,t=null,l=0,c=0;const f=o.createTexture();let r;const n=o.createTexture();let d,h=null;const u=()=>{if(!h){h=document.createElement("canvas"),h.width=h.height=1;const y=h.getContext("2d");y.fillStyle="rgb(255,128,0)",y.fillRect(0,0,1,1)}return h};function P(y,S){if(a||(a={xlum:e.compile(la),xgen:e.compile(ca),xid:e.compile(ua),xcolor:e.compile(fa),xcomp:e.compile(ma),xdirt:e.compile(pa)}),t&&y===l&&S===c)return;t&&Object.values(t).forEach(e.freeTarget),l=y,c=S;const T=Math.max(1,y>>2),D=Math.max(1,S>>2);t={xa:e.target(y,S),xb:e.target(y,S),xc:e.target(y,S),xq1:e.target(T,D,2),xq2:e.target(T,D,2),xs:e.target(T,D)}}function M(y,S,T,D,ee,Z,H,E){P(Z,H);const i=Object.assign({},da,y),g=t,B=a,w=Z/i.printW,U=(i.markers||[]).slice(0,6),V=i.hand>0?U.length:0,A=[];for(let m=0;m<6;m++)A.push(...Oe(be(U[m]||"#ffffff")));const L=(i.keys&&i.keys.length?i.keys:U).slice(0,6),N=[];for(let m=0;m<6;m++)N.push(...Oe(be(L[m]||U[m]||"#ffffff")));i.regionMap&&i.regionMap!==d&&(e.texFrom(i.regionMap,{filter:o.NEAREST},n),d=i.regionMap),!i.regionMap&&d!==null&&(e.texFrom(u(),{filter:o.NEAREST},n),d=null);const z=Je(i.seed*4241+7),C=[];for(let m=0;m<6;m++){const k=z()*Math.PI*2,F=i.offset*(.35+.65*z());C.push(Math.cos(k)*F,Math.sin(k)*F)}i.orientMap&&i.orientMap!==r&&(e.texFrom(i.orientMap,{filter:o.NEAREST},f),r=i.orientMap),!i.orientMap&&r!==null&&(e.texFrom(u(),{filter:o.NEAREST},f),r=null);const pe=i.regionMap?1:0,K=Oe(be(i.paper)),x=Oe(i.srcPaper||[1,1,1]),b=(m,k,F,Y)=>e.run(m,k,F,X=>{X.f("uOff",0,0),X.f("uImg",Z,H),Y(X)});b("PREP",e.PR.prep,S.prep,m=>{m.t("uSrc",T),m.f("uSrcRes",D,ee),m.f("uSmoothPx",i.smooth*D/i.printW),m.f("uSrcPaper",...i.srcPaper||[1,1,1]),m.f("uPaper",1,1,1)}),b("XLUM",B.xlum,g.xa,m=>{m.f("uPxMm",w),m.t("uPrep",S.prep.t[0]),m.f("uDark",i.dark),m.f("uSoft",i.soft),m.f("uMotion",i.motion),m.f("uPhoto",i.photo),m.f("uLpi",i.lpi),m.f("uLid",i.lid)});const p=(m,k,F,Y,X,j)=>b(`BLUR ${m}`,e.PR.blur,F,v=>{v.t("uTexA",k.t[0]),v.t("uTexB",k.t[k.t.length>1?1:0]),v.f("uDir",Y,X),v.f("uSig",j)}),$=Math.max(1,Math.round(i.gens));for(let m=1;m<=$;m++){const k=Math.max(.05,i.genSpread*w*(m===1?.6:1));p(`gen${m} H`,g.xa,g.xb,1,0,k),p(`gen${m} V`,g.xb,g.xc,0,1,k),b(`XGEN ${m}`,B.xgen,g.xa,F=>{F.f("uPxMm",w),F.f("uSeed",i.seed),F.t("uD",g.xc.t[0]),F.t("uGreen",e.greenTex),F.f("uThr",i.thr),F.f("uGrain",i.grain),F.f("uDust",i.dust),F.f("uFog",i.fog),F.f("uStreak",i.streak),F.f("uGen",m)})}b("XDIRT",B.xdirt,g.xb,m=>{m.f("uPxMm",w),m.f("uSeed",i.seed),m.t("uD",g.xa.t[0]),m.f("uHair",i.hairs),m.f("uScratch",i.scratch),m.f("uPrint",i.prints),m.f("uSmear",i.smear)});const I=g.xb;p("sol ¼ H",I,S.qtmp,1,0,1.1*w/4),p("sol ¼ V",S.qtmp,g.xs,0,1,1.1*w/4);const G=V>0;if(G){p("ps ¼ H",S.prep,S.qtmp,1,0,Math.max(.3,.12*w/4)),p("ps ¼ V",S.qtmp,g.xq1,0,1,Math.max(.3,.12*w/4)),b("XID",B.xid,g.xq2,k=>{k.t("uPS",g.xq1.t[0]),k.fv("uKey",N,3),k.t("uIdMap",n),k.i("uUseMap",pe),k.i("uNk",V),k.f("uSrcPaperL",...x),k.f("uMinL",.32),k.f("uPxMm",w),k.f("uVoteMm",i.colorSmooth)});const m=Math.max(.3,(i.hand===1?.8:i.sloppy)*w/4);p("mask H",g.xq2,S.qtmp,1,0,m),p("mask V",S.qtmp,g.xq1,0,1,m),b("XCOLOR",B.xcolor,g.xc,k=>{k.f("uPxMm",w),k.f("uSeed",i.seed),k.t("uMA",g.xq1.t[0]),k.t("uMB",g.xq1.t[1]),k.fv("uMk",A,3),k.i("uNk",V),k.i("uMed",i.hand),k.fv("uCOff",C,2),k.f("uWobble",i.wobble),k.f("uCover",i.cover),k.f("uStroke",i.stroke),k.f("uAng",i.strokeAng*Math.PI/180),k.f("uOverlap",i.overlap),k.f("uStrength",i.strength),k.f("uSlop",i.slop),k.f("uDry",i.dry),k.f("uFast",i.fast),r===void 0&&(e.texFrom(u(),{filter:o.NEAREST},f),r=null),k.t("uOri",f),k.f("uSheetMm",Z/w,H/w),k.f("uWobMm",i.wobMm),k.f("uGran",i.gran),k.f("uDryB",i.dryB),k.f("uBloom",i.bloom)})}b("XCOMP",B.xcomp,S.comp,m=>{m.f("uPxMm",w),m.t("uD",I.t[0]),m.t("uSolX",g.xs.t[0]),m.f("uTonerK",i.tonerK),m.t("uC",g.xc.t[0]),m.t("uFib",e.fibTex),m.f("uPaper",...K),m.f("uHollow",i.hollow),m.f("uBand",i.band),m.f("uPaperTex",i.paperTex),m.f("uFibers",i.fibers),m.f("uHasColor",G?1:0)}),b("SCAN",e.PR.scan,E?S.out:null,m=>{m.f("uSeed",i.seed),m.t("uComp",S.comp.t[0]),m.f("uBlurPx",i.scanBlur),m.f("uNoise",i.scanNoise),m.i("uNorm",0),m.f("uPaper",...K)})}return{render:M}}function he(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const ga=he(he(go," b+=texture(uTexB,uv+o2)*k;",""),"oA=a/w; oB=b/w;","oA=a/w; oB=vec4(0);"),Po=he(he(he(xo,"float ba=eP, bs=length(oklabL(uPaper)-tSL);","float ba=eP, bs=length(oklabL(uPaper)-tSL); vec3 Da=vec3(0);"),"if(pass==0){ if(e<ba){ ba=e; Sa=S; } }","if(pass==0){ if(e<ba){ ba=e; Sa=S; Da=D; } }"),`  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD); }
`,`  ivec3 bS=Sa; vec3 bD=Da;
  if(Ss.x>=0){ vec3 Ds=Da; float es=ba; if(Ss!=Sa) es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; bD=Ds; } }
  else if(ba>eP-.025) bS=ivec3(-1);
`),Jt=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,Eo=he(So,Jt,Jt+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),eo=1,to=2,oo=4,ao=8,ba=he(Po,"for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;","for(int it=0;it<3;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;"),Sa=he(Eo,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),ka=he(ko,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),ya=he(he(he(bo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),Pa=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,ro=new Map,no=(e,o)=>{let a=ro.get(e);return a||(a=o(),ro.set(e,a)),a};function Ea(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const l=Je(e);t.lineCap="round";for(let c=0;c<2600;c++){const f=(.25+l()*l()*1.6)*85,r=l()*Math.PI*2,n=l()*1024,d=l()*1024,h=(l()-.5)*.9,u=(.012+l()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+l()*.55})`,t.lineWidth=u;for(const P of[-1024,0,1024])for(const M of[-1024,0,1024]){const y=n+P,S=d+M;y<-f-10||y>1024+f+10||S<-f-10||S>1024+f+10||(t.beginPath(),t.moveTo(y,S),t.quadraticCurveTo(y+Math.cos(r+h)*f*.5,S+Math.sin(r+h)*f*.5,y+Math.cos(r)*f,S+Math.sin(r)*f),t.stroke())}}return a}function wa(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const l=Je(e);t.lineCap="round",t.globalCompositeOperation="lighter";const c=1024/61;for(let f=0;f<70;f++){const r=l()<.7?"255,0,0":"0,255,0",n=(.4+l()*l()*3.5)*c,d=l()*Math.PI*2,h=l()*1024,u=l()*1024,P=(l()-.5)*1.6,M=(.015+l()*.03)*c;t.strokeStyle=`rgba(${r},${.35+l()*.5})`,t.lineWidth=Math.max(.6,M);for(const y of[-1024,0,1024])for(const S of[-1024,0,1024]){const T=h+y,D=u+S;T<-n||T>1024+n||D<-n||D>1024+n||(t.beginPath(),t.moveTo(T,D),t.bezierCurveTo(T+Math.cos(d+P)*n*.35,D+Math.sin(d+P)*n*.35,T+Math.cos(d-P)*n*.7,D+Math.sin(d-P)*n*.7,T+Math.cos(d)*n,D+Math.sin(d)*n),t.stroke())}}for(let f=0;f<160;f++){t.fillStyle=`rgba(255,0,0,${.2+l()*.6})`;const r=(.02+l()*l()*.12)*c;t.beginPath(),t.arc(l()*1024,l()*1024,Math.max(.5,r),0,7),t.fill()}return a}function wo(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const l=t.getParameter(t.MAX_TEXTURE_SIZE);function c(x){const b=t.createProgram();for(const[I,G]of[[t.VERTEX_SHADER,Jo],[t.FRAGMENT_SHADER,x]]){const m=t.createShader(I);if(t.shaderSource(m,G),t.compileShader(m),!t.getShaderParameter(m,t.COMPILE_STATUS)){const k=t.getShaderInfoLog(m);throw new Error(k??"shader compile error")}t.attachShader(b,m)}if(t.bindAttribLocation(b,0,"p"),t.linkProgram(b),!t.getProgramParameter(b,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(b)??"program link error");const p={},$=t.getProgramParameter(b,t.ACTIVE_UNIFORMS);for(let I=0;I<$;I++){const G=t.getActiveUniform(b,I);p[G.name.replace(/\[0\]$/,"")]=t.getUniformLocation(b,G.name)}return{p:b,u:p}}const f=new Map,r=x=>{let b=f.get(x);return b||(b=c(x),f.set(x,b)),b},n={sep0:c(xo),lut:c(ea),prep:c(ta),sep:c(oa),blur:c(go),screen:c(bo),spread:c(So),compose:c(aa),scan:c(ko)},d=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,d),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function h(x,b,{filter:p=t.LINEAR,wrap:$=t.CLAMP_TO_EDGE}={}){const I=t.createTexture();return t.bindTexture(t.TEXTURE_2D,I),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,x,b,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,p),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,p),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,$),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,$),I}function u(x,{filter:b=t.LINEAR,wrap:p=t.CLAMP_TO_EDGE,mip:$=!1}={},I=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,I),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,x),$&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,$?t.LINEAR_MIPMAP_LINEAR:b),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,b),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,p),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,p),I}function P(x,b,p=1){const $=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,$);const I=[];for(let G=0;G<p;G++){const m=h(x,b);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+G,t.TEXTURE_2D,m,0),I.push(m)}return t.drawBuffers(I.map((G,m)=>t.COLOR_ATTACHMENT0+m)),{f:$,t:I,w:x,h:b}}function M(x){x.t.forEach(b=>t.deleteTexture(b)),t.deleteFramebuffer(x.f)}const y=ia(t);function S(x,b,p,$){const I=p?p.w:e.width,G=p?p.h:e.height;t.useProgram(b.p),t.bindFramebuffer(t.FRAMEBUFFER,p?p.f:null),t.viewport(0,0,I,G);let m=0;const k=b.u,F={t(X,j){k[X]!=null&&(t.activeTexture(t.TEXTURE0+m),t.bindTexture(t.TEXTURE_2D,j),t.uniform1i(k[X],m),m++)},f(X,...j){const v=k[X];v!=null&&(j.length===1?t.uniform1f(v,j[0]):j.length===2?t.uniform2f(v,j[0],j[1]):j.length===3?t.uniform3f(v,j[0],j[1],j[2]):t.uniform4f(v,j[0],j[1],j[2],j[3]))},i(X,j){k[X]!=null&&t.uniform1i(k[X],j)},fv(X,j,v){const O=k[X];if(O==null)return;const te=new Float32Array(j);v===1?t.uniform1fv(O,te):v===2?t.uniform2fv(O,te):t.uniform3fv(O,te)},m2(X,j){k[X]!=null&&t.uniformMatrix2fv(k[X],!1,new Float32Array(j))}};F.f("uRes",I,G),$&&$(F);const Y=y.mode==="off"?null:y.before(x,{w:I,h:G,att:p?p.t.length:1});t.drawArrays(t.TRIANGLES,0,3),y.mode!=="off"&&y.after(x,Y)}const T=u(o.green,{wrap:t.REPEAT}),D={b:u(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:u(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:u(o.exLut)},ee=u(no("fib11",()=>Ea(11)),{wrap:t.REPEAT,mip:!0}),Z=u(no("inc23",()=>wa(23)),{wrap:t.REPEAT,mip:!0}),H=x=>{x.t("uExB",D.b),x.t("uExR",D.r),x.t("uExLut",D.lut),x.f("uExBSize",D.bs[0],D.bs[1]),x.f("uExRSize",D.rs[0],D.rs[1]),x.f("uExPxMm",Zo)};let E=null;const i=P(1089,33,2);let g="";const B=t.createTexture();let w=0,U=0,V=null,A=0,L=0;function N(x,b){if(x===A&&b===L)return;A=x,L=b,V&&Object.values(V).forEach(M);const p=Math.max(1,x>>2),$=Math.max(1,b>>2);V={prep:P(x,b),sep:P(x,b,2),tmp:P(x,b,2),loc:P(x,b,2),qtmp:P(p,$,2),sol:P(p,$,2),scr:P(x,b,2),cov:P(x,b,2),comp:P(x,b),prepH:P(x,b),prepV:P(x,b),out:P(x,b)},e.width=x,e.height=b}const z=t.getExtension("EXT_disjoint_timer_query_webgl2");let C=null;function pe(){if(!z||!C||!t.getQueryParameter(C,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(z.GPU_DISJOINT_EXT)||(K.gpuMs=t.getQueryParameter(C,t.QUERY_RESULT)/1e6),t.deleteQuery(C),C=null}const K={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:y,lastVariants:"",setSource(x,b=!0){w=x.width,U=x.height;const p=performance.now();u(x,{},B);const $=performance.now();b&&(t.bindTexture(t.TEXTURE_2D,B),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),K.lastUploadMs=$-p,K.lastMipMs=performance.now()-$},invalidateLut(){g=""},present(){if(!V)return;const x=V;S("PRESENT",r(Pa),null,b=>{b.t("uT",x.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(x,b={}){const p=Object.assign({},ra,x),$=b.preview??0,I=!!b.lossless||$!==0,G=(s,ae)=>$&s?"preview":I&&ae?"lossless":"lab";K.lastVariants=`blurPrep:${I?"lossless":"lab"} sep0:${G(eo,!0)} screen:${G(ao,!1)} spread:${G(to,!0)} scan:${G(oo,!1)}`;const m=performance.now();pe(),y.mode!=="off"&&y.frameStart();const k=z&&!C&&y.mode!=="timer"?t.createQuery():null;k&&t.beginQuery(z.TIME_ELAPSED_EXT,k);let F=Math.round(p.printW*p.pxmm),Y=Math.round(F*U/w);const X=Math.min(l,6144);if(Math.max(F,Y)>X){const s=X/Math.max(F,Y);F=Math.round(F*s),Y=Math.round(Y*s)}const j=x.tech==="xerox";j&&(F=Math.max(4,F&-4),Y=Math.max(4,Y&-4)),N(F,Y),K.width=F,K.height=Y;const v=V;if(j)return E??=xa({gl:t,compile:c,run:S,target:P,freeTarget:M,texFrom:u,greenTex:T,fibTex:ee,PR:{prep:n.prep,blur:n.blur,scan:n.scan}}),E.render(x,{prep:v.prep,qtmp:v.qtmp,comp:v.comp,out:v.out},B,w,U,F,Y,!!b.toTexture),K.lastVariants="xerox",k&&(t.endQuery(z.TIME_ELAPSED_EXT),C=k),t.flush(),K.lastMs=performance.now()-m,K;const O=F/p.printW,te=Oe(be(p.paper)),De=Math.min(Be,p.inks.length),tt=p.inks.concat(Array(Be).fill("#000000")).slice(0,Be),ot=p.opac.concat(Array(Be).fill(.15)).slice(0,Be),at=[];for(let s=0;s<Be;s++)at.push(...Oe(be(gt(tt[s]))));const ht=tt.map(s=>Ce(be(gt(s)))[0]<.42?0:1),qo=Ce(be(p.paper)),Wt=tt.map(s=>Math.min(1.5,Xo(Ce(be(gt(s))),qo)/.5)),Vt=JSON.stringify([tt,ot,De,p.paper,p.inkCost,p.pair]);Vt!==g&&(S("LUT",n.lut,i,s=>{s.fv("uCon",Wt,1),s.fv("uInk",at,3),s.fv("uOp",ot,1),s.i("uN",De),s.f("uPaper",...te),s.f("uCost",p.inkCost),s.f("uPair",p.pair)}),g=Vt),S("PREP",n.prep,v.prep,s=>{s.t("uSrc",B),s.f("uSrcRes",w,U),s.f("uSmoothPx",p.smooth*w/p.printW),s.f("uSrcPaper",...p.srcPaper),s.f("uPaper",...te)});const rt=Je(p.seed*7919+13),Kt=[],Qt=[];for(let s=0;s<Be;s++){const ae=(rt()*2-1)*p.rot*Math.PI/180,Ie=1+(rt()*2-1)*p.scl/1e3,nt=Math.cos(ae)*Ie,Xe=Math.sin(ae)*Ie;Kt.push(nt,Xe,-Xe,nt);const me=rt()*Math.PI*2,Yt=p.misreg*Math.sqrt(rt());Qt.push(Math.cos(me)*Yt,Math.sin(me)*Yt)}let xt;if(I){const s=r(ga);S("BLUR prep H",s,v.prepH,ae=>{ae.t("uTexA",v.prep.t[0]),ae.f("uDir",1,0),ae.f("uSig",.3*O)}),S("BLUR prep V",s,v.prepV,ae=>{ae.t("uTexA",v.prepH.t[0]),ae.f("uDir",0,1),ae.f("uSig",.3*O)}),xt=v.prepV.t[0]}else S("BLUR prep H",n.blur,v.loc,s=>{s.t("uTexA",v.prep.t[0]),s.t("uTexB",v.prep.t[0]),s.f("uDir",1,0),s.f("uSig",.3*O)}),S("BLUR prep V",n.blur,v.scr,s=>{s.t("uTexA",v.loc.t[0]),s.t("uTexB",v.loc.t[0]),s.f("uDir",0,1),s.f("uSig",.3*O)}),xt=v.scr.t[0];S("SEP0",$&eo?r(ba):I?r(Po):n.sep0,v.tmp,s=>{s.t("uPrepS",xt),s.t("uPrep",v.prep.t[0]),s.t("uSet",i.t[0]),s.fv("uCon",Wt,1),s.fv("uInk",at,3),s.fv("uOp",ot,1),s.i("uN",De),s.f("uPaper",...te),s.f("uCost",p.inkCost),s.f("uPair",p.pair),s.f("uMinDot",p.minDot)}),S("WARP",n.sep,v.sep,s=>{s.f("uPxMm",O),s.t("uSA",v.tmp.t[0]),s.t("uSB",v.tmp.t[1]),s.i("uN",De),s.f("uCtr",p.printW/2,Y/O/2),s.m2("uM",Kt),s.fv("uT",Qt,2)});const Ht=(s,ae,Ie,nt,Xe)=>{S(`BLUR ${s} H`,n.blur,Ie,me=>{me.t("uTexA",ae.t[0]),me.t("uTexB",ae.t[1]),me.f("uDir",1,0),me.f("uSig",Xe)}),S(`BLUR ${s} V`,n.blur,nt,me=>{me.t("uTexA",Ie.t[0]),me.t("uTexB",Ie.t[1]),me.f("uDir",0,1),me.f("uSig",Xe)})};return Ht("loc",v.sep,v.tmp,v.loc,.22*O),Ht("sol ¼",v.sep,v.qtmp,v.sol,1.5*O/4),S("SCREEN",$&ao?r(ya):n.screen,v.scr,s=>{H(s),s.f("uPxMm",O),s.f("uSeed",p.seed),s.t("uSepA",v.sep.t[0]),s.t("uSepB",v.sep.t[1]),s.t("uSolA",v.sol.t[0]),s.t("uSolB",v.sol.t[1]),s.t("uLocA",v.loc.t[0]),s.t("uLocB",v.loc.t[1]),s.t("uGreen",T),s.i("uN",De),s.i("uMode",+p.screen),s.f("uGrain",p.grain),s.f("uLoad",p.inkLoad),s.f("uLpi",p.lpi),s.f("uMottle",p.mottle),s.f("uStarve",p.starve),s.f("uTexAmp",p.texAmp),s.f("uStreak",p.streak),s.f("uSolidLv",p.solidLv),s.fv("uExSel",ht,1),s.f("uTrap",p.trap)}),S("SPREAD",$&to?r(Sa):I?r(Eo):n.spread,v.cov,s=>{H(s),s.f("uPxMm",O),s.f("uSeed",p.seed),s.t("uScrA",v.scr.t[0]),s.t("uScrB",v.scr.t[1]),s.t("uSepA",v.sep.t[0]),s.t("uSepB",v.sep.t[1]),s.t("uLocA",v.loc.t[0]),s.t("uLocB",v.loc.t[1]),s.i("uN",De),s.f("uBleedPx",p.bleed*O),s.f("uGain",p.gain),s.f("uEdge",p.edge),s.f("uSolidLv",p.solidLv),s.fv("uExSel",ht,1)}),S("COMPOSE",n.compose,v.comp,s=>{H(s),s.f("uPxMm",O),s.f("uSeed",p.seed),s.t("uCovA",v.cov.t[0]),s.t("uCovB",v.cov.t[1]),s.t("uSolA",v.sol.t[0]),s.t("uSolB",v.sol.t[1]),s.f("uStarve",p.starve),s.t("uFib",ee),s.t("uInc",Z),s.i("uN",De),s.fv("uInk",at,3),s.fv("uOp",ot,1),s.f("uPaper",...te),s.f("uPaperTex",p.paperTex),s.f("uFibers",p.fibers),s.f("uIncl",p.incl),s.f("uVoids",p.voids),s.f("uMottle",p.mottle),s.f("uTexAmp",p.texAmp),s.fv("uExSel",ht,1)}),S("SCAN",$&oo?r(ka):n.scan,b.toTexture?v.out:null,s=>{s.f("uSeed",p.seed),s.t("uComp",v.comp.t[0]),s.f("uBlurPx",p.scanBlur),s.f("uNoise",p.scanNoise),s.i("uNorm",+p.normWhite),s.f("uPaper",...te)}),k&&(t.endQuery(z.TIME_ELAPSED_EXT),C=k),t.flush(),K.lastMs=performance.now()-m,K}};return K}const Mo=new URLSearchParams(window.location.search),qe=Mo.get("srdebug")==="1",J=qe?Mo:new URLSearchParams,Ma=["srres","srpipe","srhold","srpreview","srprevmask"],R={preserveDrawingBuffer:J.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(J.get("srres"))||1)),mip:J.get("srmip")!=="0",bypass:J.get("srbypass")==="1",darkPaperFromBase:J.get("srdarkpaper")==="bg",simUpload:J.get("srsim")==="1",offscreenBack:J.get("sroff")==="1",bitmapUpload:J.get("srbitmap")==="1",pipe:J.get("srpipe")==="2"?2:J.get("srpipe")==="1"?1:0,hold:J.get("srhold")==="1",lossless:J.get("srlossless")!=="0",preview:J.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(J.get("srprevmask"))||0)),auto:!Ma.some(e=>J.has(e)),forceLevel:J.get("srlevel")==="preview"?"preview":J.get("srlevel")==="full"?"full":null},Ao={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},_={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},Re={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},bt=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==R.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==R.offscreenBack;Object.assign(R,e),(o||a)&&Re.recreateEngine()},so=5,io=30,Aa=12,Ta=300,Lt=new Map;let xe=null,st="";const To=(e,o)=>`${e}×${o}`;function La(e,o){if(R.forceLevel)return Tt(R.forceLevel==="preview"),R.forceLevel;const a=Lt.get(To(e,o));return a?(Tt(a==="preview"),a):"detect"}function lo(e,o,a,t){const l=To(e,o);if((!xe||xe.size!==l)&&(xe={size:l,seen:0,samples:[]}),++xe.seen>so+3*io&&!xe.samples.length){Lt.set(l,"full"),xe=null,st=`${l}: sin medida (${t}) → full`;return}if(xe.seen<=so||a===null||(xe.samples.push(a),xe.samples.length<io))return;const c=[...xe.samples].sort((n,d)=>n-d),f=c[c.length>>1],r=f>Aa?"preview":"full";Lt.set(l,r),xe=null,st=`${l}: coste p50 ${f.toFixed(1)} ms (${t}) → ${r}`,Tt(r==="preview"),qe&&console.info(`[SuperRiso] quality level ${st}`)}const Ra=()=>st;let We=null,St=null,co=0,Lo="";function Da(e,o,a){return!!e&&!!We&&o===St&&e.length===We.length&&e.every((l,c)=>l===We[c])||(co=a,Lo=o!==St?"scene":(e??[]).map((l,c)=>l===We?.[c]?"":c).filter(l=>l!=="").join(",")),We=e??null,St=o,a-co}const Ro=(e,o,a)=>{const t=a?1024:560,l=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*l)),Math.max(8,Math.round(o*l))]};function kt(e,{keys:o,srcPaper:a,fill:t,nk:l,cover:c,seed:f}){const[r,n]=Ro(e.width,e.height,t),d=document.createElement("canvas");d.width=r,d.height=n;const h=d.getContext("2d",{willReadFrequently:!0});h.fillStyle="#fff",h.fillRect(0,0,r,n),h.drawImage(e,0,0,r,n);const u=h.getImageData(0,0,r,n).data,P=Ce(a),M=new Int8Array(r*n).fill(-1),y=r*n;if(t){const E=new Uint8Array(y);for(let A=0;A<y;A++){const L=Ce([u[A*4]/255,u[A*4+1]/255,u[A*4+2]/255]);E[A]=P[0]-L[0]>.14?1:0}const i=new Uint8Array(E);for(let A=0;A<n;A++)for(let L=0;L<r;L++){if(!E[A*r+L])continue;const N=A*r+L;L>0&&(i[N-1]=1),L<r-1&&(i[N+1]=1),A>0&&(i[N-r]=1),A<n-1&&(i[N+r]=1)}const g=new Int32Array(y).fill(-1),B=new Int32Array(y),w=Je((f|0)*977+13);let U=0;const V=Math.max(6,y*12e-5);for(let A=0;A<y;A++){if(i[A]||g[A]>=0)continue;let L=0;B[L++]=A,g[A]=U;const N=[];let z=!1;for(;L;){const x=B[--L];N.push(x);const b=x%r,p=x/r|0;(b===0||p===0||b===r-1||p===n-1)&&(z=!0),b>0&&!i[x-1]&&g[x-1]<0&&(g[x-1]=U,B[L++]=x-1),b<r-1&&!i[x+1]&&g[x+1]<0&&(g[x+1]=U,B[L++]=x+1),p>0&&!i[x-r]&&g[x-r]<0&&(g[x-r]=U,B[L++]=x-r),p<n-1&&!i[x+r]&&g[x+r]<0&&(g[x+r]=U,B[L++]=x+r)}U++;const C=w(),pe=w();if(N.length<V||z&&N.length>y*.05||C>c)continue;const K=Math.min(l-1,Math.floor(pe*l));for(const x of N)M[x]=K}for(let A=0;A<3;A++){const L=new Int8Array(M);for(let N=0;N<n;N++)for(let z=0;z<r;z++){const C=N*r+z;if(L[C]>=0||!i[C])continue;const pe=z>0&&L[C-1]>=0?L[C-1]:z<r-1&&L[C+1]>=0?L[C+1]:N>0&&L[C-r]>=0?L[C-r]:N<n-1&&L[C+r]>=0?L[C+r]:-1;pe>=0&&(M[C]=pe)}}}else{const E=o.map(i=>Ce(be(i)));for(let i=0;i<y;i++){const g=Ce([u[i*4]/255,u[i*4+1]/255,u[i*4+2]/255]),B=Math.hypot(g[0]-P[0],g[1]-P[1],g[2]-P[2]),w=Math.hypot(g[1],g[2]);if(!(B>.08&&(g[0]>.32||w>.12)))continue;let U=-1,V=1e9;for(let A=0;A<E.length;A++){const L=(E[A][0]-g[0])*.6,N=E[A][1]-g[1],z=E[A][2]-g[2],C=L*L+N*N+z*z;C<V&&(V=C,U=A)}V<.045&&(M[i]=U)}}let S=null;if(t){S=document.createElement("canvas"),S.width=r,S.height=n;const E=S.getContext("2d"),i=E.createImageData(r,n);for(let g=0;g<y;g++)i.data[g*4]=(M[g]+1)*36,i.data[g*4+3]=255;E.putImageData(i,0,0)}const T=new Int32Array(y).fill(-1),D=h.createImageData(r,n),ee=new Int32Array(y);for(let E=0;E<y;E++)D.data[E*4]=255,D.data[E*4+1]=128,D.data[E*4+2]=0,D.data[E*4+3]=255;let Z=0;for(let E=0;E<y;E++){if(M[E]<0||T[E]>=0)continue;const i=M[E];let g=0;ee[g++]=E,T[E]=Z;const B=[];let w=0,U=0,V=0,A=0,L=0,N=0;for(;g;){const v=ee[--g];B.push(v);const O=v%r,te=v/r|0;w++,U+=O,V+=te,A+=O*O,L+=te*te,N+=O*te,O>0&&M[v-1]===i&&T[v-1]<0&&(T[v-1]=Z,ee[g++]=v-1),O<r-1&&M[v+1]===i&&T[v+1]<0&&(T[v+1]=Z,ee[g++]=v+1),te>0&&M[v-r]===i&&T[v-r]<0&&(T[v-r]=Z,ee[g++]=v-r),te<n-1&&M[v+r]===i&&T[v+r]<0&&(T[v+r]=Z,ee[g++]=v+r)}if(Z++,w<6)continue;const z=U/w,C=V/w,pe=A/w-z*z,K=L/w-C*C,x=N/w-z*C,b=.5*Math.atan2(2*x,pe-K),p=pe+K,$=pe*K-x*x,I=Math.sqrt(Math.max(0,p*p/4-$)),G=p/2+I,m=Math.max(1e-6,p/2-I),k=Math.sqrt(m/G),F=Math.max(0,Math.min(1,(.62-k)/.3)),Y=Math.round(127.5+127.5*Math.cos(2*b)),X=Math.round(127.5+127.5*Math.sin(2*b)),j=Math.round(255*F);for(const v of B)D.data[v*4]=Y,D.data[v*4+1]=X,D.data[v*4+2]=j}const H=new Uint8ClampedArray(D.data);for(let E=0;E<2;E++){const i=new Uint8ClampedArray(H);for(let g=0;g<n;g++)for(let B=0;B<r;B++){const w=g*r+B;if(!(i[w*4+2]>0))for(const[U,V]of[[1,0],[-1,0],[0,1],[0,-1]]){const A=B+U,L=g+V;if(A<0||L<0||A>=r||L>=n)continue;const N=L*r+A;if(i[N*4+2]>0){H[w*4]=i[N*4],H[w*4+1]=i[N*4+1],H[w*4+2]=i[N*4+2];break}}}}return D.data.set(H),h.putImageData(D,0,0),{ori:d,ids:S}}const Do=300;let de=null,Rt=0,yt=!1;const $e=document.createElement("canvas"),Ba=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:Do}):setTimeout(e,0)},_a=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),Fa=()=>Rt;function Ca(e,o,a,t,l,c,f){const r=o.what==="fill",n={keys:r?[]:o.keys??o.paint,srcPaper:t,fill:r,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!l)return kt(e,n);const d=JSON.stringify([r,n.keys,n.nk,r?n.cover:0,r?n.seed:0,t]),h=performance.now(),u={motion:c&&[...c],scene:f};if(!de||de.key!==d)return de={key:d,maps:kt(e,n),at:h,sig:u},Rt++,de.maps;if(!yt&&h-de.at>=Do&&!_a(u,de.sig)){const[P,M]=Ro(e.width,e.height,r);($e.width!==P||$e.height!==M)&&($e.width=P,$e.height=M),$e.getContext("2d").drawImage(e,0,0,P,M),yt=!0,de.at=h,de.sig=u,Ba(()=>{yt=!1,!(!de||de.key!==d)&&(de.maps=kt($e,n),Rt++)})}return de.maps}const Na=2400,Ia=240,He={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function ke(e,o){const a=He[e];a.push(o),a.length>Na&&a.shift()}function ce(e,o,a){const t=He[e].slice(-a);if(t.length===0)return null;const l=[...t].sort((c,f)=>c-f);return l[Math.min(l.length-1,Math.floor(o*l.length))]}function jt(e=Ia){const o=He.interval.slice(-e),a=o.length?o.reduce((t,l)=>t+l,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:ce("interval",.5,e),frameP95:ce("interval",.95,e),totalP50:ce("total",.5,e),totalP95:ce("total",.95,e),flatP50:ce("flat",.5,e),uploadP50:ce("upload",.5,e),uploadP95:ce("upload",.95,e),mipP50:ce("mip",.5,e),renderP50:ce("render",.5,e),backP50:ce("back",.5,e),bitmapWaitP50:ce("bitmapWait",.5,e),gpuP50:ce("gpu",.5,e),gpuP95:ce("gpu",.95,e)}}function Bo(){for(const e of Object.keys(He))He[e].length=0}let je=null,Ve=null,Ae=null,Te=null,Pe=null,_o="",Dt="";function Fo(e){_o=e}function Pt(e){Dt=e,Ae&&(Ae.textContent=e,Ae.style.display=e?"block":"none")}function uo(e){Pe&&(Pe.disabled=e,Pe.style.opacity=e?".5":"1")}const ve=(e,o=1)=>e===null?"–":e.toFixed(o),Bt=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function $a(e){if(!Te)return;Te.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const l=document.createElement("button");l.textContent="Copiar",Bt(l),l.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((f,r)=>setTimeout(()=>r(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const c=document.createElement("button");c.textContent="Cerrar",Bt(c),c.onclick=()=>{Te&&(Te.textContent="")},a.append(l,c,t),Te.append(o,a)}function ja(e){je||typeof document>"u"||(je=document.createElement("div"),je.setAttribute("data-superriso-overlay",""),Object.assign(je.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Te=document.createElement("div"),Te.style.pointerEvents="auto",Ae=document.createElement("div"),Object.assign(Ae.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Pe=document.createElement("button"),Pe.textContent="Medir",Bt(Pe),Pe.style.pointerEvents="auto",Pe.onclick=e,Ve=document.createElement("div"),Object.assign(Ve.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),je.append(Te,Ae,Pe,Ve),document.body.appendChild(je),setInterval(()=>{if(!Ve)return;const o=jt();Ve.textContent=`${_o}
fps ${ve(o.fps)} · frame p50 ${ve(o.frameP50)} p95 ${ve(o.frameP95)} ms
SR p50 ${ve(o.totalP50)} p95 ${ve(o.totalP95)} ms (aplanado ${ve(o.flatP50)} · subida ${ve(o.uploadP50)} · mip ${ve(o.mipP50)} · motor ${ve(o.renderP50)} · vuelta ${ve(o.backP50)})
GPU motor p50 ${ve(o.gpuP50)} p95 ${ve(o.gpuP95)} ms`,Dt&&Ae&&(Ae.textContent=Dt)},500))}const et=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function Co(e){return e&&et?new OffscreenCanvas(1,1):document.createElement("canvas")}const Ut=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,zt=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},Ee=zt(),No=zt();function Ue(e,o,a,t,l,c){const{canvas:f,ctx:r}=e;return(f.width!==a||f.height!==t)&&(f.width=a,f.height=t),r.setTransform(1,0,0,1,0,0),r.globalAlpha=1,r.globalCompositeOperation="source-over",r.fillStyle=l,r.fillRect(0,0,a,t),r.globalCompositeOperation=c?"source-over":"multiply",r.imageSmoothingEnabled=!0,r.imageSmoothingQuality="medium",r.drawImage(o,0,0,a,t),r.globalCompositeOperation="source-over",f}let ie=null,Et=!1,fo=0;function Ua(e,o,a){fo++;const t=fo;let l=null;if(ie&&ie.bmp.width===o&&ie.bmp.height===a?l={bmp:ie.bmp,lag:t-ie.frame}:ie&&ie.bmp.close(),ie=null,!Et){Et=!0;const c=performance.now();createImageBitmap(e).then(f=>{ke("bitmapWait",performance.now()-c),ie&&ie.bmp.close(),ie={bmp:f,frame:t}}).catch(()=>{}).finally(()=>{Et=!1})}return l}function za(){ie&&ie.bmp.close(),ie=null}function Fe(e,o,a,t,l,c,f){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!f,e.drawImage(o,0,0,a,t,0,0,l,c)}finally{e.restore()}}function lt(e,o,a,t,l,c,f){const r=Ut(o)?o.transferToImageBitmap():null;try{Fe(e,r??o,a,t,l,c,f)}finally{r?.close()}}const Me=zt();let Ot=!1;function qt(e,o,a){const t=Ut(e)?e.transferToImageBitmap():null;try{return(Me.canvas.width!==o||Me.canvas.height!==a)&&(Me.canvas.width=o,Me.canvas.height=a),Me.ctx.globalCompositeOperation="copy",Me.ctx.drawImage(t??e,0,0),Ot=!0,Me.canvas}finally{t?.close()}}const it=()=>Ot?Me.canvas:null,_t=()=>{Ot=!1},ct=()=>({res:1,sim:!1,preview:0,lossless:R.lossless,pipe:0,hold:!1,holdFps:12});function Io(e,o,a){if(!R.auto)return{m:{res:R.resScale,sim:R.simUpload,preview:R.preview,lossless:R.lossless,pipe:R.pipe,hold:R.hold,holdFps:12},level:"manual"};const t=La(e,o);return t!=="preview"?{m:ct(),level:t}:a.fullQuality?{m:{...ct(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:R.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const Oa=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),Ye={inks:null,params:null};function ut(e,o,a,t){const{settings:l,isDarkMode:c,isPixelArt:f}=a,r=l.technique==="xerox",n=r?ha(l.xerox,e*t.res,l.resolution):sa(l,e*t.res),d=Math.round(240*n.pxmm),h=Math.round(d*o/e),u=t.sim?Math.min(e,d):e,P=t.sim?Math.min(o,h):o,M=Qo(c,f),y=c&&!R.darkPaperFromBase,S=y?[1,1,1]:be(M),T=r?Wo(l,a.shapes,a.hiddenLayers,S,y?M:null):null;T&&a.isLive&&Vo({rows:T.rows,what:T.what,zones:T.zones});const D=T?{inks:T.paint,names:T.rows.map(H=>H.id??""),opac:[],srcPaper:S}:Ko(a.shapes,a.hiddenLayers,l,S,y?M:null);a.isLive&&(Ye.inks=D);const ee=[e,o,+c,+f,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+R.mip,+R.offscreenBack,+R.preserveDrawingBuffer,+R.darkPaperFromBase,l.technique,...T?[l.resolution,JSON.stringify(l.xerox),(T.keys??[]).join(","),Fa()]:[l.paper,l.screen,l.screenSize,l.imperfection,l.resolution],D.inks.join(",")].join("|"),Z=T?{x:l.xerox,mk:T,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:n,fw:u,fh:P,base:M,srcPaper:S,inks:D,key:ee,xerox:Z}}function ze(e){const o=e.xerox;if(!o)return Ye.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const a=o.x.hand==="none"?null:Ca((o.isLive?Ee:No).canvas,o.mk,o.x,e.srcPaper,o.isLive,o.motion,o.scene);return Ye.params={...e.style,markers:o.mk.paint,keys:o.mk.keys,regionMap:a?.ids??null,orientMap:a?.ori??null,srcPaper:e.srcPaper}}const dt=e=>e%9999+1,Ze=e=>Math.floor(performance.now()*e/1e3);function ft(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):Ze(o)}const Le=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let pt=null;const po=()=>{pt?.destroy(),pt=null};function qa(e,o,a,t,l){const c=performance.now(),f=t.exportFrame,r=!f||f.index===0,n=!f||f.index>=f.count-1;try{r&&po();const d=pt??(pt=wo(document.createElement("canvas"),l,{preserveDrawingBuffer:!0})),h=ct(),u=ut(o,a,t,h),P=Ue(No,e.canvas,u.fw,u.fh,u.base,t.isDarkMode);return d.setSource(P,!0),d.render({...ze(u),seed:dt(ft(t))},Le(h)),d.gl.isContextLost()?!1:(lt(e,d.canvas,d.width,d.height,o,a,!!u.style.crisp),qe&&console.info(`[SuperRiso] export frame ${f?`${f.index+1}/${f.count}`:"single"} ${o}×${a} → sim ${d.width}×${d.height}: ${(performance.now()-c).toFixed(1)} ms · ${d.lastVariants}`),!0)}finally{n&&po()}}const Ft=2e3,$o=8e3,Ct=60,mo=8,_e={...Ao,simUpload:!0,auto:!1,lossless:!1},Qe=e=>new Promise(o=>setTimeout(o,e)),we=(e,o=1)=>e===null?"–":e.toFixed(o);let wt=!1;function Ga(){let o=Re.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),l=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),c=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:l,maxTex:c}}function Xa(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,c=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,r])=>r!==null).sort((r,n)=>n[1]-r[1])[0],f=[];return c&&c[1]>=3&&f.push(`${c[0]} ${we(c[1])} ms`),t!==null&&t>=3&&f.push(`fuera de nuestras etapas ${we(t)} ms`),f.length?f.join(" + "):"sin espera apreciable"}async function vo(e){const o=Re.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const c=o.report().find(f=>f.name==="SCAN");if(c&&c.n>=Ct)break;await Qe(100)}e==="timer"&&(await Qe(300),o.poll());const t=o.report();o.setMode("off");const l=[...t].filter(c=>c.p50!==null).sort((c,f)=>f.p50-c.p50).map(c=>c.name);return{mode:e,lines:t.map(c=>`  ${c.name.padEnd(13)} ${`${c.info.w}×${c.info.h}`.padEnd(10)} att ${c.info.att}  p50 ${we(c.p50,3).padStart(7)} ms  #${l.indexOf(c.name)+1}  (n=${c.n})`)}}function Wa(e,o,a,t,l){const c=Ga(),f=e.find(d=>d.id==="A")?.s.frameP50??null,r=Re.engineInfo(),n=[];n.push(`SUPER RISO · medición automática C2a · Diorame ${Ho} · ${new Date().toISOString()}`),n.push(`UA: ${navigator.userAgent}`),n.push(`DPR ${window.devicePixelRatio} · canvas vivo ${_.canvasW}×${_.canvasH} · simulación (última) ${r?`${r.width}×${r.height}`:"–"}`),n.push(`GPU: ${c.renderer} · MAX_TEXTURE_SIZE ${c.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${et?"sí":"no"}`),n.push(`Modo ${_.isDark?"oscuro":"claro"} · preset de cámara: ${_.preset||"–"} (velocidad ${_.speed||"–"})`),n.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const d of a)n.push(`AVISO: ${d}`);n.push(`Cada fila: ${Ft/1e3} s de calentamiento descartados + ${$o/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),n.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),n.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),n.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),n.push(""),n.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const d of e){const h=d.s,u=M=>we(M,2).padStart(6),P=!d.patch.bypass&&h.frameP50!==null&&f!==null&&h.totalP50!==null?h.frameP50-f-h.totalP50:null;n.push(`${(d.id+" "+d.label).padEnd(20)}${we(h.fps).padStart(5)}  ${(we(h.frameP50)+"/"+we(h.frameP95)).padEnd(11)} |${u(h.totalP50)}${u(h.flatP50)} ${u(h.uploadP50)}${u(h.uploadP95)}${u(h.mipP50)}${u(h.renderP50)}${u(h.backP50)} |${u(P)}    |${u(h.gpuP50)}  ${d.res.padEnd(10)}  ${d.n.pipe}/${d.n.sync}/${d.n.held}  (n=${h.samples})`)}n.push(""),n.push("Dónde cae la espera:");for(const d of e)d.patch.bypass||n.push(`  ${d.id} ${d.label}: ${Xa(d,f)}`);for(const d of l)d&&(n.push(""),n.push(d.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${Ct} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${Ct} frames, temporizador de GPU por pasada:`),d.mode==="sync"&&n.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),n.push(...d.lines),n.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return n.join(`
`)}async function Va(){if(wt)return;const e=[],o=performance.now()-_.lastCallAt;if(_.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):_.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;wt=!0,uo(!0);const a={...R},t=[],l=[];let c=!1,f="–",r=0;const n=async d=>{Pt(`Midiendo ${d.id} (${++r}/${mo})…`),bt(d.patch),await Qe(Ft),Bo();const h={pipe:_.pipeFrames,sync:_.pipeSyncFrames,held:_.heldFrames};await Qe($o);const u=jt(1/0);u.gpuP50!==null&&(c=!0);const P={pipe:_.pipeFrames-h.pipe,sync:_.pipeSyncFrames-h.sync,held:_.heldFrames-h.held},M=Re.engineInfo(),y={id:d.id,label:d.label,res:d.patch.bypass||!M?"–":`${M.width}×${M.height}`,s:u,patch:d.patch,n:P};return t.push(y),y};try{await n({id:"A",label:"bypass",patch:{...Ao,bypass:!0,auto:!1}});const d=await n({id:"B",label:".75 pipe1",patch:{..._e,resScale:.75,pipe:1}}),h=await n({id:"C",label:".75 pipe2",patch:{..._e,resScale:.75,pipe:2}}),u=(h.s.frameP50??1e9)<(d.s.frameP50??1e9)?2:1;f=`pipe${u} (${u===2?"C":"B"}: frame p50 ${we(u===2?h.s.frameP50:d.s.frameP50)} ms frente a ${we(u===2?d.s.frameP50:h.s.frameP50)})`,await n({id:"D",label:`.75 pipe${u} lossless`,patch:{..._e,resScale:.75,pipe:u,lossless:!0}}),await n({id:"E",label:`.75 pipe${u} preview`,patch:{..._e,resScale:.75,pipe:u,lossless:!0,preview:15}}),await n({id:"F",label:`1.0 pipe${u} preview`,patch:{..._e,resScale:1,pipe:u,lossless:!0,preview:15}}),await n({id:"G",label:`.75 pipe${u} hold`,patch:{..._e,resScale:.75,pipe:u,hold:!0}}),Pt(`Midiendo P (${++r}/${mo})… perfilado por pasada`),bt({..._e,resScale:.75,pipe:1}),await Qe(Ft),l.push(await vo("sync")),l.push(await vo("timer"))}finally{bt(a),Pt(""),uo(!1),wt=!1}$a(Wa(t,c,e,f,l))}const Ka=["greennoise1024","ink_black","ink_red","ink_lut"];let vt=null,mt=!1,Nt=!1,W=null,ne=Co(R.offscreenBack),ho=R.preserveDrawingBuffer,Mt=0;const Gt=(e,o)=>{mt||(mt=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},Qa=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(Ka.map(Qa)).then(([e,o,a,t])=>{vt={green:e,exBlack:o,exRed:a,exLut:t}}).catch(e=>Gt("textures",e));const jo=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===ne&&(Nt=!0,W=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===ne&&(Nt=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};jo(ne);const Uo=()=>{const e=ne;W=null,za(),oe=null,ge=null,Q=null,ue=null,ye=null,le=null,_t(),ne=Co(R.offscreenBack),jo(ne),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};Re.recreateEngine=Uo;Re.engineInfo=()=>W?{gl:W.gl,width:W.width,height:W.height}:null;Re.profiler=()=>W?W.profiler:null;const zo=()=>[`pdb ${R.preserveDrawingBuffer?"on":"off"}`,`mip ${R.mip?"on":"off"}`,R.bitmapUpload?"bitmap":"",R.offscreenBack?et?"offscreen":"offscreen→DOM":"",R.bypass?"BYPASS":""].filter(Boolean).join(" · ");qe&&(ja(()=>{Va()}),Fo(`SUPER RISO · ${zo()}`),window.__superRiso={KNOBS:R,snapshot:jt,reset:Bo,live:_,qualityReport:Ra,isSuperRisoPreviewDevice:Yo,get lastChange(){return Lo},get inks(){return Ye.inks},get params(){return Ye.params},get engine(){return W},get disabled(){return mt},get glCanvas(){return ne},get flat(){return Ee.canvas}});function Xt(){return W&&(ho!==R.preserveDrawingBuffer||Ut(ne)!==(R.offscreenBack&&et))&&Uo(),W||(W=wo(ne,vt,{preserveDrawingBuffer:R.preserveDrawingBuffer}),ho=R.preserveDrawingBuffer),W}let fe=0,oe=null,ge=null,Q=null,ue=null;const q={begin:0,upload:0,mip:0,render:0,backBegin:0};let ye=null,le=null;const Oo=()=>mt||Nt||!vt||R.bypass;function Za(e,o,a){if(!a.isLive||(fe++,ge=null,q.begin=0,q.upload=0,q.mip=0,q.render=0,q.backBegin=0,Oo()))return;const{m:t}=Io(e,o,a.settings);if(!t.pipe||ue)return;const l=performance.now();try{const c=ut(e,o,a,t);if(t.pipe===2){Ha(c,t,ft(a),l);return}if(!oe||oe.key!==c.key||oe.frame!==fe-1){oe=null;return}const f=Ze(t.holdFps);if(t.hold&&Q&&Q.key===c.key&&Q.tick===f&&it())return;const r=Xt();r.setSource(Ee.canvas,R.mip);const n=performance.now();r.render({...oe.params,seed:dt(ft(a))},Le(t));const d=performance.now();if(oe=null,r.gl.isContextLost())return;ge={key:c.key,frame:fe,ew:r.width,eh:r.height,crisp:!!c.style.crisp,tick:f},q.upload=r.lastUploadMs,q.mip=r.lastMipMs,q.render=d-n,q.begin=d-l}catch(c){W=null,Gt("exception in beginSuperRisoFrame",c)}}function Ha(e,o,a,t){const l=Ze(o.holdFps);if(ye&&ye.frame===fe-1&&ye.key===e.key&&W){const n=performance.now();W.present(),qt(ne,ye.ew,ye.eh),q.backBegin=performance.now()-n,le={...ye,frame:fe}}if(ye=null,!oe||oe.key!==e.key||oe.frame!==fe-1){oe=null,q.begin=performance.now()-t;return}if(o.hold&&le&&le.key===e.key&&le.tick===l){q.begin=performance.now()-t;return}const c=Xt();c.setSource(Ee.canvas,R.mip);const f=performance.now();c.render({...oe.params,seed:dt(a)},Le(o,!0));const r=performance.now();oe=null,!c.gl.isContextLost()&&(ye={key:e.key,frame:fe,tick:l,ew:c.width,eh:c.height,crisp:!!e.style.crisp},q.upload=c.lastUploadMs,q.mip=c.lastMipMs,q.render=r-f,q.begin=r-t)}function At(e,o,a,t,l,c,f,r,n){if(t.hold){const d=qt(ne,c,f);Q={key:l,tick:n,ew:c,eh:f,crisp:r},Fe(e,d,c,f,o,a,r)}else lt(e,ne,c,f,o,a,r)}function Ke(e,o,a,t,l,c=!1){const f=Xt(),r=performance.now(),n=R.bitmapUpload?Ua(o,e.fw,e.fh):null,d=performance.now()-r;n?(f.setSource(n.bmp,R.mip),n.bmp.close(),_.bitmapLagFrames=n.lag):f.setSource(o,R.mip);const h=performance.now();return f.render({...a,seed:dt(t)},l),c&&f.profiler.timerAvailable?lo(_.canvasW,_.canvasH,f.gpuMs===null?null:f.gpuMs+performance.now()-r,"GPU"):c&&(f.finish(),lo(_.canvasW,_.canvasH,performance.now()-r,"readback")),q.upload+=f.lastUploadMs+d,q.mip+=f.lastMipMs,q.render+=performance.now()-h,f}function Ja(e,o,a,t){const l=performance.now(),{isDarkMode:c,isLive:f,info:r}=t;if(f&&(qe&&Mt>0&&ke("interval",l-Mt),Mt=l,_.lastCallAt=l,_.isDark=c,_.canvasW=o,_.canvasH=a,_.preset=r.preset,_.speed=r.speed,_.offscreenFallback=R.offscreenBack&&!et),Oo())return!1;try{if(!f)return qa(e,o,a,t,vt);const{m:n,level:d}=Io(o,a,t.settings),h=ft(t),u=ut(o,a,t,n);_.level=d,Q&&(Q.key!==u.key||!n.hold)&&(Q=null,ue||_t());const P=Da(t.motion,t.scene,l);let M=l,y=l;const S=(E,i=n)=>{if(_.lastPath=E,!qe)return!0;const g=performance.now();return ke("flat",M-l),ke("upload",q.upload),ke("mip",q.mip),ke("render",q.render),ke("back",q.backBegin+(g-y)),ke("total",q.begin+(g-l)),W&&W.gpuMs!==null&&ke("gpu",W.gpuMs),Fo(`SUPER RISO · ${d} · ${o}×${a} → sim ${W?`${W.width}×${W.height}`:"–"} · src ${u.fw}×${u.fh} · ${Oa(i)} · ${zo()} · ${E}`),!0};if(d==="detect"){const E=Ue(Ee,e.canvas,u.fw,u.fh,u.base,c);M=performance.now();const i=Ke(u,E,ze(u),h,Le(n),!0);return i.gl.isContextLost()?!1:(y=performance.now(),lt(e,ne,i.width,i.height,o,a,!!u.style.crisp),S("detect"))}if(d==="preview"&&P>=Ta){const E=ct(),i=ut(o,a,t,E);oe=null,ge=null,Q=null;const g=it();if(ue&&ue.key===i.key&&ue.tick===h&&g)return y=performance.now(),Fe(e,g,ue.ew,ue.eh,o,a,ue.crisp),_.heldFrames++,S("refined",E);const B=Ue(Ee,e.canvas,i.fw,i.fh,i.base,c);M=performance.now();const w=Ke(i,B,ze(i),h,Le(E));if(w.gl.isContextLost())return!1;y=performance.now();const U=qt(ne,w.width,w.height);return ue={key:i.key,tick:h,ew:w.width,eh:w.height,crisp:!!i.style.crisp},Fe(e,U,w.width,w.height,o,a,ue.crisp),S("refine",E)}ue&&(ue=null,_t());const T=()=>n.hold&&Q&&Q.key===u.key?it():null;if(n.pipe===2){const E=Ue(Ee,e.canvas,u.fw,u.fh,u.base,c);M=performance.now();const i=ze(u);oe={key:u.key,frame:fe,params:i},y=performance.now();const g=it();if(le&&le.key===u.key&&g&&(le.frame===fe||n.hold))return Fe(e,g,le.ew,le.eh,o,a,le.crisp),le.frame===fe?_.pipeFrames++:_.heldFrames++,S(le.frame===fe?"pipe2":"held");le=null;const B=Ke(u,E,i,h,Le(n));return B.gl.isContextLost()?!1:(y=performance.now(),lt(e,ne,B.width,B.height,o,a,!!u.style.crisp),_.pipeSyncFrames++,S("sync"))}if(n.pipe){const E=Ue(Ee,e.canvas,u.fw,u.fh,u.base,c);M=performance.now();const i=ze(u);if(oe={key:u.key,frame:fe,params:i},y=performance.now(),ge&&ge.key===u.key&&ge.frame===fe)return At(e,o,a,n,u.key,ge.ew,ge.eh,ge.crisp,ge.tick),_.pipeFrames++,S("pipe");const g=T();if(g&&Q)return Fe(e,g,Q.ew,Q.eh,o,a,Q.crisp),_.heldFrames++,S("held");const B=Ke(u,E,i,h,Le(n));return B.gl.isContextLost()?!1:(y=performance.now(),At(e,o,a,n,u.key,B.width,B.height,!!u.style.crisp,Ze(n.holdFps)),_.pipeSyncFrames++,S("sync"))}const D=Ze(n.holdFps),ee=T();if(ee&&Q&&Q.tick===D)return Fe(e,ee,Q.ew,Q.eh,o,a,Q.crisp),_.heldFrames++,S("held");const Z=Ue(Ee,e.canvas,u.fw,u.fh,u.base,c);M=performance.now();const H=Ke(u,Z,ze(u),h,Le(n));return H.gl.isContextLost()?!1:(y=performance.now(),At(e,o,a,n,u.key,H.width,H.height,!!u.style.crisp,D),S("sync"))}catch(n){return W=null,Gt("exception in applySuperRiso",n),!1}}export{Ja as applySuperRiso,Za as beginSuperRisoFrame};
