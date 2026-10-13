import {restoreKitchenTiles,legacyKitchen,KITCHEN_TYPES,kitchenReadiness} from './pizza-kitchen.js?v=20261013d';
import {restaurantPlan,DEFAULT_PLAN,withKitchen} from './pizza-floorplans.js?v=20261013d';
import {copyLayout,validLayout,placementIssue} from './pizza-layout.js?v=20261013d';
import {defaultFinishes,restoreFinishes} from './pizza-catalog.js?v=20261013d';
import {freshService,restoreService,rehomeService,tableKey,serviceLayoutIssue} from './pizza-service.js?v=20261013d';

import {freshBusiness,restoreBusiness} from './pizza-business.js?v=20261013d';
export const MAIN_RESTAURANT='mamma-mia';
export function freshRestaurant(id){return {business:freshBusiness(),items:id===MAIN_RESTAURANT?copyLayout():[],finishes:defaultFinishes(),service:freshService(),investmentCents:0,floorPlanVersion:1,kitchenVersion:1,kitchenTiles:[],history:[]};}
export function restoreRestaurants(raw,owned,legacy){
  const profiles={};
  for(const id of [MAIN_RESTAURANT,...owned]){
    const saved=raw?.[id]||(id===MAIN_RESTAURANT&&legacy?{...legacy,floorPlanVersion:1}:null),fallback=freshRestaurant(id);
    const building=restaurantPlan(id),kitchenTiles=saved?.kitchenVersion===1?restoreKitchenTiles(saved.kitchenTiles,building):legacyKitchen(building).tiles;
    const plan=saved?.kitchenVersion===1?withKitchen(building,kitchenTiles):building,oldPlan=saved?.floorPlanVersion===1?plan:DEFAULT_PLAN;
    if(!saved||!validLayout(saved.items,oldPlan)){profiles[id]=fallback;continue;}
    let items=copyLayout(saved.items),refund=0,moved=new Map();
    if(saved.floorPlanVersion!==1){
      const placed=[];
      // Reserve furniture that already fits, then relocate the remaining pieces nearby.
      const pending=[];
      for(const item of items){if(!placementIssue(item,placed,plan)&&!serviceLayoutIssue([...placed,item],plan)){placed.push(item);moved.set(tableKey(item),item);}else pending.push(item);}
      for(const item of pending){
        const positions=plan.cells.slice().sort((a,b)=>Math.abs(a.x-item.x)+Math.abs(a.y-item.y)-Math.abs(b.x-item.x)-Math.abs(b.y-item.y));
        const position=positions.find(p=>!placementIssue({...item,...p},placed,plan)&&!serviceLayoutIssue([...placed,{...item,...p}],plan));
        if(position){const replacement={...item,...position};placed.push(replacement);moved.set(tableKey(item),replacement);}else refund+=item.paid||0;
      }
      items=placed;
    }
    const activePlan=withKitchen(building,kitchenTiles);
    if(saved.kitchenVersion!==1){
      const devices=items.filter(item=>KITCHEN_TYPES.includes(item.type));items=items.filter(item=>!KITCHEN_TYPES.includes(item.type));
      for(const device of devices){
        const preferred=legacyKitchen(building).items.find(i=>i.type===device.type),position=[{...preferred,r:preferred.r},device,...kitchenTiles].find(pos=>!placementIssue({...device,x:pos.x,y:pos.y,r:pos.r??device.r},items,activePlan));
        if(position)items.push({...device,x:position.x,y:position.y,r:position.r??device.r});else refund+=device.paid||0;
      }
    }
    const investment=Number.isSafeInteger(saved.investmentCents)&&saved.investmentCents>=0&&saved.investmentCents<=1e12?saved.investmentCents:0;
    profiles[id]={business:restoreBusiness(saved.business,kitchenReadiness(kitchenTiles,items,activePlan).ready),items,finishes:restoreFinishes(saved.finishes),service:saved.floorPlanVersion===1||id===MAIN_RESTAURANT?restoreService(saved.service,activePlan):rehomeService(saved.service,items,moved,activePlan),investmentCents:Math.max(0,investment-refund*100),floorPlanVersion:1,kitchenVersion:1,kitchenTiles,migrationRefundCents:refund*100,history:[]};
  }
  return profiles;
}
