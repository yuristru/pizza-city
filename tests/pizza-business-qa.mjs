import assert from 'node:assert/strict';
import {restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {legacyKitchen,kitchenReadiness,kitchenWorkFlow} from '../pizza-kitchen.js';
import {kitchenWorkflow,workPath,demandScore,restoreBusiness,businessMetrics} from '../pizza-business.js';
import {freshService,advanceService,restoreService} from '../pizza-service.js';
const base=restaurantPlan('san-marco'),legacy=legacyKitchen(base),plan=withKitchen(base,legacy.tiles),items=[...legacy.items,{type:'table',x:1,y:5,r:0,seats:2,variant:'wood'}],menu=[{recipe:{name:'Margherita',sauce:'tomato',toppings:[]},price:850,active:true}],ctx={staff:{cook:1,waiter:1},location:1,finishes:{renovation:0}};
const ready=kitchenReadiness(legacy.tiles,items,plan);assert(ready.ready);const flow=kitchenWorkflow(items,plan,ready.cells);assert(flow);for(const route of [flow.prep,flow.bake,flow.pickup])for(const c of route)assert(plan.kitchenKeys.has(`${c.x},${c.y}`));
assert(workPath(items,plan.entrance,flow.counter,plan));assert.equal(kitchenWorkflow([...items,{type:'plant',x:6,y:3,r:0},{type:'plant',x:7,y:3,r:0},{type:'plant',x:5,y:3,r:0}],plan,ready.cells),null);
let service=freshService(),balance=100000;let stages=new Set();for(let i=0;i<2000;i++){const r=advanceService(service,.1,items,menu,balance,plan,ctx);balance=r.balanceCents;for(const g of service.groups)if(g.work)stages.add(g.work.stage);}
assert.equal(stages.size,4);assert(service.servedGuests>0);assert(service.staffCents>0&&service.propertyCents>0&&service.electricityCents>0);assert(service.rating>=1&&service.rating<=5);assert.equal(service.operatingCents,service.staffCents+service.propertyCents+service.electricityCents);assert.equal(balance,100000+service.netCents-service.operatingCents);assert(service.lostGuests>0);
const restored=restoreService(JSON.parse(JSON.stringify(service)),plan);assert.equal(restored.operatingCents,service.operatingCents);assert.equal(restored.rating,service.rating);assert.equal(restored.staffAccrued,service.staffAccrued);
const blocked=freshService();advanceService(blocked,30,items,menu,100000,plan,{...ctx,staff:{cook:0,waiter:1}});assert.equal(blocked.groups.length,0);
const broke=freshService();const r=advanceService(broke,300,items,[],0,plan,ctx);assert.equal(r.balanceCents,0);assert(broke.debtCents>0);const paid=advanceService(broke,1,items,[],100000,plan,ctx);assert.equal(broke.debtCents,0);assert(paid.balanceCents<100000);
assert(demandScore(service,menu,items,{},1)>demandScore(service,[{...menu[0],price:2400}],items,{},1));assert(demandScore(service,menu,items,{},1.3)>demandScore(service,menu,items,{},.8));
assert.deepEqual(restoreBusiness({cook:99,waiter:-1}),{cook:0,waiter:0,open:true});assert.deepEqual(restoreBusiness(null,true),{cook:1,waiter:1,open:true});assert.equal(restoreBusiness({cook:2,waiter:1,open:false}).open,false);
const m=businessMetrics({service,business:ctx.staff,items},plan);assert.equal(m.profit,service.netCents-service.operatingCents);assert(m.utilization>=0&&m.utilization<=100);
console.log('Business passed: staff routes and capacity, costs and debt, persistence, closed kitchens, demand, ratings and branch metrics.');

const island=restaurantPlan('palazzo-sole'),patches=[...Array.from({length:9},(_,i)=>({x:2+i%3,y:2+Math.floor(i/3)})),...Array.from({length:9},(_,i)=>({x:6+i%3,y:5+Math.floor(i/3)}))],multiple=withKitchen(island,patches),devices=[{type:'oven',x:2,y:2,r:0},{type:'bar',x:3,y:2,r:0},{type:'fridge',x:2,y:3,r:0},{type:'oven',x:6,y:5,r:0},{type:'bar',x:7,y:5,r:0},{type:'fridge',x:6,y:7,r:0}];assert(kitchenWorkFlow(patches,devices,multiple),'Any accessible complete kitchen can operate, even if another patch is blocked.');
