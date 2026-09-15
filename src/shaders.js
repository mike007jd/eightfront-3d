/* Forward HDR shader library. Linear working space, explicit MRT emission,
 * depth-aware effects, fixed exposure, then ONE output conversion and display-space AA. */
const Shaders={
vertex:`#version 300 es
 precision highp float;
 layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNorm; layout(location=2) in vec2 aUV;
 layout(location=3) in mat4 iMat; layout(location=7) in vec4 iColor; layout(location=8) in vec4 iParams;
 uniform mat4 uVP,uLight;uniform float uTime;
 out vec3 vPos,vNormal;flat out vec4 vColor,vParams;out vec4 vShadow;out vec2 vUV;
 void main(){
 vec3 pos=aPos;
 vec3 scale=max(vec3(length(iMat[0].xyz),length(iMat[1].xyz),length(iMat[2].xyz)),vec3(.00001));
 vec3 bevelRadius=min(vec3(.040),scale*.10);
 if(iParams.w==2.){
  // World-unit bevel: a long beam keeps the same 4 cm edge as a small plate.
  // Only inner (.4) bevel vertices move; outer (.5) bounds and collision planes are unchanged.
  vec3 inset=.5-bevelRadius/scale;
  pos=mix(pos,sign(pos)*inset,vec3(1.)-step(vec3(.45),abs(pos)));
 }
 vec4 w=iMat*vec4(pos,1.);if(iParams.x==1.){w.x+=sin(uTime*.62+w.x*.031+w.z*.05)*iParams.y*pow(clamp(aUV.x,0.,1.),1.5);w.z+=cos(uTime*.86+w.x*.026)*iParams.y*.4*pow(clamp(aUV.x,0.,1.),1.5);}
 if(iParams.x==7.){
  float pinned=pow(sin(clamp(aUV.y,0.,1.)*3.14159265),2.);
  w.z+=sin(w.y*.52+uTime*3.6+w.x*1.8)*.024*pinned;
  // No sideways centre-line travel: spray carries the turbulence, gravity stays Y.
 }
 if(iParams.x==24.||iParams.x==44.){float bend=pow(clamp(w.y/12.,0.,1.),1.6);w.x+=sin(uTime*.62+w.x*.031+w.z*.05)*.10*bend;w.z+=sin(uTime*.86+w.x*.026)*.04*bend;}
 if(iParams.x==40.||iParams.x==43.){
  float tree=pow(clamp(w.y/12.,0.,1.),1.6),tip=pow(clamp(aUV.x,0.,1.),2.);
  float phase=uTime*.62+iMat[3].x*.031+iMat[3].z*.05;
  w.x+=sin(uTime*.62+w.x*.031+w.z*.05)*.10*tree+sin(phase)*iParams.y*tip;
  w.z+=sin(uTime*.86+w.x*.026)*.04*tree+cos(phase*.83)*iParams.y*.30*tip;
 }
 if(iParams.x==33.){float anchor=pow(sin(aUV.x*3.14159265)*sin(aUV.y*3.14159265),2.);w.z+=.045*sin(uTime*1.28+iMat[3].x*.23+iMat[3].y*.13)*anchor;}
 if(iParams.x==4.||iParams.x==49.)w.y+=sin(w.x*.21+w.z*.12-uTime*1.1)*.025+sin(w.x*.10-w.z*.32-uTime*.7)*.016;
 vec3 sc=vec3(dot(iMat[0].xyz,iMat[0].xyz),dot(iMat[1].xyz,iMat[1].xyz),dot(iMat[2].xyz,iMat[2].xyz));
 vNormal=normalize(mat3(iMat)*(aNorm/max(sc,vec3(.00001))));
 if(iParams.w==2.)vNormal=normalize(mat3(iMat)*(aNorm/(scale*bevelRadius)));vPos=w.xyz;vColor=iColor;vParams=iParams;vUV=aUV;vShadow=uLight*w;gl_Position=uVP*w;}`,
fragment:`#version 300 es
precision highp float;
in vec3 vPos,vNormal;flat in vec4 vColor,vParams;in vec4 vShadow;in vec2 vUV;
uniform vec3 uEye,uFog,uLightDir,uKey,uHemiLow,uHemiHigh,uRim;
uniform float uIndoor,uFogDensity,uTime,uShadows,uWetness,uSoft,uVolume,uClay;
uniform sampler2D uDepth,uSceneDepth,uSceneColor,uWaterDepth;
uniform vec2 uResolution;uniform mat4 uInvVP,uLight;
uniform float uRefraction,uShadowWorldTexel;
uniform int uWaterCount;uniform vec4 uWaterImpact[8];
uniform int uLocalCount;uniform vec4 uLocalPos[8],uLocalColor[8];
layout(location=0) out vec4 frag;layout(location=1) out vec4 glowOut;
const float PI=3.14159265359;
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03+1.7)*.28+noise(p*4.07+4.1)*.15;}
float linearDepth(float d){return 22./(220.-d*219.9);}
float unpackDepth(vec4 c){return dot(c,vec4(1./16777216.,1./65536.,1./256.,1.));}
float softIntersection(float distanceScale){if(uSoft<.5)return 1.;float d=unpackDepth(texture(uSceneDepth,gl_FragCoord.xy/uResolution));return clamp((linearDepth(d)-linearDepth(gl_FragCoord.z))/distanceScale,0.,1.);}
void sprite(vec3 radiance,float a,float emission){a=clamp(a,0.,.98);if(a<.002)discard;frag=vec4(radiance*a,a);glowOut=vec4(radiance*emission*a,a);}
// Hardware-independent bilinear comparison, not linear interpolation of depth.
float pcfBilinear(vec2 uv,float reference){
 vec2 size=vec2(textureSize(uDepth,0)),p=uv*size-.5,i=floor(p),f=fract(p);
 float a=step(reference,texture(uDepth,(i+vec2(.5,.5))/size).r);
 float b=step(reference,texture(uDepth,(i+vec2(1.5,.5))/size).r);
 float c=step(reference,texture(uDepth,(i+vec2(.5,1.5))/size).r);
 float d=step(reference,texture(uDepth,(i+vec2(1.5,1.5))/size).r);
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float shadow(vec3 unusedShadingNormal){
 if(uShadows<.5)return 1.;
 // Geometric normal, never the material's perturbed bump normal. Noise in a
 // shading normal must not change receiver offsets and create self-shadow stripes.
 vec3 gn=normalize(cross(dFdx(vPos),dFdy(vPos)));
 if(dot(gn,vNormal)<0.)gn=-gn;
 float nl=max(dot(gn,normalize(uLightDir)),0.);
 float worldOffset=uShadowWorldTexel*(.55+1.25*(1.-nl));
 vec4 receiver=uLight*vec4(vPos+gn*worldOffset,1.);
 vec3 p=receiver.xyz/receiver.w*.5+.5;
 if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.))))return 1.;
 vec3 dx=dFdx(p),dy=dFdy(p);float det=dx.x*dy.y-dx.y*dy.x;
 vec2 slope=abs(det)>1e-9?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det:vec2(0.);
 slope=clamp(slope,vec2(-4.),vec2(4.));
 vec2 texel=1./vec2(textureSize(uDepth,0));
 float bias=.00012+min(.0018,dot(abs(slope),texel)*.60);
 const vec2 taps[8]=vec2[8](vec2(-.326,-.406),vec2(-.840,-.074),vec2(-.696,.457),vec2(-.203,.621),vec2(.962,-.195),vec2(.473,-.480),vec2(.519,.767),vec2(.185,-.893));
 float result=0.;
 for(int i=0;i<8;i++){
  vec2 offset=taps[i]*texel*1.25;
  float correction=clamp(dot(slope,offset),-.0018,.0018);
  result+=pcfBilinear(p.xy+offset,p.z+correction-bias);
 }
 return result*.125;
}
vec3 fresnel(float c,vec3 f0){return f0+(1.-f0)*pow(1.-c,5.);}
vec3 brdf(vec3 base,vec3 n,vec3 v,vec3 l,vec3 radiance,float rough,float metal){
 vec3 h=normalize(v+l);float nv=max(dot(n,v),.025),nl=max(dot(n,l),0.),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,d=nh*nh*(a2-1.)+1.;float D=a2/max(PI*d*d,.0001);
 float k=(rough+1.)*(rough+1.)*.125;float G=nv/(nv*(1.-k)+k)*nl/max(nl*(1.-k)+k,.001);
 vec3 F=fresnel(vh,mix(vec3(.04),base,metal));
 return ((1.-F)*(1.-metal)*base/PI+F*(D*G/max(4.*nv*max(nl,.001),.001)))*radiance*nl;
}
vec3 bump(vec3 n,float height,float strength){vec3 qx=dFdx(vPos),qy=dFdy(vPos),s1=cross(qy,n),s2=cross(n,qx);float det=dot(qx,s1);vec3 grad=(dFdx(height)*s1+dFdy(height)*s2)/max(abs(det),.00001);return normalize(n-sign(det)*grad*strength);}

vec2 riverFlow(vec2 p){
 vec2 f=vec2(.50+.12*sin(p.y*.18),.16+.10*sin(p.x*.09));
 for(int i=0;i<8;i++){if(i>=uWaterCount)break;vec2 delta=p-uWaterImpact[i].xz;
  float r=max(.5,uWaterImpact[i].w),w=exp(-dot(delta,delta)/(r*r*5.));
  f=mix(f,normalize(delta+vec2(.001,.3))*.65+vec2(.10,.18),w*.65);
 }
 return f;
}
float advectedWater(vec2 p){
 vec2 flow=riverFlow(p);float t=uTime*.24,a=fract(t),b=fract(t+.5);
 float blend=abs(a*2.-1.);
 float n0=fbm(vec3((p-flow*a*5.)*vec2(1.7,2.2),.71));
 float n1=fbm(vec3((p-flow*b*5.)*vec2(1.7,2.2),.71));
 return mix(n0,n1,blend);
}
vec3 worldAt(vec2 uv,float depth){vec4 p=uInvVP*vec4(uv*2.-1.,depth*2.-1.,1.);return p.xyz/max(p.w,.000001);}
vec3 waterBackground(vec2 delta,out float distanceInWater){
 vec2 uv=gl_FragCoord.xy/uResolution;
 float here=unpackDepth(texture(uWaterDepth,uv));
 distanceInWater=here>.99998?14.:clamp(distance(worldAt(uv,here),vPos),0.,18.);
 if(uRefraction<.5)return mix(uHemiLow,uHemiHigh,.3)*.35;
 vec2 candidate=uv+delta/uResolution;
 float d=unpackDepth(texture(uWaterDepth,clamp(candidate,vec2(0.),vec2(1.))));
 // Reject foreground/depth crossings and screen-edge samples. No refracted gun or
 // floating shoreline. Always sample a separate opaque-scene copy, never the MRT.
 if(any(lessThan(candidate,vec2(.002)))||any(greaterThan(candidate,vec2(.998)))||d<gl_FragCoord.z-.00001)candidate=uv;
 return texture(uSceneColor,candidate).rgb;
}
vec3 litFoam(){return vec3(.67,.78,.72)*(mix(uHemiLow,uHemiHigh,.78)+uKey*.28);}
void outputWater(vec3 col,vec3 emissive){
 float fog=(1.-exp(-max(0.,-vPos.z-6.)*uFogDensity))*(1.-uVolume*.8);
 fog=max(fog,clamp((distance(vPos,uEye)-70.)/130.,0.,.6));
 frag=vec4(mix(col,uFog,clamp(fog,0.,.72)),1.);glowOut=vec4(emissive,1.);
}
void main(){
 glowOut=vec4(0.);float kind=vParams.x;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 base=vColor.rgb,v=normalize(uEye-vPos);float emit=vColor.a;

 if(kind==45.){
  // One boot impression: rounded toe, narrower heel, compressed snow and a raised
  // powder rim. Alpha is a local decal; no black oval and no changed collision.
  vec2 q=(vUV-.5)*2.;float toe=length((q-vec2(.23,0.))*vec2(1.65,1.14));
  float heel=length((q+vec2(.51,0.))*vec2(2.75,1.47));
  float d=min(toe,heel);float aa=max(fwidth(d),.025);
  float inside=1.-smoothstep(.78-aa,.84+aa,d);
  float rim=exp(-pow((d-.90)/.075,2.));
  if(d>1.08)discard;
  vec3 gn=normalize(vec3(q.x*.12,1.,q.y*.19));
  float tread=(1.-smoothstep(.04,.10,abs(sin(q.x*22.))))*inside*.045;
  vec3 light=mix(uHemiLow,uHemiHigh,.97)*.86+uKey*.22*max(dot(gn,normalize(uLightDir)),0.);
  vec3 col=base*light*(.53+rim*.44-tread);
  sprite(col,(inside*.82+rim*.43)*vParams.z,0.);return;
 }
 if(kind==46.){
  vec2 q=(vUV-.5)*2.;float rr=length(q),edge=1.-smoothstep(.25,1.,rr);if(rr>1.)discard;
  float a=edge*edge*vParams.z*softIntersection(.13);
  vec3 light=mix(uHemiLow,uHemiHigh,.76)+uKey*.10;
  for(int i=0;i<8;i++){if(i>=uLocalCount)break;float d=distance(vPos,uLocalPos[i].xyz),r=uLocalPos[i].w;
   light+=uLocalColor[i].rgb*pow(max(0.,1.-d/r),2.)/(1.+d*d)*.14;}
  sprite(base*light,a,0.);return;
 }
 if(kind==47.){
  vec2 q=(vUV-.5)*2.;float rr=dot(q,q);if(rr>1.)discard;
  float density=noise(vec3(vUV*4.,vParams.y*2.+vPos.x*.17));
  float a=pow(1.-rr,1.4)*(.42+.58*density)*vParams.z*softIntersection(.18);
  sprite(base*(mix(uHemiLow,uHemiHigh,.80)+uKey*.18),a,0.);return;
 }
 if(kind==48.){
  vec2 q=(vUV-.5)*2.;float rr=length(q);float breakup=.67+.20*noise(vec3(q*9.,uTime*.5));
  float ring=1.-smoothstep(.045,.19,abs(rr-breakup));
  sprite(litFoam(),ring*vParams.z*softIntersection(.14),0.);return;
 }
 if(kind==6.){vec2 q=(vUV-.5)*2.;float rr=dot(q,q);if(rr>1.)discard;float a=pow(max(0.,1.-rr),1.55)*vParams.z*softIntersection(.15);sprite(base*(1.2+emit),a,emit>.3?.8:0.);return;}
 if(kind==18.){
  // Advected, tapered turbulent flame: no overlapping soft fire balls.
  vec2 q=vUV;float turbulence=fbm(vec3(q.x*7.-uTime*10.,q.y*5.,vPos.z*.2+vParams.y*3.+vPos.x*.19));
  float taper=mix(.25,.45,q.x),edge=abs(q.y-.5+(turbulence-.5)*.26*q.x);
  float body=1.-smoothstep(taper*.2,taper,edge);float a=body*smoothstep(0.,.08,q.x)*(1.-smoothstep(.63,1.,q.x))*vParams.z*softIntersection(.24);
  float hot=pow(max(0.,body*(.95-q.x*.38)),2.);vec3 c=mix(vec3(.75,.028,.001),vec3(3.6,.66,.045),hot);c=mix(c,vec3(5.2,2.5,.45),pow(hot,7.)*(1.-smoothstep(.12,.45,q.x)));sprite(c*(.7+emit*.28),a,1.);return;
 }
 if(kind==19.){float y=abs(vUV.y-.5),core=1.-smoothstep(.008,.10,y);float a=(1.-smoothstep(.015,.47,y))*smoothstep(0.,.07,vUV.x)*(1.-smoothstep(.70,1.,vUV.x))*vParams.z;vec3 c=mix(base*(.45+emit*.38),mix(base,vec3(1.),.45)*(2.+emit),core);sprite(c,a,1.);return;}
 if(kind==20.||kind==27.){
  vec2 q=(vUV-.5)*2.;float rr=dot(q,q);if(rr>1.)discard;
  float density=fbm(vec3(vUV*4.+vec2(uTime*.15,-uTime*.32),vPos.x*.09+vParams.y*2.));
  float a=smoothstep(.18,.64,density)*pow(max(0.,1.-rr),1.15)*vParams.z*softIntersection(.75);
  vec3 light=mix(uHemiLow,uHemiHigh,.7)*1.05+uKey*.09;
  for(int i=0;i<8;i++){if(i>=uLocalCount)break;float d=distance(vPos,uLocalPos[i].xyz),r=uLocalPos[i].w;float att=pow(max(0.,1.-pow(d/max(r,.1),4.)),2.)/(1.+d*d);light+=uLocalColor[i].rgb*att*.18;}
  sprite(base*light*(.75+density*.5),a,0.);return;
 }
 if(kind==30.){float rr=dot((vUV-.5)*2.,(vUV-.5)*2.);sprite(base,pow(max(0.,1.-rr),1.8)*vParams.z,0.);return;}
 if(kind==21.){float rr=length((vUV-.5)*2.);float ring=1.-smoothstep(.015,.10,abs(rr-.72));sprite(base*(1.+emit),ring*vParams.z*softIntersection(.3),emit>.3?.75:0.);return;}
 if(kind==26.){
  vec2 q=(vUV-.5)*2.;float age=vParams.y,rr=length(q);float turb=fbm(vec3(q*3.1+vec2(0.,-age*2.7),age*3.+vPos.x*.13));
  float a=(1.-smoothstep(.44,.99,rr+(turb-.5)*.27))*vParams.z*softIntersection(.65);
  // Temperature stays structured after tone mapping: only small turbulent pockets are white-hot.
  float hot=clamp((1.-rr)*.76+(turb-.30)*1.25-age*.43,0.,1.);
  vec3 c=mix(vec3(.075,.012,.006),vec3(3.5,.38,.014),smoothstep(.12,.70,hot));c=mix(c,vec3(5.5,2.6,.55),smoothstep(.79,1.,hot));sprite(c,a,1.);return;
 }
 if(kind==7.&&uClay<.5){
  float down=1.-vUV.y,worldFlow=vPos.y+uTime*7.4;
  float broad=noise(vec3(vPos.x*2.4,worldFlow*.21,vPos.z*.11));
  float fine=noise(vec3(vPos.x*12.2,worldFlow*1.25,3.1));
  float strands=smoothstep(.36,.74,broad)*(.58+.42*fine);
  float edgeWidth=.019+.022*down;
  float edge=smoothstep(0.,edgeWidth,vUV.x)*(1.-smoothstep(1.-edgeWidth,1.,vUV.x));
  if(edge<.09)discard;
  float broken=smoothstep(.12,.76,down)*smoothstep(.54,.78,fine)*.32;
  float foam=clamp(strands*.66+broken+pow(down,8.)*.40,0.,.92);
  vec3 wn=normalize(n+vec3((fine-.5)*.20,(broad-.5)*.035,0.));
  float dist;vec3 behind=waterBackground(vec2((fine-.5)*2.5,(broad-.5)*1.0),dist);
  vec3 film=mix(behind,vec3(.07,.19,.19),.25);
  vec3 col=mix(film,litFoam(),foam*.81+.12);
  col+=brdf(vec3(.14),wn,v,normalize(uLightDir),uKey,.30,0.)*.12;
  outputWater(col,vec3(0.));return;
 }
 if(kind==4.&&uClay<.5){
  float height=advectedWater(vPos.xz);
  vec3 wn=bump(vec3(0.,1.,0.),height*.048,.65);
  float dist;vec3 behind=waterBackground(wn.xz*11.,dist);
  // Beer-Lambert approximation using reconstructed scene distance, not raw Z-buffer.
  vec3 extinction=exp(-vec3(.46,.155,.105)*dist);
  vec3 deep=mix(vec3(.022,.085,.082),base*.34,.28);
  vec3 transmitted=behind*extinction+deep*(1.-extinction);
  float f=.02+.98*pow(1.-max(dot(wn,v),0.),5.);
  vec3 env=mix(uHemiLow,uHemiHigh,clamp(reflect(-v,wn).y*.5+.5,0.,1.));
  vec3 col=mix(transmitted,env*.67,clamp(f,.08,.74));
  col+=brdf(vec3(.06),wn,v,normalize(uLightDir),uKey*1.8,.24,0.);
  // Localised physical sources generate foam which moves out from their impact.
  float impactFoam=0.;
  for(int i=0;i<8;i++){if(i>=uWaterCount)break;vec4 e=uWaterImpact[i];
   float r=distance(vPos.xz,e.xz)/max(e.w,.3),same=1.-smoothstep(.10,.28,abs(vPos.y-e.y));
   float plume=exp(-r*r*2.1)*(.32+.68*smoothstep(.32,.72,height));
   float crest=pow(max(0.,sin(r*11.-uTime*3.4)),12.)*exp(-r*1.3)*.24;
   impactFoam=max(impactFoam,(plume+crest)*same);
  }
  float shore=(1.-smoothstep(.08,.60,dist))*smoothstep(.43,.68,height)*.28;
  col=mix(col,litFoam(),clamp(impactFoam*.70+shore,0.,.78));
  outputWater(col,base*emit*.15);return;
 }
 float rough=.76,metal=0.;
 if(kind==2.||kind==9.){
  // Painted metal is dielectric. Exposed worn patches are metallic; not everything is chrome.
  float macro=noise(vPos*.93);rough=kind==9.?.29:.43+macro*.10;metal=kind==9.?.85:.05;
  base*=.975+.035*macro;
 }
 if(kind==1.){float vein=smoothstep(.87,.97,sin(vUV.x*70.+abs(vUV.y-.5)*30.));base*=.88+vein*.08+(1.-smoothstep(.015,.04,abs(vUV.y-.5)))*.15;rough=.69;}
 if(kind==10.){float path=1.-smoothstep(.72,.98+sin(vPos.x*1.3)*.10,abs(vPos.z+.1));path*=smoothstep(.70,.95,n.y);base=mix(base,vec3(.25,.23,.12),path*(.38+.24*noise(vPos*.9)));rough=.88;}
 if(kind==3.||kind==11.){
  float pat=noise(vPos*1.12),grain=noise(vPos*8.4);base*=.78+.33*smoothstep(.22,.79,pat)+grain*.07;
  if(kind==3.){float cap=smoothstep(.42,.82,n.y)*smoothstep(.30,.57,noise(vPos*.8+2.));base=mix(base,base*vec3(.63,.82,.47),cap*.42);}
  float wet=uWetness*(.4+.6*smoothstep(.25,.66,pat));rough=mix(.88,.27,wet);base*=1.-wet*.19;n=bump(n,pat*.12+grain*.012,.32);
 }

 if(kind==14.)rough=.57;
 if(kind==15.){rough=.88;base*=.95+.05*noise(vPos*42.);}
 if(kind==17.){rough=.50;base*=.91+.10*noise(vPos*9.);}
 if(kind==12.){float vein=sin(vPos.x*6.+sin(vPos.y*3.))*sin(vPos.z*4.+vPos.y*5.);base*=.82+.14*smoothstep(.5,.9,vein);rough=.23+.12*noise(vPos*3.);n=bump(n,noise(vPos*4.)*.038,.45);}
 // RC7 model-specific surfaces. Macro shapes are geometry; these are subtle finish layers.
 if(kind==31.){
  float macro=fbm(vPos*vec3(.67,1.04,.83)),fibres=sin(vPos.y*15.+noise(vPos*1.5)*4.+vPos.x*1.7);
  float valleys=smoothstep(.34,.72,macro);base*=.81+.21*macro;
  float vascular=abs(sin(vPos.x*2.6+fbm(vPos*1.2)*4.1)*sin(vPos.z*2.+vPos.y*1.4+macro*3.));
  float vein=1.-smoothstep(.018,.018+max(fwidth(vascular)*1.4,.024),vascular);base*=1.-vein*.09;
  base=mix(base,base*vec3(.71,.66,.80),valleys*.22);rough=.52+.13*(1.-macro);
  n=bump(n,macro*.035+fibres*.0015,.32);
 }
 if(kind==32.){
  float striation=sin(vPos.y*8.+fbm(vPos*2.)*4.),pores=noise(vPos*17.);
  base*=.89+.09*fbm(vPos*2.4)+.015*striation;rough=.60+pores*.10;
  n=bump(n,pores*.0025+striation*.0018,.28);
 }
 if(kind==33.){
  float folds=fbm(vec3(vUV.x*9.,vUV.y*3.,vPos.z*.08));
  float fibre=sin(vUV.x*65.+sin(vUV.y*11.)*2.+folds*5.);
  base*=.75+folds*.27;rough=mix(.34,.63,smoothstep(.28,.68,folds));
  n=bump(n,folds*.060+fibre*.0018,.30);
 }
 if(kind==34.){
  float mottled=fbm(vPos*3.1);base*=.76+.27*mottled;rough=.31+.14*mottled;
  n=bump(n,mottled*.012,.25);
 }
 if(kind==35.){
  float brushing=noise(vPos*vec3(19.,.75,9.)),patina=fbm(vPos*.65);
  base*=.92+.06*patina;metal=.76;rough=.36+patina*.11;
  n=bump(n,brushing*.0013,.22);
 }
 if(kind==36.){
  float broad=noise(vPos*.71),grain=noise(vPos*13.);base*=.95+.04*broad;
  rough=.57+grain*.045;metal=.035;n=bump(n,grain*.0008,.20);
 }
 // RC8 natural surfaces: geological layering and fitted snow, not wet metal.
 if(kind==37.||kind==38.){
  float strata=sin(vPos.y*5.3+sin(vPos.x*.28)*1.1+noise(vPos*.44)*.7);
  float seam=smoothstep(.72,.96,strata),grain=fbm(vPos*3.4);
  base*=.88+.15*grain-seam*.050;rough=kind==38.?mix(.42,.79,smoothstep(2.5,7.0,abs(vPos.x))):.84;
  n=bump(n,seam*.010+grain*.018,.25);
  if(kind==38.){float moss=smoothstep(.58,.90,n.y)*smoothstep(.3,.72,noise(vPos*.7));base=mix(base,base*vec3(.78,1.04,.72),moss*.22);}
 }
 if(kind==39.||kind==43.){
  float snow=fbm(vPos*2.3);float windRidge=sin(vPos.x*.48+fbm(vPos*vec3(.5,.2,1.8))*2.6);base*=.92+.055*snow+windRidge*.014;rough=.84;
  n=bump(n,noise(vPos*24.)*.0009,.12);
 }
 if(kind==40.||kind==44.){base*=.88+.11*noise(vPos*9.);rough=.83;if(kind==44.){float dust=smoothstep(.63,.9,n.y)*smoothstep(.56,.8,noise(vPos*2.6));base=mix(base,vec3(.42,.57,.58),dust*.78);n=bump(n,fbm(vPos*9.)*.017,.25);}}
 if(kind==41.){float crown=fbm(vPos*3.1);base*=.82+.20*crown;rough=.88;n=bump(n,crown*.035,.3);}
 if(kind==42.){
  float cover=smoothstep(.38,.76,n.y)*smoothstep(.42,.77,vUV.y+noise(vPos*.35)*.11);
  base=mix(base,vec3(.58,.72,.77),cover*.93);rough=.88;
  n=bump(n,fbm(vPos*1.7)*.014,.16);
 }

 if(kind==3.||kind==11.||kind==37.||kind==38.){
  float wet=0.;for(int i=0;i<8;i++){if(i>=uWaterCount)break;vec4 e=uWaterImpact[i];
   float near=1.-smoothstep(e.w*.8,e.w*2.2,distance(vPos.xz,e.xz));
   wet=max(wet,near*(1.-smoothstep(.15,2.2,abs(vPos.y-e.y))));}
  rough=mix(rough,.35,wet*.65);base*=1.-wet*.17;
 }
 if(kind==49.){float a=vPos.x*.8+vPos.z*1.6+uTime*1.15,b=vPos.x*1.9-vPos.z*.75-uTime*1.7;n=normalize(vec3(cos(a)*.10+cos(b)*.045,1.,sin(a)*.14+sin(b)*.055));rough=.24;base*=.55+.16*noise(vPos*2.3);}
 if(kind==7.)rough=.25;
 float pulse=1.;if(kind==22.)pulse=.83+.17*sin(uTime*1.7+vPos.x*.13+vPos.y*.21);
 if(kind==23.)pulse=.64+.36*smoothstep(.64,.98,sin(vPos.y*3.2-uTime*1.8)*.5+.5);
 vec3 emissive=base*emit*pulse;
 if(kind==13.){float cell=fbm(vec3(vPos.x*1.4-uTime*.22,vPos.z*1.6,uTime*.13));float hot=smoothstep(.39,.69,cell);base=vec3(.025,.012,.008);rough=.64;emissive=mix(vec3(.07,.008,.001),vec3(4.6,.61,.025),hot);}
 if(uClay>.5){base=vec3(.30);rough=.84;metal=0.;emissive=vec3(0.);n=normalize(vNormal);}
 vec3 l=normalize(uLightDir);float sh=shadow(n);
 vec3 hemi=mix(uHemiLow,uHemiHigh,n.y*.5+.5);
 vec3 f0=mix(vec3(.04),base,metal),F=fresnel(max(dot(n,v),0.),f0);
 vec3 reflection=reflect(-v,n);vec3 env=mix(uHemiLow,uHemiHigh,reflection.y*.5+.5);
 vec3 col=base*(1.-metal)*hemi*.66+env*F*(.35+.40*(1.-rough));
 col+=brdf(base,n,v,l,uKey*3.25,rough,metal)*sh;
 for(int i=0;i<8;i++){if(i>=uLocalCount)break;vec3 toLight=uLocalPos[i].xyz-vPos;float d=length(toLight),r=uLocalPos[i].w;float att=pow(max(0.,1.-pow(d/max(r,.1),4.)),2.)/(1.+d*d);if(att>.0003)col+=brdf(base,n,v,toLight/max(d,.001),uLocalColor[i].rgb*att,rough,metal);}
 if(kind==1.)col+=base*uKey*.15*smoothstep(.1,.8,dot(-n,l));
 if(kind==33.||kind==34.)col+=base*uKey*.11*smoothstep(-.3,.8,dot(-n,l));
 if(kind==14.)col+=base*vec3(.13,.047,.021)*smoothstep(-.4,.6,dot(-n,l));
 float rim=pow(1.-max(dot(n,v),0.),3.4)*smoothstep(-.28,.8,dot(n,l));col+=base*uRim*rim*.17;
 if(vParams.w==1.){col+=base*.14+vec3(.09,.18,.22)*pow(1.-max(dot(n,v),0.),3.);col+=vec3(.35,.52,.60)*vParams.y*.12;}
 col+=emissive;
 // Full quality performs depth/shadow-aware aerial scattering in the post pass.
 float fog=(1.-exp(-max(0.,-vPos.z-6.)*uFogDensity))*(1.-uVolume*.80);
 fog=max(fog,clamp((distance(vPos,uEye)-70.)/130.,0.,.6));fog=clamp(fog*(1.-uIndoor*.35),0.,.72);
 col=mix(col,uFog,fog);emissive*=1.-fog;
 frag=vec4(max(col,vec3(0.)),vParams.z);glowOut=vec4(emissive,vParams.z);
}`,
screenVS:`#version 300 es
 precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`,
sky:`#version 300 es
 precision highp float;in vec2 uv;uniform float uTime;uniform vec3 uSkyLow,uSkyHigh;uniform float uIndoor;layout(location=0) out vec4 frag;layout(location=1) out vec4 glowOut;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float no(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
  vec3 c=mix(uSkyLow,uSkyHigh,smoothstep(.0,1.,uv.y));
  vec2 q=uv*vec2(5.5,4.5)+vec2(uTime*.0015,0.);
  float cl=no(q)*.64+no(q*2.)*.24+no(q*4.)*.12;
  float cloud=smoothstep(.51,.65,cl)*smoothstep(.27,.58,uv.y);
  c=mix(c,vec3(.88,.94,.83),cloud*.9*(1.-uIndoor));
  vec2 sun=(uv-vec2(.18,.87))*vec2(1.75,1.);
  c+=vec3(.33,.24,.105)*exp(-length(sun)*5.)*(1.-uIndoor);
  frag=vec4(c,1);glowOut=vec4(0.);
 }`,
bright:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex,emission;uniform float threshold;out vec4 frag;
void main(){vec3 e=texture(emission,uv).rgb,c=texture(tex,uv).rgb;float b=max(e.r,max(e.g,e.b));float soft=clamp(b-threshold+.45,0.,.9);soft=soft*soft/.9001;float f=max(b-threshold,soft)/max(b,.0001);vec3 selected=e*f;vec3 glint=max(c-vec3(3.8),vec3(0.))*.10;frag=vec4(min(selected+glint,vec3(20.)),1.);}`,
blur:`#version 300 es
 precision highp float;in vec2 uv;uniform sampler2D tex;uniform vec2 dir;out vec4 frag;void main(){vec3 c=texture(tex,uv).rgb*.227027;c+=(texture(tex,uv+dir*1.384615).rgb+texture(tex,uv-dir*1.384615).rgb)*.316216;c+=(texture(tex,uv+dir*3.230769).rgb+texture(tex,uv-dir*3.230769).rgb)*.070270;frag=vec4(c,1);}`,
post:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex,emission,aoTex,volumeTex,depthTex,bloom0,bloom1,bloom2,bloom3;
uniform vec2 res;uniform float hurt,flash,uBloom,uAO,uVolume,exposure,bloomStrength,uTime,uHeat;uniform vec3 shadowTint,highlightTint;
uniform int heatCount;uniform vec4 heatSources[4];out vec4 frag;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float linearDepth(float d){return 22./(220.-d*219.9);}
void main(){
 vec2 st=uv;float z=linearDepth(texture(depthTex,uv).r);
 for(int i=0;i<4;i++){if(i>=heatCount)break;vec4 s=heatSources[i];vec2 q=(uv-s.xy)*res/max(s.z,1.);float falloff=pow(max(0.,1.-dot(q,q)),2.);float behind=smoothstep(s.w-.15,s.w+.5,z);st+=vec2(sin(q.y*12.-uTime*13.),cos(q.x*9.+uTime*10.))*falloff*behind*1.15/res*uHeat;}
 vec3 c=texture(tex,st).rgb,e=texture(emission,st).rgb;
 float ao=mix(1.,texture(aoTex,uv).r,uAO);c=e+max(c-e,vec3(0.))*ao;
 vec4 vol=texture(volumeTex,uv);c=mix(c,c*(1.-vol.a)+vol.rgb,uVolume);
 vec3 bloom=texture(bloom0,uv).rgb*.40+texture(bloom1,uv).rgb*.28+texture(bloom2,uv).rgb*.21+texture(bloom3,uv).rgb*.11;c+=bloom*bloomStrength*uBloom;
 float lum=dot(c,vec3(.2126,.7152,.0722));c*=mix(shadowTint,highlightTint,smoothstep(.08,1.35,lum));c=srgb(aces(max(c,vec3(0.))*exposure));
 float vignette=smoothstep(.35,.95,length((uv-.5)*vec2(1.,.80)));c*=1.-vignette*.055;
 float border=pow(length((uv-.5)*1.5),2.);c=mix(c,vec3(.84,.10,.07),clamp(hurt*border*.66,0.,.6));c=mix(c,vec3(1.,.96,.80),flash*.30);frag=vec4(c,1.);
}`,
depth:`#version 300 es
precision highp float;flat in vec4 vParams;out vec4 frag;void main(){float k=vParams.x;if(k==4.||k==6.||k==7.||k==13.||k==18.||k==19.||k==20.||k==26.||k==27.||k==30.||k>=45.)discard;frag=vec4(1.);}`,
colorCopy:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;out vec4 frag;
void main(){frag=vec4(texture(tex,uv).rgb,1.);}`,
depthCopy:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;out vec4 frag;
void main(){float d=min(texture(tex,uv).r,.99999994);vec4 c=fract(d*vec4(16777216.,65536.,256.,1.));c-=c.xxyz*vec4(0.,1./256.,1./256.,1./256.);frag=c;}`,
ao:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D depthTex;uniform mat4 uInvVP,uVP;uniform vec2 res;uniform int samples;out vec4 frag;

vec3 world(vec2 p,float d){vec4 w=uInvVP*vec4(p*2.-1.,d*2.-1.,1.);return w.xyz/w.w;}
float linearDepth(float d){return 22./(220.-d*219.9);}

void main(){
 float d=texture(depthTex,uv).r;if(d>.99999||samples==0){frag=vec4(1.);return;}
 vec3 P=world(uv,d);vec2 px=1./res;
 vec3 a=world(uv+vec2(px.x,0.),texture(depthTex,uv+vec2(px.x,0.)).r)-P,b=P-world(uv-vec2(px.x,0.),texture(depthTex,uv-vec2(px.x,0.)).r);
 vec3 c=world(uv+vec2(0.,px.y),texture(depthTex,uv+vec2(0.,px.y)).r)-P,e=P-world(uv-vec2(0.,px.y),texture(depthTex,uv-vec2(0.,px.y)).r);
 vec3 N=normalize(cross(length(a)<length(b)?a:b,length(c)<length(e)?c:e));
 vec3 eye=world(vec2(.5),0.);if(dot(N,eye-P)<0.)N=-N;
 float rotation=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453)*6.283;
 float radius=.66,occlusion=0.;vec3 tangent=normalize(abs(N.y)<.9?cross(N,vec3(0.,1.,0.)):cross(N,vec3(1.,0.,0.))),bitangent=cross(N,tangent);
 for(int i=0;i<12;i++){if(i>=samples)break;float f=(float(i)+.5)/float(samples),angle=float(i)*2.399963+rotation;vec3 H=tangent*cos(angle)*sqrt(f)+bitangent*sin(angle)*sqrt(f)+N*sqrt(1.-f);vec3 Q=P+H*radius*(.32+.68*f);vec4 clip=uVP*vec4(Q,1.);vec2 st=clip.xy/clip.w*.5+.5;
  if(any(lessThan(st,vec2(0.)))||any(greaterThan(st,vec2(1.))))continue;
  float sd=texture(depthTex,st).r;vec3 hit=world(st,sd);float sampleDepth=linearDepth(sd),queryDepth=linearDepth(clip.z/clip.w*.5+.5);
  float range=1.-smoothstep(radius*.5,radius*1.7,length(hit-P));occlusion+=step(sampleDepth+.045,queryDepth)*range;
 }
 float ao=1.-occlusion/float(samples)*.80;frag=vec4(vec3(ao),1.);
}`,
bilateral:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex,depthTex;uniform vec2 dir;out vec4 frag;
float linearDepth(float d){return 22./(220.-d*219.9);}
void main(){float center=linearDepth(texture(depthTex,uv).r),sum=0.,w=0.;for(int i=-3;i<=3;i++){vec2 p=uv+dir*float(i);float z=linearDepth(texture(depthTex,p).r);float a=exp(-float(i*i)*.23)*exp(-abs(z-center)*9.);sum+=texture(tex,p).r*a;w+=a;}frag=vec4(vec3(sum/max(w,.0001)),1.);}`,
volume:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D depthTex,shadowTex;uniform mat4 uInvVP,uLight;uniform vec3 eye,fog,key,lightDir;uniform float density,indoor,shadowEnabled;uniform int steps;out vec4 frag;

