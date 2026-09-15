/* Original commando asset. Shared smooth geometry, eighteen-bone GPU skinning.
 * Art and rig are authored here, not downloaded character assets or sprite cards.
 * Independent absolute bone targets allow stable two-hand IK while the legs run. */
function createCommandoSystem(T, shared){
 const scene=new T.Scene(), library=createGeometryLibrary();
 const pos=[],normal=[],uv=[],colors=[],regions=[],surfaces=[],indices=[],weights=[];
 const bind=[[0,.99,0],[0,1.16,0],[0,1.73,0],[0,.98,.17],[0,.54,.17],[0,.15,.17],[0,.98,-.17],[0,.54,-.17],[0,.15,-.17],[0,1.55,.29],[0,1.15,.29],[0,.77,.29],[0,1.55,-.29],[0,1.15,-.29],[0,.77,-.29],[0,1.48,.10],[-.14,2.01,-.04],[-.33,1.98,-.04]];
 const skin='#dca37a',cloth='#526348',dark='#253a35',steel='#537078',hair='#45372c';
 const v3=a=>new T.Vector3(...a),m4=a=>new T.Matrix4().fromArray(a),linear=c=>Math3D.color(c);
 function vert(p,n,tex,col,bone=0,region=0,blend=null){pos.push(...p);normal.push(...n);uv.push(...tex);colors.push(...linear(col));regions.push(region);surfaces.push(bone===15?2:[skin,'#bd825e','#845b46'].includes(col)?14:15);indices.push(bone,blend?.[0]??bone,0,0);weights.push(1-(blend?.[1]||0),blend?.[1]||0,0,0);}
 function shape(type,x,y,z,sx,sy,sz,col,bone=0,region=0,rz=0,ry=0,rx=0){const data=library[type].vertices,mat=m4(Math3D.matrix(x,y,z,sx,sy,sz,rz,ry,rx)),nm=new T.Matrix3().getNormalMatrix(mat);for(let i=0;i<data.length;i+=8){const p=new T.Vector3(data[i],data[i+1],data[i+2]).applyMatrix4(mat),n=new T.Vector3(data[i+3],data[i+4],data[i+5]).applyMatrix3(nm).normalize();vert(p.toArray(),n.toArray(),[data[i+6],data[i+7]],col,bone,region);}}
 function ell(x,y,z,sx,sy,sz,col,bone=0,region=0){shape('sphere',x,y,z,sx,sy,sz,col,bone,region);}
 function box(x,y,z,sx,sy,sz,col,bone=0,region=0,rz=0,ry=0){shape('bevel',x,y,z,sx,sy,sz,col,bone,region,rz,ry);}
 // Smooth cross sections: [height, x-radius, z-radius, x-centre, z-centre].
 function loft(rings,col,bone,region=0,blendAt=null,sides=16){
  const point=(j,k)=>{const r=rings[j],a=k/sides*Math.PI*2;return [r[3]+Math.cos(a)*r[1],r[0],r[4]+Math.sin(a)*r[2]];};
  const norm=(j,k)=>{const a=k/sides*Math.PI*2,lo=rings[Math.max(0,j-1)],hi=rings[Math.min(rings.length-1,j+1)],r=rings[j],dy=hi[0]-lo[0]||.001;return v3([Math.cos(a)/Math.max(.005,r[1]),-((hi[1]-lo[1])*Math.cos(a)**2/Math.max(.005,r[1])+(hi[2]-lo[2])*Math.sin(a)**2/Math.max(.005,r[2]))/dy,Math.sin(a)/Math.max(.005,r[2])]).normalize().toArray();};
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<sides;k++)for(const [jj,kk]of [[j,k],[j+1,k],[j,k+1],[j,k+1],[j+1,k],[j+1,k+1]]){let bl=null;if(blendAt){const w=Math3D.clamp((blendAt[1]+blendAt[2]-rings[jj][0])/(2*blendAt[2]),0,1);bl=[blendAt[0],w];}vert(point(jj,kk),norm(jj,kk),[kk/sides,jj/(rings.length-1)],col,bone,region,bl);}
 }
 // Pelvis, fitted trouser legs, boot soles, kneecaps and seams.
 loft([[.88,.12,.18,0,0],[.93,.17,.26,0,0],[1.05,.17,.26,0,0],[1.10,.13,.21,0,0]],cloth,0,2);
 for(const [z,thigh,shin,foot]of [[.17,3,4,5],[-.17,6,7,8]]){
  loft([[.16,.09,.095,0,z],[.27,.10,.10,0,z],[.40,.118,.108,0,z],[.53,.125,.12,0,z],[.64,.132,.13,0,z],[.82,.155,.15,0,z],[.99,.14,.135,0,z]],cloth,thigh,2,[shin,.54,.10]);
  ell(.09,.53,z,.17,.26,.23,dark,shin);box(.16,.55,z,.07,.16,.21,'#76816b',shin);
  box(-.025,.82,z+(z>0?.145:-.145),.20,.23,.075,'#667353',thigh,2);
  for(const y of [.77,.89])box(.025,y,z+(z>0?.185:-.185),.17,.028,.026,'#8b9576',thigh);
  loft([[.065,.12,.125,.06,z],[.12,.13,.13,.055,z],[.21,.11,.115,.005,z],[.30,.105,.105,0,z]],'#35413a',foot);
  box(.075,.075,z,.40,.13,.29,'#202b29',foot);ell(.16,.14,z,.29,.17,.26,'#3f514a',foot);
  for(const yy of [.19,.23,.27])box(.11,yy,z,.026,.025,.15,'#8b9179',foot);
 }
 // Continuous athletic torso, narrow waist and broad tapered shoulders.
 loft([[1.03,.13,.20,0,0],[1.16,.145,.205,0,0],[1.31,.18,.245,0,0],[1.48,.20,.285,0,0],[1.60,.16,.28,0,0],[1.66,.115,.18,0,0]],skin,1);
 // Olive vest avoids disconnected skin spheres and gives a legible combat silhouette.
 loft([[1.10,.158,.222,-.004,0],[1.23,.18,.235,-.005,0],[1.47,.213,.293,0,0],[1.59,.167,.28,0,0]],cloth,1,3);
 for(const z of [-.16,.16]){box(.174,1.42,z,.075,.32,.105,dark,1,0,-.08);box(.205,1.43,z,.065,.24,.125,'#899176',1);box(.245,1.39,z,.025,.026,.112,'#bbb68e',1);}
 box(.188,1.18,0,.07,.16,.22,dark,1);box(.23,1.21,0,.03,.06,.16,'#b8ad7e',1);
 // Shoulder straps and rear webbing.
 for(const z of [-.21,.21])box(-.05,1.56,z,.32,.07,.085,'#809075',1);
 box(-.18,1.40,0,.10,.37,.35,dark,1);box(-.24,1.43,0,.04,.26,.28,'#677b62',1);
 box(0,1.03,0,.36,.12,.57,'#283c34',0);box(.194,1.035,0,.07,.115,.13,'#b5ac81',0);
 for(const z of [-.24,.24])box(.035,1.075,z,.17,.16,.12,'#788567',0);
 // Neck and an asymmetrical sculpted head: chin, cheeks, brows and nose, not a ball.
 loft([[1.61,.074,.082,0,0],[1.79,.080,.095,0,0]],skin,2);
 loft([[1.75,.08,.078,.040,0],[1.79,.106,.118,.045,0],[1.87,.139,.145,.025,0],[1.97,.143,.145,.003,0],[2.055,.117,.125,-.01,0],[2.10,.065,.076,-.03,0]],skin,2,0,null,18);
 for(const z of [-.147,.147]){ell(-.028,1.90,z,.068,.103,.042,'#bd825e',2);ell(.065,1.905,z*.94,.085,.085,.024,skin,2);box(.09,1.973,z*.97,.105,.026,.025,hair,2,0,.06);ell(.117,1.948,z*.985,.059,.029,.018,'#efedde',2);ell(.132,1.946,z*1.003,.025,.026,.015,'#25373b',2);}
 shape('rock',.155,1.917,0,.11,.145,.105,skin,2,0,0,0);box(.142,1.834,0,.035,.025,.15,'#845b46',2);ell(.128,1.798,0,.05,.043,.14,skin,2);
 // Close-cut hair cap with individually swept locks.
 loft([[1.99,.139,.152,-.02,0],[2.045,.149,.158,-.025,0],[2.12,.119,.129,-.05,0],[2.16,.045,.055,-.06,0]],hair,2);
 for(let i=0;i<7;i++){const z=(i-3)*.042;shape('rock',-.028,2.14+Math.sin(i*.6)*.02,z,.29,.11,.065,i%2?'#594532':hair,2,0,-.27,0);}
 // Team-colour band and cloth tails; GPU skinning keeps them on the head.
 loft([[1.995,.143,.154,-.013,0],[2.043,.145,.156,-.023,0]],'#449fc6',2,1);
 ell(-.157,2.02,-.045,.11,.09,.115,'#449fc6',2,1);
 shape('bevel',-.23,2.0,-.05,.22,.05,.075,'#449fc6',16,1,.18);
 shape('bevel',-.42,1.96,-.05,.22,.043,.065,'#449fc6',17,1,-.18);
 // Upper arm -> elbow -> forearm has a continuous skin-weight transition.
 for(const [z,upper,fore,hand]of [[.29,9,10,11],[-.29,12,13,14]]){
  loft([[.78,.068,.071,0,z],[.88,.085,.085,0,z],[1.05,.10,.095,0,z],[1.15,.105,.105,0,z],[1.27,.126,.116,0,z],[1.42,.14,.13,0,z],[1.56,.135,.13,0,z],[1.63,.055,.060,0,z]],skin,upper,0,[fore,1.15,.08]);
  ell(.02,1.43,z,.26,.27,.25,skin,upper);box(.0,1.35,z,.25,.058,.257,'#449fc6',upper,1);
  box(0,.86,z,.17,.12,.18,dark,fore);ell(0,.75,z,.18,.18,.18,dark,hand);
  for(let k=0;k<3;k++)box(.08,.735,z+(k-1)*.047,.07,.07,.038,'#6e7665',hand);
 }
 // One shared body, five cached weapon assemblies. No geometry allocation while switching.
 // Every assembly ends at the same gun-local muzzle socket (1.20, 1.48, .10).
 const bodyLengths=[pos,normal,uv,colors,regions,surfaces,indices,weights].map(a=>a.length);
 function assembleWeapon(type){
  const gun=15;
  box(.40,1.47,.10,.60,.15,.17,'#425661',gun);box(.16,1.445,.10,.25,.13,.16,'#202f38',gun);
  box(.34,1.355,.10,.09,.20,.11,'#263536',gun,0,-.18);box(.45,1.60,.10,.36,.035,.085,'#697d80',gun);
  box(.32,1.625,.10,.06,.08,.07,'#23383c',gun);
  if(type==='R'){
   box(.73,1.48,.10,.34,.17,.19,'#718783',gun);box(.58,1.35,.10,.13,.23,.115,'#283a3b',gun,0,-.22);
   for(let i=0;i<4;i++)box(.64+i*.065,1.51,.201,.027,.06,.016,'#283c44',gun);
   shape('cyl',1.04,1.48,.10,.062,.24,.062,'#a0aaa1',gun,0,Math.PI/2);
   shape('cyl',1.16,1.48,.10,.11,.08,.11,'#354b56',gun,0,Math.PI/2);
  }else if(type==='M'){
   box(.73,1.48,.10,.43,.22,.24,'#687b72',gun);shape('cyl',.53,1.29,.10,.28,.27,.28,'#384d58',gun,0,0,0,Math.PI/2);
   for(const z of [.045,.155])shape('cyl',1.065,1.48,z,.066,.27,.066,'#9eaaa2',gun,0,Math.PI/2);
   box(1.16,1.48,.10,.08,.14,.22,'#283940',gun);box(.78,1.59,.10,.35,.03,.26,'#b5b295',gun);
  }else if(type==='S'){
   box(.65,1.47,.10,.34,.20,.31,'#9a8459',gun);box(.61,1.33,.10,.23,.14,.27,'#3e5156',gun);
   for(const z of [-.01,.10,.21])shape('cyl',.99,1.48,z,.097,.42,.097,'#8c9588',gun,0,Math.PI/2);
   box(.97,1.575,.10,.26,.035,.36,'#695f48',gun);
  }else if(type==='L'){
   box(.74,1.48,.10,.46,.17,.18,'#354b61',gun);box(.60,1.34,.10,.12,.19,.13,'#50656e',gun);
   for(const y of [1.415,1.545])box(1.01,y,.10,.38,.047,.14,'#a7bab4',gun);
   for(let i=0;i<3;i++){box(.61+i*.105,1.50,.207,.048,.09,.025,'#5db8c2',gun);box(.61+i*.105,1.50,-.007,.048,.09,.025,'#5db8c2',gun);}
   box(1.155,1.48,.10,.09,.073,.073,'#a5f2ed',gun);
  }else{
   box(.68,1.48,.10,.38,.22,.25,'#967451',gun);
   for(const z of [-.035,.235])shape('cyl',.56,1.32,z,.16,.27,.16,'#485c5f',gun);
   shape('cyl',1.02,1.48,.10,.20,.36,.20,'#555f62',gun,0,Math.PI/2);
   for(let i=0;i<3;i++)box(.91+i*.08,1.50,.20,.018,.1,.035,'#c19b6d',gun);
   box(1.13,1.375,.10,.13,.035,.045,'#c79d55',gun);
  }
 }
 function makeGeometry(){const g=new T.BufferGeometry();
  for(const [name,array,size]of [['position',pos,3],['normal',normal,3],['uv',uv,2],['aColor',colors,3],['aRegion',regions,1],['aSurface',surfaces,1],['skinWeight',weights,4]])g.setAttribute(name,new T.Float32BufferAttribute(array,size));
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.computeBoundingSphere();return g;
 }
 const geometries={};for(const type of ['R','M','S','L','F']){[pos,normal,uv,colors,regions,surfaces,indices,weights].forEach((a,i)=>a.length=bodyLengths[i]);assembleWeapon(type);geometries[type]=makeGeometry();}
 const geometry=geometries.R;
 const vertex=`precision highp float;precision highp int;
 in vec3 position,normal,aColor;in vec2 uv;in float aRegion,aSurface;in vec4 skinIndex,skinWeight;
 uniform mat4 uBones[18],uModel,uVP,uLight;uniform vec3 uBand,uPants,uVest;uniform float uInv;
 out vec3 vPos,vNormal;flat out vec4 vColor,vParams;out vec4 vShadow;out vec2 vUV;
 void main(){mat4 sk=uBones[int(skinIndex.x)]*skinWeight.x+uBones[int(skinIndex.y)]*skinWeight.y;
 vec4 w=uModel*sk*vec4(position,1.);vPos=w.xyz;vNormal=normalize(mat3(uModel)*mat3(sk)*normal);
 vec3 c=aColor;if(aRegion>.5&&aRegion<1.5)c=uBand;else if(aRegion>1.5&&aRegion<2.5)c=uPants;else if(aRegion>2.5)c=uVest;
 vColor=vec4(c,0.);vParams=vec4(aSurface,uInv,1.,1.);vUV=uv;vShadow=uLight*w;gl_Position=uVP*w;}`;
 function makeActor(index){const bones=bind.map(p=>{const b=new T.Bone();b.position.fromArray(p);return b;}),root=new T.Group();bones.forEach(b=>root.add(b));root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skeleton.calculateInverses();
  const u={...shared,uBones:{value:Array.from({length:18},()=>new T.Matrix4())},uModel:{value:new T.Matrix4()},uInv:{value:0},uBand:{value:v3(linear(index%2?'#f5a94a':'#42c3e5'))},uPants:{value:v3(linear(index%2?'#343f52':'#364c59'))},uVest:{value:v3(linear(index%2?'#8c7964':'#78857a'))}};
  const opts={vertexShader:vertex,glslVersion:T.GLSL3,uniforms:u,side:T.FrontSide,toneMapped:false};const mat=new T.RawShaderMaterial({...opts,fragmentShader:Shaders.fragment.replace(/^#version[^\n]+\n/,'')}),depth=new T.RawShaderMaterial({...opts,fragmentShader:Shaders.depth.replace(/^#version[^\n]+\n/,'')});
  const mesh=new T.SkinnedMesh(geometry,mat);mesh.bind(skeleton,new T.Matrix4());mesh.frustumCulled=false;mesh.visible=false;mesh.name='Commando P'+(index+1);scene.add(mesh);return{mesh,bones,root,skeleton,u,mat,depth};
 }
 const actors=[makeActor(0),makeActor(1),makeActor(2),makeActor(3)];let pending=[],mode='side',clock=0;
 const down=new T.Vector3(0,-1,0),axis=new T.Vector3(0,0,1);
 function bonePose(actor,id,p,q=null,scale=null){const b=actor.bones[id];b.position.fromArray(p);b.quaternion.copy(q||new T.Quaternion());b.scale.set(1,1,1);if(scale)b.scale.fromArray(scale);}
 function limb(actor,id,a,b,len){const d=v3(b).sub(v3(a)),q=new T.Quaternion().setFromUnitVectors(down,d.clone().normalize());bonePose(actor,id,a,q,[1,d.length()/len,1]);}
 function ik(a,b,l1,l2,bend=[1,0,0]){const A=v3(a),d=v3(b).sub(A),len=Math.max(.001,Math.min(d.length(),l1+l2-.002));d.normalize();const pref=v3(bend).addScaledVector(d,-v3(bend).dot(d)).normalize(),along=(len*len+l1*l1-l2*l2)/(2*len),high=Math.sqrt(Math.max(0,l1*l1-along*along));return A.addScaledVector(d,along).addScaledVector(pref,high).toArray();}
 function updatePose(actor,p,t){
  const duck=!!p.duck,air=!p.grounded,run=Math.hypot(p.vx||0,p.vz||0)>.3,phase=(p.gaitDistance||0)*4.1+(actor===actors[1]?.6:0),bob=run&&!air?Math.abs(Math.sin(phase))*.025:0;
  for(let i=0;i<18;i++)bonePose(actor,i,bind[i]);
  let yaw=p.face<0?Math.PI:0,pitch=p.aim||0;
  if(mode==='depth'){const d=p.aimDirection||[0,0,-1];yaw=Math.atan2(-d[2],d[0]);pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));}else pitch=Math.atan2(Math.sin(pitch),Math.cos(pitch)*(p.face<0?-1:1));
  // Root faces the firing direction; pitch never turns the feet upside down.
  const model=m4(Math3D.matrix(p.x,p.y+(p.isCorpse?.4:0),p.z||0,1,1,1,p.isCorpse?-(p.deathAge||0)*3*(p.face||1):0,yaw));actor.u.uModel.value.copy(model);
  const land=Math.sin(Math.min(1,(p.landing||0)/.18)*Math.PI)*.105;
  const pelvis=duck?[-.36,.27,0]:[0,.99+bob-land,0],spine=duck?[-.20,.37,0]:[-(p.recoil||0)*.16,1.16+bob-land*.75,0],head=duck?[.28,.26,0]:[.015,1.73+bob-land*.60,0];
  bonePose(actor,0,pelvis,duck?new T.Quaternion().setFromAxisAngle(axis,-1.43):null);
  bonePose(actor,1,spine,duck?new T.Quaternion().setFromAxisAngle(axis,-1.35):new T.Quaternion().setFromEuler(new T.Euler(0,-.16,run?-.035:0)));bonePose(actor,2,head,duck?null:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.10));
  for(const [s,th,sh,ft]of [[1,3,4,5],[-1,6,7,8]]){const ph=phase+(s<0?Math.PI:0),hip=[pelvis[0],pelvis[1]-.01,s*.17];let ankle;
   if(duck)ankle=[-.98+(s<0?.09:0),.12,s*.17];else if(air)ankle=[s>0?-.26:.10,.53+(s<0?.13:0),s*.19];else ankle=[run?Math.sin(ph)*.39:(s>0?.20:-.22),.15+(run?Math.pow(Math.max(0,Math.cos(ph)),1.5)*.24:0),s*.17];
   const knee=ik(hip,ankle,.44,.39,[1,0,0]);limb(actor,th,hip,knee,.44);limb(actor,sh,knee,ankle,.39);bonePose(actor,ft,ankle,air?new T.Quaternion().setFromAxisAngle(axis,.20):null);
  }
  const gunY=duck?.60:1.48,pitchQ=new T.Quaternion().setFromAxisAngle(axis,pitch),gx=-Math.cos(pitch)*(p.recoil||0),gy=gunY-Math.sin(pitch)*(p.recoil||0);
  bonePose(actor,15,[gx,gy,.10],pitchQ);
  for(const [z,up,fo,ha,grip]of [[.29,9,10,11,[.37,-.11,.13]],[-.29,12,13,14,[.76,-.07,-.04]]]){
   const shoulder=duck?[-.055,.44,z]:[-(p.recoil||0)*.3,1.55+bob-land*.75,z],target=v3(grip).applyQuaternion(pitchQ).add(new T.Vector3(gx,gy,.10)).toArray(),elbow=ik(shoulder,target,.40,.38,[0,-1,.15]);limb(actor,up,shoulder,elbow,.40);limb(actor,fo,elbow,target,.38);bonePose(actor,ha,target,pitchQ);
  }
  const headDelta=v3(head).sub(v3(bind[2]));bonePose(actor,16,v3(bind[16]).add(headDelta).toArray(),new T.Quaternion().setFromAxisAngle(axis,Math.sin(t*10)*.14));bonePose(actor,17,v3(bind[17]).add(headDelta).toArray(),new T.Quaternion().setFromAxisAngle(axis,Math.sin(t*10-1)*.2));
  actor.root.updateMatrixWorld(true);actor.skeleton.update();for(let i=0;i<18;i++)actor.u.uBones.value[i].fromArray(actor.skeleton.boneMatrices,i*16);
 }
 return{scene,geometry,geometries,actors,set(list,t,view){pending=list||[];clock=t;mode=view;},update(){for(let i=0;i<4;i++){const a=actors[i],p=pending[i];a.mesh.visible=!!p&&(!p.dead||p.isCorpse)&&!(p.retroInput&&!p.isCorpse&&p.inv>0&&Math.floor(clock*15)%2===0);if(a.mesh.visible){a.mesh.geometry=geometries[p.weapon]||geometry;a.u.uInv.value=p.inv>0?(.55+.45*Math.sin(clock*10)):0;updatePose(a,p,clock);}}},depth(on){for(const a of actors)a.mesh.material=on?a.depth:a.mat;},get stats(){return{skinnedActors:actors.filter(a=>a.mesh.visible).length,characterTriangles:Math.max(...Object.values(geometries).map(g=>g.attributes.position.count/3)),bonesPerActor:18};}};
}
