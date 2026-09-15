/* Geometry adapted from the previously accepted Toon H5. No external model files. */
const Math3D=(()=>{
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const colorCache=new Map();
 function color(h){ if(Array.isArray(h))return h; if(colorCache.has(h))return colorCache.get(h);const n=parseInt(h.replace('#',''),16); const c=[n>>16&255,n>>8&255,n&255].map(v=>((v/=255)<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)));colorCache.set(h,c);return c;}
 const id=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 function mul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
 const norm=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 function matrix(x,y,z,sx=1,sy=sx,sz=sx,rz=0,ry=0,rx=0){
  const a=Math.cos(rz),b=Math.sin(rz),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rx),f=Math.sin(rx);
  return new Float32Array([a*c*sx,b*c*sx,-d*sx,0,(a*d*f-b*e)*sy,(b*d*f+a*e)*sy,c*f*sy,0,(a*d*e+b*f)*sz,(b*d*e-a*f)*sz,c*e*sz,0,x,y,z,1]);
 }
 function segment(a,b,r,rz=r){let y=norm(b.map((v,i)=>v-a[i])),x=norm(cross(Math.abs(y[2])>.98?[1,0,0]:[0,0,1],y)),z=cross(x,y);let m=id();const len=Math.hypot(...b.map((v,i)=>v-a[i]));for(let k=0;k<3;k++){m[k]=x[k]*r;m[4+k]=y[k]*len;m[8+k]=z[k]*rz;m[12+k]=(a[k]+b[k])/2;}return m;}
 function look(eye,at){const z=norm(eye.map((v,i)=>v-at[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
 function perspective(f,asp,n,far){const d=1/Math.tan(f/2);return new Float32Array([d/asp,0,0,0,0,d,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);}
 function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}

 function oriented(x,y,z,sx=1,sy=sx,sz=sx,{axis='y',spin=0}={}){
  if(!['x','y','z'].includes(axis))throw new RangeError('Asset axis must be x, y or z');
  if(axis==='z')return matrix(x,y,z,sx,sy,sz,spin,0,Math.PI/2);
  if(axis==='x')return matrix(x,y,z,sx,sy,sz,Math.PI/2,spin,0);
  return matrix(x,y,z,sx,sy,sz,0,spin,0);
 }
 return {clamp,color,id,mul,norm,cross,dot,matrix,oriented,segment,look,perspective,ortho};})();
function createGeometryLibrary(){
const {norm,cross,dot,clamp}=Math3D;
 function geometry(){let data=[];return {data,tri(a,b,c,na=null,nb=null,nc=null,uvs=null){const n=na||norm(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));[a,b,c].forEach((p,i)=>data.push(...p,...([na,nb,nc][i]||n),...(uvs?.[i]||[p[0]+.5,p[1]+.5])));},quad(a,b,c,d){this.tri(a,b,c);this.tri(a,c,d);}};}
 const meshes={};
 function mesh(name,g){meshes[name]={vertices:new Float32Array(g.data)};}

 let g=geometry();for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const a=(axis+1)%3,b=(axis+2)%3;let p=[];for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){let x=[0,0,0];x[axis]=sign*.5;x[a]=u*.5;x[b]=v*.5;p.push(x);}if(sign<0)p.reverse();g.quad(...p);}mesh('box',g);
 function radial(name,rings,n=12,smooth=true){let a=geometry();const point=(j,i)=>[Math.cos(i/n*Math.PI*2)*rings[j][1],rings[j][0],Math.sin(i/n*Math.PI*2)*rings[j][1]];for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){let p=point(j,i),q=point(j+1,i),r=point(j+1,i+1),s=point(j,i+1);const ny=(rings[j][1]-rings[j+1][1])/(rings[j+1][0]-rings[j][0]||.001);let normal=k=>norm([Math.cos(k/n*Math.PI*2),ny,Math.sin(k/n*Math.PI*2)]);if(smooth){a.tri(p,q,r,normal(i),normal(i),normal(i+1));a.tri(p,r,s,normal(i),normal(i+1),normal(i+1));}else a.quad(p,q,r,s);}mesh(name,a);}
 radial('cyl',[[-.5,0],[-.5,.5],[.5,.5],[.5,0]],12,false);
 radial('torso',[[-.5,.31],[-.4,.34],[.24,.53],[.5,.46]],10,true);
 radial('cone',[[-.5,0],[-.5,.5],[.5,0]],7,false);
 let rings=[];for(let j=0;j<=10;j++){const a=j/10*Math.PI;rings.push([-.5*Math.cos(a),Math.sin(a)*.5]);}radial('sphere',rings,14,true);
 // A shared position on a sphere has ONE analytic normal, not one per latitude band.
 // Positions, UVs, triangle ordering and silhouette are deliberately unchanged.
 {const v=meshes.sphere.vertices;for(let i=0;i<v.length;i+=8){const n=norm([v[i],v[i+1],v[i+2]]);v.set(n,i+3);}}
 radial('rock',[[-.5,.24],[-.37,.42],[0,.55],[.32,.4],[.5,.15]],7,false);
 let leaf=geometry();const spine=(u,z=0)=>[u,.22*Math.sin(u*Math.PI)-u*u*.13,z];for(let i=0;i<12;i++){const u=i/12+.03,w=Math.sin(u*Math.PI)*.28;for(let s of [-1,1]){const a=spine(u),b=spine(u+.07),tip=spine(Math.min(1,u+.23),s*w);tip[1]-=w*.23;leaf.tri(a,b,tip,null,null,null,[[u,0],[u+.07,1],[u,1]]);}}mesh('frond',leaf);
 let grass=geometry();for(let i=0;i<7;i++){const a=i*2.399,x=Math.cos(a)*.28,z=Math.sin(a)*.28,h=.6+(i%3)*.2;grass.tri([x-.025,0,z],[x+.025,0,z],[x+Math.cos(a)*.20,h,z+Math.sin(a)*.18],null,null,null,[[0,0],[1,0],[.5,1]]);}mesh('grass',grass);
 let quad=geometry();quad.tri([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[0,0,1],[0,0,1],[0,0,1],[[0,0],[1,0],[1,1]]);quad.tri([-.5,-.5,0],[.5,.5,0],[-.5,.5,0],[0,0,1],[0,0,1],[0,0,1],[[0,0],[1,1],[0,1]]);mesh('quad',quad);mesh('glow',quad);
 let water=geometry();const N=28;for(let i=0;i<N;i++)for(let j=0;j<N;j++){let x=i/N-.5,z=j/N-.5;water.quad([x,0,z],[x,0,z+1/N],[x+1/N,0,z+1/N],[x+1/N,0,z]);}mesh('water',water);
 // Sculpted, bevelled geometry: all scenery and actors remain genuine 3D meshes.
 {
  const g=geometry(),r=.10,t=.5-r;
  function face(points){let n=norm(cross(points[1].map((v,i)=>v-points[0][i]),points[2].map((v,i)=>v-points[0][i])));const center=points.reduce((a,p)=>a.map((v,i)=>v+p[i]),[0,0,0]);if(dot(n,center)<0){points.reverse();n=n.map(v=>-v);}for(let i=1;i<points.length-1;i++)g.tri(points[0],points[i],points[i+1],n,n,n);}
  for(let a=0;a<3;a++)for(const s of [-1,1]){let b=(a+1)%3,c=(a+2)%3;face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{let p=[0,0,0];p[a]=s*.5;p[b]=u*t;p[c]=v*t;return p;}));}
  for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]){let c=3-a-b;face([[.5,t,-t],[.5,t,t],[t,.5,t],[t,.5,-t]].map(([u,v,w])=>{let p=[];p[a]=u*sa;p[b]=v*sb;p[c]=w;return p;}));}
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([[x*.5,y*t,z*t],[x*t,y*.5,z*t],[x*t,y*t,z*.5]]);
  mesh('bevel',g);mesh('panel',g);
  let head=geometry();head.data=g.data.map((v,i)=>i%8===0?v*(.83+.17*((g.data[i+1]||0)+.5)):v);mesh('head',head);
 }
 radial('limb',[[-.5,0],[-.47,.20],[-.36,.45],[-.15,.50],[.15,.46],[.36,.33],[.48,.16],[.5,0]],12,true);
 radial('tuft',[[-.5,0],[-.45,.34],[-.18,.46],[.14,.35],[.50,0]],9,true);
 radial('ring',[[-.055,.36],[-.055,.5],[.055,.5],[.055,.36],[-.055,.36]],24,true);
 {
  const leaf=geometry();
  const point=(t,q)=>[t,.19*Math.sin(t*Math.PI)-t*t*.16-Math.abs(q)*.08*Math.sin(t*Math.PI),q*.30*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.75)];
  const normal=(t,q)=>{const dx=point(Math.min(.9999,t+.001),q).map((v,i)=>v-point(Math.max(.0001,t-.001),q)[i]),dz=point(t,Math.min(1,q+.001)).map((v,i)=>v-point(t,Math.max(-1,q-.001))[i]);const nn=cross(dz,dx);return Math.hypot(...nn)<1e-7?[0,1,0]:norm(nn);};
  for(let i=0;i<10;i++)for(let k=0;k<4;k++){
   let t=i/10,t1=(i+1)/10,q=k/2-1,q1=(k+1)/2-1;
   let a=point(t,q),b=point(t,q1),c=point(t1,q1),d=point(t1,q);
   leaf.tri(a,b,c,normal(t,q),normal(t,q1),normal(t1,q1),[[t,(q+1)/2],[t,(q1+1)/2],[t1,(q1+1)/2]]);
   leaf.tri(a,c,d,normal(t,q),normal(t1,q1),normal(t1,q),[[t,(q+1)/2],[t1,(q1+1)/2],[t1,(q+1)/2]]);
  }
  mesh('leaf',leaf);
 }
 {
  const g=geometry(),sp=t=>[t,.26*Math.sin(t*Math.PI)-.20*t*t,0];
  for(let i=0;i<13;i++)for(const side of [-1,1]){
   const t=.04+i*.065,root=sp(t),tip=[t+.19,sp(t)[1]-.02,side*(.065+.31*Math.sin(t*Math.PI))];
   const pt=(u,q)=>[root[0]+(tip[0]-root[0])*u+q*.032*Math.sin(u*Math.PI),root[1]+(tip[1]-root[1])*u+Math.sin(u*Math.PI)*.055-Math.abs(q)*.009,root[2]+(tip[2]-root[2])*u-q*.035*Math.sin(u*Math.PI)];
   for(let j=0;j<4;j++){const a=j/4,b=(j+1)/4;for(const si of [-1,1]){let p=pt(a,0),q=pt(a,si),r=pt(b,si),ss=pt(b,0),nn=norm([-.1,.95,side*.22]);g.tri(p,q,r,nn,nn,nn,[[t+a*.2,.5],[t+a*.2,si>0?1:0],[t+b*.2,si>0?1:0]]);g.tri(p,r,ss,nn,nn,nn,[[t+a*.2,.5],[t+b*.2,si>0?1:0],[t+b*.2,.5]]);}}
  }
  for(let i=0;i<12;i++){let a=sp(i/12),b=sp((i+1)/12);g.quad([a[0],a[1]+.004,-.010],[a[0],a[1]+.004,.010],[b[0],b[1]+.004,.007],[b[0],b[1]+.004,-.007]);}
  mesh('palm',g);
 }
 {
  const g=geometry(),N=11,layers=[[-.5,.32],[-.40,.46],[-.20,.54],[.13,.5],[.35,.37],[.5,.22]];
  const pt=(j,k)=>{let a=k/N*Math.PI*2,r=layers[j][1]*(1+.1*Math.sin(k*2.2+j*.35)+.065*Math.sin(k*4.0+j*1.3));return[Math.cos(a)*r,layers[j][0]+.036*Math.sin(k*2.5+j*1.1),Math.sin(a)*r];};
  for(let j=0;j<layers.length-1;j++)for(let i=0;i<N;i++){
   let a=pt(j,i),b=pt(j+1,i),c=pt(j+1,(i+1)%N),d=pt(j,(i+1)%N);
   const nr=k=>norm([Math.cos(k/N*Math.PI*2),j<2?-.3:j<3?.08:.7,Math.sin(k/N*Math.PI*2)]);
   let n1=norm(cross(b.map((v,k)=>v-a[k]),c.map((v,k)=>v-a[k]))),n2=norm(cross(c.map((v,k)=>v-a[k]),d.map((v,k)=>v-a[k])));
   const soften=(n,k)=>norm(n.map((v,ix)=>v*.55+nr(k)[ix]*.45));
   g.tri(a,b,c,soften(n1,i),soften(n1,i),soften(n1,i+1));g.tri(a,c,d,soften(n2,i),soften(n2,i+1),soften(n2,i+1));
  }
  for(let i=0;i<N;i++){g.tri([0,.485,0],pt(5,(i+1)%N),pt(5,i),[0,1,0],[0,1,0],[0,1,0]);g.tri([0,-.49,0],pt(0,(i+1)%N),pt(0,i));}
  mesh('stone',g);
 }
 {
  const g=geometry(),N=14,L=12;
  const p=(j,i)=>{const t=j/L,a=i/N*6.283185,rad=Math.pow(1-t,.62)*(.50+.07*Math.sin(i*2.3+j*.21))*(1-.12*Math.sin(j*2));return[Math.cos(a)*rad+.085*Math.sin(j*.45)*t,t-.5,Math.sin(a)*rad];};
  const normal=(j,i)=>{const a=i/N*6.283185;return norm([Math.cos(a),.35+.65*j/L,Math.sin(a)]);};
  for(let j=0;j<L;j++)for(let i=0;i<N;i++){let a=p(j,i),b=p(j+1,i),c=p(j+1,(i+1)%N),d=p(j,(i+1)%N);g.tri(a,b,c,normal(j,i),normal(j+1,i),normal(j+1,i+1));g.tri(a,c,d,normal(j,i),normal(j+1,i+1),normal(j,i+1));}mesh('peak',g);
 }
   {
   // RC9 gravitational sheet: fixed centreline, endpoints and source width.
   // Long sheets use 96 vertical intervals (<= .80 m for the 76 m ravine).
   const g=geometry(),NX=10,NY=96;
   const p=(u,v)=>[(u-.5)*(.92+.08*Math.pow(1-v,2)),v-.5,.016*Math.sin(u*Math.PI*4)*Math.pow(Math.sin(v*Math.PI),2)];
   for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){
    let u=x/NX,u1=(x+1)/NX,v=y/NY,v1=(y+1)/NY,n=[0,0,1];
    g.tri(p(u,v),p(u1,v),p(u1,v1),n,n,n,[[u,v],[u1,v],[u1,v1]]);
    g.tri(p(u,v),p(u1,v1),p(u,v1),n,n,n,[[u,v],[u1,v1],[u,v1]]);
   }mesh('fall',g);
   const lip=geometry();const p2=(u,v)=>[(u-.5)*.92,.22*Math.cos(v*Math.PI*.5),-1.65*(1-v)];
   for(let j=0;j<12;j++)for(let i=0;i<10;i++){
    const u=i/10,v=j/12,du=.1,dv=1/12,n=norm([0,1-v,v]);
    lip.tri(p2(u,v),p2(u+du,v),p2(u+du,v+dv),n,n,n,[[u,1],[u+du,1],[u+du,.96]]);
    lip.tri(p2(u,v),p2(u+du,v+dv),p2(u,v+dv),n,n,n,[[u,1],[u+du,.96],[u,.96]]);
   }mesh('spillLip',lip);
  }
 {
  const g=geometry();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2,ra=i%2?.17:.5,rb=(i+1)%2?.17:.5;g.tri([0,0,.055],[Math.cos(a)*ra,Math.sin(a)*ra,0],[Math.cos(b)*rb,Math.sin(b)*rb,0]);}mesh('flash',g);
 }

 {
  const g=geometry(),N=5;
  const make=(axis,sign,u,v)=>{
   let p=[0,0,0],a=(axis+1)%3,b=(axis+2)%3;p[axis]=sign*.5;p[a]=u*.5;p[b]=v*.5;
   const c=p.map(v=>clamp(v,-.355,.355)),n=norm(p.map((v,i)=>v-c[i]));
   const q=c.map((v,i)=>v+n[i]*.145);
   const x=q[0],y=q[1],z=q[2];q[0]+=.026*Math.sin(y*9+z*6);q[1]+=.022*Math.sin(x*7-z*8);q[2]+=.025*Math.sin(x*8+y*6);
   return {p:q,n};
  };
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1])for(let i=0;i<N;i++)for(let j=0;j<N;j++){
   let a=make(axis,sign,i/N*2-1,j/N*2-1),b=make(axis,sign,(i+1)/N*2-1,j/N*2-1),c=make(axis,sign,(i+1)/N*2-1,(j+1)/N*2-1),d=make(axis,sign,i/N*2-1,(j+1)/N*2-1);
   if(sign>0){g.tri(a.p,b.p,c.p,a.n,b.n,c.n);g.tri(a.p,c.p,d.p,a.n,c.n,d.n);}else{g.tri(a.p,c.p,b.p,a.n,c.n,b.n);g.tri(a.p,d.p,c.p,a.n,d.n,c.n);}
  }
  mesh('cliff',g);
 }

 // RC7 environment asset library. Closed, smooth topology with real silhouettes;
 // no billboard backgrounds. Author in metres at assembly time, +Y up / +Z camera.
 {
  const TAU=Math.PI*2;
  function sculpt(name,positions,indices,uvs){
   // Weld positional duplicates for averaged surface normals, including periodic seams.
   const sums=new Map(),keys=positions.map(p=>p.map(v=>Math.round(v*1e6)).join(','));
   for(let i=0;i<indices.length;i+=3){const a=positions[indices[i]],b=positions[indices[i+1]],c=positions[indices[i+2]],n=cross(b.map((v,k)=>v-a[k]),c.map((v,k)=>v-a[k]));
    if(Math.hypot(...n)<1e-12)continue;
    for(let j=0;j<3;j++){const key=keys[indices[i+j]],s=sums.get(key)||[0,0,0];for(let k=0;k<3;k++)s[k]+=n[k];sums.set(key,s);}}
   const normals=keys.map(k=>norm(sums.get(k)||[0,1,0])),g=geometry();
   for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),p=ids.map(j=>positions[j]);if(Math.hypot(...cross(p[1].map((v,k)=>v-p[0][k]),p[2].map((v,k)=>v-p[0][k])))<1e-12)continue;g.tri(...p,...ids.map(j=>normals[j]),ids.map(j=>uvs?.[j]||[0,0]));}
   mesh(name,g);
  }
  function surface(name,fn,U,V,flip=false){const p=[],uv=[],ind=[];for(let j=0;j<=V;j++)for(let i=0;i<=U;i++){p.push(fn(i/U,j/V));uv.push([i/U,j/V]);}
   for(let j=0;j<V;j++)for(let i=0;i<U;i++){const a=j*(U+1)+i,b=a+1,c=b+U+1,d=a+U+1;ind.push(...(flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]));}sculpt(name,p,ind,uv);}
  // Profiled hardware, all around +Y. No faceted 12-sided pipe or spherical elbow.
  radial('alloyTube',[[-.5,0],[-.5,.43],[-.475,.5],[.475,.5],[.5,.43],[.5,0]],24,true);
  radial('flange',[[-.5,0],[-.5,.43],[-.35,.5],[.35,.5],[.5,.43],[.5,0]],32,false);
  radial('hexBolt',[[-.5,0],[-.5,.43],[-.30,.50],[.35,.50],[.5,.40],[.5,0]],6,false);
  radial('reactorBezel',[[-.5,.34],[-.5,.45],[-.32,.50],[.23,.50],[.50,.455],[.50,.37],[.30,.34],[-.5,.34]],48,true);
  radial('sealRing',[[-.40,.455],[-.5,.47],[-.3,.50],[.3,.50],[.5,.47],[.40,.455],[-.4,.455]],48,true);
  // Machined reactor sectors, front in +Z, centred at origin with diameter 1.
  {const g=geometry(),N=6,inner=.365,outer=.5,span=Math.PI*.205;
   const q=(a,r,z)=>[Math.cos(a)*r,Math.sin(a)*r,z];
   for(let i=0;i<N;i++){let a=-span/2+i/N*span,b=-span/2+(i+1)/N*span;
    g.quad(q(a,inner,.05),q(a,outer,.05),q(b,outer,.05),q(b,inner,.05));g.quad(q(b,inner,-.05),q(b,outer,-.05),q(a,outer,-.05),q(a,inner,-.05));
    g.quad(q(a,outer,.05),q(a,outer,-.05),q(b,outer,-.05),q(b,outer,.05));g.quad(q(b,inner,.05),q(b,inner,-.05),q(a,inner,-.05),q(a,inner,.05));}
   for(const [a,flip]of [[-span/2,false],[span/2,true]]){let p=[q(a,inner,-.05),q(a,outer,-.05),q(a,outer,.05),q(a,inner,.05)];if(flip)p.reverse();g.quad(...p);}mesh('reactorSector',g);}
  function sampleCurve(points,t){const f=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(f)),u=f-i;
   const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];return b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*u+(2*a[k]-5*v+4*c[k]-d[k])*u*u+(-a[k]+3*v-3*c[k]+d[k])*u*u*u));}
  function tube(name,points,radius,N=30,K=10){const p=[],uv=[],ind=[];
   for(let i=0;i<=N;i++){const t=i/N,c=sampleCurve(points,t),a=sampleCurve(points,Math.max(0,t-.001)),b=sampleCurve(points,Math.min(1,t+.001)),v=norm(b.map((x,j)=>x-a[j])),r=typeof radius==='function'?radius(t):radius;
    const x=norm(cross(Math.abs(v[2])>.90?[1,0,0]:[0,0,1],v)),z=cross(x,v);
    for(let j=0;j<=K;j++){const ang=j/K*TAU;p.push(c.map((v,k)=>v+r*(Math.cos(ang)*x[k]+Math.sin(ang)*z[k])));uv.push([j/K,t]);}}
   for(let i=0;i<N;i++)for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+K+1,c=b+1,d=a+1;ind.push(a,b,c,a,c,d);}
   for(const [i,flip]of [[0,true],[N,false]]){let center=p.length;p.push(sampleCurve(points,i/N));uv.push([.5,i/N]);for(let j=0;j<K;j++){let a=i*(K+1)+j,b=a+1;ind.push(...(flip?[center,a,b]:[center,b,a]));}}sculpt(name,p,ind,uv);}
  tube('pipeElbow',[[1,0,0],[.6173,.0761,0],[.2929,.2929,0],[.0761,.6173,0],[0,1,0]],.11,18,12);
  tube('hangingCable',[[-.5,.0,0],[-.28,-.28,.025],[.05,-.4,.04],[.32,-.24,.025],[.5,0,0]],.014,28,7);
  // Sweep in METRES before normalising. Sweeping after anisotropic scaling makes bones blade-flat.
  function normaliseAsset(name,size){const v=meshes[name].vertices;for(let i=0;i<v.length;i+=8){for(let k=0;k<3;k++)v[i+k]/=size[k];const n=norm([v[i+3]*size[0],v[i+4]*size[1],v[i+5]*size[2]]);v.set(n,i+3);}}
  tube('boneRib',[[0,0,0],[.16,1.40,.10],[.50,3.30,.25],[1.15,5.20,.05],[2.35,7.00,-.22],[3.80,8.50,-.25]],t=>(.43*(1-t*.84)+.10*Math.exp(-t*13))*(1+.075*Math.sin(t*31)*Math.sin(t*Math.PI)),42,14);
  normaliseAsset('boneRib',[3.8,8.5,1.8]);
  tube('boneBranch',[[0,0,0],[-.45,.90,.03],[-.52,2.00,.12],[-.04,3.12,.10],[.72,3.82,-.04]],t=>.24*(1-t*.54),30,12);
  normaliseAsset('boneBranch',[1,4,1]);
  tube('boneSpur',[[0,0,0],[.04,.25,.035],[.04,.55,.12],[-.05,.82,.20],[-.16,1,.24]],t=>.12*Math.pow(1-t,.75)+.002,22,10);
  tube('muscleArch',[[-.5,0,0],[-.46,.36,.05],[-.30,.75,.01],[0,1,-.06],[.31,.77,.02],[.46,.38,.04],[.5,0,0]],t=>.070*(1+.11*Math.sin(t*42)),42,12);
  surface('tissueCuff',(u,v)=>{let a=u*TAU,r=.51-.33*v+.035*Math.sin(a*5+v*8);return[Math.cos(a)*r,v-.5,Math.sin(a)*r];},32,18,true);
  tube('tendon',[[0,0,0],[.12,.23,.08],[.14,.55,-.035],[.08,.8,-.03],[0,1,0]],t=>.11*(1-.5*Math.sin(t*Math.PI))*(1+.07*Math.sin(t*32)),24,10);
  tube('artery',[[0,0,0],[-.06,.23,.065],[.07,.54,0],[-.04,.80,-.045],[0,1,0]],t=>.12*(.4+.60*Math.pow(Math.sin(t*Math.PI),.55))*(1+.07*Math.cos(t*28)),24,10);
  // Triangular tension web. Curved three-anchor boundaries, not a flat rectangular card.
  {const p=[],uv=[],ind=[],N=22,rows=[];
   for(let j=0;j<=N;j++){rows[j]=[];for(let i=0;i<=N-j;i++){const b=j/N,c=i/N,a=1-b-c,edge=b*c*4;
    rows[j][i]=p.length;p.push([c-b*c*1.20-a*c*.25,b+c*.34-b*c*1.90+a*b*.13,-(a*b+b*c+c*a)*.62]);uv.push([c,b]);}}
   for(let j=0;j<N;j++)for(let i=0;i<N-j;i++){const a=rows[j][i],b=rows[j][i+1],c=rows[j+1][i];ind.push(a,b,c);if(i<N-j-1)ind.push(b,rows[j+1][i+1],c);}sculpt('tensionWeb',p,ind,uv);}
  {const points=[];for(let i=0;i<=16;i++){const c=i/16,b=1-c;points.push([c-b*c*1.2,b+c*.34-b*c*1.9,-b*c*.62]);}tube('webEdge',points,.009,30,8);}
  // Six terrain variants share an exactly flat combat strip and matching X ends.
  for(let variant=0;variant<6;variant++){
   const p=[],uv=[],ind=[],N=16;
   function shape(axis,sign,u,v){const a=(axis+1)%3,b=(axis+2)%3,q=[0,0,0];q[axis]=sign*.5;q[a]=u*.5;q[b]=v*.5;
    const core=q.map(v=>clamp(v,-.37,.37)),n=norm(q.map((v,i)=>v-core[i]));let x=core[0]+n[0]*.13,y=core[1]+n[1]*.13,z=core[2]+n[2]*.13;
    const wave=Math.sin(x*8.1+variant*.97)+.4*Math.sin(x*17.3-variant*.7),edge=Math.max(0,(Math.abs(z)-.22)/.28);
    z+=wave*.067*edge+.012*Math.sin(x*25+y*8+variant)*edge;y+=(.10*Math.sin(x*7+variant)+.025*Math.sin(x*19-variant))*edge*(.5-y);x+=.055*Math.sin(z*10+variant)*Math.pow(Math.max(0,1-Math.abs(x)*2),2);
    if(y>.33){if(Math.abs(z)<.22)x=q[0];y=.5-.075*edge*(.5+.5*Math.sin(x*11+variant));}return[x,y,z];}
   for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const start=p.length;for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){p.push(shape(axis,sign,i/N*2-1,j/N*2-1));uv.push([i/N,j/N]);}for(let j=0;j<N;j++)for(let i=0;i<N;i++){let a=start+j*(N+1)+i,b=a+1,c=b+N+1,d=a+N+1;ind.push(...(sign>0?[a,b,c,a,c,d]:[a,c,b,a,d,c]));}}
   sculpt('bioDeck'+variant,p,ind,uv);
  }
  // Smooth billowing tissue wall; no repeated triangular rock boulders.
  for(let variant=0;variant<3;variant++){
   surface('tissueWall'+variant,(u,v)=>{let x=u-.5,y=v-.5;const edge=Math.sin(u*Math.PI)*Math.sin(v*Math.PI),s=Math.sin(u*12+Math.sin(v*5)+variant)*.045;
    return[x,y,.08+edge*(.22+.13*Math.sin(v*9+variant)+s)+.02*Math.cos(u*17-v*11)];},24,24);
   surface('membrane'+variant,(u,v)=>{const a=u*TAU,r=v*.5,shape=1+.08*Math.sin(a*3+variant);return[Math.cos(a)*r*shape,Math.sin(a)*r,-.28*(1-v*v)+.045*Math.sin(a*9+v*7+variant)*(1-v)*v];},40,18,true);
   surface('bioCavity'+variant,(u,v)=>{let a=u*TAU,r=.5-.22*Math.sin(v*Math.PI*.72);const lobes=1+.075*Math.sin(a*3+variant)+.035*Math.cos(a*7);return[Math.cos(a)*r*lobes,Math.sin(a)*r*(1+.07*Math.cos(a*4+variant)),.18-.9*v+.045*Math.sin(a*11+v*2)*Math.sin(v*Math.PI)];},48,20);
   surface('organ'+variant,(u,v)=>{const a=u*TAU,t=v*Math.PI,r=.5*Math.sin(t)*(1+.045*Math.sin(a*5+t*3+variant));return[Math.cos(a)*r*(.92+.08*Math.cos(t)),Math.cos(t)*.5,Math.sin(a)*r*(1+.055*Math.sin(t*5+variant))];},28,20);
  }
  // Normalised vascular covering matching an organ, slightly above its skin.
  {const g=geometry(),N=18,K=6;for(let branch=0;branch<5;branch++){let points=[];for(let j=0;j<=N;j++){let t=.15+j/N*2.78,a=branch/5*TAU+.24*Math.sin(t*2.4+branch),r=.505*Math.sin(t);points.push([Math.cos(a)*r,Math.cos(t)*.505,Math.sin(a)*r]);}
    for(let j=0;j<N;j++){const a=points[j],b=points[j+1],v=norm(b.map((x,k)=>x-a[k])),x=norm(cross([0,1,0],v)),z=cross(x,v),rad=.012*(1-.35*j/N);for(let k=0;k<K;k++){let aa=k/K*TAU,bb=(k+1)/K*TAU,pt=(c,r,q)=>c.map((v,i)=>v+r*(x[i]*Math.cos(q)+z[i]*Math.sin(q)));g.quad(pt(a,rad,aa),pt(b,rad,aa),pt(b,rad,bb),pt(a,rad,bb));}}}mesh('organVeins',g);}
 }

