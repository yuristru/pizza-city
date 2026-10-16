import {CUSTOMER_TIERS,purchaseMarket,marketReady} from './pizza-market.js?v=20261016c';
import {money} from './pizza-catalog.js?v=20261016c';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export function renderDistrictPanel(host,id,state,profiles,menu,{preview=true}={}){
 const m=purchaseMarket(id,profiles,menu,state.rivalry,state.gameMinutes,state.market,state.advertising),d=m.district;
 host.replaceChildren(node('h4',d.name+' · Kundenpotenzial pro Spieltag'));
 const grid=node('div',undefined,'customerTiers');
 for(const [i,t]of CUSTOMER_TIERS.entries()){
  const card=node('article',undefined,'customerTier');card.dataset.tier=t.id;
  card.append(node('span',t.name),node('strong',d.customers[i].toLocaleString('de-DE')),node('small','bis '+money(t.budget/100)+' pro Pizza'),node('small','Heute unvergeben: '+m.remaining[i]));grid.append(card);
 }
 host.append(grid,node('p',m.rivals+' Konkurrenzrestaurant'+(m.rivals===1?'':'s')+' · '+Math.max(0,m.own-(m.site?1:0))+' weitere eigene geöffnete Filialen in diesem Viertel.','marketCompetition'));
 if(preview&&m.site){host.append(node('p','Dein rechnerischer Anteil: '+m.site.expected.map((n,i)=>n+' '+CUSTOMER_TIERS[i].name).join(' · ')+' Kunden / Spieltag.','marketForecast'));
  host.append(node('small',marketReady(profiles[id]||{items:[],business:{}})?'Mit aktueller Einrichtung und Speisekarte.':'Prognose für einen geöffneten Standort mit Holzstühlen, Renovierungsstufe 1 und aktueller Speisekarte; ohne Karte mit Pizza zu 8,50 DM.'));
 }
 host.append(node('p','Alle Restaurants teilen denselben begrenzten Kundenpool. Passende Preise, gute Bewertungen, Mobiliar, Renovierung und zielgerichtete Werbung erhöhen deinen Anteil. Für gehobene Gäste zählen Polsterstühle und hoher Ausbau besonders. Freie Plätze und Personal begrenzen die tatsächlich bedienten Gäste.','marketExplanation'));
 return m;
}
