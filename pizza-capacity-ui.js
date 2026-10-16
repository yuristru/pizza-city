import {restaurantCapacity,utilizationForecast} from './pizza-capacity.js?v=20261016g';
import {purchaseMarket} from './pizza-market.js?v=20261016g';
import {state,ensureRestaurants,restaurantName} from './pizza-core.js?v=20261016g';
import {serviceMenu} from './pizza-menu-ui.js?v=20261016g';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function restaurantForecast(id,profiles,menu,{advertising=state.advertising,taxis=state.taxis}={}){
 const demand=(ads,cabs)=>purchaseMarket(id,profiles,menu,state.rivalry,state.gameMinutes,state.market,ads,cabs).site.expected.reduce((a,b)=>a+b,0);
 let cap=restaurantCapacity(id,profiles[id],state.staff,menu);if(state.procurement.debtCents)cap={...cap,daily:0,bottleneck:'Offene Lagerkosten'};
 return utilizationForecast(cap,demand(state.advertising,state.taxis),demand(advertising,taxis));
}
export function renderCapacityCard(host,id,profiles,menu,preview={}){
 const f=restaurantForecast(id,profiles,menu,preview),c=f.capacity,scale=Math.max(100,Math.ceil(f.nextPercent/25)*25),percent=n=>100*n/Math.max(1,c.daily)/scale*100;
 host.className='capacityCard';host.dataset.before=String(f.before);host.dataset.after=String(f.after);host.dataset.capacity=String(c.daily);host.dataset.additional=String(f.additional);host.dataset.overflow=String(f.overflow);
 const head=node('div',undefined,'capacityHead');head.append(node('strong','Geplante Betriebsauslastung'),node('b',c.daily?Math.min(100,Math.round(f.percent))+' %'+(f.after>f.before?' → '+Math.min(100,Math.round(f.nextPercent))+' %':''):'Noch nicht betriebsbereit'));
 const track=node('div',undefined,'capacityTrack');track.setAttribute('role','img');track.setAttribute('aria-label',c.daily?'Bestehende Nachfrage '+f.before+', zusätzlich bedienbar '+f.additional+', über Kapazität '+f.overflow+' Gäste pro Tag. Kapazität '+c.daily+'.':'Keine Betriebskapazität: '+c.bottleneck);
 for(const [cls,amount]of [['capacityExisting',f.current],['capacityExtra',f.additional],['capacityOverflow',f.overflow]]){const part=node('span',undefined,cls);part.style.width=(c.daily?percent(amount):0)+'%';track.append(part);}
 const limit=node('i',undefined,'capacityLimit');limit.style.left=100/scale*100+'%';track.append(limit);
 const axis=node('div',undefined,'capacityAxis');axis.append(node('span','0 %'),node('span','100 % Kapazität'+(scale>100?' · Skala bis '+scale+' %':'')));
 const legend=node('div',undefined,'capacityLegend');for(const [cls,text]of [['capacityExisting','Bestehend'],['capacityExtra','Zusätzlich bedienbar'],['capacityOverflow','Über Kapazität']]){const label=node('span',text);label.prepend(node('i',undefined,cls));legend.append(label);}
 const p=profiles[id],occupied=p.service.groups.filter(g=>['waiting','eating'].includes(g.phase)).reduce((n,g)=>n+g.size,0),waiting=p.service.groups.filter(g=>g.phase==='waiting').length;
 const details=node('p',c.daily?'Ca. '+c.daily+' Gäste / Spieltag bedienbar · '+c.hours+' Stunden mit Koch und Service. Engpass: '+c.bottleneck+'.':c.bottleneck+'.');
 const live=node('small','Gerade: '+occupied+' / '+c.seats+' Sitzplätze belegt · '+waiting+' Bestellungen warten.');
 const warning=node('p',!c.daily?'Erst den Betrieb vorbereiten. Zusätzliche Nachfrage kann hier noch nicht bedient werden.':f.full?'Kapazität bereits erreicht. Mehr Werbung bringt derzeit keine zusätzliche Bedienkapazität. Zuerst den Engpass verbessern.':f.overflow?'Die Maßnahme passt nur teilweise: +'+f.additional+' Gäste bedienbar; '+f.overflow+' Gäste Nachfrage liegen über der Kapazität.':f.after>f.before?'Voraussichtlich +'+f.additional+' zusätzliche Gäste pro Spieltag bedienbar.':'Noch Platz für zusätzliche Nachfrage.','capacityAdvice');
 host.replaceChildren(head,track,axis,legend,details,live,warning,node('small','Planungsprognose aus Nachfrage, Küche, Arbeitswegen, Tischwechsel und Schichtbesetzung. Keine Umsatzgarantie.'));
 return f;
}
let stamp=0,selection='',optionsKey='';
export function mountCapacityUI(){
 const dialog=document.createElement('dialog');dialog.id='capacityDialog';dialog.setAttribute('aria-labelledby','capacityTitle');dialog.innerHTML='<header class="adHeader"><h2 id="capacityTitle">Auslastung deiner Pizzeria</h2><button id="capacityClose" type="button" aria-label="Auslastung schließen">×</button></header><label class="capacitySelector">Restaurant<select id="capacityRestaurant"></select></label><section id="capacityDetail"></section>';
 document.getElementById('app').append(dialog);document.getElementById('capacityClose').onclick=()=>dialog.close();document.getElementById('capacityRestaurant').onchange=e=>{selection=e.target.value;renderCapacityUI(true);};
 document.getElementById('restaurantCapacityBtn').onclick=()=>{selection=state.activeRestaurantId;dialog.showModal();renderCapacityUI(true);document.getElementById('capacityClose').focus({preventScroll:true});};
}
export function renderCapacityUI(force=false){
 const dialog=document.getElementById('capacityDialog');if(!dialog||!dialog.open&&state.scene!=='restaurant')return;if(!force&&performance.now()-stamp<750)return;stamp=performance.now();
 const profiles=ensureRestaurants(),menu=serviceMenu(),button=document.getElementById('restaurantCapacityBtn');
 if(state.scene==='restaurant'){const f=restaurantForecast(state.activeRestaurantId,profiles,menu);button.textContent='Auslastung: '+(f.capacity.daily?Math.min(100,Math.round(f.percent))+' %':'0 %');button.title=f.capacity.daily?'Auslastung und Engpass: '+f.capacity.bottleneck:f.capacity.bottleneck;button.style.setProperty('--load',Math.min(100,f.percent)+'%');button.dataset.full=String(f.full);}
 if(dialog.open){const key=Object.keys(profiles).join(',');if(key!==optionsKey){optionsKey=key;document.getElementById('capacityRestaurant').replaceChildren(...Object.keys(profiles).map(id=>new Option(restaurantName(id),id)));}if(!profiles[selection])selection=state.activeRestaurantId;document.getElementById('capacityRestaurant').value=selection;renderCapacityCard(document.getElementById('capacityDetail'),selection,profiles,menu);}
}
