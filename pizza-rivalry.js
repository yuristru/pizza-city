import {competitor} from './pizza-competitors.js?v=20261017-house3d';
export const SABOTAGE_ACTIONS=[
 {id:'doodle',name:'Kleine Schmiererei',costCents:0,risk:.12,fineCents:500000,duration:120,factor:.94,giftOnly:true,description:'Kleiner Schriftzug: 6 % weniger Nachfrage für 2 Spielstunden.'},
 {id:'inspection',name:'Beim Ordnungsamt melden',costCents:75000,risk:.15,fineCents:1500000,duration:360,factor:.55,description:'Kontrolle: 45 % weniger Nachfrage für 6 Spielstunden.'},
 {id:'roaches',name:'Kakerlaken aussetzen',costCents:240000,risk:.42,fineCents:4500000,duration:1440,factor:.2,description:'Hygienevorfall: 80 % weniger Nachfrage für 24 Spielstunden.'},
 {id:'stinkbomb',name:'Stinkbombe',costCents:120000,risk:.28,fineCents:2400000,duration:240,factor:.35,description:'Geruchsbelästigung: 65 % weniger Nachfrage für 4 Spielstunden.'},
 {id:'graffiti',name:'Fassade ansprühen',costCents:90000,risk:.36,fineCents:1800000,duration:720,factor:.75,description:'Beschädigte Fassade: 25 % weniger Nachfrage für 12 Spielstunden.'}
];
export const ORDER_CHANNELS={bench:['roaches','stinkbomb'],skate:['graffiti','doodle'],phone:['inspection']};
export const ORDER_DELAY={inspection:45,roaches:90,stinkbomb:30,graffiti:60,doodle:30};
export const phoneRisk=credibility=>[.45,.35,.25,.15,.08][Math.max(0,Math.min(4,Math.floor(credibility)))];
const contactChannel=id=>['bench-nino','bench-rocco'].includes(id)?'bench':id==='skate-crew'?'skate':['phone-arena','phone-dom','phone-piazza'].includes(id)?'phone':null;
export function freshRivalry(){return {version:2,nextId:1,pending:[],costCents:0,fineCents:0,debtCents:0,effects:{},cooldowns:{},history:[]};}
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
export function restoreRivalry(raw){
 const r=freshRivalry();if(![1,2].includes(raw?.version))return r;
 for(const k of ['costCents','fineCents','debtCents'])if(cents(raw[k]))r[k]=raw[k];r.debtCents=Math.min(r.debtCents,r.fineCents);
 for(const [id,e]of Object.entries(raw.effects||{}))if(competitor(id)&&Number.isFinite(e?.until)&&e.until>=0&&e.until<=1e10&&SABOTAGE_ACTIONS.some(a=>a.id===e.action&&a.factor===e.factor))r.effects[id]={until:e.until,factor:e.factor,action:e.action};
 for(const [id,t]of Object.entries(raw.cooldowns||{}))if(competitor(id)&&Number.isFinite(t)&&t>=0&&t<=1e10)r.cooldowns[id]=t;
 if(Array.isArray(raw.history))r.history=raw.history.filter(h=>competitor(h?.target)&&SABOTAGE_ACTIONS.some(a=>a.id===h.action)&&Number.isFinite(h.minute)&&h.minute>=0&&typeof h.caught==='boolean').slice(-20).map(h=>({target:h.target,action:h.action,minute:h.minute,caught:h.caught,...(ORDER_CHANNELS[h.channel]?{channel:h.channel,contactId:h.contactId}:{}),...(Number.isSafeInteger(h.orderId)&&h.orderId>0&&h.orderId<1e9?{orderId:h.orderId}:{})}));
 const ids=new Set(r.history.map(h=>h.orderId).filter(Boolean)),targets=new Set();let plannedCost=0;
 if(raw.version===2&&Array.isArray(raw.pending))for(const j of raw.pending.slice(0,3)){
  if(!competitor(j?.target)||targets.has(j.target)||!ORDER_CHANNELS[j.channel]?.includes(j.action)||contactChannel(j.contactId)!==j.channel||!Number.isSafeInteger(j.id)||j.id<1||j.id>=1e9||ids.has(j.id)||!Number.isFinite(j.minute)||j.minute<0||j.minute>1e10||j.due!==j.minute+ORDER_DELAY[j.action]||!Number.isFinite(j.roll)||j.roll<0||j.roll>=1||(j.channel==='phone'&&(!Number.isInteger(j.credibility)||j.credibility<0||j.credibility>4)))continue;
  if(j.action==='doodle'&&j.gift!==true)continue;const price=SABOTAGE_ACTIONS.find(a=>a.id===j.action).costCents;if(plannedCost+price>r.costCents)continue;plannedCost+=price;
  r.pending.push({id:j.id,target:j.target,action:j.action,channel:j.channel,contactId:j.contactId,minute:j.minute,due:j.due,roll:j.roll,...(j.action==='doodle'?{gift:true}:{}),...(j.channel==='phone'?{credibility:j.credibility}:{})});r.cooldowns[j.target]=Math.max(r.cooldowns[j.target]||0,j.due+360);ids.add(j.id);targets.add(j.target);
 }
 r.nextId=Math.max(0,...ids,...r.history.map(h=>h.orderId||0))+1;if(Number.isSafeInteger(raw.nextId)&&raw.nextId>=r.nextId&&raw.nextId<1e9)r.nextId=raw.nextId;return r;
}
export function sabotageIssue(r,target,action,balanceCents,minutes){
 const a=SABOTAGE_ACTIONS.find(a=>a.id===action);
 if(!Number.isSafeInteger(balanceCents)||balanceCents<0||!Number.isFinite(minutes)||minutes<0)return 'Ungültiger Kontostand oder Spielzeit.';
 if(!competitor(target)||!a)return 'Ungültige Aktion.';
 if(r.debtCents)return 'Zuerst die offene Strafe begleichen.';
 if(r.pending?.some(j=>j.target===target))return 'Für dieses Restaurant läuft bereits ein Auftrag.';
 if((r.cooldowns[target]||0)>minutes)return 'Dieser Konkurrent ist vorübergehend für weitere Aktionen gesperrt.';
 if((r.effects[target]?.until||0)>minutes)return 'Bei diesem Konkurrenten wirkt bereits eine Aktion.';
 if(balanceCents<a.costCents)return 'Nicht genügend Geld für diese Aktion.';
 return null;
}
export function executeSabotage(r,target,action,balanceCents,minutes,roll=Math.random()){
 if(sabotageIssue(r,target,action,balanceCents,minutes)||!Number.isFinite(roll)||roll<0||roll>=1)return null;
 const a=SABOTAGE_ACTIONS.find(a=>a.id===action),caught=roll<a.risk;balanceCents-=a.costCents;r.costCents+=a.costCents;
 r.cooldowns[target]=minutes+360;
 if(caught){r.fineCents+=a.fineCents;r.debtCents+=a.fineCents;const paid=Math.min(balanceCents,r.debtCents);balanceCents-=paid;r.debtCents-=paid;}
 else r.effects[target]={action:a.id,factor:a.factor,until:minutes+a.duration};
 r.history.push({target,action,minute:minutes,caught});r.history=r.history.slice(-20);return {balanceCents,caught,fineCents:caught?a.fineCents:0,action:a};
}
export function collectFine(r,balanceCents){const paid=Math.min(balanceCents,r.debtCents);r.debtCents-=paid;return {balanceCents:balanceCents-paid,paid};}

