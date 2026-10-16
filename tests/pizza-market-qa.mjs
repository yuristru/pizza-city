import assert from 'node:assert/strict';
import {DISTRICTS,CUSTOMER_TIERS,restaurantDistrict,customerAppeal,districtMarket,freshMarket,advanceMarket,claimCustomers,restoreMarket,purchaseMarket} from '../pizza-market.js';
import {SABOTAGE_ACTIONS,freshRivalry,executeSabotage,restoreRivalry,sabotageIssue,collectFine} from '../pizza-rivalry.js';
import {freshDaily,currentReport,completeDay,reportMetrics,restoreDaily} from '../pizza-daily.js';
const menu=[{active:true,price:850}],basic={items:[{type:'table',variant:'plastic',seats:4},{type:'oven'},{type:'bar'},{type:'fridge'}],finishes:{renovation:0},service:{rating:4},business:{cook:1,waiter:1}},premium={...basic,items:basic.items.map(i=>i.type==='table'?{...i,variant:'premium'}:i),finishes:{renovation:3}};
const center=restaurantDistrict('mamma-mia'),own={'mamma-mia':basic},single=districtMarket(center,own,menu),two=districtMarket(center,{...own,'piazza-limone':basic},menu);
assert.equal(DISTRICTS.length,7);assert.equal(CUSTOMER_TIERS.length,3);assert(single.participants[0].expected.every((n,i)=>n>two.participants[0].expected[i]));
assert.equal(districtMarket(center,{...own,'piazza-limone':{...basic,business:{open:false}}},menu).participants.length,1);
assert.deepEqual(districtMarket(center,{...own,'san-marco':basic},menu),single,'A different district cannot steal local demand.');
assert(customerAppeal(premium,menu).weights[2]>customerAppeal(basic,menu).weights[2]*20);
assert.deepEqual(customerAppeal(premium,[{active:true,price:1800}]).weights.slice(0,2),[0,0],'Overpriced pizzas do not attract cheaper segments.');
const river=restaurantDistrict('lungofiume');assert.equal(purchaseMarket('darsena',{'lungofiume':premium},menu,{},690,freshMarket(690)).own,2);
const east=restaurantDistrict('teatro'),competitorMarket=districtMarket(east,{'teatro':basic},menu),suppressed=districtMarket(east,{'teatro':basic},menu,{effects:{luigi:{until:2000,factor:.2}}},700);
assert(suppressed.participants.find(p=>p.id==='teatro').expected.reduce((a,b)=>a+b)>competitorMarket.participants.find(p=>p.id==='teatro').expected.reduce((a,b)=>a+b));
assert.deepEqual(districtMarket(east,{'teatro':basic},menu,{effects:{luigi:{until:700,factor:.2}}},700),competitorMarket,'Effects expire at their actual game time.');
const m=freshMarket(660),snapshots=[two];let claimed=0;
for(let seconds=0;seconds<3600;seconds++){
 advanceMarket(m,snapshots,1,660+seconds/5);
 for(const id of ['mamma-mia','piazza-limone'])if(claimCustomers(m,id,1,menu))claimed++;
}
assert(claimed>50);assert(m.used[center.id].every((n,i)=>n<=center.customers[i]+1e-8));
assert(claimed<=center.customers.reduce((a,b)=>a+b));
const loaded=restoreMarket(structuredClone(m),700,['piazza-limone']);assert.deepEqual(loaded,m,'Loading cannot refill today\'s customer pool.');
const before=structuredClone(m);advanceMarket(m,snapshots,100,1000);assert.deepEqual(m,before,'The break does not generate new clients.');
advanceMarket(m,snapshots,1,1440+660);assert.equal(m.day,1);assert(m.used[center.id].every(n=>n<10));
assert.deepEqual(restoreMarket(before,1440+660,['piazza-limone']),freshMarket(1440+660));
assert.deepEqual(restoreMarket({version:1,day:0,used:{zentrum:[-1,1,NaN]},credits:{'mamma-mia':[Infinity,0,0]}},700),freshMarket(700));
for(const action of SABOTAGE_ACTIONS){
 const r=freshRivalry(),cash=10000000,success=executeSabotage(r,'enzo',action.id,cash,700,.999);
 assert.equal(success.balanceCents,cash-action.costCents);assert.equal(r.effects.enzo.factor,action.factor);assert.equal(r.effects.enzo.until,700+action.duration);assert(sabotageIssue(r,'enzo',action.id,cash,701));assert.equal(executeSabotage(r,'enzo',action.id,cash,701,.999),null);
 assert.deepEqual(restoreRivalry(structuredClone(r)),r);
 const caught=freshRivalry(),result=executeSabotage(caught,'luigi',action.id,action.costCents+100,700,0);
 assert(result.caught);assert.equal(result.balanceCents,0);assert.equal(caught.debtCents,action.fineCents-100);assert(!caught.effects.luigi);
 assert.equal(collectFine(caught,action.fineCents).balanceCents,100);assert.equal(caught.debtCents,0);
 const poor=freshRivalry();assert.equal(executeSabotage(poor,'enzo',action.id,action.costCents-1,700,.5),null);assert.deepEqual(poor,freshRivalry());
}
assert.equal(executeSabotage(freshRivalry(),'missing','graffiti',1e7,700,.5),null);
const p={'mamma-mia':{service:{}}},staff={},r=freshRivalry(),daily=freshDaily(690,p,staff,{},r);
executeSabotage(r,'enzo','roaches',1e7,700,0);
assert.equal(reportMetrics(currentReport(daily,701,p,staff,{},r)).rivalryCents,4740000);
const report=completeDay(daily,p,staff,{},r);assert.equal(report.rivalryCents,4740000);assert.equal(reportMetrics(report).profitCents,-4740000);assert.equal(currentReport(daily,1441,p,staff,{},r).rivalryCents,0);
assert.deepEqual(restoreDaily(daily,1441,p,staff,{},r),daily);
console.log('Markets and rivalry passed: local finite pools, fair shared demand, budget/quality tiers, closed/distant branches, day/reload persistence, four priced actions, success/expiry/cooldown, exact fines/debt and daily accounting.');
