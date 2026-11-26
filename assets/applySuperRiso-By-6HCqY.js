import{X as La,S as Ra,s as ao,B as Ba,b as Fa,x as Do,c as na,d as Da,e as Co,f as Ca,h as _a,i as qa,A as Ia,j as Na}from"./index-CS_D_rDa.js";const ja=17.2,za=`#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`,Oe=`#version 300 es
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
`,go=`
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
`,bo=`
vec3 oklabL(vec3 c){
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  l=pow(max(l,1e-7),1./3.); m=pow(max(m,1e-7),1./3.); s=pow(max(s,1e-7),1./3.);
  return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }`,Ge=`layout(location=0) out vec4 oA; layout(location=1) out vec4 oB;
void put(inout vec4 A, inout vec4 B, int i, float v){ if(i<4) A[i]=v; else B[i-4]=v; }`,Je=Oe+`uniform vec2 uOff; uniform vec2 uImg;
vec2 gpx(){ return gl_FragCoord.xy+uOff; }
`,Oa=Oe+Ge+`
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
  oA=A; oB=B; }`,$a=Oe+`
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
}`,Ua=Oe+Ge+`
uniform sampler2D uPrep, uSetA, uSetB; uniform int uN; uniform float uMinDot;
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 c=clamp(texture(uPrep,uv).rgb,0.,1.)*32.;
  float z0=min(floor(c.b),31.), fz=c.b-z0;
  vec2 q0=vec2(z0*33.+c.r+.5, c.g+.5)/vec2(1089.,33.), q1=vec2((z0+1.)*33.+c.r+.5, c.g+.5)/vec2(1089.,33.);
  vec4 A=mix(texture(uSetA,q0),texture(uSetA,q1),fz), B=mix(texture(uSetB,q0),texture(uSetB,q1),fz);
  // tonos muy bajos: la trama no sujeta el punto y se pierden, pero sin escalón
  A*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),A); B*=smoothstep(vec4(uMinDot*.25),vec4(uMinDot*1.25),B);
  oA=A; oB=B;
}`,Wa=Oe+Ge+`
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
  oA=A; oB=B; }`,Ga=Oe+Ge+`
uniform sampler2D uSA, uSB; uniform int uN; uniform vec2 uCtr; uniform mat2 uM[8]; uniform vec2 uT[8];
void main(){
  vec2 mm=gl_FragCoord.xy/uPxMm; vec4 A=vec4(0), B=vec4(0);
  for(int i=0;i<8;i++){ if(i>=uN) break;
    vec2 q=uM[i]*(mm-uCtr)+uCtr+uT[i]; vec2 uv=q*uPxMm/uRes; float v=0.;
    if(all(greaterThanEqual(uv,vec2(0))) && all(lessThanEqual(uv,vec2(1)))) v=pick(texture(uSA,uv),texture(uSB,uv),i);
    put(A,B,i,v); }
  oA=A; oB=B;
}`,Xa=Oe+Ge+`
uniform sampler2D uTexA, uTexB; uniform vec2 uDir; uniform float uSig;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 a=vec4(0), b=vec4(0); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/18.); vec2 o2=uDir*float(i)*uSig/3./uRes; a+=texture(uTexA,uv+o2)*k; b+=texture(uTexB,uv+o2)*k; w+=k; }
  oA=a/w; oB=b/w; }`,yo=Oe+go+Ge+`
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
}`,ra=Oe+go+Ge+`
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
  oA=A; oB=B; }`,Ka=Oe+go+`
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
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,sa=Oe+`
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
  o=vec4(clamp(s,0.,1.),1.); }`,ot=8,Va={Black:.32,Cornflower:.35,"Light Gray":.4,Gray:.35,Granite:.35,"Metallic Gold":.4,Charcoal:.25,Midnight:.2},Ya={"#000000":"#25222a"},Ha=[["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]],Qa=[["Fluorescent Pink","#ff48b0"],["Yellow","#ffe800"],["Medium Blue","#3255a4"],["Black","#000000"]],ne=e=>(e=e.replace("#",""),[0,2,4].map(o=>parseInt(e.substr(o,2),16)/255)),Za=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),Ce=e=>e.map(Za);function re(e){const[o,a,t]=Ce(e),n=Math.cbrt(.4122214708*o+.5363325363*a+.0514459929*t),r=Math.cbrt(.2119034982*o+.6806995451*a+.1073969566*t),u=Math.cbrt(.0883024619*o+.2817188376*a+.6299787005*t);return[.2104542553*n+.793617785*r-.0040720468*u,1.9779984951*n-2.428592205*r+.4505937099*u,.0259040371*n+.7827717662*r-.808675766*u]}const Tt=(e,o)=>Math.hypot(e[0]-o[0],2*(e[1]-o[1]),2*(e[2]-o[2])),qt=e=>Ya[e.toLowerCase()]||e,Ja=(e,o)=>Va[e]??(re(ne(o))[0]<.3?.3:.15);function ct(e){let o=e>>>0||1;return()=>(o^=o<<13,o>>>=0,o^=o>>17,o^=o<<5,o>>>=0,o/4294967296)}function en(e,o,a){let t=null,n=1e9;const r=re(o);for(const[u,c]of e){if(a.has(u))continue;const i=Tt(re(ne(c)),r);i<n&&(n=i,t=[u,c])}return t}const tn={inks:["#000000"],names:["Black"],opac:[.32],printW:240,pxmm:11.8,srcPaper:[1,1,1],smooth:.25,inkCost:.03,pair:.01,trap:1,minDot:.06,solidLv:.8,fill:1,single:.035,misreg:.3,rot:.04,scl:.6,screen:0,grain:.16,inkLoad:.6,lpi:85,gain:.5,bleed:.045,edge:.5,texAmp:.85,mottle:.5,streak:0,voids:.15,starve:.15,paperTex:.2,fibers:.25,incl:.15,paper:"#f3efe6",scanBlur:.7,scanNoise:.35,normWhite:1,seed:1},_o={white:{paper:"#f8f7f3",fibers:.15,incl:0,paperTex:.15},natural:{paper:"#f3efe6",fibers:.25,incl:.12,paperTex:.2},recycled:{paper:"#ebe5d6",fibers:.5,incl:.6,paperTex:.35},cream:{paper:"#f4e9d0",fibers:.3,incl:.15,paperTex:.22}},on={inkSet:"own",maxInks:6,paper:"natural",screen:"grain",screenSize:.5,imperfection:.4,resolution:.7,reprintFps:0},Be=(e,o,a)=>e+(o-e)*a;function ko(e,o){return{printW:240,pxmm:o*Be(.4,1,e)/240,crisp:e<.5,scanBlur:Be(1,.65,e),scanNoise:Be(.6,.35,e)}}function an(e,o){const a=Object.assign({},on,e),t=a.imperfection,n=a.resolution,r=a.screenSize;return Object.assign({...ko(n,o),screen:a.screen==="dots"?1:0,grain:Be(.09,.3,r),lpi:Math.round(Be(120,45,r)),misreg:.04+.6*Math.pow(t,1.6),rot:Be(.01,.1,t),scl:Be(.2,1.2,t),edge:Be(.2,.65,t),voids:Be(.05,.4,t),texAmp:Be(.5,1.05,t),starve:Be(.05,.4,t),mottle:Be(.3,1.2,t),bleed:Be(.04,.07,t),inkLoad:Be(.75,.5,t)},_o[a.paper]||_o.natural)}function nn(e){const o=e.getExtension("EXT_disjoint_timer_query_webgl2");let a="off";const t=new Map,n=new Map,r=[],u=[];let c=0;const i=new Uint8Array(4),f=(s,l)=>{let g=t.get(s);g||(g=[],t.set(s,g)),g.push(l)};return{get mode(){return a},timerAvailable:!!o,setMode(s){a=s==="timer"&&!o?"off":s,t.clear(),n.clear(),r.length=0},frameStart(){a==="sync"&&(e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,i),c=performance.now()),a==="timer"&&this.poll()},before(s,l){if(n.has(s)||(n.set(s,l),r.push(s)),a!=="timer"||!o)return null;const g=e.createQuery();return e.beginQuery(o.TIME_ELAPSED_EXT,g),g},after(s,l){if(a==="sync"){e.readPixels(0,0,1,1,e.RGBA,e.UNSIGNED_BYTE,i);const g=performance.now();f(s,g-c),c=g}else l&&o&&(e.endQuery(o.TIME_ELAPSED_EXT),u.push({name:s,q:l}))},poll(){if(o)for(;u.length&&e.getQueryParameter(u[0].q,e.QUERY_RESULT_AVAILABLE);){const{name:s,q:l}=u.shift();e.getParameter(o.GPU_DISJOINT_EXT)||f(s,e.getQueryParameter(l,e.QUERY_RESULT)/1e6),e.deleteQuery(l)}},report(){return r.map(s=>{const l=[...t.get(s)??[]].sort((g,T)=>g-T);return{name:s,p50:l.length?l[Math.floor(l.length/2)]:null,n:l.length,info:n.get(s)}})}}}const rn=Je+`
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
  o=vec4(d,0.,0.,1.); }`,sn=Je+`
out vec4 o;
uniform sampler2D uD, uGreen; uniform float uThr, uGrain, uDust, uFog, uStreak, uGen, uTDry;
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// v23.15 — grano del tóner (racimos + grano fino) como campo continuo. Antes el ruido en racimos se leía alineado con la
// rejilla de su textura y el fino iba por debajo del píxel: al umbralizarlo, un tono medio salía como un damero de cuadraditos.
// Ahora los racimos son dos lecturas giradas (sin ejes) y el grano fino solo cuenta en la medida en que un píxel puede verlo.
// El racimo nunca es más fino que lo que la rejilla puede enseñar (1 px; 1,25 hasta v23.15): a pocos px/mm (hoja grande en la vista previa) la
// textura se leía por debajo del píxel y salía una trama. Y un moteado a dos escalas: el tóner no se deposita parejo, así que
// un tono medio rompe en manchas irregulares y no en un punteado uniforme. v23.16: el moteado sigue al tamaño de trama (15 y
// 6 veces uGrain: ≈1 y ≈0,45 mm con la trama por defecto, la mitad con la trama al mínimo) y pesa menos (0,09; era 0,12 a
// escala fija, y con la trama al mínimo quedaba una mancha gruesa que el deslizador no movía).
// v23.17 — tóner SECO con color a mano (uTDry = 1: rotulador o acuarela; 0: B/N, idéntico a v23.16). Con color debajo, una mota
// gris y blanda deja ver el color a medias y lo ensucia; el tóner es polvo fundido: tapa o no tapa. Con uTDry: el grano fino de
// 0,03 mm solo entra cuando un píxel puede verlo (≥ 33 px/mm; por debajo era ruido por píxel que inflaba la rampa → grises) y el
// moteado de baja frecuencia pesa un 70 % menos (0,027; las manchas de varios mm eran la «nube»). Decisión de Moisés con tablero
// de variantes (tóner seco en todo, V1, frente a v23.16): en B/N prefiere el de siempre; con color, el seco.
float grainF(vec2 mm, float g, float pm){ vec2 q=mm/max(uGrain*3.,pm)/1024.;
  float n=(texture(uGreen, mat2(.891,.454,-.454,.891)*q+vec2(g*.31,g*.17)).r+texture(uGreen, mat2(.454,.891,-.891,.454)*q+vec2(g*.17+.37,g*.31+.61)).r-1.)*.7071;
  float mo=(vnoise(mat2(.8,.6,-.6,.8)*mm/max(uGrain*15.,3.*pm)+g*5.1)-.5)+.5*(vnoise(mat2(.6,-.8,.8,.6)*mm/max(uGrain*6.,1.5*pm)+g*2.3)-.5);
  if(uTDry>.5){ float w2=clamp(.06/pm-1.,0.,1.); float n2=w2>0. ? (vnoise(mat2(.8,.6,-.6,.8)*mm/.03+g*3.7)-.5)*1.7*w2 : 0.;
    return n*.13+n2*.11+mo*.027; }
  // sin color: el texto exacto de v23.16 (el camino B/N no debe cambiar ni un bit)
  float n2=(vnoise(mat2(.8,.6,-.6,.8)*mm/.03+g*3.7)-.5)*1.7*min(1.,.06/pm);
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
  // v23.17, tóner seco: sin el suelo de 0,06 cada partícula tiene el borde de un píxel (donde el grano cambia despacio, el suelo
  // alargaba la transición varios píxeles: grises de aerógrafo). Los contornos conservan su rampa (G1).
  float wT=uTDry>.5 ? max(.012, length(gD)*1.4+length(gN)*.5) : max(.06, length(gD)*1.4+length(gN)*.5);
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
  o=vec4(on,0.,0.,1.); }`,ln=Je+bo+Ge+`
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
  oA=A; oB=B; }`,cn=Je+bo+Ge+`
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
  oA=A; oB=B; }`,un=Je+`
