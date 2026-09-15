/* Mesh kit. Geometry only: no gameplay state and no external models/textures.
 * Each family is authored in its own coordinate contract. Closed surfaces use
 * welded, area-weighted normals; sharp panels explicitly split their corners.
 */
function addBiomeGeometry(meshes){
 const {norm,cross,dot,clamp}=Math3D,TAU=Math.PI*2;
 function put(name,p,ind,uv=[],flat=false){
  const sums=new Map(),keys=p.map(q=>q.map(v=>Math.round(v*1e5)).join(','));
  for(let j=0;j<ind.length;j+=3){const ids=ind.slice(j,j+3),[a,b,c]=ids.map(i=>p[i]),n=cross(b.map((v,k)=>v-a[k]),c.map((v,k)=>v-a[k]));
   if(Math.hypot(...n)<1e-10)continue;for(const i of ids){const s=sums.get(keys[i])||[0,0,0];sums.set(keys[i],s.map((v,k)=>v+n[k]));}}
  const ns=keys.map(k=>norm(sums.get(k)||[0,1,0])),out=[];
  for(let j=0;j<ind.length;j+=3){const ids=ind.slice(j,j+3),[a,b,c]=ids.map(i=>p[i]),n=cross(b.map((v,k)=>v-a[k]),c.map((v,k)=>v-a[k]));if(Math.hypot(...n)<1e-10)continue;
   for(const i of ids)out.push(...p[i],...(flat?norm(n):ns[i]),...(uv[i]||[p[i][0]+.5,p[i][1]+.5]));}
  meshes[name]={vertices:new Float32Array(out),rc8:true};
 }
 function solidGrid(name,fn,N=8,flat=false){
  const p=[],uv=[],ind=[];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){let base=p.length,a=(axis+1)%3,b=(axis+2)%3;
   for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const q=[0,0,0];q[axis]=sign*.5;q[a]=i/N-.5;q[b]=j/N-.5;p.push(fn(q,axis,sign));uv.push([q[0]+.5,q[1]+.5]);}
   for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=base+j*(N+1)+i,b=a+1,c=b+N+1,d=a+N+1;ind.push(...(sign>0?[a,b,c,a,c,d]:[a,c,b,a,d,c]));}}
  put(name,p,ind,uv,flat);
 }
 function tube(name,fn,rad,N=18,K=8){const p=[],uv=[],ind=[];
  for(let i=0;i<=N;i++){const t=i/N,c=fn(t),lo=fn(Math.max(0,t-.001)),hi=fn(Math.min(1,t+.001)),v=norm(hi.map((x,k)=>x-lo[k])),x=norm(cross(Math.abs(v[2])>.9?[1,0,0]:[0,0,1],v)),z=cross(x,v),r=typeof rad==='function'?rad(t):rad;
   for(let j=0;j<=K;j++){const a=j/K*TAU;p.push(c.map((v,k)=>v+r*(x[k]*Math.cos(a)+z[k]*Math.sin(a))));uv.push([t,j/K]);}}
  for(let i=0;i<N;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1,c=b+1,d=a+1;ind.push(a,b,c,a,c,d);}
  for(const [i,flip]of [[0,true],[N,false]]){let c=p.length;p.push(fn(i/N));uv.push([i/N,.5]);for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+1;ind.push(...(flip?[c,b,a]:[c,a,b]));}}
  put(name,p,ind,uv);
 }
 function extrude(name,outline,d=.12){ // Polygon CCW in XY, actual thickness along Z.
  const p=[...outline.map(q=>[q[0],q[1],-d/2]),...outline.map(q=>[q[0],q[1],d/2])],n=outline.length,ind=[];
  for(let i=1;i<n-1;i++)ind.push(0,i+1,i,n,n+i,n+i+1);
  for(let i=0;i<n;i++){let j=(i+1)%n;ind.push(i,j,j+n,i,j+n,i+n);}put(name,p,ind,[],true);
 }
 // A continuous, sedimentary rock mass: long fracture planes instead of spheres.
 for(let v=0;v<4;v++){
  solidGrid('strataMass'+v,([x,y,z])=>{
   const c=[x,y,z].map(q=>clamp(q,-.415,.415)),nn=norm([x-c[0],y-c[1],z-c[2]]);[x,y,z]=c.map((q,k)=>q+nn[k]*.085);
   const layer=Math.sin((y+.5)*19+v*.73),shelf=Math.tanh(layer*2.0)*.006;
   const edge=Math.max(Math.abs(x),Math.abs(z))*2;
   return[x+.022*Math.sin(y*9+v)*edge,y+.009*Math.sin(x*12+z*6+v)*edge,z+(.057*Math.sin(x*6+v)+.019*Math.cos(y*7+x*5)+shelf)*Math.pow(Math.max(0,z+.5),.4)];
  },10);
  // Solid shelf. Top is exactly zero over full playable X and Z; only its sides
  // taper / fracture. There is no separate coplanar green box placed on top.
  solidGrid('ravineShelf'+v,([x,y,z])=>{
   let u=y+.5,taper=.69+.31*u;
   let xx=x*taper+.028*Math.sin(z*9+v)*Math.pow(1-u,2);
   let zz=z*(.77+.23*u)+(.045+.035*Math.sin(x*13+v)+.024*Math.cos(x*29+v))*Math.max(0,z+.5);
   // Flat collision strip remains exact, but the underside is a fractured wedge,
   // thickening into the rear wall instead of a repeated flat-bottom tray.
   let fracture=.10*Math.sin(x*8+v*1.7)+.036*Math.sin(x*16+z*5+v);
   // A deep rear root tapers toward the front lip, NOT uniformly on all four sides.
   let yy=(y-.5)*(1.75-1.10*(z+.5)+fracture);
   xx=x*(.88+.12*u)+.042*Math.sin(v+z*5)*(1-u);
   return[xx,yy,zz];
  },10);
  // Snowpack and ice substrate are coupled: one exact, flat walkable plane.
  solidGrid('iceShelf'+v,([x,y,z])=>{let u=y+.5;return[x*(.92+.08*u),y-.52+(1-u)*.033*Math.sin(x*18+v),z+.022*Math.sin(x*11+v)*Math.max(0,z+.5)];},8);
  solidGrid('snowPack'+v,([x,y,z])=>{let u=y+.5,back=clamp((-z-.12)*3,0,1),drift=back*(.24+.065*Math.sin(x*9+v));
   return[x,(u-1)*(.12+.035*Math.sin(x*13+z*11+v))+drift*u,z+.018*Math.sin(x*11+v)*Math.max(0,z+.5)];},10);
 }
 // RC9 water source buttress: broad foot, asymmetric crest and recessed cleft.
 solidGrid('cascadeRock',([x,y,z])=>{
  const t=y+.5,crest=.86+.09*Math.sin(x*8+.6)+.045*Math.sin(x*17),foot=1.2-.36*t;
  const valley=Math.exp(-x*x*52.)*.105*Math.pow(Math.max(0,z+.5),.45);
  return[x*foot+.022*Math.sin(y*12+z*4),-.5+t*crest,
   z+Math.max(0,z+.5)*(.07*Math.sin(x*16+y*7)+.045*Math.cos(y*18)-valley)];
 },18);
 // Mountain ridges: snow coverage is a slope/height shader on this SAME surface.
 for(let v=0;v<3;v++){
  const ridge=(x,z)=>{let crest=.70+.18*Math.sin(x*8+v)+.13*Math.sin(x*17+v*2);return Math.max(0,crest-Math.abs(z-.055*Math.sin(x*11))*1.65)*Math.pow(Math.max(0,1-Math.pow(x*2,4)),.5);};
  solidGrid('alpineRidge'+v,([x,y,z],axis,sign)=>[x,-.5+(y+.5)*(.04+ridge(x,z)),z],18);
  const data=meshes['alpineRidge'+v].vertices;for(let j=0;j<data.length;j+=8)data[j+7]=data[j+1]+.5;
 }
 // Closed needle bough, rooted at x=0 and ending at x=1. Its snow mantle uses
 // the exact same centre line and UV root weight; it never slides independently.
 const bp=(u,q,v)=>{let width=.245*Math.pow(Math.sin(Math.PI*u),.74)*(1+.15*Math.sin(u*39+v)+.075*Math.cos(u*71));let yy=-.19*u*u+.060*Math.sin(u*Math.PI)+.025*Math.sin(u*14+v)*u;return[u,yy,q*width];};
 for(let v=0;v<3;v++){
  const p=[],uv=[],ind=[],N=22,K=8;
  for(let i=0;i<=N;i++)for(let j=0;j<=K;j++){let u=i/N,a=j/K*TAU,q=Math.cos(a),c=bp(u,q,v),r=.052*Math.pow(Math.sin(Math.PI*u),.7);p.push([c[0],c[1]+Math.sin(a)*r,c[2]]);uv.push([u,j/K]);}
  for(let i=0;i<N;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1,c=b+1,d=a+1;ind.push(a,b,c,a,c,d);}put('firBough'+v,p,ind,uv);
  const sp=[],su=[],si=[],U=16,V=6;
  for(let side=0;side<2;side++)for(let j=0;j<=V;j++)for(let i=0;i<=U;i++){let u=.09+i/U*.82,q=(j/V-.5)*1.7,c=bp(u,q,v),edge=Math.pow(Math.max(0,1-q*q),.65)*Math.sin(i/U*Math.PI);let yy=.024+.10*edge+.016*Math.sin(u*13+v)*edge;sp.push([c[0],c[1]+yy-(side?.075*edge+.024:0),c[2]]);su.push([u,j/V]);}
  const base=(U+1)*(V+1);
  for(let j=0;j<V;j++)for(let i=0;i<U;i++){let a=j*(U+1)+i,b=a+1,c=b+U+1,d=a+U+1;si.push(a,d,c,a,c,b,a+base,b+base,c+base,a+base,c+base,d+base);}
  // Side skirts close the snow mantle and share its local root coordinate.
  for(let j=0;j<=V;j+=V)for(let i=0;i<U;i++){let a=j*(U+1)+i,b=a+1;si.push(...(j===0?[a,b,b+base,a,b+base,a+base]:[a,b+base,b,a,a+base,b+base]));}
  for(let i=0;i<=U;i+=U)for(let j=0;j<V;j++){let a=j*(U+1)+i,b=a+U+1;si.push(...(i===0?[a,b+base,b,a,a+base,b+base]:[a,b,b+base,a,b+base,a+base]));}
  put('firSnow'+v,sp,si,su);
 }
 // Continuous inner crown supplies the conifer mass. Individual rooted boughs
 // extend beyond it; no horizontal disc tiers and no naked trunk with snow tiles.
 for(let v=0;v<4;v++){
  const p=[],uv=[],ind=[],clusters=27,K=8,N=6;
  for(let k=0;k<clusters;k++){
   const t=.025+k/(clusters-1)*.94,angle=k*2.399+v*.51;
   const span=.53*Math.pow(1-t,.76)*(1+.12*Math.sin(k*1.7+v));
   const y0=t+.012*Math.sin(k*3.1),base=p.length;
   for(let j=0;j<=N;j++)for(let i=0;i<=K;i++){
    const f=j/N,a=i/K*TAU,r=Math.pow(Math.max(0,1-f),.72)*Math.min(1,f*9),d=span*f;
    const width=span*.38*r*(.90+.10*Math.cos(a*3+k)+.07*Math.sin(f*36+k));
    const dy=span*.065*r*Math.sin(a)-span*.075*f*f;
    p.push([Math.cos(angle)*d-Math.sin(angle)*Math.cos(a)*width,y0+dy,Math.sin(angle)*d+Math.cos(angle)*Math.cos(a)*width]);
    uv.push([f,t]);
   }
   for(let j=0;j<N;j++)for(let i=0;i<K;i++){let a=base+j*(K+1)+i,b=a+K+1,c=b+1,d=a+1;ind.push(a,b,c,a,c,d);}
  }
  put('firCrown'+v,p,ind,uv);
 }
 tube('firTrunk',t=>[.035*Math.sin(t*3),t,0],t=>.032*Math.pow(1-t,.72)+.002,22,9);
 // Chunky, asymmetrical canopy crowns for selective Jungle refinement.
 for(let v=0;v<3;v++)solidGrid('canopyCrown'+v,([x,y,z])=>{const n=norm([x,y,z]),r=.50*(.94+.055*Math.sin(n[0]*9+n[2]*7+v));return[n[0]*r,n[1]*r*.77+.036*Math.sin(n[0]*9+n[2]*5+v),n[2]*r];},7);
 // Aircraft loft. Nose +X, vertical +Y. Cross-sections define a fuselage rather
 // than a stretched box; side glass, wings and gear are separate attached meshes.
 {const p=[],uv=[],ind=[],rings=[[-.5,.03,-.03],[-.44,.21,-.01],[-.30,.40,0],[-.1,.50,0],[.18,.47,.025],[.34,.30,-.015],[.46,.12,-.05],[.50,.01,-.065]],K=18;
  for(let i=0;i<rings.length;i++){let [x,r,y]=rings[i];for(let j=0;j<=K;j++){let a=j/K*TAU;p.push([x,y+Math.cos(a)*r,Math.sin(a)*r]);uv.push([i/(rings.length-1),j/K]);}}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1,c=b+1,d=a+1;ind.push(a,c,b,a,d,c);}put('airframe',p,ind,uv);}
 solidGrid('cockpit',([x,y,z])=>{let roof=Math.sqrt(Math.max(.06,1-Math.pow(x*1.85,2)))*.42;return[x,y*(y>0?roof/.5:.40),z*(.95-.48*Math.max(0,x))];},6);
 extrude('tailFin',[[-.5,-.5],[.5,-.5],[.15,.5],[-.20,.5]],.14);
 extrude('sweptWing',[[-.50,-.50],[.5,-.50],[-.12,.50],[-.45,.50]],.055);
 extrude('utilityCab',[[-.5,-.5],[.5,-.5],[.5,-.04],[.23,.5],[-.5,.5]],1.0);
 tube('cargoHose',t=>[t-.5,-Math.sin(t*Math.PI)*.38,.075*Math.sin(t*Math.PI*2)],.025,22,8);
 tube('craneHook',t=>{const a=-Math.PI*.12+t*Math.PI*1.58;return[.26*Math.sin(a),-.31+.29*Math.cos(a),0];},t=>.038+.016*Math.sin(t*Math.PI),22,10);
 extrude('fanVane',[[0,-.055],[.44,-.15],[.50,-.06],[.39,.045],[.12,.07]],.045);
 // Deep tyre profile with true metal hub fitted separately in the assembly.
 {const p=[],uv=[],ind=[],K=28,rings=[[-.5,.28],[-.5,.40],[-.32,.50],[.32,.50],[.50,.40],[.5,.28],[-.5,.28]];
  for(let i=0;i<rings.length;i++)for(let j=0;j<=K;j++){let a=j/K*TAU;p.push([Math.cos(a)*rings[i][1],rings[i][0],Math.sin(a)*rings[i][1]]);uv.push([j/K,i/(rings.length-1)]);}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1,c=b+1,d=a+1;ind.push(a,b,c,a,c,d);}put('tractionTire',p,ind,uv);}
}
