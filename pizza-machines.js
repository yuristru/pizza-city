import {guestCell,occupiedCells} from './pizza-layout.js?v=20261017a';
import {roomStep} from './pizza-floorplans.js?v=20261017a';
import {product,DEFAULT_VARIANTS} from './pizza-catalog.js?v=20261017a';

export const MACHINE_RULES={jukebox:{fee:100,duration:3,action:'Musikwahl'},arcade:{fee:200,duration:8,action:'Spielen'}};
export const machineKey=m=>[m.type,m.variant||DEFAULT_VARIANTS[m.type],m.x,m.y,m.r].join(':');
export function machineFront(m){const [dx,dy]=[[1,0],[0,1],[-1,0],[0,-1]][m.r];return {x:m.x+dx,y:m.y+dy};}
export function machinePosition(v){const n=Math.min(v.route.length-1,v.progress),i=Math.floor(n),a=v.route[i],b=v.route[Math.min(i+1,v.route.length-1)];return {x:a.x+(b.x-a.x)*(n-i),y:a.y+(b.y-a.y)*(n-i)};}
const integer=(n,min=0,max=1e12)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const pointOK=(p,plan)=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&guestCell(p.x,p.y,plan);
export function restoreMachines(raw,service,plan){
  if(integer(raw.machineRevenueCents)&&raw.machineRevenueCents<=service.revenueCents)service.machineRevenueCents=raw.machineRevenueCents;
  if(integer(raw.machineUses))service.machineUses=raw.machineUses;
  const ids=new Set(),targets=new Set(),fronts=new Set();
  for(const v of Array.isArray(raw.machineGuests)?raw.machineGuests.slice(0,12):[]){
    const m=v?.machine,rule=MACHINE_RULES[m?.type];
    if(!rule||!product(m)||!pointOK(m,plan)||!integer(m.r,0,3)||!integer(v.id,1,service.nextId-1)||ids.has(v.id)||!integer(v.member,0,7)||!['walking','using','leaving'].includes(v.phase)||typeof v.paid!=='boolean'||(v.phase==='walking'&&v.paid)||(v.phase==='using'&&!v.paid)||!Array.isArray(v.route)||!v.route.length||v.route.length>plan.area||!v.route.every(p=>pointOK(p,plan))||v.route.some((p,i)=>i&&!roomStep(v.route[i-1],p,plan))||!Number.isFinite(v.progress)||v.progress<0||v.progress>v.route.length-1||!Number.isFinite(v.timer)||v.timer<0||v.timer>rule.duration)continue;
    const group=service.groups.find(g=>g.id===v.id);
    if(group&&(!group.ate||v.member>=group.size))continue;
    if(v.phase!=='leaving'&&(targets.has(machineKey(m))||fronts.has(JSON.stringify(machineFront(m)))||!same(v.route.at(-1),machineFront(m))))continue;
    ids.add(v.id);if(v.phase!=='leaving'){targets.add(machineKey(m));fronts.add(JSON.stringify(machineFront(m)));}
    service.machineGuests.push({id:v.id,member:v.member,machine:{type:m.type,variant:m.variant||DEFAULT_VARIANTS[m.type],x:m.x,y:m.y,r:m.r},phase:v.phase,route:v.route.map(p=>({...p})),progress:v.progress,timer:v.timer,paid:v.paid,...(v.blocked===true&&v.phase==='leaving'?{blocked:true}:{})});
  }
}
export function startMachineVisit(service,group,layout,plan,path){
  // One guest in every third party takes a detour. Companions can settle the meal and leave.
  if(group.id%3!==1||service.machineGuests.length>=12)return;
  const occupied=new Set(service.machineGuests.filter(v=>v.phase!=='leaving').flatMap(v=>[machineKey(v.machine),JSON.stringify(machineFront(v.machine))]));
  const choices=layout.filter(m=>MACHINE_RULES[m.type]&&!occupied.has(machineKey(m))&&!occupied.has(JSON.stringify(machineFront(m))))
    .map(m=>({m,front:machineFront(m)})).filter(({m,front})=>roomStep(m,front,plan)&&path(layout,front,plan.entrance,plan))
    .map(({m,front})=>({m,route:path(layout,group.route.at(-1),front,plan)})).filter(c=>c.route);
  if(!choices.length)return;
  const {m,route}=choices[Math.floor(group.id/3)%choices.length];
  service.machineGuests.push({id:group.id,member:group.id%group.size,machine:{type:m.type,variant:m.variant||DEFAULT_VARIANTS[m.type],x:m.x,y:m.y,r:m.r},phase:'walking',route,progress:0,timer:0,paid:false});
}
function reroute(v,goal,layout,plan,path){
  const position=machinePosition(v),anchor={x:Math.round(position.x),y:Math.round(position.y)},starts=[anchor,...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:anchor.x+dx,y:anchor.y+dy}))].filter(p=>guestCell(p.x,p.y,plan)&&(same(p,anchor)||roomStep(anchor,p,plan)));
  starts.sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y));
  for(const start of starts){const route=path(layout,start,goal,plan);if(route){v.route=route;v.progress=0;delete v.blocked;return true;}}
  return false;
}
function leave(v,layout,plan,path){if(!reroute(v,plan.entrance,layout,plan,path))v.blocked=true;v.phase='leaving';v.timer=0;}
export function reconcileMachineVisits(service,layout,plan,path){
  const used=new Set(layout.flatMap(occupiedCells));
  for(const v of service.machineGuests||[]){
    const remaining=v.route.slice(Math.floor(v.progress)),valid=remaining.every(p=>guestCell(p.x,p.y,plan)&&!used.has(`${p.x},${p.y}`))&&remaining.every((p,i)=>!i||roomStep(remaining[i-1],p,plan));
    if(v.phase==='leaving'){if(v.blocked||!valid||!same(v.route.at(-1),plan.entrance))leave(v,layout,plan,path);continue;}
    const m=layout.find(m=>machineKey(m)===machineKey(v.machine)),front=machineFront(v.machine);
    if(!m||!guestCell(front.x,front.y,plan)||used.has(`${front.x},${front.y}`)||!roomStep(m,front,plan)){leave(v,layout,plan,path);continue;}
    if(!valid&&!reroute(v,front,layout,plan,path))leave(v,layout,plan,path);
  }
}
export function advanceMachineVisits(service,dt,layout,plan,path){
  let amount=0;const events=[];
  for(const v of service.machineGuests.slice()){
    if(v.blocked||v.phase==='leaving'&&!same(v.route.at(-1),plan.entrance))continue;
    if(v.phase==='using'){v.timer=Math.max(0,v.timer-dt);if(v.timer<1e-8)leave(v,layout,plan,path);continue;}
    v.progress=Math.min(v.route.length-1,v.progress+dt*1.25);if(v.progress<v.route.length-1-1e-8)continue;
    if(v.phase==='leaving'){service.machineGuests=service.machineGuests.filter(other=>other!==v);continue;}
    const rule=MACHINE_RULES[v.machine.type];v.phase='using';v.timer=rule.duration;
    if(!v.paid){v.paid=true;amount+=rule.fee;service.machineRevenueCents+=rule.fee;service.machineUses++;service.revenueCents+=rule.fee;service.netCents+=rule.fee;
      const payment={id:v.id,kind:'machine',machineType:v.machine.type,amount:rule.fee,time:service.elapsed,position:{x:v.machine.x,y:v.machine.y}};
      service.payments.push(payment);service.payments=service.payments.slice(-4);events.push({type:'payment',...payment});
    }
  }
  return {amount,events};
}
