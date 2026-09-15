/* Mechanical boss assemblies. Gameplay targets are authoritative WORLD sockets.
 * Geometry has real openings. Drawing never changes HP, collision extents, timing or RNG.
 */
const BossMechanics=(()=>{
 const M=Math3D.matrix,mul=Math3D.mul,clamp=Math3D.clamp;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
 const C={paint:'#657e79',edge:'#acb69d',steel:'#647d84',dark:'#20353e',inner:'#14262d',bronze:'#bcaa7f',amber:'#eeb578',blue:'#86c5d6',burn:'#303b3d'};
 let root=Math3D.id();
 function A(type,m,c,kind=2,e=0,tag='structure',alpha=1){
  R.add(type,mul(root,m),c,e,kind,0,alpha);
 }
 const B=(x,y,z,w,h,d,c=C.paint,tag='structure',rz=0,ry=0,rx=0)=>A('panel',M(x,y,z,w,h,d,rz,ry,rx),c,2,0,tag);
 const L=(a,b,r,c=C.steel,tag='strut')=>A('cyl',Math3D.segment(a,b,r*2),c,2,0,tag);
 function oriented(type,x,y,z,w,h,d,c,axis='z',tag='ring',e=0){A(type,Math3D.oriented(x,y,z,w,h,d,{axis}),c,2,e,tag);}
 function pose(m,fn){const old=root;root=mul(root,m);try{fn();}finally{root=old;}}
 function socket(x,y,z,r,c,e,tag){
  // Small emissive lens centered exactly at the logical socket. The surrounding rim is hollow.
  oriented('bossLens',x,y,z,r*2,.12,r*2,c,'z',tag,e);
 }
 function frame(x,y,z,w,h,d,c=C.paint,tag='frame',thick=.20){
  // Four bars around an EMPTY opening. No filled box under this opening.
  B(x-w/2-thick/2,y,z,thick,h+thick*2,d,c,tag);
  B(x+w/2+thick/2,y,z,thick,h+thick*2,d,c,tag);
  B(x,y-h/2-thick/2,z,w,thick,d,c,tag);
  B(x,y+h/2+thick/2,z,w,thick,d,c,tag);
 }
 function bolts(x,y,z,w,h,c=C.bronze,tag='fastener'){
  for(const sx of [-1,1])for(const sy of [-1,1])oriented('cyl',x+sx*w/2,y+sy*h/2,z,.115,.07,.115,c,'z',tag);
 }
 function piston(a,b,r=.1,tag='piston'){
  const p=a.map((v,i)=>v+(b[i]-v)*.60);L(a,p,r*1.9,C.paint,tag+'-barrel');L(p,b,r,C.edge,tag+'-rod');
  for(const p of [a,b])oriented('cyl',...p,r*3,.17,r*3,C.bronze,'z',tag+'-pin');
 }
 function conduit(points,r=.035,c=C.steel,tag='conduit'){for(let i=1;i<points.length;i++)L(points[i-1],points[i],r,c,tag);}
 // Inverse of an orthonormal root pose. Targets have already been moved by game.js.
 // Converting their world position to local before applying the root avoids double banking.
 function localSocket(m,q){const d=[q.x-m[12],q.y-m[13],q.z-m[14]];return [0,4,8].map(k=>d[0]*m[k]+d[1]*m[k+1]+d[2]*m[k+2]);}
 function windowAmount(g,q){
  if(g.boss.dead||g.targetOpen(q))return 1; // NO obstructing slat while damage is allowed.
  if(g.targetState(q)==='prerequisite')return 0;
  const c=g.boss.t%3.6;
  // Close just after invulnerability, pre-open just before vulnerability; status remains truthful.
  return c<2.72?1-smooth((c-2.55)/.17):smooth((c-3.36)/.24);
 }
 function death(g){return g.boss.dead?smooth(g.boss.deathTime/1.55):0;}
 function clock(g){return g.boss.dead?g.t-g.boss.deathTime:g.t;}
 function socketFrame(q,r=.7,tag='socket'){
  frame(q.x,q.y,-.45,r*2+ .20,r*2+.20,.70,C.paint,tag+'-case',.19);
  B(q.x,q.y,-1.03,r*2,r*2,.10,C.inner,tag+'-rear');
  oriented('bossBore',q.x,q.y,-.47,r*2,.90,r*2,C.steel,'z',tag+'-inner-wall');
  bolts(q.x,q.y,-.03,r*2+.37,r*2+.37,C.bronze,tag+'-bolts');
 }
 function brokenPod(q,tag){
  // The broken face is omitted; 3 exposed ribs and a rear severed turbine are visible.
  for(const s of [-1,1])B(q.x+s*.53,q.y,-.38,.14,1.1,.8,C.steel,tag+'-broken-edge',s*.20);
  oriented('bossCollar',q.x,q.y,-.82,.70,.14,.70,C.burn,'z',tag+'-severed-ring');
  for(let j=0;j<3;j++)B(q.x-.27+j*.24,q.y-.23+j*.13,-.20,.19,.25,.22,j%2?C.edge:C.burn,tag+'-visible-fracture',-.45+j*.24);
  conduit([[q.x+.38,q.y+.38,-.35],[q.x+.17,q.y-.1,-.12],[q.x+.35,q.y-.67,-.1]],.035,'#806e52',tag+'-torn-cable');
 }
 function fortress(g){
  const b=g.boss,c=b.targets.find(q=>q.kind==='core'),parts=b.targets.filter(q=>q.kind!=='core'),d=death(g),t=clock(g);
  // Static fortress architecture starts further right. All three functional bores are in front of it.
  const x=c.x;
  // Skeletal back frame and local bulkheads, rather than a single sealed volume around the guns.
  B(x+.90,3.45,-1.10,.26,6.7,.34,C.edge,'fort-spine');
  for(const y of [.45,2.42,4.36,6.37]){
   B(x+.35,y,-.47,2.30,.20,1.05,C.paint,'fort-bulkhead');
   B(x+.22,y,.04,2.08,.10,.12,C.edge,'fort-bulkhead-trim');
  }
  B(x+1.30,3.4,-.88,.38,6.5,.60,C.dark,'fort-feed-trunk');
  for(const q of parts){
   const tag='cannon-'+q.id,alive=q.hp>0&&!b.dead,low=q.hp/q.maxHp<.5;
   // Bore axis is X; the actual muzzle is q, not a second hard-coded point.
   socketFrame(q,.67,tag);
   if(alive){
    oriented('bossBore',q.x+.40,q.y,q.z,.61,.80,.61,low?C.burn:C.steel,'x',tag+'-barrel');
    oriented('bossCollar',q.x,q.y,q.z,.77,.12,.77,C.edge,'x',tag+'-muzzle');
    oriented('bossCollar',q.x+.70,q.y,q.z,.89,.16,.89,C.paint,'x',tag+'-receiver');
    // Recoil struts are beside the barrel, not in its bore.
    for(const sy of [-1,1])piston([q.x+.90,q.y+sy*.40,-.17],[q.x+.25,q.y+sy*.40,-.17],.046,tag+'-recoil');
    B(q.x+.72,q.y,-.40,.49,.58,.30,C.paint,tag+'-yoke');
    // Aimed aperture glows inside the muzzle only during wind-up. It is not a permanent ball.
    if(b.telegraph)oriented('bossLens',q.x,q.y,q.z,.28,.03,.28,C.amber,'x',tag+'-windup',.6);
   }else brokenPod(q,tag);
   B(q.x+1.22,q.y,-.48,.38,1.45,.44,C.paint,tag+'-feed');
   conduit([[q.x+1.40,q.y+.46,-.22],[q.x+1.18,q.y+.70,-.20],[q.x+.48,q.y+.70,-.25]],.047,C.bronze,tag+'-feed-hose');
  }
  socketFrame(c,.73,'fort-core');
  // Core port stays open in BOTH phases, exactly as the actual first Boss rules require.
  oriented('bossCollar',c.x,c.y,-.09,1.51,.22,1.51,C.bronze,'z','fort-core-rim');
  oriented('bossCollar',c.x,c.y,-.014,1.02,.08,1.02,C.dark,'z','fort-core-inner-bezel');
  socket(c.x,c.y,c.z,.38,b.dead?C.burn:'#e6a26c',b.dead?0:.26,'core-anchor');
  for(const sy of [-1,1]){
   B(c.x,c.y+sy*.88,-.25,1.27,.22,.36,C.paint,'fort-core-retracted-shutter');
   piston([c.x+1.02,c.y+sy*.36,-.28],[c.x+.68,c.y+sy*.82,-.22],.055,'fort-core-actuator');
  }
  // Internal vanes are behind the lens and never substitute for a full-screen glow.
  for(let i=0;i<8;i++){const a=i*Math.PI/4+(b.dead?0:t*.28);
   B(c.x+Math.cos(a)*.55,c.y+Math.sin(a)*.55,-.23,.10,.22,.13,C.edge,'fort-core-vane',a);}
  for(const sy of [-1,1])B(x+.87,c.y+sy*.54,-.05,.14,.20,.12,C.bronze,'fort-core-latch');
  if(b.dead){
   // Direct core kill must also disable otherwise undamaged guns.
   for(const sy of [-1,1])B(c.x+sy*(.39+d*.18),c.y-.64-d*.31,-.01,.43,.16,.24,C.burn,'fort-core-wreck',sy*d*.50);
  }
 }
 function saucerRoot(g){const b=g.boss,h=b.targets.find(q=>q.kind==='core');return M(h.x,h.y,h.z,1,1,1,(b.bank||0)*.9);}
 function saucer(g){
  const b=g.boss,h=b.targets.find(q=>q.kind==='core'),pm=saucerRoot(g),d=death(g),t=clock(g),dead=b.dead;
  // Parent root is banked ONCE. Non-colliding hull hangs behind the logical target plane.
  pose(pm,()=>{
   pose(M(0,-d*1.08,-2.18,1,1,1,dead?d*.11:0),()=>{
    A('bossHull',M(0,0,0,8.3,1.34,3.8),C.paint,2,0,'saucer-hull');
    oriented('bossCollar',0,-.05,0,8.36,.11,3.86,C.dark,'y','saucer-equatorial-seam');
    oriented('bossCollar',0,.07,0,7.98,.10,3.65,C.edge,'y','saucer-upper-trim');
    A('sphere',M(0,.94,-.23,2.75,1.55,2.10),'#4e7c89',2,0,'saucer-canopy');
    // Sparse canopy frames seat on the dome; endpoints are supported.
    for(const sx of [-1,1])conduit([[sx*1.21,.74,.04],[sx*.83,1.49,.06],[sx*.32,1.73,-.1]],.047,C.dark,'saucer-canopy-rib');
    B(0,.64,-.20,2.65,.16,1.90,C.dark,'saucer-canopy-sill');
    for(let i=0;i<12;i++){
     const a=(i/12)*Math.PI*2,xx=Math.cos(a)*3.67,zz=Math.sin(a)*1.57;
     B(xx,.20,zz,.37,.11,.35,i%3?C.steel:C.bronze,'saucer-mounted-armor',0,-a);
     L([xx*.81,.44,zz*.77],[xx,.20,zz],.033,C.dark,'saucer-seam');
    }
    // Attached side vents, not disconnected plates outside the radius.
    for(const sx of [-1,1]){B(sx*2.72,.40,-.1,1.11,.19,.63,C.dark,'saucer-vent-box');
     for(let j=0;j<4;j++)B(sx*2.72+(.15*j-.225),.52,-.1,.07,.07,.49,C.steel,'saucer-vent-fin');}
    for(let i=-3;i<=3;i++)socket(i*.70,-.14,1.73,.045,dead?C.burn:C.blue,dead?0:.18,'saucer-navigation-light');
   });
   for(const [i,q] of b.targets.filter(q=>q.kind!=='core').entries()){
    const [xx,yy,zz]=localSocket(pm,q),tag='engine-'+q.id,broken=q.hp<=0||dead,sx=i?1:-1;
    pose(M(xx,yy,zz),()=>{
     // Rear pylon meets the banked hull. Outer skins are separated sectors around a real axial bore.
     B(0,.46,-.80,.60,.36,1.75,C.paint,tag+'-pylon');
     piston([sx*.34,.53,-.48],[sx*.66,.94,-1.65],.055,tag+'-brace');
     oriented('bossBore',0,0,-.45,1.35,.72,1.35,C.dark,'z',tag+'-inner-duct');
     for(let k=0;k<4;k++){
      // The entire front armor sector is actually absent after destruction.
      if(broken&&(k===0||k===1))continue;
      A('bossPodArmor',M(0,0,-.43,1.62,1.14,1.53,k*Math.PI*.5+(broken?.10*sx:0),0,Math.PI/2),broken?C.burn:C.paint,2,0,tag+'-armor-sector-'+k);
     }
     oriented('bossCollar',0,-.58,-.28,1.04,.16,.99,C.edge,'y',tag+'-nozzle-collar');
     if(!broken){
      socket(0,0,0,.39,C.blue,.35,tag+'-anchor');
      oriented('bossCollar',0,0,-.025,1.18,.15,1.18,C.bronze,'z',tag+'-front-rim');
      A('glow',M(0,-.93,-.12,.43,1.24,1),'#8bcad8',6,.4,tag+'-exhaust',.21);
     }else{
      // A visible turbine at the old target socket remains recognizable as a destroyed engine.
      oriented('bossCollar',0,0,-.13,.87,.16,.87,C.burn,'z',tag+'-rupture');
      for(let j=0;j<5;j++){const a=j*1.24;B(Math.cos(a)*.26,Math.sin(a)*.26,-.11,.12,.32,.10,j%2?C.edge:C.burn,tag+'-visible-blade',a+.38);}
      B(-.27,-.54,-.03,.42,.21,.15,C.burn,tag+'-torn-lip',-.32);
      conduit([[.38,.3,-.18],[.17,-.28,.01],[.40,-.91,-.08]],.026,'#8d7858',tag+'-broken-wire');
     }
    });
   }
   const [xx,yy,zz]=localSocket(pm,h),q={x:xx,y:yy,z:zz},open=windowAmount(g,h);
   pose(M(xx,yy,zz),()=>{
    // Core well extends from the hull to the exact logical socket (not two metres forward).
    oriented('bossBore',0,0,-.66,1.42,1.31,1.42,C.dark,'z','saucer-core-well');
    oriented('bossCollar',0,0,-.04,1.55,.14,1.55,C.bronze,'z','saucer-core-rim');
    socket(0,0,0,.45,dead?C.burn:g.targetOpen(h)?C.amber:'#486d79',dead?0:g.targetOpen(h)?.65:.06,'core-anchor');
    for(const sx of [-1,1]){
     B(sx*(.25+open*.72),0,.13,.48,1.17,.13,C.paint,'saucer-core-shutter');
     piston([sx*.68,-.63,-.13],[sx*(.49+open*.62),-.30,.05],.037,'saucer-core-slide');
     L([sx*.78,.25,-.28],[sx*1.54,.1,-1.18],.074,C.steel,'saucer-core-support');
    }
    if(dead)for(const sx of [-1,1])B(sx*.64,-.21-d*.44,.0,.42,.25,.17,C.burn,'saucer-core-dead-petal',sx*d*.7);
   });
  });
 }
 function gate(g){
  const b=g.boss,c=b.targets.find(q=>q.kind==='core'),parts=b.targets.filter(q=>q.kind!=='core'),x=c.x,d=death(g),open=windowAmount(g,c);
  // Bolted back skeleton, open front. The right tower is railwork, not a solid block.
  for(const xx of [x-1.25,x+1.28,x+3.18]){
   B(xx,3.56,-.95,.27,7.10,.67,C.steel,'gate-upright');
   B(xx,.25,-.93,.63,.34,1.05,C.edge,'gate-foot');
  }
  for(const y of [.54,6.55]){
   B(x+1.05,y,-.64,4.65,.28,1.29,C.paint,'gate-crossbeam');
   B(x+1.04,y+.16,.0,4.22,.08,.22,C.edge,'gate-crossbeam-trim');
  }
  for(const y of [1.05,2.45,4.75,6.14]){
   B(x+2.18,y,-1.03,1.7,.20,.50,C.steel,'gate-right-shelf');
   L([x+1.36,y-.4,-1.03],[x+3.06,y+.36,-1.03],.065,C.steel,'gate-right-diagonal');
  }
  B(x+2.44,3.64,-1.02,.82,1.53,.37,C.dark,'gate-service-drive');
  for(let j=0;j<6;j++)B(x+2.44,3.11+j*.20,-.80,.61,.06,.07,C.steel,'gate-drive-grille');
  conduit([[x+3.04,5.97,-.48],[x+2.65,5.97,-.41],[x+2.65,4.1,-.54]],.048,C.bronze,'gate-control-hose');
  for(const q of parts){const broken=q.hp<=0||b.dead,tag='lock-'+q.id;
   socketFrame(q,.62,tag);
   if(!broken){
    oriented('bossCollar',q.x,q.y,-.06,1.25,.20,1.25,C.bronze,'z',tag+'-rim');
    socket(q.x,q.y,q.z,.35,C.amber,.38,tag+'-anchor');
    for(const sy of [-1,1])B(q.x+.58,q.y+sy*.30,-.09,.19,.35,.34,C.edge,tag+'-clamp');
   }else brokenPod(q,tag);
   // This is the actual latch travel: the captured part releases out of the socket.
   const release=broken?.63:0;
   B(q.x+.87+release,q.y,-.32,.72,.34,.32,broken?C.burn:C.steel,tag+'-lock-bolt');
   piston([q.x+2.80,q.y,-.44],[q.x+1.09+release,q.y,-.32],.085,tag+'-actuator');
  }
  socketFrame(c,.87,'gate-core');
  oriented('bossCollar',c.x,c.y,-.075,1.78,.22,1.78,C.bronze,'z','gate-core-rim');
  oriented('bossCollar',c.x,c.y,-.02,1.16,.10,1.16,C.dark,'z','gate-core-inner-bezel');
  socket(c.x,c.y,c.z,.43,b.dead?C.burn:g.targetOpen(c)?'#e6a36b':'#4b6771',b.dead?0:g.targetOpen(c)?.26:.03,'core-anchor');
  // Two sliding lattice leaves. 13 split rows; opening >1.15 m guarantees a clear core cone.
  const slide=open*1.55+d*.50;
  for(const sx of [-1,1]){
   const xx=c.x+sx*(.55+slide);
   B(xx+sx*.48,c.y,.40,.11,2.43,.16,C.steel,'gate-grille-leaf-frame');
   for(let j=0;j<13;j++)B(xx,c.y-1.03+j*(2.06/12),.39,1.00,.072,.14,C.edge,'gate-grille-slat');
   for(const sy of [-1,1]){
    B(xx,c.y+sy*1.19,.29,1.1,.15,.35,C.paint,'gate-slider-block');
    oriented('cyl',xx,c.y+sy*1.19,.48,.18,.10,.18,C.bronze,'z','gate-slider-roller');
    piston([c.x+sx*2.98,c.y+sy*1.25,-.10],[xx,c.y+sy*1.19,.28],.048,'gate-grille-piston');
   }
  }
  for(const sy of [-1,1])B(c.x,c.y+sy*1.25,.03,5.89,.09,.15,C.dark,'gate-slide-track');
  if(b.dead){
   // Loss of the core releases the two heavy lower armor leaves, not a frozen intact door.
   for(const sx of [-1,1])B(x+sx*(.68+d*.28),.92-d*.26,-.22,.93,.42,.70,C.burn,'gate-fallen-leaf',sx*d*.68);
  }
 }
 function handles(k){return k===0||k===4||k===6;}
 function draw(g){if(!g.boss?.active||!handles(g.boss.type))return;root=Math3D.id();
  if(g.boss.type===0)fortress(g);else if(g.boss.type===4)saucer(g);else gate(g);
 }
 return {handles,draw,localSocket,saucerRoot,windowAmount};
})();

