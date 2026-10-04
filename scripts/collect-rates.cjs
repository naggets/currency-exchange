// Research collector: public pages only, no Telegram login or bot messages.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const {createWorker}=require('tesseract.js');
const {parseBakai}=require('./bakai-source.cjs');
const VISA_URL='https://www.kylc.com/huilv/i-visa/usd/rsd.html';
const CURSO_URL='https://t.me/s/CursoUz';
async function read(url,binary=false){
 const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error(`HTTP ${r.status}: ${new URL(url).hostname}`);
 return binary?Buffer.from(await r.arrayBuffer()):r.text();
}
function parseVisa(html,fetchedAt,currency='RSD'){
 if(!/^[A-Z]{3}$/.test(currency)||!/<title>VISA美元卡的/.test(html)||!html.includes('>USD -')||!html.includes(`>${currency} -`))throw Error('Unexpected Visa pair');
 const rate=Number(html.match(/class="card-brand-current-rate">([\d.]+)</)?.[1]);
 const date=html.match(/class="card-brand-rate-date">\((\d+)月(\d+)日\)/);
 if(!Number.isFinite(rate)||rate<=0||!date)throw Error('Missing Visa quote/date');
 const now=new Date(fetchedAt); let year=now.getUTCFullYear();
 let sourceDate=`${year}-${date[1].padStart(2,'0')}-${date[2].padStart(2,'0')}`;
 if(!Number.isFinite(Date.parse(sourceDate)))throw Error('Invalid Visa quote date');
 if(Date.parse(sourceDate)>now.getTime()+86400000)sourceDate=`${--year}-${date[1].padStart(2,'0')}-${date[2].padStart(2,'0')}`;
 if(now.getTime()-Date.parse(sourceDate)>3*86400000)throw Error('Visa mirror quote is stale');
 return {source:'visa',from:'USD',to:currency,rate:1/rate,available:true,fetchedAt,sourceDate,
  sourceUrl:`https://www.kylc.com/huilv/i-visa/usd/${currency.toLowerCase()}.html`,publisher:'Kylc (сторонняя копия Visa)',rawUsdPerUnit:rate,precisionDecimals:8,
  note:`Доступный расход в ${currency} для карты USD. Исходная котировка: расход ${currency} → списание USD. Копия округлена до 8 знаков; банковская комиссия не включена.`};
}
async function collectVisa(fetchedAt){
 const seed=await read(VISA_URL);
 const currencies=[...new Set(['rsd',...Array.from(seed.matchAll(/\/huilv\/i-visa\/usd\/([a-z]{3})\.html/g),m=>m[1])])];
 const quotes=[],failed=[];let next=0;
 async function run(){while(next<currencies.length){const currency=currencies[next++];try{
  const html=currency==='rsd'?seed:await read(`https://www.kylc.com/huilv/i-visa/usd/${currency}.html`);
  quotes.push(parseVisa(html,fetchedAt,currency.toUpperCase()));
 }catch(e){failed.push(currency.toUpperCase());}
 await new Promise(resolve=>setTimeout(resolve,150));}}
 await Promise.all([run(),run()]);
 if(!quotes.length)throw Error('No fresh Visa quotes');
 return {quotes,failed};
}
function latestAlbum(html,now){
 const start=html.lastIndexOf('data-post="CursoUz/');
 if(start<0)throw Error('No public album');
 const album=html.slice(start);
 const postId=album.match(/^data-post="CursoUz\/(\d+)"/)?.[1];
 const sourceUpdatedAt=album.match(/datetime="([^"]+)"/)?.[1];
 const age=Date.parse(now)-Date.parse(sourceUpdatedAt);
 if(!Number.isFinite(age)||age< -300000||age>36*3600000)throw Error('Public album is missing or stale');
 const images=[...album.matchAll(/background-image:url\('([^']+)'\)/g)].map(m=>m[1]).filter(u=>u.startsWith('https://cdn'));
 if(images.length!==9)throw Error('Public table layout changed: expected 9 images');
 return {postId,sourceUpdatedAt,images};
}
async function collectCurso(html,fetchedAt){
 const album=latestAlbum(html,fetchedAt);
 const images=await Promise.all(album.images.map(url=>read(url,true)));
 const worker=await createWorker('eng+rus',1,{cachePath:path.join(__dirname,'../.cache/ocr')});
 const candidates={unired:[],multi:[]}; const evidence=[];
 try{
  for(let i=0;i<images.length;i++){
   const meta=await sharp(images[i]).metadata();
   if(meta.width!==400||meta.height<400)throw Error('Unexpected image dimensions');
   const header=await sharp(images[i]).extract({left:0,top:0,width:400,height:115}).resize({width:1600}).png().toBuffer();
   await worker.setParameters({tessedit_pageseg_mode:'6'});
   const {data:heading}=await worker.recognize(header);
   const pair=/RUB/.test(heading.text)&&/KGS/.test(heading.text)?'KGS':/RUB/.test(heading.text)&&/USD/.test(heading.text)?'USD':null;
   if(!pair)continue;
   const printedDate=heading.text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
   if(!printedDate||`${printedDate[3]}-${printedDate[2]}-${printedDate[1]}`!==album.sourceUpdatedAt.slice(0,10))throw Error('Image date does not match publication date');
   await worker.setParameters({tessedit_pageseg_mode:'7'});
   const rows=[];
   for(let row=0;247+row*37+28<meta.height-25;row++){
    const image=await sharp(images[i]).extract({left:20,top:250+row*37,width:360,height:25}).resize({width:1440}).extend({top:20,bottom:20,left:20,right:20,background:'white'}).png().toBuffer();
    const {data}=await worker.recognize(image);
    const text=data.text.trim(); rows.push({text,confidence:data.confidence});
    const unired=pair==='USD'&&text.match(/^Unired\s+(\d+\.\d{2})\s/);
    const multi=pair==='KGS'&&text.match(/^Мультитрансфер\s*\(Элкарт\)\s+(\d+\.\d{2})\s/);
    if(unired&&data.confidence>=75)candidates.unired.push(Number(unired[1]));
    if(multi&&data.confidence>=80)candidates.multi.push(Number(multi[1]));
   }
   evidence.push({image:i+1,pair,header:heading.text.trim(),rows});
  }
 }finally{await worker.terminate();}

 const quotes=[];
 for(const source of ['unired','multi']){
  const values=candidates[source];
  if(!values.length||!values.every(v=>v===values[0]&&v>0))throw Error(`Missing or conflicting ${source} OCR values`);
  quotes.push({source,from:'RUB',to:source==='unired'?'USD':'KGS',rate:source==='unired'?1/values[0]:values[0],available:true,fetchedAt,
   sourceUpdatedAt:album.sourceUpdatedAt,sourceUrl:`https://t.me/s/CursoUz/${album.postId}`,publisher:'Curso (публичная утренняя таблица)',
   note:source==='unired'?`Строка Unired: ${values[0]} RUB за USD. Не строка Unired (UniversalBank).`:'Строка Мультитрансфер (Элкарт). Совпадение с МТС ELQR подтверждено пользователем 04.10.2026: 1,03 KGS/RUB, без комиссии.'});
 }
 return quotes;
}
async function collect(){
 const feed={schemaVersion:1,generatedAt:new Date().toISOString(),providers:{},quotes:[]};
 const outcomes=await Promise.allSettled([
  collectVisa(feed.generatedAt),
  read('https://bakai.kg/ru/').then(html=>parseBakai(html,feed.generatedAt)),
  read(CURSO_URL).then(html=>collectCurso(html,feed.generatedAt))
 ]);
 for(let i=0;i<outcomes.length;i++){
  const sources=[['visa'],['bakai'],['unired','multi']][i];const result=outcomes[i];
  if(result.status==='fulfilled'){
   feed.quotes.push(...(i===0?result.value.quotes:result.value));for(const source of sources)feed.providers[source]={status:'ok',message:source==='visa'?`Visa через Kylc: ${result.value.quotes.length} валют (8 знаков)`:source==='bakai'?'Официальный Бакай':'Публичная утренняя таблица Curso'};
   if(i===0)feed.providers.visa.unavailableCurrencies=result.value.failed;
  }else for(const source of sources)feed.providers[source]={status:'unavailable',message:result.reason.message};
 }
 await fs.mkdir(path.join(__dirname,'../data'),{recursive:true});
 await fs.writeFile(path.join(__dirname,'../data/rates.json'),JSON.stringify(feed,null,2)+'\n');
 console.log(JSON.stringify({generatedAt:feed.generatedAt,providers:feed.providers,quoteCount:feed.quotes.length,jpy:feed.quotes.find(q=>q.to==='JPY')}));
 if(feed.quotes.length===0)process.exitCode=1;
}
if(require.main===module)fs.mkdir(path.join(__dirname,'../.cache/ocr'),{recursive:true}).then(()=>collect()).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={parseVisa,latestAlbum,parseBakai};
