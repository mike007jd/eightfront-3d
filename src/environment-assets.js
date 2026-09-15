/* Environment assemblies — actual 3D game geometry, never generated-image backdrops.
 * Scope: Energy Zone (06) and Alien's Lair (08); gameplay/collision data are read-only.
 * Materials: 31 connective tissue, 32 dry bone, 33 anchored membrane, 34 organ skin,
 *            35 exposed alloy, 36 industrial coating. Dynamic internals use game time.
 * +Y up, +Z toward the side camera. Combat strip stays unobstructed at z=0.
 */
const EnvironmentAssets=(()=>{
 const M=(...a)=>R.matrix(...a),A=(...a)=>R.add(...a),B=(...a)=>R.box(...a),S=(...a)=>R.ball(...a);
 const F=(x,y,z,sx,sy,sz,spin=0)=>Math3D.oriented(x,y,z,sx,sy,sz,{axis:'z',spin});
 const PI=Math.PI,TAU=PI*2;
 const h=n=>{const a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a);};
 const palette={wall:'#28333e',plate:'#3e505a',trim:'#72848a',steel:'#a2aba4',pipe:'#aa7552',dark:'#15222b',warm:'#ffb76b',bone:'#b6a292',flesh:'#693447',vein:'#402230'};
 const C=palette;
 function segment(a,b,r,color=C.steel,kind=35){A('alloyTube',Math3D.segment(a,b,r*2),color,0,kind);}
 function tube(a,b,r,color=C.pipe){segment(a,b,r,color,35);}
 function bolt(x,y,z,r=.115){A('hexBolt',F(x,y,z,r,.105,r),'#9aa8aa',0,35);B(x,y,z+.058,r*.47,.024,.015,'#283941',.3,0,0,35);}
 function plate(x,y,z,w,height,color=C.plate,depth=.20){B(x,y,z,w,height,depth,color,0,0,0,36);}
 function light(x,y,z,w,col=C.warm,power=1.7){plate(x,y,z,w+.22,.22,C.dark,.12);B(x,y,z+.085,w,.065,.04,col,0,0,0,22,power);}
 function mark(x,y,z,w){for(let i=0;i<Math.max(2,Math.floor(w/.45));i++){B(x-w*.5+i*.45+.18,y,z,.22,.17,.032,i%2?'#c7a15a':'#233138',-.37,0,0,36);}}
 function flange(p,dir,r){const len=Math.hypot(...dir)||1,n=dir.map(x=>x/len),a=p.map((v,i)=>v-n[i]*.09),b=p.map((v,i)=>v+n[i]*.09);A('flange',Math3D.segment(a,b,r*2.95),'#879897',0,35);}
 function pipeRun(points,r=.20,col=C.pipe){
  // Quadratic corner fillets and profiled flanges. No ball-joint elbows.
  let prev=points[0];const vec=(a,b)=>b.map((v,i)=>v-a[i]);
  for(let i=1;i<points.length;i++){
   if(i===points.length-1){tube(prev,points[i],r,col);break;}
   const p=points[i],from=Math3D.norm(vec(points[i-1],p)),to=Math3D.norm(vec(p,points[i+1]));
   const d=Math.min(.58,Math.hypot(...vec(points[i-1],p))*.22,Math.hypot(...vec(p,points[i+1]))*.22);
   const a=p.map((v,k)=>v-from[k]*d),b=p.map((v,k)=>v+to[k]*d);tube(prev,a,r,col);let q=a;
   for(let j=1;j<=7;j++){let u=j/7,n=a.map((v,k)=>(1-u)*(1-u)*v+2*(1-u)*u*p[k]+u*u*b[k]);tube(q,n,r,col);q=n;}prev=b;
  }
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dir=vec(a,b);for(const u of [.19,.80])flange(a.map((v,k)=>v+dir[k]*u),dir,r);}
 }
 function clampPipe(x,y,z,r){plate(x,y,z-.35,.66,.60,C.plate,.30);plate(x,y,z,.70,.16,C.steel,.17);bolt(x-.26,y,z+.12,.08);bolt(x+.26,y,z+.12,.08);}
 function grill(x,y,z,w,height,vertical=false){plate(x,y,z,w+.16,height+.16,C.trim,.14);plate(x,y,z+.09,w,height,C.dark,.07);
  const count=vertical?Math.max(4,Math.round(w/.19)):Math.max(4,Math.round(height/.20));
  for(let j=0;j<count;j++){const u=(j+.5)/count-.5;if(vertical)plate(x+u*w,y,z+.15,.062,height*.94,C.plate,.08);else plate(x,y+u*height,z+.15,w*.94,.055,C.plate,.08);}}
 function brace(a,b,width=.20){A('panel',Math3D.segment(a,b,width,width*.8),C.plate,0,36);}
 function cable(x,y,z,w,drop,col='#252e34'){A('hangingCable',M(x,y,z,w,drop,z===0?1:1.2),col,0,36);}
 function reactor(x,y,z,variant){
  // Backplate -> recessed well -> stepped housing -> seal -> segmented armour -> rotor.
  plate(x,y,z-.7,9.2,9.0,C.dark,.40);plate(x,y,z-.40,8.35,8.4,'#36434d',.30);
  for(const side of [-1,1]){plate(x+side*4.1,y,z-.01,.42,8.4,'#60717a',.48);plate(x+side*3.67,y-3.85,z+.03,.54,.29,C.steel,.26);bolt(x+side*3.67,y-3.83,z+.21,.16);}
  A('alloyTube',F(x,y,z,6.85,.70,6.85),C.dark,0,36);
  A('reactorBezel',F(x,y,z+.26,6.8,.82,6.8),'#546570',0,35);
  A('sealRing',F(x,y,z+.74,6.17,.12,6.17),'#17262d',0,36);
  A('sealRing',F(x,y,z+.79,5.65,.08,5.65),'#d89756',.15,35);
  A('sealRing',F(x,y,z+.82,5.28,.08,5.28),C.warm,2.2,22);
  A('reactorBezel',F(x,y,z+.67,4.90,.30,4.9),'#293e49',0,35);
  for(let i=0;i<8;i++){let a=i*TAU/8;A('reactorSector',M(x,y,z+.89,7.2,7.2,2.1,a),'#53636c',0,36);
   const px=x+Math.cos(a)*2.99,py=y+Math.sin(a)*2.99;bolt(px,py,z+1.02,.18);
   if(i%2===0){plate(px,py,z+1.05,.68,.43,C.steel,.19);for(const side of [-1,1])bolt(px+side*.22,py,z+1.18,.10);}}
  // Central turbine is below the armour plane, not a flat orange disk.
  A('alloyTube',F(x,y,z+.66,3.65,.15,3.65),'#182830',0,36);
  A('reactorBezel',F(x,y,z+.93,2.45,.39,2.45),'#86918a',0,35);
  A('alloyTube',F(x,y,z+1.15,1.91,.27,1.91),'#24343d',0,36);
  for(const side of [-1,1]){plate(x+side*.66,y,z+1.30,.29,1.94,'#a3a59a',.30);bolt(x+side*.64,y+.66,z+1.50,.12);bolt(x+side*.64,y-.66,z+1.50,.12);}
  S(x,y,z+1.31,.69,1.47,.39,'#dc9f65',0,35);S(x,y,z+1.51,.24,1.02,.14,C.warm,3.2,22);
  for(const yy of [y-4.03,y+4.06])light(x,yy,z+.2,1.8,'#eac296',1.35);
  Environment.add('reactor',{x,y,z:z+.73,r:4.2,assembly:'rc7',seed:variant*.19});
  // Physically connected coolant route and wall clamp brackets.
  for(const side of [-1,1]){pipeRun([[x+side*5.32,.35,z+.42],[x+side*5.32,y+3.82,z+.42],[x+side*2.1,y+3.82,z+.22]],.26);
   for(const yy of [1.5,4.1,7.1])clampPipe(x+side*5.32,yy,z+.44,.26);
   plate(x+side*5.33,.44,z+.50,1.0,.72,C.plate,.57);bolt(x+side*5.55,.48,z+.82,.15);}
  pipeRun([[x-3.8,y-2.5,z+.3],[x-4.25,y-2.5,z+.3],[x-4.25,.52,z+.3]],.15,'#718383');
  cable(x,y+4.82,z-.13,10.9,1.3,'#1d282e');
 }
 function serviceBay(x,z,index){
  plate(x,4.65,z,11.1,9.7,'#283842',.70);for(const side of [-1,1]){plate(x+side*5.2,4.7,z+.50,.38,9.8,'#576c76',.7);plate(x+side*4.93,4.7,z+.64,.07,9.1,'#98a69f',.12);}
  // Quiet service panels and a heat exchanger are intentionally different silhouettes.
  const flip=index%2?-1:1;
  grill(x-flip*2.2,5.25,z+.51,3.45,4.8,true);
  for(let i=0;i<4;i++){const xx=x-flip*2.2+(i-1.5)*.64;pipeRun([[xx,2.65,z+.85],[xx,7.5,z+.85],[xx+.22,7.5,z+.78]],.115,'#758589');}
  plate(x+flip*2.47,4.9,z+.50,3.25,5.40,'#344954',.26);
  for(const yy of [2.42,7.42])plate(x+flip*2.47,yy,z+.67,3.25,.10,C.trim,.11);
  for(const side of [-1,1]){bolt(x+flip*2.47+side*1.43,7.20,z+.71,.12);bolt(x+flip*2.47+side*1.43,2.66,z+.71,.12);}
  grill(x+flip*2.47,5.90,z+.69,2.32,.78);light(x+flip*2.47,4.60,z+.70,1.2,'#81b4c7',.80);
  plate(x+flip*3.3,4.0,z+.72,.10,.58,'#adb4ab',.11);
  for(let k=0;k<3;k++)B(x+flip*2.47+(k-1)*.27,3.40,z+.75,.08,.08,.045,k===0?'#daac6c':'#578d89',0,0,0,22,k===0?.7:.2);
  pipeRun([[x-4.35,.30,z+1.0],[x-4.35,1.8,z+1.0],[x+3.6,1.8,z+1.0],[x+3.6,3.0,z+1.0]],.15,'#697d80');
  for(const side of [-1,1]){light(x+side*3.8,.51,z+.65,.95,C.warm,1.2);R.light(x+side*3.8,.65,z+1.0,C.warm,3.8,3.6,1,false);}
  cable(x+flip*1.8,8.38,z+.84,4.4,1.4);cable(x+flip*1.6,8.42,z+.91,4.2,1.57,'#755945');
  Environment.add('steam',{x:x-4.4,y:2.0,z:z+1.08,color:'#acbac1'});
  Environment.add('panel',{x:x+flip*2.47,y:4.32,z:z+.65,w:1.55,h:.75,color:'#7bbaad'});
 }
 function industrialFloor(s){
  for(const [a,b,y]of s.floors){if(y<-8)continue;const n=Math.ceil((b-a)/5.2),w=(b-a)/n;
   for(let i=0;i<n;i++){const x=a+(i+.5)*w,seed=Math.round(x*3);
    plate(x,y-2.10,-.05,w,3.55,'#24333d',5.8);
    // Only this slab owns the top plane. Structural body ends below it.
    plate(x,y-.16,-.05,w-.016,.32,'#899795',5.88);
    for(const z of [-2.40,2.18]){B(x,y+.009,z,w*.89,.018,.045,'#263f49',0,0,0,36);}
    for(let j=0;j<8;j++)B(x-w*.31+j*w*.088,y+.012,-2.56,.045,.022,.32,'#34494d',0,0,0,36);
    plate(x,y-1.82,2.91,w*.90,2.46,'#1b2b34',.17);
    for(const side of [-1,1]){plate(x+side*w*.405,y-1.85,3.04,.23,2.70,'#52636b',.27);plate(x+side*w*.33,y-.38,3.07,.36,.23,'#b29a60',.21);bolt(x+side*w*.33,y-.37,3.22,.105);}
    if(i%3!==1){brace([x-w*.34,y-2.9,3.04],[x+w*.34,y-.67,3.04],.25);brace([x+w*.34,y-2.9,2.99],[x-w*.34,y-.67,2.99],.22);}else grill(x,y-1.72,3.04,w*.64,1.38);
    if(i%3===0)light(x,y-1.20,3.12,w*.32,'#e4b67e',.65);
    mark(x,y-.37,3.02,w*.45);
   }
  }
  for(const p of s.platforms)if(!p.move)industrialDeck(p);
 }
 function industrialDeck(p){const {a,b,y}=p,x=(a+b)/2,w=b-a,z=-1.6;
  plate(x,y-.19,z,w,.38,'#778988',2.55);plate(x,y-.55,z,w,.28,C.plate,2.32);mark(x,y-.20,-.275,w);
  for(let xx=a+.24;xx<b;xx+=.8)B(xx,y+.01,-2.12,.035,.020,1.05,'#2f4249',0,0,0,36);
  const n=Math.max(1,Math.floor(w/2.0));for(let i=0;i<n;i++){const left=a+i*w/n,right=left+w/n;brace([left+.12,y-.64,-.80],[right-.12,y-1.15,-.80],.13);brace([left+.12,y-1.15,-.84],[right-.12,y-.64,-.84],.13);}
  plate(x,y-1.18,-1.14,w-.32,.16,C.plate,1.25);
  for(const side of [-1,1]){const xx=x+side*(w*.5-.28);brace([xx,y-.44,-1.52],[xx,y-2.0,-4.38],.21);plate(xx,y-2.0,-4.43,.52,.74,C.plate,.22);bolt(xx,y-1.82,-4.24,.13);}
 }
 function energy(s){industrialFloor(s);
  plate(s.length/2,5.6,-12.9,s.length+70,14,'#1c2a33',1.5);
  for(let x=-16,index=0;x<s.length+22;x+=28,index++){
   reactor(x,4.8,-8.7,index);serviceBay(x+14,-9.80,index);
   for(const side of [-1,1]){const xx=x+side*6.25;plate(xx,5.0,-7.8,.46,10.1,'#61727b',.66);plate(xx,5.0,-7.4,.11,9.7,'#a2a69a',.09);plate(xx,.24,-7.35,1.0,.5,C.plate,1.05);}
   plate(x,10.24,-8,13.75,.44,C.plate,1.25);for(const side of [-1,1])brace([x+side*6.4,10.42,-8],[x,12.48,-9],.24);
   // Cool, subdued work lights frame the warm reactor, without flooding every surface.
   light(x-4.7,9.1,-7.75,1.62,'#8eafc1',1.05);light(x+4.7,9.1,-7.75,1.62,'#8eafc1',1.05);
   R.light(x,7.4,-5.8,'#98b9cf',9,8,1,false);
  }
  // Continuous cable trays make the bays read as one maintained industrial system.
  for(let x=-20;x<s.length+20;x+=10){plate(x,8.7,-10.0,9.8,.36,'#384b57',.86);for(const yy of [8.54,8.78])tube([x-4.85,yy,-9.53],[x+4.85,yy,-9.53],.055,'#806c52');}
  for(const [a,b,y]of s.floors)if(y<-5){A('water',M((a+b)/2,-3,0,b-a,1,10),'#ef703d',1.2,13);}
 }
 function organ(x,y,z,sx,sy,sz,variant=0,col='#8f4254',animated=false){
  if(animated){Environment.add('sac',{x,y,z,sx,sy,sz,anatomy:true,variant,color:col,scale:1});return;}
  A('organ'+variant,M(x,y,z,sx,sy,sz),col,0,34);A('organVeins',M(x,y,z,sx*1.015,sy*1.012,sz*1.015),'#442831',0,31);
 }
 function sinew(a,b,width=.18,col=C.flesh,kind=31,type='tendon'){
  // A whole curved watertight mesh per connection, not a chain of faceted cones.
  A(type,(()=>{const m=Math3D.segment(a,b,width*9);for(let k=0;k<3;k++)m[12+k]=(a[k]+b[k])*.5-(m[4+k]*.5);return m;})(),col,0,kind);
 }
 function bone(x,y,z,w,height,depth,side=1){
  // Positive scales only: reflect the assembly with a 180-degree Y rotation.
  const transform=M(x,y,z,w,height,depth,0,side<0?PI:0);
  A('boneRib',transform,'#b5a998',0,32);
  A('boneBranch',M(x+side*.24,y+1.18,z+.12,1.45,height*.62,1.2,0,side<0?PI:0),'#a69589',0,32);
  // Soft roots, buttress tendons and a collar bury the bone into the wall bed.
  A('tissueCuff',M(x,y+.52,z,2.05,1.58,1.85),'#734653',0,31);
  A('tissueCuff',M(x+.1,y+.39,z+.06,2.2,1.22,1.94),'#583642',0,34);
  organ(x+.2,y-.26,z+.02,3.0,1.18,2.35,2,'#573442');
  for(let k=0;k<4;k++){const spread=(k-1.5)*.65;const a=[x+spread,y-.27,z+.12+Math.abs(spread)*.26],b=[x+side*w*.06,y+1.58,z+.08];sinew(a,b,.17+(k%2)*.045,'#704855');}
  for(let k=1;k<=3;k++){const t=k/4,px=x+side*w*(.02+t*t*.42),py=y+height*t*.76,pz=z+depth*.04;
   sinew([px-side*.12,py-.35,pz+.11],[px+side*.23,py+.42,pz+.08],.045,'#827367',32);}
  // A secondary spur branches from the root; a modest asymmetry prevents fork templates.
  A('boneSpur',M(x+side*.16,y+1.1,z-.12,.92,4.65,1.13,side*.29,side<0?PI:0),'#a59688',0,32);
 }
 function broodNode(x,y,z,scale,variant){
  organ(x,y,z,.87*scale,1.57*scale,.77*scale,variant,'#864255',true);
  organ(x,y-.45*scale,z-.16,1.51*scale,1.15*scale,.92*scale,(variant+1)%3,'#492a3a');
  for(const side of [-1,1])sinew([x+side*.70*scale,y-.72*scale,z+.1],[x+side*.36*scale,y+.66*scale,z+.07],.11*scale,'#663545');
 }
 function livingFloor(s){
  for(const [a,b,y]of s.floors){if(y<-8)continue;const n=Math.ceil((b-a)/4.5),weights=Array.from({length:n},(_,i)=>.78+h(i*4.1+a)*.46),sum=weights.reduce((a,b)=>a+b,0);let cursor=a;
   for(let i=0;i<n;i++){const w=(b-a)*weights[i]/sum,x=cursor+w*.5;cursor+=w;let variant=(i+Math.floor(a*3)+600)%6;
    // Continuous substrate and six close-fitting pads; no rows of floating purple rocks.
    plate(x,y-2.45,-.37,w+.035,3.62,'#342330',5.3);
    A('tissueWall'+(variant%3),M(x,y-2.10,2.40,w+.045,3.2,1.2),'#512d3e',0,31);
    A('bioDeck'+variant,M(x,y-.55,-.02,w+.025,1.10,5.83),['#815263','#795061','#805665','#75485b','#80515f','#784d5c'][variant],0,31);
    // Underside organ clusters vary in number, embedding, spacing and proportions.
    const count=i%3===0?2:1;
    for(let k=0;k<count;k++){const seed=x*3.4+k*11,u=h(seed),xx=x+(u-.5)*w*.68,yy=y-1.35-h(seed+3)*.70,sz=.80+h(seed+7)*.43;
     organ(xx,yy,2.58,.88*sz,1.58*sz,.72*sz,(i+k)%3,'#80384d',true);
     for(const side of [-1,1])sinew([xx+side*.70,yy+1.1,2.77],[xx+side*.34,yy-.8,2.75],.085,'#4f2b3b');
    }
    A('muscleArch',M(x,y-.87,2.60,w*.97,.26,1.45),'#754556',0,31);
    if(i%3===0)A('boneSpur',M(x+w*.22,y-.44,2.69,.25,.86,.37,PI-.24),'#9e8284',0,32);
    for(let k=0;k<3;k++){const xx=x+(k-1)*w*.26,s=.15+h(x+k)*.19;sinew([xx,y-.37,2.7],[xx+.15,y-1.30-s,2.72],.085,'#895467');}
   }
  }
  for(const p of s.platforms)if(!p.move){const x=(p.a+p.b)/2,w=p.b-p.a;A('bioDeck'+(Math.floor(p.y)%6),M(x,p.y-.32,-1.6,w,.64,2.56),'#846272',0,31);
   for(let i=0;i<5;i++){const xx=p.a+(i+.5)*w/5;sinew([xx,p.y-.28,-.4],[xx+.11,p.y-.95-h(xx)*.7,-.55],.070,'#9b6c7b');}
   for(const side of [-1,1]){sinew([x+side*w*.4,p.y-.30,-2.2],[x+side*(w*.35+.8),p.y-2.6,-4.5],.23,'#815863');}
  }
 }
 function lair(s){livingFloor(s);
  // Recessed chambers, muscular septa, membrane windows and skeletal roots form depth.
  plate(s.length/2,6,-19,s.length+75,19,'#201b28',1.5);
  for(let x=-16,index=0;x<s.length+30;x+=18,index++){
   const v=index%3,z=-9.8,y=5.0,offset=(h(index+4)-.5)*.7;
   A('tissueWall'+v,M(x,4.4,-11.7,19.0,16.0,6.8),'#4c2c40',0,31);
   A('bioCavity'+v,M(x,y,z,10.5,12.6,5.5),'#553244',0,31);
   A('membrane'+v,M(x+.3,y+.1,z-1.75,6.9,9.0,1.6),'#783b57',0,33);
   for(let k=0;k<3;k++){const xx=x+(k-1)*1.9,yy=3.55+h(index*4+k)*1.2;organ(xx,yy,z-.76,1.5+h(k+index),3.2+h(k+2),1.6,(k+v)%3,'#5e2f40',true);}
   // Deep nodes illuminate a limited interior area; they do not become gameplay targets.
   organ(x+.72,y-.65,z-3.0,2.4,3.5,1.2,v,'#553142');
   A('organ'+v,M(x+.72,y-.65,z-2.6,.35,.82,.25),'#b86b80',1.7,22);
   R.light(x+.7,y-.65,z+.4,'#cd788b',7.0,6.8,1,true);
   for(const side of [-1,1]){
    const bx=x+side*(7.0+offset),height=8.4+h(index*7+side)*2.4,w=3.9+h(index*3-side)*.9;
    bone(bx,.0,z+2.55,w,height,1.8,-side);
    // Retaining membranes stretch from the bone root to the softer cavity wall.
    A('tensionWeb',M(bx,.58,z+2.42,4.45,5.60,1.3,0,side>0?PI:0),'#633849',0,33);
    sinew([bx,.58,z+2.42],[bx-side*4.45,2.48,z+2.40],.11,'#754453');
    A('webEdge',M(bx,.58,z+2.43,4.45,5.60,1.3,0,side>0?PI:0),'#8e5a68',0,31);
   }
   // Broad muscular arch and irregular interior folds, backed by recessed membrane.
   A('muscleArch',M(x,1.30,z+.48,13.5,7.6,2.4),'#67374a',0,31);
   A('muscleArch',M(x+.35,1.55,z+.28,11.5,6.85,1.8),'#4e2c3a',0,34);
   for(let k=0;k<5;k++){const xx=x+(k-2)*1.65,yy=2.2+h(k+index)*2.4;A('tissueWall'+((k+v)%3),M(xx,yy,z-2.7,2.1,4.6,2.5),'#6d394f',0,31);}
   // Layered muscle bundles follow the arch, not a row of randomly placed spheres.
   for(let j=0;j<2;j++){const yy=8.5+j*.88,phase=h(index*7+j)*.7;sinew([x-7.8,yy-1.4-phase,z+1.3],[x-1.3+phase,yy+.22,z-.15],.38-j*.055,'#623347',31,'artery');sinew([x+7.8,yy-1.1,z+1.05],[x+1.6-phase,yy+.6+phase,z-.13],.34-j*.055,'#583144',31,'artery');}
   for(let j=0;j<4;j++){const xx=x-5.6+j*3.55,yy=9.7+h(xx)*1.9;A('boneSpur',M(xx,yy,z+1.95,.37,1.1+h(xx+4)*1.6,.52,PI+(h(xx+2)-.5)*.34),'#a48a86',0,32);}
   const positions=[[-4.1,1.2,1.02],[3.7,1.7,.80]];
   for(const [dx,yy,scale]of positions)broodNode(x+dx+offset,yy,z+4.6,scale,v);
  }
  // Boss approach keeps the existing encounter and collision positions.
  const x=s.length;
  for(const side of [-1,1]){sinew([x-20,6.0,-10],[x-3,5.3+side*2.6,-7.4],.5,'#70414f',31,'artery');bone(x+side*4.9,0,-7.3,3.8,10.7,1.6,-side);}
 }
 function drawReactor(e,t){
  const angle=t*.43+e.seed*TAU,r=1.77;R.light(e.x,e.y,e.z+1.5,C.warm,13,7.5,1,true);
  for(let i=0;i<12;i++){const a=angle+i*TAU/12,px=e.x+Math.cos(a)*r,py=e.y+Math.sin(a)*r;
   B(px,py,e.z+.08,.74,.145,.17,i%2?'#778783':'#546c76',a+.58,0,0,35);}
  for(let i=0;i<3;i++){const a=-angle*.68+i*TAU/3;B(e.x+Math.cos(a)*2.16,e.y+Math.sin(a)*2.16,e.z+.30,.30,.085,.06,'#dfaa70',a+PI/2,0,0,22,1.05);}
 }
 function drawSac(e,t){const phase=t*1.65-e.x*.26+(e.variant||0),p=1+Math.sin(phase)*.023;
  A('organ'+e.variant,M(e.x,e.y,e.z,e.sx*p,e.sy*(2-p),e.sz*p),e.color,0,34);
  A('organVeins',M(e.x,e.y,e.z,e.sx*p*1.015,e.sy*(2-p)*1.012,e.sz*p*1.015),'#482832',0,31);
  if(e.y>0){const f=.72+.10*Math.sin(phase);A('organ'+e.variant,M(e.x,e.y+.10*e.sy,e.z+.42*e.sz,e.sx*.20,e.sy*.27,e.sz*.25),'#cf8a9b',f,22);R.light(e.x,e.y+.1,e.z+.65,'#cd8c9e',3.2,3.5,1,true);}
  const u=Environment.phase(t,e.seed,3.7),yy=e.y-e.sy*.42-u*u*1.28;
  if(yy>.10)S(e.x+.06,yy,e.z+e.sz*.22,.025,.065,.027,'#9f7d87',0,34);
 }
 return{energy,lair,drawReactor,drawSac,hardware:Object.freeze({plate,bolt,pipeRun,grill,brace,flange,light,mark,segment}),materialIDs:Object.freeze({tissue:31,bone:32,membrane:33,organ:34,alloy:35,coating:36})};
})();
