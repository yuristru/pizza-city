import {competitor} from './pizza-competitors.js?v=20261016b';
export const SABOTAGE_ACTIONS=[
 {id:'inspection',name:'Beim Ordnungsamt melden',costCents:75000,risk:.15,fineCents:1500000,duration:360,factor:.55,description:'Kontrolle: 45 % weniger Nachfrage für 6 Spielstunden.'},
 {id:'roaches',name:'Kakerlaken aussetzen',costCents:240000,risk:.42,fineCents:4500000,duration:1440,factor:.2,description:'Hygienevorfall: 80 % weniger Nachfrage für 24 Spielstunden.'},
 {id:'stinkbomb',name:'Stinkbombe',costCents:120000,risk:.28,fineCents:2400000,duration:240,factor:.35,description:'Geruchsbelästigung: 65 % weniger Nachfrage für 4 Spielstunden.'},
 {id:'graffiti',name:'Fassade ansprühen',costCents:90000,risk:.36,fineCents:1800000,duration:720,factor:.75,description:'Beschädigte Fassade: 25 % weniger Nachfrage für 12 Spielstunden.'}
];
export function freshRivalry(){return {version:1,costCents:0,fineCents:0,debtCents:0,effects:{},cooldowns:{},history:[]};}
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
export function restoreRivalry(raw){
 const r=freshRivalry();if(raw?.version!==1)return r;
 for(const k of ['costCents','fineCents','debtCents'])if(cents(raw[k]))r[k]=raw[k];r.debtCents=Math.min(r.debtCents,r.fineCents);
 for(const [id,e]of Object.entries(raw.effects||{}))if(competitor(id)&&Number.isFinite(e?.until)&&e.until>=0&&e.until<=1e10&&SABOTAGE_ACTIONS.some(a=>a.id===e.action&&a.factor===e.factor))r.effects[id]={until:e.until,factor:e.factor,action:e.action};
 for(const [id,t]of Object.entries(raw.cooldowns||{}))if(competitor(id)&&Number.isFinite(t)&&t>=0&&t<=1e10)r.cooldowns[id]=t;
 if(Array.isArray(raw.history))r.history=raw.history.filter(h=>competitor(h?.target)&&SABOTAGE_ACTIONS.some(a=>a.id===h.action)&&Number.isFinite(h.minute)&&h.minute>=0&&typeof h.caught==='boolean').slice(-20).map(h=>({target:h.target,action:h.action,minute:h.minute,caught:h.caught}));return r;
}
export function sabotageIssue(r,target,action,balanceCents,minutes){
 const a=SABOTAGE_ACTIONS.find(a=>a.id===action);
 if(!Number.isSafeInteger(balanceCents)||balanceCents<0||!Number.isFinite(minutes)||minutes<0)return 'Ungültiger Kontostand oder Spielzeit.';
 if(!competitor(target)||!a)return 'Ungültige Aktion.';
 if(r.debtCents)return 'Zuerst die offene Strafe begleichen.';
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
