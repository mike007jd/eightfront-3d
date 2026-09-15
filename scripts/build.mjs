import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=f=>fs.readFileSync(path.join(root,'src',f),'utf8');
const {default: bundled}=await import('./bundle-three.mjs');
const library='<script id="threeEmbedded">\n'+bundled.replace(/<\/script/gi,'<\\/script')+'\n</script>';
// Every UI string key must exist in English (the fallback) and every locale must cover the same keys.
// Nested tables (stages, weapons, cue, …) must also match shape: same sub-keys, same array lengths.
{const I18N=new Function(read('i18n.js')+';return I18N;')(),en=Object.keys(I18N.en).sort();
 const shape=v=>Array.isArray(v)?'['+v.length+']':v&&typeof v==='object'?'{'+Object.keys(v).sort()+'}':typeof v;
 for(const [lang,table] of Object.entries(I18N)){const keys=Object.keys(table).sort();if(keys.join()!==en.join())throw Error(`i18n: ${lang} keys differ from en: ${keys.filter(k=>!en.includes(k)).concat(en.filter(k=>!keys.includes(k))).join(', ')}`);
  for(const [k,v] of Object.entries(table))if(shape(v)!==shape(I18N.en[k]))throw Error(`i18n: ${lang}.${k} shape differs from en`);}
 const used=new Set([...read('shell.html').matchAll(/data-i18n(?:-title|-label)?="([^"]+)"/g)].map(m=>m[1]));
 for(const f of fs.readdirSync(path.join(root,'src')))if(f.endsWith('.js')&&f!=='i18n.js')for(const m of read(f).matchAll(/\bt\('([^']+)'/g))used.add(m[1]);
 const missing=[...used].filter(k=>!(k in I18N.en));if(missing.length)throw Error('i18n: keys missing from en: '+missing.join(', '));}
const order=['geometry.js','biome-geometry.js','shaders.js','renderer-common.js','characters.js','renderer-three.js'];
let js="window.__SOURCE_HTML__='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;\nlet R;\n"+order.map(read).join('\n');
js+='\nasync function bootGame(){R=createRenderFacade(createThreeBackend(await loadThree()));\n'+['i18n.js','stages.js','game.js','environment.js','art-original.js','audio.js','combat-art.js','environment-assets.js','biome-assets.js','world.js','stage-previews.js','guidance.js','guidance-ui.js','app.js'].map(read).join('\n')+'\n}\n';
js+='bootGame().catch(err=>{window.__BOOT_STATUS__={state:"error",message:err.message};console.error(err);document.getElementById("loading").hidden=false;document.getElementById("loadMessage").textContent=err.message;document.getElementById("retry").hidden=false;});';
const html=read('shell.html').replace('<!--SCRIPTS-->',()=>library+'\n<script>\n'+js.replace(/<\/script/gi,'<\\/script')+'\n</script>');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','index.html'),html);
console.log('index.html',Buffer.byteLength(html),'bytes');
