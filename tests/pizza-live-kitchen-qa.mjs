import assert from 'node:assert/strict';
import {restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {kitchenWorkFlow} from '../pizza-kitchen.js';
import {counterHandoff,counterSurfaces,workPath} from '../pizza-business.js';
import {freshService,restoreService,advanceService,servicePath,serviceLayoutIssue,servicePlacementIssue} from '../pizza-service.js';
import {reconcileProduction} from '../pizza-production.js';

const base=restaurantPlan('san-marco'),tiles=base.cells.filter(p=>p.x>=4&&p.x<=8&&p.y>=1&&p.y<=4).map(p=>({...p,paid:50})),plan=withKitchen(base,tiles);
const table={type:'table',x:1,y:5,r:0,seats:2},bar={type:'bar',x:6,y:2,r:0},fridge={type:'fridge',x:4,y:1,r:0},oven={type:'oven',x:5,y:1,r:0},items=[fridge,oven,bar,table];
const movedBar={...bar,x:6,y:3,r:2},movedFridge={...fridge,x:8,y:1},movedOven={...oven,x:5,y:2};
const flow=kitchenWorkFlow(tiles,items,plan);assert(flow);assert.equal(serviceLayoutIssue(items,plan),null);
const context={staff:{cook:1,waiter:1,open:false},employees:[{id:'chef',role:'cook'},{id:'server',role:'waiter'}],accepting:false,finishes:{},location:1};
const step=(s,seconds,layout=items,balance=1000000)=>advanceService(s,seconds,layout,[],balance,plan,context);
const reload=s=>restoreService(JSON.parse(JSON.stringify(s)),plan);
const dirty=()=>{const s=freshService();s.nextId=2;s.dirtyTables=[{id:1,table:{...table},size:2}];return s;};
const noBar=items.filter(i=>i.type!=='bar'),newBar=[...noBar,movedBar];assert.equal(serviceLayoutIssue(newBar,plan),null);

// No destination: leave plates at the table. Oven/fridge are irrelevant to clearing.
let s=dirty();step(s,15,noBar);assert.equal(s.dirtyTables.length,1);assert.equal(s.cleanedTables,0);assert.equal(s.waiterTasks.length,0);assert.equal(s.plateReturns.length,0);
step(s,30,[bar,table]);assert.equal(s.dirtyTables.length,0);assert.equal(s.cleanedTables,1);assert.equal(s.waiterTasks.length,0);assert.equal(s.costCents,0);assert.equal(s.revenueCents,0);

// Removing the counter during the walk freezes the clearing job, not the editor.
s=dirty();step(s,.5);assert(s.waiterTasks.some(t=>t.kind==='clear'));
reconcileProduction(s,noBar,plan);const clearing=structuredClone(s.waiterTasks[0]);assert.match(clearing.blocked,/Tresen/);
step(s,10,noBar);assert.deepEqual(s.waiterTasks[0],clearing);assert.equal(s.dirtyTables.length,1);assert.equal(s.cleanedTables,0);
s=reload(s);assert.deepEqual(s.waiterTasks[0],clearing);step(s,1,noBar);assert.deepEqual(s.waiterTasks[0],clearing);
reconcileProduction(s,newBar,plan);assert.equal(s.waiterTasks[0].blocked,undefined);assert.deepEqual(s.waiterTasks[0].flow.readySurface,counterSurfaces(movedBar).readySurface);
let returned=false;for(let i=0;i<400;i++){step(s,.1,newBar);if(s.plateReturns.length){returned=true;assert.deepEqual(s.plateReturns[0].position,counterSurfaces(movedBar).readySurface);}}
assert(returned);assert.equal(s.cleanedTables,1);assert.equal(s.dirtyTables.length,0);assert.equal(s.waiterTasks.length,0);

// A server already carrying plates keeps them through missing-target time and reload.
s=dirty();for(let i=0;i<200&&!s.waiterTasks.some(t=>t.kind==='return'&&t.plates);i++)step(s,.1);
assert.equal(s.cleanedTables,1);assert.equal(s.waiterTasks[0].plates,2);reconcileProduction(s,noBar,plan);
const returning=structuredClone(s.waiterTasks[0]);step(s,10,noBar);assert.deepEqual(s.waiterTasks[0],returning);assert.equal(s.cleanedTables,1);assert.equal(s.plateReturns.length,0);
s=reload(s);assert.equal(s.waiterTasks[0].plates,2);reconcileProduction(s,newBar,plan);returned=false;
for(let i=0;i<200;i++){step(s,.1,newBar);if(s.plateReturns.length){returned=true;assert.deepEqual(s.plateReturns[0].position,counterSurfaces(movedBar).readySurface);}}
assert(returned);assert.equal(s.cleanedTables,1);assert.equal(s.waiterTasks.length,0);

// Changed obstacles reroute staff through free cells, without reserving old walkways.
s=dirty();step(s,.1);const before=s.waiterTasks[0],oldCell=before.route[0],obstacle={...oven,x:5,y:3},rerouted=items.map(i=>i===oven?obstacle:i);
assert(before.route.some(p=>p.x===5&&p.y===3));assert(servicePlacementIssue(obstacle,s));assert.equal(servicePlacementIssue(obstacle,s,true),null);assert.equal(serviceLayoutIssue(rerouted,plan,null,items),null);
reconcileProduction(s,rerouted,plan);assert(!s.waiterTasks[0].route.some(p=>p.x===5&&p.y===3));assert(Math.abs(s.waiterTasks[0].route[0].x-oldCell.x)+Math.abs(s.waiterTasks[0].route[0].y-oldCell.y)<=1);
step(s,30,rerouted);assert.equal(s.cleanedTables,1);

const guestRoute=servicePath(items,plan.entrance,{x:3,y:5},plan);assert(guestRoute);
function order(stage){
 const s=freshService(),walk=workPath(items,plan.entrance,flow.fridge,plan),route=stage===0?[...walk,...flow.prep.slice(1)]:stage===1?flow.bake:stage===2?flow.pickup:[flow.handoff];s.nextId=2;s.costCents=125;s.netCents=-125;
 s.groups=[{id:1,size:1,table:{...table},phase:'waiting',route:guestRoute,progress:guestRoute.length-1,timer:0,eatDuration:20,order:{name:'Pizza',price:850,cost:125},charged:true,ate:false,paid:false,waited:0,work:{stage,cookId:'chef',flow,route,progress:0,hold:2,speed:1.2,...(stage===0?{fridgeVisited:false,fridgeAt:walk.length-1}:stage===1?{ovenReserved:true}:stage===2?{outputReserved:true}:{})}}];return s;
}
for(const [stage,type,replacement]of [[0,'fridge',movedFridge],[1,'oven',movedOven],[2,'bar',movedBar],[3,'bar',movedBar]]){
 s=order(stage);if(stage===1){s.groups[0].work.progress=s.groups[0].work.route.length-1;step(s,.2,items,1000000-125);assert(s.groups[0].work.hold<2,'Baking has actually begun before removal.');}const missing=items.filter(i=>i.type!==type),restored=[...missing,replacement];
 reconcileProduction(s,missing,plan);const held=structuredClone(s.groups[0].work);assert(held.blocked);
 let result=step(s,3,missing,1000000-125);assert.equal(s.groups[0].work.stage,stage);assert.deepEqual(s.groups[0].work,held);assert.equal(s.servedGuests,0);assert.equal(s.revenueCents,0);assert.equal(s.costCents,125);
 s=reload(s);assert.deepEqual(s.groups[0].work,held);reconcileProduction(s,restored,plan);assert.equal(s.groups[0].work.blocked,undefined);assert.equal(s.groups[0].work.hold,held.hold);
 if(type==='bar')assert.equal(s.groups[0].work.flow.stationKey,'6:3:2');if(type==='oven')assert.equal(s.groups[0].work.flow.ovenKey,'5:2');
 result=step(s,110,restored,result.balanceCents);assert.equal(s.groups.length,0,'Resume stage '+stage);assert.equal(s.servedGuests,1);assert.equal(s.costCents,125);assert.equal(s.revenueCents,850);assert.equal(s.cleanedTables,1);assert.equal(s.lostGuests||0,0);
 assert.equal(result.balanceCents,1000000+s.netCents-s.operatingCents);
}

// Delivery in progress uses the pizza already on the tray, even if all devices vanish.
s=order(3);Object.assign(s.groups[0].work,{started:true,waiterId:'server',deliveryStage:'deliver',route:workPath(items,flow.handoff,guestRoute.at(-1),plan),hold:.4});
let result=step(s,90,[table],1000000-125);assert.equal(s.servedGuests,1);assert.equal(s.revenueCents,850);assert.equal(s.costCents,125);assert.equal(s.dirtyTables.length,1);assert.equal(s.waiterTasks.length,0);assert.equal(s.cleanedTables,0);
step(s,30,[movedBar,table],result.balanceCents);assert.equal(s.dirtyTables.length,0);assert.equal(s.cleanedTables,1);

// An existing bad counter cannot forbid repairing other devices in that restaurant.
const building=restaurantPlan('mamma-mia'),kitchen=building.cells.filter(p=>p.x>=8&&p.y<4),room=withKitchen(building,kitchen),invalid=[{type:'bar',x:8,y:1,r:1},{type:'fridge',x:9,y:1,r:0},{type:'oven',x:11,y:2,r:0},{...table}];
assert.match(serviceLayoutIssue(invalid,room),/Wand/);const repair=invalid.map(i=>i.type==='fridge'?{...i,x:9,y:0}:i);assert.equal(serviceLayoutIssue(repair,room,null,invalid),null);
assert(counterHandoff([movedBar,table],plan));

// Removing one of two occupied ovens must not reserve the remaining oven twice.
const oven2={type:'oven',x:8,y:4,r:0},table2={...table,x:1,y:1},both=[...items,oven2,table2],one=both.filter(i=>i!==oven),ovenPoint={x:7,y:4};
s=order(1);s.groups[0].work.progress=s.groups[0].work.route.length-1;
const second=structuredClone(s.groups[0]);second.id=2;second.table=table2;second.route=servicePath(both,plan.entrance,{x:3,y:1},plan);second.progress=second.route.length-1;second.work.cookId='chef-2';second.work.flow={...flow,oven:ovenPoint,ovenKey:'8:4',bake:workPath(both,flow.counter,ovenPoint,plan,true),pickup:workPath(both,ovenPoint,flow.handoff,plan,true)};second.work.route=second.work.flow.bake;second.work.progress=second.work.route.length-1;s.groups.push(second);s.nextId=3;s.costCents=250;s.netCents=-250;
const twoCooks={...context,staff:{...context.staff,cook:2},employees:[...context.employees,{id:'chef-2',role:'cook'}]};
result=advanceService(s,.1,both,[],1000000-250,plan,twoCooks);reconcileProduction(s,one,plan);
for(let i=0;i<1200;i++){
 result=advanceService(s,.1,one,[],result.balanceCents,plan,twoCooks);
 assert(s.groups.filter(g=>g.work?.stage===1&&g.work.ovenReserved||g.work?.stage===2&&!g.work.outputReserved&&!g.work.pizzaCollected).length<=1,'An edited oven has one reservation.');
 assert(s.groups.filter(g=>g.work?.stage===2&&g.work.outputReserved||g.work?.stage===3&&g.work.outputReserved!==false&&(!g.work.started||g.work.deliveryStage==='pickup')).length<=1,'An edited handoff has one batch.');
}
assert.equal(s.servedGuests,2);assert.equal(s.costCents,250);assert.equal(s.revenueCents,1700);assert.equal(s.cleanedTables,2);assert.equal(result.balanceCents,1000000+s.netCents-s.operatingCents);
console.log('Live kitchen passed: missing/returned counter, paused clearing and carried plates across reload, independent cleanup, obstacle rerouting, all production stages with sold/moved targets, delivery without devices, exact ingredients/payments and repairing an existing inaccessible layout.');