// Reusable mechanical meshes. Real open bores, not dark closed boxes.
 // Profiles wind from lower/inner toward upper/outer; signed derivative handles inner walls.
 function bossLathe(name,profile,N=48,smooth=false){
  const g=geometry(),TAU=Math.PI*2;
  for(let j=0;j<profile.length-1;j++)for(let k=0;k<N;k++){
   const [y0,r0]=profile[j],[y1,r1]=profile[j+1],a=k/N*TAU,b=(k+1)/N*TAU;
   const pt=(y,r,t)=>[r*Math.cos(t),y,r*Math.sin(t)],dy=y1-y0,dr=r1-r0;
   const n=t=>norm([dy*Math.cos(t),-dr,dy*Math.sin(t)]);
   const p=pt(y0,r0,a),q=pt(y1,r1,a),r=pt(y1,r1,b),z=pt(y0,r0,b);
   if(r0>1e-8||r1>1e-8){
    if(r1>1e-8)g.tri(p,q,r,n(a),n(a),n(b));
    if(r0>1e-8)g.tri(p,r,z,n(a),n(b),n(b));
   }
  }
  mesh(name,g);meshes[name].rc8=true;
 }
 bossLathe('bossBore',[[-.5,.36],[-.5,.47],[-.43,.50],[.43,.50],[.5,.47],[.5,.36],[-.5,.36]],40);
 bossLathe('bossCollar',[[-.5,.37],[-.5,.44],[-.24,.50],[.24,.50],[.5,.44],[.5,.37],[-.5,.37]],48);
 bossLathe('bossHull',[[-.50,0],[-.50,.18],[-.42,.30],[-.24,.45],[-.07,.50],[.07,.50],[.21,.465],[.39,.34],[.5,.13],[.5,0]],64);
 bossLathe('bossLens',[[-.5,0],[-.5,.39],[-.35,.48],[0,.5],[.3,.44],[.5,.24],[.52,0]],40);
 // A single bevelled curved armor sector, centered on +Z. Four separated sectors make a pod.
 {const g=geometry(),N=8,lo=-Math.PI*.235,hi=Math.PI*.235;
  const profile=[[-.5,.40],[-.5,.47],[-.42,.5],[.42,.5],[.5,.46],[.5,.40],[-.5,.40]];
  const point=(p,t)=>[p[1]*Math.sin(t),p[0],p[1]*Math.cos(t)];
  for(let j=0;j<profile.length-1;j++)for(let k=0;k<N;k++){
   const a=lo+(hi-lo)*k/N,b=lo+(hi-lo)*(k+1)/N;
   g.quad(point(profile[j],b),point(profile[j+1],b),point(profile[j+1],a),point(profile[j],a));
  }
  // End caps close only the exposed sector edge; the central axial bore remains open.
  for(const [t,flip] of [[lo,false],[hi,true]])for(let j=1;j<profile.length-2;j++){
   const p=[point(profile[0],t),point(profile[j],t),point(profile[j+1],t)];if(flip)p.reverse();g.tri(...p);
  }
  mesh('bossPodArmor',g);meshes.bossPodArmor.rc8=true;
 }

if(typeof addBiomeGeometry==='function')addBiomeGeometry(meshes);
return meshes;}
