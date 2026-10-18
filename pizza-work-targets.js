import {counterHandoff,counterSurfaces,deviceApproaches,workPath} from './pizza-business.js?v=20261018-bridge3';
import {dimensions} from './pizza-layout.js?v=20261018-bridge3';
import {roomStep} from './pizza-floorplans.js?v=20261018-bridge3';

const checked=new WeakMap();
export function workLayoutKey(items,plan){return items.map(i=>[i.type,i.x,i.y,i.r,i.seats].join(':')).join(';')+'|'+[...plan.kitchenKeys].join(';');}
const same=(a,b)=>a?.x===b?.x&&a?.y===b?.y;
function position(job,items,plan){
 const point=job.route[Math.min(job.route.length-1,Math.round(job.progress))];
 if(workPath(items,point,point,plan))return {...point};
 // A newly placed device may occupy the current tile. Step to a free adjacent tile.
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const p={x:point.x+dx,y:point.y+dy};if(roomStep(point,p,plan)&&workPath(items,p,p,plan))return p;}
 return {...point};
}
function pause(job,message,start,service,id){job.blocked=message;job.route=[start];job.progress=0;if(id)service.staffPositions[id]={...start};return false;}
function setRoute(job,route,start,service,id){job.route=route;job.progress=0;delete job.blocked;if(id)service.staffPositions[id]={...start};return true;}
function walk(items,start,target,plan,kitchen=false){return workPath(items,start,target,plan,kitchen&&plan.kitchenKeys.has(`${start.x},${start.y}`));}
function appliance(type,items,plan,preferred,goal,start){
 const devices=items.filter(i=>i.type===type).sort((a,b)=>Number([b.x,b.y].join(':')===preferred)-Number([a.x,a.y].join(':')===preferred));
 for(const item of devices)for(const point of deviceApproaches(item,items,plan))if((!goal||workPath(items,point,goal,plan,true))&&walk(items,start,point,plan,true))return {point,key:[item.x,item.y].join(':')};
 return null;
}
export function tableTargets(table){
 const {w,h}=dimensions(table),targets=[];
 for(let x=table.x;x<table.x+w;x++)for(const y of [table.y-1,table.y+h])targets.push({x,y});
 for(let y=table.y;y<table.y+h;y++)for(const x of [table.x-1,table.x+w])targets.push({x,y});
 return targets;
}

export function refreshWaiterTarget(service,job,items,plan,layoutKey=workLayoutKey(items,plan)){
 const token=layoutKey+'|'+job.kind;if(checked.get(job)===token||job.targetRevision===token){checked.set(job,token);return !job.blocked;}checked.set(job,token);job.targetRevision=token;
 const start=position(job,items,plan),station=counterHandoff(items,plan,job.flow.stationKey);
 if(!station)return pause(job,'Wartet: Kein erreichbarer Tresen für die Tellerrückgabe.',start,service,job.employeeId);
 job.flow={...job.flow,...station};
 let target=station.handoff;
 if(job.kind==='clear'){
  const dirty=service.dirtyTables.find(d=>d.id===job.dirtyId);
  target=dirty&&tableTargets(dirty.table).find(p=>workPath(items,station.handoff,p,plan)&&walk(items,start,p,plan));
 }
 const route=target&&walk(items,start,target,plan);
 return route?setRoute(job,route,start,service,job.employeeId):pause(job,'Wartet: Der Laufweg ist blockiert.',start,service,job.employeeId);
}

export function refreshKitchenTarget(service,group,items,plan,layoutKey=workLayoutKey(items,plan)){
 const job=group.work;if(!job)return true;
 const token=layoutKey+'|'+job.stage+'|'+!!job.started+'|'+(job.deliveryStage||'');
 if(checked.get(job)===token||job.targetRevision===token){checked.set(job,token);return !job.blocked;}checked.set(job,token);job.targetRevision=token;
 if(job.stage===0&&job.fridgeVisited===undefined){const at=job.route.findIndex(p=>same(p,job.flow.fridge));job.fridgeVisited=at<0||job.progress>=at;}
 const id=job.stage===3?job.waiterId:job.cookId,start=position(job,items,plan);
 if(job.stage===3&&job.deliveryStage==='deliver'){
  const route=walk(items,start,group.route.at(-1),plan);
  return route?setRoute(job,route,start,service,id):pause(job,'Wartet: Der Weg zum Tisch ist blockiert.',start,service,id);
 }
 let flow={...job.flow},goal,route;
 if(job.stage===0||job.stage>=2){
  const station=counterHandoff(items,plan,job.flow.stationKey);
  if(!station||job.stage===0&&!station.counter)return pause(job,'Wartet: Kein erreichbarer Tresen für die Pizza.',start,service,id);
  flow={...flow,...station};goal=job.stage===0?flow.counter:flow.handoff;
 }
 if(job.stage===0&&!job.fridgeVisited){
  const fridge=appliance('fridge',items,plan,null,flow.counter,start);
  if(!fridge)return pause(job,'Wartet: Kein erreichbarer Kühlschrank.',start,service,id);
  const first=walk(items,start,fridge.point,plan,true),prep=workPath(items,fridge.point,flow.counter,plan,true);
  if(first&&prep){route=[...first,...prep.slice(1)];job.fridgeAt=first.length-1;flow.fridge=fridge.point;flow.prep=prep;}
 }else if(job.stage===1||job.stage===2&&!job.outputReserved&&!job.pizzaCollected){
  const oven=appliance('oven',items,plan,job.flow.ovenKey,job.stage===2?flow.handoff:null,start);
  if(!oven)return pause(job,'Wartet: Kein erreichbarer Ofen.',start,service,id);
  flow.oven=oven.point;flow.ovenKey=oven.key;
  if(job.stage===1)goal=oven.point;
  route=walk(items,start,goal,plan,true);
 }else{
  route=walk(items,start,goal,plan,job.stage<3);
  if(job.stage===0)delete job.fridgeAt;
 }
 if(!route)return pause(job,'Wartet: Der Arbeitsweg ist blockiert.',start,service,id);
 // Update the next station paths without restarting preparation or baking time.
 flow.bake=workPath(items,flow.counter,flow.oven,plan,true)||flow.bake;
 flow.pickup=workPath(items,flow.oven,flow.handoff,plan,true)||flow.pickup;
 if(job.stage===1&&flow.ovenKey!==job.flow.ovenKey)job.ovenReserved=false;
 if(job.stage===2&&flow.stationKey!==job.flow.stationKey){if(job.outputReserved)job.pizzaCollected=true;job.outputReserved=false;}
 if(job.stage===3&&flow.stationKey!==job.flow.stationKey)job.outputReserved=false;
 job.flow=flow;return setRoute(job,route,start,service,id);
}

export function reconcileProduction(service,items,plan){
 const key=workLayoutKey(items,plan);
 for(const g of service.groups)if(g.work)refreshKitchenTarget(service,g,items,plan,key);
 for(const task of service.waiterTasks||[])refreshWaiterTarget(service,task,items,plan,key);
 service.plateReturns=(service.plateReturns||[]).filter(p=>items.some(i=>i.type==='bar'&&same(p.position,counterSurfaces(i).readySurface)));
}
