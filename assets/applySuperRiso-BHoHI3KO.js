import{X as Qo,s as Bt,x as Yo,b as Zo,c as yo,d as Jo,e as ea,A as ta,i as oa}from"./index-BsWSHXaF.js";const aa=17.2,ra=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,ke=`#version 300 es
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
`,Ut=`
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
`,zt=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ne=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,na=ke+zt+Ne+`
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
}`,sa=ke+`
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
}`,Po=ke+zt+Ne+`
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
}`,ia=ke+Ne+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Eo=ke+Ne+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,wo=ke+Ut+Ne+`
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
}`,Mo=ke+Ut+Ne+`
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
  oA=A; oB=B; }`,la=ke+Ut+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ao=ke+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,Ae=8,ca={Black:.32,Cornflower:.35,"Light Gray":.4,Gray:.35,Granite:.35,"Metallic Gold":.4,Charcoal:.25,Midnight:.2},ua={"#000000":"#25222a"},fa=[["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]],pa=[["Fluorescent Pink","#ff48b0"],["Yellow","#ffe800"],["Medium Blue","#3255a4"],["Black","#000000"]],G=e=>(e=e.replace("#",""),[0,2,4].map(o=>parseInt(e.substr(o,2),16)/255)),ma=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),Ie=e=>e.map(ma);function K(e){const[o,a,t]=Ie(e),i=Math.cbrt(.4122214708*o+.5363325363*a+.0514459929*t),s=Math.cbrt(.2119034982*o+.6806995451*a+.1073969566*t),l=Math.cbrt(.0883024619*o+.2817188376*a+.6299787005*t);return[.2104542553*i+.793617785*s-.0040720468*l,1.9779984951*i-2.428592205*s+.4505937099*l,.0259040371*i+.7827717662*s-.808675766*l]}const da=(e,o)=>Math.hypot(e[0]-o[0],e[1]-o[1],e[2]-o[2]),ft=(e,o)=>Math.hypot(e[0]-o[0],2*(e[1]-o[1]),2*(e[2]-o[2])),Ye=e=>ua[e.toLowerCase()]||e,va=(e,o)=>ca[e]??(K(G(o))[0]<.3?.3:.15);function ot(e){let o=e>>>0||1;return()=>(o^=o<<13,o>>>=0,o^=o>>17,o^=o<<5,o>>>=0,o/4294967296)}function ha(e,o,a){let t=null,i=1e9;const s=K(o);for(const[l,r]of e){if(a.has(l))continue;const n=ft(K(G(r)),s);n<i&&(i=n,t=[l,r])}return t}const xa={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},to={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},ga={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},ie=(e,o,a)=>e+(o-e)*a;function ba(e,o){const a=Object.assign({},ga,e),t=a.imperfection,i=a.resolution,s=a.screenSize,l=240,r=o*ie(.4,1,i)/l;return Object.assign({printW:l,pxmm:r,crisp:i<.5,screen:a.screen==="dots"?1:0,grain:ie(.09,.3,s),lpi:Math.round(ie(120,45,s)),misreg:.04+1.1*Math.pow(t,1.6),rot:ie(.01,.16,t),scl:ie(.2,1.6,t),edge:ie(.25,1.05,t),voids:ie(.05,.45,t),texAmp:ie(.6,1.45,t),starve:ie(.05,.4,t),mottle:ie(.3,1.2,t),bleed:ie(.04,.07,t),inkLoad:ie(.75,.5,t),scanBlur:ie(1,.65,i),scanNoise:ie(.6,.35,i)},to[a.paper]||to.natural)}function Sa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,i=new Map,s=[],l=[];let r=0;const n=new Uint8Array(4),p=(m,u)=>{let E=t.get(m);E||(E=[],t.set(m,E)),E.push(u)};return{get mode(){return a},timerAvailable:!!o,setMode(m){a=m==="timer"&&!o?"off":m,t.clear(),i.clear(),s.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,n),r=performance.now()),a==="timer"&&this.poll()},before(m,u){if(i.has(m)||(i.set(m,u),s.push(m)),a!=="timer"||!o)return null;const E=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,E),E},after(m,u){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,n);const E=performance.now();p(m,E-r),r=E}else u&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),l.push({name:m,q:u}))},poll(){if(o)for(;l.length&&e.getQueryParameter(l[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:m,q:u}=l.shift();e.getParameter(o.GPU_DISJOINT_EXT)||p(m,e.getQueryParameter(u,e.QUERY_RESULT)/1e6),e.deleteQuery(u)}},report(){return s.map(m=>{const u=[...t.get(m)??[]].sort((E,P)=>E-P);return{name:m,p50:u.length?u[Math.floor(u.length/2)]:null,n:u.length,info:i.get(m)}})}}}const We=ke+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,ka=We+`
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
  o=vec4(d,0.,0.,1.); }`,ya=We+`
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
  o=vec4(on,0.,0.,1.); }`,Pa=We+zt+Ne+`
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
  oA=A; oB=B; }`,Ea=We+`
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
  o=vec4(T,1.); }`,wa=We+`
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,Ma=We+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Aa={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},le=(e,o,a)=>e+(o-e)*a;function Ta(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:Qo[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:le(.1,1,o),scratch:le(0,.7,o),prints:le(0,.45,o),smear:le(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:le(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:40,motion:0,lid:0,dust:le(.05,1,o),fog:le(.05,1,o),streak:le(0,.8,o),band:le(.1,.8,o),hollow:le(.2,.7,o),grain:.06,thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:le(.1,2.2,a),sloppy:le(.25,1.2,a),wobble:le(.2,.9,a),cover:le(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12,scanBlurMm:.06,scanNoise:.3}}function La(e,o){const t=o/240,i=Object.assign(Ta(e),e.fine),{scanBlurMm:s,...l}=i;return{...l,tech:"xerox",printW:240,pxmm:t,scanBlur:Math.max(.05,s*t)}}function Ra(e){const{gl:o}=e;let a=null,t=null,i=0,s=0;const l=o.createTexture();let r;const n=o.createTexture();let p,m=null;const u=()=>{if(!m){m=document.createElement("canvas"),m.width=m.height=1;const k=m.getContext("2d");k.fillStyle="rgb(255,128,0)",k.fillRect(0,0,1,1)}return m};function E(k,b){if(a||(a={xlum:e.compile(ka),xgen:e.compile(ya),xid:e.compile(Pa),xcolor:e.compile(Ea),xcomp:e.compile(Ma),xdirt:e.compile(wa)}),t&&k===i&&b===s)return;t&&Object.values(t).forEach(e.freeTarget),i=k,s=b;const w=Math.max(1,k>>2),L=Math.max(1,b>>2);t={xa:e.target(k,b),xb:e.target(k,b),xc:e.target(k,b),xq1:e.target(w,L,2),xq2:e.target(w,L,2),xs:e.target(w,L)}}function P(k,b,w,L,Y,Z,ee,M){E(Z,ee);const f=Object.assign({},Aa,k),g=t,D=a,A=Z/f.printW,U=(f.markers||[]).slice(0,6),H=f.hand>0?U.length:0,T=[];for(let v=0;v<6;v++)T.push(...Ie(G(U[v]||"#ffffff")));const R=(f.keys&&f.keys.length?f.keys:U).slice(0,6),I=[];for(let v=0;v<6;v++)I.push(...Ie(G(R[v]||U[v]||"#ffffff")));f.regionMap&&f.regionMap!==p&&(e.texFrom(f.regionMap,{filter:o.NEAREST},n),p=f.regionMap),!f.regionMap&&p!==null&&(e.texFrom(u(),{filter:o.NEAREST},n),p=null);const z=ot(f.seed*4241+7),C=[];for(let v=0;v<6;v++){const y=z()*Math.PI*2,F=f.offset*(.35+.65*z());C.push(Math.cos(y)*F,Math.sin(y)*F)}f.orientMap&&f.orientMap!==r&&(e.texFrom(f.orientMap,{filter:o.NEAREST},l),r=f.orientMap),!f.orientMap&&r!==null&&(e.texFrom(u(),{filter:o.NEAREST},l),r=null);const de=f.regionMap?1:0,Q=Ie(G(f.paper)),x=Ie(f.srcPaper||[1,1,1]),S=(v,y,F,te)=>e.run(v,y,F,W=>{W.f("uOff",0,0),W.f("uImg",Z,ee),te(W)});S("PREP",e.PR.prep,b.prep,v=>{v.t("uSrc",w),v.f("uSrcRes",L,Y),v.f("uSmoothPx",f.smooth*L/f.printW),v.f("uSrcPaper",...f.srcPaper||[1,1,1]),v.f("uPaper",1,1,1)}),S("XLUM",D.xlum,g.xa,v=>{v.f("uPxMm",A),v.t("uPrep",b.prep.t[0]),v.f("uDark",f.dark),v.f("uSoft",f.soft),v.f("uMotion",f.motion),v.f("uPhoto",f.photo),v.f("uLpi",f.lpi),v.f("uLid",f.lid)});const d=(v,y,F,te,W,j)=>S(`BLUR ${v}`,e.PR.blur,F,h=>{h.t("uTexA",y.t[0]),h.t("uTexB",y.t[y.t.length>1?1:0]),h.f("uDir",te,W),h.f("uSig",j)}),$=Math.max(1,Math.round(f.gens));for(let v=1;v<=$;v++){const y=Math.max(.05,f.genSpread*A*(v===1?.6:1));d(`gen${v} H`,g.xa,g.xb,1,0,y),d(`gen${v} V`,g.xb,g.xc,0,1,y),S(`XGEN ${v}`,D.xgen,g.xa,F=>{F.f("uPxMm",A),F.f("uSeed",f.seed),F.t("uD",g.xc.t[0]),F.t("uGreen",e.greenTex),F.f("uThr",f.thr),F.f("uGrain",f.grain),F.f("uDust",f.dust),F.f("uFog",f.fog),F.f("uStreak",f.streak),F.f("uGen",v)})}S("XDIRT",D.xdirt,g.xb,v=>{v.f("uPxMm",A),v.f("uSeed",f.seed),v.t("uD",g.xa.t[0]),v.f("uHair",f.hairs),v.f("uScratch",f.scratch),v.f("uPrint",f.prints),v.f("uSmear",f.smear)});const N=g.xb;d("sol ¼ H",N,b.qtmp,1,0,1.1*A/4),d("sol ¼ V",b.qtmp,g.xs,0,1,1.1*A/4);const X=H>0;if(X){d("ps ¼ H",b.prep,b.qtmp,1,0,Math.max(.3,.12*A/4)),d("ps ¼ V",b.qtmp,g.xq1,0,1,Math.max(.3,.12*A/4)),S("XID",D.xid,g.xq2,y=>{y.t("uPS",g.xq1.t[0]),y.fv("uKey",I,3),y.t("uIdMap",n),y.i("uUseMap",de),y.i("uNk",H),y.f("uSrcPaperL",...x),y.f("uMinL",.32),y.f("uPxMm",A),y.f("uVoteMm",f.colorSmooth)});const v=Math.max(.3,(f.hand===1?.8:f.sloppy)*A/4);d("mask H",g.xq2,b.qtmp,1,0,v),d("mask V",b.qtmp,g.xq1,0,1,v),S("XCOLOR",D.xcolor,g.xc,y=>{y.f("uPxMm",A),y.f("uSeed",f.seed),y.t("uMA",g.xq1.t[0]),y.t("uMB",g.xq1.t[1]),y.fv("uMk",T,3),y.i("uNk",H),y.i("uMed",f.hand),y.fv("uCOff",C,2),y.f("uWobble",f.wobble),y.f("uCover",f.cover),y.f("uStroke",f.stroke),y.f("uAng",f.strokeAng*Math.PI/180),y.f("uOverlap",f.overlap),y.f("uStrength",f.strength),y.f("uSlop",f.slop),y.f("uDry",f.dry),y.f("uFast",f.fast),r===void 0&&(e.texFrom(u(),{filter:o.NEAREST},l),r=null),y.t("uOri",l),y.f("uSheetMm",Z/A,ee/A),y.f("uWobMm",f.wobMm),y.f("uGran",f.gran),y.f("uDryB",f.dryB),y.f("uBloom",f.bloom)})}S("XCOMP",D.xcomp,b.comp,v=>{v.f("uPxMm",A),v.t("uD",N.t[0]),v.t("uSolX",g.xs.t[0]),v.f("uTonerK",f.tonerK),v.t("uC",g.xc.t[0]),v.t("uFib",e.fibTex),v.f("uPaper",...Q),v.f("uHollow",f.hollow),v.f("uBand",f.band),v.f("uPaperTex",f.paperTex),v.f("uFibers",f.fibers),v.f("uHasColor",X?1:0)}),S("SCAN",e.PR.scan,M?b.out:null,v=>{v.f("uSeed",f.seed),v.t("uComp",b.comp.t[0]),v.f("uBlurPx",f.scanBlur),v.f("uNoise",f.scanNoise),v.i("uNorm",0),v.f("uPaper",...Q)})}return{render:P}}function ge(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const Ba=ge(ge(Eo," b+=texture(uTexB,uv+o2)*k;",""),"oA=a/w; oB=b/w;","oA=a/w; oB=vec4(0);"),To=ge(ge(ge(Po,"float ba=eP, bs=length(oklabL(uPaper)-tSL);","float ba=eP, bs=length(oklabL(uPaper)-tSL); vec3 Da=vec3(0);"),"if(pass==0){ if(e<ba){ ba=e; Sa=S; } }","if(pass==0){ if(e<ba){ ba=e; Sa=S; Da=D; } }"),`  ivec3 bS=Sa; vec3 bD=vec3(0);
  if(Ss.x>=0){ vec3 Ds; float es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; } }
  else if(ba>eP-.025) bS=ivec3(-1);
  if(bS.x>=0){ float e=solve(bS,t,tL,bD); }
`,`  ivec3 bS=Sa; vec3 bD=Da;
  if(Ss.x>=0){ vec3 Ds=Da; float es=ba; if(Ss!=Sa) es=solve(Ss,t,tL,Ds); if(es<=ba+.025){ bS=Ss; bD=Ds; } }
  else if(ba>eP-.025) bS=ivec3(-1);
`),oo=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,Lo=ge(Mo,oo,oo+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),ao=1,ro=2,no=4,so=8,Da=ge(To,"for(int it=0;it<5;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;","for(int it=0;it<3;it++) for(int k=0;k<3;k++){ if(S[k]<0) continue;"),_a=ge(Lo,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),Fa=ge(Ao,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),Ca=ge(ge(ge(wo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),Ia=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,io=new Map,lo=(e,o)=>{let a=io.get(e);return a||(a=o(),io.set(e,a)),a};function Na(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const i=ot(e);t.lineCap="round";for(let s=0;s<2600;s++){const l=(.25+i()*i()*1.6)*85,r=i()*Math.PI*2,n=i()*1024,p=i()*1024,m=(i()-.5)*.9,u=(.012+i()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+i()*.55})`,t.lineWidth=u;for(const E of[-1024,0,1024])for(const P of[-1024,0,1024]){const k=n+E,b=p+P;k<-l-10||k>1024+l+10||b<-l-10||b>1024+l+10||(t.beginPath(),t.moveTo(k,b),t.quadraticCurveTo(k+Math.cos(r+m)*l*.5,b+Math.sin(r+m)*l*.5,k+Math.cos(r)*l,b+Math.sin(r)*l),t.stroke())}}return a}function $a(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const i=ot(e);t.lineCap="round",t.globalCompositeOperation="lighter";const s=1024/61;for(let l=0;l<70;l++){const r=i()<.7?"255,0,0":"0,255,0",n=(.4+i()*i()*3.5)*s,p=i()*Math.PI*2,m=i()*1024,u=i()*1024,E=(i()-.5)*1.6,P=(.015+i()*.03)*s;t.strokeStyle=`rgba(${r},${.35+i()*.5})`,t.lineWidth=Math.max(.6,P);for(const k of[-1024,0,1024])for(const b of[-1024,0,1024]){const w=m+k,L=u+b;w<-n||w>1024+n||L<-n||L>1024+n||(t.beginPath(),t.moveTo(w,L),t.bezierCurveTo(w+Math.cos(p+E)*n*.35,L+Math.sin(p+E)*n*.35,w+Math.cos(p-E)*n*.7,L+Math.sin(p-E)*n*.7,w+Math.cos(p)*n,L+Math.sin(p)*n),t.stroke())}}for(let l=0;l<160;l++){t.fillStyle=`rgba(255,0,0,${.2+i()*.6})`;const r=(.02+i()*i()*.12)*s;t.beginPath(),t.arc(i()*1024,i()*1024,Math.max(.5,r),0,7),t.fill()}return a}function Ro(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const i=t.getParameter(t.MAX_TEXTURE_SIZE);function s(x){const S=t.createProgram();for(const[N,X]of[[t.VERTEX_SHADER,ra],[t.FRAGMENT_SHADER,x]]){const v=t.createShader(N);if(t.shaderSource(v,X),t.compileShader(v),!t.getShaderParameter(v,t.COMPILE_STATUS)){const y=t.getShaderInfoLog(v);throw new Error(y??"shader compile error")}t.attachShader(S,v)}if(t.bindAttribLocation(S,0,"p"),t.linkProgram(S),!t.getProgramParameter(S,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(S)??"program link error");const d={},$=t.getProgramParameter(S,t.ACTIVE_UNIFORMS);for(let N=0;N<$;N++){const X=t.getActiveUniform(S,N);d[X.name.replace(/\[0\]$/,"")]=t.getUniformLocation(S,X.name)}return{p:S,u:d}}const l=new Map,r=x=>{let S=l.get(x);return S||(S=s(x),l.set(x,S)),S},n={sep0:s(Po),lut:s(na),prep:s(sa),sep:s(ia),blur:s(Eo),screen:s(wo),spread:s(Mo),compose:s(la),scan:s(Ao)},p=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,p),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function m(x,S,{filter:d=t.LINEAR,wrap:$=t.CLAMP_TO_EDGE}={}){const N=t.createTexture();return t.bindTexture(t.TEXTURE_2D,N),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,x,S,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,d),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,d),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,$),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,$),N}function u(x,{filter:S=t.LINEAR,wrap:d=t.CLAMP_TO_EDGE,mip:$=!1}={},N=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,N),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,x),$&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,$?t.LINEAR_MIPMAP_LINEAR:S),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,S),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,d),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,d),N}function E(x,S,d=1){const $=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,$);const N=[];for(let X=0;X<d;X++){const v=m(x,S);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+X,t.TEXTURE_2D,v,0),N.push(v)}return t.drawBuffers(N.map((X,v)=>t.COLOR_ATTACHMENT0+v)),{f:$,t:N,w:x,h:S}}function P(x){x.t.forEach(S=>t.deleteTexture(S)),t.deleteFramebuffer(x.f)}const k=Sa(t);function b(x,S,d,$){const N=d?d.w:e.width,X=d?d.h:e.height;t.useProgram(S.p),t.bindFramebuffer(t.FRAMEBUFFER,d?d.f:null),t.viewport(0,0,N,X);let v=0;const y=S.u,F={t(W,j){y[W]!=null&&(t.activeTexture(t.TEXTURE0+v),t.bindTexture(t.TEXTURE_2D,j),t.uniform1i(y[W],v),v++)},f(W,...j){const h=y[W];h!=null&&(j.length===1?t.uniform1f(h,j[0]):j.length===2?t.uniform2f(h,j[0],j[1]):j.length===3?t.uniform3f(h,j[0],j[1],j[2]):t.uniform4f(h,j[0],j[1],j[2],j[3]))},i(W,j){y[W]!=null&&t.uniform1i(y[W],j)},fv(W,j,h){const O=y[W];if(O==null)return;const ae=new Float32Array(j);h===1?t.uniform1fv(O,ae):h===2?t.uniform2fv(O,ae):t.uniform3fv(O,ae)},m2(W,j){y[W]!=null&&t.uniformMatrix2fv(y[W],!1,new Float32Array(j))}};F.f("uRes",N,X),$&&$(F);const te=k.mode==="off"?null:k.before(x,{w:N,h:X,att:d?d.t.length:1});t.drawArrays(t.TRIANGLES,0,3),k.mode!=="off"&&k.after(x,te)}const w=u(o.green,{wrap:t.REPEAT}),L={b:u(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:u(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:u(o.exLut)},Y=u(lo("fib11",()=>Na(11)),{wrap:t.REPEAT,mip:!0}),Z=u(lo("inc23",()=>$a(23)),{wrap:t.REPEAT,mip:!0}),ee=x=>{x.t("uExB",L.b),x.t("uExR",L.r),x.t("uExLut",L.lut),x.f("uExBSize",L.bs[0],L.bs[1]),x.f("uExRSize",L.rs[0],L.rs[1]),x.f("uExPxMm",aa)};let M=null;const f=E(1089,33,2);let g="";const D=t.createTexture();let A=0,U=0,H=null,T=0,R=0;function I(x,S){if(x===T&&S===R)return;T=x,R=S,H&&Object.values(H).forEach(P);const d=Math.max(1,x>>2),$=Math.max(1,S>>2);H={prep:E(x,S),sep:E(x,S,2),tmp:E(x,S,2),loc:E(x,S,2),qtmp:E(d,$,2),sol:E(d,$,2),scr:E(x,S,2),cov:E(x,S,2),comp:E(x,S),prepH:E(x,S),prepV:E(x,S),out:E(x,S)},e.width=x,e.height=S}const z=t.getExtension("EXT_disjoint_timer_query_webgl2");let C=null;function de(){if(!z||!C||!t.getQueryParameter(C,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(z.GPU_DISJOINT_EXT)||(Q.gpuMs=t.getQueryParameter(C,t.QUERY_RESULT)/1e6),t.deleteQuery(C),C=null}const Q={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:k,lastVariants:"",setSource(x,S=!0){A=x.width,U=x.height;const d=performance.now();u(x,{},D);const $=performance.now();S&&(t.bindTexture(t.TEXTURE_2D,D),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),Q.lastUploadMs=$-d,Q.lastMipMs=performance.now()-$},invalidateLut(){g=""},present(){if(!H)return;const x=H;b("PRESENT",r(Ia),null,S=>{S.t("uT",x.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(x,S={}){const d=Object.assign({},xa,x),$=S.preview??0,N=!!S.lossless||$!==0,X=(c,ne)=>$&c?"preview":N&&ne?"lossless":"lab";Q.lastVariants=`blurPrep:${N?"lossless":"lab"} sep0:${X(ao,!0)} screen:${X(so,!1)} spread:${X(ro,!0)} scan:${X(no,!1)}`;const v=performance.now();de(),k.mode!=="off"&&k.frameStart();const y=z&&!C&&k.mode!=="timer"?t.createQuery():null;y&&t.beginQuery(z.TIME_ELAPSED_EXT,y);let F=Math.round(d.printW*d.pxmm),te=Math.round(F*U/A);const W=Math.min(i,6144);if(Math.max(F,te)>W){const c=W/Math.max(F,te);F=Math.round(F*c),te=Math.round(te*c)}const j=x.tech==="xerox";j&&(F=Math.max(4,F&-4),te=Math.max(4,te&-4)),I(F,te),Q.width=F,Q.height=te;const h=H;if(j)return M??=Ra({gl:t,compile:s,run:b,target:E,freeTarget:P,texFrom:u,greenTex:w,fibTex:Y,PR:{prep:n.prep,blur:n.blur,scan:n.scan}}),M.render(x,{prep:h.prep,qtmp:h.qtmp,comp:h.comp,out:h.out},D,A,U,F,te,!!S.toTexture),Q.lastVariants="xerox",y&&(t.endQuery(z.TIME_ELAPSED_EXT),C=y),t.flush(),Q.lastMs=performance.now()-v,Q;const O=F/d.printW,ae=Ie(G(d.paper)),_e=Math.min(Ae,d.inks.length),rt=d.inks.concat(Array(Ae).fill("#000000")).slice(0,Ae),nt=d.opac.concat(Array(Ae).fill(.15)).slice(0,Ae),st=[];for(let c=0;c<Ae;c++)st.push(...Ie(G(Ye(rt[c]))));const St=rt.map(c=>K(G(Ye(c)))[0]<.42?0:1),Ho=K(G(d.paper)),Ht=rt.map(c=>Math.min(1.5,da(K(G(Ye(c))),Ho)/.5)),Qt=JSON.stringify([rt,nt,_e,d.paper,d.inkCost,d.pair]);Qt!==g&&(b("LUT",n.lut,f,c=>{c.fv("uCon",Ht,1),c.fv("uInk",st,3),c.fv("uOp",nt,1),c.i("uN",_e),c.f("uPaper",...ae),c.f("uCost",d.inkCost),c.f("uPair",d.pair)}),g=Qt),b("PREP",n.prep,h.prep,c=>{c.t("uSrc",D),c.f("uSrcRes",A,U),c.f("uSmoothPx",d.smooth*A/d.printW),c.f("uSrcPaper",...d.srcPaper),c.f("uPaper",...ae)});const it=ot(d.seed*7919+13),Yt=[],Zt=[];for(let c=0;c<Ae;c++){const ne=(it()*2-1)*d.rot*Math.PI/180,$e=1+(it()*2-1)*d.scl/1e3,lt=Math.cos(ne)*$e,Ve=Math.sin(ne)*$e;Yt.push(lt,Ve,-Ve,lt);const ve=it()*Math.PI*2,eo=d.misreg*Math.sqrt(it());Zt.push(Math.cos(ve)*eo,Math.sin(ve)*eo)}let kt;if(N){const c=r(Ba);b("BLUR prep H",c,h.prepH,ne=>{ne.t("uTexA",h.prep.t[0]),ne.f("uDir",1,0),ne.f("uSig",.3*O)}),b("BLUR prep V",c,h.prepV,ne=>{ne.t("uTexA",h.prepH.t[0]),ne.f("uDir",0,1),ne.f("uSig",.3*O)}),kt=h.prepV.t[0]}else b("BLUR prep H",n.blur,h.loc,c=>{c.t("uTexA",h.prep.t[0]),c.t("uTexB",h.prep.t[0]),c.f("uDir",1,0),c.f("uSig",.3*O)}),b("BLUR prep V",n.blur,h.scr,c=>{c.t("uTexA",h.loc.t[0]),c.t("uTexB",h.loc.t[0]),c.f("uDir",0,1),c.f("uSig",.3*O)}),kt=h.scr.t[0];b("SEP0",$&ao?r(Da):N?r(To):n.sep0,h.tmp,c=>{c.t("uPrepS",kt),c.t("uPrep",h.prep.t[0]),c.t("uSet",f.t[0]),c.fv("uCon",Ht,1),c.fv("uInk",st,3),c.fv("uOp",nt,1),c.i("uN",_e),c.f("uPaper",...ae),c.f("uCost",d.inkCost),c.f("uPair",d.pair),c.f("uMinDot",d.minDot)}),b("WARP",n.sep,h.sep,c=>{c.f("uPxMm",O),c.t("uSA",h.tmp.t[0]),c.t("uSB",h.tmp.t[1]),c.i("uN",_e),c.f("uCtr",d.printW/2,te/O/2),c.m2("uM",Yt),c.fv("uT",Zt,2)});const Jt=(c,ne,$e,lt,Ve)=>{b(`BLUR ${c} H`,n.blur,$e,ve=>{ve.t("uTexA",ne.t[0]),ve.t("uTexB",ne.t[1]),ve.f("uDir",1,0),ve.f("uSig",Ve)}),b(`BLUR ${c} V`,n.blur,lt,ve=>{ve.t("uTexA",$e.t[0]),ve.t("uTexB",$e.t[1]),ve.f("uDir",0,1),ve.f("uSig",Ve)})};return Jt("loc",h.sep,h.tmp,h.loc,.22*O),Jt("sol ¼",h.sep,h.qtmp,h.sol,1.5*O/4),b("SCREEN",$&so?r(Ca):n.screen,h.scr,c=>{ee(c),c.f("uPxMm",O),c.f("uSeed",d.seed),c.t("uSepA",h.sep.t[0]),c.t("uSepB",h.sep.t[1]),c.t("uSolA",h.sol.t[0]),c.t("uSolB",h.sol.t[1]),c.t("uLocA",h.loc.t[0]),c.t("uLocB",h.loc.t[1]),c.t("uGreen",w),c.i("uN",_e),c.i("uMode",+d.screen),c.f("uGrain",d.grain),c.f("uLoad",d.inkLoad),c.f("uLpi",d.lpi),c.f("uMottle",d.mottle),c.f("uStarve",d.starve),c.f("uTexAmp",d.texAmp),c.f("uStreak",d.streak),c.f("uSolidLv",d.solidLv),c.fv("uExSel",St,1),c.f("uTrap",d.trap)}),b("SPREAD",$&ro?r(_a):N?r(Lo):n.spread,h.cov,c=>{ee(c),c.f("uPxMm",O),c.f("uSeed",d.seed),c.t("uScrA",h.scr.t[0]),c.t("uScrB",h.scr.t[1]),c.t("uSepA",h.sep.t[0]),c.t("uSepB",h.sep.t[1]),c.t("uLocA",h.loc.t[0]),c.t("uLocB",h.loc.t[1]),c.i("uN",_e),c.f("uBleedPx",d.bleed*O),c.f("uGain",d.gain),c.f("uEdge",d.edge),c.f("uSolidLv",d.solidLv),c.fv("uExSel",St,1)}),b("COMPOSE",n.compose,h.comp,c=>{ee(c),c.f("uPxMm",O),c.f("uSeed",d.seed),c.t("uCovA",h.cov.t[0]),c.t("uCovB",h.cov.t[1]),c.t("uSolA",h.sol.t[0]),c.t("uSolB",h.sol.t[1]),c.f("uStarve",d.starve),c.t("uFib",Y),c.t("uInc",Z),c.i("uN",_e),c.fv("uInk",st,3),c.fv("uOp",nt,1),c.f("uPaper",...ae),c.f("uPaperTex",d.paperTex),c.f("uFibers",d.fibers),c.f("uIncl",d.incl),c.f("uVoids",d.voids),c.f("uMottle",d.mottle),c.f("uTexAmp",d.texAmp),c.fv("uExSel",St,1)}),b("SCAN",$&no?r(Fa):n.scan,S.toTexture?h.out:null,c=>{c.f("uSeed",d.seed),c.t("uComp",h.comp.t[0]),c.f("uBlurPx",d.scanBlur),c.f("uNoise",d.scanNoise),c.i("uNorm",+d.normWhite),c.f("uPaper",...ae)}),y&&(t.endQuery(z.TIME_ELAPSED_EXT),C=y),t.flush(),Q.lastMs=performance.now()-v,Q}};return Q}const Bo=new URLSearchParams(window.location.search),Xe=Bo.get("srdebug")==="1",oe=Xe?Bo:new URLSearchParams,ja=["srres","srpipe","srhold","srpreview","srprevmask"],B={preserveDrawingBuffer:oe.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(oe.get("srres"))||1)),mip:oe.get("srmip")!=="0",bypass:oe.get("srbypass")==="1",darkPaperFromBase:oe.get("srdarkpaper")==="bg",simUpload:oe.get("srsim")==="1",offscreenBack:oe.get("sroff")==="1",bitmapUpload:oe.get("srbitmap")==="1",pipe:oe.get("srpipe")==="2"?2:oe.get("srpipe")==="1"?1:0,hold:oe.get("srhold")==="1",lossless:oe.get("srlossless")!=="0",preview:oe.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(oe.get("srprevmask"))||0)),auto:!ja.some(e=>oe.has(e)),forceLevel:oe.get("srlevel")==="preview"?"preview":oe.get("srlevel")==="full"?"full":null},Do={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},_={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},De={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},yt=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==B.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==B.offscreenBack;Object.assign(B,e),(o||a)&&De.recreateEngine()},co=5,uo=30,Ua=12,za=300,Dt=new Map;let be=null,ct="";const _o=(e,o)=>`${e}×${o}`;function Oa(e,o){if(B.forceLevel)return Bt(B.forceLevel==="preview"),B.forceLevel;const a=Dt.get(_o(e,o));return a?(Bt(a==="preview"),a):"detect"}function fo(e,o,a,t){const i=_o(e,o);if((!be||be.size!==i)&&(be={size:i,seen:0,samples:[]}),++be.seen>co+3*uo&&!be.samples.length){Dt.set(i,"full"),be=null,ct=`${i}: sin medida (${t}) → full`;return}if(be.seen<=co||a===null||(be.samples.push(a),be.samples.length<uo))return;const s=[...be.samples].sort((n,p)=>n-p),l=s[s.length>>1],r=l>Ua?"preview":"full";Dt.set(i,r),be=null,ct=`${i}: coste p50 ${l.toFixed(1)} ms (${t}) → ${r}`,Bt(r==="preview"),Xe&&console.info(`[SuperRiso] quality level ${ct}`)}const qa=()=>ct;let Ke=null,Pt=null,po=0,Fo="";function Ga(e,o,a){return!!e&&!!Ke&&o===Pt&&e.length===Ke.length&&e.every((i,s)=>i===Ke[s])||(po=a,Fo=o!==Pt?"scene":(e??[]).map((i,s)=>i===Ke?.[s]?"":s).filter(i=>i!=="").join(",")),Ke=e??null,Pt=o,a-po}const Xa=.06,Wa=e=>{if(e.type==="text")return Math.pow(e.fontSize??40,2)*Math.max(1,e.text?.length??1)*.5;let o=1/0,a=1/0,t=-1/0,i=-1/0;for(const s of e.points)s.x<o&&(o=s.x),s.x>t&&(t=s.x),s.y<a&&(a=s.y),s.y>i&&(i=s.y);return Number.isFinite(o)?(t-o)*(i-a)+1:1};function Va(e,o,a,t,i){const s=new Map,l=new Set(o.map(p=>p*-150));for(const p of e){if(p.isEraser||!p.color||p.points.length===0||l.has(p.zIndex))continue;const m=p.color.toLowerCase();s.set(m,(s.get(m)??0)+Wa(p))}const r=K(a),n=[];for(const[p,m]of s){if(!/^#[0-9a-f]{6}$/.test(p))continue;const u=K(G(p));ft(u,r)>=Xa&&n.push({hex:p,L:u,w:m})}for(t&&n.push({hex:t,L:K(G(t)),w:1/0});n.length>i;){let p=0,m=1,u=1/0;for(let k=0;k<n.length;k++)for(let b=k+1;b<n.length;b++){const w=ft(n[k].L,n[b].L);w<u&&(u=w,p=k,m=b)}const[E,P]=n[p].w>=n[m].w?[p,m]:[m,p];n[E].w+=n[P].w,n.splice(P,1)}return n.sort((p,m)=>m.w-p.w)}function Ka(e,o,a,t,i,s){let l;if(a==="cmyk")l=pa.slice();else{const r=Va(e,o,i,s,Math.min(Ae,t));if(a==="own")l=r.map(n=>["",n.hex]);else{const n=fa.filter(m=>m[0]!=="White"),p=new Set;l=[];for(const m of r){const u=ha(n,G(m.hex),p);u&&(p.add(u[0]),l.push(u))}}}return l.length||(l=[["Black","#000000"]]),l.sort((r,n)=>K(G(Ye(n[1])))[0]-K(G(Ye(r[1])))[0]),{inks:l.map(r=>r[1]),names:l.map(r=>r[0]),opac:l.map(r=>va(r[0],r[1])),srcPaper:i}}let je=null;function Co(e,o,a,t,i){const s=`${a.inkSet}|${a.maxInks}|${t.join(",")}|${i}`;if(je&&je.shapes===e&&je.hidden===o&&je.key===s)return je.inks;const l=Ka(e,o,a.inkSet,a.maxInks,t,i);return je={shapes:e,hidden:o,key:s,inks:l},l}const mo=e=>{const o=yo.find(a=>a[0]===e);return{hex:o[1],id:o[0]}},vo=(e,o)=>{const a=(e[0]-o[0])*.6,t=e[1]-o[1],i=e[2]-o[2];return a*a+t*t+i*i};function Ha(e,o,a,t,i){const s=K(t);return Co(o,a,{...e,inkSet:"own",maxInks:8},t,i).inks.filter(l=>{const r=K(G(l));return r[0]>.36&&Math.hypot(r[0]-s[0],r[1]-s[1],r[2]-s[2])>.08}).sort((l,r)=>{const n=K(G(l)),p=K(G(r));return Math.hypot(p[1],p[2])-Math.hypot(n[1],n[2])}).slice(0,6)}function Qa(e,o){const a=e.map(r=>K(G(r))),t=o.map(r=>K(G(r.hex))),i=[];a.forEach((r,n)=>t.forEach((p,m)=>i.push([vo(r,p),n,m]))),i.sort((r,n)=>r[0]-n[0]);const s=a.map(()=>-1),l=t.map(()=>!1);for(const[,r,n]of i)s[r]>=0||l[n]||(s[r]=n,l[n]=!0);return a.forEach((r,n)=>{if(s[n]>=0)return;let p=0,m=1e9;t.forEach((u,E)=>{const P=vo(r,u);P<m&&(m=P,p=E)}),s[n]=p}),{keys:e.slice(),paint:s.map(r=>o[r].hex),unused:l.filter(r=>!r).length}}function Ya(e,o,a,t,i){const s=e.xerox,l=Ha(e,o,a,t,i),r=s.what==="auto"?l.length?"color":"fill":s.what;let n,p=null;if(s.colors==="manual")n=(s.manual.length?s.manual:["#e8202a"]).slice(0,6).map(P=>({hex:P,id:Yo(P)}));else if(!l.length)n=Zo.slice(0,s.n).map(mo);else if(s.colors==="own")n=l.slice(0,s.n).map(P=>({hex:P}));else{const P=new Set;n=[],p=[];for(const k of l){if(n.length>=s.n)break;const b=K(G(k));let w=null,L=1e9;for(const Y of yo){if(P.has(Y[0]))continue;const Z=ft(b,K(G(Y[1])));Z<L&&(L=Z,w=Y)}w&&(P.add(w[0]),n.push({hex:w[1],id:w[0]}),p.push(k))}}n.length||(n=[mo("red")]);let m=n.map(P=>P.hex),u=null,E=0;if(r!=="fill")if(s.colors==="manual"){const P=Qa(l,n);u=P.keys,m=P.paint,E=P.unused}else u=p||m.slice();return{list:n,paint:m,keys:u,what:r,unused:E}}let Ue=null;function Za(e,o,a,t,i){const s=e.xerox,l=JSON.stringify([s.what,s.colors,s.n,s.manual,t,i]);if(Ue&&Ue.shapes===o&&Ue.hidden===a&&Ue.key===l)return Ue.mk;const r=Ya(e,o,a,t,i);return Ue={shapes:o,hidden:a,key:l,mk:r},r}const Io=(e,o,a)=>{const t=a?1024:560,i=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*i)),Math.max(8,Math.round(o*i))]};function Et(e,{keys:o,srcPaper:a,fill:t,nk:i,cover:s,seed:l}){const[r,n]=Io(e.width,e.height,t),p=document.createElement("canvas");p.width=r,p.height=n;const m=p.getContext("2d",{willReadFrequently:!0});m.fillStyle="#fff",m.fillRect(0,0,r,n),m.drawImage(e,0,0,r,n);const u=m.getImageData(0,0,r,n).data,E=K(a),P=new Int8Array(r*n).fill(-1),k=r*n;if(t){const M=new Uint8Array(k);for(let T=0;T<k;T++){const R=K([u[T*4]/255,u[T*4+1]/255,u[T*4+2]/255]);M[T]=E[0]-R[0]>.14?1:0}const f=new Uint8Array(M);for(let T=0;T<n;T++)for(let R=0;R<r;R++){if(!M[T*r+R])continue;const I=T*r+R;R>0&&(f[I-1]=1),R<r-1&&(f[I+1]=1),T>0&&(f[I-r]=1),T<n-1&&(f[I+r]=1)}const g=new Int32Array(k).fill(-1),D=new Int32Array(k),A=ot((l|0)*977+13);let U=0;const H=Math.max(6,k*12e-5);for(let T=0;T<k;T++){if(f[T]||g[T]>=0)continue;let R=0;D[R++]=T,g[T]=U;const I=[];let z=!1;for(;R;){const x=D[--R];I.push(x);const S=x%r,d=x/r|0;(S===0||d===0||S===r-1||d===n-1)&&(z=!0),S>0&&!f[x-1]&&g[x-1]<0&&(g[x-1]=U,D[R++]=x-1),S<r-1&&!f[x+1]&&g[x+1]<0&&(g[x+1]=U,D[R++]=x+1),d>0&&!f[x-r]&&g[x-r]<0&&(g[x-r]=U,D[R++]=x-r),d<n-1&&!f[x+r]&&g[x+r]<0&&(g[x+r]=U,D[R++]=x+r)}U++;const C=A(),de=A();if(I.length<H||z&&I.length>k*.05||C>s)continue;const Q=Math.min(i-1,Math.floor(de*i));for(const x of I)P[x]=Q}for(let T=0;T<3;T++){const R=new Int8Array(P);for(let I=0;I<n;I++)for(let z=0;z<r;z++){const C=I*r+z;if(R[C]>=0||!f[C])continue;const de=z>0&&R[C-1]>=0?R[C-1]:z<r-1&&R[C+1]>=0?R[C+1]:I>0&&R[C-r]>=0?R[C-r]:I<n-1&&R[C+r]>=0?R[C+r]:-1;de>=0&&(P[C]=de)}}}else{const M=o.map(f=>K(G(f)));for(let f=0;f<k;f++){const g=K([u[f*4]/255,u[f*4+1]/255,u[f*4+2]/255]),D=Math.hypot(g[0]-E[0],g[1]-E[1],g[2]-E[2]),A=Math.hypot(g[1],g[2]);if(!(D>.08&&(g[0]>.32||A>.12)))continue;let U=-1,H=1e9;for(let T=0;T<M.length;T++){const R=(M[T][0]-g[0])*.6,I=M[T][1]-g[1],z=M[T][2]-g[2],C=R*R+I*I+z*z;C<H&&(H=C,U=T)}H<.045&&(P[f]=U)}}let b=null;if(t){b=document.createElement("canvas"),b.width=r,b.height=n;const M=b.getContext("2d"),f=M.createImageData(r,n);for(let g=0;g<k;g++)f.data[g*4]=(P[g]+1)*36,f.data[g*4+3]=255;M.putImageData(f,0,0)}const w=new Int32Array(k).fill(-1),L=m.createImageData(r,n),Y=new Int32Array(k);for(let M=0;M<k;M++)L.data[M*4]=255,L.data[M*4+1]=128,L.data[M*4+2]=0,L.data[M*4+3]=255;let Z=0;for(let M=0;M<k;M++){if(P[M]<0||w[M]>=0)continue;const f=P[M];let g=0;Y[g++]=M,w[M]=Z;const D=[];let A=0,U=0,H=0,T=0,R=0,I=0;for(;g;){const h=Y[--g];D.push(h);const O=h%r,ae=h/r|0;A++,U+=O,H+=ae,T+=O*O,R+=ae*ae,I+=O*ae,O>0&&P[h-1]===f&&w[h-1]<0&&(w[h-1]=Z,Y[g++]=h-1),O<r-1&&P[h+1]===f&&w[h+1]<0&&(w[h+1]=Z,Y[g++]=h+1),ae>0&&P[h-r]===f&&w[h-r]<0&&(w[h-r]=Z,Y[g++]=h-r),ae<n-1&&P[h+r]===f&&w[h+r]<0&&(w[h+r]=Z,Y[g++]=h+r)}if(Z++,A<6)continue;const z=U/A,C=H/A,de=T/A-z*z,Q=R/A-C*C,x=I/A-z*C,S=.5*Math.atan2(2*x,de-Q),d=de+Q,$=de*Q-x*x,N=Math.sqrt(Math.max(0,d*d/4-$)),X=d/2+N,v=Math.max(1e-6,d/2-N),y=Math.sqrt(v/X),F=Math.max(0,Math.min(1,(.62-y)/.3)),te=Math.round(127.5+127.5*Math.cos(2*S)),W=Math.round(127.5+127.5*Math.sin(2*S)),j=Math.round(255*F);for(const h of D)L.data[h*4]=te,L.data[h*4+1]=W,L.data[h*4+2]=j}const ee=new Uint8ClampedArray(L.data);for(let M=0;M<2;M++){const f=new Uint8ClampedArray(ee);for(let g=0;g<n;g++)for(let D=0;D<r;D++){const A=g*r+D;if(!(f[A*4+2]>0))for(const[U,H]of[[1,0],[-1,0],[0,1],[0,-1]]){const T=D+U,R=g+H;if(T<0||R<0||T>=r||R>=n)continue;const I=R*r+T;if(f[I*4+2]>0){ee[A*4]=f[I*4],ee[A*4+1]=f[I*4+1],ee[A*4+2]=f[I*4+2];break}}}}return L.data.set(ee),m.putImageData(L,0,0),{ori:p,ids:b}}const No=300;let he=null,_t=0,wt=!1;const ze=document.createElement("canvas"),Ja=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:No}):setTimeout(e,0)},er=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),tr=()=>_t;function or(e,o,a,t,i,s,l){const r=o.what==="fill",n={keys:r?[]:o.keys??o.paint,srcPaper:t,fill:r,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!i)return Et(e,n);const p=JSON.stringify([r,n.keys,n.nk,r?n.cover:0,r?n.seed:0,t]),m=performance.now(),u={motion:s&&[...s],scene:l};if(!he||he.key!==p)return he={key:p,maps:Et(e,n),at:m,sig:u},_t++,he.maps;if(!wt&&m-he.at>=No&&!er(u,he.sig)){const[E,P]=Io(e.width,e.height,r);(ze.width!==E||ze.height!==P)&&(ze.width=E,ze.height=P),ze.getContext("2d").drawImage(e,0,0,E,P),wt=!0,he.at=m,he.sig=u,Ja(()=>{wt=!1,!(!he||he.key!==p)&&(he.maps=Et(ze,n),_t++)})}return he.maps}const ar=2400,rr=240,Je={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function ye(e,o){const a=Je[e];a.push(o),a.length>ar&&a.shift()}function fe(e,o,a){const t=Je[e].slice(-a);if(t.length===0)return null;const i=[...t].sort((s,l)=>s-l);return i[Math.min(i.length-1,Math.floor(o*i.length))]}function Ot(e=rr){const o=Je.interval.slice(-e),a=o.length?o.reduce((t,i)=>t+i,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:fe("interval",.5,e),frameP95:fe("interval",.95,e),totalP50:fe("total",.5,e),totalP95:fe("total",.95,e),flatP50:fe("flat",.5,e),uploadP50:fe("upload",.5,e),uploadP95:fe("upload",.95,e),mipP50:fe("mip",.5,e),renderP50:fe("render",.5,e),backP50:fe("back",.5,e),bitmapWaitP50:fe("bitmapWait",.5,e),gpuP50:fe("gpu",.5,e),gpuP95:fe("gpu",.95,e)}}function $o(){for(const e of Object.keys(Je))Je[e].length=0}let Oe=null,He=null,Le=null,Re=null,Ee=null,jo="",Ft="";function Uo(e){jo=e}function Mt(e){Ft=e,Le&&(Le.textContent=e,Le.style.display=e?"block":"none")}function ho(e){Ee&&(Ee.disabled=e,Ee.style.opacity=e?".5":"1")}const xe=(e,o=1)=>e===null?"–":e.toFixed(o),Ct=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function nr(e){if(!Re)return;Re.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const i=document.createElement("button");i.textContent="Copiar",Ct(i),i.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((l,r)=>setTimeout(()=>r(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const s=document.createElement("button");s.textContent="Cerrar",Ct(s),s.onclick=()=>{Re&&(Re.textContent="")},a.append(i,s,t),Re.append(o,a)}function sr(e){Oe||typeof document>"u"||(Oe=document.createElement("div"),Oe.setAttribute("data-superriso-overlay",""),Object.assign(Oe.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Re=document.createElement("div"),Re.style.pointerEvents="auto",Le=document.createElement("div"),Object.assign(Le.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Ee=document.createElement("button"),Ee.textContent="Medir",Ct(Ee),Ee.style.pointerEvents="auto",Ee.onclick=e,He=document.createElement("div"),Object.assign(He.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),Oe.append(Re,Le,Ee,He),document.body.appendChild(Oe),setInterval(()=>{if(!He)return;const o=Ot();He.textContent=`${jo}
fps ${xe(o.fps)} · frame p50 ${xe(o.frameP50)} p95 ${xe(o.frameP95)} ms
SR p50 ${xe(o.totalP50)} p95 ${xe(o.totalP95)} ms (aplanado ${xe(o.flatP50)} · subida ${xe(o.uploadP50)} · mip ${xe(o.mipP50)} · motor ${xe(o.renderP50)} · vuelta ${xe(o.backP50)})
GPU motor p50 ${xe(o.gpuP50)} p95 ${xe(o.gpuP95)} ms`,Ft&&Le&&(Le.textContent=Ft)},500))}const at=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function zo(e){return e&&at?new OffscreenCanvas(1,1):document.createElement("canvas")}const qt=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,Gt=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},we=Gt(),Oo=Gt();function qe(e,o,a,t,i,s){const{canvas:l,ctx:r}=e;return(l.width!==a||l.height!==t)&&(l.width=a,l.height=t),r.setTransform(1,0,0,1,0,0),r.globalAlpha=1,r.globalCompositeOperation="source-over",r.fillStyle=i,r.fillRect(0,0,a,t),r.globalCompositeOperation=s?"source-over":"multiply",r.imageSmoothingEnabled=!0,r.imageSmoothingQuality="medium",r.drawImage(o,0,0,a,t),r.globalCompositeOperation="source-over",l}let ce=null,At=!1,xo=0;function ir(e,o,a){xo++;const t=xo;let i=null;if(ce&&ce.bmp.width===o&&ce.bmp.height===a?i={bmp:ce.bmp,lag:t-ce.frame}:ce&&ce.bmp.close(),ce=null,!At){At=!0;const s=performance.now();createImageBitmap(e).then(l=>{ye("bitmapWait",performance.now()-s),ce&&ce.bmp.close(),ce={bmp:l,frame:t}}).catch(()=>{}).finally(()=>{At=!1})}return i}function lr(){ce&&ce.bmp.close(),ce=null}function Ce(e,o,a,t,i,s,l){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!l,e.drawImage(o,0,0,a,t,0,0,i,s)}finally{e.restore()}}function pt(e,o,a,t,i,s,l){const r=qt(o)?o.transferToImageBitmap():null;try{Ce(e,r??o,a,t,i,s,l)}finally{r?.close()}}const Te=Gt();let Xt=!1;function Wt(e,o,a){const t=qt(e)?e.transferToImageBitmap():null;try{return(Te.canvas.width!==o||Te.canvas.height!==a)&&(Te.canvas.width=o,Te.canvas.height=a),Te.ctx.globalCompositeOperation="copy",Te.ctx.drawImage(t??e,0,0),Xt=!0,Te.canvas}finally{t?.close()}}const ut=()=>Xt?Te.canvas:null,It=()=>{Xt=!1},mt=()=>({res:1,sim:!1,preview:0,lossless:B.lossless,pipe:0,hold:!1,holdFps:12});function qo(e,o,a){if(!B.auto)return{m:{res:B.resScale,sim:B.simUpload,preview:B.preview,lossless:B.lossless,pipe:B.pipe,hold:B.hold,holdFps:12},level:"manual"};const t=Oa(e,o);return t!=="preview"?{m:mt(),level:t}:a.fullQuality?{m:{...mt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:B.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const cr=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),et={inks:null,params:null};function dt(e,o,a,t){const{settings:i,isDarkMode:s,isPixelArt:l}=a,r=i.technique==="xerox",n=r?La(i.xerox,e*t.res):ba(i,e*t.res),p=Math.round(240*n.pxmm),m=Math.round(p*o/e),u=t.sim?Math.min(e,p):e,E=t.sim?Math.min(o,m):o,P=ea(s,l),k=s&&!B.darkPaperFromBase,b=k?[1,1,1]:G(P),w=r?Za(i,a.shapes,a.hiddenLayers,b,k?P:null):null;w&&a.isLive&&Jo({list:w.list,what:w.what,unused:w.unused});const L=w?{inks:w.paint,names:w.list.map(ee=>ee.id??""),opac:[],srcPaper:b}:Co(a.shapes,a.hiddenLayers,i,b,k?P:null);a.isLive&&(et.inks=L);const Y=[e,o,+s,+l,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+B.mip,+B.offscreenBack,+B.preserveDrawingBuffer,+B.darkPaperFromBase,i.technique,...w?[JSON.stringify(i.xerox),(w.keys??[]).join(","),tr()]:[i.paper,i.screen,i.screenSize,i.imperfection,i.resolution],L.inks.join(",")].join("|"),Z=w?{x:i.xerox,mk:w,isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:n,fw:u,fh:E,base:P,srcPaper:b,inks:L,key:Y,xerox:Z}}function Ge(e){const o=e.xerox;if(!o)return et.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const a=o.x.hand==="none"?null:or((o.isLive?we:Oo).canvas,o.mk,o.x,e.srcPaper,o.isLive,o.motion,o.scene);return et.params={...e.style,markers:o.mk.paint,keys:o.mk.keys,regionMap:a?.ids??null,orientMap:a?.ori??null,srcPaper:e.srcPaper}}const gt=e=>e%9999+1,tt=e=>Math.floor(performance.now()*e/1e3);function vt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):tt(o)}const Be=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let ht=null;const go=()=>{ht?.destroy(),ht=null};function ur(e,o,a,t,i){const s=performance.now(),l=t.exportFrame,r=!l||l.index===0,n=!l||l.index>=l.count-1;try{r&&go();const p=ht??(ht=Ro(document.createElement("canvas"),i,{preserveDrawingBuffer:!0})),m=mt(),u=dt(o,a,t,m),E=qe(Oo,e.canvas,u.fw,u.fh,u.base,t.isDarkMode);return p.setSource(E,!0),p.render({...Ge(u),seed:gt(vt(t))},Be(m)),p.gl.isContextLost()?!1:(pt(e,p.canvas,p.width,p.height,o,a,!!u.style.crisp),Xe&&console.info(`[SuperRiso] export frame ${l?`${l.index+1}/${l.count}`:"single"} ${o}×${a} → sim ${p.width}×${p.height}: ${(performance.now()-s).toFixed(1)} ms · ${p.lastVariants}`),!0)}finally{n&&go()}}const Nt=2e3,Go=8e3,$t=60,bo=8,Fe={...Do,simUpload:!0,auto:!1,lossless:!1},Ze=e=>new Promise(o=>setTimeout(o,e)),Me=(e,o=1)=>e===null?"–":e.toFixed(o);let Tt=!1;function fr(){let o=De.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),i=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),s=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:i,maxTex:s}}function pr(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,s=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,r])=>r!==null).sort((r,n)=>n[1]-r[1])[0],l=[];return s&&s[1]>=3&&l.push(`${s[0]} ${Me(s[1])} ms`),t!==null&&t>=3&&l.push(`fuera de nuestras etapas ${Me(t)} ms`),l.length?l.join(" + "):"sin espera apreciable"}async function So(e){const o=De.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const s=o.report().find(l=>l.name==="SCAN");if(s&&s.n>=$t)break;await Ze(100)}e==="timer"&&(await Ze(300),o.poll());const t=o.report();o.setMode("off");const i=[...t].filter(s=>s.p50!==null).sort((s,l)=>l.p50-s.p50).map(s=>s.name);return{mode:e,lines:t.map(s=>`  ${s.name.padEnd(13)} ${`${s.info.w}×${s.info.h}`.padEnd(10)} att ${s.info.att}  p50 ${Me(s.p50,3).padStart(7)} ms  #${i.indexOf(s.name)+1}  (n=${s.n})`)}}function mr(e,o,a,t,i){const s=fr(),l=e.find(p=>p.id==="A")?.s.frameP50??null,r=De.engineInfo(),n=[];n.push(`SUPER RISO · medición automática C2a · Diorame ${ta} · ${new Date().toISOString()}`),n.push(`UA: ${navigator.userAgent}`),n.push(`DPR ${window.devicePixelRatio} · canvas vivo ${_.canvasW}×${_.canvasH} · simulación (última) ${r?`${r.width}×${r.height}`:"–"}`),n.push(`GPU: ${s.renderer} · MAX_TEXTURE_SIZE ${s.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${at?"sí":"no"}`),n.push(`Modo ${_.isDark?"oscuro":"claro"} · preset de cámara: ${_.preset||"–"} (velocidad ${_.speed||"–"})`),n.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const p of a)n.push(`AVISO: ${p}`);n.push(`Cada fila: ${Nt/1e3} s de calentamiento descartados + ${Go/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),n.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),n.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),n.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),n.push(""),n.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const p of e){const m=p.s,u=P=>Me(P,2).padStart(6),E=!p.patch.bypass&&m.frameP50!==null&&l!==null&&m.totalP50!==null?m.frameP50-l-m.totalP50:null;n.push(`${(p.id+" "+p.label).padEnd(20)}${Me(m.fps).padStart(5)}  ${(Me(m.frameP50)+"/"+Me(m.frameP95)).padEnd(11)} |${u(m.totalP50)}${u(m.flatP50)} ${u(m.uploadP50)}${u(m.uploadP95)}${u(m.mipP50)}${u(m.renderP50)}${u(m.backP50)} |${u(E)}    |${u(m.gpuP50)}  ${p.res.padEnd(10)}  ${p.n.pipe}/${p.n.sync}/${p.n.held}  (n=${m.samples})`)}n.push(""),n.push("Dónde cae la espera:");for(const p of e)p.patch.bypass||n.push(`  ${p.id} ${p.label}: ${pr(p,l)}`);for(const p of i)p&&(n.push(""),n.push(p.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${$t} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${$t} frames, temporizador de GPU por pasada:`),p.mode==="sync"&&n.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),n.push(...p.lines),n.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return n.join(`
`)}async function dr(){if(Tt)return;const e=[],o=performance.now()-_.lastCallAt;if(_.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):_.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Tt=!0,ho(!0);const a={...B},t=[],i=[];let s=!1,l="–",r=0;const n=async p=>{Mt(`Midiendo ${p.id} (${++r}/${bo})…`),yt(p.patch),await Ze(Nt),$o();const m={pipe:_.pipeFrames,sync:_.pipeSyncFrames,held:_.heldFrames};await Ze(Go);const u=Ot(1/0);u.gpuP50!==null&&(s=!0);const E={pipe:_.pipeFrames-m.pipe,sync:_.pipeSyncFrames-m.sync,held:_.heldFrames-m.held},P=De.engineInfo(),k={id:p.id,label:p.label,res:p.patch.bypass||!P?"–":`${P.width}×${P.height}`,s:u,patch:p.patch,n:E};return t.push(k),k};try{await n({id:"A",label:"bypass",patch:{...Do,bypass:!0,auto:!1}});const p=await n({id:"B",label:".75 pipe1",patch:{...Fe,resScale:.75,pipe:1}}),m=await n({id:"C",label:".75 pipe2",patch:{...Fe,resScale:.75,pipe:2}}),u=(m.s.frameP50??1e9)<(p.s.frameP50??1e9)?2:1;l=`pipe${u} (${u===2?"C":"B"}: frame p50 ${Me(u===2?m.s.frameP50:p.s.frameP50)} ms frente a ${Me(u===2?p.s.frameP50:m.s.frameP50)})`,await n({id:"D",label:`.75 pipe${u} lossless`,patch:{...Fe,resScale:.75,pipe:u,lossless:!0}}),await n({id:"E",label:`.75 pipe${u} preview`,patch:{...Fe,resScale:.75,pipe:u,lossless:!0,preview:15}}),await n({id:"F",label:`1.0 pipe${u} preview`,patch:{...Fe,resScale:1,pipe:u,lossless:!0,preview:15}}),await n({id:"G",label:`.75 pipe${u} hold`,patch:{...Fe,resScale:.75,pipe:u,hold:!0}}),Mt(`Midiendo P (${++r}/${bo})… perfilado por pasada`),yt({...Fe,resScale:.75,pipe:1}),await Ze(Nt),i.push(await So("sync")),i.push(await So("timer"))}finally{yt(a),Mt(""),ho(!1),Tt=!1}nr(mr(t,s,e,l,i))}const vr=["greennoise1024","ink_black","ink_red","ink_lut"];let bt=null,xt=!1,jt=!1,V=null,se=zo(B.offscreenBack),ko=B.preserveDrawingBuffer,Lt=0;const Vt=(e,o)=>{xt||(xt=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},hr=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(vr.map(hr)).then(([e,o,a,t])=>{bt={green:e,exBlack:o,exRed:a,exLut:t}}).catch(e=>Vt("textures",e));const Xo=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===se&&(jt=!0,V=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===se&&(jt=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};Xo(se);const Wo=()=>{const e=se;V=null,lr(),re=null,Se=null,J=null,pe=null,Pe=null,ue=null,It(),se=zo(B.offscreenBack),Xo(se),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};De.recreateEngine=Wo;De.engineInfo=()=>V?{gl:V.gl,width:V.width,height:V.height}:null;De.profiler=()=>V?V.profiler:null;const Vo=()=>[`pdb ${B.preserveDrawingBuffer?"on":"off"}`,`mip ${B.mip?"on":"off"}`,B.bitmapUpload?"bitmap":"",B.offscreenBack?at?"offscreen":"offscreen→DOM":"",B.bypass?"BYPASS":""].filter(Boolean).join(" · ");Xe&&(sr(()=>{dr()}),Uo(`SUPER RISO · ${Vo()}`),window.__superRiso={KNOBS:B,snapshot:Ot,reset:$o,live:_,qualityReport:qa,isSuperRisoPreviewDevice:oa,get lastChange(){return Fo},get inks(){return et.inks},get params(){return et.params},get engine(){return V},get disabled(){return xt},get glCanvas(){return se},get flat(){return we.canvas}});function Kt(){return V&&(ko!==B.preserveDrawingBuffer||qt(se)!==(B.offscreenBack&&at))&&Wo(),V||(V=Ro(se,bt,{preserveDrawingBuffer:B.preserveDrawingBuffer}),ko=B.preserveDrawingBuffer),V}let me=0,re=null,Se=null,J=null,pe=null;const q={begin:0,upload:0,mip:0,render:0,backBegin:0};let Pe=null,ue=null;const Ko=()=>xt||jt||!bt||B.bypass;function br(e,o,a){if(!a.isLive||(me++,Se=null,q.begin=0,q.upload=0,q.mip=0,q.render=0,q.backBegin=0,Ko()))return;const{m:t}=qo(e,o,a.settings);if(!t.pipe||pe)return;const i=performance.now();try{const s=dt(e,o,a,t);if(t.pipe===2){xr(s,t,vt(a),i);return}if(!re||re.key!==s.key||re.frame!==me-1){re=null;return}const l=tt(t.holdFps);if(t.hold&&J&&J.key===s.key&&J.tick===l&&ut())return;const r=Kt();r.setSource(we.canvas,B.mip);const n=performance.now();r.render({...re.params,seed:gt(vt(a))},Be(t));const p=performance.now();if(re=null,r.gl.isContextLost())return;Se={key:s.key,frame:me,ew:r.width,eh:r.height,crisp:!!s.style.crisp,tick:l},q.upload=r.lastUploadMs,q.mip=r.lastMipMs,q.render=p-n,q.begin=p-i}catch(s){V=null,Vt("exception in beginSuperRisoFrame",s)}}function xr(e,o,a,t){const i=tt(o.holdFps);if(Pe&&Pe.frame===me-1&&Pe.key===e.key&&V){const n=performance.now();V.present(),Wt(se,Pe.ew,Pe.eh),q.backBegin=performance.now()-n,ue={...Pe,frame:me}}if(Pe=null,!re||re.key!==e.key||re.frame!==me-1){re=null,q.begin=performance.now()-t;return}if(o.hold&&ue&&ue.key===e.key&&ue.tick===i){q.begin=performance.now()-t;return}const s=Kt();s.setSource(we.canvas,B.mip);const l=performance.now();s.render({...re.params,seed:gt(a)},Be(o,!0));const r=performance.now();re=null,!s.gl.isContextLost()&&(Pe={key:e.key,frame:me,tick:i,ew:s.width,eh:s.height,crisp:!!e.style.crisp},q.upload=s.lastUploadMs,q.mip=s.lastMipMs,q.render=r-l,q.begin=r-t)}function Rt(e,o,a,t,i,s,l,r,n){if(t.hold){const p=Wt(se,s,l);J={key:i,tick:n,ew:s,eh:l,crisp:r},Ce(e,p,s,l,o,a,r)}else pt(e,se,s,l,o,a,r)}function Qe(e,o,a,t,i,s=!1){const l=Kt(),r=performance.now(),n=B.bitmapUpload?ir(o,e.fw,e.fh):null,p=performance.now()-r;n?(l.setSource(n.bmp,B.mip),n.bmp.close(),_.bitmapLagFrames=n.lag):l.setSource(o,B.mip);const m=performance.now();return l.render({...a,seed:gt(t)},i),s&&l.profiler.timerAvailable?fo(_.canvasW,_.canvasH,l.gpuMs===null?null:l.gpuMs+performance.now()-r,"GPU"):s&&(l.finish(),fo(_.canvasW,_.canvasH,performance.now()-r,"readback")),q.upload+=l.lastUploadMs+p,q.mip+=l.lastMipMs,q.render+=performance.now()-m,l}function Sr(e,o,a,t){const i=performance.now(),{isDarkMode:s,isLive:l,info:r}=t;if(l&&(Xe&&Lt>0&&ye("interval",i-Lt),Lt=i,_.lastCallAt=i,_.isDark=s,_.canvasW=o,_.canvasH=a,_.preset=r.preset,_.speed=r.speed,_.offscreenFallback=B.offscreenBack&&!at),Ko())return!1;try{if(!l)return ur(e,o,a,t,bt);const{m:n,level:p}=qo(o,a,t.settings),m=vt(t),u=dt(o,a,t,n);_.level=p,J&&(J.key!==u.key||!n.hold)&&(J=null,pe||It());const E=Ga(t.motion,t.scene,i);let P=i,k=i;const b=(M,f=n)=>{if(_.lastPath=M,!Xe)return!0;const g=performance.now();return ye("flat",P-i),ye("upload",q.upload),ye("mip",q.mip),ye("render",q.render),ye("back",q.backBegin+(g-k)),ye("total",q.begin+(g-i)),V&&V.gpuMs!==null&&ye("gpu",V.gpuMs),Uo(`SUPER RISO · ${p} · ${o}×${a} → sim ${V?`${V.width}×${V.height}`:"–"} · src ${u.fw}×${u.fh} · ${cr(f)} · ${Vo()} · ${M}`),!0};if(p==="detect"){const M=qe(we,e.canvas,u.fw,u.fh,u.base,s);P=performance.now();const f=Qe(u,M,Ge(u),m,Be(n),!0);return f.gl.isContextLost()?!1:(k=performance.now(),pt(e,se,f.width,f.height,o,a,!!u.style.crisp),b("detect"))}if(p==="preview"&&E>=za){const M=mt(),f=dt(o,a,t,M);re=null,Se=null,J=null;const g=ut();if(pe&&pe.key===f.key&&pe.tick===m&&g)return k=performance.now(),Ce(e,g,pe.ew,pe.eh,o,a,pe.crisp),_.heldFrames++,b("refined",M);const D=qe(we,e.canvas,f.fw,f.fh,f.base,s);P=performance.now();const A=Qe(f,D,Ge(f),m,Be(M));if(A.gl.isContextLost())return!1;k=performance.now();const U=Wt(se,A.width,A.height);return pe={key:f.key,tick:m,ew:A.width,eh:A.height,crisp:!!f.style.crisp},Ce(e,U,A.width,A.height,o,a,pe.crisp),b("refine",M)}pe&&(pe=null,It());const w=()=>n.hold&&J&&J.key===u.key?ut():null;if(n.pipe===2){const M=qe(we,e.canvas,u.fw,u.fh,u.base,s);P=performance.now();const f=Ge(u);re={key:u.key,frame:me,params:f},k=performance.now();const g=ut();if(ue&&ue.key===u.key&&g&&(ue.frame===me||n.hold))return Ce(e,g,ue.ew,ue.eh,o,a,ue.crisp),ue.frame===me?_.pipeFrames++:_.heldFrames++,b(ue.frame===me?"pipe2":"held");ue=null;const D=Qe(u,M,f,m,Be(n));return D.gl.isContextLost()?!1:(k=performance.now(),pt(e,se,D.width,D.height,o,a,!!u.style.crisp),_.pipeSyncFrames++,b("sync"))}if(n.pipe){const M=qe(we,e.canvas,u.fw,u.fh,u.base,s);P=performance.now();const f=Ge(u);if(re={key:u.key,frame:me,params:f},k=performance.now(),Se&&Se.key===u.key&&Se.frame===me)return Rt(e,o,a,n,u.key,Se.ew,Se.eh,Se.crisp,Se.tick),_.pipeFrames++,b("pipe");const g=w();if(g&&J)return Ce(e,g,J.ew,J.eh,o,a,J.crisp),_.heldFrames++,b("held");const D=Qe(u,M,f,m,Be(n));return D.gl.isContextLost()?!1:(k=performance.now(),Rt(e,o,a,n,u.key,D.width,D.height,!!u.style.crisp,tt(n.holdFps)),_.pipeSyncFrames++,b("sync"))}const L=tt(n.holdFps),Y=w();if(Y&&J&&J.tick===L)return Ce(e,Y,J.ew,J.eh,o,a,J.crisp),_.heldFrames++,b("held");const Z=qe(we,e.canvas,u.fw,u.fh,u.base,s);P=performance.now();const ee=Qe(u,Z,Ge(u),m,Be(n));return ee.gl.isContextLost()?!1:(k=performance.now(),Rt(e,o,a,n,u.key,ee.width,ee.height,!!u.style.crisp,L),b("sync"))}catch(n){return V=null,Vt("exception in applySuperRiso",n),!1}}export{Sr as applySuperRiso,br as beginSuperRisoFrame};
