import {withKitchen,roomCell} from './pizza-floorplans.js?v=20261018-demo1';
import {occupiedCells,validLayout,placementIssue} from './pizza-layout.js?v=20261018-demo1';
import {itemPrice} from './pizza-catalog.js?v=20261018-demo1';
import {KITCHEN_TILE_PRICE,kitchenWorkFlow} from './pizza-kitchen.js?v=20261018-demo1';
import {counterLayoutIssue} from './pizza-business.js?v=20261018-demo1';
import {serviceLayoutIssue} from './pizza-service.js?v=20261018-demo1';

const cache=new WeakMap();
const BASE=[{type:'bar',variant:'rustic',x:0,y:0,r:0},{type:'oven',variant:'electric',x:0,y:2,r:0},{type:'fridge',variant:'compact',x:2,y:2,r:0}];
const TABLE={type:'table',variant:'plastic',seats:2,r:0};
export const AUTO_EQUIP_PRICE=9*KITCHEN_TILE_PRICE+[...BASE,TABLE].reduce((sum,item)=>sum+itemPrice(item),0);
export function emptyRestaurant(profile){
  return Array.isArray(profile?.items)&&!profile.items.length&&!(profile.kitchenTiles?.length)
    &&!['groups','machineGuests','dirtyTables','waiterTasks','plateReturns'].some(key=>profile.service?.[key]?.length);
}
function insideKitchen(p,k){return p.x>=k.x&&p.y>=k.y&&p.x<k.x+k.w&&p.y<k.y+k.h;}
function rotated(item,r,origin){
  const turn=p=>r===1?{x:2-p.y,y:p.x}:r===2?{x:2-p.x,y:2-p.y}:r===3?{x:p.y,y:2-p.x}:p;
  const cells=occupiedCells(item).map(key=>{const [x,y]=key.split(',').map(Number);return turn({x,y});});
  const result={...item,x:origin.x+Math.min(...cells.map(p=>p.x)),y:origin.y+Math.min(...cells.map(p=>p.y)),r:(item.r+r)%4};
  return {...result,paid:itemPrice(result)};
}
function buildEquipment(building){
  const k=building.kitchen,target=building.approach||{x:k.x+(k.w-1)/2,y:k.y+(k.h-1)/2},squares=[];
  for(let y=k.y;y<=k.y+k.h-3;y++)for(let x=k.x;x<=k.x+k.w-3;x++){
    const tiles=Array.from({length:9},(_,i)=>({x:x+i%3,y:y+Math.floor(i/3),paid:KITCHEN_TILE_PRICE}));
    if(tiles.every(p=>roomCell(p.x,p.y,building)))squares.push({x,y,tiles});
  }
  squares.sort((a,b)=>Math.hypot(a.x+1-target.x,a.y+1-target.y)-Math.hypot(b.x+1-target.x,b.y+1-target.y));
  const center={x:(target.x+building.entrance.x)/2,y:(target.y+building.entrance.y)/2};
  const seats=building.cells.filter(p=>occupiedCells({...TABLE,...p}).every(key=>{const [x,y]=key.split(',').map(Number);return !insideKitchen({x,y},k);})).slice()
    .sort((a,b)=>Math.hypot(a.x+.5-center.x,a.y+.5-center.y)-Math.hypot(b.x+.5-center.x,b.y+.5-center.y));
  for(const square of squares){
    const plan=withKitchen(building,square.tiles);
    for(const r of [0,1,2,3]){
      const devices=BASE.map(item=>rotated(item,r,square));
      if(!validLayout(devices,plan)||counterLayoutIssue(devices,plan)||!kitchenWorkFlow(square.tiles,devices,plan))continue;
      for(const position of seats){
        const table={...TABLE,...position,paid:itemPrice(TABLE)},items=[...devices,table];
        if(placementIssue(table,devices,plan)||serviceLayoutIssue(items,plan)||!kitchenWorkFlow(square.tiles,items,plan))continue;
        return {items,kitchenTiles:square.tiles,price:AUTO_EQUIP_PRICE};
      }
    }
  }
  return null;
}
export function minimalEquipment(building){
  if(!cache.has(building))cache.set(building,buildEquipment(building));
  return cache.get(building);
}
