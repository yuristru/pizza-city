import {SABOTAGE_ACTIONS,sabotageIssue,executeSabotage} from './pizza-rivalry.js?v=20261016c';
import {renderDistrictPanel} from './pizza-market-ui.js?v=20261016c';
import {serviceMenu} from './pizza-menu-ui.js?v=20261016c';
import {ensureRestaurants} from './pizza-core.js?v=20261016c';
import {minuteLabel,dayLabel} from './pizza-daily.js?v=20261016c';
import {state,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261016c';
import {warehouse,buyWarehouse,warehousePurchaseIssue,purchasingDiscount} from './pizza-procurement.js?v=20261016c';
import {competitor} from './pizza-competitors.js?v=20261016c';
import {warehouseCanvas} from './pizza-warehouse-art.js?v=20261016c';
import {money} from './pizza-catalog.js?v=20261016c';
const el=id=>document.getElementById(id);let selection=null,action=null,stamp=0;
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
  const actions=el('sabotageActions');actions.replaceChildren();
  for(const a of SABOTAGE_ACTIONS){const b=document.createElement('button');b.type='button';b.dataset.sabotage=a.id;b.classList.toggle('active',action===a.id);b.setAttribute('aria-pressed',String(action===a.id));const title=document.createElement('strong'),detail=document.createElement('span'),effect=document.createElement('small');title.textContent=a.name;detail.textContent=money(a.costCents/100)+' · '+Math.round(a.risk*100)+' % Entdeckungsrisiko · Strafe '+money(a.fineCents/100);effect.textContent=a.description;b.append(title,detail,effect);b.onclick=()=>{action=a.id;render();};actions.append(b);}
  renderCommerceUI(true);
 }
 const preview=el('commercePreview'),ctx=preview.getContext('2d');ctx.clearRect(0,0,180,160);ctx.imageSmoothingEnabled=false;
 const image=w?warehouseCanvas():state.cityArt.buildings?.[r.sprite]?.texture.source.resource;
 if(image){const scale=Math.min(160/image.width,150/image.height);ctx.drawImage(image,(180-image.width*scale)/2,155-image.height*scale,image.width*scale,image.height*scale);}
 preview.setAttribute('aria-label',w?'Lagerhalle mit Rolltoren und Ladebereich':'Gebäude von '+r.name);
}
export function openCommerce(id){
 if(!warehouse(id)&&!competitor(id))return;selection=id;action=null;el('sabotageResult').textContent='';el('propertyDialog').close();render();
 if(!el('commerceDialog').open)el('commerceDialog').showModal();el('commerceClose').focus();
}
export function mountCommerceUI(){
 el('sabotageExecute').onclick=()=>{
  const roll=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,result=executeSabotage(state.rivalry,selection,action,Math.round(state.balance*100),state.gameMinutes,roll);
  if(!result){renderCommerceUI(true);return;}
  state.balance=result.balanceCents/100;saveLayout();updateMoney();state.onRivalryChange?.();
  el('sabotageResult').textContent=result.caught?'Erwischt! Aktion gescheitert. Strafe: '+money(result.fineCents/100)+(state.rivalry.debtCents?' · Noch offen: '+money(state.rivalry.debtCents/100):' · Vollständig bezahlt.'):'Aktion gelungen. Die Konkurrenz hat vorübergehend weniger Nachfrage.';
  render();document.dispatchEvent(new Event('rivalry-changed'));
 };
 el('commerceClose').onclick=()=>el('commerceDialog').close();
 el('commerceBuy').onclick=()=>{
  const result=buyWarehouse(selection,state.procurement,state.balance);if(!result)return;
  state.balance=result.balance;saveLayout();updateMoney();state.onPropertyChange?.();render();notify(warehouse(selection).name+' gekauft. Zentraler Einkauf aktiv.');
 };
}

export function renderCommerceUI(force=false){
 if(!competitor(selection)||(!force&&!el('commerceDialog').open)||(!force&&performance.now()-stamp<750))return;stamp=performance.now();
 const a=SABOTAGE_ACTIONS.find(a=>a.id===action),effect=state.rivalry.effects[selection],issue=a?sabotageIssue(state.rivalry,selection,action,Math.round(state.balance*100),state.gameMinutes):null;
 el('sabotageChoice').textContent=a?a.description+' Bei Entdeckung: '+money(a.fineCents/100)+' Strafe.':'Wähle eine Aktion. Bei erfolgreicher Sabotage können Restaurants desselben Viertels zusätzliche Marktanteile gewinnen.';
 const b=el('sabotageExecute');b.disabled=!a||!!issue;b.textContent=a?'Für '+money(a.costCents/100)+' ausführen':'Aktion auswählen';if(issue)el('sabotageChoice').textContent+=' '+issue;
 el('commerceStatus').textContent=(effect?.until>state.gameMinutes?'Nachfrage reduziert bis '+dayLabel(Math.floor(effect.until/1440))+' '+minuteLabel(effect.until)+' Uhr. ':'')+'Konkurrenzrestaurant ist nicht zum Verkauf verfügbar. '+(state.rivalry.debtCents?'Offene Strafen: '+money(state.rivalry.debtCents/100):'');
 el('sabotageHistory').replaceChildren(...state.rivalry.history.filter(h=>h.target===selection).slice(-3).reverse().map(h=>{const p=document.createElement('p');p.textContent=dayLabel(Math.floor(h.minute/1440))+' '+minuteLabel(h.minute)+' · '+SABOTAGE_ACTIONS.find(a=>a.id===h.action).name+' · '+(h.caught?'Erwischt':'Erfolgreich');return p;}));
}
