/* Deterministic quality budgets. No adaptive exposure or camera-pumping light.
 * This is an original forward HDR pipeline, not Unreal Engine or a ray tracer.
 * Values are conservative defaults, NOT a promise of FPS on untested hardware.
 */
const RenderProfiles=Object.freeze({
 low:Object.freeze({shadow:0,aoSamples:0,volumeSteps:0,bloomMips:0,localLights:4,distortion:0}),
 high:Object.freeze({shadow:1536,aoSamples:8,volumeSteps:8,bloomMips:3,localLights:8,distortion:1}),
 ultra:Object.freeze({shadow:2048,aoSamples:12,volumeSteps:12,bloomMips:4,localLights:8,distortion:1})
});

/* Production backend: Three.js r179 WebGL2, original forward HDR pipeline.
 * Emission MRT -> depth copy -> soft particles -> bilateral SSAO -> shadow-aware fog
 * -> multiscale selective bloom -> fixed ACES fit/sRGB -> display-space FXAA.
 * Not ray tracing, GI, SSR, temporal AA, or an Unreal renderer. */
function createThreeBackend(THREE){
 const canvas=document.getElementById('game');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
 renderer.debug.checkShaderErrors=true;renderer.debug.onShaderError=(gl,program,vs,fs)=>{throw new Error('Three.js shader compilation failed: '+gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(vs)+' '+gl.getShaderInfoLog(fs));};
 renderer.autoClear=false;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.info.autoReset=false;
 const scene=new THREE.Scene(),fxScene=new THREE.Scene(),waterScene=new THREE.Scene(),screen=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,220),screenCamera=new THREE.Camera();
 const vec3=(x=0,y=0,z=0)=>({value:new THREE.Vector3(x,y,z)}),scalar=v=>({value:v}),matrix=()=>({value:new THREE.Matrix4()});
 const common={uVP:matrix(),uLight:matrix(),uInvVP:matrix(),uRefraction:scalar(0),uShadowWorldTexel:scalar(.03125),uSceneColor:scalar(null),uWaterDepth:scalar(null),uWaterCount:scalar(0),uWaterImpact:{value:Array.from({length:8},()=>new THREE.Vector4())},uTime:scalar(0),uEye:vec3(),uShadows:scalar(1),uDepth:scalar(null),uFog:vec3(.23,.43,.44),uIndoor:scalar(0),uFogDensity:scalar(.018),uLightDir:vec3(-.48,1,.62),uKey:vec3(1.4,1.29,1.01),uHemiLow:vec3(.12,.19,.19),uHemiHigh:vec3(.43,.56,.65),uRim:vec3(.52,.56,.36),uWetness:scalar(0),uSoft:scalar(0),uVolume:scalar(0),uClay:scalar(0),uSceneDepth:scalar(null),uResolution:{value:new THREE.Vector2()},uLocalCount:scalar(0),uLocalPos:{value:Array.from({length:8},()=>new THREE.Vector4())},uLocalColor:{value:Array.from({length:8},()=>new THREE.Vector4())}};
 function material(v,f,uniforms={},extra={}){return new THREE.RawShaderMaterial({vertexShader:v.replace(/^#version[^\n]+\n/,''),fragmentShader:f.replace(/^#version[^\n]+\n/,''),glslVersion:THREE.GLSL3,uniforms,side:THREE.FrontSide,toneMapped:false,...extra});}
 const characters=createCommandoSystem(THREE,common),solid=material(Shaders.vertex,Shaders.fragment,common);
 const transparent=material(Shaders.vertex,Shaders.fragment,common,{side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation});
 const additive=material(Shaders.vertex,Shaders.fragment,common,{side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation});
 const foliage=material(Shaders.vertex,Shaders.fragment,common,{side:THREE.DoubleSide}),depth=material(Shaders.vertex,Shaders.depth,common,{polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 const screenGeo=new THREE.BufferGeometry();screenGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));const screenMesh=new THREE.Mesh(screenGeo,solid);screenMesh.frustumCulled=false;screen.add(screenMesh);
 function full(fragment,uniforms){return material(Shaders.screenVS,fragment,uniforms,{depthTest:false,depthWrite:false});}
 const skyU={uTime:scalar(0),uSkyLow:vec3(.47,.68,.67),uSkyHigh:vec3(.04,.21,.49),uIndoor:scalar(0)},sky=full(Shaders.sky,skyU);
 const copyU={tex:scalar(null)},depthCopy=full(Shaders.depthCopy,copyU);
 const colorCopyU={tex:scalar(null)},colorCopy=full(Shaders.colorCopy,colorCopyU);
 const aoU={depthTex:scalar(null),uInvVP:matrix(),uVP:matrix(),res:{value:new THREE.Vector2()},samples:scalar(8)},ao=full(Shaders.ao,aoU);
 const bilateralU={tex:scalar(null),depthTex:scalar(null),dir:{value:new THREE.Vector2()}},bilateral=full(Shaders.bilateral,bilateralU);
 const volU={depthTex:scalar(null),shadowTex:scalar(null),uInvVP:matrix(),uLight:common.uLight,eye:common.uEye,fog:common.uFog,key:common.uKey,lightDir:common.uLightDir,density:common.uFogDensity,indoor:common.uIndoor,shadowEnabled:common.uShadows,steps:scalar(8)},volume=full(Shaders.volume,volU);
 const brightU={tex:scalar(null),emission:scalar(null),threshold:scalar(.62)},bright=full(Shaders.bright,brightU);
 const downU={tex:scalar(null),texel:{value:new THREE.Vector2()}},down=full(Shaders.downsample,downU);
 const blurU={tex:scalar(null),dir:{value:new THREE.Vector2()}},blur=full(Shaders.blur,blurU);
 const postU={tex:scalar(null),emission:scalar(null),aoTex:scalar(null),volumeTex:scalar(null),depthTex:scalar(null),bloom0:scalar(null),bloom1:scalar(null),bloom2:scalar(null),bloom3:scalar(null),res:{value:new THREE.Vector2()},hurt:scalar(0),flash:scalar(0),uBloom:scalar(1),uAO:scalar(1),uVolume:scalar(1),exposure:scalar(1),bloomStrength:scalar(.20),uTime:common.uTime,uHeat:scalar(1),shadowTint:vec3(.96,1.,1.04),highlightTint:vec3(1.03,1.01,.97),heatCount:scalar(0),heatSources:{value:Array.from({length:4},()=>new THREE.Vector4())}},post=full(Shaders.post,postU);
 const fxaaU={tex:scalar(null),res:{value:new THREE.Vector2()}},fxaa=full(Shaders.fxaa,fxaaU);
 const hdr=renderer.extensions.has('EXT_color_buffer_float'),renderType=hdr?THREE.HalfFloatType:THREE.UnsignedByteType;
 function constant(r,g,b,a=255){const t=new THREE.DataTexture(new Uint8Array([r,g,b,a]),1,1,THREE.RGBAFormat);t.needsUpdate=true;return t;}
 const black=constant(0,0,0,0),white=constant(255,255,255);common.uSceneDepth.value=white;common.uWaterDepth.value=white;common.uSceneColor.value=black;
 let target,depthSnapshot,colorSnapshot,waterDepthSnapshot,aoA,aoB,volTarget,toneTarget,shadow,bloom=[],W=0,H=0,tier='',stats={},objects={},uploadedBytes=0,overrides={};
 const profiles=RenderProfiles;
 function register(name,b){
  const geo=new THREE.InstancedBufferGeometry(),vertices=new THREE.InterleavedBuffer(b.vertices,8),pos=new THREE.InterleavedBufferAttribute(vertices,3,0,false);
  geo.setAttribute('position',pos);geo.setAttribute('aPos',pos);geo.setAttribute('aNorm',new THREE.InterleavedBufferAttribute(vertices,3,3,false));geo.setAttribute('aUV',new THREE.InterleavedBufferAttribute(vertices,2,6,false));
  const isAlpha=name==='quad',isFX=isAlpha||name==='glow';const instances=new THREE.InstancedInterleavedBuffer(isAlpha?new Float32Array(b.data.length):b.data,24,1);instances.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iMat',new THREE.InterleavedBufferAttribute(instances,16,0,false));geo.setAttribute('iColor',new THREE.InterleavedBufferAttribute(instances,4,16,false));geo.setAttribute('iParams',new THREE.InterleavedBufferAttribute(instances,4,20,false));geo.instanceCount=0;
  const mat=isAlpha?transparent:name==='glow'?additive:['palm','leaf','frond','grass','fall','spillLip','flash','tensionWeb'].includes(name)?foliage:solid;const m=new THREE.Mesh(geo,mat);m.frustumCulled=false;m.renderOrder=isAlpha?1:name==='glow'?2:name==='fall'||name==='spillLip'?1:0;(['water','fall','spillLip'].includes(name)?waterScene:isFX?fxScene:scene).add(m);objects[name]={m,instances,isAlpha};
 }
 const rt=(w,h,type=renderType,extra={})=>new THREE.WebGLRenderTarget(Math.max(1,w),Math.max(1,h),{type,depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,...extra});
 function resize(w,h,quality,profile){
  if(w===W&&h===H&&quality===tier)return;W=w;H=h;tier=quality;renderer.setSize(w,h,false);
  for(const t of [target,depthSnapshot,colorSnapshot,waterDepthSnapshot,aoA,aoB,volTarget,toneTarget,shadow,...bloom.flat()])t?.dispose();bloom=[];
  target=rt(w,h,renderType,{count:2,depthBuffer:true});target.textures[0].name='HDR scene';target.textures[1].name='linear emission mask';
  target.depthTexture=new THREE.DepthTexture(w,h,THREE.UnsignedIntType);target.depthTexture.format=THREE.DepthFormat;
  depthSnapshot=rt(w,h,THREE.UnsignedByteType,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});toneTarget=rt(w,h,THREE.UnsignedByteType);
  colorSnapshot=rt(w,h);waterDepthSnapshot=depthSnapshot.clone();
  if(profile.aoSamples){aoA=rt(w>>1,h>>1,THREE.UnsignedByteType);aoB=aoA.clone();}else{aoA=aoB=null;}
  volTarget=profile.volumeSteps?rt(w>>1,h>>1):null;
  const shadowSize=profile.shadow||256;shadow=rt(shadowSize,shadowSize,THREE.UnsignedByteType,{depthBuffer:true,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});shadow.depthTexture=new THREE.DepthTexture(shadowSize,shadowSize,THREE.UnsignedIntType);shadow.depthTexture.format=THREE.DepthFormat;
  for(let i=0;i<profile.bloomMips;i++){const a=rt(w>>(i+2),h>>(i+2));bloom.push([a,a.clone()]);}
  common.uSceneDepth.value=depthSnapshot.texture;common.uSceneColor.value=colorSnapshot.texture;common.uWaterDepth.value=waterDepthSnapshot.texture;
 }
 function pass(mat,out){screenMesh.material=mat;renderer.setRenderTarget(out);renderer.render(screen,screenCamera);}
 function configure(options={}){overrides={...options};}
 function render(meshes,p){
  const profile=profiles[p.quality]||profiles.high;resize(p.width,p.height,p.quality,profile);renderer.info.reset();characters.update();
  camera.aspect=W/H;camera.fov=p.view==='depth'?42:34;camera.position.fromArray(p.eye);camera.lookAt(...p.at);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);uploadedBytes=0;
  const view=camera.matrixWorldInverse.elements;
  for(const [name,b] of Object.entries(meshes)){
   const o=objects[name];o.m.visible=b.n>0;o.m.geometry.instanceCount=b.n;if(!b.n)continue;let start=b.staticDirty?0:(b.staticN||0)*24;
   if(o.isAlpha){const order=Array.from({length:b.n},(_,i)=>i);order.sort((i,j)=>{const a=i*24+12,c=j*24+12;return(view[2]*b.data[a]+view[6]*b.data[a+1]+view[10]*b.data[a+2])-(view[2]*b.data[c]+view[6]*b.data[c+1]+view[10]*b.data[c+2]);});for(let i=0;i<order.length;i++)o.instances.array.set(b.data.subarray(order[i]*24,order[i]*24+24),i*24);start=0;}
   const count=b.n*24-start;if(count>0){o.instances.clearUpdateRanges();o.instances.addUpdateRange(start,count);o.instances.needsUpdate=true;uploadedBytes+=count*4;}
  }
  const theme=p.theme,look=theme.look||{};common.uLight.value.fromArray(p.light);common.uTime.value=p.t;common.uEye.value.fromArray(p.eye);
  for(const [key,fallback] of Object.entries({fog:[.23,.43,.44],lightDir:[-.48,1,.62],key:[1.40,1.29,1.01],hemiLow:[.12,.19,.19],hemiHigh:[.43,.56,.65],rim:[.52,.56,.36]}))common['u'+key[0].toUpperCase()+key.slice(1)].value.fromArray(theme[key]||fallback);
  common.uClay.value=overrides.clay?1:0;common.uIndoor.value=theme.indoor||0;common.uFogDensity.value=theme.fogDensity??.018;common.uWetness.value=look.wetness||0;common.uResolution.value.set(W,H);
  const enableAO=profile.aoSamples>0&&overrides.ao!==false,enableVolume=profile.volumeSteps>0&&overrides.volumetrics!==false,enableBloom=bloom.length>0&&overrides.bloom!==false;
  common.uShadowWorldTexel.value=48/(profile.shadow||256);
  const water=p.waterImpacts||[];common.uWaterCount.value=water.length;
  for(let i=0;i<water.length;i++){const w=water[i];common.uWaterImpact.value[i].set(w.x,w.y,w.z,w.r);}
  common.uDepth.value=shadow.depthTexture;common.uShadows.value=profile.shadow&&overrides.shadows!==false?1:0;common.uVolume.value=enableVolume?1:0;common.uSoft.value=0;
  // Score bounded emitters; reserve half the budget for environmental sources.
  const candidates=(p.lights||[]).filter(l=>l.radius>0&&l.intensity>0).map(l=>({...l,intensity:l.intensity*(l.pulse?.83+.17*Math.sin(p.t*1.7+l.x*.13+l.y*.21):1),score:l.intensity*l.radius/(4+Math.hypot(l.x-p.at[0],l.y-p.at[1],(l.z-p.at[2])*.55))}));
  const env=candidates.filter(l=>l.priority<2).sort((a,b)=>b.score-a.score),fx=candidates.filter(l=>l.priority>=2).sort((a,b)=>b.score-a.score);
  const budget=overrides.lights===false?0:profile.localLights,selected=[...fx.slice(0,Math.min(4,budget)),...env.slice(0,Math.max(0,budget-Math.min(4,fx.length)))].slice(0,budget);
  common.uLocalCount.value=selected.length;for(let i=0;i<selected.length;i++){const l=selected[i],c=Math3D.color(l.color);common.uLocalPos.value[i].set(l.x,l.y,l.z,l.radius);common.uLocalColor.value[i].set(c[0]*l.intensity,c[1]*l.intensity,c[2]*l.intensity,1);}
  if(common.uShadows.value){common.uVP.value.fromArray(p.light);scene.overrideMaterial=depth;renderer.setRenderTarget(shadow);renderer.setClearColor(0xffffff,1);renderer.clear();renderer.render(scene,camera);characters.depth(true);renderer.render(characters.scene,camera);characters.depth(false);scene.overrideMaterial=null;}
  common.uVP.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  common.uInvVP.value.copy(common.uVP.value).invert();
  renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();skyU.uTime.value=p.t;skyU.uSkyLow.value.fromArray(theme.skyLow||[.47,.68,.67]);skyU.uSkyHigh.value.fromArray(theme.skyHigh||[.04,.21,.49]);skyU.uIndoor.value=theme.indoor||0;
  pass(sky,target);renderer.render(scene,camera);renderer.render(characters.scene,camera);
  // Opaque scene incl. characters is complete. Water samples SEPARATE snapshots.
  // No FBO feedback, no refraction of a character standing in front of a river.
  const hasWater=waterScene.children.some(m=>m.visible);
  common.uRefraction.value=p.quality!=='low'&&overrides.refraction!==false?1:0;
  if(hasWater){
   copyU.tex.value=target.depthTexture;pass(depthCopy,waterDepthSnapshot);
   colorCopyU.tex.value=target.textures[0];pass(colorCopy,colorSnapshot);
   renderer.setRenderTarget(target);renderer.render(waterScene,camera);
  }
  // Copy while main FBO is NOT bound. Soft particles never sample an attached depth texture.
  copyU.tex.value=target.depthTexture;pass(depthCopy,depthSnapshot);common.uSoft.value=overrides.softParticles===false?0:1;renderer.setRenderTarget(target);renderer.render(fxScene,camera);common.uSoft.value=0;
  const invVP=common.uVP.value.clone().invert();
  if(enableAO){aoU.depthTex.value=target.depthTexture;aoU.uInvVP.value.copy(invVP);aoU.uVP.value.copy(common.uVP.value);aoU.res.value.set(W,H);aoU.samples.value=profile.aoSamples;pass(ao,aoA);bilateralU.depthTex.value=target.depthTexture;bilateralU.tex.value=aoA.texture;bilateralU.dir.value.set(1/aoA.width,0);pass(bilateral,aoB);bilateralU.tex.value=aoB.texture;bilateralU.dir.value.set(0,1/aoA.height);pass(bilateral,aoA);}
  if(enableVolume){volU.depthTex.value=target.depthTexture;volU.shadowTex.value=shadow.depthTexture;volU.uInvVP.value.copy(invVP);volU.steps.value=profile.volumeSteps;pass(volume,volTarget);}
  if(enableBloom){brightU.tex.value=target.textures[0];brightU.emission.value=target.textures[1];brightU.threshold.value=hdr?.62:.45;pass(bright,bloom[0][0]);
   for(let i=0;i<bloom.length;i++){const [a,b]=bloom[i];if(i>0){downU.tex.value=bloom[i-1][0].texture;downU.texel.value.set(1/bloom[i-1][0].width,1/bloom[i-1][0].height);pass(down,a);}blurU.tex.value=a.texture;blurU.dir.value.set(1/a.width,0);pass(blur,b);blurU.tex.value=b.texture;blurU.dir.value.set(0,1/a.height);pass(blur,a);}
  }
  postU.tex.value=target.textures[0];postU.emission.value=target.textures[1];postU.depthTex.value=target.depthTexture;postU.aoTex.value=enableAO?aoA.texture:white;postU.volumeTex.value=enableVolume?volTarget.texture:black;
  for(let i=0;i<4;i++)postU['bloom'+i].value=enableBloom?(bloom[i]?.[0].texture||bloom[bloom.length-1][0].texture):black;
  postU.res.value.set(W,H);postU.hurt.value=p.hurt;postU.flash.value=p.flash;postU.uBloom.value=enableBloom?1:0;postU.uAO.value=enableAO?.64:0;postU.uVolume.value=enableVolume?1:0;postU.exposure.value=look.exposure||1.;postU.bloomStrength.value=look.bloom??.21;postU.shadowTint.value.fromArray(look.shadows||[.96,1.,1.04]);postU.highlightTint.value.fromArray(look.highlights||[1.03,1.01,.97]);postU.uHeat.value=!p.reducedMotion&&profile.distortion&&overrides.distortion!==false?1:0;
  const heat=(p.heat||[]).slice(0,4);postU.heatCount.value=heat.length;
  for(let i=0;i<heat.length;i++){const h=heat[i],v=new THREE.Vector3(h.x,h.y,h.z).applyMatrix4(camera.matrixWorldInverse),s=new THREE.Vector3(h.x,h.y,h.z).project(camera);postU.heatSources.value[i].set(s.x*.5+.5,s.y*.5+.5,Math.min(140,h.radius*H/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(1,-v.z))),-v.z);}
  pass(post,toneTarget);fxaaU.tex.value=toneTarget.texture;fxaaU.res.value.set(W,H);pass(fxaa,null);
  stats={...characters.stats,drawCalls:renderer.info.render.calls,hdr,threeRevision:THREE.REVISION,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,uploadedBytes,alphaInstances:meshes.quad.n,additiveInstances:meshes.glow.n,localLights:selected.length,environmentLights:selected.filter(l=>l.priority<2).length,lightCandidates:candidates.length,aoSamples:enableAO?profile.aoSamples:0,volumeSteps:enableVolume?profile.volumeSteps:0,bloomMips:enableBloom?bloom.length:0,shadowSize:profile.shadow,emissionMRT:2,waterPass:hasWater,waterSceneCopy:hasWater,refraction:common.uRefraction.value===1,waterContacts:water.length,softParticles:true,output:'ACES-fit -> sRGB -> FXAA',quality:p.quality};
 }
 const gl=renderer.getContext(),info=gl.getExtension('WEBGL_debug_renderer_info');
 return{canvas,characters,setActors:(list,t,view)=>characters.set(list,t,view),name:'Three.js r'+THREE.REVISION,renderer,scene,fxScene,waterScene,camera,register,render,configure,
  // Read-only references are used for explicit rendering diagnostics, not gameplay state.
  get diagnostics(){return{target,depthSnapshot,colorSnapshot,waterDepthSnapshot,ao:aoA,volume:volTarget,bloom:bloom.map(a=>a[0]),shadow,tone:toneTarget,common};},get stats(){return stats;},device:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
}

/* No network requests or fallback renderer: the pinned official runtime is bundled at build time. */
async function loadThree(){
 const T=globalThis.THREE;
 if(!T||T.REVISION!=='179'||!T.WebGLRenderer)throw Error('Verified Three.js r179 runtime is missing. Rebuild the offline HTML.');
 window.__THREE__=T;
 window.__BOOT_STATUS__={state:'verified',engine:'Three.js',revision:T.REVISION,embedded:true};
 return T;
}
