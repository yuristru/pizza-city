import {DISTRICTS,districtMarket,advanceMarket,claimCustomers} from './pizza-market.js?v=20261018-public2';
import {activeCampaigns} from './pizza-advertising.js?v=20261018-public2';
import {activeTaxiContracts} from './pizza-taxis.js?v=20261018-public2';
import {collectFine,advanceRivalry} from './pizza-rivalry.js?v=20261018-public2';
import {kitchenReadiness,kitchenWorkFlow} from './pizza-kitchen.js?v=20261018-public2';
import {accrueReservePayroll} from './pizza-staff.js?v=20261018-public2';
import {staffSchedule,nextShiftBoundary} from './pizza-shifts.js?v=20261018-public2';
import {DAY_MINUTES,SECONDS_PER_MINUTE,completeDay,dayLabel} from './pizza-daily.js?v=20261018-public2';
import {profilePlan} from './pizza-kitchen.js?v=20261018-public2';
import {state,saveLayout,updateMoney,ensureRestaurants,notify} from './pizza-core.js?v=20261018-public2';
import {money} from './pizza-catalog.js?v=20261018-public2';
import {serviceMenu} from './pizza-menu-ui.js?v=20261018-public2';
import {advanceService} from './pizza-service.js?v=20261018-public2';

import {accrueWarehouseCosts,purchasingDiscount} from './pizza-procurement.js?v=20261018-public2';
let checkpoint=0;
export function tickService(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return [];
  seconds=Math.min(seconds,3600);
  const elapsed=seconds,events=[],profiles=ensureRestaurants(),menu=serviceMenu();
  const settle=()=>{const result=advanceRivalry(state.rivalry,Math.round(state.balance*100),state.gameMinutes);state.balance=result.balanceCents/100;events.push(...result.results.map(j=>({...j,type:'sabotage-completed'})));};settle();
  // All branches and reserve wages finish the same slice before a midnight snapshot.
  while(seconds>1e-8){
    const midnight=(state.daily.current.day+1)*DAY_MINUTES,shiftBoundary=nextShiftBoundary(state.gameMinutes),untilMidnight=(midnight-state.gameMinutes)*SECONDS_PER_MINUTE,untilShift=(shiftBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,adBoundary=Math.min(Infinity,...activeCampaigns(state.advertising,state.gameMinutes).map(c=>c.until)),untilAd=(adBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,jobBoundary=Math.min(Infinity,...state.rivalry.pending.map(j=>j.due)),untilJob=(jobBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,taxiBoundary=Math.min(Infinity,...activeTaxiContracts(state.taxis,state.gameMinutes).map(c=>c.until)),untilTaxi=(taxiBoundary-state.gameMinutes)*SECONDS_PER_MINUTE,step=Math.min(seconds,untilMidnight,untilShift,untilAd,untilJob,untilTaxi,1);
    const fine=collectFine(state.rivalry,Math.round(state.balance*100));state.balance=fine.balanceCents/100;if(fine.paid)events.push({type:'fine-payment',amount:fine.paid});
    const eligible=Object.fromEntries(Object.entries(profiles).map(([id,p])=>{const schedule=staffSchedule(state.staff,id,state.gameMinutes,p.service);return [id,p.business.open!==false&&schedule.accepting&&p.items.some(t=>t.type==='table')&&!(p.service.debtCents||state.staff.reserveDebtCents||state.procurement.debtCents)&&kitchenReadiness(p.kitchenTiles,p.items,profilePlan(id,p)).ready&&!!kitchenWorkFlow(p.kitchenTiles,p.items,profilePlan(id,p))];}));
    const markets=DISTRICTS.map(d=>districtMarket(d,profiles,menu,state.rivalry,state.gameMinutes,{eligible,advertising:state.advertising,taxis:state.taxis}));
    advanceMarket(state.market,markets,step,state.gameMinutes);
    const warehouseBill=accrueWarehouseCosts(state.procurement,step,Math.round(state.balance*100));state.balance=warehouseBill.balanceCents/100;if(warehouseBill.paid)events.push({type:'warehouse-cost',amount:warehouseBill.paid});
    const reserve=accrueReservePayroll(state.staff,step,Math.round(state.balance*100));state.balance=reserve.balanceCents/100;if(reserve.paid)events.push({type:'reserve-payroll',amount:reserve.paid});
    for(const [id,profile]of Object.entries(profiles)){
      const schedule=staffSchedule(state.staff,id,state.gameMinutes,profile.service),staff={...profile.business,cook:schedule.working.filter(p=>p.role==='cook').length,waiter:schedule.working.filter(p=>p.role==='waiter').length};
      const result=advanceService(profile.service,step,profile.items,menu,Math.round(state.balance*100),profilePlan(id,profile),{staff,employees:schedule.working,accepting:schedule.accepting,companyDebt:state.staff.reserveDebtCents+state.procurement.debtCents,ingredientDiscount:purchasingDiscount(state.procurement),finishes:profile.finishes,location:1,market:{claim:(size,offers)=>claimCustomers(state.market,id,size,offers)}});
      state.balance=result.balanceCents/100;events.push(...result.events.map(event=>({...event,restaurantId:id})));
    }
    seconds-=step;
    // Snap equivalent floating-point slices to their exact clock boundary.
    const reached=distance=>Math.abs(step-distance)<1e-7;
    state.gameMinutes=reached(untilMidnight)?midnight:reached(untilShift)?shiftBoundary:reached(untilAd)?adBoundary:reached(untilJob)?jobBoundary:reached(untilTaxi)?taxiBoundary:state.gameMinutes+step/SECONDS_PER_MINUTE;
    if(reached(untilTaxi))events.push(...state.taxis.contracts.filter(c=>c.until===state.gameMinutes).map(c=>({type:'taxi-expired',driverId:c.driverId,restaurantId:c.restaurantId})));
    if(reached(untilMidnight)){const report=completeDay(state.daily,profiles,state.staff,state.procurement,state.rivalry,state.fruit);events.push({type:'day-closed',day:report.day});}
    settle();
  }
  checkpoint+=elapsed;
  if(events.length)updateMoney();
  if(events.length||checkpoint>=5){saveLayout(true);checkpoint=0;}
  const closed=events.filter(e=>e.type==='day-closed');
  if(closed.length){notify('Tagesabschluss vom '+dayLabel(closed.at(-1).day)+' ist verfügbar.');document.dispatchEvent(new Event('day-closed'));}
  const completed=events.filter(e=>e.type==='sabotage-completed');if(completed.length){state.onRivalryChange?.();const last=completed.at(-1);notify(last.caught?'Auftrag aufgeflogen! Strafe: '+money(last.fineCents/100):'Auftrag erledigt. Die Konkurrenz ist vorübergehend beeinträchtigt.');document.dispatchEvent(new Event('rivalry-changed'));}
  if(events.some(e=>e.type==='taxi-expired')){notify('Taxi-Vertrag beendet. Du kannst wieder mit dem Fahrer verhandeln.');document.dispatchEvent(new Event('advertising-changed'));}
  return events;
}
