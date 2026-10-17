import {TAXI_DRIVERS,TAXI_DURATIONS,taxiQuote,activeTaxiContracts,commissionTaxi} from './pizza-taxis.js?v=20261017b';
import {state,ensureRestaurants,restaurantName,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261017b';
import {renderCapacityCard} from './pizza-capacity-ui.js?v=20261017b';
import {serviceMenu} from './pizza-menu-ui.js?v=20261017b';
import {money} from './pizza-catalog.js?v=20261017b';
import {dayLabel,minuteLabel} from './pizza-daily.js?v=20261017b';
const el=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const when=m=>dayLabel(Math.floor(m/1440))+' · '+minuteLabel(m)+' Uhr';
let driverId='gino',restaurantId='',days=7,stamp=0,optionsKey='';
const request=()=>({driverId,restaurantId,days});
export function openTaxi(id){if(!TAXI_DRIVERS.some(d=>d.id===id))return;driverId=id;restaurantId=state.activeRestaurantId;el('taxiStatus').textContent='';el('taxiDialog').showModal();renderTaxiUI(true);el('taxiClose').focus({preventScroll:true});el('taxiDialog').scrollTop=0;}
export function renderTaxiUI(force=false){
 const dialog=el('taxiDialog');if(!dialog?.open)return;if(!force&&performance.now()-stamp<750)return;stamp=performance.now();dialog.dataset.driver=driverId;
 const profiles=ensureRestaurants(),key=Object.keys(profiles).join(',');if(key!==optionsKey){optionsKey=key;el('taxiRestaurant').replaceChildren(...Object.keys(profiles).map(id=>new Option(restaurantName(id),id)));}if(!profiles[restaurantId])restaurantId=state.activeRestaurantId;el('taxiRestaurant').value=restaurantId;
 const quote=taxiQuote(request()),active=activeTaxiContracts(state.taxis,state.gameMinutes),running=active.find(c=>c.driverId===driverId),affordable=Math.round(state.balance*100)>=quote.totalCents;
 el('taxiTitle').textContent=quote.driver.name+' fährt für dich';el('taxiLine').textContent='„'+quote.driver.line+'“';
 for(const b of dialog.querySelectorAll('[data-taxi-days]'))b.setAttribute('aria-pressed',String(Number(b.dataset.taxiDays)===days));
 const preview=running?state.taxis:{contracts:[...state.taxis.contracts,{...request(),starts:state.gameMinutes,until:state.gameMinutes+days*1440}]};
 renderCapacityCard(el('taxiCapacity'),restaurantId,profiles,serviceMenu(),{taxis:preview});
 el('taxiQuote').textContent=money(quote.totalCents/100)+' einmalig · '+money(quote.dailyCents/100)+' / Spieltag'+(quote.discount?' · '+quote.discount+' % Laufzeitrabatt':'');el('taxiQuote').dataset.cents=String(quote.totalCents);
 el('taxiEnd').textContent='Bis '+when(state.gameMinutes+days*1440)+' · '+days+' Spieltage. Automatisches Ende, keine Verlängerung oder weitere Abbuchung.';
 el('taxiOrder').disabled=!!running||!affordable;el('taxiOrder').textContent='Für '+money(quote.totalCents/100)+' vereinbaren';
 el('taxiIssue').textContent=running?quote.driver.name+' empfiehlt bereits '+restaurantName(running.restaurantId)+' bis '+when(running.until)+'.':!affordable?'Für diesen Vertrag fehlen '+money((quote.totalCents-Math.round(state.balance*100))/100)+'.':'';
 const list=el('taxiContracts');list.replaceChildren();for(const c of active){const article=node('article');article.className='adCampaign';article.append(node('strong',TAXI_DRIVERS.find(d=>d.id===c.driverId).name+' → '+restaurantName(c.restaurantId)),node('p','Noch '+Math.max(1,Math.ceil((c.until-state.gameMinutes)/1440))+' Spieltage · bis '+when(c.until)),node('small',money(c.totalCents/100)+' im Voraus bezahlt'));list.append(article);}if(!active.length)list.append(node('p','Noch keine Taxi-Partnerschaft aktiv.'));
}
export function mountTaxiUI(){
 const dialog=document.createElement('dialog');dialog.id='taxiDialog';dialog.setAttribute('aria-labelledby','taxiTitle');dialog.innerHTML='<header class="adHeader"><div><span>TAXI · PASSAPAROLA</span><h2 id="taxiTitle">Ein guter Tipp vom Fahrer</h2></div><button id="taxiClose" type="button" aria-label="Taxi-Gespräch schließen">×</button></header><p id="taxiLine" class="taxiLine"></p><form id="taxiForm"><label class="capacitySelector">Fahrgäste empfehlen an<select id="taxiRestaurant"></select></label><section id="taxiCapacity"></section><fieldset><legend>Wie lange fahren wir zusammen?</legend><div id="taxiDurations" class="taxiDurations"></div></fieldset><p id="taxiQuote"></p><p id="taxiEnd"></p><p class="taxiNote">Der Fahrer empfiehlt deine Pizzeria regelmäßig allen drei Zielgruppen. Du gewinnst einen größeren Anteil am begrenzten Gästeaufkommen deines Viertels. Mehr Nachfrage ersetzt keine Küche oder freien Plätze.</p><button id="taxiOrder" type="submit">Vereinbaren</button><p id="taxiIssue"></p></form><p id="taxiStatus" class="adStatus" role="status" aria-live="polite"></p><h3>Deine Taxi-Partnerschaften</h3><div id="taxiContracts"></div>';
 el('app').append(dialog);el('taxiClose').onclick=()=>dialog.close();el('taxiRestaurant').onchange=e=>{restaurantId=e.target.value;el('taxiStatus').textContent='';renderTaxiUI(true);};
 for(const duration of TAXI_DURATIONS){const b=node('button');b.type='button';b.dataset.taxiDays=String(duration.days);b.append(node('strong',duration.label),node('small',duration.days+' Spieltage'+(duration.discount?' · '+duration.discount+' % Rabatt':'')));b.onclick=()=>{days=duration.days;el('taxiStatus').textContent='';renderTaxiUI(true);};el('taxiDurations').append(b);}
 el('taxiForm').onsubmit=event=>{event.preventDefault();const result=commissionTaxi(state.taxis,request(),ensureRestaurants(),Math.round(state.balance*100),state.gameMinutes);if(result.ok){state.balance=result.balanceCents/100;saveLayout();updateMoney();el('taxiStatus').textContent=result.quote.driver.name+' empfiehlt jetzt '+restaurantName(restaurantId)+'. '+money(result.quote.totalCents/100)+' einmalig bezahlt. Vertrag bis '+when(result.contract.until)+'.';notify('Taxi-Partnerschaft gestartet.');document.dispatchEvent(new Event('advertising-changed'));}else el('taxiStatus').textContent=result.message;renderTaxiUI(true);};
}
