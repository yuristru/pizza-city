import {kitchenWorkflow,kitchenCompletionWorkflow} from './pizza-business.js?v=20261018-brick4';
import {roomCell,roomStep,withKitchen,restaurantPlan} from './pizza-floorplans.js?v=20261018-brick4';
import {occupiedCells,decorCell,placementIssue} from './pizza-layout.js?v=20261018-brick4';
export const KITCHEN_TYPES=['oven','bar','fridge'];
export const KITCHEN_TILE_PRICE=50;
export function restoreKitchenTiles(raw,p){
  if(!Array.isArray(raw)||raw.length>p.area)return [];
  const keys=new Set();
  for(const t of raw){
    const key=`${t?.x},${t?.y}`;
    if(!t||![t.x,t.y].every(Number.isInteger)||!roomCell(t.x,t.y,p)||decorCell(t.x,t.y,p)||p.approach?.x===t.x&&p.approach?.y===t.y||p.entrance.x===t.x&&p.entrance.y===t.y||keys.has(key)||![0,KITCHEN_TILE_PRICE].includes(t.paid??0))return [];
    keys.add(key);
  }
  return raw.map(t=>({x:t.x,y:t.y,paid:t.paid||0}));
}
export function kitchenComponents(tiles,p){
  const remaining=new Set(tiles.map(t=>`${t.x},${t.y}`)),groups=[];
  while(remaining.size){
    const queue=[remaining.values().next().value],cells=[];remaining.delete(queue[0]);
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i].split(',').map(Number);cells.push({x,y});
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:x+dx,y:y+dy},key=`${b.x},${b.y}`;if(remaining.has(key)&&roomStep({x,y},b,p)){remaining.delete(key);queue.push(key);}}
    }
    groups.push(cells);
  }
  return groups.sort((a,b)=>b.length-a.length);
}
export function kitchenReadiness(tiles,items,p){
  const groups=kitchenComponents(tiles,p),sizes=groups.filter(g=>g.length>=9&&(Math.max(...g.map(t=>t.x))-Math.min(...g.map(t=>t.x))+1>=3||Math.max(...g.map(t=>t.y))-Math.min(...g.map(t=>t.y))+1>=3));
  let best=null;
  for(const cells of sizes){
    const keys=new Set(cells.map(t=>`${t.x},${t.y}`)),present=KITCHEN_TYPES.filter(type=>items.some(item=>item.type===type&&occupiedCells(item).every(key=>keys.has(key))));
    if(!best||present.length>best.present.length)best={cells,present};
  }
  const missing=KITCHEN_TYPES.filter(type=>!best?.present.includes(type)),names={oven:'Ofen',bar:'Tresen',fridge:'Kühlschrank'};
  return {ready:!!best&&!missing.length,cells:best?.cells||[],largest:groups[0]?.length||0,missing,issue:!best?'Küchenboden: mindestens 9 zusammenhängende Platten, mindestens 3 breit oder hoch.':missing.length?'Küche fehlt: '+missing.map(type=>names[type]).join(', ')+'.':null};
}
export function kitchenTileIssue(cell,tiles,items,p){
  if(!cell||!roomCell(cell.x,cell.y,p))return 'Die Küchenplatte muss im Raum liegen.';
  if(decorCell(cell.x,cell.y,p))return 'Die feste Wanddekoration bleibt frei.';
  if(cell.x===p.entrance.x&&cell.y===p.entrance.y||p.approach?.x===cell.x&&p.approach?.y===cell.y)return 'Bitte Eingang und Türen frei lassen.';
  const key=`${cell.x},${cell.y}`;
  if(tiles.some(t=>t.x===cell.x&&t.y===cell.y))return 'Hier liegt bereits eine Küchenplatte.';
  if(items.some(item=>occupiedCells(item).includes(key)))return 'Zuerst das Möbelstück auf dieser Fläche entfernen.';
  return null;
}
export function legacyKitchen(p){
  const tiles=p.cells.filter(t=>t.x>=p.kitchen.x&&t.y>=p.kitchen.y&&t.x<p.kitchen.x+p.kitchen.w&&t.y<p.kitchen.y+p.kitchen.h).map(t=>({...t,paid:0}));
  const k=p.kitchen,items=[{type:'fridge',x:k.x,y:k.y,r:0},{type:'oven',x:k.x+1,y:k.y,r:0},{type:'bar',x:k.x,y:k.y+k.h-1,r:0}];
  const plan=withKitchen(p,tiles);
  if(!kitchenWorkflow(items,plan,tiles)){const candidates=tiles.flatMap(c=>[0,1,2,3].map(r=>({...items[2],x:c.x,y:c.y,r})));const bar=candidates.find(b=>!placementIssue(b,items.slice(0,2),plan)&&kitchenWorkflow([...items.slice(0,2),b],plan,tiles));if(bar)items[2]=bar;}
  return {tiles,items};
}
const cache=new WeakMap();
export function profilePlan(id,profile){const old=cache.get(profile);if(old?.tiles===profile.kitchenTiles&&old.id===id)return old.plan;const plan=withKitchen(restaurantPlan(id),profile.kitchenTiles||[]);cache.set(profile,{id,tiles:profile.kitchenTiles,plan});return plan;}

export function kitchenWorkFlow(tiles,items,p){
  return findWorkflow(tiles,items,p,kitchenWorkflow);
}
export function completionWorkFlow(tiles,items,p){
  return findWorkflow(tiles,items,p,kitchenCompletionWorkflow);
}
function findWorkflow(tiles,items,p,build){
  for(const cells of kitchenComponents(tiles,p)){const ready=kitchenReadiness(cells,items,p);if(ready.ready){const flow=build(items,p,cells);if(flow)return flow;}}
  return null;
}
