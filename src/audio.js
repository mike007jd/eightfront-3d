const AudioFX=(()=>{
 let ctx=null,master,music,fx,noiseBuf,enabled=true,next=0,step=0,voices=0,currentStage=-1;
 function init(){if(ctx){ctx.resume().catch(()=>{});return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=.42;master.connect(ctx.destination);fx=ctx.createGain();fx.gain.value=.6;fx.connect(master);music=ctx.createGain();music.gain.value=.16;music.connect(master);noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);let d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;next=ctx.currentTime;}
 function tone(freq,dur,volume=.3,type='square',end=null,when=null,dest=fx){if(!ctx||!enabled||voices>=48)return;voices++;let at=when??ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+dur);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(volume,at+.005);g.gain.exponentialRampToValueAtTime(.001,at+dur);o.connect(g);g.connect(dest);o.start(at);o.stop(at+dur+.01);o.onended=()=>{voices=Math.max(0,voices-1);o.disconnect();g.disconnect();};}
 function noise(dur,volume,freq,type='lowpass',when=null,dest=fx){if(!ctx||!enabled||voices>=48)return;voices++;let at=when??ctx.currentTime,o=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.buffer=noiseBuf;f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+dur);o.connect(f);f.connect(g);g.connect(dest);o.start(at,Math.random());o.stop(at+dur+.01);o.onended=()=>{voices=Math.max(0,voices-1);o.disconnect();f.disconnect();g.disconnect();};}
 function play(kind){if(!ctx||!enabled)return;switch(kind){
 case'guideHit':tone(780,.035,.035,'sine',560);break;
 case'guideArmor':tone(1320,.05,.06,'triangle',760);break;
 case'guideBreak':tone(580,.08,.075,'triangle',1280);noise(.05,.04,4200,'highpass');break;
 case'guideBlocked':tone(200,.07,.05,'sine',125);break;
 case'snowStep':noise(.115,.085,2100,'bandpass');tone(105,.07,.025,'triangle',65);break;
 case'snowLand':noise(.23,.16,1550,'lowpass');tone(85,.14,.05,'sine',40);break;
 case'stoneStep':noise(.045,.035,3400,'highpass');break;
 case'stoneLand':noise(.12,.075,1350);break;
 case'woodStep':tone(145,.055,.04,'triangle',75);noise(.035,.028,1600);break;
 case'woodLand':tone(115,.13,.07,'triangle',48);break;
 case'metalStep':noise(.035,.026,3800,'highpass');tone(420,.045,.023,'triangle',260);break;
 case'metalLand':noise(.09,.06,2300);tone(150,.11,.045,'triangle',60);break;
 case'organicStep':noise(.065,.03,700);break;
 case'organicLand':noise(.13,.07,520);break;
 case'R':noise(.095,.20,3100,'highpass');tone(175,.10,.16,'triangle',55);break;case'M':noise(.042,.15,6200,'highpass');tone(245,.04,.10,'square',100);break;case'slam':noise(.36,.55,430);tone(75,.38,.48,'sine',25);break;case'armor':tone(1550,.065,.12,'triangle',700);break;case'S':noise(.13,.38,2000);tone(120,.12,.28,'sawtooth',35);break;case'L':tone(970,.19,.14,'sawtooth',160);tone(1450,.13,.09,'sine',500);break;case'F':noise(.14,.28,650);break;case'jump':tone(165,.12,.14,'triangle',440);break;case'hit':noise(.055,.2,5000);break;case'explode':noise(.5,.75,720);tone(90,.4,.55,'sine',24);break;case'hurt':noise(.2,.40,1300);tone(220,.3,.25,'sawtooth',35);break;case'pickup':[440,660,880].forEach((f,i)=>tone(f,.12,.22,'triangle',null,ctx.currentTime+i*.07));break;case'swap':tone(600,.07,.12,'triangle',1000);break;case'warning':tone(330,.16,.17,'square',280);break;case'win':[392,494,587,784].forEach((f,i)=>tone(f,.6,.22,'triangle',null,ctx.currentTime+i*.15));break;}}
 const themes=[
  {root:40,beat:.112,lead:'triangle',notes:[0,7,10,7,0,3,5,7]},
  {root:38,beat:.124,lead:'square',notes:[0,0,1,7,0,6,1,7]},
  {root:43,beat:.116,lead:'triangle',notes:[0,3,7,10,12,10,7,3]},
  {root:37,beat:.104,lead:'square',notes:[0,6,7,1,0,7,6,1]},
  {root:45,beat:.140,lead:'sine',notes:[0,7,12,10,3,10,7,2]},
  {root:36,beat:.102,lead:'sawtooth',notes:[0,0,7,0,1,0,10,7]},
  {root:38,beat:.109,lead:'square',notes:[0,7,0,3,5,3,7,10]},
  {root:35,beat:.129,lead:'sine',notes:[0,1,6,7,0,6,1,10]}
 ];
 function tick(active,boss=false,stage=0){if(!ctx||!enabled)return;
  if(!active){next=ctx.currentTime+.08;return;}stage=Math.max(0,Math.min(7,stage|0));
  if(currentStage!==stage){currentStage=stage;step=0;next=ctx.currentTime+.04;}
  if(next<ctx.currentTime-.3)next=ctx.currentTime;
  const th=themes[stage],beat=th.beat*(boss?.88:1);
  while(next<ctx.currentTime+.13){const note=th.notes[Math.floor(step/2)%8],midi=th.root+(step%4===2?7:0),freq=440*2**((midi-69)/12);
   tone(freq,beat*.75,.24,'triangle',null,next,music);
   if(step%4===0)tone(95,.15,.58,'sine',28,next,music);
   if(step%8===4)noise(.10,.32,1600,'highpass',next,music);
   if(step%2===0)noise(.025,.08,7600,'highpass',next,music);
   if(step%2===0)tone(440*2**((th.root+24+note-69)/12),beat*1.45,boss?.15:.11,th.lead,null,next,music);
   next+=beat;step++;
  }
 }

 function toggle(){enabled=!enabled;if(master)master.gain.setTargetAtTime(enabled?.42:0,ctx.currentTime,.025);return enabled;}
 return{init,play,tick,toggle,get enabled(){return enabled;},get ready(){return !!ctx;},get stats(){return {voices,stage:currentStage,context:ctx?.state||'uninitialized'};},themes};
})();



