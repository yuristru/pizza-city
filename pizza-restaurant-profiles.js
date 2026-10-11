import {restaurantPlan,DEFAULT_PLAN} from './pizza-floorplans.js?v=20261011k';
import {copyLayout,validLayout,placementIssue} from './pizza-layout.js?v=20261011k';
import {defaultFinishes,restoreFinishes} from './pizza-catalog.js?v=20261011k';
import {freshService,restoreService,rehomeService,tableKey,serviceLayoutIssue} from './pizza-service.js?v=20261011k';

export const MAIN_RESTAURANT='mamma-mia';
export function freshRestaurant(id){return {items:id===MAIN_RESTAURANT?copyLayout():[],finishes:defaultFinishes(),service:freshService(),investmentCents:0,floorPlanVersion:1,history:[]};}
export function restoreRestaurants(raw,owned,legacy){
  const profiles={};
  for(const id of [MAIN_RESTAURANT,...owned]){
    const saved=raw?.[id],fallback=id===MAIN_RESTAURANT&&legacy?legacy:freshRestaurant(id);
    const plan=restaurantPlan(id),oldPlan=saved?.floorPlanVersion===1?plan:DEFAULT_PLAN;
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
    const investment=Number.isSafeInteger(saved.investmentCents)&&saved.investmentCents>=0&&saved.investmentCents<=1e12?saved.investmentCents:0;
    profiles[id]={items,finishes:restoreFinishes(saved.finishes),service:saved.floorPlanVersion===1||id===MAIN_RESTAURANT?restoreService(saved.service,plan):rehomeService(saved.service,items,moved,plan),investmentCents:Math.max(0,investment-refund*100),floorPlanVersion:1,migrationRefundCents:refund*100,history:[]};
  }
  return profiles;
}
