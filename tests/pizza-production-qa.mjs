import assert from 'node:assert/strict';
import {restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {legacyKitchen,kitchenWorkFlow} from '../pizza-kitchen.js';
import {counterSurfaces,workPath} from '../pizza-business.js';
import {freshService,advanceService,restoreService,servicePath,tableKey,servicePlacementIssue} from '../pizza-service.js';
import {employeeBusy} from '../pizza-staff.js';
const base=restaurantPlan('san-marco'),k=legacyKitchen(base),plan=withKitchen(base,k.tiles),table={type:'table',x:1,y:5,r:0,seats:2},items=[...k.items,table,{type:'table',x:5,y:5,r:0,seats:2}],flow=kitchenWorkFlow(k.tiles,items,plan);
assert(flow);assert.notDeepEqual(flow.prepSurface,flow.readySurface);assert.notDeepEqual(flow.counter,flow.handoff);assert.deepEqual(flow.prep.at(-1),flow.counter);assert.deepEqual(flow.pickup.at(-1),flow.handoff);
for(const r of [0,1,2,3]){const surfaces=counterSurfaces({type:'bar',x:2,y:2,r});assert.notDeepEqual(surfaces.prepSurface,surfaces.readySurface);assert.equal(Math.abs(surfaces.prepSurface.x-surfaces.readySurface.x)+Math.abs(surfaces.prepSurface.y-surfaces.readySurface.y),1);}
const employees=[{id:'chef',restaurantId:'san-marco',role:'cook',skills:{preparation:50,baking:50,organization:50}},{id:'server',restaurantId:'san-marco',role:'waiter',skills:{pace:50,attention:50,friendliness:50}},{id:'chef-2',restaurantId:'san-marco',role:'cook',skills:{preparation:50,baking:50,organization:50}}],context={staff:{cook:2,waiter:1},employees,finishes:{},location:1},menu=[{active:true,recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850}];
let service=freshService(),balance=1000000,seen=new Set(),reloads=new Set(),lastEating=0;
for(let i=0;i<5000;i++){
 const r=advanceService(service,.1,items,menu,balance,plan,context);balance=r.balanceCents;
 for(const g of service.groups){if(g.work){const w=g.work;seen.add('stage-'+w.stage);if(w.stage===1&&w.progress===w.route.length-1)seen.add('baking');if(w.stage===3&&!w.started)seen.add('ready');if(w.stage===3&&w.deliveryStage==='pickup')seen.add('pickup');if(w.stage===3&&w.deliveryStage==='deliver')seen.add('delivery');
  const milestone=w.stage===3?w.deliveryStage||'ready':String(w.stage);if(!reloads.has(milestone)){const loaded=restoreService(JSON.parse(JSON.stringify(service)),plan);assert.deepEqual(loaded.groups.find(p=>p.id===g.id)?.work,w,'Production must survive a reload at '+milestone);service=loaded;reloads.add(milestone);}
 }if(g.phase==='eating'){seen.add('eating');lastEating=g.id;}if(g.phase==='arriving')assert(!service.dirtyTables.some(d=>tableKey(d.table)===tableKey(g.table)),'A dirty table cannot receive another group.');}
 if(service.dirtyTables.length){seen.add('dirty');assert(servicePlacementIssue(service.dirtyTables[0].table,service),'Placement must protect a dirty table.');}
 for(const t of service.waiterTasks){seen.add(t.kind);if(t.plates)seen.add('carried-plates');assert(employeeBusy(employees[1],{'san-marco':{service}}));}
 if(service.plateReturns.length)seen.add('returned-plates');
 const prep=service.groups.filter(g=>g.work&&(g.work.stage===0||g.work.stage===1&&!g.work.ovenReserved));assert(prep.length<=1,'Only one cook may occupy this preparation surface.');
 if(service.groups.filter(g=>g.work?.stage<3).length>1)seen.add('shared-resources');
 const oven=service.groups.filter(g=>g.work&&(g.work.stage===1&&g.work.ovenReserved||g.work.stage===2&&!g.work.outputReserved));assert(oven.length<=1,'The oven cannot contain two batches.');
 const ready=service.groups.filter(g=>g.work&&(g.work.stage===2&&g.work.outputReserved||g.work.stage===3&&(!g.work.started||g.work.deliveryStage==='pickup')));assert(ready.length<=1,'A ready pizza must not be overwritten.');
 const activeServers=service.groups.filter(g=>g.work?.stage===3&&g.work.started).map(g=>g.work.waiterId).concat(service.waiterTasks.map(t=>t.employeeId));assert.equal(new Set(activeServers).size,activeServers.length);
}
for(const stage of ['stage-0','stage-1','stage-2','stage-3','baking','ready','pickup','delivery','eating','dirty','clear','return','carried-plates','returned-plates','shared-resources'])assert(seen.has(stage),'Missing production step '+stage);
assert(service.cleanedTables>3);assert(lastEating>3);assert.equal(balance,1000000+service.netCents-service.operatingCents,'The chain must keep ingredient and payment accounting exact.');
// A return with used plates and a ready pizza share the handoff, not the prep surface.
service=freshService();service.nextId=2;
const guestRoute=servicePath(items,plan.entrance,{x:1,y:4},plan);assert(guestRoute);
const g={id:1,size:1,table:{...table},phase:'waiting',route:guestRoute,progress:guestRoute.length-1,timer:0,eatDuration:20,order:{name:'Pizza',price:850,cost:125},charged:true,ate:false,paid:false,waited:0,work:{stage:3,cookId:'chef',flow,route:[flow.handoff],progress:0,hold:0,speed:1.2}};
service.groups=[g];service.waiterTasks=[{kind:'return',employeeId:'server',plates:2,flow,route:[flow.handoff],progress:0,hold:0,speed:1.2}];
const returned=restoreService(JSON.parse(JSON.stringify(service)),plan);assert.equal(returned.waiterTasks[0].plates,2);assert(employeeBusy(employees[1],{'san-marco':{service:returned}}));
advanceService(returned,.1,items,[],1000000,plan,{...context,staff:{cook:1,waiter:1,open:false}});assert.equal(returned.waiterTasks.length,0);assert.equal(returned.plateReturns.length,1);assert.deepEqual(returned.plateReturns[0].position,flow.readySurface);assert.equal(returned.groups[0].work.waiterId,'server');assert.equal(returned.groups[0].work.deliveryStage,'pickup');assert.deepEqual(returned.groups[0].work.route,[flow.handoff]);
assert(workPath(items,flow.handoff,guestRoute.at(-1),plan));
console.log('Production passed: two rotated counter surfaces, prep/oven/output exclusivity, baking and pickup, plates/clean tables, continuous rounds, immediate next pickup, staff busy guards, saved jobs and exact costs/payments.');
