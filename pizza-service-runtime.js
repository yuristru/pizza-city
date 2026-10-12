import {restaurantStaff,accrueReservePayroll} from './pizza-staff.js?v=20261012d';
import {DAY_MINUTES,SECONDS_PER_MINUTE,completeDay,dayLabel} from './pizza-daily.js?v=20261012d';
import {profilePlan} from './pizza-kitchen.js?v=20261012d';
import {state,saveLayout,updateMoney,ensureRestaurants,notify} from './pizza-core.js?v=20261012d';
import {serviceMenu} from './pizza-menu-ui.js?v=20261012d';
import {advanceService} from './pizza-service.js?v=20261012d';

let checkpoint=0;
export function tickService(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return [];
  seconds=Math.min(seconds,3600);
  const elapsed=seconds,events=[],profiles=ensureRestaurants(),menu=serviceMenu();
  // All branches and reserve wages finish the same slice before a midnight snapshot.
  while(seconds>1e-8){
    const midnight=(state.daily.current.day+1)*DAY_MINUTES,untilMidnight=(midnight-state.gameMinutes)*SECONDS_PER_MINUTE,step=Math.min(seconds,untilMidnight);
    const reserve=accrueReservePayroll(state.staff,step,Math.round(state.balance*100));state.balance=reserve.balanceCents/100;if(reserve.paid)events.push({type:'reserve-payroll',amount:reserve.paid});
    for(const [id,profile]of Object.entries(profiles)){
      const result=advanceService(profile.service,step,profile.items,menu,Math.round(state.balance*100),profilePlan(id,profile),{staff:profile.business,employees:restaurantStaff(state.staff,id),companyDebt:state.staff.reserveDebtCents,finishes:profile.finishes,location:id==='mamma-mia'?1:id==='piazza-limone'?1.3:id==='lungofiume'?.85:1.05});
      state.balance=result.balanceCents/100;events.push(...result.events.map(event=>({...event,restaurantId:id})));
    }
    seconds-=step;
    state.gameMinutes=step===untilMidnight?midnight:state.gameMinutes+step/SECONDS_PER_MINUTE;
    if(step===untilMidnight){const report=completeDay(state.daily,profiles,state.staff);events.push({type:'day-closed',day:report.day});}
  }
  checkpoint+=elapsed;
  if(events.length)updateMoney();
  if(events.length||checkpoint>=5){saveLayout(true);checkpoint=0;}
  const closed=events.filter(e=>e.type==='day-closed');
  if(closed.length){notify('Tagesabschluss vom '+dayLabel(closed.at(-1).day)+' ist verfügbar.');document.dispatchEvent(new Event('day-closed'));}
  return events;
}