export function orderQuote(action,channel,credibility=3){
 const a=SABOTAGE_ACTIONS.find(a=>a.id===action);if(!a||!ORDER_CHANNELS[channel]?.includes(action))return null;
 if(channel==='phone'&&(!Number.isInteger(credibility)||credibility<0||credibility>4))return null;
 return {...a,risk:channel==='phone'?phoneRisk(credibility):a.risk,delay:ORDER_DELAY[action]};
}
export function commissionSabotage(r,request,balanceCents,minutes,roll=Math.random()){
 const quote=orderQuote(request?.action,request?.channel,request?.credibility),issue=sabotageIssue(r,request?.target,request?.action,balanceCents,minutes);
 if(r.nextId>=1e9||!quote||quote.giftOnly&&request?.gift!==true||(request.channel==='phone'&&!Number.isInteger(request.credibility))||contactChannel(request.contactId)!==request.channel||issue||!Number.isFinite(roll)||roll<0||roll>=1)return {ok:false,message:issue||'Dieser Auftrag ist bei diesem Kontakt nicht verfügbar.'};
 const job={id:r.nextId++,target:request.target,action:request.action,channel:request.channel,contactId:request.contactId,minute:minutes,due:minutes+quote.delay,roll,...(request.action==='doodle'?{gift:true}:{}),...(request.channel==='phone'?{credibility:request.credibility}:{})};
 r.pending.push(job);r.costCents+=quote.costCents;r.cooldowns[job.target]=job.due+360;
 return {ok:true,job,quote,balanceCents:balanceCents-quote.costCents};
}
export function advanceRivalry(r,balanceCents,minutes){
 const ready=r.pending.filter(j=>j.due<=minutes).sort((a,b)=>a.due-b.due||a.id-b.id),results=[];
 for(const j of ready){
  const a=orderQuote(j.action,j.channel,j.credibility),caught=j.roll<a.risk;
  if(caught){r.fineCents+=a.fineCents;r.debtCents+=a.fineCents;const payment=collectFine(r,balanceCents);balanceCents=payment.balanceCents;}
  else r.effects[j.target]={action:j.action,factor:a.factor,until:j.due+a.duration};
  r.history.push({orderId:j.id,target:j.target,action:j.action,minute:j.due,caught,channel:j.channel,contactId:j.contactId});results.push({...j,caught,fineCents:caught?a.fineCents:0});
 }
 const settled=new Set(ready.map(j=>j.id));r.pending=r.pending.filter(j=>!settled.has(j.id));r.history=r.history.slice(-20);
 return {balanceCents,results};
}
