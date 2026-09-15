/* Combat art: one visual vocabulary for readable actors, weapons and effects.
 * Geometry is generated in world space. No gameplay timing or hitboxes are changed here. */
const CombatArt=(()=>{
 const {matrix:M,segment,mul,norm,cross,id}=Math3D;
 const A=(...a)=>R.add(...a),B=(...a)=>R.box(...a),S=(...a)=>R.ball(...a),L=(...a)=>R.beam(...a);
 const palette={R:'#ffe7b0',M:'#f4f1d8',S:'#ffc978',L:'#66e5ed',F:'#ffb45e'};
 function ribbon(a,b,width,col,emit=0,alpha=1,kind=19,phase=0){
  const delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta);if(len<1e-5)return;
  const x=norm(delta),mid=a.map((v,i)=>(v+b[i])*.5),eye=R.backend.camera.position.toArray();
  let y=cross(norm(eye.map((v,i)=>v-mid[i])),x);if(Math.hypot(...y)<.01)y=cross([0,1,0],x);if(Math.hypot(...y)<.01)y=[0,0,1];y=norm(y);const z=cross(x,y),m=id();
  for(let i=0;i<3;i++){m[i]=x[i]*len;m[4+i]=y[i]*width;m[8+i]=z[i];m[12+i]=mid[i];}
  A('glow',m,col,emit,kind,phase,alpha);
 }
 function shadow(x,y,z,size=1){A('quad',M(x,y+.018,z,size,.54*size,1,0,0,-Math.PI/2),'#08161e',0,30,0,.24);}
 function humanoid(e,t,depth=false){
  const heavy=e.type==='heavy',runner=e.type==='runner',dead=!!e.dead;
  const moving=Math.abs(e.vx||0)>.25,phase=(e.gaitDistance||0)*4.1+(e.id||0)*.2;
  const wind=Math.min(1,(e.wind||0)/.45),crouch=wind*.065,hip=.91-crouch;
  const suit=heavy?'#424751':runner?'#454e58':'#54515a',armor=heavy?'#927464':runner?'#9b705c':'#7c665c',skin=e.hit>0?'#f3d6b4':'#bf926f';
  let yaw=depth?-Math.PI/2:e.face<0?Math.PI:0;
  const root=M(e.x,e.y+(dead?.55:0),e.z||0,heavy?1.12:1,runner?.94:1,heavy?1.13:1,dead?(e.deathAge||0)*2.1*(e.face||1):0,yaw);
  R.transform(root,()=>{
   const limb=(a,b,w,col,kind=15)=>A('limb',segment(a,b,w,w*.92),col,0,kind);
   for(const side of [-1,1]){
    const ph=phase+(side<0?Math.PI:0),stride=moving?Math.sin(ph)*.35:side*.15,lift=moving?Math.max(0,Math.cos(ph))*.18:0,z=side*(heavy?.21:.17);
    const ankle=[stride,.12+lift,z],knee=[stride*.48+.07,.49+lift*.3,z];
    limb([0,hip,z],knee,heavy?.32:.27,suit);limb(knee,ankle,heavy?.29:.235,suit);
    B(knee[0]+.085,knee[1],z,.12,.23,.25,armor,0,0,0,2);
    B(ankle[0]+.055,.09+lift,z,.37,.18,.29,'#243440',0,0,0,15);
   }
   B(0,hip,0,.34,.23,.55,suit,0,0,0,15);
   A('torso',M(.01,1.22-crouch,0,.44,.60,.67),suit,0,15);
   B(.15,1.24-crouch,0,.14,.38,heavy?.76:.50,armor,0,0,0,2);
   B(.235,1.24-crouch,0,.03,.17,.22,'#263641',0,0,0,2);
   if(!runner)B(-.23,1.22-crouch,0,.17,.42,heavy?.58:.37,'#354550',0,0,0,2);
   for(const z of [-.19,.19])B(.02,1.49-crouch,z,.28,.07,.065,'#a89479',0,0,0,15);
   A('cyl',M(0,1.58-crouch,0,.13,.19,.15),skin,0,14);
   A('head',M(.015,1.79-crouch,0,.31,.38,.33),skin,0,14);
   if(runner){B(-.015,1.96-crouch,0,.29,.09,.33,'#273c46',0,0,0,15);B(.16,1.83-crouch,.0,.035,.075,.29,'#302f30',0,0,0,2);}
   else{B(-.025,1.925-crouch,0,.36,.20,.39,armor,0,0,0,2);B(.177,1.845-crouch,0,.055,.068,.33,'#382d30',0,0,0,2);B(.212,1.845-crouch,0,.02,.026,.26,'#d18b62',0,0,0,2,wind*.4);}
   let pitch=depth?0:Math.atan2(Math.sin(e.aim||0),Math.cos(e.aim||0)*(e.face<0?-1:1));pitch-=wind*.23;
   const gy=1.38-crouch,dx=Math.cos(pitch),dy=Math.sin(pitch),grip=[.66*dx,gy+.66*dy,.10];
   for(const side of [-1,1]){const z=side*.29,elbow=[.17,1.05-crouch,z],w=heavy?.28:.205;
    limb([.005,1.46-crouch,z],elbow,w,runner?skin:suit,runner?14:15);limb(elbow,[grip[0]-(side>0?.27:0),grip[1]-.08,side>0?.17:.01],w*.84,runner?skin:suit,runner?14:15);
    if(heavy)B(-.015,1.48-crouch,z,.34,.23,.27,armor,0,0,0,2);
   }
   R.transform(M(-(e.recoil||0),gy,.10,1,1,1,pitch),()=>{
    B(.43,0,0,.65,.145,heavy?.24:.17,'#263844',0,0,0,2);B(.24,-.13,0,.10,.20,.12,'#263641',-.18,0,0,15);
    if(heavy){B(.64,-.12,0,.27,.26,.29,'#53646a',0,0,0,2);for(const z of [-.07,.07])L([.72,0,z],[1.12,0,z],.052,'#89998f',2);}
    else L([.72,0,0],[1.12,0,0],runner?.045:.037,'#8d9d9c',2);
    if(e.muzzle>0){R.light(1.15,0,.14,'#ffb876',12,3.5,2);A('flash',M(1.22,0,.03,.33,.22,.24,t*4),'#ffe0a2',1.1,2);}
   });
   if(heavy){for(const z of [-.35,.35])B(-.11,1.43-crouch,z,.29,.31,.20,'#ab9277',0,0,0,2);}
  });
  if(!dead&&e.grounded)shadow(e.x,e.y,e.z||0,heavy?1.2:.9);
 }
 // Camera-facing soft cards.
 function card(x,y,z,w,h,col,emit,kind,age=0,alpha=1,spin=0,additive=true){
  const basis=R.backend.camera?.matrixWorld?.elements;
  if(!basis){A(additive?'glow':'quad',M(x,y,z,w,h,1,spin),col,emit,kind,age,alpha);return;}
  const m=id(),c=Math.cos(spin),q=Math.sin(spin);
  for(let i=0;i<3;i++){m[i]=(basis[i]*c+basis[4+i]*q)*w;m[4+i]=(basis[4+i]*c-basis[i]*q)*h;m[8+i]=basis[8+i];}m[12]=x;m[13]=y;m[14]=z;
  A(additive?'glow':'quad',m,col,emit,kind,age,alpha);
 }
 function muzzle(p,g){
  const d=p.aimDirection||[Math.cos(p.aim||0),Math.sin(p.aim||0),0],a=g.muzzlePoint(p,d),type=p.weapon||'R',col=palette[type],f=Math.min(1,p.muzzle/(type==='M'?.04:.06));
  const len=type==='S'?.61:type==='L'?.38:type==='F'?.32:.43,end=a.map((v,i)=>v+d[i]*len);
  ribbon(a,end,type==='S'?.39:type==='L'?.10:.25,col,type==='M'?1.9:2.7,f,type==='F'?18:19);
  // A compact white-hot core, tapered outer gas and radial iris are independent layers.
  ribbon(a,a.map((v,i)=>v+d[i]*len*.48),type==='L'?.035:.075,'#fff4dc',4.,f,19);
  if(type!=='F')card(...a,type==='S'?.24:.16,type==='L'?.20:.14,col,1.3,21,0,f*.58,g.t*3.);
 }
 function shot(b,t,stageIndex){
  const d=norm([b.vx,b.vy,b.vz]);
  if(b.type==='F'){
   if(b.retro){S(b.x,b.y,b.z,.23,.23,.23,'#eea056',.6);return;}
   const len=.54+Math.min(.87,b.age*2.3),tail=[b.x-d[0]*len,b.y-d[1]*len,b.z-d[2]*len];
   ribbon(tail,[b.x+d[0]*.06,b.y+d[1]*.06,b.z+d[2]*.06],.29+Math.min(.42,b.age*.85),'#f69438',.9,.44,18,b.age+(b.id||0)*.173);return;
  }
  const len=b.type==='L'?1.8:b.type==='S'?.29:b.type==='M'?.42:.56,tail=[b.x-d[0]*len,b.y-d[1]*len,b.z-d[2]*len],col=stageIndex===4&&b.type!=='L'?'#ed9c4b':palette[b.type]||b.color;
  // Dark silhouette remains legible over snow; HDR core does not change the hitbox.
  L(tail,[b.x,b.y,b.z],b.type==='L'?.043:.033,'#18323d',9);
  // Put the luminous coating on the camera-facing shell, not inside an opaque tube.
  const eye=R.backend.camera.position.toArray(),facing=norm([eye[0]-b.x,eye[1]-b.y,eye[2]-b.z]),lift=b.type==='L'?.066:.052;
  const frontTail=tail.map((v,i)=>v+facing[i]*lift),front=[b.x,b.y,b.z].map((v,i)=>v+facing[i]*lift);
  ribbon(frontTail,front,b.type==='L'?.20:b.type==='S'?.10:.13,col,b.type==='L'?3.2:1.9,.76,19);
  L(frontTail,front,b.type==='L'?.013:.017,b.type==='L'?'#d9ffff':'#fff0c4',9,3.1);
 }
 function particle(a){const f=Math.max(0,1-a.age/a.life);
  if(a.kind==='spark'){const speed=Math.hypot(a.vx,a.vy,a.vz)||1,len=Math.min(.35,speed*.045)*f;const tail=[a.x-a.vx/speed*len,a.y-a.vy/speed*len,a.z-a.vz/speed*len];L(tail,[a.x,a.y,a.z],.010*f,a.color,9,2.1*f);ribbon(tail,[a.x,a.y,a.z],.040*f,a.color,1.1,f*.65);}
  else if(a.kind==='debris')A('stone',M(a.x,a.y,a.z,a.size*f,a.size*.65*f,a.size*.7*f,a.age*3,a.age*2),a.color,0,a.surface==='organic'?12:15);
  else if(a.kind==='dust'||a.kind==='smoke'){const size=a.size*(1+a.age*2.7);card(a.x,a.y,a.z,size,size*.85,a.color,0,27,a.age,f*(a.kind==='smoke'?.55:.45),a.age*.2,false);}
  else{const size=a.size*(.7+a.age*1.9);card(a.x,a.y,a.z,size,size*1.12,a.color,1.2*f,26,a.age/a.life,f*.19,a.age*.18);}
 }
 function effects(g){
  const litShooters=new Set(),heatedShooters=new Set();
  for(const e of [...(g.visualEvents||[])].reverse()){const age=g.t-e.born;if(age<0||age>e.life)continue;
   if(e.kind==='shot'){
    const d=e.d,type=e.weapon,col=palette[type]||'#ffe0aa';
    if(age<.13&&!litShooters.has(e.owner)){litShooters.add(e.owner);const decay=Math.exp(-age*30);R.light(e.x,e.y,e.z,col,(type==='S'?30:type==='F'?11:20)*decay,type==='F'?3.6:4.5,3);}
    if(type==='F'&&age<.22&&!heatedShooters.has(e.owner)){heatedShooters.add(e.owner);R.heat(e.x+d[0]*1.1,e.y+d[1]*1.1,e.z+d[2]*1.1,.85);}
    if(type==='F'||type==='L')continue;
    // Procedural brass uses a visual-only seed; gameplay RNG is never consumed.
    const seed=e.seed*.754877666,spin=seed*6.283,side=[-d[2],0,d[0]],a=Math.min(age,1.15),floor=e.floor+.045;
    const originY=e.y-.04,vy=1.35+Math.sin(spin)*.26,hit=(vy+Math.sqrt(vy*vy+2*12*Math.max(0,originY-floor)))/12;
    const y=a<hit?originY+vy*a-6*a*a:floor+Math.max(0,.10*Math.sin((a-hit)*13))*Math.exp(-(a-hit)*12);
    const travel=Math.min(a,hit+.18),x=e.x-d[0]*.61+side[0]*travel*1.8-d[0]*travel*.4,z=e.z-d[2]*.61+side[2]*travel*1.8-d[2]*travel*.4;
    A('cyl',M(x,y,z,.052,.13,.052,spin+a*12,a*9), '#c4a05b',0,9);
    if(age>.035&&age<.48&&(type!=='M'||e.seed%3===0)){const f=Math.sin(Math.PI*(age-.035)/.445);card(e.x+d[0]*.1,e.y+age*.4,e.z+.05,.12+age*.35,.16+age*.60,'#789095',0,27,age,f*.20,spin,false);}
   }else if(e.kind==='blast'){
    const big=e.big?1.7:1.,u=age/.63;
    if(age<.42)R.light(e.x,e.y+.3,e.z+.25,'#ffbe78',65*big*Math.exp(-age*9),7*big,4);
    if(age<.55){const size=big*(.35+2.5*Math.sqrt(Math.max(0,u)));card(e.x,e.y+age*.42,e.z+.05,size,size*1.02,'#ffb767',1,26,u,Math.pow(Math.max(0,1-u),1.3)*.65);}
    if(age<.38){const size=big*(.6+age*10);card(e.x,e.y,e.z+.07,size,size,'#ffc183',.65,21,0,Math.pow(1-age/.38,2)*.26);R.heat(e.x,e.y+.8,e.z,big*1.6);}
    if(age>.12){const f=Math.sin(Math.PI*Math.min(1,(age-.12)/1.18));card(e.x,e.y+age*.9,e.z-.12,big*(1.1+age*1.5),big*(.8+age*1.65),'#506069',0,27,age,f*.38,e.seed*.37,false);}
   }else if(e.kind==='impact'&&age<.12&&e.surface==='metal'){
    const f=1-age/.12;card(e.x,e.y,e.z+.08,.12+age*.4,.12+age*.4,'#ffe7a9',2,19,0,f*.75,e.seed*2.4);
    if(age<.07)R.light(e.x,e.y,e.z+.20,'#ffc583',4*f,1.8,2);
   }
  }
 }
 function brackets(x,y,z,w,h,col,emit=.4){
  const edge=Math.min(w,h)*.18;
  for(const sx of [-1,1])for(const sy of [-1,1]){B(x+sx*(w/2-edge/2),y+sy*h/2,z,edge,.045,.035,col,0,0,0,2,emit);B(x+sx*w/2,y+sy*(h/2-edge/2),z,.045,edge,.035,col,0,0,0,2,emit);}
 }
 function bossStatus(g){const b=g.boss;if(!b?.active||b.dead)return;for(const q of b.targets){if(q.hp<=0)continue;const open=q.kind==='core'&&g.targetOpen(q);if(!open&&!b.telegraph)continue;const pad=.20+(b.telegraph?Math.sin(g.t*10)*.07:0);brackets(q.x,q.y,q.z+q.rz+.16,(q.rx+pad)*2,(q.ry+pad)*2,open?'#a2e3db':'#f5af6c',open?.35:.65);}}
 return{humanoid,muzzle,shot,particle,effects,card,brackets,bossStatus,shadow,ribbon};
})();
