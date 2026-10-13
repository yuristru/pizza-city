import assert from 'node:assert/strict';
import {restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {kitchenReadiness,kitchenWorkFlow} from '../pizza-kitchen.js';
import {counterSurfaces,workPath} from '../pizza-business.js';
import {advanceKitchenOrder} from '../pizza-production.js';
import {freshService,restoreService,advanceService,servicePath,serviceLayoutIssue} from '../pizza-service.js';
import {staffSchedule} from '../pizza-shifts.js';

// The pre-access-rule San Marco kitchen in the stuck-game screenshots.
const building=restaurantPlan('san-marco'),tiles=Array.from({length:9},(_,i)=>({x:5+i%3,y:2+Math.floor(i/3),paid:50})),plan=withKitchen(building,tiles);
const table={type:'table',x:1,y:5,r:0,seats:2},bar={type:'bar',x:5,y:4,r:0},items=[{type:'fridge',x:5,y:2,r:0},{type:'oven',x:6,y:2,r:0},bar,table];
const employees=[{id:'chef',role:'cook',restaurantId:'san-marco',shift:'lunch'},{id:'server',role:'waiter',restaurantId:'san-marco',shift:'lunch'}],staff={employees};
const context={staff:{cook:1,waiter:1,open:true},employees,accepting:false,finishes:{},location:1},menu=[{active:true,recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850}];
assert(kitchenReadiness(tiles,items,plan).ready);assert.equal(kitchenWorkFlow(tiles,items,plan),null);
assert.match(serviceLayoutIssue(items,plan),/Küchenplatte/);

let service=freshService();service.nextId=2;service.dirtyTables=[{id:1,table:{...table},size:2}];
service.revenueCents=1700;service.costCents=250;service.netCents=1450;service.servedGuests=2;
service=restoreService(JSON.parse(JSON.stringify(service)),plan);
assert(staffSchedule(staff,'san-marco',16*60+31,service).closing);
let result=advanceService(service,120,items,menu,1000000+1450,plan,context);
assert.equal(service.dirtyTables.length,0,'An old counter layout must not strand dirty tables at shift end.');
assert.equal(service.waiterTasks.length,0);assert.equal(service.cleanedTables,1);assert.equal(service.nextId,2);
assert.equal(service.revenueCents,1700);assert.equal(service.costCents,250);assert.equal(service.netCents,1450);
assert.equal(result.balanceCents,1000000+service.netCents-service.operatingCents);
assert.equal(staffSchedule(staff,'san-marco',16*60+55,service).working.length,0,'Staff can leave only after the old service and plate return finish.');

const fridge={x:5,y:3},counter={x:5,y:3},oven={x:7,y:2},handoff={x:6,y:3};
const flow={fridge,counter,oven,handoff,...counterSurfaces(bar),prep:workPath(items,fridge,counter,plan,true),bake:workPath(items,counter,oven,plan,true),pickup:workPath(items,oven,handoff,plan,true),stationKey:'5:4:0',ovenKey:'6:2:0'};
const guestRoute=servicePath(items,plan.entrance,{x:1,y:4},plan);assert(guestRoute);
for(const stage of ['arriving','waiting','eating',0,1,2,3,'pickup','deliver']){
 service=freshService();service.nextId=2;
 const arriving=stage==='arriving',eating=stage==='eating';
 const g={id:1,size:1,table:{...table},phase:arriving?'arriving':eating?'eating':'waiting',route:guestRoute,progress:arriving?0:guestRoute.length-1,timer:eating?20:0,eatDuration:20,order:{name:'Pizza',price:850,cost:125},charged:!arriving,ate:false,paid:false,waited:0};
 if(typeof stage==='number'||['pickup','deliver'].includes(stage)){
  const n=typeof stage==='number'?stage:3;
  g.work={stage:n,cookId:'chef',flow,route:n===0?flow.prep:n===1?flow.bake:n===2?flow.pickup:[handoff],progress:0,hold:1,speed:1.2};
  if(n===1)g.work.ovenReserved=true;if(n===2)g.work.outputReserved=true;
  if(typeof stage==='string')Object.assign(g.work,{started:true,waiterId:'server',deliveryStage:stage,route:stage==='deliver'?workPath(items,handoff,guestRoute.at(-1),plan):[handoff]});
 }
 service.groups=[g];service.costCents=arriving?0:125;service.netCents=-service.costCents;
 service=restoreService(JSON.parse(JSON.stringify(service)),plan);assert.equal(service.groups.length,1,'Reload keeps accepted '+stage+' orders.');
 if(g.work)assert.deepEqual(service.groups[0].work,g.work);
 const startBalance=1000000-service.costCents;
 result=advanceService(service,120,items,menu,startBalance,plan,context);
 assert.equal(service.groups.length,0,String(stage));assert.equal(service.dirtyTables.length,0,String(stage));assert.equal(service.waiterTasks.length,0,String(stage));
 assert.equal(service.servedGuests,1,'Complete the accepted order at '+stage);assert.equal(service.costCents,125,'Ingredients are charged once at '+stage);assert.equal(service.revenueCents,850);assert.equal(service.cleanedTables,1);assert.equal(service.lostGuests||0,0);assert.equal(service.nextId,2);
 assert.equal(result.balanceCents,1000000+service.netCents-service.operatingCents,String(stage));
}

// A captured job continues even when no current workflow can be calculated.
service=freshService();const g={work:{stage:0,cookId:'chef',flow,route:flow.prep,progress:0,hold:.05,speed:1.2}};service.groups=[g];
advanceKitchenOrder(service,g,.1,items,plan,{...context,workflow:null});assert.equal(g.work.stage,1);

// An invalid kitchen must remain closed to new orders, even during a staffed shift.
service=freshService();advanceService(service,120,items,menu,1000000,plan,{...context,accepting:true});assert.equal(service.nextId,1);assert.equal(service.groups.length,0);assert.equal(service.costCents,0);

const partial=withKitchen(building,[...tiles,{x:5,y:5,paid:50}]),front=withKitchen(building,[...tiles,{x:5,y:5,paid:50},{x:6,y:5,paid:50}]),complete=withKitchen(building,[...tiles,{x:5,y:5,paid:50},{x:6,y:5,paid:50},{x:7,y:5,paid:50}]);
assert.match(serviceLayoutIssue(items,partial),/Küchenplatte/,'Strict admission and furniture checks still require both workplace plates.');
assert.equal(serviceLayoutIssue(items,partial,plan),null,'The first plate can repair an existing invalid kitchen incrementally.');
assert.equal(serviceLayoutIssue(items,front,partial),null);assert.equal(kitchenWorkFlow([...tiles,{x:5,y:5},{x:6,y:5}],items,front),null,'The new workplaces also need a kitchen-floor connection around the counter.');
assert.equal(serviceLayoutIssue(items,complete,front),null);assert(kitchenWorkFlow([...tiles,{x:5,y:5},{x:6,y:5},{x:7,y:5}],items,complete));
assert.match(serviceLayoutIssue(items,partial,complete),/Küchenplatte/,'Removing a required plate is never a floor expansion.');
const blockedGuestRoute=withKitchen(building,[...tiles,{...plan.entrance,paid:50}]);assert.match(serviceLayoutIssue(items,blockedGuestRoute,plan),/Laufweg/,'Repairing a kitchen still cannot block the guests.');
service=freshService();advanceService(service,120,items,menu,1000000,complete,{...context,accepting:true});assert(service.servedGuests>0,'Normal production resumes after both plates are laid.');
console.log('Service recovery passed: old-layout cleanup, all saved order phases, independent captured jobs, shift release, exact accounting, strict new admission and incremental floor repair without guest-path or removal bypasses.');
