import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,occupiedCells,tableSeatPositions,TABLE_SEATS} from '../pizza-layout.js';
import {blankRecipe} from '../pizza-recipe.js';
import {freshService,restoreService,advanceService,routePosition,servicePlacementIssue,tableKey} from '../pizza-service.js';
const offer={recipe:{...blankRecipe(),name:'Margherita',toppings:[{id:'mozzarella',form:1,x:160,y:160,angle:0}]},price:850,active:true};
const service=freshService();let balance=100000;const events=[];
function advance(seconds,offers=[offer],layout=DEFAULT_LAYOUT){const result=advanceService(service,seconds,layout,offers,balance);balance=result.balanceCents;events.push(...result.events);}
advance(1.9);assert.equal(service.groups.length,0);advance(.2);assert.equal(service.groups.length,1);const group=service.groups[0];assert.equal(group.phase,'arriving');assert.equal(group.size,2);
offer.active=false;offer.price=999; // An accepted order retains its original price.
for(let i=0;i<150&&group.phase!=='waiting';i++)advance(.1);
assert.equal(group.phase,'waiting');assert.equal(balance,100000-304);assert.equal(events.filter(e=>e.type==='cost').length,1);assert.equal(events.filter(e=>e.type==='payment').length,0);
for(let i=0;i<80&&group.phase!=='eating';i++)advance(.1);
assert.equal(group.phase,'eating');advance(5);assert.equal(group.phase,'eating');assert.equal(service.revenueCents,0);
for(let i=0;i<400&&group.phase!=='paying';i++)advance(.1);
assert.equal(group.phase,'paying');assert.equal(balance,100000-304+1700);assert.equal(service.servedGuests,2);assert.equal(events.filter(e=>e.type==='payment').length,1);assert.equal(service.payments[0].amount,1700);
const restored=restoreService(JSON.parse(JSON.stringify(service)));assert.deepEqual(restored,service);const after=advanceService(restored,10,DEFAULT_LAYOUT,[offer],balance);assert.equal(after.balanceCents,balance);assert.equal(after.events.length,0);assert.equal(restored.groups.length,0);assert.equal(restored.payments.length,0);
advance(100);assert.equal(events.filter(e=>e.type==='payment').length,1);
const running=freshService(),active={...offer,active:true,price:850};let cash=100000;
for(let i=0;i<1200;i++){
  const result=advanceService(running,.1,DEFAULT_LAYOUT,[active],cash);cash=result.balanceCents;
  const occupied=new Set(DEFAULT_LAYOUT.flatMap(occupiedCells)),reserved=running.groups.filter(g=>!['leaving','paying'].includes(g.phase)).map(g=>tableKey(g.table));assert.equal(new Set(reserved).size,reserved.length);
  for(const g of running.groups){assert(g.size<=g.table.seats);for(const p of g.route)assert(!occupied.has(`${p.x},${p.y}`));if(['arriving','leaving'].includes(g.phase)){const p=routePosition(g);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));}}
}
assert(running.servedGuests>2);assert.equal(cash,100000+running.netCents);assert.equal(running.netCents,running.revenueCents-running.costCents);assert.deepEqual(restoreService(JSON.parse(JSON.stringify(running))),running);
for(const seats of TABLE_SEATS)for(const r of [0,1,2,3]){const positions=tableSeatPositions({type:'table',x:2,y:3,seats,r});assert.equal(positions.length,seats);assert(positions.every(p=>p.r>=0&&p.r<4&&Number.isFinite(p.mealX)&&Number.isFinite(p.mealY)));}
for(const [layout,menu]of [[[],[active]],[DEFAULT_LAYOUT,[]],[DEFAULT_LAYOUT,[offer]]]){const empty=freshService(),result=advanceService(empty,120,layout,menu,100000);assert.equal(empty.groups.length,0);assert.equal(result.balanceCents,100000);}
const blocked=freshService();advanceService(blocked,2.1,DEFAULT_LAYOUT,[active],100000);assert(blocked.groups.length);const p=blocked.groups[0].route[0];assert.match(servicePlacementIssue({type:'plant',...p,r:0},blocked),/Laufweg/);
const small=freshService(),smallLayout=[{type:'table',seats:2,x:9,y:6,r:0}];assert(advanceService(small,180,smallLayout,[active],100000).events.filter(e=>e.type==='payment').length>3,'Small tables must continue receiving guests after a larger preferred party size.');
for(const raw of [null,{}, {...service,netCents:NaN},{...service,nextId:0},{...service,groups:Array(13).fill(group)}])assert.deepEqual(restoreService(raw),freshService());
console.log('Service passed: arrival, table reservations, accessible paths, seating timers, locked prices, ingredient costs, single payments, persisted checkout, capacity, continuous small-table service and empty/paused menus.');
