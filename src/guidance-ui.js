/* DOM overlay; small target-local cues, stable pooled nodes and a throttled
 * polite live region. Every interactive target state comes from CombatGuide. */
class CombatGuideView {
 constructor({game,guide,renderer,binding,device,level}) {
  Object.assign(this,{game,guide,renderer,binding,device,level});this.root=document.getElementById('combatCues');this.nodes=new Map();this.lastSpeech='';this.speechAt=-Infinity;
 }
 node(id,cls){if(!this.nodes.has(id)){const e=document.createElement('div');e.className=cls;e.id='cue-'+id;this.root.append(e);this.nodes.set(id,e);}const e=this.nodes.get(id);e.hidden=false;return e;}
 html(e,s){if(e.innerHTML!==s)e.innerHTML=s;}
 pos(e,x,y){e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';}
 icon(code){const paths={prone:'M5 16h17m-8 0 5-3 7 2M5 11a2 2 0 1 0 0-.1M7 14l7 2m4 0 5 4',stand:'M13 6a2 2 0 1 0 0-.1M13 10v8m0-5 8 1m-8 4-5 7m5-7 5 7',jump:'M14 6a2 2 0 1 0 0-.1M14 10l-3 6 8 3m-8-3-5 4m7-8 9-3M4 8V2m-3 3 3-3 3 3',alignLeft:'M24 14H5m7-7-7 7 7 7',alignRight:'M4 14h19m-7-7 7 7-7 7',fire:'M14 4v5m0 10v5M4 14h5m10 0h5M14 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8',armor:'m14 3 9 4v8l-9 9-9-9V7Zm-3 5 6 4-6 5 4 4',advance:'M14 24V4m-7 7 7-7 7 7',sealed:'M8 12V8a6 6 0 0 1 12 0v4M5 12h18v12H5Zm9 4v4',stop:'M9 8v9m4-12v12m4-10v10m4-7v10q-6 8-12 1L4 15',releaseLock:'M8 12V8a6 6 0 0 1 12 0M5 12h18v12H5Zm9 4v4',barrier:'m14 2-8 13h7l-1 11 10-16h-8Z'};
  const key=['jumpRelease','dodgeRush','dodgeLeap'].includes(code)?'jump':code==='prerequisite'?'sealed':code;
  return `<svg class="cue-icon" viewBox="0 0 28 28" aria-hidden="true"><path d="${paths[key]||paths.fire}"/></svg>`;
 }
 words(a){const id=a.owner,bind=k=>this.binding(k,id),g=this.game;
  const firing=t(g.inputMode==='retro'&&['R','S','F'].includes(g.players[id-1]?.weapon)?'tap':'hold'),c=t('cue');
  const m={alignLeft:[bind('left'),c.alignLeft],alignRight:[bind('right'),c.alignRight],prone:[bind('down')+' + '+bind('fire'),c.prone],stand:[t('release',bind('down')),c.stand],jump:[bind('jump')+' + '+bind('fire'),c.jump],jumpRelease:[t('release',bind('down')),c.jumpRelease],stop:[t('releaseMove'),c.stop],releaseLock:[t('release',bind('lock')),c.releaseLock],armor:[bind('fire'),c.armor],fire:[bind('fire'),t('fireCue',firing)],advance:[bind('up'),c.advance],sealed:['',c.sealed],dodgeRush:[bind('jump'),c.dodgeRush],dodgeLeap:['',c.dodgeLeap],prerequisite:['',c.prerequisite],barrier:['',c.barrier]};
  const [key,text]=m[a.code]||['',''];return{key,text};
 }
 projection(x,y,z){return this.renderer.project(x,y,z);}
 render(){const g=this.game,guide=this.guide;guide.level=this.level();guide.context(g);
  if(this.viewStage!==g.stage||this.viewRoom!==g.room||g.t<this.viewTime){this.lastSpeech='';this.candidateSpeech='';this.speechAt=-Infinity;this.candidateAt=g.t;document.getElementById('guideAnnounce').textContent='';}
  this.viewStage=g.stage;this.viewRoom=g.room;this.viewTime=g.t;
  const objective=guide.objective(g);for(const id of ['pauseObjective','helpObjective']){const e=document.getElementById(id);if(e){const s=`<small>${t('currentObjective')}</small><strong>${objective.title}</strong><p>${objective.detail}</p>`;this.html(e,s);}}
  for(const e of this.nodes.values())e.hidden=true;
  this.root.hidden=g.mode!=='playing'||!g.player;if(this.root.hidden)return;
  const living=g.players.filter(p=>!p.dead),advice=living.map(p=>guide.advice(g,p)).filter(Boolean),chosen=living.map(p=>guide.choose(g,p)).filter(Boolean);
  const targets=g.boss?.active?g.boss.targets:g.stage.mode==='depth'?g.sensors:[];
  const feedbackText=t('feedback');
  for(const [index,q] of (targets||[]).entries()){
   const fb=guide.feedback.get(q);if(q.hp<=0&&(!fb||g.t-fb.born>.7))continue;
   const pos=this.projection(q.x,q.y,q.z+.07);if(!pos.visible||pos.x<15||pos.x>innerWidth-15||pos.y<90||pos.y>innerHeight-40)continue;
   const selected=chosen.includes(q),state=guide.state(g,q),flash=fb&&g.t-fb.born<.65;
   const e=this.node('target-'+index,'target-cue');e.dataset.state=state;e.classList.toggle('selected',selected);e.classList.toggle('confirmed',!!flash);
   const side=this.projection(q.x+(q.rx||q.r||.65),q.y,q.z),size=clamp(Math.abs(pos.x-side.x)*2+12,26,g.boss?.active?88:62);
   e.style.width=size+'px';e.style.height=size+'px';this.pos(e,pos.x,pos.y);
   const armor=q.maxArmor?`<span class="target-armor" aria-hidden="true"><i style="width:${Math.max(0,q.armor/q.maxArmor)*100}%"></i></span>`:'';
   const badge=state==='prerequisite'||state==='sealed'?'▣':state==='destroyed'?'✓':String(index+1);
   this.html(e,`<span class="target-number">${badge}</span>${armor}<span class="target-life"><i style="width:${Math.max(0,q.hp/q.maxHp)*100}%"></i></span>${flash?`<span class="target-feedback">${feedbackText[fb.kind]||''}</span>`:''}`);
   e.dataset.target=q.id;e.dataset.edge=pos.x>innerWidth-150?'right':'left';
  }
  for(const p of living){const ray=guide.ray(g,p);if(!ray)continue;const point=this.projection(...ray.point);if(!point.visible||point.x<5||point.x>innerWidth-5||point.y<110||point.y>innerHeight-20)continue;
   const e=this.node('ray'+p.id,'aim-preview p'+p.id);e.dataset.hit=ray.hit?'yes':'no';this.html(e,`<i></i>${g.playerCount===2?`<small>${p.id}</small>`:''}`);this.pos(e,point.x,point.y);
  }
  // One concise instruction per live player, never a stack of global tutorial toasts.
  const boxes=[];
  for(const a of advice){
   if(a.essential){if(a.owner!==living[0]?.id)continue;const e=this.node('advance','advance-cue');const w=this.words(a);this.html(e,`${this.icon('advance')}<span>${w.text}</span>${guide.level!=='off'?`<kbd>${w.key}</kbd>`:''}`);const at=this.projection(0,.65,-7);this.pos(e,clamp(at.x,140,innerWidth-140),clamp(at.y,155,innerHeight-95));continue;}
   if(!a.target)continue;const pos=this.projection(a.target.x,a.target.y,a.target.z);if(!pos.visible)continue;
   const e=this.node('player'+a.owner,'instruction-cue p'+a.owner);e.dataset.reason=a.code;e.dataset.recovery=String(!!a.recovery);const w=this.words(a);
   this.html(e,`${this.icon(a.code)}<span class="cue-copy">${g.playerCount===2?`<b class="cue-owner">P${a.owner}${targets.length>1?' · '+t('target')+' '+(targets.indexOf(a.target)+1):''}</b>`:''}<strong>${w.text}</strong>${w.key?`<kbd>${w.key}</kbd>`:''}</span>`);
   const width=Math.max(160,e.offsetWidth),height=e.offsetHeight||48;let x=pos.x,y=pos.y-76;
   if(g.boss?.active&&g.stage.mode!=='depth'){const p=g.players[a.owner-1],edge=this.projection(a.target.x+(a.target.rx||1),a.target.y,a.target.z);x+=(p.x<a.target.x?-1:1)*(width/2+Math.abs(edge.x-pos.x)+60);y=pos.y-60;}
   if(advice.some(b=>b!==a&&b.target===a.target))x+=(a.owner===1?-1:1)*(width/2+9);
   x=clamp(x,20+width/2,innerWidth-20-width/2);y=clamp(y,145+height/2,innerHeight-100-height/2);
   for(const b of boxes)if(Math.abs(x-b.x)<(width+b.w)/2+8&&Math.abs(y-b.y)<height+8)y=b.y-height-10;
   y=Math.max(145+height/2,y);this.pos(e,x,y);boxes.push({x,y,w:width});
  }
  // Discrete spoken state; not hit ticks, health ticks or every-frame coordinates.
  const spoken=advice.map(a=>`${g.playerCount===2?t('spokenPlayer',a.owner):''}${this.words(a).text} ${this.words(a).key}`).join(t('spokenSep'));
  if(!spoken&&g.t-this.speechAt>6){this.lastSpeech='';document.getElementById('guideAnnounce').textContent='';}
  if(spoken!==this.candidateSpeech){this.candidateSpeech=spoken;this.candidateAt=g.t;}
  if(spoken&&spoken!==this.lastSpeech&&g.t-this.candidateAt>.65&&g.t-this.speechAt>2.5){document.getElementById('guideAnnounce').textContent=spoken;this.lastSpeech=spoken;this.speechAt=g.t;}
 }
}
