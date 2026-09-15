/* Environment motion. All clocks are simulation time, all emitter origins are world-space.
 * No Math.random(), frame accumulation, camera-parented weather or per-frame registry growth.
 * Static shells remain cached; only moving internals are appended to dynamic instance ranges.
 */
const Environment = (() => {
 const items=[];
 const mod=(x,n=1)=>((x%n)+n)%n;
 const phase=(t,seed=0,period=1)=>mod(t/period+seed);
 const fade=u=>Math.sin(Math.PI*Math.max(0,Math.min(1,u)))**2;
 const wind=(t,x=0,z=0)=>Math.sin(t*.62+x*.031+z*.05)*.65+Math.sin(t*1.13+x*.049)*.20;
 function reset(){items.length=0;WaterEnvironment.reset();}
 function add(type,spec){items.push({type,...spec,seed:spec.seed??mod(spec.x*.137+(spec.y||0)*.37+(spec.z||0)*.061)});}
 const M=(...a)=>R.matrix(...a),B=(...a)=>R.box(...a),A=(...a)=>R.add(...a),S=(...a)=>R.ball(...a),L=(...a)=>R.beam(...a);
 const F=(x,y,z,sx,sy,sz,spin=0)=>Math3D.oriented(x,y,z,sx,sy,sz,{axis:'z',spin});
 function mist(x,y,z,sx,sy,opacity,color='#bad9d6',kind=20){A('quad',M(x,y,z,sx,sy,1),color,0,kind,0,opacity);}
 function visible(e,g){return g.stage.mode==='depth'||(Math.abs(e.x-g.cam)<29+Math.max(0,-e.z)*.5+(e.w||0)&& (g.stage.mode!=='vertical'||Math.abs((e.y||0)-g.camY)<28+(e.h||0)));}
 function waterfall(e,t,g){
  const {x,y,z,w}=e;
  // Ballistic spray starts at the physical impact point, rather than wrapping an un-faded quad.
  for(let i=0;i<12;i++){
   const u=phase(t,i*.618+e.seed,1.35),age=u*1.35,side=Math.sin(i*2.399),xx=x+side*w*.38+side*age*.62;
   const yy=y+.11+2.35*age-2.05*age*age,zz=z+.25+Math.cos(i*1.71)*w*.15+age*.34;
   if(yy>y+.05)mist(xx,yy,zz,.065,.14,fade(u)*.55,'#d1e7e0',6);
  }
  for(let i=0;i<7;i++){
   const u=phase(t,i*.414+e.seed,2.9),xx=x+(i/6-.5)*w*.98+wind(t,x,z)*u*.8;
   mist(xx,y+.2+u*.85,z+.7+u*.6,w*(.34+u*.24),.48+u*.75,fade(u)*.15,'#c5ded8');
  }
  for(let i=0;i<4;i++){
   const u=phase(t,i*.25+e.seed,1.55),sz=.28+u*w*.68;
   A('quad',M(x+Math.sin(i*2.4)*w*.30,y+.070+i*.003,z+.35,sz,sz*.65,1,0,0,-Math.PI/2),'#c3e0d8',0,48,0,fade(u)*.36);
  }
 }
 function fan(e,t){
  const angle=t*(e.speed||2.15)+e.seed*6.283;
  for(let i=0;i<5;i++){
   const a=angle+i*6.283/5;
   B(e.x+Math.cos(a)*e.r*.25,e.y+Math.sin(a)*e.r*.25,e.z+.075,e.r*.48,e.r*.135,.045,'#667f86',a+.30,0,0,2);
  }
 }
 function steam(e,t){
  for(let i=0;i<7;i++){
   const u=phase(t,i/7+e.seed,2.6),a=fade(u),drift=wind(t,e.x,e.z);
   mist(e.x+u*(.45+drift*.42),e.y+u*2.6,e.z+u*.18,.24+u*1.05,.22+u*.90,a*.12,e.color||'#b8cac7');
  }
 }
 function crane(e,t){
  const x=e.x+Math.sin(t*.36+e.seed*6.283)*2.1,y=e.y-.30*Math.sin(t*.36+e.seed*6.283),lean=Math.sin(t*.72+e.seed*6.283)*.12;
  B(x,8,-5.9,2.1,.42,.9,'#b59a60',0,0,0,2);
  L([x,7.8,-5.9],[x+lean,y+.4,-5.5],.045,'#a2a89a',2);
  A('ring',F(x+lean,y,-5.45,.38,.10,.38),'#b59a60',0,2);
 }
 function reactor(e,t){
  if(e.assembly==='rc7'){EnvironmentAssets.drawReactor(e,t);return;}
  const col=e.color||'#edb17b';R.light(e.x,e.y,e.z+.3,col,14,e.r>2?7:5.7,1,true);
  const a=t*.48+e.seed*6.283;
  for(let i=0;i<6;i++){
   const q=a+i*Math.PI/3,rad=e.r*.29;
   B(e.x+Math.cos(q)*rad,e.y+Math.sin(q)*rad,e.z,e.r*.32,.10,.07,'#6a8588',q+.5,0,0,2);
   S(e.x+Math.cos(q)*e.r*.42,e.y+Math.sin(q)*e.r*.42,e.z+.02,.10,.10,.05,'#e8b580',3.2,22);
  }
 }
 function panel(e,t){
  const u=phase(t,e.seed,3.7),yy=e.y+e.h*(.23-u*.35);
  B(e.x,yy,e.z+.185,e.w*.56,.022,.018,e.color,0,0,0,23,1.8);
 }
 function sac(e,t){
  if(e.anatomy){EnvironmentAssets.drawSac(e,t);return;}
  // Spatial phase lag makes connected tissue peristaltic instead of every organ pulsing together.
  const pulse=1+.037*Math.sin(t*2.05-e.x*.27+e.seed*2),s=e.scale||1;R.light(e.x,e.y+.25*s,e.z+.7,'#81c6ab',7,4.3,1,true);
  S(e.x,e.y,e.z,.90*s*pulse,1.55*s*(2-pulse),.55*s,'#815870',0,12);
  S(e.x,e.y+.25*s,e.z+.36*s,.40*s*pulse,.66*s,.22*s,'#81c6ab',1.25,22);
  const u=phase(t,e.seed,3.1),dropY=e.y-.65*s-u*u*(e.y-.15);
  if(dropY>.15)S(e.x+.1*s,dropY,e.z+.18,.055,.11,.055,'#829b80',0,12);
 }
 function weather(g,t){
  const stage=g.stage.index,vertical=g.stage.mode==='vertical',cam=g.cam;
  if(stage===4){
   // Four stable depth bands including a very sparse near-camera band. Slow common
   // wind is shared with branch deformation; per-flake flutter is bounded.
   const cell=Math.floor(cam/10),shelters=items.filter(e=>e.type==='snowShelter');
   for(let k=cell-3;k<=cell+3;k++)for(let i=0;i<15;i++){
    const layer=i%4,z=[-18,-9,-1.4,3.2][layer],seed=mod(k*.371+i*.618);
    if(layer===3&&i>3)continue;
    const u=phase(t,seed,7.5+layer*.8),xx=k*10+i*.63+u*1.3+wind(t,k*10,z)*.64,yy=12-u*15;
    if(shelters.some(e=>Math.abs(xx-e.x)<e.w/2&&Math.abs(z-e.z)<e.d/2&&yy<e.y))continue;
    const base=[.055,.070,.085,.14][layer],flutter=.65+.35*Math.abs(Math.sin(t*1.7+seed*12));
    A('quad',M(xx,yy,z,base*flutter,base*1.3,1,t*.43+seed*6.28),'#c7dce4',0,46,seed,fade(u)*(layer===3?.30:.56));
   }
   // Low ground drift, only on actual snow supports (no puffs hovering over pits).
   for(let i=0;i<5;i++){const x=Math.floor(cam/9)*9+(i-2)*7.3,u=phase(t,i*.27,4.7),floor=g.terrain(x);
    if(floor>-8)mist(x+u*1.8,floor+.12+u*.06,-1.65,.9+u*.9,.10+u*.12,fade(u)*.075,'#d1e1e5',47);
   }
  }else if(vertical){
   const cell=Math.floor(g.camY/8);
   for(let k=cell-3;k<=cell+3;k++)for(let i=0;i<3;i++){
    const u=phase(t,k*.317+i*.35,8.2),x=-6+i*6+wind(t,i*6,-5)*.30;
    mist(x,k*8+u*7,-6-i*5,.034,.035,fade(u)*.15,'#b8c9b1',6);
   }
  }else if(stage===0){
   const cell=Math.floor(cam/16);
   for(let k=cell-2;k<=cell+2;k++)for(let i=0;i<3;i++){
    const u=phase(t,k*.317+i*.35,8.2),x=k*16+i*4+wind(t,k*16,-5)*.5;
    mist(x,.4+u*6,-6-i*5,.034,.035,fade(u)*.15,'#b8c9b1',6);
   }
  }else if(stage===1||stage===3||stage===5||stage===6){
   const cell=g.stage.mode==='depth'?0:Math.floor(cam/16);
   for(let k=cell-2;k<=cell+2;k++)for(let i=0;i<4;i++){
    const u=phase(t,k*.233+i*.19,11),x=g.stage.mode==='depth'?-6+i*3:(k*16+i*3.7);
    mist(x+Math.sin(t*.3+i)*.18,.8+u*7,-4-mod(k*.31+i*.19)*16,.030,.035,fade(u)*.14,'#acb8b6',6);
   }
  }else if(stage===7){
   const cell=Math.floor(cam/14);
   for(let k=cell-2;k<=cell+2;k++)for(let i=0;i<5;i++){
    const u=phase(t,k*.381+i*.271,7.8),x=k*14+i*2.8+Math.sin(t*.43+i)*.30;
    mist(x,.3+u*7,-4-i*2,.055,.07,fade(u)*.26,i%3?'#b19aa8':'#a4bbaa',6);
   }
  }
 }

 function contacts(g){
  const sys=g.surfaceContacts;
  for(const m of sys?.marks||[]){
   if(Math.abs(m.x-g.cam)>27)continue;
   const fade=Math.pow(Math.max(0,1-(g.t-m.born)/m.life),.68);
   // Revalidate the *same* supporting surface at this height. Falling bridges and
   // removed platforms must not leave a floating decal behind.
   const q=sys.sample(g,m.x,m.y,m.z);if(!q||q.id!==m.surfaceId)continue;
   A('quad',M(m.x,m.y+.014,m.z,.62,.40,1,0,m.face<0?Math.PI:0,-Math.PI/2),'#d1e1e6',0,45,0,m.pressure*fade);
  }
  for(const e of g.visualEvents||[]){const age=g.t-e.born;if(age<0||age>=e.life)continue;
   if(e.kind==='surface'){
    const snow=e.surface==='snow',count=e.contact==='land'?12:e.contact==='launch'?7:4;
    if(e.surface==='metal'||e.surface==='organic')continue;
    const col=snow?'#d2e3e9':e.surface==='wood'?'#afa18a':'#99a99f';
    for(let i=0;i<count;i++){
     const angle=i*2.399+e.seed*.73,sp=(.22+(i%3)*.11)*e.power,life=.30+(i%4)*.075;
     if(age>life)continue;
     const y=e.y+(.35+(i%4)*.18)*e.power*age-1.7*age*age;
     if(y<e.y-.025)continue;
     const x=e.x+Math.cos(angle)*sp*age*2.2,z=e.z+Math.sin(angle)*sp*age;
     const size=(snow?.09:.055)+age*(snow?.30:.21);
     mist(x,y,z,size,size*.72,Math.sin(Math.PI*age/life)*(snow?.55:.28),col,47);
    }
   }else if(e.kind==='waterHit'){
    const u=age/e.life,size=.25+age*2.6*e.power;
    A('quad',M(e.x,e.y,e.z,size,size,1,0,0,-Math.PI/2),'#b9d9cf',0,48,0,(1-u)*.48);
    for(let i=0;i<5;i++){const a=i*2.399,y=e.y+age*1.4-3.8*age*age;if(y>e.y)mist(e.x+Math.sin(a)*age*.65,y,e.z+Math.cos(a)*age*.4,.055,.12,(1-u)*.55,'#c5ded4',46);}
   }else if(e.kind==='blast'&&g.stage.index===4){
    const q=sys?.sample(g,e.x,g.terrain(e.x),e.z);if(!q||q.material!=='snow'||Math.abs(e.y-q.y)>1.6)continue;
    if(age<.65)for(let i=0;i<8;i++){const a=i*2.399,u=age/.65;mist(e.x+Math.cos(a)*age*2.1,q.y+.06+Math.sin(u*Math.PI)*.32,e.z+Math.sin(a)*age,.30+age*.5,.13+age*.22,Math.sin(u*Math.PI)*.26,'#d0e0e5',47);}
   }
  }
  if(g.stage.index===4)for(const p of g.players||[]){if(p.dead)continue;const u=phase(g.t,p.id*.38,4.0)*4.;
   if(u<.8){const f=Math.sin(u/.8*Math.PI);mist(p.x+(p.face||1)*(.24+u*.34),p.y+(p.duck?.53:1.67)+u*.10,p.z+.08,.11+u*.27,.09+u*.16,f*.11,'#d0e0e5',47);}
  }
 }
 function draw(g){
  const t=g.t;let rendered=0;
  for(const e of items){if(!visible(e,g))continue;rendered++;
   if(e.type==='rc8Fan')BiomeAssets.drawFan(e,t);else if(e.type==='rc8Crane')BiomeAssets.drawCrane(e,t);else if(e.type==='rc8Projector')BiomeAssets.drawProjector(e,t);else if(e.type==='waterfall')waterfall(e,t,g);else if(e.type==='fan')fan(e,t);else if(e.type==='steam')steam(e,t);
   else if(e.type==='crane')crane(e,t);else if(e.type==='reactor')reactor(e,t);else if(e.type==='panel')panel(e,t);else if(e.type==='sac')sac(e,t);
  }
  contacts(g);weather(g,t);return rendered;
 }
 return{reset,add,draw,contacts,phase,fade,wind,get items(){return items.map(e=>({...e}));}};
})();


