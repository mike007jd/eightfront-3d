/* Original NES campaign order. Layouts, timings and assets are newly authored for this fan game,
   not extracted NES maps, ROM data or commercial assets. */
const STAGE_META=[
 {name:'JUNGLE',mode:'side',subtitle:'Break the wall. Find the entrance.',boss:'SUPER WALL',length:286,theme:{fog:[.23,.43,.44],fogDensity:.018,skyLow:[.47,.68,.67],skyHigh:[.04,.21,.49],lightDir:[-.45,.92,.62],key:[1.38,1.26,.95],hemiLow:[.10,.18,.18],hemiHigh:[.42,.58,.62],rim:[.48,.55,.34]},accent:'#bce58b'},
 {name:'BASE 1',mode:'depth',subtitle:'Destroy the sensors. Advance through the barrier.',boss:'OCULAR DEFENSE',rooms:5,theme:{fog:[.035,.10,.15],fogDensity:.010,skyLow:[.027,.05,.065],skyHigh:[.008,.025,.045],indoor:1,lightDir:[-.25,.85,.42],key:[.75,1.15,1.30],hemiLow:[.04,.08,.10],hemiHigh:[.18,.33,.42],rim:[.18,.58,.68]},accent:'#77e8ef'},
 {name:'WATERFALL',mode:'vertical',subtitle:'Climb the ravine. Watch for falling boulders.',boss:'WATERFALL GUARDIAN',length:60,theme:{fog:[.27,.48,.52],fogDensity:.020,skyLow:[.49,.76,.79],skyHigh:[.055,.26,.48],lightDir:[-.55,.95,.40],key:[1.25,1.35,1.18],hemiLow:[.10,.22,.22],hemiHigh:[.42,.68,.72],rim:[.38,.70,.68]},accent:'#89e4ed'},
 {name:'BASE 2',mode:'depth',subtitle:'Breach the security grid. Split the illusion.',boss:'ILLUSION CORE',rooms:8,theme:{fog:[.075,.055,.13],fogDensity:.009,skyLow:[.06,.035,.10],skyHigh:[.018,.018,.045],indoor:1,lightDir:[.35,.75,.25],key:[1.05,.86,1.42],hemiLow:[.07,.04,.12],hemiHigh:[.32,.25,.50],rim:[.72,.48,1.0]},accent:'#baadff'},
 {name:'SNOW FIELD',mode:'side',subtitle:'Cross the frozen front. Bring down the carrier.',boss:'ARMORED UFO',length:210,theme:{fog:[.43,.60,.74],fogDensity:.014,skyLow:[.67,.80,.86],skyHigh:[.12,.23,.41],lightDir:[-.52,.96,.22],key:[1.35,1.28,1.18],hemiLow:[.18,.26,.33],hemiHigh:[.66,.78,.88],rim:[.70,.90,1.0]},accent:'#d7efff'},
 {name:'ENERGY ZONE',mode:'side',subtitle:'Read the flame cycle. Shut down the reactor.',boss:'GIANT SOLDIER',length:190,theme:{fog:[.12,.075,.09],fogDensity:.012,skyLow:[.22,.10,.10],skyHigh:[.028,.025,.045],indoor:.85,lightDir:[-.38,.78,.58],key:[1.48,.78,.42],hemiLow:[.10,.055,.07],hemiHigh:[.40,.24,.20],rim:[1.0,.42,.20]},accent:'#ffbd78'},
 {name:'HANGAR',mode:'side',subtitle:'Dodge the presses. Break the armored gate.',boss:'ARMORED GATE',length:208,theme:{fog:[.10,.16,.19],fogDensity:.010,skyLow:[.16,.25,.29],skyHigh:[.035,.075,.105],indoor:1,lightDir:[-.20,.82,.46],key:[.92,1.16,1.22],hemiLow:[.05,.10,.12],hemiHigh:[.30,.46,.52],rim:[.42,.80,.90]},accent:'#a7dce1'},
 {name:"ALIEN'S LAIR",mode:'side',subtitle:'Destroy the brood. Finish the heart.',boss:'ALIEN HEART',length:184,theme:{fog:[.12,.055,.13],fogDensity:.013,skyLow:[.20,.065,.16],skyHigh:[.035,.012,.045],indoor:1,lightDir:[.28,.72,.42],key:[1.15,.48,.78],hemiLow:[.06,.025,.08],hemiHigh:[.34,.16,.30],rim:[1.0,.34,.62]},accent:'#f7a1cb'}
];

