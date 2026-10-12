import {restaurantStaff,accrueReservePayroll} from './pizza-staff.js?v=20261012b';
import {profilePlan} from './pizza-kitchen.js?v=20261012b';
import {state,saveLayout,updateMoney,ensureRestaurants} from './pizza-core.js?v=20261012b';
import {serviceMenu} from './pizza-menu-ui.js?v=20261012b';
import {advanceService} from './pizza-service.js?v=20261012b';

let checkpoint=0;
export function tickService(seconds){
  const events=[],profiles=ensureRestaurants(),reserve=accrueReservePayroll(state.staff,seconds,Math.round(state.balance*100));state.balance=reserve.balanceCents/100;if(reserve.paid)events.push({type:'reserve-payroll',amount:reserve.paid});
  for(const [id,profile]of Object.entries(profiles)){
    const result=advanceService(profile.service,seconds,profile.items,serviceMenu(),Math.round(state.balance*100),profilePlan(id,profile),{staff:profile.business,employees:restaurantStaff(state.staff,id),companyDebt:state.staff.reserveDebtCents,finishes:profile.finishes,location:id==='mamma-mia'?1:id==='piazza-limone'?1.3:id==='lungofiume'?.85:1.05});
    state.balance=result.balanceCents/100;events.push(...result.events.map(event=>({...event,restaurantId:id})));
  }
  checkpoint+=seconds;
  if(events.length)updateMoney();
  if(events.length||checkpoint>=5){saveLayout(true);checkpoint=0;}
  return events;
}
