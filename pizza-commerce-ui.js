import {openContactGuide} from './pizza-underworld-ui.js?v=20261018-brick4';
import {SABOTAGE_ACTIONS} from './pizza-rivalry.js?v=20261018-brick4';
import {renderDistrictPanel} from './pizza-market-ui.js?v=20261018-brick4';
import {serviceMenu} from './pizza-menu-ui.js?v=20261018-brick4';
import {ensureRestaurants} from './pizza-core.js?v=20261018-brick4';
import {minuteLabel,dayLabel} from './pizza-daily.js?v=20261018-brick4';
import {state,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261018-brick4';
import {warehouse,buyWarehouse,warehousePurchaseIssue,purchasingDiscount} from './pizza-procurement.js?v=20261018-brick4';
import {competitor} from './pizza-competitors.js?v=20261018-brick4';
import {warehouseCanvas} from './pizza-warehouse-art.js?v=20261018-brick4';
import {money} from './pizza-catalog.js?v=20261018-brick4';
const el=id=>document.getElementById(id);let selection=null,stamp=0;
function render(){
 const w=warehouse(selection),r=competitor(selection),dialog=el('commerceDialog');if(!w&&!r)return;
 dialog.dataset.kind=w?'warehouse':'competitor';dialog.dataset.site=selection;
 el('commerceTitle').textContent=w?w.name:r.name;
 el('commerceInfo').textContent=w?w.district+' · Zentrallager':'Konkurrenz · Betreiber: '+r.owner;
 el('commerceDescription').textContent=w?'Versorgt automatisch alle eigenen Restaurants, auch neue Standorte. Zutaten werden bei jeder Pizza 20 % günstiger. Weitere Lager erhöhen den Rabatt nicht.':'Unabhängige Pizzeria · '+r.specialty+'. Dieses Restaurant wird von einem anderen Betreiber geführt.';
 el('commercePrice').textContent=w?'Kaufpreis '+money(w.price)+' · Betrieb '+money(w.dailyCents/100)+' pro Spieltag':'';
 const owned=w&&state.procurement.owned.includes(w.id),issue=w?warehousePurchaseIssue(w.id,state.procurement,state.balance):null;
 el('commerceStatus').textContent=w?(owned?'Dein Lager · Zentraler Einkauf aktiv · '+purchasingDiscount(state.procurement)+' % Einkaufsrabatt':issue||(state.procurement.owned.length?'Ein Lager versorgt bereits die gesamte Kette. Ein weiteres kostet zusätzlich, ohne höheren Rabatt.':'Der Kauf aktiviert den zentralen Einkauf für deine gesamte Kette.')):'Konkurrenz-Pizzerien sind nicht zum Verkauf verfügbar.';
 const button=el('commerceBuy');button.hidden=!w;button.disabled=!!issue;button.textContent=owned?'Bereits gekauft':'Lager kaufen';
 el('competitorMarket').hidden=!!w;el('sabotagePanel').hidden=!!w;
 if(r){renderDistrictPanel(el('competitorMarket'),r.id,state,ensureRestaurants(),serviceMenu(),{preview:false});
  renderCommerceUI(true);
 }
 const preview=el('commercePreview'),ctx=preview.getContext('2d');ctx.clearRect(0,0,180,160);ctx.imageSmoothingEnabled=false;
 const image=w?warehouseCanvas():state.cityArt.buildings?.[r.sprite]?.texture.source.resource;
 if(image){const scale=Math.min(160/image.width,150/image.height);ctx.drawImage(image,(180-image.width*scale)/2,155-image.height*scale,image.width*scale,image.height*scale);}
 preview.setAttribute('aria-label',w?'Lagerhalle mit Rolltoren und Ladebereich':'Gebäude von '+r.name);
}
export function openCommerce(id){
 if(!warehouse(id)&&!competitor(id))return;selection=id;el('propertyDialog').close();render();
 if(!el('commerceDialog').open)el('commerceDialog').showModal();el('commerceClose').focus();
}
export function mountCommerceUI(){
 el('findCityContacts').onclick=()=>{el('commerceDialog').close();openContactGuide(selection);};
 el('commerceClose').onclick=()=>el('commerceDialog').close();
 el('commerceBuy').onclick=()=>{
  const result=buyWarehouse(selection,state.procurement,state.balance);if(!result)return;
  state.balance=result.balance;saveLayout();updateMoney();state.onPropertyChange?.();render();notify(warehouse(selection).name+' gekauft. Zentraler Einkauf aktiv.');
 };
}

export function renderCommerceUI(force=false){
 if(!competitor(selection)||(!force&&!el('commerceDialog').open)||(!force&&performance.now()-stamp<750))return;stamp=performance.now();
 const effect=state.rivalry.effects[selection],pending=state.rivalry.pending.find(j=>j.target===selection);
 el('sabotageStatus').textContent=pending?'Auftrag läuft · geplant für '+dayLabel(Math.floor(pending.due/1440))+' '+minuteLabel(pending.due)+' Uhr.':'Diskrete Aufträge gibt es bei Kontakten auf Parkbänken und am Skaterpark. Hinweise ans Ordnungsamt gibst du in einer Telefonzelle auf.';
 el('commerceStatus').textContent=(effect?.until>state.gameMinutes?'Nachfrage reduziert bis '+dayLabel(Math.floor(effect.until/1440))+' '+minuteLabel(effect.until)+' Uhr. ':'')+'Konkurrenzrestaurant ist nicht zum Verkauf verfügbar. '+(state.rivalry.debtCents?'Offene Strafen: '+money(state.rivalry.debtCents/100):'');
 el('sabotageHistory').replaceChildren(...state.rivalry.history.filter(h=>h.target===selection).slice(-3).reverse().map(h=>{const p=document.createElement('p');p.textContent=dayLabel(Math.floor(h.minute/1440))+' '+minuteLabel(h.minute)+' · '+SABOTAGE_ACTIONS.find(a=>a.id===h.action).name+' · '+(h.caught?'Erwischt':'Erfolgreich');return p;}));
}