// RC6/RC7 grade values operate in linear HDR before the single display transform.
const STAGE_LOOKS=[
 {exposure:1.02,wetness:.35,bloom:.19,shadows:[.94,1.,1.06],highlights:[1.04,1.01,.95]},
 {exposure:1.07,wetness:0,bloom:.21,shadows:[.92,.98,1.07],highlights:[1.02,1.01,.98]},
 {exposure:.98,wetness:.75,bloom:.17,shadows:[.93,1.02,1.07],highlights:[1.03,1.02,.98]},
 {exposure:1.04,wetness:0,bloom:.20,shadows:[.97,.96,1.07],highlights:[1.03,1.,.99]},
 {exposure:.87,wetness:.10,bloom:.14,shadows:[.94,1.,1.07],highlights:[1.02,1.01,.96]},
 {exposure:1.08,wetness:0,bloom:.22,shadows:[.91,.99,1.10],highlights:[1.05,1.,.94]},
 {exposure:1.04,wetness:0,bloom:.20,shadows:[.91,.99,1.07],highlights:[1.04,1.01,.95]},
 {exposure:1.08,wetness:.1,bloom:.18,shadows:[.98,.94,1.06],highlights:[1.04,1.,.98]}
];
STAGE_META.forEach((s,i)=>s.theme.look=STAGE_LOOKS[i]);
// A cooler work light separates steel from the warm reactor/pipe practicals.
Object.assign(STAGE_META[5].theme,{key:[.97,1.05,1.18],hemiLow:[.065,.085,.115],hemiHigh:[.25,.32,.40],rim:[.62,.75,.86]});
// RC7 neutral key preserves ivory bone / oxblood flesh separation; magenta stays local.
Object.assign(STAGE_META[7].theme,{key:[.90,.77,.83],hemiLow:[.055,.032,.060],hemiHigh:[.30,.23,.28],rim:[.60,.34,.43],fog:[.070,.030,.065]});

// RC5: explicit encounters, not a procedurally repeated "three sensors" room.
// [x, y, hp, radius, armor]. Turrets are optional; the sensor(s) alone open the exit.
const BASE_ROOMS = {
  1: [
    { sensors:[[0,1.5,6]], turrets:[], patrol:3.5, carrier:'M' },
    { sensors:[[-4,1.5,7]], turrets:[[4,1.5]], patrol:3.5, carrier:'M' },
    { sensors:[[0,.6,7]], turrets:[[-4,1.5],[4,1.5]], patrol:4.0, grenadiers:true },
    { sensors:[[0,1.5,8]], turrets:[[0,3.8]], patrol:4.2, rollers:[-4,0,4], carrier:'M' },
    { sensors:[[0,1.6,16,1.0]], turrets:[[-4,1.5],[4,1.5],[0,4.2]], patrol:3.6, grenadiers:true, carrier:'F' }
  ],
  3: [
    { sensors:[[0,1.5,7,.62,3]], turrets:[[-4,1.5],[4,1.5]], patrol:4.0 },
    { sensors:[[-4.8,.6,5],[-1.6,.6,5],[1.6,.6,5],[4.8,.6,5]], turrets:[], patrol:3.8, carrier:'F' },
    { sensors:[[-3,1.5,6,.62,3],[3,1.5,6,.62,3]], turrets:[[0,3.8]], patrol:4.0, carrier:'L' },
    { sensors:[[-3,.6,6],[3,.6,6]], turrets:[[0,3.2]], patrol:3.8, grenadiers:true },
    { sensors:[[-4,1.5,6,.62,3],[4,1.5,6,.62,3]], turrets:[[0,1.5]], patrol:3.6 },
    { sensors:[[0,1.5,8,.62,3]], turrets:[], rollers:[-4,0,4], patrol:4, carrier:'S' },
    { sensors:[[0,3.2,6]], turrets:[[0,1.5]], patrol:4.0, carrier:'F' },
    { sensors:[[0,1.6,18,1,4]], turrets:[[-4,1.5],[4,1.5],[0,4.2]], patrol:3.8, grenadiers:true, carrier:'M' }
  ]
};