out vec4 o;
uniform sampler2D uMA, uMB, uFA, uFB, uOri; uniform vec2 uSheetMm; uniform vec3 uMk[6]; uniform int uNk, uMed, uOriRows; uniform vec2 uCOff[6];
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
float strokes(int i, vec2 p, float fi, float ang, float zs, float kcut, float zdir, float lim, float glim, float tidy, float ct){
  vec2 dir=vec2(cos(ang),sin(ang)), nr=vec2(-dir.y,dir.x);
  float u=dot(p,dir), v=dot(p,nr);
  float W=uStroke, sp=W*(1.-uOverlap);
  float kc=floor(v/sp); float D=0.;
  // v23.18: ventanas de candidatos COMPLETAS. Con dk −1…2 y dj −1…0 se perdían trazos que sí llegaban a este píxel (la pasada
  // se curva y se inclina hasta ~7 mm; el trazo siguiente empieza antes de su celda): cada pérdida dejaba un corte seco y recto
  // (rendija de papel con canto en escalera). Ahora −5…5 y −1…1, con un descarte barato antes de leer nada.
  for(int dk=-5; dk<=5; dk++){
    float k=kc+float(dk); float hk=h12(vec2(k,fi*7.3+uSeed*.17+zs));
    float wk=W*(.95+.25*h12(vec2(k,fi+2.2+zs)));
    float vc=(k+.5)*sp+(hk-.5)*sp*.45;                                        // separación irregular entre pasadas
    float slope=(h12(vec2(k,fi+5.5+zs))-.5)*.022*(1.-.85*tidy);                 // en figuras alargadas se va recto a lo largo
    float sgn= h12(vec2(k,fi+9.9+zs))<.8 ? zdir : -zdir;
    // trazos de la zona vecina: cada uno entra hasta donde llega (≤ 6 mm). v23.18: el corte, con un píxel de rampa a lo largo de la
    // distancia real a su límite (glim = pendiente de la distancia de banda), no seco: era una línea oblicua en escalera
    float lw=1.;
    if(lim>0.){ lw=clamp(.5+(min(1.+6.*h12(vec2(k,fi+12.1+zs)),6.)-lim)/max(glim,.05)*uPxMm,0.,1.); if(lw<=0.) continue; }
    float P=90.+140.*h12(vec2(k,fi+8.8+zs)); float uo=h12(vec2(k,fi+1.1+zs))*P;   // trazos largos: casi siempre acaban en el contorno
    float Lh=.66*P+3.; if(abs(v-vc)>abs(slope)*Lh+.00025*Lh*Lh+.12+wk*.6) continue;   // esta pasada no llega a este píxel
    float j0=floor((u+uo)/P);
    for(int dj=-1; dj<=1; dj++){
      float j=j0+float(dj); float hj=h12(vec2(k*13.1+j,fi+3.3+zs));
      float hn=h12(vec2(k*13.1+j+1.,fi+3.3+zs));
      float s0=j*P-uo+(hj-.5)*P*.2, s1=(j+1.)*P-uo+(hn-.5)*P*.2+P*(.02+.1*h12(vec2(j,k+fi)));   // el siguiente trazo empieza antes de que este acabe: sin huecos
      if(u<s0-3. || u>s1+3.) continue;                                          // fuera del trazo (con bisel y punta)
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
      float cg=dot(gp,dir)/max(length(gp),1e-4), wE=smoothstep(.25,.6,abs(cg));
      float eC=eP+.1*wE*clamp(eM-eP,-2.,2.);                                    // el bisel, acotado y solo en extremos de verdad
      // v23.18: el contorno es una DISTANCIA en mm (pendiente 1) y su papel de extremo crece con wE, sin decidir por el signo de la
      // pendiente en cada píxel. Antes: eF/eB divididos por max(wE,.02) (×50) y elegidos por gd ≥ 0 píxel a píxel; en flancos y
      // contactos el signo bailaba y el corte saltaba ±0,1·bisel entre píxeles vecinos: diente de sierra.
      float eK=eC+.1*sk*wE*clamp(cg*4.,-1.,1.);                                 // con bisel solo en los extremos de verdad
      float ea=min(u-s0+sk, mix(30.,eK,cg>0.?wE:0.)), eb=min(s1-u-sk, mix(30.,eK,cg<0.?wE:0.));
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
        // v23.18: cada fibra se funde con la vecina en el último medio píxel (antes, canto seco entre fibras: escalera en diagonal);
        // la punta, con al menos un píxel de rampa
        float fx=(dv/hw*.5+.5)*15., fid=floor(fx), fr=fx-fid, fn=fid+(fr<.5?-1.:1.);
        float wn=clamp(.5-(.5-abs(fr-.5))*wk/15.*uPxMm,0.,.5), ft=max(.04,.5/(Lf*uPxMm));
        float r0=(.2+.8*pow(h12(vec2(fid,k*5.+j+fi)),.6))*(.5+.5*side)+.12;    // el lado largo llega más lejos
        float r1=(.2+.8*pow(h12(vec2(fn,k*5.+j+fi)),.6))*(.5+.5*side)+.12;
        float fibOn=mix(smoothstep(1.-t-ft,1.-t+ft,r0), smoothstep(1.-t-ft,1.-t+ft,r1), wn);
        float gap=smoothstep(.45,.62,vnoise(vec2(dv/(wk*.03),u/7.+k)));          // huecos finos entre fibras
        fz=fibOn*mix(1.-gap*.9,1.,smoothstep(.65,1.,t))*mix(.55,1.,t); }
      if(fast>0.){                                                              // a veces se rompe a medio camino y deja islas
        float tt=ea/max(ea+eb,1.);
        float br=step(h12(vec2(j,k*2.3+fi)),.12)*(1.-smoothstep(.15,.3,tt));        // rotura rara y cerca de la salida
        fz*=1.-br*(1.-smoothstep(.18,.3,vnoise(vec2(u/3.5+j*3.,dv/(wk*.6)+k*2.))+.1)); }
      // contra OTRO color no se deshilacha ni se rompe: ahí el papel visto es un halo, no un gesto. Se decide por TRAZO (¿qué hay
      // justo pasado su extremo de salida?), no por píxel: si no, el deshilachado reaparece en una línea paralela a la frontera.
      if(fast>0.){ vec2 pe=p+(sgn>0.?-dir:dir)*(clamp(ea,0.,30.)+.6); fz=mix(fz,1.,max(ct,smoothstep(.15,.4,othF(i,pe))*(1.-min(uSlop,1.)))); }
      float cutF=1.;                                                            // la salida rápida no tiene canto recto: su punta se corta
      if(fast>0.){ cutF=clamp(.5+ea*uPxMm,0.,1.); ea=max(ea,.6); }              // con un píxel de rampa (antes, salto de −9 mm: canto seco)
      float eA=hw-abs(dv)+(vnoise(vec2(u/1.6,k+fi))-.5)*.09+(vnoise(p/.12+fi)-.5)*.05;
      float eE=min(min(ea,eb), eK)+(vnoise(p/.15+fi*2.)-.5)*.06+.15*ct;   // el flanco recorta con la distancia real, sin deshilachar                  // y los dos colores se pisan un pelo (sin él, cada uno se funde a media tinta en la frontera)
      float rc=wk*.12; vec2 q=vec2(rc-eE, rc-eA);
      float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-rc;                       // rectángulo de esquinas romas
      float cov=(1.-smoothstep(-.5,.22,sd+(vnoise(p/.5+fi)-.5)*.12))*fz;        // borde húmedo: se funde ~0,7 mm con la tinta de al lado
      cov*=clamp(.5+eC*uPxMm,0.,1.)*cutF*lw;                                     // v23.18: fuera de la zona, fuera — con un píxel de rampa (antes ×50: escalón)
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
float markerO(int i, vec2 p, float fi, float ct, vec3 ori){
  vec2 z=p/62.; vec2 zc=floor(z); float d1=9., d2=9.; vec2 b1=vec2(0), b2=vec2(0), q1=vec2(0), q2=vec2(0);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=zc+vec2(x,y); vec2 q=c+vec2(h12(c+fi*.3),h12(c+fi*.7+3.1)); float d=length(z-q);
    if(d<d1){ d2=d1; b2=b1; q2=q1; d1=d; b1=c; q1=q; } else if(d<d2){ d2=d; b2=c; q2=q; } }
  // forma de cada mancha de color (analizada una vez, en CPU): si es alargada, se colorea a lo largo de su eje
  float aSh=.5*atan(ori.g*2.-1., ori.r*2.-1.); float wAl=ori.b;
  float rot[4]=float[4](0.,1.5708,-.785,.9);
  float a1=uAng+rot[int(floor(h12(b1+fi*1.9)*3.999))]*step(.35,h12(b1+fi*2.3))+(h12(b1+fi*5.1)-.5)*.3;
  float a2=uAng+rot[int(floor(h12(b2+fi*1.9)*3.999))]*step(.35,h12(b2+fi*2.3))+(h12(b2+fi*5.1)-.5)*.3;
  // mezcla de ángulos en doble ángulo (sin saltos de 180°)
  vec2 v1=mix(vec2(cos(2.*a1),sin(2.*a1)), vec2(cos(2.*aSh),sin(2.*aSh)), wAl); a1=.5*atan(v1.y,v1.x);
  vec2 v2=mix(vec2(cos(2.*a2),sin(2.*a2)), vec2(cos(2.*aSh),sin(2.*aSh)), wAl); a2=.5*atan(v2.y,v2.x);
  float k1=tan(radians(30.*(h12(b1+fi*6.6)-.5)*2.*pow(h12(b1+fi*7.1),.7))); float z1=h12(b1+fi*8.2)<.5?-1.:1.;   // bisel y sentido por zona
  float band=(d2-d1)*62., gb=length((z-q2)/max(d2,1e-5)-(z-q1)/max(d1,1e-5));     // mm hasta la frontera de zona, y su pendiente
  float k2=tan(radians(30.*(h12(b2+fi*6.6)-.5)*2.*pow(h12(b2+fi*7.1),.7))); float z2=h12(b2+fi*8.2)<.5?-1.:1.;
  // la zona vecina invade con trazos sueltos, no con una franja. Una sola llamada a strokes() (compilación): zona 0 = la mía, 1 = la vecina
  float D=0.; int nz=band<6.+2./uPxMm ? 2 : 1;
  for(int zz=0; zz<nz; zz++){ bool nb=zz==1; D+=strokes(i,p,fi,nb?a2:a1,h12(nb?b2:b1)*91.,nb?k2:k1,nb?z2:z1,nb?band:0.,nb?gb:1.,wAl,ct); }
  // tinta con alcohol húmeda sobre húmeda: la segunda pasada redisuelve la primera; el solape oscurece, pero se satura (no dobla)
  return D<=1. ? D : 1.+.3*(1.-exp(-(D-1.)/.5)); }
// v23.18: orientación de la mancha de MI color más cercana (fila i del mapa: A = la mía, B = la otra más cercana, δ = distancia a la
// bisectriz entre las dos, en texels). La costura entre dos manchas se decide con δ interpolado (+ hacia A del texel más cercano),
// no con la celda del mapa: sin mosaico de bloques ni orientaciones de otro color.
float oriSeam(int i, vec2 p, out vec3 oA, out vec3 oB){
  ivec2 sz=textureSize(uOri,0); int W=sz.x/3, H=sz.y/max(uOriRows,1); ivec2 o=ivec2(0,i*H), mx=ivec2(W-1,H-1);
  vec2 t=clamp(p/uSheetMm,0.,1.)*vec2(W,H);
  ivec2 q=clamp(ivec2(t),ivec2(0),mx); oA=texelFetch(uOri,q+o,0).rgb; oB=texelFetch(uOri,q+o+ivec2(W,0),0).rgb;
  vec2 tc=t-.5; ivec2 b=ivec2(floor(tc)); vec2 f=tc-vec2(b); float s[4];
  for(int n=0;n<4;n++){ ivec2 qn=clamp(b+ivec2(n&1,n>>1),ivec2(0),mx)+o; float d=texelFetch(uOri,qn+ivec2(2*W,0),0).r*255./60.;
    s[n]=all(equal(texelFetch(uOri,qn,0).rgb,oA)) ? d : -d; }
  return mix(mix(s[0],s[1],f.x),mix(s[2],s[3],f.x),f.y)*uSheetMm.x/float(W); }   // mm con signo: + del lado de A
float marker(int i, vec2 p, float fi, float ct){                               // una sola llamada a markerO (compilación)
  vec3 oA, oB; float w=1.;
  if(uOriRows>0){ float sg=oriSeam(i,p,oA,oB); w=clamp(.5+sg*uPxMm,0.,1.); }    // costura entre manchas: un píxel de rampa
  else { oA=texture(uOri, p/uSheetMm).rgb; oB=oA; }
  int s0=w>=1.?0:(w<=0.?1:0), s1=w<=0.?1:(w>=1.?0:1); float D=0.;           // junto a la costura, las dos orientaciones; si no, una
  for(int s=s0;s<=s1;s++) D+=(s==0?w:1.-w)*markerO(i,p,fi,ct,s==0?oA:oB);
  return D; }
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
    // v23.18: lejos de la zona de este rotulador (campo < 0,003, ≥ 2 mm fuera) ningún trazo puede pintar (eP ≈ −20 mm): no se evalúa
    if(uMed==1 && mkF(i,p)<.003) continue;
    if(uMed==1) D=marker(i,p,fi,smoothstep(.15,.4,othF(i,p))*(1.-min(uSlop,1.)));   // ¿hay OTRO rotulador al otro lado del borde? Con Descuido, los huecos vuelven: son suyos
    else D=water(i,p,mm,fi,cov);
    D*=zone*cov; if(D<=0.) continue;
    T*=pow(max(uMk[i],vec3(1e-3)), vec3(D*uStrength)); }
  o=vec4(T,1.); }`,fn=Je+`
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
  o=vec4(max(d,dirt),0.,0.,1.); }`,mn=Je+`
