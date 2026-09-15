/* Presentation-only combat guidance.
 * Reads the authoritative targetState/targetOpen rules. Never aims, moves, damages,
 * consumes RNG, or writes to actors/projectiles. Projectile metadata is in a WeakMap.
 * Training is earned by the emitting player's confirmed contact, not showing a tip.
 */
class CombatGuide {
 constructor({progress={},onLearn=()=>{},sound=()=>{}}={}) {
  this.progress={};for(const id of [1,2])this.progress[id]=new Set((Array.isArray(progress?.[id])?progress[id]:[]).filter(x=>['move','jump','fire','swap','depth-prone','depth-stand','depth-jump','depth-align','armor','advance'].includes(x)));
  this.onLearn=onLearn;this.sound=sound;this.level='contextual';this.stage=null;this.room=-1;this.boss=null;
  this.rows=new Map();this.shots=new WeakMap();this.feedback=new Map();this.lastSound={};this.events=[];this.serial=0;
 }
 export(){return Object.fromEntries([1,2].map(id=>[id,[...this.progress[id]].sort()]));}
 clearLearning(){for(const id of [1,2])this.progress[id].clear();for(const row of this.rows.values())row.introAt=this.lastT||0;this.onLearn(this.export());}
 learn(id,key,g){if(!id||!this.progress[id]||this.progress[id].has(key))return;this.progress[id].add(key);this.onLearn(this.export());this.record('learn',g,{owner:id,key});}
 record(type,g,data={}){this.events.push({type,t:g.t,stage:g.stageIndex,room:g.room,...data});if(this.events.length>96)this.events.shift();}
 context(g){
  if(this.stage===g.stage&&this.room===g.room&&this.boss===g.boss&&g.t>=this.lastT)return;
  // Advancing is learned only after the actual room changes, by those who pressed forward.
  if(this.stage===g.stage&&g.room===this.room+1)for(const [id,r] of this.rows)if(r.advanced)this.learn(id,'advance',g);
  this.stage=g.stage;this.room=g.room;this.boss=g.boss;this.lastT=g.t;this.entered=g.t;
  this.rows.clear();this.shots=new WeakMap();this.feedback.clear();this.lastSound={};
 }
 row(p){if(!this.rows.has(p.id))this.rows.set(p.id,{owner:p.id,pending:[],attempts:[],ctrl:{},target:null,lastProgress:-Infinity,introAt:-Infinity,dead:p.dead,previous:p.x});return this.rows.get(p.id);}
 mechanic(q){return q.y<.95?'prone':q.y>2.2?'jump':'stand';}
 candidates(g){
  if(g.boss?.active){const alive=g.boss.targets.filter(q=>q.hp>0);if(g.boss.type===0)return alive.filter(q=>q.kind==='core');
   const parts=alive.filter(q=>q.kind!=='core');return parts.length?parts:alive;}
  return (g.sensors||[]).filter(q=>q.hp>0);
 }
 choose(g,p){
  const options=this.candidates(g);if(!options.length)return null;const row=this.row(p);
  const score=q=>g.stage.mode==='depth'?Math.abs(g.depthLaneX(q,p)-p.x):Math.abs(q.y-(p.y+(p.duck?.6:1.48)))*.55+Math.abs(q.x-p.x)*.08;
  options.sort((a,b)=>score(a)-score(b));const held=options.find(q=>q===row.target);
  const q=held&&score(held)<score(options[0])+.32?held:options[0];
  if(row.target!==q){row.target=q;row.attempts=[];row.pending=[];row.introAt=g.t;row.changedAt=g.t;}
  return q;
 }
 state(g,q){return g.boss?.active?g.targetState(q):q.hp<=0?'destroyed':q.armor>0?'armor':'open';}
 diagnose(g,p,q,ctrl={}){
  if(!p||p.dead||!q)return {code:'none'};
  const state=this.state(g,q);if(state==='destroyed')return{code:'destroyed'};
  if(state==='prerequisite'||state==='sealed')return{code:state};
  if(g.stage.mode==='depth'){
   const dx=g.depthLaneX(q,p)-p.x;
   if(Math.abs(dx)>.26)return{code:dx>0?'alignRight':'alignLeft',dx};
   if(!g.boss?.active){
    const mechanic=this.mechanic(q);
    if(mechanic==='prone'&&!p.duck){if(ctrl.lock)return{code:'releaseLock',mechanic};if(ctrl.move||Math.abs(p.vx||0)>.25)return{code:'stop',mechanic};return{code:'prone',mechanic};}
    if(mechanic==='stand'&&p.duck)return{code:'stand',mechanic};
    if(mechanic==='jump'&&p.y+(p.duck?.6:1.48)<q.y-q.r)return{code:p.duck||ctrl.down?'jumpRelease':'jump',mechanic};
   }
  }
  return {code:state==='armor'?'armor':'fire'};
 }
 projectile(b,g){
  if(b.enemy||!b.owner)return;this.context(g);const p=g.players.find(p=>p.id===b.owner);if(!p||p.dead)return;
  const row=this.row(p),q=g.stage.mode==='depth'||g.boss?.active?this.choose(g,p):null;
  const pose=p.duck?'prone':p.grounded?'stand':'jump';
  // Pellet groups / laser trains share an attempt. A full ammo cap creates no attempt.
  let a=row.pending.at(-1);if(!a||a.t!==g.t){a={id:++this.serial,t:g.t,owner:p.id,pose,weapon:b.type,target:q,progress:false,other:false,resolved:false,code:q?this.diagnose(g,p,q,row.ctrl).code:'none'};row.pending.push(a);if(row.pending.length>32)row.pending.shift();}
  this.shots.set(b,a);this.learn(p.id,'fire',g);
 }
 contact(e,g){
  this.context(g);const a=e.projectile&&this.shots.get(e.projectile),id=e.projectile?.owner||0,q=e.target;
  if(e.kind==='other'){if(a){a.other=true;const r=this.rows.get(id);if(r){r.attempts=[];r.lastProgress=g.t;}}return;}
  if(!q)return;
  const effective=e.amount>0,kind=effective?(e.outcome==='armor'?(q.armor===0?'armorBreak':'armor'):(q.hp===0?'destroyed':'damage')):e.outcome;
  this.feedback.set(q,{kind,born:g.t,owner:id,point:e.point});
  if(a&&effective){a.progress=true;const row=this.rows.get(id);if(row){row.lastProgress=g.t;row.attempts=[];}
   if(e.kind==='sensor'){
    if(a.pose===this.mechanic(q)&&a.weapon!=='grenade'){this.learn(id,'depth-'+a.pose,g);this.learn(id,'depth-align',g);}
    if(e.outcome==='armor')this.learn(id,'armor',g);
   }
  }
  // Audible hit / plate / closed cues are independent of teaching switches. No RNG.
  const sound=kind==='armorBreak'?'guideBreak':kind==='armor'?'guideArmor':effective?'guideHit':'guideBlocked';
  const gap=sound==='guideBlocked'?.65:sound==='guideHit'?.18:.22;
  if(id&&g.t-(this.lastSound[sound]??-Infinity)>gap){this.sound(sound);this.lastSound[sound]=g.t;}
  this.record('contact',g,{owner:id,target:q.id,outcome:kind,amount:e.amount||0});
 }
 threatened(g,p){
  if(p.shock>0||p.dead)return true;
  return g.bullets.some(b=>{if(!b.enemy||b.remove)return false;const v=g.stage.mode==='depth'?b.vz:b.vx;if(Math.abs(v)<.1)return false;
   const dt=((g.stage.mode==='depth'?p.z:p.x)-(g.stage.mode==='depth'?b.z:b.x))/v;
   if(dt<0||dt>.5)return false;const x=b.x+b.vx*dt,y=b.y+b.vy*dt-.5*(b.gravity||0)*dt*dt,z=b.z+b.vz*dt;
   return Math.abs(x-p.x)<.9&&Math.abs(z-p.z)<.9&&y<p.y+1.9&&y>p.y-.3;
  });
 }
 update(g,dt,inputs=[]){
  this.context(g);this.lastT=g.t;if(g.mode!=='playing')return;
  for(const p of g.players){const r=this.row(p);r.ctrl=inputs[p.id-1]||{};
   if(p.dead){r.attempts=[];r.pending=[];r.dead=true;continue;}
   if(r.dead){r.dead=false;r.attempts=[];r.pending=[];r.introAt=g.t;}
   if(Math.abs(p.x-r.previous)>.001)this.learn(p.id,'move',g);r.previous=p.x;
   if(!p.grounded&&p.vy>0&&r.ctrl.jump)this.learn(p.id,'jump',g);
   if(r.weapon&&r.ctrl.swap&&p.weapon!==r.weapon)this.learn(p.id,'swap',g);r.weapon=p.weapon;
   if(g.depthExit?.moving&&r.ctrl.up)r.advanced=true;
   if(!g.barrier||g.boss?.active){r.attempts=[];continue;}
   const q=this.choose(g,p),danger=this.threatened(g,p);
   for(const a of r.pending){if(a.resolved||g.t-a.t<.8)continue;a.resolved=true;
    if(a.target===q&&!a.progress&&!a.other&&!danger&&a.weapon!=='grenade')r.attempts.push(a.t);
   }
   r.pending=r.pending.filter(a=>g.t-a.t<3);r.attempts=r.attempts.filter(t=>g.t-t<5&&t>r.lastProgress);
   if(danger){r.attempts=[];r.pending.forEach(a=>a.resolved=true);}
  }
  for(const [q,e] of this.feedback)if(g.t-e.born>1.2)this.feedback.delete(q);
 }
 advice(g,p,{force=false}={}){
  this.context(g);if(!p||p.dead||g.mode==='menu')return null;
  const r=this.row(p);
  if(g.stage.mode==='depth'&&!g.boss?.active&&!g.barrier){if(g.depthExit?.moving)return null;return{code:'advance',owner:p.id,essential:true,target:null};}
  const q=this.choose(g,p);if(!q)return null;
  const d=this.diagnose(g,p,q,r.ctrl),fb=this.feedback.get(q);
  if(force)return{...d,target:q,owner:p.id};
  if(this.level==='off')return null;
  if(g.boss?.active){if(fb&&g.t-fb.born<.6&&fb.kind!=='sealed'&&fb.kind!=='prerequisite')return null;
   const code=g.boss.type===5&&d.code==='sealed'?(g.boss.t%6.4<2.4?'dodgeRush':'dodgeLeap'):d.code;
   return this.level==='enhanced'||g.t-this.entered<6?{...d,code,target:q,owner:p.id}:null;
  }
  if(g.stage.mode!=='depth'||g.depthExit?.moving)return null;
  if(p.shock>0)return{code:'barrier',owner:p.id,target:q};
  if(this.threatened(g,p))return null;
  if(fb&&fb.owner===p.id&&['armor','armorBreak','damage','destroyed'].includes(fb.kind)&&g.t-fb.born<.8)return null;
  const skill=['alignLeft','alignRight'].includes(d.code)?'depth-align':d.code==='armor'?'armor':'depth-'+this.mechanic(q);
  const fresh=!this.progress[p.id].has(skill)&&g.t-r.introAt>.55&&g.t-r.introAt<7;
  const delayed=r.attempts.length>=(this.level==='enhanced'?2:4)&&(r.attempts.at(-1)-r.attempts[0])>=(this.level==='enhanced'?.7:1.5);
  if(force||this.level==='enhanced'||fresh||delayed)return{...d,target:q,owner:p.id,recovery:delayed};
  return null;
 }
 bossStatus(g){
  const b=g.boss;if(!b?.active)return null;if(b.dead)return{code:'destroyed',text:'目标已摧毁',goal:'区域已肃清'};
  const alive=b.targets.filter(q=>q.hp>0),parts=alive.filter(q=>q.kind!=='core'),open=alive.filter(q=>g.targetOpen(q)),core=open.some(q=>q.kind==='core');
  const names={1:'锁点',2:'双臂',4:'引擎',6:'门锁',7:'孢囊'};
  if(b.type===5){const c=b.t%6.4,state=c<1.1?'windup':c<2.4?'rush':c<3.1?'windup':c<4.7?'leap':'recover';
   const text={windup:'蓄力 · 核心可攻击',rush:'冲撞 · 起跳躲避',leap:'跃击 · 避开落点',recover:'恢复 · 攻击窗口'}[state];return{code:core?'open':'sealed',text,goal:text};}
  if(core)return{code:'open',text:b.type===3?'攻击开启的核心':'核心暴露 · 可以攻击',goal:b.type===0?'可直接攻击中央核心；炮台可选':b.type===3?`击毁移动核心 · 剩余 ${alive.length}`:'攻击暴露的核心'};
  if(parts.length){const goal=`击破${names[b.type]||'部件'} · 剩余 ${parts.length}`;return{code:'prerequisite',text:goal+(open.length?'':' · 等待开启'),goal};}
  return{code:'sealed',text:'核心暂闭 · 躲避攻击',goal:b.type===3?`等待核心开启 · 剩余 ${alive.length}`:'部件已清除；等待核心再次开启'};
 }
 objective(g){
  if(!g.player||g.mode==='menu')return{title:'随时可以查看当前目标',detail:'战斗中按 ESC 暂停，查看目标与操作。'};
  if(g.boss?.active){const b=this.bossStatus(g);return{title:b.goal,detail:'闭合标记表示暂不可受伤；开放框表示可攻击。'};}
  if(g.stage.mode==='depth'){
   if(!g.barrier)return{title:g.depthExit?.moving?'正在进入下一室':'电网已解除 · 向前进入下一室',detail:'任一存活玩家向前即可带领全队前进。'};
   const remain=g.sensors.filter(q=>q.hp>0),low=remain.every(q=>this.mechanic(q)==='prone'),high=remain.some(q=>this.mechanic(q)==='jump'),armor=remain.some(q=>q.armor>0);
   return{title:`击毁${low?'低位':high?'高位':armor?'装甲':''}核心 · 剩余 ${remain.length} / ${g.sensors.length}`,detail:low?'横移对齐，松开移动与瞄准锁定，再趴下射击。炮台可选。':high?'横移对齐，松开下键，跳起射击。炮台可选。':armor?'横移对齐，站射击碎装甲，再破坏核心。炮台可选。':'横移对齐，松开下键恢复站射。炮台可选。'};
  }
  return{title:g.stage.mode==='vertical'?'向上攀登，抵达守卫所在平台':'向右突破，抵达关底',detail:'优先躲避危险；并非所有普通敌人都必须消灭。'};
 }
 // Actual centre-ray endpoint, starting at the same muzzle as projectiles. It is a
 // prediction for one straight centre ray, not homing aim or a guarantee for spread.
 ray(g,p){
  if(g.stage.mode!=='depth'||p.dead||g.depthExit?.moving)return null;
  const d=p.aimDirection;if(!d||d[2]>=-.01)return null;const from=g.muzzlePoint(p,d),t=(-14-from[2])/d[2];if(t<=0)return null;
  const end=from.map((v,i)=>v+d[i]*t);let hit=null,first=1;
  const consider=(q,lo,hi)=>{const h=segmentBox(from,end,lo,hi);if(h!==null&&h<first){first=h;hit=q;}};
  for(const e of g.enemies||[])if(!e.dead){const b=g.enemyBounds(e,0);consider(e,b.lo,b.hi);}
  for(const q of g.boss?.active?g.boss.targets:g.sensors||[])if(q.hp>0){const rx=q.rx||q.r,ry=q.ry||q.r,rz=q.rz||.4;consider(q,[q.x-rx,q.y-ry,q.z-rz],[q.x+rx,q.y+ry,q.z+rz]);}
  return{point:from.map((v,i)=>v+(end[i]-v)*first),hit,owner:p.id};
 }
}
