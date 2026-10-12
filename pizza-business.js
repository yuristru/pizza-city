import {MONTH_HOURS} from './pizza-staff.js?v=20261012d';
import {roomCell,roomStep} from './pizza-floorplans.js?v=20261012d';
import {occupiedCells} from './pizza-layout.js?v=20261012d';
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
const workflowCache=new WeakMap();
export function kitchenWorkflow(items,plan,kitchenCells){
 const signature=items.map(i=>[i.type,i.x,i.y,i.r,i.seats].join(':')).join(';')+'|'+kitchenCells.map(c=>`${c.x},${c.y}`).join(';');
 const previous=workflowCache.get(plan);if(previous?.signature===signature)return previous.value;
 const value=buildWorkflow(items,plan,kitchenCells);workflowCache.set(plan,{signature,value});return value;
}
function buildWorkflow(items,plan,kitchenCells){
 const allowed=new Set(kitchenCells.map(c=>`${c.x},${c.y}`));
 const devices=['fridge','bar','oven'].map(type=>items.filter(i=>i.type===type&&occupiedCells(i).every(k=>allowed.has(k))));
 // Try every valid combination, so a second inaccessible device cannot close a usable kitchen.
 for(const fridge of devices[0])for(const bar of devices[1])for(const oven of devices[2]){
  const surfaces=counterSurfaces(bar);
  for(const f of approaches(fridge,items,plan,true))for(const b of approaches({...surfaces.prepSurface,type:'fridge',r:0},items,plan,true))for(const h of approaches({...surfaces.readySurface,type:'fridge',r:0},items,plan,true))for(const o of approaches(oven,items,plan,true)){
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
 return Math.max(.2,Math.min(2,location*(.65+(service.rating||4)/8+decor)*Math.max(.25,Math.min(1.4,850/price))*(1+Math.min(.2,offers.length*.025))));
}
export function businessMetrics(profile,plan){const s=profile.service,b=profile.business;return {revenue:s.revenueCents,ingredients:s.costCents,staff:s.staffCents||0,property:s.propertyCents||0,electricity:s.electricityCents||0,profit:s.netCents-(s.operatingCents||0),debt:s.debtCents||0,rating:s.rating||4,averageWait:s.servedGuests?(s.totalWaitingSeconds||0)/s.servedGuests/5:0,served:s.servedGuests,lost:s.lostGuests||0,utilization:s.capacitySeconds?Math.min(100,100*(s.occupiedSeconds||0)/s.capacitySeconds):0,rates:operatingRates(b,profile.items,plan.area)};}
