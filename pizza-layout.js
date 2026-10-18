import {product,itemPrice} from './pizza-catalog.js?v=20261018-brick4';
import {DEFAULT_PLAN,roomCell,roomStep,kitchenCell,passageCell} from './pizza-floorplans.js?v=20261018-brick4';
export {roomCell,kitchenCell,passageCell};
export const ROOM={w:DEFAULT_PLAN.w,h:DEFAULT_PLAN.h};
export const KITCHEN=DEFAULT_PLAN.kitchen;
export const KITCHEN_DOOR=DEFAULT_PLAN.approach;
export const ENTRANCE=DEFAULT_PLAN.entrance;
export const FIXED_DECOR=DEFAULT_PLAN.decor;
export function decorCell(x,y,p=DEFAULT_PLAN){return p.decor.some(item=>occupiedCells(item).includes(`${x},${y}`));}
export function guestCell(x,y,p=DEFAULT_PLAN){return roomCell(x,y,p)&&!kitchenCell(x,y,p)&&!decorCell(x,y,p);}
export const GRID = {width:64,height:32};

export function project(x,y){return {x:(x-y)*GRID.width/2,y:(x+y)*GRID.height/2};}
export function gridCell(point){return {x:Math.floor(point.x/GRID.width+point.y/GRID.height+.5),y:Math.floor(point.y/GRID.height-point.x/GRID.width+.5)};}
export const TOOL_TYPES = ['table','fridge','oven','bar','plant','jukebox','arcade'];
export const TABLE_SEATS = [2,4,6,8];
export const TABLE_SIZES = {2:{w:2,h:2},4:{w:2,h:2},6:{w:3,h:2},8:{w:4,h:2}};
export function tableChairs(seats){
  if(seats===2)return [[0,-.7,1],[0,.7,3]];
  if(seats===4)return [[-.7,0,0],[.7,0,2],[0,-.7,1],[0,.7,3]];
  return (seats===6?[-.95,0,.95]:[-1.45,-.48,.48,1.45]).flatMap(x=>[[x,-.7,1],[x,.7,3]]);
}
export function tableSeatPositions(item){
  const {w,h}=dimensions(item),cx=item.x+(w-1)/2,cy=item.y+(h-1)/2;
  const turn=(x,y)=>item.r===1?[-y,x]:item.r===2?[-x,-y]:item.r===3?[y,-x]:[x,y];
  return tableChairs(item.seats).map(([x,y,r])=>{const [dx,dy]=turn(x,y),[mx,my]=turn(x*(y?1:.42),y*.42);return {x:cx+dx,y:cy+dy,r:(r+item.r)%4,mealX:cx+mx,mealY:cy+my};});
}
export const DEFAULT_LAYOUT = [
  {type:'table',seats:4,x:2,y:3,r:0},
  {type:'table',seats:4,x:4,y:5,r:0},
  {type:'plant',x:0,y:4,r:0},
  {type:'table',seats:4,x:0,y:7,r:0},
  {type:'table',seats:6,x:5,y:7,r:0},
  {type:'table',seats:2,x:9,y:6,r:0}
];

export function dimensions(item){
  if(item.type==='table'){
    const {w,h}=TABLE_SIZES[item.seats]||TABLE_SIZES[4];
    return item.r%2?{w:h,h:w}:{w,h};
  }
  if(['bar','wine','prep'].includes(item.type)) return item.r%2?{w:1,h:2}:{w:2,h:1};
  return {w:1,h:1};
}

export function occupiedCells(item){
  const {w,h}=dimensions(item),cells=[];
  for(let dx=0;dx<w;dx++) for(let dy=0;dy<h;dy++) cells.push(`${item.x+dx},${item.y+dy}`);
  return cells;
}

export function placementIssue(item,layout=[],plan=DEFAULT_PLAN){
  if(!item||!TOOL_TYPES.includes(item.type)||![item.x,item.y,item.r].every(Number.isInteger)||item.r<0||item.r>3) return 'Ungültige Einrichtung.';
  if(item.type==='table'&&!TABLE_SEATS.includes(item.seats))return 'Bitte einen Tisch für 2, 4, 6 oder 8 Personen wählen.';
  if(item.variant!==undefined&&!product(item))return 'Ungültige Möbelvariante.';
  if(item.paid!==undefined&&(!Number.isInteger(item.paid)||item.paid!==itemPrice(item)))return 'Ungültiger Kaufpreis.';
  const cells=occupiedCells(item);
  if(cells.includes(`${plan.entrance.x},${plan.entrance.y}`))return 'Bitte den Eingang frei lassen.';
  for(const cell of cells){
    const [x,y]=cell.split(',').map(Number);
    if(!roomCell(x,y,plan)) return 'Das Möbelstück passt hier nicht in den Raum.';
    if(decorCell(x,y,plan)) return 'Die feste Wanddekoration bleibt frei.';
    if(plan.kitchenKeys){
      if(['oven','bar','fridge'].includes(item.type)&&!kitchenCell(x,y,plan))return 'Küchengeräte dürfen nur auf Küchenplatten stehen.';
      if(!['oven','bar','fridge'].includes(item.type)&&kitchenCell(x,y,plan))return 'Auf Küchenplatten dürfen nur Küchengeräte stehen.';
    }else if(kitchenCell(x,y,plan))return 'Die feste Küche bleibt frei.';
    if(passageCell(x,y,plan)) return 'Bitte den Küchendurchgang frei lassen.';
    if(x===plan.entrance.x&&y===plan.entrance.y) return 'Bitte den Eingang frei lassen.';
  }
  if(plan.kitchenKeys){const set=new Set(cells);for(const key of cells){const [x,y]=key.split(',').map(Number);for(const [dx,dy]of [[1,0],[0,1]])if(set.has(`${x+dx},${y+dy}`)&&!roomStep({x,y},{x:x+dx,y:y+dy},plan))return 'Das Möbelstück darf keine Wand überqueren.';} }
  const used=new Set(layout.flatMap(occupiedCells));
  if(cells.some(cell=>used.has(cell))) return 'Hier steht bereits ein Möbelstück.';
  return null;
}

// Reject an invalid save as a whole instead of restoring a partially broken room.
export function validLayout(value,plan=DEFAULT_PLAN){
  if(!Array.isArray(value)||value.length>plan.area) return false;
  const accepted=[];
  for(const item of value){
    if(placementIssue(item,accepted,plan)) return false;
    accepted.push(item);
  }
  return true;
}

export function copyLayout(layout=DEFAULT_LAYOUT){
  return layout.map(({type,seats,x,y,r,variant,paid})=>({...((type==='table')?{type,seats,x,y,r}:{type,x,y,r}),...(variant!==undefined?{variant}:{}),...(paid!==undefined?{paid}:{})}));
}

export function upgradeLayout(value,version,plan=DEFAULT_PLAN){
  if(!Array.isArray(value)||![1,2,3,4,5,6,7,8,9,10,11,12,13].includes(version))return null;
  const items=version===1?value.filter(item=>item?.type!=='chair').map(item=>item?.type==='table'?{...item,seats:4}:item):value;
  return validLayout(items,plan)?copyLayout(items):null;
}
