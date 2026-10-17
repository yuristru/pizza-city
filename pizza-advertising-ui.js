import {AD_FORMATS,AD_QUALITIES,AD_DURATIONS,campaignQuote,activeCampaigns,commissionCampaign} from './pizza-advertising.js?v=20261017-house3d';
import {state,ensureRestaurants,restaurantName,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261017-house3d';
import {restaurantDistrict,purchaseMarket,marketReady} from './pizza-market.js?v=20261017-house3d';
import {serviceMenu} from './pizza-menu-ui.js?v=20261017-house3d';
import {money} from './pizza-catalog.js?v=20261017-house3d';
import {dayLabel,minuteLabel} from './pizza-daily.js?v=20261017-house3d';
import {renderCapacityCard} from './pizza-capacity-ui.js?v=20261017-house3d';
const el=id=>document.getElementById(id);
const node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
let restaurantId='',formatId='flyer',qualityId='simple',days=3,stamp=0,optionsKey='',campaignKey='';
const when=minute=>dayLabel(Math.floor(minute/1440))+' · '+minuteLabel(minute)+' Uhr';
function remaining(minutes){const n=Math.max(1,Math.ceil(minutes)),d=Math.floor(n/1440),h=Math.floor(n%1440/60),m=n%60;return [d?d+' T':null,h?h+' Std.':null,m?m+' Min.':null].filter(Boolean).join(' ');}
function selection(){return {restaurantId,formatId,qualityId,days};}
function changed(){el('advertisingStatus').textContent='';renderAdvertisingUI(true);}
function choice(host,data,attribute,title,detail,choose){
 const button=node('button');button.type='button';button.dataset[attribute]=String(data);button.setAttribute('aria-pressed','false');button.append(node('strong',title),node('small',detail));button.onclick=()=>{choose(data);changed();};el(host).append(button);return button;
}
function renderCampaigns(profiles){
 const active=activeCampaigns(state.advertising,state.gameMinutes),ended=state.advertising.campaigns.filter(c=>c.until<=state.gameMinutes).sort((a,b)=>a.until-b.until||a.id-b.id).slice(-3).reverse(),key=Object.keys(profiles).join(',')+':'+state.advertising.campaigns.map(c=>c.id).join(',')+':'+Math.floor(state.gameMinutes);
 el('advertisingCount').textContent=String(active.length);
 if(key===campaignKey)return;campaignKey=key;
 const list=el('advertisingCampaigns');list.replaceChildren();
 if(!active.length)list.append(node('p','Noch keine Kampagne aktiv. Stelle oben deinen ersten Werbeauftrag zusammen.','adEmpty'));
 for(const c of active){
  const q=campaignQuote(c),card=node('article',undefined,'adCampaign');card.dataset.campaign=String(c.id);
  const head=node('div',undefined,'adCampaignHead');head.append(node('h4',q.format.name+' · '+q.quality.name),node('span',q.quality.audience,'adAudience'));card.append(head,node('strong',restaurantName(c.restaurantId)+' · '+restaurantDistrict(c.restaurantId).name));
  const progress=node('progress');progress.max=c.days*1440;progress.value=Math.max(0,state.gameMinutes-c.starts);progress.setAttribute('aria-label','Vergangene Laufzeit der Kampagne');
  card.append(node('p','Noch '+remaining(c.until-state.gameMinutes)+' · endet '+when(c.until)),progress,node('small',money(c.totalCents/100)+' einmalig bezahlt · keine weiteren Abbuchungen'));list.append(card);
 }
 const history=el('advertisingHistory');history.replaceChildren();history.hidden=!ended.length;
 if(ended.length){history.append(node('h4','Zuletzt beendet'));for(const c of ended){const q=campaignQuote(c);history.append(node('p',q.format.name+' · '+q.quality.audience+' · '+restaurantName(c.restaurantId)+' · beendet '+when(c.until)));}}
}
export function renderAdvertisingUI(force=false){
 const dialog=el('advertisingDialog');if(!dialog.open)return;if(!force&&performance.now()-stamp<750)return;stamp=performance.now();
 const profiles=ensureRestaurants(),ids=Object.keys(profiles),key=ids.join(',');
 if(key!==optionsKey){optionsKey=key;el('advertisingRestaurant').replaceChildren(...ids.map(id=>new Option(restaurantName(id)+' · '+restaurantDistrict(id).name,id)));}
 if(!Object.hasOwn(profiles,restaurantId))restaurantId=state.activeRestaurantId;
 el('advertisingRestaurant').value=restaurantId;
 for(const [attribute,value]of [['adFormat',formatId],['adQuality',qualityId],['adDays',String(days)]])for(const b of dialog.querySelectorAll('[data-'+attribute.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']'))b.setAttribute('aria-pressed',String(b.dataset[attribute]===value));
 const quote=campaignQuote(selection()),d=restaurantDistrict(restaurantId),tier=AD_QUALITIES.findIndex(q=>q.id===qualityId),active=activeCampaigns(state.advertising,state.gameMinutes),duplicate=active.some(c=>c.restaurantId===restaurantId&&c.formatId===formatId&&c.qualityId===qualityId),affordable=Math.round(state.balance*100)>=quote.totalCents;
 el('advertisingBalance').textContent='Verfügbar: '+money(state.balance);
 el('advertisingQuoteTitle').textContent=quote.format.name+' · '+quote.quality.name;
 el('advertisingTarget').textContent=quote.quality.audience+' · '+d.name+' · '+d.customers[tier]+' potenzielle Gäste / Spieltag';
 el('advertisingTotal').textContent=money(quote.totalCents/100);el('advertisingTotal').dataset.cents=String(quote.totalCents);
 el('advertisingDaily').textContent=money(quote.dailyCents/100)+' pro Spieltag';el('advertisingDaily').dataset.cents=String(quote.dailyCents);
 el('advertisingDiscount').textContent=quote.discount?quote.discount+' % Laufzeitrabatt · statt '+money(quote.regularDailyCents/100)+' / Tag':'Regulärer Tagespreis';
 el('advertisingEnd').textContent=days+' Spieltag'+(days===1?'':'e')+' · bis '+when(state.gameMinutes+days*1440);
 el('advertisingEffect').textContent='+'+Math.round(quote.strength*100)+' % Sichtbarkeit bei '+quote.quality.audience+'. Kombinierte Werbung wirkt bis maximal +200 % je Zielgruppe.';
 const menu=serviceMenu(),before=purchaseMarket(restaurantId,profiles,menu,state.rivalry,state.gameMinutes,state.market,state.advertising,state.taxis),preview={campaigns:[...state.advertising.campaigns,{...selection(),starts:state.gameMinutes,until:state.gameMinutes+days*1440}]},after=purchaseMarket(restaurantId,profiles,menu,state.rivalry,state.gameMinutes,state.market,preview,state.taxis);
 renderCapacityCard(el('advertisingCapacity'),restaurantId,profiles,menu,{advertising:duplicate?state.advertising:preview});
 el('advertisingForecast').textContent='Rechnerisches Tagespotenzial bei '+quote.quality.audience+': '+before.site.expected[tier]+' → '+(duplicate?before.site.expected[tier]:after.site.expected[tier])+' Gäste.';
 el('advertisingReadiness').textContent=marketReady(profiles[restaurantId])?'Deine aktuelle Einrichtung und Speisekarte sind berücksichtigt.':'Prognose für einen geöffneten Standort mit Holzstühlen und Renovierungsstufe 1. Für Gäste brauchst du Küche, Tische, Personal und eine passende Speisekarte.';
 const submit=el('advertisingOrder');submit.disabled=duplicate||!affordable;submit.textContent='Für '+money(quote.totalCents/100)+' beauftragen';
 el('advertisingIssue').textContent=duplicate?'Dieses Format läuft hier bereits für diese Zielgruppe. Wähle ein anderes Format oder warte bis zum Ende.':!affordable?'Für diesen Auftrag fehlen '+money((quote.totalCents-Math.round(state.balance*100))/100)+'.':'';
 renderCampaigns(profiles);
}
export function mountAdvertisingUI(){
 const icons={flyer:'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6',poster:'M4 4h16v13H4z M8 17v5 M16 17v5 M7 13l4-5 3 3 3-2',newspaper:'M5 4h15v16H5z M5 8H2v12h18 M8 7h8 M8 11h3v5H8z M14 11h3 M14 15h3',radio:'M3 8h18v12H3z M6 8l12-5 M6 12h5v4H6z M15 12h3 M15 16h3'};
 for(const f of AD_FORMATS){const b=choice('advertisingFormats',f.id,'adFormat',f.name.replace('Plakat','Plakat\u00ad'),f.description,value=>{formatId=value;});const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d',icons[f.id]);svg.append(path);b.prepend(svg);b.append(node('span','+'+Math.round(f.strength*100)+' % Sichtbarkeit','adStrength'));}
 for(const [i,q]of AD_QUALITIES.entries())choice('advertisingQualities',q.id,'adQuality',(i+1)+' · '+q.name,'Zielgruppe '+q.audience,value=>{qualityId=value;});
 for(const d of AD_DURATIONS)choice('advertisingDurations',d.days,'adDays',d.days+' Spieltag'+(d.days===1?'':'e'),d.discount?d.discount+' % günstiger / Tag':'Ohne Rabatt',value=>{days=value;});
 el('advertisingRestaurant').onchange=event=>{restaurantId=event.target.value;changed();};
 el('advertisingBtn').onclick=()=>{restaurantId=state.activeRestaurantId;campaignKey='';el('advertisingStatus').textContent='';el('advertisingDialog').showModal();renderAdvertisingUI(true);el('advertisingClose').focus({preventScroll:true});el('advertisingDialog').scrollTop=0;};
 el('advertisingClose').onclick=()=>el('advertisingDialog').close();
 el('advertisingForm').onsubmit=event=>{
  event.preventDefault();const result=commissionCampaign(state.advertising,selection(),ensureRestaurants(),Math.round(state.balance*100),state.gameMinutes);
  if(result.ok){state.balance=result.balanceCents/100;saveLayout();updateMoney();el('advertisingStatus').textContent=result.quote.format.name+' für '+restaurantName(restaurantId)+' beauftragt. '+money(result.quote.totalCents/100)+' einmalig bezahlt. Läuft bis '+when(result.campaign.until)+'.';notify('Werbekampagne gestartet.');document.dispatchEvent(new Event('advertising-changed'));}
  else el('advertisingStatus').textContent=result.message;
  campaignKey='';renderAdvertisingUI(true);
 };
}
