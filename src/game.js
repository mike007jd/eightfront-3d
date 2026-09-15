/* Renderer-independent deterministic 120 Hz combat simulation.
   Migration preserves the source H5's speed, gravity, coyote time, input buffer, fire rates
   and swept projectile tests. New campaign modes are authored here, not in the renderer. */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function segmentBox(a,b,lo,hi){let enter=0,exit=1;for(let i=0;i<a.length;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-9){if(a[i]<lo[i]||a[i]>hi[i])return null;}else{let t0=(lo[i]-a[i])/d,t1=(hi[i]-a[i])/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);exit=Math.min(exit,t1);if(enter>exit)return null;}}return enter;}

/* Surface contact contract. Visual-only, bounded and independent of gameplay RNG.
 * Surface identity includes height/platform index; footprints never project through floors.
 * Events are generated during the fixed update, never by drawing a frame. */
class SurfaceContactSystem {
 constructor(){this.waterTouched=new WeakSet();this.marks=[];this.serial=0;this.capacity=240;this.lifetime=85;this.events=[];}
 reset(){this.waterTouched=new WeakSet();this.marks.length=0;this.events.length=0;this.serial=0;}
 sample(g,x,y,z=0){
  const s=g.stage;if(!s||![x,y,z].every(Number.isFinite)||(s.mode!=='depth'&&Math.abs(z)>2.75))return null;
  const choices=[];
  const push=(a,b,h,material,id,back=-2.6,front=2.65)=>{
   if(x>=a-.13&&x<=b+.13&&z>=back&&z<=front&&Math.abs(h-y)<.14)
    choices.push({a,b,y:h,zMin:back,zMax:front,material,id:`${s.index}:${g.room||0}:${id}`});
  };
  if(s.mode==='depth')push(-6.4,6.4,0,'metal','room',-13,1);
  else for(let i=0;i<s.floors.length;i++){const [a,b,h]=s.floors[i];if(h>-8)push(a,b,h,s.index===4?'snow':s.index===7?'organic':s.index>=5?'metal':'stone','floor'+i);}
  for(let i=0;i<s.platforms.length;i++){const p=s.platforms[i];push(p.a,p.b,g.platformY(p),p.style==='ice'?'snow':p.style==='metal'?'metal':p.style==='organic'?'organic':'stone','platform'+i,-3.15,.10);}
  for(let i=0;i<s.bridges.length;i++){const p=s.bridges[i];if(g.t<p.fallAt+.8)push(p.a,p.b,p.y,'wood','bridge'+i,-1.7,1.7);}
  return choices.sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y)||a.id.localeCompare(b.id))[0]||null;
 }
 stamp(g,p,foot=1,power=.45){
  const surface=this.sample(g,p.x,p.y,p.z||0);if(!surface)return null;
  const face=p.face<0?-1:1,x=Math.max(surface.a+.27,Math.min(surface.b-.27,p.x+face*.42));
  const z=Math.max(surface.zMin+.16,Math.min(surface.zMax-.14,(p.z||0)+foot*.17*face));
  const event={kind:'contact',surface:surface.material,surfaceId:surface.id,x,y:surface.y,z,foot,power,born:g.t,owner:p.id};
  this.events.push(event);if(this.events.length>64)this.events.shift();
  if(surface.material==='snow'){
   const near=this.marks.find(m=>m.surfaceId===surface.id&&Math.abs(m.x-x)<.18&&Math.abs(m.z-z)<.16);
   if(near){near.born=g.t;near.pressure=Math.min(.92,near.pressure+.14);}
   else{this.marks.push({...event,face,id:++this.serial,pressure:Math.min(.90,.50+power*.18),life:this.lifetime});if(this.marks.length>this.capacity)this.marks.shift();}
  }
  return event;
 }
 contact(g,p,kind='step',power=.45,foot=1){
  const e=this.stamp(g,p,foot,power);if(!e)return;
  g.visual('surface',e.x,e.y+.025,e.z,{surface:e.surface,contact:kind,power,life:kind==='land'?.90:.58,owner:p.id});
  // Feet, decals, powder and audio all share this single contact event.
  if(kind!=='launch')g.sound(e.surface+(kind==='land'?'Land':'Step'));
 }
 advance(g,p,old){
  if(p.dead)return;const d=Math.hypot(p.x-old.x,(p.z||0)-old.z);
  // Teleport/respawn and large external fixture jumps cannot draw a connecting trail.
  if(d>1.0)return;
  if(old.grounded&&!p.grounded&&p.vy>0){this.contact(g,p,'launch',.52,-1);return;}
  if(!old.grounded&&p.grounded){
   const power=Math.max(.35,Math.min(1.5,-old.vy/12));
   this.contact(g,p,'land',power,1);this.stamp(g,p,-1,power);return;
  }
  if(!p.grounded||!old.grounded||p.duck||d<.00001)return;
  // Same 4.1 rad/metre and P2 phase offset as the GPU skeleton; touchdown when cos<=0.
  const phaseOffset=(p.id===2?.6:0)-Math.PI/2;
  const before=Math.floor((old.gait*4.1+phaseOffset)/Math.PI),after=Math.floor(((p.gaitDistance||0)*4.1+phaseOffset)/Math.PI);
  if(after>before)this.contact(g,p,'step',.35+Math.min(.30,Math.abs(p.vx||0)/20),after%2===0?1:-1);
 }
 projectiles(g){
  if(typeof WaterEnvironment==='undefined')return;
  const waters=WaterEnvironment.bodies;
  for(const b of g.bullets){if(b.delay>0||this.waterTouched.has(b)||![b.py,b.y].every(Number.isFinite))continue;
   for(const w of waters){if(b.py<=w.y||b.y>w.y)continue;const t=(w.y-b.py)/(b.y-b.py),x=b.px+(b.x-b.px)*t,z=b.pz+(b.z-b.pz)*t;
    if(Math.abs(x-w.x)>w.w/2||Math.abs(z-w.z)>w.d/2)continue;
    this.waterTouched.add(b);g.visual('waterHit',x,w.y+.055,z,{life:.85,power:b.type==='grenade'?1.4:.5,waterId:w.id});break;
   }
  }
 }
 update(g){this.marks=this.marks.filter(m=>g.t-m.born<m.life);}
}

