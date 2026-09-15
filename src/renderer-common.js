/* Batched procedural scene authoring facade for the sole Three.js production backend.
   Only the shipped Three backend performs production rendering. */
function createRenderFacade(backend){
 const {clamp,color,matrix,mul,segment,norm,cross}=Math3D;
 const meshes=createGeometryLibrary(), staticObjects=[], staticLights=[], lights=[], heat=[], waterContacts=[];
 const foliage=new Set(['palm','leaf','grass','frond','tuft',...Array.from({length:3},(_,i)=>'firBough'+i),...Array.from({length:3},(_,i)=>'firSnow'+i)]);let staticRebuilds=0,lodSkipped=0;
 let staticKey=null,staticBatches=null;
 let motion=false,coop=false,recording=false, parent=null, quality='high',scale=1,view='side',bossMode=false,bossZoom=27, theme={},stats={}, VP=Math3D.id();
 for(const [name,b] of Object.entries(meshes)){b.n=0;b.capacity=b.rc8?(/^fir/.test(name)?4096:2048):['bevel','panel'].includes(name)?18000:10000;b.data=new Float32Array(b.capacity*24);backend.register(name,b);}
 function add(type,m,col,emit=0,kind=0,wind=0,alpha=1){
  if(parent)m=mul(parent,m);
  const c=color(col);
  if(recording){staticObjects.push({type,m,c,emit,kind,wind,alpha,x:m[12],y:m[13],z:m[14],r:Math.max(Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10]))});return;}
  const b=meshes[type];if(!b||b.n>=b.capacity)return;
  const o=b.n++*24;b.data.set(m,o);b.data[o+16]=c[0];b.data[o+17]=c[1];b.data[o+18]=c[2];b.data[o+19]=emit;b.data[o+20]=kind;b.data[o+21]=wind;b.data[o+22]=alpha;b.data[o+23]=type==='panel'?2:0;
 }
 const box=(x,y,z,sx,sy,sz,col,rz=0,ry=0,rx=0,kind=0,emit=0)=>add('panel',matrix(x,y,z,sx,sy,sz,rz,ry,rx),col,emit,kind);
 const ball=(x,y,z,sx,sy,sz,col,emit=0,kind=0)=>add('sphere',matrix(x,y,z,sx,sy,sz),col,emit,kind);
 const beam=(a,b,r,col,kind=0,emit=0)=>add('cyl',segment(a,b,r*2),col,emit,kind);
 function begin(cx,cy=0){
  lights.length=0;heat.length=0;for(const l of staticLights)if((view==='depth'||Math.abs(l.x-cx)<32+l.radius)&&(view!=='vertical'||Math.abs(l.y-cy)<24+l.radius))lights.push(l);
  const key=view+':'+quality+':'+Math.floor(cx/3)+':'+Math.floor(cy/3);
  for(const b of Object.values(meshes))b.staticDirty=false;
  if(key!==staticKey){
   staticRebuilds++;lodSkipped=0;for(const b of Object.values(meshes))b.n=0;
   for(const o of staticObjects){
    if(view!=='depth'&&Math.abs(o.x-cx)>26+Math.max(0,-o.z)*.57+o.r*.65)continue;
    if(view==='vertical'&&Math.abs(o.y-cy)>22+Math.max(0,-o.z)*.45+o.r*.65)continue;
    if(foliage.has(o.type)&&o.z<-10){const hash=Math.abs(Math.sin(o.x*12.9898+o.y*78.233+o.z*23.1)*43758.5453)%1;const keep=quality==='low'?.35:(o.z<-22?.42:.72);if(hash>keep){lodSkipped++;continue;}}
    add(o.type,o.m,o.c,o.emit,o.kind,o.wind,o.alpha);
   }
   staticBatches=Object.fromEntries(Object.entries(meshes).map(([k,b])=>{b.staticDirty=true;b.staticN=b.n;return[k,{n:b.n}];}));staticKey=key;
  }
  for(const [k,b]of Object.entries(meshes)){const a=staticBatches[k];b.n=a.n;}
 }
 function render(cx,cy,t,shake=0,hurt=0,flash=0,depthZ=0){
  const width=Math.max(320,Math.round(innerWidth*Math.min(devicePixelRatio||1,1.5)*scale));
  const height=Math.max(240,Math.round(innerHeight*Math.min(devicePixelRatio||1,1.5)*scale));
  const zoom=(view==='vertical'?25.5:view==='depth'?22:bossMode?bossZoom:coop?26:21.5)*Math.max(1,(16/9)/(width/height));
  const eye=view==='depth'?[0,bossMode?3.65:3.25,(bossMode?10.5:10.8)+depthZ*.76]:[cx+.6+Math.sin(t*75)*shake*(motion?0:1),4.8+cy,zoom];
  const at=view==='depth'?[0,bossMode?3.20:2.25,-13+depthZ*.76]:[cx,2.6+cy,0];
  const shadowCenter=view==='depth'?[0,0,-8]:[cx,cy,-4];
  const ld=theme.lightDir||[-.48,1,.62],ll=Math.hypot(...ld)||1,ln=ld.map(v=>v/ll);
  const lightPos=[shadowCenter[0]+ln[0]*34,shadowCenter[1]+ln[1]*34,shadowCenter[2]+ln[2]*34];
  const light=Math3D.mul(Math3D.ortho(-24,24,-21,21,.1,100),Math3D.look(lightPos,shadowCenter));
  // Snap directional shadow translation to texels; camera subpixel motion no longer
  // drags the sampling grid across planar snow or large curved rock receivers.
  const shadowResolution=quality==='ultra'?2048:quality==='high'?1536:256;
  light[12]=Math.round(light[12]*shadowResolution*.5)*2/shadowResolution;
  light[13]=Math.round(light[13]*shadowResolution*.5)*2/shadowResolution;
  VP=Math3D.mul(Math3D.perspective((view==='depth'?42:34)*Math.PI/180,width/height,.1,220),Math3D.look(eye,at));
  const params={width,height,eye,at,VP,light,t,quality,waterImpacts:waterContacts.filter(e=>Math.abs(e.x-cx)<55).slice(0,8),hurt:motion?hurt*.35:hurt,flash:motion?0:flash,theme,view,lights,heat,reducedMotion:motion};
  backend.render(meshes,params);
  let instances=0,triangles=0;for(const b of Object.values(meshes)){instances+=b.n;triangles+=b.n*b.vertices.length/24;}
  stats={...backend.stats,instances,triangles:Math.round(triangles+(backend.stats.characterTriangles||0)*(backend.stats.skinnedActors||0)),width,height,quality,scale,staticRebuilds,lodSkipped,engine:backend.name};
 }
 function project(x,y,z=0){const q=[];for(let r=0;r<4;r++)q[r]=VP[r]*x+VP[r+4]*y+VP[r+8]*z+VP[r+12];return{x:(q[0]/q[3]*.5+.5)*innerWidth,y:(.5-q[1]/q[3]*.5)*innerHeight,visible:q[3]>0};}
 function unproject(x,y,z){return new THREE.Vector3(x,y,z).unproject(backend.camera).toArray();}
 function aimPoint(px,py,z){const x=px/innerWidth*2-1,y=1-py/innerHeight*2,a=unproject(x,y,-1),b=unproject(x,y,1),f=(z-a[2])/(b[2]-a[2]||1e-6);const r=a.map((v,i)=>v+(b[i]-v)*f);return r.every(Number.isFinite)?r:[0,0,0];}
 return{canvas:backend.canvas,backend,meshes,color,matrix,mul,segment,add,box,ball,beam,begin,render,project,aimPoint,norm,cross,clamp,staticObjects,
  waterImpact(x,y,z,r){if(waterContacts.length<16&&[x,y,z,r].every(Number.isFinite))waterContacts.push({x,y,z,r});},
  light(x,y,z,color,intensity=1,radius=5,priority=1,pulse=false){if(parent){const m=mul(parent,matrix(x,y,z,1,1,1));x=m[12];y=m[13];z=m[14];}const list=recording?staticLights:lights;if(list.length<(recording?512:96)&&[x,y,z,intensity,radius].every(Number.isFinite))list.push({x,y,z,color,intensity:motion&&priority>=2?intensity*.45:intensity,radius,priority,pulse});},heat(x,y,z,radius=1){if(heat.length<4&&[x,y,z,radius].every(Number.isFinite))heat.push({x,y,z,radius});},
  setActors(list,t,view){backend.setActors(list,t,view);},setMotion(v){motion=!!v;},setCoop(v){coop=!!v;},record(v){recording=v;staticKey=null;},clear(){staticObjects.length=0;staticLights.length=0;waterContacts.length=0;staticKey=null;staticBatches=null;},setView(v){view=v;bossMode=false;},setBoss(v,z=27){bossMode=!!v;bossZoom=z;},setTheme(t){theme=t;},setQuality(q){quality=['low','high','ultra'].includes(q)?q:'high';},setScale(s){scale=clamp(s,.4,1.25);},
  transform(m,fn){const old=parent;parent=old?mul(old,m):m;try{fn();}finally{parent=old;}},get stats(){return stats;},get device(){return backend.device;}};
}