out vec4 o;
uniform sampler2D uD, uSolX, uC, uFib; uniform vec3 uPaper; uniform float uHollow, uBand, uPaperTex, uFibers, uHasColor, uTonerK, uTDry;
float fbm3(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s/.875; }
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 mm=gpx()/uPxMm;
  vec4 F=texture(uFib, mm/12.);
  vec3 c=uPaper*(1.+uPaperTex*(.02*(fbm3(mm/.2)-.5)*2.))*(1.+uFibers*.03*F.r);
  vec3 T=uHasColor>.5 ? texture(uC,uv).rgb : vec3(1.);
  vec3 cp=c*T;                                                                     // color sobre el papel (transparente)
  float d=texture(uD,uv).r, S=texture(uSolX,uv).r;
  float inner=smoothstep(.62,.95,S);                                               // dentro de un sólido grande
  float mot=.55*vnoise(mm/.45)+.3*vnoise(mm/.13)+.15*vnoise(mat2(.8,.6,-.6,.8)*mm/.035);
  // v23.17, tóner seco (uTDry): el sólido no se vela de gris. Hueco y bandas restan cobertura de forma CONTINUA y, como la mezcla es
  // lineal, un 2–3 % de papel (o de color) ya convierte el negro en gris con bandas: pesan un 65 % menos y el tóner tapa del todo.
  float dT;
  if(uTDry>.5){ dT=d*(1.-uHollow*(1.-.75*uTonerK)*inner*(.006+.08*mot)*.35);
    dT*=1.-uBand*.05*.35*smoothstep(.4,.9,vnoise(vec2(mm.x/9.,.5))); }
  else{ dT=d*(1.-uHollow*(1.-.75*uTonerK)*inner*(.006+.08*mot));
    dT*=1.-uBand*.05*smoothstep(.4,.9,vnoise(vec2(mm.x/9.,.5))); }                     // bandas claras en la dirección de avance
  vec3 toner=vec3(1.,1.,1.08)*mix(.045,.0018,uTonerK)*(1.+.6*vnoise(mat2(.6,.8,-.8,.6)*mm/.028));    // negro del tóner: de gris gastado a negro profundo
  c=uTDry>.5 ? mix(cp, toner*mix(vec3(1.),T,.04), clamp(dT,0.,1.)) : mix(cp, toner*mix(vec3(1.),T,.04), clamp(dT,0.,1.)*.995);   // el tóner tapa; el color encima apenas lo tiñe
  o=vec4(l2s(min(c,vec3(1.))),1.); }`,pn={tech:"xerox",printW:240,pxmm:11.8,seed:1,tex:0,smooth:.12,dark:.5,soft:.05,motion:0,photo:0,lpi:40,lid:0,gens:2,genSpread:.05,thr:.44,grain:.06,dust:.4,fog:.4,streak:.3,hollow:.35,band:.3,hand:0,markers:[],keys:null,colorSmooth:.6,sloppy:.5,offset:.8,wobble:.5,cover:1,stroke:5,strokeAng:35,overlap:.34,strength:1,paper:"#f6f6f2",paperTex:.12,fibers:.1,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],tonerK:.75,tonerDry:0,fast:.35,hairs:.4,scratch:.3,prints:.15,smear:.2,slop:.5,dry:.5,wobMm:.6,gran:.6,dryB:.3,bloom:.5,regionMap:null,orientMap:null},Te=(e,o,a)=>e+(o-e)*a;function dn(e){const o=e.dirt,a=e.sloppy,t=e.paper==="custom"?{paper:e.paperHex,fibers:.15,paperTex:.12}:La[e.paper];return{dark:e.dark,tonerK:e.toner,tonerDry:e.hand!=="none"?1:0,soft:.05,hairs:Te(.1,1,o),scratch:Te(0,.7,o),prints:Te(0,.45,o),smear:Te(0,.5,o),slop:a,dry:.5,fast:.35,wobMm:Te(.3,1.2,a),gran:.6,dryB:.3,bloom:.5,gens:e.gens,photo:e.mode==="photo"?1:0,lpi:Math.round(80-65*Math.pow(e.screenSize,.7)),motion:0,lid:0,dust:Te(.05,1,o),fog:Te(.05,1,o),streak:Te(0,.8,o),band:Te(.1,.8,o),hollow:Te(.2,.7,o),grain:Te(.035,.14,e.screenSize),thr:.44,genSpread:.05,hand:e.hand==="marker"?1:e.hand==="water"?2:0,offset:Te(.1,2.2,a),sloppy:Te(.25,1.2,a),wobble:Te(.2,.9,a),cover:Te(1,.75,a),stroke:5,strokeAng:35,overlap:.28,strength:1,colorSmooth:.25,paper:t.paper,fibers:t.fibers,paperTex:t.paperTex,smooth:.12}}function hn(e,o,a){const t=ko(a,o);return{...t,scanBlur:Math.max(.05,.06*t.pxmm),...Object.assign(dn(e),e.fine),tech:"xerox"}}function vn(e){const{gl:o}=e;let a=null,t=null,n=0,r=0,u=null;const c=o.createTexture();let i;const f=o.createTexture();let s,l=null;const g=()=>{if(!l){l=document.createElement("canvas"),l.width=l.height=1;const M=l.getContext("2d");M.fillStyle="rgb(255,128,0)",M.fillRect(0,0,1,1)}return l};function T(M,A){if(a||(a={xlum:e.compile(rn),xgen:e.compile(sn),xid:e.compile(ln),xedge:e.compile(cn),xcolor:e.compile(un),xcomp:e.compile(mn),xdirt:e.compile(fn)}),t&&M===n&&A===r)return;t&&Object.values(t).forEach(e.freeTarget),u&&(Object.values(u).forEach(e.freeTarget),u=null),n=M,r=A;const F=Math.max(1,M>>2),N=Math.max(1,A>>2);t={xa:e.target(M,A),xb:e.target(M,A),xc:e.target(M,A),xq1:e.target(F,N,2),xq2:e.target(F,N,2),xs:e.target(F,N)}}function E(M,A,F,N,te,oe,w,z,W=!1){T(oe,w);const x=Object.assign({},pn,M),B=t,U=a,ee=oe/x.printW,ie=(x.markers||[]).slice(0,6),Me=x.hand>0?ie.length:0,Q=[];for(let p=0;p<6;p++)Q.push(...Ce(ne(ie[p]||"#ffffff")));const pe=(x.keys&&x.keys.length?x.keys:ie).slice(0,6),xe=[];for(let p=0;p<6;p++)xe.push(...Ce(ne(pe[p]||ie[p]||"#ffffff")));x.regionMap&&x.regionMap!==s&&(e.texFrom(x.regionMap,{filter:o.NEAREST},f),s=x.regionMap),!x.regionMap&&s!==null&&(e.texFrom(g(),{filter:o.NEAREST},f),s=null);const de=ct(x.seed*4241+7),Re=[];for(let p=0;p<6;p++){const _=de()*Math.PI*2,q=x.offset*(.35+.65*de());Re.push(Math.cos(_)*q,Math.sin(_)*q)}x.orientMap&&x.orientMap!==i&&(e.texFrom(x.orientMap,{filter:o.NEAREST},c),i=x.orientMap),!x.orientMap&&i!==null&&(e.texFrom(g(),{filter:o.NEAREST},c),i=null);const V=x.regionMap?1:0,I=Ce(ne(x.paper)),j=Ce(x.srcPaper||[1,1,1]),S=(p,_,q,b)=>e.run(p,_,q,k=>{k.f("uOff",0,0),k.f("uImg",oe,w),b(k)});S("PREP",e.PR.prep,A.prep,p=>{p.t("uSrc",F),p.f("uSrcRes",N,te),p.f("uSmoothPx",x.smooth*N/x.printW),p.f("uSrcPaper",...x.srcPaper||[1,1,1]),p.f("uPaper",1,1,1)}),S("XLUM",U.xlum,B.xa,p=>{p.f("uPxMm",ee),p.t("uPrep",A.prep.t[0]),p.f("uDark",x.dark),p.f("uSoft",x.soft),p.f("uMotion",x.motion),p.f("uPhoto",x.photo),p.f("uLpi",x.lpi),p.f("uLid",x.lid),p.f("uTexPx",x.tex)});const X=(p,_,q,b,k,L)=>S(`BLUR ${p}`,e.PR.blur,q,d=>{d.t("uTexA",_.t[0]),d.t("uTexB",_.t[_.t.length>1?1:0]),d.f("uDir",b,k),d.f("uSig",L)}),le=W?1:Math.max(1,Math.round(x.gens));for(let p=1;p<=le;p++){const _=Math.max(.05,x.genSpread*ee*(p===1?.6:1));X(`gen${p} H`,B.xa,B.xb,1,0,_),X(`gen${p} V`,B.xb,B.xc,0,1,_),S(`XGEN ${p}`,U.xgen,B.xa,q=>{q.f("uPxMm",ee),q.f("uSeed",x.seed),q.t("uD",B.xc.t[0]),q.t("uGreen",e.greenTex),q.f("uThr",x.thr),q.f("uGrain",x.grain),q.f("uDust",x.dust),q.f("uFog",x.fog),q.f("uStreak",x.streak),q.f("uGen",p),q.f("uTDry",x.tonerDry?1:0)})}S("XDIRT",U.xdirt,B.xb,p=>{p.f("uPxMm",ee),p.f("uSeed",x.seed),p.t("uD",B.xa.t[0]),p.f("uHair",x.hairs),p.f("uScratch",x.scratch),p.f("uPrint",x.prints),p.f("uSmear",x.smear)});const ae=B.xb;X("sol ¼ H",ae,A.qtmp,1,0,1.1*ee/4),X("sol ¼ V",A.qtmp,B.xs,0,1,1.1*ee/4);const G=Me>0;if(G){X("ps ¼ H",A.prep,A.qtmp,1,0,Math.max(.3,.12*ee/4)),X("ps ¼ V",A.qtmp,B.xq1,0,1,Math.max(.3,.12*ee/4)),S("XID",U.xid,B.xq2,b=>{b.t("uPS",B.xq1.t[0]),b.fv("uKey",xe,3),b.t("uIdMap",f),b.i("uUseMap",V),b.i("uNk",Me),b.f("uSrcPaperL",...j),b.f("uMinL",.32),b.f("uPxMm",ee),b.f("uVoteMm",x.colorSmooth)});let p=null;if(x.hand===1){u||(u={e1:e.target(oe,w,2),e2:e.target(oe,w,2),e3:e.target(oe,w,2)});const b=u;S("XEDGE",U.xedge,b.e1,D=>{D.t("uPrep",A.prep.t[0]),D.t("uPS",B.xq1.t[0]),D.t("uLA",B.xq2.t[0]),D.t("uLB",B.xq2.t[1]),D.t("uIdMap",f),D.i("uUseMap",V),D.i("uNk",Me),D.f("uSrcPaperL",...j),D.f("uMinL",.32),D.f("uPxMm",ee)});const k=Math.max(1,.8*ee);let L=b.e1,d=0,R=k*k,C=0;for(;R>.001;){const D=Math.min(Math.sqrt(R),d>0?3*d:3),h=L===b.e3?b.e1:b.e3;C++,X(`edge${C} H`,L,b.e2,1,0,D),X(`edge${C} V`,b.e2,h,0,1,D),L=h,R-=D*D,d=Math.sqrt(d*d+D*D)}p=L}const _=x.hand===1?Math.max(1.5,.8*ee/4):Math.max(.3,x.sloppy*ee/4);X("mask H",B.xq2,A.qtmp,1,0,_),X("mask V",A.qtmp,B.xq1,0,1,_);const q=p||B.xq1;S("XCOLOR",U.xcolor,B.xc,b=>{b.f("uPxMm",ee),b.f("uSeed",x.seed),b.t("uMA",B.xq1.t[0]),b.t("uMB",B.xq1.t[1]),b.t("uFA",q.t[0]),b.t("uFB",q.t[1]),b.fv("uMk",Q,3),b.i("uNk",Me),b.i("uMed",x.hand),b.fv("uCOff",Re,2),b.f("uWobble",x.wobble),b.f("uCover",x.cover),b.f("uStroke",x.stroke),b.f("uAng",x.strokeAng*Math.PI/180),b.f("uOverlap",x.overlap),b.f("uStrength",x.strength),b.f("uSlop",x.slop),b.f("uDry",x.dry),b.f("uFast",x.fast),i===void 0&&(e.texFrom(g(),{filter:o.NEAREST},c),i=null),b.t("uOri",c),b.i("uOriRows",(i?.__srOriRows??0)|0),b.f("uSheetMm",oe/ee,w/ee),b.f("uWobMm",x.wobMm),b.f("uGran",x.gran),b.f("uDryB",x.dryB),b.f("uBloom",x.bloom)})}S("XCOMP",U.xcomp,A.comp,p=>{p.f("uPxMm",ee),p.t("uD",ae.t[0]),p.t("uSolX",B.xs.t[0]),p.f("uTonerK",x.tonerK),p.t("uC",B.xc.t[0]),p.t("uFib",e.fibTex),p.f("uPaper",...I),p.f("uHollow",x.hollow),p.f("uBand",x.band),p.f("uPaperTex",x.paperTex),p.f("uFibers",x.fibers),p.f("uHasColor",G?1:0),p.f("uTDry",x.tonerDry?1:0)}),S("SCAN",e.PR.scan,z?A.out:null,p=>{p.f("uSeed",x.seed),p.t("uComp",A.comp.t[0]),p.f("uBlurPx",x.scanBlur),p.f("uNoise",x.scanNoise),p.i("uNorm",0),p.f("uPaper",...I)})}return{render:E}}const xn=Je+bo+Ge+`
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
  oA=A; oB=B; }`,gn=Je+`
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
  o=vec4(l2s(min(C,vec3(1.))),1.); }`,bn={tech:"stencil",printW:240,pxmm:11.8,seed:1,smooth:.12,cut:1,facet:.6,misreg:.5,layers:[],accKey:null,lift:.35,liftMm:2.2,liftScale:22,over:.3,load:1,mist:.4,drop:1,cloud:0,cloudHex:"#f4f4f0",support:"#cfccc5",supType:1,supTex:.7,scanBlur:.6,scanNoise:.3,srcPaper:[1,1,1],maps:null,drips:0,dripLen:8,dripW:.9,splat:0,splatSize:.8,cloudMm:18,bridges:!1,bridgeMm:.9},Ke=(e,o,a)=>e+(o-e)*a;function yn(e){const o=e.sloppy,a=e.sup==="custom"?{type:e.supType,hex:e.supHex}:Ra[e.sup];return{cut:Ke(.3,4,Math.pow(e.cut,1.5)),facet:Ke(.3,1.1,o),misreg:Ke(0,2.2,o),lift:e.lift,liftMm:Ke(1.2,3.2,e.lift),liftScale:22,over:e.over,load:Ke(.72,1.25,e.load),mist:Ke(.2,.85,o),drop:Ke(.4,3,e.dropSize),drips:e.drips,dripLen:Ke(3,26,e.drips),dripW:.9,splat:e.splat,splatSize:.8,cloud:e.cloud==="none"?0:1,cloudHex:e.cloud==="white"?"#f4f4f0":e.cloudHex,cloudMm:18,bridges:e.bridges,bridgeMm:.9,support:e.sup==="custom"?e.supHex:a.hex,supType:a.type,supTex:Ke(0,1.5,e.supTex),smooth:.12}}function kn(e,o,a){return{...ko(a,o),...yn(e),tech:"stencil"}}const ia=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),la=e=>e<=.0031308?e*12.92:1.055*Math.pow(e,1/2.4)-.055;let Gt=null;const no=2048;function Mn(){if(Gt)return Gt;const e=no,o=new Float32Array(e*e).fill(2),a=ct(7),t=()=>{let E=0;for(;!E;)E=a();return Math.sqrt(-2*Math.log(E))*Math.cos(6.2832*a())};let n=0;const r=4.6*e*e;for(;n<r;){const E=a()<.07,M=Math.min(16,Math.max(.6,(E?5.5:2.6)*Math.exp(.45*t()))),A=a(),F=a()*e,N=a()*e,te=Math.floor(F),oe=Math.floor(N),w=Math.ceil(M),z=M*M;for(let W=-w;W<=w;W++){const x=oe+W+.5-N;if(x*x>z)continue;const B=((oe+W)%e+e)%e*e;for(let U=-w;U<=w;U++){const ee=te+U+.5-F;if(ee*ee+x*x>z)continue;const ie=B+((te+U)%e+e)%e;A<o[ie]&&(o[ie]=A)}}n+=Math.PI*z}const u=4096,c=new Uint32Array(u);let i=0;for(let E=0;E<e*e;E++)o[E]<2&&(c[Math.min(u-1,o[E]*u|0)]++,i++);const f=new Float32Array(u);let s=0;for(let E=0;E<u;E++)s+=c[E],f[E]=s/i;const l=document.createElement("canvas");l.width=l.height=e;const g=l.getContext("2d"),T=g.createImageData(e,e);for(let E=0;E<e*e;E++){const M=o[E]<2?f[Math.min(u-1,o[E]*u|0)]*.985:1,A=Math.round(M*255);T.data[E*4]=T.data[E*4+1]=T.data[E*4+2]=A,T.data[E*4+3]=255}return g.putImageData(T,0,0),Gt=l,l}function Bt(e,o,a,t){if(t<.5)return e;const n=Math.max(1,Math.round((Math.sqrt(4*t*t+1)-1)/2));let r=e;const u=new Float32Array(e.length);for(let c=0;c<3;c++){for(let i=0;i<a;i++){let f=0;const s=i*o;for(let l=-n;l<=n;l++)f+=r[s+Math.min(o-1,Math.max(0,l))];for(let l=0;l<o;l++)u[s+l]=f/(2*n+1),f+=r[s+Math.min(o-1,l+n+1)]-r[s+Math.max(0,l-n)]}for(let i=0;i<o;i++){let f=0;for(let s=-n;s<=n;s++)f+=u[Math.min(a-1,Math.max(0,s))*o+i];for(let s=0;s<a;s++)r=r===e?new Float32Array(e.length):r,r[s*o+i]=f/(2*n+1),f+=u[Math.min(a-1,s+n+1)*o+i]-u[Math.max(0,s-n)*o+i]}}return r}function wn(e,o,a){const t=(s,l)=>{let g=s*374761393+l*668265263+a*982451653|0;return g=(g^g>>>13)*1274126177|0,((g^g>>>16)>>>0)/4294967296},n=Math.floor(e),r=Math.floor(o),u=e-n,c=o-r,i=u*u*(3-2*u),f=c*c*(3-2*c);return(t(n,r)*(1-i)+t(n+1,r)*i)*(1-f)+(t(n,r+1)*(1-i)+t(n+1,r+1)*i)*f}function Sn(e,o){const a=Math.min(1,256/Math.max(e.width,e.height)),t=Math.max(4,Math.round(e.width*a)),n=Math.max(4,Math.round(e.height*a)),r=document.createElement("canvas");r.width=t,r.height=n;const u=r.getContext("2d",{willReadFrequently:!0});return u.fillStyle="#fff",u.fillRect(0,0,t,n),u.drawImage(e,0,0,t,n),{D:u.getImageData(0,0,t,n).data,w:t,h:n,sp:Ce(o).map(c=>Math.max(c,.02))}}const Pn=.04;function An(e,o,a,t=null){const{D:n,w:r,h:u,sp:c}=Sn(e,o),i=new Float64Array(256),f=new Float64Array(256),s=t?re(t):null;let l=0;for(let w=0;w<r*u;w++){const z=re([0,1,2].map(B=>la(Math.min(1,ia(n[w*4+B]/255)/c[B])))),W=Math.max(0,Math.min(1,1-z[0]+.3*Math.hypot(z[1],z[2]))),x=Math.min(255,W*256|0);if(f[x]++,s){const B=re([n[w*4]/255,n[w*4+1]/255,n[w*4+2]/255]);if(Math.hypot(B[0]-s[0],B[1]-s[1],B[2]-s[2])<Pn)continue}i[x]++,l++}l<r*u*.05&&i.set(f);{let w=0,z=0;for(let W=0;W<256;W++)w+=i[W],W>=20&&(z+=i[W]);if(z>w*.05)for(let W=0;W<20;W++)i[W]=0}const g=64,T=new Float64Array(g);for(let w=0;w<256;w++)T[w>>2]+=i[w];const E=new Float64Array(g+1),M=new Float64Array(g+1);for(let w=0;w<g;w++)E[w+1]=E[w]+T[w],M[w+1]=M[w]+T[w]*(w+.5)/g;const A=(w,z)=>{const W=E[z]-E[w];return W>0?(M[z]-M[w])*(M[z]-M[w])/W:0};let F=-1,N=[];const te=new Array(a).fill(0),oe=(w,z,W)=>{if(w===a){const x=W+A(z,g);x>F&&(F=x,N=te.slice());return}for(let x=z+1;x<=g-(a-w);x++)te[w]=x,oe(w+1,x,W+A(z,x))};return oe(0,0,0),N.map(w=>Math.max(.04,Math.min(.95,w/g)))}function qo(e,o){const a=o.printW||210,t=o.seed|0,n=ct(t*7919+5),r=o.layers||[],u=()=>{let p=0;for(;!p;)p=n();return Math.sqrt(-2*Math.log(p))*Math.cos(6.2832*n())},c=e.width,i=e.height,f=Math.min(1,1024/Math.max(c,i)),s=Math.max(8,Math.round(c*f)),l=Math.max(8,Math.round(i*f)),g=s*l,T=a/s,E=document.createElement("canvas");E.width=s,E.height=l;const M=E.getContext("2d",{willReadFrequently:!0});M.fillStyle="#fff",M.fillRect(0,0,s,l),M.drawImage(e,0,0,s,l);const A=M.getImageData(0,0,s,l).data,F=Ce(o.srcPaper||[1,1,1]).map(p=>Math.max(p,.02)),N=new Float32Array(g*3);for(let p=0;p<g;p++){const _=[0,1,2].map(b=>la(Math.min(1,ia(A[p*4+b]/255)/F[b]))),q=re(_);N[p*3]=q[0],N[p*3+1]=q[1],N[p*3+2]=q[2]}const te=(p,_)=>{const q=(_[0]-N[p*3])*.6,b=_[1]-N[p*3+1],k=_[2]-N[p*3+2];return q*q+b*b+k*k},oe=Math.max(.3,(o.cut||1)*.5/T),w=new Float32Array(g);for(let p=0;p<g;p++)w[p]=Math.max(0,Math.min(1,1-N[p*3]+.3*Math.hypot(N[p*3+1],N[p*3+2])));const z=Bt(w,s,l,oe),W=o.accKey?re(ne(o.accKey)):null;let x=null;if(W){const p=new Float32Array(g);for(let _=0;_<g;_++)p[_]=te(_,W)<.045&&Math.hypot(N[_*3+1],N[_*3+2])>.06?1:0;x=Bt(p,s,l,oe)}const B=r.map(p=>p.kind===1&&p.key?re(ne(p.key)):null),U=r.map((p,_)=>{const q=new Uint8Array(g);if(p.kind===3){if(x)for(let b=0;b<g;b++)q[b]=x[b]>.5?1:0;return q}if(p.kind===1){const b=new Float32Array(g),k=B[_],L=Math.hypot(k[1],k[2]);for(let R=0;R<g;R++){const C=te(R,k);if(C>.06||L>.06&&Math.hypot(N[R*3+1],N[R*3+2])<.5*L)continue;let D=!0;for(let h=0;h<B.length;h++)if(h!==_&&B[h]&&te(R,B[h])<C){D=!1;break}b[R]=D?1:0}const d=Bt(b,s,l,oe);for(let R=0;R<g;R++)q[R]=d[R]>.5?1:0;return q}for(let b=0;b<g;b++)q[b]=z[b]>p.thr&&!(x&&x[b]>.5)?1:0;return q}),ee=3072/Math.max(s,l),ie=Math.round(s*ee),Me=Math.round(l*ee),Q=ie/a,pe=()=>{const p=document.createElement("canvas");p.width=ie,p.height=Me;const _=p.getContext("2d");return _.fillStyle="#000",_.fillRect(0,0,ie,Me),_.globalCompositeOperation="lighter",[p,_]},xe=["#ff0000","#00ff00","#0000ff"];let de=null;if(o.bridges){const[p,_]=pe();de=p;const q=(o.bridgeMm||.9)*Q;_.lineCap="butt";const b=new Int32Array(g),k=new Int32Array(g),L=new Int32Array(g).fill(-1),d=new Int32Array(g),R=new Int32Array(g);r.forEach((C,D)=>{if(C.ch==null||C.ch<0)return;const h=U[D];b.fill(-1);let v=0;const y=[];for(let $=0;$<g;$++){if(h[$]||b[$]>=0)continue;let K=0;k[K++]=$,b[$]=v;const ce=[];let Z=!1;for(;K;){const H=k[--K];ce.push(H);const ve=H%s,m=H/s|0;(ve===0||m===0||ve===s-1||m===l-1)&&(Z=!0),ve>0&&!h[H-1]&&b[H-1]<0&&(b[H-1]=v,k[K++]=H-1),ve<s-1&&!h[H+1]&&b[H+1]<0&&(b[H+1]=v,k[K++]=H+1),m>0&&!h[H-s]&&b[H-s]<0&&(b[H-s]=v,k[K++]=H-s),m<l-1&&!h[H+s]&&b[H+s]<0&&(b[H+s]=v,k[K++]=H+s)}!Z&&ce.length*T*T>=.6&&y.push([v,ce]),v++}_.strokeStyle=xe[C.ch],_.lineWidth=q;const P=Math.round(12/T);let O=0;for(const[$,K]of y.slice(0,600)){const ce=K.length*T*T,Z=ce<40?1:ce<400?2:3,H=[],ve=K.filter(se=>{const ue=se%s;return ue>0&&h[se-1]||ue<s-1&&h[se+1]||h[se-s]||h[se+s]}),m=Math.sqrt(K.length)*.75;for(let se=0;se<Z;se++){O++;const ue=[];let we=0;for(const Se of ve)H.some(wt=>Math.hypot(wt%s-Se%s,(wt/s|0)-(Se/s|0))<m)||(L[Se]=O,d[Se]=-1,R[Se]=0,ue.push(Se));let he=-1;for(;we<ue.length;){const Se=ue[we++],wt=Se%s,Fo=Se/s|0;if(R[Se]>P)break;for(const Ue of[wt>0?Se-1:-1,wt<s-1?Se+1:-1,Fo>0?Se-s:-1,Fo<l-1?Se+s:-1])if(!(Ue<0||L[Ue]===O)){if(!h[Ue]){if(b[Ue]!==$){d[Ue]=Se,he=Ue;break}continue}L[Ue]=O,d[Ue]=Se,R[Ue]=R[Se]+1,ue.push(Ue)}if(he>=0)break}if(he<0)break;let fe=he;for(;d[fe]>=0&&h[d[fe]];)fe=d[fe];const je=d[fe]>=0?d[fe]:fe;H.push(je);const et=(je%s+.5)/s*ie,tt=((je/s|0)+.5)/l*Me,me=(he%s+.5)/s*ie,$e=((he/s|0)+.5)/l*Me,Xe=Math.hypot(me-et,$e-tt)||1,Ro=(me-et)/Xe*.5*Q,Bo=($e-tt)/Xe*.5*Q;_.beginPath(),_.moveTo(et-Ro,tt-Bo),_.lineTo(me+Ro,$e+Bo),_.stroke()}}})}const[Re,V]=pe(),I=a*a*l/s,j=o.dripLen||8,S=o.dripW||.9,X=o.drips||0,le=o.splat||0,ae=r.map((p,_)=>[p,_]).filter(([p])=>p.ch!=null&&p.ch>=0);if(ae.forEach(([p,_],q)=>{if(X<=0)return;const b=U[_],k=[];for(let D=0;D<g-s;D++)b[D]&&!b[D+s]&&k.push(D);const L=.35+.65*(q+1)/ae.length,d=Math.min(260,Math.round(X*k.length*T*.06*L));if(!k.length)return;V.fillStyle=xe[p.ch];let R=0,C=0;for(;R<d&&C<d*8;){C++;const D=k[n()*k.length|0],h=D%s,v=D/s|0;if(n()>.15+wn(h*T/14,v*T/14,t+_*31))continue;R++;let y=j*Math.exp(.75*u());n()<.25&&(y*=.25),y=Math.max(.8,Math.min(150,y));const P=S*(.55+.9*n())*(.7+.3*Math.min(1,y/10)),O=(h+n())*T,$=(v+1)*T-(.3+n()*1.2),K=(n()-.5)*.8,ce=.06+n()*.12,Z=2+n()*4,H=n()*6.28;V.beginPath();const ve=Math.max(.04,P*.18);let m=O,se=$,ue=P/2;for(let he=0;he<=1.0001;he+=ve/y){se=$+he*y,m=O+K*he+ce*Math.sin(he*y/Z+H),ue=P/2*(1-.45*he)*(he<.08?1+(.08-he)/.08*.6:1);const fe=Math.max(.6,ue*Q);V.moveTo(m*Q+fe,se*Q),V.arc(m*Q,se*Q,fe,0,6.2832)}const we=ue*(1.45+.6*n());V.moveTo(m*Q+we*Q,(se+we*.4)*Q),V.arc(m*Q,(se+we*.4)*Q,Math.max(.7,we*Q),0,6.2832),V.fill()}}),le>0&&ae.length){const p=ae[ae.length-1],_=U[p[1]],q=[];for(let L=0;L<g;L+=3)_[L]&&q.push(L);const b=Math.min(900,Math.round(le*220*I/62370)),k=o.splatSize||.8;for(let L=0;L<b;L++){const d=n()<.75?p:ae[n()*ae.length|0];V.fillStyle=xe[d[0].ch];let R,C;if(q.length&&n()<.65){const h=q[n()*q.length|0];R=(h%s+.5)*T+u()*22,C=((h/s|0)+.5)*T+u()*22}else R=n()*a,C=n()*a*l/s;const D=Math.max(.06,Math.min(4.5,k*.5*Math.exp(.8*u())));if(V.beginPath(),n()<.12){const h=n()*6.28;V.ellipse(R*Q,C*Q,D*Q*2.4,D*Q*.8,h,0,6.2832)}else V.arc(R*Q,C*Q,Math.max(.6,D*Q),0,6.2832);if(n()<.45){const h=2+(n()*6|0),v=n()*6.28;for(let y=0;y<h;y++){const P=D*(1.3+n()*2.6),O=v+(n()-.5)*1.3,$=Math.max(.04,D*(.1+n()*.3)),K=(R+Math.cos(O)*P)*Q,ce=(C+Math.sin(O)*P)*Q;V.moveTo(K+$*Q,ce),V.arc(K,ce,Math.max(.5,$*Q),0,6.2832)}}V.fill()}}let G=null;if(o.cloud){const _=Math.ceil(s/4),q=Math.ceil(l/4),b=new Float32Array(_*q);for(let C=0;C<g;C++){let D=0;for(const h of U)if(h[C]){D=1;break}if(D){const h=((C/s|0)/4|0)*_+(C%s/4|0);b[h]=1}}const k=Bt(b,_,q,(o.cloudMm||18)/(T*4));let L=0;for(const C of k)L=Math.max(L,C);G=document.createElement("canvas"),G.width=_,G.height=q;const d=G.getContext("2d"),R=d.createImageData(_,q);for(let C=0;C<_*q;C++){const D=Math.min(1,k[C]/(L*.55+1e-6));R.data[C*4]=Math.round(255*Math.pow(D,.8)),R.data[C*4+3]=255}d.putImageData(R,0,0)}return{drip:Re,bridge:de,cloud:G}}function En(e){const{gl:o}=e;let a=null,t=null,n=0,r=0,u=null,c=null;const i=o.createTexture(),f=o.createTexture(),s=o.createTexture();let l,g=null;const T=()=>{if(!g){g=document.createElement("canvas"),g.width=g.height=1;const A=g.getContext("2d");A.fillStyle="#000",A.fillRect(0,0,1,1)}return g};function E(A,F){if(a||(a={scut:e.compile(xn),spray:e.compile(gn)}),u||(u=e.texFrom(Mn(),{wrap:o.REPEAT,mip:!0})),t&&A===n&&F===r)return;t&&Object.values(t).forEach(e.freeTarget),n=A,r=F;const N=Math.max(1,A>>2),te=Math.max(1,F>>2);t={b1:e.target(A,F),b2:e.target(A,F),sm:e.target(A,F,2),sq:e.target(N,te,2),sw:e.target(N,te,2)}}function M(A,F,N,te,oe,w,z,W,x=!1){E(w,z);const B=Object.assign({},bn,A),U=t,ee=a,ie=w/B.printW,Me=(B.layers||[]).slice(0,5),Q=Me.length,pe=ct(B.seed*6151+3),xe=Ce(B.srcPaper||[1,1,1]).map(h=>Math.max(h,.02)),de=h=>Ce(ne(h)).map((v,y)=>Math.min(1,v/xe[y])),Re=[],V=[],I=[],j=[],S=[],X=[],le=[];let ae=0;for(let h=0;h<5;h++){const v=Me[h]||{kind:0,thr:2,hex:"#000000"};Re.push(v.kind|0),V.push(v.thr==null?.5:v.thr),I.push(v.ch==null?-1:v.ch),S.push(v.op==null?.97:v.op),j.push(...Ce(ne(v.hex))),X.push(...v.key?de(v.key):[1,1,1]),h<Q&&v.kind===1&&(ae=h+1);const y=pe()*Math.PI*2,P=B.misreg*Math.sqrt(pe());le.push(Math.cos(y)*P,Math.sin(y)*P)}const G=B.maps||{drip:null,bridge:null,cloud:null};G!==l&&(e.texFrom(G.drip||T(),{},i),e.texFrom(G.bridge||T(),{},f),e.texFrom(G.cloud||T(),{},s),l=G);const p=G.drip?Math.max(.03,Math.min(.5,.5*G.drip.width/w)):.5,_=B.accKey?de(B.accKey):[1,1,1],q=Me.some(h=>h.kind===3)?1:0,b=Ce(ne(B.support)),k=Ce(ne(B.cloudHex||"#f4f4f0")),L=(h,v,y,P)=>e.run(h,v,y,O=>{O.f("uOff",0,0),O.f("uImg",w,z),P(O)});L("PREP",e.PR.prep,F.prep,h=>{h.t("uSrc",N),h.f("uSrcRes",te,oe),h.f("uSmoothPx",B.smooth*te/B.printW),h.f("uSrcPaper",...B.srcPaper||[1,1,1]),h.f("uPaper",1,1,1)});const d=(h,v,y,P,O,$)=>L(`BLUR ${h}`,e.PR.blur,y,K=>{K.t("uTexA",v.t[0]),K.t("uTexB",v.t[v.t.length>1?1:0]),K.f("uDir",P,O),K.f("uSig",$)}),R=Math.max(.05,B.cut*.5*ie);d("cut H",F.prep,U.b1,1,0,R),d("cut V",U.b1,U.b2,0,1,R),L("SCUT",ee.scut,U.sm,h=>{h.f("uPxMm",ie),h.f("uSeed",B.seed),h.t("uSimp",U.b2.t[0]),h.t("uBr",f),h.i("uNL",Q),h.i("uNK",ae),h.i("uAccOn",q),h.iv("uKind",Re),h.iv("uCh",I),h.fv("uThr",V,1),h.fv("uKey",X,3),h.f("uAccK",_[0],_[1],_[2]),h.fv("uOffs",le,2),h.f("uFacet",B.facet),h.f("uAA",Math.max(.008,Math.min(.05,.1/Math.max(.7,R))))});const C=Math.max(.3,B.liftMm*ie/4);x||(d("lift ¼ H",U.sm,F.qtmp,1,0,C),d("lift ¼ V",F.qtmp,U.sq,0,1,C),d("wide ¼ H",U.sq,F.qtmp,1,0,C*2),d("wide ¼ V",F.qtmp,U.sw,0,1,C*2));const D=x?c??=e.texFrom(T()):null;L("SPRAY",ee.spray,F.comp,h=>{h.f("uPxMm",ie),h.f("uSeed",B.seed),h.t("uMA",U.sm.t[0]),h.t("uMB",U.sm.t[1]),h.t("uQA",D??U.sq.t[0]),h.t("uQB",D??U.sq.t[1]),h.t("uWA",D??U.sw.t[0]),h.t("uWB",D??U.sw.t[1]),h.t("uDr",i),h.t("uCl",s),h.t("uSpT",u),h.i("uNL",Q),h.i("uSup",B.supType|0),h.iv("uCh",I),h.fv("uLc",j,3),h.fv("uOp",S,1),h.f("uSupLin",...b),h.f("uCloudLin",...k),h.f("uSupTex",B.supTex),h.f("uLift",B.lift),h.f("uOver",B.over),h.f("uLoad",B.load),h.f("uMist",B.mist),h.f("uDrop",B.drop),h.f("uCloud",G.cloud?B.cloud:0),h.f("uSpN",no),h.f("uTp",no/(143.36*B.drop*ie)),h.f("uDrTp",p),h.f("uLiftScale",B.liftScale)}),L("SCAN",e.PR.scan,W?F.out:null,h=>{h.f("uSeed",B.seed),h.t("uComp",F.comp.t[0]),h.f("uBlurPx",B.scanBlur),h.f("uNoise",B.scanNoise),h.i("uNorm",0),h.f("uPaper",...b)})}return{render:M}}function Ze(e,o,a){const t=e.indexOf(o);if(t<0||e.indexOf(o,t+1)>=0)throw new Error(`[SuperRiso] shader patch does not match exactly once: ${o.slice(0,60)}`);return e.slice(0,t)+a+e.slice(t+o.length)}const Io=`    float v=pick(a,b,i); float d=pick(sA,sB,i);