/* Authored water bodies. No topology/height guesses in the VFX renderer.
 * Pools and watercourses own their Y; emitters refer to these exact same records. */
const WaterEnvironment=(()=>{
 const bodies=[],falls=[];let serial=0;
 const M=(...a)=>R.matrix(...a),A=(...a)=>R.add(...a),B=(...a)=>R.box(...a);
 function reset(){bodies.length=0;falls.length=0;serial=0;}
 function surface(x,y,z,w,d,color='#699d9a',id=null){
  if(![x,y,z,w,d].every(Number.isFinite)||w<=0||d<=0)throw new RangeError('Water surface requires finite position and positive extent');
  const body={id:id||'water-'+(++serial),x,y,z,w,d};bodies.push(body);
  // Bounded world-space edges: large rivers are tiles, not a stretched 28×28 grid.
  const nx=Math.ceil(w/24),nz=Math.ceil(d/14);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)A('water',M(x-w/2+(i+.5)*w/nx,y,z-d/2+(j+.5)*d/nz,w/nx,1,d/nz),color,0,4);
  return body;
 }
 function waterfall(x,y,z,h,w){
  const id='cascade-'+(++serial),pool=surface(x,y,z+.85,w*3.5,Math.max(6,w*1.8),'#537f79',id+'-pool');
  const e={id,x,y,z,w,h,poolId:pool.id,source:{x,y:y+h,z},impact:{x,y:pool.y,z},seed:((x*.173)%1+1)%1};
  falls.push(e);Environment.add('waterfall',e);R.waterImpact?.(x,y,z,w*.8);
  // Jungle mouths sit recessed inside the cleft so the sheet edges are buried in
  // the groove walls instead of lying on the cliff face like a decal.
  const zz=h<40?z-1.05:z;
  A('fall',M(x,y+h*.5,zz,w,h,1),'#9dbfb8',0,7);
  A('spillLip',M(x,y+h,zz,w,1,1),'#a4c4ba',0,7);
  // One recessed rock face, flared shoulders and a rock-concealed feed lip.
  // No flat water edge floating above a mountain and no offset, leaning second strip.
  if(h<40){
   A('cascadeRock',M(x,y+h*.47,z-3.3,w*3.2,h+9.0,5.4),'#618474',0,38);
   // Mossy shoulder caps conceal the entrance into the water lip. Their top is
   // below the back crest, breaking the old two-parallel-pillars silhouette.
   for(const side of [-1,1]){
    A('stone',M(x+side*w*.72,y+h-.6,z-.55,w*.82,2.4,2.6,side*.18),'#748f73',0,3);

   }
  }
  for(const side of [-1,1])A('stone',M(x+side*w*.85,y+.09,z+.1,w*.84,.86,w*.70,side*.08),'#557f6d',0,3);
  // Shallow irregular bed is actually under the receiving water plane.
  A('stone',M(x,y-.9,z+.85,w*3.7,1.20,Math.max(6,w*1.8)),'#668e77',0,11);
  const n=7;
  for(let i=0;i<n;i++){const a=Math.PI*.11+i/(n-1)*Math.PI*.78;
   A('stone',M(x+Math.cos(a)*w*1.48,y-.17,z+Math.sin(a)*w*.93,w*.52,.66,w*.48,Math.sin(i)*.12),'#72917a',0,3);
  }
  // Stream leaves the impact pool toward the foreground bank (occluded by the bank).
  const end=-3.25,from=z+.85+pool.d*.5;if(from<end-.01){surface(x,y,(from+end)/2,w*.78,end-from,'#5a9084',id+'-outlet');}
  return e;
 }
 function backland(){
  // The old unbroken slab buried all receiving pools. Cut authored river clefts out
  // of it, retaining ground behind vegetation outside these strictly background cuts.
  const cuts=[[24,3.4],[120,4.7],[208,3.0]].map(([x,w])=>[x-w*1.9,x+w*1.9]);let cursor=-45;
  for(const [lo,hi]of [...cuts,[335,335]]){if(lo>cursor)B((lo+cursor)/2,-4.2,-14.5,lo-cursor,8.4,22.5,'#355d49',0,0,0,3);cursor=hi;}
 }
 return{reset,surface,waterfall,backland,get bodies(){return bodies.map(b=>({...b}));},get falls(){return falls.map(e=>({...e}));}};
})();
