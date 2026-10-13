import {workPath} from './pizza-business.js?v=20261013a';
import {roomCell,roomStep} from './pizza-floorplans.js?v=20261013a';
import {dimensions} from './pizza-layout.js?v=20261013a';
const key=t=>[t.x,t.y,t.r,t.seats,t.variant||'wood'].join(':');
const personId=id=>typeof id==='string'&&/^[a-z0-9-]{1,80}$/.test(id);
const cell=(p,plan)=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&roomCell(p.x,p.y,plan);
const route=(r,plan)=>Array.isArray(r)&&r.length>0&&r.length<=plan.area*2&&r.every(p=>cell(p,plan))&&r.every((p,i)=>!i||roomStep(r[i-1],p,plan)&&Math.abs(p.x-r[i-1].x)+Math.abs(p.y-r[i-1].y)===1);
const skills=(s,role)=>s===undefined||s&&Object.values(s).length===3&&(role==='cook'?['preparation','baking','organization']:['pace','attention','friendliness']).every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=100);
const flowOK=(f,p)=>f&&['prep','bake','pickup'].every(k=>route(f[k],p))&&['fridge','counter','handoff','oven','prepSurface','readySurface'].every(k=>cell(f[k],p))&&typeof f.stationKey==='string'&&typeof f.ovenKey==='string'&&f.stationKey.length<40&&f.ovenKey.length<40;
const jobOK=(w,p)=>w&&route(w.route,p)&&Number.isFinite(w.progress)&&w.progress>=0&&w.progress<=w.route.length-1&&Number.isFinite(w.hold)&&w.hold>=0&&w.hold<=60&&Number.isFinite(w.speed)&&w.speed>.1&&w.speed<=5;
export function restoreWork(w,plan){return jobOK(w,plan)&&flowOK(w.flow,plan)&&Number.isInteger(w.stage)&&w.stage>=0&&w.stage<=3&&personId(w.cookId)&&skills(w.cookSkills,'cook')&&(w.stage<3||!w.started||personId(w.waiterId)&&['pickup','deliver'].includes(w.deliveryStage))?structuredClone(w):null;}
export function restoreProduction(raw,service,plan){
 service.chainVersion=1;service.dirtyTables=[];service.waiterTasks=[];service.staffPositions={};service.plateReturns=[];service.cleanedTables=Number.isSafeInteger(raw?.cleanedTables)&&raw.cleanedTables>=0?raw.cleanedTables:0;
 if(raw?.chainVersion!==1)return;
 const tables=new Set();
 for(const d of Array.isArray(raw.dirtyTables)?raw.dirtyTables.slice(0,plan.area):[])if(d&&Number.isSafeInteger(d.id)&&d.id>0&&d.table?.type==='table'&&cell(d.table,plan)&&[2,4,6,8].includes(d.table.seats)&&Number.isInteger(d.table.r)&&d.table.r>=0&&d.table.r<=3&&Number.isInteger(d.size)&&d.size>0&&d.size<=d.table.seats&&!tables.has(key(d.table))){service.dirtyTables.push(structuredClone(d));tables.add(key(d.table));}
 const assigned=new Set(service.groups.filter(g=>g.work?.stage===3&&g.work.started).map(g=>g.work.waiterId));
 for(const t of Array.isArray(raw.waiterTasks)?raw.waiterTasks.slice(0,4):[])if(jobOK(t,plan)&&personId(t.employeeId)&&!assigned.has(t.employeeId)&&['clear','return'].includes(t.kind)&&flowOK(t.flow,plan)&&Number.isInteger(t.plates)&&t.plates>=0&&t.plates<=8&&(t.kind!=='clear'||service.dirtyTables.some(d=>d.id===t.dirtyId))){service.waiterTasks.push(structuredClone(t));assigned.add(t.employeeId);}
 for(const [id,p]of Object.entries(raw.staffPositions||{}).slice(0,120))if(personId(id)&&cell(p,plan))service.staffPositions[id]={x:p.x,y:p.y};
}
export const productionBusy=s=>!!(s.waiterTasks?.length||s.dirtyTables?.length);
export function dirtyTable(service,table){return service.dirtyTables?.some(d=>key(d.table)===key(table));}
function team(business,role){return business.employees?business.employees.filter(p=>p.role===role):Array.from({length:business.staff[role]||0},(_,i)=>({id:role+'-'+i,role}));}
function speed(person){return person.skills?.[person.role==='cook'?'organization':'pace']!==undefined?.85+person.skills[person.role==='cook'?'organization':'pace']/100*.75:1.2;}
function duration(value,skill){return value*(skill!==undefined?.7+(100-skill)/100:1);}
function remembered(service,id,point){service.staffPositions[id]={x:point.x,y:point.y};}
function fromPosition(service,id,goal,layout,plan,kitchen=false,fallback=goal){const old=service.staffPositions[id],start=old&&workPath(layout,old,old,plan)?old:fallback;return workPath(layout,start,goal,plan,kitchen&&plan.kitchenKeys?.has(`${start.x},${start.y}`));}
function advance(w,dt){w.progress=Math.min(w.route.length-1,w.progress+dt*w.speed);if(w.progress<w.route.length-1)return false;w.hold=Math.max(0,w.hold-dt);return w.hold<=1e-8;}
function waiterBusy(service,id){return service.waiterTasks.some(t=>t.employeeId===id)||service.groups.some(g=>g.work?.stage===3&&g.work.started&&g.work.waiterId===id);}
export function addDirtyTable(service,g){if(!dirtyTable(service,g.table))service.dirtyTables.push({id:g.id,table:{...g.table},size:g.size});}
export function advanceWaiters(service,dt,layout,plan,business){
 service.plateReturns=service.plateReturns.filter(p=>service.elapsed-p.time<3);
 for(const t of service.waiterTasks.slice())if(advance(t,dt)){
  remembered(service,t.employeeId,t.route.at(-1));
  if(t.kind==='clear'){
   const d=service.dirtyTables.find(d=>d.id===t.dirtyId),back=workPath(layout,t.route.at(-1),t.flow.handoff,plan);
   if(!d||!back){service.waiterTasks=service.waiterTasks.filter(other=>other!==t);continue;}
   service.dirtyTables=service.dirtyTables.filter(other=>other!==d);service.cleanedTables++;t.kind='return';t.route=back;t.progress=0;t.hold=.4;t.plates=d.size;
  }else{
   if(t.plates)service.plateReturns.push({position:{...t.flow.readySurface},size:t.plates,time:service.elapsed});
   service.waiterTasks=service.waiterTasks.filter(other=>other!==t);
  }
 }
 // A returning server can take a fresh pizza immediately; otherwise clean the oldest table.
 if(service.groups.some(g=>g.phase==='waiting'&&g.work?.stage===3&&(!g.work.started||g.work.deliveryStage==='pickup')))return;
 for(const waiter of team(business,'waiter')){
  if(waiterBusy(service,waiter.id))continue;
  const d=service.dirtyTables.find(d=>!service.waiterTasks.some(t=>t.dirtyId===d.id));if(!d||!business.workflow)continue;
  const {w,h}=dimensions(d.table),targets=[];for(let x=d.table.x;x<d.table.x+w;x++)for(const y of [d.table.y-1,d.table.y+h])targets.push({x,y});for(let y=d.table.y;y<d.table.y+h;y++)for(const x of [d.table.x-1,d.table.x+w])targets.push({x,y});
  const target=targets.find(p=>workPath(layout,business.workflow.handoff,p,plan));if(!target)continue;
  const walk=fromPosition(service,waiter.id,target,layout,plan,false,business.workflow.handoff);if(!walk)continue;
  service.waiterTasks.push({employeeId:waiter.id,kind:'clear',dirtyId:d.id,plates:0,flow:business.workflow,route:walk,progress:0,hold:.8+(100-(waiter.skills?.attention??50))/100,speed:speed(waiter)});
 }
}
export function advanceKitchenOrder(service,g,dt,layout,plan,business){
 const flow=business.workflow;if(!flow)return;
 if(!g.work){
  if(service.groups.some(other=>other.work?.flow.stationKey===flow.stationKey&&(other.work.stage===0||other.work.stage===1&&!other.work.ovenReserved)))return;
  const cook=team(business,'cook').filter(p=>!service.groups.some(other=>other.work?.stage<3&&other.work.cookId===p.id)).sort((a,b)=>(b.skills?.organization||0)-(a.skills?.organization||0))[0];if(!cook)return;
  const walk=fromPosition(service,cook.id,flow.fridge,layout,plan,true);if(!walk)return;
  g.work={cookId:cook.id,cookSkills:cook.skills,flow,stage:0,route:[...walk,...flow.prep.slice(1)],progress:0,hold:duration(2+g.size*.6,cook.skills?.preparation),speed:speed(cook)};
 }
 const w=g.work;
 if(w.stage===1&&!w.ovenReserved){if(service.groups.some(other=>other!==g&&other.work?.flow.ovenKey===w.flow.ovenKey&&(other.work.stage===1&&other.work.ovenReserved||other.work.stage===2&&!other.work.outputReserved)))return;w.ovenReserved=true;}
 if(w.stage===2&&!w.outputReserved){if(service.groups.some(other=>other!==g&&other.work?.flow.stationKey===w.flow.stationKey&&(other.work.stage===2&&other.work.outputReserved||other.work.stage===3&&(!other.work.started||other.work.deliveryStage==='pickup'))))return;w.outputReserved=true;}
 if(w.stage===3&&!w.started){
  const waiter=team(business,'waiter').filter(p=>!waiterBusy(service,p.id)).sort((a,b)=>(b.skills?.pace||0)-(a.skills?.pace||0))[0];if(!waiter)return;
  const walk=fromPosition(service,waiter.id,w.flow.handoff,layout,plan);if(!walk)return;
  w.waiterId=waiter.id;w.started=true;w.deliveryStage='pickup';w.route=walk;w.progress=0;w.hold=.6+(100-(waiter.skills?.attention??50))/100;w.speed=speed(waiter);g.staffFriendliness=waiter.skills?(waiter.skills.friendliness-50)/200:0;
 }
 if(!advance(w,dt))return;
 const id=w.stage===3?w.waiterId:w.cookId;remembered(service,id,w.route.at(-1));
 if(w.stage===3){
  if(w.deliveryStage==='pickup'){const walk=workPath(layout,w.flow.handoff,g.route.at(-1),plan);if(!walk)return;w.deliveryStage='deliver';w.route=walk;w.progress=0;w.hold=.4;return;}
  const back=workPath(layout,w.route.at(-1),w.flow.handoff,plan);if(back)service.waiterTasks.push({employeeId:w.waiterId,kind:'return',plates:0,flow:w.flow,route:back,progress:0,hold:.2,speed:w.speed});
  delete g.work;g.phase='eating';g.timer=g.eatDuration;return;
 }
 w.stage++;w.progress=0;
 if(w.stage===1){w.route=w.flow.bake;w.hold=duration(3+g.size*.7,w.cookSkills?.baking);}
 else if(w.stage===2){w.route=w.flow.pickup;w.hold=.6;}
 else{g.staffQuality=w.cookSkills?((w.cookSkills.preparation+w.cookSkills.baking)/2-50)/100:0;w.route=[w.flow.handoff];w.hold=0;}
}
