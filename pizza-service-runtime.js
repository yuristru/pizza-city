import {profilePlan} from './pizza-kitchen.js?v=20261011m';
import {state,saveLayout,updateMoney,ensureRestaurants} from './pizza-core.js?v=20261011m';
import {serviceMenu} from './pizza-menu-ui.js?v=20261011m';
import {advanceService} from './pizza-service.js?v=20261011m';

let checkpoint=0;
export function tickService(seconds){
  const events=[];
  for(const [id,profile]of Object.entries(ensureRestaurants())){
    const result=advanceService(profile.service,seconds,profile.items,serviceMenu(),Math.round(state.balance*100),profilePlan(id,profile),{staff:profile.business,finishes:profile.finishes,location:id==='mamma-mia'?1:id==='piazza-limone'?1.3:id==='lungofiume'?.85:1.05});
    state.balance=result.balanceCents/100;events.push(...result.events.map(event=>({...event,restaurantId:id})));
  }
  checkpoint+=seconds;
  if(events.length)updateMoney();
  if(events.length||checkpoint>=5){saveLayout(true);checkpoint=0;}
  return events;
}
