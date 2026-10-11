import assert from 'node:assert/strict';
import {FLOORPLANS,roomCell,kitchenCell,boundaryEdges,restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {placementIssue,validLayout,guestCell,DEFAULT_LAYOUT} from '../pizza-layout.js';
import {freshService,advanceService,servicePath,restoreService} from '../pizza-service.js';
import {restoreRestaurants} from '../pizza-restaurant-profiles.js';
import {itemPrice} from '../pizza-catalog.js';
import {PROPERTIES} from '../pizza-properties.js';
const offer={recipe:{name:'Margherita',sauce:'tomato',toppings:[]},price:850,active:true};
for(const plan of Object.values(FLOORPLANS)){
 assert.equal(plan.area,plan.cells.length);assert.equal(plan.diningArea+plan.kitchenArea,plan.area);
 assert(roomCell(plan.entrance.x,plan.entrance.y,plan));assert(guestCell(plan.entrance.x,plan.entrance.y,plan));
 for(const {x,y}of plan.cells){
  if(kitchenCell(x,y,plan))assert(placementIssue({type:'plant',x,y,r:0},[],plan));
  if(guestCell(x,y,plan))assert(servicePath([],plan.entrance,{x,y},plan),`${plan.id}: disconnected ${x},${y}`);
 }
 if(plan.approach)assert(placementIssue({type:'plant',...plan.approach,r:0},[],plan));
 for(const e of boundaryEdges(plan))assert(roomCell(e.x,e.y,plan));
 const items=[];
 for(const pos of plan.cells){const table={type:'table',seats:4,...pos,r:0};if(!placementIssue(table,items,plan)){items.push(table);if(items.length===3)break;}}
 assert.equal(items.length,3);assert(validLayout(items,plan));
 const service=freshService();let cash=10000000;
 for(let i=0;i<1200;i++)cash=advanceService(service,.25,items,[offer],cash,plan).balanceCents;
 assert(service.servedGuests>0,`${plan.id}: no completed meals`);assert(service.groups.every(g=>g.route.every(p=>guestCell(p.x,p.y,plan))));
 assert.equal(restoreService(service,plan).netCents,service.netCents);assert.equal(restoreService(service,plan).groups.length,service.groups.length);
 assert.equal(cash,10000000+service.netCents);
 console.log(plan.id,plan.area+' m²',plan.kitchen.kind,service.servedGuests+' served');
}
assert.equal(new Set(PROPERTIES.map(p=>p.area)).size,9);
for(const p of PROPERTIES)assert.equal(p.area,restaurantPlan(p.id).area);
// A v6 room is relocated into its new footprint without losing furniture value.
const old=DEFAULT_LAYOUT.map(item=>({...item}));
const raw=Object.fromEntries(PROPERTIES.map(p=>[p.id,{items:old,service:freshService(),investmentCents:0}]));
const restored=restoreRestaurants(raw,PROPERTIES.map(p=>p.id),null);
for(const p of PROPERTIES){assert(validLayout(restored[p.id].items,withKitchen(restaurantPlan(p.id),restored[p.id].kitchenTiles)));assert.equal(restored[p.id].items.filter(i=>!'oven bar fridge'.split(' ').includes(i.type)).length,old.length);assert.equal(restored[p.id].floorPlanVersion,1);}
const roundtrip=restoreRestaurants(restored,PROPERTIES.map(p=>p.id),null);
for(const p of PROPERTIES)assert.deepEqual(roundtrip[p.id].items,restored[p.id].items);
console.log('Floor plans passed: exact areas, connected guest paths, fixed kitchens/doors, completed meals, v6 relocation and stable reload.');

const dense=[];for(const {x,y}of restaurantPlan('mamma-mia').cells){const item={type:'plant',x,y,r:0};item.paid=itemPrice(item);if(!placementIssue(item,dense))dense.push(item);}
const originalValue=dense.reduce((sum,item)=>sum+item.paid,0),migrated=restoreRestaurants({'san-marco':{items:dense,service:freshService(),investmentCents:originalValue*100}},['san-marco'],null)['san-marco'];
assert(migrated.migrationRefundCents>0);assert.equal(migrated.items.reduce((sum,item)=>sum+(item.paid||0)*100,0)+migrated.migrationRefundCents,originalValue*100);
assert.equal(restoreRestaurants({'san-marco':migrated},['san-marco'],null)['san-marco'].migrationRefundCents,0);
console.log('Dense old room migration passed: retained furniture plus full purchase refunds, applied only once.');

const activeService=freshService();let activeCash=10000000;
for(let i=0;i<80;i++)activeCash=advanceService(activeService,.25,DEFAULT_LAYOUT,[offer],activeCash).balanceCents;
assert(activeService.groups.length>0);
const converted=restoreRestaurants({'san-marco':{items:DEFAULT_LAYOUT,service:activeService,investmentCents:0}},['san-marco'],null)['san-marco'];
assert.equal(converted.service.groups.length,activeService.groups.length);assert.equal(converted.service.netCents,activeService.netCents);
assert(converted.service.groups.every(g=>g.route.every(p=>guestCell(p.x,p.y,restaurantPlan('san-marco')))));
for(let i=0;i<400;i++)activeCash=advanceService(converted.service,.25,converted.items,[offer],activeCash,restaurantPlan('san-marco')).balanceCents;
assert.equal(activeCash,10000000+converted.service.netCents);assert(converted.service.servedGuests>0);
console.log('Active service migration passed: orders retained, guest routes rebuilt and accounting preserved.');
