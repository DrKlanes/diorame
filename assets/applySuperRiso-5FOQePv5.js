import{X as ka,l as Fe,h as me,r as ot,S as Ma,o as Me,M as nt,p as Lo,s as Zt,x as Sa,b as Pa,c as Ro,d as wa,e as Aa,f as Ea,i as Ta,j as La,A as Ra,k as Ba}from"./index-Dx8629E2.js";const Fa=17.2,Da=`#version 300 es
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
`,mo=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,ze=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,Ve=je+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Ca=je+ze+`
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
}`,Na=je+ze+`
uniform sampler2D uPrep, uSetA, uSetB; uniform int uN; uniform float uMinDot;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 c=clamp(texture(uPrep,uv).rgb,0.,1.)*32.;
  float z0=min(floor(c.b),31.), fz=c.b-z0;
  vec2 q0=vec2(z0*33.+c.r+.5, c.g+.5)/vec2(1089.,33.), q1=vec2((z0+1.)*33.+c.r+.5, c.g+.5)/vec2(1089.,33.);
  vec4 A=mix(texture(uSetA,q0),texture(uSetA,q1),fz), B=mix(texture(uSetB,q0),texture(uSetB,q1),fz);
  // tonos muy bajos: la trama no sujeta el punto y se pierden, pero sin escalón
  A*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),A); B*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),B);
  oA=A; oB=B;
}`,qa=je+ze+`
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
  oA=A; oB=B; }`,ja=je+ze+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Ia=je+ze+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,ho=je+po+ze+`
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
}`,Jo=je+po+ze+`
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
  oA=A; oB=B; }`,$a=je+po+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,za={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,fill:1,single:.035,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},Bo={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},Ua={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},Ee=(e,o,a)=>e+(o-e)*a;function vo(e,o){return{printW:240,pxmm:o*Ee(.4,1,e)/240,crisp:e<.5,scanBlur:Ee(1,.65,e),scanNoise:Ee(.6,.35,e)}}function Oa(e,o){const a=Object.assign({},Ua,e),t=a.imperfection,n=a.resolution,i=a.screenSize;return Object.assign({...vo(n,o),screen:a.screen==="dots"?1:0,grain:Ee(.09,.3,i),lpi:Math.round(Ee(120,45,i)),misreg:.04+.6*Math.pow(t,1.6),rot:Ee(.01,.1,t),scl:Ee(.2,1.2,t),edge:Ee(.2,.65,t),voids:Ee(.05,.4,t),texAmp:Ee(.5,1.05,t),starve:Ee(.05,.4,t),mottle:Ee(.3,1.2,t),bleed:Ee(.04,.07,t),inkLoad:Ee(.75,.5,t)},Bo[a.paper]||Bo.natural)}function Wa(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,i=[],u=[];let c=0;const r=new Uint8Array(4),m=(s,l)=>{let x=t.get(s);x||(x=[],t.set(s,x)),x.push(l)};return{get mode(){return a},timerAvailable:!!o,setMode(s){a=s==="timer"&&!o?"off":s,t.clear(),n.clear(),i.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r),c=performance.now()),a==="timer"&&this.poll()},before(s,l){if(n.has(s)||(n.set(s,l),i.push(s)),a!=="timer"||!o)return null;const x=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,x),x},after(s,l){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,r);const x=performance.now();m(s,x-c),c=x}else l&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),u.push({name:s,q:l}))},poll(){if(o)for(;u.length&&e.getQueryParameter(u[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:s,q:l}=u.shift();e.getParameter(o.GPU_DISJOINT_EXT)||m(s,e.getQueryParameter(l,e.QUERY_RESULT)/1e6),e.deleteQuery(l)}},report(){return i.map(s=>{const l=[...t.get(s)??[]].sort((x,L)=>x-L);return{name:s,p50:l.length?l[Math.floor(l.length/2)]:null,n:l.length,info:n.get(s)}})}}}const Ga=Ve+`
out vec4 o;
uniform sampler2D uPrep; uniform float uDark, uSoft, uMotion, uPhoto, uLpi, uLid, uTexPx;
float lumP(vec3 c){ vec3 l=s2l(c); return pow(dot(l,vec3(.2126,.7152,.0722)),1./2.2); }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm;
  float L=lumP(texture(uPrep,uv).rgb);
  // v23.15 — textura de tinta de Diorame. Un .dior trae en sus tintas un ruido de celdas CUADRADAS de contraste mínimo (±1 %),
  // y su celda crece con el zoom del encuadre. En un tono medio el umbral lo amplificaba ×20: un damero. Antes de umbralizar,
  // el tono de cada píxel es la media de los 7×7 vecinos, a 1,3 celdas de distancia, que se le parecen (±0,03): con 49 celdas
  // el residuo queda muy por debajo del grano de la copiadora (con 25 aún dejaba un moteado con el ritmo de las celdas), y decide
  // el tóner. Un contorno o una línea no se parecen a sus vecinos y quedan como estaban. uTexPx = px por celda (0 en una imagen
  // normal: no hace nada). Descartado: quedarse con el vecino más claro (la textura es ruido continuo: aclaraba toda la zona).
  if(uTexPx>.75){ float a=0., ws=0.;
    for(int j=-3;j<=3;j++) for(int i=-3;i<=3;i++){ float l=lumP(texture(uPrep,uv+vec2(i,j)*1.3*uTexPx/uRes).rgb), w=exp(-(l-L)*(l-L)/.0012); a+=l*w; ws+=w; }
    L=a/ws; }
  if(uMotion>0.){ for(int k=1;k<=14;k++){ float t=float(k)/14.; vec2 off=vec2(0.,-t*uMotion*uPxMm)/uRes;
      L=min(L, mix(lumP(texture(uPrep,uv+off).rgb),1.,t*t*.8)); } }               // estela oscura en la dirección del barrido
  float scr=0.;
  if(uPhoto>0.){ vec2 r=mat2(.7071,.7071,-.7071,.7071)*mm*(uLpi/25.4);              // modo foto: trama de líneas gruesa a 45°
    scr=(abs(fract(r.x)-.5)*2.-.5)*.55*uPhoto*smoothstep(.04,.25,L)*smoothstep(.98,.75,L); }
  float t=mix(.26,.74,uDark);
  // v23.15 — el umbral nunca es más brusco que UN píxel de la señal. Antes dividía por uSoft fijo (0,05): una rampa de
  // antialiasing de 1 px del original quedaba en ~0,05 px, o sea, cada píxel decidía negro o blanco y las curvas salían en
  // escalera a cualquier resolución. Ahora el ancho es el mayor entre uSoft y lo que la señal cambia en un píxel: el contorno
  // conserva su posición sub-píxel (cobertura), y en zonas planas o degradados nada cambia. Pendiente por diferencias de 4
  // lecturas (sin dFdx/fwidth: no valen en ANGLE/D3D dentro de estos shaders).
  vec2 p1=1./uRes;
  vec2 gL=vec2(lumP(texture(uPrep,uv+vec2(p1.x,0.)).rgb)-lumP(texture(uPrep,uv-vec2(p1.x,0.)).rgb), lumP(texture(uPrep,uv+vec2(0.,p1.y)).rgb)-lumP(texture(uPrep,uv-vec2(0.,p1.y)).rgb))*.5;
  float gS=uPhoto>0. ? 1.1*uPhoto*(uLpi/25.4)/uPxMm : 0.;                            // lo que cambia la trama del modo foto en un píxel
  float v=(t-L+scr)/max(max(uSoft,.004), length(gL)*2.2+gS*.9);
  float d=clamp(.5+v,0.,1.);
  if(uLid>0.){ vec2 g=gpx(); float m=uLid*.07*min(uImg.x,uImg.y);                 // tapa abierta: marco negro fuera del original
    vec2 e=min(g, uImg-g); float out_=m-min(e.x,e.y);
    float sh=smoothstep(-1.2*uPxMm, .4*uPxMm, out_);
    d=max(d, sh*(.82+.18*vnoise(mm/1.7))); }
  o=vec4(d,0.,0.,1.); }`,Xa=Ve+`
out vec4 o;
uniform sampler2D uD, uGreen; uniform float uThr, uGrain, uDust, uFog, uStreak, uGen;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// v23.15 — grano del tóner (racimos + grano fino) como campo continuo. Antes el ruido en racimos se leía alineado con la
// rejilla de su textura y el fino iba por debajo del píxel: al umbralizarlo, un tono medio salía como un damero de cuadraditos.
// Ahora los racimos son dos lecturas giradas (sin ejes) y el grano fino solo cuenta en la medida en que un píxel puede verlo.
// El racimo nunca es más fino que lo que la rejilla puede enseñar (1 px; 1,25 hasta v23.15): a pocos px/mm (hoja grande en la vista previa) la
// textura se leía por debajo del píxel y salía una trama. Y un moteado a dos escalas: el tóner no se deposita parejo, así que
// un tono medio rompe en manchas irregulares y no en un punteado uniforme. v23.16: el moteado sigue al tamaño de trama (15 y
// 6 veces uGrain: ≈1 y ≈0,45 mm con la trama por defecto, la mitad con la trama al mínimo) y pesa menos (0,09; era 0,12 a
// escala fija, y con la trama al mínimo quedaba una mancha gruesa que el deslizador no movía).
float grainF(vec2 mm, float g, float pm){ vec2 q=mm/max(uGrain*3.,pm)/1024.;
  float n=(texture(uGreen, mat2(.891,.454,-.454,.891)*q+vec2(g*.31,g*.17)).r+texture(uGreen, mat2(.454,.891,-.891,.454)*q+vec2(g*.17+.37,g*.31+.61)).r-1.)*.7071;
  float n2=(vnoise(mat2(.8,.6,-.6,.8)*mm/.03+g*3.7)-.5)*1.7*min(1.,.06/pm);
  float mo=(vnoise(mat2(.8,.6,-.6,.8)*mm/max(uGrain*15.,3.*pm)+g*5.1)-.5)+.5*(vnoise(mat2(.6,-.8,.8,.6)*mm/max(uGrain*6.,1.5*pm)+g*2.3)-.5);
  return n*.13+n2*.11+mo*.09; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; float g=uGen+uSeed*.137;
  float d=texture(uD,uv).r;
  // v23.15 — mismo criterio que en XLUM, aplicado a densidad + grano: el umbral de cada generación abarca al menos un píxel de
  // lo que umbraliza. Un contorno da cobertura (no escalera) y cada grano sale con su borde, no como un píxel entero.
  float pm=1./uPxMm; vec2 p1=1./uRes;                                                // pm: mm que mide un píxel
  float F=d+grainF(mm,g,pm);
  // v23.16: la pendiente de la densidad (los contornos de las formas) cuenta entera; la del grano, la mitad. Con el grano a
  // rampa completa cada mota salía blanda y, a pocos px/mm, el tono medio parecía una trama gruesa en vez de tóner.
  vec2 gD=vec2(texture(uD,uv+vec2(p1.x,0.)).r-texture(uD,uv-vec2(p1.x,0.)).r, texture(uD,uv+vec2(0.,p1.y)).r-texture(uD,uv-vec2(0.,p1.y)).r)*.5;
  vec2 gN=vec2(grainF(mm+vec2(pm,0.),g,pm)-grainF(mm-vec2(pm,0.),g,pm), grainF(mm+vec2(0.,pm),g,pm)-grainF(mm-vec2(0.,pm),g,pm))*.5;
  float wT=max(.06, length(gD)*1.4+length(gN)*.5);
  float on=smoothstep(uThr-wT,uThr+wT, F);
  // motas del cristal (fijas en la hoja para toda la tirada; cada generación añade su cristal)
  vec2 c=floor(mm/1.6); float hs=h12(c+g*11.3);
  if(hs<uDust*.05){ vec2 ctr=(c+vec2(h12(c+1.7+g),h12(c+5.3+g)))*1.6; float r=max(.07,.035+.16*pow(h12(c+9.1+g),3.));   // v23.15: radio mínimo 0,07 mm
    on=max(on, smoothstep(r+.35*pm, r*.55-.35*pm, length(mm-ctr)+(vnoise(mm*9.)-.5)*.03)*min(1.,2.*r*r/(pm*pm))); }   // v23.15: lo que no llena un píxel lo cubre en proporción (antes: un píxel negro entero o nada)
  // velo de fondo: tóner suelto sobre el blanco
  { vec2 q=mat2(.83,.56,-.56,.83)*mm/.25+g*2.3; vec2 c=floor(q), f=fract(q); float r=mix(.27,.38,h12(c+3.1));   // v23.15: 0,07–0,095 mm (antes 0,02–0,045: menos que un píxel, salían como píxeles sueltos)
    vec2 ctr=vec2(r)+(1.-2.*r)*vec2(h12(c+1.7),h12(c+4.9));
    float pc=4.*pm; on=max(on, step(h12(c), uFog*.15)*.85*(1.-smoothstep(r*.6,r,length(f-ctr)))*min(1.,2.*r*r/(pc*pc))); }   // v23.15: ídem (pc: un píxel en unidades de celda)
  // rayas del tambor: líneas finas en la dirección de avance (vertical), con intensidad que va y viene
  float col=floor(mm.x/.09); float hr=h12(vec2(col,7.7));
  if(hr<uStreak*.006){ float inten=smoothstep(.35,.7,vnoise(vec2(col*3.1, mm.y/35.))); on=max(on, inten*(.6+.4*h12(vec2(col,mm.y*3.)))*min(1.,.09/pm)); }   // v23.15: la raya mide 0,09 mm; en un píxel más ancho ocupa esa fracción
  o=vec4(on,0.,0.,1.); }`,Ka=Ve+mo+ze+`
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
  oA=A; oB=B; }`,Va=Ve+mo+ze+`
uniform sampler2D uPrep, uPS, uLA, uLB, uIdMap; uniform int uNk, uUseMap; uniform vec3 uSrcPaperL; uniform float uMinL;
void main(){ vec2 uv=gl_FragCoord.xy/uRes;
  vec3 L=oklabL(s2l(clamp(texture(uPrep,uv).rgb,0.,1.)));
  float lit=max(smoothstep(uMinL-.04,uMinL+.04,L.x), smoothstep(.09,.15,length(L.yz)));   // 0 = negro: tóner
  vec4 A=vec4(0), B=vec4(0);
  if(uUseMap==1){ vec2 g=gpx()/uImg; ivec2 sz=textureSize(uIdMap,0);                    // huecos blancos: zonas decididas en CPU
    ivec2 q=clamp(ivec2(g*vec2(sz)),ivec2(0),sz-1); int v=int(floor(texelFetch(uIdMap,q,0).r*255./36.+.5))-1;
    for(int i=0;i<6;i++){ if(i<uNk && i==v) put(A,B,i,1.); } }
  else { ivec2 qs=textureSize(uLA,0); vec2 t=gl_FragCoord.xy*.25-.5; ivec2 c0=ivec2(floor(t+.5)); float ws=0.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ ivec2 q=c0+ivec2(x,y); vec2 d=t-vec2(q); q=clamp(q,ivec2(0),qs-1);
      vec3 e=oklabL(s2l(clamp(texelFetch(uPS,q,0).rgb,0.,1.)))-L; e.x*=.6;
      float w=exp(-dot(d,d)/1.3)*(exp(-dot(e,e)/.0025)+.02);                             // cerca Y del mismo color
      A+=texelFetch(uLA,q,0)*w; B+=texelFetch(uLB,q,0)*w; ws+=w; }
    float np=smoothstep(.025,.055,length(L-oklabL(uSrcPaperL)));                        // el papel no se pinta, píxel a píxel (holgado: el grano del relleno no abre huecos)
    A*=np/ws; B*=np/ws; }
  A*=lit; B.rg*=lit; B.b=lit; B.a=1.;
  oA=A; oB=B; }`,Ya=Ve+`
out vec4 o;
uniform sampler2D uMA, uMB, uFA, uFB, uOri; uniform vec2 uSheetMm; uniform vec3 uMk[6]; uniform int uNk, uMed; uniform vec2 uCOff[6];
uniform float uWobble, uCover, uStroke, uAng, uOverlap, uStrength, uSlop, uDry, uWobMm, uGran, uDryB, uBloom, uFast;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.07+11.3; a*=.5; } return s/.9375; }
float mkA(int i, vec2 pmm){ vec2 q=(pmm*uPxMm-uOff)/uRes; return pick(texture(uMA,q),texture(uMB,q),i); }
// rotulador: campo de zona a resolución completa (XEDGE desenfocado), normalizado por su peso. Ningún borde lee la rejilla a ¼.
float mkF(int i, vec2 pmm){ vec2 q=(pmm*uPxMm-uOff)/uRes; vec4 b=texture(uFB,q); return pick(texture(uFA,q),b,i)/max(b.b,.12); }
// cuánto hay de los OTROS rotuladores en este punto (0 = papel o mi zona; 1 = zona de otro)
float othF(int i, vec2 pmm){ vec2 q=(pmm*uPxMm-uOff)/uRes; vec4 a=texture(uFA,q), b=texture(uFB,q); return (a.r+a.g+a.b+a.a+b.r+b.g-pick(a,b,i))/max(b.b,.12); }
// Trazo de rotulador de punta biselada, calibrado con trazos reales (Moisés, 24-oct): extremos casi rectos con esquinas romas,
// banda oscura al FINAL (la punta se para y descarga) y filo fino al empezar; filo oscuro estrecho en los bordes largos (marca
// las costuras al solapar); grano fino de tinta; estrías claras cuando va seco; pulso imperfecto; casi siempre el mismo sentido.
float strokes(int i, vec2 p, float fi, float ang, float zs, float kcut, float zdir, float lim, float tidy, float ct){
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
      float m=mkF(i,pc), g=(mkF(i,pc+dir*.7)-mkF(i,pc-dir*.7))/1.4;
      float thr=.5+(h12(vec2(k+j*.37,fi+4.4))-.5)*.2;                              // umbral estable: un hueco del original no corta pasadas
      float eM=(m-thr)/max(abs(g),.025)+(h12(vec2(k*1.7+j,fi+6.1))-.42)*2.6*uSlop;   // en el contorno: unas pasadas se pasan ~1,5 mm, otras no llegan
      float sk=dv*kcut;                                                         // bisel: corte recto, algo inclinado, igual en los dos extremos
      // el final contra el contorno sigue la forma EN ESTE PÍXEL (no solo en el eje del trazo): en contornos curvos u oblicuos el corte
      // a escuadra de cada pasada dibujaba una escalera del ancho del rotulador. Se conserva un 10 % del corte biselado (carácter de punta)
      // y el mismo pasarse/quedarse corto de cada pasada.
      vec2 gp=vec2(mkF(i,p+vec2(.6,0.))-mkF(i,p-vec2(.6,0.)), mkF(i,p+vec2(0.,.6))-mkF(i,p-vec2(0.,.6)))/1.2;
      float eP=(mkF(i,p)-thr)/max(length(gp),.025)+(h12(vec2(k*1.7+j,fi+6.1))-.42)*2.6*uSlop+(vnoise(p/1.1+fi*3.7)-.5)*.35*(.4+uSlop);
      // ¿EXTREMO o FLANCO? El trazo pinta a lo largo de las manchas, así que casi todo su contorno corre A SU LADO. Ahí la
      // pendiente a lo largo del trazo (g) es casi nula: dividir por ella daba ±20 mm (un bloque del ancho de la pasada) y su
      // signo elegía extremo al azar: almenas cuadradas (v23.9). wE: 1 si el contorno CRUZA el trazo, 0 si corre a su lado.
      float gd=dot(gp,dir), wE=smoothstep(.25,.6,abs(gd)/max(length(gp),1e-4));
      float eC=eP+.1*wE*clamp(eM-eP,-2.,2.);                                    // el bisel, acotado y solo en extremos de verdad
      float eF=(eC+.1*sk)/max(wE,.02), eB=(eC-.1*sk)/max(wE,.02);
      float ea=min(u-s0+sk, gd>=0.? eF : 1e3), eb=min(s1-u-sk, gd<0.? eB : 1e3);   // fuera de la zona (m<umbral) siempre queda fuera
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
      // contra OTRO color no se deshilacha ni se rompe: ahí el papel visto es un halo, no un gesto. Se decide por TRAZO (¿qué hay
      // justo pasado su extremo de salida?), no por píxel: si no, el deshilachado reaparece en una línea paralela a la frontera.
      if(fast>0.){ vec2 pe=p+(sgn>0.?-dir:dir)*(clamp(ea,0.,30.)+.6); fz=mix(fz,1.,max(ct,smoothstep(.15,.4,othF(i,pe))*(1.-min(uSlop,1.)))); }
      if(fast>0.) ea=max(ea,.6)+(ea<0.?-9.:0.);                                // la salida rápida no tiene canto recto
      float eA=hw-abs(dv)+(vnoise(vec2(u/1.6,k+fi))-.5)*.09+(vnoise(p/.12+fi)-.5)*.05;
      float eE=min(min(ea,eb), eC/max(1.-wE,.02))+(vnoise(p/.15+fi*2.)-.5)*.06+.15*ct;   // el flanco recorta con la distancia real, sin deshilachar                  // y los dos colores se pisan un pelo (sin él, cada uno se funde a media tinta en la frontera)
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
float marker(int i, vec2 p, float fi, float ct){
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
  float D=strokes(i,p,fi,a1,h12(b1)*91.,k1,z1,0.,wAl,ct);
  float band=(d2-d1)*62.;                                                       // mm hasta la frontera de zona
  if(band<6.){ float k2=tan(radians(30.*(h12(b2+fi*6.6)-.5)*2.*pow(h12(b2+fi*7.1),.7))); float z2=h12(b2+fi*8.2)<.5?-1.:1.;
    D+=strokes(i,p,fi,a2,h12(b2)*91.,k2,z2,band,wAl,ct); }                            // la zona vecina invade con trazos sueltos, no con una franja
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
    if(uMed==1) D=marker(i,p,fi,smoothstep(.15,.4,othF(i,p))*(1.-min(uSlop,1.)));   // ¿hay OTRO rotulador al otro lado del borde? Con Descuido, los huecos vuelven: son suyos
    else D=water(i,p,mm,fi,cov);
    D*=zone*cov; if(D<=0.) continue;
    T*=pow(max(uMk[i],vec3(1e-3)), vec3(D*uStrength)); }
  o=vec4(T,1.); }`,Qa=Ve+`
out vec4 o;
uniform sampler2D uD; uniform float uHair, uScratch, uPrint, uSmear;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// curva libre: N tramos con giro que va cambiando (pelo, pelusa). Devuelve cobertura con grosor que se afina en las puntas
float curve(vec2 p, vec2 a, float th, float L, float turn, float wig, float w0, float sd, int N){
  float best=0.; vec2 q=a; float ang=th; float l=L/float(N);
  for(int s=0;s<12;s++){ if(s>=N) break; float t=(float(s)+.5)/float(N);
    ang+=turn+(h12(vec2(sd,float(s)))-.5)*wig; vec2 n=q+vec2(cos(ang),sin(ang))*l;
    float w=w0*(.35+.65*sin(3.14159*t));
    float pm=1./uPxMm; best=max(best, (1.-smoothstep(w*.5-.35*pm, w*.5+.02+.35*pm, seg(p,q,n)))*min(1.,(w+.02)/pm)); q=n; }   // v23.15: borde de un píxel y, si el pelo es más fino que el píxel, cubre su fracción
  return best; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm; float sd=uSeed*.731, pm=1./uPxMm;
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
    if(r<3.){ vec2 q=mat2(.6,.8,-.8,.6)*mm/.2; vec2 g=floor(q), f=fract(q); float rr=mix(.35,.47,h12(g+c2+2.2));   // v23.15: 0,07–0,094 mm
      vec2 ce=vec2(rr)+(1.-2.*rr)*vec2(h12(g+c2+.4),h12(g+c2+6.1));
      float pc=5.*pm; dirt=max(dirt, step(h12(g+c2), .45*(1.-r/3.))*.95*(1.-smoothstep(rr*.6,rr,length(f-ce)))*min(1.,2.*rr*rr/(pc*pc))); } }   // v23.15
  // arañazos del cristal: rectos, largos y finos, grises
  vec2 c3=floor(mm/70.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=c3+vec2(x,y); float h=h12(c+sd*.3+11.);
    if(h<uScratch*.5){ vec2 a=(c+vec2(h12(c+1.),h12(c+2.)))*70.; float an=h12(c+3.)*3.1416; vec2 b=a+vec2(cos(an),sin(an))*(30.+80.*h12(c+4.));
      float dd=seg(mm,a,b); float dash=step(.25,vnoise(vec2(dot(mm-a,normalize(b-a))/6.,h*9.)));
      dirt=max(dirt, (1.-smoothstep(.012-.35*pm,.035+.35*pm,dd))*min(1.,.047/pm)*(.35+.3*h12(c+5.))*dash); } }   // v23.15
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,Ha=Ve+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,Za={tech:"xerox",printW:240,pxmm:11.8,seed:1,tex:0,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},Pe=(e,o,a)=>e+(o-e)*a;function Ja(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:ka[e.paper];return{dark:e.dark,tonerK:e.toner,soft:.05,hairs:Pe(.1,1,o),scratch:Pe(0,.7,o),prints:Pe(0,.45,o),smear:Pe(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:Pe(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:Pe(.05,1,o),fog:Pe(.05,1,o),streak:Pe(0,.8,o),band:Pe(.1,.8,o),hollow:Pe(.2,.7,o),grain:Pe(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:Pe(.1,2.2,a),sloppy:Pe(.25,1.2,a),wobble:Pe(.2,.9,a),cover:Pe(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function en(e,o,a){const t=vo(a,o);return{...t,scanBlur:Math.max(.05,.06*t.pxmm),...Object.assign(Ja(e),e.fine),tech:"xerox"}}function tn(e){const{gl:o}=e;let a=null,t=null,n=0,i=0,u=null;const c=o.createTexture();let r;const m=o.createTexture();let s,l=null;const x=()=>{if(!l){l=document.createElement("canvas"),l.width=l.height=1;const k=l.getContext("2d");k.fillStyle="rgb(255,128,0)",k.fillRect(0,0,1,1)}return l};function L(k,E){if(a||(a={xlum:e.compile(Ga),xgen:e.compile(Xa),xid:e.compile(Ka),xedge:e.compile(Va),xcolor:e.compile(Ya),xcomp:e.compile(Ha),xdirt:e.compile(Qa)}),t&&k===n&&E===i)return;t&&Object.values(t).forEach(e.freeTarget),u&&(Object.values(u).forEach(e.freeTarget),u=null),n=k,i=E;const T=Math.max(1,k>>2),$=Math.max(1,E>>2);t={xa:e.target(k,E),xb:e.target(k,E),xc:e.target(k,E),xq1:e.target(T,$,2),xq2:e.target(T,$,2),xs:e.target(T,$)}}function S(k,E,T,$,J,Q,g,P,w=!1){L(Q,g);const d=Object.assign({},Za,k),b=t,C=a,G=Q/d.printW,_=(d.markers||[]).slice(0,6),I=d.hand>0?_.length:0,N=[];for(let p=0;p<6;p++)N.push(...Fe(me(_[p]||"#ffffff")));const ne=(d.keys&&d.keys.length?d.keys:_).slice(0,6),Y=[];for(let p=0;p<6;p++)Y.push(...Fe(me(ne[p]||_[p]||"#ffffff")));d.regionMap&&d.regionMap!==s&&(e.texFrom(d.regionMap,{filter:o.NEAREST},m),s=d.regionMap),!d.regionMap&&s!==null&&(e.texFrom(x(),{filter:o.NEAREST},m),s=null);const oe=ot(d.seed*4241+7),Se=[];for(let p=0;p<6;p++){const R=oe()*Math.PI*2,D=d.offset*(.35+.65*oe());Se.push(Math.cos(R)*D,Math.sin(R)*D)}d.orientMap&&d.orientMap!==r&&(e.texFrom(d.orientMap,{filter:o.NEAREST},c),r=d.orientMap),!d.orientMap&&r!==null&&(e.texFrom(x(),{filter:o.NEAREST},c),r=null);const q=d.regionMap?1:0,B=Fe(me(d.paper)),F=Fe(d.srcPaper||[1,1,1]),M=(p,R,D,h)=>e.run(p,R,D,A=>{A.f("uOff",0,0),A.f("uImg",Q,g),h(A)});M("PREP",e.PR.prep,E.prep,p=>{p.t("uSrc",T),p.f("uSrcRes",$,J),p.f("uSmoothPx",d.smooth*$/d.printW),p.f("uSrcPaper",...d.srcPaper||[1,1,1]),p.f("uPaper",1,1,1)}),M("XLUM",C.xlum,b.xa,p=>{p.f("uPxMm",G),p.t("uPrep",E.prep.t[0]),p.f("uDark",d.dark),p.f("uSoft",d.soft),p.f("uMotion",d.motion),p.f("uPhoto",d.photo),p.f("uLpi",d.lpi),p.f("uLid",d.lid),p.f("uTexPx",d.tex)});const W=(p,R,D,h,A,z)=>M(`BLUR ${p}`,e.PR.blur,D,y=>{y.t("uTexA",R.t[0]),y.t("uTexB",R.t[R.t.length>1?1:0]),y.f("uDir",h,A),y.f("uSig",z)}),ee=w?1:Math.max(1,Math.round(d.gens));for(let p=1;p<=ee;p++){const R=Math.max(.05,d.genSpread*G*(p===1?.6:1));W(`gen${p} H`,b.xa,b.xb,1,0,R),W(`gen${p} V`,b.xb,b.xc,0,1,R),M(`XGEN ${p}`,C.xgen,b.xa,D=>{D.f("uPxMm",G),D.f("uSeed",d.seed),D.t("uD",b.xc.t[0]),D.t("uGreen",e.greenTex),D.f("uThr",d.thr),D.f("uGrain",d.grain),D.f("uDust",d.dust),D.f("uFog",d.fog),D.f("uStreak",d.streak),D.f("uGen",p)})}M("XDIRT",C.xdirt,b.xb,p=>{p.f("uPxMm",G),p.f("uSeed",d.seed),p.t("uD",b.xa.t[0]),p.f("uHair",d.hairs),p.f("uScratch",d.scratch),p.f("uPrint",d.prints),p.f("uSmear",d.smear)});const Z=b.xb;W("sol ¼ H",Z,E.qtmp,1,0,1.1*G/4),W("sol ¼ V",E.qtmp,b.xs,0,1,1.1*G/4);const O=I>0;if(O){W("ps ¼ H",E.prep,E.qtmp,1,0,Math.max(.3,.12*G/4)),W("ps ¼ V",E.qtmp,b.xq1,0,1,Math.max(.3,.12*G/4)),M("XID",C.xid,b.xq2,h=>{h.t("uPS",b.xq1.t[0]),h.fv("uKey",Y,3),h.t("uIdMap",m),h.i("uUseMap",q),h.i("uNk",I),h.f("uSrcPaperL",...F),h.f("uMinL",.32),h.f("uPxMm",G),h.f("uVoteMm",d.colorSmooth)});let p=null;if(d.hand===1){u||(u={e1:e.target(Q,g,2),e2:e.target(Q,g,2),e3:e.target(Q,g,2)});const h=u;M("XEDGE",C.xedge,h.e1,j=>{j.t("uPrep",E.prep.t[0]),j.t("uPS",b.xq1.t[0]),j.t("uLA",b.xq2.t[0]),j.t("uLB",b.xq2.t[1]),j.t("uIdMap",m),j.i("uUseMap",q),j.i("uNk",I),j.f("uSrcPaperL",...F),j.f("uMinL",.32),j.f("uPxMm",G)});const A=Math.max(1,.8*G);let z=h.e1,y=0,U=A*A,X=0;for(;U>.001;){const j=Math.min(Math.sqrt(U),y>0?3*y:3),v=z===h.e3?h.e1:h.e3;X++,W(`edge${X} H`,z,h.e2,1,0,j),W(`edge${X} V`,h.e2,v,0,1,j),z=v,U-=j*j,y=Math.sqrt(y*y+j*j)}p=z}const R=d.hand===1?Math.max(1.5,.8*G/4):Math.max(.3,d.sloppy*G/4);W("mask H",b.xq2,E.qtmp,1,0,R),W("mask V",E.qtmp,b.xq1,0,1,R);const D=p||b.xq1;M("XCOLOR",C.xcolor,b.xc,h=>{h.f("uPxMm",G),h.f("uSeed",d.seed),h.t("uMA",b.xq1.t[0]),h.t("uMB",b.xq1.t[1]),h.t("uFA",D.t[0]),h.t("uFB",D.t[1]),h.fv("uMk",N,3),h.i("uNk",I),h.i("uMed",d.hand),h.fv("uCOff",Se,2),h.f("uWobble",d.wobble),h.f("uCover",d.cover),h.f("uStroke",d.stroke),h.f("uAng",d.strokeAng*Math.PI/180),h.f("uOverlap",d.overlap),h.f("uStrength",d.strength),h.f("uSlop",d.slop),h.f("uDry",d.dry),h.f("uFast",d.fast),r===void 0&&(e.texFrom(x(),{filter:o.NEAREST},c),r=null),h.t("uOri",c),h.f("uSheetMm",Q/G,g/G),h.f("uWobMm",d.wobMm),h.f("uGran",d.gran),h.f("uDryB",d.dryB),h.f("uBloom",d.bloom)})}M("XCOMP",C.xcomp,E.comp,p=>{p.f("uPxMm",G),p.t("uD",Z.t[0]),p.t("uSolX",b.xs.t[0]),p.f("uTonerK",d.tonerK),p.t("uC",b.xc.t[0]),p.t("uFib",e.fibTex),p.f("uPaper",...B),p.f("uHollow",d.hollow),p.f("uBand",d.band),p.f("uPaperTex",d.paperTex),p.f("uFibers",d.fibers),p.f("uHasColor",O?1:0)}),M("SCAN",e.PR.scan,P?E.out:null,p=>{p.f("uSeed",d.seed),p.t("uComp",E.comp.t[0]),p.f("uBlurPx",d.scanBlur),p.f("uNoise",d.scanNoise),p.i("uNorm",0),p.f("uPaper",...B)})}return{render:S}}const on=Ve+mo+ze+`
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
  oA=A; oB=B; }`,an=Ve+`
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
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,nn={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Ue=(e,o,a)=>e+(o-e)*a;function rn(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:Ma[e.sup];return{cut:Ue(.3,4,Math.pow(e.cut,1.5)),facet:Ue(.3,1.1,o),misreg:Ue(0,2.2,o),lift:e.lift,liftMm:Ue(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Ue(.72,1.25,e.load),mist:Ue(.2,.85,o),drop:Ue(.4,3,e.dropSize),drips:e.drips,dripLen:Ue(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Ue(0,1.5,e.supTex),smooth:.12}}function sn(e,o,a){return{...vo(a,o),...rn(e),tech:"stencil"}}const ta=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),oa=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let $t=null;const Jt=2048;function ln(){if($t)return $t;const e=Jt,o=new Float32Array(e*e).fill(2),a=ot(7),t=()=>{let S=0;for(;!S;)S=a();return Math.sqrt(-2*Math.log(S))*Math.cos(6.2832*a())};let n=0;const i=4.6*e*e;for(;n<i;){const S=a()<.07,k=Math.min(16,Math.max(.6,(S?5.5:2.6)*Math.exp(.45*t()))),E=a(),T=a()*e,$=a()*e,J=Math.floor(T),Q=Math.floor($),g=Math.ceil(k),P=k*k;for(let w=-g;w<=g;w++){const d=Q+w+.5-$;if(d*d>P)continue;const b=((Q+w)%e+e)%e*e;for(let C=-g;C<=g;C++){const G=J+C+.5-T;if(G*G+d*d>P)continue;const _=b+((J+C)%e+e)%e;E<o[_]&&(o[_]=E)}}n+=Math.PI*P}const u=4096,c=new Uint32Array(u);let r=0;for(let S=0;S<e*e;S++)o[S]<2&&(c[Math.min(u-1,o[S]*u|0)]++,r++);const m=new Float32Array(u);let s=0;for(let S=0;S<u;S++)s+=c[S],m[S]=s/r;const l=document.createElement("canvas");l.width=l.height=e;const x=l.getContext("2d"),L=x.createImageData(e,e);for(let S=0;S<e*e;S++){const k=o[S]<2?m[Math.min(u-1,o[S]*u|0)]*.985:1,E=Math.round(k*255);L.data[S*4]=L.data[S*4+1]=L.data[S*4+2]=E,L.data[S*4+3]=255}return x.putImageData(L,0,0),$t=l,l}function St(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let i=e;const u=new Float32Array(e.length);for(let c=0;c<3;c++){for(let r=0;r<a;r++){let m=0;const s=r*o;for(let l=-n;l<=n;l++)m+=i[s+Math.min(o-1,Math.max(0,l))];for(let l=0;l<o;l++)u[s+l]=m/(2*n+1),m+=i[s+Math.min(o-1,l+n+1)]-i[s+Math.max(0,l-n)]}for(let r=0;r<o;r++){let m=0;for(let s=-n;s<=n;s++)m+=u[Math.min(a-1,Math.max(0,s))*o+r];for(let s=0;s<a;s++)i=i===e?new Float32Array(e.length):i,i[s*o+r]=m/(2*n+1),m+=u[Math.min(a-1,s+n+1)*o+r]-u[Math.max(0,s-n)*o+r]}}return i}function cn(e,o,a){const t=(s,l)=>{let x=s*374761393+l*668265263+a*982451653|0;return x=(x^x>>>13)*1274126177|0,((x^x>>>16)>>>0)/4294967296},n=Math.floor(e),i=Math.floor(o),u=e-n,c=o-i,r=u*u*(3-2*u),m=c*c*(3-2*c);return(t(n,i)*(1-r)+t(n+1,i)*r)*(1-m)+(t(n,i+1)*(1-r)+t(n+1,i+1)*r)*m}function un(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),i=document.createElement("canvas");i.width=t,i.height=n;const u=i.getContext("2d",{willReadFrequently:!0});return u.fillStyle="#fff",u.fillRect(0,0,t,n),u.drawImage(e,0,0,t,n),{D:u.getImageData(0,0,t,n).data,w:t,h:n,sp:Fe(o).map(c=>Math.max(c,.02))}}const fn=.04;function pn(e,o,a,t=null){const{D:n,w:i,h:u,sp:c}=un(e,o),r=new Float64Array(256),m=new Float64Array(256),s=t?Me(t):null;let l=0;for(let g=0;g<i*u;g++){const P=Me([0,1,2].map(b=>oa(Math.min(1,ta(n[g*4+b]/255)/c[b])))),w=Math.max(0,Math.min(1,1-P[0]+.3*Math.hypot(P[1],P[2]))),d=Math.min(255,w*256|0);if(m[d]++,s){const b=Me([n[g*4]/255,n[g*4+1]/255,n[g*4+2]/255]);if(Math.hypot(b[0]-s[0],b[1]-s[1],b[2]-s[2])<fn)continue}r[d]++,l++}l<i*u*.05&&r.set(m);{let g=0,P=0;for(let w=0;w<256;w++)g+=r[w],w>=20&&(P+=r[w]);if(P>g*.05)for(let w=0;w<20;w++)r[w]=0}const x=64,L=new Float64Array(x);for(let g=0;g<256;g++)L[g>>2]+=r[g];const S=new Float64Array(x+1),k=new Float64Array(x+1);for(let g=0;g<x;g++)S[g+1]=S[g]+L[g],k[g+1]=k[g]+L[g]*(g+.5)/x;const E=(g,P)=>{const w=S[P]-S[g];return w>0?(k[P]-k[g])*(k[P]-k[g])/w:0};let T=-1,$=[];const J=new Array(a).fill(0),Q=(g,P,w)=>{if(g===a){const d=w+E(P,x);d>T&&(T=d,$=J.slice());return}for(let d=P+1;d<=x-(a-g);d++)J[g]=d,Q(g+1,d,w+E(P,d))};return Q(0,0,0),$.map(g=>Math.max(.04,Math.min(.95,g/x)))}function Fo(e,o){const a=o.printW||210,t=o.seed|0,n=ot(t*7919+5),i=o.layers||[],u=()=>{let p=0;for(;!p;)p=n();return Math.sqrt(-2*Math.log(p))*Math.cos(6.2832*n())},c=e.width,r=e.height,m=Math.min(1,1024/Math.max(c,r)),s=Math.max(8,Math.round(c*m)),l=Math.max(8,Math.round(r*m)),x=s*l,L=a/s,S=document.createElement("canvas");S.width=s,S.height=l;const k=S.getContext("2d",{willReadFrequently:!0});k.fillStyle="#fff",k.fillRect(0,0,s,l),k.drawImage(e,0,0,s,l);const E=k.getImageData(0,0,s,l).data,T=Fe(o.srcPaper||[1,1,1]).map(p=>Math.max(p,.02)),$=new Float32Array(x*3);for(let p=0;p<x;p++){const R=[0,1,2].map(h=>oa(Math.min(1,ta(E[p*4+h]/255)/T[h]))),D=Me(R);$[p*3]=D[0],$[p*3+1]=D[1],$[p*3+2]=D[2]}const J=(p,R)=>{const D=(R[0]-$[p*3])*.6,h=R[1]-$[p*3+1],A=R[2]-$[p*3+2];return D*D+h*h+A*A},Q=Math.max(.3,(o.cut||1)*.5/L),g=new Float32Array(x);for(let p=0;p<x;p++)g[p]=Math.max(0,Math.min(1,1-$[p*3]+.3*Math.hypot($[p*3+1],$[p*3+2])));const P=St(g,s,l,Q),w=o.accKey?Me(me(o.accKey)):null;let d=null;if(w){const p=new Float32Array(x);for(let R=0;R<x;R++)p[R]=J(R,w)<.045&&Math.hypot($[R*3+1],$[R*3+2])>.06?1:0;d=St(p,s,l,Q)}const b=i.map(p=>p.kind===1&&p.key?Me(me(p.key)):null),C=i.map((p,R)=>{const D=new Uint8Array(x);if(p.kind===3){if(d)for(let h=0;h<x;h++)D[h]=d[h]>.5?1:0;return D}if(p.kind===1){const h=new Float32Array(x),A=b[R],z=Math.hypot(A[1],A[2]);for(let U=0;U<x;U++){const X=J(U,A);if(X>.06||z>.06&&Math.hypot($[U*3+1],$[U*3+2])<.5*z)continue;let j=!0;for(let v=0;v<b.length;v++)if(v!==R&&b[v]&&J(U,b[v])<X){j=!1;break}h[U]=j?1:0}const y=St(h,s,l,Q);for(let U=0;U<x;U++)D[U]=y[U]>.5?1:0;return D}for(let h=0;h<x;h++)D[h]=P[h]>p.thr&&!(d&&d[h]>.5)?1:0;return D}),G=3072/Math.max(s,l),_=Math.round(s*G),I=Math.round(l*G),N=_/a,ne=()=>{const p=document.createElement("canvas");p.width=_,p.height=I;const R=p.getContext("2d");return R.fillStyle="#000",R.fillRect(0,0,_,I),R.globalCompositeOperation="lighter",[p,R]},Y=["#ff0000","#00ff00","#0000ff"];let oe=null;if(o.bridges){const[p,R]=ne();oe=p;const D=(o.bridgeMm||.9)*N;R.lineCap="butt";const h=new Int32Array(x),A=new Int32Array(x),z=new Int32Array(x).fill(-1),y=new Int32Array(x),U=new Int32Array(x);i.forEach((X,j)=>{if(X.ch==null||X.ch<0)return;const v=C[j];h.fill(-1);let H=0;const ae=[];for(let fe=0;fe<x;fe++){if(v[fe]||h[fe]>=0)continue;let se=0;A[se++]=fe,h[fe]=H;const Ae=[];let Ye=!1;for(;se;){const te=A[--se];Ae.push(te);const Ne=te%s,f=te/s|0;(Ne===0||f===0||Ne===s-1||f===l-1)&&(Ye=!0),Ne>0&&!v[te-1]&&h[te-1]<0&&(h[te-1]=H,A[se++]=te-1),Ne<s-1&&!v[te+1]&&h[te+1]<0&&(h[te+1]=H,A[se++]=te+1),f>0&&!v[te-s]&&h[te-s]<0&&(h[te-s]=H,A[se++]=te-s),f<l-1&&!v[te+s]&&h[te+s]<0&&(h[te+s]=H,A[se++]=te+s)}!Ye&&Ae.length*L*L>=.6&&ae.push([H,Ae]),H++}R.strokeStyle=Y[X.ch],R.lineWidth=D;const de=Math.round(12/L);let he=0;for(const[fe,se]of ae.slice(0,600)){const Ae=se.length*L*L,Ye=Ae<40?1:Ae<400?2:3,te=[],Ne=se.filter(re=>{const xe=re%s;return xe>0&&v[re-1]||xe<s-1&&v[re+1]||v[re-s]||v[re+s]}),f=Math.sqrt(se.length)*.75;for(let re=0;re<Ye;re++){he++;const xe=[];let De=0;for(const ge of Ne)te.some(vt=>Math.hypot(vt%s-ge%s,(vt/s|0)-(ge/s|0))<f)||(z[ge]=he,y[ge]=-1,U[ge]=0,xe.push(ge));let pe=-1;for(;De<xe.length;){const ge=xe[De++],vt=ge%s,To=ge/s|0;if(U[ge]>de)break;for(const Ie of[vt>0?ge-1:-1,vt<s-1?ge+1:-1,To>0?ge-s:-1,To<l-1?ge+s:-1])if(!(Ie<0||z[Ie]===he)){if(!v[Ie]){if(h[Ie]!==fe){y[Ie]=ge,pe=Ie;break}continue}z[Ie]=he,y[Ie]=ge,U[Ie]=U[ge]+1,xe.push(Ie)}if(pe>=0)break}if(pe<0)break;let ce=pe;for(;y[ce]>=0&&v[y[ce]];)ce=y[ce];const lt=y[ce]>=0?y[ce]:ce;te.push(lt);const Nt=(lt%s+.5)/s*_,qt=((lt/s|0)+.5)/l*I,jt=(pe%s+.5)/s*_,It=((pe/s|0)+.5)/l*I,wo=Math.hypot(jt-Nt,It-qt)||1,Ao=(jt-Nt)/wo*.5*N,Eo=(It-qt)/wo*.5*N;R.beginPath(),R.moveTo(Nt-Ao,qt-Eo),R.lineTo(jt+Ao,It+Eo),R.stroke()}}})}const[Se,q]=ne(),B=a*a*l/s,F=o.dripLen||8,M=o.dripW||.9,W=o.drips||0,ee=o.splat||0,Z=i.map((p,R)=>[p,R]).filter(([p])=>p.ch!=null&&p.ch>=0);if(Z.forEach(([p,R],D)=>{if(W<=0)return;const h=C[R],A=[];for(let j=0;j<x-s;j++)h[j]&&!h[j+s]&&A.push(j);const z=.35+.65*(D+1)/Z.length,y=Math.min(260,Math.round(W*A.length*L*.06*z));if(!A.length)return;q.fillStyle=Y[p.ch];let U=0,X=0;for(;U<y&&X<y*8;){X++;const j=A[n()*A.length|0],v=j%s,H=j/s|0;if(n()>.15+cn(v*L/14,H*L/14,t+R*31))continue;U++;let ae=F*Math.exp(.75*u());n()<.25&&(ae*=.25),ae=Math.max(.8,Math.min(150,ae));const de=M*(.55+.9*n())*(.7+.3*Math.min(1,ae/10)),he=(v+n())*L,fe=(H+1)*L-(.3+n()*1.2),se=(n()-.5)*.8,Ae=.06+n()*.12,Ye=2+n()*4,te=n()*6.28;q.beginPath();const Ne=Math.max(.04,de*.18);let f=he,re=fe,xe=de/2;for(let pe=0;pe<=1.0001;pe+=Ne/ae){re=fe+pe*ae,f=he+se*pe+Ae*Math.sin(pe*ae/Ye+te),xe=de/2*(1-.45*pe)*(pe<.08?1+(.08-pe)/.08*.6:1);const ce=Math.max(.6,xe*N);q.moveTo(f*N+ce,re*N),q.arc(f*N,re*N,ce,0,6.2832)}const De=xe*(1.45+.6*n());q.moveTo(f*N+De*N,(re+De*.4)*N),q.arc(f*N,(re+De*.4)*N,Math.max(.7,De*N),0,6.2832),q.fill()}}),ee>0&&Z.length){const p=Z[Z.length-1],R=C[p[1]],D=[];for(let z=0;z<x;z+=3)R[z]&&D.push(z);const h=Math.min(900,Math.round(ee*220*B/62370)),A=o.splatSize||.8;for(let z=0;z<h;z++){const y=n()<.75?p:Z[n()*Z.length|0];q.fillStyle=Y[y[0].ch];let U,X;if(D.length&&n()<.65){const v=D[n()*D.length|0];U=(v%s+.5)*L+u()*22,X=((v/s|0)+.5)*L+u()*22}else U=n()*a,X=n()*a*l/s;const j=Math.max(.06,Math.min(4.5,A*.5*Math.exp(.8*u())));if(q.beginPath(),n()<.12){const v=n()*6.28;q.ellipse(U*N,X*N,j*N*2.4,j*N*.8,v,0,6.2832)}else q.arc(U*N,X*N,Math.max(.6,j*N),0,6.2832);if(n()<.45){const v=2+(n()*6|0),H=n()*6.28;for(let ae=0;ae<v;ae++){const de=j*(1.3+n()*2.6),he=H+(n()-.5)*1.3,fe=Math.max(.04,j*(.1+n()*.3)),se=(U+Math.cos(he)*de)*N,Ae=(X+Math.sin(he)*de)*N;q.moveTo(se+fe*N,Ae),q.arc(se,Ae,Math.max(.5,fe*N),0,6.2832)}}q.fill()}}let O=null;if(o.cloud){const R=Math.ceil(s/4),D=Math.ceil(l/4),h=new Float32Array(R*D);for(let X=0;X<x;X++){let j=0;for(const v of C)if(v[X]){j=1;break}if(j){const v=((X/s|0)/4|0)*R+(X%s/4|0);h[v]=1}}const A=St(h,R,D,(o.cloudMm||18)/(L*4));let z=0;for(const X of A)z=Math.max(z,X);O=document.createElement("canvas"),O.width=R,O.height=D;const y=O.getContext("2d"),U=y.createImageData(R,D);for(let X=0;X<R*D;X++){const j=Math.min(1,A[X]/(z*.55+1e-6));U.data[X*4]=Math.round(255*Math.pow(j,.8)),U.data[X*4+3]=255}y.putImageData(U,0,0)}return{drip:Se,bridge:oe,cloud:O}}function mn(e){const{gl:o}=e;let a=null,t=null,n=0,i=0,u=null,c=null;const r=o.createTexture(),m=o.createTexture(),s=o.createTexture();let l,x=null;const L=()=>{if(!x){x=document.createElement("canvas"),x.width=x.height=1;const E=x.getContext("2d");E.fillStyle="#000",E.fillRect(0,0,1,1)}return x};function S(E,T){if(a||(a={scut:e.compile(on),spray:e.compile(an)}),u||(u=e.texFrom(ln(),{wrap:o.REPEAT,mip:!0})),t&&E===n&&T===i)return;t&&Object.values(t).forEach(e.freeTarget),n=E,i=T;const $=Math.max(1,E>>2),J=Math.max(1,T>>2);t={b1:e.target(E,T),b2:e.target(E,T),sm:e.target(E,T,2),sq:e.target($,J,2),sw:e.target($,J,2)}}function k(E,T,$,J,Q,g,P,w,d=!1){S(g,P);const b=Object.assign({},nn,E),C=t,G=a,_=g/b.printW,I=(b.layers||[]).slice(0,5),N=I.length,ne=ot(b.seed*6151+3),Y=Fe(b.srcPaper||[1,1,1]).map(v=>Math.max(v,.02)),oe=v=>Fe(me(v)).map((H,ae)=>Math.min(1,H/Y[ae])),Se=[],q=[],B=[],F=[],M=[],W=[],ee=[];let Z=0;for(let v=0;v<5;v++){const H=I[v]||{kind:0,thr:2,hex:"#000000"};Se.push(H.kind|0),q.push(H.thr==null?.5:H.thr),B.push(H.ch==null?-1:H.ch),M.push(H.op==null?.97:H.op),F.push(...Fe(me(H.hex))),W.push(...H.key?oe(H.key):[1,1,1]),v<N&&H.kind===1&&(Z=v+1);const ae=ne()*Math.PI*2,de=b.misreg*Math.sqrt(ne());ee.push(Math.cos(ae)*de,Math.sin(ae)*de)}const O=b.maps||{drip:null,bridge:null,cloud:null};O!==l&&(e.texFrom(O.drip||L(),{},r),e.texFrom(O.bridge||L(),{},m),e.texFrom(O.cloud||L(),{},s),l=O);const p=O.drip?Math.max(.03,Math.min(.5,.5*O.drip.width/g)):.5,R=b.accKey?oe(b.accKey):[1,1,1],D=I.some(v=>v.kind===3)?1:0,h=Fe(me(b.support)),A=Fe(me(b.cloudHex||"#f4f4f0")),z=(v,H,ae,de)=>e.run(v,H,ae,he=>{he.f("uOff",0,0),he.f("uImg",g,P),de(he)});z("PREP",e.PR.prep,T.prep,v=>{v.t("uSrc",$),v.f("uSrcRes",J,Q),v.f("uSmoothPx",b.smooth*J/b.printW),v.f("uSrcPaper",...b.srcPaper||[1,1,1]),v.f("uPaper",1,1,1)});const y=(v,H,ae,de,he,fe)=>z(`BLUR ${v}`,e.PR.blur,ae,se=>{se.t("uTexA",H.t[0]),se.t("uTexB",H.t[H.t.length>1?1:0]),se.f("uDir",de,he),se.f("uSig",fe)}),U=Math.max(.05,b.cut*.5*_);y("cut H",T.prep,C.b1,1,0,U),y("cut V",C.b1,C.b2,0,1,U),z("SCUT",G.scut,C.sm,v=>{v.f("uPxMm",_),v.f("uSeed",b.seed),v.t("uSimp",C.b2.t[0]),v.t("uBr",m),v.i("uNL",N),v.i("uNK",Z),v.i("uAccOn",D),v.iv("uKind",Se),v.iv("uCh",B),v.fv("uThr",q,1),v.fv("uKey",W,3),v.f("uAccK",R[0],R[1],R[2]),v.fv("uOffs",ee,2),v.f("uFacet",b.facet),v.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,U))))});const X=Math.max(.3,b.liftMm*_/4);d||(y("lift ¼ H",C.sm,T.qtmp,1,0,X),y("lift ¼ V",T.qtmp,C.sq,0,1,X),y("wide ¼ H",C.sq,T.qtmp,1,0,X*2),y("wide ¼ V",T.qtmp,C.sw,0,1,X*2));const j=d?c??=e.texFrom(L()):null;z("SPRAY",G.spray,T.comp,v=>{v.f("uPxMm",_),v.f("uSeed",b.seed),v.t("uMA",C.sm.t[0]),v.t("uMB",C.sm.t[1]),v.t("uQA",j??C.sq.t[0]),v.t("uQB",j??C.sq.t[1]),v.t("uWA",j??C.sw.t[0]),v.t("uWB",j??C.sw.t[1]),v.t("uDr",r),v.t("uCl",s),v.t("uSpT",u),v.i("uNL",N),v.i("uSup",b.supType|0),v.iv("uCh",B),v.fv("uLc",F,3),v.fv("uOp",M,1),v.f("uSupLin",...h),v.f("uCloudLin",...A),v.f("uSupTex",b.supTex),v.f("uLift",b.lift),v.f("uOver",b.over),v.f("uLoad",b.load),v.f("uMist",b.mist),v.f("uDrop",b.drop),v.f("uCloud",O.cloud?b.cloud:0),v.f("uSpN",Jt),v.f("uTp",Jt/(143.36*b.drop*_)),v.f("uDrTp",p),v.f("uLiftScale",b.liftScale)}),z("SCAN",e.PR.scan,w?T.out:null,v=>{v.f("uSeed",b.seed),v.t("uComp",T.comp.t[0]),v.f("uBlurPx",b.scanBlur),v.f("uNoise",b.scanNoise),v.i("uNorm",0),v.f("uPaper",...h)})}return{render:k}}function Ke(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const Do=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,aa=Ke(Jo,Do,Do+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),Co=2,_o=4,No=8,dn=15,na=16,hn=Ke(aa,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),vn=Ke(ea,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),xn=Ke(Ke(Ke(ho,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),gn=Ke(Ke(Ke(ho,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<1;j++) for(int i=0;i<1;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+vec2(i,j)*px;`),"return cov/9.; }","return cov; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [ligero] 1 submuestra por píxel en lugar de 9."),bn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,qo=new Map,jo=(e,o)=>{let a=qo.get(e);return a||(a=o(),qo.set(e,a)),a};function yn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ot(e);t.lineCap="round";for(let i=0;i<2600;i++){const u=(.25+n()*n()*1.6)*85,c=n()*Math.PI*2,r=n()*1024,m=n()*1024,s=(n()-.5)*.9,l=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=l;for(const x of[-1024,0,1024])for(const L of[-1024,0,1024]){const S=r+x,k=m+L;S<-u-10||S>1024+u+10||k<-u-10||k>1024+u+10||(t.beginPath(),t.moveTo(S,k),t.quadraticCurveTo(S+Math.cos(c+s)*u*.5,k+Math.sin(c+s)*u*.5,S+Math.cos(c)*u,k+Math.sin(c)*u),t.stroke())}}return a}function kn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ot(e);t.lineCap="round",t.globalCompositeOperation="lighter";const i=1024/61;for(let u=0;u<70;u++){const c=n()<.7?"255,0,0":"0,255,0",r=(.4+n()*n()*3.5)*i,m=n()*Math.PI*2,s=n()*1024,l=n()*1024,x=(n()-.5)*1.6,L=(.015+n()*.03)*i;t.strokeStyle=`rgba(${c},${.35+n()*.5})`,t.lineWidth=Math.max(.6,L);for(const S of[-1024,0,1024])for(const k of[-1024,0,1024]){const E=s+S,T=l+k;E<-r||E>1024+r||T<-r||T>1024+r||(t.beginPath(),t.moveTo(E,T),t.bezierCurveTo(E+Math.cos(m+x)*r*.35,T+Math.sin(m+x)*r*.35,E+Math.cos(m-x)*r*.7,T+Math.sin(m-x)*r*.7,E+Math.cos(m)*r,T+Math.sin(m)*r),t.stroke())}}for(let u=0;u<160;u++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const c=(.02+n()*n()*.12)*i;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,c),0,7),t.fill()}return a}function ra(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);t.getExtension("KHR_parallel_shader_compile");function i(B){const F=t.createProgram(),M=[];for(const[ee,Z]of[[t.VERTEX_SHADER,Da],[t.FRAGMENT_SHADER,B]]){const O=t.createShader(ee);t.shaderSource(O,Z),t.compileShader(O),t.attachShader(F,O),M.push(O)}t.bindAttribLocation(F,0,"p"),t.linkProgram(F);let W=null;return{p:F,get u(){if(W)return W;if(!t.getProgramParameter(F,t.LINK_STATUS)){const O=M.find(p=>!t.getShaderParameter(p,t.COMPILE_STATUS));throw new Error(O?t.getShaderInfoLog(O)??"shader compile error":t.getProgramInfoLog(F)??"program link error")}const ee={},Z=t.getProgramParameter(F,t.ACTIVE_UNIFORMS);for(let O=0;O<Z;O++){const p=t.getActiveUniform(F,O);ee[p.name.replace(/\[0\]$/,"")]=t.getUniformLocation(F,p.name)}return W=ee}}}const u=new Map,c=B=>{let F=u.get(B);return F||(F=i(B),u.set(B,F)),F},r={fill:i(qa),sep0:i(Na),lut:i(Ca),prep:i(_a),sep:i(ja),blur:i(Ia),screen:i(ho),spread:i(Jo),compose:i($a),scan:i(ea)},m=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,m),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function s(B,F,{filter:M=t.LINEAR,wrap:W=t.CLAMP_TO_EDGE}={}){const ee=t.createTexture();return t.bindTexture(t.TEXTURE_2D,ee),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,B,F,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,W),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,W),ee}function l(B,{filter:F=t.LINEAR,wrap:M=t.CLAMP_TO_EDGE,mip:W=!1}={},ee=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,ee),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,B),W&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,W?t.LINEAR_MIPMAP_LINEAR:F),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,F),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,M),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,M),ee}function x(B,F,M=1){const W=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,W);const ee=[];for(let Z=0;Z<M;Z++){const O=s(B,F);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+Z,t.TEXTURE_2D,O,0),ee.push(O)}return t.drawBuffers(ee.map((Z,O)=>t.COLOR_ATTACHMENT0+O)),{f:W,t:ee,w:B,h:F}}function L(B){B.t.forEach(F=>t.deleteTexture(F)),t.deleteFramebuffer(B.f)}const S=Wa(t);function k(B,F,M,W){const ee=M?M.w:e.width,Z=M?M.h:e.height,O=F.u;t.useProgram(F.p),t.bindFramebuffer(t.FRAMEBUFFER,M?M.f:null),t.viewport(0,0,ee,Z);let p=0;const R={t(h,A){O[h]!=null&&(t.activeTexture(t.TEXTURE0+p),t.bindTexture(t.TEXTURE_2D,A),t.uniform1i(O[h],p),p++)},f(h,...A){const z=O[h];z!=null&&(A.length===1?t.uniform1f(z,A[0]):A.length===2?t.uniform2f(z,A[0],A[1]):A.length===3?t.uniform3f(z,A[0],A[1],A[2]):t.uniform4f(z,A[0],A[1],A[2],A[3]))},i(h,A){O[h]!=null&&t.uniform1i(O[h],A)},fv(h,A,z){const y=O[h];if(y==null)return;const U=new Float32Array(A);z===1?t.uniform1fv(y,U):z===2?t.uniform2fv(y,U):t.uniform3fv(y,U)},m2(h,A){O[h]!=null&&t.uniformMatrix2fv(O[h],!1,new Float32Array(A))},iv(h,A){O[h]!=null&&t.uniform1iv(O[h],new Int32Array(A))}};R.f("uRes",ee,Z),W&&W(R);const D=S.mode==="off"?null:S.before(B,{w:ee,h:Z,att:M?M.t.length:1});t.drawArrays(t.TRIANGLES,0,3),S.mode!=="off"&&S.after(B,D)}const E=l(o.green,{wrap:t.REPEAT}),T={b:l(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:l(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:l(o.exLut)},$=l(jo("fib11",()=>yn(11)),{wrap:t.REPEAT,mip:!0}),J=l(jo("inc23",()=>kn(23)),{wrap:t.REPEAT,mip:!0}),Q=B=>{B.t("uExB",T.b),B.t("uExR",T.r),B.t("uExLut",T.lut),B.f("uExBSize",T.bs[0],T.bs[1]),B.f("uExRSize",T.rs[0],T.rs[1]),B.f("uExPxMm",Fa)};let g=null,P=null;const w=x(1089,33,2);let d="";const b=t.createTexture();let C=0,G=0,_=null,I=0,N=0;function ne(B,F){if(B===I&&F===N)return;I=B,N=F,_&&Object.values(_).forEach(L);const M=Math.max(1,B>>2),W=Math.max(1,F>>2);_={prep:x(B,F),sep:x(B,F,2),tmp:x(B,F,2),loc:x(B,F,2),qtmp:x(M,W,2),sol:x(M,W,2),scr:x(B,F,2),cov:x(B,F,2),comp:x(B,F),out:x(B,F)},e.width=B,e.height=F}const Y=t.getExtension("EXT_disjoint_timer_query_webgl2");let oe=null;function Se(){if(!Y||!oe||!t.getQueryParameter(oe,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(Y.GPU_DISJOINT_EXT)||(q.gpuMs=t.getQueryParameter(oe,t.QUERY_RESULT)/1e6),t.deleteQuery(oe),oe=null}const q={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:S,lastVariants:"",setSource(B,F=!0){C=B.width,G=B.height;const M=performance.now();l(B,{},b);const W=performance.now();F&&(t.bindTexture(t.TEXTURE_2D,b),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),q.lastUploadMs=W-M,q.lastMipMs=performance.now()-W},invalidateLut(){d=""},present(){if(!_)return;const B=_;k("PRESENT",c(bn),null,F=>{F.t("uT",B.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(B,F={}){const M=Object.assign({},za,B),W=F.preview??0,ee=!!F.lossless||W!==0,Z=!!(W&na),O=(f,re)=>W&f?"preview":ee&&re?"lossless":"lab";q.lastVariants=`screen:${Z?"light":O(No,!1)} spread:${O(Co,!0)} scan:${O(_o,!1)}`;const p=performance.now();Se(),S.mode!=="off"&&S.frameStart();const R=Y&&!oe&&S.mode!=="timer"?t.createQuery():null;R&&t.beginQuery(Y.TIME_ELAPSED_EXT,R);let D=Math.round(M.printW*M.pxmm),h=Math.round(D*G/C);const A=Math.min(n,6144);if(Math.max(D,h)>A){const f=A/Math.max(D,h);D=Math.round(D*f),h=Math.round(h*f)}const z=B.tech==="xerox"||B.tech==="stencil";z&&(D=Math.max(4,D&-4),h=Math.max(4,h&-4)),ne(D,h),q.width=D,q.height=h;const y=_;if(z){const f={gl:t,compile:i,run:k,target:x,freeTarget:L,texFrom:l,greenTex:E,fibTex:$,PR:{prep:r.prep,blur:r.blur,scan:r.scan}},re={prep:y.prep,qtmp:y.qtmp,comp:y.comp,out:y.out};return B.tech==="stencil"?(P??=mn(f)).render(B,re,b,C,G,D,h,!!F.toTexture,Z):(g??=tn(f)).render(B,re,b,C,G,D,h,!!F.toTexture,Z),q.lastVariants=(B.tech??"xerox")+(Z?" light":""),R&&(t.endQuery(Y.TIME_ELAPSED_EXT),oe=R),t.flush(),q.lastMs=performance.now()-p,q}const U=D/M.printW,X=Fe(me(M.paper)),j=Math.min(nt,M.inks.length),v=M.inks.concat(Array(nt).fill("#000000")).slice(0,nt),H=M.opac.concat(Array(nt).fill(.15)).slice(0,nt),ae=[];for(let f=0;f<nt;f++)ae.push(...Fe(me(Lo(v[f]))));const de=v.map(f=>Me(me(Lo(f)))[0]<.42?0:1),he=JSON.stringify([v,H,j,M.paper,M.inkCost,M.pair]);he!==d&&(k("LUT",r.lut,w,f=>{f.fv("uInk",ae,3),f.i("uN",j),f.f("uPaper",...X),f.f("uMu",M.inkCost*.25)}),d=he),k("PREP",r.prep,y.prep,f=>{f.t("uSrc",b),f.f("uSrcRes",C,G),f.f("uSmoothPx",M.smooth*C/M.printW),f.f("uSrcPaper",...M.srcPaper),f.f("uPaper",...X)});const fe=ot(M.seed*7919+13),se=[],Ae=[];for(let f=0;f<nt;f++){const re=(fe()*2-1)*M.rot*Math.PI/180,xe=1+(fe()*2-1)*M.scl/1e3,De=Math.cos(re)*xe,pe=Math.sin(re)*xe;se.push(De,pe,-pe,De);const ce=fe()*Math.PI*2,lt=M.misreg*Math.sqrt(fe());Ae.push(Math.cos(ce)*lt,Math.sin(ce)*lt)}k("SEP0",r.sep0,y.tmp,f=>{f.t("uPrep",y.prep.t[0]),f.t("uSetA",w.t[0]),f.t("uSetB",w.t[1]),f.i("uN",j),f.f("uMinDot",M.minDot)});const Ye=Math.max(.2,M.misreg*.9+.12),te=Math.max(.3,Ye*U/4);k("BLUR fill ¼ H",r.blur,y.qtmp,f=>{f.t("uTexA",y.tmp.t[0]),f.t("uTexB",y.tmp.t[1]),f.f("uDir",1,0),f.f("uSig",te)}),k("BLUR fill ¼ V",r.blur,y.sol,f=>{f.t("uTexA",y.qtmp.t[0]),f.t("uTexB",y.qtmp.t[1]),f.f("uDir",0,1),f.f("uSig",te)}),k("FILL",r.fill,y.loc,f=>{f.t("uRawA",y.tmp.t[0]),f.t("uRawB",y.tmp.t[1]),f.t("uWA",y.sol.t[0]),f.t("uWB",y.sol.t[1]),f.i("uN",j),f.f("uFill",M.fill)}),k("WARP",r.sep,y.sep,f=>{f.f("uPxMm",U),f.t("uSA",y.loc.t[0]),f.t("uSB",y.loc.t[1]),f.i("uN",j),f.f("uCtr",M.printW/2,h/U/2),f.m2("uM",se),f.fv("uT",Ae,2)});const Ne=(f,re,xe,De,pe)=>{k(`BLUR ${f} H`,r.blur,xe,ce=>{ce.t("uTexA",re.t[0]),ce.t("uTexB",re.t[1]),ce.f("uDir",1,0),ce.f("uSig",pe)}),k(`BLUR ${f} V`,r.blur,De,ce=>{ce.t("uTexA",xe.t[0]),ce.t("uTexB",xe.t[1]),ce.f("uDir",0,1),ce.f("uSig",pe)})};return Ne("loc",y.sep,y.tmp,y.loc,.22*U),Ne("sol ¼",y.sep,y.qtmp,y.sol,1.5*U/4),k("SCREEN",Z?c(gn):W&No?c(xn):r.screen,y.scr,f=>{Q(f),f.f("uPxMm",U),f.f("uSeed",M.seed),f.t("uSepA",y.sep.t[0]),f.t("uSepB",y.sep.t[1]),f.t("uSolA",y.sol.t[0]),f.t("uSolB",y.sol.t[1]),f.t("uLocA",y.loc.t[0]),f.t("uLocB",y.loc.t[1]),f.t("uGreen",E),f.i("uN",j),f.i("uMode",+M.screen),f.f("uGrain",M.grain),f.f("uLoad",M.inkLoad),f.f("uLpi",M.lpi),f.f("uMottle",M.mottle),f.f("uStarve",M.starve),f.f("uTexAmp",M.texAmp),f.f("uStreak",M.streak),f.f("uSolidLv",M.solidLv),f.fv("uExSel",de,1),f.f("uTrap",M.trap)}),k("SPREAD",W&Co?c(hn):ee?c(aa):r.spread,y.cov,f=>{Q(f),f.f("uPxMm",U),f.f("uSeed",M.seed),f.t("uScrA",y.scr.t[0]),f.t("uScrB",y.scr.t[1]),f.t("uSepA",y.sep.t[0]),f.t("uSepB",y.sep.t[1]),f.t("uLocA",y.loc.t[0]),f.t("uLocB",y.loc.t[1]),f.i("uN",j),f.f("uBleedPx",M.bleed*U),f.f("uGain",M.gain),f.f("uEdge",M.edge),f.f("uSolidLv",M.solidLv),f.fv("uExSel",de,1)}),k("COMPOSE",r.compose,y.comp,f=>{Q(f),f.f("uPxMm",U),f.f("uSeed",M.seed),f.t("uCovA",y.cov.t[0]),f.t("uCovB",y.cov.t[1]),f.t("uSolA",y.sol.t[0]),f.t("uSolB",y.sol.t[1]),f.f("uStarve",M.starve),f.t("uFib",$),f.t("uInc",J),f.i("uN",j),f.fv("uInk",ae,3),f.fv("uOp",H,1),f.f("uPaper",...X),f.f("uPaperTex",M.paperTex),f.f("uFibers",M.fibers),f.f("uIncl",M.incl),f.f("uVoids",M.voids),f.f("uMottle",M.mottle),f.f("uTexAmp",M.texAmp),f.fv("uExSel",de,1)}),k("SCAN",W&_o?c(vn):r.scan,F.toTexture?y.out:null,f=>{f.f("uSeed",M.seed),f.t("uComp",y.comp.t[0]),f.f("uBlurPx",M.scanBlur),f.f("uNoise",M.scanNoise),f.i("uNorm",+M.normWhite),f.f("uPaper",...X)}),R&&(t.endQuery(Y.TIME_ELAPSED_EXT),oe=R),t.flush(),q.lastMs=performance.now()-p,q}};return q}const sa=new URLSearchParams(window.location.search),tt=sa.get("srdebug")==="1",be=tt?sa:new URLSearchParams,Mn=["srres","srpipe","srhold","srpreview","srprevmask"],K={preserveDrawingBuffer:be.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(be.get("srres"))||1)),mip:be.get("srmip")!=="0",bypass:be.get("srbypass")==="1",darkPaperFromBase:be.get("srdarkpaper")==="bg",simUpload:be.get("srsim")==="1",offscreenBack:be.get("sroff")==="1",bitmapUpload:be.get("srbitmap")==="1",pipe:be.get("srpipe")==="2"?2:be.get("srpipe")==="1"?1:0,hold:be.get("srhold")==="1",lossless:be.get("srlossless")!=="0",preview:be.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(be.get("srprevmask"))||0)),auto:!Mn.some(e=>be.has(e)),forceLevel:be.get("srlevel")==="preview"?"preview":be.get("srlevel")==="full"?"full":null},ia={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},V={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,animRefines:0,lastPath:"",level:""},at={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},zt=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==K.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==K.offscreenBack;Object.assign(K,e),(o||a)&&at.recreateEngine()},Io=5,$o=30,Sn=12,Pn=300,wn=125,eo=new Map;let qe=null,At="";const la=(e,o)=>`${e}×${o}`;function An(e,o){if(K.forceLevel)return Zt(K.forceLevel==="preview"),K.forceLevel;const a=eo.get(la(e,o));return a?(Zt(a==="preview"),a):"detect"}function zo(e,o,a,t){const n=la(e,o);if((!qe||qe.size!==n)&&(qe={size:n,seen:0,samples:[]}),++qe.seen>Io+3*$o&&!qe.samples.length){eo.set(n,"full"),qe=null,At=`${n}: sin medida (${t}) → full`;return}if(qe.seen<=Io||a===null||(qe.samples.push(a),qe.samples.length<$o))return;const i=[...qe.samples].sort((r,m)=>r-m),u=i[i.length>>1],c=u>Sn?"preview":"full";eo.set(n,c),qe=null,At=`${n}: coste p50 ${u.toFixed(1)} ms (${t}) → ${c}`,Zt(c==="preview"),tt&&console.info(`[SuperRiso] quality level ${At}`)}const En=()=>At;let xt=null,Ut=null,Uo=0,xo="";function Tn(e,o,a){return!!e&&!!xt&&o===Ut&&e.length===xt.length&&e.every((n,i)=>n===xt[i])||(Uo=a,xo=o!==Ut?"scene":(e??[]).map((n,i)=>n===xt?.[i]?"":i).filter(n=>n!=="").join(",")),xt=e??null,Ut=o,a-Uo}let Oo=null,Wo=0;function Ln(e,o,a){return a&&o!==Oo&&(Oo=o,Wo++),`${(e??[]).join(",")}|${a?Wo:0}`}const ca=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Ot(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:i,seed:u}){const[c,r]=ca(e.width,e.height,t),m=document.createElement("canvas");m.width=c,m.height=r;const s=m.getContext("2d",{willReadFrequently:!0});s.fillStyle="#fff",s.fillRect(0,0,c,r),s.drawImage(e,0,0,c,r);const l=s.getImageData(0,0,c,r).data,x=Me(a),L=new Int8Array(c*r).fill(-1),S=c*r;if(t){const g=new Uint8Array(S);for(let _=0;_<S;_++){const I=Me([l[_*4]/255,l[_*4+1]/255,l[_*4+2]/255]);g[_]=x[0]-I[0]>.14?1:0}const P=new Uint8Array(g);for(let _=0;_<r;_++)for(let I=0;I<c;I++){if(!g[_*c+I])continue;const N=_*c+I;I>0&&(P[N-1]=1),I<c-1&&(P[N+1]=1),_>0&&(P[N-c]=1),_<r-1&&(P[N+c]=1)}const w=new Int32Array(S).fill(-1),d=new Int32Array(S),b=ot((u|0)*977+13);let C=0;const G=Math.max(6,S*12e-5);for(let _=0;_<S;_++){if(P[_]||w[_]>=0)continue;let I=0;d[I++]=_,w[_]=C;const N=[];let ne=!1;for(;I;){const q=d[--I];N.push(q);const B=q%c,F=q/c|0;(B===0||F===0||B===c-1||F===r-1)&&(ne=!0),B>0&&!P[q-1]&&w[q-1]<0&&(w[q-1]=C,d[I++]=q-1),B<c-1&&!P[q+1]&&w[q+1]<0&&(w[q+1]=C,d[I++]=q+1),F>0&&!P[q-c]&&w[q-c]<0&&(w[q-c]=C,d[I++]=q-c),F<r-1&&!P[q+c]&&w[q+c]<0&&(w[q+c]=C,d[I++]=q+c)}C++;const Y=b(),oe=b();if(N.length<G||ne&&N.length>S*.05||Y>i)continue;const Se=Math.min(n-1,Math.floor(oe*n));for(const q of N)L[q]=Se}for(let _=0;_<3;_++){const I=new Int8Array(L);for(let N=0;N<r;N++)for(let ne=0;ne<c;ne++){const Y=N*c+ne;if(I[Y]>=0||!P[Y])continue;const oe=ne>0&&I[Y-1]>=0?I[Y-1]:ne<c-1&&I[Y+1]>=0?I[Y+1]:N>0&&I[Y-c]>=0?I[Y-c]:N<r-1&&I[Y+c]>=0?I[Y+c]:-1;oe>=0&&(L[Y]=oe)}}}else{const g=o.map(P=>Me(me(P)));for(let P=0;P<S;P++){const w=Me([l[P*4]/255,l[P*4+1]/255,l[P*4+2]/255]),d=Math.hypot(w[0]-x[0],w[1]-x[1],w[2]-x[2]),b=Math.hypot(w[1],w[2]);if(!(d>.08&&(w[0]>.32||b>.12)))continue;let C=-1,G=1e9;for(let _=0;_<g.length;_++){const I=(g[_][0]-w[0])*.6,N=g[_][1]-w[1],ne=g[_][2]-w[2],Y=I*I+N*N+ne*ne;Y<G&&(G=Y,C=_)}G<.045&&(L[P]=C)}}let k=null;if(t){k=document.createElement("canvas"),k.width=c,k.height=r;const g=k.getContext("2d"),P=g.createImageData(c,r);for(let w=0;w<S;w++)P.data[w*4]=(L[w]+1)*36,P.data[w*4+3]=255;g.putImageData(P,0,0)}const E=new Int32Array(S).fill(-1),T=s.createImageData(c,r),$=new Int32Array(S);for(let g=0;g<S;g++)T.data[g*4]=255,T.data[g*4+1]=128,T.data[g*4+2]=0,T.data[g*4+3]=255;let J=0;for(let g=0;g<S;g++){if(L[g]<0||E[g]>=0)continue;const P=L[g];let w=0;$[w++]=g,E[g]=J;const d=[];let b=0,C=0,G=0,_=0,I=0,N=0;for(;w;){const A=$[--w];d.push(A);const z=A%c,y=A/c|0;b++,C+=z,G+=y,_+=z*z,I+=y*y,N+=z*y,z>0&&L[A-1]===P&&E[A-1]<0&&(E[A-1]=J,$[w++]=A-1),z<c-1&&L[A+1]===P&&E[A+1]<0&&(E[A+1]=J,$[w++]=A+1),y>0&&L[A-c]===P&&E[A-c]<0&&(E[A-c]=J,$[w++]=A-c),y<r-1&&L[A+c]===P&&E[A+c]<0&&(E[A+c]=J,$[w++]=A+c)}if(J++,b<6)continue;const ne=C/b,Y=G/b,oe=_/b-ne*ne,Se=I/b-Y*Y,q=N/b-ne*Y,B=.5*Math.atan2(2*q,oe-Se),F=oe+Se,M=oe*Se-q*q,W=Math.sqrt(Math.max(0,F*F/4-M)),ee=F/2+W,Z=Math.max(1e-6,F/2-W),O=Math.sqrt(Z/ee),p=Math.max(0,Math.min(1,(.62-O)/.3)),R=Math.round(127.5+127.5*Math.cos(2*B)),D=Math.round(127.5+127.5*Math.sin(2*B)),h=Math.round(255*p);for(const A of d)T.data[A*4]=R,T.data[A*4+1]=D,T.data[A*4+2]=h}const Q=new Uint8ClampedArray(T.data);for(let g=0;g<2;g++){const P=new Uint8ClampedArray(Q);for(let w=0;w<r;w++)for(let d=0;d<c;d++){const b=w*c+d;if(!(P[b*4+2]>0))for(const[C,G]of[[1,0],[-1,0],[0,1],[0,-1]]){const _=d+C,I=w+G;if(_<0||I<0||_>=c||I>=r)continue;const N=I*c+_;if(P[N*4+2]>0){Q[b*4]=P[N*4],Q[b*4+1]=P[N*4+1],Q[b*4+2]=P[N*4+2];break}}}}return T.data.set(Q),s.putImageData(T,0,0),{ori:m,ids:k}}const ua=300;let Ce=null,to=0,Wt=!1;const ct=document.createElement("canvas"),Rn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:ua}):setTimeout(e,0)},Bn=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),Fn=()=>to;function Dn(e,o,a,t,n,i,u){const c=o.what==="fill",r={keys:c?[]:o.keys??o.paint,srcPaper:t,fill:c,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Ot(e,r);const m=JSON.stringify([c,r.keys,r.nk,c?r.cover:0,c?r.seed:0,t]),s=performance.now(),l={motion:i&&[...i],scene:u};if(!Ce||Ce.key!==m)return Ce={key:m,maps:Ot(e,r),at:s,sig:l},to++,Ce.maps;if(!Wt&&s-Ce.at>=ua&&!Bn(l,Ce.sig)){const[x,L]=ca(e.width,e.height,c);(ct.width!==x||ct.height!==L)&&(ct.width=x,ct.height=L),ct.getContext("2d").drawImage(e,0,0,x,L),Wt=!0,Ce.at=s,Ce.sig=l,Rn(()=>{Wt=!1,!(!Ce||Ce.key!==m)&&(Ce.maps=Ot(ct,r),to++)})}return Ce.maps}const oo=300,Cn=200,_n=e=>Me(me(e))[0]<.3?.995:.97;function Go(e){const o=Me(me(e));let a=Ro[0][1],t=1e9;for(const[,n]of Ro){const i=Me(me(n)),u=Math.hypot(o[0]-i[0],2*(o[1]-i[1]),2*(o[2]-i[2]));u<t&&(t=u,a=n)}return a}const Nn=e=>Me(e)[0]>.8?e:[1,1,1];function qn(e,o,a){const t=(e.dark-.5)*.5,n=r=>Math.max(.03,Math.min(.95,r));let i=[],u=null;if(e.mode==="tone"){const r=e.n;i=a(r).map((s,l)=>({kind:0,thr:n(s-t),hex:Pa[r][l]})),e.accent&&o.length&&(u=o[0],i.push({kind:3,hex:e.colors==="own"?o[0]:Go(o[0])}))}else i=o.slice(0,e.n).sort((m,s)=>Me(me(s))[0]-Me(me(m))[0]).map(m=>({kind:1,key:m,hex:e.colors==="own"?m:Go(m)})),i.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===i.length&&i.forEach((r,m)=>{r.hex=e.manual[m]}),i.forEach(r=>{r.op=_n(r.hex)}),i.map((r,m)=>m).filter(r=>i[r].kind!==3).slice(-3).forEach((r,m)=>{i[r].ch=m}),{layers:i,accKey:u}}const Gt=new Map;let rt=null,Pt=null,Xo=0;const ao=e=>e?[...e]:null;function jn(e,o){const a=ao(e);return(!a||!Pt||a.length!==Pt.length||a.some((t,n)=>t!==Pt[n]))&&(Pt=a,Xo=o),!!a&&o-Xo>=Cn}let ye=null,wt=null,Xt=!1,no=0;const ut=document.createElement("canvas"),In=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:oo}):setTimeout(e,0)},$n=()=>no;function zn(e,o,a,t){const n=Nn(e.srcPaper),i=performance.now(),u=e.isLive?jn(e.motion,i):!0,c=Sa(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&u){const k=ao(e.motion);(!rt||rt.scene!==e.scene||!k||!rt.cam||k.some((T,$)=>T!==rt.cam[$]))&&(!rt||i-rt.at>=oo)&&(Gt.clear(),rt={scene:e.scene,cam:k,at:i})}const r=k=>{const E=`${k}|${n.join(",")}|${e.bg.join(",")}`;let T=Gt.get(E);return T||(T=pn(o,n,k,e.bg),Gt.set(E,T)),T},{layers:m,accKey:s}=qn(e.s,c,r),l={layers:m,accKey:s,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:m,accKey:s,maps:Fo(o,l),srcPaper:n};const x=JSON.stringify([m.map(k=>[k.kind,k.thr,k.key,k.ch]),s,l.cut,l.bridges,l.drips,l.splat,l.cloud,t,l.printW,n]),L=ao(e.motion),S=!ye||ye.key!==x||ye.scene!==e.scene||!L||!ye.cam||L.some((k,E)=>k!==ye.cam[E]);if(S&&(u||!ye||ye.key!==x)&&!Xt&&(!ye||i-ye.at>=oo)){const k=Math.min(1,1024/Math.max(o.width,o.height)),E=Math.max(8,Math.round(o.width*k)),T=Math.max(8,Math.round(o.height*k));(ut.width!==E||ut.height!==T)&&(ut.width=E,ut.height=T),ut.getContext("2d").drawImage(o,0,0,E,T),Xt=!0;const $=e.scene;ye&&(ye.at=i),In(()=>{Xt=!1,ye={key:x,maps:Fo(ut,l),at:performance.now(),cam:L,scene:$},no++})}return ye?u&&!S?{layers:m,accKey:s,maps:ye.maps,srcPaper:n}:((!wt||wt.src!==ye.maps)&&(wt={src:ye.maps,maps:{drip:null,bridge:null,cloud:ye.maps.cloud}},no++),{layers:m,accKey:s,maps:wt.maps,srcPaper:n}):{layers:m,accKey:s,maps:null,srcPaper:n}}const Un=2400,On=240,kt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function Oe(e,o){const a=kt[e];a.push(o),a.length>Un&&a.shift()}function Re(e,o,a){const t=kt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((i,u)=>i-u);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function go(e=On){const o=kt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:Re("interval",.5,e),frameP95:Re("interval",.95,e),totalP50:Re("total",.5,e),totalP95:Re("total",.95,e),flatP50:Re("flat",.5,e),uploadP50:Re("upload",.5,e),uploadP95:Re("upload",.95,e),mipP50:Re("mip",.5,e),renderP50:Re("render",.5,e),backP50:Re("back",.5,e),bitmapWaitP50:Re("bitmapWait",.5,e),gpuP50:Re("gpu",.5,e),gpuP95:Re("gpu",.95,e)}}function fa(){for(const e of Object.keys(kt))kt[e].length=0}let ft=null,gt=null,He=null,Ze=null,Ge=null,pa="",ro="";function ma(e){pa=e}function Kt(e){ro=e,He&&(He.textContent=e,He.style.display=e?"block":"none")}function Ko(e){Ge&&(Ge.disabled=e,Ge.style.opacity=e?".5":"1")}const _e=(e,o=1)=>e===null?"–":e.toFixed(o),so=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function Wn(e){if(!Ze)return;Ze.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",so(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((u,c)=>setTimeout(()=>c(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const i=document.createElement("button");i.textContent="Cerrar",so(i),i.onclick=()=>{Ze&&(Ze.textContent="")},a.append(n,i,t),Ze.append(o,a)}function Gn(e){ft||typeof document>"u"||(ft=document.createElement("div"),ft.setAttribute("data-superriso-overlay",""),Object.assign(ft.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),Ze=document.createElement("div"),Ze.style.pointerEvents="auto",He=document.createElement("div"),Object.assign(He.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),Ge=document.createElement("button"),Ge.textContent="Medir",so(Ge),Ge.style.pointerEvents="auto",Ge.onclick=e,gt=document.createElement("div"),Object.assign(gt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),ft.append(Ze,He,Ge,gt),document.body.appendChild(ft),setInterval(()=>{if(!gt)return;const o=go();gt.textContent=`${pa}
fps ${_e(o.fps)} · frame p50 ${_e(o.frameP50)} p95 ${_e(o.frameP95)} ms
SR p50 ${_e(o.totalP50)} p95 ${_e(o.totalP95)} ms (aplanado ${_e(o.flatP50)} · subida ${_e(o.uploadP50)} · mip ${_e(o.mipP50)} · motor ${_e(o.renderP50)} · vuelta ${_e(o.backP50)})
GPU motor p50 ${_e(o.gpuP50)} p95 ${_e(o.gpuP95)} ms`,ro&&He&&(He.textContent=ro)},500))}const Mt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function da(e){return e&&Mt?new OffscreenCanvas(1,1):document.createElement("canvas")}const bo=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,yo=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},$e=yo(),io=yo();function pt(e,o,a,t,n,i){const{canvas:u,ctx:c}=e;return(u.width!==a||u.height!==t)&&(u.width=a,u.height=t),c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.globalCompositeOperation="source-over",c.fillStyle=n,c.fillRect(0,0,a,t),c.globalCompositeOperation=i?"source-over":"multiply",c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="medium",c.drawImage(o,0,0,a,t),c.globalCompositeOperation="source-over",u}let Te=null,Vt=!1,Vo=0;function Xn(e,o,a){Vo++;const t=Vo;let n=null;if(Te&&Te.bmp.width===o&&Te.bmp.height===a?n={bmp:Te.bmp,lag:t-Te.frame}:Te&&Te.bmp.close(),Te=null,!Vt){Vt=!0;const i=performance.now();createImageBitmap(e).then(u=>{Oe("bitmapWait",performance.now()-i),Te&&Te.bmp.close(),Te={bmp:u,frame:t}}).catch(()=>{}).finally(()=>{Vt=!1})}return n}function Kn(){Te&&Te.bmp.close(),Te=null}function it(e,o,a,t,n,i,u){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!u,e.drawImage(o,0,0,a,t,0,0,n,i)}finally{e.restore()}}function Tt(e,o,a,t,n,i,u){const c=bo(o)?o.transferToImageBitmap():null;try{it(e,c??o,a,t,n,i,u)}finally{c?.close()}}const Qe=yo();let ko=!1;function Mo(e,o,a){const t=bo(e)?e.transferToImageBitmap():null;try{return(Qe.canvas.width!==o||Qe.canvas.height!==a)&&(Qe.canvas.width=o,Qe.canvas.height=a),Qe.ctx.globalCompositeOperation="copy",Qe.ctx.drawImage(t??e,0,0),ko=!0,Qe.canvas}finally{t?.close()}}const Et=()=>ko?Qe.canvas:null,lo=()=>{ko=!1},Lt=()=>({res:1,sim:!1,preview:0,lossless:K.lossless,pipe:0,hold:!1,holdFps:12});function ha(e,o,a){if(!K.auto)return{m:{res:K.resScale,sim:K.simUpload,preview:K.preview,lossless:K.lossless,pipe:K.pipe,hold:K.hold,holdFps:12},level:"manual"};const t=An(e,o);return t!=="preview"?{m:Lt(),level:t}:a.fullQuality?{m:{...Lt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.5,sim:K.simUpload,preview:dn|na,lossless:!0,pipe:1,hold:!0,holdFps:12},level:t}}const Vn=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),va=()=>[`pdb ${K.preserveDrawingBuffer?"on":"off"}`,`mip ${K.mip?"on":"off"}`,K.bitmapUpload?"bitmap":"",K.offscreenBack?Mt?"offscreen":"offscreen→DOM":"",K.bypass?"BYPASS":""].filter(Boolean).join(" · "),dt={inks:null,params:null};function Rt(e,o,a,t){const{settings:n,isDarkMode:i,isPixelArt:u}=a,c=n.technique==="xerox",r=n.technique==="stencil",m=c?en(n.xerox,e*t.res,n.resolution):r?sn(n.stencil,e*t.res,n.resolution):Oa(n,e*t.res),s=Math.round(240*m.pxmm);c&&(m.tex=(a.renderScale??1)*s/e);const l=Math.round(s*o/e),x=t.sim?Math.min(e,s):e,L=t.sim?Math.min(o,l):o,S=La(i,u),k=i&&!K.darkPaperFromBase,E=k?[1,1,1]:me(S),T=c?wa(n,a.shapes,a.hiddenLayers,E,k?S:null):null;T&&a.isLive&&Aa({rows:T.rows,what:T.what,zones:T.zones});const $=T?{inks:T.paint,names:T.rows.map(w=>w.id??""),opac:[],srcPaper:E}:r?{inks:[],names:[],opac:[],srcPaper:E}:Ea(a.shapes,a.hiddenLayers,n,E,k?S:null,!0);a.isLive&&(dt.inks=$);const J=[e,o,+i,+u,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+K.mip,+K.offscreenBack,+K.preserveDrawingBuffer,+K.darkPaperFromBase,n.technique,...T?[n.resolution,JSON.stringify(n.xerox),(T.keys??[]).join(",")]:r?[n.resolution,JSON.stringify(n.stencil)]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],$.inks.join(",")].join("|"),Q=`${J}|${T?Fn():r?$n():0}`,g=T?{x:n.xerox,mk:T,isLive:a.isLive,motion:a.motion&&[...a.motion,...a.anim??[]],scene:a.scene}:void 0,P=r?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:E,darkBase:k?S:null,bg:me(S),isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:m,fw:x,fh:L,base:S,srcPaper:E,inks:$,key:Q,hk:J,xerox:g,stencil:P}}function mt(e){const o=e.stencil;if(o){const n=zn(o,(o.isLive?$e:io).canvas,e.style,1);return o.isLive&&Ta(n.layers.map(i=>({hex:i.hex,kind:i.kind}))),dt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return dt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:Dn((a.isLive?$e:io).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return dt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const Ct=e=>e%9999+1,ht=e=>Math.floor(performance.now()*e/1e3);function Bt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):ht(o)}const Je=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Ft=null;const Yo=()=>{Ft?.destroy(),Ft=null};function Yn(e,o,a,t,n){const i=performance.now(),u=t.exportFrame,c=!u||u.index===0,r=!u||u.index>=u.count-1;try{c&&Yo();const m=Ft??(Ft=ra(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),s=Lt(),l=Rt(o,a,t,s),x=pt(io,e.canvas,l.fw,l.fh,l.base,t.isDarkMode);return m.setSource(x,!0),m.render({...mt(l),seed:Ct(Bt(t))},Je(s)),m.gl.isContextLost()?!1:(Tt(e,m.canvas,m.width,m.height,o,a,!!l.style.crisp),tt&&console.info(`[SuperRiso] export frame ${u?`${u.index+1}/${u.count}`:"single"} ${o}×${a} → sim ${m.width}×${m.height}: ${(performance.now()-i).toFixed(1)} ms · ${m.lastVariants}`),!0)}finally{r&&Yo()}}const co=2e3,xa=8e3,uo=60,Qo=8,st={...ia,simUpload:!0,auto:!1,lossless:!1},yt=e=>new Promise(o=>setTimeout(o,e)),Xe=(e,o=1)=>e===null?"–":e.toFixed(o);let Yt=!1;function Qn(){let o=at.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),i=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:i}}function Hn(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,i=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,c])=>c!==null).sort((c,r)=>r[1]-c[1])[0],u=[];return i&&i[1]>=3&&u.push(`${i[0]} ${Xe(i[1])} ms`),t!==null&&t>=3&&u.push(`fuera de nuestras etapas ${Xe(t)} ms`),u.length?u.join(" + "):"sin espera apreciable"}async function Ho(e){const o=at.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const i=o.report().find(u=>u.name==="SCAN");if(i&&i.n>=uo)break;await yt(100)}e==="timer"&&(await yt(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(i=>i.p50!==null).sort((i,u)=>u.p50-i.p50).map(i=>i.name);return{mode:e,lines:t.map(i=>`  ${i.name.padEnd(13)} ${`${i.info.w}×${i.info.h}`.padEnd(10)} att ${i.info.att}  p50 ${Xe(i.p50,3).padStart(7)} ms  #${n.indexOf(i.name)+1}  (n=${i.n})`)}}function Zn(e,o,a,t,n){const i=Qn(),u=e.find(m=>m.id==="A")?.s.frameP50??null,c=at.engineInfo(),r=[];r.push(`SUPER RISO · medición automática C2a · Diorame ${Ra} · ${new Date().toISOString()}`),r.push(`UA: ${navigator.userAgent}`),r.push(`DPR ${window.devicePixelRatio} · canvas vivo ${V.canvasW}×${V.canvasH} · simulación (última) ${c?`${c.width}×${c.height}`:"–"}`),r.push(`GPU: ${i.renderer} · MAX_TEXTURE_SIZE ${i.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${Mt?"sí":"no"}`),r.push(`Modo ${V.isDark?"oscuro":"claro"} · preset de cámara: ${V.preset||"–"} (velocidad ${V.speed||"–"})`),r.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const m of a)r.push(`AVISO: ${m}`);r.push(`Cada fila: ${co/1e3} s de calentamiento descartados + ${xa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),r.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),r.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),r.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),r.push(""),r.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const m of e){const s=m.s,l=L=>Xe(L,2).padStart(6),x=!m.patch.bypass&&s.frameP50!==null&&u!==null&&s.totalP50!==null?s.frameP50-u-s.totalP50:null;r.push(`${(m.id+" "+m.label).padEnd(20)}${Xe(s.fps).padStart(5)}  ${(Xe(s.frameP50)+"/"+Xe(s.frameP95)).padEnd(11)} |${l(s.totalP50)}${l(s.flatP50)} ${l(s.uploadP50)}${l(s.uploadP95)}${l(s.mipP50)}${l(s.renderP50)}${l(s.backP50)} |${l(x)}    |${l(s.gpuP50)}  ${m.res.padEnd(10)}  ${m.n.pipe}/${m.n.sync}/${m.n.held}  (n=${s.samples})`)}r.push(""),r.push("Dónde cae la espera:");for(const m of e)m.patch.bypass||r.push(`  ${m.id} ${m.label}: ${Hn(m,u)}`);for(const m of n)m&&(r.push(""),r.push(m.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${uo} frames, temporizador de GPU por pasada:`),m.mode==="sync"&&r.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),r.push(...m.lines),r.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return r.join(`
`)}async function Jn(){if(Yt)return;const e=[],o=performance.now()-V.lastCallAt;if(V.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):V.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;Yt=!0,Ko(!0);const a={...K},t=[],n=[];let i=!1,u="–",c=0;const r=async m=>{Kt(`Midiendo ${m.id} (${++c}/${Qo})…`),zt(m.patch),await yt(co),fa();const s={pipe:V.pipeFrames,sync:V.pipeSyncFrames,held:V.heldFrames};await yt(xa);const l=go(1/0);l.gpuP50!==null&&(i=!0);const x={pipe:V.pipeFrames-s.pipe,sync:V.pipeSyncFrames-s.sync,held:V.heldFrames-s.held},L=at.engineInfo(),S={id:m.id,label:m.label,res:m.patch.bypass||!L?"–":`${L.width}×${L.height}`,s:l,patch:m.patch,n:x};return t.push(S),S};try{await r({id:"A",label:"bypass",patch:{...ia,bypass:!0,auto:!1}});const m=await r({id:"B",label:".75 pipe1",patch:{...st,resScale:.75,pipe:1}}),s=await r({id:"C",label:".75 pipe2",patch:{...st,resScale:.75,pipe:2}}),l=(s.s.frameP50??1e9)<(m.s.frameP50??1e9)?2:1;u=`pipe${l} (${l===2?"C":"B"}: frame p50 ${Xe(l===2?s.s.frameP50:m.s.frameP50)} ms frente a ${Xe(l===2?m.s.frameP50:s.s.frameP50)})`,await r({id:"D",label:`.75 pipe${l} lossless`,patch:{...st,resScale:.75,pipe:l,lossless:!0}}),await r({id:"E",label:`.75 pipe${l} preview`,patch:{...st,resScale:.75,pipe:l,lossless:!0,preview:15}}),await r({id:"F",label:`1.0 pipe${l} preview`,patch:{...st,resScale:1,pipe:l,lossless:!0,preview:15}}),await r({id:"G",label:`.75 pipe${l} hold`,patch:{...st,resScale:.75,pipe:l,hold:!0}}),Kt(`Midiendo P (${++c}/${Qo})… perfilado por pasada`),zt({...st,resScale:.75,pipe:1}),await yt(co),n.push(await Ho("sync")),n.push(await Ho("timer"))}finally{zt(a),Kt(""),Ko(!1),Yt=!1}Wn(Zn(t,i,e,u,n))}const er=["greennoise1024","ink_black","ink_red","ink_lut"],tr=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`}),or=()=>Promise.all(er.map(tr)).then(([e,o,a,t])=>({green:e,exBlack:o,exRed:a,exLut:t}));let _t=null,Dt=!1,fo=!1,ue=null,we=da(K.offscreenBack),Zo=K.preserveDrawingBuffer,Qt=0;const So=(e,o)=>{Dt||(Dt=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))};or().then(e=>{_t=e}).catch(e=>So("textures",e));const ga=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===we&&(fo=!0,ue=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===we&&(fo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};ga(we);const ba=()=>{const e=we;ue=null,Kn(),ke=null,et=null,ie=null,ve=null,We=null,Le=null,lo(),we=da(K.offscreenBack),ga(we),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};at.recreateEngine=ba;at.engineInfo=()=>ue?{gl:ue.gl,width:ue.width,height:ue.height}:null;at.profiler=()=>ue?ue.profiler:null;tt&&(Gn(()=>{Jn()}),ma(`SUPER RISO · ${va()}`),window.__superRiso={KNOBS:K,snapshot:go,reset:fa,live:V,qualityReport:En,isSuperRisoPreviewDevice:Ba,get lastChange(){return xo},get inks(){return dt.inks},get params(){return dt.params},get engine(){return ue},get disabled(){return Dt},get glCanvas(){return we},get flat(){return $e.canvas}});function Po(){return ue&&(Zo!==K.preserveDrawingBuffer||bo(we)!==(K.offscreenBack&&Mt))&&ba(),ue||(ue=ra(we,_t,{preserveDrawingBuffer:K.preserveDrawingBuffer}),Zo=K.preserveDrawingBuffer),ue}let Be=0,ke=null,et=null,ie=null,ve=null;const le={begin:0,upload:0,mip:0,render:0,backBegin:0};let We=null,Le=null;const ya=()=>Dt||fo||!_t||K.bypass;function rr(e,o,a){if(!a.isLive||(Be++,et=null,le.begin=0,le.upload=0,le.mip=0,le.render=0,le.backBegin=0,ya()))return;const{m:t}=ha(e,o,a.settings);if(!t.pipe||ve)return;const n=performance.now();try{const i=Rt(e,o,a,t);if(t.pipe===2){ar(i,t,Bt(a),n);return}if(!ke||ke.key!==i.key||ke.frame!==Be-1){ke=null;return}const u=ht(t.holdFps);if(t.hold&&ie&&ie.key===i.hk&&ie.tick===u&&Et())return;const c=Po();c.setSource($e.canvas,K.mip);const r=performance.now(),m=Bt(a),s=ke.at;c.render({...ke.params,seed:Ct(m)},Je(t));const l=performance.now();if(ke=null,c.gl.isContextLost())return;et={key:i.key,frame:Be,ew:c.width,eh:c.height,crisp:!!i.style.crisp,tick:u,at:s,seed:m},le.upload=c.lastUploadMs,le.mip=c.lastMipMs,le.render=l-r,le.begin=l-n}catch(i){ue=null,So("exception in beginSuperRisoFrame",i)}}function ar(e,o,a,t){const n=ht(o.holdFps);if(We&&We.frame===Be-1&&We.key===e.key&&ue){const r=performance.now();ue.present(),Mo(we,We.ew,We.eh),le.backBegin=performance.now()-r,Le={...We,frame:Be}}if(We=null,!ke||ke.key!==e.key||ke.frame!==Be-1){ke=null,le.begin=performance.now()-t;return}if(o.hold&&Le&&Le.key===e.key&&Le.tick===n){le.begin=performance.now()-t;return}const i=Po();i.setSource($e.canvas,K.mip);const u=performance.now();i.render({...ke.params,seed:Ct(a)},Je(o,!0));const c=performance.now();ke=null,!i.gl.isContextLost()&&(We={key:e.key,frame:Be,tick:n,ew:i.width,eh:i.height,crisp:!!e.style.crisp},le.upload=i.lastUploadMs,le.mip=i.lastMipMs,le.render=c-u,le.begin=c-t)}function Ht(e,o,a,t,n,i){if(t.hold){const u=Mo(we,n.ew,n.eh);ie={key:i,tick:n.tick,ew:n.ew,eh:n.eh,crisp:n.crisp,at:n.at,seed:n.seed},it(e,u,n.ew,n.eh,o,a,n.crisp)}else Tt(e,we,n.ew,n.eh,o,a,n.crisp)}function bt(e,o,a,t,n,i=!1){const u=Po(),c=performance.now(),r=K.bitmapUpload?Xn(o,e.fw,e.fh):null,m=performance.now()-c;r?(u.setSource(r.bmp,K.mip),r.bmp.close(),V.bitmapLagFrames=r.lag):u.setSource(o,K.mip);const s=performance.now();return u.render({...a,seed:Ct(t)},n),i&&u.profiler.timerAvailable?zo(V.canvasW,V.canvasH,u.gpuMs===null?null:u.gpuMs+performance.now()-c,"GPU"):i&&(u.finish(),zo(V.canvasW,V.canvasH,performance.now()-c,"readback")),le.upload+=u.lastUploadMs+m,le.mip+=u.lastMipMs,le.render+=performance.now()-s,u}function sr(e,o,a,t){const n=performance.now(),{isDarkMode:i,isLive:u,info:c}=t;if(u&&(tt&&Qt>0&&Oe("interval",n-Qt),Qt=n,V.lastCallAt=n,V.isDark=i,V.canvasW=o,V.canvasH=a,V.preset=c.preset,V.speed=c.speed,V.offscreenFallback=K.offscreenBack&&!Mt),ya())return!1;try{if(!u)return Yn(e,o,a,t,_t);const{m:r,level:m}=ha(o,a,t.settings),s=Bt(t),l=Rt(o,a,t,r);V.level=m,ie&&(ie.key!==l.hk||!r.hold)&&(ie=null,ve||lo());const x=Tn(t.motion,t.playing?null:t.scene,n);let L=n,S=n;const k=(g,P=r)=>{if(V.lastPath=g,!tt)return!0;const w=performance.now();return Oe("flat",L-n),Oe("upload",le.upload),Oe("mip",le.mip),Oe("render",le.render),Oe("back",le.backBegin+(w-S)),Oe("total",le.begin+(w-n)),ue&&ue.gpuMs!==null&&Oe("gpu",ue.gpuMs),ma(`SUPER RISO · ${m} · ${o}×${a} → sim ${ue?`${ue.width}×${ue.height}`:"–"} · src ${l.fw}×${l.fh} · ${Vn(P)} · ${va()} · ${g}`),!0};if(m==="detect"){const g=pt($e,e.canvas,l.fw,l.fh,l.base,i);L=performance.now();const P=bt(l,g,mt(l),s,Je(r),!0);return P.gl.isContextLost()?!1:(S=performance.now(),Tt(e,we,P.width,P.height,o,a,!!l.style.crisp),k("detect"))}if(m==="preview"&&x>=Pn){const g=Lt(),P=Rt(o,a,t,g);ke=null,et=null,ie=null;const w=Et(),d=Ln(t.anim,t.scene,!!t.playing);if(ve&&ve.key===P.key&&ve.tick===s&&w&&(ve.anim===d||n-ve.at<wn))return S=performance.now(),it(e,w,ve.ew,ve.eh,o,a,ve.crisp),V.heldFrames++,k("refined",g);const b=pt($e,e.canvas,P.fw,P.fh,P.base,i);L=performance.now();const C=bt(P,b,mt(P),s,Je(g));if(C.gl.isContextLost())return!1;S=performance.now();const G=!!ve&&ve.key===P.key&&ve.tick===s&&ve.anim!==d;tt&&G?V.animRefines++:tt&&console.info(`[SuperRiso] refine (last change: ${xo})`);const _=Mo(we,C.width,C.height);return ve={key:P.key,tick:s,ew:C.width,eh:C.height,crisp:!!P.style.crisp,anim:d,at:n},it(e,_,C.width,C.height,o,a,ve.crisp),k("refine",g)}ve&&(ve=null,lo());const E=()=>r.hold&&ie&&ie.key===l.hk?Et():null;if(r.pipe===2){const g=pt($e,e.canvas,l.fw,l.fh,l.base,i);L=performance.now();const P=mt(l);ke={key:l.key,frame:Be,params:P,at:L},S=performance.now();const w=Et();if(Le&&Le.key===l.key&&w&&(Le.frame===Be||r.hold))return it(e,w,Le.ew,Le.eh,o,a,Le.crisp),Le.frame===Be?V.pipeFrames++:V.heldFrames++,k(Le.frame===Be?"pipe2":"held");Le=null;const d=bt(l,g,P,s,Je(r));return d.gl.isContextLost()?!1:(S=performance.now(),Tt(e,we,d.width,d.height,o,a,!!l.style.crisp),V.pipeSyncFrames++,k("sync"))}if(r.pipe){const g=!!et&&et.key===l.key&&et.frame===Be,P=E(),w=r.hold&&(g||!!P&&!!ie&&(ie.tick===ht(r.holdFps)||ie.at>=n-x&&ie.seed===s)),d=w?null:pt($e,e.canvas,l.fw,l.fh,l.base,i);L=performance.now();const b=w?null:mt(l);if(ke=b?{key:l.key,frame:Be,params:b,at:L}:null,S=performance.now(),g)return Ht(e,o,a,r,et,l.hk),V.pipeFrames++,k("pipe");if(P&&ie)return it(e,P,ie.ew,ie.eh,o,a,ie.crisp),V.heldFrames++,k("held");const C=bt(l,d,b,s,Je(r));return C.gl.isContextLost()?!1:(S=performance.now(),Ht(e,o,a,r,{key:l.key,tick:ht(r.holdFps),ew:C.width,eh:C.height,crisp:!!l.style.crisp,at:L,seed:s},l.hk),V.pipeSyncFrames++,k("sync"))}const T=ht(r.holdFps),$=E();if($&&ie&&ie.tick===T)return it(e,$,ie.ew,ie.eh,o,a,ie.crisp),V.heldFrames++,k("held");const J=pt($e,e.canvas,l.fw,l.fh,l.base,i);L=performance.now();const Q=bt(l,J,mt(l),s,Je(r));return Q.gl.isContextLost()?!1:(S=performance.now(),Ht(e,o,a,r,{key:l.key,tick:T,ew:Q.width,eh:Q.height,crisp:!!l.style.crisp,at:L,seed:s},l.hk),k("sync"))}catch(r){return ue=null,So("exception in applySuperRiso",r),!1}}export{sr as applySuperRiso,rr as beginSuperRisoFrame};
