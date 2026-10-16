import {state,ensureRestaurants,restaurantName,saveLayout} from './pizza-core.js?v=20261016b';
import {DAY_MINUTES,currentReport,reportMetrics,dayLabel,minuteLabel} from './pizza-daily.js?v=20261016b';
import {money} from './pizza-catalog.js?v=20261016b';
import {purchasingDiscount,warehouseDailyCost} from './pizza-procurement.js?v=20261016b';
const el=id=>document.getElementById(id),number=new Intl.NumberFormat('de-DE',{maximumFractionDigits:1,minimumFractionDigits:1});
let selectedDay='current',selectedRestaurant='all',dayOptions='',branchOptions='',trendStamp='',branchStamp='';
function node(tag,value,className){const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(className)e.className=className;return e;}
function button(label,action){const e=node('button',label);e.type='button';e.onclick=action;return e;}
export function updateDailyNotice(){
 const latest=state.daily.history.at(-1),unread=latest&&latest.day>state.daily.viewedDay,b=el('financeBtn');
 b.dataset.newReport=String(!!unread);b.setAttribute('aria-label',unread?'Finanzen, neuer Tagesabschluss verfügbar':'Finanzen');
 const notice=el('dailyNotice');notice.hidden=!unread;
 if(unread){notice.textContent='Tagesabschluss vom '+dayLabel(latest.day)+' ansehen';notice.onclick=()=>{selectedDay=String(latest.day);renderDailyUI(true);};}
}
export function openDailyReport(){const latest=state.daily.history.at(-1);selectedDay=latest&&latest.day>state.daily.viewedDay?String(latest.day):'current';}
function filters(report){
 const key=state.daily.current.day+':'+state.daily.history.map(r=>r.day).join(',');
 if(key!==dayOptions){dayOptions=key;el('reportDay').replaceChildren(new Option('Heute · '+dayLabel(state.daily.current.day),'current'),...state.daily.history.slice().reverse().map(r=>new Option(dayLabel(r.day)+' · abgeschlossen',String(r.day))));}
 el('reportDay').value=selectedDay;
 const ids=Object.keys(report.branches),branches=ids.join(',');
 if(branches!==branchOptions){branchOptions=branches;el('reportRestaurant').replaceChildren(new Option('Alle Restaurants','all'),...ids.map(id=>new Option(restaurantName(id),id)));}
 if(selectedRestaurant!=='all'&&!report.branches[selectedRestaurant])selectedRestaurant='all';
 el('reportRestaurant').value=selectedRestaurant;
}
function kpi(label,value,kind){const e=node('article',undefined,'dailyKpi');if(kind)e.dataset.kind=kind;e.append(node('span',label),node('strong',value));return e;}
function meter(label,value,max,caption){
 const row=node('div',undefined,'dailyMeter'),heading=node('div',undefined,'dailyMeterLabel');heading.append(node('span',label),node('strong',caption));row.append(heading);
 if(value!==null){const track=node('div',undefined,'dailyMeterTrack');track.setAttribute('role','meter');track.setAttribute('aria-label',label);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(max));track.setAttribute('aria-valuenow',String(value));track.setAttribute('aria-valuetext',caption);const fill=node('span');fill.style.width=Math.min(100,value/max*100)+'%';track.append(fill);row.append(track);}
 return row;
}
function renderFigures(report){
 const m=reportMetrics(report,selectedRestaurant),overview=el('dailyOverview');
 overview.replaceChildren(kpi('Umsatz',money(m.revenueCents/100)),kpi('Kosten',money(m.costCents/100)),kpi('Gewinn',money(m.profitCents/100),m.profitCents<0?'loss':'profit'),kpi('Bediente Gäste',String(m.servedGuests)));
 const machines=node('small','davon Automaten: '+money(m.machineRevenueCents/100));machines.dataset.machineRevenue=String(m.machineRevenueCents);overview.firstElementChild.append(machines);
 const since=selectedRestaurant==='all'?report.startMinute:report.branches[selectedRestaurant].since;
 el('dailyTitle').textContent=(selectedRestaurant==='all'?'Alle Restaurants':restaurantName(selectedRestaurant))+' · '+dayLabel(report.day);
 el('dailyPeriod').textContent=(report.closed?'Abgeschlossen':'Laufender Spieltag')+' · '+minuteLabel(since)+' bis '+(report.closed?'24:00':minuteLabel(report.endMinute))+' Uhr'+(since>report.day*DAY_MINUTES?' · Teil des Tages erfasst':'');
 const costs=el('dailyCosts');costs.replaceChildren(node('h3','Kosten im Detail'));
 const rows=[['Zutaten',m.ingredientsCents],[selectedRestaurant==='all'?'Löhne in Restaurants':'Löhne',m.staffCents],['Gebäude',m.propertyCents],['Strom',m.electricityCents]];
 if(selectedRestaurant==='all')rows.push(['Löhne ohne Restaurant',m.reserveCents],['Lagerbetrieb',m.warehouseCents],['Konkurrenzaktionen und Strafen',m.rivalryCents]);
 for(const [label,cents]of rows)costs.append(meter(label,cents,Math.max(1,m.costCents),money(cents/100)));
 const procurement=el('dailyProcurement');procurement.replaceChildren(node('h3','Zentraler Einkauf'),node('p',purchasingDiscount(state.procurement)?'Aktuell aktiv · 20 % Zutatenrabatt für alle eigenen Restaurants · '+money(warehouseDailyCost(state.procurement)/100)+' Lagerbetrieb pro Spieltag':'Aktuell kein Lager · Zutaten zum regulären Einkaufspreis'),kpi('Eingesparte Zutatenkosten im gewählten Zeitraum',money(m.ingredientSavingsCents/100)));
 if(selectedRestaurant==='all')procurement.append(kpi('Lagerbetrieb im gewählten Zeitraum',money(m.warehouseCents/100)),kpi('Vorteil nach Lagerkosten',money((m.ingredientSavingsCents-m.warehouseCents)/100)));
 else procurement.append(node('small','Lagerkosten werden für die gesamte Kette unter „Alle Restaurants“ erfasst.'));
 const guest=el('dailyGuests');guest.replaceChildren(node('h3','Gäste und Zufriedenheit'),meter('Gästezufriedenheit',m.rating,5,m.rating===null?'Noch keine Bewertung':number.format(m.rating)+' / 5'),meter('Sitzplatzauslastung',m.utilization,100,number.format(m.utilization)+' %'));
 const facts=node('dl',undefined,'dailyFacts');
 for(const [label,value]of [['Bewertungen',String(m.reviews)],['Verlorene Gäste',String(m.lostGuests)],['Automatennutzungen',String(m.machineUses)],['Mittlere Wartezeit',m.averageWait===null?'Noch keine Zahlung':number.format(m.averageWait)+' min'],['Offene Kosten am '+(report.closed?'Tagesende':'aktuellen Stand'),money(m.debtCents/100)]])facts.append(node('dt',label),node('dd',value));guest.append(facts);
 const branches=el('dailyBranches');branches.hidden=selectedRestaurant!=='all';
 if(selectedRestaurant==='all'){
  const ids=Object.keys(report.branches),key=ids.join(',');
  if(key!==branchStamp){branchStamp=key;branches.replaceChildren(node('h3','Restaurants an diesem Tag'));const list=node('div',undefined,'dailyBranchList');for(const id of ids){const row=button('',()=>{selectedRestaurant=id;renderDailyUI(true);});row.dataset.reportBranch=id;row.append(node('span',restaurantName(id),'dailyBranchName'),node('span'),node('strong'));list.append(row);}branches.append(list);}
  for(const row of branches.querySelectorAll('[data-report-branch]')){const b=reportMetrics(report,row.dataset.reportBranch);row.children[1].textContent=b.servedGuests+' Gäste';row.children[2].textContent=money(b.profitCents/100);row.dataset.kind=b.profitCents<0?'loss':'profit';}
 }
}
function renderTrend(force=false){
 const history=state.daily.history.filter(r=>selectedRestaurant==='all'||r.branches[selectedRestaurant]).slice(-7),key=selectedRestaurant+':'+selectedDay+':'+history.map(r=>r.day).join(',');
 if(!force&&key===trendStamp)return;trendStamp=key;const host=el('dailyTrend');host.replaceChildren(node('h3','Gewinn der letzten Spieltage'));
 if(!history.length){host.append(node('p','Der erste Tagesabschluss entsteht um 00:00 Uhr. Bis dahin siehst du die laufenden Werte.','dailyEmpty'));return;}
 const profits=history.map(r=>reportMetrics(r,selectedRestaurant).profitCents),scale=Math.max(1,...profits.map(Math.abs)),chart=node('div',undefined,'dailyProfitChart');chart.setAttribute('aria-label','Gewinn und Verlust abgeschlossener Spieltage');
 for(let i=0;i<history.length;i++){
  const r=history[i],profit=profits[i],b=button('',()=>{selectedDay=String(r.day);renderDailyUI(true);});b.dataset.reportTrend=String(r.day);b.dataset.kind=profit<0?'loss':'profit';b.setAttribute('aria-label',dayLabel(r.day)+': '+money(profit/100)+' Gewinn');b.setAttribute('aria-pressed',String(selectedDay===String(r.day)));
  const plot=node('span',undefined,'dailyProfitPlot'),bar=node('span',undefined,'dailyProfitBar');bar.style.height=(Math.abs(profit)/scale*44)+'%';bar.setAttribute('aria-hidden','true');plot.append(bar);b.append(node('strong',money(profit/100)),plot,node('span',dayLabel(r.day).slice(0,5)));chart.append(b);
 }
 host.append(chart,node('p','Grün: Gewinn · Rot: Verlust. Tippe auf einen Tag, um den Abschluss zu öffnen.','dailyChartCaption'));
}
export function renderDailyUI(force=false){
 const profiles=ensureRestaurants();let report=selectedDay==='current'?currentReport(state.daily,state.gameMinutes,profiles,state.staff,state.procurement,state.rivalry):state.daily.history.find(r=>String(r.day)===selectedDay);
 if(!report){selectedDay='current';report=currentReport(state.daily,state.gameMinutes,profiles,state.staff,state.procurement,state.rivalry);}
 filters(report);renderFigures(report);renderTrend(force);
 if(report.closed&&state.daily.viewedDay<report.day){state.daily.viewedDay=report.day;saveLayout(true);}
 updateDailyNotice();
}
export function mountDailyUI(){
 el('reportDay').onchange=()=>{selectedDay=el('reportDay').value;renderDailyUI(true);};
 el('reportRestaurant').onchange=()=>{selectedRestaurant=el('reportRestaurant').value;renderDailyUI(true);};
 document.addEventListener('day-closed',()=>{updateDailyNotice();if(el('businessDialog').open&&!el('dailyContent').hidden)renderDailyUI(true);});
 updateDailyNotice();
}
