import {profilePlan,kitchenReadiness,kitchenWorkFlow} from './pizza-kitchen.js?v=20261016f';
import {workPath} from './pizza-business.js?v=20261016f';
import {tableRoute} from './pizza-service.js?v=20261016f';
import {SHIFTS} from './pizza-shifts.js?v=20261016f';
import {validRecipe} from './pizza-recipe.js?v=20261016f';

const cache=new WeakMap(),steps=route=>Math.max(0,(route?.length||1)-1),mean=values=>values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);
const speed=p=>.85+(p.skills?.[p.role==='cook'?'organization':'pace']??50)/100*.75;
const duration=(n,skill)=>n*(.7+(100-(skill??50))/100);
// Planning estimate, using the same work paths, skill factors and party sizes as service.
// It deliberately measures the bottleneck, rather than equating empty chairs with capacity.
export function restaurantCapacity(id,p,staff,menu){
 const team=(staff?.employees||[]).filter(e=>e.restaurantId===id),signature=JSON.stringify([p.items,p.kitchenTiles,p.business.open,p.service.debtCents,staff?.reserveDebtCents,team.map(e=>[e.id,e.role,e.shift,e.skills]),menu.map(m=>[m.active,m.price,m.recipe])]);
 const old=cache.get(p);if(old?.signature===signature)return old.value;
 const plan=profilePlan(id,p),tables=p.items.filter(t=>t.type==='table'),seats=tables.reduce((n,t)=>n+t.seats,0),result={daily:0,seats,hours:0,bottleneck:'Noch nicht betriebsbereit',limits:{}};
 const done=()=>{cache.set(p,{signature,value:result});return result;};
 if(p.business.open===false){result.bottleneck='Restaurant geschlossen';return done();}
 if(p.service.debtCents||staff?.reserveDebtCents){result.bottleneck='Offene Betriebskosten';return done();}
 if(!menu.some(m=>m.active&&validRecipe(m.recipe))){result.bottleneck='Aktive Speisekarte fehlt';return done();}
 const ready=kitchenReadiness(p.kitchenTiles||[],p.items,plan),flow=ready.ready&&kitchenWorkFlow(p.kitchenTiles,p.items,plan);
 if(!flow){result.bottleneck='Küche oder Arbeitswege fehlen';return done();}
 const reachable=tables.map(t=>({table:t,route:tableRoute(p.items,t,plan)})).filter(t=>t.route&&workPath(p.items,flow.handoff,t.route.at(-1),plan));
 if(!reachable.length){result.bottleneck='Erreichbare Tische fehlen';return done();}
 const maxSeats=Math.max(...reachable.map(t=>t.table.seats)),party=mean([2,1,3,2,4,2,6,1,8,3].map(n=>Math.min(n,maxSeats))),walkToTable=mean(reachable.map(t=>steps(workPath(p.items,flow.handoff,t.route.at(-1),plan)))),walkIn=mean(reachable.map(t=>steps(t.route)))/1.25;
 const limits={Küchenteam:0,'Ofen und Übergabe':0,Service:0,Tische:0,Gästeeinlass:0};let total=0;
 for(const [shift,s]of Object.entries(SHIFTS)){
  const cooks=team.filter(e=>e.role==='cook'&&(e.shift||'lunch')===shift),waiters=team.filter(e=>e.role==='waiter'&&(e.shift||'lunch')===shift);if(!cooks.length||!waiters.length)continue;
  const seconds=(s.end-s.start)*5,prep=mean(cooks.map(c=>duration(2+party*.6,c.skills?.preparation))),bake=mean(cooks.map(c=>duration(3+party*.7,c.skills?.baking))),returnWalk=steps(workPath(p.items,flow.handoff,flow.fridge,plan,true));
  const cookRate=cooks.reduce((n,c)=>n+party/((steps(flow.prep)+steps(flow.bake)+steps(flow.pickup)+returnWalk)/speed(c)+duration(2+party*.6,c.skills?.preparation)+duration(3+party*.7,c.skills?.baking)+.6),0);
  const kitchenRate=Math.min(cookRate,party/(prep+steps(flow.prep)/mean(cooks.map(speed))+steps(flow.bake)/mean(cooks.map(speed))));
  const ovenRate=party/(bake+steps(flow.pickup)/mean(cooks.map(speed))+.6),waiterRate=waiters.reduce((n,w)=>n+party/(walkToTable*4/speed(w)+3+(100-(w.skills?.attention??50))/50),0);
  const cycle=24+walkIn+prep+bake+(steps(flow.prep)+steps(flow.bake)+steps(flow.pickup))/mean(cooks.map(speed))+walkToTable/mean(waiters.map(speed))+4;
  const rates={Küchenteam:kitchenRate,'Ofen und Übergabe':ovenRate,Service:waiterRate,Tische:reachable.reduce((n,t)=>n+Math.min(t.table.seats,party),0)/cycle,Gästeeinlass:party/10};
  total+=Math.min(...Object.values(rates))*seconds;result.hours+=(s.end-s.start)/60;for(const k of Object.keys(limits))limits[k]+=rates[k]*seconds;
 }
 if(!result.hours){result.bottleneck='Koch und Service in derselben Schicht fehlen';return done();}
 result.daily=Math.max(1,Math.floor(total));result.limits=Object.fromEntries(Object.entries(limits).map(([k,n])=>[k,Math.floor(n)]));result.bottleneck=Object.keys(limits).sort((a,b)=>limits[a]-limits[b])[0];return done();
}
export function utilizationForecast(capacity,before,after=before){
 before=Math.max(0,before);after=Math.max(before,after);
 const current=Math.min(capacity.daily,before),additional=Math.max(0,Math.min(capacity.daily,after)-current),overflow=Math.max(0,after-capacity.daily),percent=capacity.daily?before/capacity.daily*100:0,nextPercent=capacity.daily?after/capacity.daily*100:0;
 return {capacity,before,after,current,additional,overflow,percent,nextPercent,full:capacity.daily>0&&before>=capacity.daily};
}