class CampaignGame{
 constructor(callbacks={}){this.surfaceContacts=new SurfaceContactSystem();this.callbacks=callbacks;this.mode='menu';this.difficulty='arcade';this.stageIndex=0;this.logs=[];this.history=[];this.nextId=1;this.seed=712931;this.lastJump=false;this.stage=makeStage(0);this.cam=13;this.camY=0;this.room=0;this.t=0;this.player=null;this.players=[];this.playerCount=1;this.inputMode='modern';this.enemies=[];this.bullets=[];this.particles=[];this.visualEvents=[];this.visualSerial=0;this.pickups=[];this.corpses=[];this.boss=null;this.score=0;this.kills=0;this.deaths=0;this.totalTime=0;this.message='';this.note=0;this.shake=0;this.hurt=0;this.flash=0;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)|0;return(this.seed>>>0)/4294967296;}
 log(event,data={}){this.logs.push({stage:this.stageIndex+1,t:+this.t.toFixed(3),event,...data});if(this.logs.length>5000)this.logs.shift();}
 sound(name){this.callbacks.sound?.(name);}
 announce(text,time=2.8){this.message=text;this.note=time;}
 start(index=0,{practice=false,difficulty=this.difficulty,carry=null,playerCount=carry?.playerCount??this.playerCount,inputMode=carry?.inputMode??this.inputMode}={}){
  this.surfaceContacts.reset();this.stageIndex=clamp(Math.floor(index),0,7);this.stage=makeStage(this.stageIndex);this.difficulty=difficulty==='classic'?'classic':'arcade';this.practice=practice;
  this.playerCount=playerCount===2?2:1;this.inputMode=inputMode==='retro'?'retro':'modern';this.seed=712931+index*781;this.t=0;this.lastJump=false;this.enemies=[];this.bullets=[];this.pickups=[];this.particles=[];this.visualEvents=[];this.visualSerial=0;this.corpses=[];this.boss=null;this.room=0;this.roomTime=0;this.depthTravel=0;this.depthExit=null;this.barrierFade=0;this.depthClock=null;this.boulderClock=0;this.deathDelay=0;this.clearTime=0;this.shake=this.hurt=this.flash=0;
  if(!carry){this.score=0;this.kills=0;this.deaths=0;this.totalTime=0;this.history=[];this.logs=[];}
  this.nextId=1;this.combo=0;this.comboUntil=0;
  const hp=this.difficulty==='classic'?1:3,p=this.stage.spawn;
  this.player={...p,vx:0,vy:0,vz:0,aim:0,face:1,grounded:true,duck:false,shooting:false,shootCD:0,grenadeCD:0,coyote:.105,jumpBuffer:0,airTime:0,jumpTravel:false,landing:0,hp,maxHp:hp,lives:carry?.lives??(this.difficulty==='classic'?5:4),weapon:carry?.weapon&&WEAPONS[carry.weapon]?carry.weapon:'R',reserve:carry?.reserve&&WEAPONS[carry.reserve]?carry.reserve:null,grenades:3,inv:2,recoil:0,muzzle:0,dead:false};
  const template={...this.player};
  this.players=Array.from({length:this.playerCount},(_,i)=>{
   const saved=carry?.players?.[i]||(i===0?carry:null);
   return {...template,dead:saved?.lives===0,id:i+1,x:p.x+(this.stage.mode==='depth'?(this.playerCount===2?(i?1.6:-1.6):0):(i?-1.6:0)),lives:saved?.lives??template.lives,weapon:WEAPONS[saved?.weapon]?saved.weapon:template.weapon,reserve:WEAPONS[saved?.reserve]?saved.reserve:null,lastJump:false,lastFire:false,deathDelay:0,dropTimer:0,dropFloor:-Infinity,dropSurface:null,inv:2};
  });
  this.player=this.players[0];

  this.checkpoint={...p};this.furthest=this.stage.mode==='vertical'?p.y:p.x;this.cam=this.stage.mode==='depth'?0:this.stage.mode==='vertical'?0:13;this.camY=0;
  this.capsules=this.stage.capsules.map(c=>({...c,id:this.nextId++,baseY:c.y}));this.hazards=this.stage.hazards.map(h=>({...h}));
  this.mode='playing';if(this.stage.mode==='depth')this.enterRoom(0);
  this.stageEntry=this.snapshot();this.callbacks.stage?.(this.stage);this.announce(this.stage.cn+' / '+this.stage.subtitle,4);this.log('stage-start',{practice});if(!this.practice)this.callbacks.save?.(this.snapshot());
 }
 snapshot(){const pack=p=>({id:p.id,weapon:p.weapon,reserve:p.reserve,lives:clamp(p.lives,0,7)});return{version:2,stage:this.stageIndex,difficulty:this.difficulty,inputMode:this.inputMode,playerCount:this.playerCount,players:this.players.map(pack),weapon:this.player?.weapon||'R',reserve:this.player?.reserve||null,lives:clamp(this.player?.lives??4,0,7),score:this.score,totalTime:this.totalTime,kills:this.kills,deaths:this.deaths,history:this.history.map(h=>({...h}))};}
 livingPlayers(){return this.players.filter(p=>!p.dead&&p.lives>0);}
 targetPlayer(x=0,y=0,z=0){return this.livingPlayers().sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)||Math.abs(a.y-y)-Math.abs(b.y-y))[0]||this.player;}
 rewardedCarry(){const data=this.snapshot();data.players=data.players.map(p=>({...p,lives:Math.min(7,p.lives+1)}));data.lives=data.players[0].lives;return data;}
 restore(data,{practice=false}={}){this.score=data.score;this.kills=data.kills;this.deaths=data.deaths;this.totalTime=data.totalTime;this.history=data.history.map(h=>({...h}));this.start(data.stage,{practice,difficulty:data.difficulty,carry:data,playerCount:data.playerCount||1,inputMode:data.inputMode||'modern'});}
 nextStage(){if(this.mode!=='clear')return false;if(this.stageIndex===7){this.mode='won';return false;}this.start(this.stageIndex+1,{carry:this.rewardedCarry(),difficulty:this.difficulty,practice:this.practice});return true;}
 restartStage(){const entry=this.stageEntry||this.snapshot(),practice=this.practice;this.restore(entry,{practice});this.log('stage-retry',{practice,restoredHistory:this.history.length});}
 pause(){if(this.mode==='playing')this.mode='paused';else if(this.mode==='paused'){this.mode='playing';this.lastJump=false;for(const p of this.players){p.lastJump=false;p.lastFire=false;}}}
 terrain(x){if(this.stage.mode==='depth')return 0;for(const [a,b,y]of this.stage.floors)if(x>=a&&x<=b)return y;return-15;}
 platformY(p,t=this.t){return p.y+(p.move?.axis==='y'?Math.sin(t*p.move.speed+p.move.phase)*p.move.amp:0);}
 surfaces(x,t=this.t){const a=[this.terrain(x)];for(const p of this.stage.platforms)if(x>=p.a-.13&&x<=p.b+.13)a.push(this.platformY(p,t));for(const p of this.stage.bridges)if(x>=p.a-.06&&x<=p.b+.06&&t<p.fallAt+.8)a.push(p.y);return a;}
 moveActor(a,dt){
  const oldY=a.y;let nx=a.x+a.vx*dt;
  const ground=this.terrain(nx);if(ground>a.y+.34&&a.vy<=0&&ground<5)nx=a.x;
  a.x=nx;a.vy-=30*dt;a.y+=a.vy*dt;a.grounded=false;
  for(const y of this.surfaces(a.x).sort((a,b)=>b-a))if(!(a.dropTimer>0&&y>=a.dropFloor-.12)&&oldY>=y-.10&&a.y<=y&&a.vy<=0){a.y=y;a.vy=0;a.grounded=true;break;}
  if(this.stage.mode==='vertical'&&this.players.includes(a)){a.x=clamp(a.x,-13.5,13.5);if(a.y<this.camY-12)this.damagePlayer(true,a);}
  else if(a.y<-8&&!a.dead){if(this.players.includes(a))this.damagePlayer(true,a);else a.dead=true;}
 }
 spawn(type,x,y=0,z=0,extra={}){
  const hp={runner:1,rifle:2,turret:7,heavy:9,drone:3,tank:28,cart:14,alien:2,crawler:2,pod:9,alienHead:24}[type]||2;
  const e={id:this.nextId++,type,x,y,z,baseX:x,baseY:y,baseZ:z,hp,maxHp:hp,vx:0,vy:0,vz:0,face:-1,aim:Math.PI,age:0,cd:.8+(this.nextId%5)*.22,wind:0,grounded:true,dead:false,hit:0,recoil:0,muzzle:0,airTime:0,...extra};this.enemies.push(e);return e;
 }
 projectile(o){if(this.bullets.length>=480)return;this.bullets.push({id:this.nextId++,x:0,y:0,z:0,px:0,py:0,pz:0,vx:0,vy:0,vz:0,r:.09,damage:1,life:1,age:0,enemy:false,type:'R',gravity:0,pierce:false,remove:false,hitIds:new Set(),...o});this.callbacks.projectile?.(this.bullets.at(-1),this);}
 burst(x,y,z=0,n=10,col='#ffc67e',big=false){for(let i=0;i<n;i++){if(this.particles.length>=280)this.particles.shift();const a=this.random()*Math.PI*2,v=(1+this.random()*4)*(big?1.4:1);this.particles.push({x,y,z,age:0,life:.25+this.random()*.5,vx:Math.cos(a)*v,vy:Math.sin(a)*v+2,vz:(this.random()-.5)*3,size:.045+this.random()*.07,color:col,kind:'spark'});}}
 visual(kind,x,y,z=0,extra={}){if(![x,y,z].every(Number.isFinite))return;this.visualEvents??=[];this.visualSerial=(this.visualSerial||0)+1;this.visualEvents.push({kind,x,y,z,born:this.t,life:1.25,seed:this.visualSerial,...extra});if(this.visualEvents.length>96)this.visualEvents.splice(0,this.visualEvents.length-96);}
 explosion(x,y,z=0,big=false){this.visual('blast',x,y,z,{big,life:1.35});this.burst(x,y,z,big?28:12,'#ffe4a6',big);for(let i=0;i<(big?9:4);i++)this.particles.push({x:x+(this.random()-.5)*.5,y,z,age:0,life:.35+this.random()*.45,vx:(this.random()-.5)*1.5,vy:1+this.random(),vz:0,size:(big?.55:.25)+this.random()*.3,color:i%2?'#ffcd78':'#fa8751',kind:'fire'});this.particles.push({x,y:y+.25,z,age:0,life:big?.9:.55,vx:0,vy:.8,vz:0,size:big?.75:.35,color:'#526066',kind:'smoke'});if(this.particles.length>280)this.particles.splice(0,this.particles.length-280);this.shake=Math.max(this.shake,big?.20:.07);this.sound('explode');}
 muzzlePoint(p=this.player,d=p.aimDirection){
  d=d||[Math.cos(p.aim||0),Math.sin(p.aim||0),0];
  const yaw=this.stage.mode==='depth'?Math.atan2(-d[2],d[0]):(p.face<0?Math.PI:0),reach=1.20-(p.recoil||0);
  return[p.x+d[0]*reach+Math.sin(yaw)*.10,p.y+(p.duck?.60:1.48)+d[1]*reach,p.z+d[2]*reach+Math.cos(yaw)*.10];
 }
 impact(x,y,z,material='metal',n=5){
  this.visual('impact',x,y,z,{surface:material,life:.45});
  const palette={metal:['#f9d792','#bbc9ce'],stone:['#8b988d','#b4b7a5'],flesh:['#835054','#b67769'],organic:['#74968b','#a2b289']};
  const colors=palette[material]||palette.metal;
  for(let i=0;i<n;i++){if(this.particles.length>=280)this.particles.shift();const a=this.random()*6.283,v=(material==='metal'?3.8:1.6)*(.35+this.random());
   this.particles.push({x,y,z,age:0,life:material==='metal'?.18+this.random()*.19:.30+this.random()*.30,vx:Math.cos(a)*v,vy:Math.sin(a)*v+1.2,vz:(this.random()-.5)*1.8,size:material==='metal'?.036+this.random()*.035:.07+this.random()*.07,color:colors[i%2],kind:material==='metal'?'spark':material==='stone'?'dust':'debris',surface:material});
  }
 }
 equip(type,p=this.player){if(!WEAPONS[type]||!p||p.dead)return;if(p.weapon===type){this.score+=200;if(this.difficulty==='arcade')p.hp=Math.min(p.maxHp,p.hp+1);}else{p.reserve=p.weapon;p.weapon=type;}this.announce((p.id===2?'P2 · ':'')+WEAPONS[type].name,1.2);this.sound('pickup');this.log('weapon-collected',{type,player:p.id});}
 swap(p=this.player){if(!p?.reserve)return;[p.weapon,p.reserve]=[p.reserve,p.weapon];p.shootCD=Math.min(p.shootCD,.1);this.sound('swap');}
 // Translate rear-wall X to the player's horizontal screen column. Perspective rooms
 // must not ask players to align unequal world X coordinates which look misaligned.
 // Matches the depth camera in renderer-common.js (FOV/aspect cancel in this ratio).
 depthLaneX(q,p=this.player){
  const boss=!!this.boss?.active,eyeY=boss?3.65:3.25,eyeZ=boss?10.5:10.8,atY=boss?3.2:2.25;
  const slope=(eyeY-atY)/(eyeZ+13),muzzleY=p.y+(p.duck?.60:1.48);
  const near=(eyeZ-p.z)+slope*(eyeY-muzzleY),far=(eyeZ-q.z)+slope*(eyeY-q.y);
  return q.x*near/Math.max(.5,far);
 }
 depthRayX(y,z,p=this.player){const unit={x:1,y,z};return p.x/this.depthLaneX(unit,p);}
 direction(ctrl={},p=this.player){
  if(this.stage.mode==='depth'){
   // Rear-view room combat is positional, not a free-aim third-person shooting gallery.
   // Prone shots stay low; high targets require a jump. Boss facade supports vertical aim.
   const muzzleY=p.y+(p.duck?.60:1.48), boss=!!this.boss?.active;
   let target=null;p.aimTarget=null;
   const candidates=boss?this.boss.targets.filter(q=>this.targetOpen(q)):(this.sensors||[]).filter(q=>q.hp>0);
   const best=candidates.filter(q=>Math.abs(this.depthLaneX(q,p)-p.x)<=.26 && (boss&&!p.duck || Math.abs(q.y-muzzleY)<.50))
    .sort((a,b)=>Math.abs(this.depthLaneX(a,p)-p.x)-Math.abs(this.depthLaneX(b,p)-p.x))[0];
   if(best){target=[best.x,best.y,best.z];p.aimTarget=best.id;}
   else if(ctrl.aimPoint&&this.inputMode!=='retro'){
    const y=boss&&!p.duck?ctrl.aimPoint[1]:clamp(ctrl.aimPoint[1],muzzleY-.22,muzzleY+.22),x=this.depthRayX(y,-14,p);target=[clamp(ctrl.aimPoint[0],x-.48,x+.48),y,-14];
   } else target=[this.depthRayX(muzzleY,-14,p),muzzleY,-14];
   const d=[target[0]-p.x,target[1]-muzzleY,target[2]-p.z],len=Math.hypot(...d)||1;
   return d.map(v=>v/len);
  }
  if(ctrl.aimPoint&&this.inputMode!=='retro'){const dx=ctrl.aimPoint[0]-p.x,dy=ctrl.aimPoint[1]-(p.y+(p.duck?.6:1.48));p.aim=Math.atan2(dy,dx);p.face=dx>=0?1:-1;}
  else{let dx=ctrl.move||(!ctrl.up&&!ctrl.down?p.face:0),dy=ctrl.up?1:ctrl.down&&!p.duck?-1:0;if(p.duck)dx=p.face;if(!dx&&!dy)dx=p.face;p.aim=Math.atan2(dy,dx);}
  return[Math.cos(p.aim),Math.sin(p.aim),0];
 }
 shoot(ctrl={},p=this.player){
  if(!p||p.dead||p.shock>0||this.depthExit?.moving)return false;
  const retro=this.inputMode==='retro',dep=this.stage.mode==='depth',baseWeapon=WEAPONS[p.weapon];
  let w=retro?{...baseWeapon,speed:{R:30,M:36,S:30,L:48,F:24}[p.weapon],interval:p.weapon==='M'?8/60:baseWeapon.interval,life:1.45,damage:p.weapon==='L'?1:p.weapon==='S'?.85:1}:dep&&p.weapon==='F'?{...baseWeapon,speed:32,life:.65}:baseWeapon;
  if(dep&&p.weapon==='F')w={...w,speed:32,life:.70};
  // A full corridor is ~14 world units deep. Shorten the visual feedback delay
  // without changing damage, firing cadence, ammo caps or off-column aiming.
  if(dep&&p.weapon!=='F')w={...w,speed:w.speed*1.4};
  const owner=p.id||1,cap={R:4,F:4,M:6,S:10,L:4}[p.weapon];
  const owned=this.bullets.filter(b=>!b.enemy&&!b.remove&&b.owner===owner&&b.type!=='grenade');
  // New laser presses replace this owner's train, never the other player's shots.
  if(retro&&p.weapon==='L'&&ctrl.firePressed)this.bullets=this.bullets.filter(b=>b.enemy||b.owner!==owner||b.type!=='L');
  const used=this.bullets.filter(b=>!b.enemy&&!b.remove&&b.owner===owner&&b.type!=='grenade').length;
  if(retro&&used>=cap)return false;
  if(retro&&p.weapon==='L'&&this.bullets.some(b=>b.owner===owner&&b.type==='L'&&!b.remove))return false;
  const d=this.direction(ctrl,p),base=[p.x,p.y+(p.duck?.60:1.48),p.z];p.aimDirection=d;
  p.shootCD=w.interval;p.muzzle=p.weapon==='M'?.040:p.weapon==='L'?.045:.060;p.recoil=p.weapon==='S'?.085:p.weapon==='M'?.035:p.weapon==='F'?.018:.055;p.shooting=true;
  const offsets=p.weapon==='S'?[-.25,-.125,0,.125,.25]:[!retro&&p.weapon==='F'?(this.random()-.5)*.18:0];
  const count=retro&&p.weapon==='L'?4:Math.min(offsets.length,retro?cap-used:99);
  for(let i=0;i<count;i++){
   const a=offsets[i]||0;let v;
   if(dep){const yaw=Math.atan2(d[0],-d[2])+a,pitch=Math.asin(clamp(d[1],-1,1));v=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];}
   else{const angle=Math.atan2(d[1],d[0])+a;v=[Math.cos(angle),Math.sin(angle),0];}
   const [x,y,z]=this.muzzlePoint(p,d);
   const delay=retro&&p.weapon==='L'?i*3/60:0;
   this.projectile({owner,x,y,z,vx:v[0]*w.speed,vy:v[1]*w.speed,vz:v[2]*w.speed,r:p.weapon==='F'?.16:.075,damage:w.damage,life:w.life,type:p.weapon,pierce:p.weapon==='L',color:owner===2&&p.weapon==='R'?'#9be9ff':w.color,delay,retro,centerX:x,centerY:y,centerZ:z,normal:dep?[1,0,0]:[-v[1],v[0],0]});
  }
  if(retro&&p.weapon==='M'){p.machineBurst=(p.machineBurst||0)+1;if(p.machineBurst%6===0)p.shootCD=16/60;}
  const muzzle=this.muzzlePoint(p,d);this.visual('shot',...muzzle,{weapon:p.weapon,d:[...d],floor:Math.max(...this.surfaces(p.x).filter(y=>y<=p.y+.05)),owner:p.id,life:1.2});
  this.sound(p.weapon);this.log('shot',{player:owner,weapon:p.weapon,count});return true;
 }
 grenade(p=this.player){if(!p||p.dead||p.grenades<=0||p.grenadeCD>0)return;p.grenades--;p.grenadeCD=.7;const dep=this.stage.mode==='depth';this.projectile({owner:p.id||1,x:p.x+(dep?0:p.face*.6),y:p.y+1.4,z:p.z,vx:dep?0:p.face*10,vy:9,vz:dep?-12:0,gravity:21,life:1.05,type:'grenade',r:.15,damage:12,color:'#e7efa3'});this.sound('jump');}
 damagePlayer(fall=false,p=this.player){if(!p||this.mode!=='playing'||p.dead||this.boss?.dead||(!fall&&p.inv>0))return;p.hp=fall?0:p.hp-1;p.inv=1.6;this.hurt=.85;this.shake=.16;this.sound('hurt');this.log('player-hit',{player:p.id,hp:p.hp,fall});if(p.hp<=0){this.deaths++;p.lives=Math.max(0,p.lives-1);p.dead=true;p.deathDelay=1.1;this.deathDelay=1.1;this.explosion(p.x,p.y+.8,p.z);this.corpses.push({...p,hero:true,deathAge:0});if(this.playerCount===1)this.bullets=this.bullets.filter(b=>!b.enemy);this.log('player-death',{player:p.id,lives:p.lives});}}
 respawn(p=this.player){
  if(p.lives<=0){if(this.players.every(a=>a.dead&&a.lives<=0)){this.mode='over';this.log('game-over');}return;}
  const partner=this.livingPlayers().find(a=>a!==p);let spawn={...this.checkpoint};
  if(this.playerCount===2&&partner){
   const candidates=[];
   for(const dx of [-2,2,-1,1,0]){const x=partner.x+dx;for(const y of this.surfaces(x).filter(y=>y>-6&&y<=partner.y+.1).sort((a,b)=>b-a))candidates.push({x,y,z:partner.z});}
   const safe=candidates.find(a=>a.y>=partner.y-4&&!this.hazards.some(h=>this.hazardState(h).active&&Math.abs(h.x-a.x)<2));
   if(!safe){p.deathDelay=.15;return;} // Wait for a safe landing instead of materialising in a pit.
   spawn=safe;
  }
  Object.assign(p,{...spawn,vx:0,vy:0,vz:0,dead:false,hp:p.maxHp,inv:3,grounded:true,airTime:0,jumpBuffer:0,coyote:.105,lastJump:false,lastFire:false,shootCD:0,deathDelay:0,dropTimer:0,shock:0,barrierContact:false,weapon:this.stage.mode==='depth'?'R':this.inputMode==='retro'?'R':this.boss?.active?'S':'R',reserve:null,grenades:Math.max(1,p.grenades)});
  if(this.playerCount===1||!partner){this.enemies=this.enemies.filter(e=>Math.hypot(e.x-p.x,e.y-p.y,e.z-p.z)>12);this.bullets=[];if(this.stage.mode==='vertical')this.camY=Math.max(0,p.y-2);else if(this.stage.mode==='side')this.cam=clamp(p.x+5,13,this.stage.length-7);}
  if(this.stage.mode==='depth')p.z=partner?Math.max(-8,partner.z):0;
  this.announce('P'+p.id+' REINSERTED / '+p.lives+' LIVES',2);this.log('respawn',{player:p.id});
 }
 hitEnemy(e,damage,contact=null){if(e.dead)return;e.hp-=damage;e.hit=.1;this.impact(...(contact||[e.x,e.y+(e.type==='drone'?0:.95),e.z]),['runner','rifle'].includes(e.type)?'flesh':['pod','alienHead','crawler','alien'].includes(e.type)?'organic':'metal',4);if(e.hp<=0){e.dead=true;this.kills++;this.combo=this.t<this.comboUntil?this.combo+1:1;this.comboUntil=this.t+2.8;this.score+=(['tank','alienHead'].includes(e.type)?900:['turret','heavy','cart'].includes(e.type)?350:150)*Math.min(3,1+Math.floor(this.combo/5));this.log('enemy-killed',{type:e.type});if(e.carrier){this.pickups.push({id:this.nextId++,x:e.x,y:1.4,z:e.z,vy:2,vz:7.5,age:0,type:e.carrier});this.log('carrier-drop',{weapon:e.carrier});}if(['runner','rifle','heavy'].includes(e.type)){this.impact(e.x,e.y+.8,e.z,'flesh',9);this.impact(e.x,e.y+.10,e.z,'stone',5);this.sound('hit');}
 else if(['crawler','alien','pod','alienHead'].includes(e.type)){this.impact(e.x,e.y+.65,e.z,'organic',16);this.particles.push({x:e.x,y:e.y+.7,z:e.z,age:0,life:.65,vx:0,vy:.5,vz:0,size:.5,color:'#56484d',kind:'smoke'});this.sound('explode');}
 else this.explosion(e.x,e.y+.65,e.z,['tank','cart'].includes(e.type));}}
 enterRoom(n){
  this.room=n;this.roomTime=0;this.roomTimer=.40;this.enemies=[];this.bullets=[];this.pickups=[];
  this.sensors=[];this.barrier=n<this.stage.rooms;this.barrierFade=0;this.depthExit=null;this.depthTravel=0;
  this.depthWarning=null;this.rollerClock=2.5;this.patrolCount=0;this.carrierSpawned=false;
  for(const p of this.players){p.z=0;p.vz=0;p.y=0;p.vy=0;p.grounded=true;p.shock=0;p.barrierContact=false;p.x=clamp(p.x,-5.8,5.8);}
  this.checkpoint={x:0,y:0,z:0};
  if(n>=this.stage.rooms){this.activateBoss();this.callbacks.room?.(n);return;}
  this.roomPlan=this.stage.roomPlans[n];
  this.sensors=this.roomPlan.sensors.map(([x,y,hp,r=.62,armor=0],i)=>({id:'sensor'+i,x,y,z:-14,hp,maxHp:hp,armor,maxArmor:armor,r,kind:'sensor',hit:0}));
  for(const [i,[x,y]] of this.roomPlan.turrets.entries())this.spawn('turret',x,y-.65,-13.5,{depthGuard:true,hp:5,maxHp:5,cd:1.6+i*.7});
  this.announce('',0); // RC10: target-local guidance replaces transient room instructions.
  this.log('room-enter',{room:n,plan:n,sensors:this.sensors.length});this.callbacks.room?.(n);
 }
 hitSensor(q,damage,contact=null,projectile=null){
  if(q.hp<=0)return; q.hit=.12;
  if(q.armor>0){const before=q.armor;q.armor=Math.max(0,q.armor-damage);this.callbacks.contact?.({kind:'sensor',outcome:'armor',target:q,projectile,point:contact,amount:before-q.armor},this);this.impact(...(contact||[q.x,q.y,q.z]),'metal',5);if(q.armor===0){this.sound('hit');this.log('sensor-armor-broken',{id:q.id});}return;}
  const before=q.hp;q.hp=Math.max(0,q.hp-damage);this.callbacks.contact?.({kind:'sensor',outcome:'damage',target:q,projectile,point:contact,amount:before-q.hp},this);this.impact(...(contact||[q.x,q.y,q.z]),'metal',4);
  if(q.hp===0){this.explosion(q.x,q.y,q.z);this.score+=200;this.log('sensor-destroyed',{id:q.id,room:this.room});}
 }
 activateBoss(){if(this.boss?.active)return;this.enemies=[];this.bullets=this.bullets.filter(b=>!b.enemy);const s=this.stage,k=s.index,pt=s.bossPoint;
  const b=this.boss={active:true,dead:false,type:k,name:s.boss,t:0,cd:1.7,attack:0,phase:1,targets:[],hit:0,deathTime:0,beam:0,beamY:0,beamFired:false,spawnCD:3.8};
  const target=(id,x,y,z,hp,rx,ry,kind='part')=>b.targets.push({id,x,y,z,baseX:x,baseY:y,baseZ:z,hp,maxHp:hp,rx,ry,rz:s.mode==='depth'?.7:1,kind,wind:0});
  if(k===0){target('lower',pt.x-.4,1.5,0,30,.7,.7);target('upper',pt.x-.4,5.3,0,30,.7,.7);target('core',pt.x-.4,3.3,0,78,.72,.72,'core');this.checkpoint={x:pt.x-17,y:0,z:0};}
  else if(k===1){target('left',-4,1.6,-14,9,.72,.72);target('right',4,1.6,-14,9,.72,.72);target('lower',0,1.6,-14,9,.72,.72);target('upper',0,4.1,-14,9,.72,.72);target('eye',0,5.1,-13.5,48,1.05,.90,'core');for(const side of [-1,1])this.spawn('turret',side*4,4.75,-13.6,{depthGuard:true,bossGun:true,link:side<0?'left':'right',hp:8,maxHp:8,cd:1.5+(side+1)*.4});}
  else if(k===2){target('handL',-5,56.5,-.4,25,1,.9);target('handR',5,56.5,-.4,25,1,.9);target('head',0,59.2,-.4,82,1.05,1.15,'core');this.checkpoint={x:-7,y:54,z:0};}
  else if(k===3){for(let i=0;i<4;i++)target('head'+i,-5+i*3.3,2.3+(i%2)*2.3,-14,30,.9,.9,'core');}
  else if(k===4){target('engineL',pt.x-4,5.6,0,28,.8,.65);target('engineR',pt.x+2,5.6,0,28,.8,.65);target('hull',pt.x-1,6.4,0,88,1.6,.95,'core');this.checkpoint={x:pt.x-17,y:0,z:0};}
  else if(k===5){target('robot',pt.x-3,2.6,0,145,1.0,2.25,'core');this.checkpoint={x:pt.x-17,y:0,z:0};}
  else if(k===6){target('lockL',pt.x-.5,1.6,0,29,.75,.65);target('lockU',pt.x-.5,5.4,0,29,.75,.65);target('gate',pt.x-.5,3.4,0,90,.9,.9,'core');this.checkpoint={x:pt.x-17,y:0,z:0};}
  else {target('sac1',pt.x-1,1.4,0,18,.85,.7);target('sac2',pt.x-1,5.8,0,18,.85,.7);target('sac3',pt.x-1.2,.65,0,18,.85,.7);target('sac4',pt.x-1.2,7.0,0,18,.85,.7);target('heart',pt.x,3.8,0,120,1.15,1.25,'core');this.checkpoint={x:pt.x-18,y:0,z:0};}
  this.announce(s.boss+' / BOSS APPROACH',3);this.sound('warning');this.log('boss-start',{name:s.boss});
 }
 // One authoritative state for collision rules, markers, HUD and objective summaries.
 targetState(q){const b=this.boss;if(!b||!q||q.hp<=0||b.dead)return 'destroyed';
  if(b.type===0&&q.kind==='core')return 'open';
  if(q.kind!=='core')return b.type!==1||(b.t+Math.max(0,b.targets.indexOf(q))*.24)%2.25<1.80?'open':'sealed';
  if(b.targets.some(t=>t.kind!=='core'&&t.hp>0))return 'prerequisite';
  if(b.type===1)return 'open';
  if(b.type===3)return (b.t+Number(q.id.slice(-1))*.7)%3.5<2.65?'open':'sealed';
  if(b.type===5){const c=b.t%6.4;return c<1.1||(c>=2.4&&c<3.1)||c>=4.7?'open':'sealed';}
  if(b.type===7)return b.t%5.4>1.5?'open':'sealed';
  return b.t%3.6<2.55?'open':'sealed';
 }
 targetOpen(q){return this.targetState(q)==='open';}
 hitBoss(q,damage,contact=null,projectile=null){const b=this.boss;if(!this.targetOpen(q)){this.callbacks.contact?.({kind:'boss',outcome:this.targetState(q),target:q,projectile,point:contact,amount:0},this);this.impact(...(contact||[q.x,q.y,q.z]),'metal',3);return false;}const before=q.hp;q.hp=Math.max(0,q.hp-damage);this.callbacks.contact?.({kind:'boss',outcome:'damage',target:q,projectile,point:contact,amount:before-q.hp},this);b.hit=.08;this.impact(...(contact||[q.x,q.y,q.z]),b.type===7?'organic':b.type===2?'stone':'metal',5);if(q.hp===0){this.score+=q.kind==='core'?2200:700;this.explosion(q.x,q.y,q.z,true);this.log('boss-part-destroyed',{part:q.id});}
  const cores=b.targets.filter(t=>t.kind==='core');if(cores.every(t=>t.hp<=0)){b.dead=true;b.deathTime=0;this.enemies=[];this.bullets=this.bullets.filter(t=>!t.enemy);this.score+=5000;this.shake=.4;this.flash=.7;this.log('boss-destroyed');}else if(!b.targets.some(t=>t.kind!=='core'&&t.hp>0)&&b.phase===1){b.phase=2;this.announce(cores.some(q=>this.targetOpen(q))?'核心暴露 / ATTACK THE CORE':'部件已破坏 · 等待核心开启',2.3);}return true;
 }
 enemySalvo(origin,target,speed,count=1,spread=.17,kind='enemy'){const d=target.map((v,i)=>v-origin[i]),len=Math.hypot(...d)||1,v=d.map(v=>v/len);for(let i=0;i<count;i++){const a=(i-(count-1)/2)*spread;let vx,vy,vz;if(this.stage.mode==='depth'){const yaw=Math.atan2(v[0],v[2])+a;vx=Math.sin(yaw)*Math.hypot(v[0],v[2]);vy=v[1];vz=Math.cos(yaw)*Math.hypot(v[0],v[2]);}else{const ang=Math.atan2(v[1],v[0])+a;vx=Math.cos(ang);vy=Math.sin(ang);vz=0;}this.projectile({x:origin[0],y:origin[1],z:origin[2],vx:vx*speed,vy:vy*speed,vz:vz*speed,enemy:true,r:kind==='disc'?.27:.15,life:6,type:kind,color:kind==='disc'?'#ffd899':'#ff777b'});}}
 updateBoss(dt){const b=this.boss;if(!b?.active)return;b.t+=dt;b.hit=Math.max(0,b.hit-dt);
  if(b.dead){b.deathTime+=dt;if(Math.floor(b.deathTime*8)!==Math.floor((b.deathTime-dt)*8)&&b.deathTime<1.7){const q=b.targets[Math.floor(this.random()*b.targets.length)];this.explosion(q.x+(this.random()-.5)*2,q.y+this.random()*2,q.z,true);}if(b.deathTime>2.7)this.clearStage();return;}
  const pt=this.stage.bossPoint,k=b.type,p=this.targetPlayer(pt.x,pt.y,pt.z);
  if(k===1&&b.phase===2){const eye=b.targets.find(q=>q.id==='eye');eye.x=Math.sin(b.t*1.45)*4.4;eye.y=4.8+Math.sin(b.t*2.1)*.35;}
  if(k===3){for(const [i,q]of b.targets.entries()){q.x=Math.sin(b.t*.8+i*Math.PI*.5)*4.8;q.y=2.7+Math.cos(b.t*.8+i*Math.PI*.5)*1.7;}}
  if(k===4){const engines=b.targets.filter(q=>q.kind!=='core'&&q.hp>0).length;
   const dx=Math.sin(b.t*(engines===2?.55:.85))*(engines===2?4:6);
   b.bank=engines===1?(b.targets[0].hp>0?-.16:.16):Math.sin(b.t*.85)*.08;
   for(const q of b.targets){q.x=q.baseX+dx;q.y=q.baseY+Math.sin(b.t*(engines===2?1.3:2.1))*(engines===2?.5:1.0)+(q.baseX-pt.x)*b.bank;}
   b.hint=engines?'BREAK ENGINES / 引擎损坏会改变航线':'HULL OPEN / 躲开俯冲弹幕';
  }
  if(k===5){const q=b.targets[0],cycle=b.t%6.4,lap=Math.floor(b.t/6.4);
   if(b.robotLap!==lap){b.robotLap=lap;b.robotFrom=q.x;b.robotTo=clamp(p.x,pt.x-17,pt.x-5);b.slamFired=false;}
   b.robotState=cycle<1.1?'windup':cycle<2.4?'rush':cycle<3.1?'windup':cycle<4.7?'leap':'recover';
   if(cycle<1.1)q.x=b.robotFrom;
   else if(cycle<2.4)q.x=b.robotFrom+(b.robotTo-b.robotFrom)*Math.min(1,(cycle-1.1)/1.3);
   else if(cycle<3.1)q.x=b.robotTo;
   else if(cycle<4.7){const u=(cycle-3.1)/1.6;q.x=b.robotTo+(pt.x-5-b.robotTo)*u;}
   q.y=q.baseY+(b.robotState==='leap'?Math.sin((cycle-3.1)/1.6*Math.PI)*4.0:0);
   if(cycle>=4.7&&!b.slamFired){b.slamFired=true;for(const dir of [-1,1])this.projectile({x:q.x,y:.36,z:0,vx:dir*9,vy:0,r:.26,life:3,enemy:true,type:'shockwave',color:'#ff986a'});this.shake=.23;this.sound('slam');this.log('robot-slam');}
   b.hint=b.robotState==='windup'?'WIND-UP / 准备闪避':b.robotState==='rush'?'RUSH / 跳过冲撞':b.robotState==='leap'?'SLAM INCOMING / 落地前起跳':'RECOVERING / 攻击窗口';
   for(const a of this.livingPlayers())if(Math.abs(a.x-q.x)<1.15&&a.y<q.y+1.3&&a.y+(a.duck?.6:1.65)>q.y-2.1)this.damagePlayer(false,a);
  }
  if(k===6)b.hint='BREAK LOCKS / 留意滚轮与压机';
  if(k===7){b.hint=b.phase===1?'BURST THE SACS / 孢囊正在孵化':this.targetOpen(b.targets.at(-1))?'HEART EXPOSED / 清场并攻击':'HEART SEALED / 躲避酸液';
   if(b.acidPatch){b.acidPatch.age+=dt;const a=b.acidPatch;if(a.age>.9&&a.age<3.3)for(const u of this.livingPlayers())if(Math.abs(u.x-a.x)<1.5&&u.y<.5)this.damagePlayer(false,u);if(a.age>=3.3)b.acidPatch=null;}
  }
  b.cd-=dt;if(b.cd<.65&&b.cd>0)b.telegraph=true;
  if(b.cd<=0&&!p.dead){b.telegraph=false;b.attack++;const alive=b.targets.filter(q=>q.hp>0),q=alive[b.attack%alive.length],o=[q.x,q.y,q.z],aim=[p.x,p.y+(this.stage.mode==='depth'?1.35:(p.duck?.4:.95)),p.z];
   if(k===0){this.enemySalvo(o,aim,7.9,b.phase===1?3:5,.16);b.cd=b.phase===1?1.65:1.75;}
   else if(k===1){if(b.phase===2){const eye=b.targets.find(a=>a.id==='eye'),d=[p.x-eye.x,1.28-eye.y,p.z-eye.z],len=Math.hypot(...d);this.projectile({x:eye.x,y:eye.y,z:eye.z+.7,vx:d[0]/len*8,vy:d[1]/len*8,vz:d[2]/len*8,enemy:true,type:'orb',r:.35,hp:2,destructible:true,life:5,color:'#f29a62'});}b.cd=b.phase===2?.72:1.9;}
   else if(k===2){this.enemySalvo(o,aim,7.0,5,.23);if(b.attack%3===0)this.projectile({x:p.x,y:p.y+12,z:0,vy:-2,gravity:13,r:.6,life:5,enemy:true,destructible:true,hp:3,type:'boulder',color:'#e8b58c'});b.cd=2.0;}
   else if(k===3){for(const a of alive.filter((q,i)=>i%2===b.attack%2))this.enemySalvo([a.x,a.y,a.z],aim,8.5,2,.13);b.cd=1.85;}
   else if(k===4){const engines=b.targets.filter(q=>q.kind!=='core'&&q.hp>0).length;this.enemySalvo(o,aim,engines?7.4:8.2,engines?3:5,.18);if(b.attack%4===0&&engines>0)this.spawn('drone',pt.x-9,5);b.cd=engines===2?1.9:1.55;}
   else if(k===5){if(b.robotState==='recover')this.enemySalvo([q.x-1,q.y+.6,0],aim,7,2,.19,'disc');b.cd=2.3;}
   else if(k===6){this.enemySalvo(o,aim,7.3,2,.16);if(b.attack%2===0)this.projectile({x:pt.x-1,y:.38,z:0,vx:-7.2,r:.26,life:4,enemy:true,type:'roller',color:'#ff927b'});if(b.attack%4===0)this.spawn('cart',pt.x-2,0);b.cd=2.0;}
   else{this.enemySalvo(o,aim,6.8,b.phase===1?3:5,.22);if(b.attack%3===0&&b.targets.some(t=>t.kind!=='core'&&t.hp>0)){this.spawn('alien',pt.x-4,0);this.log('sac-hatched');}if(b.attack%2===0&&!b.acidPatch){b.acidPatch={x:clamp(p.x,pt.x-19,pt.x-4),age:0};this.sound('warning');this.log('acid-warning');}b.cd=2.0;}
   if(k===0&&b.phase>=2&&b.attack%2===0){b.beam=1.6;b.beamFired=false;b.beamY=b.attack%4===0?2.75:.62;this.sound('warning');this.log('beam-warning',{y:b.beamY});}
  }
  if(b.beam>0){b.beam-=dt;if(b.beam<.44&&!b.beamFired){b.beamFired=true;this.sound('L');}if(b.beamFired&&b.beam>0)for(const a of this.livingPlayers()){const low=a.y+.12,hi=a.y+(a.duck?.60:1.65);if(b.beamY+.14>low&&b.beamY-.14<hi)this.damagePlayer(false,a);}}
 }
 clearStage(){if(this.mode!=='playing')return;this.mode=this.stageIndex===7?'won':'clear';this.history.push({stage:this.stageIndex+1,time:+this.t.toFixed(2),score:this.score});this.log('stage-clear');this.announce(this.stageIndex===7?'MISSION COMPLETE / 岛屿已解放':'STAGE CLEAR / 区域已夺回',9);this.sound('win');if(!this.practice){if(this.stageIndex<7)this.callbacks.save?.({...this.rewardedCarry(),stage:this.stageIndex+1});else this.callbacks.complete?.();}}
 updateDepth(dt,controls){
  if(this.boss?.active)return;
  const active=this.livingPlayers(),p=this.targetPlayer(0);this.roomTime+=dt;
  this.barrierFade=Math.max(0,this.barrierFade-dt);
  for(const q of this.sensors)q.hit=Math.max(0,q.hit-dt);
  if(this.barrier){
   // NES baseline: no hidden arcade-style corridor time limit.

   // Crossing soldiers replace random stationary turrets. Spawn on a visible rear catwalk.
   this.roomTimer-=dt;
   if(this.roomTimer<=0&&active.length){
    if(this.enemies.filter(e=>e.depthPatrol).length<3){
     const side=this.patrolCount++%2?-1:1,carrier=!this.carrierSpawned&&this.roomPlan.carrier;
     this.spawn('rifle',side*6.6,0,-12,{depthPatrol:true,travel:-side*3.1,grenadier:!carrier&&!!this.roomPlan.grenadiers,carrier:carrier||null,cd:1.05,wind:0,hp:1,maxHp:1});
     if(carrier)this.carrierSpawned=true;
    }
    this.roomTimer=this.roomPlan.patrol;
   }
   if(this.roomPlan.rollers){this.rollerClock-=dt;
    if(this.rollerClock<.75&&!this.depthWarning){const lanes=this.roomPlan.rollers,x=lanes[(this.patrolCount+Math.floor(this.roomTime/3.5))%lanes.length];this.depthWarning={x,y:.3,remaining:.75,source:'roller-port'};}
    if(this.rollerClock<=0){const x=this.depthWarning?.x||0;this.projectile({x,y:.32,z:-13,vz:7,r:.30,enemy:true,destructible:true,hp:1,type:'roller',life:4});this.depthWarning=null;this.rollerClock=3.6;}
   }
   if(this.roomTime>17&&Math.floor((this.roomTime-17)/2)!==Math.floor((this.roomTime-dt-17)/2))for(const q of this.sensors.filter(q=>q.hp>0))this.enemySalvo([q.x,1.4,q.z],[p.x,1.4,0],7.2);
   // Barrier contact stuns; it never damages health or grants invulnerability.
   for(const u of active){const c=controls[u.id-1]||{};u.vz=0;
    if(!c.up)u.barrierContact=false;
    if(c.up&&!u.barrierContact&&!(u.shock>0)){u.barrierContact=true;u.shock=.65;u.z=-.28;u.vx=0;u.duck=false;u.muzzle=0;this.sound('hit');this.log('barrier-stun',{player:u.id});}
    if(!(u.shock>0))u.z=0;
   }
   if(this.sensors.every(q=>q.hp<=0)){
    this.barrier=false;this.barrierFade=.38;this.depthWarning=null;
    this.enemies=[];this.bullets=this.bullets.filter(b=>!b.enemy);
    this.depthExit={moving:false,t:0};this.announce('',0);this.sound('pickup');this.log('barrier-down',{room:this.room});
   }
  } else if(this.depthExit){
   if(!this.depthExit.moving&&active.some(u=>controls[u.id-1]?.up)){this.depthExit.moving=true;this.log('room-advance',{room:this.room});}
   if(this.depthExit.moving){
    this.depthExit.t+=dt;const travel=Math.min(10.6,this.depthExit.t*12.5);this.depthTravel=-travel;
    for(const u of active){u.gaitDistance=(u.gaitDistance||0)+12.5*dt;u.z=-travel;u.vz=-12.5;u.shock=0;u.y=0;u.duck=false;u.grounded=true;}
    if(travel>=10.6){this.score+=600;this.enterRoom(this.room+1);}
   }
  }
 }

 hazardState(h){const v=((this.t+(h.phase||0))%(h.period||4))/(h.period||4);if(h.type==='flame'||h.type==='acid')return{active:v>.48&&v<.84,warn:v>.32&&v<=.48,v};if(h.type==='crusher'){const bottom=v<.42?5.0:v<.58?5*(1-(v-.42)/.16):v<.75?0:5*(v-.75)/.25;return{active:v>=.42&&v<.80,warn:v>.26&&v<=.42,bottom,v};}return{active:false,warn:false,v};}
 updateHazards(dt){const active=this.livingPlayers();if(!active.length||this.boss?.dead)return;
  for(const h of this.hazards){
   if(h.type==='mine'){if(h.dead)continue;if(!h.armed&&active.some(p=>Math.abs(p.x-h.x)<1.05&&p.y<.7)){h.armed=true;h.timer=.48;}if(h.armed){h.timer-=dt;if(h.timer<=0){h.dead=true;this.explosion(h.x,.2,0,true);for(const p of active)if(Math.hypot(p.x-h.x,p.y)<2.1)this.damagePlayer(false,p);}}}
   else if(h.type==='boulder'){if(!active.some(p=>Math.abs(p.y-h.y)<=12))continue;const tick=Math.floor((this.t+h.phase)/h.period);if(h.last!==undefined&&h.last!==tick)this.projectile({x:h.x,y:h.y+6,z:0,vx:Math.sin(this.t)*.3,vy:-1,gravity:12,r:.55,enemy:true,destructible:true,hp:3,type:'boulder',life:5,color:'#b7b8a2'});h.last=tick;}
   else{const hs=this.hazardState(h);if(hs.active){const w=h.type==='acid'?h.width:1.45;for(const p of active)if(Math.abs(p.x-h.x)<w*.5+.24){const lo=h.type==='crusher'?hs.bottom:h.y,hi=h.type==='crusher'?hs.bottom+4.8:h.type==='acid'?h.y+.4:h.y+h.height;if(p.y+(p.duck?.60:1.65)>lo&&p.y+.1<hi)this.damagePlayer(false,p);}}}
  }
 }
 updateEnemies(dt){const dep=this.stage.mode==='depth',vertical=this.stage.mode==='vertical';
  for(const e of this.enemies){if(e.dead)continue;const p=this.targetPlayer(e.x,e.y,e.z);e.gaitDistance=(e.gaitDistance||0)+Math.hypot(e.vx||0,e.vz||0)*dt;e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.muzzle=Math.max(0,e.muzzle-dt);e.recoil*=Math.exp(-dt*25);
   if(!dep&&this.livingPlayers().length&&this.livingPlayers().every(a=>Math.abs(e.x-a.x)>45||(vertical&&e.y<a.y-17))){e.dead=true;continue;}
   if(dep&&(e.depthPatrol||e.depthGuard)){
    if(e.bossGun&&this.boss?.targets.find(q=>q.id===e.link)?.hp<=0){e.dead=true;continue;}
    e.face=e.travel?Math.sign(e.travel):1;e.aimDirection=[0,0,1];
    if(e.depthPatrol){e.vx=e.wind>0?0:e.travel;e.x+=e.vx*dt;if(Math.abs(e.x)>7.5){e.dead=true;continue;}}
    const ey=e.y+(e.type==='turret'?.65:1.42);
    if(e.wind>0){e.wind-=dt;if(e.wind<=0){
     if(e.grenadier){const tx=e.lockedAim[0],dist=13,flight=1.65;this.projectile({x:e.x,y:1.5,z:e.z,vx:(tx-e.x)/flight,vy:4.65,vz:dist/flight,gravity:6.1,r:.22,life:3,enemy:true,type:'baseBomb',destructible:true,hp:1});}
     else this.enemySalvo([e.x,ey,e.z+.45],e.lockedAim,e.bossGun?7.2:7.0,e.bossGun?3:1,.16);
     e.muzzle=.09;e.recoil=.06;e.cd=e.depthPatrol?3.2:2.65;
    }}else{e.cd-=dt;if(e.cd<=0){e.wind=e.grenadier?.66:.48;e.lockedAim=[p.x,1.42,0];}}
    continue;
   }
   e.face=p.x>=e.x?1:-1;
   if(e.type==='drone'){e.x=e.baseX+Math.sin(e.age*.8)*1.8;e.y=e.baseY+Math.sin(e.age*2+e.id)*.6;}
   else if(['alien','crawler'].includes(e.type)){e.vx=e.face*(e.type==='crawler'?3.5:2.5);if(e.grounded&&e.age%(e.type==='alien'?1.4:3.5)<dt){e.vy=e.type==='alien'?11:6;e.grounded=false;}this.moveActor(e,dt);}
   else if(!dep&&!['turret','pod','alienHead'].includes(e.type)){e.vx=e.type==='runner'?-2.6:e.type==='cart'?-3.1:e.type==='tank'?-.4:e.type==='heavy'?-.65:0;this.moveActor(e,dt);}
   if(e.type==='pod'){e.cd-=dt;if(e.cd<=0&&Math.abs(e.x-p.x)<18){this.spawn('alien',e.x-1,e.y);e.cd=3.0;}continue;}
   const ey=e.y+(e.type==='turret'?.65:e.type==='drone'?0:e.type==='tank'?1.1:e.type==='cart'?.8:e.type==='alienHead'?2.0:1.45);
   const d=[p.x-e.x,p.y+(p.duck?.4:1)-ey,p.z-e.z];if(e.wind<=0)e.aim=Math.atan2(d[1],d[0]);
   const visible=dep?e.age>.7:Math.abs(e.x-this.cam)<17&&(vertical?Math.abs(e.y-p.y)<12:true)&&e.age>.7;
   if(e.wind>0){e.wind-=dt;if(e.wind<=0&&!p.dead){this.enemySalvo([e.x+(dep?0:Math.cos(e.aim)*.8),ey,e.z+(dep?.5:0)],e.lockedAim||[p.x,p.y+(dep?1.35:(p.duck?.4:1)),p.z],e.type==='tank'?6.5:6.8,['heavy','turret','alienHead'].includes(e.type)?3:1,.15);e.muzzle=.08;e.recoil=.06;}}
   else if(visible&&!p.dead&&!['alien','crawler','cart'].includes(e.type)){e.cd-=dt;if(e.cd<=0&&this.bullets.filter(b=>b.enemy).length<45){e.lockedAim=[p.x,p.y+(dep?1.35:(p.duck?.4:1)),p.z];
    if(this.inputMode==='retro'&&!dep){const step=Math.PI/(e.type==='turret'?6:12),angle=Math.round(Math.atan2(e.lockedAim[1]-ey,p.x-e.x)/step)*step;e.aim=angle;e.lockedAim=[e.x+Math.cos(angle)*20,ey+Math.sin(angle)*20,e.z];}
    e.targetId=p.id;e.wind=['turret','tank','alienHead'].includes(e.type)?.62:.46;e.cd=e.type==='heavy'?2.2:e.type==='tank'?2.7:e.type==='runner'?2.8:2.2;}}
   const ew=['tank','cart','alienHead'].includes(e.type)?1.3:.5;
   for(const a of this.livingPlayers())if(Math.abs(a.x-e.x)<ew&&Math.abs(a.z-e.z)<.9&&Math.abs(a.y-e.y)<(e.type==='drone'?.7:1.5))this.damagePlayer(false,a);
  }this.enemies=this.enemies.filter(e=>!e.dead);
 }
 enemyBounds(e,r){const type=e.type,wide=['tank','alienHead'].includes(type)?1.5:type==='cart'?1.15:type==='turret'?.55:type==='drone'?.60:type==='pod'?.70:.4,h=type==='drone'?.70:type==='turret'?1.0:type==='tank'?1.7:type==='cart'?1.2:type==='alienHead'?3.3:type==='crawler'?.65:2.0;
  return{lo:[e.x-wide-r,e.y+(type==='drone'?-.35:.03)-r,e.z-.65-r],hi:[e.x+wide+r,e.y+(type==='drone'?.35:h)+r,e.z+.65+r]};}
 updateProjectiles(dt){const p=this.player,dep=this.stage.mode==='depth',stepId=this.projectileStep=(this.projectileStep||0)+1;const destructibles=this.bullets.filter(b=>b.enemy&&b.destructible&&!b.remove);
  for(const b of this.bullets){if(b.remove)continue;if(b.delay>0){b.delay=Math.max(0,b.delay-dt);continue;}b.age+=dt;b.life-=dt;b.px=b.x;b.py=b.y;b.pz=b.z;b.stepId=stepId;b.vy-=b.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   if(b.retro&&b.type==='F'){b.centerX+=b.vx*dt;b.centerY+=b.vy*dt;b.centerZ+=b.vz*dt;const angle=b.age*24,r=.35*Math.min(1,b.age*10),side=Math.sin(angle)*r,along=(Math.cos(angle)-1)*r,speed=Math.hypot(b.vx,b.vy,b.vz)||1;b.x=b.centerX+b.normal[0]*side+b.vx/speed*along;b.y=b.centerY+b.normal[1]*side+b.vy/speed*along;b.z=b.centerZ+b.normal[2]*side+b.vz/speed*along;}
   const from=[b.px,b.py,b.pz],to=[b.x,b.y,b.z];
   if(b.type==='grenade'){const floor=dep?0:Math.max(...this.surfaces(b.x).filter(y=>y<=b.py+.15));if(b.life<=0||b.y<=floor+.12){this.explosion(b.x,Math.max(floor+.2,b.y),b.z,true);for(const e of this.enemies)if(Math.hypot(e.x-b.x,e.y+.8-b.y,e.z-b.z)<5.2)this.hitEnemy(e,12);if(this.boss?.active)for(const q of this.boss.targets)if(Math.hypot(q.x-b.x,q.y-b.y,q.z-b.z)<5.3)this.hitBoss(q,12,null,b);if(dep)for(const q of this.sensors)if(Math.hypot(q.x-b.x,q.y-b.y,q.z-b.z)<5)this.hitSensor(q,5,null,b);for(const a of this.bullets)if(a.enemy&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<4)a.remove=true;b.remove=true;}continue;}
   if(b.life<=0||this.livingPlayers().every(a=>Math.abs(b.x-a.x)>48||Math.abs(b.y-a.y)>32)||b.y<-9||b.z<-25||b.z>18){b.remove=true;continue;}
   if(b.type==='baseBomb'&&b.y<=.24){this.explosion(b.x,.18,b.z);for(const u of this.livingPlayers())if(Math.hypot(u.x-b.x,u.z-b.z)<1.15&&u.y<.85)this.damagePlayer(false,u);b.remove=true;continue;}
   if(b.enemy){let victim=null,first=Infinity;for(const u of this.livingPlayers()){if(u.inv>0)continue;const h=u.duck?.62:1.65;const hit=segmentBox(from,to,[u.x-.25-b.r,u.y+.12-b.r,u.z-.35-b.r],[u.x+.25+b.r,u.y+h+b.r,u.z+.35+b.r]);if(hit!==null&&hit<first){first=hit;victim=u;}}if(victim){b.remove=true;this.damagePlayer(false,victim);}continue;}
   for(const hazard of destructibles){if(!hazard.enemy||!hazard.destructible||hazard.remove)continue;const rr=hazard.r+b.r+.10;
    const stepped=hazard.stepId===stepId,h0=stepped?[hazard.px,hazard.py,hazard.pz]:[hazard.x,hazard.y,hazard.z],h1=stepped?[hazard.x,hazard.y,hazard.z]:[hazard.x+hazard.vx*dt,hazard.y+hazard.vy*dt,hazard.z+hazard.vz*dt];const relativeFrom=[b.px-h0[0],b.py-h0[1],b.pz-h0[2]],relativeTo=[b.x-h1[0],b.y-h1[1],b.z-h1[2]];
    if(segmentBox(relativeFrom,relativeTo,[-rr,-rr,-rr],[rr,rr,rr])!==null){this.callbacks.contact?.({kind:'other',projectile:b},this);hazard.hp-=b.damage;if(hazard.hp<=0){hazard.remove=true;this.impact(hazard.x,hazard.y,hazard.z,hazard.type==='boulder'?'stone':'metal',6);this.score+=50;}b.remove=true;break;}}
   if(b.remove)continue;
   for(const e of this.enemies){if(e.dead||b.hitIds.has(e.id))continue;const bounds=this.enemyBounds(e,b.r),hit=segmentBox(from,to,bounds.lo,bounds.hi);if(hit!==null){this.callbacks.contact?.({kind:'other',projectile:b},this);this.hitEnemy(e,b.damage,from.map((v,i)=>v+(to[i]-v)*hit));b.hitIds.add(e.id);if(!b.pierce){b.remove=true;break;}}}if(b.remove)continue;
   if(dep&&!this.boss?.active)for(const q of this.sensors){if(q.hp<=0||b.hitIds.has(q.id))continue;const hit=segmentBox(from,to,[q.x-q.r,q.y-q.r,q.z-.4],[q.x+q.r,q.y+q.r,q.z+.4]);if(hit!==null){this.hitSensor(q,b.damage,from.map((v,i)=>v+(to[i]-v)*hit),b);b.remove=true;b.hitIds.add(q.id);break;}}
   for(const c of this.capsules){if(c.hp<=0)continue;const yy=c.y+Math.sin(this.t*2.8+c.x)*.18;if(segmentBox(from,to,[c.x-.6,yy-.42,c.z-.55],[c.x+.6,yy+.42,c.z+.55])!==null){c.hp=0;this.pickups.push({id:this.nextId++,x:c.x,y:yy,z:c.z,vy:2,age:0,type:c.type});this.burst(c.x,yy,c.z,8,'#d5f5c4');b.remove=true;break;}}if(b.remove)continue;
   if(this.boss?.active&&!this.boss.dead){let nearest=null,tmin=2;for(const q of this.boss.targets){if(q.hp<=0||b.hitIds.has(q.id))continue;const h=segmentBox(from,to,[q.x-q.rx-b.r,q.y-q.ry-b.r,q.z-q.rz-b.r],[q.x+q.rx+b.r,q.y+q.ry+b.r,q.z+q.rz+b.r]);if(h!==null&&h<tmin){tmin=h;nearest=q;}}if(nearest){this.hitBoss(nearest,b.damage,from.map((v,i)=>v+(to[i]-v)*tmin),b);b.hitIds.add(nearest.id);b.remove=true;}}
  }this.bullets=this.bullets.filter(b=>!b.remove);
 }
 updatePlayer(p,ctrl,dt){
  if(p.dead){p.deathDelay-=dt;if(p.deathDelay<=0)this.respawn(p);return;}
  const oldX=p.x,oldZ=p.z,grounded=p.grounded,retro=this.inputMode==='retro';
  const contactBefore={x:p.x,z:p.z||0,vy:p.vy,grounded:p.grounded,gait:p.gaitDistance||0};
  p.inv=Math.max(0,p.inv-dt);p.shootCD=Math.max(-.05,p.shootCD-dt);p.grenadeCD=Math.max(0,p.grenadeCD-dt);p.muzzle=Math.max(0,p.muzzle-dt);p.recoil*=Math.exp(-dt*30);p.landing=Math.max(0,p.landing-dt);p.dropTimer=Math.max(0,(p.dropTimer||0)-dt);
  p.shock=Math.max(0,(p.shock||0)-dt);
  if(p.shock>0||this.depthExit?.moving){p.vx=0;p.shooting=false;p.muzzle=0;p.jumpBuffer=0;p.lastJump=!!ctrl.jump;p.lastFire=!!ctrl.fire;if(!p.grounded)this.moveActor(p,dt);return;}
  p.coyote=p.grounded?.105:Math.max(0,p.coyote-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
  if(ctrl.jumpPressed||(ctrl.jump&&!p.lastJump))p.jumpBuffer=.125;
  const firePressed=!!ctrl.firePressed||(ctrl.fire&&!p.lastFire);p.lastFire=!!ctrl.fire;p.lastJump=!!ctrl.jump;if(p.id===1)this.lastJump=p.lastJump;
  p.duck=!!ctrl.down&&p.grounded&&!ctrl.move&&!ctrl.lock;
  const axis=ctrl.move&&!ctrl.lock?Math.sign(ctrl.move):0;
  // Retro keeps horizontal travel when released in the air; reverse still responds instantly.
  if(!retro||p.grounded||axis)p.vx=axis*(this.stage.mode==='depth'?7.0:p.y<-2?5.3:8.2);
  if(axis)p.face=axis;
  if(p.jumpBuffer>0&&p.coyote>0){
   const oneWay=this.stage.platforms.find(q=>p.x>=q.a-.13&&p.x<=q.b+.13&&Math.abs(this.platformY(q)-p.y)<.15);
   if(ctrl.down&&!ctrl.move&&oneWay){p.dropTimer=.3;p.dropFloor=p.y;p.vy=-1;p.y-=.12;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.log('platform-drop',{player:p.id});}
   else if(!p.duck){p.vy=14.5;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.airTime=0;p.jumpTravel=Math.abs(p.vx)>.3;this.sound('jump');this.log('jump',{player:p.id,x:+p.x.toFixed(2),y:+p.y.toFixed(2)});}
  }
  if(!retro&&!ctrl.jump&&p.vy>5.8)p.vy=5.8;
  this.moveActor(p,dt);if(p.dead)return;
  if(this.stage.mode==='depth')p.x=clamp(p.x,-6.2,6.2);
  else if(this.stage.mode==='vertical')p.x=clamp(p.x,-13,13);
  else p.x=clamp(p.x,this.boss?.active?this.stage.length-21:Math.max(1,this.cam-(this.cameraHalfWidth||18)+1),this.boss?.active?this.stage.length-2.5:this.stage.length-1);
  if(!p.grounded)p.airTime+=dt;else p.airTime=0;
  if(!grounded&&p.grounded){p.landing=.18;
   // Preserve the legacy RNG stream (4 dust particles × 5 draws), but do NOT spawn
   // stone dust on every material. RC9 effects below use only visual serials.
   for(let legacy=0;legacy<20;legacy++)this.random();
   this.log('land',{player:p.id,x:+p.x.toFixed(2),y:+p.y.toFixed(2)});
  }
  p.gaitDistance=(p.gaitDistance||0)+(p.grounded?Math.hypot(p.x-oldX,p.z-oldZ):0);
  this.surfaceContacts.advance(this,p,contactBefore);
  p.shooting=!!ctrl.fire||!!ctrl.firePressed;p.aimDirection=this.direction(ctrl,p);
  const semi=retro&&['R','S','F'].includes(p.weapon),canFire=semi?firePressed:(ctrl.fire||firePressed);
  if(canFire&&(p.shootCD<=0||(retro&&p.weapon==='L'&&firePressed)))this.shoot({...ctrl,firePressed},p);
  if(!ctrl.fire)p.machineBurst=0;if(ctrl.swap)this.swap(p);if(ctrl.grenade)this.grenade(p);
 }
 update(dt,ctrl={}){
  if(this.mode!=='playing')return;dt=clamp(dt,0,1/30);
  const inputs=Array.isArray(ctrl)?ctrl:[ctrl,ctrl.p2||{}];
  this.t+=dt;this.surfaceContacts.update(this);this.visualEvents=(this.visualEvents||[]).filter(e=>this.t-e.born<e.life);this.totalTime+=dt;this.note=Math.max(0,this.note-dt);this.shake=Math.max(0,this.shake-dt*.75);this.hurt=Math.max(0,this.hurt-dt*1.7);this.flash=Math.max(0,this.flash-dt*2);
  const dep=this.stage.mode==='depth',vertical=this.stage.mode==='vertical';
  for(const p of this.players)this.updatePlayer(p,inputs[p.id-1]||{},dt);
  if(this.mode!=='playing')return;
  if(dep)this.updateDepth(dt,inputs);
  let active=this.livingPlayers();const lead=active.reduce((a,b)=>((vertical?b.y:b.x)>(vertical?a.y:a.x)?b:a),active[0]||this.player);
  const progress=active.length?(vertical?lead.y:lead.x):this.furthest;if(active.length)this.furthest=Math.max(this.furthest,progress);
  // Keep players together without teleporting through hazards. The shared camera
  // waits for the trailing player; the leader meets a visible screen boundary.
  if(active.length===2){
   if(vertical){const low=Math.min(...active.map(a=>a.y));for(const p of active)if(p.y>low+8.5){p.y=low+8.5;p.vy=Math.min(0,p.vy);}}
   else if(!dep){const lo=Math.min(...active.map(a=>a.x)),maxSeparation=Math.min(19,2*(this.cameraHalfWidth||14)-4);for(const p of active)if(p.x>lo+maxSeparation){p.x=lo+maxSeparation;p.vx=0;}}
  }
  for(const cp of this.stage.checkpoints)if((vertical?progress>=cp.y:progress>=cp.x+.3)&&(vertical?this.checkpoint.y<cp.y:this.checkpoint.x<cp.x)){
   this.checkpoint={...cp,z:0};for(const p of active){if(this.difficulty==='arcade')p.hp=p.maxHp;p.grenades=Math.min(3,p.grenades+1);}this.announce('RELAY ACTIVE / 复活点已激活',2);this.log('checkpoint',cp);
  }
  // The boss arena never starts with the other survivor left behind the lock.
  if(!dep&&!this.boss?.active&&active.length&&active.every(p=>vertical?p.y>=53.9:p.x>this.stage.length-18))this.activateBoss();
  for(const br of this.stage.bridges)if(active.some(p=>p.x>br.a+2)&&br.fallAt===Infinity)br.fallAt=this.t+.7;
  if(!this.boss?.active&&!dep)for(const e of this.stage.events)if(!e.done&&progress>=e.trigger&&this.enemies.length<16){this.spawn(e.type,e.x,e.y,e.z||0);e.done=true;}
  this.updateHazards(dt);this.updateEnemies(dt);this.updateBoss(dt);this.updateProjectiles(dt);this.surfaceContacts.projectiles(this);
  active=this.livingPlayers();
  for(const a of this.pickups){
   a.age+=dt;if(dep&&a.vz){a.z=Math.min(0,a.z+a.vz*dt);if(a.z===0)a.vz=0;}a.vy-=11*dt;a.y+=a.vy*dt;const floor=Math.max(...this.surfaces(a.x).filter(y=>y<=a.y-a.vy*dt+.05))+.48;if(a.y<floor){a.y=floor;a.vy=0;}
   const ordered=active.map(p=>({p,d:Math.hypot(a.x-p.x,a.y-(p.y+.85),a.z-p.z)})).sort((a,b)=>a.d-b.d||a.p.id-b.p.id),nearest=ordered[0];
   if(nearest){const {p,d}=nearest;if(d<2.6){a.x+=(p.x-a.x)*Math.min(1,dt*7);a.y+=(p.y+.85-a.y)*Math.min(1,dt*7);a.z+=(p.z-a.z)*Math.min(1,dt*7);}if(d<.86){this.equip(a.type,p);a.remove=true;}}
  }
  this.pickups=this.pickups.filter(a=>!a.remove&&a.age<40);
  for(const a of this.particles){a.age+=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.z+=a.vz*dt;if(['spark','debris'].includes(a.kind))a.vy-=13*dt;if(a.kind==='dust')a.vy*=Math.exp(-dt*3);}this.particles=this.particles.filter(a=>a.age<a.life);
  for(const c of this.corpses)c.deathAge+=dt;this.corpses=this.corpses.filter(c=>c.deathAge<.65);
  if(vertical){this.cam=0;const y=this.boss?.active?53.6:Math.max(this.camY,Math.max(0,(active.length?Math.min(...active.map(a=>a.y)):lead.y)-2.6));this.camY+=(y-this.camY)*(1-Math.exp(-dt*4));}
  else if(!dep){const middle=active.length?active.reduce((n,p)=>n+p.x,0)/active.length:lead.x;
   const target=this.boss?.active?this.stage.length-8:Math.max(this.cam,clamp(middle+(this.playerCount===2?2:5.6),Math.min(13,this.cameraHalfWidth||13),this.stage.length-8));this.cam+=(target-this.cam)*(1-Math.exp(-dt*7));
   const y=clamp(lead.y-3.1,0,1.5);this.camY+=(y-this.camY)*(1-Math.exp(-dt*3));}
  this.callbacks.observe?.(this,dt,inputs);
 }
}