const WEAPONS={
 R:{name:'RIFLE',interval:.135,speed:36,damage:1,life:1.0,color:'#ffe4a0'},
 M:{name:'MACHINE GUN',interval:.076,speed:45,damage:1,life:1.0,color:'#fff5c9'},
 S:{name:'SPREAD SHOT',interval:.18,speed:32,damage:.85,life:1.0,color:'#ffe079'},
 L:{name:'LASER',interval:.23,speed:70,damage:3.2,life:.60,color:'#81f0f0'},
 F:{name:'FLAME',interval:.055,speed:13,damage:.8,life:.48,color:'#ffae65'}
};
function makeStage(index){
 const meta=STAGE_META[index];if(!meta)throw new RangeError('Unknown campaign stage');
 const s={...meta,index,floors:[],platforms:[],events:[],capsules:[],hazards:[],bridges:[],checkpoints:[],spawn:{x:6,y:0,z:0},bossPoint:{x:meta.length||0,y:0,z:0}};
 const plat=(a,b,y,style='metal',extra={})=>s.platforms.push({a,b,y,style,...extra});
 const enemy=(trigger,type,x,y=0,extra={})=>s.events.push({trigger,type,x,y,z:0,done:false,...extra});
 const pickup=(x,type,y=1.8)=>s.capsules.push({x,y,z:0,type,hp:1});
 if(index===0){
  s.floors=[[-30,55,0],[55,94,-3.4],[94,160,0],[160,167,-11],[167,238,0],[238,244,-1.8],[244,310,0]];
  for(const [a,b,y,style] of [[24,34,2.7,'rock'],[41,48,4.1,'metal'],[88,95,-1.6,'rock'],[102,113,2.6,'bamboo'],[118,136,4,'bamboo'],[149,161,2.6,'rock'],[164,178,3.4,'metal'],[183,191,2.8,'bamboo'],[211,221,3.2,'metal'],[232,248,2.9,'metal'],[257,264,2.5,'rock']])plat(a,b,y,style);
  s.bridges=Array.from({length:26},(_,i)=>({a:55+i*1.5,b:56.51+i*1.5,y:0,fallAt:Infinity}));
  for(const a of [[5,'runner',19,0],[10,'runner',27,0],[19,'turret',34,0],[25,'rifle',42,0],[29,'runner',46,0],[32,'turret',45,4.1],[42,'runner',59,0],[48,'rifle',66,0],[51,'runner',69,0],[56,'runner',73,0],[64,'turret',83,-3.4],[73,'runner',94,0],[80,'rifle',100,0],[88,'turret',108,2.6],[95,'runner',114,0],[99,'drone',117,4.5],[107,'rifle',127,4],[112,'runner',131,0],[118,'drone',138,5],[124,'turret',144,0],[134,'runner',151,0],[139,'rifle',156,2.6],[145,'drone',163,5.3],[156,'rifle',173,3.4],[163,'runner',181,0],[169,'turret',186,2.8],[172,'runner',192,0],[179,'heavy',198,0],[184,'runner',203,0],[188,'drone',208,5],[194,'rifle',216,3.2],[200,'turret',220,0],[207,'runner',226,0],[211,'heavy',231,0],[217,'drone',237,5.2],[222,'rifle',241,2.9],[225,'runner',246,0],[230,'turret',253,0],[235,'runner',255,0],[240,'heavy',260,0],[247,'drone',269,4.5]])enemy(...a);
  for(const a of [[14,'M',1.75],[49,'S',3.1],[100,'M',2],[134,'L',5.9],[179,'S',2.2],[218,'F',5.1],[255,'S',3.8]])pickup(...a);
  s.checkpoints=[{x:96,y:0},{x:168,y:0},{x:244,y:0}];s.bossPoint={x:286,y:0,z:0};
 }else if(meta.mode==='depth'){
  s.floors=[[-9,9,0]];s.spawn={x:0,y:0,z:0};s.length=meta.rooms;s.roomPlans=BASE_ROOMS[index];s.bossPoint={x:0,y:0,z:-15};
 }else if(index===2){
  s.spawn={x:-5,y:0,z:0};s.floors=[[-15,15,0]];
  for(let i=1;i<=24;i++){
   const y=i*2.25,c=(i%4===1||i%4===2)?3.2:-3.2;
   plat(c-3.7,c+3.7,y,'rock');
   if(i%3===0)enemy(Math.max(0,y-7),'rifle',c+(i%2?2.7:-2.7),y,{vertical:true});
   if(i%5===0)enemy(y-6,'drone',-c,y+2,{vertical:true});
   if(i%4===0)pickup(c,['M','S','L','S','F','M'][i/4-1],y+1.25);
   if(i===7||i===14||i===21)s.checkpoints.push({x:c,y});
   if(i%5===2)s.hazards.push({type:'boulder',x:(i%2?4:-4),y:y+5,period:4.3,phase:i*.7});
  }
  plat(-13,13,54,'rock');s.bossPoint={x:0,y:59,z:-.4};
 }else{
  const L=meta.length;
  if(index===4){s.floors=[[-30,48,0],[48,54,-10],[54,110,0],[110,116,-10],[116,158,0],[158,164,-2],[164,L+24,0]];
   for(const a of [[24,34,2.1],[45,56,2.6],[78,88,3.2],[107,118,2.3],[142,154,2.6],[171,185,3]])plat(...a,'ice');
   for(const x of [37,68,95,129,147,178])s.hazards.push({type:'mine',x,y:0,armed:false,timer:0,dead:false});
   enemy(77,'tank',99,0);enemy(148,'tank',170,0);
  }else if(index===5){s.floors=[[-30,64,0],[64,72,-10],[72,124,0],[124,131,-10],[131,L+24,0]];
   for(const a of [[21,32,2.7],[46,56,2.9],[60,75,2.4],[91,105,3.1],[120,134,2.5],[147,161,3]])plat(...a,'metal');
   for(const [i,x]of [35,52,81,109,140,164].entries())s.hazards.push({type:'flame',x,y:0,period:3.8,phase:i*.77,height:4.4});
  }else if(index===6){s.floors=[[-30,56,0],[56,65,-10],[65,114,0],[114,123,-10],[123,167,0],[167,175,-10],[175,L+24,0]];
   for(const a of [[26,38,2.4],[74,89,3],[132,145,2.8],[180,190,2.6]])plat(...a,'metal');
   for(const [i,x]of [60,118,171].entries())plat(x-5.2,x+5.2,1.2,'moving',{move:{axis:'y',amp:.9,speed:1.2,phase:i}});
   for(const [i,x]of [45,93,153,187].entries())s.hazards.push({type:'crusher',x,y:0,period:4.1,phase:i*.83,height:6});
   enemy(72,'cart',94);enemy(140,'cart',162);
  }else if(index===7){s.floors=[[-30,55,0],[55,61,-10],[61,105,0],[105,112,-10],[112,L+24,0]];
   for(const a of [[22,34,2.5],[50,64,2.5],[80,93,3],[101,115,2.2],[134,145,2.8]])plat(...a,'organic');
   for(const x of [30,72,125,151])enemy(x-17,'pod',x,0);
   enemy(68,'alienHead',93,0);s.hazards.push({type:'acid',x:128,y:0,width:4.5,period:4.2,phase:0});
  }
  let types=index===7?['crawler','alien','pod','crawler']:['runner','rifle','turret','drone','heavy'];
  for(let i=0,x=20;x<L-22;x+=9+(i%3)*3,i++){
   if(s.floors.find(f=>x>=f[0]&&x<=f[1])?.[2]<-5)continue;
   const type=types[i%types.length];enemy(x-15,type,x,type==='drone'?4.2:0);
  }
  for(const [i,p]of s.platforms.entries())if(i%2===0)enemy(p.a-15,index===7?'crawler':'rifle',p.a+2,p.y);
  for(const [i,x]of [14,43,79,117,154,L-27].entries())pickup(x,['M','S','L','M','F','S'][i],1.7);
  for(const x of [Math.round(L*.37),Math.round(L*.70)]){const f=s.floors.find(f=>x>=f[0]&&x<=f[1]);if(f&&f[2]>=0)s.checkpoints.push({x,y:f[2]});}
  s.bossPoint={x:L,y:0,z:0};
 }
 return s;
}
