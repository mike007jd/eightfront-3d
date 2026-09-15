const Art=(()=>{
 let seed=712931;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};const range=(a,b)=>a+(b-a)*rand();
 const B=R.box,S=R.ball,A=R.add,M=R.matrix,L=R.beam;
 const floor=[[-30,55,0],[55,94,-3.4],[94,160,0],[160,167,-11],[167,238,0],[238,244,-1.8],[244,310,0]];
 const platforms=[{a:24,b:34,y:2.7,style:'rock'},{a:41,b:48,y:4.1,style:'metal'},{a:88,b:95,y:-1.6,style:'rock'},{a:102,b:113,y:2.6,style:'bamboo'},{a:118,b:136,y:4,style:'bamboo'},{a:149,b:161,y:2.6,style:'rock'},{a:164,b:178,y:3.4,style:'metal'},{a:183,b:191,y:2.8,style:'bamboo'},{a:211,b:221,y:3.2,style:'metal'},{a:232,b:248,y:2.9,style:'metal'},{a:257,b:264,y:2.5,style:'rock'}];
 const bridges=Array.from({length:26},(_,i)=>({x:55+i*1.5,a:55+i*1.5,b:56.51+i*1.5,y:0,fallAt:Infinity}));
 const encounterScore=[
  [5,'runner',19,0],[10,'runner',27,0],[19,'turret',34,0],[25,'rifle',42,0],[29,'runner',46,0],[32,'turret',45,4.1],
  [42,'runner',59,0],[48,'rifle',66,0],[51,'runner',69,0],[56,'runner',73,0],[64,'turret',83,-3.4],[73,'runner',94,0],
  [80,'rifle',100,0],[88,'turret',108,2.6],[95,'runner',114,0],[99,'drone',117,4.5],[107,'rifle',127,4],[112,'runner',131,0],[118,'drone',138,5],[124,'turret',144,0],
  [134,'runner',151,0],[139,'rifle',156,2.6],[145,'drone',163,5.3],[156,'rifle',173,3.4],[163,'runner',181,0],[169,'turret',186,2.8],[172,'runner',192,0],
  [179,'heavy',198,0],[184,'runner',203,0],[188,'drone',208,5],[194,'rifle',216,3.2],[200,'turret',220,0],[207,'runner',226,0],
  [211,'heavy',231,0],[217,'drone',237,5.2],[222,'rifle',241,2.9],[225,'runner',246,0],[230,'turret',253,0],[235,'runner',255,0],[240,'heavy',260,0],[247,'drone',269,4.5]
 ];
 const capsules=[{x:14,y:2.1,type:'M'},{x:49,y:3.1,type:'S'},{x:100,y:2.0,type:'M'},{x:134,y:5.9,type:'L'},{x:179,y:2.2,type:'S'},{x:218,y:5.1,type:'F'},{x:255,y:3.8,type:'S'}];
 function terrainY(x){for(const [a,b,y]of floor)if(x>=a&&x<=b)return y;return-15;}
 function surfaces(x,t=0){let out=[terrainY(x)];for(const p of platforms)if(x>=p.a-.15&&x<=p.b+.15)out.push(p.y);for(const p of bridges)if(x>=p.a-.08&&x<=p.b+.08&&t<p.fallAt+.8)out.push(p.y);return out;}
 function topAt(x,t=0){return Math.max(...surfaces(x,t));}
 function reset(){bridges.forEach(b=>b.fallAt=Infinity);}
 function stone(x,y,z,s,col='#72857c',h=null,d=null){A('stone',M(x,y,z,s,h??s*range(.65,.95),d??s*range(.65,1.0),range(-.13,.13),range(0,6.28)),col,0,3);}
 function broadPlant(x,y,z,s=1,variant=0){
  const hues=variant===2?['#3b6559','#386953','#467a56']:variant===1?['#4f8739','#7ba742','#438848']:['#397d4c','#659b3e','#408744'];
  const n=6+variant;
  for(let j=0;j<n;j++){const a=j/n*Math.PI*2+range(-.15,.15),sz=range(.80,1.45)*s;A(variant===0&&j%3===0?'palm':'leaf',M(x,y+.04,z,sz,sz,sz,range(.3,.92),a,range(-.14,.14)),hues[j%3],0,1,.04*s);}
 }
 function fern(x,y,z,s=1){broadPlant(x,y,z,s,0);}
 function palm(x,y,z,s=1){
  const bend=range(-.65,.65)*s,segments=7;let prev=[x,y,z];
  for(let i=0;i<segments;i++){
   const p=[x+bend*((i+1)/segments)**1.45,y+(i+1)*.94*s,z+Math.sin(i*.5)*.11*s];
   L(prev,p,(.22-i*.015)*s,i%2?'#89724a':'#766441',3);
   A('cyl',M(p[0],p[1]-.035*s,p[2],(.45-i*.029)*s,.074*s,(.45-i*.029)*s),'#a08c57',0,3);prev=p;
  }
  S(prev[0],prev[1]-.05,prev[2],.68*s,.48*s,.65*s,'#567949');
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2+range(-.13,.13),sz=range(3.1,4.8)*s;A('palm',M(prev[0],prev[1]+range(-.07,.12),prev[2],sz,sz,sz,range(-.04,.28),a),['#427a47','#609741','#739e3c','#568b45'][j%4],0,1,.10*s);}
  for(let j=0;j<3;j++)S(prev[0]+range(-.23,.23)*s,prev[1]-.24*s,prev[2]+range(-.22,.22)*s,.34*s,.42*s,.34*s,'#745b35');
 }
 function banana(x,y,z,s=1){
  for(let j=0;j<3;j++){
   const h=range(1.8,3.0)*s,xx=x+(j-1)*.28*s;L([xx,y,z],[xx+.13,y+h,z],.085*s,'#70913c',1);
   for(let k=0;k<4;k++){const l=range(1.9,3.0)*s;A('leaf',M(xx+.13,y+h,z,l,l,l,range(-.1,.38),j*2+k*1.8),['#769b38','#659541','#438347'][k%3],0,1,.08*s);}
  }
 }
 function vine(x,y,z,len=2){
  let prev=[x,y,z];for(let i=1;i<=5;i++){let yy=y-i*len/5,xx=x+Math.sin(i*.65+x)*.12;L(prev,[xx,yy,z+.03*i],.023,'#375e41',1);A('leaf',M(xx,yy,z+.07*i,.40,.4,.4,-.5-(i%2)*1.5,i*.8),'#5b963c',0,1,.025);prev=[xx,yy,z+.03*i];}
 }
 function crate(x,y,z,s=1){
  B(x,y+s*.5,z,s,s,s,'#92744b',0,0,0,3);
  for(let k=0;k<4;k++)B(x+(k-1.5)*s*.22,y+s*.5,z+s*.511,s*.20,s*.87,.045,'#b69659',0,0,0,3);
  for(const k of [-1,1]){B(x+k*s*.42,y+s*.5,z+s*.54,s*.12,s,s*.09,'#675637',0,0,0,3);B(x,y+s*(k>0?.92:.08),z+s*.54,s,s*.13,s*.09,'#c6a66a',0,0,0,3);}
  B(x,y+s*.5,z+s*.61,s*.10,s*1.08,s*.07,'#d0ae6c',-.70,0,0,3);B(x,y+s*.5,z+s*.60,s*.10,s*1.08,s*.07,'#a98b50',.70,0,0,3);
  for(const a of [-1,1])for(const b of [-1,1])S(x+a*s*.39,y+s*(.5+b*.36),z+s*.61,.075*s,.075*s,.035*s,'#445551',0,2);
 }
 function barrel(x,y,z,s=1){
  A('cyl',M(x,y+.60*s,z,.78*s,1.2*s,.78*s),'#ba5840',0,2);
  for(let dy of [.12,.60,1.08])A('ring',M(x,y+dy*s,z,.85*s,1.0*s,.85*s),'#593f33',0,2);
  A('cyl',M(x,y+1.21*s,z,.74*s,.08*s,.74*s),'#d38556',0,2);
  B(x,y+.64*s,z+.405*s,.29*s,.35*s,.025,'#edd7a3',0,0,0,2);B(x,y+.64*s,z+.43*s,.10*s,.17*s,.02,'#b6593f',.1,0,0,2);
 }
 function sandbag(x,y,z){A('limb',M(x,y,z,.48,1.06,.5,Math.PI/2,range(-.09,.09)),'#b8a577',0,3);B(x,y,z+.25,.60,.025,.015,'#806f4f');}
 function temple(x,y,z,s=1){
  for(let i=0;i<3;i++)B(x,y+i*.36*s,z,(8-i*.65)*s,.42*s,(4.6-i*.22)*s,'#719c8c',0,0,0,3);
  B(x,y+3.15*s,z,6.3*s,4.8*s,3.8*s,'#568c80',0,0,0,3);
  B(x,y+2.4*s,z+1.94*s,2.1*s,3.4*s,.06,'#284e51');
  for(const side of [-1,1]){for(let j=0;j<4;j++){B(x+side*2.0*s,y+(1.4+j*.9)*s,z+2.04*s,.85*s,.82*s,.65*s,'#91ad8b',0,0,0,3);B(x+side*2.0*s,y+(1.4+j*.9)*s,z+2.39*s,.38*s,.45*s,.05,'#5f8b72',0,0,0,3);}}
  B(x,y+4.7*s,z+1.8*s,5.8*s,.65*s,.8*s,'#a2b796',0,0,0,3);
  for(let i=0;i<4;i++)B(x,y+(5.4+i*.35)*s,z,(6.6-i*.6)*s,.40*s,4.1*s,'#7e9f7e',0,0,0,3);
  for(let i=-2;i<=2;i++){B(x+i*1.04*s,y+7.0*s,z,.80*s,1.0*s,1.8*s,'#8bae8c',0,0,0,3);broadPlant(x+i*s,y+7.5*s,z,.65*s,1);}
  for(let i=0;i<5;i++)vine(x+(i-2)*1.0*s,y+5.8*s,z+2.24*s,range(1.1,3.0)*s);
 }
 function waterfall(x,base,z,h,w){return WaterEnvironment.waterfall(x,base,z,h,w);}

 function bunker(x,y,z,w=7){BiomeAssets.jungleBunker(x,y,z,w);}
 function tower(x,z){
  for(const side of [-1,1])for(const zz of [z-1.6,z+1.6]){B(x+side*1.5,.16,zz,.78,.32,.75,'#738373',0,0,0,3);B(x+side*.96,8.23,zz,.56,.52,.51,'#9d986f',0,0,0,2);}
  for(const side of [-1,1])for(const zz of [z-1.6,z+1.6])L([x+side*1.5,0,zz],[x+side*.95,8.5,zz],.19,'#897347',3);
  for(let y=0;y<8;y+=2)L([x-1.4,y,z+1.6],[x+1.2,y+2,z+1.6],.105,'#b0955d',3);
  B(x,8.7,z,4.4,.30,4.5,'#b19660',0,0,0,3);B(x,10.4,z-1.5,4.6,.25,4.3,'#659058',0,0,0,3);
  for(const side of [-1,1])L([x+side*1.8,8.8,z-.5],[x+side*1.8,10.5,z-.5],.09,'#ad925d',3);
  B(x,8.45,z+2.31,2.1,2.9,.055,'#a34f3d',0,0,0,3);
  S(x,8.78,z+2.36,.62,.56,.07,'#ecd49b');B(x,8.40,z+2.37,.36,.25,.075,'#ecd49b');
  for(const d of [-1,1])S(x+d*.13,8.78,z+2.42,.16,.14,.02,'#823c33');
 }
 function canopyTree(x,y,z,s=1){
  const bend=range(-.6,.6),h=5.5*s;
  let prev=[x,y,z];
  for(let i=0;i<6;i++){const p=[x+bend*(i/5)**1.4,y+(i+1)*h/6,z+Math.sin(i*.48)*.16];L(prev,p,(.39-i*.037)*s,'#655c3d',3);prev=p;}
  for(let i=0;i<5;i++){const a=i*1.257;L([x+Math.cos(a)*.84*s,y-.06,z+Math.sin(a)*.74*s],[x,y+1.2*s,z],.13*s,'#756740',3);}
  for(let j=0;j<5;j++){
   const a=j*2.40,xx=x+bend+Math.cos(a)*range(1.2,2.4)*s,zz=z+Math.sin(a)*range(.9,2.2)*s,yy=y+h+range(-.65,1.0)*s;
   L([x+bend*.7,y+h*.68,z],[xx,yy-.22*s,zz],.13*s,'#797147',3);
   A('canopyCrown'+j%3,M(xx,yy-.26*s,zz,2.55*s,1.23*s,2.1*s),'#327b45',0,41);
   A('canopyCrown'+(j+1)%3,M(xx+.52*s,yy+.08*s,zz-.32*s,1.65*s,1.07*s,1.65*s),'#4c9146',0,41);
   for(let k=0;k<13;k++){
    const angle=k*.70+j*.55,ls=range(1.2,1.9)*s;
    const leafM=M(xx+Math.cos(angle)*.18,yy+range(-.15,.1)*s,zz,ls,ls,ls,range(-.17,.41),angle);if(k<8)A('leaf',leafM,['#397545','#498645','#619449','#357c49'][k%4],0,1,.045*s);
   }
  }
  for(let j=0;j<2;j++)vine(x+bend+(j-.5)*2*s,y+h-.5*s,z+.4,range(2,3.5)*s);
 }

 function create(){
  seed=712931; // Stage rebuilds must not reshuffle the authored jungle.
  R.record(true);
  B(145,-11,-43,390,10,60,'#4f7e68',0,0,0,3);WaterEnvironment.backland();
  // Distant sculpted peaks are placed in depth, not a backdrop image.
  for(let i=0;i<25;i++){
   const x=-45+i*17,h=range(22,32),z=range(-88,-65);
   A('peak',M(x,h*.5-10,z,range(18,27),h,range(16,26),0,range(-.3,.3)),['#4d9fa4','#599fa4','#6dac9f'][i%3],0,3);
  }
  for(let i=0;i<29;i++){
   const x=-36+i*13,z=range(-45,-28),h=range(10,17);
   stone(x,h*.5-4,z,range(12,20),['#61977c','#709d7d','#4b816c'][i%3],h,range(10,17));
   if(i%2===0)banana(x,h-5,z,range(.7,1.2));
  }
  stone(29,-2.8,-27,13,'#628c82',15.6,11);temple(29,5,-27,.84);stone(130,-1,-33,21,'#638e82',22,14);temple(130,10,-33,1.2);stone(226,-2.4,-32,17,'#60867a',18,12);temple(226,6,-32,1.05);
  waterfall(24,-2,-22,12.8,3.4);waterfall(120,-1.1,-10,15.8,4.7);waterfall(208,-2,-23,15,3.0);
  for(let i=0;i<11;i++){
   const x=111+i*1.8,h=range(9,15);stone(x,h*.5-2,-13.5,4.8,'#6e9182',h,5.0);
   if(i%2===0)broadPlant(x,h-2.3,-12.7,1.6,1);
  }
  // Collision surface stays unchanged; the visual banks get sculpted rockwork and a leafy lip.
  for(const [a,b,y]of floor){if(y<-8)continue;
   for(let x=a;x<b;x+=3){const w=Math.min(3,b-x),xx=x+w*.5;
    B(xx,y-2.7,-.30,w+.04,5.2,5.8,'#3d5550',0,0,0,3);
    B(xx,y-.21,-.25,w+.02,.42,5.88,'#527e43',0,0,0,10);
    
    A('cliff',M(xx+range(-.15,.15),y-1.04,2.6,w*.99,range(1.60,1.90),range(1.0,1.4),range(-.055,.055),range(-.04,.04)),'#708577',0,3);
    A('cliff',M(xx-w*.43,y-2.93,2.48,w*range(.85,1.13),range(1.9,2.3),range(1.3,1.7),range(-.11,.08),range(-.15,.1)),'#4e7065',0,3);
    A('cliff',M(xx+w*.03,y-4.8,2.26,w*range(.88,1.14),range(1.65,2.0),1.6,range(-.08,.08),range(-.10,.1)),'#47665f',0,3);
    for(let k=0;k<5;k++){
     const rx=x+rand()*w,zz=k%2?2.39:-2.31;
     A('stone',M(rx,y-.11,zz,.9,.42,.98,0,rand()*6),['#4c813d','#5b913b','#376f3d'][k%3],0,1);
     broadPlant(rx,y-.06,zz,range(.40,.67),1);
     if(k%2===0)vine(rx,y-.12,2.9,range(.72,1.8));
    }
    for(let k=0;k<5;k++){const rx=x+rand()*w,zz=range(-2.6,2.6);if(Math.abs(zz)<.65)continue;A('grass',M(rx,y-.01,zz,.58,range(.24,.48),.6,0,range(0,6.28)),['#859f40','#688c3d','#60904b'][k%3],0,1,.025);}
    for(let j=0;j<3;j++){const fx=x+range(.1,w),fz=range(1.8,2.4);broadPlant(fx,y-.025,fz,range(.20,.32),1);if(rand()>.87){L([fx,y,fz],[fx,y+.23,fz],.016,'#4a8543');for(let q=0;q<4;q++)S(fx+Math.cos(q*1.571)*.07,y+.23+Math.sin(q*1.571)*.06,fz,.105,.10,.08,q%2?'#f1ac4c':'#df7c43');}}
    if(rand()>.47)stone(x+rand()*w,y+.055,-1.55,range(.22,.5),'#a0ab85',.22,.34);
   }
  }
  // Turquoise river, with shallow shoreline and deep foreground reflections.
  WaterEnvironment.surface(137,-2.17,11.2,363,22.2,'#39b3ad','jungle-river');
  WaterEnvironment.surface(73,-2.16,-3,44,18,'#3cafa8','bridge-channel');
  WaterEnvironment.surface(241,-.96,0,7.8,12,'#35b4b2','jungle-ford');
  for(let x=-21;x<319;x+=7.5){
   const yy=terrainY(x);
   if(yy<-8)continue;
   stone(x,range(-.3,.1),-8.2,range(4.3,5.2),'#49745c',range(2.0,2.8),4.1);for(let k=0;k<3;k++)broadPlant(x+(k-1)*1.35,1.0,-7.4,range(1.6,2.1),0);
   palm(x+range(-1.5,1.5),0,range(-11.5,-7.0),range(.79,1.19));
   if(Math.floor(x)%3!==0)banana(x+3,0,-6.8,range(.85,1.22));
   if(rand()>.32)palm(x+2,0,range(-27,-20),range(1.1,1.65));
   broadPlant(x+range(1,4),.05,-3.5,range(.9,1.3),0);if(Math.floor(x*10)%2===0)canopyTree(x+2,0,-8.1,range(.8,1.0));
  }
  for(let x=-18;x<310;x+=4.3){broadPlant(x,.12,-5.0,range(1.1,1.65),0);broadPlant(x+1.1,.06,-4.7,range(.7,1.1),0);if(Math.floor(x)%4===0)broadPlant(x+1,.12,-3.6,1.15,1);}
  // Front-edge foliage frames the bank without obstructing the firing lane.
  for(let x=-10;x<309;x+=5.4){const y=terrainY(x);if(y<-4)continue;broadPlant(x,y-1.3,4.3,range(.45,.8),2);}
  for(let x=55;x<=94;x+=3){
   for(const z of [-1.8,1.8]){L([x,-3.4,z],[x,1.0,z],.075,'#987641',3);L([x,.85,z],[Math.min(94,x+3),.66,z],.045,'#d1b57b');L([x,.0,z],[Math.min(94,x+3),-.12,z],.035,'#785d37');}
  }
  for(const p of platforms){
   const x=(p.a+p.b)/2,w=p.b-p.a,z=-1.60,metal=p.style==='metal';
   if(metal){BiomeAssets.servicePlatform(p,Math.max(terrainY(x),-3.6),true);continue;}
   B(x,p.y-.19,z,w,.38,2.60,metal?'#748d8c':p.style==='rock'?'#768575':'#928466',0,0,0,metal?2:3);
   B(x,p.y-.035,z,w,.07,2.60,metal?'#a7b3a5':'#8e9b77',0,0,0,metal?2:3);
   for(let xx=p.a+.6;xx<p.b;xx+=3.4){const base=Math.max(terrainY(xx),-3.6);L([xx,base,-2.25],[xx,p.y-.2,-2.25],.105,metal?'#506b6d':'#6e735b',metal?2:3);L([xx,base+.15,-2.25],[Math.min(p.b,xx+2.8),p.y-.2,-2.25],.07,metal?'#718985':'#9e956e',metal?2:3);}
   if(metal)for(let xx=p.a+.4;xx<p.b;xx+=1.8)B(xx,p.y-.19,-.265,.38,.14,.045,'#bba060',.3,0,0,2);
   if(p.style==='rock'){stone(p.a+.7,p.y-.75,-2.65,2.4,'#567361',1.3,1.3);broadPlant(p.b-.6,p.y,-2.45,.34,1);}
  }
  bunker(37,0,-6,7);bunker(200,0,-6,9);bunker(252,0,-6,8);tower(215,-10);tower(273,-14);
  for(const x of [19,39,101,145,181,205,225,253,265]){const y=terrainY(x);crate(x,y,-2.0,1.0);if(x%2)barrel(x+1.35,y,-1.9,.9);}
  crate(149,0,-3,1.7);crate(152,0,-3,1.2);crate(149,1.7,-3,1.0);
  for(const x of [20,40,98,143,181,205,223,254,266]){const y=terrainY(x);for(let i=0;i<3;i++)sandbag(x+i*.68,y+.18,-1.12);for(let i=0;i<2;i++)sandbag(x+.34+i*.68,y+.45,-1.12);}
  for(const x of [96,168,244]){const y=Math.max(0,terrainY(x));B(x,y+1.1,-2.1,.24,2.2,.25,'#334f51',0,0,0,2);B(x,y+2,-2.1,.56,.46,.35,'#7baf94',0,0,0,2);S(x,y+2,-1.88,.29,.29,.08,'#6ef8d3',1.3,2);}
  // Fortress silhouette: ivory armour, deep teal recesses and orange hazard markings.
  B(291,5.2,-.3,7,10.4,8.5,'#436c67',0,0,0,2);B(291,10.5,-.3,8.5,.7,9.3,'#b4c7a7',0,0,0,2);
  for(const z of [-4.2,4.2]){B(287.7,4.9,z,1.2,9.8,1,'#bdc9ab',0,0,0,2);B(287.02,4.9,z,.12,7,.27,'#577167',0,0,0,2);}
  for(const y of [1,4.5,8.3])B(287.15,y,-.2,.3,.24,8.2,'#c9d1aa',0,0,0,2);
  for(const z of [-2.8,2.8]){B(286.98,4.7,z,.20,7.2,1.2,'#294b4b',0,0,0,2);for(let y=2;y<8;y+=.48)B(286.8,y,z,.12,.11,1.1,'#76978a',0,0,0,2);}
  for(const z of [-2.9,2.9]){A('cyl',M(291,11.5,z,1.05,1.8,1.05),'#59786f',0,2);A('ring',M(291,12.5,z,1.4,.8,1.4),'#c3cdb0',0,2);}
  L([290,11,0],[290,14,0],.12,'#7b9a8d',2);A('sphere',M(290,14.2,0,3,.35,2.5,.3,0,.3),'#89b6a0',0,2);
  for(let y=1;y<9;y+=1.1)B(286.82,y,4.75,.2,.42,.8,'#efb449',.3,0,0,2);
  for(let x=288;x<295;x+=1.4)broadPlant(x,10.85,-3,1.0,1);
  R.record(false);
 }

 function updateBridge(t,p){if(p)for(const b of bridges)if(p.x>b.x+2&&b.fallAt===Infinity)b.fallAt=t+.7;}
 function drawBridge(t,p){for(const b of bridges){let d=Math.max(0,t-b.fallAt);if(d>2.5)continue;const warning=t>b.fallAt&&d<.8;let y=d>.8?-10*(d-.8)**2:Math.sin(d*65)*d*.08;let col=warning&&(Math.floor(t*8)%2)?'#ffc155':'#9c8351';B(b.x+.72,y-.11,0,1.42,.22,3.6,col,d>.8?(d-.8)*.7:0,0,0,3);B(b.x+.15,y+.015,1.2,.11,.026,.17,'#5a6255',0,0,0,2);}}
 function drawCharacter(c,t,hero=false){
  const x=c.x,y=c.y,z=c.z||0,face=c.face||1,duck=!!c.duck,run=Math.abs(c.vx||0)>.30,air=!c.grounded,dead=!!c.dead;
  const speed=Math.abs(c.vx||0),phase=t*(hero?15.8:13.0)+(c.id||0),travel=c.jumpTravel??(speed>.3);
  const landing=Math.max(0,c.landing||0)/.14;
  const bob=run&&!air&&!duck?Math.sin(phase*2)*.029:0;
  let hip=(duck?.44:1.00)+bob-landing*.085,shoulder=(duck?.69:1.52)+bob-landing*.075,headY=(duck?.99:1.88)+bob-landing*.065;
  const shoulderX=(duck?.15:run&&!air?.075:air&&travel?.045:0)*face;
  // The live root never rotates around the feet. Dead bodies alone pivot at the pelvis.
  let root=M(x,y,z);
  if(dead){root=R.mul(M(x,y+.84,z,1,1,1,(c.deathAge||0)*face*2.1),M(0,-.84,0));}
  const local=(xx,yy,zz)=>[root[0]*xx+root[4]*yy+root[8]*zz+root[12],root[1]*xx+root[5]*yy+root[9]*zz+root[13],root[2]*xx+root[6]*yy+root[10]*zz+root[14]];
  const put=(type,mat,col,emit=0,kind=8)=>A(type,R.mul(root,mat),col,emit,kind);
  const segment=(a,b,width,depth,col)=>A('limb',R.segment(local(...a),local(...b),width,depth),col,0,8);
  const ball=(xx,yy,zz,sx,sy,sz,col)=>put('sphere',M(xx,yy,zz,sx,sy,sz),col);
  const box=(xx,yy,zz,sx,sy,sz,col,rz=0)=>put('bevel',M(xx,yy,zz,sx,sy,sz,rz),col);
  const skin=hero?'#dfa16a':'#cba377',skinLight=hero?'#f0b57b':'#d6b083',skinShade=hero?'#b88054':'#b28b61';
  const pants=hero?'#697941':c.type==='heavy'?'#4f6253':'#365c55',boots='#293d3b',cloth=hero?skin:c.type==='heavy'?'#74856a':'#996146';
  const floor=Math.max(...(R.surfaces?R.surfaces(x,t):surfaces(x,t)).filter(v=>v<=y+.05));
  if(!dead&&Number.isFinite(floor)){
   const h=Math.max(0,y-floor),ss=Math.max(.50,1.05-h*.095);
   A('quad',M(x,floor+.018,z,ss*1.3,ss*.73,1,0,0,-Math.PI/2),'#173b36',0,6,0,Math.max(.09,.29-h*.035));
  }
  // Short gold-white flashes retain the entire silhouette during invulnerability.
  const blink=hero&&c.inv>0&&Math.floor(t*13)%2===0;
  for(const side of [-1,1]){
   let stride=run?Math.sin(phase+(side<0?Math.PI:0))*.43:side*.05;
   let lift=run?Math.max(0,Math.cos(phase+(side<0?Math.PI:0)))*.24:0;
   let ankle=[face*stride,.135+lift,side*.185],knee=[face*(stride*.50+.065),.53+lift*.36,side*.175];
   if(duck){knee=[face*(.30+side*.12),.28,side*.21];ankle=[face*(side*.30-.015),.14,side*.23];}
   else if(air){
    let tuck=Math.min(1,(c.airTime||0)*11);
    if((c.vy||0)<0&&Number.isFinite(floor))tuck*=Math.min(1,Math.max(.0,y-floor)/.82);
    const separate=travel?side*.13:side*.065;
    knee=[face*(.12+(.30+separate)*tuck),.54+.11*tuck,side*.19];
    ankle=[face*((travel?-.27:-.13)+side*.10)*tuck,.135+(.29+(travel?side*.07:0))*tuck,side*.19];
   }
   ball(0,hip-.03,side*.13,.34,.39,.34,pants);
   segment([0,hip-.06,side*.155],knee,.285,.27,pants);
   segment(knee,ankle,.25,.245,pants);
   box(knee[0]+face*.075,knee[1]+.017,knee[2]+.018,.24,.25,.28,hero?'#7d894b':'#486555',-.10*face);
   box(ankle[0]+face*.075,ankle[1]-.015,ankle[2],.39,.25,.32,boots,air?-face*.07:0);
   box(ankle[0]+face*.078,ankle[1]-.127,ankle[2],.405,.055,.327,'#516258');
   box(ankle[0]-.03*face,ankle[1]+.11,ankle[2],.26,.10,.28,hero?'#536548':'#284740');
  }
  const torsoX=shoulderX*.46;
  put('torso',M(torsoX,(hip+shoulder)/2,0,.72,shoulder-hip+.23,.56,-face*(run&&!air?.08:0)),blink?'#f2d1a0':cloth);
  ball(shoulderX-face*.02,shoulder-.17,.13,.39,.29,.35,hero?skinLight:cloth);
  if(hero){
   ball(torsoX-.145,shoulder-.18,.21,.31,.22,.19,skinLight);ball(torsoX+.115,shoulder-.18,.21,.31,.22,.19,skinLight);
   box(torsoX,hip+.22,.25,.27,.19,.085,skin);
   box(torsoX-.175,(hip+shoulder)*.5,.285,.092,shoulder-hip+.13,.055,'#3c4c37',-.16);
   for(let i=0;i<5;i++)put('cyl',M(torsoX-.18+i*.012,shoulder-.03-i*.09,.325,.039,.067,.039,-.12),'#e8c26a',0,9);
   box(-face*.22,hip+.13,-.13,.15,.26,.18,'#495b3b');
  }else{
   box(torsoX,shoulder-.23,.275,.48,.35,.14,c.type==='heavy'?'#a4ab78':'#536b50');
   for(const side of [-1,1])box(torsoX+side*.14,shoulder-.24,.36,.12,.18,.045,'#c2b579');
   box(-face*.19,shoulder-.22,-.19,.30,.56,.25,'#36534c');
  }
  box(0,hip-.035,.018,.54,.14,.44,'#374b39');box(.07,hip-.035,.253,.14,.105,.045,'#e3c770');
  for(const side of [-1,1])box(side*.21,hip-.07,.24,.15,.23,.12,hero?'#7f804e':'#75805e');
  put('cyl',M(shoulderX,headY-.27,0,.20,.19,.20),skin);
  const hx=shoulderX+face*.036;
  put('head',M(hx,headY,0,.46,.47,.435,-face*.035),blink?'#f1c793':skin);
  box(hx+face*.042,headY-.13,.022,.345,.19,.37,skinShade);
  ball(hx-face*.155,headY-.04,.213,.15,.20,.10,skin);
  box(hx+face*.224,headY-.01,.04,.145,.135,.19,skinLight);
  box(hx+face*.11,headY+.032,.221,.136,.071,.020,'#fcf0d0',-.05*face);
  box(hx+face*.145,headY+.032,.235,.048,.063,.022,'#203934');
  box(hx+face*.11,headY+.087,.238,.171,.043,.028,'#41392e',-.15*face);
  box(hx+face*.14,headY-.134,.211,.108,.027,.024,'#6c563d',.035*face);
  if(hero){
   ball(hx-face*.03,headY+.193,-.005,.48,.22,.455,'#493b2c');
   for(let i=0;i<5;i++)put('tuft',M(hx-face*.13+i*.063,headY+.30,-.02,.155,.25+(i%2)*.055,.33,face*(-.24+i*.105)),'#503f2a');
   box(hx-face*.182,headY+.072,-.015,.11,.18,.42,'#4c3c2d');
   put('cyl',M(hx,headY+.132,0,.472,.079,.456),'#247fbd');
   box(hx+.02,headY+.13,.231,.21,.073,.034,'#4eafe4');
   for(let k=0;k<2;k++){
    const start=[hx-face*.21,headY+.115,-.105+k*.11],mid=[hx-face*.49,headY+.09+Math.sin(t*13+k)*.040,-.10+k*.12],end=[hx-face*.77,headY+.12+Math.sin(t*11+k*2)*.072,-.08+k*.14];
    put('bevel',R.segment(start,mid,.073,.036),'#2689cf');put('bevel',R.segment(mid,end,.062,.033),k?'#3999da':'#2378b1');
   }
  }else{
   ball(hx,headY+.157,-.018,.55,.35,.52,c.type==='heavy'?'#637d63':'#738648');
   box(hx+face*.055,headY+.081,.238,.51,.095,.11,'#334f43');
   box(hx+face*.05,headY+.029,.252,.34,.095,.040,'#233b37');
   box(hx+face*.12,headY+.03,.28,.13,.040,.020,'#f77b4c');
   box(hx-face*.10,headY-.14,.204,.040,.29,.035,'#395248',-.17*face);
  }
  // Both arms and the gun share the same local coordinate system in every action state.
  const angle=c.aim??(face>0?0:Math.PI),dx=Math.cos(angle),dy=Math.sin(angle),gy=duck?.65:1.48;
  const recoil=c.recoil||0,origin=[-dx*recoil*.6,gy-dy*recoil*.6,.06];
  const farEl=[shoulderX+dx*.16,shoulder-.27+dy*.18,-.245],farHand=[origin[0]+dx*.72,origin[1]+dy*.72-.058,-.063];
  segment([shoulderX,shoulder-.015,-.235],farEl,.26,.245,hero?skin:cloth);segment(farEl,farHand,.22,.205,skin);
  ball(farHand[0],farHand[1],farHand[2],.20,.17,.19,'#3b4d3d');
  const elbow=[shoulderX+dx*.18-dy*.15,shoulder-.24*Math.abs(dx)+dy*.19,.275],hand=[origin[0]+dx*.425,origin[1]+dy*.425-.07,.22];
  ball(shoulderX,shoulder-.045,.25,.32,.34,.31,hero?skinLight:cloth);
  segment([shoulderX,shoulder-.04,.25],elbow,.27,.255,skin);ball(elbow[0],elbow[1],elbow[2],.235,.23,.225,skinLight);
  segment(elbow,hand,.22,.205,skin);ball(hand[0],hand[1],hand[2],.19,.17,.18,'#3a4c3c');
  const gunRoot=R.mul(root,M(origin[0],origin[1],origin[2],1,1,1,angle));
  const gp=(type,mat,col,emit=0)=>A(type,R.mul(gunRoot,mat),col,emit,9);
  gp('bevel',M(.25,.035,0,.31,.185,.17),'#344c4a');gp('bevel',M(.58,.038,0,.51,.186,.18),'#263e3d');
  gp('bevel',M(.67,.111,.018,.43,.045,.194),'#65827a');gp('bevel',M(.54,-.19,0,.15,.27,.12,-.18),'#405b51');
  gp('bevel',M(.42,-.098,.08,.105,.16,.13),'#20342f');gp('bevel',M(.86,.045,0,.28,.112,.14),'#425d57');
  for(let i=0;i<4;i++)gp('bevel',M(.79+i*.06,.09,.078,.025,.088,.025),'#a2afa0');
  gp('cyl',M(1.095,.04,0,.088,.28,.088,Math.PI/2),'#8c9f90');gp('cyl',M(1.237,.04,0,.16,.098,.16,Math.PI/2),'#324b46');
  gp('bevel',M(.58,.18,0,.29,.046,.07),'#a9b395');gp('bevel',M(.42,.174,0,.10,.155,.085),'#2b433d');gp('bevel',M(.72,.05,.101,.12,.055,.035),'#d2aa5c');
  if(c.muzzle>0){
   gp('flash',M(1.40,.04,.02,.74,.54,.70,t*30),'#ffbf45',2.0);
   gp('flash',M(1.40,.04,.06,.43,.28,.70,-t*17),'#fff2c1',3.1);
   const pos=local(origin[0]+dx*1.40,origin[1]+dy*1.40,.12);
   A('quad',M(pos[0],pos[1],pos[2],.80,.66,1,angle),'#ffc36d',2.5,6,0,.35);
  }
 }

 function drawTurret(e,t){const y=e.y;A('cyl',M(e.x,y+.22,0,1.1,.42,1.1),'#65715b',0,2);A('sphere',M(e.x,y+.52,0,1.02,.67,.87),'#9b9d73',0,2);B(e.x,y+.4,.45,.62,.2,.11,'#354338',0,0,0,2);const d=[Math.cos(e.aim||Math.PI),Math.sin(e.aim||Math.PI)],base=[e.x,y+.67,.04],end=[e.x+d[0]*.8,y+.67+d[1]*.8,.04];L(base,end,.14,'#474f42',2);L(end,[end[0]+d[0]*.12,end[1]+d[1]*.12,end[2]],.18,'#aeb399',2);S(e.x,y+.68,.42,.14,.14,.12,e.wind>0?'#ffc76f':'#f5734a',e.wind>0?4:1.2);}
 function drawDrone(e,t){let x=e.x,y=e.y;S(x,y,0,1.0,.45,.64,'#8a9785');B(x,y-.22,.03,.46,.28,.40,'#3c504d',0,0,0,2);S(x,y-.2,.27,.22,.16,.13,'#ffb291',e.wind>0?4:1.5);for(let s of [-1,1]){L([x,y,0],[x+s*.7,y+.15,0],.075,'#455854',2);A('cyl',M(x+s*.7,y+.22,0,.7,.13,.7),'#425957',0,2);B(x+s*.7,y+.3,0,1.3,.025,.10,'#a4c1ac',0,t*50,0,2);}}
 function drawCapsule(c,t){
  const y=c.y+Math.sin(t*2.8+c.x)*.18;
  A('bevel',M(c.x,y,0,.81,.56,.50),'#284e58',0,9);
  A('bevel',M(c.x,y,.265,.62,.45,.08),'#35b9df',.4,9);
  A('bevel',M(c.x,y,.308,.48,.35,.03),'#83e9e6',.55,9);
  for(const d of [-1,1]){B(c.x+d*.56,y-.04,0,.42,.13,.41,'#c1d9bc',d*.14,0,0,2);B(c.x+d*.73,y+.03,0,.1,.21,.40,'#529aaa',0,0,0,2);}
  A('quad',M(c.x,y,.30,1.4,1.12,1),'#3edcff',1.6,6,0,.2);
  S(c.x,y-.34,.0,.16,.13,.16,'#76f5e2',1.5,9);
 }
 function drawAtmosphere(t,cx){} // All atmospheric emitters now live in Environment.

 return{resetSeed:(value=712931)=>{seed=value|0;},create,stone,broadPlant,fern,palm,banana,vine,crate,barrel,sandbag,temple,waterfall,bunker,tower,canopyTree,drawAtmosphere,floor,platforms,bridges,encounterScore,capsules,terrainY,surfaces,topAt,reset,updateBridge,drawBridge,drawCharacter,drawTurret,drawDrone,drawCapsule};
})();



