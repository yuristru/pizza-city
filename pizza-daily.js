export const DAY_MINUTES=1440,SECONDS_PER_MINUTE=5,HISTORY_DAYS=30;
const START_DATE=Date.UTC(2001,3,12);
const moneyKeys=['revenueCents','machineRevenueCents','ingredientsCents','ingredientSavingsCents','staffCents','propertyCents','electricityCents','advertisingCents'];
const countKeys=['servedGuests','machineUses','lostGuests','reviews'];
const measureKeys=['reviewPoints','waitingSeconds','occupiedSeconds','capacitySeconds'];
const counterKeys=[...moneyKeys,...countKeys,...measureKeys];
const validNumber=n=>Number.isFinite(n)&&n>=0&&n<=1e12;
const validInteger=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
export const gameDay=minutes=>Math.floor(minutes/DAY_MINUTES);
export function dayLabel(day){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(START_DATE+day*DAY_MINUTES*60000);}
export function minuteLabel(minutes){const n=Math.floor(minutes)%DAY_MINUTES;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function counters(service){
 const reviews=service.reviews||0;
 return {revenueCents:service.revenueCents||0,machineRevenueCents:service.machineRevenueCents||0,ingredientsCents:service.costCents||0,ingredientSavingsCents:service.ingredientSavingsCents||0,staffCents:service.staffCents||0,propertyCents:service.propertyCents||0,electricityCents:service.electricityCents||0,advertisingCents:service.advertisingCents||0,servedGuests:service.servedGuests||0,machineUses:service.machineUses||0,lostGuests:service.lostGuests||0,reviews,reviewPoints:(service.rating||4)*reviews,waitingSeconds:service.totalWaitingSeconds||0,occupiedSeconds:service.occupiedSeconds||0,capacitySeconds:service.capacitySeconds||0};
}
function opening(minutes,profiles,staff,procurement={},rivalry={}){return {day:gameDay(minutes),since:minutes,branches:Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,{since:minutes,baseline:counters(p.service)}])),rivalryBaseline:(rivalry.costCents||0)+(rivalry.fineCents||0),warehouseBaseline:procurement.costCents||0,reserveBaseline:staff.reserveCostCents||0};}
export function freshDaily(minutes,profiles,staff,procurement={},rivalry={}){return {version:1,current:opening(minutes,profiles,staff,procurement,rivalry),history:[],viewedDay:-1};}
const withMachines=value=>({...value,advertisingCents:value.advertisingCents??0,ingredientSavingsCents:value.ingredientSavingsCents===undefined?0:value.ingredientSavingsCents,machineRevenueCents:value.machineRevenueCents===undefined?0:value.machineRevenueCents,machineUses:value.machineUses===undefined?0:value.machineUses});
function validCounters(value){if(!value)return false;value=withMachines(value);return [...moneyKeys,...countKeys].every(k=>validInteger(value[k]))&&value.machineRevenueCents<=value.revenueCents&&measureKeys.every(k=>validNumber(value[k]))&&value.reviewPoints<=value.reviews*5+1e-6&&value.reviewPoints+1e-6>=value.reviews;}
function validSince(n,day){return validNumber(n)&&n>=day*DAY_MINUTES&&n<(day+1)*DAY_MINUTES;}
function validReport(r,profiles,day){return r&&validInteger(r.day)&&r.day<day&&validSince(r.startMinute,r.day)&&r.endMinute===(r.day+1)*DAY_MINUTES&&r.closed===true&&validInteger(r.rivalryCents??0)&&validInteger(r.rivalryDebtCents??0)&&validInteger(r.reserveCents)&&validInteger(r.reserveDebtCents)&&validInteger(r.warehouseCents??0)&&validInteger(r.warehouseDebtCents??0)&&r.branches&&Object.keys(r.branches).length>0&&Object.keys(r.branches).length<=32&&Object.entries(r.branches).every(([id,b])=>Object.hasOwn(profiles,id)&&validCounters(b)&&validInteger(b.debtCents)&&validSince(b.since,r.day));}
export function restoreDaily(raw,minutes,profiles,staff,procurement={},rivalry={}){
 const daily=freshDaily(minutes,profiles,staff,procurement,rivalry),day=gameDay(minutes);
 if(raw?.version!==1)return daily;
 if(Array.isArray(raw.history))daily.history=raw.history.filter(r=>validReport(r,profiles,day)).sort((a,b)=>a.day-b.day).filter((r,i,list)=>!i||r.day!==list[i-1].day).slice(-HISTORY_DAYS).map(r=>({...structuredClone(r),warehouseCents:r.warehouseCents??0,warehouseDebtCents:r.warehouseDebtCents??0,branches:Object.fromEntries(Object.entries(r.branches).map(([id,b])=>[id,withMachines(structuredClone(b))]))}));
 if(Number.isInteger(raw.viewedDay)&&raw.viewedDay>=-1&&raw.viewedDay<day)daily.viewedDay=raw.viewedDay;
 const c=raw.current;
 if(c?.day!==day||!validSince(c.since,day)||c.since>minutes||!validInteger(c.reserveBaseline)||c.reserveBaseline>(staff.reserveCostCents||0)||!validInteger(c.warehouseBaseline??0)||(c.warehouseBaseline??0)>(procurement.costCents||0)||!c.branches)return daily;
 daily.current.rivalryBaseline=Math.min((rivalry.costCents||0)+(rivalry.fineCents||0),validInteger(c.rivalryBaseline)?c.rivalryBaseline:0);daily.current.warehouseBaseline=c.warehouseBaseline??0;daily.current.since=c.since;daily.current.reserveBaseline=c.reserveBaseline;
 for(const [id,p]of Object.entries(profiles)){
  const b=c.branches[id],now=counters(p.service);
  if(b&&validSince(b.since,day)&&b.since>=c.since&&b.since<=minutes&&validCounters(b.baseline)&&counterKeys.every(k=>withMachines(b.baseline)[k]<=now[k]+1e-6))daily.current.branches[id]={...structuredClone(b),baseline:withMachines(structuredClone(b.baseline))};
 }
 return daily;
}
// A new branch starts its own baseline when purchased, not at the start of an earlier day.
export function ensureDaily(daily,minutes,profiles,staff,procurement={},rivalry={}){
 if(daily.current.day!==gameDay(minutes)||daily.current.since>minutes)daily.current=opening(minutes,profiles,staff,procurement,rivalry);
 for(const [id,p]of Object.entries(profiles))if(!daily.current.branches[id])daily.current.branches[id]={since:minutes,baseline:counters(p.service)};
}
function report(daily,endMinute,profiles,staff,closed,procurement={},rivalry={}){
 const c=daily.current,branches={};
 for(const [id,b]of Object.entries(c.branches))if(profiles[id]){
  const now=counters(profiles[id].service);
  branches[id]={since:b.since,...Object.fromEntries(counterKeys.map(k=>[k,Math.max(0,now[k]-b.baseline[k])])),debtCents:profiles[id].service.debtCents||0};
 }
 return {day:c.day,startMinute:c.since,endMinute,closed,branches,rivalryCents:Math.max(0,(rivalry.costCents||0)+(rivalry.fineCents||0)-(c.rivalryBaseline||0)),rivalryDebtCents:rivalry.debtCents||0,warehouseCents:Math.max(0,(procurement.costCents||0)-(c.warehouseBaseline||0)),warehouseDebtCents:procurement.debtCents||0,reserveCents:Math.max(0,(staff.reserveCostCents||0)-c.reserveBaseline),reserveDebtCents:staff.reserveDebtCents||0};
}
export function currentReport(daily,minutes,profiles,staff,procurement={},rivalry={}){ensureDaily(daily,minutes,profiles,staff,procurement,rivalry);return report(daily,minutes,profiles,staff,false,procurement,rivalry);}
export function completeDay(daily,profiles,staff,procurement={},rivalry={}){
 const boundary=(daily.current.day+1)*DAY_MINUTES,result=report(daily,boundary,profiles,staff,true,procurement,rivalry);
 daily.history.push(result);daily.history=daily.history.slice(-HISTORY_DAYS);daily.current=opening(boundary,profiles,staff,procurement,rivalry);return result;
}
export function reportMetrics(report,id='all'){
 const branches=id==='all'?Object.values(report.branches):report.branches[id]?[report.branches[id]]:[];
 const m=Object.fromEntries(counterKeys.map(k=>[k,branches.reduce((s,b)=>s+(b[k]||0),0)]));
 m.reserveCents=id==='all'?report.reserveCents:0;
 m.rivalryCents=id==='all'?(report.rivalryCents||0):0;
 m.warehouseCents=id==='all'?(report.warehouseCents||0):0;
 m.debtCents=branches.reduce((s,b)=>s+b.debtCents,0)+(id==='all'?report.reserveDebtCents+(report.warehouseDebtCents||0)+(report.rivalryDebtCents||0):0);
 m.costCents=m.ingredientsCents+m.staffCents+m.propertyCents+m.electricityCents+m.advertisingCents+m.reserveCents+m.warehouseCents+m.rivalryCents;
 m.profitCents=m.revenueCents-m.costCents;
 m.rating=m.reviews?Math.max(1,Math.min(5,m.reviewPoints/m.reviews)):null;
 m.averageWait=m.servedGuests?m.waitingSeconds/m.servedGuests/SECONDS_PER_MINUTE:null;
 m.utilization=m.capacitySeconds?Math.max(0,Math.min(100,100*m.occupiedSeconds/m.capacitySeconds)):0;
 return m;
}
