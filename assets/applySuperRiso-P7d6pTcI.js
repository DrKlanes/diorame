import{X as bn,l as Ce,h as ue,r as Je,S as kn,o as xe,M as ot,p as Ao,s as Zt,x as yn,b as Mn,c as Eo,d as Sn,e as wn,f as Pn,i as An,j as En,A as Tn,k as Ln}from"./index-DOOaYtQT.js";const Rn=17.2,Bn=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,$e=`#version 300 es
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
`,po=`
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
`,Vo=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ve=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,et=$e+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Dn=$e+Ve+`
uniform vec3 uInk[8]; uniform int uN; uniform vec3 uPaper; uniform float uMu;
void main(){
  ivec2 f=ivec2(gl_FragCoord.xy); int Z=f.x/33, X=f.x-Z*33, Y=f.y;
  vec3 t=s2l(vec3(float(X),float(Y),float(Z))/32.);
  float H[8]; for(int i=0;i<8;i++) H[i]=0.;
    // Mínimos cuadrados en densidad óptica con regularización L2 «consciente del tono»: cada tinta paga menos cuanto más
    // paralela es su densidad a la del color buscado (un gris lo imprimen el gris y el negro; un rojo, el rojo). Es estrictamente
    // convexo → solución ÚNICA y CONTINUA en el color (sin umbrales L1 que se coman las luces ni saltos entre tintas).
    vec3 P=max(uPaper,vec3(.05)); vec3 b=-log(clamp(t/P,.003,1.)); vec3 Wc=vec3(.9,1.5,.6);
    float bn=sqrt(dot(Wc*b,b))+1e-4;
    vec3 a[8]; float lam[8];
    for(int i=0;i<8;i++){ a[i]= i<uN ? -log(clamp(uInk[i]/P,.003,1.)) : vec3(0.);
      float an=sqrt(dot(Wc*a[i],a[i]))+1e-4; float c=clamp(dot(Wc*a[i],b)/(an*bn),0.,1.);
      lam[i]=dot(Wc*a[i],a[i])*(uMu*.02+ .9*pow(1.-c,1.5)) ; }
    float D[8]; for(int i=0;i<8;i++) D[i]=0.;
    vec3 r=b;
    for(int it=0;it<80;it++){ for(int k=0;k<8;k++){ if(k<uN){
      float n2=dot(Wc*a[k],a[k]); vec3 rk=r+D[k]*a[k];
      float nd=clamp(dot(Wc*a[k],rk)/(n2+lam[k]+1e-6),0.,1.); r=rk-nd*a[k]; D[k]=nd; } } }
    float YP=dot(P,vec3(.2126,.7152,.0722));
    for(int i=0;i<8;i++){ if(i<uN){ float Yi=clamp(dot(uInk[i],vec3(.2126,.7152,.0722))/YP,.001,.999); H[i]=clamp((1.-pow(Yi,D[i]))/(1.-Yi),0.,1.); } }
  vec4 A=vec4(0),B=vec4(0); for(int i=0;i<8;i++){ if(i<uN) put(A,B,i,H[i]); }
  oA=A; oB=B; }`,Fn=$e+`
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
}`,Cn=$e+Ve+`
uniform sampler2D uPrep, uSetA, uSetB; uniform int uN; uniform float uMinDot;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 c=clamp(texture(uPrep,uv).rgb,0.,1.)*32.;
  float z0=min(floor(c.b),31.), fz=c.b-z0;
  vec2 q0=vec2(z0*33.+c.r+.5, c.g+.5)/vec2(1089.,33.), q1=vec2((z0+1.)*33.+c.r+.5, c.g+.5)/vec2(1089.,33.);
  vec4 A=mix(texture(uSetA,q0),texture(uSetA,q1),fz), B=mix(texture(uSetB,q0),texture(uSetB,q1),fz);
  // tonos muy bajos: la trama no sujeta el punto y se pierden, pero sin escalón
  A*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),A); B*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),B);
  oA=A; oB=B;
}`,_n=$e+Ve+`
uniform sampler2D uRawA, uRawB, uWA, uWB; uniform int uN; uniform float uFill;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 rA=texture(uRawA,uv), rB=texture(uRawB,uv), wA=texture(uWA,uv), wB=texture(uWB,uv);
  vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i<uN){
    float d=pick(rA,rB,i), W=pick(wA,wB,i), cov=0., Wc=0.;
    for(int j=0;j<8;j++){ if(j>i && j<uN){ cov+=pick(rA,rB,j); Wc+=pick(wA,wB,j); } }   // tintas que imprimen después (más oscuras)
    float rho=min(1., W/max(.25, 1.-min(Wc,.95)));                                  // densidad de esta tinta alrededor, sin contar los huecos
    // solo bajo tinta oscura SÓLIDA (bordes de formas): en zonas de tono la sobreimpresión ya la decide la separación y rellenar
    // allí oscurecía y manchaba los degradados
    float sol=0.; for(int j=0;j<8;j++){ if(j>i && j<uN) sol=max(sol, pick(rA,rB,j)); }
    float f=min(rho,1.)*smoothstep(.85,.97,sol)*smoothstep(.035,.13,W)*uFill;                      // trap fino en bordes; trazos finos, relleno completo
    put(A,B,i,max(d,f)); } }
  oA=A; oB=B; }`,Nn=$e+Ve+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,In=$e+Ve+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,Yo=$e+po+Ve+`
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
    d=mix(d,1.,smoothstep(max(uSolidLv,.93),.99,d)*(grad?.3:1.));   // casi lleno → se cierra hacia sólido de forma continua (sin escalón)
    if(d>=.995){ put(A,B,i,1.); continue; }
    float s=uSeed*7.31+float(i)*19.17;
    float t=exT(mm,s,uExSel[i]);
    float x=d*(1.+uTexAmp*(t-1.))*(1.+uMottle*.05*(vnoise(mm/28.+s)-.5)*2.);
    x+=uStreak*.05*(vnoise(vec2(mm.x/.35, mm.y/30.)+s*2.3)-.5)*2.;
    float g= uMode==0 ? fmDots(mm,x,s) : amDots(mm,x,s,ang[i]);
    // codifico en un solo valor: zona de línea → d (se umbraliza en SPREAD); zona de tono → puntos ya dibujados
    put(A,B,i, mix(d, g, tone)); }
  oA=A; oB=B;
}`,Qo=$e+po+Ve+`
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
  oA=A; oB=B; }`,jn=$e+po+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ho=$e+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,$n={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,fill:1,single:.035,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},To={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},qn={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},Pe=(e,o,n)=>e+(o-e)*n;function mo(e,o){return{printW:240,pxmm:o*Pe(.4,1,e)/240,crisp:e<.5,scanBlur:Pe(1,.65,e),scanNoise:Pe(.6,.35,e)}}function Un(e,o){const n=Object.assign({},qn,e),t=n.imperfection,a=n.resolution,s=n.screenSize;return Object.assign({...mo(a,o),screen:n.screen==="dots"?1:0,grain:Pe(.09,.3,s),lpi:Math.round(Pe(120,45,s)),misreg:.04+.6*Math.pow(t,1.6),rot:Pe(.01,.1,t),scl:Pe(.2,1.2,t),edge:Pe(.2,.65,t),voids:Pe(.05,.4,t),texAmp:Pe(.5,1.05,t),starve:Pe(.05,.4,t),mottle:Pe(.3,1.2,t),bleed:Pe(.04,.07,t),inkLoad:Pe(.75,.5,t)},To[n.paper]||To.natural)}function zn(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let n="off";const t=new Map,a=new Map,s=[],f=[];let c=0;const r=new Uint8Array(4),d=(i,l)=>{let x=t.get(i);x||(x=[],t.set(i,x)),x.push(l)};return{get mode(){return n},timerAvailable:!!o,setMode(i){n=i==="timer"&&!o?"off":i,t.clear(),a.clear(),s.length=0},frameStart(){n==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),c=performance.now()),n==="timer"&&this.poll()},before(i,l){if(a.has(i)||(a.set(i,l),s.push(i)),n!=="timer"||!o)return null;const x=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,x),x},after(i,l){if(n==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const x=performance.now();d(i,x-c),c=x}else l&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),f.push({name:i,q:l}))},poll(){if(o)for(;f.length&&e.getQueryParameter(f[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:i,q:l}=f.shift();e.getParameter(o.GPU_DISJOINT_EXT)||d(i,e.getQueryParameter(l,e.QUERY_RESULT)/1e6),e.deleteQuery(l)}},report(){return s.map(i=>{const l=[...t.get(i)??[]].sort((x,R)=>x-R);return{name:i,p50:l.length?l[Math.floor(l.length/2)]:null,n:l.length,info:a.get(i)}})}}}const On=et+`
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
  o=vec4(d,0.,0.,1.); }`,Wn=et+`
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
  o=vec4(on,0.,0.,1.); }`,Gn=et+Vo+Ve+`
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
  oA=A; oB=B; }`,Xn=et+`
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
  o=vec4(T,1.); }`,Kn=et+`
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,Vn=et+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Yn={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},Se=(e,o,n)=>e+(o-e)*n;function Qn(e){const o=e.dirt,n=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:bn[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:Se(.1,1,o),scratch:Se(0,.7,o),prints:Se(0,.45,o),smear:Se(0,.5,o),slop:n,dry:.5,fast:.35,wobMm:Se(.3,1.2,n),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:Se(.05,1,o),fog:Se(.05,1,o),streak:Se(0,.8,o),band:Se(.1,.8,o),hollow:Se(.2,.7,o),grain:Se(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:Se(.1,2.2,n),sloppy:Se(.25,1.2,n),wobble:Se(.2,.9,n),cover:Se(1,.75,n),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function Hn(e,o,n){return{...mo(n,o),...Object.assign(Qn(e),e.fine),tech:"xerox"}}function Zn(e){const{gl:o}=e;let n=null,t=null,a=0,s=0;const f=o.createTexture();let c;const r=o.createTexture();let d,i=null;const l=()=>{if(!i){i=document.createElement("canvas"),i.width=i.height=1;const g=i.getContext("2d");g.fillStyle="rgb(255,128,0)",g.fillRect(0,0,1,1)}return i};function x(g,v){if(n||(n={xlum:e.compile(On),xgen:e.compile(Wn),xid:e.compile(Gn),xcolor:e.compile(Xn),xcomp:e.compile(Vn),xdirt:e.compile(Kn)}),t&&g===a&&v===s)return;t&&Object.values(t).forEach(e.freeTarget),a=g,s=v;const L=Math.max(1,g>>2),B=Math.max(1,v>>2);t={xa:e.target(g,v),xb:e.target(g,v),xc:e.target(g,v),xq1:e.target(L,B,2),xq2:e.target(L,B,2),xs:e.target(L,B)}}function R(g,v,L,B,U,J,H,k){x(J,H);const u=Object.assign({},Yn,g),m=t,P=n,C=J/u.printW,O=(u.markers||[]).slice(0,6),Z=u.hand>0?O.length:0,_=[];for(let b=0;b<6;b++)_.push(...Ce(ue(O[b]||"#ffffff")));const q=(u.keys&&u.keys.length?u.keys:O).slice(0,6),N=[];for(let b=0;b<6;b++)N.push(...Ce(ue(q[b]||O[b]||"#ffffff")));u.regionMap&&u.regionMap!==d&&(e.texFrom(u.regionMap,{filter:o.NEAREST},r),d=u.regionMap),!u.regionMap&&d!==null&&(e.texFrom(l(),{filter:o.NEAREST},r),d=null);const oe=Je(u.seed*4241+7),K=[];for(let b=0;b<6;b++){const E=oe()*Math.PI*2,y=u.offset*(.35+.65*oe());K.push(Math.cos(E)*y,Math.sin(E)*y)}u.orientMap&&u.orientMap!==c&&(e.texFrom(u.orientMap,{filter:o.NEAREST},f),c=u.orientMap),!u.orientMap&&c!==null&&(e.texFrom(l(),{filter:o.NEAREST},f),c=null);const ne=u.regionMap?1:0,ge=Ce(ue(u.paper)),I=Ce(u.srcPaper||[1,1,1]),A=(b,E,y,F)=>e.run(b,E,y,$=>{$.f("uOff",0,0),$.f("uImg",J,H),F($)});A("PREP",e.PR.prep,v.prep,b=>{b.t("uSrc",L),b.f("uSrcRes",B,U),b.f("uSmoothPx",u.smooth*B/u.printW),b.f("uSrcPaper",...u.srcPaper||[1,1,1]),b.f("uPaper",1,1,1)}),A("XLUM",P.xlum,m.xa,b=>{b.f("uPxMm",C),b.t("uPrep",v.prep.t[0]),b.f("uDark",u.dark),b.f("uSoft",u.soft),b.f("uMotion",u.motion),b.f("uPhoto",u.photo),b.f("uLpi",u.lpi),b.f("uLid",u.lid)});const T=(b,E,y,F,$,D)=>A(`BLUR ${b}`,e.PR.blur,y,S=>{S.t("uTexA",E.t[0]),S.t("uTexB",E.t[E.t.length>1?1:0]),S.f("uDir",F,$),S.f("uSig",D)}),w=Math.max(1,Math.round(u.gens));for(let b=1;b<=w;b++){const E=Math.max(.05,u.genSpread*C*(b===1?.6:1));T(`gen${b} H`,m.xa,m.xb,1,0,E),T(`gen${b} V`,m.xb,m.xc,0,1,E),A(`XGEN ${b}`,P.xgen,m.xa,y=>{y.f("uPxMm",C),y.f("uSeed",u.seed),y.t("uD",m.xc.t[0]),y.t("uGreen",e.greenTex),y.f("uThr",u.thr),y.f("uGrain",u.grain),y.f("uDust",u.dust),y.f("uFog",u.fog),y.f("uStreak",u.streak),y.f("uGen",b)})}A("XDIRT",P.xdirt,m.xb,b=>{b.f("uPxMm",C),b.f("uSeed",u.seed),b.t("uD",m.xa.t[0]),b.f("uHair",u.hairs),b.f("uScratch",u.scratch),b.f("uPrint",u.prints),b.f("uSmear",u.smear)});const V=m.xb;T("sol ¼ H",V,v.qtmp,1,0,1.1*C/4),T("sol ¼ V",v.qtmp,m.xs,0,1,1.1*C/4);const X=Z>0;if(X){T("ps ¼ H",v.prep,v.qtmp,1,0,Math.max(.3,.12*C/4)),T("ps ¼ V",v.qtmp,m.xq1,0,1,Math.max(.3,.12*C/4)),A("XID",P.xid,m.xq2,E=>{E.t("uPS",m.xq1.t[0]),E.fv("uKey",N,3),E.t("uIdMap",r),E.i("uUseMap",ne),E.i("uNk",Z),E.f("uSrcPaperL",...I),E.f("uMinL",.32),E.f("uPxMm",C),E.f("uVoteMm",u.colorSmooth)});const b=u.hand===1?Math.max(1.5,.8*C/4):Math.max(.3,u.sloppy*C/4);T("mask H",m.xq2,v.qtmp,1,0,b),T("mask V",v.qtmp,m.xq1,0,1,b),A("XCOLOR",P.xcolor,m.xc,E=>{E.f("uPxMm",C),E.f("uSeed",u.seed),E.t("uMA",m.xq1.t[0]),E.t("uMB",m.xq1.t[1]),E.fv("uMk",_,3),E.i("uNk",Z),E.i("uMed",u.hand),E.fv("uCOff",K,2),E.f("uWobble",u.wobble),E.f("uCover",u.cover),E.f("uStroke",u.stroke),E.f("uAng",u.strokeAng*Math.PI/180),E.f("uOverlap",u.overlap),E.f("uStrength",u.strength),E.f("uSlop",u.slop),E.f("uDry",u.dry),E.f("uFast",u.fast),c===void 0&&(e.texFrom(l(),{filter:o.NEAREST},f),c=null),E.t("uOri",f),E.f("uSheetMm",J/C,H/C),E.f("uWobMm",u.wobMm),E.f("uGran",u.gran),E.f("uDryB",u.dryB),E.f("uBloom",u.bloom)})}A("XCOMP",P.xcomp,v.comp,b=>{b.f("uPxMm",C),b.t("uD",V.t[0]),b.t("uSolX",m.xs.t[0]),b.f("uTonerK",u.tonerK),b.t("uC",m.xc.t[0]),b.t("uFib",e.fibTex),b.f("uPaper",...ge),b.f("uHollow",u.hollow),b.f("uBand",u.band),b.f("uPaperTex",u.paperTex),b.f("uFibers",u.fibers),b.f("uHasColor",X?1:0)}),A("SCAN",e.PR.scan,k?v.out:null,b=>{b.f("uSeed",u.seed),b.t("uComp",v.comp.t[0]),b.f("uBlurPx",u.scanBlur),b.f("uNoise",u.scanNoise),b.i("uNorm",0),b.f("uPaper",...ge)})}return{render:R}}const Jn=et+Vo+Ve+`
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
  oA=A; oB=B; }`,ea=et+`
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
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,ta={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Oe=(e,o,n)=>e+(o-e)*n;function oa(e){const o=e.sloppy,n=e.sup==="custom"?{type:e.supType,hex:e.supHex}:kn[e.sup];return{cut:Oe(.3,4,Math.pow(e.cut,1.5)),facet:Oe(.3,1.1,o),misreg:Oe(0,2.2,o),lift:e.lift,liftMm:Oe(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Oe(.72,1.25,e.load),mist:Oe(.2,.85,o),drop:Oe(.4,3,e.dropSize),drips:e.drips,dripLen:Oe(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:n.hex,supType:n.type,supTex:Oe(0,1.5,e.supTex),smooth:.12}}function na(e,o,n){return{...mo(n,o),...oa(e),tech:"stencil"}}const Zo=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),Jo=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let qt=null;const Jt=2048;function aa(){if(qt)return qt;const e=Jt,o=new Float32Array(e*e).fill(2),n=Je(7),t=()=>{let g=0;for(;!g;)g=n();return Math.sqrt(-2*Math.log(g))*Math.cos(6.2832*n())};let a=0;const s=4.6*e*e;for(;a<s;){const g=n()<.07,v=Math.min(16,Math.max(.6,(g?5.5:2.6)*Math.exp(.45*t()))),L=n(),B=n()*e,U=n()*e,J=Math.floor(B),H=Math.floor(U),k=Math.ceil(v),u=v*v;for(let m=-k;m<=k;m++){const P=H+m+.5-U;if(P*P>u)continue;const C=((H+m)%e+e)%e*e;for(let O=-k;O<=k;O++){const Z=J+O+.5-B;if(Z*Z+P*P>u)continue;const _=C+((J+O)%e+e)%e;L<o[_]&&(o[_]=L)}}a+=Math.PI*u}const f=4096,c=new Uint32Array(f);let r=0;for(let g=0;g<e*e;g++)o[g]<2&&(c[Math.min(f-1,o[g]*f|0)]++,r++);const d=new Float32Array(f);let i=0;for(let g=0;g<f;g++)i+=c[g],d[g]=i/r;const l=document.createElement("canvas");l.width=l.height=e;const x=l.getContext("2d"),R=x.createImageData(e,e);for(let g=0;g<e*e;g++){const v=o[g]<2?d[Math.min(f-1,o[g]*f|0)]*.985:1,L=Math.round(v*255);R.data[g*4]=R.data[g*4+1]=R.data[g*4+2]=L,R.data[g*4+3]=255}return x.putImageData(R,0,0),qt=l,l}function Mt(e,o,n,t){if(t<.5)return e;const a=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let s=e;const f=new Float32Array(e.length);for(let c=0;c<3;c++){for(let r=0;r<n;r++){let d=0;const i=r*o;for(let l=-a;l<=a;l++)d+=s[i+Math.min(o-1,Math.max(0,l))];for(let l=0;l<o;l++)f[i+l]=d/(2*a+1),d+=s[i+Math.min(o-1,l+a+1)]-s[i+Math.max(0,l-a)]}for(let r=0;r<o;r++){let d=0;for(let i=-a;i<=a;i++)d+=f[Math.min(n-1,Math.max(0,i))*o+r];for(let i=0;i<n;i++)s=s===e?new Float32Array(e.length):s,s[i*o+r]=d/(2*a+1),d+=f[Math.min(n-1,i+a+1)*o+r]-f[Math.max(0,i-a)*o+r]}}return s}function ra(e,o,n){const t=(i,l)=>{let x=i*374761393+l*668265263+n*982451653|0;return x=(x^x>>>13)*1274126177|0,((x^x>>>16)>>>0)/4294967296},a=Math.floor(e),s=Math.floor(o),f=e-a,c=o-s,r=f*f*(3-2*f),d=c*c*(3-2*c);return(t(a,s)*(1-r)+t(a+1,s)*r)*(1-d)+(t(a,s+1)*(1-r)+t(a+1,s+1)*r)*d}function sa(e,o){const n=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*n)),a=Math.max(4,Math.round(e.height*n)),s=document.createElement("canvas");s.width=t,s.height=a;const f=s.getContext("2d",{willReadFrequently:!0});return f.fillStyle="#fff",f.fillRect(0,0,t,a),f.drawImage(e,0,0,t,a),{D:f.getImageData(0,0,t,a).data,w:t,h:a,sp:Ce(o).map(c=>Math.max(c,.02))}}const ia=.04;function la(e,o,n,t=null){const{D:a,w:s,h:f,sp:c}=sa(e,o),r=new Float64Array(256),d=new Float64Array(256),i=t?xe(t):null;let l=0;for(let k=0;k<s*f;k++){const u=xe([0,1,2].map(C=>Jo(Math.min(1,Zo(a[k*4+C]/255)/c[C])))),m=Math.max(0,Math.min(1,1-u[0]+.3*Math.hypot(u[1],u[2]))),P=Math.min(255,m*256|0);if(d[P]++,i){const C=xe([a[k*4]/255,a[k*4+1]/255,a[k*4+2]/255]);if(Math.hypot(C[0]-i[0],C[1]-i[1],C[2]-i[2])<ia)continue}r[P]++,l++}l<s*f*.05&&r.set(d);{let k=0,u=0;for(let m=0;m<256;m++)k+=r[m],m>=20&&(u+=r[m]);if(u>k*.05)for(let m=0;m<20;m++)r[m]=0}const x=64,R=new Float64Array(x);for(let k=0;k<256;k++)R[k>>2]+=r[k];const g=new Float64Array(x+1),v=new Float64Array(x+1);for(let k=0;k<x;k++)g[k+1]=g[k]+R[k],v[k+1]=v[k]+R[k]*(k+.5)/x;const L=(k,u)=>{const m=g[u]-g[k];return m>0?(v[u]-v[k])*(v[u]-v[k])/m:0};let B=-1,U=[];const J=new Array(n).fill(0),H=(k,u,m)=>{if(k===n){const P=m+L(u,x);P>B&&(B=P,U=J.slice());return}for(let P=u+1;P<=x-(n-k);P++)J[k]=P,H(k+1,P,m+L(u,P))};return H(0,0,0),U.map(k=>Math.max(.04,Math.min(.95,k/x)))}function Lo(e,o){const n=o.printW||210,t=o.seed|0,a=Je(t*7919+5),s=o.layers||[],f=()=>{let y=0;for(;!y;)y=a();return Math.sqrt(-2*Math.log(y))*Math.cos(6.2832*a())},c=e.width,r=e.height,d=Math.min(1,1024/Math.max(c,r)),i=Math.max(8,Math.round(c*d)),l=Math.max(8,Math.round(r*d)),x=i*l,R=n/i,g=document.createElement("canvas");g.width=i,g.height=l;const v=g.getContext("2d",{willReadFrequently:!0});v.fillStyle="#fff",v.fillRect(0,0,i,l),v.drawImage(e,0,0,i,l);const L=v.getImageData(0,0,i,l).data,B=Ce(o.srcPaper||[1,1,1]).map(y=>Math.max(y,.02)),U=new Float32Array(x*3);for(let y=0;y<x;y++){const F=[0,1,2].map(D=>Jo(Math.min(1,Zo(L[y*4+D]/255)/B[D]))),$=xe(F);U[y*3]=$[0],U[y*3+1]=$[1],U[y*3+2]=$[2]}const J=(y,F)=>{const $=(F[0]-U[y*3])*.6,D=F[1]-U[y*3+1],S=F[2]-U[y*3+2];return $*$+D*D+S*S},H=Math.max(.3,(o.cut||1)*.5/R),k=new Float32Array(x);for(let y=0;y<x;y++)k[y]=Math.max(0,Math.min(1,1-U[y*3]+.3*Math.hypot(U[y*3+1],U[y*3+2])));const u=Mt(k,i,l,H),m=o.accKey?xe(ue(o.accKey)):null;let P=null;if(m){const y=new Float32Array(x);for(let F=0;F<x;F++)y[F]=J(F,m)<.045&&Math.hypot(U[F*3+1],U[F*3+2])>.06?1:0;P=Mt(y,i,l,H)}const C=s.map(y=>y.kind===1&&y.key?xe(ue(y.key)):null),O=s.map((y,F)=>{const $=new Uint8Array(x);if(y.kind===3){if(P)for(let D=0;D<x;D++)$[D]=P[D]>.5?1:0;return $}if(y.kind===1){const D=new Float32Array(x),S=C[F],M=Math.hypot(S[1],S[2]);for(let h=0;h<x;h++){const j=J(h,S);if(j>.06||M>.06&&Math.hypot(U[h*3+1],U[h*3+2])<.5*M)continue;let Y=!0;for(let W=0;W<C.length;W++)if(W!==F&&C[W]&&J(h,C[W])<j){Y=!1;break}D[h]=Y?1:0}const z=Mt(D,i,l,H);for(let h=0;h<x;h++)$[h]=z[h]>.5?1:0;return $}for(let D=0;D<x;D++)$[D]=u[D]>y.thr&&!(P&&P[D]>.5)?1:0;return $}),Z=3072/Math.max(i,l),_=Math.round(i*Z),q=Math.round(l*Z),N=_/n,oe=()=>{const y=document.createElement("canvas");y.width=_,y.height=q;const F=y.getContext("2d");return F.fillStyle="#000",F.fillRect(0,0,_,q),F.globalCompositeOperation="lighter",[y,F]},K=["#ff0000","#00ff00","#0000ff"];let ne=null;if(o.bridges){const[y,F]=oe();ne=y;const $=(o.bridgeMm||.9)*N;F.lineCap="butt";const D=new Int32Array(x),S=new Int32Array(x),M=new Int32Array(x).fill(-1),z=new Int32Array(x),h=new Int32Array(x);s.forEach((j,Y)=>{if(j.ch==null||j.ch<0)return;const W=O[Y];D.fill(-1);let ie=0;const fe=[];for(let me=0;me<x;me++){if(W[me]||D[me]>=0)continue;let pe=0;S[pe++]=me,D[me]=ie;const Te=[];let ze=!1;for(;pe;){const te=S[--pe];Te.push(te);const p=te%i,re=te/i|0;(p===0||re===0||p===i-1||re===l-1)&&(ze=!0),p>0&&!W[te-1]&&D[te-1]<0&&(D[te-1]=ie,S[pe++]=te-1),p<i-1&&!W[te+1]&&D[te+1]<0&&(D[te+1]=ie,S[pe++]=te+1),re>0&&!W[te-i]&&D[te-i]<0&&(D[te-i]=ie,S[pe++]=te-i),re<l-1&&!W[te+i]&&D[te+i]<0&&(D[te+i]=ie,S[pe++]=te+i)}!ze&&Te.length*R*R>=.6&&fe.push([ie,Te]),ie++}F.strokeStyle=K[j.ch],F.lineWidth=$;const be=Math.round(12/R);let Me=0;for(const[me,pe]of fe.slice(0,600)){const Te=pe.length*R*R,ze=Te<40?1:Te<400?2:3,te=[],p=pe.filter(le=>{const ke=le%i;return ke>0&&W[le-1]||ke<i-1&&W[le+1]||W[le-i]||W[le+i]}),re=Math.sqrt(pe.length)*.75;for(let le=0;le<ze;le++){Me++;const ke=[];let Le=0;for(const de of p)te.some(dt=>Math.hypot(dt%i-de%i,(dt/i|0)-(de/i|0))<re)||(M[de]=Me,z[de]=-1,h[de]=0,ke.push(de));let ee=-1;for(;Le<ke.length;){const de=ke[Le++],dt=de%i,Po=de/i|0;if(h[de]>be)break;for(const qe of[dt>0?de-1:-1,dt<i-1?de+1:-1,Po>0?de-i:-1,Po<l-1?de+i:-1])if(!(qe<0||M[qe]===Me)){if(!W[qe]){if(D[qe]!==me){z[qe]=de,ee=qe;break}continue}M[qe]=Me,z[qe]=de,h[qe]=h[de]+1,ke.push(qe)}if(ee>=0)break}if(ee<0)break;let Re=ee;for(;z[Re]>=0&&W[z[Re]];)Re=z[Re];const _t=z[Re]>=0?z[Re]:Re;te.push(_t);const Nt=(_t%i+.5)/i*_,It=((_t/i|0)+.5)/l*q,jt=(ee%i+.5)/i*_,$t=((ee/i|0)+.5)/l*q,Mo=Math.hypot(jt-Nt,$t-It)||1,So=(jt-Nt)/Mo*.5*N,wo=($t-It)/Mo*.5*N;F.beginPath(),F.moveTo(Nt-So,It-wo),F.lineTo(jt+So,$t+wo),F.stroke()}}})}const[ge,I]=oe(),A=n*n*l/i,T=o.dripLen||8,w=o.dripW||.9,V=o.drips||0,X=o.splat||0,b=s.map((y,F)=>[y,F]).filter(([y])=>y.ch!=null&&y.ch>=0);if(b.forEach(([y,F],$)=>{if(V<=0)return;const D=O[F],S=[];for(let Y=0;Y<x-i;Y++)D[Y]&&!D[Y+i]&&S.push(Y);const M=.35+.65*($+1)/b.length,z=Math.min(260,Math.round(V*S.length*R*.06*M));if(!S.length)return;I.fillStyle=K[y.ch];let h=0,j=0;for(;h<z&&j<z*8;){j++;const Y=S[a()*S.length|0],W=Y%i,ie=Y/i|0;if(a()>.15+ra(W*R/14,ie*R/14,t+F*31))continue;h++;let fe=T*Math.exp(.75*f());a()<.25&&(fe*=.25),fe=Math.max(.8,Math.min(150,fe));const be=w*(.55+.9*a())*(.7+.3*Math.min(1,fe/10)),Me=(W+a())*R,me=(ie+1)*R-(.3+a()*1.2),pe=(a()-.5)*.8,Te=.06+a()*.12,ze=2+a()*4,te=a()*6.28;I.beginPath();const p=Math.max(.04,be*.18);let re=Me,le=me,ke=be/2;for(let ee=0;ee<=1.0001;ee+=p/fe){le=me+ee*fe,re=Me+pe*ee+Te*Math.sin(ee*fe/ze+te),ke=be/2*(1-.45*ee)*(ee<.08?1+(.08-ee)/.08*.6:1);const Re=Math.max(.6,ke*N);I.moveTo(re*N+Re,le*N),I.arc(re*N,le*N,Re,0,6.2832)}const Le=ke*(1.45+.6*a());I.moveTo(re*N+Le*N,(le+Le*.4)*N),I.arc(re*N,(le+Le*.4)*N,Math.max(.7,Le*N),0,6.2832),I.fill()}}),X>0&&b.length){const y=b[b.length-1],F=O[y[1]],$=[];for(let M=0;M<x;M+=3)F[M]&&$.push(M);const D=Math.min(900,Math.round(X*220*A/62370)),S=o.splatSize||.8;for(let M=0;M<D;M++){const z=a()<.75?y:b[a()*b.length|0];I.fillStyle=K[z[0].ch];let h,j;if($.length&&a()<.65){const W=$[a()*$.length|0];h=(W%i+.5)*R+f()*22,j=((W/i|0)+.5)*R+f()*22}else h=a()*n,j=a()*n*l/i;const Y=Math.max(.06,Math.min(4.5,S*.5*Math.exp(.8*f())));if(I.beginPath(),a()<.12){const W=a()*6.28;I.ellipse(h*N,j*N,Y*N*2.4,Y*N*.8,W,0,6.2832)}else I.arc(h*N,j*N,Math.max(.6,Y*N),0,6.2832);if(a()<.45){const W=2+(a()*6|0),ie=a()*6.28;for(let fe=0;fe<W;fe++){const be=Y*(1.3+a()*2.6),Me=ie+(a()-.5)*1.3,me=Math.max(.04,Y*(.1+a()*.3)),pe=(h+Math.cos(Me)*be)*N,Te=(j+Math.sin(Me)*be)*N;I.moveTo(pe+me*N,Te),I.arc(pe,Te,Math.max(.5,me*N),0,6.2832)}}I.fill()}}let E=null;if(o.cloud){const F=Math.ceil(i/4),$=Math.ceil(l/4),D=new Float32Array(F*$);for(let j=0;j<x;j++){let Y=0;for(const W of O)if(W[j]){Y=1;break}if(Y){const W=((j/i|0)/4|0)*F+(j%i/4|0);D[W]=1}}const S=Mt(D,F,$,(o.cloudMm||18)/(R*4));let M=0;for(const j of S)M=Math.max(M,j);E=document.createElement("canvas"),E.width=F,E.height=$;const z=E.getContext("2d"),h=z.createImageData(F,$);for(let j=0;j<F*$;j++){const Y=Math.min(1,S[j]/(M*.55+1e-6));h.data[j*4]=Math.round(255*Math.pow(Y,.8)),h.data[j*4+3]=255}z.putImageData(h,0,0)}return{drip:ge,bridge:ne,cloud:E}}function ca(e){const{gl:o}=e;let n=null,t=null,a=0,s=0,f=null;const c=o.createTexture(),r=o.createTexture(),d=o.createTexture();let i,l=null;const x=()=>{if(!l){l=document.createElement("canvas"),l.width=l.height=1;const v=l.getContext("2d");v.fillStyle="#000",v.fillRect(0,0,1,1)}return l};function R(v,L){if(n||(n={scut:e.compile(Jn),spray:e.compile(ea)}),f||(f=e.texFrom(aa(),{wrap:o.REPEAT,mip:!0})),t&&v===a&&L===s)return;t&&Object.values(t).forEach(e.freeTarget),a=v,s=L;const B=Math.max(1,v>>2),U=Math.max(1,L>>2);t={b1:e.target(v,L),b2:e.target(v,L),sm:e.target(v,L,2),sq:e.target(B,U,2),sw:e.target(B,U,2)}}function g(v,L,B,U,J,H,k,u){R(H,k);const m=Object.assign({},ta,v),P=t,C=n,O=H/m.printW,Z=(m.layers||[]).slice(0,5),_=Z.length,q=Je(m.seed*6151+3),N=Ce(m.srcPaper||[1,1,1]).map(h=>Math.max(h,.02)),oe=h=>Ce(ue(h)).map((j,Y)=>Math.min(1,j/N[Y])),K=[],ne=[],ge=[],I=[],A=[],T=[],w=[];let V=0;for(let h=0;h<5;h++){const j=Z[h]||{kind:0,thr:2,hex:"#000000"};K.push(j.kind|0),ne.push(j.thr==null?.5:j.thr),ge.push(j.ch==null?-1:j.ch),A.push(j.op==null?.97:j.op),I.push(...Ce(ue(j.hex))),T.push(...j.key?oe(j.key):[1,1,1]),h<_&&j.kind===1&&(V=h+1);const Y=q()*Math.PI*2,W=m.misreg*Math.sqrt(q());w.push(Math.cos(Y)*W,Math.sin(Y)*W)}const X=m.maps||{drip:null,bridge:null,cloud:null};X!==i&&(e.texFrom(X.drip||x(),{},c),e.texFrom(X.bridge||x(),{},r),e.texFrom(X.cloud||x(),{},d),i=X);const b=X.drip?Math.max(.03,Math.min(.5,.5*X.drip.width/H)):.5,E=m.accKey?oe(m.accKey):[1,1,1],y=Z.some(h=>h.kind===3)?1:0,F=Ce(ue(m.support)),$=Ce(ue(m.cloudHex||"#f4f4f0")),D=(h,j,Y,W)=>e.run(h,j,Y,ie=>{ie.f("uOff",0,0),ie.f("uImg",H,k),W(ie)});D("PREP",e.PR.prep,L.prep,h=>{h.t("uSrc",B),h.f("uSrcRes",U,J),h.f("uSmoothPx",m.smooth*U/m.printW),h.f("uSrcPaper",...m.srcPaper||[1,1,1]),h.f("uPaper",1,1,1)});const S=(h,j,Y,W,ie,fe)=>D(`BLUR ${h}`,e.PR.blur,Y,be=>{be.t("uTexA",j.t[0]),be.t("uTexB",j.t[j.t.length>1?1:0]),be.f("uDir",W,ie),be.f("uSig",fe)}),M=Math.max(.05,m.cut*.5*O);S("cut H",L.prep,P.b1,1,0,M),S("cut V",P.b1,P.b2,0,1,M),D("SCUT",C.scut,P.sm,h=>{h.f("uPxMm",O),h.f("uSeed",m.seed),h.t("uSimp",P.b2.t[0]),h.t("uBr",r),h.i("uNL",_),h.i("uNK",V),h.i("uAccOn",y),h.iv("uKind",K),h.iv("uCh",ge),h.fv("uThr",ne,1),h.fv("uKey",T,3),h.f("uAccK",E[0],E[1],E[2]),h.fv("uOffs",w,2),h.f("uFacet",m.facet),h.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,M))))});const z=Math.max(.3,m.liftMm*O/4);S("lift ¼ H",P.sm,L.qtmp,1,0,z),S("lift ¼ V",L.qtmp,P.sq,0,1,z),S("wide ¼ H",P.sq,L.qtmp,1,0,z*2),S("wide ¼ V",L.qtmp,P.sw,0,1,z*2),D("SPRAY",C.spray,L.comp,h=>{h.f("uPxMm",O),h.f("uSeed",m.seed),h.t("uMA",P.sm.t[0]),h.t("uMB",P.sm.t[1]),h.t("uQA",P.sq.t[0]),h.t("uQB",P.sq.t[1]),h.t("uWA",P.sw.t[0]),h.t("uWB",P.sw.t[1]),h.t("uDr",c),h.t("uCl",d),h.t("uSpT",f),h.i("uNL",_),h.i("uSup",m.supType|0),h.iv("uCh",ge),h.fv("uLc",I,3),h.fv("uOp",A,1),h.f("uSupLin",...F),h.f("uCloudLin",...$),h.f("uSupTex",m.supTex),h.f("uLift",m.lift),h.f("uOver",m.over),h.f("uLoad",m.load),h.f("uMist",m.mist),h.f("uDrop",m.drop),h.f("uCloud",X.cloud?m.cloud:0),h.f("uSpN",Jt),h.f("uTp",Jt/(143.36*m.drop*O)),h.f("uDrTp",b),h.f("uLiftScale",m.liftScale)}),D("SCAN",e.PR.scan,u?L.out:null,h=>{h.f("uSeed",m.seed),h.t("uComp",L.comp.t[0]),h.f("uBlurPx",m.scanBlur),h.f("uNoise",m.scanNoise),h.i("uNorm",0),h.f("uPaper",...F)})}return{render:g}}function ft(e,o,n){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+n+e.slice(t+o.length)}const Ro=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,en=ft(Qo,Ro,Ro+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Bo=2,Do=4,Fo=8,ua=ft(en,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),fa=ft(Ho,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),pa=ft(ft(ft(Yo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),ma=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,Co=new Map,_o=(e,o)=>{let n=Co.get(e);return n||(n=o(),Co.set(e,n)),n};function da(e){const n=document.createElement("canvas");n.width=n.height=1024;const t=n.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const a=Je(e);t.lineCap="round";for(let s=0;s<2600;s++){const f=(.25+a()*a()*1.6)*85,c=a()*Math.PI*2,r=a()*1024,d=a()*1024,i=(a()-.5)*.9,l=(.012+a()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+a()*.55})`,t.lineWidth=l;for(const x of[-1024,0,1024])for(const R of[-1024,0,1024]){const g=r+x,v=d+R;g<-f-10||g>1024+f+10||v<-f-10||v>1024+f+10||(t.beginPath(),t.moveTo(g,v),t.quadraticCurveTo(g+Math.cos(c+i)*f*.5,v+Math.sin(c+i)*f*.5,g+Math.cos(c)*f,v+Math.sin(c)*f),t.stroke())}}return n}function ha(e){const n=document.createElement("canvas");n.width=n.height=1024;const t=n.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const a=Je(e);t.lineCap="round",t.globalCompositeOperation="lighter";const s=1024/61;for(let f=0;f<70;f++){const c=a()<.7?"255,0,0":"0,255,0",r=(.4+a()*a()*3.5)*s,d=a()*Math.PI*2,i=a()*1024,l=a()*1024,x=(a()-.5)*1.6,R=(.015+a()*.03)*s;t.strokeStyle=`rgba(${c},${.35+a()*.5})`,t.lineWidth=Math.max(.6,R);for(const g of[-1024,0,1024])for(const v of[-1024,0,1024]){const L=i+g,B=l+v;L<-r||L>1024+r||B<-r||B>1024+r||(t.beginPath(),t.moveTo(L,B),t.bezierCurveTo(L+Math.cos(d+x)*r*.35,B+Math.sin(d+x)*r*.35,L+Math.cos(d-x)*r*.7,B+Math.sin(d-x)*r*.7,L+Math.cos(d)*r,B+Math.sin(d)*r),t.stroke())}}for(let f=0;f<160;f++){t.fillStyle=`rgba(255,0,0,${.2+a()*.6})`;const c=(.02+a()*a()*.12)*s;t.beginPath(),t.arc(a()*1024,a()*1024,Math.max(.5,c),0,7),t.fill()}return n}function tn(e,o,n={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:n.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const a=t.getParameter(t.MAX_TEXTURE_SIZE);function s(A){const T=t.createProgram();for(const[X,b]of[[t.VERTEX_SHADER,Bn],[t.FRAGMENT_SHADER,A]]){const E=t.createShader(X);if(t.shaderSource(E,b),t.compileShader(E),!t.getShaderParameter(E,t.COMPILE_STATUS)){const y=t.getShaderInfoLog(E);throw new Error(y??"shader compile error")}t.attachShader(T,E)}if(t.bindAttribLocation(T,0,"p"),t.linkProgram(T),!t.getProgramParameter(T,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(T)??"program link error");const w={},V=t.getProgramParameter(T,t.ACTIVE_UNIFORMS);for(let X=0;X<V;X++){const b=t.getActiveUniform(T,X);w[b.name.replace(/\[0\]$/,"")]=t.getUniformLocation(T,b.name)}return{p:T,u:w}}const f=new Map,c=A=>{let T=f.get(A);return T||(T=s(A),f.set(A,T)),T},r={fill:s(_n),sep0:s(Cn),lut:s(Dn),prep:s(Fn),sep:s(Nn),blur:s(In),screen:s(Yo),spread:s(Qo),compose:s(jn),scan:s(Ho)},d=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,d),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function i(A,T,{filter:w=t.LINEAR,wrap:V=t.CLAMP_TO_EDGE}={}){const X=t.createTexture();return t.bindTexture(t.TEXTURE_2D,X),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,A,T,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,w),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,w),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,V),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,V),X}function l(A,{filter:T=t.LINEAR,wrap:w=t.CLAMP_TO_EDGE,mip:V=!1}={},X=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,X),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,A),V&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,V?t.LINEAR_MIPMAP_LINEAR:T),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,T),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,w),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,w),X}function x(A,T,w=1){const V=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,V);const X=[];for(let b=0;b<w;b++){const E=i(A,T);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+b,t.TEXTURE_2D,E,0),X.push(E)}return t.drawBuffers(X.map((b,E)=>t.COLOR_ATTACHMENT0+E)),{f:V,t:X,w:A,h:T}}function R(A){A.t.forEach(T=>t.deleteTexture(T)),t.deleteFramebuffer(A.f)}const g=zn(t);function v(A,T,w,V){const X=w?w.w:e.width,b=w?w.h:e.height;t.useProgram(T.p),t.bindFramebuffer(t.FRAMEBUFFER,w?w.f:null),t.viewport(0,0,X,b);let E=0;const y=T.u,F={t(D,S){y[D]!=null&&(t.activeTexture(t.TEXTURE0+E),t.bindTexture(t.TEXTURE_2D,S),t.uniform1i(y[D],E),E++)},f(D,...S){const M=y[D];M!=null&&(S.length===1?t.uniform1f(M,S[0]):S.length===2?t.uniform2f(M,S[0],S[1]):S.length===3?t.uniform3f(M,S[0],S[1],S[2]):t.uniform4f(M,S[0],S[1],S[2],S[3]))},i(D,S){y[D]!=null&&t.uniform1i(y[D],S)},fv(D,S,M){const z=y[D];if(z==null)return;const h=new Float32Array(S);M===1?t.uniform1fv(z,h):M===2?t.uniform2fv(z,h):t.uniform3fv(z,h)},m2(D,S){y[D]!=null&&t.uniformMatrix2fv(y[D],!1,new Float32Array(S))},iv(D,S){y[D]!=null&&t.uniform1iv(y[D],new Int32Array(S))}};F.f("uRes",X,b),V&&V(F);const $=g.mode==="off"?null:g.before(A,{w:X,h:b,att:w?w.t.length:1});t.drawArrays(t.TRIANGLES,0,3),g.mode!=="off"&&g.after(A,$)}const L=l(o.green,{wrap:t.REPEAT}),B={b:l(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:l(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:l(o.exLut)},U=l(_o("fib11",()=>da(11)),{wrap:t.REPEAT,mip:!0}),J=l(_o("inc23",()=>ha(23)),{wrap:t.REPEAT,mip:!0}),H=A=>{A.t("uExB",B.b),A.t("uExR",B.r),A.t("uExLut",B.lut),A.f("uExBSize",B.bs[0],B.bs[1]),A.f("uExRSize",B.rs[0],B.rs[1]),A.f("uExPxMm",Rn)};let k=null,u=null;const m=x(1089,33,2);let P="";const C=t.createTexture();let O=0,Z=0,_=null,q=0,N=0;function oe(A,T){if(A===q&&T===N)return;q=A,N=T,_&&Object.values(_).forEach(R);const w=Math.max(1,A>>2),V=Math.max(1,T>>2);_={prep:x(A,T),sep:x(A,T,2),tmp:x(A,T,2),loc:x(A,T,2),qtmp:x(w,V,2),sol:x(w,V,2),scr:x(A,T,2),cov:x(A,T,2),comp:x(A,T),out:x(A,T)},e.width=A,e.height=T}const K=t.getExtension("EXT_disjoint_timer_query_webgl2");let ne=null;function ge(){if(!K||!ne||!t.getQueryParameter(ne,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(K.GPU_DISJOINT_EXT)||(I.gpuMs=t.getQueryParameter(ne,t.QUERY_RESULT)/1e6),t.deleteQuery(ne),ne=null}const I={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:g,lastVariants:"",setSource(A,T=!0){O=A.width,Z=A.height;const w=performance.now();l(A,{},C);const V=performance.now();T&&(t.bindTexture(t.TEXTURE_2D,C),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),I.lastUploadMs=V-w,I.lastMipMs=performance.now()-V},invalidateLut(){P=""},present(){if(!_)return;const A=_;v("PRESENT",c(ma),null,T=>{T.t("uT",A.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(A,T={}){const w=Object.assign({},$n,A),V=T.preview??0,X=!!T.lossless||V!==0,b=(p,re)=>V&p?"preview":X&&re?"lossless":"lab";I.lastVariants=`screen:${b(Fo,!1)} spread:${b(Bo,!0)} scan:${b(Do,!1)}`;const E=performance.now();ge(),g.mode!=="off"&&g.frameStart();const y=K&&!ne&&g.mode!=="timer"?t.createQuery():null;y&&t.beginQuery(K.TIME_ELAPSED_EXT,y);let F=Math.round(w.printW*w.pxmm),$=Math.round(F*Z/O);const D=Math.min(a,6144);if(Math.max(F,$)>D){const p=D/Math.max(F,$);F=Math.round(F*p),$=Math.round($*p)}const S=A.tech==="xerox"||A.tech==="stencil";S&&(F=Math.max(4,F&-4),$=Math.max(4,$&-4)),oe(F,$),I.width=F,I.height=$;const M=_;if(S){const p={gl:t,compile:s,run:v,target:x,freeTarget:R,texFrom:l,greenTex:L,fibTex:U,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},re={prep:M.prep,qtmp:M.qtmp,comp:M.comp,out:M.out};return A.tech==="stencil"?(u??=ca(p)).render(A,re,C,O,Z,F,$,!!T.toTexture):(k??=Zn(p)).render(A,re,C,O,Z,F,$,!!T.toTexture),I.lastVariants=A.tech??"xerox",y&&(t.endQuery(K.TIME_ELAPSED_EXT),ne=y),t.flush(),I.lastMs=performance.now()-E,I}const z=F/w.printW,h=Ce(ue(w.paper)),j=Math.min(ot,w.inks.length),Y=w.inks.concat(Array(ot).fill("#000000")).slice(0,ot),W=w.opac.concat(Array(ot).fill(.15)).slice(0,ot),ie=[];for(let p=0;p<ot;p++)ie.push(...Ce(ue(Ao(Y[p]))));const fe=Y.map(p=>xe(ue(Ao(p)))[0]<.42?0:1),be=JSON.stringify([Y,W,j,w.paper,w.inkCost,w.pair]);be!==P&&(v("LUT",r.lut,m,p=>{p.fv("uInk",ie,3),p.i("uN",j),p.f("uPaper",...h),p.f("uMu",w.inkCost*.25)}),P=be),v("PREP",r.prep,M.prep,p=>{p.t("uSrc",C),p.f("uSrcRes",O,Z),p.f("uSmoothPx",w.smooth*O/w.printW),p.f("uSrcPaper",...w.srcPaper),p.f("uPaper",...h)});const Me=Je(w.seed*7919+13),me=[],pe=[];for(let p=0;p<ot;p++){const re=(Me()*2-1)*w.rot*Math.PI/180,le=1+(Me()*2-1)*w.scl/1e3,ke=Math.cos(re)*le,Le=Math.sin(re)*le;me.push(ke,Le,-Le,ke);const ee=Me()*Math.PI*2,Re=w.misreg*Math.sqrt(Me());pe.push(Math.cos(ee)*Re,Math.sin(ee)*Re)}v("SEP0",r.sep0,M.tmp,p=>{p.t("uPrep",M.prep.t[0]),p.t("uSetA",m.t[0]),p.t("uSetB",m.t[1]),p.i("uN",j),p.f("uMinDot",w.minDot)});const Te=Math.max(.2,w.misreg*.9+.12),ze=Math.max(.3,Te*z/4);v("BLUR fill ¼ H",r.blur,M.qtmp,p=>{p.t("uTexA",M.tmp.t[0]),p.t("uTexB",M.tmp.t[1]),p.f("uDir",1,0),p.f("uSig",ze)}),v("BLUR fill ¼ V",r.blur,M.sol,p=>{p.t("uTexA",M.qtmp.t[0]),p.t("uTexB",M.qtmp.t[1]),p.f("uDir",0,1),p.f("uSig",ze)}),v("FILL",r.fill,M.loc,p=>{p.t("uRawA",M.tmp.t[0]),p.t("uRawB",M.tmp.t[1]),p.t("uWA",M.sol.t[0]),p.t("uWB",M.sol.t[1]),p.i("uN",j),p.f("uFill",w.fill)}),v("WARP",r.sep,M.sep,p=>{p.f("uPxMm",z),p.t("uSA",M.loc.t[0]),p.t("uSB",M.loc.t[1]),p.i("uN",j),p.f("uCtr",w.printW/2,$/z/2),p.m2("uM",me),p.fv("uT",pe,2)});const te=(p,re,le,ke,Le)=>{v(`BLUR ${p} H`,r.blur,le,ee=>{ee.t("uTexA",re.t[0]),ee.t("uTexB",re.t[1]),ee.f("uDir",1,0),ee.f("uSig",Le)}),v(`BLUR ${p} V`,r.blur,ke,ee=>{ee.t("uTexA",le.t[0]),ee.t("uTexB",le.t[1]),ee.f("uDir",0,1),ee.f("uSig",Le)})};return te("loc",M.sep,M.tmp,M.loc,.22*z),te("sol ¼",M.sep,M.qtmp,M.sol,1.5*z/4),v("SCREEN",V&Fo?c(pa):r.screen,M.scr,p=>{H(p),p.f("uPxMm",z),p.f("uSeed",w.seed),p.t("uSepA",M.sep.t[0]),p.t("uSepB",M.sep.t[1]),p.t("uSolA",M.sol.t[0]),p.t("uSolB",M.sol.t[1]),p.t("uLocA",M.loc.t[0]),p.t("uLocB",M.loc.t[1]),p.t("uGreen",L),p.i("uN",j),p.i("uMode",+w.screen),p.f("uGrain",w.grain),p.f("uLoad",w.inkLoad),p.f("uLpi",w.lpi),p.f("uMottle",w.mottle),p.f("uStarve",w.starve),p.f("uTexAmp",w.texAmp),p.f("uStreak",w.streak),p.f("uSolidLv",w.solidLv),p.fv("uExSel",fe,1),p.f("uTrap",w.trap)}),v("SPREAD",V&Bo?c(ua):X?c(en):r.spread,M.cov,p=>{H(p),p.f("uPxMm",z),p.f("uSeed",w.seed),p.t("uScrA",M.scr.t[0]),p.t("uScrB",M.scr.t[1]),p.t("uSepA",M.sep.t[0]),p.t("uSepB",M.sep.t[1]),p.t("uLocA",M.loc.t[0]),p.t("uLocB",M.loc.t[1]),p.i("uN",j),p.f("uBleedPx",w.bleed*z),p.f("uGain",w.gain),p.f("uEdge",w.edge),p.f("uSolidLv",w.solidLv),p.fv("uExSel",fe,1)}),v("COMPOSE",r.compose,M.comp,p=>{H(p),p.f("uPxMm",z),p.f("uSeed",w.seed),p.t("uCovA",M.cov.t[0]),p.t("uCovB",M.cov.t[1]),p.t("uSolA",M.sol.t[0]),p.t("uSolB",M.sol.t[1]),p.f("uStarve",w.starve),p.t("uFib",U),p.t("uInc",J),p.i("uN",j),p.fv("uInk",ie,3),p.fv("uOp",W,1),p.f("uPaper",...h),p.f("uPaperTex",w.paperTex),p.f("uFibers",w.fibers),p.f("uIncl",w.incl),p.f("uVoids",w.voids),p.f("uMottle",w.mottle),p.f("uTexAmp",w.texAmp),p.fv("uExSel",fe,1)}),v("SCAN",V&Do?c(fa):r.scan,T.toTexture?M.out:null,p=>{p.f("uSeed",w.seed),p.t("uComp",M.comp.t[0]),p.f("uBlurPx",w.scanBlur),p.f("uNoise",w.scanNoise),p.i("uNorm",+w.normWhite),p.f("uPaper",...h)}),y&&(t.endQuery(K.TIME_ELAPSED_EXT),ne=y),t.flush(),I.lastMs=performance.now()-E,I}};return I}const on=new URLSearchParams(window.location.search),mt=on.get("srdebug")==="1",he=mt?on:new URLSearchParams,va=["srres","srpipe","srhold","srpreview","srprevmask"],G={preserveDrawingBuffer:he.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(he.get("srres"))||1)),mip:he.get("srmip")!=="0",bypass:he.get("srbypass")==="1",darkPaperFromBase:he.get("srdarkpaper")==="bg",simUpload:he.get("srsim")==="1",offscreenBack:he.get("sroff")==="1",bitmapUpload:he.get("srbitmap")==="1",pipe:he.get("srpipe")==="2"?2:he.get("srpipe")==="1"?1:0,hold:he.get("srhold")==="1",lossless:he.get("srlossless")!=="0",preview:he.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(he.get("srprevmask"))||0)),auto:!va.some(e=>he.has(e)),forceLevel:he.get("srlevel")==="preview"?"preview":he.get("srlevel")==="full"?"full":null},nn={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},Q={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,lastPath:"",level:""},tt={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},Ut=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==G.preserveDrawingBuffer,n=e.offscreenBack!==void 0&&e.offscreenBack!==G.offscreenBack;Object.assign(G,e),(o||n)&&tt.recreateEngine()},No=5,Io=30,xa=12,ga=300,eo=new Map;let Ie=null,Pt="";const an=(e,o)=>`${e}×${o}`;function ba(e,o){if(G.forceLevel)return Zt(G.forceLevel==="preview"),G.forceLevel;const n=eo.get(an(e,o));return n?(Zt(n==="preview"),n):"detect"}function jo(e,o,n,t){const a=an(e,o);if((!Ie||Ie.size!==a)&&(Ie={size:a,seen:0,samples:[]}),++Ie.seen>No+3*Io&&!Ie.samples.length){eo.set(a,"full"),Ie=null,Pt=`${a}: sin medida (${t}) → full`;return}if(Ie.seen<=No||n===null||(Ie.samples.push(n),Ie.samples.length<Io))return;const s=[...Ie.samples].sort((r,d)=>r-d),f=s[s.length>>1],c=f>xa?"preview":"full";eo.set(a,c),Ie=null,Pt=`${a}: coste p50 ${f.toFixed(1)} ms (${t}) → ${c}`,Zt(c==="preview"),mt&&console.info(`[SuperRiso] quality level ${Pt}`)}const ka=()=>Pt;let ht=null,zt=null,$o=0,rn="";function ya(e,o,n){return!!e&&!!ht&&o===zt&&e.length===ht.length&&e.every((a,s)=>a===ht[s])||($o=n,rn=o!==zt?"scene":(e??[]).map((a,s)=>a===ht?.[s]?"":s).filter(a=>a!=="").join(",")),ht=e??null,zt=o,n-$o}const sn=(e,o,n)=>{const t=n?1024:560,a=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*a)),Math.max(8,Math.round(o*a))]};function Ot(e,{keys:o,srcPaper:n,fill:t,nk:a,cover:s,seed:f}){const[c,r]=sn(e.width,e.height,t),d=document.createElement("canvas");d.width=c,d.height=r;const i=d.getContext("2d",{willReadFrequently:!0});i.fillStyle="#fff",i.fillRect(0,0,c,r),i.drawImage(e,0,0,c,r);const l=i.getImageData(0,0,c,r).data,x=xe(n),R=new Int8Array(c*r).fill(-1),g=c*r;if(t){const k=new Uint8Array(g);for(let _=0;_<g;_++){const q=xe([l[_*4]/255,l[_*4+1]/255,l[_*4+2]/255]);k[_]=x[0]-q[0]>.14?1:0}const u=new Uint8Array(k);for(let _=0;_<r;_++)for(let q=0;q<c;q++){if(!k[_*c+q])continue;const N=_*c+q;q>0&&(u[N-1]=1),q<c-1&&(u[N+1]=1),_>0&&(u[N-c]=1),_<r-1&&(u[N+c]=1)}const m=new Int32Array(g).fill(-1),P=new Int32Array(g),C=Je((f|0)*977+13);let O=0;const Z=Math.max(6,g*12e-5);for(let _=0;_<g;_++){if(u[_]||m[_]>=0)continue;let q=0;P[q++]=_,m[_]=O;const N=[];let oe=!1;for(;q;){const I=P[--q];N.push(I);const A=I%c,T=I/c|0;(A===0||T===0||A===c-1||T===r-1)&&(oe=!0),A>0&&!u[I-1]&&m[I-1]<0&&(m[I-1]=O,P[q++]=I-1),A<c-1&&!u[I+1]&&m[I+1]<0&&(m[I+1]=O,P[q++]=I+1),T>0&&!u[I-c]&&m[I-c]<0&&(m[I-c]=O,P[q++]=I-c),T<r-1&&!u[I+c]&&m[I+c]<0&&(m[I+c]=O,P[q++]=I+c)}O++;const K=C(),ne=C();if(N.length<Z||oe&&N.length>g*.05||K>s)continue;const ge=Math.min(a-1,Math.floor(ne*a));for(const I of N)R[I]=ge}for(let _=0;_<3;_++){const q=new Int8Array(R);for(let N=0;N<r;N++)for(let oe=0;oe<c;oe++){const K=N*c+oe;if(q[K]>=0||!u[K])continue;const ne=oe>0&&q[K-1]>=0?q[K-1]:oe<c-1&&q[K+1]>=0?q[K+1]:N>0&&q[K-c]>=0?q[K-c]:N<r-1&&q[K+c]>=0?q[K+c]:-1;ne>=0&&(R[K]=ne)}}}else{const k=o.map(u=>xe(ue(u)));for(let u=0;u<g;u++){const m=xe([l[u*4]/255,l[u*4+1]/255,l[u*4+2]/255]),P=Math.hypot(m[0]-x[0],m[1]-x[1],m[2]-x[2]),C=Math.hypot(m[1],m[2]);if(!(P>.08&&(m[0]>.32||C>.12)))continue;let O=-1,Z=1e9;for(let _=0;_<k.length;_++){const q=(k[_][0]-m[0])*.6,N=k[_][1]-m[1],oe=k[_][2]-m[2],K=q*q+N*N+oe*oe;K<Z&&(Z=K,O=_)}Z<.045&&(R[u]=O)}}let v=null;if(t){v=document.createElement("canvas"),v.width=c,v.height=r;const k=v.getContext("2d"),u=k.createImageData(c,r);for(let m=0;m<g;m++)u.data[m*4]=(R[m]+1)*36,u.data[m*4+3]=255;k.putImageData(u,0,0)}const L=new Int32Array(g).fill(-1),B=i.createImageData(c,r),U=new Int32Array(g);for(let k=0;k<g;k++)B.data[k*4]=255,B.data[k*4+1]=128,B.data[k*4+2]=0,B.data[k*4+3]=255;let J=0;for(let k=0;k<g;k++){if(R[k]<0||L[k]>=0)continue;const u=R[k];let m=0;U[m++]=k,L[k]=J;const P=[];let C=0,O=0,Z=0,_=0,q=0,N=0;for(;m;){const S=U[--m];P.push(S);const M=S%c,z=S/c|0;C++,O+=M,Z+=z,_+=M*M,q+=z*z,N+=M*z,M>0&&R[S-1]===u&&L[S-1]<0&&(L[S-1]=J,U[m++]=S-1),M<c-1&&R[S+1]===u&&L[S+1]<0&&(L[S+1]=J,U[m++]=S+1),z>0&&R[S-c]===u&&L[S-c]<0&&(L[S-c]=J,U[m++]=S-c),z<r-1&&R[S+c]===u&&L[S+c]<0&&(L[S+c]=J,U[m++]=S+c)}if(J++,C<6)continue;const oe=O/C,K=Z/C,ne=_/C-oe*oe,ge=q/C-K*K,I=N/C-oe*K,A=.5*Math.atan2(2*I,ne-ge),T=ne+ge,w=ne*ge-I*I,V=Math.sqrt(Math.max(0,T*T/4-w)),X=T/2+V,b=Math.max(1e-6,T/2-V),E=Math.sqrt(b/X),y=Math.max(0,Math.min(1,(.62-E)/.3)),F=Math.round(127.5+127.5*Math.cos(2*A)),$=Math.round(127.5+127.5*Math.sin(2*A)),D=Math.round(255*y);for(const S of P)B.data[S*4]=F,B.data[S*4+1]=$,B.data[S*4+2]=D}const H=new Uint8ClampedArray(B.data);for(let k=0;k<2;k++){const u=new Uint8ClampedArray(H);for(let m=0;m<r;m++)for(let P=0;P<c;P++){const C=m*c+P;if(!(u[C*4+2]>0))for(const[O,Z]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=P+O,q=m+Z;if(_<0||q<0||_>=c||q>=r)continue;const N=q*c+_;if(u[N*4+2]>0){H[C*4]=u[N*4],H[C*4+1]=u[N*4+1],H[C*4+2]=u[N*4+2];break}}}}return B.data.set(H),i.putImageData(B,0,0),{ori:d,ids:v}}const ln=300;let _e=null,to=0,Wt=!1;const st=document.createElement("canvas"),Ma=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:ln}):setTimeout(e,0)},Sa=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((n,t)=>n===o.motion[t]),wa=()=>to;function Pa(e,o,n,t,a,s,f){const c=o.what==="fill",r={keys:c?[]:o.keys??o.paint,srcPaper:t,fill:c,nk:o.paint.length,cover:n.fillCover,seed:n.fillSeed};if(!a)return Ot(e,r);const d=JSON.stringify([c,r.keys,r.nk,c?r.cover:0,c?r.seed:0,t]),i=performance.now(),l={motion:s&&[...s],scene:f};if(!_e||_e.key!==d)return _e={key:d,maps:Ot(e,r),at:i,sig:l},to++,_e.maps;if(!Wt&&i-_e.at>=ln&&!Sa(l,_e.sig)){const[x,R]=sn(e.width,e.height,c);(st.width!==x||st.height!==R)&&(st.width=x,st.height=R),st.getContext("2d").drawImage(e,0,0,x,R),Wt=!0,_e.at=i,_e.sig=l,Ma(()=>{Wt=!1,!(!_e||_e.key!==d)&&(_e.maps=Ot(st,r),to++)})}return _e.maps}const oo=300,Aa=200,Ea=e=>xe(ue(e))[0]<.3?.995:.97;function qo(e){const o=xe(ue(e));let n=Eo[0][1],t=1e9;for(const[,a]of Eo){const s=xe(ue(a)),f=Math.hypot(o[0]-s[0],2*(o[1]-s[1]),2*(o[2]-s[2]));f<t&&(t=f,n=a)}return n}const Ta=e=>xe(e)[0]>.8?e:[1,1,1];function La(e,o,n){const t=(e.dark-.5)*.5,a=r=>Math.max(.03,Math.min(.95,r));let s=[],f=null;if(e.mode==="tone"){const r=e.n;s=n(r).map((i,l)=>({kind:0,thr:a(i-t),hex:Mn[r][l]})),e.accent&&o.length&&(f=o[0],s.push({kind:3,hex:e.colors==="own"?o[0]:qo(o[0])}))}else s=o.slice(0,e.n).sort((d,i)=>xe(ue(i))[0]-xe(ue(d))[0]).map(d=>({kind:1,key:d,hex:e.colors==="own"?d:qo(d)})),s.push({kind:2,thr:a(Math.max(.5,n(2)[1])-t),hex:"#161616"});return e.manual.length===s.length&&s.forEach((r,d)=>{r.hex=e.manual[d]}),s.forEach(r=>{r.op=Ea(r.hex)}),s.map((r,d)=>d).filter(r=>s[r].kind!==3).slice(-3).forEach((r,d)=>{s[r].ch=d}),{layers:s,accKey:f}}const Gt=new Map;let nt=null,St=null,Uo=0;const no=e=>e?[...e.slice(0,7),e[9]??0]:null;function Ra(e,o){const n=no(e);return(!n||!St||n.length!==St.length||n.some((t,a)=>t!==St[a]))&&(St=n,Uo=o),!!n&&o-Uo>=Aa}let ve=null,wt=null,Xt=!1,ao=0;const it=document.createElement("canvas"),Ba=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:oo}):setTimeout(e,0)},Da=()=>ao;function Fa(e,o,n,t){const a=Ta(e.srcPaper),s=performance.now(),f=e.isLive?Ra(e.motion,s):!0,c=yn(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&f){const v=no(e.motion);(!nt||nt.scene!==e.scene||!v||!nt.cam||v.some((B,U)=>B!==nt.cam[U]))&&(!nt||s-nt.at>=oo)&&(Gt.clear(),nt={scene:e.scene,cam:v,at:s})}const r=v=>{const L=`${v}|${a.join(",")}|${e.bg.join(",")}`;let B=Gt.get(L);return B||(B=la(o,a,v,e.bg),Gt.set(L,B)),B},{layers:d,accKey:i}=La(e.s,c,r),l={layers:d,accKey:i,cut:n.cut,bridges:!!n.bridges,bridgeMm:n.bridgeMm,drips:n.drips,dripLen:n.dripLen,dripW:n.dripW,splat:n.splat,splatSize:n.splatSize,cloud:n.cloud,cloudMm:n.cloudMm,seed:t,printW:n.printW,srcPaper:a};if(!e.isLive)return{layers:d,accKey:i,maps:Lo(o,l),srcPaper:a};const x=JSON.stringify([d.map(v=>[v.kind,v.thr,v.key,v.ch]),i,l.cut,l.bridges,l.drips,l.splat,l.cloud,t,l.printW,a]),R=no(e.motion),g=!ve||ve.key!==x||ve.scene!==e.scene||!R||!ve.cam||R.some((v,L)=>v!==ve.cam[L]);if(g&&(f||!ve||ve.key!==x)&&!Xt&&(!ve||s-ve.at>=oo)){const v=Math.min(1,1024/Math.max(o.width,o.height)),L=Math.max(8,Math.round(o.width*v)),B=Math.max(8,Math.round(o.height*v));(it.width!==L||it.height!==B)&&(it.width=L,it.height=B),it.getContext("2d").drawImage(o,0,0,L,B),Xt=!0;const U=e.scene;ve&&(ve.at=s),Ba(()=>{Xt=!1,ve={key:x,maps:Lo(it,l),at:performance.now(),cam:R,scene:U},ao++})}return ve?f&&!g?{layers:d,accKey:i,maps:ve.maps,srcPaper:a}:((!wt||wt.src!==ve.maps)&&(wt={src:ve.maps,maps:{drip:null,bridge:null,cloud:ve.maps.cloud}},ao++),{layers:d,accKey:i,maps:wt.maps,srcPaper:a}):{layers:d,accKey:i,maps:null,srcPaper:a}}const Ca=2400,_a=240,bt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function We(e,o){const n=bt[e];n.push(o),n.length>Ca&&n.shift()}function Be(e,o,n){const t=bt[e].slice(-n);if(t.length===0)return null;const a=[...t].sort((s,f)=>s-f);return a[Math.min(a.length-1,Math.floor(o*a.length))]}function ho(e=_a){const o=bt.interval.slice(-e),n=o.length?o.reduce((t,a)=>t+a,0)/o.length:null;return{samples:o.length,fps:n?1e3/n:null,frameP50:Be("interval",.5,e),frameP95:Be("interval",.95,e),totalP50:Be("total",.5,e),totalP95:Be("total",.95,e),flatP50:Be("flat",.5,e),uploadP50:Be("upload",.5,e),uploadP95:Be("upload",.95,e),mipP50:Be("mip",.5,e),renderP50:Be("render",.5,e),backP50:Be("back",.5,e),bitmapWaitP50:Be("bitmapWait",.5,e),gpuP50:Be("gpu",.5,e),gpuP95:Be("gpu",.95,e)}}function cn(){for(const e of Object.keys(bt))bt[e].length=0}let lt=null,vt=null,Qe=null,He=null,Xe=null,un="",ro="";function fn(e){un=e}function Kt(e){ro=e,Qe&&(Qe.textContent=e,Qe.style.display=e?"block":"none")}function zo(e){Xe&&(Xe.disabled=e,Xe.style.opacity=e?".5":"1")}const Ne=(e,o=1)=>e===null?"–":e.toFixed(o),so=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function Na(e){if(!He)return;He.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const n=document.createElement("div");n.style.display="flex",n.style.gap="8px",n.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const a=document.createElement("button");a.textContent="Copiar",so(a),a.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((f,c)=>setTimeout(()=>c(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const s=document.createElement("button");s.textContent="Cerrar",so(s),s.onclick=()=>{He&&(He.textContent="")},n.append(a,s,t),He.append(o,n)}function Ia(e){lt||typeof document>"u"||(lt=document.createElement("div"),lt.setAttribute("data-superriso-overlay",""),Object.assign(lt.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),He=document.createElement("div"),He.style.pointerEvents="auto",Qe=document.createElement("div"),Object.assign(Qe.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Xe=document.createElement("button"),Xe.textContent="Medir",so(Xe),Xe.style.pointerEvents="auto",Xe.onclick=e,vt=document.createElement("div"),Object.assign(vt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),lt.append(He,Qe,Xe,vt),document.body.appendChild(lt),setInterval(()=>{if(!vt)return;const o=ho();vt.textContent=`${un}
fps ${Ne(o.fps)} · frame p50 ${Ne(o.frameP50)} p95 ${Ne(o.frameP95)} ms
SR p50 ${Ne(o.totalP50)} p95 ${Ne(o.totalP95)} ms (aplanado ${Ne(o.flatP50)} · subida ${Ne(o.uploadP50)} · mip ${Ne(o.mipP50)} · motor ${Ne(o.renderP50)} · vuelta ${Ne(o.backP50)})
GPU motor p50 ${Ne(o.gpuP50)} p95 ${Ne(o.gpuP95)} ms`,ro&&Qe&&(Qe.textContent=ro)},500))}const yt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function pn(e){return e&&yt?new OffscreenCanvas(1,1):document.createElement("canvas")}const vo=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,xo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},Ue=xo(),io=xo();function ct(e,o,n,t,a,s){const{canvas:f,ctx:c}=e;return(f.width!==n||f.height!==t)&&(f.width=n,f.height=t),c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.globalCompositeOperation="source-over",c.fillStyle=a,c.fillRect(0,0,n,t),c.globalCompositeOperation=s?"source-over":"multiply",c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="medium",c.drawImage(o,0,0,n,t),c.globalCompositeOperation="source-over",f}let Ae=null,Vt=!1,Oo=0;function ja(e,o,n){Oo++;const t=Oo;let a=null;if(Ae&&Ae.bmp.width===o&&Ae.bmp.height===n?a={bmp:Ae.bmp,lag:t-Ae.frame}:Ae&&Ae.bmp.close(),Ae=null,!Vt){Vt=!0;const s=performance.now();createImageBitmap(e).then(f=>{We("bitmapWait",performance.now()-s),Ae&&Ae.bmp.close(),Ae={bmp:f,frame:t}}).catch(()=>{}).finally(()=>{Vt=!1})}return a}function $a(){Ae&&Ae.bmp.close(),Ae=null}function rt(e,o,n,t,a,s,f){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!f,e.drawImage(o,0,0,n,t,0,0,a,s)}finally{e.restore()}}function Et(e,o,n,t,a,s,f){const c=vo(o)?o.transferToImageBitmap():null;try{rt(e,c??o,n,t,a,s,f)}finally{c?.close()}}const Ye=xo();let go=!1;function bo(e,o,n){const t=vo(e)?e.transferToImageBitmap():null;try{return(Ye.canvas.width!==o||Ye.canvas.height!==n)&&(Ye.canvas.width=o,Ye.canvas.height=n),Ye.ctx.globalCompositeOperation="copy",Ye.ctx.drawImage(t??e,0,0),go=!0,Ye.canvas}finally{t?.close()}}const At=()=>go?Ye.canvas:null,lo=()=>{go=!1},Tt=()=>({res:1,sim:!1,preview:0,lossless:G.lossless,pipe:0,hold:!1,holdFps:12});function mn(e,o,n){if(!G.auto)return{m:{res:G.resScale,sim:G.simUpload,preview:G.preview,lossless:G.lossless,pipe:G.pipe,hold:G.hold,holdFps:12},level:"manual"};const t=ba(e,o);return t!=="preview"?{m:Tt(),level:t}:n.fullQuality?{m:{...Tt(),hold:!0,holdFps:n.reprintFps||12},level:"preview·full"}:{m:{res:.75,sim:G.simUpload,preview:15,lossless:!0,pipe:1,hold:!1,holdFps:12},level:t}}const qa=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),pt={inks:null,params:null};function Lt(e,o,n,t){const{settings:a,isDarkMode:s,isPixelArt:f}=n,c=a.technique==="xerox",r=a.technique==="stencil",d=c?Hn(a.xerox,e*t.res,a.resolution):r?na(a.stencil,e*t.res,a.resolution):Un(a,e*t.res),i=Math.round(240*d.pxmm),l=Math.round(i*o/e),x=t.sim?Math.min(e,i):e,R=t.sim?Math.min(o,l):o,g=En(s,f),v=s&&!G.darkPaperFromBase,L=v?[1,1,1]:ue(g),B=c?Sn(a,n.shapes,n.hiddenLayers,L,v?g:null):null;B&&n.isLive&&wn({rows:B.rows,what:B.what,zones:B.zones});const U=B?{inks:B.paint,names:B.rows.map(u=>u.id??""),opac:[],srcPaper:L}:r?{inks:[],names:[],opac:[],srcPaper:L}:Pn(n.shapes,n.hiddenLayers,a,L,v?g:null,!0);n.isLive&&(pt.inks=U);const J=[e,o,+s,+f,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+G.mip,+G.offscreenBack,+G.preserveDrawingBuffer,+G.darkPaperFromBase,a.technique,...B?[a.resolution,JSON.stringify(a.xerox),(B.keys??[]).join(","),wa()]:r?[a.resolution,JSON.stringify(a.stencil),Da()]:[a.paper,a.screen,a.screenSize,a.imperfection,a.resolution],U.inks.join(",")].join("|"),H=B?{x:a.xerox,mk:B,isLive:n.isLive,motion:n.motion,scene:n.scene}:void 0,k=r?{s:a.stencil,settings:a,shapes:n.shapes,hidden:n.hiddenLayers,srcPaper:L,darkBase:v?g:null,bg:ue(g),isLive:n.isLive,motion:n.motion,scene:n.scene}:void 0;return{style:d,fw:x,fh:R,base:g,srcPaper:L,inks:U,key:J,xerox:H,stencil:k}}function ut(e){const o=e.stencil;if(o){const a=Fa(o,(o.isLive?Ue:io).canvas,e.style,1);return o.isLive&&An(a.layers.map(s=>({hex:s.hex,kind:s.kind}))),pt.params={...e.style,layers:a.layers,accKey:a.accKey,maps:a.maps,srcPaper:a.srcPaper}}const n=e.xerox;if(!n)return pt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=n.x.hand==="none"?null:Pa((n.isLive?Ue:io).canvas,n.mk,n.x,e.srcPaper,n.isLive,n.motion,n.scene);return pt.params={...e.style,markers:n.mk.paint,keys:n.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const Ft=e=>e%9999+1,kt=e=>Math.floor(performance.now()*e/1e3);function Rt(e){const o=e.settings.reprintFps;if(!o)return 0;const n=e.exportFrame;return n?Math.floor(n.index*o/n.fps):kt(o)}const Ze=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Bt=null;const Wo=()=>{Bt?.destroy(),Bt=null};function Ua(e,o,n,t,a){const s=performance.now(),f=t.exportFrame,c=!f||f.index===0,r=!f||f.index>=f.count-1;try{c&&Wo();const d=Bt??(Bt=tn(document.createElement("canvas"),a,{preserveDrawingBuffer:!0})),i=Tt(),l=Lt(o,n,t,i),x=ct(io,e.canvas,l.fw,l.fh,l.base,t.isDarkMode);return d.setSource(x,!0),d.render({...ut(l),seed:Ft(Rt(t))},Ze(i)),d.gl.isContextLost()?!1:(Et(e,d.canvas,d.width,d.height,o,n,!!l.style.crisp),mt&&console.info(`[SuperRiso] export frame ${f?`${f.index+1}/${f.count}`:"single"} ${o}×${n} → sim ${d.width}×${d.height}: ${(performance.now()-s).toFixed(1)} ms · ${d.lastVariants}`),!0)}finally{r&&Wo()}}const co=2e3,dn=8e3,uo=60,Go=8,at={...nn,simUpload:!0,auto:!1,lossless:!1},gt=e=>new Promise(o=>setTimeout(o,e)),Ke=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function za(){let o=tt.engineInfo()?.gl??null,n=null;if(o||(n=document.createElement("canvas"),o=n.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),a=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),s=String(o.getParameter(o.MAX_TEXTURE_SIZE));return n&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:a,maxTex:s}}function Oa(e,o){const n=e.s,t=n.frameP50!==null&&o!==null&&n.totalP50!==null?n.frameP50-o-n.totalP50:null,s=[[e.patch.pipe?"subida al inicio":"subida",n.uploadP50],["aplanado",n.flatP50],["mip",n.mipP50],["motor (CPU)",n.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",n.backP50]].filter(([,c])=>c!==null).sort((c,r)=>r[1]-c[1])[0],f=[];return s&&s[1]>=3&&f.push(`${s[0]} ${Ke(s[1])} ms`),t!==null&&t>=3&&f.push(`fuera de nuestras etapas ${Ke(t)} ms`),f.length?f.join(" + "):"sin espera apreciable"}async function Xo(e){const o=tt.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const n=performance.now();for(;performance.now()-n<8e3;){const s=o.report().find(f=>f.name==="SCAN");if(s&&s.n>=uo)break;await gt(100)}e==="timer"&&(await gt(300),o.poll());const t=o.report();o.setMode("off");const a=[...t].filter(s=>s.p50!==null).sort((s,f)=>f.p50-s.p50).map(s=>s.name);return{mode:e,lines:t.map(s=>`  ${s.name.padEnd(13)} ${`${s.info.w}×${s.info.h}`.padEnd(10)} att ${s.info.att}  p50 ${Ke(s.p50,3).padStart(7)} ms  #${a.indexOf(s.name)+1}  (n=${s.n})`)}}function Wa(e,o,n,t,a){const s=za(),f=e.find(d=>d.id==="A")?.s.frameP50??null,c=tt.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Tn} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${Q.canvasW}×${Q.canvasH} · simulación (última) ${c?`${c.width}×${c.height}`:"–"}`),r.push(`GPU: ${s.renderer} · MAX_TEXTURE_SIZE ${s.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${yt?"sí":"no"}`),r.push(`Modo ${Q.isDark?"oscuro":"claro"} · preset de cámara: ${Q.preset||"–"} (velocidad ${Q.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const d of n)r.push(`AVISO: ${d}`);r.push(`Cada fila: ${co/1e3} s de calentamiento descartados + ${dn/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const d of e){const i=d.s,l=R=>Ke(R,2).padStart(6),x=!d.patch.bypass&&i.frameP50!==null&&f!==null&&i.totalP50!==null?i.frameP50-f-i.totalP50:null;r.push(`${(d.id+" "+d.label).padEnd(20)}${Ke(i.fps).padStart(5)}  ${(Ke(i.frameP50)+"/"+Ke(i.frameP95)).padEnd(11)} |${l(i.totalP50)}${l(i.flatP50)} ${l(i.uploadP50)}${l(i.uploadP95)}${l(i.mipP50)}${l(i.renderP50)}${l(i.backP50)} |${l(x)}    |${l(i.gpuP50)}  ${d.res.padEnd(10)}  ${d.n.pipe}/${d.n.sync}/${d.n.held}  (n=${i.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const d of e)d.patch.bypass||r.push(`  ${d.id} ${d.label}: ${Oa(d,f)}`);for(const d of a)d&&(r.push(""),r.push(d.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, temporizador de GPU por pasada:`),d.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...d.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Ga(){if(Yt)return;const e=[],o=performance.now()-Q.lastCallAt;if(Q.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):Q.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,zo(!0);const n={...G},t=[],a=[];let s=!1,f="–",c=0;const r=async d=>{Kt(`Midiendo ${d.id} (${++c}/${Go})…`),Ut(d.patch),await gt(co),cn();const i={pipe:Q.pipeFrames,sync:Q.pipeSyncFrames,held:Q.heldFrames};await gt(dn);const l=ho(1/0);l.gpuP50!==null&&(s=!0);const x={pipe:Q.pipeFrames-i.pipe,sync:Q.pipeSyncFrames-i.sync,held:Q.heldFrames-i.held},R=tt.engineInfo(),g={id:d.id,label:d.label,res:d.patch.bypass||!R?"–":`${R.width}×${R.height}`,s:l,patch:d.patch,n:x};return t.push(g),g};try{await r({id:"A",label:"bypass",patch:{...nn,bypass:!0,auto:!1}});const d=await r({id:"B",label:".75 pipe1",patch:{...at,resScale:.75,pipe:1}}),i=await r({id:"C",label:".75 pipe2",patch:{...at,resScale:.75,pipe:2}}),l=(i.s.frameP50??1e9)<(d.s.frameP50??1e9)?2:1;f=`pipe${l} (${l===2?"C":"B"}: frame p50 ${Ke(l===2?i.s.frameP50:d.s.frameP50)} ms frente a ${Ke(l===2?d.s.frameP50:i.s.frameP50)})`,await r({id:"D",label:`.75 pipe${l} lossless`,patch:{...at,resScale:.75,pipe:l,lossless:!0}}),await r({id:"E",label:`.75 pipe${l} preview`,patch:{...at,resScale:.75,pipe:l,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${l} preview`,patch:{...at,resScale:1,pipe:l,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${l} hold`,patch:{...at,resScale:.75,pipe:l,hold:!0}}),Kt(`Midiendo P (${++c}/${Go})… perfilado por pasada`),Ut({...at,resScale:.75,pipe:1}),await gt(co),a.push(await Xo("sync")),a.push(await Xo("timer"))}finally{Ut(n),Kt(""),zo(!1),Yt=!1}Na(Wa(t,s,e,f,a))}const Xa=["greennoise1024","ink_black","ink_red","ink_lut"];let Ct=null,Dt=!1,fo=!1,se=null,we=pn(G.offscreenBack),Ko=G.preserveDrawingBuffer,Qt=0;const ko=(e,o)=>{Dt||(Dt=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))},Ka=e=>new Promise((o,n)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>n(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`});Promise.all(Xa.map(Ka)).then(([e,o,n,t])=>{Ct={green:e,exBlack:o,exRed:n,exLut:t}}).catch(e=>ko("textures",e));const hn=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===we&&(fo=!0,se=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===we&&(fo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};hn(we);const vn=()=>{const e=we;se=null,$a(),ye=null,je=null,ce=null,De=null,Ge=null,Ee=null,lo(),we=pn(G.offscreenBack),hn(we),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};tt.recreateEngine=vn;tt.engineInfo=()=>se?{gl:se.gl,width:se.width,height:se.height}:null;tt.profiler=()=>se?se.profiler:null;const xn=()=>[`pdb ${G.preserveDrawingBuffer?"on":"off"}`,`mip ${G.mip?"on":"off"}`,G.bitmapUpload?"bitmap":"",G.offscreenBack?yt?"offscreen":"offscreen→DOM":"",G.bypass?"BYPASS":""].filter(Boolean).join(" · ");mt&&(Ia(()=>{Ga()}),fn(`SUPER RISO · ${xn()}`),window.__superRiso={KNOBS:G,snapshot:ho,reset:cn,live:Q,qualityReport:ka,isSuperRisoPreviewDevice:Ln,get lastChange(){return rn},get inks(){return pt.inks},get params(){return pt.params},get engine(){return se},get disabled(){return Dt},get glCanvas(){return we},get flat(){return Ue.canvas}});function yo(){return se&&(Ko!==G.preserveDrawingBuffer||vo(we)!==(G.offscreenBack&&yt))&&vn(),se||(se=tn(we,Ct,{preserveDrawingBuffer:G.preserveDrawingBuffer}),Ko=G.preserveDrawingBuffer),se}let Fe=0,ye=null,je=null,ce=null,De=null;const ae={begin:0,upload:0,mip:0,render:0,backBegin:0};let Ge=null,Ee=null;const gn=()=>Dt||fo||!Ct||G.bypass;function Qa(e,o,n){if(!n.isLive||(Fe++,je=null,ae.begin=0,ae.upload=0,ae.mip=0,ae.render=0,ae.backBegin=0,gn()))return;const{m:t}=mn(e,o,n.settings);if(!t.pipe||De)return;const a=performance.now();try{const s=Lt(e,o,n,t);if(t.pipe===2){Va(s,t,Rt(n),a);return}if(!ye||ye.key!==s.key||ye.frame!==Fe-1){ye=null;return}const f=kt(t.holdFps);if(t.hold&&ce&&ce.key===s.key&&ce.tick===f&&At())return;const c=yo();c.setSource(Ue.canvas,G.mip);const r=performance.now();c.render({...ye.params,seed:Ft(Rt(n))},Ze(t));const d=performance.now();if(ye=null,c.gl.isContextLost())return;je={key:s.key,frame:Fe,ew:c.width,eh:c.height,crisp:!!s.style.crisp,tick:f},ae.upload=c.lastUploadMs,ae.mip=c.lastMipMs,ae.render=d-r,ae.begin=d-a}catch(s){se=null,ko("exception in beginSuperRisoFrame",s)}}function Va(e,o,n,t){const a=kt(o.holdFps);if(Ge&&Ge.frame===Fe-1&&Ge.key===e.key&&se){const r=performance.now();se.present(),bo(we,Ge.ew,Ge.eh),ae.backBegin=performance.now()-r,Ee={...Ge,frame:Fe}}if(Ge=null,!ye||ye.key!==e.key||ye.frame!==Fe-1){ye=null,ae.begin=performance.now()-t;return}if(o.hold&&Ee&&Ee.key===e.key&&Ee.tick===a){ae.begin=performance.now()-t;return}const s=yo();s.setSource(Ue.canvas,G.mip);const f=performance.now();s.render({...ye.params,seed:Ft(n)},Ze(o,!0));const c=performance.now();ye=null,!s.gl.isContextLost()&&(Ge={key:e.key,frame:Fe,tick:a,ew:s.width,eh:s.height,crisp:!!e.style.crisp},ae.upload=s.lastUploadMs,ae.mip=s.lastMipMs,ae.render=c-f,ae.begin=c-t)}function Ht(e,o,n,t,a,s,f,c,r){if(t.hold){const d=bo(we,s,f);ce={key:a,tick:r,ew:s,eh:f,crisp:c},rt(e,d,s,f,o,n,c)}else Et(e,we,s,f,o,n,c)}function xt(e,o,n,t,a,s=!1){const f=yo(),c=performance.now(),r=G.bitmapUpload?ja(o,e.fw,e.fh):null,d=performance.now()-c;r?(f.setSource(r.bmp,G.mip),r.bmp.close(),Q.bitmapLagFrames=r.lag):f.setSource(o,G.mip);const i=performance.now();return f.render({...n,seed:Ft(t)},a),s&&f.profiler.timerAvailable?jo(Q.canvasW,Q.canvasH,f.gpuMs===null?null:f.gpuMs+performance.now()-c,"GPU"):s&&(f.finish(),jo(Q.canvasW,Q.canvasH,performance.now()-c,"readback")),ae.upload+=f.lastUploadMs+d,ae.mip+=f.lastMipMs,ae.render+=performance.now()-i,f}function Ha(e,o,n,t){const a=performance.now(),{isDarkMode:s,isLive:f,info:c}=t;if(f&&(mt&&Qt>0&&We("interval",a-Qt),Qt=a,Q.lastCallAt=a,Q.isDark=s,Q.canvasW=o,Q.canvasH=n,Q.preset=c.preset,Q.speed=c.speed,Q.offscreenFallback=G.offscreenBack&&!yt),gn())return!1;try{if(!f)return Ua(e,o,n,t,Ct);const{m:r,level:d}=mn(o,n,t.settings),i=Rt(t),l=Lt(o,n,t,r);Q.level=d,ce&&(ce.key!==l.key||!r.hold)&&(ce=null,De||lo());const x=ya(t.motion,t.scene,a);let R=a,g=a;const v=(k,u=r)=>{if(Q.lastPath=k,!mt)return!0;const m=performance.now();return We("flat",R-a),We("upload",ae.upload),We("mip",ae.mip),We("render",ae.render),We("back",ae.backBegin+(m-g)),We("total",ae.begin+(m-a)),se&&se.gpuMs!==null&&We("gpu",se.gpuMs),fn(`SUPER RISO · ${d} · ${o}×${n} → sim ${se?`${se.width}×${se.height}`:"–"} · src ${l.fw}×${l.fh} · ${qa(u)} · ${xn()} · ${k}`),!0};if(d==="detect"){const k=ct(Ue,e.canvas,l.fw,l.fh,l.base,s);R=performance.now();const u=xt(l,k,ut(l),i,Ze(r),!0);return u.gl.isContextLost()?!1:(g=performance.now(),Et(e,we,u.width,u.height,o,n,!!l.style.crisp),v("detect"))}if(d==="preview"&&x>=ga){const k=Tt(),u=Lt(o,n,t,k);ye=null,je=null,ce=null;const m=At();if(De&&De.key===u.key&&De.tick===i&&m)return g=performance.now(),rt(e,m,De.ew,De.eh,o,n,De.crisp),Q.heldFrames++,v("refined",k);const P=ct(Ue,e.canvas,u.fw,u.fh,u.base,s);R=performance.now();const C=xt(u,P,ut(u),i,Ze(k));if(C.gl.isContextLost())return!1;g=performance.now();const O=bo(we,C.width,C.height);return De={key:u.key,tick:i,ew:C.width,eh:C.height,crisp:!!u.style.crisp},rt(e,O,C.width,C.height,o,n,De.crisp),v("refine",k)}De&&(De=null,lo());const L=()=>r.hold&&ce&&ce.key===l.key?At():null;if(r.pipe===2){const k=ct(Ue,e.canvas,l.fw,l.fh,l.base,s);R=performance.now();const u=ut(l);ye={key:l.key,frame:Fe,params:u},g=performance.now();const m=At();if(Ee&&Ee.key===l.key&&m&&(Ee.frame===Fe||r.hold))return rt(e,m,Ee.ew,Ee.eh,o,n,Ee.crisp),Ee.frame===Fe?Q.pipeFrames++:Q.heldFrames++,v(Ee.frame===Fe?"pipe2":"held");Ee=null;const P=xt(l,k,u,i,Ze(r));return P.gl.isContextLost()?!1:(g=performance.now(),Et(e,we,P.width,P.height,o,n,!!l.style.crisp),Q.pipeSyncFrames++,v("sync"))}if(r.pipe){const k=ct(Ue,e.canvas,l.fw,l.fh,l.base,s);R=performance.now();const u=ut(l);if(ye={key:l.key,frame:Fe,params:u},g=performance.now(),je&&je.key===l.key&&je.frame===Fe)return Ht(e,o,n,r,l.key,je.ew,je.eh,je.crisp,je.tick),Q.pipeFrames++,v("pipe");const m=L();if(m&&ce)return rt(e,m,ce.ew,ce.eh,o,n,ce.crisp),Q.heldFrames++,v("held");const P=xt(l,k,u,i,Ze(r));return P.gl.isContextLost()?!1:(g=performance.now(),Ht(e,o,n,r,l.key,P.width,P.height,!!l.style.crisp,kt(r.holdFps)),Q.pipeSyncFrames++,v("sync"))}const B=kt(r.holdFps),U=L();if(U&&ce&&ce.tick===B)return rt(e,U,ce.ew,ce.eh,o,n,ce.crisp),Q.heldFrames++,v("held");const J=ct(Ue,e.canvas,l.fw,l.fh,l.base,s);R=performance.now();const H=xt(l,J,ut(l),i,Ze(r));return H.gl.isContextLost()?!1:(g=performance.now(),Ht(e,o,n,r,l.key,H.width,H.height,!!l.style.crisp,B),v("sync"))}catch(r){return se=null,ko("exception in applySuperRiso",r),!1}}export{Ha as applySuperRiso,Qa as beginSuperRisoFrame};