vec3 world(vec2 p,float d){vec4 w=uInvVP*vec4(p*2.-1.,d*2.-1.,1.);return w.xyz/w.w;}
float linearDepth(float d){return 22./(220.-d*219.9);}

void main(){
 if(steps==0){frag=vec4(0.);return;}
 float d=texture(depthTex,uv).r;vec3 farPoint=world(uv,min(d,.9998)),delta=farPoint-eye;float len=min(length(delta),90.);vec3 ray=normalize(delta);
 float jitter=fract(sin(dot(floor(gl_FragCoord.xy),vec2(27.13,71.79)))*43758.5453);float stepLen=len/float(steps),trans=1.;vec3 scatter=vec3(0.);
 float alignment=max(dot(ray,normalize(lightDir)),0.);float phase=.12+.55*pow(alignment,8.);
 for(int i=0;i<12;i++){if(i>=steps)break;vec3 P=eye+ray*(float(i)+.25+jitter*.5)*stepLen;
  float behind=(1.-smoothstep(-11.,-2.,P.z));float height=exp(-max(P.y-1.,0.)*(indoor>.5?.05:.09));float rho=density*.62*behind*height;
  vec3 sp=(uLight*vec4(P,1.)).xyz*.5+.5;float lit=1.;if(shadowEnabled>.5&&all(greaterThan(sp,vec3(0.)))&&all(lessThan(sp,vec3(1.))))lit=step(sp.z-.00065,texture(shadowTex,sp.xy).r);
  float a=1.-exp(-rho*stepLen);scatter+=trans*a*(fog*.68+key*phase*lit);trans*=1.-a;
 }
 // Background-only density protects player and enemy projectile readability.
 frag=vec4(scatter,clamp(1.-trans,0.,.65));
}`,
downsample:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform vec2 texel;out vec4 frag;
void main(){vec3 c=texture(tex,uv).rgb*.25;c+=(texture(tex,uv+vec2(1,0)*texel).rgb+texture(tex,uv+vec2(-1,0)*texel).rgb+texture(tex,uv+vec2(0,1)*texel).rgb+texture(tex,uv+vec2(0,-1)*texel).rgb)*.125;c+=(texture(tex,uv+texel).rgb+texture(tex,uv-texel).rgb+texture(tex,uv+vec2(-1,1)*texel).rgb+texture(tex,uv+vec2(1,-1)*texel).rgb)*.0625;frag=vec4(c,1.);}`,
fxaa:`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D tex;uniform vec2 res;out vec4 frag;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec2 px=1./res;vec3 c=texture(tex,uv).rgb;
 vec3 nw=texture(tex,uv+vec2(-1,1)*px).rgb,ne=texture(tex,uv+px).rgb,sw=texture(tex,uv-px).rgb,se=texture(tex,uv+vec2(1,-1)*px).rgb;
 float lm=luma(c),a=luma(nw),b=luma(ne),d=luma(sw),e=luma(se),lo=min(lm,min(min(a,b),min(d,e))),hi=max(lm,max(max(a,b),max(d,e)));
 if(hi-lo>max(.055,hi*.11)){vec2 dir=vec2(-((a+b)-(d+e)),((a+d)-(b+e)));float reduce=max((a+b+d+e)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-6.),vec2(6.))*px;
 vec3 aa=.5*(texture(tex,uv-dir/6.).rgb+texture(tex,uv+dir/6.).rgb),bb=aa*.5+.25*(texture(tex,uv-dir*.5).rgb+texture(tex,uv+dir*.5).rgb);float lb=luma(bb);c=(lb<lo||lb>hi)?aa:bb;}
 frag=vec4(c,1.);
}`
};
