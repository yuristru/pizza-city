import {ratingDemand} from './pizza-quality.js?v=20261018-demo1';
import {MONTH_HOURS} from './pizza-staff.js?v=20261018-demo1';
import {roomCell,roomStep} from './pizza-floorplans.js?v=20261018-demo1';
import {occupiedCells} from './pizza-layout.js?v=20261018-demo1';
export const STAFF={cook:{name:'Koch',hourly:12},waiter:{name:'Service',hourly:8}};
export function freshBusiness(){return {cook:0,waiter:0};}
export function restoreBusiness(raw,legacy=false){return {...Object.fromEntries(Object.keys(STAFF).map(k=>[k,Number.isInteger(raw?.[k])&&raw[k]>=0&&raw[k]<=4?raw[k]:legacy?1:0])),open:raw?.open!==false};}
export function operatingRates(business,items,area){return {staff:Number.isSafeInteger(business.staffMonthlyCents)?business.staffMonthlyCents/100/MONTH_HOURS:business.cook*12+business.waiter*8,property:area*.015,electricity:.8+items.filter(i=>i.type==='oven'||i.type==='fridge').length*.35};}
// Staff may cross kitchen floors, guests use the separate dining paths.
export function workPath(items,start,goal,plan,kitchenOnly=false){
 const used=new Set([...items,...plan.decor].flatMap(occupiedCells)),valid=(x,y)=>roomCell(x,y,plan)&&!used.has(`${x},${y}`)&&(!kitchenOnly||plan.kitchenKeys?.has(`${x},${y}`));
 if(!valid(start.x,start.y)||!valid(goal.x,goal.y))return null;
 const key=p=>`${p.x},${p.y}`,queue=[start],parents=new Map([[key(start),null]]);
 for(let i=0;i<queue.length;i++){const a=queue[i];if(key(a)===key(goal))break;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:a.x+dx,y:a.y+dy};if(valid(b.x,b.y)&&roomStep(a,b,plan)&&!parents.has(key(b))){parents.set(key(b),a);queue.push(b);}}}
 if(!parents.has(key(goal)))return null;const route=[];for(let a=goal;a;a=parents.get(key(a)))route.unshift(a);return route;
}
function approaches(item,items,plan,kitchenOnly){const cells=occupiedCells(item).map(s=>{const [x,y]=s.split(',').map(Number);return {x,y};});return cells.flatMap(a=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:a.x+dx,y:a.y+dy}))).filter(a=>workPath(items,a,a,plan,kitchenOnly));}
export function counterSurfaces(bar){const cells=occupiedCells(bar).map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};});if(bar.r===2||bar.r===3)cells.reverse();return {prepSurface:cells[0],readySurface:cells[1]};}
// Both surfaces are served from the front, which rotates with the counter art.
export function counterWorkplaces(bar){
 const surfaces=counterSurfaces(bar),[dx,dy]=[[0,1],[-1,0],[0,-1],[1,0]][bar.r];
 return {...surfaces,counter:{x:surfaces.prepSurface.x+dx,y:surfaces.prepSurface.y+dy},handoff:{x:surfaces.readySurface.x+dx,y:surfaces.readySurface.y+dy}};
}
export function counterAccessIssue(bar,items,plan){
 const {counter,handoff,prepSurface,readySurface}=counterWorkplaces(bar),used=new Set([...items,...plan.decor].flatMap(occupiedCells));
 if([counter,handoff].some(p=>used.has(`${p.x},${p.y}`)))return 'Vor beiden Tresenflächen müssen freie Arbeitsplätze bleiben. Ofen, Kühlschrank oder andere Möbel stehen im Weg.';
 if(!roomStep(prepSurface,counter,plan)||!roomStep(readySurface,handoff,plan)||[counter,handoff].some(p=>!roomCell(p.x,p.y,plan)))return 'Die Vorderseite des Tresens darf nicht direkt an einer Wand liegen.';
 if([counter,handoff].some(p=>!plan.kitchenKeys?.has(`${p.x},${p.y}`)))return 'Vor beiden Tresenflächen muss je eine freie Küchenplatte liegen. Tresen drehen oder Küchenboden erweitern.';
 if(!workPath(items,counter,handoff,plan,true)||!workPath(items,plan.entrance,counter,plan)||!workPath(items,plan.entrance,handoff,plan))return 'Bitte einen freien Laufweg zur Vorderseite jedes Tresens lassen.';
 return null;
}
export function counterLayoutIssue(items,plan,previousPlan=null,previousItems=null){
 if(!plan.kitchenKeys)return null;
 // Only unchanged furniture on an expanded floor can keep an existing access issue.
 const expansion=previousPlan?.kitchenKeys&&plan.kitchenKeys.size>previousPlan.kitchenKeys.size
  &&previousPlan.keys===plan.keys&&previousPlan.kitchen===plan.kitchen&&previousPlan.entrance===plan.entrance&&previousPlan.approach===plan.approach&&previousPlan.decor===plan.decor
  &&[...previousPlan.kitchenKeys].every(key=>plan.kitchenKeys.has(key));
 for(const bar of items.filter(item=>item.type==='bar')){
  const issue=counterAccessIssue(bar,items,plan);if(!issue)continue;
  if(expansion&&counterAccessIssue(bar,items,previousPlan))continue;
  const old=previousItems?.find(i=>i.type==='bar'&&i.x===bar.x&&i.y===bar.y&&i.r===bar.r);
  if(old&&counterAccessIssue(old,previousItems,plan)){
   const front=counterWorkplaces(bar),before=new Set(previousItems.flatMap(occupiedCells)),after=new Set(items.flatMap(occupiedCells));
   if([front.counter,front.handoff].every(p=>!after.has(`${p.x},${p.y}`)||before.has(`${p.x},${p.y}`)))continue;
  }
  return issue;
 }
 return null;
}
// Plate return only needs a real reachable counter, not a complete cooking kitchen.
const handoffCache=new WeakMap();
export function counterHandoff(items,plan,preferred=null){
 const signature=items.map(i=>[i.type,i.x,i.y,i.r,i.seats].join(':')).join(';')+'|'+[...plan.kitchenKeys].join(';');
 let cache=handoffCache.get(plan);if(cache?.signature!==signature){cache={signature,values:new Map()};handoffCache.set(plan,cache);}
 if(cache.values.has(preferred))return cache.values.get(preferred);
 const value=buildHandoff(items,plan,preferred);cache.values.set(preferred,value);return value;
}
function buildHandoff(items,plan,preferred){
 const bars=items.filter(i=>i.type==='bar').sort((a,b)=>Number([b.x,b.y,b.r].join(':')===preferred)-Number([a.x,a.y,a.r].join(':')===preferred));
 for(const bar of bars){
  const stationKey=[bar.x,bar.y,bar.r].join(':');
  if(!counterAccessIssue(bar,items,plan))return {...counterWorkplaces(bar),stationKey};
  const surfaces=counterSurfaces(bar),h=approaches({...surfaces.readySurface,type:'fridge',r:0},items,plan,true).find(p=>roomStep(surfaces.readySurface,p,plan)&&workPath(items,plan.entrance,p,plan));
  if(h){const b=approaches({...surfaces.prepSurface,type:'fridge',r:0},items,plan,true).find(p=>roomStep(surfaces.prepSurface,p,plan)&&workPath(items,h,p,plan,true));return {...surfaces,handoff:h,...(b?{counter:b}:{}),stationKey};}
 }
 return null;
}
export function deviceApproaches(item,items,plan){return approaches(item,items,plan,true).filter(p=>occupiedCells(item).some(k=>{const [x,y]=k.split(',').map(Number);return roomStep({x,y},p,plan);}));}
const workflowCache=new WeakMap(),completionCache=new WeakMap();
export function kitchenWorkflow(items,plan,kitchenCells){
 return cachedWorkflow(items,plan,kitchenCells,false,workflowCache);
}
// Reachable pre-rule counter approaches are only for finishing accepted work.
export function kitchenCompletionWorkflow(items,plan,kitchenCells){
 return cachedWorkflow(items,plan,kitchenCells,true,completionCache);
}
function cachedWorkflow(items,plan,kitchenCells,completion,cache){
 const signature=items.map(i=>[i.type,i.x,i.y,i.r,i.seats].join(':')).join(';')+'|'+kitchenCells.map(c=>`${c.x},${c.y}`).join(';');
 const previous=cache.get(plan);if(previous?.signature===signature)return previous.value;
 const value=buildWorkflow(items,plan,kitchenCells,completion);cache.set(plan,{signature,value});return value;
}
function buildWorkflow(items,plan,kitchenCells,completion){
 const allowed=new Set(kitchenCells.map(c=>`${c.x},${c.y}`));
 const devices=['fridge','bar','oven'].map(type=>items.filter(i=>i.type===type&&occupiedCells(i).every(k=>allowed.has(k))));
 // Try every valid combination, so a second inaccessible device cannot close a usable kitchen.
 for(const fridge of devices[0])for(const bar of devices[1])for(const oven of devices[2]){
  if(!completion&&counterAccessIssue(bar,items,plan))continue;
  const surfaces=counterSurfaces(bar),workplaces=completion
   ?approaches({...surfaces.prepSurface,type:'fridge',r:0},items,plan,true).filter(b=>roomStep(surfaces.prepSurface,b,plan)).flatMap(counter=>approaches({...surfaces.readySurface,type:'fridge',r:0},items,plan,true).filter(h=>roomStep(surfaces.readySurface,h,plan)).map(handoff=>({counter,handoff})))
   :[counterWorkplaces(bar)];
  for(const {counter:b,handoff:h}of workplaces)for(const f of approaches(fridge,items,plan,true))for(const o of approaches(oven,items,plan,true)){
   const prep=workPath(items,f,b,plan,true),bake=workPath(items,b,o,plan,true),pickup=workPath(items,o,h,plan,true),access=workPath(items,plan.entrance,h,plan);
   if(prep&&bake&&pickup&&access)return {prep,bake,pickup,fridge:f,counter:b,handoff:h,oven:o,...surfaces,stationKey:[bar.x,bar.y,bar.r].join(':'),ovenKey:[oven.x,oven.y].join(':')};
  }
 }
 return null;
}
export function businessIssue(business,workflow){return !business.cook?'Koch einstellen.':!business.waiter?'Service einstellen.':!workflow?'Geräte und Küchenzugang brauchen freie Laufwege.':null;}
export function demandScore(service,menu,items,finishes,location=1){
 const offers=menu.filter(i=>i.active),price=offers.length?offers.reduce((s,i)=>s+i.price,0)/offers.length:850;
 const decor=Math.min(.25,items.filter(i=>['plant','jukebox'].includes(i.type)).length*.04+(finishes?.renovation||0)*.04);
 return Math.max(.2,Math.min(2,location*(1.15+decor)*ratingDemand(service.rating??4)*Math.max(.25,Math.min(1.4,850/price))*(1+Math.min(.2,offers.length*.025))));
}
export function businessMetrics(profile,plan){const s=profile.service,b=profile.business;return {revenue:s.revenueCents,machines:s.machineRevenueCents||0,ingredients:s.costCents,staff:s.staffCents||0,property:s.propertyCents||0,electricity:s.electricityCents||0,advertising:s.advertisingCents||0,profit:s.netCents-(s.operatingCents||0),debt:s.debtCents||0,rating:s.rating||4,averageWait:s.servedGuests?(s.totalWaitingSeconds||0)/s.servedGuests/5:0,served:s.servedGuests,lost:s.lostGuests||0,utilization:s.capacitySeconds?Math.min(100,100*(s.occupiedSeconds||0)/s.capacitySeconds):0,rates:operatingRates(b,profile.items,plan.area)};}
