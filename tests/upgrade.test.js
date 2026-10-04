const {test}=require('node:test');
const assert=require('node:assert/strict');
const {effectiveRate,convert,convertBetween,withdrawal}=require('../scripts/conversion');
const {lookup}=require('../scripts/rate-sources');
const {parseBakai}=require('../scripts/collect-rates.cjs');
const near=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-8);
test('ATM converts local cash through OIF once, then applies percent or minimum in USD',()=>{
    const rate=effectiveRate('104.279999',false,'1.5');
    const usd=convertBetween(65000,2,1,[1/85.5,rate,NaN]);
    near(usd,65000/104.279999*1.015);
    const large=withdrawal(usd,1,'withdrawal',3);
    near(large.fee,usd*0.01);near(large.debit,usd*1.01);
    const small=withdrawal(100,1,'withdrawal',3);
    assert.equal(small.fee,3);assert.equal(small.debit,103);
    near(convertBetween(large.debit,1,0,[1/85.5,rate]),large.debit*85.5);
});
test('ATM budget reverses both fee branches and refuses a budget below the minimum',()=>{
    near(withdrawal(1010,1,'budget',3).cash,1000);
    assert.equal(withdrawal(103,1,'budget',3).cash,100);
    assert.equal(withdrawal(2,1,'budget',3),null);
    assert.equal(withdrawal(100,1,'withdrawal',-1),null);
    assert.deepEqual(withdrawal(0,1,'withdrawal',3),{cash:0,debit:0,fee:0});
});
test('ATM only needs valid rates along the selected cash/card path',()=>{
    assert.equal(convertBetween(100,1,2,[NaN,2,NaN]),200);
    assert.equal(convertBetween(200,2,1,[NaN,2,NaN]),100);
    assert.equal(convertBetween(100,0,2,[NaN,2]),null);
});
test('OIF matches the Visa calculator and reverse cost of the same chain',()=>{
    const rate=effectiveRate('104.279999',false,'1.5','surcharge');
    near(rate,104.279999/1.015);
    near(convert(100,0,[rate])[1],100*rate);
    near(convert(100*rate,1,[rate])[0],100);
});
test('inverse Unired quote, embedded fee, and withheld fee',()=>{
    near(effectiveRate('85,5',true,'0'),1/85.5);
    near(effectiveRate('102.738915',false,'1.5','embedded'),102.738915);
    near(effectiveRate('100',false,'1.5','withhold'),98.5);
    assert.ok(Number.isNaN(effectiveRate('100',false,'100','withhold')));
});
test('freshness and unavailable sources fail instead of using a manual or market substitute',()=>{
    const now=Date.parse('2026-10-04T10:00:00Z');
    const q={source:'bakai',from:'KGS',to:'USD',rate:1/87.5,available:true,fetchedAt:'2026-10-04T09:00:00Z'};
    const feed={schemaVersion:1,quotes:[q],providers:{}};
    assert.equal(lookup(feed,'bakai','KGS','USD',now).quote,q);
    assert.ok(lookup(feed,'visa','USD','RSD',now).error);
    assert.ok(lookup(feed,'bakai','KGS','USD',now+7*3600000).error);
    q.available=false;
    assert.ok(lookup(feed,'bakai','KGS','USD',now).error);
});
test('Bakai uses non-cash sell for buying USD and buy for selling USD',()=>{
    const data={latest_update_time:{last_execution:'2026-10-04T15:00:00'},result:[{USD:{non_cash:{buy:87,sell:87.5},cash:{buy:87.3,sell:87.8}}}]};
    const chunk='21:["$","div",null,{"data":'+JSON.stringify(data)+'}]';
    const html='<script>self.__next_f.push('+JSON.stringify([1,chunk])+')</script>';
    const quotes=parseBakai(html,'2026-10-04T10:00:00Z');
    near(quotes[0].rate,1/87.5);
    assert.equal(quotes[1].rate,87);
    assert.throws(()=>parseBakai('<h1>No currencies</h1>','2026-10-04T10:00:00Z'));
});

