import {SHIFTS} from './pizza-shifts.js?v=20261016b';
export const STAFF_ROLES={
 cook:{name:'Küche',person:'Koch / Köchin',skills:[{id:'preparation',name:'Zubereitung'},{id:'baking',name:'Backen'},{id:'organization',name:'Organisation'}]},
 waiter:{name:'Service',person:'Servicekraft',skills:[{id:'pace',name:'Tempo'},{id:'attention',name:'Aufmerksamkeit'},{id:'friendliness',name:'Freundlichkeit'}]}
};
export const MONTH_HOURS=30*24,MAX_TEAM=4;
const FIRST=['Alessia','Marco','Giulia','Luca','Sofia','Matteo','Chiara','Paolo','Elena','Davide','Francesca','Andrea','Valentina','Nico','Anna','Fabio','Marta','Carlo','Lucia','Enzo','Teresa','Antonio','Rosa','Leo'];
const LAST=['Rossi','Conti','Moretti','Romano','Costa','Ricci','Ferrari','Marino','Greco','Galli','Fontana','Santini','Rinaldi','Lombardi','Fiore','Esposito','Bianchi','Leone','Barbieri','Vitale'];
export function staffHash(seed,salt=0){let n=(seed+Math.imul(salt+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return (n^(n>>>15))>>>0;}
export function averageSkill(person){const skills=STAFF_ROLES[person.role].skills;return Math.round(skills.reduce((sum,s)=>sum+person.skills[s.id],0)/3);}
export function skillLevel(person){return Math.max(1,Math.min(5,Math.ceil(averageSkill(person)/20)));}
export const LEVEL_NAMES=['','Einstieg','Grundlagen','Routiniert','Erfahren','Expertise'];
export function salaryFor(role,skills){const score=STAFF_ROLES[role].skills.reduce((sum,s)=>sum+skills[s.id],0)/3;return Math.round(((role==='cook'?1000:850)+score*(role==='cook'?35:28))/10)*1000;}
function person(seed,serial,role,tier=1){
 const avatarSeed=staffHash(seed,serial),center=[25,52,85][tier],skills=Object.fromEntries(STAFF_ROLES[role].skills.map((s,i)=>[s.id,Math.max(10,Math.min(99,center+(staffHash(avatarSeed,i)%23)-11))]));
 return {id:'candidate-'+serial,name:FIRST[staffHash(avatarSeed,5)%FIRST.length]+' '+LAST[staffHash(avatarSeed,6)%LAST.length],role,skills,salaryCents:salaryFor(role,skills),avatarSeed,restaurantId:null,shift:'lunch'};
}
function replenish(staff,role,tier){const p=person(staff.seed,staff.nextId++,role,tier),names=new Set([...staff.employees,...staff.market].map(e=>e.name));for(let i=0;names.has(p.name)&&i<500;i++)p.name=FIRST[staffHash(p.avatarSeed,i+20)%FIRST.length]+' '+LAST[staffHash(p.avatarSeed,i+60)%LAST.length];staff.market.push(p);}
export function freshStaff(seed=194512){const staff={version:1,seed:seed>>>0,nextId:1,employees:[],market:[],reserveCostCents:0,reserveDebtCents:0,reserveAccrued:0};for(const role of Object.keys(STAFF_ROLES))for(let i=0;i<6;i++)replenish(staff,role,Math.floor(i/2));return staff;}
function restoredPerson(raw,profiles,defaultShift){
 if(!raw||typeof raw.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(raw.id)||typeof raw.name!=='string'||raw.name.length<2||raw.name.length>50||!STAFF_ROLES[raw.role]||!Number.isSafeInteger(raw.salaryCents)||raw.salaryCents<50000||raw.salaryCents>2000000||!Number.isInteger(raw.avatarSeed)||raw.avatarSeed<0||raw.avatarSeed>0xffffffff)return null;
 if(raw.id.startsWith('candidate-')&&(!/^candidate-[0-9]+$/.test(raw.id)||!Number.isSafeInteger(Number(raw.id.slice(10)))||Number(raw.id.slice(10))<1||Number(raw.id.slice(10))>=1e9-1))return null;
 const skills={};for(const s of STAFF_ROLES[raw.role].skills){const value=raw.skills?.[s.id];if(!Number.isInteger(value)||value<0||value>100)return null;skills[s.id]=value;}
 return {id:raw.id,name:raw.name,role:raw.role,skills,salaryCents:raw.salaryCents,avatarSeed:raw.avatarSeed,restaurantId:Object.hasOwn(profiles,raw.restaurantId)?raw.restaurantId:null,shift:SHIFTS[raw.shift]?raw.shift:defaultShift};
}
export function restoreStaff(raw,profiles,defaultShift='lunch'){
 if(!SHIFTS[defaultShift])defaultShift='lunch';
 if(raw?.version===1&&Number.isInteger(raw.seed)&&raw.seed>=0&&raw.seed<=0xffffffff&&Number.isSafeInteger(raw.nextId)&&raw.nextId>0&&raw.nextId<1e9&&Array.isArray(raw.employees)&&raw.employees.length<=120&&Array.isArray(raw.market)&&raw.market.length<=24){
  const employees=raw.employees.map(p=>restoredPerson(p,profiles,defaultShift)),market=raw.market.map(p=>restoredPerson(p,profiles,defaultShift)),ids=[...employees,...market].map(p=>p?.id);
  if(employees.every(Boolean)&&market.every(Boolean)&&new Set(ids).size===ids.length){
   const staff={version:1,seed:raw.seed,nextId:Math.max(raw.nextId,...ids.filter(id=>/^candidate-[0-9]+$/.test(id)).map(id=>Number(id.slice(10))+1)),employees,market:market.map(p=>({...p,restaurantId:null})),reserveCostCents:Number.isSafeInteger(raw.reserveCostCents)&&raw.reserveCostCents>=0&&raw.reserveCostCents<=1e12?raw.reserveCostCents:0,reserveDebtCents:Number.isSafeInteger(raw.reserveDebtCents)&&raw.reserveDebtCents>=0&&raw.reserveDebtCents<=1e12?raw.reserveDebtCents:0,reserveAccrued:Number.isFinite(raw.reserveAccrued)&&raw.reserveAccrued>=0&&raw.reserveAccrued<1?raw.reserveAccrued:0};
   // A damaged or obsolete assignment keeps the employee in the company reserve.
   for(const id of Object.keys(profiles))for(const shift of Object.keys(SHIFTS))for(const role of Object.keys(STAFF_ROLES)){const team=restaurantStaff(staff,id,shift).filter(p=>p.role===role);for(const p of team.slice(MAX_TEAM))p.restaurantId=null;}
   return staff;
  }
 }
 const staff=freshStaff();let serial=1000;
 for(const [id,p]of Object.entries(profiles))for(const role of Object.keys(STAFF_ROLES))for(let i=0;i<Math.min(MAX_TEAM,p.business?.[role]||0);i++){
  const e=person(staff.seed,serial++,role);e.id='legacy-'+id+'-'+role+'-'+i;e.restaurantId=id;e.shift=defaultShift;e.skills=Object.fromEntries(STAFF_ROLES[role].skills.map(s=>[s.id,50]));e.salaryCents=(role==='cook'?1920:1280)*100;staff.employees.push(e);
 }
 return staff;
}
export function restaurantStaff(staff,id,shift=null){return staff.employees.filter(p=>p.restaurantId===id&&(shift===null||(p.shift||'lunch')===shift));}
export function monthlyPayroll(staff,id=undefined){return staff.employees.filter(p=>id===undefined||p.restaurantId===id).reduce((sum,p)=>sum+p.salaryCents,0);}
export function syncStaffCounts(staff,profiles){for(const [id,p]of Object.entries(profiles)){const team=restaurantStaff(staff,id);for(const role of Object.keys(STAFF_ROLES))p.business[role]=team.filter(e=>e.role===role).length;p.business.staffMonthlyCents=team.reduce((sum,e)=>sum+e.salaryCents,0);}return profiles;}
export function employeeBusy(employee,profiles){if(!employee.restaurantId)return false;const service=profiles[employee.restaurantId]?.service;return !!(service?.waiterTasks?.some(t=>t.employeeId===employee.id)||service?.groups.some(g=>g.phase==='waiting'&&g.work&&(employee.role==='cook'?g.work.stage<3&&g.work.cookId===employee.id:g.work.stage===3&&g.work.started&&g.work.waiterId===employee.id)));}
export function assignmentIssue(staff,employee,id,profiles,shift=employee?.shift||'lunch'){
 if(!employee)return 'Diese Personalakte existiert nicht.';
 if(id!==null&&!Object.hasOwn(profiles,id))return 'Diesen Standort musst du zuerst kaufen.';
 if(!SHIFTS[shift])return 'Bitte eine gültige Schicht wählen.';
 if(employee.restaurantId===id&&(employee.shift||'lunch')===shift)return null;
 if(employeeBusy(employee,profiles))return 'Diese Person arbeitet gerade an einer Bestellung oder räumt Teller ab. Neue Gäste stoppen und den Arbeitsgang fertig werden lassen.';
 if(id!==null&&restaurantStaff(staff,id,shift).filter(p=>p.id!==employee.id&&p.role===employee.role).length>=MAX_TEAM)return 'Für die '+(shift==='lunch'?'Mittagsschicht':'Abendschicht')+' sind in diesem Restaurant bereits vier '+(employee.role==='cook'?'Köche':'Servicekräfte')+' eingeteilt.';
 return null;
}
export function assignEmployee(staff,id,restaurantId,profiles,shift=undefined){const e=staff.employees.find(p=>p.id===id),targetShift=shift??e?.shift??'lunch',issue=assignmentIssue(staff,e,restaurantId,profiles,targetShift);if(issue)return {ok:false,issue};e.restaurantId=restaurantId;e.shift=targetShift;syncStaffCounts(staff,profiles);return {ok:true,employee:e};}
export function assignShift(staff,id,shift,profiles){const e=staff.employees.find(p=>p.id===id);if(!e||!SHIFTS[shift])return {ok:false,issue:'Bitte eine gültige Schicht wählen.'};return assignEmployee(staff,id,e.restaurantId,profiles,shift);}
export function hireEmployee(staff,id,restaurantId,profiles,shift='lunch'){
 const e=staff.market.find(p=>p.id===id);if(!e)return {ok:false,issue:'Diese Bewerbung ist nicht mehr verfügbar.'};
 if(staff.employees.length>=120)return {ok:false,issue:'Deine Personalverwaltung ist voll.'};
 if(!SHIFTS[shift])return {ok:false,issue:'Bitte eine gültige Schicht wählen.'};
 const issue=assignmentIssue(staff,{...e,restaurantId:null,shift},restaurantId,profiles,shift);if(issue)return {ok:false,issue};
 staff.market=staff.market.filter(p=>p.id!==id);e.restaurantId=restaurantId;e.shift=shift;staff.employees.push(e);if(staff.market.length<12)replenish(staff,e.role,Math.floor((skillLevel(e)-1)/2));syncStaffCounts(staff,profiles);return {ok:true,employee:e};
}
export function dismissEmployee(staff,id,profiles){const e=staff.employees.find(p=>p.id===id);if(!e)return {ok:false,issue:'Diese Personalakte existiert nicht.'};if(employeeBusy(e,profiles))return {ok:false,issue:'Diese Person arbeitet noch an einer Bestellung.'};staff.employees=staff.employees.filter(p=>p.id!==id);e.restaurantId=null;if(staff.market.length>=24)staff.market.shift();staff.market.push(e);syncStaffCounts(staff,profiles);return {ok:true,employee:e};}
export function accrueReservePayroll(staff,seconds,balanceCents){
 const rate=monthlyPayroll(staff,null)/(MONTH_HOURS*300);staff.reserveAccrued+=rate*Math.max(0,Math.min(seconds,3600));const charge=Math.floor(staff.reserveAccrued);staff.reserveAccrued-=charge;staff.reserveCostCents+=charge;staff.reserveDebtCents+=charge;const paid=Math.min(balanceCents,staff.reserveDebtCents);staff.reserveDebtCents-=paid;return {balanceCents:balanceCents-paid,paid};
}
