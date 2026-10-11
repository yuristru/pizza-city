import {kitchenReadiness} from './pizza-kitchen.js?v=20261011l';
import {DEFAULT_PLAN,roomStep} from './pizza-floorplans.js?v=20261011l';
import {guestCell,occupiedCells,dimensions,TABLE_SEATS,tableSeatPositions} from './pizza-layout.js?v=20261011l';
import {recipeCost,validRecipe} from './pizza-recipe.js?v=20261011l';

export const SERVICE_PHASES=['arriving','waiting','eating','leaving','paying'];
export const tableKey=t=>[t.x,t.y,t.r,t.seats,t.variant||'wood'].join(':');
export function freshService(){return {version:1,elapsed:0,untilArrival:2,nextId:1,groups:[],payments:[],netCents:0,revenueCents:0,costCents:0,servedGuests:0};}
const pointOK=(p,plan)=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&guestCell(p.x,p.y,plan);
const integer=(n,min=0,max=1e12)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function restoreService(raw,plan=DEFAULT_PLAN){
  const fresh=freshService();
  if(raw?.version!==1||!Number.isFinite(raw.elapsed)||raw.elapsed<0||raw.elapsed>1e10||!Number.isFinite(raw.untilArrival)||raw.untilArrival<0||raw.untilArrival>15||!integer(raw.nextId,1)||!integer(raw.revenueCents)||!integer(raw.costCents)||raw.netCents!==raw.revenueCents-raw.costCents||!integer(raw.servedGuests)||!Array.isArray(raw.groups)||raw.groups.length>12)return fresh;
  Object.assign(fresh,{elapsed:raw.elapsed,untilArrival:raw.untilArrival,nextId:raw.nextId,netCents:raw.netCents,revenueCents:raw.revenueCents,costCents:raw.costCents,servedGuests:raw.servedGuests});
  const ids=new Set();
  for(const g of raw.groups){
    const t=g?.table;
    if(!g||!integer(g.id,1,raw.nextId-1)||ids.has(g.id)||!integer(g.size,1,8)||!SERVICE_PHASES.includes(g.phase)||!t||t.type!=='table'||!TABLE_SEATS.includes(t.seats)||g.size>t.seats||![t.x,t.y,t.r].every(Number.isInteger)||t.r<0||t.r>3||t.x<0||t.y<0||t.x+dimensions(t).w>plan.w||t.y+dimensions(t).h>plan.h||!Array.isArray(g.route)||!g.route.length||g.route.length>plan.area||!g.route.every(p=>pointOK(p,plan))||g.route.some((p,i)=>i&&Math.abs(p.x-g.route[i-1].x)+Math.abs(p.y-g.route[i-1].y)!==1)||!Number.isFinite(g.progress)||g.progress<0||g.progress>g.route.length+3||!Number.isFinite(g.timer)||g.timer<0||g.timer>60||!Number.isFinite(g.eatDuration)||g.eatDuration<18||g.eatDuration>30||typeof g.order?.name!=='string'||g.order.name.length>40||!integer(g.order.price,1,99999)||!integer(g.order.cost,1,2000)||typeof g.charged!=='boolean'||typeof g.ate!=='boolean'||typeof g.paid!=='boolean'||g.paid!==(g.phase==='paying')||(['waiting','eating'].includes(g.phase)&&!g.charged)||(g.ate&&!g.charged))continue;
    ids.add(g.id);fresh.groups.push(JSON.parse(JSON.stringify(g)));
  }
  if(Array.isArray(raw.payments))fresh.payments=raw.payments.filter(p=>integer(p?.id,1,raw.nextId-1)&&integer(p.amount,1,799992)&&Number.isFinite(p.time)&&p.time<=raw.elapsed&&p.time>=raw.elapsed-4&&pointOK(p.position,plan)).slice(-4).map(p=>({...p,position:{...p.position}}));
  return fresh;
}
function freeCells(layout,plan){const used=new Set(layout.flatMap(occupiedCells)),free=new Set();for(let y=0;y<plan.h;y++)for(let x=0;x<plan.w;x++)if(guestCell(x,y,plan)&&!used.has(`${x},${y}`))free.add(`${x},${y}`);return free;}
export function servicePath(layout,start,goal,plan=DEFAULT_PLAN){return routeBetween(freeCells(layout,plan),start,goal,plan);}
function routeBetween(free,start,goal,plan){
  const first=`${start.x},${start.y}`,last=`${goal.x},${goal.y}`;if(!free.has(first)||!free.has(last))return null;
  const queue=[first],parents=new Map([[first,null]]);
  for(let i=0;i<queue.length;i++){const key=queue[i];if(key===last)break;const [x,y]=key.split(',').map(Number);for(const [dx,dy]of [[-1,0],[0,-1],[1,0],[0,1]]){const next=`${x+dx},${y+dy}`;if(free.has(next)&&roomStep({x,y},{x:x+dx,y:y+dy},plan)&&!parents.has(next)){parents.set(next,key);queue.push(next);}}}
  if(!parents.has(last))return null;
  const result=[];let key=last;while(key!==null){const [x,y]=key.split(',').map(Number);result.unshift({x,y});key=parents.get(key);}return result;
}
function tableRoute(layout,t,plan){
  const {w,h}=dimensions(t),free=freeCells(layout,plan),choices=[];
  for(let x=t.x;x<t.x+w;x++)for(const y of [t.y-1,t.y+h])choices.push({x,y});
  for(let y=t.y;y<t.y+h;y++)for(const x of [t.x-1,t.x+w])choices.push({x,y});
  return choices.map(p=>routeBetween(free,plan.entrance,p,plan)).filter(Boolean).sort((a,b)=>a.length-b.length)[0]||null;
}
export function serviceLayoutIssue(layout,plan=DEFAULT_PLAN){
  const free=freeCells(layout,plan);
  if(plan.approach&&!routeBetween(free,plan.entrance,plan.approach,plan))return 'Bitte einen Laufweg zur Küchentür frei lassen.';
  if(layout.some(t=>t.type==='table'&&!tableRoute(layout,t,plan)))return 'Bitte einen Laufweg zu jedem Tisch frei lassen.';
  return null;
}
export function routePosition(group,member=0){
  const distance=Math.max(0,Math.min(group.route.length-1,group.progress-member*.32)),index=Math.floor(distance),a=group.route[index],b=group.route[Math.min(index+1,group.route.length-1)],f=distance-index;
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
}
export function servicePlacementIssue(item,service){
  const cells=new Set(occupiedCells(item));
  return service.groups.some(g=>['arriving','leaving','paying'].includes(g.phase)&&g.route.some(p=>cells.has(`${p.x},${p.y}`)))?'Dieser Laufweg wird gerade von Gästen benutzt.':null;
}
function leave(group,layout,plan){
  const position=['waiting','eating'].includes(group.phase)?group.route.at(-1):routePosition(group),free=freeCells(layout,plan);
  const starts=[...free].map(key=>{const [x,y]=key.split(',').map(Number);return {x,y};}).sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y));
  for(const start of starts){const route=routeBetween(free,start,plan.entrance,plan);if(route){group.phase='leaving';group.route=route;group.progress=0;return;}}
}
function admit(service,layout,menu,balance,plan){
  if(service.groups.length>=12||plan.kitchenKeys&&!kitchenReadiness([...plan.kitchenKeys].map(key=>{const [x,y]=key.split(',').map(Number);return {x,y};}),layout,plan).ready)return;
  const sizes=[2,1,3,2,4,2,6,1,8,3],reserved=new Set(service.groups.filter(g=>!['leaving','paying'].includes(g.phase)).map(g=>tableKey(g.table)));
  const available=layout.filter(t=>t.type==='table'&&!reserved.has(tableKey(t))).map(table=>({table,route:tableRoute(layout,table,plan)})).filter(t=>t.route);
  const size=Math.min(sizes[(service.nextId-1)%sizes.length],Math.max(0,...available.map(t=>t.table.seats)));if(!size)return;
  const choices=available.filter(t=>t.table.seats>=size).sort((a,b)=>a.table.seats-b.table.seats||a.route.length-b.route.length);
  const offers=menu.filter(item=>item.active&&validRecipe(item.recipe)&&integer(item.price,1,99999)&&recipeCost(item.recipe)*size<=balance);
  if(!choices.length||!offers.length)return;
  const choice=choices[0],offer=offers[(service.nextId*7)%offers.length],id=service.nextId++;
  service.groups.push({id,size,table:{...choice.table},phase:'arriving',route:choice.route,progress:0,timer:0,eatDuration:18+(id*7%13),order:{name:offer.recipe.name,price:offer.price,cost:recipeCost(offer.recipe)},charged:false,ate:false,paid:false});
}
export function advanceService(service,seconds,layout,menu,balanceCents,plan=DEFAULT_PLAN){
  const events=[];if(!Number.isFinite(seconds)||seconds<=0)return {balanceCents,events};
  const free=freeCells(layout,plan);
  seconds=Math.min(seconds,3600);
  while(seconds>1e-8){
    const dt=Math.min(.1,seconds);seconds-=dt;service.elapsed+=dt;
    service.payments=service.payments.filter(p=>service.elapsed-p.time<4);
    if(menu.some(item=>item.active)){service.untilArrival-=dt;if(service.untilArrival<=0){admit(service,layout,menu,balanceCents,plan);service.untilArrival=8+(service.nextId*3%5);}}
    for(const g of service.groups.slice()){
      if(!['leaving','paying'].includes(g.phase)&&!layout.some(t=>t.type==='table'&&tableKey(t)===tableKey(g.table)))leave(g,layout,plan);
      if(['arriving','leaving'].includes(g.phase)&&g.route.some(p=>!free.has(`${p.x},${p.y}`)))leave(g,layout,plan);
      if(g.phase==='arriving'||g.phase==='leaving'){
        g.progress=Math.min(g.route.length-1+(g.size-1)*.32,g.progress+dt*1.25);
        if(g.progress<g.route.length-1+(g.size-1)*.32-1e-8)continue;
        if(g.phase==='arriving'){
          const cost=g.order.cost*g.size;
          if(balanceCents<cost){leave(g,layout,plan);continue;}
          balanceCents-=cost;service.costCents+=cost;service.netCents-=cost;g.charged=true;g.phase='waiting';g.timer=3+g.id%3;events.push({type:'cost',groupId:g.id,amount:cost});
        }else if(g.ate&&!g.paid){
          const amount=g.order.price*g.size;balanceCents+=amount;service.revenueCents+=amount;service.netCents+=amount;service.servedGuests+=g.size;g.paid=true;g.phase='paying';g.timer=1.8;
          const payment={id:g.id,amount,time:service.elapsed,position:{...plan.entrance}};service.payments.push(payment);service.payments=service.payments.slice(-4);events.push({type:'payment',...payment});
        }else service.groups=service.groups.filter(other=>other!==g);
      }else{
        g.timer=Math.max(0,g.timer-dt);if(g.timer>1e-8)continue;
        if(g.phase==='waiting'){g.phase='eating';g.timer=g.eatDuration;}
        else if(g.phase==='eating'){g.ate=true;leave(g,layout,plan);}
        else service.groups=service.groups.filter(other=>other!==g);
      }
    }
  }
  return {balanceCents,events};
}
export function guestSeat(group,index){return tableSeatPositions(group.table)[index];}

// Keep orders, timers and accounting when furniture is moved to a new floor plan.
export function rehomeService(raw,layout,moved,plan){
  const service=restoreService(raw),groups=[];
  for(const g of service.groups){
    const table=moved.get(tableKey(g.table)),route=table&&tableRoute(layout,table,plan);
    if(!route)continue;
    g.table={...table};g.route=['leaving','paying'].includes(g.phase)?route.slice().reverse():route;g.progress=g.phase==='paying'?g.route.length-1+(g.size-1)*.32:0;groups.push(g);
  }
  service.groups=groups;service.payments=service.payments.map(p=>({...p,position:{...plan.entrance}}));return service;
}
