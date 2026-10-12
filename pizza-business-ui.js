import {state,ensureRestaurants,restaurantName,saveLayout,notify} from './pizza-core.js?v=20261012b';
import {restaurantPlan} from './pizza-floorplans.js?v=20261012b';
import {STAFF,businessMetrics} from './pizza-business.js?v=20261012b';
import {money} from './pizza-catalog.js?v=20261012b';
const el=id=>document.getElementById(id);let stamp=0;
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
export function renderBusinessUI(force=false){
 const d=el('businessDialog');if(!d.open)return;if(!force&&performance.now()-stamp<750)return;stamp=performance.now();
 const profiles=ensureRestaurants(),profile=profiles[state.activeRestaurantId],host=el('businessControls');host.replaceChildren(text('h3',restaurantName()));
 const accepting=text('button',profile.business.open===false?'Restaurant öffnen':'Neue Gäste stoppen');accepting.id='acceptGuests';accepting.type='button';accepting.onclick=()=>{profile.business.open=profile.business.open===false;saveLayout();renderBusinessUI(true);};host.append(accepting,text('p','„Neue Gäste stoppen“ lässt laufende Bestellungen fertig werden. Danach kannst du Personal und Geräte umstellen.'));
 const table=el('branchRows');table.replaceChildren();
 for(const [id,p]of Object.entries(profiles)){
  const m=businessMetrics(p,restaurantPlan(id)),row=document.createElement('tr');row.dataset.branch=id;
  const b=text('button',restaurantName(id));b.type='button';b.onclick=()=>{d.close();state.navigate('restaurant',id);};const cell=document.createElement('th');cell.scope='row';cell.append(b);row.append(cell);
  for(const value of [money(m.revenue/100),money(m.ingredients/100),money(m.staff/100),money(m.property/100),money(m.electricity/100),money(m.profit/100),Math.round(m.utilization)+' %',m.rating.toFixed(1)+' / 5',m.averageWait.toFixed(1)+' min',m.served+' / '+m.lost,money(m.debt/100)])row.append(text('td',value));table.append(row);
 }
 const total=Object.entries(profiles).reduce((sum,[id,p])=>sum+businessMetrics(p,restaurantPlan(id)).profit,0)-(state.staff.reserveCostCents||0);el('financeSummary').textContent='Ergebnis aller Filialen: '+money(total/100)+' · Konto: '+money(state.balance)+' · Personal ohne Restaurant: '+money((state.staff.reserveCostCents||0)/100)+' Kosten, '+money((state.staff.reserveDebtCents||0)/100)+' offen';
 const rates=businessMetrics(profile,restaurantPlan(state.activeRestaurantId)).rates;el('businessRates').textContent='Aktuelle Filiale pro Spielstunde: Personal '+money(rates.staff)+', Gebäude '+money(rates.property)+', Strom '+money(rates.electricity)+'. Monatsgehälter werden über 30 Spieltage verteilt. Eine Spielstunde dauert bei Tempo 1 fünf Minuten. Kosten laufen auch bei geschlossenem Restaurant weiter; Pause hält alles an.';
}
export function mountBusinessUI(){
 for(const id of ['financeBtn'])el(id).onclick=()=>{el('businessDialog').showModal();renderBusinessUI(true);};
 el('businessClose').onclick=()=>el('businessDialog').close();
}
