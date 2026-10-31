import{l as Fe,h as me,r as tt,o as Me,M as nt,p as To,s as Zt,x as ya,a as Ma,b as Sa,c as wa,d as Pa,A as Aa,i as Ea}from"./xeroxMarkers-CYLCB51o.js";import{c as Ta,S as La,d as Ra,e as Lo,f as Ba}from"./transformUtils-122A1ysi.js";const Fa=17.2,Da=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,je=`#version 300 es
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
`,Zo=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ke=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,ot=je+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Ca=je+Ke+`
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
  oA=A; oB=B; }`,_a=je+`
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
}`,Na=je+Ke+`
uniform sampler2D uPrep, uSetA, uSetB; uniform int uN; uniform float uMinDot;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 c=clamp(texture(uPrep,uv).rgb,0.,1.)*32.;
  float z0=min(floor(c.b),31.), fz=c.b-z0;
  vec2 q0=vec2(z0*33.+c.r+.5, c.g+.5)/vec2(1089.,33.), q1=vec2((z0+1.)*33.+c.r+.5, c.g+.5)/vec2(1089.,33.);
  vec4 A=mix(texture(uSetA,q0),texture(uSetA,q1),fz), B=mix(texture(uSetB,q0),texture(uSetB,q1),fz);
  // tonos muy bajos: la trama no sujeta el punto y se pierden, pero sin escalón
  A*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),A); B*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),B);
  oA=A; oB=B;
}`,Ia=je+Ke+`
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
  oA=A; oB=B; }`,ja=je+Ke+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,$a=je+Ke+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,mo=je+po+Ke+`
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
}`,Jo=je+po+Ke+`
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
  oA=A; oB=B; }`,qa=je+po+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,ea=je+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,Ua={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,fill:1,single:.035,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Ro={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},za={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},Ee=(e,o,a)=>e+(o-e)*a;function ho(e,o){return{printW:240,pxmm:o*Ee(.4,1,e)/240,crisp:e<.5,scanBlur:Ee(1,.65,e),scanNoise:Ee(.6,.35,e)}}function Oa(e,o){const a=Object.assign({},za,e),t=a.imperfection,n=a.resolution,i=a.screenSize;return Object.assign({...ho(n,o),screen:a.screen==="dots"?1:0,grain:Ee(.09,.3,i),lpi:Math.round(Ee(120,45,i)),misreg:.04+.6*Math.pow(t,1.6),rot:Ee(.01,.1,t),scl:Ee(.2,1.2,t),edge:Ee(.2,.65,t),voids:Ee(.05,.4,t),texAmp:Ee(.5,1.05,t),starve:Ee(.05,.4,t),mottle:Ee(.3,1.2,t),bleed:Ee(.04,.07,t),inkLoad:Ee(.75,.5,t)},Ro[a.paper]||Ro.natural)}function Wa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,i=[],f=[];let c=0;const r=new Uint8Array(4),m=(s,l)=>{let v=t.get(s);v||(v=[],t.set(s,v)),v.push(l)};return{get mode(){return a},timerAvailable:!!o,setMode(s){a=s==="timer"&&!o?"off":s,t.clear(),n.clear(),i.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),c=performance.now()),a==="timer"&&this.poll()},before(s,l){if(n.has(s)||(n.set(s,l),i.push(s)),a!=="timer"||!o)return null;const v=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,v),v},after(s,l){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const v=performance.now();m(s,v-c),c=v}else l&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),f.push({name:s,q:l}))},poll(){if(o)for(;f.length&&e.getQueryParameter(f[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:s,q:l}=f.shift();e.getParameter(o.GPU_DISJOINT_EXT)||m(s,e.getQueryParameter(l,e.QUERY_RESULT)/1e6),e.deleteQuery(l)}},report(){return i.map(s=>{const l=[...t.get(s)??[]].sort((v,A)=>v-A);return{name:s,p50:l.length?l[Math.floor(l.length/2)]:null,n:l.length,info:n.get(s)}})}}}const Ga=ot+`
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
  o=vec4(d,0.,0.,1.); }`,Xa=ot+`
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
  o=vec4(on,0.,0.,1.); }`,Ka=ot+Zo+Ke+`
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
  oA=A; oB=B; }`,Va=ot+`
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
      // el final contra el contorno sigue la forma EN ESTE PÍXEL (no solo en el eje del trazo): en contornos curvos u oblicuos el corte
      // a escuadra de cada pasada dibujaba una escalera del ancho del rotulador. Se conserva un 10 % del corte biselado (carácter de punta)
      // y el mismo pasarse/quedarse corto de cada pasada.
      vec2 gp=vec2(mkA(i,p+vec2(.6,0.))-mkA(i,p-vec2(.6,0.)), mkA(i,p+vec2(0.,.6))-mkA(i,p-vec2(0.,.6)))/1.2;
      float eP=(mkA(i,p)-thr)/max(length(gp),.025)+(h12(vec2(k*1.7+j,fi+6.1))-.42)*2.6*uSlop+(vnoise(p/1.1+fi*3.7)-.5)*.35*(.4+uSlop);
      float eF=mix(eM+sk, eP, .9), eB=mix(eM-sk, eP, .9);
      float ea=min(u-s0+sk, g>=0.? eF : 1e3), eb=min(s1-u-sk, g<0.? eB : 1e3);   // fuera de la zona (m<umbral) siempre queda fuera
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
  o=vec4(T,1.); }`,Ya=ot+`
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,Qa=ot+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Ha={tech:"xerox",printW:240,pxmm:11.8,seed:1,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},Se=(e,o,a)=>e+(o-e)*a;function Za(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:Ta[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:Se(.1,1,o),scratch:Se(0,.7,o),prints:Se(0,.45,o),smear:Se(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:Se(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:Se(.05,1,o),fog:Se(.05,1,o),streak:Se(0,.8,o),band:Se(.1,.8,o),hollow:Se(.2,.7,o),grain:Se(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:Se(.1,2.2,a),sloppy:Se(.25,1.2,a),wobble:Se(.2,.9,a),cover:Se(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function Ja(e,o,a){return{...ho(a,o),...Object.assign(Za(e),e.fine),tech:"xerox"}}function en(e){const{gl:o}=e;let a=null,t=null,n=0,i=0;const f=o.createTexture();let c;const r=o.createTexture();let m,s=null;const l=()=>{if(!s){s=document.createElement("canvas"),s.width=s.height=1;const b=s.getContext("2d");b.fillStyle="rgb(255,128,0)",b.fillRect(0,0,1,1)}return s};function v(b,g){if(a||(a={xlum:e.compile(Ga),xgen:e.compile(Xa),xid:e.compile(Ka),xcolor:e.compile(Va),xcomp:e.compile(Qa),xdirt:e.compile(Ya)}),t&&b===n&&g===i)return;t&&Object.values(t).forEach(e.freeTarget),n=b,i=g;const C=Math.max(1,b>>2),w=Math.max(1,g>>2);t={xa:e.target(b,g),xb:e.target(b,g),xc:e.target(b,g),xq1:e.target(C,w,2),xq2:e.target(C,w,2),xs:e.target(C,w)}}function A(b,g,C,w,z,H,ee,k,M=!1){v(H,ee);const u=Object.assign({},Ha,b),L=t,P=a,B=H/u.printW,J=(u.markers||[]).slice(0,6),_=u.hand>0?J.length:0,j=[];for(let x=0;x<6;x++)j.push(...Fe(me(J[x]||"#ffffff")));const N=(u.keys&&u.keys.length?u.keys:J).slice(0,6),oe=[];for(let x=0;x<6;x++)oe.push(...Fe(me(N[x]||J[x]||"#ffffff")));u.regionMap&&u.regionMap!==m&&(e.texFrom(u.regionMap,{filter:o.NEAREST},r),m=u.regionMap),!u.regionMap&&m!==null&&(e.texFrom(l(),{filter:o.NEAREST},r),m=null);const V=tt(u.seed*4241+7),ae=[];for(let x=0;x<6;x++){const d=V()*Math.PI*2,R=u.offset*(.35+.65*V());ae.push(Math.cos(d)*R,Math.sin(d)*R)}u.orientMap&&u.orientMap!==c&&(e.texFrom(u.orientMap,{filter:o.NEAREST},f),c=u.orientMap),!u.orientMap&&c!==null&&(e.texFrom(l(),{filter:o.NEAREST},f),c=null);const Pe=u.regionMap?1:0,I=Fe(me(u.paper)),D=Fe(u.srcPaper||[1,1,1]),F=(x,d,R,$)=>e.run(x,d,R,E=>{E.f("uOff",0,0),E.f("uImg",H,ee),$(E)});F("PREP",e.PR.prep,g.prep,x=>{x.t("uSrc",C),x.f("uSrcRes",w,z),x.f("uSmoothPx",u.smooth*w/u.printW),x.f("uSrcPaper",...u.srcPaper||[1,1,1]),x.f("uPaper",1,1,1)}),F("XLUM",P.xlum,L.xa,x=>{x.f("uPxMm",B),x.t("uPrep",g.prep.t[0]),x.f("uDark",u.dark),x.f("uSoft",u.soft),x.f("uMotion",u.motion),x.f("uPhoto",u.photo),x.f("uLpi",u.lpi),x.f("uLid",u.lid)});const y=(x,d,R,$,E,T)=>F(`BLUR ${x}`,e.PR.blur,R,q=>{q.t("uTexA",d.t[0]),q.t("uTexB",d.t[d.t.length>1?1:0]),q.f("uDir",$,E),q.f("uSig",T)}),K=M?1:Math.max(1,Math.round(u.gens));for(let x=1;x<=K;x++){const d=Math.max(.05,u.genSpread*B*(x===1?.6:1));y(`gen${x} H`,L.xa,L.xb,1,0,d),y(`gen${x} V`,L.xb,L.xc,0,1,d),F(`XGEN ${x}`,P.xgen,L.xa,R=>{R.f("uPxMm",B),R.f("uSeed",u.seed),R.t("uD",L.xc.t[0]),R.t("uGreen",e.greenTex),R.f("uThr",u.thr),R.f("uGrain",u.grain),R.f("uDust",u.dust),R.f("uFog",u.fog),R.f("uStreak",u.streak),R.f("uGen",x)})}F("XDIRT",P.xdirt,L.xb,x=>{x.f("uPxMm",B),x.f("uSeed",u.seed),x.t("uD",L.xa.t[0]),x.f("uHair",u.hairs),x.f("uScratch",u.scratch),x.f("uPrint",u.prints),x.f("uSmear",u.smear)});const Z=L.xb;y("sol ¼ H",Z,g.qtmp,1,0,1.1*B/4),y("sol ¼ V",g.qtmp,L.xs,0,1,1.1*B/4);const Y=_>0;if(Y){y("ps ¼ H",g.prep,g.qtmp,1,0,Math.max(.3,.12*B/4)),y("ps ¼ V",g.qtmp,L.xq1,0,1,Math.max(.3,.12*B/4)),F("XID",P.xid,L.xq2,d=>{d.t("uPS",L.xq1.t[0]),d.fv("uKey",oe,3),d.t("uIdMap",r),d.i("uUseMap",Pe),d.i("uNk",_),d.f("uSrcPaperL",...D),d.f("uMinL",.32),d.f("uPxMm",B),d.f("uVoteMm",u.colorSmooth)});const x=u.hand===1?Math.max(1.5,.8*B/4):Math.max(.3,u.sloppy*B/4);y("mask H",L.xq2,g.qtmp,1,0,x),y("mask V",g.qtmp,L.xq1,0,1,x),F("XCOLOR",P.xcolor,L.xc,d=>{d.f("uPxMm",B),d.f("uSeed",u.seed),d.t("uMA",L.xq1.t[0]),d.t("uMB",L.xq1.t[1]),d.fv("uMk",j,3),d.i("uNk",_),d.i("uMed",u.hand),d.fv("uCOff",ae,2),d.f("uWobble",u.wobble),d.f("uCover",u.cover),d.f("uStroke",u.stroke),d.f("uAng",u.strokeAng*Math.PI/180),d.f("uOverlap",u.overlap),d.f("uStrength",u.strength),d.f("uSlop",u.slop),d.f("uDry",u.dry),d.f("uFast",u.fast),c===void 0&&(e.texFrom(l(),{filter:o.NEAREST},f),c=null),d.t("uOri",f),d.f("uSheetMm",H/B,ee/B),d.f("uWobMm",u.wobMm),d.f("uGran",u.gran),d.f("uDryB",u.dryB),d.f("uBloom",u.bloom)})}F("XCOMP",P.xcomp,g.comp,x=>{x.f("uPxMm",B),x.t("uD",Z.t[0]),x.t("uSolX",L.xs.t[0]),x.f("uTonerK",u.tonerK),x.t("uC",L.xc.t[0]),x.t("uFib",e.fibTex),x.f("uPaper",...I),x.f("uHollow",u.hollow),x.f("uBand",u.band),x.f("uPaperTex",u.paperTex),x.f("uFibers",u.fibers),x.f("uHasColor",Y?1:0)}),F("SCAN",e.PR.scan,k?g.out:null,x=>{x.f("uSeed",u.seed),x.t("uComp",g.comp.t[0]),x.f("uBlurPx",u.scanBlur),x.f("uNoise",u.scanNoise),x.i("uNorm",0),x.f("uPaper",...I)})}return{render:A}}const tn=ot+Zo+Ke+`
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
  oA=A; oB=B; }`,on=ot+`
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
    float cv=sprayCov(dens,mm,fk)*(1.-pore*.9*(1.-smoothstep(.45,.9,dens))*(1.-drip));   // la pintura cargada rellena los poros; solo asoman con poca carga (niebla, bordes)
    C=mix(C, uLc[k]*mix(1.,.85,drip), cv*uOp[k]); } }
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,an={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Ue=(e,o,a)=>e+(o-e)*a;function nn(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:La[e.sup];return{cut:Ue(.3,4,Math.pow(e.cut,1.5)),facet:Ue(.3,1.1,o),misreg:Ue(0,2.2,o),lift:e.lift,liftMm:Ue(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Ue(.72,1.25,e.load),mist:Ue(.2,.85,o),drop:Ue(.4,3,e.dropSize),drips:e.drips,dripLen:Ue(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Ue(0,1.5,e.supTex),smooth:.12}}function rn(e,o,a){return{...ho(a,o),...nn(e),tech:"stencil"}}const ta=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),oa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let qt=null;const Jt=2048;function sn(){if(qt)return qt;const e=Jt,o=new Float32Array(e*e).fill(2),a=tt(7),t=()=>{let b=0;for(;!b;)b=a();return Math.sqrt(-2*Math.log(b))*Math.cos(6.2832*a())};let n=0;const i=4.6*e*e;for(;n<i;){const b=a()<.07,g=Math.min(16,Math.max(.6,(b?5.5:2.6)*Math.exp(.45*t()))),C=a(),w=a()*e,z=a()*e,H=Math.floor(w),ee=Math.floor(z),k=Math.ceil(g),M=g*g;for(let u=-k;u<=k;u++){const L=ee+u+.5-z;if(L*L>M)continue;const P=((ee+u)%e+e)%e*e;for(let B=-k;B<=k;B++){const J=H+B+.5-w;if(J*J+L*L>M)continue;const _=P+((H+B)%e+e)%e;C<o[_]&&(o[_]=C)}}n+=Math.PI*M}const f=4096,c=new Uint32Array(f);let r=0;for(let b=0;b<e*e;b++)o[b]<2&&(c[Math.min(f-1,o[b]*f|0)]++,r++);const m=new Float32Array(f);let s=0;for(let b=0;b<f;b++)s+=c[b],m[b]=s/r;const l=document.createElement("canvas");l.width=l.height=e;const v=l.getContext("2d"),A=v.createImageData(e,e);for(let b=0;b<e*e;b++){const g=o[b]<2?m[Math.min(f-1,o[b]*f|0)]*.985:1,C=Math.round(g*255);A.data[b*4]=A.data[b*4+1]=A.data[b*4+2]=C,A.data[b*4+3]=255}return v.putImageData(A,0,0),qt=l,l}function St(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let i=e;const f=new Float32Array(e.length);for(let c=0;c<3;c++){for(let r=0;r<a;r++){let m=0;const s=r*o;for(let l=-n;l<=n;l++)m+=i[s+Math.min(o-1,Math.max(0,l))];for(let l=0;l<o;l++)f[s+l]=m/(2*n+1),m+=i[s+Math.min(o-1,l+n+1)]-i[s+Math.max(0,l-n)]}for(let r=0;r<o;r++){let m=0;for(let s=-n;s<=n;s++)m+=f[Math.min(a-1,Math.max(0,s))*o+r];for(let s=0;s<a;s++)i=i===e?new Float32Array(e.length):i,i[s*o+r]=m/(2*n+1),m+=f[Math.min(a-1,s+n+1)*o+r]-f[Math.max(0,s-n)*o+r]}}return i}function ln(e,o,a){const t=(s,l)=>{let v=s*374761393+l*668265263+a*982451653|0;return v=(v^v>>>13)*1274126177|0,((v^v>>>16)>>>0)/4294967296},n=Math.floor(e),i=Math.floor(o),f=e-n,c=o-i,r=f*f*(3-2*f),m=c*c*(3-2*c);return(t(n,i)*(1-r)+t(n+1,i)*r)*(1-m)+(t(n,i+1)*(1-r)+t(n+1,i+1)*r)*m}function cn(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),i=document.createElement("canvas");i.width=t,i.height=n;const f=i.getContext("2d",{willReadFrequently:!0});return f.fillStyle="#fff",f.fillRect(0,0,t,n),f.drawImage(e,0,0,t,n),{D:f.getImageData(0,0,t,n).data,w:t,h:n,sp:Fe(o).map(c=>Math.max(c,.02))}}const un=.04;function fn(e,o,a,t=null){const{D:n,w:i,h:f,sp:c}=cn(e,o),r=new Float64Array(256),m=new Float64Array(256),s=t?Me(t):null;let l=0;for(let k=0;k<i*f;k++){const M=Me([0,1,2].map(P=>oa(Math.min(1,ta(n[k*4+P]/255)/c[P])))),u=Math.max(0,Math.min(1,1-M[0]+.3*Math.hypot(M[1],M[2]))),L=Math.min(255,u*256|0);if(m[L]++,s){const P=Me([n[k*4]/255,n[k*4+1]/255,n[k*4+2]/255]);if(Math.hypot(P[0]-s[0],P[1]-s[1],P[2]-s[2])<un)continue}r[L]++,l++}l<i*f*.05&&r.set(m);{let k=0,M=0;for(let u=0;u<256;u++)k+=r[u],u>=20&&(M+=r[u]);if(M>k*.05)for(let u=0;u<20;u++)r[u]=0}const v=64,A=new Float64Array(v);for(let k=0;k<256;k++)A[k>>2]+=r[k];const b=new Float64Array(v+1),g=new Float64Array(v+1);for(let k=0;k<v;k++)b[k+1]=b[k]+A[k],g[k+1]=g[k]+A[k]*(k+.5)/v;const C=(k,M)=>{const u=b[M]-b[k];return u>0?(g[M]-g[k])*(g[M]-g[k])/u:0};let w=-1,z=[];const H=new Array(a).fill(0),ee=(k,M,u)=>{if(k===a){const L=u+C(M,v);L>w&&(w=L,z=H.slice());return}for(let L=M+1;L<=v-(a-k);L++)H[k]=L,ee(k+1,L,u+C(M,L))};return ee(0,0,0),z.map(k=>Math.max(.04,Math.min(.95,k/v)))}function Bo(e,o){const a=o.printW||210,t=o.seed|0,n=tt(t*7919+5),i=o.layers||[],f=()=>{let d=0;for(;!d;)d=n();return Math.sqrt(-2*Math.log(d))*Math.cos(6.2832*n())},c=e.width,r=e.height,m=Math.min(1,1024/Math.max(c,r)),s=Math.max(8,Math.round(c*m)),l=Math.max(8,Math.round(r*m)),v=s*l,A=a/s,b=document.createElement("canvas");b.width=s,b.height=l;const g=b.getContext("2d",{willReadFrequently:!0});g.fillStyle="#fff",g.fillRect(0,0,s,l),g.drawImage(e,0,0,s,l);const C=g.getImageData(0,0,s,l).data,w=Fe(o.srcPaper||[1,1,1]).map(d=>Math.max(d,.02)),z=new Float32Array(v*3);for(let d=0;d<v;d++){const R=[0,1,2].map(E=>oa(Math.min(1,ta(C[d*4+E]/255)/w[E]))),$=Me(R);z[d*3]=$[0],z[d*3+1]=$[1],z[d*3+2]=$[2]}const H=(d,R)=>{const $=(R[0]-z[d*3])*.6,E=R[1]-z[d*3+1],T=R[2]-z[d*3+2];return $*$+E*E+T*T},ee=Math.max(.3,(o.cut||1)*.5/A),k=new Float32Array(v);for(let d=0;d<v;d++)k[d]=Math.max(0,Math.min(1,1-z[d*3]+.3*Math.hypot(z[d*3+1],z[d*3+2])));const M=St(k,s,l,ee),u=o.accKey?Me(me(o.accKey)):null;let L=null;if(u){const d=new Float32Array(v);for(let R=0;R<v;R++)d[R]=H(R,u)<.045&&Math.hypot(z[R*3+1],z[R*3+2])>.06?1:0;L=St(d,s,l,ee)}const P=i.map(d=>d.kind===1&&d.key?Me(me(d.key)):null),B=i.map((d,R)=>{const $=new Uint8Array(v);if(d.kind===3){if(L)for(let E=0;E<v;E++)$[E]=L[E]>.5?1:0;return $}if(d.kind===1){const E=new Float32Array(v),T=P[R],q=Math.hypot(T[1],T[2]);for(let U=0;U<v;U++){const W=H(U,T);if(W>.06||q>.06&&Math.hypot(z[U*3+1],z[U*3+2])<.5*q)continue;let G=!0;for(let h=0;h<P.length;h++)if(h!==R&&P[h]&&H(U,P[h])<W){G=!1;break}E[U]=G?1:0}const S=St(E,s,l,ee);for(let U=0;U<v;U++)$[U]=S[U]>.5?1:0;return $}for(let E=0;E<v;E++)$[E]=M[E]>d.thr&&!(L&&L[E]>.5)?1:0;return $}),J=3072/Math.max(s,l),_=Math.round(s*J),j=Math.round(l*J),N=_/a,oe=()=>{const d=document.createElement("canvas");d.width=_,d.height=j;const R=d.getContext("2d");return R.fillStyle="#000",R.fillRect(0,0,_,j),R.globalCompositeOperation="lighter",[d,R]},V=["#ff0000","#00ff00","#0000ff"];let ae=null;if(o.bridges){const[d,R]=oe();ae=d;const $=(o.bridgeMm||.9)*N;R.lineCap="butt";const E=new Int32Array(v),T=new Int32Array(v),q=new Int32Array(v).fill(-1),S=new Int32Array(v),U=new Int32Array(v);i.forEach((W,G)=>{if(W.ch==null||W.ch<0)return;const h=B[G];E.fill(-1);let Q=0;const ne=[];for(let fe=0;fe<v;fe++){if(h[fe]||E[fe]>=0)continue;let se=0;T[se++]=fe,E[fe]=Q;const Ae=[];let Ve=!1;for(;se;){const te=T[--se];Ae.push(te);const Ne=te%s,p=te/s|0;(Ne===0||p===0||Ne===s-1||p===l-1)&&(Ve=!0),Ne>0&&!h[te-1]&&E[te-1]<0&&(E[te-1]=Q,T[se++]=te-1),Ne<s-1&&!h[te+1]&&E[te+1]<0&&(E[te+1]=Q,T[se++]=te+1),p>0&&!h[te-s]&&E[te-s]<0&&(E[te-s]=Q,T[se++]=te-s),p<l-1&&!h[te+s]&&E[te+s]<0&&(E[te+s]=Q,T[se++]=te+s)}!Ve&&Ae.length*A*A>=.6&&ne.push([Q,Ae]),Q++}R.strokeStyle=V[W.ch],R.lineWidth=$;const de=Math.round(12/A);let he=0;for(const[fe,se]of ne.slice(0,600)){const Ae=se.length*A*A,Ve=Ae<40?1:Ae<400?2:3,te=[],Ne=se.filter(re=>{const xe=re%s;return xe>0&&h[re-1]||xe<s-1&&h[re+1]||h[re-s]||h[re+s]}),p=Math.sqrt(se.length)*.75;for(let re=0;re<Ve;re++){he++;const xe=[];let De=0;for(const ge of Ne)te.some(vt=>Math.hypot(vt%s-ge%s,(vt/s|0)-(ge/s|0))<p)||(q[ge]=he,S[ge]=-1,U[ge]=0,xe.push(ge));let pe=-1;for(;De<xe.length;){const ge=xe[De++],vt=ge%s,Eo=ge/s|0;if(U[ge]>de)break;for(const $e of[vt>0?ge-1:-1,vt<s-1?ge+1:-1,Eo>0?ge-s:-1,Eo<l-1?ge+s:-1])if(!($e<0||q[$e]===he)){if(!h[$e]){if(E[$e]!==fe){S[$e]=ge,pe=$e;break}continue}q[$e]=he,S[$e]=ge,U[$e]=U[ge]+1,xe.push($e)}if(pe>=0)break}if(pe<0)break;let ce=pe;for(;S[ce]>=0&&h[S[ce]];)ce=S[ce];const lt=S[ce]>=0?S[ce]:ce;te.push(lt);const Nt=(lt%s+.5)/s*_,It=((lt/s|0)+.5)/l*j,jt=(pe%s+.5)/s*_,$t=((pe/s|0)+.5)/l*j,wo=Math.hypot(jt-Nt,$t-It)||1,Po=(jt-Nt)/wo*.5*N,Ao=($t-It)/wo*.5*N;R.beginPath(),R.moveTo(Nt-Po,It-Ao),R.lineTo(jt+Po,$t+Ao),R.stroke()}}})}const[Pe,I]=oe(),D=a*a*l/s,F=o.dripLen||8,y=o.dripW||.9,K=o.drips||0,Z=o.splat||0,Y=i.map((d,R)=>[d,R]).filter(([d])=>d.ch!=null&&d.ch>=0);if(Y.forEach(([d,R],$)=>{if(K<=0)return;const E=B[R],T=[];for(let G=0;G<v-s;G++)E[G]&&!E[G+s]&&T.push(G);const q=.35+.65*($+1)/Y.length,S=Math.min(260,Math.round(K*T.length*A*.06*q));if(!T.length)return;I.fillStyle=V[d.ch];let U=0,W=0;for(;U<S&&W<S*8;){W++;const G=T[n()*T.length|0],h=G%s,Q=G/s|0;if(n()>.15+ln(h*A/14,Q*A/14,t+R*31))continue;U++;let ne=F*Math.exp(.75*f());n()<.25&&(ne*=.25),ne=Math.max(.8,Math.min(150,ne));const de=y*(.55+.9*n())*(.7+.3*Math.min(1,ne/10)),he=(h+n())*A,fe=(Q+1)*A-(.3+n()*1.2),se=(n()-.5)*.8,Ae=.06+n()*.12,Ve=2+n()*4,te=n()*6.28;I.beginPath();const Ne=Math.max(.04,de*.18);let p=he,re=fe,xe=de/2;for(let pe=0;pe<=1.0001;pe+=Ne/ne){re=fe+pe*ne,p=he+se*pe+Ae*Math.sin(pe*ne/Ve+te),xe=de/2*(1-.45*pe)*(pe<.08?1+(.08-pe)/.08*.6:1);const ce=Math.max(.6,xe*N);I.moveTo(p*N+ce,re*N),I.arc(p*N,re*N,ce,0,6.2832)}const De=xe*(1.45+.6*n());I.moveTo(p*N+De*N,(re+De*.4)*N),I.arc(p*N,(re+De*.4)*N,Math.max(.7,De*N),0,6.2832),I.fill()}}),Z>0&&Y.length){const d=Y[Y.length-1],R=B[d[1]],$=[];for(let q=0;q<v;q+=3)R[q]&&$.push(q);const E=Math.min(900,Math.round(Z*220*D/62370)),T=o.splatSize||.8;for(let q=0;q<E;q++){const S=n()<.75?d:Y[n()*Y.length|0];I.fillStyle=V[S[0].ch];let U,W;if($.length&&n()<.65){const h=$[n()*$.length|0];U=(h%s+.5)*A+f()*22,W=((h/s|0)+.5)*A+f()*22}else U=n()*a,W=n()*a*l/s;const G=Math.max(.06,Math.min(4.5,T*.5*Math.exp(.8*f())));if(I.beginPath(),n()<.12){const h=n()*6.28;I.ellipse(U*N,W*N,G*N*2.4,G*N*.8,h,0,6.2832)}else I.arc(U*N,W*N,Math.max(.6,G*N),0,6.2832);if(n()<.45){const h=2+(n()*6|0),Q=n()*6.28;for(let ne=0;ne<h;ne++){const de=G*(1.3+n()*2.6),he=Q+(n()-.5)*1.3,fe=Math.max(.04,G*(.1+n()*.3)),se=(U+Math.cos(he)*de)*N,Ae=(W+Math.sin(he)*de)*N;I.moveTo(se+fe*N,Ae),I.arc(se,Ae,Math.max(.5,fe*N),0,6.2832)}}I.fill()}}let x=null;if(o.cloud){const R=Math.ceil(s/4),$=Math.ceil(l/4),E=new Float32Array(R*$);for(let W=0;W<v;W++){let G=0;for(const h of B)if(h[W]){G=1;break}if(G){const h=((W/s|0)/4|0)*R+(W%s/4|0);E[h]=1}}const T=St(E,R,$,(o.cloudMm||18)/(A*4));let q=0;for(const W of T)q=Math.max(q,W);x=document.createElement("canvas"),x.width=R,x.height=$;const S=x.getContext("2d"),U=S.createImageData(R,$);for(let W=0;W<R*$;W++){const G=Math.min(1,T[W]/(q*.55+1e-6));U.data[W*4]=Math.round(255*Math.pow(G,.8)),U.data[W*4+3]=255}S.putImageData(U,0,0)}return{drip:Pe,bridge:ae,cloud:x}}function pn(e){const{gl:o}=e;let a=null,t=null,n=0,i=0,f=null,c=null;const r=o.createTexture(),m=o.createTexture(),s=o.createTexture();let l,v=null;const A=()=>{if(!v){v=document.createElement("canvas"),v.width=v.height=1;const C=v.getContext("2d");C.fillStyle="#000",C.fillRect(0,0,1,1)}return v};function b(C,w){if(a||(a={scut:e.compile(tn),spray:e.compile(on)}),f||(f=e.texFrom(sn(),{wrap:o.REPEAT,mip:!0})),t&&C===n&&w===i)return;t&&Object.values(t).forEach(e.freeTarget),n=C,i=w;const z=Math.max(1,C>>2),H=Math.max(1,w>>2);t={b1:e.target(C,w),b2:e.target(C,w),sm:e.target(C,w,2),sq:e.target(z,H,2),sw:e.target(z,H,2)}}function g(C,w,z,H,ee,k,M,u,L=!1){b(k,M);const P=Object.assign({},an,C),B=t,J=a,_=k/P.printW,j=(P.layers||[]).slice(0,5),N=j.length,oe=tt(P.seed*6151+3),V=Fe(P.srcPaper||[1,1,1]).map(h=>Math.max(h,.02)),ae=h=>Fe(me(h)).map((Q,ne)=>Math.min(1,Q/V[ne])),Pe=[],I=[],D=[],F=[],y=[],K=[],Z=[];let Y=0;for(let h=0;h<5;h++){const Q=j[h]||{kind:0,thr:2,hex:"#000000"};Pe.push(Q.kind|0),I.push(Q.thr==null?.5:Q.thr),D.push(Q.ch==null?-1:Q.ch),y.push(Q.op==null?.97:Q.op),F.push(...Fe(me(Q.hex))),K.push(...Q.key?ae(Q.key):[1,1,1]),h<N&&Q.kind===1&&(Y=h+1);const ne=oe()*Math.PI*2,de=P.misreg*Math.sqrt(oe());Z.push(Math.cos(ne)*de,Math.sin(ne)*de)}const x=P.maps||{drip:null,bridge:null,cloud:null};x!==l&&(e.texFrom(x.drip||A(),{},r),e.texFrom(x.bridge||A(),{},m),e.texFrom(x.cloud||A(),{},s),l=x);const d=x.drip?Math.max(.03,Math.min(.5,.5*x.drip.width/k)):.5,R=P.accKey?ae(P.accKey):[1,1,1],$=j.some(h=>h.kind===3)?1:0,E=Fe(me(P.support)),T=Fe(me(P.cloudHex||"#f4f4f0")),q=(h,Q,ne,de)=>e.run(h,Q,ne,he=>{he.f("uOff",0,0),he.f("uImg",k,M),de(he)});q("PREP",e.PR.prep,w.prep,h=>{h.t("uSrc",z),h.f("uSrcRes",H,ee),h.f("uSmoothPx",P.smooth*H/P.printW),h.f("uSrcPaper",...P.srcPaper||[1,1,1]),h.f("uPaper",1,1,1)});const S=(h,Q,ne,de,he,fe)=>q(`BLUR ${h}`,e.PR.blur,ne,se=>{se.t("uTexA",Q.t[0]),se.t("uTexB",Q.t[Q.t.length>1?1:0]),se.f("uDir",de,he),se.f("uSig",fe)}),U=Math.max(.05,P.cut*.5*_);S("cut H",w.prep,B.b1,1,0,U),S("cut V",B.b1,B.b2,0,1,U),q("SCUT",J.scut,B.sm,h=>{h.f("uPxMm",_),h.f("uSeed",P.seed),h.t("uSimp",B.b2.t[0]),h.t("uBr",m),h.i("uNL",N),h.i("uNK",Y),h.i("uAccOn",$),h.iv("uKind",Pe),h.iv("uCh",D),h.fv("uThr",I,1),h.fv("uKey",K,3),h.f("uAccK",R[0],R[1],R[2]),h.fv("uOffs",Z,2),h.f("uFacet",P.facet),h.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,U))))});const W=Math.max(.3,P.liftMm*_/4);L||(S("lift ¼ H",B.sm,w.qtmp,1,0,W),S("lift ¼ V",w.qtmp,B.sq,0,1,W),S("wide ¼ H",B.sq,w.qtmp,1,0,W*2),S("wide ¼ V",w.qtmp,B.sw,0,1,W*2));const G=L?c??=e.texFrom(A()):null;q("SPRAY",J.spray,w.comp,h=>{h.f("uPxMm",_),h.f("uSeed",P.seed),h.t("uMA",B.sm.t[0]),h.t("uMB",B.sm.t[1]),h.t("uQA",G??B.sq.t[0]),h.t("uQB",G??B.sq.t[1]),h.t("uWA",G??B.sw.t[0]),h.t("uWB",G??B.sw.t[1]),h.t("uDr",r),h.t("uCl",s),h.t("uSpT",f),h.i("uNL",N),h.i("uSup",P.supType|0),h.iv("uCh",D),h.fv("uLc",F,3),h.fv("uOp",y,1),h.f("uSupLin",...E),h.f("uCloudLin",...T),h.f("uSupTex",P.supTex),h.f("uLift",P.lift),h.f("uOver",P.over),h.f("uLoad",P.load),h.f("uMist",P.mist),h.f("uDrop",P.drop),h.f("uCloud",x.cloud?P.cloud:0),h.f("uSpN",Jt),h.f("uTp",Jt/(143.36*P.drop*_)),h.f("uDrTp",d),h.f("uLiftScale",P.liftScale)}),q("SCAN",e.PR.scan,u?w.out:null,h=>{h.f("uSeed",P.seed),h.t("uComp",w.comp.t[0]),h.f("uBlurPx",P.scanBlur),h.f("uNoise",P.scanNoise),h.i("uNorm",0),h.f("uPaper",...E)})}return{render:g}}function Xe(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const Fo=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,aa=Xe(Jo,Fo,Fo+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Do=2,Co=4,_o=8,mn=15,na=16,dn=Xe(aa,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),hn=Xe(ea,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),vn=Xe(Xe(Xe(mo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),xn=Xe(Xe(Xe(mo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<1;j++) for(int i=0;i<1;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+vec2(i,j)*px;`),"return cov/9.; }","return cov; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [ligero] 1 submuestra por píxel en lugar de 9."),gn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,No=new Map,Io=(e,o)=>{let a=No.get(e);return a||(a=o(),No.set(e,a)),a};function bn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=tt(e);t.lineCap="round";for(let i=0;i<2600;i++){const f=(.25+n()*n()*1.6)*85,c=n()*Math.PI*2,r=n()*1024,m=n()*1024,s=(n()-.5)*.9,l=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=l;for(const v of[-1024,0,1024])for(const A of[-1024,0,1024]){const b=r+v,g=m+A;b<-f-10||b>1024+f+10||g<-f-10||g>1024+f+10||(t.beginPath(),t.moveTo(b,g),t.quadraticCurveTo(b+Math.cos(c+s)*f*.5,g+Math.sin(c+s)*f*.5,b+Math.cos(c)*f,g+Math.sin(c)*f),t.stroke())}}return a}function kn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=tt(e);t.lineCap="round",t.globalCompositeOperation="lighter";const i=1024/61;for(let f=0;f<70;f++){const c=n()<.7?"255,0,0":"0,255,0",r=(.4+n()*n()*3.5)*i,m=n()*Math.PI*2,s=n()*1024,l=n()*1024,v=(n()-.5)*1.6,A=(.015+n()*.03)*i;t.strokeStyle=`rgba(${c},${.35+n()*.5})`,t.lineWidth=Math.max(.6,A);for(const b of[-1024,0,1024])for(const g of[-1024,0,1024]){const C=s+b,w=l+g;C<-r||C>1024+r||w<-r||w>1024+r||(t.beginPath(),t.moveTo(C,w),t.bezierCurveTo(C+Math.cos(m+v)*r*.35,w+Math.sin(m+v)*r*.35,C+Math.cos(m-v)*r*.7,w+Math.sin(m-v)*r*.7,C+Math.cos(m)*r,w+Math.sin(m)*r),t.stroke())}}for(let f=0;f<160;f++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const c=(.02+n()*n()*.12)*i;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,c),0,7),t.fill()}return a}function ra(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);function i(D){const F=t.createProgram();for(const[Z,Y]of[[t.VERTEX_SHADER,Da],[t.FRAGMENT_SHADER,D]]){const x=t.createShader(Z);if(t.shaderSource(x,Y),t.compileShader(x),!t.getShaderParameter(x,t.COMPILE_STATUS)){const d=t.getShaderInfoLog(x);throw new Error(d??"shader compile error")}t.attachShader(F,x)}if(t.bindAttribLocation(F,0,"p"),t.linkProgram(F),!t.getProgramParameter(F,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(F)??"program link error");const y={},K=t.getProgramParameter(F,t.ACTIVE_UNIFORMS);for(let Z=0;Z<K;Z++){const Y=t.getActiveUniform(F,Z);y[Y.name.replace(/\[0\]$/,"")]=t.getUniformLocation(F,Y.name)}return{p:F,u:y}}const f=new Map,c=D=>{let F=f.get(D);return F||(F=i(D),f.set(D,F)),F},r={fill:i(Ia),sep0:i(Na),lut:i(Ca),prep:i(_a),sep:i(ja),blur:i($a),screen:i(mo),spread:i(Jo),compose:i(qa),scan:i(ea)},m=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,m),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function s(D,F,{filter:y=t.LINEAR,wrap:K=t.CLAMP_TO_EDGE}={}){const Z=t.createTexture();return t.bindTexture(t.TEXTURE_2D,Z),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,D,F,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,y),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,y),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,K),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,K),Z}function l(D,{filter:F=t.LINEAR,wrap:y=t.CLAMP_TO_EDGE,mip:K=!1}={},Z=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,Z),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,D),K&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,K?t.LINEAR_MIPMAP_LINEAR:F),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,F),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,y),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,y),Z}function v(D,F,y=1){const K=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,K);const Z=[];for(let Y=0;Y<y;Y++){const x=s(D,F);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Y,t.TEXTURE_2D,x,0),Z.push(x)}return t.drawBuffers(Z.map((Y,x)=>t.COLOR_ATTACHMENT0+x)),{f:K,t:Z,w:D,h:F}}function A(D){D.t.forEach(F=>t.deleteTexture(F)),t.deleteFramebuffer(D.f)}const b=Wa(t);function g(D,F,y,K){const Z=y?y.w:e.width,Y=y?y.h:e.height;t.useProgram(F.p),t.bindFramebuffer(t.FRAMEBUFFER,y?y.f:null),t.viewport(0,0,Z,Y);let x=0;const d=F.u,R={t(E,T){d[E]!=null&&(t.activeTexture(t.TEXTURE0+x),t.bindTexture(t.TEXTURE_2D,T),t.uniform1i(d[E],x),x++)},f(E,...T){const q=d[E];q!=null&&(T.length===1?t.uniform1f(q,T[0]):T.length===2?t.uniform2f(q,T[0],T[1]):T.length===3?t.uniform3f(q,T[0],T[1],T[2]):t.uniform4f(q,T[0],T[1],T[2],T[3]))},i(E,T){d[E]!=null&&t.uniform1i(d[E],T)},fv(E,T,q){const S=d[E];if(S==null)return;const U=new Float32Array(T);q===1?t.uniform1fv(S,U):q===2?t.uniform2fv(S,U):t.uniform3fv(S,U)},m2(E,T){d[E]!=null&&t.uniformMatrix2fv(d[E],!1,new Float32Array(T))},iv(E,T){d[E]!=null&&t.uniform1iv(d[E],new Int32Array(T))}};R.f("uRes",Z,Y),K&&K(R);const $=b.mode==="off"?null:b.before(D,{w:Z,h:Y,att:y?y.t.length:1});t.drawArrays(t.TRIANGLES,0,3),b.mode!=="off"&&b.after(D,$)}const C=l(o.green,{wrap:t.REPEAT}),w={b:l(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:l(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:l(o.exLut)},z=l(Io("fib11",()=>bn(11)),{wrap:t.REPEAT,mip:!0}),H=l(Io("inc23",()=>kn(23)),{wrap:t.REPEAT,mip:!0}),ee=D=>{D.t("uExB",w.b),D.t("uExR",w.r),D.t("uExLut",w.lut),D.f("uExBSize",w.bs[0],w.bs[1]),D.f("uExRSize",w.rs[0],w.rs[1]),D.f("uExPxMm",Fa)};let k=null,M=null;const u=v(1089,33,2);let L="";const P=t.createTexture();let B=0,J=0,_=null,j=0,N=0;function oe(D,F){if(D===j&&F===N)return;j=D,N=F,_&&Object.values(_).forEach(A);const y=Math.max(1,D>>2),K=Math.max(1,F>>2);_={prep:v(D,F),sep:v(D,F,2),tmp:v(D,F,2),loc:v(D,F,2),qtmp:v(y,K,2),sol:v(y,K,2),scr:v(D,F,2),cov:v(D,F,2),comp:v(D,F),out:v(D,F)},e.width=D,e.height=F}const V=t.getExtension("EXT_disjoint_timer_query_webgl2");let ae=null;function Pe(){if(!V||!ae||!t.getQueryParameter(ae,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(V.GPU_DISJOINT_EXT)||(I.gpuMs=t.getQueryParameter(ae,t.QUERY_RESULT)/1e6),t.deleteQuery(ae),ae=null}const I={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:b,lastVariants:"",setSource(D,F=!0){B=D.width,J=D.height;const y=performance.now();l(D,{},P);const K=performance.now();F&&(t.bindTexture(t.TEXTURE_2D,P),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),I.lastUploadMs=K-y,I.lastMipMs=performance.now()-K},invalidateLut(){L=""},present(){if(!_)return;const D=_;g("PRESENT",c(gn),null,F=>{F.t("uT",D.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(D,F={}){const y=Object.assign({},Ua,D),K=F.preview??0,Z=!!F.lossless||K!==0,Y=!!(K&na),x=(p,re)=>K&p?"preview":Z&&re?"lossless":"lab";I.lastVariants=`screen:${Y?"light":x(_o,!1)} spread:${x(Do,!0)} scan:${x(Co,!1)}`;const d=performance.now();Pe(),b.mode!=="off"&&b.frameStart();const R=V&&!ae&&b.mode!=="timer"?t.createQuery():null;R&&t.beginQuery(V.TIME_ELAPSED_EXT,R);let $=Math.round(y.printW*y.pxmm),E=Math.round($*J/B);const T=Math.min(n,6144);if(Math.max($,E)>T){const p=T/Math.max($,E);$=Math.round($*p),E=Math.round(E*p)}const q=D.tech==="xerox"||D.tech==="stencil";q&&($=Math.max(4,$&-4),E=Math.max(4,E&-4)),oe($,E),I.width=$,I.height=E;const S=_;if(q){const p={gl:t,compile:i,run:g,target:v,freeTarget:A,texFrom:l,greenTex:C,fibTex:z,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},re={prep:S.prep,qtmp:S.qtmp,comp:S.comp,out:S.out};return D.tech==="stencil"?(M??=pn(p)).render(D,re,P,B,J,$,E,!!F.toTexture,Y):(k??=en(p)).render(D,re,P,B,J,$,E,!!F.toTexture,Y),I.lastVariants=(D.tech??"xerox")+(Y?" light":""),R&&(t.endQuery(V.TIME_ELAPSED_EXT),ae=R),t.flush(),I.lastMs=performance.now()-d,I}const U=$/y.printW,W=Fe(me(y.paper)),G=Math.min(nt,y.inks.length),h=y.inks.concat(Array(nt).fill("#000000")).slice(0,nt),Q=y.opac.concat(Array(nt).fill(.15)).slice(0,nt),ne=[];for(let p=0;p<nt;p++)ne.push(...Fe(me(To(h[p]))));const de=h.map(p=>Me(me(To(p)))[0]<.42?0:1),he=JSON.stringify([h,Q,G,y.paper,y.inkCost,y.pair]);he!==L&&(g("LUT",r.lut,u,p=>{p.fv("uInk",ne,3),p.i("uN",G),p.f("uPaper",...W),p.f("uMu",y.inkCost*.25)}),L=he),g("PREP",r.prep,S.prep,p=>{p.t("uSrc",P),p.f("uSrcRes",B,J),p.f("uSmoothPx",y.smooth*B/y.printW),p.f("uSrcPaper",...y.srcPaper),p.f("uPaper",...W)});const fe=tt(y.seed*7919+13),se=[],Ae=[];for(let p=0;p<nt;p++){const re=(fe()*2-1)*y.rot*Math.PI/180,xe=1+(fe()*2-1)*y.scl/1e3,De=Math.cos(re)*xe,pe=Math.sin(re)*xe;se.push(De,pe,-pe,De);const ce=fe()*Math.PI*2,lt=y.misreg*Math.sqrt(fe());Ae.push(Math.cos(ce)*lt,Math.sin(ce)*lt)}g("SEP0",r.sep0,S.tmp,p=>{p.t("uPrep",S.prep.t[0]),p.t("uSetA",u.t[0]),p.t("uSetB",u.t[1]),p.i("uN",G),p.f("uMinDot",y.minDot)});const Ve=Math.max(.2,y.misreg*.9+.12),te=Math.max(.3,Ve*U/4);g("BLUR fill ¼ H",r.blur,S.qtmp,p=>{p.t("uTexA",S.tmp.t[0]),p.t("uTexB",S.tmp.t[1]),p.f("uDir",1,0),p.f("uSig",te)}),g("BLUR fill ¼ V",r.blur,S.sol,p=>{p.t("uTexA",S.qtmp.t[0]),p.t("uTexB",S.qtmp.t[1]),p.f("uDir",0,1),p.f("uSig",te)}),g("FILL",r.fill,S.loc,p=>{p.t("uRawA",S.tmp.t[0]),p.t("uRawB",S.tmp.t[1]),p.t("uWA",S.sol.t[0]),p.t("uWB",S.sol.t[1]),p.i("uN",G),p.f("uFill",y.fill)}),g("WARP",r.sep,S.sep,p=>{p.f("uPxMm",U),p.t("uSA",S.loc.t[0]),p.t("uSB",S.loc.t[1]),p.i("uN",G),p.f("uCtr",y.printW/2,E/U/2),p.m2("uM",se),p.fv("uT",Ae,2)});const Ne=(p,re,xe,De,pe)=>{g(`BLUR ${p} H`,r.blur,xe,ce=>{ce.t("uTexA",re.t[0]),ce.t("uTexB",re.t[1]),ce.f("uDir",1,0),ce.f("uSig",pe)}),g(`BLUR ${p} V`,r.blur,De,ce=>{ce.t("uTexA",xe.t[0]),ce.t("uTexB",xe.t[1]),ce.f("uDir",0,1),ce.f("uSig",pe)})};return Ne("loc",S.sep,S.tmp,S.loc,.22*U),Ne("sol ¼",S.sep,S.qtmp,S.sol,1.5*U/4),g("SCREEN",Y?c(xn):K&_o?c(vn):r.screen,S.scr,p=>{ee(p),p.f("uPxMm",U),p.f("uSeed",y.seed),p.t("uSepA",S.sep.t[0]),p.t("uSepB",S.sep.t[1]),p.t("uSolA",S.sol.t[0]),p.t("uSolB",S.sol.t[1]),p.t("uLocA",S.loc.t[0]),p.t("uLocB",S.loc.t[1]),p.t("uGreen",C),p.i("uN",G),p.i("uMode",+y.screen),p.f("uGrain",y.grain),p.f("uLoad",y.inkLoad),p.f("uLpi",y.lpi),p.f("uMottle",y.mottle),p.f("uStarve",y.starve),p.f("uTexAmp",y.texAmp),p.f("uStreak",y.streak),p.f("uSolidLv",y.solidLv),p.fv("uExSel",de,1),p.f("uTrap",y.trap)}),g("SPREAD",K&Do?c(dn):Z?c(aa):r.spread,S.cov,p=>{ee(p),p.f("uPxMm",U),p.f("uSeed",y.seed),p.t("uScrA",S.scr.t[0]),p.t("uScrB",S.scr.t[1]),p.t("uSepA",S.sep.t[0]),p.t("uSepB",S.sep.t[1]),p.t("uLocA",S.loc.t[0]),p.t("uLocB",S.loc.t[1]),p.i("uN",G),p.f("uBleedPx",y.bleed*U),p.f("uGain",y.gain),p.f("uEdge",y.edge),p.f("uSolidLv",y.solidLv),p.fv("uExSel",de,1)}),g("COMPOSE",r.compose,S.comp,p=>{ee(p),p.f("uPxMm",U),p.f("uSeed",y.seed),p.t("uCovA",S.cov.t[0]),p.t("uCovB",S.cov.t[1]),p.t("uSolA",S.sol.t[0]),p.t("uSolB",S.sol.t[1]),p.f("uStarve",y.starve),p.t("uFib",z),p.t("uInc",H),p.i("uN",G),p.fv("uInk",ne,3),p.fv("uOp",Q,1),p.f("uPaper",...W),p.f("uPaperTex",y.paperTex),p.f("uFibers",y.fibers),p.f("uIncl",y.incl),p.f("uVoids",y.voids),p.f("uMottle",y.mottle),p.f("uTexAmp",y.texAmp),p.fv("uExSel",de,1)}),g("SCAN",K&Co?c(hn):r.scan,F.toTexture?S.out:null,p=>{p.f("uSeed",y.seed),p.t("uComp",S.comp.t[0]),p.f("uBlurPx",y.scanBlur),p.f("uNoise",y.scanNoise),p.i("uNorm",+y.normWhite),p.f("uPaper",...W)}),R&&(t.endQuery(V.TIME_ELAPSED_EXT),ae=R),t.flush(),I.lastMs=performance.now()-d,I}};return I}const sa=new URLSearchParams(window.location.search),et=sa.get("srdebug")==="1",be=et?sa:new URLSearchParams,yn=["srres","srpipe","srhold","srpreview","srprevmask"],O={preserveDrawingBuffer:be.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(be.get("srres"))||1)),mip:be.get("srmip")!=="0",bypass:be.get("srbypass")==="1",darkPaperFromBase:be.get("srdarkpaper")==="bg",simUpload:be.get("srsim")==="1",offscreenBack:be.get("sroff")==="1",bitmapUpload:be.get("srbitmap")==="1",pipe:be.get("srpipe")==="2"?2:be.get("srpipe")==="1"?1:0,hold:be.get("srhold")==="1",lossless:be.get("srlossless")!=="0",preview:be.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(be.get("srprevmask"))||0)),auto:!yn.some(e=>be.has(e)),forceLevel:be.get("srlevel")==="preview"?"preview":be.get("srlevel")==="full"?"full":null},ia={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},X={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,animRefines:0,lastPath:"",level:""},at={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},Ut=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==O.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==O.offscreenBack;Object.assign(O,e),(o||a)&&at.recreateEngine()},jo=5,$o=30,Mn=12,Sn=300,wn=125,eo=new Map;let Ie=null,At="";const la=(e,o)=>`${e}×${o}`;function Pn(e,o){if(O.forceLevel)return Zt(O.forceLevel==="preview"),O.forceLevel;const a=eo.get(la(e,o));return a?(Zt(a==="preview"),a):"detect"}function qo(e,o,a,t){const n=la(e,o);if((!Ie||Ie.size!==n)&&(Ie={size:n,seen:0,samples:[]}),++Ie.seen>jo+3*$o&&!Ie.samples.length){eo.set(n,"full"),Ie=null,At=`${n}: sin medida (${t}) → full`;return}if(Ie.seen<=jo||a===null||(Ie.samples.push(a),Ie.samples.length<$o))return;const i=[...Ie.samples].sort((r,m)=>r-m),f=i[i.length>>1],c=f>Mn?"preview":"full";eo.set(n,c),Ie=null,At=`${n}: coste p50 ${f.toFixed(1)} ms (${t}) → ${c}`,Zt(c==="preview"),et&&console.info(`[SuperRiso] quality level ${At}`)}const An=()=>At;let xt=null,zt=null,Uo=0,vo="";function En(e,o,a){return!!e&&!!xt&&o===zt&&e.length===xt.length&&e.every((n,i)=>n===xt[i])||(Uo=a,vo=o!==zt?"scene":(e??[]).map((n,i)=>n===xt?.[i]?"":i).filter(n=>n!=="").join(",")),xt=e??null,zt=o,a-Uo}let zo=null,Oo=0;function Tn(e,o,a){return a&&o!==zo&&(zo=o,Oo++),`${(e??[]).join(",")}|${a?Oo:0}`}const ca=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Ot(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:i,seed:f}){const[c,r]=ca(e.width,e.height,t),m=document.createElement("canvas");m.width=c,m.height=r;const s=m.getContext("2d",{willReadFrequently:!0});s.fillStyle="#fff",s.fillRect(0,0,c,r),s.drawImage(e,0,0,c,r);const l=s.getImageData(0,0,c,r).data,v=Me(a),A=new Int8Array(c*r).fill(-1),b=c*r;if(t){const k=new Uint8Array(b);for(let _=0;_<b;_++){const j=Me([l[_*4]/255,l[_*4+1]/255,l[_*4+2]/255]);k[_]=v[0]-j[0]>.14?1:0}const M=new Uint8Array(k);for(let _=0;_<r;_++)for(let j=0;j<c;j++){if(!k[_*c+j])continue;const N=_*c+j;j>0&&(M[N-1]=1),j<c-1&&(M[N+1]=1),_>0&&(M[N-c]=1),_<r-1&&(M[N+c]=1)}const u=new Int32Array(b).fill(-1),L=new Int32Array(b),P=tt((f|0)*977+13);let B=0;const J=Math.max(6,b*12e-5);for(let _=0;_<b;_++){if(M[_]||u[_]>=0)continue;let j=0;L[j++]=_,u[_]=B;const N=[];let oe=!1;for(;j;){const I=L[--j];N.push(I);const D=I%c,F=I/c|0;(D===0||F===0||D===c-1||F===r-1)&&(oe=!0),D>0&&!M[I-1]&&u[I-1]<0&&(u[I-1]=B,L[j++]=I-1),D<c-1&&!M[I+1]&&u[I+1]<0&&(u[I+1]=B,L[j++]=I+1),F>0&&!M[I-c]&&u[I-c]<0&&(u[I-c]=B,L[j++]=I-c),F<r-1&&!M[I+c]&&u[I+c]<0&&(u[I+c]=B,L[j++]=I+c)}B++;const V=P(),ae=P();if(N.length<J||oe&&N.length>b*.05||V>i)continue;const Pe=Math.min(n-1,Math.floor(ae*n));for(const I of N)A[I]=Pe}for(let _=0;_<3;_++){const j=new Int8Array(A);for(let N=0;N<r;N++)for(let oe=0;oe<c;oe++){const V=N*c+oe;if(j[V]>=0||!M[V])continue;const ae=oe>0&&j[V-1]>=0?j[V-1]:oe<c-1&&j[V+1]>=0?j[V+1]:N>0&&j[V-c]>=0?j[V-c]:N<r-1&&j[V+c]>=0?j[V+c]:-1;ae>=0&&(A[V]=ae)}}}else{const k=o.map(M=>Me(me(M)));for(let M=0;M<b;M++){const u=Me([l[M*4]/255,l[M*4+1]/255,l[M*4+2]/255]),L=Math.hypot(u[0]-v[0],u[1]-v[1],u[2]-v[2]),P=Math.hypot(u[1],u[2]);if(!(L>.08&&(u[0]>.32||P>.12)))continue;let B=-1,J=1e9;for(let _=0;_<k.length;_++){const j=(k[_][0]-u[0])*.6,N=k[_][1]-u[1],oe=k[_][2]-u[2],V=j*j+N*N+oe*oe;V<J&&(J=V,B=_)}J<.045&&(A[M]=B)}}let g=null;if(t){g=document.createElement("canvas"),g.width=c,g.height=r;const k=g.getContext("2d"),M=k.createImageData(c,r);for(let u=0;u<b;u++)M.data[u*4]=(A[u]+1)*36,M.data[u*4+3]=255;k.putImageData(M,0,0)}const C=new Int32Array(b).fill(-1),w=s.createImageData(c,r),z=new Int32Array(b);for(let k=0;k<b;k++)w.data[k*4]=255,w.data[k*4+1]=128,w.data[k*4+2]=0,w.data[k*4+3]=255;let H=0;for(let k=0;k<b;k++){if(A[k]<0||C[k]>=0)continue;const M=A[k];let u=0;z[u++]=k,C[k]=H;const L=[];let P=0,B=0,J=0,_=0,j=0,N=0;for(;u;){const T=z[--u];L.push(T);const q=T%c,S=T/c|0;P++,B+=q,J+=S,_+=q*q,j+=S*S,N+=q*S,q>0&&A[T-1]===M&&C[T-1]<0&&(C[T-1]=H,z[u++]=T-1),q<c-1&&A[T+1]===M&&C[T+1]<0&&(C[T+1]=H,z[u++]=T+1),S>0&&A[T-c]===M&&C[T-c]<0&&(C[T-c]=H,z[u++]=T-c),S<r-1&&A[T+c]===M&&C[T+c]<0&&(C[T+c]=H,z[u++]=T+c)}if(H++,P<6)continue;const oe=B/P,V=J/P,ae=_/P-oe*oe,Pe=j/P-V*V,I=N/P-oe*V,D=.5*Math.atan2(2*I,ae-Pe),F=ae+Pe,y=ae*Pe-I*I,K=Math.sqrt(Math.max(0,F*F/4-y)),Z=F/2+K,Y=Math.max(1e-6,F/2-K),x=Math.sqrt(Y/Z),d=Math.max(0,Math.min(1,(.62-x)/.3)),R=Math.round(127.5+127.5*Math.cos(2*D)),$=Math.round(127.5+127.5*Math.sin(2*D)),E=Math.round(255*d);for(const T of L)w.data[T*4]=R,w.data[T*4+1]=$,w.data[T*4+2]=E}const ee=new Uint8ClampedArray(w.data);for(let k=0;k<2;k++){const M=new Uint8ClampedArray(ee);for(let u=0;u<r;u++)for(let L=0;L<c;L++){const P=u*c+L;if(!(M[P*4+2]>0))for(const[B,J]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=L+B,j=u+J;if(_<0||j<0||_>=c||j>=r)continue;const N=j*c+_;if(M[N*4+2]>0){ee[P*4]=M[N*4],ee[P*4+1]=M[N*4+1],ee[P*4+2]=M[N*4+2];break}}}}return w.data.set(ee),s.putImageData(w,0,0),{ori:m,ids:g}}const ua=300;let Ce=null,to=0,Wt=!1;const ct=document.createElement("canvas"),Ln=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:ua}):setTimeout(e,0)},Rn=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),Bn=()=>to;function Fn(e,o,a,t,n,i,f){const c=o.what==="fill",r={keys:c?[]:o.keys??o.paint,srcPaper:t,fill:c,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Ot(e,r);const m=JSON.stringify([c,r.keys,r.nk,c?r.cover:0,c?r.seed:0,t]),s=performance.now(),l={motion:i&&[...i],scene:f};if(!Ce||Ce.key!==m)return Ce={key:m,maps:Ot(e,r),at:s,sig:l},to++,Ce.maps;if(!Wt&&s-Ce.at>=ua&&!Rn(l,Ce.sig)){const[v,A]=ca(e.width,e.height,c);(ct.width!==v||ct.height!==A)&&(ct.width=v,ct.height=A),ct.getContext("2d").drawImage(e,0,0,v,A),Wt=!0,Ce.at=s,Ce.sig=l,Ln(()=>{Wt=!1,!(!Ce||Ce.key!==m)&&(Ce.maps=Ot(ct,r),to++)})}return Ce.maps}const oo=300,Dn=200,Cn=e=>Me(me(e))[0]<.3?.995:.97;function Wo(e){const o=Me(me(e));let a=Lo[0][1],t=1e9;for(const[,n]of Lo){const i=Me(me(n)),f=Math.hypot(o[0]-i[0],2*(o[1]-i[1]),2*(o[2]-i[2]));f<t&&(t=f,a=n)}return a}const _n=e=>Me(e)[0]>.8?e:[1,1,1];function Nn(e,o,a){const t=(e.dark-.5)*.5,n=r=>Math.max(.03,Math.min(.95,r));let i=[],f=null;if(e.mode==="tone"){const r=e.n;i=a(r).map((s,l)=>({kind:0,thr:n(s-t),hex:Ra[r][l]})),e.accent&&o.length&&(f=o[0],i.push({kind:3,hex:e.colors==="own"?o[0]:Wo(o[0])}))}else i=o.slice(0,e.n).sort((m,s)=>Me(me(s))[0]-Me(me(m))[0]).map(m=>({kind:1,key:m,hex:e.colors==="own"?m:Wo(m)})),i.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===i.length&&i.forEach((r,m)=>{r.hex=e.manual[m]}),i.forEach(r=>{r.op=Cn(r.hex)}),i.map((r,m)=>m).filter(r=>i[r].kind!==3).slice(-3).forEach((r,m)=>{i[r].ch=m}),{layers:i,accKey:f}}const Gt=new Map;let rt=null,wt=null,Go=0;const ao=e=>e?[...e]:null;function In(e,o){const a=ao(e);return(!a||!wt||a.length!==wt.length||a.some((t,n)=>t!==wt[n]))&&(wt=a,Go=o),!!a&&o-Go>=Dn}let ke=null,Pt=null,Xt=!1,no=0;const ut=document.createElement("canvas"),jn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:oo}):setTimeout(e,0)},$n=()=>no;function qn(e,o,a,t){const n=_n(e.srcPaper),i=performance.now(),f=e.isLive?In(e.motion,i):!0,c=ya(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&f){const g=ao(e.motion);(!rt||rt.scene!==e.scene||!g||!rt.cam||g.some((w,z)=>w!==rt.cam[z]))&&(!rt||i-rt.at>=oo)&&(Gt.clear(),rt={scene:e.scene,cam:g,at:i})}const r=g=>{const C=`${g}|${n.join(",")}|${e.bg.join(",")}`;let w=Gt.get(C);return w||(w=fn(o,n,g,e.bg),Gt.set(C,w)),w},{layers:m,accKey:s}=Nn(e.s,c,r),l={layers:m,accKey:s,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:m,accKey:s,maps:Bo(o,l),srcPaper:n};const v=JSON.stringify([m.map(g=>[g.kind,g.thr,g.key,g.ch]),s,l.cut,l.bridges,l.drips,l.splat,l.cloud,t,l.printW,n]),A=ao(e.motion),b=!ke||ke.key!==v||ke.scene!==e.scene||!A||!ke.cam||A.some((g,C)=>g!==ke.cam[C]);if(b&&(f||!ke||ke.key!==v)&&!Xt&&(!ke||i-ke.at>=oo)){const g=Math.min(1,1024/Math.max(o.width,o.height)),C=Math.max(8,Math.round(o.width*g)),w=Math.max(8,Math.round(o.height*g));(ut.width!==C||ut.height!==w)&&(ut.width=C,ut.height=w),ut.getContext("2d").drawImage(o,0,0,C,w),Xt=!0;const z=e.scene;ke&&(ke.at=i),jn(()=>{Xt=!1,ke={key:v,maps:Bo(ut,l),at:performance.now(),cam:A,scene:z},no++})}return ke?f&&!b?{layers:m,accKey:s,maps:ke.maps,srcPaper:n}:((!Pt||Pt.src!==ke.maps)&&(Pt={src:ke.maps,maps:{drip:null,bridge:null,cloud:ke.maps.cloud}},no++),{layers:m,accKey:s,maps:Pt.maps,srcPaper:n}):{layers:m,accKey:s,maps:null,srcPaper:n}}const Un=2400,zn=240,yt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function ze(e,o){const a=yt[e];a.push(o),a.length>Un&&a.shift()}function Re(e,o,a){const t=yt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((i,f)=>i-f);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function xo(e=zn){const o=yt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:Re("interval",.5,e),frameP95:Re("interval",.95,e),totalP50:Re("total",.5,e),totalP95:Re("total",.95,e),flatP50:Re("flat",.5,e),uploadP50:Re("upload",.5,e),uploadP95:Re("upload",.95,e),mipP50:Re("mip",.5,e),renderP50:Re("render",.5,e),backP50:Re("back",.5,e),bitmapWaitP50:Re("bitmapWait",.5,e),gpuP50:Re("gpu",.5,e),gpuP95:Re("gpu",.95,e)}}function fa(){for(const e of Object.keys(yt))yt[e].length=0}let ft=null,gt=null,Qe=null,He=null,We=null,pa="",ro="";function ma(e){pa=e}function Kt(e){ro=e,Qe&&(Qe.textContent=e,Qe.style.display=e?"block":"none")}function Xo(e){We&&(We.disabled=e,We.style.opacity=e?".5":"1")}const _e=(e,o=1)=>e===null?"–":e.toFixed(o),so=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function On(e){if(!He)return;He.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",so(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((f,c)=>setTimeout(()=>c(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const i=document.createElement("button");i.textContent="Cerrar",so(i),i.onclick=()=>{He&&(He.textContent="")},a.append(n,i,t),He.append(o,a)}function Wn(e){ft||typeof document>"u"||(ft=document.createElement("div"),ft.setAttribute("data-superriso-overlay",""),Object.assign(ft.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),He=document.createElement("div"),He.style.pointerEvents="auto",Qe=document.createElement("div"),Object.assign(Qe.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),We=document.createElement("button"),We.textContent="Medir",so(We),We.style.pointerEvents="auto",We.onclick=e,gt=document.createElement("div"),Object.assign(gt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ft.append(He,Qe,We,gt),document.body.appendChild(ft),setInterval(()=>{if(!gt)return;const o=xo();gt.textContent=`${pa}
fps ${_e(o.fps)} · frame p50 ${_e(o.frameP50)} p95 ${_e(o.frameP95)} ms
SR p50 ${_e(o.totalP50)} p95 ${_e(o.totalP95)} ms (aplanado ${_e(o.flatP50)} · subida ${_e(o.uploadP50)} · mip ${_e(o.mipP50)} · motor ${_e(o.renderP50)} · vuelta ${_e(o.backP50)})
GPU motor p50 ${_e(o.gpuP50)} p95 ${_e(o.gpuP95)} ms`,ro&&Qe&&(Qe.textContent=ro)},500))}const Mt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function da(e){return e&&Mt?new OffscreenCanvas(1,1):document.createElement("canvas")}const go=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,bo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},qe=bo(),io=bo();function pt(e,o,a,t,n,i){const{canvas:f,ctx:c}=e;return(f.width!==a||f.height!==t)&&(f.width=a,f.height=t),c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.globalCompositeOperation="source-over",c.fillStyle=n,c.fillRect(0,0,a,t),c.globalCompositeOperation=i?"source-over":"multiply",c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="medium",c.drawImage(o,0,0,a,t),c.globalCompositeOperation="source-over",f}let Te=null,Vt=!1,Ko=0;function Gn(e,o,a){Ko++;const t=Ko;let n=null;if(Te&&Te.bmp.width===o&&Te.bmp.height===a?n={bmp:Te.bmp,lag:t-Te.frame}:Te&&Te.bmp.close(),Te=null,!Vt){Vt=!0;const i=performance.now();createImageBitmap(e).then(f=>{ze("bitmapWait",performance.now()-i),Te&&Te.bmp.close(),Te={bmp:f,frame:t}}).catch(()=>{}).finally(()=>{Vt=!1})}return n}function Xn(){Te&&Te.bmp.close(),Te=null}function it(e,o,a,t,n,i,f){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!f,e.drawImage(o,0,0,a,t,0,0,n,i)}finally{e.restore()}}function Tt(e,o,a,t,n,i,f){const c=go(o)?o.transferToImageBitmap():null;try{it(e,c??o,a,t,n,i,f)}finally{c?.close()}}const Ye=bo();let ko=!1;function yo(e,o,a){const t=go(e)?e.transferToImageBitmap():null;try{return(Ye.canvas.width!==o||Ye.canvas.height!==a)&&(Ye.canvas.width=o,Ye.canvas.height=a),Ye.ctx.globalCompositeOperation="copy",Ye.ctx.drawImage(t??e,0,0),ko=!0,Ye.canvas}finally{t?.close()}}const Et=()=>ko?Ye.canvas:null,lo=()=>{ko=!1},Lt=()=>({res:1,sim:!1,preview:0,lossless:O.lossless,pipe:0,hold:!1,holdFps:12});function ha(e,o,a){if(!O.auto)return{m:{res:O.resScale,sim:O.simUpload,preview:O.preview,lossless:O.lossless,pipe:O.pipe,hold:O.hold,holdFps:12},level:"manual"};const t=Pn(e,o);return t!=="preview"?{m:Lt(),level:t}:a.fullQuality?{m:{...Lt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.5,sim:O.simUpload,preview:mn|na,lossless:!0,pipe:1,hold:!0,holdFps:12},level:t}}const Kn=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),va=()=>[`pdb ${O.preserveDrawingBuffer?"on":"off"}`,`mip ${O.mip?"on":"off"}`,O.bitmapUpload?"bitmap":"",O.offscreenBack?Mt?"offscreen":"offscreen→DOM":"",O.bypass?"BYPASS":""].filter(Boolean).join(" · "),dt={inks:null,params:null};function Rt(e,o,a,t){const{settings:n,isDarkMode:i,isPixelArt:f}=a,c=n.technique==="xerox",r=n.technique==="stencil",m=c?Ja(n.xerox,e*t.res,n.resolution):r?rn(n.stencil,e*t.res,n.resolution):Oa(n,e*t.res),s=Math.round(240*m.pxmm),l=Math.round(s*o/e),v=t.sim?Math.min(e,s):e,A=t.sim?Math.min(o,l):o,b=Ba(i,f),g=i&&!O.darkPaperFromBase,C=g?[1,1,1]:me(b),w=c?Ma(n,a.shapes,a.hiddenLayers,C,g?b:null):null;w&&a.isLive&&Sa({rows:w.rows,what:w.what,zones:w.zones});const z=w?{inks:w.paint,names:w.rows.map(u=>u.id??""),opac:[],srcPaper:C}:r?{inks:[],names:[],opac:[],srcPaper:C}:wa(a.shapes,a.hiddenLayers,n,C,g?b:null,!0);a.isLive&&(dt.inks=z);const H=[e,o,+i,+f,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+O.mip,+O.offscreenBack,+O.preserveDrawingBuffer,+O.darkPaperFromBase,n.technique,...w?[n.resolution,JSON.stringify(n.xerox),(w.keys??[]).join(",")]:r?[n.resolution,JSON.stringify(n.stencil)]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],z.inks.join(",")].join("|"),ee=`${H}|${w?Bn():r?$n():0}`,k=w?{x:n.xerox,mk:w,isLive:a.isLive,motion:a.motion&&[...a.motion,...a.anim??[]],scene:a.scene}:void 0,M=r?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:C,darkBase:g?b:null,bg:me(b),isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:m,fw:v,fh:A,base:b,srcPaper:C,inks:z,key:ee,hk:H,xerox:k,stencil:M}}function mt(e){const o=e.stencil;if(o){const n=qn(o,(o.isLive?qe:io).canvas,e.style,1);return o.isLive&&Pa(n.layers.map(i=>({hex:i.hex,kind:i.kind}))),dt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return dt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:Fn((a.isLive?qe:io).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return dt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const Ct=e=>e%9999+1,ht=e=>Math.floor(performance.now()*e/1e3);function Bt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):ht(o)}const Ze=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Ft=null;const Vo=()=>{Ft?.destroy(),Ft=null};function Vn(e,o,a,t,n){const i=performance.now(),f=t.exportFrame,c=!f||f.index===0,r=!f||f.index>=f.count-1;try{c&&Vo();const m=Ft??(Ft=ra(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),s=Lt(),l=Rt(o,a,t,s),v=pt(io,e.canvas,l.fw,l.fh,l.base,t.isDarkMode);return m.setSource(v,!0),m.render({...mt(l),seed:Ct(Bt(t))},Ze(s)),m.gl.isContextLost()?!1:(Tt(e,m.canvas,m.width,m.height,o,a,!!l.style.crisp),et&&console.info(`[SuperRiso] export frame ${f?`${f.index+1}/${f.count}`:"single"} ${o}×${a} → sim ${m.width}×${m.height}: ${(performance.now()-i).toFixed(1)} ms · ${m.lastVariants}`),!0)}finally{r&&Vo()}}const co=2e3,xa=8e3,uo=60,Yo=8,st={...ia,simUpload:!0,auto:!1,lossless:!1},kt=e=>new Promise(o=>setTimeout(o,e)),Ge=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function Yn(){let o=at.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),i=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:i}}function Qn(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,i=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,c])=>c!==null).sort((c,r)=>r[1]-c[1])[0],f=[];return i&&i[1]>=3&&f.push(`${i[0]} ${Ge(i[1])} ms`),t!==null&&t>=3&&f.push(`fuera de nuestras etapas ${Ge(t)} ms`),f.length?f.join(" + "):"sin espera apreciable"}async function Qo(e){const o=at.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const i=o.report().find(f=>f.name==="SCAN");if(i&&i.n>=uo)break;await kt(100)}e==="timer"&&(await kt(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(i=>i.p50!==null).sort((i,f)=>f.p50-i.p50).map(i=>i.name);return{mode:e,lines:t.map(i=>`  ${i.name.padEnd(13)} ${`${i.info.w}×${i.info.h}`.padEnd(10)} att ${i.info.att}  p50 ${Ge(i.p50,3).padStart(7)} ms  #${n.indexOf(i.name)+1}  (n=${i.n})`)}}function Hn(e,o,a,t,n){const i=Yn(),f=e.find(m=>m.id==="A")?.s.frameP50??null,c=at.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Aa} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${X.canvasW}×${X.canvasH} · simulación (última) ${c?`${c.width}×${c.height}`:"–"}`),r.push(`GPU: ${i.renderer} · MAX_TEXTURE_SIZE ${i.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${Mt?"sí":"no"}`),r.push(`Modo ${X.isDark?"oscuro":"claro"} · preset de cámara: ${X.preset||"–"} (velocidad ${X.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const m of a)r.push(`AVISO: ${m}`);r.push(`Cada fila: ${co/1e3} s de calentamiento descartados + ${xa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const m of e){const s=m.s,l=A=>Ge(A,2).padStart(6),v=!m.patch.bypass&&s.frameP50!==null&&f!==null&&s.totalP50!==null?s.frameP50-f-s.totalP50:null;r.push(`${(m.id+" "+m.label).padEnd(20)}${Ge(s.fps).padStart(5)}  ${(Ge(s.frameP50)+"/"+Ge(s.frameP95)).padEnd(11)} |${l(s.totalP50)}${l(s.flatP50)} ${l(s.uploadP50)}${l(s.uploadP95)}${l(s.mipP50)}${l(s.renderP50)}${l(s.backP50)} |${l(v)}    |${l(s.gpuP50)}  ${m.res.padEnd(10)}  ${m.n.pipe}/${m.n.sync}/${m.n.held}  (n=${s.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const m of e)m.patch.bypass||r.push(`  ${m.id} ${m.label}: ${Qn(m,f)}`);for(const m of n)m&&(r.push(""),r.push(m.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, temporizador de GPU por pasada:`),m.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...m.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Zn(){if(Yt)return;const e=[],o=performance.now()-X.lastCallAt;if(X.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):X.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,Xo(!0);const a={...O},t=[],n=[];let i=!1,f="–",c=0;const r=async m=>{Kt(`Midiendo ${m.id} (${++c}/${Yo})…`),Ut(m.patch),await kt(co),fa();const s={pipe:X.pipeFrames,sync:X.pipeSyncFrames,held:X.heldFrames};await kt(xa);const l=xo(1/0);l.gpuP50!==null&&(i=!0);const v={pipe:X.pipeFrames-s.pipe,sync:X.pipeSyncFrames-s.sync,held:X.heldFrames-s.held},A=at.engineInfo(),b={id:m.id,label:m.label,res:m.patch.bypass||!A?"–":`${A.width}×${A.height}`,s:l,patch:m.patch,n:v};return t.push(b),b};try{await r({id:"A",label:"bypass",patch:{...ia,bypass:!0,auto:!1}});const m=await r({id:"B",label:".75 pipe1",patch:{...st,resScale:.75,pipe:1}}),s=await r({id:"C",label:".75 pipe2",patch:{...st,resScale:.75,pipe:2}}),l=(s.s.frameP50??1e9)<(m.s.frameP50??1e9)?2:1;f=`pipe${l} (${l===2?"C":"B"}: frame p50 ${Ge(l===2?s.s.frameP50:m.s.frameP50)} ms frente a ${Ge(l===2?m.s.frameP50:s.s.frameP50)})`,await r({id:"D",label:`.75 pipe${l} lossless`,patch:{...st,resScale:.75,pipe:l,lossless:!0}}),await r({id:"E",label:`.75 pipe${l} preview`,patch:{...st,resScale:.75,pipe:l,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${l} preview`,patch:{...st,resScale:1,pipe:l,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${l} hold`,patch:{...st,resScale:.75,pipe:l,hold:!0}}),Kt(`Midiendo P (${++c}/${Yo})… perfilado por pasada`),Ut({...st,resScale:.75,pipe:1}),await kt(co),n.push(await Qo("sync")),n.push(await Qo("timer"))}finally{Ut(a),Kt(""),Xo(!1),Yt=!1}On(Hn(t,i,e,f,n))}const Jn=["greennoise1024","ink_black","ink_red","ink_lut"],er=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`}),tr=()=>Promise.all(Jn.map(er)).then(([e,o,a,t])=>({green:e,exBlack:o,exRed:a,exLut:t}));let _t=null,Dt=!1,fo=!1,ue=null,we=da(O.offscreenBack),Ho=O.preserveDrawingBuffer,Qt=0;const Mo=(e,o)=>{Dt||(Dt=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))};tr().then(e=>{_t=e}).catch(e=>Mo("textures",e));const ga=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===we&&(fo=!0,ue=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===we&&(fo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};ga(we);const ba=()=>{const e=we;ue=null,Xn(),ye=null,Je=null,ie=null,ve=null,Oe=null,Le=null,lo(),we=da(O.offscreenBack),ga(we),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};at.recreateEngine=ba;at.engineInfo=()=>ue?{gl:ue.gl,width:ue.width,height:ue.height}:null;at.profiler=()=>ue?ue.profiler:null;et&&(Wn(()=>{Zn()}),ma(`SUPER RISO · ${va()}`),window.__superRiso={KNOBS:O,snapshot:xo,reset:fa,live:X,qualityReport:An,isSuperRisoPreviewDevice:Ea,get lastChange(){return vo},get inks(){return dt.inks},get params(){return dt.params},get engine(){return ue},get disabled(){return Dt},get glCanvas(){return we},get flat(){return qe.canvas}});function So(){return ue&&(Ho!==O.preserveDrawingBuffer||go(we)!==(O.offscreenBack&&Mt))&&ba(),ue||(ue=ra(we,_t,{preserveDrawingBuffer:O.preserveDrawingBuffer}),Ho=O.preserveDrawingBuffer),ue}let Be=0,ye=null,Je=null,ie=null,ve=null;const le={begin:0,upload:0,mip:0,render:0,backBegin:0};let Oe=null,Le=null;const ka=()=>Dt||fo||!_t||O.bypass;function rr(e,o,a){if(!a.isLive||(Be++,Je=null,le.begin=0,le.upload=0,le.mip=0,le.render=0,le.backBegin=0,ka()))return;const{m:t}=ha(e,o,a.settings);if(!t.pipe||ve)return;const n=performance.now();try{const i=Rt(e,o,a,t);if(t.pipe===2){or(i,t,Bt(a),n);return}if(!ye||ye.key!==i.key||ye.frame!==Be-1){ye=null;return}const f=ht(t.holdFps);if(t.hold&&ie&&ie.key===i.hk&&ie.tick===f&&Et())return;const c=So();c.setSource(qe.canvas,O.mip);const r=performance.now(),m=Bt(a),s=ye.at;c.render({...ye.params,seed:Ct(m)},Ze(t));const l=performance.now();if(ye=null,c.gl.isContextLost())return;Je={key:i.key,frame:Be,ew:c.width,eh:c.height,crisp:!!i.style.crisp,tick:f,at:s,seed:m},le.upload=c.lastUploadMs,le.mip=c.lastMipMs,le.render=l-r,le.begin=l-n}catch(i){ue=null,Mo("exception in beginSuperRisoFrame",i)}}function or(e,o,a,t){const n=ht(o.holdFps);if(Oe&&Oe.frame===Be-1&&Oe.key===e.key&&ue){const r=performance.now();ue.present(),yo(we,Oe.ew,Oe.eh),le.backBegin=performance.now()-r,Le={...Oe,frame:Be}}if(Oe=null,!ye||ye.key!==e.key||ye.frame!==Be-1){ye=null,le.begin=performance.now()-t;return}if(o.hold&&Le&&Le.key===e.key&&Le.tick===n){le.begin=performance.now()-t;return}const i=So();i.setSource(qe.canvas,O.mip);const f=performance.now();i.render({...ye.params,seed:Ct(a)},Ze(o,!0));const c=performance.now();ye=null,!i.gl.isContextLost()&&(Oe={key:e.key,frame:Be,tick:n,ew:i.width,eh:i.height,crisp:!!e.style.crisp},le.upload=i.lastUploadMs,le.mip=i.lastMipMs,le.render=c-f,le.begin=c-t)}function Ht(e,o,a,t,n,i){if(t.hold){const f=yo(we,n.ew,n.eh);ie={key:i,tick:n.tick,ew:n.ew,eh:n.eh,crisp:n.crisp,at:n.at,seed:n.seed},it(e,f,n.ew,n.eh,o,a,n.crisp)}else Tt(e,we,n.ew,n.eh,o,a,n.crisp)}function bt(e,o,a,t,n,i=!1){const f=So(),c=performance.now(),r=O.bitmapUpload?Gn(o,e.fw,e.fh):null,m=performance.now()-c;r?(f.setSource(r.bmp,O.mip),r.bmp.close(),X.bitmapLagFrames=r.lag):f.setSource(o,O.mip);const s=performance.now();return f.render({...a,seed:Ct(t)},n),i&&f.profiler.timerAvailable?qo(X.canvasW,X.canvasH,f.gpuMs===null?null:f.gpuMs+performance.now()-c,"GPU"):i&&(f.finish(),qo(X.canvasW,X.canvasH,performance.now()-c,"readback")),le.upload+=f.lastUploadMs+m,le.mip+=f.lastMipMs,le.render+=performance.now()-s,f}function sr(e,o,a,t){const n=performance.now(),{isDarkMode:i,isLive:f,info:c}=t;if(f&&(et&&Qt>0&&ze("interval",n-Qt),Qt=n,X.lastCallAt=n,X.isDark=i,X.canvasW=o,X.canvasH=a,X.preset=c.preset,X.speed=c.speed,X.offscreenFallback=O.offscreenBack&&!Mt),ka())return!1;try{if(!f)return Vn(e,o,a,t,_t);const{m:r,level:m}=ha(o,a,t.settings),s=Bt(t),l=Rt(o,a,t,r);X.level=m,ie&&(ie.key!==l.hk||!r.hold)&&(ie=null,ve||lo());const v=En(t.motion,t.playing?null:t.scene,n);let A=n,b=n;const g=(k,M=r)=>{if(X.lastPath=k,!et)return!0;const u=performance.now();return ze("flat",A-n),ze("upload",le.upload),ze("mip",le.mip),ze("render",le.render),ze("back",le.backBegin+(u-b)),ze("total",le.begin+(u-n)),ue&&ue.gpuMs!==null&&ze("gpu",ue.gpuMs),ma(`SUPER RISO · ${m} · ${o}×${a} → sim ${ue?`${ue.width}×${ue.height}`:"–"} · src ${l.fw}×${l.fh} · ${Kn(M)} · ${va()} · ${k}`),!0};if(m==="detect"){const k=pt(qe,e.canvas,l.fw,l.fh,l.base,i);A=performance.now();const M=bt(l,k,mt(l),s,Ze(r),!0);return M.gl.isContextLost()?!1:(b=performance.now(),Tt(e,we,M.width,M.height,o,a,!!l.style.crisp),g("detect"))}if(m==="preview"&&v>=Sn){const k=Lt(),M=Rt(o,a,t,k);ye=null,Je=null,ie=null;const u=Et(),L=Tn(t.anim,t.scene,!!t.playing);if(ve&&ve.key===M.key&&ve.tick===s&&u&&(ve.anim===L||n-ve.at<wn))return b=performance.now(),it(e,u,ve.ew,ve.eh,o,a,ve.crisp),X.heldFrames++,g("refined",k);const P=pt(qe,e.canvas,M.fw,M.fh,M.base,i);A=performance.now();const B=bt(M,P,mt(M),s,Ze(k));if(B.gl.isContextLost())return!1;b=performance.now();const J=!!ve&&ve.key===M.key&&ve.tick===s&&ve.anim!==L;et&&J?X.animRefines++:et&&console.info(`[SuperRiso] refine (last change: ${vo})`);const _=yo(we,B.width,B.height);return ve={key:M.key,tick:s,ew:B.width,eh:B.height,crisp:!!M.style.crisp,anim:L,at:n},it(e,_,B.width,B.height,o,a,ve.crisp),g("refine",k)}ve&&(ve=null,lo());const C=()=>r.hold&&ie&&ie.key===l.hk?Et():null;if(r.pipe===2){const k=pt(qe,e.canvas,l.fw,l.fh,l.base,i);A=performance.now();const M=mt(l);ye={key:l.key,frame:Be,params:M,at:A},b=performance.now();const u=Et();if(Le&&Le.key===l.key&&u&&(Le.frame===Be||r.hold))return it(e,u,Le.ew,Le.eh,o,a,Le.crisp),Le.frame===Be?X.pipeFrames++:X.heldFrames++,g(Le.frame===Be?"pipe2":"held");Le=null;const L=bt(l,k,M,s,Ze(r));return L.gl.isContextLost()?!1:(b=performance.now(),Tt(e,we,L.width,L.height,o,a,!!l.style.crisp),X.pipeSyncFrames++,g("sync"))}if(r.pipe){const k=!!Je&&Je.key===l.key&&Je.frame===Be,M=C(),u=r.hold&&(k||!!M&&!!ie&&(ie.tick===ht(r.holdFps)||ie.at>=n-v&&ie.seed===s)),L=u?null:pt(qe,e.canvas,l.fw,l.fh,l.base,i);A=performance.now();const P=u?null:mt(l);if(ye=P?{key:l.key,frame:Be,params:P,at:A}:null,b=performance.now(),k)return Ht(e,o,a,r,Je,l.hk),X.pipeFrames++,g("pipe");if(M&&ie)return it(e,M,ie.ew,ie.eh,o,a,ie.crisp),X.heldFrames++,g("held");const B=bt(l,L,P,s,Ze(r));return B.gl.isContextLost()?!1:(b=performance.now(),Ht(e,o,a,r,{key:l.key,tick:ht(r.holdFps),ew:B.width,eh:B.height,crisp:!!l.style.crisp,at:A,seed:s},l.hk),X.pipeSyncFrames++,g("sync"))}const w=ht(r.holdFps),z=C();if(z&&ie&&ie.tick===w)return it(e,z,ie.ew,ie.eh,o,a,ie.crisp),X.heldFrames++,g("held");const H=pt(qe,e.canvas,l.fw,l.fh,l.base,i);A=performance.now();const ee=bt(l,H,mt(l),s,Ze(r));return ee.gl.isContextLost()?!1:(b=performance.now(),Ht(e,o,a,r,{key:l.key,tick:w,ew:ee.width,eh:ee.height,crisp:!!l.style.crisp,at:A,seed:s},l.hk),g("sync"))}catch(r){return ue=null,Mo("exception in applySuperRiso",r),!1}}export{sr as applySuperRiso,rr as beginSuperRisoFrame};
