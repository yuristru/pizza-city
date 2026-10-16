import {DISTRICTS,districtMarket,advanceMarket,claimCustomers} from './pizza-market.js?v=20261016c';
import {activeCampaigns} from './pizza-advertising.js?v=20261016c';
import {collectFine} from './pizza-rivalry.js?v=20261016c';
import {kitchenReadiness,kitchenWorkFlow} from './pizza-kitchen.js?v=20261016c';
import {accrueReservePayroll} from './pizza-staff.js?v=20261016c';
import {staffSchedule,nextShiftBoundary} from './pizza-shifts.js?v=20261016c';
import {DAY_MINUTES,SECONDS_PER_MINUTE,completeDay,dayLabel} from './pizza-daily.js?v=20261016c';
import {profilePlan} from './pizza-kitchen.js?v=20261016c';
import {state,saveLayout,updateMoney,ensureRestaurants,notify} from './pizza-core.js?v=20261016c';
import {serviceMenu} from './pizza-menu-ui.js?v=20261016c';
import {advanceService} from './pizza-service.js?v=20261016c';

import {accrueWarehouseCosts,purchasingDiscount} from './pizza-procurement.js?v=20261016c';
let checkpoint=0;
export function tickService(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return [];
  seconds=Math.min(seconds,3600);
  const elapsed=seconds,events=[],profiles=ensureRestaurants(),menu=serviceMenu();
  // All branches and reserve wages finish the same slice before a midnight snapshot.
  while(seconds>1e-8){
    const midnight=(state.daily.current.day+1)*DAY_MINUTES,shiftBoundary=nextShiftBoundary(state.gameMinutes),untilMidnight=(midnight-state.gameMinutes)*SECONDS_PER_MINUTE,untilShift=(shiftBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,adBoundary=Math.min(Infinity,...activeCampaigns(state.advertising,state.gameMinutes).map(c=>c.until)),untilAd=(adBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,step=Math.min(seconds,untilMidnight,untilShift,untilAd,1);
    const fine=collectFine(state.rivalry,Math.round(state.balance*100));state.balance=fine.balanceCents/100;if(fine.paid)events.push({type:'fine-payment',amount:fine.paid});
    const eligible=Object.fromEntries(Object.entries(profiles).map(([id,p])=>{const schedule=staffSchedule(state.staff,id,state.gameMinutes,p.service);return [id,p.business.open!==false&&schedule.accepting&&p.items.some(t=>t.type==='table')&&!(p.service.debtCents||state.staff.reserveDebtCents||state.procurement.debtCents)&&kitchenReadiness(p.kitchenTiles,p.items,profilePlan(id,p)).ready&&!!kitchenWorkFlow(p.kitchenTiles,p.items,profilePlan(id,p))];}));
    const markets=DISTRICTS.map(d=>districtMarket(d,profiles,menu,state.rivalry,state.gameMinutes,{eligible,advertising:state.advertising}));
    advanceMarket(state.market,markets,step,state.gameMinutes);
    const warehouseBill=accrueWarehouseCosts(state.procurement,step,Math.round(state.balance*100));state.balance=warehouseBill.balanceCents/100;if(warehouseBill.paid)events.push({type:'warehouse-cost',amount:warehouseBill.paid});
    const reserve=accrueReservePayroll(state.staff,step,Math.round(state.balance*100));state.balance=reserve.balanceCents/100;if(reserve.paid)events.push({type:'reserve-payroll',amount:reserve.paid});
    for(const [id,profile]of Object.entries(profiles)){
      const schedule=staffSchedule(state.staff,id,state.gameMinutes,profile.service),staff={...profile.business,cook:schedule.working.filter(p=>p.role==='cook').length,waiter:schedule.working.filter(p=>p.role==='waiter').length};
      const result=advanceService(profile.service,step,profile.items,menu,Math.round(state.balance*100),profilePlan(id,profile),{staff,employees:schedule.working,accepting:schedule.accepting,companyDebt:state.staff.reserveDebtCents+state.procurement.debtCents,ingredientDiscount:purchasingDiscount(state.procurement),finishes:profile.finishes,location:1,market:{claim:(size,offers)=>claimCustomers(state.market,id,size,offers)}});
      state.balance=result.balanceCents/100;events.push(...result.events.map(event=>({...event,restaurantId:id})));
    }
    seconds-=step;
    state.gameMinutes=step===untilMidnight?midnight:step===untilShift?shiftBoundary:step===untilAd?adBoundary:state.gameMinutes+step/SECONDS_PER_MINUTE;
    if(step===untilMidnight){const report=completeDay(state.daily,profiles,state.staff,state.procurement,state.rivalry);events.push({type:'day-closed',day:report.day});}
  }
  checkpoint+=elapsed;
  if(events.length)updateMoney();
  if(events.length||checkpoint>=5){saveLayout(true);checkpoint=0;}
  const closed=events.filter(e=>e.type==='day-closed');
  if(closed.length){notify('Tagesabschluss vom '+dayLabel(closed.at(-1).day)+' ist verfügbar.');document.dispatchEvent(new Event('day-closed'));}
  return events;
}
