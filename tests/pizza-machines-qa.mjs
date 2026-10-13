import assert from 'node:assert/strict';
import {DEFAULT_LAYOUT,occupiedCells} from '../pizza-layout.js';
import {DEFAULT_PLAN,restaurantPlan,roomStep} from '../pizza-floorplans.js';
import {blankRecipe} from '../pizza-recipe.js';
import {freshService,restoreService,advanceService,servicePath,servicePlacementIssue} from '../pizza-service.js';
import {MACHINE_RULES,machineFront,machineKey,machinePosition,startMachineVisit,reconcileMachineVisits} from '../pizza-machines.js';
import {freshDaily,restoreDaily,currentReport,completeDay,reportMetrics} from '../pizza-daily.js';
const offer={recipe:{...blankRecipe(),name:'Margherita',toppings:[{id:'mozzarella',form:1,x:160,y:160,angle:0}]},price:850,active:true};
const machine=(type='arcade',r=0)=>({type,variant:type==='arcade'?'retro':'stereo',x:1,y:1,r});
function run(type='arcade',r=0){
 const layout=[...DEFAULT_LAYOUT,machine(type,r)],service=freshService(),events=[];let balance=100000;
 const tick=(seconds,menu=[])=>{const result=advanceService(service,seconds,layout,menu,balance);balance=result.balanceCents;events.push(...result.events);return result;};
 tick(2.1,[offer]);
 const until=(predicate,limit=1000)=>{for(let i=0;i<limit&&!predicate();i++)tick(.1);assert(predicate(),'Timed out: '+JSON.stringify(service));};
 return {service,layout,events,tick,until,balance:()=>balance};
}
for(const type of Object.keys(MACHINE_RULES))for(const r of [0,1,2,3]){
 const game=run(type,r),{service,layout,events,tick,until}=game;
 until(()=>service.machineGuests.length>0);const visitor=service.machineGuests[0],group=service.groups[0];
 assert.equal(group.phase,'leaving');assert.equal(visitor.id,group.id);assert(visitor.member<group.size);assert.deepEqual(visitor.route.at(-1),machineFront(layout.at(-1)));
 const used=new Set(layout.flatMap(occupiedCells));assert(visitor.route.every(p=>!used.has(`${p.x},${p.y}`)));assert(visitor.route.every((p,i)=>!i||roomStep(visitor.route[i-1],p,DEFAULT_PLAN)));
 const before=game.balance();until(()=>visitor.phase==='using');assert.equal(service.machineUses,1);assert.equal(service.machineRevenueCents,MACHINE_RULES[type].fee);assert.equal(events.filter(e=>e.kind==='machine').length,1);
 assert.equal(events.find(e=>e.kind==='machine').amount,MACHINE_RULES[type].fee);assert.equal(game.balance(),before+events.filter(e=>e.type==='payment').reduce((s,e)=>s+e.amount,0));
 assert.deepEqual(restoreService(structuredClone(service)),service,'Walking, paid usage and timers survive reload without changing accounting.');
 const loaded=restoreService(structuredClone(service)),result=advanceService(loaded,100,layout,[],game.balance());assert.equal(result.events.filter(e=>e.kind==='machine').length,0,'Reload cannot charge an inserted coin again.');
 assert.equal(loaded.machineGuests.length,0);assert.equal(loaded.groups.length,0);assert.equal(loaded.servedGuests,2);assert.equal(loaded.revenueCents,1700+MACHINE_RULES[type].fee);assert.equal(result.balanceCents,100000+loaded.netCents);
 tick(100);assert.equal(service.machineGuests.length,0);assert.equal(service.groups.length,0);assert.equal(service.machineUses,1);assert.equal(service.servedGuests,2);assert.equal(game.balance(),100000+service.netCents);
}
// A solo guest remains visible after their meal checkout and the main party record is gone.
{
 const game=run(),{service,layout,tick,until}=game;service.groups[0].size=1;until(()=>service.machineGuests.length>0);until(()=>service.groups.length===0);
 assert.equal(service.machineGuests.length,1);const loaded=restoreService(structuredClone(service));assert.deepEqual(loaded.machineGuests,service.machineGuests);
 const result=advanceService(loaded,100,layout,[],game.balance());assert.equal(loaded.machineGuests.length,0);assert.equal(loaded.servedGuests,1);assert.equal(loaded.machineUses,1);assert.equal(loaded.revenueCents,1050);assert.equal(result.balanceCents,100000+loaded.netCents);
}
// Continuous table reuse can coexist with independent visitors without duplicate fees or lost meals.
{
 const service=freshService(),layout=[...DEFAULT_LAYOUT,machine(),{...machine('jukebox'),x:4,y:1}],first=advanceService(service,500,layout,[offer],100000),last=advanceService(service,120,layout,[],first.balanceCents),events=[...first.events,...last.events],payments=events.filter(e=>e.type==='payment');
 assert.equal(new Set(payments.map(e=>e.id+':'+(e.kind||'meal'))).size,payments.length);assert(service.machineUses>2);assert(service.servedGuests>20);assert.equal(service.groups.length,0);assert.equal(service.machineGuests.length,0);assert.equal(last.balanceCents,100000+service.netCents);
 assert.equal(service.revenueCents,payments.reduce((s,p)=>s+p.amount,0));assert.equal(service.machineRevenueCents,payments.filter(p=>p.kind==='machine').reduce((s,p)=>s+p.amount,0));assert.equal(service.servedGuests,payments.filter(p=>p.kind!=='machine').reduce((s,p)=>s+p.amount/offer.price,0));
}
// An unreachable front, a wall, the kitchen floor or an occupied access tile never earns money.
for(const m of [machine('arcade',2),{...machine(),x:0,r:2},{...machine(),x:9,y:1},machine()]){
 const blocked=[...DEFAULT_LAYOUT,m,{type:'plant',...machineFront(m),r:0}],service=freshService();
 const group={id:1,size:2,route:[{x:7,y:5}]};startMachineVisit(service,group,blocked,DEFAULT_PLAN,servicePath);assert.equal(service.machineGuests.length,0);
}
for(const phase of ['walking','using'])for(const edit of ['sell','move','rotate']){
 const game=run(),{service,layout,tick,until}=game;until(()=>service.machineGuests[0]?.phase===phase);const visitor=service.machineGuests[0],charged=service.machineRevenueCents;
 assert.deepEqual(restoreService(structuredClone(service)),service);
 const old=layout.pop();if(edit==='move')layout.push({...old,x:4,y:1});if(edit==='rotate')layout.push({...old,r:1});
 const before=machinePosition(visitor);reconcileMachineVisits(service,layout,DEFAULT_PLAN,servicePath);assert.equal(visitor.phase,'leaving');assert(Math.hypot(before.x-machinePosition(visitor).x,before.y-machinePosition(visitor).y)<.8,'An edited machine sends the guest toward the exit from their current tile.');
 assert.deepEqual(restoreService(structuredClone(service)),service,'Canceled visits can be saved while the clock is paused.');tick(100);
 assert.equal(service.machineRevenueCents,charged);assert.equal(service.machineUses,phase==='using'?1:0);assert.equal(service.servedGuests,2);assert.equal(service.revenueCents,1700+charged);assert.equal(service.groups.length,0);assert.equal(service.machineGuests.length,0);assert.equal(game.balance(),100000+service.netCents);
}
// Capacity is per machine, even when groups share a table or two fronts share one tile.
{
 const service=freshService(),layout=[...DEFAULT_LAYOUT,machine(),{...machine('jukebox'),x:3,r:2}],group={id:1,size:2,route:[{x:7,y:5}]};service.nextId=8;
 startMachineVisit(service,group,layout,DEFAULT_PLAN,servicePath);startMachineVisit(service,{...group,id:4},layout,DEFAULT_PLAN,servicePath);assert.equal(service.machineGuests.length,1);
 startMachineVisit(service,{...group,id:2},layout,DEFAULT_PLAN,servicePath);assert.equal(service.machineGuests.length,1,'Most parties leave without visiting a machine.');
 const point=machinePosition(service.machineGuests[0]);assert.match(servicePlacementIssue({type:'plant',x:Math.round(point.x),y:Math.round(point.y),r:0},service),/Gast am Automaten/);
}
// Obstructions on future guest paths reroute or cancel the detour without teleporting across furniture.
{
 const game=run(),{service,layout,tick,until}=game;until(()=>service.machineGuests.length>0);const v=service.machineGuests[0];
 const blocked=v.route[Math.min(2,v.route.length-1)];layout.push({type:'plant',...blocked,r:0});reconcileMachineVisits(service,layout,DEFAULT_PLAN,servicePath);
 const used=new Set(layout.flatMap(occupiedCells));assert(v.route.every(p=>!used.has(`${p.x},${p.y}`)));tick(100);assert.equal(service.machineGuests.length,0);assert.equal(service.servedGuests,2);
}
// A temporarily enclosed guest waits visibly and resumes when the exit is reachable again.
{
 const game=run(),{service,layout,tick,until}=game;until(()=>service.machineGuests[0]?.phase==='using');const v=service.machineGuests[0],position=machinePosition(v),original=layout.splice(0);
 layout.push(...original.filter(m=>m.type!=='arcade'),...[{x:1,y:1},{x:2,y:0},{x:2,y:2},{x:3,y:1}].map(p=>({type:'plant',...p,r:0})));
 reconcileMachineVisits(service,layout,DEFAULT_PLAN,servicePath);assert.equal(v.blocked,true);assert.equal(v.phase,'leaving');assert.deepEqual(restoreService(structuredClone(service)),service);
 tick(20);assert.deepEqual(machinePosition(v),position);assert.equal(service.machineGuests.length,1);assert.equal(service.machineRevenueCents,200);assert.equal(service.machineUses,1);
 layout.splice(0,layout.length,...original.filter(m=>m.type!=='arcade'));tick(40);assert.equal(service.machineGuests.length,0);assert.equal(service.machineRevenueCents,200);assert.equal(service.servedGuests,2);
}
// Money is a subset of revenue, not another meal or another expense. Old ledgers stay intact.
{
 const game=run('jukebox'),profiles={'mamma-mia':{service:game.service}},staff={reserveCostCents:0,reserveDebtCents:0},daily=freshDaily(690,profiles,staff);
 game.tick(100);const m=reportMetrics(currentReport(daily,710,profiles,staff));assert.equal(m.machineRevenueCents,100);assert.equal(m.machineUses,1);assert.equal(m.revenueCents,1800);assert.equal(m.profitCents,1496);assert.equal(m.servedGuests,2);
 completeDay(daily,profiles,staff);assert.deepEqual(restoreDaily(structuredClone(daily),1440,profiles,staff),daily);
 const legacy=structuredClone(daily);for(const r of legacy.history)for(const b of Object.values(r.branches)){delete b.machineUses;delete b.machineRevenueCents;}for(const b of Object.values(legacy.current.branches)){delete b.baseline.machineUses;delete b.baseline.machineRevenueCents;}
 const loaded=restoreDaily(legacy,1440,profiles,staff);assert.equal(loaded.history.length,1);assert.equal(reportMetrics(loaded.history[0]).profitCents,1496);assert.equal(reportMetrics(loaded.history[0]).machineRevenueCents,0);assert.equal(loaded.current.since,1440);
 const raw=structuredClone(game.service);delete raw.machineGuests;delete raw.machineRevenueCents;delete raw.machineUses;const old=restoreService(raw);assert.equal(old.revenueCents,game.service.revenueCents);assert.equal(old.servedGuests,2);assert.deepEqual(old.machineGuests,[]);
 const corrupt=structuredClone(game.service);corrupt.machineGuests=[{id:1,machine:machine(),route:[]}];assert.equal(restoreService(corrupt).machineGuests.length,0);assert.equal(restoreService(corrupt).revenueCents,1800);
}
assert.equal(restaurantPlan('mamma-mia').area,120);
console.log('Machines passed: individual occasional visits, all four fronts, dining-only paths, occupancy, exact one-time fees and meal accounting, persisted detours, live sale/move/rotation, rerouting and cancellation, daily revenue and legacy ledger migration.');
