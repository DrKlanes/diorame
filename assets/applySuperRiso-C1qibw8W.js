const Ge=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,$=`#version 300 es
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
`,Te=`
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
`,De=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,oe=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,Oe=$+De+oe+`
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
}`,Xe=$+`
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
}`,$e=$+De+oe+`
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
}`,qe=$+oe+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,We=$+oe+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,He=$+Te+oe+`
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
}`,Qe=$+Te+oe+`
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
  oA=A; oB=B; }`,Ye=$+Te+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ve=$+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,W=8,Ke={Black:.32,Cornflower:.35,"Light Gray":.4,Gray:.35,Granite:.35,"Metallic Gold":.4,Charcoal:.25,Midnight:.2},Je={"#000000":"#25222a"},Ze=[["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]],j=o=>(o=o.replace("#",""),[0,2,4].map(n=>parseInt(o.substr(n,2),16)/255)),et=o=>o<=.04045?o/12.92:Math.pow((o+.055)/1.055,2.4),tt=o=>o<=.0031308?o*12.92:1.055*Math.pow(o,1/2.4)-.055,ce=o=>o.map(et);function C(o){const[n,a,e]=ce(o),s=Math.cbrt(.4122214708*n+.5363325363*a+.0514459929*e),f=Math.cbrt(.2119034982*n+.6806995451*a+.1073969566*e),i=Math.cbrt(.0883024619*n+.2817188376*a+.6299787005*e);return[.2104542553*s+.793617785*f-.0040720468*i,1.9779984951*s-2.428592205*f+.4505937099*i,.0259040371*s+.7827717662*f-.808675766*i]}const be=(o,n)=>Math.hypot(o[0]-n[0],o[1]-n[1],o[2]-n[2]),pe=(o,n)=>Math.hypot(o[0]-n[0],2*(o[1]-n[1]),2*(o[2]-n[2])),ae=o=>Je[o.toLowerCase()]||o,ot=(o,n)=>Ke[o]??(C(j(n))[0]<.3?.3:.15);function xe(o){let n=o>>>0||1;return()=>(n^=n<<13,n>>>=0,n^=n>>17,n^=n<<5,n>>>=0,n/4294967296)}function rt(o,n=160){const a=o.width,e=o.height,s=Math.min(1,n/Math.max(a,e)),f=Math.max(1,Math.round(a*s)),i=Math.max(1,Math.round(e*s)),l=document.createElement("canvas");l.width=f,l.height=i;const u=l.getContext("2d");u.fillStyle="#fff",u.fillRect(0,0,f,i),u.drawImage(o,0,0,f,i);const d=u.getImageData(0,0,f,i).data,c=[];for(let x=0;x<d.length;x+=4)c.push([d[x]/255,d[x+1]/255,d[x+2]/255]);return c}function nt(o,n){const a=o.map(C);let e=[];const s=xe(5);for(e.push(a[Math.floor(s()*a.length)]);e.length<n;){let u=null,d=-1;for(let c=0;c<200;c++){const x=a[Math.floor(s()*a.length)],h=Math.min(...e.map(R=>be(R,x)));h>d&&(d=h,u=x)}e.push(u)}const f=new Array(a.length).fill(0);let i=[],l=[];for(let u=0;u<18;u++){for(let c=0;c<a.length;c++){let x=0,h=1e9;for(let R=0;R<n;R++){const m=be(a[c],e[R]);m<h&&(h=m,x=R)}f[c]=x}const d=e.map(()=>[0,0,0,0]);for(let c=0;c<a.length;c++){const x=d[f[c]];x[0]+=o[c][0],x[1]+=o[c][1],x[2]+=o[c][2],x[3]++}i=d.map(c=>c[3]?[c[0]/c[3],c[1]/c[3],c[2]/c[3]]:[1,1,1]),l=d.map(c=>c[3]),e=i.map((c,x)=>l[x]?C(c):e[x])}return i.map((u,d)=>({c:u,n:l[d],L:C(u)})).sort((u,d)=>d.n-u.n)}function it(o,n,a){const e=rt(o),s=nt(e,16),f=e.length;let i=s.find(m=>m.L[0]>.82&&Math.hypot(m.L[1],m.L[2])<.05&&m.n/f>.05);if(!i&&a===1){const m=s.filter(S=>S.L[0]>.65&&Math.hypot(S.L[1],S.L[2])<.06&&S.n/f>.02).sort((S,k)=>k.L[0]-S.L[0]);m.length&&(i=m[0])}const l=i?i.c:[1,1,1],u=(m,S)=>{const k=ce(m),L=ce(S),B=[];for(let I=0;I<=1.0001;I+=.1)B.push(C(k.map((G,D)=>tt(G+(L[D]-G)*I))));return B},d=s.filter(m=>m!==i&&m.n/f>.002),c=[];let x=[C(l)];const h=m=>Math.min(...x.map(S=>pe(S,m))),R=.02;for(let m=0;m<n;m++){let S=null,k=0;for(const B of d){if(c.includes(B)||c.some(D=>pe(D.L,B.L)<.09))continue;const I=u(l,B.c).concat(...c.map(D=>u(D.c,B.c)));let G=0;for(const D of s){const K=h(D.L),J=Math.max(0,K-R),se=Math.max(0,Math.min(K,...I.map(ue=>pe(ue,D.L)))-R);G+=D.n*(J-se)}G>k&&(k=G,S=B)}if(!S||k/f<6e-4)break;const L=S;c.push(L),x=x.concat(u(l,L.c),...c.slice(0,-1).map(B=>u(B.c,L.c)))}return{chosen:c,srcPaper:l}}function at(o,n,a){let e=null,s=1e9;const f=C(n);for(const[i,l]of o){if(a.has(i))continue;const u=pe(C(j(l)),f);u<s&&(s=u,e=[i,l])}return e}function ct(o,n,a,e=1){const{chosen:s,srcPaper:f}=it(o,a,e);let i=[];{const l=Ze.filter(d=>d[0]!=="White"),u=new Set;for(const d of s){const c=at(l,d.c,u);c&&(u.add(c[0]),i.push(c))}}return i.length||(i=[["Black","#000000"]]),i=i.slice(0,W).sort((l,u)=>C(j(ae(u[1])))[0]-C(j(ae(l[1])))[0]),{inks:i.map(l=>l[1]),names:i.map(l=>l[0]),opac:i.map(l=>ot(l[0],l[1])),srcPaper:f}}const st={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},we={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},ut={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},_e={clean:{label:"Taller limpio",panel:{inkSet:"own",maxInks:6,paper:"white",screen:"grain",screenSize:.35,imperfection:.2,resolution:.85}},zine:{label:"Fanzine",panel:{inkSet:"dpal",maxInks:4,paper:"recycled",screen:"grain",screenSize:.65,imperfection:.75,resolution:.6}},lofi:{label:"Lo-fi",panel:{inkSet:"own",maxInks:4,paper:"natural",screen:"grain",screenSize:.8,imperfection:.55,resolution:.1}},cmyk:{label:"Cuatricromía",panel:{inkSet:"cmyk",maxInks:4,paper:"white",screen:"dots",screenSize:.45,imperfection:.45,resolution:.7}}},N=(o,n,a)=>o+(n-o)*a;function lt(o,n){const a=Object.assign({},ut,o),e=a.imperfection,s=a.resolution,f=a.screenSize,i=240,l=n*N(.4,1,s)/i;return Object.assign({printW:i,pxmm:l,crisp:s<.5,screen:a.screen==="dots"?1:0,grain:N(.09,.3,f),lpi:Math.round(N(120,45,f)),misreg:.04+1.1*Math.pow(e,1.6),rot:N(.01,.16,e),scl:N(.2,1.6,e),edge:N(.25,1.05,e),voids:N(.05,.45,e),texAmp:N(.6,1.45,e),starve:N(.05,.4,e),mottle:N(.3,1.2,e),bleed:N(.04,.07,e),inkLoad:N(.75,.5,e),scanBlur:N(1,.65,s),scanNoise:N(.6,.35,s)},we[a.paper]||we.natural)}function ft(o){const a=document.createElement("canvas");a.width=a.height=1024;const e=a.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=xe(o);e.lineCap="round";for(let f=0;f<2600;f++){const i=(.25+s()*s()*1.6)*85,l=s()*Math.PI*2,u=s()*1024,d=s()*1024,c=(s()-.5)*.9,x=(.012+s()*.03)*85;e.strokeStyle=`rgba(255,255,255,${.15+s()*.55})`,e.lineWidth=x;for(const h of[-1024,0,1024])for(const R of[-1024,0,1024]){const m=u+h,S=d+R;m<-i-10||m>1024+i+10||S<-i-10||S>1024+i+10||(e.beginPath(),e.moveTo(m,S),e.quadraticCurveTo(m+Math.cos(l+c)*i*.5,S+Math.sin(l+c)*i*.5,m+Math.cos(l)*i,S+Math.sin(l)*i),e.stroke())}}return a}function mt(o){const a=document.createElement("canvas");a.width=a.height=1024;const e=a.getContext("2d");e.fillStyle="#000",e.fillRect(0,0,1024,1024);const s=xe(o);e.lineCap="round",e.globalCompositeOperation="lighter";const f=1024/61;for(let i=0;i<70;i++){const l=s()<.7?"255,0,0":"0,255,0",u=(.4+s()*s()*3.5)*f,d=s()*Math.PI*2,c=s()*1024,x=s()*1024,h=(s()-.5)*1.6,R=(.015+s()*.03)*f;e.strokeStyle=`rgba(${l},${.35+s()*.5})`,e.lineWidth=Math.max(.6,R);for(const m of[-1024,0,1024])for(const S of[-1024,0,1024]){const k=c+m,L=x+S;k<-u||k>1024+u||L<-u||L>1024+u||(e.beginPath(),e.moveTo(k,L),e.bezierCurveTo(k+Math.cos(d+h)*u*.35,L+Math.sin(d+h)*u*.35,k+Math.cos(d-h)*u*.7,L+Math.sin(d-h)*u*.7,k+Math.cos(d)*u,L+Math.sin(d)*u),e.stroke())}}for(let i=0;i<160;i++){e.fillStyle=`rgba(255,0,0,${.2+s()*.6})`;const l=(.02+s()*s()*.12)*f;e.beginPath(),e.arc(s()*1024,s()*1024,Math.max(.5,l),0,7),e.fill()}return a}function pt(o,n,a={}){const e=o.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!e)throw new Error("WebGL2 no disponible");const s=e.getParameter(e.MAX_TEXTURE_SIZE);function f(v){const r=e.createProgram();for(const[g,P]of[[e.VERTEX_SHADER,Ge],[e.FRAGMENT_SHADER,v]]){const T=e.createShader(g);if(e.shaderSource(T,P),e.compileShader(T),!e.getShaderParameter(T,e.COMPILE_STATUS)){const p=e.getShaderInfoLog(T);throw new Error(p??"shader compile error")}e.attachShader(r,T)}if(e.bindAttribLocation(r,0,"p"),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(r)??"program link error");const M={},A=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let g=0;g<A;g++){const P=e.getActiveUniform(r,g);M[P.name.replace(/\[0\]$/,"")]=e.getUniformLocation(r,P.name)}return{p:r,u:M}}const i={sep0:f($e),lut:f(Oe),prep:f(Xe),sep:f(qe),blur:f(We),screen:f(He),spread:f(Qe),compose:f(Ye),scan:f(Ve)},l=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,l),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);function u(v,r,{filter:M=e.LINEAR,wrap:A=e.CLAMP_TO_EDGE}={}){const g=e.createTexture();return e.bindTexture(e.TEXTURE_2D,g),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,v,r,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,M),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,M),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,A),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,A),g}function d(v,{filter:r=e.LINEAR,wrap:M=e.CLAMP_TO_EDGE,mip:A=!1}={},g=e.createTexture()){return e.bindTexture(e.TEXTURE_2D,g),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,v),A&&e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,A?e.LINEAR_MIPMAP_LINEAR:r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,M),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,M),g}function c(v,r,M=1){const A=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,A);const g=[];for(let P=0;P<M;P++){const T=u(v,r);e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+P,e.TEXTURE_2D,T,0),g.push(T)}return e.drawBuffers(g.map((P,T)=>e.COLOR_ATTACHMENT0+T)),{f:A,t:g,w:v,h:r}}function x(v){v.t.forEach(r=>e.deleteTexture(r)),e.deleteFramebuffer(v.f)}function h(v,r,M){const A=r?r.w:o.width,g=r?r.h:o.height;e.useProgram(v.p),e.bindFramebuffer(e.FRAMEBUFFER,r?r.f:null),e.viewport(0,0,A,g);let P=0;const T=v.u,p={t(E,b){T[E]!=null&&(e.activeTexture(e.TEXTURE0+P),e.bindTexture(e.TEXTURE_2D,b),e.uniform1i(T[E],P),P++)},f(E,...b){const y=T[E];y!=null&&(b.length===1?e.uniform1f(y,b[0]):b.length===2?e.uniform2f(y,b[0],b[1]):b.length===3?e.uniform3f(y,b[0],b[1],b[2]):e.uniform4f(y,b[0],b[1],b[2],b[3]))},i(E,b){T[E]!=null&&e.uniform1i(T[E],b)},fv(E,b,y){const O=T[E];if(O==null)return;const q=new Float32Array(b);y===1?e.uniform1fv(O,q):y===2?e.uniform2fv(O,q):e.uniform3fv(O,q)},m2(E,b){T[E]!=null&&e.uniformMatrix2fv(T[E],!1,new Float32Array(b))}};p.f("uRes",A,g),M&&M(p),e.drawArrays(e.TRIANGLES,0,3)}const R=d(n.green,{wrap:e.REPEAT}),m={b:d(n.exBlack,{wrap:e.REPEAT,mip:!0}),bs:[n.exBlack.width,n.exBlack.height],r:d(n.exRed,{wrap:e.REPEAT,mip:!0}),rs:[n.exRed.width,n.exRed.height],lut:d(n.exLut)},S=d(ft(11),{wrap:e.REPEAT,mip:!0}),k=d(mt(23),{wrap:e.REPEAT,mip:!0}),L=v=>{v.t("uExB",m.b),v.t("uExR",m.r),v.t("uExLut",m.lut),v.f("uExBSize",m.bs[0],m.bs[1]),v.f("uExRSize",m.rs[0],m.rs[1]),v.f("uExPxMm",17.2)},B=c(1089,33,2);let I="";const G=e.createTexture();let D=0,K=0,J=null,se=0,ue=0;function Ue(v,r){if(v===se&&r===ue)return;se=v,ue=r,J&&Object.values(J).forEach(x);const M=Math.max(1,v>>2),A=Math.max(1,r>>2);J={prep:c(v,r),sep:c(v,r,2),tmp:c(v,r,2),loc:c(v,r,2),qtmp:c(M,A,2),sol:c(M,A,2),scr:c(v,r,2),cov:c(v,r,2),comp:c(v,r)},o.width=v,o.height=r}const re=e.getExtension("EXT_disjoint_timer_query_webgl2");let Q=null;function ze(){if(!re||!Q||!e.getQueryParameter(Q,e.QUERY_RESULT_AVAILABLE))return;e.getParameter(re.GPU_DISJOINT_EXT)||(Z.gpuMs=e.getQueryParameter(Q,e.QUERY_RESULT)/1e6),e.deleteQuery(Q),Q=null}const Z={canvas:o,gl:e,lastMs:0,width:0,height:0,gpuMs:null,setSource(v,r=!0){D=v.width,K=v.height,d(v,{mip:r},G)},render(v){const r=Object.assign({},st,v),M=performance.now();ze();const A=re&&!Q?e.createQuery():null;A&&e.beginQuery(re.TIME_ELAPSED_EXT,A);let g=Math.round(r.printW*r.pxmm),P=Math.round(g*K/D);const T=Math.min(s,6144);if(Math.max(g,P)>T){const t=T/Math.max(g,P);g=Math.round(g*t),P=Math.round(P*t)}Ue(g,P),Z.width=g,Z.height=P;const p=J,E=g/r.printW,b=ce(j(r.paper)),y=Math.min(W,r.inks.length),O=r.inks.concat(Array(W).fill("#000000")).slice(0,W),q=r.opac.concat(Array(W).fill(.15)).slice(0,W),le=[];for(let t=0;t<W;t++)le.push(...ce(j(ae(O[t]))));const he=O.map(t=>C(j(ae(t)))[0]<.42?0:1),je=C(j(r.paper)),Pe=O.map(t=>Math.min(1.5,be(C(j(ae(t))),je)/.5)),ke=JSON.stringify([O,q,y,r.paper,r.inkCost,r.pair]);ke!==I&&(h(i.lut,B,t=>{t.fv("uCon",Pe,1),t.fv("uInk",le,3),t.fv("uOp",q,1),t.i("uN",y),t.f("uPaper",...b),t.f("uCost",r.inkCost),t.f("uPair",r.pair)}),I=ke),h(i.prep,p.prep,t=>{t.t("uSrc",G),t.f("uSrcRes",D,K),t.f("uSmoothPx",r.smooth*D/r.printW),t.f("uSrcPaper",...r.srcPaper),t.f("uPaper",...b)});const fe=xe(r.seed*7919+13),Le=[],Re=[];for(let t=0;t<W;t++){const ee=(fe()*2-1)*r.rot*Math.PI/180,me=1+(fe()*2-1)*r.scl/1e3,ne=Math.cos(ee)*me,F=Math.sin(ee)*me;Le.push(ne,F,-F,ne);const Be=fe()*Math.PI*2,ye=r.misreg*Math.sqrt(fe());Re.push(Math.cos(Be)*ye,Math.sin(Be)*ye)}h(i.blur,p.loc,t=>{t.t("uTexA",p.prep.t[0]),t.t("uTexB",p.prep.t[0]),t.f("uDir",1,0),t.f("uSig",.3*E)}),h(i.blur,p.scr,t=>{t.t("uTexA",p.loc.t[0]),t.t("uTexB",p.loc.t[0]),t.f("uDir",0,1),t.f("uSig",.3*E)}),h(i.sep0,p.tmp,t=>{t.t("uPrepS",p.scr.t[0]),t.t("uPrep",p.prep.t[0]),t.t("uSet",B.t[0]),t.fv("uCon",Pe,1),t.fv("uInk",le,3),t.fv("uOp",q,1),t.i("uN",y),t.f("uPaper",...b),t.f("uCost",r.inkCost),t.f("uPair",r.pair),t.f("uMinDot",r.minDot)}),h(i.sep,p.sep,t=>{t.f("uPxMm",E),t.t("uSA",p.tmp.t[0]),t.t("uSB",p.tmp.t[1]),t.i("uN",y),t.f("uCtr",r.printW/2,P/E/2),t.m2("uM",Le),t.fv("uT",Re,2)});const Me=(t,ee,me,ne)=>{h(i.blur,ee,F=>{F.t("uTexA",t.t[0]),F.t("uTexB",t.t[1]),F.f("uDir",1,0),F.f("uSig",ne)}),h(i.blur,me,F=>{F.t("uTexA",ee.t[0]),F.t("uTexB",ee.t[1]),F.f("uDir",0,1),F.f("uSig",ne)})};return Me(p.sep,p.tmp,p.loc,.22*E),Me(p.sep,p.qtmp,p.sol,1.5*E/4),h(i.screen,p.scr,t=>{L(t),t.f("uPxMm",E),t.f("uSeed",r.seed),t.t("uSepA",p.sep.t[0]),t.t("uSepB",p.sep.t[1]),t.t("uSolA",p.sol.t[0]),t.t("uSolB",p.sol.t[1]),t.t("uLocA",p.loc.t[0]),t.t("uLocB",p.loc.t[1]),t.t("uGreen",R),t.i("uN",y),t.i("uMode",+r.screen),t.f("uGrain",r.grain),t.f("uLoad",r.inkLoad),t.f("uLpi",r.lpi),t.f("uMottle",r.mottle),t.f("uStarve",r.starve),t.f("uTexAmp",r.texAmp),t.f("uStreak",r.streak),t.f("uSolidLv",r.solidLv),t.fv("uExSel",he,1),t.f("uTrap",r.trap)}),h(i.spread,p.cov,t=>{L(t),t.f("uPxMm",E),t.f("uSeed",r.seed),t.t("uScrA",p.scr.t[0]),t.t("uScrB",p.scr.t[1]),t.t("uSepA",p.sep.t[0]),t.t("uSepB",p.sep.t[1]),t.t("uLocA",p.loc.t[0]),t.t("uLocB",p.loc.t[1]),t.i("uN",y),t.f("uBleedPx",r.bleed*E),t.f("uGain",r.gain),t.f("uEdge",r.edge),t.f("uSolidLv",r.solidLv),t.fv("uExSel",he,1)}),h(i.compose,p.comp,t=>{L(t),t.f("uPxMm",E),t.f("uSeed",r.seed),t.t("uCovA",p.cov.t[0]),t.t("uCovB",p.cov.t[1]),t.t("uSolA",p.sol.t[0]),t.t("uSolB",p.sol.t[1]),t.f("uStarve",r.starve),t.t("uFib",S),t.t("uInc",k),t.i("uN",y),t.fv("uInk",le,3),t.fv("uOp",q,1),t.f("uPaper",...b),t.f("uPaperTex",r.paperTex),t.f("uFibers",r.fibers),t.f("uIncl",r.incl),t.f("uVoids",r.voids),t.f("uMottle",r.mottle),t.f("uTexAmp",r.texAmp),t.fv("uExSel",he,1)}),h(i.scan,null,t=>{t.f("uSeed",r.seed),t.t("uComp",p.comp.t[0]),t.f("uBlurPx",r.scanBlur),t.f("uNoise",r.scanNoise),t.i("uNorm",+r.normWhite),t.f("uPaper",...b)}),A&&(e.endQuery(re.TIME_ELAPSED_EXT),Q=A),e.flush(),Z.lastMs=performance.now()-M,Z}};return Z}const dt=240,H={interval:[],total:[],flat:[],render:[],back:[],gpu:[]};function te(o,n){const a=H[o];a.push(n),a.length>dt&&a.shift()}function X(o,n){const a=H[o];if(a.length===0)return null;const e=[...a].sort((s,f)=>s-f);return e[Math.min(e.length-1,Math.floor(n*e.length))]}function Ne(){const o=X("interval",.5),n=H.interval.length?H.interval.reduce((a,e)=>a+e,0)/H.interval.length:null;return{samples:H.interval.length,fps:n?1e3/n:null,frameP50:o,frameP95:X("interval",.95),totalP50:X("total",.5),totalP95:X("total",.95),flatP50:X("flat",.5),renderP50:X("render",.5),backP50:X("back",.5),gpuP50:X("gpu",.5),gpuP95:X("gpu",.95)}}function vt(){for(const o of Object.keys(H))H[o].length=0}let Y=null,Ce="";function Fe(o){Ce=o}const U=(o,n=1)=>o===null?"–":o.toFixed(n);function xt(){Y||typeof document>"u"||(Y=document.createElement("div"),Y.setAttribute("data-superriso-overlay",""),Object.assign(Y.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),document.body.appendChild(Y),setInterval(()=>{if(!Y)return;const o=Ne();Y.textContent=`${Ce}
fps ${U(o.fps)} · frame p50 ${U(o.frameP50)} p95 ${U(o.frameP95)} ms
SR p50 ${U(o.totalP50)} p95 ${U(o.totalP95)} ms (aplanado+subida ${U(o.flatP50)} · motor ${U(o.renderP50)} · vuelta ${U(o.backP50)})
GPU motor p50 ${U(o.gpuP50)} p95 ${U(o.gpuP95)} ms`},500))}const ie=new URLSearchParams(window.location.search),_={preserveDrawingBuffer:ie.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(ie.get("srres"))||1)),mip:ie.get("srmip")!=="0",bypass:ie.get("srbypass")==="1",darkPaperFromBase:ie.get("srdarkpaper")==="bg"},ht=(o,n)=>o?n?"#000000":"#050505":n?"#ffffff":"#f8f9fa",gt=["greennoise1024","ink_black","ink_red","ink_lut"];let Se=null,de=!1,Ae=!1,w=null;const ve=document.createElement("canvas"),V=document.createElement("canvas"),z=V.getContext("2d"),Ee=new Map;let ge=0;const Ie=(o,n)=>{de||(de=!0,console.warn(`[SuperRiso] disabled for this session: ${o}`,n??""))},bt=o=>new Promise((n,a)=>{const e=new Image;e.onload=()=>n(e),e.onerror=()=>a(new Error(`texture ${o} failed to load`)),e.src=`/textures/superRiso/${o}.png`});Promise.all(gt.map(bt)).then(([o,n,a,e])=>{Se={green:o,exBlack:n,exRed:a,exLut:e}}).catch(o=>Ie("textures",o));ve.addEventListener("webglcontextlost",o=>{o.preventDefault(),Ae=!0,w=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso")});ve.addEventListener("webglcontextrestored",()=>{Ae=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated")});xt();Fe(`SUPER RISO spike · pdb ${_.preserveDrawingBuffer?"on":"off"} · res ${_.resScale} · mip ${_.mip?"on":"off"}${_.bypass?" · BYPASS":""}`);window.__superRiso={KNOBS:_,snapshot:Ne,reset:vt,inksByTheme:Ee,get engine(){return w},get disabled(){return de}};function St(o,n,a,e,s,f,i){const l=performance.now();if(i&&(ge>0&&te("interval",l-ge),ge=l),de||Ae||!Se||_.bypass)return!1;try{w||(w=pt(ve,Se,{preserveDrawingBuffer:_.preserveDrawingBuffer}));const u=lt(_e.clean.panel,n*_.resScale),d=Math.round(240*u.pxmm),c=Math.round(d*a/n),x=_.mip?n:Math.min(n,d),h=_.mip?a:Math.min(a,c);(V.width!==x||V.height!==h)&&(V.width=x,V.height=h);const R=ht(e,s);z.setTransform(1,0,0,1,0,0),z.globalAlpha=1,z.globalCompositeOperation="source-over",z.fillStyle=R,z.fillRect(0,0,x,h),z.globalCompositeOperation=e?"source-over":"multiply",z.imageSmoothingEnabled=!0,z.imageSmoothingQuality="medium",z.drawImage(o.canvas,0,0,x,h),z.globalCompositeOperation="source-over";let m=Ee.get(e);if(!m){const I=performance.now();m=ct(V,"dpal",_e.clean.panel.maxInks??6,1),Ee.set(e,m),console.info(`[SuperRiso] inks (${e?"dark":"light"}) picked in ${(performance.now()-I).toFixed(1)} ms:`,m.names.join(", "))}const S=e&&!_.darkPaperFromBase?[1,1,1]:j(R);w.setSource(V,_.mip);const k=performance.now();w.render({...u,inks:m.inks,names:m.names,opac:m.opac,srcPaper:S,seed:f%9999+1});const L=performance.now();if(w.gl.isContextLost())return!1;o.save(),o.setTransform(1,0,0,1,0,0),o.globalAlpha=1,o.globalCompositeOperation="copy",o.imageSmoothingEnabled=!u.crisp,o.drawImage(ve,0,0,w.width,w.height,0,0,n,a),o.restore();const B=performance.now();return i?(te("flat",k-l),te("render",L-k),te("back",B-L),te("total",B-l),w.gpuMs!==null&&te("gpu",w.gpuMs),Fe(`SUPER RISO spike · ${n}×${a} → sim ${w.width}×${w.height} · pdb ${_.preserveDrawingBuffer?"on":"off"} · res ${_.resScale} · mip ${_.mip?"on":"off"}`)):console.info(`[SuperRiso] export frame ${n}×${a} → sim ${w.width}×${w.height}: ${(B-l).toFixed(1)} ms`),!0}catch(u){return w=null,Ie("exception in applySuperRiso",u),!1}}export{St as applySuperRiso};
