import {renderDistrictPanel} from './pizza-market-ui.js?v=20261017b';
import {serviceMenu} from './pizza-menu-ui.js?v=20261017b';
import {state,ensureRestaurants,restaurantName,setRestaurantOpen} from './pizza-core.js?v=20261017b';
import {restaurantPlan} from './pizza-floorplans.js?v=20261017b';
import {STAFF,businessMetrics} from './pizza-business.js?v=20261017b';
import {money} from './pizza-catalog.js?v=20261017b';
import {mountDailyUI,renderDailyUI,openDailyReport} from './pizza-daily-ui.js?v=20261017b';
const el=id=>document.getElementById(id);let stamp=0,view='daily';
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
export function renderBusinessUI(force=false){
 const d=el('businessDialog');if(!d.open)return;if(!force&&performance.now()-stamp<750)return;stamp=performance.now();
 for(const tab of document.querySelectorAll('[data-finance-view]')){const active=tab.dataset.financeView===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
 el('dailyContent').hidden=view!=='daily';el('financeLifetimeContent').hidden=view!=='lifetime';
 if(view==='daily'){renderDailyUI(force);return;}
 const profiles=ensureRestaurants(),profile=profiles[state.activeRestaurantId],host=el('businessControls');host.replaceChildren(text('h3',restaurantName()));
 const accepting=text('button',profile.business.open===false?'Restaurant öffnen':'Restaurant schließen');accepting.id='acceptGuests';accepting.type='button';accepting.onclick=()=>setRestaurantOpen(state.activeRestaurantId,profile.business.open===false);const market=document.createElement('section');market.className='districtPanel';renderDistrictPanel(market,state.activeRestaurantId,state,profiles,serviceMenu());host.append(market);
 host.append(accepting,text('p','Schließen stoppt neue Gäste. Laufende Bestellungen, Automatenbesuche und das Abräumen werden beendet. Geräte kannst du jederzeit umstellen.'));
 const table=el('branchRows');table.replaceChildren();
 for(const [id,p]of Object.entries(profiles)){
  const m=businessMetrics(p,restaurantPlan(id)),row=document.createElement('tr');row.dataset.branch=id;
  const b=text('button',restaurantName(id));b.type='button';b.onclick=()=>{d.close();state.navigate('restaurant',id);};const cell=document.createElement('th');cell.scope='row';cell.append(b);row.append(cell);
  for(const value of [money(m.revenue/100),money(m.machines/100),money(m.ingredients/100),money(m.staff/100),money(m.property/100),money(m.electricity/100),money(m.advertising/100),money(m.profit/100),Math.round(m.utilization)+' %',m.rating.toFixed(1)+' / 5',m.averageWait.toFixed(1)+' min',m.served+' / '+m.lost,money(m.debt/100)])row.append(text('td',value));table.append(row);
 }
 const total=Object.entries(profiles).reduce((sum,[id,p])=>sum+businessMetrics(p,restaurantPlan(id)).profit,0)-(state.staff.reserveCostCents||0)-state.procurement.costCents-state.rivalry.costCents-state.rivalry.fineCents+state.fruit.revenueCents-state.fruit.costCents;el('financeSummary').textContent='Ergebnis aller Filialen: '+money(total/100)+' · Konto: '+money(state.balance)+' · Personal ohne Restaurant: '+money((state.staff.reserveCostCents||0)/100)+' Kosten, '+money((state.staff.reserveDebtCents||0)/100)+' offen · Lagerbetrieb: '+money(state.procurement.costCents/100)+' Kosten, '+money(state.procurement.debtCents/100)+' offen · Einkaufsvorteil: '+money((Object.values(profiles).reduce((sum,p)=>sum+(p.service.ingredientSavingsCents||0),0)-state.procurement.costCents)/100);
 el('financeSummary').textContent+=' · Konkurrenzaktionen '+money(state.rivalry.costCents/100)+' · Strafen '+money(state.rivalry.fineCents/100)+', davon offen '+money(state.rivalry.debtCents/100);
 el('financeSummary').textContent+=' · Obsthandel: '+money(state.fruit.revenueCents/100)+' Einnahmen, '+money(state.fruit.costCents/100)+' Einkauf.';
 const rates=businessMetrics(profile,restaurantPlan(state.activeRestaurantId)).rates;el('businessRates').textContent='Aktuelle Filiale pro Spielstunde: Personal '+money(rates.staff)+', Gebäude '+money(rates.property)+', Strom '+money(rates.electricity)+'. Monatsgehälter werden über 30 Spieltage verteilt. Eine Spielstunde dauert bei Tempo 1 fünf Minuten. Kosten laufen auch bei geschlossenem Restaurant weiter; Pause hält alles an.';
}
export function mountBusinessUI(){
 mountDailyUI();
 el('financeBtn').onclick=()=>{if(el('staffDialog').open)el('staffDialog').close();view='daily';openDailyReport();el('businessDialog').showModal();renderBusinessUI(true);};
 el('businessClose').onclick=()=>el('businessDialog').close();
 for(const tab of document.querySelectorAll('[data-finance-view]')){
  tab.onclick=()=>{view=tab.dataset.financeView;renderBusinessUI(true);};
  tab.onkeydown=event=>{const tabs=[...document.querySelectorAll('[data-finance-view]')];let target;if(event.key==='ArrowLeft'||event.key==='ArrowRight')target=tabs.find(t=>t!==tab);if(event.key==='Home')target=tabs[0];if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();view=target.dataset.financeView;renderBusinessUI(true);target.focus();}};
 }
}
