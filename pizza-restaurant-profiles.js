import {copyLayout,validLayout} from './pizza-layout.js?v=20261011j';
import {defaultFinishes,restoreFinishes} from './pizza-catalog.js?v=20261011j';
import {freshService,restoreService} from './pizza-service.js?v=20261011j';

export const MAIN_RESTAURANT='mamma-mia';
export function freshRestaurant(id){return {items:id===MAIN_RESTAURANT?copyLayout():[],finishes:defaultFinishes(),service:freshService(),investmentCents:0,history:[]};}
export function restoreRestaurants(raw,owned,legacy){
  const profiles={};
  for(const id of [MAIN_RESTAURANT,...owned]){
    const saved=raw?.[id],fallback=id===MAIN_RESTAURANT&&legacy?legacy:freshRestaurant(id);
    profiles[id]=saved&&validLayout(saved.items)?{items:copyLayout(saved.items),finishes:restoreFinishes(saved.finishes),service:restoreService(saved.service),investmentCents:Number.isSafeInteger(saved.investmentCents)&&saved.investmentCents>=0&&saved.investmentCents<=1e12?saved.investmentCents:0,history:[]}:fallback;
  }
  return profiles;
}
