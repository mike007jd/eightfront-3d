import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pins={'three.core.js':'3ed693adea2a7e940c56d16b4bfa0e61041c076a','three.module.js':'6c6b8a0880aa505b5ffadea5a3d68b15d74698fa'};
const sources={};
for(const [file,pin] of Object.entries(pins)){
 const bytes=fs.readFileSync(path.join(root,'vendor',file));
 const actual=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 if(actual!==pin)throw Error(`Official Three.js r179 source fingerprint mismatch: ${file}`);
 sources[file]=bytes.toString();
}
// These two pinned distributions use named imports/exports only. Wrap each in its
// own scope. Never concatenate their declarations into one lexical environment.
const object=list=>list.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const a=x.split(/\s+as\s+/);return a.length===2?`${a[1]}:${a[0]}`:x;}).join(',');
let core=sources['three.core.js'],mod=sources['three.module.js'];
let coreExports;
core=core.replace(/^export \{([^}]+)\};?\s*$/gm,(_,s)=>{coreExports=object(s);return '';});
if(!coreExports)throw Error('Unexpected core export shape');
let reexports='',ownExports='';
mod=mod.replace(/^import \{([^}]+)\} from '\.\/three\.core\.js';\s*$/gm,(_,s)=>`const {${s}}=core;`);
mod=mod.replace(/^export \{([^}]+)\} from '\.\/three\.core\.js';\s*$/gm,(_,s)=>{reexports=s.split(',').map(x=>x.trim()).map(x=>{const a=x.split(/\s+as\s+/);return `${a[1]||a[0]}:core.${a[0]}`;}).join(',');return '';});
mod=mod.replace(/^export \{([^}]+)\};?\s*$/gm,(_,s)=>{ownExports=object(s);return '';});
if(!reexports||!ownExports||/^\s*(import|export) /m.test(mod+core))throw Error('Unexpected distribution module syntax');
const output=`/* Bundled from unmodified official Three.js r179 distributions. MIT license in vendor/THREE-LICENSE.txt. */\n(function(){\nconst core=(()=>{\n${core}\nreturn {${coreExports}};})();\nconst THREE=(()=>{\n${mod}\nreturn {${reexports},${ownExports}};})();\nif(typeof module!=='undefined'&&module.exports)module.exports=THREE;else globalThis.THREE=THREE;\n})();\n`;
fs.writeFileSync(path.join(root,'vendor','three.bundle.js'),output);
console.log('Verified and bundled official Three.js r179:',Buffer.byteLength(output),'bytes');
export default output;
