const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'_site');
fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','manifest.json','styles/main.css','scripts/calculator.js','scripts/conversion.js','scripts/rate-sources.js','data/rates.json']){
 fs.mkdirSync(path.dirname(path.join(output,file)),{recursive:true});
 fs.copyFileSync(path.join(root,file),path.join(output,file));
}