/* Stage art director: eight individually authored environments and boss silhouettes.
   Everything below is interactive-scene mesh geometry, never a backdrop screenshot. */
const CampaignWorld=(()=>{
 const B=(...a)=>R.box(...a),S=(...a)=>R.ball(...a),A=(...a)=>R.add(...a),M=(...a)=>R.matrix(...a),F=(x,y,z,sx,sy,sz,spin=0)=>Math3D.oriented(x,y,z,sx,sy,sz,{axis:'z',spin}),L=(...a)=>R.beam(...a);
 let rng=1,stage=null,artRoom=0;const rnd=()=>{rng=(Math.imul(rng,1664525)+1013904223)|0;return(rng>>>0)/4294967296;};const range=(a,b)=>a+(b-a)*rnd();
 function rock(x,y,z,w,h,d,col,kind=11){A('stone',M(x,y,z,w,h,d,range(-.1,.1),range(-.4,.4)),col,0,kind);}
 function pine(x,y,z,h){
  const lean=range(-.35,.35);L([x,y,z],[x+lean,y+h,z],h*.020,'#344952',24);
  for(let tier=0;tier<7;tier++){const yy=y+h*(.12+tier*.118)+range(-.10,.10),radius=h*(.30-tier*.034)*range(.82,1.12),branches=5+(tier%2);
   for(let j=0;j<branches;j++){const a=j*6.283/branches+tier*.63+range(-.16,.16);if(rnd()<.14)continue;
    const dx=Math.cos(a)*radius,dz=Math.sin(a)*radius,ex=x+dx,ez=z+dz,ey=yy-range(.10,.27);
    L([x,yy+.12,z],[ex,ey,ez],h*.008,'#334e56',24);
    A('peak',M(x+dx*.57,yy-.02,z+dz*.57,radius*.83,h*.115,radius*.34,.08,-a),'#254a54',0,24);
    if(j%3!==tier%3)A('stone',M(x+dx*.59,yy+h*.025,z+dz*.58,radius*.66,h*.028,radius*.27,0,-a),'#c6dce2',0,24);
   }
  }
  A('peak',M(x+lean,y+h*.91,z,h*.09,h*.30,h*.10),'#355965',0,24);
 }
 function strut(x,y,z,w,h,col='#57747c'){B(x,y+h*.5,z,w,h,.35,col,0,0,0,2);for(const side of [-1,1])B(x+side*w*.43,y+h*.5,z+.24,.11,h+.1,.19,'#9cb2ac',0,0,0,2);}
 function pipe(a,b,r,col='#4b6267'){L(a,b,r,col,2);for(const f of [.05,.95]){const p=a.map((v,i)=>v+(b[i]-v)*f);S(...p,r*2.6,r*2.6,r*2.6,'#a0aa91',0,2);}}
 function hazardStripe(x,y,z,w){for(let i=0;i<w/.52;i++)B(x-w*.5+i*.52,y,z,.24,.24,.05,i%2?'#d9ae53':'#35434b',-.36,0,0,2);}
 function deck(a,b,y,kind='metal'){
  const x=(a+b)*.5,w=b-a,z=-1.60;
  if(kind==='ice'){rock(x,y-.30,z,w,.52,2.55,'#86b6d0');B(x,y-.065,z,w,.13,2.55,'#d7e9ed',0,0,0,11);for(let xx=a+.4;xx<b;xx+=1.6)A('cone',M(xx,y-.42,-.40,.13,.38,.16,Math.PI),'#a9dae6',0,11);}
  else if(kind==='organic'){rock(x,y-.46,z,w,.82,2.55,'#513d45',12);B(x,y-.065,z,w,.13,2.6,'#9b9680',0,0,0,17);for(let xx=a+.5;xx<b;xx+=1.4)L([xx,y-.3,-.35],[xx+.25,y-.8,-.65],.08,'#aaa48d',17);}
  else if(kind==='rock'){rock(x,y-.45,z,w,.82,2.5,'#597c79',3);B(x,y-.06,z,w,.12,2.56,'#738c74',0,0,0,10);if(w>5)Art.fern(a+.5,y,-2.65,.30);}
  else {B(x,y-.23,z,w,.40,2.55,'#536d79',0,0,0,2);B(x,y-.045,z,w,.09,2.55,'#98a8a4',0,0,0,2);hazardStripe(x,y-.22,-.27,w);for(let xx=a+.3;xx<b;xx+=.9)B(xx,y+.013,z,.035,.025,2.3,'#394b55');}
 }
 function sideTerrain(s){const snow=s.index===4,alien=s.index===7;
  for(const [a,b,y] of s.floors){if(y<-8)continue;for(let x=a;x<b;x+=3.6){const w=Math.min(3.6,b-x),cx=x+w*.5;
   if(alien){rock(cx,y-2.3,.1,w+.1,4.3,5.4,'#352f3b',12);rock(cx,y-.35,.1,w+.15,.8,5.6,'#71545b',12);for(let k=0;k<3;k++)S(cx+(k-1)*.85,y-1.35,2.68,.78,1.2,.33,'#62414a',0,12);}
   else if(snow){rock(cx,y-2.1,-.1,w+.15,4.3,5.8,'#76939f');rock(cx,y-.21,-.1,w+.23,.53,5.95,'#e1edf0');for(let k=0;k<3;k++)A('cone',M(cx+(k-1)*.94,y-.86,2.88,.18,1.25,.20,Math.PI),'#b3d9e3',0,11);}
   else {const energy=s.index===5,hangar=s.index===6,base=energy?'#343c43':hangar?'#344f59':'#304954',top=energy?'#7d7c74':hangar?'#82999d':'#728992';B(cx,y-2.27,-.1,w,3.86,5.8,base,0,0,0,2);B(cx,y-.17,-.1,w,.34,5.96,top,0,0,0,2);B(cx,y-1.45,2.84,w*.80,2.25,.2,energy?'#2c353b':'#243b48',0,0,0,2);hazardStripe(cx,y-.5,2.98,w);for(let k=-1;k<=1;k++)B(cx+k*w*.26,y-1.5,2.97,.06,1.55,.04,energy?'#74594d':'#567887',0,0,0,2);if(energy){B(cx,y+.018,-2.15,w*.72,.025,.09,'#ff9d55',0,0,0,2,.26);}if(hangar){for(const z of [-1.8,1.45])B(cx,y+.025,z,w*.90,.025,.045,'#9fb7b4',0,0,0,2);for(const k of [-1,1])S(cx+k*w*.23,y+.055,-2.45,.055,.025,.055,'#74d8e5',.25,2);}}
  }}
  for(const p of s.platforms)if(!p.move)deck(p.a,p.b,p.y,p.style);
 }
 function lightStrip(x,y,z,w,col,emit=1){const e=emit*(z<-12?1.8:z<-2?2.2:2.7);B(x,y,z,w,.06,.07,col,0,0,0,22,e);R.light(x,y,z+.18,col,emit*(y>6?22:11),y>6?10:5.5,1,true);}
 function wallPanel(x,y,z,w,h,glow,base='#263b47'){
  Environment.add('panel',{x,y,z,w,h,color:glow});
  B(x,y,z,w,h,.18,base,0,0,0,2);B(x,y,z+.11,w*.82,h*.72,.035,'#101f2a',0,0,0,2);
  B(x-w*.21,y+h*.11,z+.15,w*.24,h*.11,.025,glow,0,0,0,2,.7);B(x+w*.18,y+h*.11,z+.15,w*.18,h*.11,.025,'#d9b866',0,0,0,2,.35);
  for(let j=0;j<3;j++)for(let i=0;i<4;i++)S(x-w*.28+i*w*.18,y-h*.19+j*h*.15,z+.16,.045,.045,.025,(i+j)%3===0?glow:'#71848a',.15,2);
 }
 function wallFan(x,y,z,r,glow){
  A('ring',F(x,y,z,r,.22,r),'#738b93',0,2);S(x,y,z+.14,r*.18,r*.18,.12,'#2c4148',0,2);
  A('ring',F(x,y,z+.17,r*.71,.09,r*.71),glow,.06,2);
  Environment.add('fan',{x,y,z,r});
 }

 function cable(a,b,sag=.8,col='#384f58'){let prev=a;for(let i=1;i<=7;i++){const q=i/7,p=[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q-Math.sin(q*Math.PI)*sag,a[2]+(b[2]-a[2])*q];L(prev,p,.045,col,2);prev=p;}}
 function depthRoom(s){BiomeAssets.depth(s,artRoom);}
 function verticalRavine(s){BiomeAssets.ravine(s);}
 function snowField(s){BiomeAssets.snow(s);}
 function energyZone(s){EnvironmentAssets.energy(s);}
 function hangar(s){BiomeAssets.hangar(s);}
 function organic(s){EnvironmentAssets.lair(s);}
 function create(s,room=0){Environment.reset();stage=s;artRoom=room;rng=8123+s.index*981;Art.resetSeed(712931+s.index*981);R.clear();R.setView(s.mode);R.setTheme(s.theme);
  if(s.index===0){Art.create();return;}
  R.record(true);if(s.mode==='depth')depthRoom(s);else if(s.mode==='vertical')verticalRavine(s);else if(s.index===4)snowField(s);else if(s.index===5)energyZone(s);else if(s.index===6)hangar(s);else organic(s);R.record(false);
 }
 function drawEnemy(e,t,depth=false){
  if(['runner','rifle','heavy'].includes(e.type)){CombatArt.humanoid(e,t,depth);if(e.carrier){B(e.x,e.y+1.35,e.z+.30,.62,.48,.16,'#c69b77',0,0,0,2);lightStrip(e.x,e.y+1.38,e.z+.40,.38,'#d8c497',.18);}return;}
  if(e.type==='turret'){if(depth)R.transform(M(e.x,e.y,e.z,1,1,1,0,-Math.PI/2),()=>Art.drawTurret({...e,x:0,y:0,aim:0},t));else Art.drawTurret(e,t);return;}
  if(e.type==='drone'){Art.drawDrone(e,t);return;}
  const x=e.x,y=e.y,z=e.z,c=e.hit>0?'#ffe9bf':'#5b7768';
  if(e.type==='tank'||e.type==='cart'){
   for(let i=-2;i<=2;i++){A('cyl',F(x+i*.48,y+.29,z+.55,.57,.3,.57),'#283d45',0,2);S(x+i*.48,y+.29,z+.74,.22,.22,.08,'#79938b',0,2);}B(x,y+.32,z,3.05,.65,1.6,'#30484b',0,0,0,2);B(x,y+.82,z,2.7,.72,1.47,c,0,0,0,2);
   if(e.type==='tank'){B(x+.12,y+1.32,z,1.5,.61,1.2,'#8b9b74',0,0,0,2);L([x-.4,y+1.55,z],[x-2,y+1.55,z],.17,'#3e5152',2);S(x+.1,y+1.5,z+.65,.26,.20,.13,e.wind>0?'#fff6c1':'#ef9563',e.wind>0?2:0,2);}else B(x,y+1.10,z,2.5,.16,1.4,'#c2b481',0,0,0,2);return;
  }
  if(e.type==='pod'){const pulse=1+Math.sin(t*3+e.id)*.035;S(x,y+.9,z,1.5*pulse,1.9,1.4,c==='#ffe9bf'?c:'#8b547d',0,12);S(x,y+1.05,z+.6,.85,1.23,.40,'#b5dd9b',.35,12);for(let i=0;i<5;i++)L([x,y+.6,z],[x+Math.cos(i*1.4)*.95,y+.08,z+Math.sin(i*1.4)*.85],.14,'#b2819e',12);return;}
  if(e.type==='alienHead'){S(x,y+1.7,z,3.0,3.5,1.7,'#936786',0,12);B(x-.4,y+2.1,z+.85,1.65,.40,.21,'#293340');S(x-.55,y+2.13,z+1.0,.58,.25,.14,'#d6f9a1',1.1,12);B(x-.65,y+.9,z+.80,1.65,.6,.20,'#303449');for(let i=0;i<5;i++)A('cone',M(x-1.3+i*.3,y+1.1,z+.97,.15,.52,.16,Math.PI),'#e3dab3',0,12);return;}
  const crouch=e.type==='crawler',h=crouch?.47:.90;
  S(x,y+h,z,1.25,crouch?.65:1.20,.76,'#9080a4',0,12);S(x+e.face*.4,y+h+.25,z+.18,.80,.48,.52,'#c1abb7',0,12);B(x+e.face*.58,y+h+.24,z+.4,.38,.13,.11,'#f0d59d',0,0,0,12,.6);
  for(const side of [-1,1]){const stride=Math.sin(t*15+side)*.35;L([x,y+h,z+side*.26],[x+stride,y+.12,z+side*.55],.12,'#c4a6ad',12);L([x+stride,y+.12,z+side*.55],[x+stride-e.face*.25,y+.07,z+side*.65],.09,'#e3d9bc',12);}
  let prev=[x-e.face*.5,y+h,z];for(let i=1;i<=5;i++){const q=[x-e.face*(.5+i*.28),y+h+Math.sin(t*6-i*.6)*i*.08,z-.1];L(prev,q,.09*(1-i*.12),'#b092af',12);prev=q;}
 }
 function orb(x,y,z,r,col,emit=.5){S(x,y,z,r,r,r,col,emit,2);A('quad',M(x,y,z+.12,r*1.9,r*1.9,1),col,emit,6,0,.14);}
 function drawBoss(g){const b=g.boss;if(!b?.active)return;const t=g.t,k=b.type,pt=g.stage.bossPoint,hot=b.hit>0;
  const orbGlow=(x,y,z,r,col,emit=.5)=>{S(x,y,z,r,r,r,col,emit,2);A('quad',M(x,y,z+.12,r*1.9,r*1.9,1),col,emit,6,0,.14);};
  if(BossMechanics.handles(k)){BossMechanics.draw(g);CombatArt.bossStatus(g);return;}
  if(k===1){
   B(0,3.9,-15.0,13,7.3,1.3,hot?'#9eb0a8':'#566d75',0,0,0,2);
   for(const side of [-1,1]){B(side*6.15,3.9,-14.1,.42,6.9,.56,'#bfccb8',0,0,0,2);pipe([side*6.05,.7,-14.0],[side*4.5,6.8,-13.6],.10,'#78949a');}
   B(0,3.6,-14.4,6.3,6.0,.95,'#304651',0,0,0,2);
   for(const q of b.targets.filter(q=>q.kind!=='core')){
    const open=g.targetOpen(q),alive=q.hp>0,slide=open?.38:0;
    B(q.x,q.y,q.z+.08,2.1,2.1,.52,alive?'#435e68':'#263842',0,0,0,2);
    B(q.x,q.y,q.z+.34,1.55,1.55,.18,'#162833',0,0,0,2);
    A('ring',F(q.x,q.y,q.z+.43,1.32,.18,1.32),alive?'#8fa7a5':'#47595d',0,2);
    if(alive){
     orbGlow(q.x,q.y,q.z+.48,.42,open?'#dfb38a':'#617685',.20);
     for(const side of [-1,1]){B(q.x+side*(.24+slide),q.y,q.z+.66,.44,1.08,.12,'#637b85',0,0,0,2);B(q.x+side*(.44+slide),q.y,q.z+.58,.18,1.35,.14,'#415560',0,0,0,2);}
    }else{for(let i=0;i<4;i++)B(q.x-.34+i*.23,q.y-.28+i*.12,q.z+.54,.18,.10,.18,'#2d3639',i*.25,0,0,2);}
   }
   const eye=b.targets.find(q=>q.id==='eye');
   if(b.phase===2||b.dead){
    const sx=eye.x,sy=eye.y,sz=eye.z;
    A('ring',F(sx,sy,sz+.18,2.35,.35,2.35),'#698a90',0,2);
    B(sx,sy,sz-.05,3.0,2.6,.66,'#324954',0,0,0,2);
    S(sx,sy,sz+.28,1.95,1.58,.74,'#c0c4ae',0,2);
    A('ring',F(sx,sy,sz+.55,.96,.12,.96),g.targetOpen(eye)?'#ffd39d':'#7c98a0',g.targetOpen(eye)?.45:.08,2);
    orbGlow(sx,sy,sz+.66,.63,'#d09169',.34);
    B(sx,sy,sz+.84,.16,.84,.12,'#1f313b',0,0,0,2);
    for(const side of [-1,1]){pipe([sx+side*1.6,sy+.2,sz-.05],[sx+side*3.8,sy+1.1,sz-.35],.10,'#738c90');pipe([sx+side*1.4,sy-.45,sz+.05],[sx+side*3.1,sy-1.2,sz-.15],.08,'#51676d');}
   }
  }else if(k===2){
   const left=b.targets[0],right=b.targets[1],head=b.targets[2],open=g.targetOpen(head),pulse=.96+.04*Math.sin(t*3.2),corePulse=open?(.92+.12*Math.sin(t*7.4)):0;
   // Second-pass sculpt: idol reads as a carved mountain guardian with brow, jaw, shoulders and clearer broken-hand states.
   B(0,51.9,-3.0,6.4,2.8,5.5,'#4d645e',0,0,0,11);
   for(const side of [-1,1]){B(side*2.9,53.0,-2.0,1.55,2.25,2.15,'#566d67',0,0,0,11);pipe([side*3.8,53.7,-1.6],[side*5.0,55.0,-1.0],.14,'#6d8783');}
   S(0,55.5,-2.2,4.45,3.35,3.15,hot?'#ddd6b9':'#68827b',0,11);
   B(0,56.9,-.65,4.5,1.55,1.55,'#738983',0,0,0,11); // brow shelf
   S(0,58.8,-1.55,3.65*pulse,4.18,2.8,'#91aaa0',0,11);
   B(0,57.7,.04,2.72,.90,.60,'#324f54',0,0,0,2); // mouth slot
   B(-1.18,58.5,.48,.82,.46,.34,'#223844',0,0,0,2);B(1.18,58.5,.48,.82,.46,.34,'#223844',0,0,0,2);
   for(const side of [-1,1]){A('cone',M(side*1.12,61.25,-.70,.78,2.7,.92,side*.30),'#d8d3af',0,11);B(side*.90,59.9,.24,.70,.46,.24,'#243a45',0,0,0,2);orbGlow(side*.95,59.96,.32,.42,'#f0a17a',.55);}
   // carved jaw and chin
   for(const side of [-1,1])B(side*1.16,56.45,.42,.95,.82,.42,'#7e9189',side*.12,0,0,11);
   B(0,56.15,.64,2.15,.26,.24,'#2d4149',0,0,0,2);
   for(const [side,q] of [[-1,left],[1,right]]){
    const alive=q.hp>0,elbowY=56.8+Math.sin(t*1.4+side)*.05;
    L([side*2.55,57.2,-1.18],[side*4.05,56.35,-.70],.58,'#90aca0',3);
    S(side*3.10,elbowY,-.95,1.0,.94,.98,'#7e9890',0,11);
    if(alive){
      B(q.x,q.y,q.z-.08,1.78,1.52,1.60,'#889f92',0,0,0,11);
      B(q.x,q.y,q.z+.82,1.10,.48,.22,'#2d4248',0,0,0,2);
      for(const s of [-1,1])B(q.x+s*.58,q.y+.16,q.z+.48,.19,.76,.22,'#c9c29e',0,0,0,11);
      B(q.x,q.y-.58,q.z+.42,.86,.56,.54,'#6a7f78',0,0,0,11);
      orbGlow(q.x,q.y,q.z+.88,.58,b.telegraph?'#ffd09c':'#e58f67',.78);
    }else{
      L([side*3.75,56.55,-.78],[side*4.65,55.95,-.35],.30,'#625f57',11);
      B(q.x-side*.18,q.y-.18,q.z+.12,.62,.34,.62,'#50504d',side*.18,0,0,11);
      for(let j=0;j<4;j++)B(q.x+(j-1.5)*.20,q.y-.12+j*.12,q.z+.40,.18,.10,.18,'#454846',j*.28,0,0,2);
    }
   }
   A('ring',F(0,59.18,.34,1.16,.14,1.16),open?'#ffd8a5':'#6f7f85',open?.75:.05,2);
   orbGlow(0,59.18,.48,.78,open?'#ffe5b0':'#8fa8ab',open?1.10:.12);
   if(open){for(const side of [-1,1])pipe([side*.92,58.9,.20],[side*1.85,58.2,.55],.07,'#8aa2a0');}
  }else if(k===3){
   for(const [i,q] of b.targets.entries()){if(q.hp<=0)continue;const open=g.targetOpen(q),bob=Math.sin(t*2.2+i)*.08;R.transform(M(q.x,q.y,q.z+.15,1,1,1,0,0),()=>{S(0,.12+bob,0,1.45,1.72,1.05,hot?'#f1dbc8':'#b095be',0,2);B(0,-.62+bob,.48,1.18,.52,.22,'#4a466a',0,0,0,2);B(0,.58+bob,.56,.92,.30,.16,'#403f5d',0,0,0,2);for(const side of [-1,1]){B(side*.42,.10+bob,.72,.26,.42,.18,'#263744',0,0,0,2);orbGlow(side*.43,.14+bob,.82,.26,open?'#ffbf9c':'#7fb2e5',open?1.0:.28);A('cone',M(side*.86,.92+bob,.12,.26,.92,.28,side*.18),'#d7cbcc',0,11);}B(0,-.14+bob,.72,.52,.18,.12,'#273541',0,0,0,2);for(let j=-2;j<=2;j++)B(j*.14,-.42+bob,.72,.08,.18,.05,'#e8dcc1');B(-.64,-.02+bob,.34,.18,.92,.20,'#645e82',-.22,0,0,2);B(.64,-.02+bob,.34,.18,.92,.20,'#645e82',.22,0,0,2);});}
  }else if(k===5){
   const q=b.targets[0],x=q.x,y=q.y,open=g.targetOpen(q),state=b.robotState||'idle';
   const rush=state==='rush',leap=state==='leap',windup=state==='windup',recover=state==='recover';
   const stride=rush?Math.sin(t*14)*.36:0,lean=windup?-.10:rush?.18:leap?.03:-.02,armRaise=windup?.70:leap?.38:recover?-.18:0,chestLift=open?(.14+.06*Math.sin(t*7)):0;
   // Second-pass sculpt: heavier readable silhouette, clearer armor breakup, better knees/forearms/backpack.
   R.transform(M(x,y,0,1,1,1,lean),()=>{
    // pelvis and skirt armor
    B(0,-.18,0,1.95,.76,1.52,'#4a5e63',0,0,0,2);B(0,.15,.82,1.25,.20,.18,'#9e9675',0,0,0,2);
    for(const side of [-1,1])B(side*.58,-.10,.78,.44,.44,.16,'#697d7b',side*.10,0,0,2);
    // legs
    for(const side of [-1,1]){
      const hip=side*.72,step=stride*side,kneeY=-.33+(rush?Math.abs(step)*.35:0),footX=hip+step;
      B(hip,-.96+Math.abs(step)*.18,.20,.84,1.08,.90,'#6b8280',side*.08,0,0,2);
      S(footX,kneeY,.12,.54,.52,.56,'#a0ad97',0,2);
      B(footX,-1.82,.18,.72,1.15,.72,'#41575e',side*.05,0,0,2);B(footX,-2.18,.62,.78,.24,.20,'#909477',0,0,0,2);
      B(footX,-2.60,.22,.78,.42,.82,'#5e726f',0,0,0,2);B(footX+.18,-2.90,.36,1.30,.18,1.38,'#1f3339',0,0,0,2);B(footX-.10,-2.66,-.08,.60,.22,.88,'#223740',0,0,0,2);
    }
    // torso main mass
    B(0,.86,-.08,2.22,1.42,1.84,'#86907d',0,0,0,2);B(0,1.98+chestLift,-.12,2.52,1.48,1.96,'#687a75',0,0,0,2);
    B(.10,1.74+chestLift,.98,1.56,1.48,.26,'#304854',0,0,0,2);A('ring',F(.10,1.74+chestLift,1.14,.74,.15,.74),open?'#ffb36e':'#7b6b65',open?.92:.08,2);orbGlow(.10,1.74+chestLift,1.24,.46,open?'#ffd08e':'#8a756d',open?.96:.12);
    for(const y0 of [.42,.95,1.48])B(0,y0,.84,1.62,.10,.14,'#a89f79',0,0,0,2);
    for(const side of [-1,1]){B(side*.88,1.15,.74,.34,1.12,.20,'#53686b',side*.06,0,0,2);B(side*.92,.26,.56,.64,.96,.26,'#415a60',0,0,0,2);}    
    // backpack and exhausts
    B(0,1.86,-1.06,1.34,1.88,.56,'#3b5259',0,0,0,2);B(0,2.34,-1.08,.86,.74,.24,'#5c726f',0,0,0,2);
    for(const side of [-1,1]){B(side*.48,2.12,-1.10,.24,2.24,.28,'#4b6268',side*.10,0,0,2);A('cyl',M(side*.62,.92,-1.12,.24,.46,.24),'#2a4048',0,2);if(recover||open)orbGlow(side*.62,.66,-1.12,.14,'#ffb37d',.45);}
    // neck + head
    A('cyl',M(0,3.08,-.02,.62,.36,.62),'#4e645f',0,2);S(0,3.66,0,1.04,1.00,1.04,'#afb19b',0,2);B(.10,3.76,.82,1.08,.24,.16,'#223b47',0,0,0,2);lightStrip(.10,3.78,.92,.78,'#f39469',1.08);B(0,4.36,.08,.36,.78,.54,'#708278',0,0,0,2);B(-.10,4.55,-.02,.20,.36,.30,'#586a62',-.06,0,0,2);
    // shoulders & arms
    for(const side of [-1,1]){
      const shoulderX=side*1.60,elbowX=side*(2.06+(windup?.36:0)),elbowY=.90+armRaise*.34;
      const fistY=-.48+(leap?1.62:0)+(recover?.28:0),fistX=side*(2.26+(rush?.48:0));
      S(shoulderX,2.34,.08,.82,.78,.84,'#b5aa85',0,2);A('ring',F(shoulderX,2.36,.76,.56,.10,.56),'#d0b477',.10,2);B(side*2.02,2.28,.10,.76,.50,1.18,'#607978',0,0,0,2);
      L([side*1.64,2.08,.06],[elbowX,elbowY,.10],.36,'#778986',2);S(elbowX,elbowY,.10,.50,.50,.50,'#c4b68f',0,2);B(elbowX,elbowY+.32,.42,.28,.24,.22,'#8e8e75',0,0,0,2);
      L([elbowX,elbowY,.10],[fistX,fistY,.20],.32,'#6d8380',2);B(fistX,fistY,.20,.78,.66,.76,'#36535a',0,0,0,2);B(fistX,fistY+.22,.60,.44,.18,.16,'#8d8c72',0,0,0,2);
    }
   });
  }else{
   const x=pt.x,core=b.targets.at(-1),open=g.targetOpen(core),dead=b.dead,deathEase=dead?Math.min(1,b.deathTime/2.4):0,sag=dead?deathEase*1.1:0,pulse=(1+Math.sin(t*3.8)*.045)*(dead?1-deathEase*.35:1),memPulse=.92+.08*Math.sin(t*2.7);
   // Second-pass organic finish: clearer organ silhouette, hanging arteries, membranes and death slump.
   for(const side of [-1,1]){
    let prev=[x+side*5.2,.35,-2.0];
    for(let i=1;i<=6;i++){
      const a=i/6*Math.PI*.57,q=[x+side*5.2*Math.cos(a),.45+Math.sin(a)*7.6,-2.0-Math.sin(a)*2.6];
      L(prev,q,.34+(6-i)*.05,'#b7aa8d',17);S(...q,.46,.60,.48,'#7f5268',0,12);prev=q;
    }
   }
   for(const side of [-1,1]){pipe([x+side*4.3,6.3,-1.85],[x+side*2.1,5.5,-.88],.24,'#8a5562');pipe([x+side*3.2,1.5,-1.55],[x+side*1.55,2.45,-.82],.19,'#8a5562');pipe([x+side*1.9,7.2,-.95],[x+side*.95,6.0,.10],.12,'#91576a');}
   // membranes / lobes
   for(const side of [-1,1]){A('quad',M(x+side*2.65,4.9-sag*.35,-1.08,2.8,5.2,1,0,side*.22,.22*side),'#9e5e78',.05,6,0,.18);A('quad',M(x+side*2.0,2.6-sag*.20,-.82,2.1,3.0,1,0,side*.15,-.16*side),'#7a4361',.04,6,0,.16);}   
   S(x-.92,4.15-sag*.75,-1.72,3.28*pulse,5.8,3.08,'#7d3f60',0,12);S(x+1.12,4.55-sag*.55,-1.28,3.02*pulse,5.15,2.88,'#98516f',0,12);S(x-.02,4.52-sag,.08,2.22*pulse,3.15,1.30,hot?'#ffd2b6':'#d57a95',.06,12);
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,yy=4.2-sag*.55+Math.sin(a)*3.15,zz=-1.0+Math.cos(a)*2.45;L([x-.05,4.25-sag*.45,-1.18],[x+Math.cos(a)*4.45,yy,zz],.15+(i%3)*.025,'#7d535b',12);}   
   // sacs
   for(const q of b.targets.filter(q=>q.kind!=='core'&&q.hp>0)){
    B(q.x,q.y,q.z+.36,1.28,1.72,1.14,'#6f405f',0,0,0,12);S(q.x,q.y,q.z+.58,1.38*memPulse,1.24,.99,'#8b5372',0,12);S(q.x-.15,q.y+.12,q.z+1.00,.78,.74,.44,'#90d896',.14,12);orbGlow(q.x-.17,q.y,q.z+1.14,.54,'#b2e8a5',.44);for(const side of [-1,1])pipe([q.x+side*.42,q.y+.28,q.z+.35],[q.x+side*.92,q.y+.88,q.z-.35],.06,'#714558');
   }
   A('ring',F(x-.32,4.24-sag*.85,.72,1.72,.18,1.72),open?'#ffb28a':'#89526b',open?.84:.08,12);
   if(open){orbGlow(x-.32,4.24-sag*.85,1.00,1.15,dead?'#cc8a90':'#ffa08f',dead?.22:1.08);A('quad',M(x-.32,4.24-sag*.85,1.12,3.0,3.0,1),dead?'#8d545a':'#ff9f8d',dead?.14:1.0,6,0,.20);}else S(x-.32,4.24-sag*.85,.84,1.04,1.18,.56,'#6b3657',0,12);
   // death-collapse drips / hanging remnants
   if(dead){for(const side of [-1,1])pipe([x+side*1.4,1.8,-.4],[x+side*1.7,.7,-.2],.08,'#67394f');}
  }
  CombatArt.bossStatus(g);
 }
 function draw(g,menu=false){const t=g.t,s=g.stage,p=g.player;if(s.mode==='depth'&&artRoom!==g.room)create(s,g.room);for(const a of g.players||[])a.retroInput=g.inputMode==='retro';R.setCoop(g.playerCount===2);R.setActors(menu?(g.playerCount===2?[{id:1,x:20.8,y:0,z:0,vx:0,face:1,aim:.01,grounded:true},{id:2,x:23.1,y:0,z:0,vx:0,face:1,aim:.12,grounded:true}]:[{id:1,x:21,y:0,z:0,vx:0,face:1,aim:.01,grounded:true}]):[g.players[0],g.players[1],...( [1,2].map(id=>{const c=g.corpses.find(c=>c.hero&&c.id===id);return c?{...c,isCorpse:true}:null;}))],t,s.mode);
 R.setBoss(!!g.boss?.active,g.stageIndex===4?32:27);R.begin(g.cam,g.camY);
  Environment.draw(g);
  if(menu){Art.drawCapsule({x:25,y:2.3},t);Art.drawAtmosphere(t,g.cam);R.render(g.cam,0,t);return;}
  for(const br of s.bridges){const a=Math.max(0,t-br.fallAt);if(a>2.4)continue;const y=a>.8?-10*(a-.8)**2:Math.sin(a*60)*a*.06;B((br.a+br.b)*.5,y-.1,0,br.b-br.a-.05,.2,3.6,a>0&&a<.8?'#d7a75e':'#ab9363',a>.8?(a-.8)*.7:0,0,0,3);}
  for(const q of s.platforms)if(q.move){const yy=g.platformY(q);if(s.index===6)BiomeAssets.servicePlatform({...q,y:yy},-7);else deck(q.a,q.b,yy,'metal');for(const x of [q.a+1,q.b-1])L([x,-7,-1],[x,yy-.3,-1],.15,'#6c9baa',2);}
  for(const h of g.hazards){const hs=g.hazardState(h);if(Math.abs(h.x-g.cam)>24&&s.mode!=='vertical')continue;
   if(h.type==='mine'&&!h.dead){A('cyl',M(h.x,.1,0,.7,.18,.7),'#668285',0,2);orb(h.x,.23,.12,.18,h.armed?'#ffba78':'#e57f6a',h.armed?1.1:.2);}
   if(h.type==='flame'){A('cyl',M(h.x,.1,0,.8,.2,.8),'#b49465',0,2);if(hs.warn)orb(h.x,.32,0,.32,'#ffc98c',1);if(hs.active){CombatArt.ribbon([h.x,.2,0],[h.x,4.35,0],1.02,'#ffb967',1.2,.85,18);CombatArt.ribbon([h.x,.21,.04],[h.x,2.95,.04],.36,'#ffe4b5',1.4,.8,18);R.light(h.x,1.7,.2,'#ffb566',35,6.5,2);R.heat(h.x,3.3,0,1.3);}}
   if(h.type==='crusher'){B(h.x,hs.bottom+2.35,0,2.9,4.7,3.25,'#819895',0,0,0,2);B(h.x,hs.bottom+.2,.01,3.2,.45,3.50,'#c0b77d',0,0,0,2);hazardStripe(h.x,hs.bottom+.25,1.79,3.15);if(hs.warn)A('quad',M(h.x,.03,0,3.5,2.8,1,0,0,-Math.PI/2),'#ffb279',.6,6,0,.42);}
   if(h.type==='acid'){A('water',M(h.x,-.09,0,h.width,1,3.6),'#75ca8b',.4,49);if(hs.active)for(let i=0;i<6;i++)orb(h.x-1.5+i*.6,.2+Math.sin(t*4+i)*.1,0,.26,'#a7eda4',.5);}
  }
  if(s.mode==='depth'){
   if(!g.boss?.active){
    const opening=g.barrier?0:Math.min(1,(.38-g.barrierFade)/.38),ease=opening*opening*(3-2*opening);
    for(const side of [-1,1]){
     const xx=side*(3.60+ease*7.3);B(xx,3.85,-14.85,7.15,7.7,.45,s.index===1?'#344f5c':'#403d5d',0,0,0,2);
     for(let j=0;j<5;j++){B(xx,.85+j*1.45,-14.60,6.90,1.35,.07,s.index===1?'#3e5a66':'#4c496c',0,0,0,2);}
    }
    for(const x of g.roomPlan?.rollers||[]){B(x,.32,-13.9,.9,.58,.45,'#102832',0,0,0,2);lightStrip(x,.66,-13.60,.72,g.depthWarning?.x===x?'#edb16f':'#58767b',.14);}
   }
   for(const q of g.sensors||[]){
    if(q.hp<=0){B(q.x,q.y,q.z,.95,.95,.3,'#152d35',0,0,0,2);continue;}
    const scale=q.r/.62;B(q.x,q.y,q.z,1.35*scale,1.35*scale,.45,'#8a9d9c',0,0,0,2);
    B(q.x,q.y,q.z+.27,.98*scale,.98*scale,.08,'#152d35',0,0,0,2);
    const locked=g.players.some(p=>p.aimTarget===q.id);
    if(q.armor>0){B(q.x,q.y,q.z+.43,.98*scale,.98*scale,.16,q.hit>0?'#e6c59b':'#777f9e',0,0,0,2);for(let i=0;i<q.maxArmor-q.armor;i++)L([q.x-.3+i*.14,q.y-.32,q.z+.53],[q.x+.12+i*.06,q.y+.27,q.z+.53],.014,'#242e40',2);}
    else{orb(q.x,q.y,q.z+.39,.42*scale,q.hit>0?'#ffe3ae':locked?'#e9b57f':'#c58d69',.22);}
    CombatArt.brackets(q.x,q.y,q.z+.62,1.62*scale,1.62*scale,locked?'#e8cb9b':'#68818a',locked?.16:0);
   }
   if(g.barrier||g.barrierFade>0){
    const a=g.barrier?1:g.barrierFade/.38;
    for(const x of [-6.9,6.9]){B(x,.83,-1.15,.20,1.66,.25,'#709eae',0,0,0,2,.10);}
    for(let row=0;row<4;row++)for(let i=0;i<18;i++){
     const x=-6.8+i*.8,y=.16+row*.36+Math.sin(t*13+i*1.8+row)*.045;
     B(x,y,-1.15,.81,.018,.025,'#5bafca',0,0,0,2,a*.32);
    }
   }
   if(!g.barrier&&!g.boss?.active){
    for(let j=0;j<4;j++){const zz=-2-j*2.4,pulse=.12+.18*(.5+.5*Math.sin(t*5+j));
     L([-.48,.035,zz+.3],[0,.035,zz-.18],.026,'#83c5b6',2,pulse);L([.48,.035,zz+.3],[0,.035,zz-.18],.026,'#83c5b6',2,pulse);}
   }
   for(const u of g.players)if(u.shock>0){for(let j=0;j<4;j++)L([u.x-.33,u.y+.3+j*.34,u.z+.12],[u.x+.35,u.y+.45+j*.34,u.z+.12],.019,'#9dc8df',2,.28);}
  }
  for(const c of g.capsules)if(c.hp>0&&Math.abs(c.x-g.cam)<22&&(s.mode!=='vertical'||Math.abs(c.y-p.y)<15))Art.drawCapsule(c,t);
  for(const a of g.pickups){A('cyl',F(a.x,a.y,a.z,.6,.16,.6,t*1.2),'#e2d59c',0,2);orb(a.x,a.y,a.z,.3,{M:'#a7eff4',S:'#ffd584',L:'#9ff5e5',F:'#ffb184'}[a.type],.6);}
  for(const e of g.enemies){drawEnemy(e,t,s.mode==='depth');if(e.wind>0)orb(e.x,e.y+(e.type==='drone'?.6:2.3),e.z+.1,.18,'#ffd695',1.4);}
  for(const u of g.players||[])if(!u.dead){if(u.muzzle>0)CombatArt.muzzle(u,g);const floor=Math.max(...g.surfaces(u.x,t).filter(v=>v<=u.y+.05));if(Number.isFinite(floor))CombatArt.shadow(u.x,floor,u.z,Math.max(.5,1.05-(u.y-floor)*.06));}
  for(const c of g.corpses)if(!c.hero){if(['runner','rifle','heavy'].includes(c.type))CombatArt.humanoid(c,t,s.mode==='depth');else Art.drawCharacter(c,t,false);}
  drawBoss(g);
  if(g.depthWarning){const w=g.depthWarning;A('quad',M(w.x,.015,-6,1.45,12,1,0,0,-Math.PI/2),'#ffa15d',.3,6,0,.22);for(let zz=-12;zz<=0;zz+=1.4)B(w.x,.025,zz,.65,.03,.48,'#ffc28b',0,0,0,2,.3);}
  if(g.boss?.acidPatch){const a=g.boss.acidPatch,active=a.age>.9;A('water',M(a.x,.025,0,2.9,1,1.8),active?'#a2f585':'#eab770',active?.2:0,49);for(const dx of [-1.45,1.45])orb(a.x+dx,.13,.1,.18,active?'#a8fca5':'#ffc280',.4);}
  if(g.boss?.type===5&&g.boss.robotState==='windup'){const q=g.boss.targets[0];A('quad',M((q.x+g.boss.robotTo)/2,.02,0,Math.max(2,Math.abs(q.x-g.boss.robotTo)),1.8,1,0,0,-Math.PI/2),'#ffb379',.35,6,0,.24);}

  if(g.boss?.beam>0){const b=g.boss,fire=b.beamFired,LEN=23;A('quad',M(s.length-11,b.beamY,.2,LEN,fire?.23:.045,1),'#ffb28e',fire?2:.4,6,0,fire?.87:.45);if(fire)B(s.length-11,b.beamY,.2,LEN,.05,.05,'#ffe6b9',0,0,0,0,2);}
  for(const b of g.bullets){if(b.delay>0)continue;
   if(b.type==='boulder'){A('stone',M(b.x,b.y,b.z,b.r*2,b.r*2,b.r*2,b.age*1.8+b.id*.27,b.age*.9+b.id*.13),'#9a9c86',0,11);continue;}
   if(b.enemy&&s.mode==='depth'){
    if(['roller','baseBomb','orb'].includes(b.type)){
     if(b.type==='roller'){A('cyl',Math3D.oriented(b.x,b.y,b.z,.60,.45,.60,{axis:'x',spin:t*9}),'#8c9692',0,2);for(const side of [-1,1])S(b.x+side*.25,b.y,b.z,.06,.50,.50,'#c99a69',.10,2);}
     else S(b.x,b.y,b.z,b.r*2,b.r*2,b.r*2,b.type==='orb'?'#cc976e':'#9b9270',b.type==='orb'?.32:0,2);
     CombatArt.shadow(b.x,0,b.z,.62);
    }else{S(b.x,b.y,b.z,b.r*2.8,b.r*2.8,b.r*2.8,'#352f3b',0);orb(b.x,b.y,b.z+.055,b.r*1.65,'#df9574',.35);}
    continue;
   }
   if(b.enemy){if(!['disc','roller','shockwave'].includes(b.type)){const d=Math3D.norm([b.vx,b.vy,b.vz]);CombatArt.ribbon([b.x-d[0]*.25,b.y-d[1]*.25,b.z-d[2]*.25],[b.x,b.y,b.z],b.r*.85,'#f9a884',.65,.42,19);}if(b.type==='disc'){A('cyl',F(b.x,b.y,b.z,.6,.08,.6,t*12),'#e8c58b',.45,2);}else{S(b.x,b.y,b.z,b.r*2.45,b.r*2.45,b.r*2.45,'#502c44',0);orb(b.x,b.y,b.z+.095,b.r*1.70,['roller','shockwave'].includes(b.type)?'#ffb456':'#ff756d',.65);}continue;}
   if(b.type==='grenade'){S(b.x,b.y,b.z,.25,.28,.25,'#bed099',0,2);continue;}
   CombatArt.shot(b,t,s.index);
  }
  for(const a of g.particles)CombatArt.particle(a);
  CombatArt.effects(g);
  R.render(g.cam,g.camY,t,g.shake,g.hurt,g.flash,s.mode==='depth'?(g.depthTravel||0):0);
 }
 return{create,draw,drawEnemy,drawBoss,bossArt:BossMechanics};
})();
