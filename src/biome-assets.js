/* Environment assemblies for stages 01/02/03/04/05/07.
 * Real meshes in the production scene, not background images. All stage data
 * are read-only. Decorative geometry stays behind z=-2, except floor fascia
 * below the collision surface. Shared hardware does not mean shared layouts.
 */
const BiomeAssets=(()=>{
 const M=(...a)=>R.matrix(...a),B=(...a)=>R.box(...a),A=(...a)=>R.add(...a),S=(...a)=>R.ball(...a),L=(...a)=>R.beam(...a);
 const H=EnvironmentAssets.hardware,PI=Math.PI,TAU=2*PI;
 const hash=n=>{let v=Math.sin(n*127.1+91.73)*43758.5453;return v-Math.floor(v);};
 const F=(x,y,z,w,h,d,a=0)=>Math3D.oriented(x,y,z,w,h,d,{axis:'z',spin:a});
 const C={dark:'#172d39',wall:'#304953',paint:'#587681',edge:'#9aa9a6',alloy:'#96a6a7',rubber:'#1d2930',warm:'#e6bb7f',cold:'#94c1c7'};
 const plate=(x,y,z,w,h,d,col=C.paint)=>B(x,y,z,w,h,d,col,0,0,0,36);
 const beam=(a,b,w=.20,col=C.paint,d=w)=>A('panel',Math3D.segment(a,b,w,d),col,0,36);
 function flangeJoint(x,y,z,w=.48){plate(x,y,z,w,w,.13,C.edge);for(const side of [-1,1])H.bolt(x+side*w*.27,y,z+.09,w*.17);}
 function column(x,z,h=11){
  plate(x,h*.5,z,.33,h,.90,C.paint);for(const d of [-.42,.42])plate(x,h*.5,z+d,.76,h,.14,C.edge);
  plate(x,.25,z,1.10,.50,1.24,C.paint);plate(x,.07,z,1.32,.14,1.4,C.edge);
  for(const side of [-1,1])H.bolt(x+side*.44,.26,z+.67,.12);
  for(const yy of [h-.4,2.0])flangeJoint(x,yy,z+.52,.67);
 }
 function rail(a,b,y,z,depth=.48){plate((a+b)/2,y,z,b-a,.32,depth,C.paint);for(const yy of [y-.18,y+.18])plate((a+b)/2,yy,z,b-a,.095,depth+.19,C.edge);}
 function truss(a,b,y,z,h=1.0){rail(a,b,y,z);rail(a,b,y-h,z);const n=Math.ceil((b-a)/3.0),w=(b-a)/n;
  for(let i=0;i<n;i++){beam([a+i*w,y-.05,z],[a+(i+.5)*w,y-h+.05,z],.13,C.edge);beam([a+(i+.5)*w,y-h+.05,z],[a+(i+1)*w,y-.05,z],.13,C.edge);}
 }
 function vent(x,y,z,size=1.8,col=C.paint){
  // Thick square casing, recessed duct, a separate rotor and fixed safety grille.
  plate(x,y,z,size*1.24,size*1.24,.38,col);plate(x,y,z+.22,size*1.08,size*1.08,.12,C.dark);
  A('reactorBezel',F(x,y,z+.34,size,.32,size),'#748b90',0,35);
  A('alloyTube',F(x,y,z+.12,size*.80,.18,size*.80),'#15262d',0,36);
  for(const side of [-1,1])for(const sy of [-1,1])H.bolt(x+side*size*.52,y+sy*size*.52,z+.24,.11);
  for(const k of [-1,1]){plate(x+k*size*.2,y,z+.53,.034,size*.79,.035,'#4c626a');plate(x,y+k*size*.2,z+.55,size*.79,.034,.035,'#4c626a');}
  A('alloyTube',F(x,y,z+.56,size*.15,.10,size*.15),'#a2aaa1',0,35);
  Environment.add('rc8Fan',{x,y,z:z+.37,r:size*.42,speed:1.75});
 }
 function cabinet(x,y,z,w=1.55,h=2.8,seed=0,col=C.paint){
  plate(x,y+h*.5,z,w,h,.72,col);plate(x,y+h*.51,z+.40,w*.87,h*.88,.11,'#263d48');
  plate(x,y+h*.51,z+.49,w*.75,h*.80,.08,col);
  H.grill(x,y+h*.74,z+.56,w*.59,h*.20);
  plate(x+w*.24,y+h*.43,z+.56,.065,h*.18,.085,C.edge);
  for(const yy of [y+h*.16,y+h*.88])H.bolt(x-w*.35,yy,z+.56,.08);
  H.light(x-w*.08,y+h*.43,z+.55,w*.29,seed%2?'#c29c63':'#91b4aa',.48);
  for(let i=0;i<2;i++)B(x-w*.13+i*.24,y+h*.28,z+.57,.10,.10,.035,i?'#708786':'#c5a273',0,0,0,36);
  Environment.add('panel',{x:x-w*.1,y:y+h*.61,z:z+.38,w:w*.55,h:h*.28,color:'#7ca89f'});
 }
 function servicePlatform(p,ground=0,jungle=false){
  const x=(p.a+p.b)/2,w=p.b-p.a,y=p.y,z=-1.60,col=jungle?'#627b72':'#71858b';
  plate(x,y-.10,z,w,.20,2.60,col); // top plane exactly y
  rail(p.a,p.b,y-.45,-.35,.19);rail(p.a,p.b,y-.45,-2.83,.21);
  for(let xx=p.a+.30;xx<p.b;xx+=1.6){plate(xx,y-.27,z,.12,.21,2.43,'#3c515a');if(!jungle)plate(xx,y+.011,z,.042,.022,2.14,'#3c525c');}
  // Wall-side brackets: support must not hang in front of actors below this ledge.
  const n=Math.max(2,Math.ceil(w/4));for(let i=0;i<n;i++){const xx=p.a+(i+.5)*w/n,bot=Math.max(ground,y-3.0);
   beam([xx,bot,-4.4],[xx,y-.34,-2.73],.24,col);plate(xx,y-.32,-3.52,.46,.23,1.8,col);flangeJoint(xx,y-.31,-2.58,.46);
   plate(xx,bot+.18,-4.45,.58,.88,.35,'#344a51');}
  // A small number of corner markings, not an all-screen stripe motif.
  for(const xx of [p.a+.58,p.b-.58])H.mark(xx,y-.42,-.19,1.1);
 }
 function hangarFloor(s){
  for(const [a,b,y]of s.floors){if(y<-8)continue;const n=Math.ceil((b-a)/6.0),w=(b-a)/n;
   for(let i=0;i<n;i++){const x=a+(i+.5)*w;
    // Geometry bounds retained for existing collision / floor ownership tests.
    plate(x,y-2.27,-.1,w,3.86,5.8,'#263e49');plate(x,y-.17,-.1,w-.008,.34,5.96,'#81979b');
    plate(x,y-1.95,2.86,w*.95,2.75,.14,'#142b36');
    for(const side of [-1,1]){plate(x+side*w*.43,y-1.95,2.99,.24,2.77,.21,'#687f87');plate(x+side*w*.43,y-.48,3.10,.53,.27,.13,'#98a6a4');}
    if(i%3!==1){beam([x-w*.35,y-3.12,2.99],[x+w*.35,y-.86,2.99],.18,'#59727c');beam([x+w*.35,y-3.12,2.99],[x-w*.35,y-.86,2.99],.18,'#59727c');}
    else{H.grill(x,y-2.05,3.04,w*.70,1.46,true);H.light(x,y-.92,3.10,1.15,C.warm,.65);}
    plate(x,y-.56,3.02,w,.20,.18,'#a2afa7');
    for(const z of [-2.53,2.25]){B(x,y+.013,z,w*.87,.025,.045,'#344954',0,0,0,36);}
    if(i%2===0){H.mark(x+w*.31,y-.52,3.14,.8);for(let j=0;j<7;j++)plate(x-w*.30+j*.14,y+.015,-2.23,.07,.028,.40,'#3c5560');}
   }
  }
  for(const p of s.platforms)if(!p.move)servicePlatform(p);
 }
 function wheel(x,y,z,r=.68,spin=0){A('tractionTire',F(x,y,z,r,.32,r,spin),C.rubber,0,15);A('alloyTube',F(x,y,z+.18,r*.51,.10,r*.51),C.alloy,0,35);A('hexBolt',F(x,y,z+.25,r*.20,.10,r*.20),C.dark,0,35);}
 function aircraft(x,z,variant=0){
  R.transform(M(x,0,z,1,1,1,0,-.13),()=>{
   // Ten-metre maintenance aircraft. Nose +X, gear touches service floor.
   A('airframe',M(0,2.40,0,10.8,1.9,1.8),'#6d858b',0,36);
   A('cockpit',M(2.05,3.04,.05,3.05,1.10,1.55),'#304f61',0,35);
   for(const xx of [.85,2.14,3.16]){beam([xx,2.97,.78],[xx-.18,3.43,.37],.075,'#bdc6b6');}
   // The fuselage colour break follows its body, not a stripe floating in space.
   plate(-.15,2.26,.91,5.8,.20,.08,'#b6b9a0');plate(2.15,2.26,.80,1.1,.20,.08,'#c49f68');
   for(const side of [-1,1]){
    // Extruded swept trapezoids in the XZ plane, with taper and wing-root fairings.
    A('sweptWing',M(-.70,2.22,side*1.62,6.2,2.5,1,0,side===1?0:PI,PI/2),'#607b86',0,36);
    A('airframe',M(-1.65,1.83,side*1.43,4.0,.78,.85),'#3b5661',0,36);
    A('reactorBezel',Math3D.oriented(.17,1.85,side*1.43,.67,.25,.67,{axis:'x'}),'#a6afa8',0,35);
    A('alloyTube',Math3D.oriented(.31,1.85,side*1.43,.43,.14,.43,{axis:'x'}),'#172c36',0,36);
    beam([-1.60,1.77,side*.79],[-1.28,.55,side*.86],.16,C.alloy);
    wheel(-1.25,.50,side*.90,.95);
    // Swept tailplanes and functional root gussets.
    A('sweptWing',M(-4.15,2.63,side*.84,2.32,1.38,1,0,side===1?0:PI,PI/2),'#85969a',0,36);
   }
   A('tailFin',M(-3.72,3.76,0,2.22,2.53,1.8),'#7b8c8d',0,36);
   A('tailFin',M(-3.91,4.04,.14,.68,1.39,.4),'#d0a56b',0,36);
   beam([3.42,2.04,0],[3.21,.41,.12],.14,C.alloy);wheel(3.15,.38,.21,.71);
   H.grill(-.70,2.59,.945,1.55,.31);for(let j=0;j<4;j++)H.bolt(-2.85+j*1.17,2.04,.89,.065);
   H.light(-3.9,2.52,.90,.34,'#99b7b2',.40);
   // Jack stand and inspection step establish the maintenance context.
   beam([-.30,.06,-.35],[-.30,1.54,-.35],.23,'#bb955d');plate(-.30,.08,-.35,1.8,.16,1.4,'#576b70');
   rail(.40,3.4,.26,2.75,.40);for(const xx of [.8,2.9])beam([xx,.3,2.75],[xx,1.60,2.38],.08,'#7e979b');
   for(let j=0;j<4;j++)plate(1.90,.30+j*.29,2.73-j*.095,2.35,.10,.27,'#899b98');
   A('cargoHose',M(-2.6,.35,2.54,3.8,1.1,1.8),'#343b40',0,15);
  });
 }
 function utilityTruck(x,z,variant=0){
  R.transform(M(x,0,z,1,1,1,0,.08),()=>{
   plate(0,.65,0,6.7,.54,2.6,'#344c55');plate(-.65,1.07,0,4.8,.35,2.7,'#859991');
   A('utilityCab',M(2.13,1.80,0,2.0,2.05,2.43),'#8c9c93',0,36);
   // Windscreen fits the angled leading face; side window has a thick surround.
   plate(2.10,2.19,1.233,1.55,.73,.035,'#1c3c4e');plate(2.10,1.48,1.254,1.62,.45,.037,'#6d837e');
   for(const xx of [1.40,2.20])plate(xx,2.19,1.262,.08,.71,.048,C.edge);
   beam([3.17,1.80,.54],[2.73,2.61,.54],.065,C.edge);beam([3.17,1.80,-.54],[2.73,2.61,-.54],.065,C.edge);
   plate(3.21,1.37,0,.12,.20,2.8,'#a0a699');plate(-3.45,.93,0,.18,.22,2.8,'#9aa79e');
   for(const zz of [-1.3,1.3])for(const xx of [-2.05,1.9]){wheel(xx,.53,zz,1.02);plate(xx,1.12,zz,1.33,.20,.36,'#667f80');}
   if(variant%2===0){plate(-.7,1.63,0,3.25,1.07,2.25,'#577580');for(const xx of [-1.95,.57])plate(xx,1.65,1.20,.14,1.30,.14,'#a0aaa2');H.grill(-.60,1.66,1.17,2.12,.58);}
   else{for(const xx of [-1.75,-.2]){A('alloyTube',M(xx,1.81,0,1.20,1.29,1.20),'#a19e84',0,36);A('sealRing',M(xx,2.45,0,1.13,.13,1.13),'#4b6570',0,35);}}
   for(const zz of [-.88,.88])plate(3.32,1.19,zz,.055,.14,.26,'#d3b97a');
   H.mark(-3.43,.98,1.44,.72);H.light(2.11,2.90,0,.60,'#cc9e68',.45);
  });
 }
 function craneRail(x,z){
  truss(x-7.8,x+7.8,8.8,z,1.05);rail(x-7.4,x+7.4,7.93,z+.54,.44);
  for(const side of [-1,1]){beam([x+side*6.9,8.8,z],[x+side*6.9,10.2,z-2.0],.27);plate(x+side*7.25,7.93,z+.54,.3,.75,.65,'#b4915a');}
  Environment.add('rc8Crane',{x,y:7.81,z:z+.62,w:16,seed:hash(x),range:4.0});
 }
 function drawCrane(e,t){
  const u=t*.29+e.seed*TAU,x=e.x+Math.sin(u)*e.range,low=3.40+.42*Math.sin(u*.77+.6),sway=.10*Math.sin(u*2.1);
  plate(x,e.y,e.z,2.30,.48,1.23,'#aa8b58');plate(x,e.y-.33,e.z,1.61,.22,1.0,'#334e57');
  for(const side of [-1,1]){wheel(x+side*.73,e.y+.19,e.z+.42,.43,t*.9);plate(x+side*1.12,e.y-.12,e.z+.63,.15,.25,.12,'#d0b77c');}
  A('alloyTube',F(x,e.y-.50,e.z+.07,.69,1.02,.69),'#5b7077',0,35);
  for(const side of [-1,1])L([x+side*.32,e.y-.53,e.z+.20],[x+sway+side*.23,low+.28,e.z+.24],.027,'#7f9292',35);
  plate(x+sway,low+.18,e.z+.24,.92,.58,.67,'#ab8d53');H.mark(x+sway,low+.18,e.z+.61,.86);
  A('craneHook',M(x+sway,low-.01,e.z+.27,1.48,1.48,1.48),'#c0c6b6',0,35);
 }
 function hangar(s){
  hangarFloor(s);
  plate(s.length/2,5.7,-17,s.length+65,13.1,1.1,'#1c303c');
  // Deep alternating service bays with beams IN FRONT of recessed walls.
  for(let x=-7,index=0;x<s.length+28;x+=25,index++){
   const z=-12.2;column(x-11.5,-7.9,11.8);truss(x-11.5,x+11.5,11.75,-7.9,1.6);
   for(const sy of [3.4,7.9])rail(x-11.2,x+11.2,sy,-13.8,.28);
   plate(x,4.5,z,21.9,8.8,.47,'#293e4a');plate(x,4.07,z+.35,15.9,7.50,.20,'#142a36');
   for(const side of [-1,1]){plate(x+side*8.28,4.1,-10.2,.58,8.4,4.0,'#4b6571');flangeJoint(x+side*8.28,7.84,-8.11,.84);}
   plate(x,8.22,-10.2,16.0,.65,3.9,'#617986');H.light(x,7.74,-8.13,3.1,'#b2cdd0',.85);
   R.light(x,6.8,-7.0,'#a1c4d0',8.0,8,1,false);
   if(index%3===2){utilityTruck(x-2,-6.9,index);cabinet(x+6.8,0,-8.1,1.6,3.0,index);vent(x+5.4,5.0,-10.0,2.20);}
   else{aircraft(x-1.35,-7.2,index);cabinet(x-9.7,0,-7.9,1.35,2.8,index);vent(x+9.3,5.4,-9.7,1.8);}
   craneRail(x-.6,-6.7);
   H.pipeRun([[x-10.3,.35,-8.0],[x-10.3,6.4,-8.0],[x-6.8,6.4,-9.6]],.12,'#788f93');
   rail(x-10.8,x+10.8,10.15,-11,.34);
   for(let j=0;j<3;j++)plate(x-9.4+j*.19,6.0,-8.18,.06,6.5,.085,'#32434a');
   for(const side of [-1,1])H.mark(x+side*8.23,.45,-8.03,1.0);
   Environment.add('steam',{x:x+8.5,y:.85,z:-8.0,color:'#afbec1'});
  }
  // Sparse foreground workshop props retain a readable fighting lane.
  for(let x=14;x<s.length-20;x+=39){Art.crate(x,0,-3.0,.95);Art.barrel(x+1.5,0,-3.2,.80);}
  for(const h of s.hazards)if(h.type==='crusher'){
   for(const side of [-1,1]){column(h.x+side*2.05,-2.85,8.5);plate(h.x+side*2.04,4.1,-1.94,.17,7.7,.28,'#bac4b7');}
   plate(h.x,8.62,-.8,5.35,.72,4.7,'#768c91');H.light(h.x,8.15,-.38,1.28,'#c9a675',.40);
  }
 }
 function ravineShelf(p,index){
  const x=(p.a+p.b)/2,w=p.b-p.a,v=index%4,side=x<0?-1:1;
  A('ravineShelf'+v,M(x,p.y,-3.60,w,1.12+(index%4)*.16,7.80),'#7a8979',0,38);
  // Rock root anchored into the rear wall rather than a stone pedestal below.
  const wx=side*11.9;
  A('strataMass'+v,M((x+wx)/2,p.y-1.65,-7.25,Math.abs(wx-x)+2.6,4.25,5.8),'#637569',0,37);
  if(index%3===0){Art.fern(side<0?p.a+.45:p.b-.45,p.y,-2.79,.35);Art.vine(x+side*w*.35,p.y-.12,-3.0,1.4);}
  // Moss follows the back lip only; no thin green cap covering the whole shelf.
  if(index%2===0)A('cliff',M(x+side*w*.26,p.y-.035,-2.95,w*.28,.10,.32),'#617f56',0,10);
 }
 function ravine(s){
  // Broad continuous strata walls, sparse overhangs; the water occupies a cleft.
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const yy=-4+i*17.5,xx=side*(14.2+.8*Math.sin(i*1.6));
   A('strataMass'+i%4,M(xx,yy,-6.3,10.7,19.0,11.2),'#4d7472',0,37);
   A('strataMass'+(i+2)%4,M(side*19.3,yy+1.7,-17.4,14.1,19.5,14.0),'#5b807b',0,37);
   // Two distinct fracture ledges across each tall section make geological layers.
   for(let k=0;k<2;k++)A('strataMass'+(i+k)%4,M(xx,yy-6.5+k*8.8,-1.5,10.1,1.2,2.4),'#607e73',0,37);
   Art.vine(side*(9.18+hash(i)*.6),yy+6.8,-1.6,4.3+hash(i+7)*2.4);
   if(i%2===0)Art.broadPlant(side*10.0,yy+3.7,-3.3,.85,1);
  }
  for(let i=0;i<4;i++)A('strataMass'+i,M(0,i*23-2,-22,27,26,12),'#537d7d',0,38);
  Art.waterfall(0,-2,-9.1,76,6.6);
  A('ravineShelf0',M(0,0,-.08,30,4.5,6.0),'#6e8776',0,38);
  for(const [i,p]of s.platforms.entries())ravineShelf(p,i);
  // Sparse eroded buttresses behind, never attached across the playable X lane.
  for(const [i,y]of [12,30,47].entries())for(const side of [-1,1]){
   A('strataMass'+i,M(side*8.7,y+3.2,-10,5.3,7.0,4.2,side*.32),'#617f76',0,38);
   Art.fern(side*8.7,y+6.5,-8.9,.68);
  }
  Art.temple(0,57.0,-20.5,1.57);for(const x of [-10.5,10.5])Art.palm(x,55,-12,.75);
 }
 function pine(x,y,z,h,shape=0){
  y=-.13;
  A('stone',M(x,-.13,z,1.6,.32,1.4),'#ccdce0',0,39);
  for(const side of [-1,1])beam([x,y+.20,z],[x+side*.44,-.04,z+.23],.07,'#566055');
  // Four deliberate crown shapes: full, lee-biased, broken-top, snow-loaded.
  A('firTrunk',M(x,y,z,h,h,h,shape===1?.045:shape===3?-.03:0),'#43514b',0,24);
  A('firCrown'+shape,M(x,y+h*.13,z,h*.48,h*(shape===2?.69:.87),h*.48),'#345448',0,44);
  const near=z>-16,n=near?32:21,lean=shape===1?.7:shape===3?-.45:0;
  for(let i=0;i<n;i++){
   const f=i/(n-1),yy=h*(.16+f*.80)+h*.012*Math.sin(i*4.2),ang=i*2.399+shape*.9;
   if(shape===2&&((i>n-4)||i%8===3))continue;
   let len=h*(.32*Math.pow(1-f,.73)+.018)*(1+.17*Math.sin(i*1.7+shape));
   if(shape===1)len*=.78+.38*(.5+.5*Math.cos(ang));
   const xx=x+lean*f*f,zz=z+.06*Math.sin(i*.8),r=(i+shape)%3;
   A('firBough'+r,M(xx,y+yy,zz,len,len*.88,len,shape===3?-.06:0,-ang),'#34594e',0,40,.034);
   // Not every branch carries snow; the mantle is fitted, not an independent ball.
   if(i%5!==shape%5)A('firSnow'+r,M(xx,y+yy,zz,len,len*.88,len,shape===3?-.06:0,-ang),'#c2d8db',0,43,.034);
  }
  if(shape===2)beam([x+lean*.45,y+h*.56,z],[x+.8,y+h*.61,z+.28],.055,'#676854');
 }
 function snowFloor(s){
  for(const [a,b,y]of s.floors){if(y<-8)continue;const n=Math.ceil((b-a)/9),w=(b-a)/n;
   for(let i=0;i<n;i++){const x=a+(i+.5)*w,v=i%4;
    A('iceShelf'+v,M(x,y,-.10,w,4.7,5.91),'#7598a8',0,37);
    A('snowPack'+v,M(x,y,-.10,w,1.0,5.91),'#dae7e7',0,39);
    if(i%3!==1)for(let j=0;j<3;j++){const xx=x+(j-1)*w*.19,Amp=.36+hash(xx)*.68;A('cone',M(xx,y-.23-Amp*.4,2.92,.085,Amp,.11,PI),'#a6cdd7',0,39);}
    // Drifts connect into the back edge, not an equal-frequency row at the front.
    A('snowPack'+(v+2)%4,M(x,y+.01,-3.77,w*1.0,1.9,3.1),'#c6dfe1',0,39);
   }
  }
  for(const [i,p]of s.platforms.entries()){
   const x=(p.a+p.b)/2,w=p.b-p.a,v=i%4;
   A('iceShelf'+v,M(x,p.y,-1.60,w,1.04,3.40),'#779caa',0,37);
   A('snowPack'+v,M(x,p.y,-1.60,w,.75,3.40),'#dde9e9',0,39);
   // A snow / rock buttress attaches the shelf to rear terrain, outside z=0.
   A('strataMass'+v,M(x,p.y-1.1,-4.0,w*.62,2.3,2.5),'#7a99a5',0,42);
  }
 }
 function snowBunker(x,z,variant){
  Environment.add('snowShelter',{x,y:2.84,z,w:8.6,d:4.6});
  // Recessed firing slit: dark back, thick lintel, side reveals and sill.
  plate(x,1.32,z,7.9,2.64,3.9,'#617b83');plate(x,1.47,z+2.03,6.75,1.25,.23,'#243d4b');
  plate(x,2.18,z+2.34,7.80,.53,.89,'#8ca2a4');plate(x,.91,z+2.36,7.75,.60,.88,'#839ba0');
  for(const side of [-1,1]){plate(x+side*3.45,1.55,z+2.30,.80,1.35,.89,'#839ba0');flangeJoint(x+side*3.25,.67,z+2.80,.40);}
  for(const xx of [-1.07,1.07])plate(x+xx,1.56,z+2.01,.13,.90,.51,'#708990');
  A('snowPack'+variant%4,M(x,2.78,z,8.6,1.78,4.60),'#d4e6e7',0,39);
  A('snowPack'+(variant+1)%4,M(x,.06,z+2.45,8.3,1.7,1.85),'#c8dfe1',0,39);
  H.light(x,2.03,z+2.82,1.15,'#e4b988',.67);R.light(x,1.68,z+3.15,'#c7a17a',3,3.5,1,false);
  cabinet(x+4.58,0,z+1.68,.98,1.63,variant,'#677d7e');
  H.pipeRun([[x-3.4,.15,z+.7],[x-3.4,2.02,z+.7],[x-2.7,2.02,z+.7]],.09,'#617a80');
  for(const side of [-1,1])A('cone',M(x+side*2.68,2.44,z+2.22,.11,.52,.12,PI),'#bad9df',0,39);
 }
 function snow(s){
  snowFloor(s);
  // Continuous background substrate supports both tree rows. It stops behind the
  // combat strip and cannot fill a playable pit or change collision.
  for(let x=-40,i=0;x<s.length+40;x+=20,i++){
   B(x+10,-1.02,-20.6,20,2.0,34.8,'#c0d4db',0,0,0,39);
   A('snowPack'+i%4,M(x+10,-.02,-35.3,20,.90,5.3),'#b6ced6',0,39);
  }
  for(let x=-31,i=0;x<s.length+35;x+=27,i++)A('alpineRidge'+i%3,M(x,11+hash(i)*5,-49-hash(i+2)*12,34+hash(i+3)*12,29+hash(i+5)*12,26,0,.07*Math.sin(i)),'#859eac',0,42);
  for(let x=-23,i=0;x<s.length+24;x+=12.9,i++){
   pine(x+.75*Math.sin(i*2.3),0,-10.3-hash(i)*4.0,7.8+hash(i+9)*3.1,i%4);
   if(i%2===0)pine(x+5.2,-.2,-23-hash(i+1)*5,11.5+hash(i+2)*2.0,(i+1)%4);
  }
  for(let x=18,i=0;x<s.length;x+=42,i++)snowBunker(x,-7.4,i);
  for(let x=31;x<s.length-18;x+=49){for(let i=0;i<4;i++){const xx=x+i*.95;beam([xx,0,-3.15],[xx,.86,-3.15],.10,'#607983');beam([xx,.63,-3.15],[xx+.95,.63,-3.15],.04,'#8a9fa6');}Art.crate(x+5.1,0,-3.05,.82);}
 }
 function projector(x,y,z,seed){
  // Off-axis, mounted security projector. Dim apertures, NO giant neon ring.
  plate(x,y,z,2.54,3.0,.75,'#444b61');plate(x,y,z+.42,2.12,2.50,.14,'#202c42');
  A('reactorBezel',F(x,y+.12,z+.62,1.78,.36,1.78),'#9594a8',0,35);
  A('alloyTube',F(x,y+.12,z+.69,1.38,.11,1.38),'#213447',0,36);
  A('reactorBezel',F(x,y+.12,z+.80,.89,.16,.89),'#726e91',0,35);
  S(x,y+.12,z+.87,.54,.54,.20,'#6962a1',.20,36);
  for(let i=0;i<3;i++){let a=i*TAU/3+.7;plate(x+Math.cos(a)*.69,y+.12+Math.sin(a)*.69,z+.95,.25,.09,.05,'#b0a2d1');}
  for(const side of [-1,1]){plate(x+side*.98,y,z+.50,.15,2.05,.21,'#7b8498');H.bolt(x+side*.98,y-.83,z+.65,.12);H.bolt(x+side*.98,y+.83,z+.65,.12);}
  H.grill(x,y-1.04,z+.58,1.34,.33);H.light(x,y+1.19,z+.52,.54,'#a090bc',.42);
  Environment.add('rc8Projector',{x,y:y+.12,z:z+.90,seed,r:.68});
 }
 function depth(s,room=0){
  const lab=s.index===3,variant=room%4,metal=lab?'#444a61':'#405a68',trim=lab?'#7f849e':'#849ba2',glow=lab?'#a99ec2':'#a4c6c8';
  plate(0,-.34,-8,17,.68,44,lab?'#303749':'#344b55');
  // Central lane deliberately quiet. Lane seams stay subordinate to real targets.
  for(let z=6;z>-31;z-=3.0){B(0,.014,z,15,.026,.026,'#607782',0,0,0,36);for(const x of [-5.1,0,5.1])B(x,.014,z,.026,.026,3.0,'#5a707a',0,0,0,36);}
  for(const side of [-1,1]){
   plate(side*8.45,4.25,-10,1.30,9.10,42,metal);
   for(let z=4,i=0;z>-30;z-=6.0,i++){
    if(lab){plate(side*7.83,2.54,z,.42,5.08,.88,trim);beam([side*7.83,4.87,z],[side*6.82,7.17,z],.44,trim,.78);beam([side*6.82,7.17,z],[side*5.0,8.61,z],.38,trim,.78);}else plate(side*7.75,4.25,z,.41,8.5,.74,trim);plate(side*7.53,.25,z,.77,.50,1.18,trim);
    // Deep bays between the ribs; side-facing vent louvers read in perspective.
    plate(side*7.61,3.4,z-2.42,.19,4.95,4.25,lab?'#1b2239':'#1c303c');
    for(const yy of [1.02,5.84])plate(side*7.32,yy,z-2.44,.45,.16,4.7,trim);
    for(let j=0;j<4;j++)plate(side*7.37,1.5+j*.41,z-2.42,.30,.067,3.57,'#526478');
    if(lab){
     if((i*3+room+(side>0?1:0))%4<2)projector(side*6.48,4.37,z-1.50,(i+room*.17)*.37);
     else{cabinet(side*6.72,.30,z-1.18,1.53,4.2,i,'#414b63');plate(side*7.27,4.15,z-2.6,.15,1.90,2.90,'#33465d');}
     H.pipeRun([[side*7.02,.4,z-1],[side*7.02,2.57,z-1],[side*6.37,2.57,z-1]],.10,'#746d8b');
    }else{
     if((i+variant+(side>0?Math.floor(room/3):0))%3!==2){vent(side*6.67,4.55,z-1.43,1.72);plate(side*6.67,6.0,z-1.80,1.85,.49,1.05,'#66818b');}
     else{plate(side*6.66,4.45,z-1.48,1.86,2.73,.45,'#3d5865');H.grill(side*6.66,4.45,z-1.15,1.57,2.32,true);}
     cabinet(side*6.62,.16,z-1.37,1.62,2.58,i+variant,'#53717b');
     H.pipeRun([[side*7.08,.24,z-1.9],[side*7.08,6.88,z-1.9],[side*6.48,6.88,z-1.9]],.105,'#859797');
    }
    // Integrated cable tray under equipment, mounted along the wall, not floating.
    plate(side*7.18,.42,z-2.25,.62,.36,5.87,lab?'#4c526c':'#516c76');
    H.light(side*6.55,6.72,z-1.30,.74,glow,.50);
   }
   H.pipeRun([[side*7.10,7.44,6],[side*7.10,7.44,-28]],lab?.14:.18,lab?'#7c7d95':'#91a5a5');
   B(side*5.73,.023,-8,.032,.027,38,lab?'#696783':'#758991',0,0,0,36);
  }
  for(let z=2,i=0;z>-30;z-=6.0,i++){
   plate(0,8.65,z,16.2,.46,.85,trim);for(const side of [-1,1])beam([side*7.62,7.00,z],[side*5.68,8.5,z],.23,metal);
   plate(0,8.35,z,6.10,.18,1.55,lab?'#343a52':'#3b5361');H.light(0,8.21,z+.80,lab?2.35:2.95,glow,.82);
   R.light(0,7.10,z,glow,lab?4.8:5.8,7.0,1,false);
   if(!lab)for(const x of [-2.82,2.82])plate(x,7.78,z,.25,.60,1.72,'#526e7b');
  }
  // Functional destination frame. The game, not this art, owns the two moving doors.
  for(const side of [-1,1]){plate(side*7.31,4.0,-15.33,.64,8.25,1.28,trim);H.grill(side*7.25,3.38,-14.62,.46,3.48);}
  plate(0,8.08,-15.3,15,.60,1.3,trim);plate(0,.026,-15.0,14.05,.050,1.16,metal);
 }
 function drawFan(e,t){for(let i=0;i<7;i++){const a=t*e.speed+e.seed*TAU+i*TAU/7;A('fanVane',M(e.x,e.y,e.z,e.r*1.65,e.r*1.65,e.r,a),'#73878c',0,35);}}
 function drawProjector(e,t){let a=t*.34+e.seed*TAU;for(let i=0;i<3;i++){let q=a+i*TAU/3;B(e.x+Math.cos(q)*.46,e.y+Math.sin(q)*.46,e.z+.038,.16,.050,.033,'#9d8eba',q+PI/2,0,0,22,.45);}}
 function jungleBunker(x,y,z,w){
  plate(x,y+1.40,z,w,2.8,3.6,'#668574');plate(x,y+1.49,z+1.91,w*.84,1.16,.20,'#263f3e');
  plate(x,y+2.39,z+1.85,w+.08,.70,.99,'#829a7a');plate(x,y+.87,z+1.95,w*.98,.42,.88,'#9ead82');
  for(const side of [-1,1]){plate(x+side*w*.45,y+1.52,z+1.94,w*.12,1.20,.80,'#789278');plate(x+side*w*.43,y+.33,z+1.93,w*.17,.66,.84,'#6b8677');}
  for(const dx of [-.22,0,.22])plate(x+dx*w,y+1.50,z+1.91,.14,.96,.42,'#718770');
  plate(x,y+3.04,z,w+.5,.36,4.15,'#9bad85');
  for(const side of [-1,1]){plate(x+side*w*.35,y+2.72,z+1.4,.37,.40,1.13,'#85957c');H.bolt(x+side*w*.35,y+2.72,z+2.03,.10);}
  for(let i=0;i<4;i++){Art.broadPlant(x+(i-1.5)*w*.23,y+3.23,z,.58,1);if(i%2===0)Art.vine(x+(i-1.5)*w*.23,y+3.23,z+2.2,1.26);}
 }
 return{hangar,ravine,snow,depth,pine,vent,servicePlatform,jungleBunker,drawFan,drawCrane,drawProjector,
  materialIDs:Object.freeze({strata:37,wetRock:38,snow:39,fir:40,canopy:41,alpine:42,branchSnow:43,firCore:44}),
  contracts:Object.freeze({shelfTop:0,snowTop:0,decorCombatClearZ:-2.0,roomVariants:4})};
})();
