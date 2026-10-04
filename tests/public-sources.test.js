const test=require('node:test');
const assert=require('node:assert/strict');
const {parseVisa,latestAlbum}=require('../scripts/collect-rates.cjs');
const {lookup}=require('../scripts/rate-sources');
const visa='<title>VISA美元卡的塞尔维亚第纳尔汇率</title><a>USD - 美元卡</a><a>RSD - 塞尔维亚第纳尔</a><b class="card-brand-current-rate">0.00958957</b><span class="card-brand-rate-date">(10月04日)</span>';
test('Visa mirror validates the pair, date and original spending direction',()=>{
 const q=parseVisa(visa,'2026-10-04T10:00:00Z');
 assert.equal(q.from,'USD');assert.equal(q.to,'RSD');
 assert.equal(q.rawUsdPerUnit,0.00958957);
 assert.ok(Math.abs(q.rate/1.015-102.738915)<0.00004);
 assert.throws(()=>parseVisa(visa.replace('VISA美元卡的塞尔维亚第纳尔汇率','Wrong pair'),'2026-10-04T10:00:00Z'));
 assert.throws(()=>parseVisa(visa,'2026-10-10T10:00:00Z'),/stale/);
});
test('Visa supports JPY and rejects a mismatched spending currency',()=>{
 const html=visa.replaceAll('RSD','JPY').replace('0.00958957','0.00637104');
 const q=parseVisa(html,'2026-10-04T10:00:00Z','JPY');
 assert.equal(q.to,'JPY');assert.equal(q.rate,1/0.00637104);
 assert.throws(()=>parseVisa(html,'2026-10-04T10:00:00Z','RSD'),/pair/);
});
test('Downloading an old Curso publication never makes its quote fresh',()=>{
 const now=Date.parse('2026-10-04T10:00:00Z');
 const q={source:'multi',from:'RUB',to:'KGS',rate:1.03,available:true,fetchedAt:new Date(now).toISOString(),sourceUpdatedAt:'2026-10-04T05:00:00Z'};
 const feed={schemaVersion:1,quotes:[q]};
 assert.equal(lookup(feed,'multi','RUB','KGS',now).quote,q);
 q.sourceUpdatedAt='2026-10-02T05:00:00Z';
 assert.ok(lookup(feed,'multi','RUB','KGS',now).error);
});
test('Public album refuses old publications and changed image layout',()=>{
 const album='data-post="CursoUz/7076" '+Array.from({length:9},(_,i)=>`style="background-image:url('https://cdn4.telesco.pe/file/${i}.jpg')"`).join(' ')+' datetime="2026-10-04T05:02:36+00:00"';
 assert.equal(latestAlbum(album,'2026-10-04T10:00:00Z').images.length,9);
 assert.throws(()=>latestAlbum(album,'2026-10-07T10:00:00Z'),/stale/);
 assert.throws(()=>latestAlbum(album.replaceAll('https://cdn','https://unexpected'),'2026-10-04T10:00:00Z'),/layout/);
});