`,ca=Ze(ra,Io,Io+`    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;
`),No=2,jo=4,zo=8,Tn=15,ua=16,Ln=Ze(ca,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA"),Rn=Ze(sa,"for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l","for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l"),Bn=Ze(Ze(Ze(yo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;`),"return cov/9.; }","return cov/4.; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [preview C2a] 4 submuestras por píxel en lugar de 9."),Fn=Ze(Ze(Ze(yo,`for(int j=0;j<3;j++) for(int i=0;i<3;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;`,`for(int j=0;j<1;j++) for(int i=0;i<1;i++){
    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+vec2(i,j)*px;`),"return cov/9.; }","return cov; }"),"// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.","// [ligero] 1 submuestra por píxel en lugar de 9."),Dn=`#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`,Oo=new Map,$o=(e,o)=>{let a=Oo.get(e);return a||(a=o(),Oo.set(e,a)),a};function Cn(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ct(e);t.lineCap="round";for(let r=0;r<2600;r++){const u=(.25+n()*n()*1.6)*85,c=n()*Math.PI*2,i=n()*1024,f=n()*1024,s=(n()-.5)*.9,l=(.012+n()*.03)*85;t.strokeStyle=`rgba(255,255,255,${.15+n()*.55})`,t.lineWidth=l;for(const g of[-1024,0,1024])for(const T of[-1024,0,1024]){const E=i+g,M=f+T;E<-u-10||E>1024+u+10||M<-u-10||M>1024+u+10||(t.beginPath(),t.moveTo(E,M),t.quadraticCurveTo(E+Math.cos(c+s)*u*.5,M+Math.sin(c+s)*u*.5,E+Math.cos(c)*u,M+Math.sin(c)*u),t.stroke())}}return a}function _n(e){const a=document.createElement("canvas");a.width=a.height=1024;const t=a.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,1024,1024);const n=ct(e);t.lineCap="round",t.globalCompositeOperation="lighter";const r=1024/61;for(let u=0;u<70;u++){const c=n()<.7?"255,0,0":"0,255,0",i=(.4+n()*n()*3.5)*r,f=n()*Math.PI*2,s=n()*1024,l=n()*1024,g=(n()-.5)*1.6,T=(.015+n()*.03)*r;t.strokeStyle=`rgba(${c},${.35+n()*.5})`,t.lineWidth=Math.max(.6,T);for(const E of[-1024,0,1024])for(const M of[-1024,0,1024]){const A=s+E,F=l+M;A<-i||A>1024+i||F<-i||F>1024+i||(t.beginPath(),t.moveTo(A,F),t.bezierCurveTo(A+Math.cos(f+g)*i*.35,F+Math.sin(f+g)*i*.35,A+Math.cos(f-g)*i*.7,F+Math.sin(f-g)*i*.7,A+Math.cos(f)*i,F+Math.sin(f)*i),t.stroke())}}for(let u=0;u<160;u++){t.fillStyle=`rgba(255,0,0,${.2+n()*.6})`;const c=(.02+n()*n()*.12)*r;t.beginPath(),t.arc(n()*1024,n()*1024,Math.max(.5,c),0,7),t.fill()}return a}function fa(e,o,a={}){const t=e.getContext("webgl2",{preserveDrawingBuffer:a.preserveDrawingBuffer??!0,antialias:!1,premultipliedAlpha:!1});if(!t)throw new Error("WebGL2 no disponible");const n=t.getParameter(t.MAX_TEXTURE_SIZE);t.getExtension("KHR_parallel_shader_compile");function r(I){const j=t.createProgram(),S=[];for(const[le,ae]of[[t.VERTEX_SHADER,za],[t.FRAGMENT_SHADER,I]]){const G=t.createShader(le);t.shaderSource(G,ae),t.compileShader(G),t.attachShader(j,G),S.push(G)}t.bindAttribLocation(j,0,"p"),t.linkProgram(j);let X=null;return{p:j,get u(){if(X)return X;if(!t.getProgramParameter(j,t.LINK_STATUS)){const G=S.find(p=>!t.getShaderParameter(p,t.COMPILE_STATUS));throw new Error(G?t.getShaderInfoLog(G)??"shader compile error":t.getProgramInfoLog(j)??"program link error")}const le={},ae=t.getProgramParameter(j,t.ACTIVE_UNIFORMS);for(let G=0;G<ae;G++){const p=t.getActiveUniform(j,G);le[p.name.replace(/\[0\]$/,"")]=t.getUniformLocation(j,p.name)}return X=le}}}const u=new Map,c=I=>{let j=u.get(I);return j||(j=r(I),u.set(I,j)),j},i={fill:r(Wa),sep0:r(Ua),lut:r(Oa),prep:r($a),sep:r(Ga),blur:r(Xa),screen:r(yo),spread:r(ra),compose:r(Ka),scan:r(sa)},f=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,f),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);function s(I,j,{filter:S=t.LINEAR,wrap:X=t.CLAMP_TO_EDGE}={}){const le=t.createTexture();return t.bindTexture(t.TEXTURE_2D,le),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,I,j,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,S),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,S),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,X),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,X),le}function l(I,{filter:j=t.LINEAR,wrap:S=t.CLAMP_TO_EDGE,mip:X=!1}={},le=t.createTexture()){return t.bindTexture(t.TEXTURE_2D,le),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,I),X&&t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,X?t.LINEAR_MIPMAP_LINEAR:j),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,j),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,S),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,S),le}function g(I,j,S=1){const X=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,X);const le=[];for(let ae=0;ae<S;ae++){const G=s(I,j);t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+ae,t.TEXTURE_2D,G,0),le.push(G)}return t.drawBuffers(le.map((ae,G)=>t.COLOR_ATTACHMENT0+G)),{f:X,t:le,w:I,h:j}}function T(I){I.t.forEach(j=>t.deleteTexture(j)),t.deleteFramebuffer(I.f)}const E=nn(t);function M(I,j,S,X){const le=S?S.w:e.width,ae=S?S.h:e.height,G=j.u;t.useProgram(j.p),t.bindFramebuffer(t.FRAMEBUFFER,S?S.f:null),t.viewport(0,0,le,ae);let p=0;const _={t(b,k){G[b]!=null&&(t.activeTexture(t.TEXTURE0+p),t.bindTexture(t.TEXTURE_2D,k),t.uniform1i(G[b],p),p++)},f(b,...k){const L=G[b];L!=null&&(k.length===1?t.uniform1f(L,k[0]):k.length===2?t.uniform2f(L,k[0],k[1]):k.length===3?t.uniform3f(L,k[0],k[1],k[2]):t.uniform4f(L,k[0],k[1],k[2],k[3]))},i(b,k){G[b]!=null&&t.uniform1i(G[b],k)},fv(b,k,L){const d=G[b];if(d==null)return;const R=new Float32Array(k);L===1?t.uniform1fv(d,R):L===2?t.uniform2fv(d,R):t.uniform3fv(d,R)},m2(b,k){G[b]!=null&&t.uniformMatrix2fv(G[b],!1,new Float32Array(k))},iv(b,k){G[b]!=null&&t.uniform1iv(G[b],new Int32Array(k))}};_.f("uRes",le,ae),X&&X(_);const q=E.mode==="off"?null:E.before(I,{w:le,h:ae,att:S?S.t.length:1});t.drawArrays(t.TRIANGLES,0,3),E.mode!=="off"&&E.after(I,q)}const A=l(o.green,{wrap:t.REPEAT}),F={b:l(o.exBlack,{wrap:t.REPEAT,mip:!0}),bs:[o.exBlack.width,o.exBlack.height],r:l(o.exRed,{wrap:t.REPEAT,mip:!0}),rs:[o.exRed.width,o.exRed.height],lut:l(o.exLut)},N=l($o("fib11",()=>Cn(11)),{wrap:t.REPEAT,mip:!0}),te=l($o("inc23",()=>_n(23)),{wrap:t.REPEAT,mip:!0}),oe=I=>{I.t("uExB",F.b),I.t("uExR",F.r),I.t("uExLut",F.lut),I.f("uExBSize",F.bs[0],F.bs[1]),I.f("uExRSize",F.rs[0],F.rs[1]),I.f("uExPxMm",ja)};let w=null,z=null;const W=g(1089,33,2);let x="";const B=t.createTexture();let U=0,ee=0,ie=null,Me=0,Q=0;function pe(I,j){if(I===Me&&j===Q)return;Me=I,Q=j,ie&&Object.values(ie).forEach(T);const S=Math.max(1,I>>2),X=Math.max(1,j>>2);ie={prep:g(I,j),sep:g(I,j,2),tmp:g(I,j,2),loc:g(I,j,2),qtmp:g(S,X,2),sol:g(S,X,2),scr:g(I,j,2),cov:g(I,j,2),comp:g(I,j),out:g(I,j)},e.width=I,e.height=j}const xe=t.getExtension("EXT_disjoint_timer_query_webgl2");let de=null;function Re(){if(!xe||!de||!t.getQueryParameter(de,t.QUERY_RESULT_AVAILABLE))return;t.getParameter(xe.GPU_DISJOINT_EXT)||(V.gpuMs=t.getQueryParameter(de,t.QUERY_RESULT)/1e6),t.deleteQuery(de),de=null}const V={canvas:e,gl:t,lastMs:0,width:0,height:0,gpuMs:null,lastUploadMs:0,lastMipMs:0,profiler:E,lastVariants:"",setSource(I,j=!0){U=I.width,ee=I.height;const S=performance.now();l(I,{},B);const X=performance.now();j&&(t.bindTexture(t.TEXTURE_2D,B),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR)),V.lastUploadMs=X-S,V.lastMipMs=performance.now()-X},invalidateLut(){x=""},present(){if(!ie)return;const I=ie;M("PRESENT",c(Dn),null,j=>{j.t("uT",I.out.t[0])})},finish(){t.bindFramebuffer(t.FRAMEBUFFER,null),t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(4))},destroy(){t.getExtension("WEBGL_lose_context")?.loseContext()},render(I,j={}){const S=Object.assign({},tn,I),X=j.preview??0,le=!!j.lossless||X!==0,ae=!!(X&ua),G=(m,se)=>X&m?"preview":le&&se?"lossless":"lab";V.lastVariants=`screen:${ae?"light":G(zo,!1)} spread:${G(No,!0)} scan:${G(jo,!1)}`;const p=performance.now();Re(),E.mode!=="off"&&E.frameStart();const _=xe&&!de&&E.mode!=="timer"?t.createQuery():null;_&&t.beginQuery(xe.TIME_ELAPSED_EXT,_);let q=Math.round(S.printW*S.pxmm),b=Math.round(q*ee/U);const k=Math.min(n,6144);if(Math.max(q,b)>k){const m=k/Math.max(q,b);q=Math.round(q*m),b=Math.round(b*m)}const L=I.tech==="xerox"||I.tech==="stencil";L&&(q=Math.max(4,q&-4),b=Math.max(4,b&-4)),pe(q,b),V.width=q,V.height=b;const d=ie;if(L){const m={gl:t,compile:r,run:M,target:g,freeTarget:T,texFrom:l,greenTex:A,fibTex:N,PR:{prep:i.prep,blur:i.blur,scan:i.scan}},se={prep:d.prep,qtmp:d.qtmp,comp:d.comp,out:d.out};return I.tech==="stencil"?(z??=En(m)).render(I,se,B,U,ee,q,b,!!j.toTexture,ae):(w??=vn(m)).render(I,se,B,U,ee,q,b,!!j.toTexture,ae),V.lastVariants=(I.tech??"xerox")+(ae?" light":""),_&&(t.endQuery(xe.TIME_ELAPSED_EXT),de=_),t.flush(),V.lastMs=performance.now()-p,V}const R=q/S.printW,C=Ce(ne(S.paper)),D=Math.min(ot,S.inks.length),h=S.inks.concat(Array(ot).fill("#000000")).slice(0,ot),v=S.opac.concat(Array(ot).fill(.15)).slice(0,ot),y=[];for(let m=0;m<ot;m++)y.push(...Ce(ne(qt(h[m]))));const P=h.map(m=>re(ne(qt(m)))[0]<.42?0:1),O=JSON.stringify([h,v,D,S.paper,S.inkCost,S.pair]);O!==x&&(M("LUT",i.lut,W,m=>{m.fv("uInk",y,3),m.i("uN",D),m.f("uPaper",...C),m.f("uMu",S.inkCost*.25)}),x=O),M("PREP",i.prep,d.prep,m=>{m.t("uSrc",B),m.f("uSrcRes",U,ee),m.f("uSmoothPx",S.smooth*U/S.printW),m.f("uSrcPaper",...S.srcPaper),m.f("uPaper",...C)});const $=ct(S.seed*7919+13),K=[],ce=[];for(let m=0;m<ot;m++){const se=($()*2-1)*S.rot*Math.PI/180,ue=1+($()*2-1)*S.scl/1e3,we=Math.cos(se)*ue,he=Math.sin(se)*ue;K.push(we,he,-he,we);const fe=$()*Math.PI*2,je=S.misreg*Math.sqrt($());ce.push(Math.cos(fe)*je,Math.sin(fe)*je)}M("SEP0",i.sep0,d.tmp,m=>{m.t("uPrep",d.prep.t[0]),m.t("uSetA",W.t[0]),m.t("uSetB",W.t[1]),m.i("uN",D),m.f("uMinDot",S.minDot)});const Z=Math.max(.2,S.misreg*.9+.12),H=Math.max(.3,Z*R/4);M("BLUR fill ¼ H",i.blur,d.qtmp,m=>{m.t("uTexA",d.tmp.t[0]),m.t("uTexB",d.tmp.t[1]),m.f("uDir",1,0),m.f("uSig",H)}),M("BLUR fill ¼ V",i.blur,d.sol,m=>{m.t("uTexA",d.qtmp.t[0]),m.t("uTexB",d.qtmp.t[1]),m.f("uDir",0,1),m.f("uSig",H)}),M("FILL",i.fill,d.loc,m=>{m.t("uRawA",d.tmp.t[0]),m.t("uRawB",d.tmp.t[1]),m.t("uWA",d.sol.t[0]),m.t("uWB",d.sol.t[1]),m.i("uN",D),m.f("uFill",S.fill)}),M("WARP",i.sep,d.sep,m=>{m.f("uPxMm",R),m.t("uSA",d.loc.t[0]),m.t("uSB",d.loc.t[1]),m.i("uN",D),m.f("uCtr",S.printW/2,b/R/2),m.m2("uM",K),m.fv("uT",ce,2)});const ve=(m,se,ue,we,he)=>{M(`BLUR ${m} H`,i.blur,ue,fe=>{fe.t("uTexA",se.t[0]),fe.t("uTexB",se.t[1]),fe.f("uDir",1,0),fe.f("uSig",he)}),M(`BLUR ${m} V`,i.blur,we,fe=>{fe.t("uTexA",ue.t[0]),fe.t("uTexB",ue.t[1]),fe.f("uDir",0,1),fe.f("uSig",he)})};return ve("loc",d.sep,d.tmp,d.loc,.22*R),ve("sol ¼",d.sep,d.qtmp,d.sol,1.5*R/4),M("SCREEN",ae?c(Fn):X&zo?c(Bn):i.screen,d.scr,m=>{oe(m),m.f("uPxMm",R),m.f("uSeed",S.seed),m.t("uSepA",d.sep.t[0]),m.t("uSepB",d.sep.t[1]),m.t("uSolA",d.sol.t[0]),m.t("uSolB",d.sol.t[1]),m.t("uLocA",d.loc.t[0]),m.t("uLocB",d.loc.t[1]),m.t("uGreen",A),m.i("uN",D),m.i("uMode",+S.screen),m.f("uGrain",S.grain),m.f("uLoad",S.inkLoad),m.f("uLpi",S.lpi),m.f("uMottle",S.mottle),m.f("uStarve",S.starve),m.f("uTexAmp",S.texAmp),m.f("uStreak",S.streak),m.f("uSolidLv",S.solidLv),m.fv("uExSel",P,1),m.f("uTrap",S.trap)}),M("SPREAD",X&No?c(Ln):le?c(ca):i.spread,d.cov,m=>{oe(m),m.f("uPxMm",R),m.f("uSeed",S.seed),m.t("uScrA",d.scr.t[0]),m.t("uScrB",d.scr.t[1]),m.t("uSepA",d.sep.t[0]),m.t("uSepB",d.sep.t[1]),m.t("uLocA",d.loc.t[0]),m.t("uLocB",d.loc.t[1]),m.i("uN",D),m.f("uBleedPx",S.bleed*R),m.f("uGain",S.gain),m.f("uEdge",S.edge),m.f("uSolidLv",S.solidLv),m.fv("uExSel",P,1)}),M("COMPOSE",i.compose,d.comp,m=>{oe(m),m.f("uPxMm",R),m.f("uSeed",S.seed),m.t("uCovA",d.cov.t[0]),m.t("uCovB",d.cov.t[1]),m.t("uSolA",d.sol.t[0]),m.t("uSolB",d.sol.t[1]),m.f("uStarve",S.starve),m.t("uFib",N),m.t("uInc",te),m.i("uN",D),m.fv("uInk",y,3),m.fv("uOp",v,1),m.f("uPaper",...C),m.f("uPaperTex",S.paperTex),m.f("uFibers",S.fibers),m.f("uIncl",S.incl),m.f("uVoids",S.voids),m.f("uMottle",S.mottle),m.f("uTexAmp",S.texAmp),m.fv("uExSel",P,1)}),M("SCAN",X&jo?c(Rn):i.scan,j.toTexture?d.out:null,m=>{m.f("uSeed",S.seed),m.t("uComp",d.comp.t[0]),m.f("uBlurPx",S.scanBlur),m.f("uNoise",S.scanNoise),m.i("uNorm",+S.normWhite),m.f("uPaper",...C)}),_&&(t.endQuery(xe.TIME_ELAPSED_EXT),de=_),t.flush(),V.lastMs=performance.now()-p,V}};return V}const ma=new URLSearchParams(window.location.search),lt=ma.get("srdebug")==="1",Pe=lt?ma:new URLSearchParams,qn=["srres","srpipe","srhold","srpreview","srprevmask"],Y={preserveDrawingBuffer:Pe.get("srpdb")!=="0",resScale:Math.min(1,Math.max(.25,Number(Pe.get("srres"))||1)),mip:Pe.get("srmip")!=="0",bypass:Pe.get("srbypass")==="1",darkPaperFromBase:Pe.get("srdarkpaper")==="bg",simUpload:Pe.get("srsim")==="1",offscreenBack:Pe.get("sroff")==="1",bitmapUpload:Pe.get("srbitmap")==="1",pipe:Pe.get("srpipe")==="2"?2:Pe.get("srpipe")==="1"?1:0,hold:Pe.get("srhold")==="1",lossless:Pe.get("srlossless")!=="0",preview:Pe.get("srpreview")==="1"?15:Math.max(0,Math.min(15,Number(Pe.get("srprevmask"))||0)),auto:!qn.some(e=>Pe.has(e)),forceLevel:Pe.get("srlevel")==="preview"?"preview":Pe.get("srlevel")==="full"?"full":null},pa={preserveDrawingBuffer:!0,resScale:1,mip:!0,bypass:!1,darkPaperFromBase:!1,simUpload:!1,offscreenBack:!1,bitmapUpload:!1,pipe:0,hold:!1,lossless:!0,preview:0,auto:!0,forceLevel:null},J={lastCallAt:0,isDark:!1,canvasW:0,canvasH:0,preset:"",speed:0,offscreenFallback:!1,bitmapLagFrames:0,pipeSyncFrames:0,pipeFrames:0,heldFrames:0,animRefines:0,lastPath:"",level:""},ut={engineInfo:()=>null,profiler:()=>null,recreateEngine:()=>{}},Xt=e=>{const o=e.preserveDrawingBuffer!==void 0&&e.preserveDrawingBuffer!==Y.preserveDrawingBuffer,a=e.offscreenBack!==void 0&&e.offscreenBack!==Y.offscreenBack;Object.assign(Y,e),(o||a)&&ut.recreateEngine()},Uo=5,Wo=30,In=12,Nn=300,jn=125,ro=new Map;let ze=null,Ct="";const da=(e,o)=>`${e}×${o}`;function zn(e,o){if(Y.forceLevel)return ao(Y.forceLevel==="preview"),Y.forceLevel;const a=ro.get(da(e,o));return a?(ao(a==="preview"),a):"detect"}function Go(e,o,a,t){const n=da(e,o);if((!ze||ze.size!==n)&&(ze={size:n,seen:0,samples:[]}),++ze.seen>Uo+3*Wo&&!ze.samples.length){ro.set(n,"full"),ze=null,Ct=`${n}: sin medida (${t}) → full`;return}if(ze.seen<=Uo||a===null||(ze.samples.push(a),ze.samples.length<Wo))return;const r=[...ze.samples].sort((i,f)=>i-f),u=r[r.length>>1],c=u>In?"preview":"full";ro.set(n,c),ze=null,Ct=`${n}: coste p50 ${u.toFixed(1)} ms (${t}) → ${c}`,ao(c==="preview"),lt&&console.info(`[SuperRiso] quality level ${Ct}`)}const On=()=>Ct;let St=null,Kt=null,Xo=0,Mo="";function $n(e,o,a){return!!e&&!!St&&o===Kt&&e.length===St.length&&e.every((n,r)=>n===St[r])||(Xo=a,Mo=o!==Kt?"scene":(e??[]).map((n,r)=>n===St?.[r]?"":r).filter(n=>n!=="").join(",")),St=e??null,Kt=o,a-Xo}let Ko=null,Vo=0;function Un(e,o,a){return a&&o!==Ko&&(Ko=o,Vo++),`${(e??[]).join(",")}|${a?Vo:0}`}const Wn=.06,Gn=e=>{if(e.type==="text")return Math.pow(e.fontSize??40,2)*Math.max(1,e.text?.length??1)*.5;let o=1/0,a=1/0,t=-1/0,n=-1/0;for(const r of e.points)r.x<o&&(o=r.x),r.x>t&&(t=r.x),r.y<a&&(a=r.y),r.y>n&&(n=r.y);return Number.isFinite(o)?(t-o)*(n-a)+1:1},Xn=(e,o)=>{const a=Math.min(e[0],o[0]);return Tt(e,o)<.12+.055*Math.max(0,Math.min(1,(.4-a)/.2))};function Kn(e,o,a,t,n,r){const u=new Map,c=new Set(o.map(s=>s*-Ba));for(const s of e){if(s.isEraser||!s.color||s.points.length===0||c.has(s.zIndex))continue;const l=s.color.toLowerCase();u.set(l,(u.get(l)??0)+Gn(s))}const i=re(a),f=[];for(const[s,l]of u){if(!/^#[0-9a-f]{6}$/.test(s))continue;const g=re(ne(s));Tt(g,i)>=Wn&&f.push({hex:s,L:g,w:l})}if(t&&f.push({hex:t,L:re(ne(t)),w:1/0}),r){const s=[];for(const l of f.sort((g,T)=>T.w-g.w)){const g=s.find(T=>Xn(T.L,l.L));g?g.w+=l.w:s.push(l)}f.splice(0,f.length,...s)}for(;f.length>n;){let s=0,l=1,g=1/0;for(let M=0;M<f.length;M++)for(let A=M+1;A<f.length;A++){const F=Tt(f[M].L,f[A].L);F<g&&(g=F,s=M,l=A)}const[T,E]=f[s].w>=f[l].w?[s,l]:[l,s];f[T].w+=f[E].w,f.splice(E,1)}return f.sort((s,l)=>l.w-s.w)}function Vn(e,o,a,t,n,r,u){let c;if(a==="cmyk")c=Qa.slice();else{const i=Kn(e,o,n,r,Math.min(ot,t),u&&a==="own");if(a==="own")c=i.map(f=>["",f.hex]);else{const f=Ha.filter(l=>l[0]!=="White"),s=new Set;c=[];for(const l of i){const g=en(f,ne(l.hex),s);g&&(s.add(g[0]),c.push(g))}}}return c.length||(c=[["Black","#000000"]]),c.sort((i,f)=>re(ne(qt(f[1])))[0]-re(ne(qt(i[1])))[0]),{inks:c.map(i=>i[1]),names:c.map(i=>i[0]),opac:c.map(i=>Ja(i[0],i[1])),srcPaper:n}}let dt=null;function ha(e,o,a,t,n,r=!1){const u=`${a.inkSet}|${a.maxInks}|${t.join(",")}|${n}|${+r}`;if(dt&&dt.shapes===e&&dt.hidden===o&&dt.key===u)return dt.inks;const c=Vn(e,o,a.inkSet,a.maxInks,t,n,r);return dt={shapes:e,hidden:o,key:u,inks:c},c}const Yo=e=>{const o=na.find(a=>a[0]===e);return{hex:o[1],id:o[0]}},Yn=(e,o)=>{const a=(e[0]-o[0])*.6,t=e[1]-o[1],n=e[2]-o[2];return a*a+t*t+n*n};function va(e,o,a,t,n){const r=re(t);return ha(o,a,{...e,inkSet:"own",maxInks:8},t,n).inks.filter(u=>{const c=re(ne(u));return c[0]>.36&&Math.hypot(c[0]-r[0],c[1]-r[1],c[2]-r[2])>.08}).sort((u,c)=>{const i=re(ne(u)),f=re(ne(c));return Math.hypot(f[1],f[2])-Math.hypot(i[1],i[2])}).slice(0,6)}function Hn(e,o){const a=o.map(u=>re(ne(u))),t=[];for(const u of Object.keys(e)){const c=re(ne(u));a.forEach((i,f)=>{const s=Yn(c,i);s<.012&&t.push([s,u,f])})}t.sort((u,c)=>u[0]-c[0]);const n=o.map(()=>null),r=new Set;for(const[,u,c]of t)n[c]!==null||r.has(u)||(n[c]=u,r.add(u));return n}function Qn(e,o,a,t,n){const r=e.xerox,u=va(e,o,a,t,n),c=r.what==="auto"?u.length?"color":"fill":r.what;let i,f=null;if(c==="fill")i=(r.box.length?r.box:Fa.slice(0,3).map(s=>Yo(s).hex)).slice(0,6).map((s,l)=>({hex:s,id:Do(s),box:l}));else{const s=u.slice(0,Math.max(1,Math.min(r.n,u.length))),l=new Set,g=Hn(r.over,s);i=s.map((T,E)=>{const M=g[E];let A=M?r.over[M]:null;if(!A)if(r.pal==="own")A=T;else{const F=re(ne(T));let N=1e9;for(const te of na){if(l.has(te[1]))continue;const oe=Tt(F,re(ne(te[1])));oe<N&&(N=oe,A=te[1])}}return l.add(A),{hex:A,id:r.pal==="own"&&!M?void 0:Do(A),zone:T,over:M??void 0}}),f=s.slice()}return i.length||(i=[{...Yo("red"),id:"red"}]),{rows:i,paint:i.map(s=>s.hex),keys:f,what:c,zones:u.length}}let ht=null;function Zn(e,o,a,t,n){const r=e.xerox,u=JSON.stringify([r.what,r.pal,r.n,r.over,r.box,t,n]);if(ht&&ht.shapes===o&&ht.hidden===a&&ht.key===u)return ht.mk;const c=Qn(e,o,a,t,n);return ht={shapes:o,hidden:a,key:u,mk:c},c}const xa=(e,o,a)=>{const t=a?1024:560,n=Math.min(1,t/Math.max(e,o));return[Math.max(8,Math.round(e*n)),Math.max(8,Math.round(o*n))]};function Vt(e,{keys:o,srcPaper:a,fill:t,nk:n,cover:r,seed:u}){const[c,i]=xa(e.width,e.height,t),f=document.createElement("canvas");f.width=c,f.height=i;const s=f.getContext("2d",{willReadFrequently:!0});s.fillStyle="#fff",s.fillRect(0,0,c,i),s.drawImage(e,0,0,c,i);const l=s.getImageData(0,0,c,i).data,g=re(a),T=new Int8Array(c*i).fill(-1),E=c*i;if(t){const k=new Uint8Array(E);for(let v=0;v<E;v++){const y=re([l[v*4]/255,l[v*4+1]/255,l[v*4+2]/255]);k[v]=g[0]-y[0]>.14?1:0}const L=new Uint8Array(k);for(let v=0;v<i;v++)for(let y=0;y<c;y++){if(!k[v*c+y])continue;const P=v*c+y;y>0&&(L[P-1]=1),y<c-1&&(L[P+1]=1),v>0&&(L[P-c]=1),v<i-1&&(L[P+c]=1)}const d=new Int32Array(E).fill(-1),R=new Int32Array(E),C=ct((u|0)*977+13);let D=0;const h=Math.max(6,E*12e-5);for(let v=0;v<E;v++){if(L[v]||d[v]>=0)continue;let y=0;R[y++]=v,d[v]=D;const P=[];let O=!1;for(;y;){const Z=R[--y];P.push(Z);const H=Z%c,ve=Z/c|0;(H===0||ve===0||H===c-1||ve===i-1)&&(O=!0),H>0&&!L[Z-1]&&d[Z-1]<0&&(d[Z-1]=D,R[y++]=Z-1),H<c-1&&!L[Z+1]&&d[Z+1]<0&&(d[Z+1]=D,R[y++]=Z+1),ve>0&&!L[Z-c]&&d[Z-c]<0&&(d[Z-c]=D,R[y++]=Z-c),ve<i-1&&!L[Z+c]&&d[Z+c]<0&&(d[Z+c]=D,R[y++]=Z+c)}D++;const $=C(),K=C();if(P.length<h||O&&P.length>E*.05||$>r)continue;const ce=Math.min(n-1,Math.floor(K*n));for(const Z of P)T[Z]=ce}for(let v=0;v<3;v++){const y=new Int8Array(T);for(let P=0;P<i;P++)for(let O=0;O<c;O++){const $=P*c+O;if(y[$]>=0||!L[$])continue;const K=O>0&&y[$-1]>=0?y[$-1]:O<c-1&&y[$+1]>=0?y[$+1]:P>0&&y[$-c]>=0?y[$-c]:P<i-1&&y[$+c]>=0?y[$+c]:-1;K>=0&&(T[$]=K)}}}else{const k=o.map(L=>re(ne(L)));for(let L=0;L<E;L++){const d=re([l[L*4]/255,l[L*4+1]/255,l[L*4+2]/255]),R=Math.hypot(d[0]-g[0],d[1]-g[1],d[2]-g[2]),C=Math.hypot(d[1],d[2]);if(!(R>.08&&(d[0]>.32||C>.12)))continue;let D=-1,h=1e9;for(let v=0;v<k.length;v++){const y=(k[v][0]-d[0])*.6,P=k[v][1]-d[1],O=k[v][2]-d[2],$=y*y+P*P+O*O;$<h&&(h=$,D=v)}h<.045&&(T[L]=D)}}let M=null;if(t){M=document.createElement("canvas"),M.width=c,M.height=i;const k=M.getContext("2d"),L=k.createImageData(c,i);for(let d=0;d<E;d++)L.data[d*4]=(T[d]+1)*36,L.data[d*4+3]=255;k.putImageData(L,0,0)}const A=new Int32Array(E).fill(-1),F=s.createImageData(c,i),N=new Int32Array(E);for(let k=0;k<E;k++)F.data[k*4]=255,F.data[k*4+1]=128,F.data[k*4+2]=0,F.data[k*4+3]=255;let te=0;const oe=[];for(let k=0;k<E;k++){if(T[k]<0||A[k]>=0)continue;const L=T[k];let d=0;N[d++]=k,A[k]=te;const R=[];let C=0,D=0,h=0,v=0,y=0,P=0;for(;d;){const me=N[--d];R.push(me);const $e=me%c,Xe=me/c|0;C++,D+=$e,h+=Xe,v+=$e*$e,y+=Xe*Xe,P+=$e*Xe,$e>0&&T[me-1]===L&&A[me-1]<0&&(A[me-1]=te,N[d++]=me-1),$e<c-1&&T[me+1]===L&&A[me+1]<0&&(A[me+1]=te,N[d++]=me+1),Xe>0&&T[me-c]===L&&A[me-c]<0&&(A[me-c]=te,N[d++]=me-c),Xe<i-1&&T[me+c]===L&&A[me+c]<0&&(A[me+c]=te,N[d++]=me+c)}if(te++,oe.push(C),C<6)continue;const O=D/C,$=h/C,K=v/C-O*O,ce=y/C-$*$,Z=P/C-O*$,H=.5*Math.atan2(2*Z,K-ce),ve=K+ce,m=K*ce-Z*Z,se=Math.sqrt(Math.max(0,ve*ve/4-m)),ue=ve/2+se,we=Math.max(1e-6,ve/2-se),he=Math.sqrt(we/ue),fe=Math.max(0,Math.min(1,(.62-he)/.3)),je=Math.round(127.5+127.5*Math.cos(2*H)),et=Math.round(127.5+127.5*Math.sin(2*H)),tt=Math.round(255*fe);for(const me of R)F.data[me*4]=je,F.data[me*4+1]=et,F.data[me*4+2]=tt}const w=c+1>>1,z=i+1>>1,W=w*z,x=Math.max(1,Math.min(6,t?n:o.length)),B=Math.max(6,Math.round(E*4e-4)),U=document.createElement("canvas");U.width=3*w,U.height=x*z;const ee=U.getContext("2d"),ie=ee.createImageData(3*w,x*z),Me=ie.data,Q=255<<16|32768,pe=new Int32Array(W),xe=new Int16Array(W),de=new Int16Array(W),Re=new Float32Array(W),V=new Uint8Array(W),I=new Uint8Array(W),j=8,S=new Uint32Array(Me.buffer),X=k=>(255<<24|(k&255)<<16|(k>>8&255)<<8|k>>16)>>>0,le=X(Q),ae=(255<<24|240)>>>0,G=new Array(x).fill(w),p=new Array(x).fill(-1),_=new Array(x).fill(z),q=new Array(x).fill(-1);for(let k=0,L=0;k<i;k++)for(let d=0;d<c;d++,L++){const R=T[L];if(R<0||R>=x)continue;const C=d>>1,D=k>>1;C<G[R]&&(G[R]=C),C>p[R]&&(p[R]=C),D<_[R]&&(_[R]=D),D>q[R]&&(q[R]=D)}const b=k=>F.data[k*4]<<16|F.data[k*4+1]<<8|F.data[k*4+2];for(let k=0;k<x;k++){for(let v=0;v<z;v++){const y=(k*z+v)*3*w;S.fill(le,y,y+2*w),S.fill(ae,y+2*w,y+3*w)}if(p[k]<0)continue;const L=Math.max(0,G[k]-j),d=Math.min(w-1,p[k]+j),R=Math.max(0,_[k]-j),C=Math.min(z-1,q[k]+j);let D=!1;for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){const P=v*w+y;pe[P]=-1,Re[P]=1e9,V[P]=0;for(let O=0;O<4&&pe[P]<0;O++){const $=2*y+(O&1),K=2*v+(O>>1);if($>=c||K>=i)continue;const ce=K*c+$;T[ce]===k&&oe[A[ce]]>=B&&(pe[P]=b(ce),xe[P]=y,de[P]=v,Re[P]=0,D=!0)}}if(!D)continue;const h=(v,y,P,O)=>{if(pe[O]<0)return;const $=y-xe[O],K=P-de[O],ce=$*$+K*K;ce<Re[v]&&(Re[v]=ce,pe[v]=pe[O],xe[v]=xe[O],de[v]=de[O])};for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){const P=v*w+y;y>L&&(h(P,y,v,P-1),v>R&&h(P,y,v,P-w-1)),v>R&&(h(P,y,v,P-w),y<d&&h(P,y,v,P-w+1))}for(let v=C;v>=R;v--)for(let y=d;y>=L;y--){const P=v*w+y;y<d&&(h(P,y,v,P+1),v<C&&h(P,y,v,P+w+1)),v<C&&(h(P,y,v,P+w),y>L&&h(P,y,v,P+w-1))}for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){const P=v*w+y;(y<d&&pe[P+1]!==pe[P]||v<C&&pe[P+w]!==pe[P])&&(V[P]=1,y<d&&(V[P+1]=1),v<C&&(V[P+w]=1))}for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){let P=0;for(let O=-3;O<=3&&!P;O++){const $=y+O;$>=L&&$<=d&&(P=V[v*w+$])}I[v*w+y]=P}for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){let P=0;for(let O=-3;O<=3&&!P;O++){const $=v+O;$>=R&&$<=C&&(P=I[$*w+y])}V[v*w+y]=P}for(let v=R;v<=C;v++)for(let y=L;y<=d;y++){const P=v*w+y,O=pe[P]>=0?pe[P]:Q;let $=O,K=4;if(V[P]&&pe[P]>=0){let Z=1e9;for(let H=-3;H<=3;H++)for(let ve=-3;ve<=3;ve++){const m=y+ve,se=v+H;if(m<L||se<R||m>d||se>C)continue;const ue=se*w+m;if(pe[ue]===O||pe[ue]<0)continue;const we=xe[P]-y,he=de[P]-v,fe=xe[ue]-y,je=de[ue]-v,et=Math.hypot(xe[ue]-xe[P],de[ue]-de[P]);if(et<.001)continue;const tt=(fe*fe+je*je-we*we-he*he)/(2*et);tt<Z&&(Z=tt,$=pe[ue])}$!==O&&(K=Math.min(4,Math.max(0,Z)))}const ce=y+(k*z+v)*3*w;S[ce]=X(O),S[ce+w]=X($),S[ce+2*w]=(255<<24|Math.round(K*60))>>>0}}return ee.putImageData(ie,0,0),U.__srOriRows=x,{ori:U,ids:M}}const ga=300;let Ie=null,so=0,Yt=!1;const vt=document.createElement("canvas"),Jn=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:ga}):setTimeout(e,0)},er=(e,o)=>!!e.motion&&!!o.motion&&e.scene===o.scene&&e.motion.length===o.motion.length&&e.motion.every((a,t)=>a===o.motion[t]),tr=()=>so;function or(e,o,a,t,n,r,u){const c=o.what==="fill",i={keys:c?[]:o.keys??o.paint,srcPaper:t,fill:c,nk:o.paint.length,cover:a.fillCover,seed:a.fillSeed};if(!n)return Vt(e,i);const f=JSON.stringify([c,i.keys,i.nk,c?i.cover:0,c?i.seed:0,t]),s=performance.now(),l={motion:r&&[...r],scene:u};if(!Ie||Ie.key!==f)return Ie={key:f,maps:Vt(e,i),at:s,sig:l},so++,Ie.maps;if(!Yt&&s-Ie.at>=ga&&!er(l,Ie.sig)){const[g,T]=xa(e.width,e.height,c);(vt.width!==g||vt.height!==T)&&(vt.width=g,vt.height=T),vt.getContext("2d").drawImage(e,0,0,g,T),Yt=!0,Ie.at=s,Ie.sig=l,Jn(()=>{Yt=!1,!(!Ie||Ie.key!==f)&&(Ie.maps=Vt(vt,i),so++)})}return Ie.maps}const io=300,ar=200,nr=e=>re(ne(e))[0]<.3?.995:.97;function Ho(e){const o=re(ne(e));let a=Co[0][1],t=1e9;for(const[,n]of Co){const r=re(ne(n)),u=Math.hypot(o[0]-r[0],2*(o[1]-r[1]),2*(o[2]-r[2]));u<t&&(t=u,a=n)}return a}const rr=e=>re(e)[0]>.8?e:[1,1,1];function sr(e,o,a){const t=(e.dark-.5)*.5,n=i=>Math.max(.03,Math.min(.95,i));let r=[],u=null;if(e.mode==="tone"){const i=e.n;r=a(i).map((s,l)=>({kind:0,thr:n(s-t),hex:Da[i][l]})),e.accent&&o.length&&(u=o[0],r.push({kind:3,hex:e.colors==="own"?o[0]:Ho(o[0])}))}else r=o.slice(0,e.n).sort((f,s)=>re(ne(s))[0]-re(ne(f))[0]).map(f=>({kind:1,key:f,hex:e.colors==="own"?f:Ho(f)})),r.push({kind:2,thr:n(Math.max(.5,a(2)[1])-t),hex:"#161616"});return e.manual.length===r.length&&r.forEach((i,f)=>{i.hex=e.manual[f]}),r.forEach(i=>{i.op=nr(i.hex)}),r.map((i,f)=>f).filter(i=>r[i].kind!==3).slice(-3).forEach((i,f)=>{r[i].ch=f}),{layers:r,accKey:u}}const Ht=new Map;let ft=null,Ft=null,Qo=0;const lo=e=>e?[...e]:null;function ir(e,o){const a=lo(e);return(!a||!Ft||a.length!==Ft.length||a.some((t,n)=>t!==Ft[n]))&&(Ft=a,Qo=o),!!a&&o-Qo>=ar}let Ae=null,Dt=null,Qt=!1,co=0;const xt=document.createElement("canvas"),lr=e=>{typeof requestIdleCallback=="function"?requestIdleCallback(e,{timeout:io}):setTimeout(e,0)},cr=()=>co;function ur(e,o,a,t){const n=rr(e.srcPaper),r=performance.now(),u=e.isLive?ir(e.motion,r):!0,c=va(e.settings,e.shapes,e.hidden,e.srcPaper,e.darkBase);if(e.isLive&&u){const M=lo(e.motion);(!ft||ft.scene!==e.scene||!M||!ft.cam||M.some((F,N)=>F!==ft.cam[N]))&&(!ft||r-ft.at>=io)&&(Ht.clear(),ft={scene:e.scene,cam:M,at:r})}const i=M=>{const A=`${M}|${n.join(",")}|${e.bg.join(",")}`;let F=Ht.get(A);return F||(F=An(o,n,M,e.bg),Ht.set(A,F)),F},{layers:f,accKey:s}=sr(e.s,c,i),l={layers:f,accKey:s,cut:a.cut,bridges:!!a.bridges,bridgeMm:a.bridgeMm,drips:a.drips,dripLen:a.dripLen,dripW:a.dripW,splat:a.splat,splatSize:a.splatSize,cloud:a.cloud,cloudMm:a.cloudMm,seed:t,printW:a.printW,srcPaper:n};if(!e.isLive)return{layers:f,accKey:s,maps:qo(o,l),srcPaper:n};const g=JSON.stringify([f.map(M=>[M.kind,M.thr,M.key,M.ch]),s,l.cut,l.bridges,l.drips,l.splat,l.cloud,t,l.printW,n]),T=lo(e.motion),E=!Ae||Ae.key!==g||Ae.scene!==e.scene||!T||!Ae.cam||T.some((M,A)=>M!==Ae.cam[A]);if(E&&(u||!Ae||Ae.key!==g)&&!Qt&&(!Ae||r-Ae.at>=io)){const M=Math.min(1,1024/Math.max(o.width,o.height)),A=Math.max(8,Math.round(o.width*M)),F=Math.max(8,Math.round(o.height*M));(xt.width!==A||xt.height!==F)&&(xt.width=A,xt.height=F),xt.getContext("2d").drawImage(o,0,0,A,F),Qt=!0;const N=e.scene;Ae&&(Ae.at=r),lr(()=>{Qt=!1,Ae={key:g,maps:qo(xt,l),at:performance.now(),cam:T,scene:N},co++})}return Ae?u&&!E?{layers:f,accKey:s,maps:Ae.maps,srcPaper:n}:((!Dt||Dt.src!==Ae.maps)&&(Dt={src:Ae.maps,maps:{drip:null,bridge:null,cloud:Ae.maps.cloud}},co++),{layers:f,accKey:s,maps:Dt.maps,srcPaper:n}):{layers:f,accKey:s,maps:null,srcPaper:n}}const fr=2400,mr=240,Lt={interval:[],total:[],flat:[],upload:[],mip:[],render:[],back:[],gpu:[],bitmapWait:[]};function Ve(e,o){const a=Lt[e];a.push(o),a.length>fr&&a.shift()}function _e(e,o,a){const t=Lt[e].slice(-a);if(t.length===0)return null;const n=[...t].sort((r,u)=>r-u);return n[Math.min(n.length-1,Math.floor(o*n.length))]}function wo(e=mr){const o=Lt.interval.slice(-e),a=o.length?o.reduce((t,n)=>t+n,0)/o.length:null;return{samples:o.length,fps:a?1e3/a:null,frameP50:_e("interval",.5,e),frameP95:_e("interval",.95,e),totalP50:_e("total",.5,e),totalP95:_e("total",.95,e),flatP50:_e("flat",.5,e),uploadP50:_e("upload",.5,e),uploadP95:_e("upload",.95,e),mipP50:_e("mip",.5,e),renderP50:_e("render",.5,e),backP50:_e("back",.5,e),bitmapWaitP50:_e("bitmapWait",.5,e),gpuP50:_e("gpu",.5,e),gpuP95:_e("gpu",.95,e)}}function ba(){for(const e of Object.keys(Lt))Lt[e].length=0}let gt=null,Pt=null,nt=null,rt=null,He=null,ya="",uo="";function ka(e){ya=e}function Zt(e){uo=e,nt&&(nt.textContent=e,nt.style.display=e?"block":"none")}function Zo(e){He&&(He.disabled=e,He.style.opacity=e?".5":"1")}const Ne=(e,o=1)=>e===null?"–":e.toFixed(o),fo=e=>{Object.assign(e.style,{minHeight:"44px",minWidth:"88px",padding:"0 14px",border:"1px solid rgba(255,255,255,.5)",borderRadius:"8px",background:"rgba(80,80,80,.9)",color:"#fff",font:"600 13px system-ui, sans-serif",cursor:"pointer",touchAction:"manipulation"})};function pr(e){if(!rt)return;rt.textContent="";const o=document.createElement("textarea");o.value=e,o.readOnly=!0,o.rows=22,o.wrap="off",Object.assign(o.style,{width:"min(560px, 90vw)",font:"10px/1.3 ui-monospace, Menlo, Consolas, monospace",background:"rgba(0,0,0,.8)",color:"#fff",border:"1px solid #888",borderRadius:"6px",padding:"6px"});const a=document.createElement("div");a.style.display="flex",a.style.gap="8px",a.style.marginTop="6px";const t=document.createElement("div");t.style.cssText="font:11px system-ui;color:#ccc;align-self:center";const n=document.createElement("button");n.textContent="Copiar",fo(n),n.onclick=async()=>{try{await Promise.race([navigator.clipboard.writeText(e),new Promise((u,c)=>setTimeout(()=>c(new Error("timeout")),1500))]),t.textContent="Copiado ✓"}catch{o.focus(),o.select(),t.textContent="No se pudo copiar: texto seleccionado, copia a mano"}};const r=document.createElement("button");r.textContent="Cerrar",fo(r),r.onclick=()=>{rt&&(rt.textContent="")},a.append(n,r,t),rt.append(o,a)}function dr(e){gt||typeof document>"u"||(gt=document.createElement("div"),gt.setAttribute("data-superriso-overlay",""),Object.assign(gt.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:"9999",pointerEvents:"none",display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"}),rt=document.createElement("div"),rt.style.pointerEvents="auto",nt=document.createElement("div"),Object.assign(nt.style,{display:"none",font:"600 12px system-ui, sans-serif",color:"#fff",background:"rgba(160,0,200,.85)",padding:"4px 8px",borderRadius:"4px"}),He=document.createElement("button"),He.textContent="Medir",fo(He),He.style.pointerEvents="auto",He.onclick=e,Pt=document.createElement("div"),Object.assign(Pt.style,{font:"10px/1.35 ui-monospace, Menlo, Consolas, monospace",color:"#fff",background:"rgba(0,0,0,0.55)",padding:"4px 6px",borderRadius:"4px",whiteSpace:"pre"}),gt.append(rt,nt,He,Pt),document.body.appendChild(gt),setInterval(()=>{if(!Pt)return;const o=wo();Pt.textContent=`${ya}
fps ${Ne(o.fps)} · frame p50 ${Ne(o.frameP50)} p95 ${Ne(o.frameP95)} ms
SR p50 ${Ne(o.totalP50)} p95 ${Ne(o.totalP95)} ms (aplanado ${Ne(o.flatP50)} · subida ${Ne(o.uploadP50)} · mip ${Ne(o.mipP50)} · motor ${Ne(o.renderP50)} · vuelta ${Ne(o.backP50)})
GPU motor p50 ${Ne(o.gpuP50)} p95 ${Ne(o.gpuP95)} ms`,uo&&nt&&(nt.textContent=uo)},500))}const Rt=(()=>{try{if(typeof OffscreenCanvas>"u")return!1;const o=new OffscreenCanvas(1,1).getContext("webgl2");return o?(o.getExtension("WEBGL_lose_context")?.loseContext(),!0):!1}catch{return!1}})();function Ma(e){return e&&Rt?new OffscreenCanvas(1,1):document.createElement("canvas")}const So=e=>typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas,Po=()=>{const e=document.createElement("canvas");return{canvas:e,ctx:e.getContext("2d")}},We=Po(),mo=Po();function bt(e,o,a,t,n,r){const{canvas:u,ctx:c}=e;return(u.width!==a||u.height!==t)&&(u.width=a,u.height=t),c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.globalCompositeOperation="source-over",c.fillStyle=n,c.fillRect(0,0,a,t),c.globalCompositeOperation=r?"source-over":"multiply",c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="medium",c.drawImage(o,0,0,a,t),c.globalCompositeOperation="source-over",u}let Fe=null,Jt=!1,Jo=0;function hr(e,o,a){Jo++;const t=Jo;let n=null;if(Fe&&Fe.bmp.width===o&&Fe.bmp.height===a?n={bmp:Fe.bmp,lag:t-Fe.frame}:Fe&&Fe.bmp.close(),Fe=null,!Jt){Jt=!0;const r=performance.now();createImageBitmap(e).then(u=>{Ve("bitmapWait",performance.now()-r),Fe&&Fe.bmp.close(),Fe={bmp:u,frame:t}}).catch(()=>{}).finally(()=>{Jt=!1})}return n}function vr(){Fe&&Fe.bmp.close(),Fe=null}function pt(e,o,a,t,n,r,u){e.save();try{e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="copy",e.imageSmoothingEnabled=!u,a>n&&(e.imageSmoothingQuality="high"),e.drawImage(o,0,0,a,t,0,0,n,r)}finally{e.restore()}}function It(e,o,a,t,n,r,u){const c=So(o)?o.transferToImageBitmap():null;try{pt(e,c??o,a,t,n,r,u)}finally{c?.close()}}const at=Po();let Ao=!1;function Eo(e,o,a){const t=So(e)?e.transferToImageBitmap():null;try{return(at.canvas.width!==o||at.canvas.height!==a)&&(at.canvas.width=o,at.canvas.height=a),at.ctx.globalCompositeOperation="copy",at.ctx.drawImage(t??e,0,0),Ao=!0,at.canvas}finally{t?.close()}}const _t=()=>Ao?at.canvas:null,po=()=>{Ao=!1},Nt=()=>({res:1,sim:!1,preview:0,lossless:Y.lossless,pipe:0,hold:!1,holdFps:12});function wa(e,o,a){if(!Y.auto)return{m:{res:Y.resScale,sim:Y.simUpload,preview:Y.preview,lossless:Y.lossless,pipe:Y.pipe,hold:Y.hold,holdFps:12},level:"manual"};const t=zn(e,o);return t!=="preview"?{m:Nt(),level:t}:a.fullQuality?{m:{...Nt(),hold:!0,holdFps:a.reprintFps||12},level:"preview·full"}:{m:{res:.5,sim:Y.simUpload,preview:Tn|ua,lossless:!0,pipe:1,hold:!0,holdFps:12},level:t}}const xr=e=>[`res ${e.res}`,e.sim?"sim-upload":"",e.pipe?`PIPE${e.pipe}`:"",e.hold?`HOLD ${e.holdFps}`:"",e.lossless?"LOSSLESS":"",e.preview?`PREVIEW ${e.preview}`:""].filter(Boolean).join(" · "),Sa=()=>[`pdb ${Y.preserveDrawingBuffer?"on":"off"}`,`mip ${Y.mip?"on":"off"}`,Y.bitmapUpload?"bitmap":"",Y.offscreenBack?Rt?"offscreen":"offscreen→DOM":"",Y.bypass?"BYPASS":""].filter(Boolean).join(" · "),kt={inks:null,params:null},gr=typeof navigator<"u"&&(/iPad|iPhone|Android/.test(navigator.userAgent)||/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1||(navigator.deviceMemory??8)<=4)?2048:4096,br=2,yr=(e,o=1,a=!0)=>Math.max(1,Math.min(gr,e/o*(a?typeof window<"u"&&window.devicePixelRatio||1:br))/e);function jt(e,o,a,t){const{settings:n,isDarkMode:r,isPixelArt:u}=a,c=n.technique==="xerox",i=n.technique==="stencil",f=c?yr(e,a.renderScale,a.isLive):1,s=c?hn(n.xerox,e*t.res*f,n.resolution):i?kn(n.stencil,e*t.res,n.resolution):an(n,e*t.res),l=Math.round(240*s.pxmm);c&&(s.tex=(a.renderScale??1)*l/e);const g=Math.round(l*o/e),T=t.sim?Math.min(e,l):e,E=t.sim?Math.min(o,g):o,M=qa(r,u),A=r&&!Y.darkPaperFromBase,F=A?[1,1,1]:ne(M),N=c?Zn(n,a.shapes,a.hiddenLayers,F,A?M:null):null;N&&a.isLive&&Ca({rows:N.rows,what:N.what,zones:N.zones});const te=N?{inks:N.paint,names:N.rows.map(x=>x.id??""),opac:[],srcPaper:F}:i?{inks:[],names:[],opac:[],srcPaper:F}:ha(a.shapes,a.hiddenLayers,n,F,A?M:null,!0);a.isLive&&(kt.inks=te);const oe=[e,o,+r,+u,t.res,+t.sim,t.preview,+t.lossless,t.pipe,+Y.mip,+Y.offscreenBack,+Y.preserveDrawingBuffer,+Y.darkPaperFromBase,n.technique,f,...N?[n.resolution,JSON.stringify(n.xerox),(N.keys??[]).join(",")]:i?[n.resolution,JSON.stringify(n.stencil)]:[n.paper,n.screen,n.screenSize,n.imperfection,n.resolution],te.inks.join(",")].join("|"),w=`${oe}|${N?tr():i?cr():0}`,z=N?{x:n.xerox,mk:N,isLive:a.isLive,motion:a.motion&&[...a.motion,...a.anim??[]],scene:a.scene}:void 0,W=i?{s:n.stencil,settings:n,shapes:a.shapes,hidden:a.hiddenLayers,srcPaper:F,darkBase:A?M:null,bg:ne(M),isLive:a.isLive,motion:a.motion,scene:a.scene}:void 0;return{style:s,fw:T,fh:E,base:M,srcPaper:F,inks:te,key:w,hk:oe,xerox:z,stencil:W}}function yt(e){const o=e.stencil;if(o){const n=ur(o,(o.isLive?We:mo).canvas,e.style,1);return o.isLive&&_a(n.layers.map(r=>({hex:r.hex,kind:r.kind}))),kt.params={...e.style,layers:n.layers,accKey:n.accKey,maps:n.maps,srcPaper:n.srcPaper}}const a=e.xerox;if(!a)return kt.params={...e.style,inks:e.inks.inks,names:e.inks.names,opac:e.inks.opac,srcPaper:e.srcPaper};const t=a.x.hand==="none"?null:or((a.isLive?We:mo).canvas,a.mk,a.x,e.srcPaper,a.isLive,a.motion,a.scene);return kt.params={...e.style,markers:a.mk.paint,keys:a.mk.keys,regionMap:t?.ids??null,orientMap:t?.ori??null,srcPaper:e.srcPaper}}const Ut=e=>e%9999+1,Mt=e=>Math.floor(performance.now()*e/1e3);function zt(e){const o=e.settings.reprintFps;if(!o)return 0;const a=e.exportFrame;return a?Math.floor(a.index*o/a.fps):Mt(o)}const st=(e,o=!1)=>({lossless:e.lossless,preview:e.preview,toTexture:o});let Ot=null;const ea=()=>{Ot?.destroy(),Ot=null};function kr(e,o,a,t,n){const r=performance.now(),u=t.exportFrame,c=!u||u.index===0,i=!u||u.index>=u.count-1;try{c&&ea();const f=Ot??(Ot=fa(document.createElement("canvas"),n,{preserveDrawingBuffer:!0})),s=Nt(),l=jt(o,a,t,s),g=bt(mo,e.canvas,l.fw,l.fh,l.base,t.isDarkMode);return f.setSource(g,!0),f.render({...yt(l),seed:Ut(zt(t))},st(s)),f.gl.isContextLost()?!1:(It(e,f.canvas,f.width,f.height,o,a,!!l.style.crisp),lt&&console.info(`[SuperRiso] export frame ${u?`${u.index+1}/${u.count}`:"single"} ${o}×${a} → sim ${f.width}×${f.height}: ${(performance.now()-r).toFixed(1)} ms · ${f.lastVariants}`),!0)}finally{i&&ea()}}const ho=2e3,Pa=8e3,vo=60,ta=8,mt={...pa,simUpload:!0,auto:!1,lossless:!1},Et=e=>new Promise(o=>setTimeout(o,e)),Qe=(e,o=1)=>e===null?"–":e.toFixed(o);let eo=!1;function Mr(){let o=ut.engineInfo()?.gl??null,a=null;if(o||(a=document.createElement("canvas"),o=a.getContext("webgl2")),!o)return{renderer:"sin WebGL2",maxTex:"–"};const t=o.getExtension("WEBGL_debug_renderer_info"),n=String(t?o.getParameter(t.UNMASKED_RENDERER_WEBGL):o.getParameter(o.RENDERER)),r=String(o.getParameter(o.MAX_TEXTURE_SIZE));return a&&o.getExtension("WEBGL_lose_context")?.loseContext(),{renderer:n,maxTex:r}}function wr(e,o){const a=e.s,t=a.frameP50!==null&&o!==null&&a.totalP50!==null?a.frameP50-o-a.totalP50:null,r=[[e.patch.pipe?"subida al inicio":"subida",a.uploadP50],["aplanado",a.flatP50],["mip",a.mipP50],["motor (CPU)",a.renderP50],[e.patch.pipe===2?"vuelta (al inicio, del frame anterior)":"vuelta",a.backP50]].filter(([,c])=>c!==null).sort((c,i)=>i[1]-c[1])[0],u=[];return r&&r[1]>=3&&u.push(`${r[0]} ${Qe(r[1])} ms`),t!==null&&t>=3&&u.push(`fuera de nuestras etapas ${Qe(t)} ms`),u.length?u.join(" + "):"sin espera apreciable"}async function oa(e){const o=ut.profiler();if(!o||e==="timer"&&!o.timerAvailable)return null;o.setMode(e);const a=performance.now();for(;performance.now()-a<8e3;){const r=o.report().find(u=>u.name==="SCAN");if(r&&r.n>=vo)break;await Et(100)}e==="timer"&&(await Et(300),o.poll());const t=o.report();o.setMode("off");const n=[...t].filter(r=>r.p50!==null).sort((r,u)=>u.p50-r.p50).map(r=>r.name);return{mode:e,lines:t.map(r=>`  ${r.name.padEnd(13)} ${`${r.info.w}×${r.info.h}`.padEnd(10)} att ${r.info.att}  p50 ${Qe(r.p50,3).padStart(7)} ms  #${n.indexOf(r.name)+1}  (n=${r.n})`)}}function Sr(e,o,a,t,n){const r=Mr(),u=e.find(f=>f.id==="A")?.s.frameP50??null,c=ut.engineInfo(),i=[];i.push(`SUPER RISO · medición automática C2a · Diorame ${Ia} · ${new Date().toISOString()}`),i.push(`UA: ${navigator.userAgent}`),i.push(`DPR ${window.devicePixelRatio} · canvas vivo ${J.canvasW}×${J.canvasH} · simulación (última) ${c?`${c.width}×${c.height}`:"–"}`),i.push(`GPU: ${r.renderer} · MAX_TEXTURE_SIZE ${r.maxTex} · temporizador GPU: ${o?"sí":"no"} · OffscreenCanvas+WebGL2: ${Rt?"sí":"no"}`),i.push(`Modo ${J.isDark?"oscuro":"claro"} · preset de cámara: ${J.preset||"–"} (velocidad ${J.speed||"–"})`),i.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${t}`);for(const f of a)i.push(`AVISO: ${f}`);i.push(`Cada fila: ${ho/1e3} s de calentamiento descartados + ${Pa/1e3} s medidos. Etapas = CPU p50 en ms por frame.`),i.push("pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde."),i.push("lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo."),i.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.'),i.push(""),i.push("cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held");for(const f of e){const s=f.s,l=T=>Qe(T,2).padStart(6),g=!f.patch.bypass&&s.frameP50!==null&&u!==null&&s.totalP50!==null?s.frameP50-u-s.totalP50:null;i.push(`${(f.id+" "+f.label).padEnd(20)}${Qe(s.fps).padStart(5)}  ${(Qe(s.frameP50)+"/"+Qe(s.frameP95)).padEnd(11)} |${l(s.totalP50)}${l(s.flatP50)} ${l(s.uploadP50)}${l(s.uploadP95)}${l(s.mipP50)}${l(s.renderP50)}${l(s.backP50)} |${l(g)}    |${l(s.gpuP50)}  ${f.res.padEnd(10)}  ${f.n.pipe}/${f.n.sync}/${f.n.held}  (n=${s.samples})`)}i.push(""),i.push("Dónde cae la espera:");for(const f of e)f.patch.bypass||i.push(`  ${f.id} ${f.label}: ${wr(f,u)}`);for(const f of n)f&&(i.push(""),i.push(f.mode==="sync"?`P · perfilado por pasada a .75, pipe1, nivel completo, ${vo} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`:`P · perfilado por pasada a .75, pipe1, nivel completo, ${vo} frames, temporizador de GPU por pasada:`),f.mode==="sync"&&i.push("  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas."),i.push(...f.lines),i.push("  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)"));return i.join(`
`)}async function Pr(){if(eo)return;const e=[],o=performance.now()-J.lastCallAt;if(J.lastCallAt===0||o>1e3?e.push("no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos"):J.speed>0||e.push("la cámara no se mueve (velocidad 0): el frame cambia poco"),e.length&&!window.confirm(`${e[0]}.

¿Medir igualmente?`))return;eo=!0,Zo(!0);const a={...Y},t=[],n=[];let r=!1,u="–",c=0;const i=async f=>{Zt(`Midiendo ${f.id} (${++c}/${ta})…`),Xt(f.patch),await Et(ho),ba();const s={pipe:J.pipeFrames,sync:J.pipeSyncFrames,held:J.heldFrames};await Et(Pa);const l=wo(1/0);l.gpuP50!==null&&(r=!0);const g={pipe:J.pipeFrames-s.pipe,sync:J.pipeSyncFrames-s.sync,held:J.heldFrames-s.held},T=ut.engineInfo(),E={id:f.id,label:f.label,res:f.patch.bypass||!T?"–":`${T.width}×${T.height}`,s:l,patch:f.patch,n:g};return t.push(E),E};try{await i({id:"A",label:"bypass",patch:{...pa,bypass:!0,auto:!1}});const f=await i({id:"B",label:".75 pipe1",patch:{...mt,resScale:.75,pipe:1}}),s=await i({id:"C",label:".75 pipe2",patch:{...mt,resScale:.75,pipe:2}}),l=(s.s.frameP50??1e9)<(f.s.frameP50??1e9)?2:1;u=`pipe${l} (${l===2?"C":"B"}: frame p50 ${Qe(l===2?s.s.frameP50:f.s.frameP50)} ms frente a ${Qe(l===2?f.s.frameP50:s.s.frameP50)})`,await i({id:"D",label:`.75 pipe${l} lossless`,patch:{...mt,resScale:.75,pipe:l,lossless:!0}}),await i({id:"E",label:`.75 pipe${l} preview`,patch:{...mt,resScale:.75,pipe:l,lossless:!0,preview:15}}),await i({id:"F",label:`1.0 pipe${l} preview`,patch:{...mt,resScale:1,pipe:l,lossless:!0,preview:15}}),await i({id:"G",label:`.75 pipe${l} hold`,patch:{...mt,resScale:.75,pipe:l,hold:!0}}),Zt(`Midiendo P (${++c}/${ta})… perfilado por pasada`),Xt({...mt,resScale:.75,pipe:1}),await Et(ho),n.push(await oa("sync")),n.push(await oa("timer"))}finally{Xt(a),Zt(""),Zo(!1),eo=!1}pr(Sr(t,r,e,u,n))}const Ar=["greennoise1024","ink_black","ink_red","ink_lut"],Er=e=>new Promise((o,a)=>{const t=new Image;t.onload=()=>o(t),t.onerror=()=>a(new Error(`texture ${e} failed to load`)),t.src=`/textures/superRiso/${e}.png`}),Tr=()=>Promise.all(Ar.map(Er)).then(([e,o,a,t])=>({green:e,exBlack:o,exRed:a,exLut:t}));let Wt=null,$t=!1,xo=!1,ye=null,Le=Ma(Y.offscreenBack),aa=Y.preserveDrawingBuffer,to=0;const To=(e,o)=>{$t||($t=!0,console.warn(`[SuperRiso] disabled for this session: ${e}`,o??""))};Tr().then(e=>{Wt=e}).catch(e=>To("textures",e));const Aa=e=>{e.addEventListener("webglcontextlost",o=>{o.preventDefault(),e===Le&&(xo=!0,ye=null,console.warn("[SuperRiso] WebGL context lost — frames go out without Super Riso"))}),e.addEventListener("webglcontextrestored",()=>{e===Le&&(xo=!1,console.warn("[SuperRiso] WebGL context restored — engine will be recreated"))})};Aa(Le);const Ea=()=>{const e=Le;ye=null,vr(),Ee=null,it=null,ge=null,ke=null,Ye=null,De=null,po(),Le=Ma(Y.offscreenBack),Aa(Le),e.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()};ut.recreateEngine=Ea;ut.engineInfo=()=>ye?{gl:ye.gl,width:ye.width,height:ye.height}:null;ut.profiler=()=>ye?ye.profiler:null;lt&&(dr(()=>{Pr()}),ka(`SUPER RISO · ${Sa()}`),window.__superRiso={KNOBS:Y,snapshot:wo,reset:ba,live:J,qualityReport:On,isSuperRisoPreviewDevice:Na,get lastChange(){return Mo},get inks(){return kt.inks},get params(){return kt.params},get engine(){return ye},get disabled(){return $t},get glCanvas(){return Le},get flat(){return We.canvas}});function Lo(){return ye&&(aa!==Y.preserveDrawingBuffer||So(Le)!==(Y.offscreenBack&&Rt))&&Ea(),ye||(ye=fa(Le,Wt,{preserveDrawingBuffer:Y.preserveDrawingBuffer}),aa=Y.preserveDrawingBuffer),ye}let qe=0,Ee=null,it=null,ge=null,ke=null;const be={begin:0,upload:0,mip:0,render:0,backBegin:0};let Ye=null,De=null;const Ta=()=>$t||xo||!Wt||Y.bypass;function Br(e,o,a){if(!a.isLive||(qe++,it=null,be.begin=0,be.upload=0,be.mip=0,be.render=0,be.backBegin=0,Ta()))return;const{m:t}=wa(e,o,a.settings);if(!t.pipe||ke)return;const n=performance.now();try{const r=jt(e,o,a,t);if(t.pipe===2){Lr(r,t,zt(a),n);return}if(!Ee||Ee.key!==r.key||Ee.frame!==qe-1){Ee=null;return}const u=Mt(t.holdFps);if(t.hold&&ge&&ge.key===r.hk&&ge.tick===u&&_t())return;const c=Lo();c.setSource(We.canvas,Y.mip);const i=performance.now(),f=zt(a),s=Ee.at;c.render({...Ee.params,seed:Ut(f)},st(t));const l=performance.now();if(Ee=null,c.gl.isContextLost())return;it={key:r.key,frame:qe,ew:c.width,eh:c.height,crisp:!!r.style.crisp,tick:u,at:s,seed:f},be.upload=c.lastUploadMs,be.mip=c.lastMipMs,be.render=l-i,be.begin=l-n}catch(r){ye=null,To("exception in beginSuperRisoFrame",r)}}function Lr(e,o,a,t){const n=Mt(o.holdFps);if(Ye&&Ye.frame===qe-1&&Ye.key===e.key&&ye){const i=performance.now();ye.present(),Eo(Le,Ye.ew,Ye.eh),be.backBegin=performance.now()-i,De={...Ye,frame:qe}}if(Ye=null,!Ee||Ee.key!==e.key||Ee.frame!==qe-1){Ee=null,be.begin=performance.now()-t;return}if(o.hold&&De&&De.key===e.key&&De.tick===n){be.begin=performance.now()-t;return}const r=Lo();r.setSource(We.canvas,Y.mip);const u=performance.now();r.render({...Ee.params,seed:Ut(a)},st(o,!0));const c=performance.now();Ee=null,!r.gl.isContextLost()&&(Ye={key:e.key,frame:qe,tick:n,ew:r.width,eh:r.height,crisp:!!e.style.crisp},be.upload=r.lastUploadMs,be.mip=r.lastMipMs,be.render=c-u,be.begin=c-t)}function oo(e,o,a,t,n,r){if(t.hold){const u=Eo(Le,n.ew,n.eh);ge={key:r,tick:n.tick,ew:n.ew,eh:n.eh,crisp:n.crisp,at:n.at,seed:n.seed},pt(e,u,n.ew,n.eh,o,a,n.crisp)}else It(e,Le,n.ew,n.eh,o,a,n.crisp)}function At(e,o,a,t,n,r=!1){const u=Lo(),c=performance.now(),i=Y.bitmapUpload?hr(o,e.fw,e.fh):null,f=performance.now()-c;i?(u.setSource(i.bmp,Y.mip),i.bmp.close(),J.bitmapLagFrames=i.lag):u.setSource(o,Y.mip);const s=performance.now();return u.render({...a,seed:Ut(t)},n),r&&u.profiler.timerAvailable?Go(J.canvasW,J.canvasH,u.gpuMs===null?null:u.gpuMs+performance.now()-c,"GPU"):r&&(u.finish(),Go(J.canvasW,J.canvasH,performance.now()-c,"readback")),be.upload+=u.lastUploadMs+f,be.mip+=u.lastMipMs,be.render+=performance.now()-s,u}function Fr(e,o,a,t){const n=performance.now(),{isDarkMode:r,isLive:u,info:c}=t;if(u&&(lt&&to>0&&Ve("interval",n-to),to=n,J.lastCallAt=n,J.isDark=r,J.canvasW=o,J.canvasH=a,J.preset=c.preset,J.speed=c.speed,J.offscreenFallback=Y.offscreenBack&&!Rt),Ta())return!1;try{if(!u)return kr(e,o,a,t,Wt);const{m:i,level:f}=wa(o,a,t.settings),s=zt(t),l=jt(o,a,t,i);J.level=f,ge&&(ge.key!==l.hk||!i.hold)&&(ge=null,ke||po());const g=$n(t.motion,t.playing?null:t.scene,n);let T=n,E=n;const M=(w,z=i)=>{if(J.lastPath=w,!lt)return!0;const W=performance.now();return Ve("flat",T-n),Ve("upload",be.upload),Ve("mip",be.mip),Ve("render",be.render),Ve("back",be.backBegin+(W-E)),Ve("total",be.begin+(W-n)),ye&&ye.gpuMs!==null&&Ve("gpu",ye.gpuMs),ka(`SUPER RISO · ${f} · ${o}×${a} → sim ${ye?`${ye.width}×${ye.height}`:"–"} · src ${l.fw}×${l.fh} · ${xr(z)} · ${Sa()} · ${w}`),!0};if(f==="detect"){const w=bt(We,e.canvas,l.fw,l.fh,l.base,r);T=performance.now();const z=At(l,w,yt(l),s,st(i),!0);return z.gl.isContextLost()?!1:(E=performance.now(),It(e,Le,z.width,z.height,o,a,!!l.style.crisp),M("detect"))}if(f==="preview"&&g>=Nn){const w=Nt(),z=jt(o,a,t,w);Ee=null,it=null,ge=null;const W=_t(),x=Un(t.anim,t.scene,!!t.playing);if(ke&&ke.key===z.key&&ke.tick===s&&W&&(ke.anim===x||n-ke.at<jn))return E=performance.now(),pt(e,W,ke.ew,ke.eh,o,a,ke.crisp),J.heldFrames++,M("refined",w);const B=bt(We,e.canvas,z.fw,z.fh,z.base,r);T=performance.now();const U=At(z,B,yt(z),s,st(w));if(U.gl.isContextLost())return!1;E=performance.now();const ee=!!ke&&ke.key===z.key&&ke.tick===s&&ke.anim!==x;lt&&ee?J.animRefines++:lt&&console.info(`[SuperRiso] refine (last change: ${Mo})`);const ie=Eo(Le,U.width,U.height);return ke={key:z.key,tick:s,ew:U.width,eh:U.height,crisp:!!z.style.crisp,anim:x,at:n},pt(e,ie,U.width,U.height,o,a,ke.crisp),M("refine",w)}ke&&(ke=null,po());const A=()=>i.hold&&ge&&ge.key===l.hk?_t():null;if(i.pipe===2){const w=bt(We,e.canvas,l.fw,l.fh,l.base,r);T=performance.now();const z=yt(l);Ee={key:l.key,frame:qe,params:z,at:T},E=performance.now();const W=_t();if(De&&De.key===l.key&&W&&(De.frame===qe||i.hold))return pt(e,W,De.ew,De.eh,o,a,De.crisp),De.frame===qe?J.pipeFrames++:J.heldFrames++,M(De.frame===qe?"pipe2":"held");De=null;const x=At(l,w,z,s,st(i));return x.gl.isContextLost()?!1:(E=performance.now(),It(e,Le,x.width,x.height,o,a,!!l.style.crisp),J.pipeSyncFrames++,M("sync"))}if(i.pipe){const w=!!it&&it.key===l.key&&it.frame===qe,z=A(),W=i.hold&&(w||!!z&&!!ge&&(ge.tick===Mt(i.holdFps)||ge.at>=n-g&&ge.seed===s)),x=W?null:bt(We,e.canvas,l.fw,l.fh,l.base,r);T=performance.now();const B=W?null:yt(l);if(Ee=B?{key:l.key,frame:qe,params:B,at:T}:null,E=performance.now(),w)return oo(e,o,a,i,it,l.hk),J.pipeFrames++,M("pipe");if(z&&ge)return pt(e,z,ge.ew,ge.eh,o,a,ge.crisp),J.heldFrames++,M("held");const U=At(l,x,B,s,st(i));return U.gl.isContextLost()?!1:(E=performance.now(),oo(e,o,a,i,{key:l.key,tick:Mt(i.holdFps),ew:U.width,eh:U.height,crisp:!!l.style.crisp,at:T,seed:s},l.hk),J.pipeSyncFrames++,M("sync"))}const F=Mt(i.holdFps),N=A();if(N&&ge&&ge.tick===F)return pt(e,N,ge.ew,ge.eh,o,a,ge.crisp),J.heldFrames++,M("held");const te=bt(We,e.canvas,l.fw,l.fh,l.base,r);T=performance.now();const oe=At(l,te,yt(l),s,st(i));return oe.gl.isContextLost()?!1:(E=performance.now(),oo(e,o,a,i,{key:l.key,tick:F,ew:oe.width,eh:oe.height,crisp:!!l.style.crisp,at:T,seed:s},l.hk),M("sync"))}catch(i){return ye=null,To("exception in applySuperRiso",i),!1}}export{Fr as applySuperRiso,Br as beginSuperRisoFrame};
