/* UI and input controller. Battle rules live in game.js; menus never consume
 * native select/input keyboard events. Dialogs own focus and isolate background UI. */
function initApp(){
 const $=id=>document.getElementById(id),keys=new Set(),pressed=new Set();
 const mouse={x:0,y:0,active:false,fire:false,pressed:false};
 let last=0,acc=0,uiTime=0,showPerf=false,helpPaused=false,settingsPaused=false,frames=[],lastPads=[];
 let quality='high',scale=1,playerCount=1,inputMode='modern',saves={},storageOK=true;
 let guideLevel='contextual',guideProgress={},guide;const playerDevices=['keyboard','keyboard'];
 let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,tutorialEnabled=true,lastDevice='keyboard',externalInputSeen=false;
 const padRepeat=[],padAxes=[],saveKey=n=>'eightfront-3d-campaign'+(n===2?'-2p':'');
 try{
  const a=JSON.parse(localStorage.getItem('eightfront-3d-settings')||'{}');
  quality=['low','high','ultra'].includes(a.quality)?a.quality:'high';scale=clamp(Number(a.scale)||1,.5,1.25);playerCount=a.playerCount===2?2:1;inputMode=a.inputMode==='retro'?'retro':'modern';
  if(typeof a.reducedMotion==='boolean')reducedMotion=a.reducedMotion;if(typeof a.tutorialEnabled==='boolean')tutorialEnabled=a.tutorialEnabled;
  guideLevel=['off','contextual','enhanced'].includes(a.guideLevel)?a.guideLevel:(tutorialEnabled?'contextual':'off');guideProgress=a.guideProgress&&typeof a.guideProgress==='object'?a.guideProgress:{};
  for(const n of [1,2])saves[n]=JSON.parse(localStorage.getItem(saveKey(n))||'null');
 }catch{storageOK=false;}
 guide=new CombatGuide({progress:guideProgress,onLearn:value=>{guideProgress=value;persist();},sound:k=>AudioFX.play(k)});guide.level=guideLevel;
 const G=new CampaignGame({
  projectile:(b,g)=>guide.projectile(b,g),contact:(e,g)=>guide.contact(e,g),observe:(g,dt,c)=>guide.update(g,dt,c),
  sound:k=>AudioFX.play(k),
  stage:s=>{CampaignWorld.create(s);R.surfaces=(x,t)=>G.surfaces(x,t);activeTip=null;},
  save:data=>{if(G.practice)return;const key=saveKey(data.playerCount);saves[data.playerCount]=data;try{const previous=localStorage.getItem(key);if(previous)localStorage.setItem(key+'-backup',previous);localStorage.setItem(key,JSON.stringify(data));}catch{storageOK=false;}},
  complete:()=>{saves[G.playerCount]=null;try{localStorage.removeItem(saveKey(G.playerCount));}catch{storageOK=false;}}
 });
 R.setQuality(quality);R.setScale(scale);R.setMotion(reducedMotion);R.surfaces=(x,t)=>G.surfaces(x,t);CampaignWorld.create(G.stage);
 function persist(){try{localStorage.setItem('eightfront-3d-settings',JSON.stringify({version:5,quality,scale,playerCount,inputMode,reducedMotion,tutorialEnabled,guideLevel,guideProgress}));}catch{storageOK=false;}}
 function validSave(s){
  if(!s||![1,2].includes(s.version)||!Number.isInteger(s.stage)||s.stage<0||s.stage>7||!['score','totalTime','kills','deaths'].every(k=>Number.isFinite(s[k])&&s[k]>=0)||!Array.isArray(s.history)||s.history.length>8)return false;
  const rows=s.version===2?s.players:[s];return Array.isArray(rows)&&rows.length===(s.version===2?s.playerCount:1)&&rows.length>=1&&rows.length<=2&&rows.every(p=>p&&Number.isInteger(p.lives)&&p.lives>=0&&p.lives<=7&&WEAPONS[p.weapon]&&(!p.reserve||WEAPONS[p.reserve]))&&rows.some(p=>p.lives>0);
 }
 function clearInput(){keys.clear();pressed.clear();mouse.fire=false;mouse.pressed=false;mouse.active=false;for(const p of G.players){p.lastJump=false;p.lastFire=false;}G.lastJump=false;acc=0;}
 const modals=['pause','result','stageSelect','help','settingsPanel','deviceNotice'],returnFocus=new Map();let activeModal=null;
 function focusables(root){return [...root.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),summary,[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden],[inert]'));}
 function preferredFocus(id){return $(id==='pause'?'resume':id==='result'?(G.mode==='clear'?'next':'again'):id==='stageSelect'?'closeStages':id==='help'?'closeHelp':id==='settingsPanel'?'closeSettings':'closeDevice');}
 function refreshModal(){
  const next=modals.filter(id=>!$(id).hidden).at(-1)||null;if(next===activeModal)return;
  const previous=activeModal,restored=previous?returnFocus.get(previous):null;
  if(next&&!returnFocus.has(next))returnFocus.set(next,document.activeElement);
  activeModal=next;
  for(const child of document.body.children)if(!['SCRIPT','STYLE'].includes(child.tagName))child.inert=!!next&&child.id!==next;
  if(previous&&$(previous).hidden)returnFocus.delete(previous);
  const canRestore=restored?.isConnected&&restored.getClientRects().length&&!restored.closest('[hidden],[inert]');
  const target=canRestore?restored:next?preferredFocus(next):G.mode==='playing'?$('game'):$('deploy');target?.focus({preventScroll:true});
 }
 function openModal(id){if($(id).hidden)returnFocus.set(id,document.activeElement);$(id).hidden=false;refreshModal();}
 function closeModal(id){$(id).hidden=true;refreshModal();}
 function closeAuxiliary(){for(const id of ['stageSelect','help','settingsPanel','deviceNotice'])$(id).hidden=true;helpPaused=false;settingsPaused=false;}
 function togglePause(){if(activeModal&&!['pause'].includes(activeModal))return;G.pause();clearInput();syncUI();}
 function readPads(){try{return Array.from(navigator.getGamepads?.()||[]).map(a=>a?.connected?a:null);}catch{return [];}}
 function deviceBlocked(){const touchOnly=matchMedia('(pointer:coarse)').matches&&!matchMedia('(any-pointer:fine)').matches&&!externalInputSeen&&!readPads().some(Boolean);return touchOnly||(innerWidth<700&&innerHeight>innerWidth);}
 function checkDevice(){
  const blocked=deviceBlocked();$('deviceHint').hidden=!blocked;
  $('deviceHint').textContent=innerWidth<700&&innerHeight>innerWidth?'桌面版 · 请使用横屏键盘或手柄':'此版本不支持触屏战斗操作';
  return !blocked;
 }
 function requireDevice(){if(checkDevice())return true;openModal('deviceNotice');return false;}
 let activeTip=null;
 function start(i=0,options={}){if(!requireDevice())return false;AudioFX.init();clearInput();closeAuxiliary();G.start(i,{difficulty:$('difficulty').value,playerCount,inputMode,...options});frames=[];last=0;activeTip=null;syncUI();$('game').focus();return true;}
 function retryStage(){if(!requireDevice())return false;AudioFX.init();clearInput();closeAuxiliary();G.restartStage();frames=[];last=0;syncUI();$('game').focus();return true;}
 function menu(){clearInput();closeAuxiliary();G.mode='menu';G.playerCount=playerCount;G.stage=makeStage(0);G.cam=13;G.camY=0;G.t=0;G.player=null;G.players=[];G.enemies=[];G.bullets=[];G.boss=null;CampaignWorld.create(G.stage);document.body.classList.remove('photo');syncUI();}
 const mappings=[
  {left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],fire:['KeyJ'],jump:['Space','KeyK'],lock:['ShiftLeft'],swap:['KeyQ'],grenade:['KeyE','KeyG']},
  {left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],fire:['Numpad1','Slash'],jump:['Numpad2','Period'],lock:['ShiftRight'],swap:['Numpad0','Comma'],grenade:['Numpad3','Quote']}
 ];
 function back(){
  if(activeModal==='settingsPanel'){$('closeSettings').click();return;}
  if(activeModal==='help'){$('closeHelp').click();return;}
  if(activeModal==='stageSelect'){$('closeStages').click();return;}
  if(activeModal==='deviceNotice'){$('closeDevice').click();return;}
  if(G.mode==='playing'||G.mode==='paused')togglePause();
 }
 function changeValue(el,direction){
  if(el.tagName==='SELECT'){el.selectedIndex=clamp(el.selectedIndex+direction,0,el.options.length-1);el.dispatchEvent(new Event('change',{bubbles:true}));}
  else if(el.type==='range'){el.value=String(clamp(Number(el.value)+direction*Number(el.step||1),Number(el.min),Number(el.max)));el.dispatchEvent(new Event('input',{bubbles:true}));}
 }
 function padMenu(pad,b,previous,index){
  const x=pad.axes[0]||0,y=pad.axes[1]||0,old=padAxes[index]||[0,0],now=performance.now();
  const dy=b[13]||y>.55?1:b[12]||y<-.55?-1:0,dx=b[15]||x>.55?1:b[14]||x<-.55?-1:0;
  const fresh=(dy!==old[1]||dx!==old[0]),repeat=(dx||dy)&&(fresh||now>(padRepeat[index]||0));padAxes[index]=[dx,dy];
  if(repeat){padRepeat[index]=now+(fresh?330:170);externalInputSeen=true;lastDevice='gamepad';const root=activeModal?$(activeModal):$('menu'),items=focusables(root),el=document.activeElement;
   if(dx&&['SELECT','INPUT'].includes(el?.tagName))changeValue(el,dx);
   else if(items.length){const step=dy||dx;let i=items.indexOf(el);i=i<0?(step>0?0:items.length-1):(i+step+items.length)%items.length;items[i].focus({preventScroll:true});items[i].scrollIntoView({block:'nearest'});}
  }
  if(b[0]&&!previous[0]){externalInputSeen=true;lastDevice='gamepad';const el=document.activeElement;
   if(el?.tagName==='SELECT')changeValue(el,1);
   else if(el?.tagName==='INPUT'&&el.type==='checkbox')el.click();
   else if(el?.tagName==='SUMMARY')el.parentElement.open=!el.parentElement.open;
   else if(el?.tagName==='BUTTON'&&!el.closest('[inert]'))el.click();
   else if(G.mode==='menu')$('deploy').click();
  }
  if(b[1]&&!previous[1])back();
  if(b[9]&&!previous[9]){if(G.mode==='menu')$('deploy').click();else if(G.mode==='over')retryStage();else if(G.mode==='clear')$('next').click();else back();}
 }
 function controls(){
  const count=G.mode==='menu'?playerCount:G.playerCount,held=a=>a.some(c=>keys.has(c)),edge=a=>a.some(c=>pressed.has(c)),pads=readPads();
  if(G.mode!=='playing'){
   pads.forEach((pad,i)=>{if(!pad){lastPads[i]=[];return;}const b=pad.buttons.map(v=>v.pressed);padMenu(pad,b,lastPads[i]||[],i);lastPads[i]=b;});pressed.clear();mouse.pressed=false;return count===1?{}:[{},{}];
  }
  const result=Array.from({length:count},(_,i)=>{
   const map=Object.fromEntries(Object.entries(mappings[i]).map(([k,v])=>[k,[...v]]));
   if(count===1){for(const a of ['left','right','up','down'])map[a].push(...mappings[1][a]);map.fire.push('KeyZ');map.jump.push('KeyX');map.lock.push('ShiftRight');}
   const c={move:+held(map.right)-+held(map.left),up:held(map.up),down:held(map.down),fire:held(map.fire),firePressed:edge(map.fire),jump:held(map.jump),jumpPressed:edge(map.jump),lock:held(map.lock),swap:edge(map.swap),grenade:edge(map.grenade)};
   if(i===0){c.fire||=mouse.fire;c.firePressed||=mouse.pressed;if(c.up||c.down||held(map.fire))mouse.active=false;if(mouse.active&&G.inputMode!=='retro')c.aimPoint=R.aimPoint(mouse.x,mouse.y,G.stage.mode==='depth'?-14:0);}
   const pad=pads[i],previous=lastPads[i]||[];
   if(pad){const x=pad.axes[0]||0,y=pad.axes[1]||0,b=pad.buttons.map(v=>v.pressed),left=b[14]||x<-.25,right=b[15]||x>.25;
    if(left||right)c.move=+!!right-+!!left;c.up||=!!b[12]||y<-.4;c.down||=!!b[13]||y>.5;c.jump||=!!b[0];c.jumpPressed||=!!b[0]&&!previous[0];c.fire||=!!b[7]||!!b[2];c.firePressed||=(!!b[7]&&!previous[7])||(!!b[2]&&!previous[2]);c.lock||=!!b[4];c.swap||=!!b[3]&&!previous[3];c.grenade||=!!b[5]&&!previous[5];
    if(b.some(Boolean)||Math.hypot(x,y)>.3){lastDevice='gamepad';playerDevices[i]='gamepad';externalInputSeen=true;}
    lastPads[i]=b;
    if(b[9]&&!previous[9]){G.pause();clearInput();syncUI();return {};}
    const rx=pad.axes[2]||0,ry=pad.axes[3]||0,p=G.players[i];if(G.inputMode!=='retro'&&Math.hypot(rx,ry)>.3&&p)c.aimPoint=G.stage.mode==='depth'?[rx*7,2-ry*4,-14]:[p.x+rx*15,p.y+1.48-ry*15,0];
   }else lastPads[i]=[];return c;
  });pressed.clear();mouse.pressed=false;return count===1?result[0]:result;
 }
 const time=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
 const cachedHTML=new Map();
 function text(id,value){const e=$(id);if(e.textContent!==String(value))e.textContent=value;}
 function html(id,value){if(cachedHTML.get(id)!==value){$(id).innerHTML=value;cachedHTML.set(id,value);}}
 const weaponNames={R:'突击步枪',M:'机枪',S:'散射枪',L:'激光',F:'火焰喷射'};
 const weaponPaths={R:'M4 13h27v7H13l-2 8H7l1-8H4Zm27 2h10v3H31M19 20l2 8h4l-1-8M16 10h11',M:'M4 12h28v9H12l-2 7H6l1-7H4Zm28 1h10m-10 6h10M19 21v7h9v-7M14 9h18',S:'M4 13h20v8H12l-2 7H6l1-7H4Zm20-1h17v3H24m0 2h17v4H24M15 21h7v4h-7',L:'M4 14h24v6H12l-2 8H6l1-8H4Zm24-4h15v3H28m0 8h15v3H28M20 12v10m4-10v10m13-7h6',F:'M4 12h23v9H12l-2 7H6l1-7H4Zm23 1h11v7H27M15 22v7h5v-7m4-1v8h5v-8m11-15c5 3 2 6 2 6'};
 function weaponIcon(type){return `<svg viewBox="0 0 48 36" aria-hidden="true"><path d="${weaponPaths[type]||weaponPaths.R}"/></svg>`;}
 function playerCard(p,index){
  const prefix=index?'p2':'',card=$(index?'p2hud':'p1hud');card.hidden=!p;if(!p)return;
  text(index?'p2lives':'lives','× '+Math.max(0,p.lives));
  html(index?'p2armor':'armor',Array.from({length:p.maxHp},(_,i)=>`<i class="${i<p.hp?'on':''}"></i>`).join(''));
  $(index?'p2armor':'armor').setAttribute('aria-label',`护甲 ${Math.max(0,p.hp)} / ${p.maxHp}`);
  html(index?'p2weaponLetter':'weaponLetter',weaponIcon(p.weapon));text(index?'p2weapon':'weaponName',weaponNames[p.weapon]||p.weapon);
  text(index?'p2reserve':'reserve',p.reserve?`备用 ${p.reserve}`:'备用 —');text(index?'p2grenades':'grenades',p.grenades);
  text(index?'p2status':'playerStatus',p.dead?(p.lives?'即将重新加入':'已出局 · 队友继续'):'');card.classList.toggle('down',!!p.dead);
  card.setAttribute('aria-label',`玩家 ${index+1}，生命 ${p.lives}，护甲 ${p.hp}，${weaponNames[p.weapon]}，手雷 ${p.grenades}`);
 }
 function label(value,x,y,z=0,kind=''){
  const pos=R.project(x,y,z);if(!pos.visible||pos.x<0||pos.x>innerWidth||pos.y<0||pos.y>innerHeight)return;
  const e=document.createElement('div');e.className='tag '+kind;e.textContent=value;e.style.transform=`translate(${pos.x}px,${pos.y}px)`;$('labels').appendChild(e);
 }
 function tutorial(){
  // Base and boss instructions are target-local and use the same target state model.
  const eligible=guideLevel!=='off'&&G.mode==='playing'&&G.player&&G.stage.mode!=='depth'&&!G.boss?.active;
  let value='';
  if(eligible){const p=G.players.find(a=>!a.dead)||G.player,id=p.id,pad=playerDevices[id-1]==='gamepad',known=guide.progress[id];
   if(p.reserve&&!known.has('swap')&&G.t%16<6)value=`<kbd>${pad?'Y':id===2?',':'Q'}</kbd>切换备用武器`;
   else if(G.stageIndex===0&&G.t>1.6&&G.t<16){
    if(!known.has('move'))value=`<kbd>${pad?'左摇杆':id===2?'← →':'A D'}</kbd>移动`;
    else if(!known.has('jump'))value=`<kbd>${pad?'A':id===2?'.':'SPACE'}</kbd>跳跃`;
    else if(!known.has('fire'))value=`<kbd>${pad?'X / RT':id===2?'/':'J'}</kbd>射击`;
   }
  }
  $('tutorial').hidden=!value;html('tutorial',value);
 }
 const keyLabels={KeyA:'A',KeyD:'D',KeyW:'W',KeyS:'S',KeyJ:'J',Space:'SPACE',ShiftLeft:'SHIFT',ShiftRight:'R SHIFT',ArrowLeft:'←',ArrowRight:'→',ArrowDown:'↓',ArrowUp:'↑',Numpad1:'/',Numpad2:'.'};
 const binding=(action,id)=>{
  if(playerDevices[id-1]==='gamepad')return{left:'左摇杆 ←',right:'左摇杆 →',up:'摇杆 ↑',down:'摇杆 ↓',jump:'A',fire:'X / RT',lock:'LB'}[action]||'';
  if(action==='fire'&&(playerDevices[id-1]==='mouse'||id===1&&mouse.fire))return '鼠标左键';
  const code=mappings[id-1]?.[action]?.[0];return keyLabels[code]||code||'';
 };
 const guideView=new CombatGuideView({game:G,guide,renderer:R,binding,device:id=>playerDevices[id-1],level:()=>guideLevel});
 function syncUI(){
  const p=G.player,s=G.stage,saved=saves[playerCount],valid=validSave(saved);
  $('menu').hidden=G.mode!=='menu';$('hud').hidden=!p||G.mode==='menu';$('pause').hidden=G.mode!=='paused';$('result').hidden=!['clear','won','over'].includes(G.mode);$('pauseButton').hidden=!p||G.mode==='menu';
  $('continue').hidden=!valid;text('continue',valid?`继续战役 · 第 ${saved.stage+1} 关 →`:'继续战役');
  document.body.classList.toggle('coop',G.mode==='menu'?playerCount===2:G.playerCount===2);document.body.classList.toggle('reduced-motion',reducedMotion);
  $('notification').hidden=G.note<=0||!['playing','paused'].includes(G.mode);text('notification',G.message.split(' / ')[0]);
  $('bossHUD').hidden=!G.boss?.active||!['playing','paused'].includes(G.mode);
  $('storageNote').hidden=storageOK;text('storageNote','此浏览器无法保存进度；当前游戏不受影响。');checkDevice();
  if(p){
   playerCard(p,0);playerCard(G.players[1],1);text('score',String(G.score).padStart(6,'0'));text('time',time(G.totalTime));text('stageName',`${String(G.stageIndex+1).padStart(2,'0')} / ${s.cn}`);
   const fraction=s.mode==='depth'?(G.room+(G.barrier?0:.55))/(s.rooms+1):s.mode==='vertical'?G.furthest/60:G.furthest/s.length;
   $('stageFill').style.width=clamp(fraction*100,0,100)+'%';text('stageObjective',s.mode==='depth'&&!G.boss?.active?`${Math.min(s.rooms,G.room+1)} / ${s.rooms} · ${G.barrier?'核心 '+G.sensors.filter(q=>q.hp>0).length+'/'+G.sensors.length:'出口已开启'}`:'');
   html('routeDots',STAGE_META.map((a,i)=>`<span class="${i<G.stageIndex?'done':i===G.stageIndex?'now':''}"></span>`).join(''));
   text('combo',G.t<G.comboUntil&&G.combo>2?`${G.combo} 连击`:'');
  }
  if(G.boss?.active){const b=G.boss,status=guide.bossStatus(G);text('bossName',b.name);text('bossPhase',status.text);$('bossHUD').dataset.state=status.code;html('bossBars',b.targets.map(q=>`<div class="${q.kind==='core'?'core':''}" data-state="${G.targetState(q)}" title="${q.id} · ${G.targetState(q)==='open'?'可攻击':q.hp<=0?'已摧毁':'暂不可伤害'}"><i style="width:${clamp(q.hp/q.maxHp,0,1)*100}%"></i></div>`).join(''));}

  if(['clear','won','over'].includes(G.mode)&&p){
   const over=G.mode==='over';text('resultKicker',`${String(G.stageIndex+1).padStart(2,'0')} / ${s.cn}`);text('resultTitle',G.mode==='won'?'任务完成':over?'再来一次':'区域已肃清');
   text('resultBody',G.mode==='won'?'异形之心已被摧毁。八关任务完成。':over?'从本关入口重试，保留入口装备与前关记录。':'武器与生命带入下一关，每位玩家奖励一条生命。');
   html('resultStats',`<div><b>${String(G.score).padStart(6,'0')}</b><span>得分</span></div><div><b>${time(G.totalTime)}</b><span>时间</span></div><div><b>${G.kills}</b><span>消灭</span></div><div><b>${G.deaths}</b><span>损失</span></div>`);
   $('next').hidden=G.mode!=='clear';$('again').classList.toggle('retry-primary',over);text('again',over?'立即重试 ↵':'重新挑战本关');
  }
  $('labels').replaceChildren();if(p&&['playing','paused'].includes(G.mode)){
   for(const a of G.players)if(!a.dead&&G.playerCount===2)label('P'+a.id,a.x,a.y+(a.duck?.95:2.53),a.z,'player p'+a.id);
   for(const c of G.capsules)if(c.hp>0)label(c.type,c.x,c.y+.05+Math.sin(G.t*2.8+c.x)*.18,c.z);
   for(const c of G.pickups)label(c.type,c.x,c.y+.05,c.z);
   for(const e of G.enemies)if(e.wind>0)label('!',e.x,e.y+(e.type==='drone'?.7:2.42),e.z,'warning');
  }
  guideView.render();tutorial();$('performance').hidden=!showPerf;
  if(showPerf){const f=frames.slice(-120),mean=f.reduce((a,b)=>a+b,0)/Math.max(1,f.length),r=R.stats;text('performance',`${R.backend.name}\n${f.length?(1000/mean).toFixed(1):'—'} FPS · ${r.width||0}×${r.height||0}\n${r.drawCalls||0} DRAWS · ${(r.triangles||0).toLocaleString()} TRIANGLES\n${r.skinnedActors||0} SKINNED ACTORS · 18 BONES\n${Math.round((r.uploadedBytes||0)/1024)} KB INSTANCE UPLOAD\n${G.bullets.length} SHOTS · ${G.playerCount}P\n${R.device}`);}
  html('quickControls',lastDevice==='gamepad'?'<div><b>摇杆</b>移动</div><div><b>A</b>跳跃</div><div><b>X / RT</b>射击</div>':'<div><b>A D</b>移动</div><div><b>SPACE</b>跳跃</div><div><b>J</b>射击</div>');
  refreshModal();
 }
 function safeFrame(now){try{frame(now);}catch(err){window.__BOOT_STATUS__={state:'render-error',engine:R.backend.name,message:err.message};console.error(err);$('loading').hidden=false;$('loading').classList.add('failed');$('loadMessage').textContent='渲染遇到错误：'+err.message;$('retry').hidden=false;}}
 function frame(now){
  const raw=last?now-last:16.667;last=now;const dt=Math.min(.15,raw/1000);G.cameraHalfWidth=G.playerCount===2?14.2:11.7;
  if(G.mode==='playing'){acc+=dt;let steps=0;while(acc>=1/120&&steps<18){G.update(1/120,controls());acc-=1/120;steps++;}if(steps===18)acc=0;if(G.t>1.5){frames.push(raw);if(frames.length>4000)frames.shift();}}
  else if(G.mode==='menu'){controls();G.t+=Math.min(dt,.05);G.cam=13+(reducedMotion?0:Math.sin(G.t*.11)*.7);}else controls();
  CampaignWorld.draw(G,G.mode==='menu');AudioFX.tick(G.mode==='playing',!!G.boss?.active,G.stageIndex);if(now-uiTime>100){syncUI();uiTime=now;}
  if(window.__BOOT_STATUS__?.state==='initialized'){if(!(R.backend.renderer instanceof window.__THREE__.WebGLRenderer))throw Error('Verified Three.js renderer is required.');window.__BOOT_STATUS__={state:'running',engine:R.backend.name,revision:window.__THREE__.REVISION,embedded:true,firstFrameRendered:true};}
  requestAnimationFrame(safeFrame);
 }
 $('players').value=String(playerCount);$('rules').value=inputMode;
 function selection(){playerCount=Number($('players').value)===2?2:1;inputMode=$('rules').value==='retro'?'retro':'modern';if(G.mode==='menu')G.playerCount=playerCount;text('rulesHint',inputMode==='retro'?'固定跳高、八向瞄准；R / S / F 点按射击。':'长按连射、短按小跳。基地房间需横移对列，站／趴／跳改变枪线。');$('coopHint').hidden=playerCount!==2;persist();syncUI();}
 $('players').onchange=selection;$('rules').onchange=selection;$('deploy').onclick=()=>start(0);
 $('continue').onclick=()=>{const data=saves[playerCount];if(!validSave(data)||!requireDevice())return;AudioFX.init();clearInput();closeAuxiliary();G.restore(data);inputMode=G.inputMode;$('rules').value=inputMode;frames=[];last=0;syncUI();$('game').focus();};
 $('stageGrid').innerHTML=STAGE_META.map((s,i)=>`<button class="stage-card" data-stage="${i}" style="--stage-accent:${s.accent}" aria-label="第 ${i+1} 关 ${s.cn}">${typeof STAGE_PREVIEWS!=='undefined'&&STAGE_PREVIEWS[i]?`<img src="${STAGE_PREVIEWS[i]}" alt="" loading="lazy">`:'<div class="preview-fallback"></div>'}<span class="stage-caption"><span class="num">${String(i+1).padStart(2,'0')}</span><b>${s.cn}</b></span></button>`).join('');
 $('stageGrid').onclick=e=>{const el=e.target.closest('[data-stage]');if(el)start(Number(el.dataset.stage),{practice:true});};$('selectStages').onclick=()=>openModal('stageSelect');$('closeStages').onclick=()=>closeModal('stageSelect');
 $('pauseButton').onclick=togglePause;$('resume').onclick=togglePause;$('restart').onclick=retryStage;$('quit').onclick=menu;$('resultMenu').onclick=menu;$('again').onclick=retryStage;
 $('next').onclick=()=>{if(!requireDevice())return;clearInput();G.nextStage();frames=[];syncUI();};
 let soundEnabled=true;$('audioButton').setAttribute('aria-pressed','true');
 $('audioButton').onclick=()=>{AudioFX.init();soundEnabled=AudioFX.toggle();$('audioButton').setAttribute('aria-pressed',String(soundEnabled));$('audioButton').setAttribute('aria-label',soundEnabled?'关闭声音':'开启声音');$('audioButton').title=soundEnabled?'关闭声音':'开启声音';};
 const fullscreen=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});};$('fullscreen').onclick=fullscreen;
 function openSettings(){settingsPaused=G.mode==='playing';if(settingsPaused)G.pause();clearInput();syncUI();openModal('settingsPanel');}
 $('settingsButton').onclick=openSettings;$('openSettings').onclick=openSettings;
 $('closeSettings').onclick=()=>{closeModal('settingsPanel');if(settingsPaused&&G.mode==='paused')G.pause();settingsPaused=false;clearInput();syncUI();};
 $('quality').value=quality;$('renderScale').value=scale;text('scaleValue',Math.round(scale*100)+'%');$('reduceMotion').checked=reducedMotion;$('showTutorial').checked=guideLevel!=='off';$('guidanceLevel').value=guideLevel;
 $('quality').onchange=e=>{quality=e.target.value;R.setQuality(quality);persist();};$('renderScale').oninput=e=>{scale=Number(e.target.value);R.setScale(scale);text('scaleValue',Math.round(scale*100)+'%');persist();};
 $('reduceMotion').onchange=e=>{reducedMotion=e.target.checked;R.setMotion(reducedMotion);document.body.classList.toggle('reduced-motion',reducedMotion);persist();};$('showTutorial').onchange=e=>{tutorialEnabled=e.target.checked;guideLevel=tutorialEnabled?'contextual':'off';$('guidanceLevel').value=guideLevel;guide.level=guideLevel;persist();syncUI();};
 $('guidanceLevel').onchange=e=>{guideLevel=e.target.value;guide.level=guideLevel;tutorialEnabled=guideLevel!=='off';$('showTutorial').checked=tutorialEnabled;persist();syncUI();};
 $('resetLearning').onclick=()=>{guide.clearLearning();text('learningStatus','已重置学习记录；难度与存档不变。');};
 $('helpButton').onclick=()=>{helpPaused=G.mode==='playing';if(helpPaused)G.pause();clearInput();syncUI();openModal('help');};
 $('closeHelp').onclick=()=>{closeModal('help');if(helpPaused&&G.mode==='paused')G.pause();helpPaused=false;clearInput();syncUI();};$('closeDevice').onclick=()=>closeModal('deviceNotice');
 function performanceReport(){const sorted=[...frames].sort((a,b)=>a-b),mean=frames.reduce((a,b)=>a+b,0)/Math.max(1,frames.length);return{build:'0.15.0',renderer:R.backend.name,device:R.device,browser:navigator.userAgent,stage:G.stageIndex+1,playerCount:G.playerCount,inputMode:G.inputMode,mode:G.mode,render:R.stats,samples:frames.length,meanFPS:frames.length?1000/mean:null,p95FrameMs:sorted[Math.floor(sorted.length*.95)]||null,rawFrameTimesMs:[...frames],notes:'Actual animation-frame intervals, not simulation speed. Benchmark the target GPU separately.'};}
 function saveFile(name,value,type){const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 function exportJSON(){const data=performanceReport();saveFile('eightfront-3d-performance.json',JSON.stringify(data,null,2),'application/json');return data;}$('exportPerformance').onclick=exportJSON;
 $('offlineExport').onclick=()=>{if(window.__SOURCE_HTML__&&$('threeEmbedded'))saveFile('Eight-Fronts-Offline.html',window.__SOURCE_HTML__,'text/html');};
 addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;externalInputSeen=true;lastDevice='keyboard';
  for(let i=0;i<Math.max(1,G.playerCount);i++)if(Object.values(mappings[i]).some(c=>c.includes(e.code)))playerDevices[i]='keyboard';if(G.playerCount===1&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyX','KeyZ','ShiftRight'].includes(e.code))playerDevices[0]='keyboard';
  if(activeModal&&e.code==='Tab'){
   e.preventDefault();const items=focusables($(activeModal));if(!items.length)return;let i=items.indexOf(document.activeElement);i=(i+(e.shiftKey?-1:1)+items.length)%items.length;items[i].focus();return;
  }
  if(e.code==='Escape'){e.preventDefault();if(!e.repeat)back();return;}
  if(e.target?.closest?.('button,select,input,textarea,summary')&&!['F3','F8'].includes(e.code))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F3','Slash','Quote'].includes(e.code))e.preventDefault();
  if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);if(e.repeat)return;
  if(e.code==='KeyP'){back();return;}
  if(e.code==='Enter'){e.preventDefault();if(G.mode==='menu'&&!activeModal)start(0);else if(G.mode==='clear')$('next').click();else if(G.mode==='over')retryStage();}
  if(e.code==='KeyF')fullscreen();if(e.code==='F3'){showPerf=!showPerf;syncUI();}if(e.code==='F8')document.body.classList.toggle('photo');
 });
 addEventListener('keyup',e=>keys.delete(e.code));
 document.addEventListener('focusin',e=>{if(activeModal&&!$(activeModal).contains(e.target))preferredFocus(activeModal)?.focus({preventScroll:true});});
 addEventListener('blur',()=>{clearInput();if(G.mode==='playing')G.pause();syncUI();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='playing'){G.pause();clearInput();syncUI();}});
 addEventListener('resize',()=>{if(deviceBlocked()&&G.mode==='playing'){G.pause();clearInput();syncUI();openModal('deviceNotice');}else checkDevice();});
 addEventListener('gamepadconnected',()=>{externalInputSeen=true;lastDevice='gamepad';checkDevice();});
 addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;if(G.mode==='playing'&&(e.movementX||e.movementY))mouse.active=true;});
 $('game').addEventListener('mousedown',e=>{if(e.button===0&&G.mode==='playing'){mouse.fire=true;mouse.pressed=true;mouse.active=true;playerDevices[0]='mouse';mouse.x=e.clientX;mouse.y=e.clientY;AudioFX.init();$('game').focus();}});
 addEventListener('mouseup',()=>mouse.fire=false);$('game').addEventListener('contextmenu',e=>e.preventDefault());
 text('engineName','THREE.JS R179');window.__BOOT_STATUS__={state:'initialized',engine:R.backend.name,embedded:true,firstFrameRendered:false};$('loading').hidden=true;selection();$('deploy').focus({preventScroll:true});requestAnimationFrame(safeFrame);
}
initApp();
